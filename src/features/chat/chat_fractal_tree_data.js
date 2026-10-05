// Fractal tree (2026-10-03): a OneZoom-style family tree (the user's model:
// onezoom.org, "but for families"). Each person is a circle holding a small
// tree of their children; each child's circle holds theirs, and so on, so
// zooming into anyone opens up the next generation. A child with no children
// is a leaf. The canvas drawing lives in chat_fractal_tree.js.

import { generationOfSlot } from "./chat_fan_chart_data";
import { fullName } from "./chat_chart_common";

export const FRACTAL_TREE_DEFAULT_GENERATIONS = { descendants: 6, ancestors: 8 };
export const FRACTAL_TREE_MAX_GENERATIONS = 10;
// Generations fetched for one branch when you zoom into the edge of what's loaded
// (descendants fan out much faster than ancestors' 2^n).
export const FRACTAL_TREE_EXPAND_GENERATIONS = { descendants: 3, ancestors: 7 };

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const OWNER_AFTER = String.raw`(me|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+)`;
const TREE = String.raw`(?:fractal\s+(?:family\s+|ancestor\s+|ancestry\s+|descendant\s+)?(?:tree|chart)|onezoom(?:\s+(?:style\s+)?(?:tree|chart))?|zoom(?:able|ing)\s+(?:family\s+)?tree)`;
const KIN = String.raw`(ancestors|descendants|family)`;
const GENS = String.raw`(?:\s+(?:with|of|for|showing)?\s*(\d{1,2})\s+generations?)?`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate|grow)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make|grow)(?:\s+me)?\s+)?`;

// Each pattern's groups: owner (optional), kin (optional), generations (optional).
const PATTERNS = [
  // "show me my fractal tree", "draw Cook-8721's fractal chart", "fractal tree"
  { re: new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?${TREE}${GENS}$`, "i"), groups: ["owner", "gens"] },
  // "draw a fractal tree of my ancestors", "fractal tree of her descendants"
  { re: new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${TREE}\s+(?:of|for)\s+${OWNER}\s+${KIN}${GENS}$`, "i"), groups: ["owner", "kin", "gens"] },
  // "show a fractal chart for Cook-8721", "fractal tree for me"
  { re: new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${TREE}\s+(?:of|for)\s+${OWNER_AFTER}${GENS}$`, "i"), groups: ["owner", "gens"] },
  // "show my descendants as a fractal tree", "visualize my ancestors"
  {
    re: new RegExp(String.raw`^(?:show|draw|display|grow)(?:\s+me)?\s+${OWNER}\s+${KIN}\s+(?:as|in)\s+an?\s+(?:fractal(?:\s+(?:tree|chart))?|onezoom(?:\s+(?:style\s+)?(?:tree|chart))?|zoom(?:able|ing)\s+tree)${GENS}$`, "i"),
    groups: ["owner", "kin", "gens"],
  },
  { re: new RegExp(String.raw`^(?:visuali[sz]e|chart|graph)\s+${OWNER}\s+(ancestors)${GENS}$`, "i"), groups: ["owner", "kin", "gens"] },
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "my";
  if (/^(?:her)$/i.test(raw)) return "her";
  if (/^(?:his|him)$/i.test(raw)) return "his";
  if (/^(?:their|them)$/i.test(raw)) return "their";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/**
 * {owner, which, generations, subjectPrompt} or null. which: "descendants"
 * (the default: families branching out, as on OneZoom) or "ancestors".
 * subjectPrompt is "<owner> ancestors|descendants" for the subject resolvers.
 */
export function parseFractalTreePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const { re, groups } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const value = (name) => match[groups.indexOf(name) + 1];
    const owner = canonicalOwner(value("owner"));
    const which = /^ancestors$/i.test(value("kin") || "") ? "ancestors" : "descendants";
    const asked = Number(value("gens"));
    const generations =
      Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 2), FRACTAL_TREE_MAX_GENERATIONS) : FRACTAL_TREE_DEFAULT_GENERATIONS[which];
    const subjectPrompt = !owner ? `this profile's ${which}` : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ${which}` : `${owner}'s ${which}`;
    return { owner, which, generations, subjectPrompt };
  }
  return null;
}

