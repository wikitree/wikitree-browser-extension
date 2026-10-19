import {
  hauntedGroups,
  isProjectAccount,
  recheckHaunted,
  rescanHaunted,
  mergeLaidToRest,
  readAllPages,
  sortPeople,
  summarize,
  slimPerson,
  wikiTreeIdFromHref,
  wikiTreeIdKey,
} from "./haunted_tree_data";

const YEAR = 2026;
// Shapes as the live API sent them on 2026-10-19
const blankDates = {
  BirthDate: "0000-00-00",
  BirthDateDecade: "unknown",
  DeathDate: "0000-00-00",
  DeathDateDecade: "unknown",
};
const person = (fields) => ({ Id: 1, Name: "Smith-1", Father: 5, Mother: 6, Templates: [], ...fields });

describe("hauntedGroups", () => {
  test("the Undead: born 110+ years ago with no death date", () => {
    expect(
      hauntedGroups(person({ BirthDate: "1850-03-02", DeathDate: "0000-00-00", DeathDateDecade: "unknown" }), YEAR)
    ).toEqual(["undead"]);
    expect(
      hauntedGroups(person({ BirthDate: "1916-00-00", DeathDate: "0000-00-00", DeathDateDecade: "unknown" }), YEAR)
    ).toEqual(["undead"]);
    expect(
      hauntedGroups(person({ BirthDate: "1917-00-00", DeathDate: "0000-00-00", DeathDateDecade: "unknown" }), YEAR)
    ).toEqual([]);
  });

  test("a birth decade counts as its last year, so the 1910s aren't undead yet", () => {
    expect(hauntedGroups(person({ BirthDateDecade: "1910s", DeathDateDecade: "unknown" }), YEAR)).toEqual([]);
    expect(hauntedGroups(person({ BirthDateDecade: "1900s", DeathDateDecade: "unknown" }), YEAR)).toEqual(["undead"]);
  });

  test("a death decade, or a death date we can't see, isn't 'no death date'", () => {
    expect(
      hauntedGroups(person({ BirthDate: "1850-00-00", DeathDate: "0000-00-00", DeathDateDecade: "1900s" }), YEAR)
    ).toEqual([]);
    expect(hauntedGroups(person({ BirthDate: "1850-00-00" }), YEAR)).toEqual([]);
  });

  test("Ghosts: no dates at all", () => {
    expect(hauntedGroups(person(blankDates), YEAR)).toEqual(["ghost"]);
    expect(hauntedGroups(person({ BirthDateDecade: "unknown", DeathDateDecade: "unknown" }), YEAR)).toEqual(["ghost"]);
  });

  test("a private profile with only decades is neither ghost nor undead when the decades are recent", () => {
    // Beacall-6 as an anonymous API caller sees him
    expect(
      hauntedGroups(
        person({
          BirthDateDecade: "1960s",
          DeathDateDecade: "unknown",
          Father: null,
          Mother: null,
          Templates: undefined,
        }),
        YEAR
      )
    ).toEqual([]);
  });

  test("Skeletons: the Unsourced template, however it's written", () => {
    expect(
      hauntedGroups(
        person({ BirthDate: "1950-01-01", DeathDate: "2000-01-01", Templates: [{ name: "unsourced", params: [] }] }),
        YEAR
      )
    ).toEqual(["skeleton"]);
    expect(
      hauntedGroups(
        person({ BirthDate: "1950-01-01", DeathDate: "2000-01-01", Templates: [{ name: "Unsourced", params: [] }] }),
        YEAR
      )
    ).toEqual(["skeleton"]);
    expect(
      hauntedGroups(
        person({
          BirthDate: "1950-01-01",
          DeathDate: "2000-01-01",
          Templates: [{ name: "Unsourced Dates", params: [] }],
        }),
        YEAR
      )
    ).toEqual([]);
  });

  test("Headless Horsemen: both parents 0; null means hidden, not missing", () => {
    const dates = { BirthDate: "1950-01-01", DeathDate: "2000-01-01" };
    expect(hauntedGroups(person({ ...dates, Father: 0, Mother: 0 }), YEAR)).toEqual(["headless"]);
    expect(hauntedGroups(person({ ...dates, Father: 0, Mother: 7 }), YEAR)).toEqual([]);
    expect(hauntedGroups(person({ ...dates, Father: null, Mother: null }), YEAR)).toEqual([]);
    expect(hauntedGroups(person({ ...dates, Father: 0, Mother: null }), YEAR)).toEqual([]);
  });

  test("Halloween folk: born or died on 31 October", () => {
    expect(hauntedGroups(person({ BirthDate: "1950-10-31", DeathDate: "2000-01-01" }), YEAR)).toEqual(["halloween"]);
    expect(hauntedGroups(person({ BirthDate: "1950-01-01", DeathDate: "2000-10-31" }), YEAR)).toEqual(["halloween"]);
    expect(hauntedGroups(person({ BirthDate: "1950-10-30", DeathDate: "2000-01-01" }), YEAR)).toEqual([]);
  });

  test("one person can be in several groups", () => {
    expect(
      hauntedGroups(person({ ...blankDates, Father: 0, Mother: 0, Templates: [{ name: "Unsourced" }] }), YEAR)
    ).toEqual(["ghost", "skeleton", "headless"]);
  });
});

