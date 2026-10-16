import { parseSearchSpecPrompt } from "./chat_spec_parser";

const spec = (prompt) => parseSearchSpecPrompt(prompt)?.spec;

describe("parseSearchSpecPrompt (searches read without AI)", () => {
  test("a surname with an event, a place and a bound", () => {
    expect(spec("Smith born in Kent before 1800")).toEqual({
      names: { anyLastName: "Smith" },
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", to: 1799 }],
    });
  });

  test("a first and last name, the year before the place", () => {
    expect(spec("John Smith born 1820 in Ohio")).toEqual({
      names: { firstName: "John", anyLastName: "Smith" },
      places: [{ text: "Ohio", event: "birth" }],
      dates: [{ event: "birth", from: 1820, to: 1820 }],
    });
  });

  test("a place before 'births' or 'deaths', and post-/pre- years", () => {
    expect(spec("Devon births post-1850")).toEqual({
      places: [{ text: "Devon", event: "birth" }],
      dates: [{ event: "birth", from: 1851 }],
    });
    expect(spec("Kent births 1850-1860")).toEqual({
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", from: 1850, to: 1860 }],
    });
    expect(spec("Liverpool deaths pre 1900")).toEqual({
      places: [{ text: "Liverpool", event: "death" }],
      dates: [{ event: "death", to: 1899 }],
    });
  });

  test("the year belongs to the nearest event word", () => {
    expect(spec("born in Ohio died in Texas 1900-1950")).toEqual({
      places: [
        { text: "Ohio", event: "birth" },
        { text: "Texas", event: "death" },
      ],
      dates: [{ event: "death", from: 1900, to: 1950 }],
    });
  });

  test("a question lead-in is just a way to ask", () => {
    expect(spec("Who was born in Devon in 1820?")).toEqual({
      places: [{ text: "Devon", event: "birth" }],
      dates: [{ event: "birth", from: 1820, to: 1820 }],
    });
    expect(spec("Which people died in Cork in the 1850s?")).toEqual({
      places: [{ text: "Cork", event: "death" }],
      dates: [{ event: "death", from: 1850, to: 1859 }],
    });
  });

  test("gender, status words and centuries", () => {
    expect(spec("women born in Cork 1840-1850")).toEqual({
      places: [{ text: "Cork", event: "birth" }],
      dates: [{ event: "birth", from: 1840, to: 1850 }],
      gender: "female",
    });
    expect(spec("unsourced profiles born in Ohio in the 19th century")).toEqual({
      places: [{ text: "Ohio", event: "birth" }],
      dates: [{ event: "birth", from: 1800, to: 1899 }],
      flags: ["Unsourced"],
    });
    expect(spec("Beacall with no father")).toBeUndefined(); // a surname or a place?
    expect(spec("Kent in 1820s")).toBeUndefined();
    expect(spec("Beacall born in Kent with no father")).toEqual({
      names: { anyLastName: "Beacall" },
      places: [{ text: "Kent", event: "birth" }],
      flags: ["NoFather"],
    });
  });

  test("place names with 'and' inside stay whole", () => {
    expect(spec("Smith born in Trinidad and Tobago before 1900")).toEqual({
      names: { anyLastName: "Smith" },
      places: [{ text: "Trinidad and Tobago", event: "birth" }],
      dates: [{ event: "birth", to: 1899 }],
    });
  });

  test("it says how it read the sentence", () => {
    expect(parseSearchSpecPrompt("John Smith born 1820 in Ohio").understood).toBe("John Smith, born in Ohio 1820");
    expect(parseSearchSpecPrompt("Devon births post-1850").understood).toBe("born in Devon 1851 or later");
  });

  test("it declines what it can't place", () => {
    expect(spec("Kent 1820s")).toBeUndefined(); // a surname or a place?
    expect(spec("Stevenson 1850-1899 Scotland")).toBeUndefined(); // no event word: the general parser's
    expect(spec("born in Devon in the 1800s")).toBeUndefined(); // a century or a decade?
    expect(spec("born in Devon with a banjo")).toBeUndefined(); // a word it doesn't know
    expect(spec("most common surnames in Shropshire")).toBeUndefined();
    expect(spec("women and men born in Kent")).toBeUndefined();
    expect(spec("born in Kent twice in 1820")).toBeUndefined();
    expect(spec("")).toBeUndefined();
  });
});

