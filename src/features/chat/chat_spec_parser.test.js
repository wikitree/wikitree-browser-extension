import { parseSearchSpecPrompt } from "./chat_spec_parser";

const spec = (prompt) => parseSearchSpecPrompt(prompt)?.spec;

describe("parseSearchSpecPrompt (searches read without AI)", () => {
  test("a surname with an event, a place and a bound", () => {
    expect(spec("Smith born in Kent before 1800")).toEqual({
      names: { lastNameAtBirth: "Smith" },
      places: [{ text: "Kent", event: "birth" }],
      dates: [{ event: "birth", to: 1799 }],
    });
  });

  test("a first and last name, the year before the place", () => {
    expect(spec("John Smith born 1820 in Ohio")).toEqual({
      names: { firstName: "John", lastNameAtBirth: "Smith" },
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
      names: { lastNameAtBirth: "Beacall" },
      places: [{ text: "Kent", event: "birth" }],
      flags: ["NoFather"],
    });
  });

  test("place names with 'and' inside stay whole", () => {
    expect(spec("Smith born in Trinidad and Tobago before 1900")).toEqual({
      names: { lastNameAtBirth: "Smith" },
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
      names: { lastNameAtBirth: "Smith" },
      places: [{ text: "Ohio", event: "birth" }],
      created: { from: 2023, to: 2023 },
    });
    // (a bare "Kent created in 2023" could be a surname or a place: declined)
    expect(parseSearchSpecPrompt("Kent profiles created in 2023")).toBeNull();
    expect(read("born in Kent created before 2015").created).toEqual({ to: 2014 });
    expect(read("born in Kent, created after 2015").created).toEqual({ from: 2016 });
    expect(read("born in Kent created in or before 2015").created).toEqual({ to: 2015 });
    expect(read("born in Kent created in 2023 or 2024").created).toEqual({ years: [2023, 2024] });
  });
  test("created alone, or twice, declines", () => {
    expect(parseSearchSpecPrompt("profiles created in 2023")).toBeNull();
    expect(parseSearchSpecPrompt("born in Kent created in 2023 created in 2024")).toBeNull();
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
      names: { firstName: "Mary", lastNameAtBirth: "Smith" },
      places: [{ text: "Ohio", event: "birth" }],
      dates: [{ event: "birth", from: 1820, to: 1820 }],
    });
    expect(parseSearchSpecPrompt("Kent 1820 Ohio")).toBeNull();
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
      names: { lastNameAtBirth: "Beacall" },
      categories: [{ name: "Emigrants", match: "word" }],
    });
    expect(read("immigrants born in Kent").categories).toEqual([{ name: "Immigrants", match: "word" }]);
  });
});