describe("slimPerson", () => {
  test("keeps the name, a short lifespan and the degree", () => {
    expect(
      slimPerson(
        {
          Id: 3,
          Name: "Doe-3",
          LongName: "John Doe",
          BirthDate: "1850-00-00",
          DeathDateDecade: "unknown",
          Meta: { Degrees: 4 },
        },
        ["undead"]
      )
    ).toEqual({
      Id: 3,
      Name: "Doe-3",
      LongName: "John Doe",
      years: "1850–?",
      Degrees: 4,
      groups: ["undead"],
    });
    expect(slimPerson({ Id: 3, Name: "Doe-3", ...blankDates }, ["ghost"]).years).toBe("");
    expect(slimPerson({ Id: 3, Name: "Doe-3", BirthDateDecade: "1900s", DeathDateDecade: "unknown" }, []).years).toBe(
      "1900s–?"
    );
  });
});

describe("re-check and rescan", () => {
  const undead = {
    Id: 10,
    Name: "Old-10",
    BirthDate: "1850-00-00",
    DeathDate: "0000-00-00",
    DeathDateDecade: "unknown",
    Father: 1,
    Mother: 2,
    Templates: [],
  };
  const ghost = { Id: 11, Name: "Ghost-11", ...blankDates, Father: 1, Mother: 2, Templates: [] };
  const previous = [slimPerson(undead, ["undead"], 3), slimPerson(ghost, ["ghost"], 5)];

  test("a fixed profile is laid to rest; one still haunted stays, keeping its degree", () => {
    const fixed = { ...undead, DeathDate: "1920-05-01", DeathDateDecade: "1920s" };
    const { people, rested } = recheckHaunted(previous, [fixed, ghost], YEAR);
    expect(people.map((p) => p.Id)).toEqual([11]);
    expect(people[0].Degrees).toBe(5);
    expect(rested.map((p) => p.Id)).toEqual([10]);
  });

  test("a deleted profile just drops off; a merged one is followed to its new Id", () => {
    const mergedInto = { ...undead, Id: 99, Name: "Old-99", redirectedFrom: 10 };
    const { people, rested } = recheckHaunted(previous, [mergedInto], YEAR);
    expect(people.map((p) => p.Id)).toEqual([99]);
    expect(rested).toEqual([]);
  });

  test("going from undead to Halloween folk only still counts as laid to rest", () => {
    const fixed = { ...undead, DeathDate: "1920-10-31", DeathDateDecade: "1920s" };
    const { people, rested } = recheckHaunted([previous[0]], [fixed], YEAR);
    expect(people[0].groups).toEqual(["halloween"]);
    expect(rested.map((p) => p.Id)).toEqual([10]);
  });

  test("going from undead to headless is still haunted", () => {
    const fixed = { ...undead, DeathDate: "1920-05-01", DeathDateDecade: "1920s", Father: 0, Mother: 0 };
    const { people, rested } = recheckHaunted([previous[0]], [fixed], YEAR);
    expect(people[0].groups).toEqual(["headless"]);
    expect(rested).toEqual([]);
  });

  test("a full rescan finds new haunted people and who was put right", () => {
    const newcomer = {
      Id: 12,
      Name: "New-12",
      ...blankDates,
      Father: 1,
      Mother: 2,
      Templates: [],
      Meta: { Degrees: 7 },
    };
    const fixed = {
      ...ghost,
      BirthDate: "1900-01-01",
      BirthDateDecade: "1900s",
      DeathDate: "1950-01-01",
      DeathDateDecade: "1950s",
    };
    const { people, rested } = rescanHaunted(previous, [undead, fixed, newcomer], YEAR);
    expect(people.map((p) => p.Id)).toEqual([10, 12]);
    expect(rested.map((p) => p.Id)).toEqual([11]);
  });

  test("the laid-to-rest list keeps each person once and drops anyone haunted again", () => {
    const a = { Id: 1, groups: ["undead"] };
    const b = { Id: 2, groups: ["ghost"] };
    expect(mergeLaidToRest([a], [a, b], []).map((p) => p.Id)).toEqual([1, 2]);
    expect(mergeLaidToRest([a, b], [], [{ Id: 2, groups: ["ghost"] }]).map((p) => p.Id)).toEqual([1]);
    expect(mergeLaidToRest([a, b], [], [{ Id: 2, groups: ["headless"] }]).map((p) => p.Id)).toEqual([1]);
    expect(mergeLaidToRest([a, b], [], [{ Id: 2, groups: ["halloween"] }]).map((p) => p.Id)).toEqual([1, 2]);
  });
});

