import {
  createFamilyWorld,
  mergeWorldPeople,
  buildFamilyWorldLayout,
  buildFamilyWorldSummary,
  climbFamilyScene,
  rerootFamilyScene,
  normaliseFamilyScene,
  startFamilyScene,
} from "./chat_family_world_data";

// getPeople-shaped people: Id, Name, Father, Mother, Meta.Degrees, Gender, Spouses.
const raw = (id, name, father = 0, mother = 0, birth = "", degrees = 0, gender = "", spouses = []) => ({
  Id: id,
  Name: name,
  RealName: name.split("-")[0],
  LastNameAtBirth: "X",
  Gender: gender,
  Father: father,
  Mother: mother,
  BirthDate: birth,
  Meta: { Degrees: degrees },
  Spouses: spouses.map((spouseId) => ({ Id: spouseId, Name: `S-${spouseId}`, MarriageDate: "1890-00-00" })),
});

// Focus 1 (Ann) with parents Tom 2 & Sue 3, a brother Bob 4 (married to Liz 10), a son Kit 5
// (father not recorded); Tom's parents Joe 6 & May 7 with Tom's sister Eve 8.
const people = {
  1: raw(1, "Ann-1", 2, 3, "1900", 0, "Female"),
  2: raw(2, "Tom-2", 6, 7, "1870", 1, "Male", [3]),
  3: raw(3, "Sue-3", 0, 0, "1872", 1, "Female", [2]),
  4: raw(4, "Bob-4", 2, 3, "1898", 1, "Male", [10]),
  5: raw(5, "Kit-5", 0, 1, "1925", 1, "Male"),
  6: raw(6, "Joe-6", 0, 0, "1840", 2, "Male", [7]),
  7: raw(7, "May-7", 0, 0, "1842", 2, "Female", [6]),
  8: raw(8, "Eve-8", 6, 7, "1868", 3, "Female"),
  10: raw(10, "Liz-10", 0, 0, "1899", 2, "Female", [4]),
};

function world(extra = {}) {
  const w = createFamilyWorld("Ann-1");
  mergeWorldPeople(w, { ...people, ...extra }, { root: "Ann-1", nuclear: 3 });
  return w;
}

const byUid = (nodes, uid) => nodes.find((node) => node.uid === uid);

