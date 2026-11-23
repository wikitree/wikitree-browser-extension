import {
  CHRISTMAS_FIELDS,
  christmasFromScan,
  christmasDay,
  christmasGroups,
  groupsFor,
  litBaubles,
  recheckChristmas,
  rowLabel,
  rowOf,
  rowOrder,
  summarize,
  treeRows,
} from "./christmas_tree_data";

const YEAR = 2026;
const MEMBER = 42;
// Shapes as the live API sent them (see haunted_tree_data.js)
const person = (fields) => ({
  Id: 1,
  Name: "Smith-1",
  BirthDate: "1950-04-01",
  DeathDate: "2010-05-06",
  Father: 5,
  Mother: 6,
  Templates: [],
  Connected: 1,
  Meta: { Degrees: 2 },
  ...fields,
});

test("asks for the manager too", () => {
  expect(CHRISTMAS_FIELDS.split(",")).toContain("Manager");
  expect(CHRISTMAS_FIELDS.split(",")).toContain("Templates");
});

describe("christmasGroups", () => {
  test("Haunted Tree's checks, with no Halloween folk", () => {
    expect(christmasGroups(person({}), YEAR)).toEqual([]);
    expect(
      christmasGroups(person({ DeathDate: "0000-00-00", DeathDateDecade: "unknown", BirthDate: "1850-01-01" }), YEAR)
    ).toEqual(["undead"]);
    expect(christmasGroups(person({ Templates: [{ name: "unsourced" }] }), YEAR)).toEqual(["skeleton"]);
    expect(christmasGroups(person({ Father: 0, Mother: 0 }), YEAR)).toEqual(["headless"]);
    expect(christmasGroups(person({ BirthDate: "1900-10-31" }), YEAR)).toEqual([]);
  });

  test("Lone wolves only in the watchlist", () => {
    expect(christmasGroups(person({ Connected: 0 }), YEAR, "cc7")).toEqual([]);
    expect(christmasGroups(person({ Connected: 0 }), YEAR, "watchlist")).toEqual(["lonewolf"]);
    expect(groupsFor("cc7")).not.toContain("lonewolf");
  });

  test("Christmas folk: born or died on 25 December", () => {
    expect(christmasGroups(person({ BirthDate: "1880-12-25" }), YEAR)).toEqual(["christmas"]);
    expect(christmasGroups(person({ DeathDate: "1931-12-25", Father: 0, Mother: 0 }), YEAR)).toEqual([
      "headless",
      "christmas",
    ]);
    expect(christmasGroups(person({ BirthDate: "1880-12-00" }), YEAR)).toEqual([]);
  });

  test("christmasDay says which", () => {
    expect(christmasDay(person({ BirthDate: "1880-12-25" }))).toBe("born");
    expect(christmasDay(person({ DeathDate: "1931-12-25" }))).toBe("died");
    expect(christmasDay(person({ BirthDate: "1880-12-25", DeathDate: "1931-12-25" }))).toBe("both");
    expect(christmasDay(person({}))).toBe(null);
  });

  test("WikiTree's project accounts are left out", () => {
    expect(christmasGroups(person({ Name: "WikiTree-11", Father: 0, Mother: 0 }), YEAR)).toEqual([]);
  });
});

describe("rows", () => {
  test("CC7: the degree, with anything past 7 on row 7", () => {
    expect(rowOf(person({ Meta: { Degrees: 1 } }))).toBe("1");
    expect(rowOf(person({ Meta: { Degrees: 7 } }))).toBe("7");
    expect(rowOf(person({ Meta: { Degrees: 9 } }))).toBe("7");
    expect(rowOf(person({ Meta: undefined, Degrees: 3 }))).toBe("3");
    expect(rowOf(person({ Meta: {} }))).toBe("undated");
  });

  test("watchlist: the birth century, from a date or a decade", () => {
    expect(rowOf(person({ BirthDate: "1856-03-02" }), "watchlist")).toBe("1800");
    expect(rowOf(person({ BirthDate: "0000-00-00", BirthDateDecade: "1790s" }), "watchlist")).toBe("1700");
    expect(rowOf(person({ BirthDate: "1066-00-00" }), "watchlist")).toBe("early");
    expect(rowOf(person({ BirthDate: "0000-00-00", BirthDateDecade: "unknown" }), "watchlist")).toBe("undated");
    expect(rowOf(person({ BirthDate: undefined }), "watchlist")).toBe("undated");
  });

  test("order: degree 1 at the top; watchlist newest at the top, oldest at the bottom", () => {
    expect(rowOrder({ 3: 5, 1: 2, 2: 0, 7: 9 }, "cc7")).toEqual(["1", "3", "7"]);
    expect(rowOrder({ 1700: 3, 1900: 4, early: 1, undated: 2, 1800: 6 }, "watchlist")).toEqual([
      "undated",
      "1900",
      "1800",
      "1700",
      "early",
    ]);
  });

  test("labels", () => {
    expect(rowLabel("3", "cc7")).toBe("Degree 3");
    expect(rowLabel("1800", "watchlist")).toBe("1800s");
    expect(rowLabel("early", "watchlist")).toBe("Before 1500");
    expect(rowLabel("undated", "watchlist")).toBe("Undated");
  });
});

