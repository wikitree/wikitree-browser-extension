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
    getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(),
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

describe("chat_profile_search AI WT+ query repair", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "unsourced profiles in Shropshire born 1820s",
        query: 'Unsourced BirthLocation=\\"Shropshire, England\\" 1820s',
      })
    );
  });

  afterEach(() => {
    delete window.callAiModel;
  });

  test("accepts AI WT+ queries with escaped quoted field values", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "unsourced profiles in Shropshire born 1820s"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain('BirthLocation="Shropshire, England"');
    expect(executedQuery).toContain("1820s");
    expect(result.table.rows).toHaveLength(1);
  });

  test("normalizes exact birth-decade century-plus-sql AI queries to the raw decade token", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "unsourced profiles in Shropshire born 1820s",
        query: 'Unsourced BirthLocation=Shropshire 19Cen sql="([Default].[Birth Date].AsNumber In 18200101..18291231)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "unsourced profiles in Shropshire born 1820s"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain("BirthLocation=Shropshire");
    expect(executedQuery).toContain("1820s");
    expect(executedQuery).not.toContain("19Cen");
    expect(executedQuery).not.toContain("[Default].[Birth Date].AsNumber In 18200101..18291231");
    expect(result.table.rows).toHaveLength(1);
  });
});