describe("family world", () => {
  test("nuclear degrees decide who is complete", () => {
    const w = world();
    expect(w.focusId).toBe(1);
    expect(w.childrenKnown.has(6)).toBe(true);
    expect(w.childrenKnown.has(8)).toBe(false); // 3 steps away: her family isn't loaded
  });

  test("it opens on the person among their brothers and sisters, inside their parents' circle", () => {
    const { nodes } = buildFamilyWorldLayout(world());
    expect(nodes[0]).toMatchObject({ uid: "m2-3", kind: "family", parent: -1, x: 0, y: 0, r: 1, couple: { a: 2, b: 3 } });
    expect(nodes[0].person.name).toBe("Tom X & Sue X");
    // Bob with his wife, then Ann (the focus) with her son inside.
    expect(nodes[0].children.map((i) => [nodes[i].uid, nodes[i].person.name])).toEqual([
      ["m4-10", "Bob X & Liz X"],
      ["p1", "Ann"],
    ]);
    const ann = byUid(nodes, "p1");
    expect(ann.focus).toBe(true);
    expect(ann.children.map((i) => nodes[i].person.name)).toEqual(["Kit"]);
    expect(nodes.filter((node) => node.focus)).toHaveLength(1);
  });

  test("zooming out goes to the parents' families; it says when it must load first, or can't", () => {
    const w = world();
    // Sue's parents aren't recorded, so there's just Tom's.
    expect(climbFamilyScene(w)).toEqual({ status: "ready", root: { a: 6, b: 7 } });
    w.scene = { root: { a: 8, b: 0 }, scale: 1, x: 0, y: 0, trail: [] };
    expect(climbFamilyScene(w)).toEqual({ status: "load", ids: [8] }); // Eve is at the edge of what's loaded
    w.tried.add(8); // fetched around her, and still no parents
    expect(climbFamilyScene(w)).toEqual({ status: "none" });
  });

  // Sue's parents Ned 40 & Peg 41, with her sister Amy 42.
  const sueParents = {
    3: raw(3, "Sue-3", 40, 41, "1872", 1, "Female", [2]),
    40: raw(40, "Ned-40", 0, 0, "1845", 2, "Male", [41]),
    41: raw(41, "Peg-41", 0, 0, "1846", 2, "Female", [40]),
    42: raw(42, "Amy-42", 40, 41, "1875", 2, "Female"),
  };

  test("zooming out from a couple gives both sets of parents, side by side, with nothing jumping", () => {
    const w = world(sueParents);
    const before = buildFamilyWorldLayout(w).nodes;
    const step = climbFamilyScene(w);
    expect(step).toEqual({ status: "ready", root: { band: [{ a: 6, b: 7 }, { a: 40, b: 41 }], from: { a: 2, b: 3 } } });
    expect(rerootFamilyScene(w, step.root, before[0].uid, before, "up")).toBe(true);
    const after = buildFamilyWorldLayout(w).nodes;
    expect(after[0]).toMatchObject({ kind: "band", couple: null });
    expect(after[0].person.name).toBe("The parents of Tom X & Sue X");
    // His family, the couple, her family; each family has a placeholder where they grew up.
    expect(after[0].children.map((i) => [after[i].uid, after[i].side])).toEqual([
      ["m6-7", true],
      ["m2-3", false],
      ["m40-41", true],
    ]);
    expect(byUid(after, "m6-7").children.map((i) => [after[i].uid, after[i].kind])).toEqual([
      ["p8", "person"],
      ["g2", "ghost"],
    ]);
    expect(byUid(after, "m40-41").children.map((i) => [after[i].uid, after[i].kind])).toEqual([
      ["g3", "ghost"],
      ["p42", "person"],
    ]);
    expect(byUid(after, "g2").ghostOf).toBe("m2-3");
    expect(byUid(after, "g3").ghostOf).toBe("m2-3");
    ["m2-3", "m4-10", "p1", "p5"].forEach((uid) => {
      const a = byUid(before, uid);
      const b = byUid(after, uid);
      // (to the layout's rounding: a billionth of the first circle)
      [b.x - a.x, b.y - a.y, b.r - a.r].forEach((delta) => expect(Math.abs(delta)).toBeLessThan(1e-8));
    });
    // Zooming out of Tom's parents' family: none recorded above them. Out of Sue's: Ned's parents, once loaded.
    expect(climbFamilyScene(w, { a: 6, b: 7 })).toEqual({ status: "none" });
    mergeWorldPeople(w, { 40: raw(40, "Ned-40", 50, 0, "1845", 2, "Male", [41]), 50: raw(50, "Abe-50", 0, 0, "1820", 3, "Male") }, { root: "Ann-1" });
    expect(climbFamilyScene(w, { a: 40, b: 41 })).toEqual({ status: "load", ids: [50] });
  });

  test("a placeholder holds the other families its person had", () => {
    const w = world({
      ...sueParents,
      3: raw(3, "Sue-3", 40, 41, "1872", 1, "Female", [2, 60]),
      60: raw(60, "Max-60", 0, 0, "1868", 2, "Male", [3]),
      61: raw(61, "Gus-61", 60, 3, "1910", 2, "Male"),
    });
    const before = buildFamilyWorldLayout(w).nodes;
    rerootFamilyScene(w, climbFamilyScene(w).root, before[0].uid, before, "up");
    const after = buildFamilyWorldLayout(w).nodes;
    const sue = byUid(after, "g3");
    expect(sue.children.map((i) => after[i].uid)).toEqual(["m3-60"]);
    expect(byUid(after, "m3-60").children.map((i) => after[i].person.name)).toEqual(["Gus"]);
  });

  test("zooming in and back out returns the way you came", () => {
    const w = world(sueParents);
    const top = buildFamilyWorldLayout(w).nodes;
    expect(rerootFamilyScene(w, { a: 4, b: 10 }, "m4-10", top, "down")).toBe(true);
    const down = buildFamilyWorldLayout(w).nodes;
    expect(down[0].uid).toBe("m4-10");
    const step = climbFamilyScene(w);
    expect(step).toEqual({ status: "ready", root: { a: 2, b: 3 }, back: true });
    expect(rerootFamilyScene(w, step.root, "m4-10", down, "back")).toBe(true);
    const back = buildFamilyWorldLayout(w).nodes;
    expect(back[0].uid).toBe("m2-3");
    expect(back[0].r).toBeCloseTo(1, 9);
    expect(w.scene.trail).toEqual([]);
    expect(normaliseFamilyScene(w).scale).toBeCloseTo(1, 9);
    expect(w.scene).toMatchObject({ scale: 1, x: 0, y: 0 });
    // Now it climbs on up: both sets of parents.
    expect(climbFamilyScene(w).root.band).toHaveLength(2);
  });

  test("a child whose other parent isn't recorded counts as the only spouse's, both ways round", () => {
    const w = createFamilyWorld("Kid-22");
    mergeWorldPeople(
      w,
      {
        20: raw(20, "Dad-20", 0, 0, "1800", 1, "Male", [21]),
        21: raw(21, "Mum-21", 0, 0, "1802", 1, "Female", [20]),
        22: raw(22, "Kid-22", 20, 0, "1830", 0, "Male"),
      },
      { root: 22, nuclear: 3 }
    );
    startFamilyScene(w);
    expect(w.scene.root).toEqual({ a: 20, b: 21 });
    const { nodes } = buildFamilyWorldLayout(w);
    expect(nodes[0].children.map((i) => nodes[i].uid)).toEqual(["p22"]);
  });

  test("someone with children by two partners holds a circle for each family", () => {
    const { nodes } = buildFamilyWorldLayout(
      world({
        4: raw(4, "Bob-4", 2, 3, "1898", 1, "Male", [10, 11]),
        11: raw(11, "Ivy-11", 0, 0, "1901", 2, "Female", [4]),
        12: raw(12, "Ray-12", 4, 11, "1930", 2, "Male"),
      })
    );
    const bob = byUid(nodes, "p4");
    expect(bob.children.map((i) => [nodes[i].uid, nodes[i].kind])).toEqual([
      ["m4-10", "family"],
      ["m4-11", "family"],
    ]);
    expect(byUid(nodes, "m4-11").children.map((i) => nodes[i].person.name)).toEqual(["Ray"]);
  });

  test("the layout stays put when more arrives", () => {
    const w = world();
    const before = buildFamilyWorldLayout(w).nodes;
    mergeWorldPeople(w, { 30: raw(30, "Ned-30", 4, 10, "1925", 2, "Male") }, { root: 4, nuclear: 3 });
    const after = buildFamilyWorldLayout(w).nodes;
    const keep = (list) => list.filter((n) => n.uid !== "p30").map(({ uid, x, y, r }) => ({ uid, x, y, r }));
    expect(keep(after)).toEqual(keep(before));
    expect(byUid(after, "p30").parent).toBe(byUid(after, "m4-10").index);
  });

  test("summary", () => {
    expect(buildFamilyWorldSummary(world(), "Ann's")).toMatch(
      /^Ann's Family Explorer starts with 9 people \(2 generations of ancestors so far\)\. It opens on Ann among her brother or sister, with their husbands and wives\./
    );
  });
});