describe("parseSearchSpecPrompt created phrases", () => {
  const read = (prompt) => parseSearchSpecPrompt(prompt)?.spec;
  test("created years beside a name or place", () => {
    expect(read("Smith born in Ohio created in 2023")).toEqual({
      names: { anyLastName: "Smith" },
      places: [{ text: "Ohio", event: "birth" }],
      created: { from: 2023, to: 2023 },
    });
    // (a bare "Kent created in 2023" could be a surname or a place: it runs as the place, and the reply
    // offers the surname instead when WikiTree+ has profiles that way; the user, 2026-10-12)
    expect(read("Kent profiles created in 2023")).toEqual({
      places: [{ text: "Kent", event: "any" }],
      created: { from: 2023, to: 2023 },
    });
    expect(read("Lancashire profiles with no death date born before 1850")).toEqual({
      places: [{ text: "Lancashire", event: "any" }],
      dates: [{ event: "birth", to: 1849 }],
      missingDates: ["death"],
    });
    expect(read("born in Kent created before 2015").created).toEqual({ to: 2014 });
    expect(read("born in Kent, created after 2015").created).toEqual({ from: 2016 });
    expect(read("born in Kent created in or before 2015").created).toEqual({ to: 2015 });
    expect(read("born in Kent created in 2023 or 2024").created).toEqual({ years: [2023, 2024] });
  });
  test("created alone, or twice, declines", () => {
    expect(parseSearchSpecPrompt("profiles created in 2023")).toBeNull();
    expect(parseSearchSpecPrompt("born in Kent created in 2023 created in 2024")).toBeNull();
  });
  // (review of the place-or-surname change, 2026-10-12)
  test("a family named after a place is a surname", () => {
    expect(read("the Kent family profiles born before 1800")).toEqual({
      names: { anyLastName: "Kent" },
      dates: [{ event: "birth", to: 1799 }],
    });
    expect(read("Kent family profiles born before 1800")?.names).toEqual({ anyLastName: "Kent" });
    expect(read("the Kent family born in Ohio")).toEqual({
      names: { anyLastName: "Kent" },
      places: [{ text: "Ohio", event: "birth" }],
    });
    // ("families" could be families in Kent)
    expect(parseSearchSpecPrompt("Kent families")).toBeNull();
    expect(parseSearchSpecPrompt("the Netherlands")).toBeNull();
  });
  test("a place word managed by me or beside a nationality stays a surname", () => {
    expect(read("Kent profiles managed by me born 1850")).toEqual({
      names: { anyLastName: "Kent" },
      dates: [{ event: "birth", from: 1850, to: 1850 }],
      manager: "me",
    });
    for (const prompt of ["Kent profiles English", "English Kent profiles"]) {
      expect(read(prompt)).toEqual({ names: { anyLastName: "Kent" }, places: [{ text: "England", event: "birth" }] });
    }
    expect(parseSearchSpecPrompt("Kent profiles born in Ohio")).toBeNull();
  });
  test.each(["Lancashire-born people with no death date", "Kent-born profiles unsourced", "Kent-area profiles unsourced"])(
    "a hyphened place word isn't a surname: %s",
    (prompt) => {
      expect(parseSearchSpecPrompt(prompt)).toBeNull();
    }
  );
  test("a double-barrelled surname still is one", () => {
    expect(read("Smith-Jones profiles with no sources")).toEqual({ names: { anyLastName: "Smith-Jones" }, flags: ["Unsourced"] });
  });
});