describe("sortPeople and summarize", () => {
  test("closest first, then by name, unknown degrees last", () => {
    const people = [
      { Id: 1, LongName: "Zed", Degrees: 2, groups: [] },
      { Id: 2, LongName: "Amy", Degrees: null, groups: [] },
      { Id: 3, LongName: "Bob", Degrees: 2, groups: [] },
      { Id: 4, LongName: "Cat", Degrees: 1, groups: [] },
    ];
    expect(sortPeople(people).map((p) => p.Id)).toEqual([4, 3, 1, 2]);
  });

  test("counts each group; only scored groups make the tree haunted", () => {
    const people = [
      { groups: ["undead", "skeleton"] },
      { groups: ["headless"] },
      { groups: ["halloween"] },
      { groups: ["ghost", "headless"] },
    ];
    const { counts, haunted, percent } = summarize(people, 400);
    expect(counts).toEqual({ undead: 1, ghost: 1, skeleton: 1, headless: 2, halloween: 1 });
    expect(haunted).toBe(3);
    expect(percent).toBe("0.8");
    expect(summarize(people, 20).percent).toBe("15");
    expect(summarize([], 0).percent).toBe("0");
  });
});

describe("profile links", () => {
  test("finds the WikiTree ID in a profile link", () => {
    expect(wikiTreeIdFromHref("/wiki/Teece-273")).toBe("Teece-273");
    expect(wikiTreeIdFromHref("https://www.wikitree.com/wiki/Beacall-6")).toBe("Beacall-6");
    expect(wikiTreeIdFromHref("/wiki/M%C3%BCller-12")).toBe("Müller-12");
    expect(wikiTreeIdFromHref("/wiki/De_La_Cruz-5")).toBe("De_La_Cruz-5");
  });

  test("ignores links that aren't to profiles", () => {
    expect(wikiTreeIdFromHref("/wiki/Space:Haunted-1")).toBeNull();
    expect(wikiTreeIdFromHref("/wiki/Help:Profile_Manager")).toBeNull();
    expect(wikiTreeIdFromHref("/wiki/Category:Shropshire-1")).toBeNull();
    expect(wikiTreeIdFromHref("/index.php?title=Special:EditPerson&u=33085151")).toBeNull();
    expect(wikiTreeIdFromHref("/treewidget/Teece-273/101")).toBeNull();
    expect(wikiTreeIdFromHref(undefined)).toBeNull();
  });

  test("matches a link's ID to the API's Name whatever the case and spacing", () => {
    expect(wikiTreeIdKey("De La Cruz-5")).toBe(wikiTreeIdKey("De_La_Cruz-5"));
    expect(wikiTreeIdKey("teece-273")).toBe(wikiTreeIdKey("Teece-273"));
    expect(wikiTreeIdKey(undefined)).toBe("");
  });
});

