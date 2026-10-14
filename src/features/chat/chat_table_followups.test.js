// No-AI group 3 (2026-10-14): follow-ups on an open table that needed the AI.
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { createLastResultOperationHandler, mostCommonMessage } from "./chat_last_result";
import { ChatIntent, routeChatPrompt } from "./chat_router";
import { parseResultAgeFilter } from "./chat_result_pick";
import { hasRelative, parseRelativeFollowup, relativeFilterMessage, splitRowsByRelative } from "./chat_result_relatives";

const withTable = (prompt) => routeChatPrompt(prompt, { hasStructuredResult: true });

describe("which of them married / had children / have no parents", () => {
  test.each([
    ["which of them married?", "spouse", true],
    ["Which of them got married", "spouse", true],
    ["who among them married", "spouse", true],
    ["show me those who married", "spouse", true],
    ["only the married ones", "spouse", true],
    ["which of them never married?", "spouse", false],
    ["which ones were unmarried", "spouse", false],
    ["which ones had children?", "children", true],
    ["which of them had no children", "children", false],
    ["which ones were childless?", "children", false],
    ["which ones have no parents?", "parents", false],
    ["which of them have no father?", "father", false],
  ])("%s", (prompt, relation, has) => {
    expect(withTable(prompt)).toEqual({
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: { action: "relativeFilter", relation, has, countOnly: false },
    });
  });

  test("how many of them married? is a count", () => {
    expect(parseRelativeFollowup("how many of them married?")).toEqual({ action: "relativeFilter", relation: "spouse", has: true, countOnly: true });
  });

  test("not about the table: no table open, or no 'of them'", () => {
    expect(routeChatPrompt("which of them married?", { hasStructuredResult: false }).intent).not.toBe(ChatIntent.LAST_RESULT_OPERATION);
    expect(parseRelativeFollowup("which of her children married?")).toBeNull();
    expect(parseRelativeFollowup("which of them married in Kent?")).toBeNull();
    expect(parseRelativeFollowup("did she marry?")).toBeNull();
  });

  test("the relatives a getPeople person has", () => {
    const person = { Father: 12, Mother: 0, Spouses: { 7: { Id: 7 } }, HasChildren: "1" };
    expect(hasRelative(person, "parents")).toBe(true);
    expect(hasRelative(person, "mother")).toBe(false);
    expect(hasRelative(person, "spouse")).toBe(true);
    expect(hasRelative({ Spouses: [] }, "spouse")).toBe(false);
    expect(hasRelative(person, "children")).toBe(true);
    expect(hasRelative({ HasChildren: 0 }, "children")).toBe(false);
  });

  test("rows split by the fetched people; one that didn't come back is unknown", () => {
    const rows = [{ wtid: "A-1" }, { wtid: "B-2" }, { wtid: "C-3" }];
    const people = { 1: { Id: 1, Name: "A-1", Spouses: { 9: {} } }, 2: { Id: 2, Name: "B-2", Spouses: [] } };
    const split = splitRowsByRelative(rows, people, { relation: "spouse", has: true });
    expect(split.matched).toEqual([{ wtid: "A-1" }]);
    expect(split.unknown).toEqual([{ wtid: "C-3" }]);
    expect(relativeFilterMessage({ ...split, total: 3, relation: "spouse", has: true })).toBe(
      "1 of the 2 has a husband or wife on WikiTree.\n(1 couldn't be checked: private or not found.)\nRelatives on private profiles may not be visible."
    );
    expect(relativeFilterMessage({ matched: [], unknown: [], total: 4, relation: "parents", has: false })).toBe("All 4 have a parent on WikiTree.");
  });
});

describe("which of them died young / lived past 90", () => {
  test.each([
    ["which of them died young?", { max: 15 }],
    ["how many of them lived past 90?", { min: 91 }],
    ["which ones died under 5", { max: 4 }],
    ["which of them lived to 100 or more", { min: 100 }],
    ["which of them died aged 42", { min: 42, max: 42 }],
  ])("%s", (prompt, range) => {
    expect(withTable(prompt).params).toEqual({ action: "filter", filter: { kind: "ageAtDeath", ...range } });
  });
  test("needs 'of them'", () => {
    expect(parseResultAgeFilter("died young")).toBeNull();
    expect(parseResultAgeFilter("which of them died in Kent")).toBeNull();
  });
});