describe("parseSearchSpecPrompt occupations, migration and bare-year names", () => {
  const read = (prompt) => parseSearchSpecPrompt(prompt)?.spec;
  test("occupation words become category alternatives", () => {
    const spec = read("Kent farmers 1850s");
    expect(spec.places).toEqual([{ text: "Kent", event: "any" }]);
    expect(spec.dates).toEqual([{ event: "birth", from: 1850, to: 1859 }]);
    expect(spec.anyOf.map((alternative) => alternative.categories[0].name)).toEqual(["Farmers", "Yeomen", "Husbandmen"]);
    expect(read("sailors born in Devon").anyOf).toHaveLength(3);
  });
  test("groups WikiTree categorises: twins, triplets, centenarians, convicts", () => {
    const spec = read("twins born in Lancashire");
    expect(spec.places).toEqual([{ text: "Lancashire", event: "birth" }]);
    expect(JSON.stringify(spec)).toContain('"Twins"');
    expect(JSON.stringify(read("Devon centenarians"))).toContain('"Centenarians"');
    expect(JSON.stringify(read("convicts who died in Tasmania"))).toContain('"Convicts"');
    expect(parseSearchSpecPrompt("twins convicts in Kent")).toBeNull();
  });
  test("Research Status and Bio Check words", () => {
    const flags = (prompt) => read(prompt)?.flags;
    expect(flags("gold standard profiles in Devon")).toEqual(["ResearchGold"]);
    expect(flags("gold standard candidates in Devon")).toEqual(["ResearchGoldCandidate"]);
    expect(flags("silver standard profiles in Devon")).toEqual(["ResearchSilver"]);
    expect(flags("profiles in Devon with help requested")).toEqual(["ResearchHelp"]);
    expect(flags("profiles I manage with sources to review")).toEqual(["ResearchReview"]);
    expect(flags("unfinished profiles in Kent")).toEqual(["ResearchUnfinished"]);
    expect(flags("profiles in Kent with no research status")).toEqual(["ResearchUnset"]);
    expect(flags("profiles in Kent with style issues")).toEqual(["BioStyleIssues"]);
    expect(flags("profiles I manage with bio check problems")).toEqual(["BioStyleIssues"]);
    expect(read("profiles I manage that are gold standard candidates").manager).toBe("me");
  });
  test("emigrated to / from a place", () => {
    const spec = read("Beacall emigrated to Australia born in Kent");
    expect(spec.places).toEqual([
      { text: "Kent", event: "birth" },
      { text: "Australia", event: "death" },
    ]);
    expect(spec.notPlaces).toEqual([{ text: "Australia", event: "birth" }]);
    expect(read("emigrants from Ireland died 1900-1950").notPlaces).toEqual([{ text: "Ireland", event: "death" }]);
    // no destination: declined
    expect(parseSearchSpecPrompt("women named Stevenson born in Scotland 1850-1899 who emigrated")).toBeNull();
  });
  test("first and last name, a bare year, then a place", () => {
    const parsed = parseSearchSpecPrompt("Mary Smith 1820 Ohio");
    expect(parsed.spec).toEqual({
      names: { firstName: "Mary", anyLastName: "Smith" },
      places: [{ text: "Ohio", event: "birth" }],
      dates: [{ event: "birth", from: 1820, to: 1820 }],
    });
    expect(parseSearchSpecPrompt("Kent 1820 Ohio")).toBeNull();
  });
  test("a word before a job, beside 'in' another place, declines unless it's a known place", () => {
    // (it ran Location=Methodist, sweep 2026-10-12)
    expect(parseSearchSpecPrompt("Methodist ministers in Cornwall")).toBeNull();
    expect(parseSearchSpecPrompt("Quaker farmers in Pennsylvania")).toBeNull();
    expect(read("Kent farmers in Ohio").places).toEqual([
      { text: "Kent", event: "any" },
      { text: "Ohio", event: "any" },
    ]);
    expect(read("Plymouth sailors born in Devon").places).toEqual([
      { text: "Plymouth", event: "any" },
      { text: "Devon", event: "birth" },
    ]);
    expect(read("Boston doctors").places).toEqual([{ text: "Boston", event: "any" }]);
  });
});

describe("parseSearchSpecPrompt nationalities and bare emigrants", () => {
  const read = (prompt) => parseSearchSpecPrompt(prompt)?.spec;
  test("a nationality is read as born in that country", () => {
    expect(read("Irish farmers").places).toEqual([{ text: "Ireland", event: "birth" }]);
    expect(read("Scottish emigrants to Canada")).toEqual({
      places: [
        { text: "Scotland", event: "birth" },
        { text: "Canada", event: "death" },
      ],
    });
    expect(parseSearchSpecPrompt("Irish farmers").understood).toContain("Irish read as born in Ireland");
  });
  test("a nationality alone, twice, or against a birth place declines", () => {
    expect(parseSearchSpecPrompt("Irish")).toBeNull();
    expect(parseSearchSpecPrompt("Irish Scottish farmers")).toBeNull();
    expect(parseSearchSpecPrompt("Irish farmers born in Kent")).toBeNull();
    expect(parseSearchSpecPrompt("Martian farmers")).toBeNull();
    expect(read("Hungarian farmers").places).toEqual([{ text: "Hungary", event: "birth" }]);
    expect(read("Japanese emigrants to Brazil").places).toEqual([
      { text: "Japan", event: "birth" },
      { text: "Brazil", event: "death" },
    ]);
  });
  test("emigrants with no destination search WikiTree's Emigrants category", () => {
    expect(read("Beacall emigrants")).toEqual({
      names: { anyLastName: "Beacall" },
      categories: [{ name: "Emigrants", match: "word" }],
    });
    expect(read("immigrants born in Kent").categories).toEqual([{ name: "Immigrants", match: "word" }]);
  });
});

