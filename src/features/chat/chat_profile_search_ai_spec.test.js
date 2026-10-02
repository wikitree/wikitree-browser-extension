// The AI answers with a JSON search spec (chat_search_spec.js); code compiles it to
// WT+. These tests mock the model's replies and check what Muse does with each kind.

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

async function run(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  return tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
}

const executedQuery = () => decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
const aiReplies = (...replies) => {
  window.callAiModel = jest.fn();
  replies.forEach((reply) =>
    window.callAiModel.mockResolvedValueOnce(typeof reply === "string" ? reply : JSON.stringify(reply))
  );
};

describe("AI search spec replies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
  });

  afterEach(() => {
    delete window.callAiModel;
  });

  test("a search spec is compiled to WT+ and the reply says how it was read", async () => {
    aiReplies({
      action: "search",
      understood: "Profiles born in Devon in 1851 or later",
      assumptions: ["post-1850 read as 1851 onward"],
      search: { places: [{ text: "Devon", event: "birth" }], dates: [{ event: "birth", from: 1851 }] },
    });
    const result = await run("Devon births, post-1850");
    expect(window.callAiModel).toHaveBeenCalledTimes(1);
    expect(window.callAiModel.mock.calls[0][0]).toContain('Request: "Devon births, post-1850"');
    expect(executedQuery()).toBe('BirthLocation=Devon sql="([Default].[Birth Date].AsNumber >= 18510000)"');
    const message = typeof result === "string" ? result : result.message;
    expect(message).toContain('I interpreted this as "Profiles born in Devon in 1851 or later"');
    expect(message).not.toContain("Understood as:"); // already quoted once
    expect(message).toContain("Assumed: post-1850 read as 1851 onward");
  });

  test("clarify shows buttons that resend a reworded prompt, and runs nothing", async () => {
    aiReplies({
      action: "clarify",
      understood: "Kent profiles",
      question: "Do you mean the county of Kent or the surname Kent?",
      options: [
        { label: "Kent, England (county)", prompt: "people in Kent, England born 1800-1850" },
        { label: "Surname Kent", prompt: "people with the surname Kent born 1800-1850" },
      ],
    });
    const result = await run("Devon births, post-1850");
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.message).toBe("Do you mean the county of Kent or the surname Kent?");
    expect(result.actions).toEqual([
      { label: "Kent, England (county)", actionType: "send-prompt", prompt: "people in Kent, England born 1800-1850" },
      { label: "Surname Kent", actionType: "send-prompt", prompt: "people with the surname Kent born 1800-1850" },
    ]);
  });

  test("unsupported explains why instead of running a guess", async () => {
    aiReplies({
      action: "unsupported",
      understood: "Living people born in Devon after 1850",
      reason: "WikiTree+ doesn't index whether a person is living.",
    });
    const result = await run("Devon births, post-1850");
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.message).toContain("I can't run that search: WikiTree+ doesn't index whether a person is living.");
  });

  test("an unusable reply is retried once with the problem named", async () => {
    aiReplies(
      { action: "search", understood: "x", search: { flags: ["Living"], places: [{ text: "Devon" }] } },
      {
        action: "search",
        understood: "Profiles born in Devon in 1851 or later",
        search: { places: [{ text: "Devon", event: "birth" }], dates: [{ event: "birth", from: 1851 }] },
      }
    );
    await run("Devon births, post-1850");
    expect(window.callAiModel).toHaveBeenCalledTimes(2);
    expect(window.callAiModel.mock.calls[1][0]).toContain("unknown flag: Living");
    expect(executedQuery()).toContain("BirthLocation=Devon");
  });

  test("the instructions carry the schema, reading rules and context", async () => {
    aiReplies({ action: "unsupported", understood: "", reason: "test" });
    await run("Devon births, post-1850");
    const prompt = window.callAiModel.mock.calls[0][0];
    expect(prompt).toContain("You do NOT write any query language");
    expect(prompt).toContain("A decade (1820s, the 1820s) means born 1820-1829.");
    expect(prompt).toContain("Never ask about how a place is written");
    expect(prompt).toContain('"age 42", "aged 42", "died at 42" = deathAge 42.');
    expect(prompt).toContain("The user is User-1");
    expect(prompt).toMatch(/Today is \d{4}-\d{2}-\d{2}/);
  });

  test("with a key, the AI reads prompts the general local parser would get wrong", async () => {
    // Local parse: female 19Cen Location=Dickin (Dickin is a surname).
    aiReplies({
      action: "search",
      understood: "Women with the surname Dickin born 1800-1899",
      assumptions: ["Dickin read as a surname"],
      search: { names: { anyLastName: "Dickin" }, dates: [{ event: "birth", from: 1800, to: 1899 }], gender: "female" },
    });
    await run("Dickin 19th century and female");
    expect(window.callAiModel).toHaveBeenCalledTimes(1);
    expect(executedQuery()).toBe("AllLastNames=Dickin 19Cen female");
  });

  test("the local parse is the fallback when the AI gives nothing usable", async () => {
    aiReplies("not json", "still not json");
    await run("Dickin 19th century and female");
    expect(window.callAiModel).toHaveBeenCalledTimes(2);
    expect(executedQuery()).toContain("19Cen");
    expect(executedQuery()).toContain("female");
  });

  test.each([
    ["curated suggestion alias", "England no birth or death date"],
    ["custom route", "Shropshire born 1800-1850 when parent was under 14 or over 70"],
    ["strict status+place+decade parser", "Shropshire unsourced born in 1820s"],
    ["raw WT+ syntax", "BirthLocation=Devon B1820"],
  ])("trusted local parses don't ask the AI: %s", async (label, prompt) => {
    aiReplies({ action: "unsupported", understood: "", reason: "should not be asked" });
    await run(prompt);
    expect(window.callAiModel).not.toHaveBeenCalled();
    expect(wtAPIProfileSearch).toHaveBeenCalled();
  });
  test("when the AI's rereading also finds nothing, the first zero is the answer", async () => {
    wtAPIProfileSearch.mockResolvedValue({ response: { found: 0, profiles: [], searchLog: "AND: 0\r\nResult: 0\r\n" } });
    aiReplies({
      action: "search",
      understood: "Profiles with the surname Cheshire and no biography",
      search: { names: { anyLastName: "Cheshire" }, suggestions: [802] },
    });
    const result = await run("Cheshire no biography at all");
    const message = typeof result === "string" ? result : result.message;
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(2);
    expect(message).toContain("Location=Cheshire Suggestions=802");
    expect(message).not.toContain("AllLastNames=Cheshire");
  });
  test("a zero prefix before sql= is reported as no results, not a SQL error", async () => {
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        found: 0,
        profiles: [],
        searchLog:
          'Location="Hampshire, England" AllLastNames=Nobody: 0\r\nsql=(x): No profiles!!! (search should not be start with sql="...")\r\nResult: 0\r\n',
      },
    });
    aiReplies({
      action: "search",
      understood: "Nobody in Hampshire born before 1800",
      search: { names: { anyLastName: "Nobody" }, places: [{ text: "Hampshire, England" }], dates: [{ event: "birth", to: 1799 }] },
    });
    const result = await run("Nobody profiles from Hampshire, England born before 1800");
    const message = typeof result === "string" ? result : result.message;
    expect(message).not.toMatch(/SQL parse issue/);
    expect(message).toMatch(/couldn't find any profiles/i);
  });
});
