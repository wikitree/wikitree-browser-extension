import {
  clearWatchlistCache,
  isManagedBy,
  matchesManagedSpec,
  readWholeWatchlist,
  uncheckableSpecParts,
  watchlistProfiles,
  watchlistDisplayName,
  watchlistAgeNote,
  WATCHLIST_KEEP_MS,
} from "./chat_managed_profiles";

const alice = {
  Id: 11,
  Name: "Smith-1",
  FirstName: "Alice",
  LastNameAtBirth: "Smith",
  LastNameCurrent: "Jones",
  BirthDate: "1852-03-00",
  DeathDate: "0000-00-00",
  BirthLocation: "Dover, Kent, England",
  DeathLocation: "",
  Gender: "Female",
  Father: 0,
  Mother: 22,
  Connected: 1,
  Privacy: 40,
  Manager: 99,
  Managers: [{ Id: 99, Name: "Me-1" }],
};

describe("managed profiles from the watchlist", () => {
  test("Managers as objects or ids; Manager as a fallback; not a Trusted-List-only profile", () => {
    expect(isManagedBy(alice, 99)).toBe(true);
    expect(isManagedBy(alice, "", "me-1")).toBe(true);
    expect(isManagedBy({ Managers: [99] }, 99)).toBe(true);
    expect(isManagedBy({ Managers: { a: { Id: 99 } } }, 99)).toBe(true);
    expect(isManagedBy({ Manager: 99 }, 99)).toBe(true);
    expect(isManagedBy({ Manager: 5, Managers: [{ Id: 5, Name: "Other-5" }] }, 99, "Me-1")).toBe(false);
  });

  test("checks names, places, dates, gender and parents", () => {
    expect(matchesManagedSpec(alice, { manager: "Me-1" })).toBe(true);
    expect(matchesManagedSpec(alice, { places: [{ text: "Kent", event: "birth" }] })).toBe(true);
    expect(matchesManagedSpec(alice, { places: [{ text: "Kent", event: "death" }] })).toBe(false);
    expect(matchesManagedSpec(alice, { notPlaces: [{ text: "Kent", event: "any" }] })).toBe(false);
    expect(matchesManagedSpec(alice, { dates: [{ event: "birth", from: 1850, to: 1859 }] })).toBe(true);
    expect(matchesManagedSpec(alice, { dates: [{ event: "birth", to: 1800 }] })).toBe(false);
    expect(matchesManagedSpec(alice, { missingDates: ["death"] })).toBe(true);
    expect(matchesManagedSpec(alice, { missingPlaces: ["birth"] })).toBe(false);
    expect(matchesManagedSpec(alice, { gender: "female" })).toBe(true);
    expect(matchesManagedSpec(alice, { gender: "male" })).toBe(false);
    expect(matchesManagedSpec(alice, { names: { anyLastName: "jones" } })).toBe(true);
    expect(matchesManagedSpec(alice, { names: { lastNameAtBirth: "Jones" } })).toBe(false);
    expect(matchesManagedSpec(alice, { flags: ["NoFather"] })).toBe(true);
    expect(matchesManagedSpec(alice, { flags: ["NoParents"] })).toBe(false);
    expect(matchesManagedSpec(alice, { flags: ["Unconnected"] })).toBe(false);
  });

  test("what only WT+ can check", () => {
    expect(uncheckableSpecParts({ manager: "Me-1", places: [{ text: "Kent", event: "birth" }], flags: ["NoFather"] })).toEqual([]);
    expect(uncheckableSpecParts({ manager: "Me-1", flags: ["Unsourced"] })).toEqual(["Unsourced"]);
    expect(uncheckableSpecParts({ manager: "Me-1", categories: [{ name: "Twins" }] })).toEqual(["categories"]);
    expect(uncheckableSpecParts({ manager: "Me-1", places: [{ text: "Kent", event: "marriage" }] })).toEqual(["marriage place"]);
  });

  test("watchlist entries are profiles or wrap one", () => {
    expect(watchlistProfiles([alice, { profile: { Name: "B-2" } }, { Id: 3 }]).map((p) => p.Name)).toEqual(["Smith-1", "B-2"]);
  });

  test("names by PersonName, not RealName alone", () => {
    expect(watchlistDisplayName({ FirstName: "Margery", RealName: "Margery", LastNameAtBirth: "Maisterson", LastNameCurrent: "Wetenhall" })).toBe(
      "Margery (Maisterson) Wetenhall"
    );
    expect(watchlistDisplayName({ FirstName: "John", MiddleName: "Henry", LastNameAtBirth: "Smith", LastNameCurrent: "Smith" })).toBe("John Henry Smith");
    expect(watchlistDisplayName({ Name: "Private-1" })).toBe("Private-1");
  });

  describe("reading the whole watchlist", () => {
    beforeEach(() => clearWatchlistCache());
    const list = Array.from({ length: 23 }, (_, i) => ({ Name: `P-${i}` }));

    test("all pages, in order, a failed page tried again, and kept for a follow-up", async () => {
      let failedOnce = false;
      const getPage = jest.fn(async (offset, limit) => {
        if (offset === 10 && !failedOnce) {
          failedOnce = true;
          throw new TypeError("Failed to fetch");
        }
        return [list.slice(offset, offset + limit), list.length, 0];
      });
      const progress = [];
      const entries = await readWholeWatchlist(getPage, { cacheKey: "99", pageSize: 5, onProgress: (read) => progress.push(read) });
      expect(entries.map((e) => e.Name)).toEqual(list.map((e) => e.Name));
      expect(progress[progress.length - 1]).toBe(23);
      const calls = getPage.mock.calls.length;
      expect(await readWholeWatchlist(getPage, { cacheKey: "99", pageSize: 5 })).toBe(entries);
      expect(getPage.mock.calls.length).toBe(calls);
    });

    test("a page that keeps failing fails the read", async () => {
      const getPage = async (offset, limit) => {
        if (offset === 5) throw new TypeError("Failed to fetch");
        return [list.slice(offset, offset + limit), list.length, 0];
      };
      await expect(readWholeWatchlist(getPage, { pageSize: 5 })).rejects.toThrow("Failed to fetch");
    });
  });

  describe("kept between page loads", () => {
    beforeEach(() => clearWatchlistCache());
    const list = [{ Name: "A-1" }, { Name: "B-2" }];
    const getPage = jest.fn(async () => [list, 2, 0]);

    test("a stored copy is used while it's fresh, and saved after a read", async () => {
      const saved = [];
      const store = { load: async () => ({ at: 1000, entries: [{ Name: "Old-1" }] }), save: async (...args) => saved.push(args) };
      getPage.mockClear();
      const fresh = await readWholeWatchlist(getPage, { cacheKey: "99", store, now: () => 1000 + 60000 });
      expect(fresh.map((e) => e.Name)).toEqual(["Old-1"]);
      expect(getPage).not.toHaveBeenCalled();

      clearWatchlistCache();
      const stale = await readWholeWatchlist(getPage, { cacheKey: "99", store, now: () => 1000 + WATCHLIST_KEEP_MS + 1 });
      expect(stale.map((e) => e.Name)).toEqual(["A-1", "B-2"]);
      expect(saved[0][0]).toBe("99");
    });

    test("refresh reads it again", async () => {
      const store = { load: async () => ({ at: Date.now(), entries: [{ Name: "Old-1" }] }), save: async () => {} };
      const entries = await readWholeWatchlist(getPage, { cacheKey: "99", store, refresh: true });
      expect(entries.map((e) => e.Name)).toEqual(["A-1", "B-2"]);
    });

    test("age note", async () => {
      const t0 = 1_000_000;
      await readWholeWatchlist(getPage, { cacheKey: "99", refresh: true, now: () => t0 });
      expect(watchlistAgeNote("99", t0 + 60000)).toBe("");
      expect(watchlistAgeNote("99", t0 + 25 * 60000)).toMatch(/read 25 minutes ago\. Say "refresh my watchlist"/);
      expect(watchlistAgeNote("99", t0 + 3 * 3600000)).toMatch(/read 3 hours ago/);
    });
  });
});

