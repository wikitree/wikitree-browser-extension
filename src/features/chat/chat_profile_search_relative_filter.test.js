jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { createProfileSearchHandler } from "./chat_profile_search";
import { matchRelativeByName, nameWithRelatives, splitRelativeClauses } from "./chat_relative_clause";

const SARAH = { 9: { Id: 9, Name: "Hill-9", RealName: "Sarah", FirstName: "Sarah", LastNameAtBirth: "Hill" } };
// Frederick 1: mother Mary Ann Smith, father John; children George and Emily; married Sarah.
// Frederick 2: mother Mary Jones, father William; child Thomas Henry; married Sarah.
// Frederick 3: no family.
const FREDERICKS = {
  1: { Id: 1, Name: "Beacall-1", FirstName: "Frederick", LastNameAtBirth: "Beacall", Mother: 11, Father: 12, Spouses: SARAH },
  2: { Id: 2, Name: "Beacall-2", FirstName: "Frederick", LastNameAtBirth: "Beacall", Mother: 21, Father: 22, Spouses: SARAH },
  3: { Id: 3, Name: "Beacall-3", FirstName: "Frederick", LastNameAtBirth: "Beacall", Mother: 0, Father: 0 },
};
const RELATIVES = {
  11: { Id: 11, Name: "Smith-11", FirstName: "Mary", MiddleName: "Ann", LastNameAtBirth: "Smith", Gender: "Female" },
  12: { Id: 12, Name: "Beacall-12", FirstName: "John", LastNameAtBirth: "Beacall", Gender: "Male" },
  21: { Id: 21, Name: "Jones-21", FirstName: "Mary", LastNameAtBirth: "Jones", Gender: "Female" },
  22: { Id: 22, Name: "Beacall-22", FirstName: "William", LastNameAtBirth: "Beacall", Gender: "Male" },
  31: { Id: 31, Name: "Beacall-31", FirstName: "George", LastNameAtBirth: "Beacall", Gender: "Male", Father: 1, Mother: 9 },
  32: { Id: 32, Name: "Beacall-32", FirstName: "Emily", LastNameAtBirth: "Beacall", Gender: "Female", Father: 1, Mother: 9 },
  33: { Id: 33, Name: "Beacall-33", FirstName: "Thomas", MiddleName: "Henry", LastNameAtBirth: "Beacall", Gender: "Male", Father: 2 },
};

function makeHandler() {
  const fetchPeoplePaged = jest.fn(async (_appId, keys, _fields, options = {}) => {
    const own = Object.fromEntries(keys.filter((k) => FREDERICKS[k]).map((k) => [k, FREDERICKS[k]]));
    return [null, null, options.nuclear ? { ...own, ...RELATIVES } : own];
  });
  const fetchSearchPersonPaged = jest.fn(async () => [0, Object.values(FREDERICKS).map(({ Id, Name }) => ({ Id, Name }))]);
  const handler = createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({})),
    fetchSearchPersonPaged,
    fetchPeoplePaged,
    mapApiPersonToStandardRow: jest.fn((person) => ({
      wtid: person?.Name || "",
      displayName: `${person?.FirstName || ""} ${person?.LastNameAtBirth || ""}`.trim(),
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [{ key: "wtid" }] })),
    makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
  const run = (prompt) => handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, prompt);
  return { run, fetchPeoplePaged, fetchSearchPersonPaged };
}

