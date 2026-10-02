import {
  addBirthDecadeSqlToDecadeTokens,
  buildBirthDecadeSqlTerm,
  findAmbiguousCenturyDecade,
  rewriteExplicitCenturyDecadeWording,
} from "./chat_century_decade";

const BORN_1820S = 'sql="([Default].[Birth Date].AsNumber In 18200000..18299999)"';

describe("born-in-decade sql (from the WT+ helper template)", () => {
  test("builds the helper's decade range", () => {
    expect(buildBirthDecadeSqlTerm(1820)).toBe(BORN_1820S);
  });

  test("a bare decade token keeps its prefilter and gains the born-in sql", () => {
    expect(addBirthDecadeSqlToDecadeTokens("BirthLocation=Shropshire Unsourced 1820s")).toBe(
      `BirthLocation=Shropshire Unsourced 1820s ${BORN_1820S}`
    );
  });

  test("each OR branch is handled on its own", () => {
    expect(addBirthDecadeSqlToDecadeTokens("Location=Kent 1820s OR Location=Essex 1830s")).toBe(
      `Location=Kent 1820s ${BORN_1820S} OR Location=Essex 1830s sql="([Default].[Birth Date].AsNumber In 18300000..18399999)"`
    );
  });

  test("leaves queries without decade tokens, or with their own birth-date sql, alone", () => {
    expect(addBirthDecadeSqlToDecadeTokens("BirthLocation=Devon B1820")).toBe("BirthLocation=Devon B1820");
    const own = `BirthLocation=Devon 1820s sql="([Default].[Birth Date].AsNumber In 18250101..18291231)"`;
    expect(addBirthDecadeSqlToDecadeTokens(own)).toBe(own);
    expect(addBirthDecadeSqlToDecadeTokens('FirstName="1820s Club"')).toBe('FirstName="1820s Club"');
  });
});

describe("1800s: century or decade?", () => {
  test("asks for a bare XX00s", () => {
    const ambiguity = findAmbiguousCenturyDecade("Lancashire 1800s large spousal age gaps (> 20 years)");
    expect(ambiguity.choices.map((c) => c.label)).toEqual(["19th century (1800–1899)", "Decade 1800–1809"]);
    expect(ambiguity.choices[0].prompt).toBe("Lancashire 1800-1899 large spousal age gaps (> 20 years)");
    expect(ambiguity.choices[1].prompt).toBe("Lancashire 1800-1809 large spousal age gaps (> 20 years)");
    expect(findAmbiguousCenturyDecade("born in the 1700's in Devon").choices[0].label).toBe("18th century (1700–1799)");
  });

  test("doesn't ask for other decades, explicit ranges, centuries or raw WT+ syntax", () => {
    ["Shropshire born 1820s", "Devon 1800-1899", "19th century Cheshire", "BirthLocation=Devon 1800s"].forEach(
      (prompt) => expect(findAmbiguousCenturyDecade(prompt)).toBeNull()
    );
  });

  test("explicit wording is rewritten to a range, so no question is needed", () => {
    expect(rewriteExplicitCenturyDecadeWording("Devon born in the first decade of the 1800s")).toBe(
      "Devon born in 1800-1809"
    );
    expect(rewriteExplicitCenturyDecadeWording("Devon the 1800s decade")).toBe("Devon 1800-1809");
    expect(rewriteExplicitCenturyDecadeWording("Devon born in the whole 1800s")).toBe("Devon born in 1800-1899");
    expect(findAmbiguousCenturyDecade(rewriteExplicitCenturyDecadeWording("Devon the 1800s decade"))).toBeNull();
  });
});
