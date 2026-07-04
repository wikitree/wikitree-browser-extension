jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler, matchSpouseByName } from "./chat_profile_search";

const GEORGE_WITH_MARGARET = {
  Id: 1,
  Name: "Beacall-1",
  FirstName: "George",
  LastNameAtBirth: "Beacall",
  BirthDate: "1820-00-00",
  Spouses: {
    2: {
      Id: 2,
      Name: "Jones-2",
      RealName: "Margaret",
      FirstName: "Margaret",
      LastNameAtBirth: "Jones",
      LastNameCurrent: "Beacall",
    },
  },
};

const GEORGE_WITH_MARY = {
  Id: 3,
  Name: "Beacall-3",
  FirstName: "George",
  LastNameAtBirth: "Beacall",
  BirthDate: "1830-00-00",
  Spouses: {
    4: {
      Id: 4,
      Name: "Smith-4",
      RealName: "Mary",
      FirstName: "Mary",
      LastNameAtBirth: "Smith",
    },
  },
};

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [
      0,
      [
        { Id: 1, Name: "Beacall-1" },
        { Id: 3, Name: "Beacall-3" },
      ],
    ]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: GEORGE_WITH_MARGARET,
        3: GEORGE_WITH_MARY,
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      displayName: person?.FirstName || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: person?.BirthDate || "",
      death: person?.DeathDate || "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }, { key: "spouse" }, { key: "spouseList" }, { key: "degrees" }],
    })),
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    ...overrides,
  });
}

describe("chat_profile_search spouse-name search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("'George Beacall married Margaret' filters candidates by spouse in a single enriched fetch", async () => {
    const fetchPeoplePaged = jest.fn(async () => [null, null, { 1: GEORGE_WITH_MARGARET, 3: GEORGE_WITH_MARY }]);
    const handler = makeHandler({ fetchPeoplePaged });

    const result = await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "George Beacall married Margaret");

    expect(fetchPeoplePaged).toHaveBeenCalledTimes(1);
    const fields = fetchPeoplePaged.mock.calls[0][2];
    const options = fetchPeoplePaged.mock.calls[0][3];
    expect(fields).toContain("Spouses");
    expect(options).toMatchObject({ getSpouses: 1 });

    expect(result.table.rows).toHaveLength(1);
    expect(result.table.rows[0].wtid).toBe("Beacall-1");
    expect(result.table.rows[0].matchedSpouse).toBe("Margaret");
  });

  test("'find George Beacall with spouse Margaret' takes the same path", async () => {
    const handler = makeHandler();

    const result = await handler.tryHandleProfileSearchPrompt(
      { chatModeOverride: "wt" },
      "find George Beacall with spouse Margaret"
    );

    expect(result.table.rows).toHaveLength(1);
    expect(result.table.rows[0].wtid).toBe("Beacall-1");
  });

  test("'Beacall married in Cheshire' does not split into a spouse query", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [0, [{ Id: 1, Name: "Beacall-1" }]]);
    const fetchPeoplePaged = jest.fn(async () => [null, null, { 1: GEORGE_WITH_MARGARET }]);
    const handler = makeHandler({ fetchSearchPersonPaged, fetchPeoplePaged });

    await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "Beacall married in Cheshire");

    // No spouse split means no Spouses enrichment on the detail fetch.
    if (fetchPeoplePaged.mock.calls.length) {
      expect(fetchPeoplePaged.mock.calls[0][2]).not.toContain("Spouses");
    }
  });

  test("'George Beacall married after 1899' does not treat the date as a spouse name", async () => {
    const fetchPeoplePaged = jest.fn(async () => [null, null, { 1: GEORGE_WITH_MARGARET }]);
    const handler = makeHandler({ fetchPeoplePaged });

    await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "George Beacall married after 1899");

    if (fetchPeoplePaged.mock.calls.length) {
      expect(fetchPeoplePaged.mock.calls[0][2]).not.toContain("Spouses");
    }
  });

  test("reports a helpful message when no candidate has a matching spouse", async () => {
    const handler = makeHandler();

    const result = await handler.tryHandleProfileSearchPrompt(
      { chatModeOverride: "wt" },
      "George Beacall married Wilhelmina"
    );

    const message = typeof result === "string" ? result : result?.message;
    expect(message).toMatch(/no profile matches .* spouse matching "Wilhelmina"/i);
  });
});

describe("matchSpouseByName", () => {
  const spouses = {
    2: {
      Name: "Jones-2",
      RealName: "Margaret",
      FirstName: "Margaret",
      MiddleName: "Ann",
      LastNameAtBirth: "Jones",
      LastNameCurrent: "Beacall",
    },
  };

  test("matches first+last token pairs against first and last name parts", () => {
    expect(matchSpouseByName(spouses, "Margaret Jones")).toBeTruthy();
    expect(matchSpouseByName(spouses, "Margaret Beacall")).toBeTruthy();
    expect(matchSpouseByName(spouses, "Jane Jones")).toBeNull();
  });

  test("matches a single token against any name part", () => {
    expect(matchSpouseByName(spouses, "Margaret")).toBeTruthy();
    expect(matchSpouseByName(spouses, "Jones")).toBeTruthy();
    expect(matchSpouseByName(spouses, "Wilhelmina")).toBeNull();
  });

  test("quoted queries require exact candidate or token match", () => {
    expect(matchSpouseByName(spouses, "Margaret", { quoted: true })).toBeTruthy();
    expect(matchSpouseByName(spouses, "Marg", { quoted: true })).toBeNull();
    expect(matchSpouseByName(spouses, "Marg", { quoted: false })).toBeTruthy();
  });

  test("handles empty and array-shaped inputs", () => {
    expect(matchSpouseByName(null, "Margaret")).toBeNull();
    expect(matchSpouseByName({}, "Margaret")).toBeNull();
    expect(matchSpouseByName(Object.values(spouses), "Margaret")).toBeTruthy();
  });
});
