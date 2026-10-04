jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [
      0,
      [
        {
          Id: 1,
          Name: "Lincoln-1",
        },
      ],
    ]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Lincoln-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          BirthDate: "1852-04-12",
          BirthLocation: "Lincolnshire",
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

describe("chat_profile_search WT filter guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        BirthLocation: "Lincolnshire",
        BirthDateStart: "1851-01-01",
      })
    );
  });

  afterEach(() => {
    delete window.callAiModel;
  });

  test("does not synthesize FirstName or LastName from a location/date-only AI parse in WT mode", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [
      0,
      [
        {
          Id: 1,
          Name: "Lincoln-1",
        },
      ],
    ]);

    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchSearchPersonPaged });
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "Lincolnshire births, post-1850");

    // searchPerson refuses a place with no name (live API, 2026-10-03), so it
    // must not be called at all rather than called with an invented name.
    expect(fetchSearchPersonPaged).not.toHaveBeenCalled();
    expect(JSON.stringify(result || "")).not.toMatch(/Lincoln-1/);
  });
});