describe("splitRelativeClauses", () => {
  test.each([
    ["Frederick Beacall mother Mary Ann", "Frederick Beacall", [["mother", "Mary Ann"]]],
    ["Frederick Beacall whose mother was Mary Ann", "Frederick Beacall", [["mother", "Mary Ann"]]],
    ["Frederick Beacall, mother's name Mary Ann", "Frederick Beacall", [["mother", "Mary Ann"]]],
    ["Frederick Beacall with a father named John", "Frederick Beacall", [["father", "John"]]],
    ["Frederick Beacall and his mother Mary Ann", "Frederick Beacall", [["mother", "Mary Ann"]]],
    ["Frederick Beacall mother Mary Ann born 1850", "Frederick Beacall born 1850", [["mother", "Mary Ann"]]],
    ["Frederick Beacall son of John Beacall", "Frederick Beacall", [["either", "John Beacall"]]],
    ["Mary Beacall daughter of Martha", "Mary Beacall", [["either", "Martha"]]],
    ["Philip Beacall son Thomas Henry", "Philip Beacall", [["son", "Thomas Henry"]]],
    ["Philip Beacall with a daughter named Emily", "Philip Beacall", [["daughter", "Emily"]]],
    ["Philip Beacall whose son was Robert", "Philip Beacall", [["son", "Robert"]]],
    ["Philip Beacall and his son Robert", "Philip Beacall", [["son", "Robert"]]],
    ["Philip Beacall who had a son called Robert", "Philip Beacall", [["son", "Robert"]]],
    ["Philip Beacall child Albert", "Philip Beacall", [["child", "Albert"]]],
    ["Philip Beacall father of Albert", "Philip Beacall", [["child", "Albert"]]],
    ["Martha Teece mother of Philip", "Martha Teece", [["child", "Philip"]]],
    ["Philip Beacall father of a son called Robert", "Philip Beacall", [["son", "Robert"]]],
    ["Philip Beacall born 1859 son Thomas", "Philip Beacall born 1859", [["son", "Thomas"]]],
    ["Frederick Beacall mother Mary Ann father John", "Frederick Beacall", [["mother", "Mary Ann"], ["father", "John"]]],
    ["Frederick Beacall mother: Mary Ann", "Frederick Beacall", [["mother", "Mary Ann"]]],
    ["Philip Beacall, son's name Robert", "Philip Beacall", [["son", "Robert"]]],
    ["Philip Beacall father of George mother Mary", "Philip Beacall", [["child", "George"], ["mother", "Mary"]]],
    ["Philip Beacall mother Mary son George", "Philip Beacall", [["son", "George"], ["mother", "Mary"]]],
    ["Frederick Beacall children George and Emily", "Frederick Beacall", [["child", "George"], ["child", "Emily"]]],
    [
      "Philip Beacall sons Robert, William and Alfred",
      "Philip Beacall",
      [["son", "Robert"], ["son", "William"], ["son", "Alfred"]],
    ],
    ["Philip Beacall sons Robert, William, and Alfred John", "Philip Beacall", [["son", "Robert"], ["son", "William"], ["son", "Alfred John"]]],
    ["Philip Beacall with daughters named Louisa and Agnes Ann", "Philip Beacall", [["daughter", "Louisa"], ["daughter", "Agnes Ann"]]],
    ["Philip Beacall father of Robert and Jane", "Philip Beacall", [["child", "Robert"], ["child", "Jane"]]],
    ["Philip Beacall whose children were Thomas Henry and Emily", "Philip Beacall", [["child", "Thomas Henry"], ["child", "Emily"]]],
    ["Philip Beacall kids Emily and Louisa born 1830", "Philip Beacall born 1830", [["child", "Emily"], ["child", "Louisa"]]],
    [
      "Philip Beacall children Emily and Louisa and mother Martha",
      "Philip Beacall",
      [["child", "Emily"], ["child", "Louisa"], ["mother", "Martha"]],
    ],
    ["Philip Beacall son George and his wife", "Philip Beacall and his wife", [["son", "George"]]],
    ["Philip Beacall son of Philip and Martha", "Philip Beacall", [["either", "Philip"], ["either", "Martha"]]],
    ["Philip Beacall parents Philip and Martha", "Philip Beacall", [["either", "Philip"], ["either", "Martha"]]],
    ["Philip Beacall whose parents were Philip and Martha Ann", "Philip Beacall", [["either", "Philip"], ["either", "Martha Ann"]]],
    ["Philip Beacall, parents: Philip, Martha", "Philip Beacall", [["either", "Philip"], ["either", "Martha"]]],
    ["Philip Beacall mother Martha and father Philip", "Philip Beacall", [["mother", "Martha"], ["father", "Philip"]]],
    ["Philip Beacall whose mother was Martha and father was Philip", "Philip Beacall", [["mother", "Martha"], ["father", "Philip"]]],
    ["Martha Teece mother of Philip and Agnes", "Martha Teece", [["child", "Philip"], ["child", "Agnes"]]],
    ["Beacall-11 father of Robert and Jane", "Beacall-11", [["child", "Robert"], ["child", "Jane"]]],
  ])("%s", (prompt, mainQuery, relatives) => {
    expect(splitRelativeClauses(prompt)).toEqual({ mainQuery, relatives: relatives.map(([role, name]) => ({ role, name })) });
  });

  test.each([
    "Frederick Beacall",
    "Frederick Beacall's mother",
    "Frederick Beacall mother born 1850",
    "mother Mary Ann",
    "Beacalls with a mother but no father",
    "Beacalls with no father but has a mother",
    "Beacalls without a mother",
    "Beacalls whose mother is unknown",
    "Beacalls with a son but no daughter",
    "Beacalls with no children",
    "Beacalls with sons",
    "Beacalls with children",
    "Beacalls with parents",
    "Beacalls with no parents",
    "Beacalls with both parents",
    "Shropshire born 1800-1850 when parent was under 14 or over 70",
    "Beacalls whose parents were over 40",
    "Beacalls whose parents were married in Wem",
    "Beacalls whose parents were the same age",
    "Is Philip Beacall the father of Jane Beacall?",
    "Is Philip Beacall father of Jane Beacall",
    "Who is the mother of Philip Beacall?",
    "Who was the father of Philip Beacall",
    "the father of Philip Beacall",
    "bio for Philip Beacall son of Philip",
    "show Philip Beacall son George",
    "Philip Beacall the father of Jane",
    "Beacalls with 3 children",
    "Beacalls with no children born in Shropshire",
    "Philip Beacall's children",
    "Philip Beacall children born 1830",
    "Philip Beacall's son",
    "Philip Mothersole",
  ])("leaves alone: %s", (prompt) => {
    expect(splitRelativeClauses(prompt).relatives).toEqual([]);
  });

  test("nameWithRelatives keeps a spouse apart", () => {
    expect(nameWithRelatives("Frederick Beacall married Sarah son George")).toEqual({
      name: "Frederick Beacall",
      relatives: [{ role: "son", name: "George" }],
      spouse: "Sarah",
    });
    expect(nameWithRelatives("Beacalls with a son but no daughter")).toBeNull();
  });
});

