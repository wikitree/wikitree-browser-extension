jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Shropshire-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          BirthLocation: "Shropshire, England",
          BirthDate: "1824-00-00",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
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
      columns: [{ key: "wtid" }, { key: "firstName" }],
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

describe("chat_profile_search query guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("blocks a saved WT+ re-run containing an unknown field without calling the API", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const result = await reRunSavedWtPlusQuery("BogusField=Value Location=Shropshire");

    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    const message = typeof result === "string" ? result : result?.message;
    expect(message).toMatch(/couldn't complete the WT\+ query/i);
    expect(message).toContain("BogusField=Value");
  });

  test("blocks a saved WT+ re-run containing an unknown raw token without calling the API", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const result = await reRunSavedWtPlusQuery("Location=Shropshire FrobnicateToken");

    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    const message = typeof result === "string" ? result : result?.message;
    expect(message).toMatch(/couldn't complete the WT\+ query/i);
    expect(message).toContain("FrobnicateToken");
  });

  test("coerces unknown plain words to Location instead of refusing (England Suggestions=678)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "England Suggestions=678");

    expect(wtAPIProfileSearch).toHaveBeenCalled();
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("coerces plain words on saved re-runs too", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    await reRunSavedWtPlusQuery("England Suggestions=678");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("valid saved WT+ queries pass through the gate unchanged", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const savedQuery = 'Unsourced BirthLocation="Shropshire, England" 1820s';
    const result = await reRunSavedWtPlusQuery(savedQuery);

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain('BirthLocation="Shropshire, England"');
    expect(executedQuery).toContain("1820s");
    expect(result.table.rows).toHaveLength(1);
  });

  test("valid saved WT+ sql query passes through the gate", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    await reRunSavedWtPlusQuery(
      "MarriageLocation=Cheshire sql=\"([Children].[User ID].LineCount > 6) And ([Marriage].[Marriage Date].AsNumber In 19000101..19991231)\""
    );

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
  });

  test("deterministic prompt executes the same query with the gate in place", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Cheshire marriages with over 6 kids");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
  });

  test("does not synthesize junk names from non-name prompts in WT mode", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [0, []]);
    window.callAiModel = jest.fn(async () => JSON.stringify({}));

    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchSearchPersonPaged,
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    });

    try {
      const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "interesting people please");

      expect(fetchSearchPersonPaged).not.toHaveBeenCalled();
      const message = typeof result === "string" ? result : result?.message;
      expect(message).toMatch(/couldn't work out a concrete person search/i);
    } finally {
      delete window.callAiModel;
    }
  });

  test("still infers names from a plain two-token name prompt in WT mode", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [
      0,
      [
        {
          Id: 1,
          Name: "Beacall-1",
        },
      ],
    ]);

    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchSearchPersonPaged,
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    });

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "George Beacall born before 1850");

    expect(fetchSearchPersonPaged).toHaveBeenCalled();
    const searchParams = fetchSearchPersonPaged.mock.calls[0][1];
    expect(searchParams.FirstName).toBe("George");
    expect(searchParams.LastName).toBe("Beacall");
  });
});