describe("parseFamilyWorldPrompt", () => {
  const { parseFamilyWorldPrompt } = require("./chat_family_world_data");
  test.each([
    ["show my family world", { owner: "my", subjectPrompt: "my ancestors" }],
    ["family world", { owner: "", subjectPrompt: "this profile's ancestors" }],
    ["family explorer", { owner: "", subjectPrompt: "this profile's ancestors" }],
    ["explorer", { owner: "", subjectPrompt: "this profile's ancestors" }],
    ["show my family explorer", { owner: "my", subjectPrompt: "my ancestors" }],
    ["show Cook-8721's CC7 tree", { owner: "Cook-8721", subjectPrompt: "Cook-8721's ancestors" }],
    ["family world for her", { owner: "her", subjectPrompt: "her ancestors" }],
    ["show me everyone connected to Windsor-1", { owner: "Windsor-1", subjectPrompt: "Windsor-1's ancestors" }],
    ["explore my whole family tree", { owner: "my", subjectPrompt: "my ancestors" }],
    ["open a zoomable CC7 for me", { owner: "my", subjectPrompt: "my ancestors" }],
    ["fractal", { owner: "", subjectPrompt: "this profile's ancestors" }],
    ["show my fractal tree", { owner: "my", subjectPrompt: "my ancestors" }],
    ["fractal tree for Cook-8721", { owner: "Cook-8721", subjectPrompt: "Cook-8721's ancestors" }],
  ])("%s", (prompt, expected) => expect(parseFamilyWorldPrompt(prompt)).toEqual(expected));

  test.each(["show my cc7", "notables in my CC7", "show my family tree", "who is in my family world cup team", "cc7 born in Ohio", "show my ancestors as a fractal tree", "fractal tree of my descendants"])("declines %s", (prompt) =>
    expect(parseFamilyWorldPrompt(prompt)).toBeNull()
  );
});

