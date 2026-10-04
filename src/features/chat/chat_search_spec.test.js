import { applySameCemetery, compileSearchSpec, pickCemeteryCategories } from "./chat_search_spec";

const compile = (search, context) => compileSearchSpec(search, context);

describe("compileSearchSpec", () => {
  test.each([
    [
      "B4: unsourced, Shropshire, born in the 1820s",
      { places: [{ text: "Shropshire" }], dates: [{ event: "birth", from: 1820, to: 1829 }], flags: ["Unsourced"] },
      "Location=Shropshire 1820s Unsourced",
    ],
    [
      "D6: Shropshire with no birth place",
      { places: [{ text: "Shropshire" }], missingPlaces: ["birth"] },
      "Location=Shropshire sql=\"([Default].[Birth Location] = '')\"",
    ],
    [
      "B1: born before 1750 in Devon (undated profiles excluded)",
      { places: [{ text: "Devon", event: "birth" }], dates: [{ event: "birth", to: 1749 }] },
      'BirthLocation=Devon sql="([Default].[Birth Date].AsNumber In 1..17499999)"',
    ],
    [
      "B1: Devon births after 1850",
      { places: [{ text: "Devon", event: "birth" }], dates: [{ event: "birth", from: 1851 }] },
      'BirthLocation=Devon sql="([Default].[Birth Date].AsNumber >= 18510000)"',
    ],
    [
      "B3: died after 1900 in Liverpool, England",
      { places: [{ text: "Liverpool, England", event: "death" }], dates: [{ event: "death", from: 1901 }] },
      'DeathLocation="Liverpool, England" sql="([Default].[Death Date].AsNumber >= 19010000)"',
    ],
    [
      "B5: married in Cheshire in the 20th century, more than 6 children",
      {
        places: [{ text: "Cheshire", event: "marriage" }],
        dates: [{ event: "marriage", from: 1900, to: 1999 }],
        counts: { children: { min: 7 } },
      },
      'MarriageLocation=Cheshire sql="([Marriage].[Marriage Date].AsNumber In 19000000..19999999) And ([Children].[User ID].LineCount >= 7)"',
    ],
    [
      "B6: 19th century Cheshire, exactly one marriage",
      {
        places: [{ text: "Cheshire" }],
        dates: [{ event: "birth", from: 1800, to: 1899 }],
        counts: { marriages: { exact: 1 } },
      },
      'Location=Cheshire 19Cen sql="([Marriage].[Marriage Date].LineCount = 1)"',
    ],
    [
      "sub-century range keeps the century token as a prefilter",
      { places: [{ text: "Devon" }], dates: [{ event: "birth", from: 1800, to: 1850 }] },
      'Location=Devon 19Cen sql="([Default].[Birth Date].AsNumber In 18000000..18509999)"',
    ],
    [
      "B19: Beacall with a mother but no father (NOT goes last)",
      { names: { anyLastName: "Beacall" }, flags: ["HasMother", "NoFather"] },
      "AllLastNames=Beacall NoFather NOT NoMother",
    ],
    [
      "B20: Dickin, 19th century, female",
      { names: { anyLastName: "Dickin" }, dates: [{ event: "birth", from: 1800, to: 1899 }], gender: "female" },
      "AllLastNames=Dickin 19Cen female",
    ],
    [
      "B21: Manchester, died aged 42, connected",
      { places: [{ text: "Manchester" }], deathAge: 42, flags: ["Connected"] },
      "Location=Manchester connected age42",
    ],
    [
      "C23: oldest people who died in Devon (deathAge range)",
      { places: [{ event: "death", text: "Devon" }], deathAge: { min: 100 } },
      'DeathLocation=Devon sql="([Default].[Birth Date].AsNumber > 10000000) And ([Default].[Death Date].AsNumber - [Default].[Birth Date].AsNumber >= 1000000)"',
    ],
    [
      "Kent, died under 5 (deathAge max)",
      { places: [{ text: "Kent" }], deathAge: { max: 4 } },
      'Location=Kent sql="([Default].[Birth Date].AsNumber > 10000000) And ([Default].[Death Date].AsNumber - [Default].[Birth Date].AsNumber < 50000) And ([Default].[Death Date].AsNumber > 0)"',
    ],
    [
      "C26: uncertain fathers in Cheshire",
      { places: [{ text: "Cheshire" }], parentStatus: [{ parent: "father", status: "uncertain" }] },
      'Location=Cheshire sql="([Default].[Father Status].AsNumber = 10)"',
    ],
    [
      "famous people born in Kent",
      { places: [{ event: "birth", text: "Kent" }], flags: ["Notables"] },
      "BirthLocation=Kent Notables",
    ],
    [
      "B22: Illinois, Find a Grave cemetery 105308",
      { places: [{ text: "Illinois" }], findAGraveCemetery: 105308 },
      "Location=Illinois fgcem105308",
    ],
    [
      "A1: England, no birth or death date (No-Dates suggestion group)",
      { places: [{ text: "England" }], suggestions: [131, 132, 133, 134] },
      'Location=England Suggestions="131 132 133 134"',
    ],
    [
      "A12: men in Yorkshire with Y haplogroup R-M269",
      { places: [{ text: "Yorkshire" }], gender: "male", haplogroup: { y: "R-M269" } },
      `Location=Yorkshire male yDNA sql="([Bio].[Replicated DNA yHaplogroup].AsString Like '*R-M269*')"`,
    ],
  ])("%s", (label, search, query) => {
    expect(compile(search)).toEqual({ query, routePrompt: "", errors: [] });
  });

  test("anyOf alternatives become OR branches that repeat the shared part", () => {
    expect(
      compile({ places: [{ text: "England" }], anyOf: [{ flags: ["ProjectManaged"] }, { flags: ["PPP"] }] }).query
    ).toBe("Location=England ProjectManaged OR Location=England PPP");
    expect(
      compile({
        places: [{ text: "Yorkshire" }],
        anyOf: [
          { categories: [{ name: "miner", match: "word" }] },
          { categories: [{ name: "colliery", match: "word" }] },
        ],
      }).query
    ).toBe("Location=Yorkshire CategoryWord=miner OR Location=Yorkshire CategoryWord=colliery");
  });

  test("tree roots resolve 'me' and 'current' from context", () => {
    expect(compile({ tree: { descendantsOf: "me" } }, { userWtId: "Beacall-6" }).query).toBe("Descendants=Beacall-6");
    expect(compile({ tree: { cc7Of: "current" } }, { currentProfileWtId: "Fry-1" }).query).toBe("CC7=Fry-1");
    expect(compile({ tree: { ancestorsOf: "Darwin-15" } }).query).toBe("Ancestors=Darwin-15");
    expect(compile({ tree: { ancestorsOf: "me" } }).errors).toContain("unknown tree root: me");
  });

  test("special searches compile to the canonical prompt their route parses", () => {
    expect(
      compile({
        places: [{ text: "Lancashire" }],
        dates: [{ event: "birth", from: 1800, to: 1899 }],
        special: { type: "spousalAgeGap", minYears: 20 },
      }).routePrompt
    ).toBe("Lancashire 1800-1899 large spousal age gaps (> 20 years)");
    expect(
      compile({
        places: [{ text: "Shropshire" }],
        dates: [{ event: "birth", from: 1800, to: 1850 }],
        special: { type: "parentAgeAtBirth", underAge: 14, overAge: 70 },
      }).routePrompt
    ).toBe("Shropshire 1800-1850 when parent was under 14 or over 70");
  });

  test("rejects what it can't compile instead of guessing", () => {
    expect(compile({}).errors).toEqual(["empty search"]);
    expect(compile({ flags: ["Living"] }).errors).toContain("unknown flag: Living");
    expect(compile({ dates: [{ event: "birth", from: 1900, to: 1800 }] }).errors[0]).toMatch(/bad date/);
    expect(compile({ places: [{ text: "Kent", event: "baptism" }] }).errors[0]).toMatch(/bad place/);
  });
});

