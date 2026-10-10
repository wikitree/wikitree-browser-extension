jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatCcHandlers } from "./chat_cc";

// Live C8, 2026-10-03: "my watchlist profiles that died in Kent" went to
// searchPerson, which needs a name (and wants watchlist=in, not 1).
describe("watchlist filters", () => {
  test.each([
    ["my watchlist profiles that died in Kent", { event: "death", location: "Kent" }],
    ["people on my watchlist born in Shropshire", { event: "birth", location: "Shropshire" }],
    ["profiles on my watchlist who were born before 1800", { event: "birth", dateDirection: "before", year: 1800 }],
    ["show my watchlist people who died in Kent after 1900", { event: "death", location: "Kent", dateDirection: "after", year: 1900 }],
  ])("routes %s", (prompt, filter) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.WATCHLIST);
    expect(routed.params.filter).toEqual(filter);
  });

  test("refresh my watchlist reads it again", () => {
    const routed = routeChatPrompt("refresh my watchlist", {});
    expect(routed.intent).toBe(ChatIntent.WATCHLIST);
    expect(routed.params.refresh).toBe(true);
  });

  test("plain watchlist has no filter", () => {
    const routed = routeChatPrompt("show my watchlist", {});
    expect(routed.intent).toBe(ChatIntent.WATCHLIST);
    expect(routed.params.filter).toBeUndefined();
  });

  const entries = [
    { Name: "A-1", RealName: "A", DeathLocation: "Dover, Kent, England", DeathDate: "1910-01-01" },
    { Name: "B-1", RealName: "B", DeathLocation: "Louisville, Kentucky", DeathDate: "1920-01-01" },
    { Name: "C-1", RealName: "C", DeathLocation: "Kent, England", DeathDate: "1850-00-00" },
  ];
  const handlers = createChatCcHandlers({
    WikiTreeAPI: { getWatchlist: async () => [entries, entries.length, 0] },
    WBE_CHAT_APP_ID: "test",
    mapApiPersonToStandardRow: (p, extra) => ({
      wtid: p.Name,
      displayName: p.RealName,
      death: p.DeathDate,
      deathLocation: p.DeathLocation,
      ...extra,
    }),
    makeWatchlistTable: (title, rows) => ({ title, rows }),
  });

  test("filters by whole-word place", async () => {
    const result = await handlers.tryHandleWatchlistPrompt(
      routeChatPrompt("my watchlist profiles that died in Kent", {}).params
    );
    expect(result.table.rows.map((r) => r.wtid)).toEqual(["A-1", "C-1"]);
    expect(result.message).toMatch(/^2 of the 3 profiles on your watchlist died in Kent/);
  });

  test("place and year", async () => {
    const result = await handlers.tryHandleWatchlistPrompt(
      routeChatPrompt("my watchlist profiles that died in Kent after 1900", {}).params
    );
    expect(result.table.rows.map((r) => r.wtid)).toEqual(["A-1"]);
  });

  test("none", async () => {
    const result = await handlers.tryHandleWatchlistPrompt(
      routeChatPrompt("my watchlist profiles that died in Devon", {}).params
    );
    expect(result).toBe("None of the 3 profiles on your watchlist died in Devon.");
  });

  // Live, 2026-10-10: signed out, "my watchlist" read as empty and went to the AI ("We need AI").
  test("empty watchlist: signed out asks for the Apps button, and isn't handed to the AI", async () => {
    const make = (loggedIn) =>
      createChatCcHandlers({
        WikiTreeAPI: { getWatchlist: async () => [[], 0, 0], isLoggedIntoAPI: async () => loggedIn },
        WBE_CHAT_APP_ID: "test",
        mapApiPersonToStandardRow: () => ({}),
        makeWatchlistTable: () => ({}),
        getUserNumId: () => "99",
      });
    const signedOut = await make(false).tryHandleWatchlistPrompt({ mode: "list" });
    expect(signedOut).toMatch(/green Apps button/);
    expect(signedOut).not.toMatch(/^I couldn/);
    expect(await make(true).tryHandleWatchlistPrompt({ mode: "list" })).toBe("There are no person profiles on your watchlist.");
  });
});
