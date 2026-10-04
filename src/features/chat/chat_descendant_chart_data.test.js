import { parseDescendantChartPrompt, buildDescendantTree, descendantTreeStats, buildDescendantChartSummary } from "./chat_descendant_chart_data";

describe("parseDescendantChartPrompt", () => {
  test.each([
    ["descendant chart", "", 5, "this profile's descendants"],
    ["show me my descendant chart", "my", 5, "my descendants"],
    ["draw Cook-8721's descendant sunburst", "Cook-8721", 5, "Cook-8721's descendants"],
    ["draw a descendant chart for her with 7 generations", "her", 7, "her descendants"],
    ["show her descendants as a chart", "her", 5, "her descendants"],
    ["visualize my descendants", "my", 5, "my descendants"],
    ["descendants wheel of 12 generations", "", 10, "this profile's descendants"],
  ])("%s", (prompt, owner, generations, descendantPrompt) => {
    expect(parseDescendantChartPrompt(prompt)).toEqual({ owner, generations, descendantPrompt });
  });

  test.each(["show me my descendants", "who are her descendants", "how many descendants does she have", "fan chart"])("declines %s", (prompt) => {
    expect(parseDescendantChartPrompt(prompt)).toBeNull();
  });
});

const people = {
  1: { Id: 1, Name: "Root-1", RealName: "Root", LastNameAtBirth: "Root" },
  2: { Id: 2, Name: "Kid-2", RealName: "Younger", LastNameAtBirth: "Root", Father: 1, BirthDate: "1860-00-00" },
  3: { Id: 3, Name: "Kid-1", RealName: "Elder", LastNameAtBirth: "Root", Father: 1, BirthDate: "1850-00-00" },
  4: { Id: 4, Name: "Spouse-1", RealName: "Spouse", LastNameAtBirth: "Other" },
  5: { Id: 5, Name: "Grand-1", RealName: "Grand", LastNameAtBirth: "Other", Father: 4, Mother: 3 },
  // A cousin marriage: both parents are descendants; placed once, by the shortest line.
  6: { Id: 6, Name: "Both-1", RealName: "Both", LastNameAtBirth: "Root", Father: 2, Mother: 5 },
};

describe("buildDescendantTree", () => {
  test("children sorted by birth, each person placed once", () => {
    const tree = buildDescendantTree(people, "Root-1", 5);
    expect(tree.person.wtid).toBe("Root-1");
    expect(tree.children.map((c) => c.person.wtid)).toEqual(["Kid-1", "Kid-2"]);
    expect(tree.children[0].children.map((c) => c.person.wtid)).toEqual(["Grand-1"]);
    const stats = descendantTreeStats(tree);
    expect(stats.total).toBe(4);
    expect(stats.byGeneration).toEqual([
      { generation: 1, count: 2 },
      { generation: 2, count: 2 },
    ]);
  });

  test("generation limit", () => {
    expect(descendantTreeStats(buildDescendantTree(people, 1, 1)).total).toBe(2);
  });

  test("summary", () => {
    const tree = buildDescendantTree(people, 1, 5);
    expect(buildDescendantChartSummary(tree, "Root's", 5)).toBe(
      "Root's descendant chart shows 4 descendants over 5 generations: 2 children, 2 grandchildren. The most common surnames are Root (3), Other (1)."
    );
    expect(buildDescendantChartSummary(buildDescendantTree({ 1: people[1] }, 1, 3), "Your", 3)).toBe(
      "Your descendant chart is empty: no children are recorded on WikiTree."
    );
  });
});

describe("profiles WikiTree doesn't show", () => {
  test("a descendant sent with no name is marked Private", () => {
    const tree = buildDescendantTree({ 1: { Id: 1, Name: "Root-1", RealName: "Root" }, 7: { Id: 7, Father: 1 } }, "Root-1", 3);
    expect(tree.children[0].person).toMatchObject({ name: "Private", hidden: true, wtid: "" });
    expect(tree.person.hidden).toBe(false);
  });
});

describe("buildForest", () => {
  test("hangs each profile under a parent in the set, the rest under the root", () => {
    const { buildForest } = require("./chat_descendant_chart_data");
    const forest = buildForest({ 1: { Id: 1, Name: "A-1", FirstName: "A" }, 2: { Id: 2, Name: "B-1", FirstName: "B", Father: 1 }, 3: { Id: 3, Name: "C-1", FirstName: "C", Father: 9, Mother: 2 } }, "X");
    expect(forest.person.name).toBe("X");
    expect(forest.children.map((n) => n.person.wtid)).toEqual(["A-1"]);
    expect(forest.children[0].children[0].person.wtid).toBe("B-1");
    expect(forest.children[0].children[0].children[0].person.wtid).toBe("C-1");
  });
});

describe("masked start", () => {
  // (Larry Maloney-2333: the descendants request sent him as -2, live 2026-10-04)
  const people = {
    "-2": { Id: -2, Father: 900, Mother: 901 },
    "-1": { Id: -1, Father: -2, Mother: -3 },
    7: { Id: 7, Name: "Maloney-3008", FirstName: "Pat", Gender: "Male", Father: -2, Mother: -3 },
  };
  test("without the plain lookup there's no tree", () => {
    expect(buildDescendantTree(people, "Maloney-2333", 4)).toBeNull();
  });
  test("the plain lookup fills in the masked start", () => {
    const tree = buildDescendantTree(people, "Maloney-2333", 4, { Id: 25091361, Name: "Maloney-2333", FirstName: "Larry", Gender: "Male" });
    expect(tree.person.wtid).toBe("Maloney-2333");
    expect(tree.children).toHaveLength(2);
  });
});
