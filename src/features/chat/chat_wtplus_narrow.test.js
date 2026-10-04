import {
  getResultWtPlusQuery,
  isLocallyFilteredResult,
  narrowWtPlusQuery,
  parseWtPlusNarrowPrompt,
  restrictNarrowResultToRows,
} from "./chat_wtplus_narrow";

// Live C33, 2026-10-03: "how many have no sources?" re-ran the base search.
describe("parseWtPlusNarrowPrompt", () => {
  test.each([
    ["how many have no sources?", "Unsourced", true],
    ["how many of them are unsourced", "Unsourced", true],
    ["which of these are unconnected?", "Unconnected", false],
    ["only the orphaned ones", "Orphan", false],
    ["just the ones with no children", "NoChildren", false],
    ["show me the famous ones", "Notables", false],
  ])("%s", (prompt, flag, countOnly) => {
    expect(parseWtPlusNarrowPrompt(prompt)).toMatchObject({ flag, countOnly });
  });

  test.each([
    "how many unsourced profiles are in Kent?",
    "how many Beacalls have no sources?",
    "unsourced profiles in Cheshire",
    "how many are there?",
    "only the women",
  ])("not a narrowing: %s", (prompt) => {
    expect(parseWtPlusNarrowPrompt(prompt)).toBeNull();
  });
});

describe("narrowWtPlusQuery", () => {
  test("adds the flag to each branch, before NOT", () => {
    expect(narrowWtPlusQuery("AllLastNames=Beacall NoFather NOT NoMother", "Unsourced")).toBe(
      "AllLastNames=Beacall NoFather Unsourced NOT NoMother"
    );
    expect(narrowWtPlusQuery("Location=Kent CategoryWord=miner OR Location=Kent CategoryWord=collier", "Unsourced")).toBe(
      "Location=Kent CategoryWord=miner Unsourced OR Location=Kent CategoryWord=collier Unsourced"
    );
  });

  test("leaves a branch that already has the flag", () => {
    expect(narrowWtPlusQuery("Location=Kent Unsourced", "Unsourced")).toBe("Location=Kent Unsourced");
  });

  test("a grouped table's query comes from its source", () => {
    expect(getResultWtPlusQuery({ sourceResult: { wtPlusQuery: "Location=Kent" } })).toBe("Location=Kent");
    expect(getResultWtPlusQuery({ rows: [] })).toBe("");
  });
});

describe("narrowing a table filtered in the browser", () => {
  const narrowResult = {
    message: "Found 2 profiles for WT+ query: AllLastNames=Alley BirthLocation=Kent Unsourced",
    table: { title: "WT+ results", rows: [{ wtid: "Smithers-109" }, { wtid: "Alley-5" }] },
  };

  test("a filtered title or filter context counts as a local filter", () => {
    expect(isLocallyFilteredResult({ title: "WT+ results filtered (gender=Female)" })).toBe(true);
    expect(isLocallyFilteredResult({ title: "WT+ results", filterContext: { kind: "gender" } })).toBe(true);
    expect(isLocallyFilteredResult({ title: "WT+ results" })).toBe(false);
  });

  test("keeps only the current rows", () => {
    const result = restrictNarrowResultToRows(narrowResult, [{ wtid: "Smithers-109" }], "unsourced", "Q Unsourced");
    expect(result.message).toBe("1 of the 1 profile in the current filtered table is unsourced (WT+ query: Q Unsourced).");
    expect(result.table.rows).toEqual([{ wtid: "Smithers-109" }]);
  });

  test("none left: no table", () => {
    const result = restrictNarrowResultToRows(narrowResult, [{ wtid: "Other-1" }, { wtid: "Other-2" }], "unsourced", "Q");
    expect(result.message).toBe("0 of the 2 profiles in the current filtered table are unsourced (WT+ query: Q).");
    expect(result.table).toBeUndefined();
  });
});