// "profiles I manage" = manager "me"; the search puts in the signed-in user's ID (2026-10-10).
test.each([
  ["profiles I manage with no sources", { manager: "me", flags: ["Unsourced"] }],
  ["unsourced profiles that I manage", { manager: "me", flags: ["Unsourced"] }],
  ["profiles managed by me born before 1800", { manager: "me", dates: [{ event: "birth", to: 1799 }] }],
  ["my managed profiles with no parents", { manager: "me", flags: ["NoParents"] }],
])("managed by me: %s", (prompt, expected) => {
  expect(parseSearchSpecPrompt(prompt)?.spec).toEqual(expected);
  expect(parseSearchSpecPrompt(prompt)?.understood).toContain("managed by you");
});
test.each(["my profiles with no sources", "profiles I managed to find"])("not managed by me: %s", (prompt) => {
  expect(parseSearchSpecPrompt(prompt)?.spec?.manager).toBeUndefined();

});

// "managed by <WikiTree ID or project>": the ID, or the project's account (Mayflower Project: WikiTree-9); the
// words after it are read as usual. It ran Manager="the Mayflower Project with no sources" (sweep, 2026-10-12).
test.each([
  ["profiles managed by the Mayflower Project with no sources", { manager: "WikiTree-9", flags: ["Unsourced"] }],
  ["profiles managed by the Mayflower Project that are unsourced", { manager: "WikiTree-9", flags: ["Unsourced"] }],
  ["unsourced profiles managed by the mayflower project", { manager: "WikiTree-9", flags: ["Unsourced"] }],
  ["profiles managed by the Mayflower Project", { manager: "WikiTree-9" }],
  ["profiles managed by Smith-123 with no sources", { manager: "Smith-123", flags: ["Unsourced"] }],
  ["profiles managed by the England Project born in Devon", { manager: "WikiTree-57", places: [{ text: "Devon", event: "birth" }] }],
  ["Devon profiles managed by the England Project", { manager: "WikiTree-57", places: [{ text: "Devon", event: "any" }] }],
  ["profiles managed by Me-1", { manager: "Me-1" }],
])("managed by someone: %s", (prompt, expected) => {
  expect(spec(prompt)).toEqual(expected);
});
test("the reading names the project and its account", () => {
  expect(parseSearchSpecPrompt("profiles managed by the Mayflower Project with no sources")?.understood).toBe(
    "managed by the Mayflower Project (WikiTree-9), no sources"
  );
});
// (WT+'s Manager= takes only an ID: a name it can't place is the general parser's, or the AI's, to read)
test.each([
  "profiles managed by the Foo Bar Project with no sources",
  "profiles managed by John Smith",
  "profiles managed only by the England Project",
])("a manager it can't place declines: %s", (prompt) => {
  expect(spec(prompt)).toBeUndefined();
});

