import {
  lineKey,
  treatAsLiving,
  ancestorSlots,
  ancestorsLoaded,
  tornadoLayout,
  tornadoBallRadius,
  fanTowerLayout,
  dropMesh,
  cylinderMesh,
  discMesh,
  sectorMesh,
  mergeMeshes,
  meshVolume,
  isClosedMesh,
  printModel,
  stlFile,
  threeMfFiles,
  blockTop,
  roomAt,
  fitLabel,
  PART_COLOURS,
  PLAQUE,
  plaqueSplit,
  plaquesLayout,
  boxMesh,
} from "./chat_print3d_data";

// A pedigree with gaps: ids are the slot numbers; slots 9, 10 and 12 up are nobody.
function pedigree(top = 15, living = [1, 3]) {
  const people = new Map();
  for (let slot = 1; slot <= top; slot += 1) {
    if ([9, 10].includes(slot)) continue;
    const parent = (n) => (n <= top && ![9, 10].includes(n) ? n : 0);
    people.set(slot, {
      id: slot,
      name: `P${slot}`,
      lnab: "X",
      birth: living.includes(slot) ? "1990-01-01" : "1800-01-01",
      death: living.includes(slot) ? "" : "1870-01-01",
      living: living.includes(slot) ? true : null,
      fatherId: parent(slot * 2),
      motherId: parent(slot * 2 + 1),
    });
  }
  return people;
}

describe("who goes where", () => {
  test("lineKey: the person, then each grandparent's line; a parent takes their father's line", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 40, 63].map(lineKey)).toEqual([
      "root",
      "line4",
      "line6",
      "line4",
      "line5",
      "line6",
      "line7",
      "line4",
      "line5",
      "line6",
      "line7",
      "line5",
      "line7",
    ]);
  });

  test("treatAsLiving", () => {
    expect(treatAsLiving({ living: true }, 2026)).toBe(true);
    expect(treatAsLiving({ living: false, birth: "1990" }, 2026)).toBe(false);
    expect(treatAsLiving({ living: null, birth: "1950-03-02" }, 2026)).toBe(true);
    expect(treatAsLiving({ living: null, birth: "1900" }, 2026)).toBe(false);
    expect(treatAsLiving({ living: null, birth: "1950", death: "2001" }, 2026)).toBe(false);
    expect(treatAsLiving({ living: null }, 2026)).toBe(false);
    expect(treatAsLiving({ hidden: true }, 2026)).toBe(true);
  });

  test("ancestorSlots follow father and mother ids; ancestorsLoaded spots a parent not fetched yet", () => {
    const people = pedigree();
    const slots = ancestorSlots(people, 1, 3);
    expect(slots).toHaveLength(16);
    expect(slots[1].id).toBe(1);
    expect(slots[8].id).toBe(8);
    expect(slots[9]).toBeNull();
    expect(slots[10]).toBeNull();
    expect(ancestorsLoaded(people, slots)).toBe(true);
    people.get(4).fatherId = 99;
    expect(ancestorsLoaded(people, ancestorSlots(people, 1, 3))).toBe(false);
  });
});

describe("Tornado", () => {
  const slots = ancestorSlots(pedigree(), 1, 3);
  const layout = tornadoLayout(slots, 3);

  test("a ball for everyone known, a strut down to each one's child", () => {
    expect(layout.balls.map((ball) => ball.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15]);
    expect(layout.struts).toHaveLength(12);
    const root = layout.balls[0];
    expect(Math.hypot(root.x, root.y)).toBe(0);
    expect(layout.struts.find((strut) => strut.slot === 6)).toMatchObject({ key: "line6" });
  });

  test("each generation is higher and further out; balls get smaller", () => {
    const at = (g) => layout.balls.filter((ball) => ball.generation === g);
    for (let g = 1; g <= 3; g += 1) {
      expect(at(g)[0].z).toBeGreaterThan(at(g - 1)[0].z);
      expect(Math.hypot(at(g)[0].x, at(g)[0].y)).toBeCloseTo(9 * g);
      expect(tornadoBallRadius(g)).toBeLessThan(tornadoBallRadius(g - 1));
    }
    expect(tornadoBallRadius(8)).toBeGreaterThanOrEqual(1.5);
  });

  test("no strut leans more than 45° (it prints without supports)", () => {
    const deep = tornadoLayout(ancestorSlots(pedigree(511, []), 1, 8), 8);
    deep.struts.forEach(({ from, to }) => {
      expect(to[2] - from[2]).toBeGreaterThanOrEqual(Math.hypot(to[0] - from[0], to[1] - from[1]) - 1e-9);
    });
  });
});

