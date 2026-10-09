import { analyseRelationship, ancestorWord, asksForRelationship, buildRelationshipLines, relationshipLead, describeRelationship, detectChance, dnaReferenceForAi, dnaSentence, relationshipName, sharedCmProject, sharedCmWords } from "./chat_relationship_data";

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
    expect(analyseRelationship({ commonAncestors: [], html })).toEqual({
      kind: "direct",
      generations: 3,
      cm: 850,
      scp: { label: "Great-Grandparent", avg: 887, low: 485, high: 1486 },
      ancestorIs: 2,
    });
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
    expect(text).toMatch(
      /About 90% of relatives this close share DNA a test would detect; among those who do, the Shared cM Project 4\.0 average for half 3rd cousins \(Half 3C\) is 48 cM \(range 0–168 cM\)\. Being related more than one way raises the odds\./
    );
    // The sources come last, after the Y-DNA line.
    expect(text.split("\n").at(-1)).toMatch(/^Sources: Shared cM Project 4\.0 .*dnapainter\.com\/tools\/sharedcmv4; AncestryDNA's published odds/);
    expect(text).toMatch(/Both lines from John run father to son/);
  });
  test("direct and none", () => {
    const greatGrandparent = { kind: "direct", generations: 3, cm: 850, scp: { label: "Great-Grandparent", avg: 887, low: 485, high: 1486 }, ancestorIs: 2 };
    expect(describeRelationship(greatGrandparent, "you", "Mary")).toBe(
      "A great-grandparent and great-grandchild share on average 887 cM (range 485–1486 cM) in the Shared cM Project 4.0.\n" +
        "Sources: Shared cM Project 4.0 (Blaine Bettinger, 2020), as in DNA Painter's tool: https://dnapainter.com/tools/sharedcmv4."
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

test("an 8th great-grandmother: no match odds, no borrowed cousin figures (De_Figuery-1, 2026-10-06)", () => {
  const steps = Array.from({ length: 10 }, (_, i) => `<li>${i + 1}. P${i} is the daughter of P${i + 1}</li>`).join("");
  const analysis = analyseRelationship({ commonAncestors: [], html: `<h2>Direct Relationship Found</h2><ol>${steps}</ol>` });
  expect(analysis).toMatchObject({ kind: "direct", generations: 10, cm: 6.6, scp: null, ancestorIs: 2 });
  const text = describeRelationship(analysis, "you", "Claire");
  expect(text).toMatch(/^You are 10 generations below Claire\. .*about 6\.6 cM.*your DNA may include none of Claire's\./);
  expect(text).toMatch(/no measured figures: the Shared cM Project 4\.0 \(DNA Painter: https:\/\/dnapainter\.com\/tools\/sharedcmv4\) stops at great-grandparents/);
  expect(text).not.toMatch(/50%|28 cM|WikiTree's estimate/);
});

test("sharedCmProject and sharedCmWords", () => {
  expect(sharedCmProject(5, 6)).toEqual({ label: "4C1R", avg: 28, low: 0, high: 126 });
  expect(sharedCmProject(3, 3, { half: true })).toEqual({ label: "Half 2C", avg: 120, low: 10, high: 325 });
  expect(sharedCmProject(1, 3)).toEqual({ label: "Great-Aunt / Uncle", avg: 850, low: 330, high: 1467 });
  expect(sharedCmProject(1, 1, { half: true })).toEqual({ label: "Half Sibling", avg: 1759, low: 1160, high: 2436 });
  expect(sharedCmProject(2, 0)?.avg).toBe(1754);
  expect(sharedCmProject(4, 0)).toBeNull();
  expect(sharedCmProject(10, 10)).toBeNull(); // (9th cousins: beyond the project)
  expect(sharedCmWords("Half 2C1R")).toBe("half 2nd cousins once removed (Half 2C1R)");
  expect(sharedCmWords("Sibling")).toBe("siblings");
});

test("dnaReferenceForAi names its sources", () => {
  const text = dnaReferenceForAi();
  expect(text).toMatch(/4C1R: 28 \(0–126\)/);
  expect(text).toMatch(/dnapainter\.com\/tools\/sharedcmv4/);
  expect(text).toMatch(/don't use other numbers or call them WikiTree's/);
});

test("dnaSentence", () => {
  expect(dnaSentence({ cm: 6.6, chance: 50, matchedCm: 28, scp: { label: "4C1R", avg: 28, low: 0, high: 126 } })).toBe(
    "About 50% of relatives this close share DNA a test would detect; among those who do, the Shared cM Project 4.0 average for 4th cousins once removed (4C1R) is 28 cM (range 0–126 cM).\n" +
      "Sources: Shared cM Project 4.0 (Blaine Bettinger, 2020), as in DNA Painter's tool: https://dnapainter.com/tools/sharedcmv4; AncestryDNA's published odds of a match (3rd cousins 98%, 4th 71%, 5th 32%, 6th 11%, 8th under 1%; relationships in between are estimated)."
  );
  expect(dnaSentence({ cm: 0.4, chance: 4, matchedCm: 20 })).toMatch(/those who do share roughly 20 cM \(the Shared cM Project has no figures this far out\)\.\nSources: AncestryDNA/);
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

describe("X-DNA path (Murray, 2026-10-07)", () => {
  const { xDnaPath, xDnaSentence, directLineDown, directXDnaSentence } = require("./chat_relationship_data");
  const p = (first, gender, wtid = "") => ({ first, name: `${first} Smith`, gender, wtid });
  const mary = p("Mary", "Female", "Smith-2");
  const john = p("John", "Male", "Smith-1");

  test("a mother's X can reach both lines when no father has a son on them", () => {
    // Mary → Ann → Tom (you) and Mary → Bob → Jane
    const lines = { ancestors: [john, mary], line1: [p("Ann", "Female"), p("Tom", "Male")], line2: [p("Bob", "Male"), p("Jane", "Female")] };
    expect(xDnaPath(lines)).toEqual({ kind: "x", sources: [mary] });
    expect(xDnaSentence(lines, "you", "Jane")).toBe(
      "**X-DNA path:** X-DNA can come down both lines from Mary Smith (Smith-2) to you and Jane: there's no father-to-son link on either line. An X-DNA match could support this relationship."
    );
  });

  test("the father too when both of his children on the lines are daughters", () => {
    const lines = { ancestors: [john, mary], line1: [p("Ann", "Female")], line2: [p("Sue", "Female")] };
    expect(xDnaPath(lines).sources).toEqual([john, mary]);
  });

  test("a father-to-son link blocks it", () => {
    const bob = p("Bob", "Male");
    const jim = p("Jim", "Male");
    const lines = { ancestors: [john, mary], line1: [p("Ann", "Female")], line2: [bob, jim] };
    expect(xDnaPath(lines)).toEqual({ kind: "blocked", father: bob, son: jim });
    expect(xDnaSentence(lines, "you", "Jim")).toBe("");
  });

  test("a lone father with a son at the top blocks it", () => {
    const bob = p("Bob", "Male");
    expect(xDnaPath({ ancestors: [john], line1: [p("Ann", "Female")], line2: [bob] })).toEqual({ kind: "blocked", father: john, son: bob });
  });

  test("a missing gender where it matters: unknown, so nothing is claimed", () => {
    expect(xDnaPath({ ancestors: [mary], line1: [p("Ann", "Female")], line2: [p("Bob", "Male"), p("Kim", "")] }).kind).toBe("unknown");
    // (a mother's child of unknown gender doesn't matter)
    expect(xDnaPath({ ancestors: [mary], line1: [p("Ann", "")], line2: [p("Sue", "Female")] }).kind).toBe("x");
  });

  test("a direct line", () => {
    const path = [
      { Name: "Smith-9", FirstName: "Tom", LastNameAtBirth: "Smith", Gender: "Male" },
      { Name: "Jones-3", FirstName: "Ann", LastNameAtBirth: "Jones", Gender: "Female", pathType: "parent" },
      { Name: "Brown-4", FirstName: "Edward", LastNameAtBirth: "Brown", Gender: "Male", pathType: "parent" },
    ];
    const down = directLineDown(path);
    expect(down.map((x) => x.wtid)).toEqual(["Brown-4", "Jones-3", "Smith-9"]);
    expect(directXDnaSentence(down)).toBe("**X-DNA path:** X-DNA can come straight down from Edward Brown (Brown-4) to Tom Smith (Smith-9): there's no father-to-son link on the line.");
    path[1].Gender = "Male";
    expect(directXDnaSentence(directLineDown(path))).toBe("");
  });
});
