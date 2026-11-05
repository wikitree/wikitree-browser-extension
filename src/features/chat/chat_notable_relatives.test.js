jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { ChatIntent, parseDnaConfirmedPrompt, parseNotableRelativesPrompt, routeChatPrompt } from "./chat_router";
import { createProfileSearchHandler } from "./chat_profile_search";

// Live C29, 2026-10-03: "am I related to anyone famous?" looked up a profile
// named "anyone famous"; "notables in Cook-8721's CC7" built a CC7 summary.
describe("notable relatives", () => {
  test.each([
    ["am I related to anyone famous?", "notables in my CC7"],
    ["Am I related to someone notable", "notables in my CC7"],
    ["is Cook-8721 related to anyone famous?", "notables in Cook-8721's CC7"],
    ["do I have any famous relatives?", "notables in my CC7"],
    ["do I have famous ancestors", "notables in my ancestors"],
    ["my notable cousins", "notables in my CC7"],
    ["Cook-8721's famous relatives", "notables in Cook-8721's CC7"],
    ["famous people in my family", "notables in my CC7"],
    ["notable people in Cook-8721's CC7", "notables in Cook-8721's CC7"],
    ["notables in Cook-8721's CC7", "notables in Cook-8721's CC7"],
    ["notables among my ancestors", "notables in my ancestors"],
  ])("%s", (prompt, expected) => {
    expect(parseNotableRelativesPrompt(prompt)).toBe(expected);
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.PROFILE_SEARCH, params: { query: expected } });
  });

  test.each(["is Abraham Lincoln related to anyone famous?", "how am I related to Abraham Lincoln?", "famous Beacalls"])(
    "declines %s",
    (prompt) => {
      expect(parseNotableRelativesPrompt(prompt)).toBeNull();
    }
  );

  test("a filtered CC7 is not a CC summary", () => {
    expect(routeChatPrompt("notables in Cook-8721's CC7").intent).not.toBe(ChatIntent.CC_SUMMARY);
    expect(routeChatPrompt("Cook-8721's CC7").intent).toBe(ChatIntent.CC_SUMMARY);
  });

  test.each([
    ["notables in my CC7", "CC7=User-1 Notables"],
    ["notables in Cook-8721's ancestors", "Ancestors=Cook-8721 Notables"],
    [
      "dna-confirmed in my CC7",
      'CC7=User-1 sql="([Default].[Father Status].AsNumber = 30) Or ([Default].[Mother Status].AsNumber = 30)"',
    ],
  ])("runs %s as %s", async (query, expected) => {
    wtAPIProfileSearch.mockClear();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: [], searchLog: "Result: 0\r\n" } });
    const { tryHandleProfileSearchPrompt } = createProfileSearchHandler({
      WBE_CHAT_APP_ID: "wbe-chat-test",
      hasAnyApiKey: jest.fn(() => true),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
      getChatAiConfig: jest.fn(async () => ({})),
      fetchSearchPersonPaged: jest.fn(async () => [0, []]),
      fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
      mapApiPersonToStandardRow: jest.fn(() => ({})),
      makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
      makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      normalizeKnownDate: jest.fn((value) => value),
      showChatShaky: jest.fn(),
      hideChatShaky: jest.fn(),
    });
    await tryHandleProfileSearchPrompt({ query }, query);
    expect(wtAPIProfileSearch).toHaveBeenCalled();
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toBe(expected);
  });

  // Live C32, 2026-10-03: with an AI key the AI re-read the canonical query and
  // asked "DNA-confirmed parent or DNA test?".
  test("with AI on, the canonical query runs and a zero result stands, without asking the AI", async () => {
    wtAPIProfileSearch.mockClear();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: [], searchLog: "Result: 0\r\n" } });
    global.chrome = { runtime: { sendMessage: jest.fn(async () => ({ success: true, response: "{}" })) } };
    const { tryHandleProfileSearchPrompt } = createProfileSearchHandler({
      WBE_CHAT_APP_ID: "wbe-chat-test",
      hasAnyApiKey: jest.fn(async () => true),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "k", model: "m" })),
      fetchSearchPersonPaged: jest.fn(async () => [0, []]),
      fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
      mapApiPersonToStandardRow: jest.fn(() => ({})),
      makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
      makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      normalizeKnownDate: jest.fn((value) => value),
      showChatShaky: jest.fn(),
      hideChatShaky: jest.fn(),
    });
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "dna-confirmed in my CC7");
    expect(JSON.stringify(result)).toMatch(/couldn.t find any profiles for WT\+ query: CC7=User-1/);
    expect(global.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toMatch(/^CC7=User-1 sql=/);
    delete global.chrome;
  });

  test.each([
    ["my DNA-confirmed relationships", "dna-confirmed in my CC7"],
    ["show my DNA confirmed ancestors", "dna-confirmed in my ancestors"],
    ["Cook-8721's DNA-confirmed relatives", "dna-confirmed in Cook-8721's CC7"],
  ])("%s", (prompt, expected) => {
    expect(parseDnaConfirmedPrompt(prompt)).toBe(expected);
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.PROFILE_SEARCH, params: { query: expected } });
  });
});
