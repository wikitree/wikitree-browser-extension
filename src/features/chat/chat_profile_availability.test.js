jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getPeople: jest.fn() } }));

import { checkProfileInApi, describeUnloadedProfile, isSamePerson } from "./chat_profile_availability";

// getPeople's answers, as seen live on 2026-10-05.
const MISSING = ["", { "Horkan-26": { status: "Invalid profile", Id: null } }, []];
const HIDDEN = ["", { "Smith-1": { Id: 5 } }, { 5: { Id: 5 } }];
const OPEN = ["", { "Windsor-1": { Id: 64662 } }, { 64662: { Id: 64662, Name: "Windsor-1", Privacy: 60 } }];

describe("checkProfileInApi", () => {
  test.each([
    ["Horkan-26", MISSING, "missing"],
    ["Smith-1", HIDDEN, "hidden"],
    ["Windsor-1", OPEN, "ok"],
  ])("%s → %s", async (key, answer, expected) => {
    expect(await checkProfileInApi(key, { getPeople: async () => answer })).toBe(expected);
  });

  test("an API error is unknown", async () => {
    const getPeople = async () => {
      throw new Error("Internal API error");
    };
    expect(await checkProfileInApi("Horkan-26", { getPeople })).toBe("unknown");
    expect(await checkProfileInApi("", { getPeople })).toBe("unknown");
  });
});

describe("describeUnloadedProfile", () => {
  const label = "John Horkan (Horkan-26)";

  test("a new profile on the page isn't called private", () => {
    const message = describeUnloadedProfile({ label, what: "descendants", status: "missing", isPagePerson: true });
    expect(message).toMatch(/^John Horkan \(Horkan-26\) isn't in WikiTree's API yet\./);
    expect(message).toContain("try again in a few minutes");
    expect(message).not.toMatch(/private/i);
    // (doesn't start "I couldn't", so it isn't handed to the AI)
    expect(message).not.toMatch(/^I could/);
  });

  test("a missing profile elsewhere may be new or a wrong ID", () => {
    const message = describeUnloadedProfile({ label: "Horkan-99", status: "missing" });
    expect(message).toContain("WikiTree's API has no profile Horkan-99");
    expect(message).toContain("check the WikiTree ID");
  });

  test("a private profile, with the Apps login hint when logged out of the API", () => {
    const message = describeUnloadedProfile({ label, what: "ancestors", status: "hidden", apiLoggedIn: false, privateHint: "Ask about an ancestor." });
    expect(message).toContain("profile is private to you");
    expect(message).toContain("can't see their ancestors");
    expect(message).toContain("green Apps button");
    expect(message).toMatch(/Ask about an ancestor\.$/);
    expect(describeUnloadedProfile({ label, status: "hidden", apiLoggedIn: true })).not.toContain("Apps");
  });

  test("otherwise the old failure message", () => {
    expect(describeUnloadedProfile({ label, what: "ancestors", status: "unknown" })).toBe("I couldn't load John Horkan (Horkan-26)'s ancestors from WikiTree.");
    expect(describeUnloadedProfile({ label: "Horkan-26", status: "ok" })).toBe("I couldn't load Horkan-26 from WikiTree.");
  });
});

describe("isSamePerson", () => {
  const pageRoot = { key: 51723471, wtId: "Horkan-26", displayName: "John Horkan" };
  test("matches by ID or number, ignoring case", () => {
    expect(isSamePerson({ key: 51723471 }, pageRoot)).toBe(true);
    expect(isSamePerson("horkan-26", pageRoot)).toBe(true);
    expect(isSamePerson("Horkan-27", pageRoot)).toBe(false);
    expect(isSamePerson("Horkan-26", null)).toBe(false);
  });
});
