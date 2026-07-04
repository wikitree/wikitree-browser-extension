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

describe("chat second-set prompt corpus (deterministic WT+ parses)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("born before 1750 in Devon", async () => {
    const executedQuery = await executedQueryFor("born before 1750 in Devon");
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber < 1750/);
    expect(executedQuery).toMatch(/(?:Birth)?Location=Devon/);
  });

  test("died after 1900 in Liverpool", async () => {
    const executedQuery = await executedQueryFor("died after 1900 in Liverpool");
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber > 1900/);
    expect(executedQuery).toMatch(/(?:Death)?Location=Liverpool/);
  });

  test("Shropshire unsourced born in 1820s", async () => {
    const executedQuery = await executedQueryFor("Shropshire unsourced born in 1820s");
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain("1820s");
    expect(executedQuery).toContain("Shropshire");
    expect(executedQuery).not.toContain("19Cen");
  });

  test("20th century more than 6 children and married in Cheshire", async () => {
    const executedQuery = await executedQueryFor("20th century more than 6 children and married in Cheshire");
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).toMatch(/20Cen|\[Marriage\]\.\[Marriage Date\]\.AsNumber In 19000101\.\.19991231/);
  });

  test("19th century Cheshire, exactly one marriage", async () => {
    const executedQuery = await executedQueryFor("19th century Cheshire, exactly one marriage");
    expect(executedQuery).toContain("[Marriage].[Marriage Location].LineCount = 1");
    expect(executedQuery).toContain("Cheshire");
    expect(executedQuery).toMatch(/19Cen|18000101\.\.18991231/);
  });

  test("England suggestions 678", async () => {
    const executedQuery = await executedQueryFor("England suggestions 678");
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("Brown created after 2024-01-01", async () => {
    const executedQuery = await executedQueryFor("Brown created after 2024-01-01");
    expect(executedQuery).toMatch(/Brown/);
    expect(executedQuery).toMatch(/Created/i);
    expect(executedQuery).toMatch(/2024/);
  });

  test("template text contains Kentucky", async () => {
    const executedQuery = await executedQueryFor("template text contains Kentucky");
    expect(executedQuery).toMatch(/\[Templates\]\.\[Template text\]\.AsString Like '\*Kentucky\*'|TemplateText=Kentucky/);
  });

  test("managed only by England project", async () => {
    const executedQuery = await executedQueryFor("managed only by England project");
    expect(executedQuery).toMatch(/Manager=/);
    expect(executedQuery).toMatch(/All Managers/);
  });

  test("England ProjectManaged or PPP", async () => {
    const executedQuery = await executedQueryFor("England ProjectManaged or PPP");
    const branches = executedQuery.split(/\s+OR\s+/i);
    expect(branches).toHaveLength(2);
    expect(branches[0]).toContain("Location=England");
    expect(branches[1]).toContain("Location=England");
    expect(executedQuery).toContain("ProjectManaged");
    expect(executedQuery).toContain("PPP");
  });

  test("Dickin 19th century and female retries the ambiguous token as a surname on zero results", async () => {
    // First run guesses Location=Dickin and finds nothing; the deterministic
    // retry must swap the lone token to a surname scope.
    wtAPIProfileSearch
      .mockResolvedValueOnce({ response: { found: 0, profiles: [], searchLog: "Result: 0\r\n" } })
      .mockResolvedValueOnce({ response: { found: 1, profiles: ["1"], searchLog: "Result: 1\r\n" } });

    await runPrompt("Dickin 19th century and female");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(2);
    const firstQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    const retryQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[1][1]);
    expect(firstQuery).toContain("Location=Dickin");
    expect(retryQuery).toContain("AllLastNames=Dickin");
    expect(retryQuery).toMatch(/19Cen|18000101\.\.18991231/);
    expect(retryQuery).toContain("female");
  });

  test("Manchester age 42 and connected", async () => {
    const executedQuery = await executedQueryFor("Manchester age 42 and connected");
    expect(executedQuery).toContain("Location=Manchester");
    expect(executedQuery).toContain("age42");
    expect(executedQuery).toContain("connected");
  });

  test("Illinois Find a Grave cem 105308", async () => {
    const executedQuery = await executedQueryFor("Illinois Find a Grave cem 105308");
    expect(executedQuery).toContain("Location=Illinois");
    expect(executedQuery).toContain("fgcem105308");
  });
});
