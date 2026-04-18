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
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
    mapApiPersonToStandardRow: jest.fn(),
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

describe("chat_profile_search WT+ cap handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        found: 30000,
        profiles: ["1", "2"],
        searchLog:
          "BirthLocation=Lincolnshire: 110234\r\nsql=([Default].[Birth Date].AsNumber > 18501231) 110234 -> 39336\r\nResult: 39336\r\n",
      },
    });
    delete window.callAiModel;
  });

  test("returns an over-cap message instead of fetching capped WT+ results", async () => {
    const fetchPeoplePaged = jest.fn(async () => [null, null, {}]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      'BirthLocation=Lincolnshire sql="([Default].[Birth Date].AsNumber > 18501231)"'
    );

    expect(fetchPeoplePaged).not.toHaveBeenCalled();
    expect(result.message).toContain("39,336");
    expect(result.message).toContain("too many for Muse to load usefully");
    expect(result.message).toContain("Muse can display up to 30,000 results");
    expect(result.message).toContain("fewer results will load faster");
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({
      actionType: "wtplus-open",
      wtPlusSearchType: "text",
    });
    expect(result.actions[0].wtPlusQuery).toContain("BirthLocation=Lincolnshire");
    expect(result.actions[0].wtPlusQuery).toContain("18501231");
  });

  test("prefers the Too many profiles count over a later zero Result count", async () => {
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        found: 0,
        profiles: [],
        searchLog:
          "Location=Hampshire: 450420\r\nsql=([Default].[Birth Date].AsNumber < 18500101): Too many profiles!!! 450420\r\nsql=([Default].[Birth Date].AsNumber < 18500101) 450420 -> 0\r\nResult: 0\r\n",
      },
    });

    const fetchPeoplePaged = jest.fn(async () => [null, null, {}]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      'Location=Hampshire sql="([Default].[Birth Date].AsNumber < 18500101)"'
    );

    expect(fetchPeoplePaged).not.toHaveBeenCalled();
    expect(result.message).toContain("450,420");
    expect(result.message).not.toContain("WT+ found 0 profiles");
    expect(result.message).toContain("too many for Muse to load usefully");
    expect(result.message).toContain("Muse can display up to 30,000 results");
  });
});