describe("the most common X; group them by birth place", () => {
  test.each([
    ["what was the most common first name?", "firstName"],
    ["most common first name", "firstName"],
    ["what is the most common surname among them?", "surname"],
    ["which birth place is most common?", "birthLocation"],
  ])("%s", (prompt, field) => {
    expect(withTable(prompt).params).toEqual({ action: "countBy", field, top: true });
  });
  test("group / count them by birth place or place of death", () => {
    expect(withTable("group them by birth place").params).toEqual({ action: "countBy", field: "birthLocation" });
    expect(withTable("count them by place of death").params).toEqual({ action: "countBy", field: "deathLocation" });
  });
  test("the answer leaves out Unknown and names ties", () => {
    const rows = (pairs) => pairs.map(([label, count]) => ({ label, count }));
    expect(mostCommonMessage(rows([["Unknown", 9], ["Mary", 4], ["John", 2]]), "firstName", 15)).toBe("The most common first name is Mary (4 of 15).");
    expect(mostCommonMessage(rows([["Mary", 3], ["John", 3], ["Ann", 1]]), "firstName", 7)).toBe(
      "The most common first names are Mary and John (3 each of 7)."
    );
    expect(mostCommonMessage(rows([["Mary", 1], ["John", 1]]), "firstName", 2)).toBe("No first name comes up more than once among the 2.");
    expect(mostCommonMessage(rows([["Unknown", 2]]), "birthLocation", 2)).toBe("None of the 2 rows has a birth place.");
  });
});

describe("the handler", () => {
  const rows = [
    { displayName: "Ann Cook", wtid: "Cook-1", firstName: "Ann", birth: "1850-01-02", death: "1855-03-04", birthLocation: "Kent" },
    { displayName: "Mary Cook", wtid: "Cook-2", firstName: "Mary", birth: "1852-00-00", death: "1940-00-00", birthLocation: "Kent" },
    { displayName: "Mary Ross", wtid: "Ross-3", firstName: "Mary", birth: "1860-05-01", death: "", birthLocation: "Devon" },
  ];
  const makeHandler = (fetchPeoplePaged) =>
    createLastResultOperationHandler({
      getLastStructuredResult: () => ({ title: "Her grandchildren", rows }),
      setLastStructuredResult: jest.fn(),
      openResultsTable: jest.fn(),
      cloneResultWithRows: (result, title, list) => ({ ...result, title, rows: list }),
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      normalizeDateForSort: (value) => String(value || ""),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeSurname: (value) => String(value || "").toLowerCase(),
      extractCountryFromLocation: () => "",
      fetchPeoplePaged,
    });

  test("which of them married: fetches the rows' relatives and keeps the married ones", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: { Id: 1, Name: "Cook-1", Spouses: [] },
        2: { Id: 2, Name: "Cook-2", Spouses: { 5: { Id: 5 } } },
        3: { Id: 3, Name: "Ross-3", Spouses: { 6: { Id: 6 } } },
      },
    ]);
    const out = await makeHandler(fetchPeoplePaged)({ action: "relativeFilter", relation: "spouse", has: true, countOnly: false });
    expect(fetchPeoplePaged).toHaveBeenCalledWith("chat", ["Cook-1", "Cook-2", "Ross-3"], "Id,Name,Father,Mother,Spouses,HasChildren", {});
    expect(out.message).toMatch(/^2 of the 3 have a husband or wife on WikiTree\./);
    expect(out.table.rows.map((row) => row.wtid)).toEqual(["Cook-2", "Ross-3"]);
    expect(out.table.title).toBe("Her grandchildren filtered (have a husband or wife)");
  });

  test("how many: the count, the table left as it is", async () => {
    const fetchPeoplePaged = jest.fn(async () => [null, null, { 1: { Id: 1, Name: "Cook-1", HasChildren: 1 } }]);
    const out = await makeHandler(fetchPeoplePaged)({ action: "relativeFilter", relation: "children", has: true, countOnly: true });
    expect(out.table).toBeUndefined();
    expect(out.message).toMatch(/^1 of the 1 has children on WikiTree\.\n\(2 couldn't be checked/);
  });

  test("died young: by age at death, both dates needed", async () => {
    const out = await makeHandler(null)({ action: "filter", filter: { kind: "ageAtDeath", max: 15 } });
    expect(out.table.rows.map((row) => row.wtid)).toEqual(["Cook-1"]);
    expect(out.message).toContain("age at death 15 or under (people without both dates are left out)");
  });

  test("the most common first name, then the counts", async () => {
    const out = await makeHandler(null)({ action: "countBy", field: "firstName", top: true });
    expect(out.message).toMatch(/^The most common first name is Mary \(2 of 3\)\.\nGrouped the current results by first name:/);
    expect(out.table.title).toBe("Her grandchildren by first name");
  });
});
