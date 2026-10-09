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

// No AI key: a Discord tester's wording (2026-10-06) searched for the place
// "Provide a of", and "profiles with last name Garver" found nothing in WT mode.

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Test-1",
          FirstName: "Test",
          LastNameAtBirth: "Example",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: "",
      death: "",
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


describe("surname lists without an AI key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "" } });
  });
  test.each([
    ['Provide a list of profiles with last name "Garver"', "wtplus", "AllLastNames=Garver"],
    ['Provide a list of profiles with last name "Garver"', "wt", "AllLastNames=Garver"],
    ["Give me all the profiles with surname Garver", "wt", "AllLastNames=Garver"],
    ["profiles with last name Garver", "wt", "AllLastNames=Garver"],
    ["Garver profiles", "wt", "LastNameAtBirth=Garver"],
    ["profiles with last name at birth Garver", "wt", "LastNameAtBirth=Garver"],
    // "help" alone opens Genie Help; the surname Help still searches.
    ["Help profiles", "wt", "LastNameAtBirth=Help"],
    ["profiles with last name Help", "wt", "AllLastNames=Help"],
    ["LastNameAtBirth=Garver", "wt", "LastNameAtBirth=Garver"],
  ])("%s (%s mode)", async (prompt, mode, query) => {
    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: mode }, prompt);
    expect(wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]))).toEqual([query]);
  });
});