describe("Fan tower", () => {
  const layout = fanTowerLayout(ancestorSlots(pedigree(), 1, 3), 3);

  test("the person is a disc in the middle and the highest step; each generation a step lower and further out", () => {
    const root = layout.blocks[0];
    expect(root).toMatchObject({ slot: 1, r0: 0, a0: 0 });
    const father = layout.blocks.find((block) => block.slot === 2);
    const grandfather = layout.blocks.find((block) => block.slot === 4);
    expect(father.z1).toBeLessThan(root.z1);
    expect(grandfather.z1).toBeLessThan(father.z1);
    expect(grandfather.r0).toBeGreaterThan(father.r1);
    expect(father.a1 - father.a0).toBeLessThan(Math.PI);
    expect(layout.blocks.some((block) => block.slot === 9)).toBe(false);
  });

  test("neighbours have a gap between them", () => {
    const [a, b] = [12, 13].map((slot) => layout.blocks.find((block) => block.slot === slot));
    expect(b.a0).toBeGreaterThan(a.a1);
  });
});

describe("meshes", () => {
  const volumeOf = (mesh) => meshVolume(mesh);

  test.each([
    ["drop", dropMesh([3, 4, 5], 5, 24, 10)],
    ["cylinder", cylinderMesh([0, 0, 0], [3, 4, 12], 1.5)],
    ["disc", discMesh(20, 0, 3)],
    ["sector", sectorMesh({ a0: 0.3, a1: 1.9, r0: 10, r1: 18, z0: 3, z1: 12 })],
    ["thin sector", sectorMesh({ a0: 0.3, a1: 0.32, r0: 50, r1: 55, z0: 3, z1: 6 })],
    ["whole ring centre", sectorMesh({ a0: 0, a1: 2 * Math.PI, r0: 0, r1: 10, z0: 3, z1: 30 })],
  ])("%s is closed and wound outward", (name, mesh) => {
    expect(isClosedMesh(mesh)).toBe(true);
    expect(volumeOf(mesh)).toBeGreaterThan(0);
  });

  test("volumes come out about right", () => {
    expect(volumeOf(cylinderMesh([0, 0, 0], [0, 0, 10], 2, 64))).toBeCloseTo(Math.PI * 4 * 10, -0.5);
    expect(volumeOf(sectorMesh({ a0: 0, a1: Math.PI / 2, r0: 10, r1: 20, z0: 0, z1: 5 }, Math.PI / 400))).toBeCloseTo((Math.PI / 4) * (400 - 100) * 5, -0.5);
    // a ball plus a cone under it
    const r = 5;
    const ball = (4 / 3) * Math.PI * r ** 3;
    expect(volumeOf(dropMesh([0, 0, 0], r, 96, 48))).toBeGreaterThan(ball);
    expect(volumeOf(dropMesh([0, 0, 0], r, 96, 48))).toBeLessThan(ball * 1.15);
  });

  test("mergeMeshes keeps each piece closed", () => {
    const merged = mergeMeshes([discMesh(5, 0, 1), cylinderMesh([0, 0, 1], [0, 0, 9], 1)]);
    expect(isClosedMesh(merged)).toBe(true);
    expect(merged.triangles.length).toBe(discMesh(5, 0, 1).triangles.length + cylinderMesh([0, 0, 1], [0, 0, 9], 1).triangles.length);
  });
});