describe("sameCemeteryAs", () => {
  test("picks cemetery categories only", () => {
    expect(
      pickCemeteryCategories(["Lloyds,_sailed_11_September_1841", "Motueka_Cemetery,_Motueka,_Tasman", "St_Mary's_Churchyard,_Acton"])
    ).toEqual(["Motueka Cemetery, Motueka, Tasman", "St Mary's Churchyard, Acton"]);
  });

  test("one cemetery becomes an exact category", () => {
    const search = applySameCemetery({ sameCemeteryAs: "current" }, ["Motueka Cemetery, Motueka, Tasman"]);
    expect(compileSearchSpec(search).query).toBe('CategoryFull="Motueka Cemetery, Motueka, Tasman"');
  });

  test("several cemeteries are OR'd", () => {
    const search = applySameCemetery({ sameCemeteryAs: "current" }, ["A Cemetery, X", "B Churchyard, Y"]);
    expect(compileSearchSpec(search).query).toContain(" OR ");
  });

  test("unresolved sameCemeteryAs never runs", () => {
    expect(compileSearchSpec({ sameCemeteryAs: "current" }).errors).toContain(
      "sameCemeteryAs was not resolved to a cemetery category"
    );
  });
});

// Live C16, 2026-10-03: "Beacalls who emigrated to Australia" lost the emigration.
describe("notPlaces", () => {
  test("emigrated to: died there, not born there", () => {
    const { query, errors } = compileSearchSpec({
      names: { anyLastName: "Beacall" },
      places: [{ text: "Australia", event: "death" }],
      notPlaces: [{ text: "Australia", event: "birth" }],
    });
    expect(errors).toEqual([]);
    expect(query).toMatch(/DeathLocation=Australia/);
    expect(query).toMatch(/ NOT BirthLocation=Australia$/);
  });

  test("bad entry is an error", () => {
    expect(compileSearchSpec({ places: [{ text: "Kent" }], notPlaces: [{ event: "birth" }] }).errors).toContain(
      'bad notPlaces entry: {"event":"birth"}'
    );
  });
  it("rejects a bad parentStatus entry", () => {
    expect(
      compileSearchSpec({ places: [{ text: "Kent" }], parentStatus: [{ parent: "father", status: "adopted" }] }).errors
    ).toContain('bad parentStatus entry: {"parent":"father","status":"adopted"}');
  });
});
