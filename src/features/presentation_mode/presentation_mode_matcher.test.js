import {
  compileFacts,
  findPrivateRanges,
  mergeRanges,
  personIdFromHref,
  personInLink,
} from "./presentation_mode_matcher";

const facts = [
  {
    id: 101,
    name: "Example-6",
    hidden: false,
    phrases: ["Ian Christopher Example", "Example, Ian Christopher"],
    tokens: ["Christopher"],
    dates: [{ y: 1969, m: 4, d: 14 }],
    places: ["Birkenhead, Cheshire, England"],
    photo: "",
    bioPrivate: true,
    publicName: "Ian C. Example",
  },
  {
    id: 102,
    name: "Van der Byl-7",
    hidden: true,
    phrases: ["Frederick John Byl", "Fred Byl"],
    tokens: ["Frederick", "Fred"],
    dates: [{ y: 1947, m: 9, d: 0 }],
    places: [],
    photo: "",
    bioPrivate: false,
    publicName: "Private",
  },
];
const compiled = compileFacts(facts);
const hidden = (text, ids) => findPrivateRanges(text, compiled, ids).map(([s, e]) => text.slice(s, e));

describe("findPrivateRanges", () => {
  test("full dates in the usual formats", () => {
    for (const date of [
      "14 Apr 1969",
      "14 April 1969",
      "14th April, 1969",
      "Apr 14, 1969",
      "April 14 1969",
      "1969-04-14",
      "14/04/1969",
      "04/14/1969",
      "14.4.1969",
      "14 Apr. 1969",
    ]) {
      expect(hidden(`Born ${date} in`)).toEqual([date]);
    }
  });

  test("leaves other dates alone", () => {
    expect(hidden("Born 15 Apr 1969, 14 Apr 1970, 114 Apr 1969, 14 Apr 19690")).toEqual([]);
  });

  test("month and year when there is no day", () => {
    expect(hidden("born Sept 1947 or September 1947, not Sep 1948")).toEqual(["Sept 1947", "September 1947"]);
  });

  test("private name phrases everywhere, but not the public form", () => {
    expect(hidden("Ian Christopher  Example and Ian C. Example")).toEqual(["Ian Christopher  Example"]);
    expect(hidden("Example, Ian Christopher (1969 - )")).toEqual(["Example, Ian Christopher"]);
  });

  test("a single word only in that person's context", () => {
    const text = "Christopher Columbus sailed from Birkenhead in 1969";
    expect(hidden(text)).toEqual([]);
    expect(hidden(text, [101])).toEqual(["Christopher", "Birkenhead", "1969"]);
  });

  test("an unlisted profile's ID, with spaces or underscores", () => {
    expect(hidden("See Van der Byl-7 and Van_der_Byl-7 but not Van der Byl-77")).toEqual([
      "Van der Byl-7",
      "Van_der_Byl-7",
    ]);
  });

  test("email addresses", () => {
    expect(hidden("Write to someone.else@example.co.uk today")).toEqual(["someone.else@example.co.uk"]);
    expect(findPrivateRanges("a@b.com", compileFacts(facts, { emails: false }))).toEqual([]);
  });

  test("in a link to a profile, only that person's names count", () => {
    const linked = (text, id) => findPrivateRanges(text, compiled, [101], id).map(([s, e]) => text.slice(s, e));
    // A link to a public ancestor who happens to share a private relative's name.
    expect(linked("Ian Christopher Example", 0)).toEqual([]);
    expect(linked("Fred Byl", 101)).toEqual([]);
    // A link to the private person themselves.
    expect(linked("Ian Christopher Example", 101)).toEqual(["Ian Christopher Example"]);
    // Their own words still count; the page's context (101 here) doesn't apply to someone else's link.
    expect(linked("Fred", 102)).toEqual(["Fred"]);
    expect(linked("Christopher", 0)).toEqual([]);
    // Dates and email addresses aren't names: hidden anyway.
    expect(linked("14 April 1969 a@b.com", 0)).toEqual(["14 April 1969", "a@b.com"]);
  });

  test("a match inside a longer word does not count", () => {
    expect(hidden("Fred Bylander", [])).toEqual([]);
    expect(hidden("Fredericks", [102])).toEqual([]);
  });
});

describe("personIdFromHref", () => {
  test("profile links in their various forms", () => {
    expect(personIdFromHref("https://www.wikitree.com/wiki/Example-6", compiled)).toBe(101);
    expect(personIdFromHref("/wiki/Van_der_Byl-7#Biography", compiled)).toBe(102);
    expect(personIdFromHref("/index.php?title=Special:EditPerson&u=101", compiled)).toBe(101);
    expect(personIdFromHref("https://apps.wikitree.com/apps/x/?id=Van%20der%20Byl-7", compiled)).toBe(102);
    expect(personIdFromHref("/wiki/Example-66", compiled)).toBeNull();
    expect(personIdFromHref("/wiki/Space:Example-6_Notes", compiled)).toBeNull();
  });
});

describe("personInLink", () => {
  test("private people, other profiles, and links that aren't to profiles", () => {
    expect(personInLink("/wiki/Example-6", null, compiled)).toBe(101);
    expect(personInLink("https://www.wikitree.com/wiki/Beacall-11", null, compiled)).toBe(0);
    expect(personInLink(null, "101", compiled)).toBe(101);
    expect(personInLink(null, "19271984", compiled)).toBe(0);
    expect(personInLink("/index.php?title=Special:EditPerson&u=555", null, compiled)).toBe(0);
    expect(personInLink("/wiki/Category:Birkenhead,_Cheshire", null, compiled)).toBeNull();
    expect(personInLink("/wiki/Space:Example-6_Notes", null, compiled)).toBeNull();
    expect(personInLink("#top", null, compiled)).toBeNull();
    expect(personInLink(null, "abc", compiled)).toBeNull();
  });
});

describe("mergeRanges", () => {
  test("overlapping and touching ranges", () => {
    expect(
      mergeRanges([
        [5, 8],
        [0, 3],
        [2, 4],
        [8, 9],
      ])
    ).toEqual([
      [0, 4],
      [5, 9],
    ]);
  });
});
