// The fractal tree's spiral layout (2026-10-03, the first OneZoom-style try,
// kept as an option): one person is the root; every person with relatives
// beyond them is a ringed circle where the branch forks, and a line that ends
// is a leaf. Siblings bud off a curling stem in birth order, so big families
// spiral. The nested layout (chat_fractal_tree_data.js) is the default; the
// drawing lives in chat_fractal_spiral.js.

// Layout units: a root circle of radius 34; everything else scales down from it.
const RADIUS = 34;
const LENGTH = 120;
const WIDTH = 24;
const JUNCTION = 0.42;

// Recounted every time: the nested view grows branches as it loads more.
function countPeople(node) {
  node.weight = 1 + node.children.reduce((sum, child) => sum + countPeople(child), 0);
  return node.weight;
}

function sumWeights(nodes) {
  return nodes.reduce((sum, node) => sum + node.weight, 0);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Lays the tree out with the root at (0, 0) growing up (negative y).
 * nodes: [{index, kind: "person"|"junction", person, x, y, r, heading, depth, weight, leaf, parent, label}]
 *   leaf: a person whose line ends here. A junction is a fork in a sibling stem,
 *   labelled with how many people grow from it ("12 people").
 * branches: [{from, to, x0, y0, cx, cy, x1, y1, width, depth}] (a quadratic curve).
 * Each person node also gets bbox {minX, minY, maxX, maxY} covering everything above it.
 */
export function buildSpiralLayout(root) {
  const nodes = [];
  const branches = [];
  if (!root?.person) return { nodes, branches, bounds: { minX: -RADIUS, minY: -RADIUS, maxX: RADIUS, maxY: RADIUS } };
  countPeople(root);

  const addNode = (node) => {
    node.index = nodes.length;
    nodes.push(node);
    return node;
  };
  const addBranch = (from, to, heading, width) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const reach = Math.sqrt(dx * dx + dy * dy) * 0.55;
    branches.push({
      from: from.index,
      to: to.index,
      x0: round(from.x),
      y0: round(from.y),
      cx: round(from.x + Math.sin(heading) * reach),
      cy: round(from.y - Math.cos(heading) * reach),
      x1: round(to.x),
      y1: round(to.y),
      width: round(width),
      depth: to.depth,
    });
  };

  function placePerson(tree, x, y, heading, scale, curl, parent) {
    const node = addNode({
      kind: "person",
      person: tree.person,
      x: round(x),
      y: round(y),
      r: round(RADIUS * scale),
      heading,
      depth: tree.depth || 0,
      weight: tree.weight,
      leaf: !tree.children.length,
      parent: parent ? parent.index : -1,
    });
    if (parent) addBranch(parent, node, parent.heading, Math.min(parent.width || WIDTH * scale * 1.2, WIDTH * scale));
    node.width = WIDTH * scale;
    if (tree.children.length) spread(node, tree.children, heading, scale, curl);
    return node;
  }

  // Grows a stem of siblings from `from`: the first sibling buds off one side,
  // the rest carry on (the heavier side turns less), forking again until one is left.
  function spread(from, kids, heading, scale, curl) {
    const fromRadius = from.kind === "junction" ? from.r : from.r;
    if (kids.length === 1) {
      const kid = kids[0];
      const childScale = scale * 0.8;
      const angle = heading + curl * 0.16;
      const distance = fromRadius + RADIUS * childScale + LENGTH * childScale * 0.75;
      placePerson(kid, from.x + Math.sin(angle) * distance, from.y - Math.cos(angle) * distance, angle, childScale, curl, from);
      return;
    }
    const first = kids[0];
    const rest = kids.slice(1);
    const firstWeight = first.weight;
    const restWeight = sumWeights(rest);
    const total = firstWeight + restWeight;
    const restIsMain = restWeight >= firstWeight;
    const mainShare = Math.max(firstWeight, restWeight) / total;
    const sideShare = 1 - mainShare;
    const mainAngle = heading + curl * (0.14 + 0.5 * sideShare);
    const sideAngle = heading - curl * (0.62 + 0.5 * mainShare);
    const mainScale = scale * Math.min(0.9, 0.5 + 0.42 * Math.sqrt(mainShare));
    const sideScale = scale * (0.34 + 0.5 * Math.sqrt(sideShare));

    const firstAngle = restIsMain ? sideAngle : mainAngle;
    const firstScale = restIsMain ? sideScale : mainScale;
    const firstCurl = restIsMain ? -curl : curl;
    const firstDistance = fromRadius + RADIUS * firstScale + LENGTH * firstScale * 0.7;
    placePerson(first, from.x + Math.sin(firstAngle) * firstDistance, from.y - Math.cos(firstAngle) * firstDistance, firstAngle, firstScale, firstCurl, from);

    const restAngle = restIsMain ? mainAngle : sideAngle;
    const restScale = restIsMain ? mainScale : sideScale;
    const restCurl = restIsMain ? curl : -curl;
    if (rest.length === 1) {
      const distance = fromRadius + RADIUS * restScale + LENGTH * restScale * 0.7;
      placePerson(rest[0], from.x + Math.sin(restAngle) * distance, from.y - Math.cos(restAngle) * distance, restAngle, restScale, restCurl, from);
      return;
    }
    const distance = fromRadius + LENGTH * restScale * 0.55;
    const junction = addNode({
      kind: "junction",
      person: null,
      x: round(from.x + Math.sin(restAngle) * distance),
      y: round(from.y - Math.cos(restAngle) * distance),
      r: round(RADIUS * restScale * JUNCTION),
      heading: restAngle,
      depth: rest[0].depth || 0,
      weight: restWeight,
      leaf: false,
      parent: from.index,
      label: `${restWeight} ${restWeight === 1 ? "person" : "people"}`,
    });
    addBranch(from, junction, from.heading, Math.min(from.width || WIDTH * scale, WIDTH * restScale * 1.1));
    junction.width = WIDTH * restScale;
    spread(junction, rest, restAngle, restScale, restCurl);
  }

  placePerson(root, 0, 0, 0, 1, 1, null);

  // Bounding boxes, children before parents (every node is added after its parent).
  nodes.forEach((node) => {
    node.bbox = { minX: node.x - node.r, minY: node.y - node.r, maxX: node.x + node.r, maxY: node.y + node.r };
  });
  for (let i = nodes.length - 1; i > 0; i -= 1) {
    const node = nodes[i];
    const parent = nodes[node.parent];
    if (!parent) continue;
    parent.bbox.minX = Math.min(parent.bbox.minX, node.bbox.minX);
    parent.bbox.minY = Math.min(parent.bbox.minY, node.bbox.minY);
    parent.bbox.maxX = Math.max(parent.bbox.maxX, node.bbox.maxX);
    parent.bbox.maxY = Math.max(parent.bbox.maxY, node.bbox.maxY);
  }
  return { nodes, branches, bounds: { ...nodes[0].bbox } };
}
