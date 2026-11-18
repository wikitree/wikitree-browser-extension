import {
  NotLoggedInError,
  STALE_AFTER_MS,
  buildPageFacts,
  buildPrivateFacts,
  isTeamMember,
  loadPageFacts,
  storePageFacts,
  storedFactsFit,
} from "./presentation_mode_store";

const answer = (body) => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) });

afterEach(() => {
  delete global.fetch;
});

describe("buildPrivateFacts", () => {
  test("an empty watchlist (the API's answer without the login) means not logged in", async () => {
    global.fetch = jest.fn(() => answer([{ watchlist: [], status: 0, watchlistCount: false }]));
    await expect(buildPrivateFacts({ userId: 101 })).rejects.toBeInstanceOf(NotLoggedInError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("storedFactsFit", () => {
  const record = { version: 4, userId: 101, watchlistCount: 250, facts: [] };
  test("the member's own list", () => {
    expect(storedFactsFit(record, 101)).toBe(true);
    expect(storedFactsFit(record, 202)).toBe(false);
  });
  test("not a list built without the login, or the old way", () => {
    expect(storedFactsFit({ ...record, watchlistCount: 0 }, 101)).toBe(false);
    expect(storedFactsFit({ ...record, version: undefined }, 101)).toBe(false);
  });
});

describe("buildPageFacts", () => {
  // A private profile the member can see but isn't on the watchlist for, and their private mother.
  const authed = {
    7: { Id: 7, Name: "Example-7", FirstName: "Ann", LastNameAtBirth: "Example", Privacy: 20, BirthDate: "1978-05-10" },
    5: { Id: 5, Name: "Example-5", FirstName: "Mary", LastNameAtBirth: "Sample", Privacy: 20, BirthDate: "1950-02-03" },
  };
  const anon = {
    7: { Id: 7, Name: "Example-7", FirstName: "Ann", LastNameAtBirth: "Example", Privacy: 20, BirthDate: "" },
    5: { Id: 5, Name: "Example-5", FirstName: "Mary", LastNameAtBirth: "Sample", Privacy: 20, BirthDate: "" },
  };

  test("finds what the public can't see of the page's person and their family", async () => {
    global.fetch = jest.fn((url, { credentials, body }) => {
      const people = credentials === "include" ? authed : anon;
      const nuclear = new URLSearchParams(body).get("nuclear") === "1";
      // nuclear=1 can leave the person themself out.
      return answer([{ status: 0, people: nuclear ? { 5: people[5] } : { 7: people[7] } }]);
    });
    const facts = await buildPageFacts("Example-7");
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(facts.map((fact) => [fact.id, fact.dates]).sort((a, b) => a[0] - b[0])).toEqual([
      [5, [{ y: 1950, m: 2, d: 3 }]],
      [7, [{ y: 1978, m: 5, d: 10 }]],
    ]);
  });
});

describe("page checks are kept for a day, per member", () => {
  let stored;
  beforeEach(() => {
    stored = {};
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(async (key) => ({ [key]: stored[key] })),
          set: jest.fn(async (items) => Object.assign(stored, items)),
        },
      },
    };
  });
  afterEach(() => {
    delete global.chrome;
  });

  test("kept, then stale, and not shared with another member", async () => {
    const facts = [{ id: 7 }];
    await storePageFacts(101, "Example-7", facts, 1000);
    expect(await loadPageFacts(101, "example-7", 2000)).toEqual(facts);
    expect(await loadPageFacts(202, "Example-7", 2000)).toBeNull();
    expect(await loadPageFacts(101, "Example-8", 2000)).toBeNull();
    expect(await loadPageFacts(101, "Example-7", 1000 + STALE_AFTER_MS + 1)).toBeNull();
  });

  test("nothing private is kept too, so the page isn't asked about again", async () => {
    await storePageFacts(101, "Example-9", [], 1000);
    expect(await loadPageFacts(101, "Example-9", 2000)).toEqual([]);
  });
});

describe("isTeamMember", () => {
  test("Team members only", () => {
    expect(isTeamMember(19606899)).toBe(true);
    expect(isTeamMember("3835380")).toBe(true);
    expect(isTeamMember(101)).toBe(false);
    expect(isTeamMember(null)).toBe(false);
  });
});
