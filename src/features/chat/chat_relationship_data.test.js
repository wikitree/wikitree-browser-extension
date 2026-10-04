import { analyseRelationship, ancestorWord, asksForRelationship, buildRelationshipLines, relationshipLead, describeRelationship, detectChance, dnaSentence, relationshipName } from "./chat_relationship_data";

const ancestor = (mName, ShortName, Gender, path1Length, path2Length, extra = {}) => ({
  ancestor_id: mName,
  path1Length,
  path2Length,
  ancestor: { mName, mDerived: { ShortName, Gender } },
  yDNA: 0,
  mtDNA: 0,
  ...extra,
});

describe("relationshipName", () => {
  test.each([
    [1, 1, {}, "sibling"],
    [1, 1, { half: true, gender1: "male" }, "half-brother"],
    [1, 2, { gender1: "female" }, "aunt"],
    [1, 3, { gender1: "male" }, "great-uncle"],
    [1, 4, { gender1: "male" }, "2nd great-uncle"],
    [2, 1, { gender1: "male" }, "nephew"],
    [3, 1, { gender1: "female" }, "grandniece"],
    [4, 1, { gender1: "male" }, "great-grandnephew"],
    [6, 1, { gender1: "male" }, "3rd great-grandnephew"],
    [2, 2, {}, "1st cousin"],
    [3, 2, {}, "1st cousin once removed"],
    [5, 5, { half: true }, "4th half-cousin"],
    [4, 6, {}, "3rd cousin twice removed"],
  ])("%i/%i %j → %s", (a, b, options, expected) => {
    expect(relationshipName(a, b, options)).toBe(expected);
  });
});

test("ancestorWord", () => {
  expect([1, 2, 3, 4, 6].map((g) => ancestorWord(g))).toEqual(["parents", "grandparents", "great-grandparents", "2nd great-grandparents", "4th great-grandparents"]);
});

test("detectChance", () => {
  expect([4, 8, 10, 12, 14, 16, 20].map(detectChance)).toEqual([100, 98, 71, 32, 11, 4, 1]);
});

describe("analyseRelationship", () => {
  // Live: Maloney-2332 → Milliken-62 (Murray is the third great grandnephew of Susan).
  const murraySusan = {
    commonAncestors: [ancestor("Lord-4718", "Phebe (Lord) Milliken", "female", 7, 2), ancestor("Milliken-698", "Lemuel Milliken", "male", 7, 2)],
    html: "<h2>Relationship Found</h2><h3>Murray is the third great grandnephew of Susan</h3>",
  };
  test("one couple: generations, full, cM", () => {
    const result = analyseRelationship(murraySusan);
    expect(result.kind).toBe("common");
    expect(result.routes).toHaveLength(1);
    const [route] = result.routes;
    expect([route.gens1, route.gens2, route.couple, route.meioses, route.cm, route.chance]).toEqual([6, 1, true, 7, 110, 100]);
    expect(route.ancestors.map((a) => a.wtId)).toEqual(["Milliken-698", "Lord-4718"]); // (father first)
  });
  test("several routes, nearest first; a lone ancestor is half", () => {
    const result = analyseRelationship({
      commonAncestors: [
        ancestor("Far-1", "Far Man", "male", 7, 7),
        ancestor("Near-1", "Near Man", "male", 3, 3),
        ancestor("Near-2", "Near Woman", "female", 3, 3),
      ],
    });
    expect(result.routes.map((r) => [r.gens1, r.gens2, r.couple, r.cm])).toEqual([
      [2, 2, true, 850],
      [6, 6, false, 1.7],
    ]);
    expect(result.cm).toBe(850);
  });
  test("direct line: steps counted from the html", () => {
    const html = "<h2>Direct Relationship Found</h2><ol><li>1. Murray is the son of A</li><li>2. A is the son of B</li><li>3. B is the son of C</li></ol>";
    expect(analyseRelationship({ commonAncestors: [], html })).toEqual({ kind: "direct", generations: 3, cm: 850, chance: 100, matchedCm: 850 });
  });
  test("nothing", () => {
    expect(analyseRelationship({ commonAncestors: [], html: "<h2>No Relationship Found</h2>" })).toEqual({ kind: "none" });
    expect(analyseRelationship(null)).toEqual({ kind: "none" });
  });
});