describe("the print", () => {
  const slots = ancestorSlots(pedigree(), 1, 3);

  test("one closed mesh per colour used, living people left out", () => {
    const { parts, size } = printModel(slots, { shape: "tower", generations: 3 });
    expect(parts.map((part) => part.name)).toEqual(["Start person and base", "Father's father's line", "Father's mother's line", "Mother's father's line", "Mother's mother's line"]);
    parts.forEach((part) => expect(isClosedMesh(part.mesh)).toBe(true));
    // the mother (slot 3, living) is left out of the tower; with her, line6 has one more block
    const withLiving = printModel(slots, { shape: "tower", generations: 3, leaveOutLiving: false });
    const blocks = (model) => model.parts.find((part) => part.name === "Mother's father's line").mesh.vertices.length;
    expect(blocks(withLiving)).toBeGreaterThan(blocks({ parts }));
    expect(size.width).toBeGreaterThan(50);
  });

  test("in the Tornado a living person is a small joint, so the struts above stay up", () => {
    const left = printModel(slots, { shape: "tornado", generations: 3 });
    const kept = printModel(slots, { shape: "tornado", generations: 3, leaveOutLiving: false });
    const volume = (model, colour) => meshVolume(model.parts.find((part) => part.colour === colour).mesh);
    expect(volume(left, PART_COLOURS.line6)).toBeLessThan(volume(kept, PART_COLOURS.line6));
    expect(volume(left, PART_COLOURS.line6)).toBeGreaterThan(0);
    left.parts.forEach((part) => expect(isClosedMesh(part.mesh)).toBe(true));
  });

  test("another colouring prints in its own colours, one part each, the base still ivory", () => {
    const { parts } = printModel(slots, { shape: "tower", generations: 3, colourOf: (slot) => (slot % 2 ? "#E59AB8" : "#7fa7d9"), nameOf: (colour) => `Colour ${colour}` });
    // (in the order first used: the base, then the start person, slot 1)
    expect(parts.map((part) => part.colour)).toEqual([PART_COLOURS.root, "#e59ab8", "#7fa7d9"]);
    expect(parts[2].name).toBe("Colour #7fa7d9");
    parts.forEach((part) => expect(isClosedMesh(part.mesh)).toBe(true));
  });

  test("STL: 80-byte header, the count, 50 bytes a triangle", () => {
    const { parts } = printModel(slots, { shape: "tower", generations: 3 });
    const buffer = stlFile(parts, "Fan tower of Ann Rouquié");
    const count = parts.reduce((total, part) => total + part.mesh.triangles.length, 0);
    expect(buffer.byteLength).toBe(84 + 50 * count);
    const view = new DataView(buffer);
    expect(view.getUint32(80, true)).toBe(count);
    const header = String.fromCharCode(...new Uint8Array(buffer, 0, 40));
    expect(header).toMatch(/^WikiTree Fan tower of Ann Rouqui\?/);
    // the first normal is a unit vector
    const normal = [0, 1, 2].map((i) => view.getFloat32(84 + i * 4, true));
    expect(Math.hypot(...normal)).toBeCloseTo(1, 5);
  });

  test("3MF: the package files, a coloured object per part, gathered into one", () => {
    const { parts } = printModel(slots, { shape: "tornado", generations: 2 });
    const files = threeMfFiles(parts, "Tornado & co");
    expect(Object.keys(files)).toEqual(["[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model"]);
    const model = files["3D/3dmodel.model"];
    expect(model).toContain('unit="millimeter"');
    expect(model).toContain('<base name="Start person and base" displaycolor="#EFE6D2FF"/>');
    expect(model.match(/<object /g)).toHaveLength(parts.length + 1);
    expect(model.match(/<component /g)).toHaveLength(parts.length);
    expect(model).toContain(`<build><item objectid="${parts.length + 2}"/></build>`);
    expect(model).toContain("Tornado &amp; co");
    expect(files["_rels/.rels"]).toContain('Target="/3D/3dmodel.model"');
  });
});

describe("names on the model", () => {
  test("blockTop: the outline goes out along the outer edge and back along the inner one", () => {
    const { outline, centre } = blockTop({ a0: 0, a1: Math.PI / 2, r0: 10, r1: 20, z1: 7 });
    expect(outline[0]).toEqual([20, 0, 7]);
    expect(outline[outline.length - 1][0]).toBeCloseTo(10);
    expect(outline.every((point) => point[2] === 7)).toBe(true);
    expect(Math.hypot(centre[0], centre[1])).toBeCloseTo(15);
    expect(blockTop({ a0: 0, a1: 2 * Math.PI, r0: 0, r1: 10, z1: 30 }).centre).toEqual([0, 0, 30]);
  });

  test("roomAt: the span across and down through a point", () => {
    const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 }, { x: 0, y: 40 }];
    expect(roomAt(square, 30, 20)).toEqual({ w: 100, h: 40 });
    expect(roomAt(square, 130, 20)).toEqual({ w: 0, h: 0 });
    // an L: across the foot it's wide, up the stem narrow
    const ell = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 80 }, { x: 100, y: 80 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
    expect(roomAt(ell, 10, 40).w).toBe(20);
    expect(roomAt(ell, 60, 90).w).toBe(100);
  });

  const measure = (text) => text.length * 55; // about 0.55 em a letter

  test("fitLabel: a name and its years where there's room", () => {
    const label = fitLabel("Harriet Pulliam", "1801–1870", { w: 200, h: 60 }, measure);
    expect(label.lines.map((line) => line.text)).toEqual(["Harriet Pulliam", "1801–1870"]);
    expect(label.font).toBe(14);
  });

  test("fitLabel: a narrow block puts the surname on its own line", () => {
    const label = fitLabel("Harriet Pulliam", "1801–1870", { w: 60, h: 60 }, measure);
    expect(label.lines.map((line) => line.text)).toEqual(["Harriet", "Pulliam", "1801–1870"]);
  });

  test("fitLabel: a flat block leaves the years off; too small for a name is nothing", () => {
    expect(fitLabel("Harriet Pulliam", "1801–1870", { w: 200, h: 18 }, measure).lines.map((line) => line.text)).toEqual(["Harriet Pulliam"]);
    expect(fitLabel("Harriet Pulliam", "1801–1870", { w: 30, h: 10 }, measure)).toBeNull();
    expect(fitLabel("Harriet Pulliam", "", { w: 200, h: 60 }, measure).lines).toHaveLength(1);
  });
});