describe("more ways of saying it (2026-10-10)", () => {
  test("a known place before 'profiles' or a status word is a place, an unknown word a surname", () => {
    expect(spec("Devon profiles with no sources")).toEqual({ places: [{ text: "Devon", event: "any" }], flags: ["Unsourced"] });
    expect(spec("unsourced Devon profiles")).toEqual({ places: [{ text: "Devon", event: "any" }], flags: ["Unsourced"] });
    expect(spec("Kent profiles without a father")?.places).toEqual([{ text: "Kent", event: "any" }]);
    expect(spec("Kent people")).toEqual({ places: [{ text: "Kent", event: "any" }] });
    expect(spec("Garver profiles")).toBeUndefined();
    expect(spec("Devon")).toBeUndefined();
  });

  test("anyone, everyone, family and 'of' a place", () => {
    expect(spec("anyone born in Kent in 1850")).toEqual({
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", from: 1850, to: 1850 }],
    });
    expect(spec("Smith family from Kent")).toEqual({ names: { anyLastName: "Smith" }, places: [{ text: "Kent", event: "any" }] });
    expect(spec("the Beacalls of Shropshire")).toEqual({
      names: { anyLastName: "Beacalls" },
      places: [{ text: "Shropshire", event: "any" }],
    });
    expect(spec("profiles of people born in Wales")).toEqual({ places: [{ text: "Wales", event: "birth" }] });
  });

  test("'called' or 'named' needs a whole name: one word could be either name", () => {
    expect(spec("anyone called John Smith")).toEqual({ names: { firstName: "John", anyLastName: "Smith" } });
    expect(spec("everyone named Mary born in Kent")).toBeUndefined();
    expect(spec("people called Smith born in Kent")).toBeUndefined();
  });

  test("Isle of Man is one place, not 'men'", () => {
    expect(spec("born in Isle of Man")).toEqual({ places: [{ text: "Isle of Man", event: "birth" }] });
    expect(spec("born in the Isle of Wight")).toEqual({ places: [{ text: "Isle of Wight", event: "birth" }] });
    // ("in the Netherlands": the "the" goes)
    expect(spec("born in the Netherlands 1850s")).toEqual({
      places: [{ text: "Netherlands", event: "birth" }],
      dates: [{ event: "birth", from: 1850, to: 1859 }],
    });
  });

  test("went, moved, settled and left read as emigrating", () => {
    expect(spec("Smiths who moved to Ohio")).toEqual({
      names: { anyLastName: "Smiths" },
      places: [{ text: "Ohio", event: "death" }],
      notPlaces: [{ text: "Ohio", event: "birth" }],
    });
    expect(spec("people who left Ireland")).toEqual({
      places: [{ text: "Ireland", event: "birth" }],
      notPlaces: [{ text: "Ireland", event: "death" }],
    });
    expect(spec("Irish people who went to America")).toEqual({
      places: [
        { text: "Ireland", event: "birth" },
        { text: "America", event: "death" },
      ],
    });
  });

  test("a known place straight after an event and year", () => {
    expect(spec("Smith born 1850 Kent")).toEqual({
      names: { anyLastName: "Smith" },
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", from: 1850, to: 1850 }],
    });
    expect(spec("Smith born 1850 New York")?.places).toEqual([{ text: "New York", event: "birth" }]);
    expect(spec("Smith born 1850 Spring")).toBeUndefined();
  });

  test("created this year / last year", () => {
    const year = new Date().getFullYear();
    expect(spec("profiles in Kent created this year")?.created).toEqual({ from: year, to: year });
    expect(spec("born in Kent, added last year")?.created).toEqual({ from: year - 1, to: year - 1 });
  });
});

// Group 2 of the no-AI work (2026-10-14): searches and counts asked as questions.
describe("questions that are searches", () => {
  test("who else died in [place] in [year]", () => {
    expect(spec("who else died in Motueka in 1898?")).toEqual({
      places: [{ text: "Motueka", event: "death" }],
      dates: [{ event: "death", from: 1898, to: 1898 }],
    });
  });

  test("how many: the count's words go, the search stays", () => {
    expect(spec("how many profiles have the surname Alley?")).toEqual({ names: { anyLastName: "Alley" } });
    expect(spec("How many people are there with the surname Alley?")).toEqual({ names: { anyLastName: "Alley" } });
    expect(spec("how many people were born in Kent in 1820?")).toEqual({
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", from: 1820, to: 1820 }],
    });
    expect(spec("how many profiles are on WikiTree?")).toBeUndefined();
  });

  test("with the surname X / surnamed X", () => {
    expect(spec("people with the surname Alley born in Nelson")).toEqual({
      names: { anyLastName: "Alley" },
      places: [{ text: "Nelson", event: "birth" }],
    });
    expect(spec("people surnamed Alley born in Nelson")?.names).toEqual({ anyLastName: "Alley" });
    expect(spec("profiles with the last name alley")).toEqual({ names: { anyLastName: "Alley" } });
    // (not a surname, or a name beside it)
    expect(spec("how many profiles have the surname born")).toBeUndefined();
    expect(spec("John with the surname Smith")).toBeUndefined();
  });

  test("profiles I created / created by an ID", () => {
    expect(spec("how many profiles have I created?")).toEqual({ creator: "me" });
    expect(spec("how many profiles did I create?")).toEqual({ creator: "me" });
    expect(spec("profiles I created in 2023")).toEqual({ created: { from: 2023, to: 2023 }, creator: "me" });
    expect(spec("profiles created by me in 2023")).toEqual({ created: { from: 2023, to: 2023 }, creator: "me" });
    expect(spec("my created profiles with no sources")).toEqual({ flags: ["Unsourced"], creator: "me" });
    expect(spec("profiles created by Beacall-6")).toEqual({ creator: "Beacall-6" });
    expect(parseSearchSpecPrompt("how many profiles have I created?").understood).toBe("created by you");
    // (a creation date alone is too wide, as before)
    expect(spec("profiles created in 2023")).toBeUndefined();
  });
});