describe("describeRelationship", () => {
  test("one couple, from you", () => {
    const analysis = analyseRelationship({
      commonAncestors: [ancestor("Lord-4718", "Phebe (Lord) Milliken", "female", 7, 2), ancestor("Milliken-698", "Lemuel Milliken", "male", 7, 2)],
    });
    expect(describeRelationship(analysis, "you", "Susan")).toBe(
      "The common ancestors are Lemuel Milliken (Milliken-698) and Phebe (Lord) Milliken (Lord-4718): your 4th great-grandparents and Susan's parents.\n" +
        "Relatives this close share about 110 cM of DNA on average, and almost all share some."
    );
  });
  test("other routes, a lone ancestor, Y-DNA", () => {
    const analysis = analyseRelationship({
      commonAncestors: [
        ancestor("Smith-1", "John Smith", "male", 5, 5, { yDNA: 1 }),
        ancestor("Jones-9", "Mary Jones", "female", 7, 6),
        ancestor("Jones-8", "Tom Jones", "male", 7, 6),
      ],
    });
    const text = describeRelationship(analysis, "Ann", "Bob", { gender1: "female" });
    expect(text).toMatch(/^The common ancestor is John Smith \(Smith-1\): Ann's 2nd great-grandfather and Bob's 2nd great-grandfather\./);
    expect(text).toMatch(/may be a half relationship/);
    expect(text).toMatch(/Ann and Bob are also related another way: through Tom Jones \(Jones-8\) and Mary Jones \(Jones-9\) \(Ann's 4th great-grandparents and Bob's 3rd great-grandparents\), 4th cousin once removed\./);
    expect(text).toMatch(/About 90% of relatives this close share DNA a test would detect; those who do share about 48 cM on average\. Being related more than one way raises the odds\./);
    expect(text).toMatch(/Both lines from John run father to son/);
    expect(text).not.toMatch(/\bkits?\b|GEDmatch|\bAncestry\b|23andMe|FTDNA/i);
  });
  test("direct and none", () => {
    expect(describeRelationship({ kind: "direct", generations: 3, cm: 850, chance: 100, matchedCm: 850 }, "you", "Mary")).toBe(
      "Relatives this close share about 850 cM of DNA on average, and almost all share some."
    );
    expect(describeRelationship({ kind: "none" }, "you", "X")).toBe("");
  });
});

describe("buildRelationshipLines", () => {
  const step = (Name, pathType, pathStatus, extra = {}) => ({ Name, RealName: Name.split("-")[0], LastNameAtBirth: "X", pathType, pathStatus, ...extra });
  const analysis = analyseRelationship({
    commonAncestors: [ancestor("Lord-4718", "Phebe (Lord) Milliken", "female", 4, 2), ancestor("Milliken-698", "Lemuel Milliken", "male", 4, 2)],
  });
  test("up to the common ancestor and down; spouse from the route; statuses", () => {
    const path = [step("Murray-1", null, null), step("Dad-1", "parent", 30), step("Peggy-1", "parent", 20), step("Milliken-698", "parent", 20, { Gender: "Male" }), step("Susan-1", "child", 0)];
    const lines = buildRelationshipLines(path, analysis);
    expect(lines.ancestors.map((a) => a.wtid)).toEqual(["Milliken-698", "Lord-4718"]);
    expect(lines.line1.map((p) => [p.wtid, p.status])).toEqual([
      ["Peggy-1", 20],
      ["Dad-1", 20],
      ["Murray-1", 30],
    ]);
    expect(lines.line2.map((p) => [p.wtid, p.status])).toEqual([["Susan-1", 0]]);
  });
  test("a sibling step: parents from the route", () => {
    const path = [step("A-1", null, null), step("B-1", "parent", 30), step("C-1", "sibling", 0), step("D-1", "child", 20)];
    const lines = buildRelationshipLines(path, analysis);
    expect(lines.ancestors.map((a) => a.wtid)).toEqual(["Milliken-698", "Lord-4718"]);
    expect(lines.line1.map((p) => p.wtid)).toEqual(["B-1", "A-1"]);
    expect(lines.line2.map((p) => p.wtid)).toEqual(["C-1", "D-1"]);
  });
  test("not a blood line", () => {
    expect(buildRelationshipLines([step("A-1", null, null), step("B-1", "spouse", 0), step("C-1", "child", 0)], analysis)).toBeNull();
    expect(buildRelationshipLines([step("A-1", null, null), step("B-1", "parent", 30)], analysis)).toBeNull();
  });
});

test("dnaSentence", () => {
  expect(dnaSentence({ cm: 6.6, chance: 50, matchedCm: 28 })).toBe("About 50% of relatives this close share DNA a test would detect; those who do share about 28 cM on average.");
  expect(dnaSentence({ cm: 53, chance: 98, matchedCm: 73 })).toBe("About 98% of relatives this close share DNA a test would detect; those who do share about 73 cM on average.");
  expect(dnaSentence({ cm: 0.1, chance: 1, matchedCm: 20 })).toMatch(/^Very few relatives this close \(under 2%\)/);
});

describe("asksForRelationship / relationshipLead", () => {
  test.each([
    ["how am I related to Harold", true],
    ["what's my relationship to Milliken-62", true],
    ["how is Maloney-2332 related to McKusick-36?", true],
    ["how am I connected to Gerald Ford", false],
    ["connection between Maloney-2332 and Milliken-62", false],
  ])("%s", (prompt, expected) => {
    expect(asksForRelationship(prompt)).toBe(expected);
  });
  test("lead", () => {
    expect(relationshipLead("Murray and Harold are fourth cousins once removed", "Harold")).toBe("Murray and Harold are fourth cousins once removed.");
    expect(relationshipLead("Third cousin", "Ann (A-1)")).toBe("Ann (A-1) is your third cousin.");
    expect(relationshipLead("Third cousin", "Ann", "Bob")).toBe("Ann is Bob's third cousin.");
    expect(relationshipLead("No relationship found", "Ann")).toBe("");
  });
});