/**
 * Flags the people at the edge of what was loaded who may have more family:
 * ancestors with a parent recorded, or descendants in the last generation
 * fetched (getPeople doesn't say whether they have children). `generations`
 * counts from the tree's root. Returns how many were flagged.
 */
export function markFrontier(tree, which, generations) {
  let count = 0;
  const walk = (node, depth) => {
    const edge = depth >= generations && !node.children.length;
    const hasMore = which === "ancestors" ? Boolean(node.person?.fatherId || node.person?.motherId) : true;
    node.more = edge && hasMore;
    if (node.more) count += 1;
    node.children.forEach((child) => walk(child, depth + 1));
  };
  if (tree?.person) walk(tree, 0);
  return count;
}

/** True when some line on the tree may go further than what's loaded. */
export function hasFrontier(tree) {
  if (!tree) return false;
  return Boolean(tree.more) || tree.children.some(hasFrontier);
}

/**
 * Grows a newly loaded branch onto the tree: `branch` is rooted at the same
 * person as `node`; its children (and their depths) move onto `node`.
 */
export function graftBranch(node, branch) {
  node.more = false;
  if (!branch?.children?.length) return 0;
  const shift = (child, depth) => {
    child.depth = depth;
    child.children.forEach((grandchild) => shift(grandchild, depth + 1));
  };
  branch.children.forEach((child) => shift(child, (node.depth || 0) + 1));
  node.children = branch.children;
  return countPeople(node) - 1;
}

/** Fan-chart slots → {person, children} with parents as the children (father first). */
export function treeFromAncestorSlots(slots) {
  const build = (slot) => {
    if (slot >= slots.length || !slots[slot]) return null;
    return { person: slots[slot], children: [build(slot * 2), build(slot * 2 + 1)].filter(Boolean), depth: generationOfSlot(slot) };
  };
  return build(1);
}

// Recounted every time: branches grow as more generations load.
function countPeople(node) {
  node.weight = 1 + node.children.reduce((sum, child) => sum + countPeople(child), 0);
  return node.weight;
}

function round(value) {
  return Math.round(value * 1e9) / 1e9;
}

// Inside a circle of radius 1: the name sits in the lower band, a trunk rises
// from it to a fork, and the children's circles fan out above on an arc.
export const NESTED_GEOMETRY = {
  trunkBase: 0.34, // y of the trunk's foot (below centre is +y)
  fork: 0.1, // y of the fork
  arcRadius: 0.5, // children's centres, measured from the fork
  maxChildRadius: 0.34,
  onlyChildRadius: 0.42,
  margin: 0.95, // children stay inside this radius
};

/**
 * Child circles for one person, relative to their circle (centre 0,0, radius 1).
 * Each child's share of the arc follows the square root of the people on its
 * branch, so big branches get big circles. Returns [{dx, dy, r, angle}].
 */
export function placeChildren(weights) {
  const n = weights.length;
  if (!n) return [];
  const g = NESTED_GEOMETRY;
  // Half the fan, from straight up: small families spread wide so their circles can be big (ancestors always come in twos).
  const spread = n === 1 ? 0 : Math.min(Math.PI * 0.5, 1.05 + n * 0.08);
  const arcRadius = n > 6 ? g.arcRadius + 0.08 : g.arcRadius;
  const shares = weights.map((w) => Math.sqrt(w));
  const total = shares.reduce((a, b) => a + b, 0);
  const span = n === 1 ? Math.PI : spread * 2;
  let angle = -spread;
  return shares.map((share) => {
    const part = (share / total) * span;
    const mid = n === 1 ? 0 : angle + part / 2;
    angle += part;
    const dx = Math.sin(mid) * arcRadius;
    const dy = g.fork - Math.cos(mid) * arcRadius;
    const room = g.margin - Math.sqrt(dx * dx + dy * dy);
    const neighbour = n === 1 ? Infinity : arcRadius * Math.sin(part / 2) * 0.94;
    const r = Math.max(0.012, Math.min(n === 1 ? g.onlyChildRadius : g.maxChildRadius, neighbour, room));
    return { dx: round(dx), dy: round(dy), r: round(r), angle: mid };
  });
}

