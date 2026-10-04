jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import {
  buildDnaMapSummary,
  buildConnectedProfilesAnswer,
  buildConnectedTestsAnswer,
  buildDnaTakerAnswer,
  buildHaplogroupAnswer,
  parseDnaPrompt,
  dnaTypesFromTestSlugs,
  buildNoDnaMapTestAnswer,
  pickTakerTest,
} from "./chat_dna";

// Shapes from the live API (Whitten-1, the docs' example), 2026-10-03.
const tests = [
  { dna_id: "1", dna_name: "23andMe", dna_type: "auDNA", haplo: "R1b1b2a1a1*", haplom: "U5a1a1", markers: "0", ftdna: "SECRET-KIT" },
  { dna_id: "7", dna_name: "FamilyTreeDNA Mitochondrial", dna_type: "mtDNA", haplo: "", haplom: "U5a1a1aj", markers: "0" },
  { dna_id: "8", dna_name: "FamilyTreeDNA Y-Chromosome", dna_type: "yDNA", haplo: "R-FTJ31860", haplom: "", markers: "838", gedmatch: "SECRET-GED" },
];

describe("DNA questions", () => {
  test.each([
    ["what DNA tests has Whitten-1 taken?", { kind: "taker", owner: "Whitten-1" }],
    ["has she taken a DNA test?", { kind: "taker", owner: "" }],
    ["what is my Y-DNA haplogroup?", { kind: "haplogroup", owner: "me", dnaType: "yDNA" }],
    ["what is her mtDNA haplogroup?", { kind: "haplogroup", owner: "", dnaType: "mtDNA" }],
    ["what are Whitten-1's haplogroups?", { kind: "haplogroup", owner: "Whitten-1" }],
    ["what DNA tests are connected to this profile?", { kind: "connectedTests", owner: "" }],
    ["is she DNA confirmed?", { kind: "connectedTests", owner: "" }],
    ["which profiles are connected to Whitten-1's yDNA test?", { kind: "connectedProfiles", owner: "Whitten-1", dnaType: "yDNA" }],
  ])("%s", (prompt, params) => {
    expect(parseDnaPrompt(prompt)).toEqual(params);
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.DNA, params });
  });

  test.each(["Anderson mtDNA", "what is DNA?", "which profiles are connected to my DNA test?"])("declines %s", (prompt) =>
    expect(parseDnaPrompt(prompt)).toBeNull()
  );

  test("answers never show kit numbers", () => {
    const taker = buildDnaTakerAnswer(tests, "Whitten-1");
    expect(taker).toMatch(/^Whitten-1 has 3 DNA tests recorded on WikiTree:/);
    expect(taker).toMatch(/FamilyTreeDNA Y-Chromosome \(Y-DNA\), Y haplogroup R-FTJ31860, 838 markers/);
    expect(taker).not.toMatch(/SECRET/);
    expect(buildHaplogroupAnswer(tests, "Whitten-1", "yDNA")).toBe(
      "Whitten-1 (different tests report them to different depths):\n- Y-DNA haplogroup: R1b1b2a1a1*, R-FTJ31860"
    );
    expect(buildHaplogroupAnswer([], "Cook-8721")).toMatch(/no DNA tests recorded/);
    // Moloney-741's shape (live): many tests, several per taker.
    expect(
      buildConnectedTestsAnswer(
        [
          { dna_name: "AncestryDNA", dna_type: "auDNA", taker: { Name: "Dumas-968" } },
          { dna_name: "AncestryDNA", dna_type: "auDNA", taker: { Name: "Maloney-2332" } },
          { dna_name: "FamilyTreeDNA Family Finder", dna_type: "auDNA", taker: { Name: "Maloney-2332" } },
          { dna_name: "FamilyTreeDNA Y-Chromosome", dna_type: "yDNA", taker: { Name: "Maloney-2332" } },
        ],
        "Moloney-741"
      )
    ).toBe(
      "4 DNA tests are connected to Moloney-741, from 2 test-takers:\nY-DNA (1):\n- FamilyTreeDNA Y-Chromosome: Maloney-2332\nautosomal DNA (3):\n- AncestryDNA: Dumas-968, Maloney-2332\n- FamilyTreeDNA Family Finder: Maloney-2332"
    );
    expect(buildConnectedTestsAnswer([], "Cook-8721")).toBe("No DNA tests are connected to Cook-8721 on WikiTree.");
    expect(pickTakerTest(tests, "yDNA").dna_id).toBe("8");
    expect(buildConnectedProfilesAnswer([{ Name: "Whitten-1205" }, { Name: "Whitten-692" }], "Whitten-1", tests[2])).toBe(
      "2 profiles are connected to Whitten-1's FamilyTreeDNA Y-Chromosome (Y-DNA):\n- Whitten-1205\n- Whitten-692"
    );
  });
});

