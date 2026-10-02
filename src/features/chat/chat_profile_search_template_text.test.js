// TemplateText matches any template containing the text (WT+), so Muse must not
// narrow a bare word to one template.

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

async function runPrompt(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  return result;
}

async function executedQueryFor(prompt) {
  await runPrompt(prompt);
  expect(wtAPIProfileSearch).toHaveBeenCalled();
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("TemplateText canonicalisation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
  });

  test("a bare place stays as typed, not the first template starting with it", async () => {
    expect(await executedQueryFor("template text contains Kentucky")).toBe("TemplateText=Kentucky");
  });

  test("an exact template name is recased", async () => {
    expect(await executedQueryFor("template text contains find a grave")).toBe('TemplateText="Find A Grave"');
  });

  test("a named project maps to its project box", async () => {
    expect(await executedQueryFor("template text contains kentucky project")).toBe('TemplateText="Kentucky Project"');
  });
});
