import { buildNeedsHelpAnswer, buildQualitySummary, citationCount, profileQuality, researchStatusLabel } from "./chat_profile_quality_data";

const full = {
  BirthDate: "1803-05-06",
  BirthLocation: "Ellsworth, Maine",
  DeathDate: "1885-08-10",
  DeathLocation: "Barachois, Quebec",
  Father: 1,
  Mother: 2,
  NoChildren: 1,
  IsLiving: 0,
  ResearchStatus: 0,
  DataStatus: { BirthDate: "certain", BirthLocation: "certain", DeathDate: "certain", DeathLocation: "guess", Father: "20", Mother: "30", Spouse: "blank" },
  Spouses: [{ MarriageDate: "1834-09-23", MarriageLocation: "Bathurst", DataStatus: { MarriageDate: "certain", MarriageLocation: "certain" } }],
  Bio: "Born.<ref>a</ref> Parents.<ref name=x>b</ref> Married.<ref>c</ref> Died.<ref>d</ref>",
};

describe("profileQuality", () => {
  test("a profile meeting every item scores 100%", () => {
    const q = profileQuality(full);
    expect(q.score).toBe(1);
    expect(q.missing).toEqual([]);
    expect(Object.keys(q.items)).toHaveLength(17);
  });
  test("status indicators (DataStatus) count as items of their own", () => {
    const q = profileQuality({ ...full, DataStatus: { ...full.DataStatus, BirthLocation: "", Father: "" } });
    expect(q.missing).toEqual(["birth place status", "father's relationship status"]);
    expect(q.score).toBeCloseTo(15 / 17);
  });
  test("missing facts, boxes and citations", () => {
    const q = profileQuality({ ...full, DeathLocation: "", NoChildren: 0, DataStatus: { ...full.DataStatus, Spouse: "" }, Bio: "Born.<ref>a</ref> Died.<ref>b</ref>" });
    expect(q.missing).toEqual(['"no more spouses" box', '"no more children" box', "death place", "inline source citations"]);
    expect(q.items.sources).toBe(0.5);
    expect(q.items.deathPlaceStatus).toBeUndefined();
  });
  test("items that don't apply are left out", () => {
    const q = profileQuality({ BirthDate: "1950-01-01", IsLiving: 1, DataStatus: {} });
    expect(Object.keys(q.items)).toEqual(["birthDate", "birthDateStatus", "birthPlace", "father", "mother", "noMoreSpouses", "noMoreChildren"]);
  });
  test("half a marriage", () => {
    const q = profileQuality({ ...full, Spouses: [{ marriage_date: "1834-00-00", marriage_location: "", data_status: { marriage_date: "guess" } }] });
    expect(q.items.marriages).toBe(0.5);
    expect(q.items.marriageStatus).toBe(0.5);
  });
  test("the spouse status is read from data_status when DataStatus is blank (as getPeople sends it)", () => {
    const spouse = { MarriageDate: "1834-09-23", MarriageLocation: "Bathurst", DataStatus: { MarriageDate: "", MarriageLocation: "" }, data_status: { marriage_date: "certain", marriage_location: null } };
    expect(profileQuality({ ...full, Spouses: [spouse] }).items.marriageStatus).toBe(0.5);
  });
  test("Gold Standard counts as complete", () => {
    expect(profileQuality({ ResearchStatus: 60 })).toMatchObject({ score: 1, gold: true, missing: [] });
    expect(researchStatusLabel(50)).toBe("Gold Standard Candidate");
    expect(researchStatusLabel(0)).toBe("");
  });
  test("citations", () => {
    expect(citationCount('a<ref>x</ref> b<ref name="y" /> <references />')).toBe(2);
  });
});

describe("buildQualitySummary", () => {
  test("average, statuses, gaps and the nearly complete", () => {
    const people = [
      { name: "Lewis", wtid: "Urquhart-1841", quality: profileQuality(full) },
      { name: "Mary", wtid: "Lordon-3", quality: profileQuality({ ...full, NoChildren: 0, ResearchStatus: 40 }) },
      { name: "Ned", wtid: "Maloney-1", quality: profileQuality({ BirthDate: "1850", IsLiving: 0, DataStatus: {} }) },
    ];
    const text = buildQualitySummary(people, "Murray's");
    expect(text).toMatch(/Murray's 3 ancestors' profiles average \d+%, and 1 meets it all\./);
    expect(text).toMatch(/Research status: 1 Silver Standard\./);
    expect(text).toMatch(/The commonest gaps: "no more children" box \(2\)/);
    expect(text).toMatch(/Nearly there: Mary \(Lordon-3\), 94%, needs "no more children" box\./);
  });
  test("nothing to score", () => {
    expect(buildQualitySummary([], "Your")).toBe("");
  });
});

describe("buildNeedsHelpAnswer", () => {
  const person = (name, wtid, overrides, generation) => ({ name, wtid, generation, quality: profileQuality({ ...full, ...overrides }) });
  test("research statuses first, then the least complete, nearer generations first on a tie", () => {
    const text = buildNeedsHelpAnswer(
      [
        person("Ann", "A-1", { ResearchStatus: 20, NoChildren: 0 }, 2),
        person("Bob", "B-1", { BirthLocation: "", DeathLocation: "" }, 3),
        person("Cid", "C-1", { BirthLocation: "", DeathLocation: "" }, 1),
        person("Dee", "D-1", {}, 1),
        person("Gil", "G-1", { ResearchStatus: 60, BirthDate: "" }, 1),
      ],
      "Murray's"
    );
    expect(text.split("\n")).toEqual([
      "Marked as needing work (Research Status), 1:",
      '- Help Requested: Ann (A-1), 94%: needs "no more children" box',
      "The least complete against the Gold Standard checklist:",
      "- Cid (C-1), 87%: needs birth place, death place",
      "- Bob (B-1), 87%: needs birth place, death place",
    ]);
  });
  test("no statuses set", () => {
    expect(buildNeedsHelpAnswer([person("Bob", "B-1", { NoChildren: 0 })], "Your")).toMatch(/^None of your ancestors' profiles is marked/);
    expect(buildNeedsHelpAnswer([], "Your")).toBe("");
  });
});
