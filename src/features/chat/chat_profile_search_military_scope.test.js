// Regression for the "why are all these categories Greek?" bug: a military
// category search with an unresolvable location (e.g. "Chicago") must NOT fall
// back to a foreign national armed-forces tree.

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));
jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPICatCIBSearch, wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

const GREEK_ROOT = {
  Name: "Greek_Armed_Forces",
  Children: ["Hellenic_Air_Force", "Hellenic_Army", "Hellenic_Navy", "Royal_Hellenic_Army", "Royal_Hellenic_Navy"].join(
    "\n"
  ),
};

const BRITISH_ROOT = {
  Name: "British_Armed_Forces",
  Children: ["Royal_Air_Force", "Royal_Navy", "British_Army"].join("\n"),
};

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

async function runRaw(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  if (!wtAPIProfileSearch.mock.calls.length) return null;
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("military category expansion needs a country/region scope", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: [], searchLog: "Result: 0" } });
    // The catalog text search (fetch to plus.wikitree.com) always offers the
    // data-rich Greek armed-forces root — that is what the picker used to grab.
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ response: { categories: [GREEK_ROOT] } }),
    }));
    delete window.callAiModel;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  test("does NOT expand to a Greek/foreign tree when the location has no resolvable country", async () => {
    // Chicago resolves to no country scope (country-scope catalog lookup empty).
    wtAPICatCIBSearch.mockResolvedValue({ response: { categories: [] } });

    const query = await runRaw("Location=Chicago CategoryFull=Military");

    // The bug produced Location=Chicago CategoryFull=Greek_Armed_Forces OR ...
    expect(query).not.toMatch(/Greek/i);
    expect(query).not.toMatch(/Hellenic/i);
  });

  test("still expands to the national tree when a country scope resolves", async () => {
    // England IS a known country, so a country scope resolves and the military
    // expansion is allowed to run and anchor on the British tree.
    wtAPICatCIBSearch.mockResolvedValue({ response: { categories: [] } });
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ response: { categories: [BRITISH_ROOT] } }),
    }));

    const query = await runRaw("Location=England CategoryFull=Military");

    expect(query).toMatch(/British_Armed_Forces|Royal_Navy|British_Army/);
    expect(query).not.toMatch(/Greek|Hellenic/i);
  });

  test("a resolved place never takes a root tree that doesn't name it (live 'Chicago military', 2026-10-02)", async () => {
    // Live, Chicago resolved to a place scope, yet the only armed-forces root
    // offered was Greek and the picker took it: 0 results.
    wtAPICatCIBSearch.mockResolvedValue({
      response: {
        categories: [
          { category: "Chicago, Illinois", other: "Cook County, Illinois" },
          { category: "Armour and Company", other: "Chicago, Illinois" },
        ],
      },
    });

    const query = await runRaw("Location=Chicago CategoryFull=Military");

    expect(query).not.toMatch(/Greek|Hellenic/i);
    // "Military" alone found 85; each military word with the place repeated found 1,514.
    expect(query).toContain("Location=Chicago CategoryWord=Army OR");
    expect(query).toContain('Location=Chicago CategoryWord="Coast Guard"');
  });
});
