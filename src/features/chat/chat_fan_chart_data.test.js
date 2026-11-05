import { parseFanChartPrompt, buildFanSlots, fanChartStats, fanChartCountries, buildFanChartSummary, fanChartRepeats } from "./chat_fan_chart_data";

describe("parseFanChartPrompt", () => {
  test.each([
    ["fan chart", "", 7, "this profile's ancestors"],
    ["show me my fan chart", "my", 7, "my ancestors"],
    ["Show me a fan chart", "", 7, "this profile's ancestors"],
    ["draw Cook-8721's ancestor fan chart", "Cook-8721", 7, "Cook-8721's ancestors"],
    ["draw a fan chart of her ancestors", "her", 7, "her ancestors"],
    ["show a fan chart for Cook-8721", "Cook-8721", 7, "Cook-8721's ancestors"],
    ["make a fan chart for me with 9 generations", "my", 9, "my ancestors"],
    ["show my ancestors as a fan chart", "my", 7, "my ancestors"],
    ["visualize his ancestors", "his", 7, "his ancestors"],
    ["fan chart of 20 generations", "", 10, "this profile's ancestors"],
    ["can you show me her pedigree fan chart?", "her", 7, "her ancestors"],
  ])("%s", (prompt, owner, generations, ancestorPrompt) => {
    expect(parseFanChartPrompt(prompt)).toEqual({ owner, generations, ancestorPrompt });
  });

  test.each(["show me my ancestors", "who are her ancestors", "what is a fan chart", "fan club members"])("declines %s", (prompt) => {
    expect(parseFanChartPrompt(prompt)).toBeNull();
  });
});

const people = {
  1: { Id: 1, Name: "Root-1", RealName: "Root", Father: 2, Mother: 3, BirthLocation: "Nelson, New Zealand" },
  2: { Id: 2, Name: "Dad-1", RealName: "Dad", Father: 4, Mother: 0, BirthLocation: "Kent, England", BirthDate: "1800-00-00" },
  3: { Id: 3, Name: "Mum-1", RealName: "Mum", Father: 0, Mother: 0, BirthLocation: "Cork, Ireland" },
  4: { Id: 4, Name: "Grandad-1", RealName: "Grandad", BirthLocation: "Devon, England", BirthDate: "0000-00-00" },
};

describe("buildFanSlots", () => {
  test("puts fathers at 2n and mothers at 2n+1", () => {
    const slots = buildFanSlots(people, 1, 2);
    expect(slots).toHaveLength(8);
    expect(slots[1].wtid).toBe("Root-1");
    expect(slots[2].wtid).toBe("Dad-1");
    expect(slots[3].wtid).toBe("Mum-1");
    expect(slots[4].wtid).toBe("Grandad-1");
    expect(slots[5]).toBeNull();
    expect(slots[4].birth).toBe("");
    expect(slots[2].birthCountry).toBe("England");
  });

  test("finds the root by WikiTree ID too", () => {
    expect(buildFanSlots(people, "Root-1", 1)[2].name).toBe("Dad");
  });

  test("stats, countries and summary", () => {
    const slots = buildFanSlots(people, 1, 2);
    expect(fanChartStats(slots)).toEqual({
      rows: [
        { generation: 1, found: 2, possible: 2 },
        { generation: 2, found: 1, possible: 4 },
      ],
      found: 3,
      possible: 6,
      deepest: 2,
    });
    expect(fanChartCountries(slots)).toEqual([
      ["England", 2],
      ["Ireland", 1],
    ]);
    expect(buildFanChartSummary(slots, "Root's")).toBe(
      "Root's fan chart shows 3 of 6 possible ancestors over 2 generations (50%), reaching back 2 generations. Every ancestor is filled in through the parents. Most were born in England (2), Ireland (1)."
    );
  });

  test("empty tree", () => {
    const slots = buildFanSlots({ 1: { Id: 1, Name: "Solo-1" } }, 1, 3);
    expect(buildFanChartSummary(slots, "Your")).toBe("Your fan chart is empty: no parents are recorded on WikiTree.");
  });
});

describe("fanChartRepeats", () => {
  // Root 1; parents 2 & 3 are first cousins: their fathers (4, 6) are brothers, sons of 10 & 11.
  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Dad-2", Father: 4, Mother: 5 },
    3: { Id: 3, Name: "Mum-3", Father: 6, Mother: 7 },
    4: { Id: 4, Name: "Gf-4", Father: 10, Mother: 11 },
    5: { Id: 5, Name: "Gm-5" },
    6: { Id: 6, Name: "Gf-6", Father: 10, Mother: 11 },
    7: { Id: 7, Name: "Gm-7" },
    10: { Id: 10, Name: "Ggf-10", Father: 20 },
    11: { Id: 11, Name: "Ggm-11" },
    20: { Id: 20, Name: "Gggf-20" },
  };
  const slots = buildFanSlots(people, "Root-1", 4);

  test("finds the shared ancestors and where the lines meet", () => {
    const { groups, bySlot, people: count } = fanChartRepeats(slots);
    expect(groups.map((g) => [g.wtid, g.slots, g.start])).toEqual([
      ["Ggf-10", [8, 12], true],
      ["Ggm-11", [9, 13], true],
      ["Gggf-20", [16, 24], false],
    ]);
    expect(bySlot.get(24).wtid).toBe("Gggf-20");
    expect(count).toBe(10);
  });

  test("no repeats in a plain tree", () => {
    const plain = buildFanSlots({ 1: { Id: 1, Name: "A-1", Father: 2 }, 2: { Id: 2, Name: "B-2" } }, "A-1", 3);
    expect(fanChartRepeats(plain).groups).toEqual([]);
  });
});

describe("fanChartSurnames / buildSurnameSummary", () => {
  test("counts each person once, commonest first", () => {
    const slots = new Array(8).fill(null);
    slots[1] = { id: 1, lnab: "Root" };
    slots[2] = { id: 2, lnab: "Smith" };
    slots[3] = { id: 3, lnab: "Jones" };
    slots[4] = { id: 4, lnab: "Smith" };
    slots[5] = { id: 5, lnab: "Brown" };
    slots[6] = { id: 4, lnab: "Smith" }; // the same person twice
    slots[7] = { id: 7, lnab: "" };
    const { fanChartSurnames, buildSurnameSummary } = require("./chat_fan_chart_data");
    expect(fanChartSurnames(slots)).toEqual([["Smith", 2], ["Brown", 1], ["Jones", 1]]);
    expect(buildSurnameSummary(slots, "Your")).toMatch(/^Your ancestors carry 3 surnames over 2 generations\. The most common: Smith \(2\), Brown \(1\), Jones \(1\)\.\nThe fan chart colours each surname, so you can follow Smith and Jones/);
  });
});

describe("profiles WikiTree doesn't show", () => {
  test("an ancestor sent as just an Id is Private, and counted", () => {
    const slots = buildFanSlots({ 1: { Id: 1, Name: "Root-1", RealName: "Root", Father: 2 }, 2: { Id: 2 } }, "Root-1", 2);
    expect(slots[2]).toMatchObject({ name: "Private", hidden: true, wtid: "" });
    expect(slots[1].hidden).toBe(false);
  });
});
