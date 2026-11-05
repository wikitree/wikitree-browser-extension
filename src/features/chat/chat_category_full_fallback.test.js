// Live C21, 2026-10-03: no category is named "Titanic Passengers", and the
// closest, "Guernsey, RMS Titanic Passengers", found 3 instead of 1,139.

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

// A small template catalogue, so TemplateText canonicalisation runs.
jest.mock("../../core/API/wtPlusData", () => ({
  dataTables: {
    templates: [
      { name: "Kentucky Project", type: "Project Box" },
      { name: "Find A Grave", type: "Research" },
    ],
  },
  dataTablesLoad: jest.fn(async () => true),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPICatCIBSearch, wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
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
          Name: "Example-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          BirthLocation: "England",
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

async function executedQueryFor(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  expect(wtAPIProfileSearch).toHaveBeenCalled();
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("CategoryFull with no exact category", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
  });

  test("a narrower category containing the phrase becomes CategoryWord", async () => {
    wtAPICatCIBSearch.mockResolvedValue({
      response: { categories: [{ category: "Guernsey, RMS Titanic Passengers" }] },
    });
    expect(await executedQueryFor('CategoryFull="Titanic Passengers"')).toBe('CategoryWord="Titanic Passengers"');
  });

  test("an exact category is kept", async () => {
    wtAPICatCIBSearch.mockResolvedValue({
      response: { categories: [{ category: "Motueka Cemetery, Motueka, Tasman" }] },
    });
    expect(await executedQueryFor('CategoryFull="Motueka Cemetery, Motueka, Tasman"')).toMatch(
      /^CategoryFull=(?:"Motueka Cemetery, Motueka, Tasman"|Motueka_Cemetery__Motueka__Tasman)$/
    );
  });
});
