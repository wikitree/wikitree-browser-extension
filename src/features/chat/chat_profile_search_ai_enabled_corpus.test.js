// Live-like corpus: the AI is ENABLED (as it is for any user with a key), and the
// mocked model answers with a sentinel query. Prompts that the deterministic parser
// understands must run the deterministic query, never the sentinel. The rest of the
// suite runs with allowAiFallback: false, so it cannot see the AI-preference paths.

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

const AI_SENTINEL = "LastNameAtBirth=AiSentinel";

function makeHandler() {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      { 1: { Id: 1, Name: "Example-1", FirstName: "Alice", LastNameAtBirth: "Example", BirthDate: "1824-00-00" } },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      birth: person?.BirthDate || "",
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
  });
}

async function executedQueryFor(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  expect(wtAPIProfileSearch).toHaveBeenCalled();
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("AI-enabled corpus: curated deterministic parses beat the AI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
    window.callAiModel = jest.fn(async () => JSON.stringify({ understood: "sentinel", query: AI_SENTINEL }));
  });

  afterEach(() => {
    delete window.callAiModel;
  });

  test("England no birth or death date uses the curated No-Dates suggestion group", async () => {
    const executedQuery = await executedQueryFor("England no birth or death date");
    expect(executedQuery).not.toContain("AiSentinel");
    expect(executedQuery).toContain('Suggestions="131 132 133 134"');
    expect(executedQuery).toContain("Location=England");
  });

  test("parent-age search pre-filters on the WT+ server instead of fetching every child", async () => {
    const executedQuery = await executedQueryFor("Shropshire born 1800-1850 when parent was under 14 or over 70");
    expect(executedQuery).not.toContain("AiSentinel");
    expect(executedQuery).not.toContain(" OR ");
    expect(executedQuery).toContain("BirthLocation=Shropshire");
    expect(executedQuery).toContain("[Default].[Birth Date].AsNumber In 18000000..18509999");
    const F = "[Default].[Father Birth Date].AsNumber";
    const M = "[Default].[Mother Birth Date].AsNumber";
    const B = "[Default].[Birth Date].AsNumber";
    expect(executedQuery).toContain(
      `sql="(((${F} > 0) And (${B} - ${F} < 140000)) Or ((${F} > 0) And (${B} - ${F} > 700000)) Or ` +
        `((${M} > 0) And (${B} - ${M} < 140000)) Or ((${M} > 0) And (${B} - ${M} > 700000)))"`
    );
  });

  test("sibling birth-gap search pre-filters to people with siblings and full birth dates", async () => {
    const executedQuery = await executedQueryFor(
      "Flintshire siblings with implausibly close birth dates (< 5 months apart)"
    );
    expect(executedQuery).toBe(
      'BirthLocation=Flintshire sql="([Siblings].[User ID].LineCount > 0) And ([Default].[Birth Date].AsNumber % 100 > 0)"'
    );
  });

  const BORN_1820S = 'sql="([Default].[Birth Date].AsNumber In 18200000..18299999)"';

  test.each([
    "Shropshire unsourced born in 1820s",
    "unsourced profiles in Shropshire born 1820s",
    "Shropshire 1820s no sources",
    "born in the 1820s, Shropshire, missing sources",
  ])("decade means born in the decade: %s", async (prompt) => {
    const executedQuery = await executedQueryFor(prompt);
    expect(executedQuery).not.toContain("AiSentinel");
    expect(executedQuery).toContain("Shropshire");
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain(BORN_1820S);
  });

  test.each([
    ["Lancashire 1800-1899 large spousal age gaps (> 20 years)", "18000000..18999999"],
    ["Lancashire 1800-1809 large spousal age gaps (> 20 years)", "18000000..18099999"],
  ])("the prompts the 1800s buttons send run deterministically: %s", async (prompt, range) => {
    const executedQuery = await executedQueryFor(prompt);
    expect(executedQuery).not.toContain("AiSentinel");
    expect(executedQuery).toContain("BirthLocation=Lancashire");
    expect(executedQuery).toContain(range);
    // A4, 2026-10-03: the gap is pre-filtered on the server (281,390 → 2,022 candidates).
    expect(executedQuery).toContain("[Spouses].[Birth Date].AsNumber - [Default].[Birth Date].AsNumber > 190000");
  });
});
