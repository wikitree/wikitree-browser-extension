import { parseCompletenessPrompt, nearestGaps, buildCompletenessSummary, buildCompletenessGrid, branchCompleteness, describeBranchCompleteness } from "./chat_completeness_data";

const person = (name, gender = "Male") => ({ name, wtid: `${name}-1`, id: name, gender });

function slots() {
  const s = new Array(16).fill(null);
  s[1] = person("Ann", "Female");
  s[2] = person("Bob");
  s[3] = person("Cat", "Female");
  s[4] = person("Dan");
  s[5] = person("Eve", "Female");
  s[7] = person("Gil");
  return s;
}

describe("parseCompletenessPrompt", () => {
  test.each([
    ["How complete is my tree?", "my", "completeness"],
    ["how complete is Cook-8721's family tree", "Cook-8721", "completeness"],
    ["pedigree completeness", "", "completeness"],
    ["my tree completeness", "my", "completeness"],
    ["how many of my ancestors are known", "my", "brickwalls"],
    ["what percentage of her ancestors are on WikiTree?", "her", "brickwalls"],
    ["where are my brick walls", "my", "brickwalls"],
    ["where are the gaps in his tree", "his", "brickwalls"],
  ])("%s", (prompt, owner, mode) => {
    expect(parseCompletenessPrompt(prompt)).toEqual(expect.objectContaining({ owner, mode, completeness: true }));
  });
  test.each([
    ["Which of my ancestors need help?", "my"],
    ["which of her ancestors' profiles need the most work", "her"],
    ["what of Cook-8721's ancestors need attention", "Cook-8721"],
    ["which of my ancestors are least complete", "my"],
    ["which of his ancestors' profiles are the least complete", "his"],
  ])("help: %s", (prompt, owner) => {
    expect(parseCompletenessPrompt(prompt)).toEqual(expect.objectContaining({ owner, mode: "completeness", completeness: true, help: true }));
  });
  test.each(["how complete is this profile", "my tree", "brick walls", "how many ancestors do I have"])("not %s", (prompt) => {
    expect(parseCompletenessPrompt(prompt)).toBeNull();
  });
});

describe("completeness summary", () => {
  test("nearest gaps: closest generation first, the last generation not counted", () => {
    const gaps = nearestGaps(slots());
    expect(gaps.map((gap) => [gap.child.name, gap.missing])).toEqual([
      ["Cat", "father"],
      ["Dan", "parents"],
      ["Eve", "parents"],
      ["Gil", "parents"],
    ]);
  });

  test("summary lists each generation and the nearest gaps", () => {
    const text = buildCompletenessSummary(slots(), "Your");
    expect(text).toContain("5 of 14 ancestors over 3 generations");
    expect(text).toContain("• Parents: 2 of 2 (100%) ✓");
    expect(text).toContain("• Grandparents: 3 of 4 (75%)");
    expect(text).toContain("Cat (mother) has no father recorded; Dan (grandfather) has no parents recorded; Eve (grandmother) has no parents recorded; and 1 more brick wall.");
  });

  test("no parents at all", () => {
    const s = new Array(4).fill(null);
    s[1] = person("Ann");
    expect(buildCompletenessSummary(s, "Your")).toMatch(/no parents recorded/);
  });
});

describe("completeness heatmap", () => {
  // 4 generations (slots 1–31); everyone through slot 15, then only the father's father's father's line.
  const slots = new Array(32).fill(null);
  for (let slot = 1; slot < 16; slot += 1) slots[slot] = { id: slot, wtid: `P-${slot}`, name: `P${slot}` };
  slots[16] = { id: 16, wtid: "P-16", name: "P16" };
  slots[17] = { id: 17, wtid: "P-17", name: "P17" };
  test("one cell per ancestor up to the branch level, then one per branch", () => {
    const grid = buildCompletenessGrid(slots, 2);
    expect(grid).toMatchObject({ generations: 4, branchGeneration: 2, columns: 4 });
    expect(grid.branches.map((b) => b.person.wtid)).toEqual(["P-4", "P-5", "P-6", "P-7"]);
    expect(grid.rows[0].cells.map((c) => [c.col, c.span, c.found])).toEqual([
      [0, 2, 1],
      [2, 2, 1],
    ]);
    expect(grid.rows[2].cells.map((c) => [c.col, c.found, c.possible])).toEqual([
      [0, 2, 2],
      [1, 2, 2],
      [2, 2, 2],
      [3, 2, 2],
    ]);
    expect(grid.rows[3].cells.map((c) => c.found)).toEqual([2, 0, 0, 0]);
    expect(grid.rows[3]).toMatchObject({ found: 2, possible: 16 });
  });
  test("the branch level can't go past the generations loaded", () => {
    expect(buildCompletenessGrid(slots, 9).branchGeneration).toBe(4);
  });
  test("branches ranked, and the chat line", () => {
    const grid = buildCompletenessGrid(slots, 2);
    expect(branchCompleteness(grid).map((b) => [b.person.wtid, b.found, b.possible])).toEqual([
      ["P-4", 4, 6],
      ["P-5", 2, 6],
      ["P-6", 2, 6],
      ["P-7", 2, 6],
    ]);
    expect(describeBranchCompleteness(grid)).toBe("Beyond the grandparents, the fullest branch is P4 (P-4)'s (67%). The emptiest is P7 (P-7)'s (33%). The heatmap shows every branch.");
    const gappy = slots.slice();
    gappy[10] = null;
    gappy[11] = null;
    gappy[9] = { ...gappy[9], lnab: "Smith" };
    gappy[12] = { ...gappy[12], lnab: "Unknown" };
    gappy[13] = { ...gappy[13], lnab: "Unknown", name: "Unknown" };
    expect(describeBranchCompleteness(buildCompletenessGrid(gappy, 3))).toBe(
      "Beyond the great-grandparents, the fullest branch is P8 (P-8)'s (100%). 5 branches go no further back: Smith, P12, unnamed (P-13), P14, P15. 2 of the great-grandparents aren't on WikiTree yet. The heatmap shows every branch."
    );
  });
});

describe("completeness heatmap prompts", () => {
  test.each([
    ["completeness heatmap", ""],
    ["show my pedigree heatmap", "my"],
    ["Cook-8721's tree completeness heat map", "Cook-8721"],
    ["Which branches of my tree are most complete?", "my"],
    ["which of her branches are the least researched", "her"],
  ])("%s", (prompt, owner) => {
    expect(parseCompletenessPrompt(prompt)).toMatchObject({ owner, heatmap: true, completeness: true });
  });
  test("the other completeness prompts don't ask for it", () => {
    expect(parseCompletenessPrompt("how complete is my tree").heatmap).toBeUndefined();
    expect(parseCompletenessPrompt("heatmap of my DNA matches")).toBeNull();
  });
});

describe("completeness heatmap: profile quality", () => {
  test("cells carry the profile scores, averaged over a branch's profiles", () => {
    const slots = new Array(16).fill(null);
    for (let slot = 1; slot < 12; slot += 1) slots[slot] = { id: slot, wtid: `P-${slot}`, quality: { score: slot / 20 } };
    slots[9] = { id: 9, wtid: "P-9" }; // (loaded without the quality fields)
    const grid = buildCompletenessGrid(slots, 2);
    expect(grid.rows[0].cells.map((c) => c.quality)).toEqual([0.1, 0.15]);
    expect(grid.rows[2].cells.map((c) => [c.found, c.scored, c.quality])).toEqual([
      [2, 1, 0.4],
      [2, 2, (0.5 + 0.55) / 2],
      [0, 0, null],
      [0, 0, null],
    ]);
  });
});