describe("plaques", () => {
  const slotsFor = (generations) => ancestorSlots(pedigree(2 ** (generations + 1) - 1, [1]), 1, generations);

  test("fathers to the left, mothers to the right, then front and back, a quarter turn a generation", () => {
    const { plaques } = plaquesLayout(slotsFor(3), 3);
    const at = new Map(plaques.map((plaque) => [plaque.slot, plaque]));
    expect([at.get(1).x, at.get(1).y]).toEqual([0, 0]);
    expect(at.get(2).x).toBeLessThan(0);
    expect(at.get(3).x).toBeGreaterThan(0);
    expect(at.get(2).y).toBe(0);
    // (the grandparents: the same x as their child, one in front and one behind)
    expect(at.get(4).x).toBe(at.get(2).x);
    expect(at.get(4).y).toBeLessThan(0);
    expect(at.get(5).y).toBeGreaterThan(0);
    expect(at.get(8).y).toBe(at.get(4).y);
    expect(at.get(8).x).toBeLessThan(at.get(4).x);
    // (each generation higher than the last, the start person's plaque the biggest)
    expect(at.get(2).z).toBeGreaterThan(at.get(1).z);
    expect(at.get(8).z).toBeGreaterThan(at.get(4).z);
    expect(at.get(1).w).toBe(PLAQUE.rootWidth);
    expect(plaqueSplit(1, 3).axis).toBe(0);
    expect(plaqueSplit(2, 3).axis).toBe(1);
  });

  test("no two plaques of a generation touch, up to 7 generations", () => {
    [3, 4, 5, 6, 7].forEach((generations) => {
      const slots = new Array(2 ** (generations + 1)).fill(null).map((entry, slot) => (slot ? { id: slot, name: `P${slot}` } : null));
      const { plaques } = plaquesLayout(slots, generations);
      expect(plaques).toHaveLength(2 ** (generations + 1) - 1);
      for (let g = 1; g <= generations; g += 1) {
        const level = plaques.filter((plaque) => plaque.generation === g);
        level.forEach((a, i) =>
          level.slice(i + 1).forEach((b) => {
            const apart = Math.abs(a.x - b.x) >= a.w + PLAQUE.gap - 1e-9 || Math.abs(a.y - b.y) >= PLAQUE.row - 1e-9;
            expect(apart).toBe(true);
          })
        );
      }
    });
  });

  test("links: a post up from each child, a crossbar and a post up to each parent; none to the missing", () => {
    const { links, plaques } = plaquesLayout(slotsFor(3), 3);
    const at = new Map(plaques.map((plaque) => [plaque.slot, plaque]));
    // (slots 9 and 10 are nobody: no crossbar half or post to them, and 4's and 5's posts lead to one parent each)
    expect(links.some((link) => link.slot === 9 || link.slot === 10)).toBe(false);
    const stand = links.find((link) => link.slot === 1 && link.to[2] === at.get(1).z - at.get(1).h / 2);
    expect(stand.from[2]).toBeLessThan(PLAQUE.base);
    const up = links.filter((link) => link.slot === 2);
    expect(up).toHaveLength(3); // (the crossbar half, the post up to 2, and 2's own post up to their parents)
    const toTwo = up.find((link) => link.to[2] === at.get(2).z - at.get(2).h / 2);
    expect([toTwo.to[0], toTwo.to[1]]).toEqual([at.get(2).x, at.get(2).y]);
    // (a top-generation plaque has nothing above it)
    expect(links.some((link) => link.slot === 8 && link.from[2] > at.get(8).z)).toBe(false);
  });

  test("printModel: closed parts, blank plaques facing the front, living people a joint", () => {
    const slots = slotsFor(3);
    const { parts, size } = printModel(slots, { shape: "plaques", generations: 3 });
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((part) => expect(meshVolume(part.mesh)).toBeGreaterThan(0));
    expect(size.width).toBeGreaterThan(size.depth);
    expect(isClosedMesh(boxMesh([0, 0, 0], [1, 2, 3]))).toBe(true);
    expect(meshVolume(boxMesh([0, 0, 0], [1, 2, 3]))).toBeCloseTo(6);
    const living = ancestorSlots(pedigree(15, [1, 3]), 1, 3);
    const left = printModel(living, { shape: "plaques", generations: 3 });
    const kept = printModel(living, { shape: "plaques", generations: 3, leaveOutLiving: false });
    const volume = (model) => model.parts.reduce((total, part) => total + meshVolume(part.mesh), 0);
    expect(volume(left)).toBeLessThan(volume(kept) - PLAQUE.width * PLAQUE.height * PLAQUE.thick * 0.9);
  });
});
