jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "Me-1"),
  getUserNumId: jest.fn(() => "99"),
}));

jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: { isLoggedIntoAPI: jest.fn(), getWatchlist: jest.fn() },
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { createProfileSearchHandler } from "./chat_profile_search";
import { clearWatchlistCache } from "./chat_managed_profiles";

const mine = (name, extra = {}) => ({ Id: name.length, Name: name, Managers: [{ Id: 99, Name: "Me-1" }], ...extra });

function makeHandler() {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({})),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [null, null, { 1: { Id: 1, Name: "Public-1" } }]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({ wtid: options.wtid || person?.Name || "" })),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
}

describe("profiles I manage", () => {
  beforeEach(() => {
    clearWatchlistCache();
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
    WikiTreeAPI.getWatchlist.mockResolvedValue([
      [
        mine("Private-2", { BirthLocation: "Kent, England", Privacy: 20 }),
        mine("Mine-3", { BirthLocation: "Devon, England" }),
        { Id: 4, Name: "Trusted-4", BirthLocation: "Kent", Managers: [{ Id: 5, Name: "Other-5" }] },
      ],
      3,
      0,
    ]);
  });

  test("signed in to the API: from the watchlist, private profiles included, WT+ not called", async () => {
    WikiTreeAPI.isLoggedIntoAPI.mockResolvedValue(true);
    const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "profiles I manage born in Kent");
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Private-2"]);
    expect(result.message).toContain("checked the 2 profiles you manage");
  });

  test("a condition only WT+ can check (no sources): WT+, with a note", async () => {
    WikiTreeAPI.isLoggedIntoAPI.mockResolvedValue(true);
    const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "profiles I manage with no sources");
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toContain("Manager=Me-1");
    expect(WikiTreeAPI.getWatchlist).not.toHaveBeenCalled();
    expect(result.message).not.toContain("Apps button");
  });

  test("not signed in to the API: WT+, and the Apps button is offered", async () => {
    WikiTreeAPI.isLoggedIntoAPI.mockResolvedValue(false);
    const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "profiles I manage born in Kent");
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toContain("Manager=Me-1");
    expect(result.message).toContain("green Apps button");
  });
});
