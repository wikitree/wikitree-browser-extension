import { parseLifespansPrompt, buildLifespanRows, aliveByYear, lifespanStats, buildLifespansSummary, ancestorWord, buildDescendantLifespanRows, descendantGenerationLabel } from "./chat_lifespans_data";

const person = (name, birth, death, gender = "Male") => ({ name, wtid: `${name}-1`, birth, death, gender });

function slots() {
  const s = new Array(16).fill(null);
  s[1] = person("Ann", "1900-01-01", "1980-01-01", "Female");
  s[2] = person("Bob", "1870-01-01", "1950-01-01");
  s[3] = person("Cat", "1875-01-01", "1905-01-01", "Female");
  s[4] = person("Dan", "1840-01-01", "1930-01-01");
  s[5] = person("Eve", "1845-01-01", "", "Female");
  s[7] = person("Gil", "", "1890-01-01");
  return s;
}

describe("parseLifespansPrompt", () => {
  test.each([
    ["lifespans", ""],
    ["Lifespan chart", ""],
    ["show my ancestors' lifespans", "my"],
    ["Cook-8721's ancestor lifespans", "Cook-8721"],
    ["lifespans of her ancestors", "her"],
    ["How long did my ancestors live?", "my"],
    ["life expectancy of my ancestors", "my"],
    ["show me lifelines", ""],
    ["a lifespan chart of Cook-8721", "Cook-8721"],
    ["lifespans for him", "his"],
    ["draw Cook-8721's lifespan chart", "Cook-8721"],
  ])("%s", (prompt, owner) => {
    expect(parseLifespansPrompt(prompt)).toEqual(expect.objectContaining({ owner }));
  });

  test.each([
    ["show my descendants' lifespans", "my"],
    ["Cook-8721's descendant lifespans", "Cook-8721"],
    ["descendants lifespan chart", ""],
    ["lifespans of her descendants", "her"],
  ])("descendants: %s", (prompt, owner) => {
    expect(parseLifespansPrompt(prompt)).toEqual(expect.objectContaining({ owner, view: "descendants" }));
  });

  test.each(["how long did she live", "how long did my father live", "lifespan of Cook-8721", "show my ancestors", "how long did my descendants live"])("not %s", (prompt) => {
    expect(parseLifespansPrompt(prompt)).toBeNull();
  });
});

describe("lifespan rows and stats", () => {
  test("rows: dated people in slot order, with side and relation", () => {
    const { rows, undated } = buildLifespanRows(slots(), 2026);
    expect(undated).toBe(1);
    expect(rows.map((row) => row.name)).toEqual(["Ann", "Bob", "Cat", "Dan", "Eve"]);
    expect(rows.find((row) => row.name === "Dan")).toEqual(expect.objectContaining({ side: "father", relation: "Grandfather", age: 90, generation: 2 }));
    expect(rows.find((row) => row.name === "Cat").side).toBe("mother");
    expect(rows.find((row) => row.name === "Eve")).toEqual(expect.objectContaining({ endKnown: false, age: null, end: 1905 }));
  });

  test("ancestorWord", () => {
    expect(ancestorWord(1, "Female")).toBe("Mother");
    expect(ancestorWord(3, "Male")).toBe("Great-grandfather");
    expect(ancestorWord(5, "Female")).toBe("3x great-grandmother");
  });

  test("alive counts, peak, and who was alive at the root's birth", () => {
    const { rows } = buildLifespanRows(slots(), 2026);
    const series = aliveByYear(rows.filter((row) => row.generation > 0));
    expect(series.find((point) => point.year === 1880).count).toBe(3); // Bob, Cat, Dan (Eve's death unknown)
    const stats = lifespanStats(rows);
    expect(stats.longest.name).toBe("Dan");
    expect(stats.shortest.name).toBe("Cat");
    expect(stats.peak).toEqual({ year: 1875, count: 3 });
    expect(stats.atRootBirth.count).toBe(3);
    expect(stats.atRootBirth.oldest.name).toBe("Dan");
    expect(stats.byCentury).toEqual([{ century: 1800, average: 67, count: 3 }]);
  });

  test("summary", () => {
    const { rows, undated } = buildLifespanRows(slots(), 2026);
    const text = buildLifespansSummary(rows, "Ann's", undated);
    expect(text).toMatch(/lived 67 years on average \(3 with both dates\)/);
    expect(text).toMatch(/Longest-lived: Dan, grandfather, 90 \(1840–1930\)/);
    expect(text).toMatch(/When Ann was born in 1900, 3 of these ancestors were alive; the eldest was Dan/);
    expect(buildLifespansSummary([], "Your", 4)).toMatch(/don't have enough/);
  });
});

describe("descendant lifespans", () => {
  const node = (name, birth, death, children = [], gender = "") => ({ person: { name, wtid: `${name}-1`, birth, death, gender }, children });
  const tree = node("Philip", "1830", "1900", [
    node("John", "1856", "1920", [node("Jack", "1885", "", [], "Male")], "Male"),
    node("Ann", "", ""),
    node("Mary", "1860", "1930", [node("Rose", "1890", "1970", [node("Ian", "1960", "", [], "Male")], "Female")], "Female"),
  ]);
  test("a band per generation, branch by branch", () => {
    const { rows, undated, branches } = buildDescendantLifespanRows(tree, 2026);
    expect(undated).toBe(1);
    expect(branches).toEqual(["John", "Ann", "Mary"]);
    expect(rows.map((row) => `${row.name}:${row.generation}:${row.branch}:${row.group || "-"}`)).toEqual([
      "Philip:0:-1:-",
      "John:1:0:Children",
      "Mary:1:2:Children",
      "Jack:2:0:Grandchildren",
      "Rose:2:2:Grandchildren",
      "Ian:3:2:Great-grandchildren",
    ]);
    expect(rows.find((row) => row.name === "Ian")).toMatchObject({ living: true, end: 2026, relation: "Great-grandson" });
    expect(rows.find((row) => row.name === "Jack")).toMatchObject({ living: false, endKnown: false, end: 1945 });
    expect(descendantGenerationLabel(5)).toBe("3x great-grandchildren");
  });
});
