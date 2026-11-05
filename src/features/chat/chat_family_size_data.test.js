import { buildFamilySizes, describeFamilySizes, parseFamilySizePrompt } from "./chat_family_size_data";

describe("parseFamilySizePrompt", () => {
  test.each([
    ["family size", ""],
    ["my family sizes", "my"],
    ["show Cook-8721's ancestral family sizes", "Cook-8721"],
    ["family size chart", ""],
    ["family sizes in her tree", "her"],
    ["How big were my ancestors' families?", "my"],
    ["how many children did his ancestors have", "his"],
  ])("%s", (prompt, owner) => {
    expect(parseFamilySizePrompt(prompt)).toEqual(expect.objectContaining({ owner, familySize: true }));
  });
  test.each(["how many children did Philip have", "family", "my family", "size of my tree"])("not %s", (prompt) => {
    expect(parseFamilySizePrompt(prompt)).toBeNull();
  });
});

// Slots for 3 generations: root 1, parents 2–3, grandparents 4–7.
const slot = (id, name, extra = {}) => ({ id, wtid: `${name}-${id}`, name, gender: "", birth: "", death: "", ...extra });
const slots = [null, slot(1, "Root", { birth: "1900" }), slot(2, "Dad", { birth: "1870" }), slot(3, "Mum", { birth: "1872" }), slot(4, "GrandpaA"), slot(5, "GrandmaA"), null, slot(7, "GrandmaB"), ...new Array(8).fill(null)];
const person = (Id, Father, Mother, BirthDate, DeathDate = "") => ({ Id, Name: `P-${Id}`, RealName: `P${Id}`, Father, Mother, BirthDate, DeathDate });
const people = {
  1: person(1, 2, 3, "1900-01-01"),
  10: person(10, 2, 3, "1898-01-01"),
  11: person(11, 2, 3, "1902-01-01", "1903-01-01"),
  12: person(12, 2, 99, "1905-01-01"), // a half-sibling: another mother
  2: person(2, 4, 5, "1870-01-01"),
  20: person(20, 4, 5, "1868-01-01"),
  21: person(21, 4, 5, "1874-01-01", "1876-06-01"),
  22: person(22, 4, 5, "1878-01-01"),
  3: person(3, 0, 7, "1872-01-01"),
};

describe("buildFamilySizes", () => {
  const data = buildFamilySizes(slots, people);
  test("each couple's children, the line child marked, half-siblings left out", () => {
    expect(data.rows.map((row) => [row.label, row.couples.map((c) => c.children.length)])).toEqual([
      ["Parents", [3]],
      ["Grandparents", [4, 1]],
    ]);
    const parents = data.rows[0].couples[0];
    expect(parents.children.map((c) => [c.id, c.onLine, c.diedYoung])).toEqual([
      [10, false, false],
      [1, true, false],
      [11, false, true],
    ]);
    expect([parents.firstYear, parents.lastYear]).toEqual([1898, 1902]);
  });
  test("a couple with only the mother known matches on her", () => {
    expect(data.rows[1].couples[1].children.map((c) => c.id)).toEqual([3]);
  });
  test("averages and decades per generation", () => {
    expect(data.rows.map((row) => [row.average, row.median, row.decade])).toEqual([
      [3, 3, 1890],
      [2.5, 2.5, 1870],
    ]);
  });
});

describe("describeFamilySizes", () => {
  test("average, trend, biggest, died young, single children", () => {
    const text = describeFamilySizes(buildFamilySizes(slots, people), "Root's");
    expect(text).toMatch(/^Root's 3 ancestral couples have 8 children recorded on WikiTree: 2\.7 a family on average \(the median is 3\)\./);
    expect(text).toMatch(/Family size held steady over the generations: 2\.5 children for the grandparents \(around the 1870s\), 3 for the parents \(the 1890s\)\./);
    expect(text).toMatch(/The biggest families: GrandpaA and GrandmaA \(4, 1868–1878\); Dad and Mum \(3, 1898–1902\)\./);
    expect(text).toMatch(/2 of the 2 children with both dates died before the age of 5 \(100%\)\./);
    expect(text).toMatch(/1 couple has only the one child recorded/);
  });
  test("nothing to count", () => {
    expect(describeFamilySizes({ rows: [], couples: [] }, "Your")).toMatch(/aren't on WikiTree yet/);
  });
});
