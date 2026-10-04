import { ageBetween, ageTrend, buildAgesSummary, centuryAverages, deathAgeRows, parentAgeRows, parseAgesPrompt } from "./chat_ages_data";

const person = (name, birth, death = "", gender = "") => ({ name, wtid: `${name}-1`, birth, death, gender });

describe("parseAgesPrompt", () => {
  test.each([
    ["lives and ages", "", "death"],
    ["show my ancestors' ages chart", "my", "death"],
    ["age at death chart", "", "death"],
    ["Beacall-11's life expectancy", "Beacall-11", "death"],
    ["how old were my ancestors when they had children", "my", "parent"],
    ["how old were her parents when their children were born", "her", "parent"],
    ["parents' ages chart", "", "parent"],
    ["who in my tree has impossible ages", "my", "problems"],
    ["are there any suspicious ages in his family", "his", "problems"],
  ])("%s", (prompt, owner, mode) => {
    expect(parseAgesPrompt(prompt)).toMatchObject({ owner, mode });
  });
  test.each(["how long did my ancestors live?", "how old was Philip when he died", "what ages are on this page", "ages of the children"])("%s isn't the chart", (prompt) => {
    expect(parseAgesPrompt(prompt)).toBeNull();
  });
});

describe("ages", () => {
  test("counts birthdays when the months are known", () => {
    expect(ageBetween("1823-10-04", "1889-03-01")).toEqual({ age: 65, approx: false });
    expect(ageBetween("1823-10-04", "1889-10-04")).toEqual({ age: 66, approx: false });
    expect(ageBetween("1823-00-00", "1889-00-00")).toEqual({ age: 66, approx: true });
    expect(ageBetween("", "1889-00-00")).toBeNull();
  });

  const slots = [
    null,
    person("Root", "1900-05-01", "1980-01-01", "Male"),
    person("Dad", "1850-01-01", "1899-01-01"), // child born a year after he died: fine
    person("Mum", "1891-00-00", "1960-00-00"), // a mother of 9
    person("Granddad", "1790-00-00", "1910-00-00"), // aged 120
    person("Granny", "1820-00-00", "1849-00-00"), // child born after she died
    null,
    null,
  ];

  test("death ages and their flags", () => {
    const rows = deathAgeRows(slots);
    expect(rows.map((r) => [r.name, r.age])).toEqual([
      ["Root", 79],
      ["Dad", 49],
      ["Mum", 69],
      ["Granddad", 120],
      ["Granny", 29],
    ]);
    expect(rows.find((r) => r.name === "Granddad").flag).toMatch(/Aged 120/);
    expect(rows.find((r) => r.name === "Dad").relation).toBe("Father");
  });

  test("parents' ages and their flags", () => {
    const rows = parentAgeRows(slots);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName.Dad).toMatchObject({ role: "father", age: 50, flag: "" });
    expect(byName.Mum.flag).toMatch(/mother aged 9/);
    expect(byName.Granny.flag).toMatch(/Born 1 year after the mother died/);
    expect(byName.Granddad).toMatchObject({ role: "father", age: 60, childName: "Dad" });
  });

  test("trend and century averages leave out the flagged rows", () => {
    const rows = deathAgeRows(slots);
    expect(ageTrend(rows, 100).map((b) => [b.year, b.age])).toEqual([
      [1850, 49],
      [1950, 79],
    ]);
    expect(centuryAverages(rows)).toEqual([
      { century: 1800, average: 49, count: 3 },
      { century: 1900, average: 79, count: 1 },
    ]);
  });

  test("summaries", () => {
    expect(buildAgesSummary(slots, "Root's")).toMatch(/^Root's 3 ancestors with birth and death dates lived to 49 on average\./);
    expect(buildAgesSummary(slots, "Root's")).toMatch(/Longest life: Mum \(Mum-1\), mother, 69\./);
    expect(buildAgesSummary(slots, "Root's", "parent")).toMatch(/Fathers: average 55 \(2\), youngest 50, oldest 60/);
    const problems = buildAgesSummary(slots, "Root's", "problems");
    expect(problems).toMatch(/^3 ages in Root's ancestors look wrong:/);
    expect(problems).toMatch(/- Granddad \(Granddad-1\), grandfather: Aged 120/);
  });
});
