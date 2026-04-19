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

  test("canonicalizes Family-scoped marriage SQL fields to Marriage scope", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "20th century more than 6 children and married in Cheshire",
        query:
          '20Cen MarriageLocation=Cheshire sql="([Family].[Children Count] > 6) And ([Family].[Marriage Date].AsNumber In 19000101..19991231)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "20th century more than 6 children and married in Cheshire"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).toContain("[Marriage].[Marriage Date].AsNumber In 19000101..19991231");
    expect(executedQuery).not.toContain("[Family].[Marriage Date]");
  });

  test("canonicalizes Bio-scoped children count aliases to relation LineCount", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "20th century more than 6 children and married in Cheshire",
        query: '20Cen MarriageLocation=Cheshire sql="([Bio].[Children Count].AsNumber > 6)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "20th century more than 6 children and married in Cheshire"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("[Bio].[Children Count]");
  });

  test("falls back to a valid deterministic century query when AI invents a bare CC7 token", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "20th century more than 6 children and married in Cheshire",
        query: '20Cen CC7 MarriageLocation=Cheshire',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "20th century more than 6 children and married in Cheshire"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("20Cen");
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("LastNameAtBirth=20th");
    expect(executedQuery).not.toContain("Location=century");
  });

  test("deterministically parses marriage-location shorthand with kids synonym", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    });

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Cheshire marriages with over 6 kids");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("LastNameAtBirth=Cheshire");
    expect(executedQuery).not.toContain('Location="marriages over 6 kids"');
  });

  test("deterministically parses written-out centuries in marriage-location shorthand", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    });

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Cheshire marriages in the twentieth century with over 6 kids"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Marriage].[Marriage Date].AsNumber In 19000101..19991231");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("20Cen");
  });

  test("canonicalizes Lineage Children AI aliases to relation LineCount", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "20th century more than 6 children and married in Cheshire",
        query: '20Cen MarriageLocation=Cheshire sql="([Default].[Lineage Children].AsNumber > 6)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "20th century more than 6 children and married in Cheshire"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("20Cen");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("Lineage Children");
  });

  test("deterministically parses word-number children plus marriage-date shorthand", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    });

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "more than six children, Cheshire, married after 1899"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).toContain("[Marriage].[Marriage Date].AsNumber > 18999999");
    expect(executedQuery).not.toContain("LastNameAtBirth=Cheshire");
    expect(executedQuery).not.toMatch(/(?:^|\s)Location=Cheshire(?:\s|$)/);
  });

  test("prefers deterministic marriage-century parsing over AI birth-century guesses", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "Cheshire marriages in the twentieth century with over 6 kids",
        query: '20Cen MarriageLocation=Cheshire sql="([Children].[User ID].LineCount > 6)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Cheshire marriages in the twentieth century with over 6 kids"
    );

    expect(window.callAiModel).not.toHaveBeenCalled();
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Marriage].[Marriage Date].AsNumber In 19000101..19991231");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).not.toContain("20Cen");
  });
});
