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
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "" })),
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
    mapApiPersonToStandardRow: jest.fn(() => ({})),
    makeStandardProfileTable: jest.fn(() => ({})),
    makeAncestorProfileTable: jest.fn(() => ({})),
    normalizeText: (v) =>
      String(v || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((v) => v),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
}

async function runQuery(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  if (!wtAPIProfileSearch.mock.calls.length) return null;
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("Y-DNA / mtDNA haplogroup + location parsing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: [], searchLog: "Result: 0" } });
    delete window.callAiModel;
  });

  // Regression: the bare "yDNA" token consumer used to eat the word before the
  // "yDNA haplogroup <value>" consumer could fire, turning the haplogroup into
  // junk name/location terms (LastNameAtBirth=haplogroup Location=R-M269).
  test("does NOT let the bare yDNA token swallow the haplogroup phrase", async () => {
    const query = await runQuery("profiles in Cornwall with yDNA haplogroup I-M253");
    expect(query).toBe("Location=Cornwall sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*I-M253*')\"");
    expect(query).not.toMatch(/LastNameAtBirth=haplogroup/i);
    // The refining SQL is not itself a base scope term, so it should not appear bare.
    expect(query).not.toMatch(/(^|\s)yDNA(\s|$)/);
  });

  test("haplogroup-first phrasing keeps the trailing county as the location", async () => {
    const query = await runQuery("yDNA haplogroup R-M269 in Yorkshire");
    expect(query).toBe("Location=Yorkshire sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*R-M269*')\"");
  });

  test("gender + county + haplogroup all combine", async () => {
    const query = await runQuery("men in Yorkshire with yDNA haplogroup R-M269");
    expect(query).toBe("male Location=Yorkshire sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*R-M269*')\"");
  });

  test("mtDNA haplogroup + county parses to the mt field", async () => {
    const query = await runQuery("people in Devon with mtDNA haplogroup H1");
    expect(query).toBe("Location=Devon sql=\"([Bio].[Replicated DNA mtHaplogroup].AsString Like '*H1*')\"");
  });

  // The bare token still works on its own (no "haplogroup"/"lnabs" following):
  // the negative lookahead must not disturb the plain has-yDNA filter.
  test("bare yDNA token still parses when standalone", async () => {
    const query = await runQuery("surname Windsor with yDNA");
    expect(query).toBe("AllLastNames=Windsor yDNA");
  });
});
