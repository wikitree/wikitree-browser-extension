import { createChatCcHandlers } from "./chat_cc";

function makeHandlers(subjectRoot, formatSubjectLabel) {
  const people = {};
  for (let i = 1; i <= 1192; i += 1) {
    people[i] = { Id: i, Name: `Test-${i}`, Meta: { Degrees: 1 } };
  }
  return createChatCcHandlers({
    WikiTreeAPI: { getPeople: jest.fn(async () => ["", null, people]) },
    WBE_CHAT_APP_ID: "test",
    CC7_CACHE_MS: 0,
    formatSubjectLabel,
    resolveCc7SubjectRoot: async () => subjectRoot,
    mapApiPersonToStandardRow: (profile, extra) => ({ displayName: profile.Name, wtid: profile.Name, ...extra }),
    makeStandardProfileTable: () => ({}),
    makeWatchlistTable: () => ({}),
    normalizeText: (text) => String(text || "").toLowerCase(),
  });
}

describe("CC summary wording", () => {
  test("'my cc7' reads 'Your CC7 (Beacall-6)' (live corpus B11, 2026-10-02)", async () => {
    const handlers = makeHandlers({ key: 6, wtId: "Beacall-6", displayName: "Beacall-6", subjectType: "user" }, () => "you (Beacall-6)");
    const result = await handlers.tryHandleCcSummaryPrompt({ nuclear: 7 }, "my cc7");
    expect(result.message.split("\n")[0]).toBe("Your CC7 (Beacall-6) includes 1,192 profiles.");
  });

  test("another person keeps the possessive", async () => {
    const handlers = makeHandlers({ key: 9, wtId: "Cantrell-3638", displayName: "Benny", subjectType: "profile" }, () => "Benny (Cantrell-3638)");
    const result = await handlers.tryHandleCcSummaryPrompt({ nuclear: 7 }, "cc7 of Cantrell-3638");
    expect(result.message.split("\n")[0]).toBe("Benny (Cantrell-3638)'s CC7 includes 1,192 profiles.");
  });
});
