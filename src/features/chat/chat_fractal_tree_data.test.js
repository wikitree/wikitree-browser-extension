import { parseFractalTreePrompt, buildFractalLayout, placeChildren, markFrontier, graftBranch, hasFrontier, buildFractalTreeSummary, treeFromAncestorSlots } from "./chat_fractal_tree_data";

describe("parseFractalTreePrompt", () => {
  test.each([
    ["fractal tree", "", "descendants", 6, "this profile's descendants"],
    ["show me my fractal tree", "my", "descendants", 6, "my descendants"],
    ["Show a fractal tree", "", "descendants", 6, "this profile's descendants"],
    ["draw Cook-8721's fractal chart", "Cook-8721", "descendants", 6, "Cook-8721's descendants"],
    ["draw a fractal tree of her ancestors", "her", "ancestors", 8, "her ancestors"],
    ["fractal tree of her descendants with 4 generations", "her", "descendants", 4, "her descendants"],
    ["show a fractal chart for Cook-8721", "Cook-8721", "descendants", 6, "Cook-8721's descendants"],
    ["show my descendants as a fractal tree", "my", "descendants", 6, "my descendants"],
    ["show his ancestors as a zoomable tree", "his", "ancestors", 8, "his ancestors"],
    ["visualize his ancestors", "his", "ancestors", 8, "his ancestors"],
    ["show me a onezoom tree", "", "descendants", 6, "this profile's descendants"],
    ["fractal tree of 20 generations", "", "descendants", 10, "this profile's descendants"],
  ])("%s", (prompt, owner, which, generations, subjectPrompt) => {
    expect(parseFractalTreePrompt(prompt)).toEqual({ owner, which, generations, subjectPrompt });
  });

  test.each(["show me my ancestors", "show my family tree", "what is a fractal", "fan chart"])("declines %s", (prompt) => {
    expect(parseFractalTreePrompt(prompt)).toBeNull();
  });
});

const person = (wtid, birth = "") => ({ wtid, name: wtid, birth });
const leaf = (wtid, depth) => ({ person: person(wtid), children: [], depth });

describe("buildFractalLayout", () => {
  // A root with four children; the third has two children of her own.
  const tree = {
    person: person("Root-1"),
    depth: 0,
    children: [leaf("A-1", 1), leaf("B-1", 1), { person: person("C-1"), depth: 1, children: [leaf("C-2", 2), leaf("C-3", 2)] }, leaf("D-1", 1)],
  };

  const inside = (inner, outer) => Math.hypot(inner.x - outer.x, inner.y - outer.y) + inner.r <= outer.r + 1e-9;

  test("every person gets a circle, and each child's circle sits inside their parent's", () => {
    const { nodes } = buildFractalLayout(tree);
    expect(nodes.map((n) => n.person.wtid).sort()).toEqual(["A-1", "B-1", "C-1", "C-2", "C-3", "D-1", "Root-1"]);
    expect(nodes[0]).toMatchObject({ x: 0, y: 0, r: 1, parent: -1, depth: 0 });
    nodes.slice(1).forEach((n) => {
      expect(inside(n, nodes[n.parent])).toBe(true);
      expect(n.depth).toBe(nodes[n.parent].depth + 1);
    });
    nodes.forEach((n) => [n.x, n.y, n.r].forEach((v) => expect(Number.isFinite(v)).toBe(true)));
  });

  test("siblings don't overlap, sit above the fork, and the bigger branch gets the bigger circle", () => {
    const { nodes } = buildFractalLayout(tree);
    const byId = (id) => nodes.find((n) => n.person.wtid === id);
    const kids = nodes[0].children.map((i) => nodes[i]);
    for (let i = 0; i < kids.length; i++) {
      expect(kids[i].y).toBeLessThan(0.1);
      for (let j = i + 1; j < kids.length; j++) {
        expect(Math.hypot(kids[i].x - kids[j].x, kids[i].y - kids[j].y)).toBeGreaterThanOrEqual(kids[i].r + kids[j].r - 1e-9);
      }
    }
    expect(byId("A-1").leaf).toBe(true);
    expect(byId("C-1").leaf).toBe(false);
    expect(byId("C-1").weight).toBe(3);
    expect(byId("C-1").r).toBeGreaterThan(byId("A-1").r);
    // Left to right, in birth order.
    expect(kids.map((n) => n.person.wtid)).toEqual(["A-1", "B-1", "C-1", "D-1"]);
    expect(kids[0].x).toBeLessThan(kids[3].x);
  });

  test("a big family of mixed sizes still fits without overlaps", () => {
    for (const weights of [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [40, 1, 1, 3, 1, 25, 1], [2, 2], [1, 30]]) {
      const spots = placeChildren(weights);
      spots.forEach((a, i) => {
        expect(Math.hypot(a.dx, a.dy) + a.r).toBeLessThanOrEqual(1);
        spots.slice(i + 1).forEach((b) => expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThanOrEqual(a.r + b.r - 1e-9));
      });
    }
  });

  test("an only child sits straight up", () => {
    expect(placeChildren([5])).toEqual([expect.objectContaining({ dx: 0, angle: 0 })]);
    expect(placeChildren([])).toEqual([]);
  });

  test("an empty tree has no nodes", () => {
    expect(buildFractalLayout(null).nodes).toEqual([]);
  });
});