// live, 2026-10-14: "Owner of WikiTree" ran as AllLastNames=Owner Location=WikiTree
test("WikiTree (or WT) is never a name or a place", () => {
  expect(parseSearchSpecPrompt("Owner of WikiTree")).toBeNull();
  expect(parseSearchSpecPrompt("founder of WT")).toBeNull();
});

// WT+ news (2026-08-30, 2026-09-20): Content Rank 1-10 and NotableProfile
describe("content rank and notable templates", () => {
  const spec = (prompt) => parseSearchSpecPrompt(prompt)?.spec;
  test("content rank", () => {
    expect(spec("profiles with the surname Whitten content rank 1")).toEqual({ names: { anyLastName: "Whitten" }, contentRank: 1 });
    expect(spec("Devon births with a content rank of 10")).toEqual({ places: [{ text: "Devon", event: "birth" }], contentRank: 10 });
    expect(spec("Whitten born in Kent content rank below 4")).toEqual({
      names: { anyLastName: "Whitten" },
      places: [{ text: "Kent", event: "birth" }],
      contentRank: { max: 3 },
    });
    expect(spec("surname Whitten with a low content rank")).toEqual({ names: { anyLastName: "Whitten" }, contentRank: { max: 3 } });
    expect(parseSearchSpecPrompt("surname Whitten low content rank").understood).toBe("Whitten, low content rank (1–3)");
    expect(spec("Devon births content rank below 1")).toBeUndefined();
    // (a bare word and a status could be a place or a surname, as for "Whitten unsourced")
    expect(spec("Whitten content rank 1")).toBeUndefined();
  });
  test("notable templates", () => {
    expect(spec("Shropshire births with a notable template")).toEqual({
      places: [{ text: "Shropshire", event: "birth" }],
      flags: ["NotableProfile"],
    });
  });

  // (WT video, 2026-10-16)
  describe("relatives", () => {
    test("the demo questions", () => {
      expect(spec("Which of my relatives is a member of a notable category?")).toEqual({ tree: { relativesOf: "me" }, flags: ["Notables"] });
      expect(spec("Which of Joseph's relatives emigrated to the USA?")).toEqual({
        tree: { relativesOf: "Joseph" },
        places: [{ text: "United States", event: "death" }],
        notPlaces: [{ text: "United States", event: "birth" }],
      });
    });
    test("no owner, or his/her, means the profile being viewed", () => {
      expect(spec("relatives who died in Australia")).toEqual({ tree: { relativesOf: "current" }, places: [{ text: "Australia", event: "death" }] });
      expect(spec("his relatives born in Kent").tree).toEqual({ relativesOf: "current" });
      expect(spec("notable relatives")).toEqual({ tree: { relativesOf: "current" }, flags: ["Notables"] });
    });
    test("an ID owner", () => {
      expect(spec("Darwin-15's relatives born in Kent").tree).toEqual({ relativesOf: "Darwin-15" });
    });
    test("the Notables Project is still a manager, not the flag", () => {
      expect(spec("profiles managed by the Notables Project")).toEqual({ manager: "WikiTree-11" });
    });
    test("the label says who and what relatives means", () => {
      expect(parseSearchSpecPrompt("my relatives born in Kent").understood).toMatch(/^your blood relatives \(within 7 degrees, not in-laws\)/);
    });
  });
});
