import { buildLifeLine, buildLifeLineSummary, parseLifeLinePrompt } from "./chat_life_line_data";

const row = (role, name, birth, death, extra = {}) => ({ role, name, wtid: `${name}-1`, birth, death, relation: extra.relation || "", ...extra });
const rows = [
  row("self", "Philip", "1823-00-00", "1889-01-07", { birthLocation: "Worcestershire", deathLocation: "Ombersley" }),
  row("parent", "John", "1790-00-00", "1853-05-01", { relation: "Father" }),
  row("parent", "Elizabeth", "1798", "1820-01-01", { relation: "Mother" }),
  row("spouse", "Martha", "1825", "1880-03-03", { relation: "Wife", marriage: "1845-06-01", marriagePlace: "Droitwich" }),
  row("sibling", "Hannah", "1819", "1830", { relation: "Sister" }),
  row("sibling", "Tom", "1826", "", { relation: "Brother" }),
  row("child", "Ann", "1846", "1850", { relation: "Daughter" }),
  row("child", "Will", "1866", "", { relation: "Son" }),
  row("grandchild", "Rose", "1870", "", { parentName: "Will" }),
  row("grandchild", "Late", "1900", "", { parentName: "Will" }),
];

describe("parseLifeLinePrompt", () => {
  test.each([
    ["show my lifeline", "me"],
    ["Philip's life line", "Philip"],
    ["draw Beacall-11's life on a single line", "Beacall-11"],
    ["her life at a glance", ""],
    ["a lifeline for Beacall-11", "Beacall-11"],
    ["the life chart of Philip Beacall", "Philip Beacall"],
    ["put his life on one line", ""],
  ])("%s", (prompt, owner) => {
    expect(parseLifeLinePrompt(prompt)).toEqual({ owner, lifeLine: true });
  });
  test.each(["lifeline", "what is a lifeline", "show my family timeline", "his life"])("not %s", (prompt) => {
    expect(parseLifeLinePrompt(prompt)).toBeNull();
  });
});

describe("buildLifeLine", () => {
  const line = buildLifeLine(rows, { now: 2026 });
  test("the span and the family events inside it, in order", () => {
    expect([line.start, line.end, line.endKnown]).toEqual([1823, 1889, true]);
    expect(line.family.map((e) => [e.year, e.kind, e.age])).toEqual([
      [1820, "loss", -3],
      [1823, "birth", 0],
      [1826, "sibling", 3],
      [1830, "siblingLoss", 7],
      [1845, "marriage", 22],
      [1846, "child", 23],
      [1850, "loss", 27],
      [1853, "loss", 30],
      [1866, "child", 43],
      [1870, "grandchild", 47],
      [1880, "loss", 57],
      [1889, "death", 66],
    ]);
    expect(line.family[0]).toMatchObject({ before: true, text: "Mother Elizabeth died before Philip was born" });
  });
  test("no death year: the line runs to the last family event or 60 years", () => {
    const open = buildLifeLine([{ ...rows[0], death: "" }, ...rows.slice(1)], { now: 2026 });
    expect([open.end, open.endKnown, open.living]).toEqual([1900, false, false]);
  });
  test("no birth year → null", () => {
    expect(buildLifeLine([row("self", "X", "", "")])).toBeNull();
  });
});

describe("buildLifeLineSummary", () => {
  test("names the person and lists the milestones", () => {
    const text = buildLifeLineSummary(buildLifeLine(rows, { now: 2026 }), "Philip Beacall (Beacall-11)");
    expect(text).toMatch(/^Philip Beacall \(Beacall-11\)'s life on one line \(1823–1889, about 66 years\):/);
    expect(text).toMatch(/• Married Martha in Droitwich in 1845 \(aged 22\)\./);
    expect(text).toMatch(/• 2 children born 1846–1866, when Philip was between 23 and 43\./);
    expect(text).toMatch(/• Losses: Daughter Ann \(1850, Philip aged 27\); Father John \(1853, Philip aged 30\); Wife Martha \(1880, Philip aged 57\)\./);
    expect(text).toMatch(/• Mother Elizabeth died before Philip was born\./);
    expect(text).toMatch(/• 1 grandchild born in Philip's lifetime, the first in 1870 \(aged 47\)\./);
  });
  test("no birth year", () => {
    expect(buildLifeLineSummary(null, "X")).toMatch(/no birth year/);
  });
});

test("a death recorded as 'after 1823' isn't put on the line", () => {
  const line = buildLifeLine([row("self", "Philip", "1823", "1889"), row("parent", "Elizabeth", "1798", "1823", { relation: "Mother", deathStatus: "after" })], { now: 2026 });
  expect(line.family.map((e) => e.kind)).toEqual(["birth", "death"]);
});

describe("places and household", () => {
  const line = buildLifeLine(
    [
      row("self", "Philip", "1823", "1889", { birthLocation: "Worcester, Worcestershire, England", deathLocation: "Birkenhead, Cheshire, England" }),
      row("parent", "John", "1790", "1853", { relation: "Father" }),
      row("spouse", "Martha", "1835", "1900", { relation: "Wife", marriage: "1855", marriagePlace: "Wallasey, Cheshire, England" }),
      row("child", "Ann", "1856", "1860", { relation: "Daughter", birthLocation: "Wallasey, Cheshire, England" }),
      row("child", "Tom", "1860", "1940", { relation: "Son", birthLocation: "Birkenhead, Cheshire, England" }),
    ],
    { now: 2026 }
  );
  test("stretches of place, joined when the place repeats", () => {
    expect(line.places.map((p) => [p.from, p.to, p.place, p.reasons.length])).toEqual([
      [1823, 1855, "Worcester, Worcestershire", 1],
      [1855, 1860, "Wallasey, Cheshire", 2],
      [1860, 1889, "Birkenhead, Cheshire", 2],
    ]);
  });
  test("who was alive each year", () => {
    const at = (year) => line.household.find((h) => h.year === year);
    expect(at(1850)).toEqual({ year: 1850, parents: 1, spouses: 0, children: 0, grandchildren: 0 });
    expect(at(1858)).toEqual({ year: 1858, parents: 0, spouses: 1, children: 1, grandchildren: 0 });
    expect(at(1861)).toMatchObject({ children: 1 });
  });
});