describe("scans", () => {
  const scanned = [
    person({ Id: 1, Name: "A-1", Meta: { Degrees: 1 } }),
    person({ Id: 2, Name: "B-2", Meta: { Degrees: 1 }, Father: 0, Mother: 0, Manager: MEMBER }),
    person({ Id: 3, Name: "C-3", Meta: { Degrees: 2 }, BirthDate: "1890-12-25" }),
    person({ Id: 4, Name: "D-4", Meta: { Degrees: 2 }, Templates: [{ name: "Unsourced" }], Manager: 7 }),
    person({ Id: 5, Name: "WikiTree-3", Meta: { Degrees: 2 }, Father: 0, Mother: 0 }),
  ];

  test("a full scan counts everyone in each row, and keeps only those who need help or are Christmas folk", () => {
    const { rows, people } = christmasFromScan(scanned, YEAR, "cc7", MEMBER);
    expect(rows).toEqual({ 1: 2, 2: 2 });
    expect(people.map((p) => [p.Id, p.groups, p.row, p.managed])).toEqual([
      [2, ["headless"], "1", true],
      [3, ["christmas"], "2", false],
      [4, ["skeleton"], "2", false],
    ]);
  });

  test("tree rows and the summary: Christmas folk aren't dark", () => {
    const { rows, people } = christmasFromScan(scanned, YEAR, "cc7", MEMBER);
    expect(treeRows(rows, people, "cc7")).toEqual([
      { key: "1", label: "Degree 1", total: 2, dark: 1, lit: 1 },
      { key: "2", label: "Degree 2", total: 2, dark: 1, lit: 1 },
    ]);
    const summary = summarize(rows, people);
    expect(summary).toMatchObject({ dark: 2, total: 4, percentLit: "50" });
    expect(summary.counts).toMatchObject({ headless: 1, skeleton: 1, christmas: 1, ghost: 0 });
  });

  test("percent lit: never rounded up to 100 while anyone needs help", () => {
    const rows = { 1: 1000 };
    const people = [{ Id: 1, groups: ["ghost"], row: "1" }];
    expect(summarize(rows, people).percentLit).toBe("99.9");
    expect(summarize(rows, []).percentLit).toBe("100");
    expect(summarize({}, []).percentLit).toBe("0");
  });

  test("re-check: the put-right drop out (unless Christmas folk), rows are kept, missing people stay", () => {
    const { people } = christmasFromScan(scanned, YEAR, "cc7", MEMBER);
    const fresh = [
      person({ Id: 2, Name: "B-2", Meta: undefined, Manager: MEMBER }), // parents added
      person({ Id: 3, Name: "C-3", Meta: undefined, BirthDate: "1890-12-25" }), // still Christmas folk
      // 4 not sent back (deleted, or can't be seen any more)
    ];
    const result = recheckChristmas(people, fresh, YEAR, "cc7", MEMBER);
    expect(result.fixed).toEqual(["2"]);
    expect(result.people.map((p) => [p.Id, p.groups, p.row])).toEqual([
      [3, ["christmas"], "2"],
      [4, ["skeleton"], "2"],
    ]);
  });

  test("re-check: a merged-away profile is matched through redirectedFrom", () => {
    const before = [{ Id: 9, Name: "X-9", groups: ["headless"], row: "3", Degrees: 3 }];
    const fresh = [person({ Id: 10, Name: "X-10", redirectedFrom: 9, Father: 0, Mother: 0 })];
    const result = recheckChristmas(before, fresh, YEAR, "cc7", MEMBER);
    expect(result.people.map((p) => [p.Id, p.row, p.Degrees])).toEqual([[10, "3", 3]]);
    expect(result.fixed).toEqual([]);
  });
});

describe("litBaubles", () => {
  test("rounded, but some dark if anyone needs help and some lit if anyone is fine", () => {
    expect(litBaubles(50, 100, 10)).toBe(5);
    expect(litBaubles(999, 1000, 10)).toBe(9);
    expect(litBaubles(1, 1000, 10)).toBe(1);
    expect(litBaubles(100, 100, 10)).toBe(10);
    expect(litBaubles(0, 100, 10)).toBe(0);
    expect(litBaubles(0, 0, 10)).toBe(0);
  });
});