describe("readAllPages (the watchlist, live 2026-10-19: 9,174 profiles, getWatchlist pages of 1,000)", () => {
  // A fake list of `total` people, read a page at a time; it notes how many pages were being read at once
  function fakeList(total) {
    const calls = [];
    let reading = 0;
    let most = 0;
    const getPage = async (offset) => {
      calls.push(offset);
      most = Math.max(most, ++reading);
      await new Promise((resolve) => setTimeout(resolve, 5));
      reading--;
      const people = [];
      for (let id = offset + 1; id <= Math.min(total, offset + 10); id++) people.push({ Id: id });
      return { people, total };
    };
    return { getPage, calls, most: () => most };
  }

  test("reads every page, three at a time after the first, and keeps the list's order", async () => {
    const list = fakeList(95);
    const progress = [];
    const people = await readAllPages(list.getPage, 10, (read, total) => progress.push([read, total]));
    expect(people.map((p) => p.Id)).toEqual(Array.from({ length: 95 }, (_, i) => i + 1));
    expect(list.calls.sort((a, b) => a - b)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(list.most()).toBe(3);
    expect(progress[0]).toEqual([10, 95]);
    expect(progress[progress.length - 1]).toEqual([95, 95]);
  });

  test("one short page is the whole list", async () => {
    const list = fakeList(4);
    expect((await readAllPages(list.getPage, 10)).length).toBe(4);
    expect(list.calls).toEqual([0]);
  });

  test("someone in two pages (the list changed while it was read) is kept once", async () => {
    const getPage = async (offset) => ({ people: offset ? [{ Id: 2 }, { Id: 3 }] : [{ Id: 1 }, { Id: 2 }], total: 4 });
    expect((await readAllPages(getPage, 2)).map((p) => p.Id)).toEqual([1, 2, 3]);
  });

  test("a page that fails fails the read", async () => {
    const getPage = async (offset) => {
      if (offset) throw new Error("The WikiTree API said: busy");
      return { people: [{ Id: 1 }, { Id: 2 }], total: 6 };
    };
    await expect(readAllPages(getPage, 2)).rejects.toThrow("busy");
  });
});

describe("project accounts (WikiTree-N)", () => {
  test("are never haunted, whatever their profile lacks", () => {
    const account = { Name: "WikiTree-11", ...blankDates, Father: 0, Mother: 0, Templates: [{ name: "Unsourced" }] };
    expect(isProjectAccount(account)).toBe(true);
    expect(hauntedGroups(account, YEAR)).toEqual([]);
    expect(isProjectAccount({ Name: "WikiTree-123" })).toBe(true);
  });

  test("only the WikiTree-number IDs", () => {
    for (const Name of ["WikiTreeson-5", "Smith-WikiTree-1", "WikiTree-", "Beacall-6", undefined]) {
      expect(isProjectAccount({ Name })).toBe(false);
    }
  });
});
