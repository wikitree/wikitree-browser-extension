import { compileSearchSpec } from "./chat_search_spec";

const compile = (search, context) => compileSearchSpec(search, context);

describe("compileSearchSpec", () => {
  test.each([
    [
      "B4: unsourced, Shropshire, born in the 1820s",
      { places: [{ text: "Shropshire" }], dates: [{ event: "birth", from: 1820, to: 1829 }], flags: ["Unsourced"] },
      "Location=Shropshire 1820s Unsourced",
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