describe("matchRelativeByName", () => {
  test("first names across First and Middle, any surname; a final e and joined names", () => {
    expect(matchRelativeByName(RELATIVES[11], "Mary Ann")).toBe(true);
    expect(matchRelativeByName(RELATIVES[21], "Mary Ann")).toBe(false);
    expect(matchRelativeByName({ FirstName: "Maryann" }, "Mary Ann")).toBe(true);
    expect(matchRelativeByName({ FirstName: "Mary-Ann" }, "Mary Ann")).toBe(true);
    expect(matchRelativeByName({ FirstName: "Maryanne" }, "Mary Ann")).toBe(true);
    expect(matchRelativeByName({ FirstName: "Mary", MiddleName: "Anne Elizabeth" }, "Mary Ann")).toBe(true);
    expect(matchRelativeByName({ FirstName: "Ann" }, "Anne")).toBe(true);
    expect(matchRelativeByName({ FirstName: "Annabel" }, "Ann")).toBe(false);
    expect(matchRelativeByName(RELATIVES[11], "Mary Smith")).toBe(true);
    expect(matchRelativeByName(null, "Mary")).toBe(false);
  });
});

describe("profile search with relatives' names", () => {
  test("'Frederick Beacall mother Mary Ann': the name to searchPerson, then one nuclear getPeople", async () => {
    const { run, fetchPeoplePaged, fetchSearchPersonPaged } = makeHandler();
    const result = await run("Frederick Beacall mother Mary Ann");

    const searchParams = fetchSearchPersonPaged.mock.calls[0][1];
    expect(searchParams).toMatchObject({ FirstName: "Frederick", LastName: "Beacall" });
    expect(searchParams).not.toHaveProperty("motherFirstName");
    expect(searchParams).toMatchObject({ skipVariants: 1 });
    expect(fetchPeoplePaged).toHaveBeenCalledTimes(2);
    expect(fetchPeoplePaged.mock.calls[1][1].sort()).toEqual([1, 2, 3]);
    expect(fetchPeoplePaged.mock.calls[1][3]).toMatchObject({ nuclear: 1, limit: 50 });
    expect(result.table.rows.map((r) => r.wtid)).toEqual(["Beacall-1"]);
    expect(result.message).toContain("mother: Mary Ann Smith");
  });

  test.each([
    ["Frederick Beacall son George", ["Beacall-1"], "son: George Beacall"],
    ["Frederick Beacall daughter Emily", ["Beacall-1"], "daughter: Emily Beacall"],
    ["Frederick Beacall father of Thomas Henry", ["Beacall-2"], "son: Thomas Henry Beacall"],
    ["Frederick Beacall son Thomas", ["Beacall-2"], "son: Thomas Henry Beacall"],
    ["Frederick Beacall with a child named Emily", ["Beacall-1"], "daughter: Emily Beacall"],
    ["Frederick Beacall son of William", ["Beacall-2"], "father: William Beacall"],
    ["Frederick Beacall mother Mary father William", ["Beacall-2"], "father: William Beacall"],
    ["Frederick Beacall mother Mary Ann father John", ["Beacall-1"], "mother: Mary Ann Smith"],
    ["Frederick Beacall father John mother Mary Ann", ["Beacall-1"], "father: John Beacall"],
    ["Frederick Beacall mother Mary son Thomas", ["Beacall-2"], "son: Thomas Henry Beacall"],
    ["Frederick Beacall married Sarah mother Mary Ann", ["Beacall-1"], "spouse: Sarah"],
    ["Frederick Beacall mother Mary Ann married Sarah", ["Beacall-1"], "spouse: Sarah"],
    ["Frederick Beacall whose wife was Sarah and whose mother was Mary Ann", ["Beacall-1"], "mother: Mary Ann Smith"],
    ["Frederick Beacall married Sarah son Thomas", ["Beacall-2"], "spouse: Sarah"],
  ])("%s", async (prompt, wtids, shown) => {
    const { run, fetchSearchPersonPaged } = makeHandler();
    const result = await run(prompt);
    expect(fetchSearchPersonPaged.mock.calls[0][1]).toMatchObject({ FirstName: "Frederick", LastName: "Beacall" });
    expect(result.table.rows.map((r) => r.wtid)).toEqual(wtids);
    expect(result.message).toContain(shown);
  });

  test("a son must be male: Emily isn't a son", async () => {
    const { run } = makeHandler();
    expect(await run("Frederick Beacall son Emily")).toMatch(/but none with a son named Emily\./);
  });

  test("children George and Emily: both must be among the person's children", async () => {
    const { run } = makeHandler();
    const result = await run("Frederick Beacall children George and Emily");
    expect(result.table.rows.map((r) => r.wtid)).toEqual(["Beacall-1"]);
    expect(await run("Frederick Beacall children George and Thomas Henry")).toMatch(
      /but none with children named George and Thomas Henry\./
    );
  });

  test("two children of the same name need two children", async () => {
    const { run } = makeHandler();
    expect(await run("Frederick Beacall children George and George")).toMatch(/but none with children named George and George\./);
  });

  test("son of John and Mary Ann: both parents, each a different one", async () => {
    const { run } = makeHandler();
    expect((await run("Frederick Beacall son of John and Mary Ann")).table.rows.map((r) => r.wtid)).toEqual(["Beacall-1"]);
    expect(await run("Frederick Beacall son of John and John")).toMatch(/but none with parents named John and John\./);
  });

  test.each(["Who is the mother of Frederick Beacall?", "Frederick Mothersole", "the father of Frederick Beacall"])(
    "no relative called 'of' or 'sole': %s",
    async (prompt) => {
      const { run, fetchSearchPersonPaged } = makeHandler();
      const result = await run(prompt);
      expect(JSON.stringify(result || "")).not.toMatch(/named (?:of|sole)\b/);
      for (const call of fetchSearchPersonPaged.mock.calls) {
        expect(call[1]).not.toHaveProperty("MotherFirstName");
        expect(call[1]).not.toHaveProperty("FatherFirstName");
      }
    }
  );

  test("says so when no candidate has that relative", async () => {
    const { run } = makeHandler();
    expect(await run("Frederick Beacall mother Elizabeth")).toMatch(
      /^I found 3 profiles for "Frederick Beacall", but none with a mother named Elizabeth\./
    );
  });
});