describe("DNA map", () => {
  test.each([
    ["map of the profiles connected to my Y-DNA test", "me", "yDNA"],
    ["Maloney-2332's Y-DNA match map", "Maloney-2332", "yDNA"],
    ["where are her mtDNA connections from", "", "mtDNA"],
    ["map his Y-DNA connections", "", "yDNA"],
    // (a name, live 2026-10-04: this went to the AI, which wrote words instead of a map)
    ["map of the profiles connected to Murray's Y-DNA test", "Murray", "yDNA"],
    ["Murray Maloney's Y-DNA map", "Murray Maloney", "yDNA"],
  ])("%s", (prompt, owner, dnaType) => {
    expect(parseDnaPrompt(prompt)).toEqual({ kind: "map", owner, dnaType });
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.DNA);
  });
  test("a map needs a test type", () => {
    expect(parseDnaPrompt("map of the profiles connected to my DNA test")).toBeNull();
  });
  test("summary: count, places, surnames, earliest", () => {
    const people = [
      { name: "William", wtid: "Moloney-741", lnab: "Moloney", birth: "1760-00-00", birthLocation: "Ireland" },
      { name: "Larry", wtid: "Maloney-2333", lnab: "Maloney", birth: "1919-07-02", birthLocation: "Montreal" },
      { name: "Sid", wtid: "Maloney-9", lnab: "Maloney", birth: "", birthLocation: "" },
    ];
    const migration = { places: [{ key: "Ireland", count: 1 }, { key: "Montréal", count: 1 }], unplaced: 1 };
    const text = buildDnaMapSummary(people, "Maloney-2332", { dna_name: "Big Y-700", dna_type: "yDNA" }, migration);
    expect(text).toBe(
      [
        "3 profiles are connected to Maloney-2332's Big Y-700 (Y-DNA).",
        "Born in 2 places (1 with no birthplace): Ireland (1), Montréal (1).",
        "Surnames: Maloney (2), Moloney (1).",
        "Earliest: William (Moloney-741), born 1760 in Ireland.",
      ].join("\n")
    );
  });
});

describe("no test to map", () => {
  test("says so and offers who could take one", () => {
    const answer = buildNoDnaMapTestAnswer("Beacall-6", "yDNA");
    expect(answer.message).toMatch(/^Beacall-6 has no Y-DNA test recorded on WikiTree, and none is connected/);
    expect(answer.actions[0]).toMatchObject({ actionType: "send-prompt", prompt: "who could take a DNA test for Beacall-6" });
  });
});

describe("the page's DNA tested box", () => {
  test("reads the test types from the links' slugs", () => {
    // (Murray Maloney-2332's box, pasted by the user 2026-10-04)
    const types = dnaTypesFromTestSlugs(["ancestry_audna", "ftdna_audna", "ftdna_mtdna", "ftdna_ydna", "other_audna"]);
    expect([...types].sort()).toEqual(["auDNA", "mtDNA", "yDNA"]);
    expect(dnaTypesFromTestSlugs([]).size).toBe(0);
  });
});