describe("hidden profiles (negative Ids, numbered per response)", () => {
  const hidden = (id, father = 0, mother = 0, spouses = []) => ({ Id: id, Father: father, Mother: mother, Privacy: 20, Spouses: spouses.map((spouseId) => ({ Id: spouseId })) });

  test("a grandfather keeps his hidden wife and children, as Private", () => {
    const w = createFamilyWorld("Gf-1");
    mergeWorldPeople(w, { 1: raw(1, "Gf-1", 0, 0, "1900", 0, "Male", [-1]), [-1]: hidden(-1, 0, 0, [1]), [-2]: hidden(-2, 1, -1), [-3]: hidden(-3, 1, -1) }, { root: "Gf-1", nuclear: 2 });
    const ids = [...w.people.keys()].filter((id) => id < 0);
    expect(ids).toHaveLength(3);
    expect([...w.people.values()].filter((person) => person.hidden).map((person) => person.name)).toEqual(["Private", "Private", "Private"]);
    const wife = w.people.get(1).spouses[0].id;
    expect(w.people.get(wife).hidden).toBe(true);
    expect([...w.people.values()].filter((person) => person.fatherId === 1 && person.motherId === wife)).toHaveLength(2);
    expect(w.tried.has(wife)).toBe(true);
  });

  test("a second fetch's -1 is someone else, and it replaces the first fetch's placeholders", () => {
    const w = createFamilyWorld("Gf-1");
    mergeWorldPeople(w, { 1: raw(1, "Gf-1", 0, 0, "1900", 0, "Male", [-1]), [-1]: hidden(-1, 0, 0, [1]), [-2]: hidden(-2, 1, -1) }, { root: "Gf-1", nuclear: 2 });
    mergeWorldPeople(w, { 1: raw(1, "Gf-1", 0, 0, "1900", 0, "Male", [-1]), [-1]: hidden(-1, 0, 0, [1]), [-2]: hidden(-2, 1, -1), [-3]: hidden(-3, 1, -1) }, { root: "Gf-1", nuclear: 2 });
    expect([...w.people.keys()].filter((id) => id < 0)).toHaveLength(3); // the wife and two children, not five
  });
});
