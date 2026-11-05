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

// "his CC7 born in Ontario" (the user, 2026-10-12): full names, nearest first, no "(from API)".
describe("CC7 by place", () => {
  test("lists full names, nearest first", async () => {
    const people = {
      1: { Id: 1, Name: "Cass-1630", FirstName: "William", LastNameAtBirth: "Cass", LastNameCurrent: "Cass", BirthLocation: "Guelph, Ontario, Canada", Meta: { Degrees: 7 } },
      2: { Id: 2, Name: "Phillips-31032", FirstName: "Helen", LastNameAtBirth: "Phillips", LastNameCurrent: "Maloney", BirthLocation: "Toronto, Ontario, Canada", DeathLocation: "Meaford, Ontario, Canada", Meta: { Degrees: 1 } },
      3: { Id: 3, Name: "Smith-1", FirstName: "Ann", LastNameAtBirth: "Smith", BirthLocation: "Kent, England", Meta: { Degrees: 2 } },
    };
    const handlers = createChatCcHandlers({
      WikiTreeAPI: { getPeople: jest.fn(async () => ["", null, people]) },
      WBE_CHAT_APP_ID: "test",
      CC7_CACHE_MS: 0,
      formatSubjectLabel: () => "Lawrence Owen Maloney (Maloney-2333)",
      resolveCc7SubjectRoot: async () => ({ key: 9, wtId: "Maloney-2333", displayName: "Lawrence Owen Maloney", subjectType: "profile" }),
      mapApiPersonToStandardRow: (profile, extra) => ({ displayName: profile.Name, wtid: profile.Name, ...extra }),
      makeStandardProfileTable: () => ({}),
      makeWatchlistTable: () => ({}),
      normalizeText: (text) => String(text || "").toLowerCase(),
    });
    const result = await handlers.tryHandleCc7LocationPrompt({ mode: "list", location: "Ontario", field: "BirthLocation", nuclear: 7 }, "his CC7 born in Ontario");
    expect(result.message).toBe(
      [
        "Here are the CC7 profiles born in Ontario for Lawrence Owen Maloney (Maloney-2333):",
        "- Helen (Phillips) Maloney (Phillips-31032), degree 1: born Toronto, Ontario, Canada; died Meaford, Ontario, Canada",
        "- William Cass (Cass-1630), degree 7: born Guelph, Ontario, Canada",
      ].join("\n")
    );
  });
});
