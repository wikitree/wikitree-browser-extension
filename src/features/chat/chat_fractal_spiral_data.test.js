import { buildSpiralLayout } from "./chat_fractal_spiral_data";

const person = (wtid, birth = "") => ({ wtid, name: wtid, birth });
const leaf = (wtid, depth) => ({ person: person(wtid), children: [], depth });

describe("buildSpiralLayout", () => {
  // A root with four children; the third has two children of her own.
  const tree = () => ({
    person: person("Root-1"),
    depth: 0,
    children: [leaf("A-1", 1), leaf("B-1", 1), { person: person("C-1"), depth: 1, children: [leaf("C-2", 2), leaf("C-3", 2)] }, leaf("D-1", 1)],
  });

  test("every person gets a node, siblings fork through junctions", () => {
    const { nodes, branches } = buildSpiralLayout(tree());
    const people = nodes.filter((n) => n.kind === "person").map((n) => n.person.wtid);
    expect(people.sort()).toEqual(["A-1", "B-1", "C-1", "C-2", "C-3", "D-1", "Root-1"]);
    // Four children: A buds off, then a fork carrying B, C, D, then one carrying C, D.
    const junctions = nodes.filter((n) => n.kind === "junction");
    expect(junctions.map((n) => n.label)).toEqual(["5 people", "4 people"]);
    // One branch into every node but the root.
    expect(branches).toHaveLength(nodes.length - 1);
    nodes.forEach((n) => [n.x, n.y, n.r].forEach((v) => expect(Number.isFinite(v)).toBe(true)));
  });

  test("leaves end lines, people with family are forks, and the tree grows up", () => {
    const { nodes, bounds } = buildSpiralLayout(tree());
    const byId = (id) => nodes.find((n) => n.person?.wtid === id);
    expect(byId("A-1").leaf).toBe(true);
    expect(byId("C-1").leaf).toBe(false);
    expect(byId("C-1").weight).toBe(3);
    expect(byId("Root-1").r).toBeGreaterThan(byId("C-2").r);
    expect(bounds.minY).toBeLessThan(-100);
    // A person's box covers their whole branch.
    const c = byId("C-1");
    const c2 = byId("C-2");
    expect(c.bbox.minX).toBeLessThanOrEqual(c2.x - c2.r);
    expect(c.bbox.maxX).toBeGreaterThanOrEqual(c2.x + c2.r);
  });

  test("an empty tree has no nodes", () => {
    expect(buildSpiralLayout(null).nodes).toEqual([]);
  });
});

describe("fullName", () => {
  const { fullName } = require("./chat_chart_common");
  test("adds the surname at birth to the first name, once", () => {
    expect(fullName({ name: "George", lnab: "Hightower" })).toBe("George Hightower");
    expect(fullName({ name: "Mary Hightower", lnab: "Hightower" })).toBe("Mary Hightower");
    expect(fullName({ name: "", lnab: "Cook", wtid: "Cook-1" })).toBe("Cook");
    expect(fullName({ name: "", wtid: "Cook-1" })).toBe("Cook-1");
  });
});