describe("treeFromAncestorSlots", () => {
  test("parents become the branches", () => {
    const slots = new Array(8).fill(null);
    slots[1] = person("Root-1");
    slots[2] = person("Dad-1");
    slots[3] = person("Mum-1");
    slots[5] = person("Gm-1");
    const tree = treeFromAncestorSlots(slots);
    expect(tree.children.map((c) => c.person.wtid)).toEqual(["Dad-1", "Mum-1"]);
    expect(tree.children[0].children.map((c) => c.person.wtid)).toEqual(["Gm-1"]);
    expect(tree.children[0].depth).toBe(1);
  });
});

describe("buildFractalTreeSummary", () => {
  test("descendants", () => {
    const tree = {
      person: person("Root-1"),
      depth: 0,
      children: [{ person: person("Big-1"), depth: 1, children: [1, 2, 3, 4].map((i) => leaf(`K-${i}`, 2)) }, leaf("Solo-1", 1)],
    };
    expect(buildFractalTreeSummary(tree, "Ellen's")).toBe(
      "Ellen's fractal tree holds 6 descendants over 2 generations; 5 lines end in a leaf. The biggest family on it is Big-1's, with 4 children. Zoom into anyone to see their family inside their circle."
    );
  });

  test("no branches", () => {
    expect(buildFractalTreeSummary({ person: person("Solo-1"), children: [], depth: 0 }, "Your", "ancestors")).toBe(
      "Your fractal tree has no branches yet: no parents are recorded on WikiTree."
    );
  });
});

describe("loading more as you zoom in", () => {
  const anc = (wtid, fatherId = 0, motherId = 0) => ({ ...person(wtid), fatherId, motherId });

  test("ancestors at the edge with a parent recorded are flagged; descendants at the edge always are", () => {
    const tree = { person: anc("Root-1", 2, 3), depth: 0, children: [{ person: anc("Dad-1", 4, 0), depth: 1, children: [] }, { person: anc("Mum-1"), depth: 1, children: [] }] };
    expect(markFrontier(tree, "ancestors", 1)).toBe(1);
    expect(tree.children.map((c) => c.more)).toEqual([true, false]);
    expect(hasFrontier(tree)).toBe(true);
    expect(markFrontier(tree, "descendants", 1)).toBe(2);
    expect(markFrontier(tree, "descendants", 5)).toBe(0);
    expect(hasFrontier(tree)).toBe(false);
  });

  test("a grafted branch grows inside its circle and nothing already drawn moves", () => {
    const tree = { person: anc("Root-1"), depth: 0, children: [{ person: anc("Dad-1", 4), depth: 1, children: [] }, leaf("Mum-1", 1)] };
    markFrontier(tree, "ancestors", 1);
    const before = buildFractalLayout(tree).nodes.map(({ x, y, r }) => ({ x, y, r }));
    expect(buildFractalLayout(tree).nodes[1]).toMatchObject({ more: true, leaf: false });
    const branch = { person: anc("Dad-1"), depth: 0, children: [{ person: anc("Gf-1"), depth: 1, children: [leaf("Ggf-1", 2)] }] };
    expect(graftBranch(tree.children[0], branch)).toBe(2);
    const after = buildFractalLayout(tree).nodes;
    expect(after.map((n) => n.person.wtid)).toEqual(["Root-1", "Dad-1", "Gf-1", "Ggf-1", "Mum-1"]);
    expect(after[1]).toMatchObject({ ...before[1], more: false });
    expect(after[4]).toMatchObject(before[2]);
    expect(after[3].depth).toBe(3);
    expect(Math.hypot(after[2].x - after[1].x, after[2].y - after[1].y) + after[2].r).toBeLessThanOrEqual(after[1].r);
  });

  test("an empty branch turns the bud into a leaf", () => {
    const node = { person: anc("Dad-1", 4), depth: 1, children: [], more: true };
    expect(graftBranch(node, { person: anc("Dad-1"), children: [] })).toBe(0);
    expect(node.more).toBe(false);
  });

  test("the summary gives no grand total while lines go further", () => {
    const tree = { person: anc("Root-1"), depth: 0, children: [{ person: anc("Dad-1", 4), depth: 1, children: [] }] };
    markFrontier(tree, "ancestors", 1);
    expect(buildFractalTreeSummary(tree, "Your", "ancestors")).toBe(
      "Your fractal tree starts with 1 ancestor over 1 generation, and some lines go further. Zoom into anyone to see their family inside their circle; more generations load as you go."
    );
  });
});