/**
 * Nested layout: the root is a circle of radius 1 at (0, 0); each person's
 * children sit inside their circle (placeChildren), all the way down.
 * nodes: [{index, person, x, y, r, depth, weight, leaf, more, source, parent, children: [index], angle}]
 * (more: family beyond what's loaded; source: the tree node, for growing it)
 * (absolute positions; the drawing works in screen space so deep levels stay sharp).
 */
export function buildFractalLayout(root) {
  const nodes = [];
  if (!root?.person) return { nodes };
  countPeople(root);
  const place = (tree, x, y, r, depth, parent, angle) => {
    const node = {
      index: nodes.length,
      person: tree.person,
      x: round(x),
      y: round(y),
      r: round(r),
      depth,
      weight: tree.weight,
      leaf: !tree.children.length && !tree.more,
      more: Boolean(tree.more),
      source: tree,
      parent,
      children: [],
      angle,
    };
    nodes.push(node);
    // Each child's share is fixed the first time it's laid out, so when a branch
    // grows (more generations load) everything already on screen stays put.
    const spots = placeChildren(
      tree.children.map((child) => {
        if (child.layoutWeight === undefined) child.layoutWeight = child.weight;
        return child.layoutWeight;
      })
    );
    tree.children.forEach((child, i) => {
      const spot = spots[i];
      const childNode = place(child, x + spot.dx * r, y + spot.dy * r, spot.r * r, depth + 1, node.index, spot.angle);
      node.children.push(childNode.index);
    });
    return node;
  };
  place(root, 0, 0, 1, 0, -1, 0);
  return { nodes };
}

/** "Ellen's fractal tree holds 212 descendants over 6 generations; 140 lines end in a leaf." */
export function buildFractalTreeSummary(tree, ownerText, which = "descendants") {
  if (!tree?.person) return `${ownerText} fractal tree couldn't be drawn.`;
  countPeople(tree);
  const people = tree.weight - 1;
  if (!people) {
    return which === "ancestors"
      ? `${ownerText} fractal tree has no branches yet: no parents are recorded on WikiTree.`
      : `${ownerText} fractal tree has no branches yet: no children are recorded on WikiTree.`;
  }
  let deepest = 0;
  let leaves = 0;
  let largest = null;
  const walk = (node) => {
    deepest = Math.max(deepest, node.depth || 0);
    if (!node.children.length && !node.more && node !== tree) leaves += 1;
    if (node !== tree && node.children.length && (!largest || node.children.length > largest.children.length)) largest = node;
    node.children.forEach(walk);
  };
  walk(tree);
  const noun = which === "ancestors" ? "ancestor" : "descendant";
  const family =
    which === "descendants" && largest && largest.children.length >= 4
      ? ` The biggest family on it is ${fullName(largest.person)}'s, with ${largest.children.length} children.`
      : "";
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
  if (hasFrontier(tree)) {
    // Only part of the tree is loaded (ancestors can run to millions), so no grand total.
    return `${ownerText} fractal tree starts with ${plural(people, noun)} over ${plural(deepest, "generation")}, and some lines go further.${family} Zoom into anyone to see their family inside their circle; more generations load as you go.`;
  }
  return `${ownerText} fractal tree holds ${plural(people, noun)} over ${plural(deepest, "generation")}; ${leaves} line${
    leaves === 1 ? " ends" : "s end"
  } in a leaf.${family} Zoom into anyone to see their family inside their circle.`;
}
