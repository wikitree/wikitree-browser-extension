import { fullWikiTreeName } from "./chat_fan_chart_data";
import { buildOriginsSeries, buildSurnameRiver, describeOriginsShift, describeSurnameRiver, generationName, OTHER_COUNTRIES, OTHER_SURNAMES } from "./chat_origins_data";

const row = (degrees, birthLocation, birth = "") => ({ degrees, birthLocation, birth });

describe("buildOriginsSeries", () => {
  const rows = [
    row(1, "Nelson, New Zealand", "1900-01-01"),
    row(1, "Kent, England", "1904-00-00"),
    row(2, "Kent, England, United Kingdom", "1870"),
    row(2, "Cork, Ireland"),
    row(2, ""),
    row(2, "Bavaria, Germany"),
    row(3, "Sussex, England"),
    row(3, "Paris, France"),
    row(4, ""),
  ];

  test("counts by generation, top countries plus Other, trailing unknown generation dropped", () => {
    const series = buildOriginsSeries(rows, { top: 3 });
    expect(series.keys).toEqual(["England", "France", "Germany", OTHER_COUNTRIES]);
    expect(series.generations.map((gen) => gen.generation)).toEqual([1, 2, 3]);
    expect(series.generations[0]).toMatchObject({ name: "Parents", meanYear: 1902, total: 2, unknown: 0 });
    expect(series.generations[0].counts).toEqual({ England: 1, France: 0, Germany: 0, [OTHER_COUNTRIES]: 1 });
    expect(series.generations[1].counts).toEqual({ England: 1, France: 0, Germany: 1, [OTHER_COUNTRIES]: 1 });
    expect(series.generations[1].unknown).toBe(1);
    expect(series.unknown).toBe(2);
    expect(series.known).toBe(7);
  });

  test("nothing known", () => {
    expect(buildOriginsSeries([row(1, ""), row(2, "")])).toBeNull();
  });

  test("shift sentence", () => {
    const series = buildOriginsSeries([row(1, "A, New Zealand"), row(1, "B, New Zealand"), row(3, "C, England"), row(3, "D, England"), row(3, "E, Wales")]);
    expect(describeOriginsShift(series)).toBe("Nearest generation: mostly New Zealand; 3 generations back: mostly England (67%).");
    expect(describeOriginsShift(buildOriginsSeries([row(1, "A, England"), row(2, "B, England")]))).toBe("");
  });

  test("generation names", () => {
    expect([1, 2, 3, 4, 7].map(generationName)).toEqual(["Parents", "Grandparents", "Great-grandparents", "2× great-grandparents", "5× great-grandparents"]);
  });
});

describe("surname river", () => {
  const person = (id, lnab, birth = "") => ({ id, wtid: `${lnab}-${id}`, lnab, birth });
  // Root, parents Smith/Jones, grandparents Smith/Brown/Jones/Unknown, the Smith father again in slot 8 (collapse).
  const slots = [null, person(1, "Smith"), person(2, "Smith", "1900"), person(3, "Jones", "1902"), person(4, "Smith", "1870"), person(5, "Brown", "1872"), person(6, "Jones"), person(7, "Unknown"), person(4, "Smith"), person(4, "Smith")];
  test("counts surnames at birth per generation, each ancestor once per generation", () => {
    const series = buildSurnameRiver(slots);
    expect(series.otherKey).toBe(OTHER_SURNAMES);
    expect(series.totals).toEqual([["Smith", 3], ["Jones", 2], ["Brown", 1]]);
    expect(series.generations.map((gen) => [gen.generation, gen.counts.Smith, gen.unknown])).toEqual([
      [1, 1, 0],
      [2, 1, 1],
      [3, 1, 0],
    ]);
  });
  test("the rest go into Rarer surnames, named per generation", () => {
    const series = buildSurnameRiver(slots, { top: 1 });
    expect(series.keys).toEqual(["Smith", OTHER_SURNAMES]);
    expect(series.generations[1].counts[OTHER_SURNAMES]).toBe(2);
    expect(series.generations[1].otherNames).toEqual([["Brown", 1], ["Jones", 1]]);
  });
  test("each band knows its people, oldest first", () => {
    const series = buildSurnameRiver(slots);
    expect(series.generations[1].people.Smith).toEqual([{ name: "Smith-4", wtid: "Smith-4", year: 1870 }]);
    expect(series.generations[0].people.Jones).toEqual([{ name: "Jones-3", wtid: "Jones-3", year: 1902 }]);
  });
  test("summary", () => {
    const text = describeSurnameRiver(buildSurnameRiver(slots), "Your");
    expect(text).toMatch(/^3 surnames run through your 6 ancestors over 3 generations\. The biggest streams: Smith \(3, from parents\), Jones \(2, from parents\), Brown \(1, from grandparents\)\./);
    expect(describeSurnameRiver(null, "Philip's")).toBe("Philip's ancestors have no surnames recorded on WikiTree yet.");
  });
  test("by default every country has its own band, with no Other", () => {
    const many = ["England", "France", "Germany", "Ireland", "Italy", "Spain", "Poland", "Norway", "Sweden", "Japan"];
    const series = buildOriginsSeries(many.map((country, index) => row(1 + (index % 3), `Somewhere, ${country}`)));
    expect(series.keys.slice().sort()).toEqual(many.slice().sort());
    expect(series.keys).not.toContain(OTHER_COUNTRIES);
    expect(series.generations.every((gen) => gen.otherNames.length === 0)).toBe(true);
  });
  test("countries still work with the default keys", () => {
    expect(buildOriginsSeries([row(1, "London, England")]).otherKey).toBe(OTHER_COUNTRIES);
  });
});

describe("fullWikiTreeName", () => {
  test.each([
    [{ FirstName: "Phebe", MiddleName: "", LastNameAtBirth: "Lord", LastNameCurrent: "Milliken" }, "Phebe (Lord) Milliken"],
    [{ FirstName: "Mary", MiddleName: "Ellen", LastNameAtBirth: "Urquhart", LastNameCurrent: "Maloney" }, "Mary Ellen (Urquhart) Maloney"],
    [{ FirstName: "Lemuel", MiddleName: "", LastNameAtBirth: "Milliken", LastNameCurrent: "Milliken" }, "Lemuel Milliken"],
    [{ FirstName: "John", LastNameAtBirth: "Smith" }, "John Smith"],
    [{ RealName: "Ann", LastNameAtBirth: "X" }, ""],
  ])("%j → %s", (person, expected) => {
    expect(fullWikiTreeName(person)).toBe(expected);
  });
});
