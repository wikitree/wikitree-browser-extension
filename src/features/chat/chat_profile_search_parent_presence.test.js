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
          Name: "Beacall-1",
          FirstName: "Alice",
          LastNameAtBirth: "Beacall",
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

describe("chat_profile_search deterministic parent-presence and child-count rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("parses 'with a mother but no father' into NoFather NOT NoMother", async () => {
    const executedQuery = await executedQueryFor("Beacall with a mother but no father");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).toContain("NOT NoMother");
    expect(executedQuery).toMatch(/LastNameAtBirth=Beacall|AllLastNames=Beacall/);
    expect(executedQuery).not.toMatch(/(?<!NOT )NoMother/);
  });

  test("parses inverted 'no father but has a mother' the same way", async () => {
    const executedQuery = await executedQueryFor("Beacall no father but has a mother");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).toContain("NOT NoMother");
  });

  test("parses 'with a father but no mother' into NoMother NOT NoFather", async () => {
    const executedQuery = await executedQueryFor("Beacall with a father but no mother");

    expect(executedQuery).toContain("NoMother");
    expect(executedQuery).toContain("NOT NoFather");
  });

  test("plain 'no father' still emits just NoFather", async () => {
    const executedQuery = await executedQueryFor("Beacall no father");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).not.toContain("NOT");
    expect(executedQuery).not.toContain("NoMother");
  });

  test("parses 'exactly 4 children' into a LineCount equality", async () => {
    const executedQuery = await executedQueryFor("Beacall exactly 4 children");

    expect(executedQuery).toContain("[Children].[User ID].LineCount = 4");
    expect(executedQuery).not.toContain("LineCount > 4");
  });

  test("parses word-number 'exactly one child count' phrasing", async () => {
    const executedQuery = await executedQueryFor("Shropshire exactly two kids");

    expect(executedQuery).toContain("[Children].[User ID].LineCount = 2");
    expect(executedQuery).toContain("Location=Shropshire");
  });
});
