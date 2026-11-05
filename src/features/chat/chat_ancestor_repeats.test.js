jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { ancestorCousinCouples, ancestorRepeats, asksAboutRepeats, buildAncestorRepeatsLine, buildAncestorSummaryMessage, buildCousinCouplesAnswer, cousinRelation } from "./chat_ancestor_depth";
import { routeChatPrompt } from "./chat_router";

const row = (id, ahnen, degrees, fatherId = "", motherId = "") => ({ profileId: id, wtid: `P-${id}`, displayName: `Person ${id}`, ahnen, degrees, fatherId, motherId });

// The parents (1, 2) are first cousins: their grandparents 7 and 8 are shared.
const cousins = [
  row("1", 2, 1, "3", "4"),
  row("2", 3, 1, "5", "6"),
  row("3", 4, 2, "7", "8"),
  row("4", 5, 2),
  row("5", 6, 2, "7", "8"),
  row("6", 7, 2),
  row("7", 8, 3),
  row("8", 9, 3),
];

describe("repeated ancestors", () => {
  test("a cousin marriage puts the shared grandparents in two places each", () => {
    const { repeated, slots } = ancestorRepeats(cousins);
    expect(repeated.map((entry) => [entry.row.profileId, entry.places])).toEqual([["7", 2], ["8", 2]]);
    expect(slots).toBe(10);
  });
  test("places add up down the lines", () => {
    // 9 is the parent of both 7 and 8, so 4 places.
    const rows = [...cousins.slice(0, 6), row("7", 8, 3, "9"), row("8", 9, 3, "9"), row("9", 16, 4)];
    expect(ancestorRepeats(rows).repeated[0]).toMatchObject({ row: { profileId: "9" }, places: 4 });
  });
  test("the line", () => {
    expect(buildAncestorRepeatsLine(cousins)).toBe(
      "2 of them are repeats, reached by more than one line (cousins who married), so the 8 people fill 10 places in the pedigree. The most repeated is Person 7 (P-7), in 2 places."
    );
    const plain = [row("1", 2, 1), row("2", 3, 1)];
    expect(buildAncestorRepeatsLine(plain)).toBe("");
    expect(buildAncestorRepeatsLine(plain, { asked: true })).toMatch(/^None of them is a repeat/);
  });
  test("the summary says it", () => {
    expect(buildAncestorSummaryMessage(cousins, { subject: "Ted has", ownerText: "Ted's" })).toContain("2 of them are repeats");
  });
});

describe("routing", () => {
  test.each(["how many direct ancestors does he have? how many are repeats?", "how many of his ancestors appear more than once?", "are any of my ancestors repeated?"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe("ancestorList");
    expect(routed.params).toMatchObject({ pick: "summary", generation: 25, repeats: true });
  });
});

// (imagined Z4, 2026-10-18)
describe("cousins who married", () => {
  test("the couple, how they were related, and through whom", () => {
    expect(ancestorCousinCouples(cousins).map((c) => [c.father.profileId, c.mother.profileId, c.relation, c.ancestor.profileId])).toEqual([["1", "2", "first cousins", "7"]]);
    expect(buildAncestorRepeatsLine(cousins, { asked: true })).toMatch(
      /in 2 places\.\nThe couple who were related:\n- Person 1 \(P-1\) and Person 2 \(P-2\), first cousins \(through Person 7 \(P-7\)\)$/
    );
    // (not asked: the line as before)
    expect(buildAncestorRepeatsLine(cousins)).not.toMatch(/couple/);
  });
  test.each([
    [2, 2, "first cousins"],
    [3, 3, "second cousins"],
    [3, 4, "second cousins once removed"],
    [1, 1, "brother and sister"],
  ])("cousinRelation(%i, %i)", (up1, up2, name) => {
    expect(cousinRelation(up1, up2)).toBe(name);
  });
  test.each(["did any of my ancestors marry their cousin", "cousin marriages in my tree", "cousin marriages in my family tree", "which of my ancestors married a first cousin"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe("ancestorList");
    expect(routed.params).toMatchObject({ pick: "cousinCouples", repeats: true });
  });
  test("married twice is not a repeat", () => {
    expect(asksAboutRepeats("who married twice among my ancestors")).toBe(false);
    expect(asksAboutRepeats("which of my ancestors remarried")).toBe(false);
    expect(asksAboutRepeats("which of my ancestors appear twice")).toBe(true);
  });
});

// "Did any of his ancestors marry a cousin?" led with ancestor counts and a table of every ancestor (the user, 2026-10-18)
describe("the cousin-marriage question", () => {
  test("routes to the couples, not the summary", () => {
    expect(routeChatPrompt("did any of his ancestors marry their cousin").params).toMatchObject({ pick: "cousinCouples" });
    expect(routeChatPrompt("how many ancestors does he have? did any marry their cousin?").params).toMatchObject({ pick: "summary", repeats: true });
    expect(routeChatPrompt("how many of his ancestors appear more than once?").params).toMatchObject({ pick: "summary" });
  });
  test("leads with the answer and the couples", () => {
    const { message, couples } = buildCousinCouplesAnswer(cousins, { ownerText: "Ted's" });
    expect(couples).toHaveLength(1);
    expect(message).toBe(
      "Yes. One couple among Ted's 8 known ancestors on WikiTree was close cousins (third cousins or closer).\nThe couple:\n" +
        "- Parents: Person 1 (P-1) and Person 2 (P-2), first cousins (through Person 7 (P-7))"
    );
    expect(buildCousinCouplesAnswer([row("1", 2, 1), row("2", 3, 1)], { ownerText: "Your" }).message).toBe(
      "No. None of your 2 known ancestors on WikiTree married a relative: no ancestor appears in more than one line."
    );
  });
});

// "13th cousins twice removed" isn't what "married a cousin" means (2026-10-18)
test("only distant cousins: says no close ones, and how many distant", () => {
  // The parents' nearest shared ancestor is 5 generations up each side: fourth cousins.
  const rows = [row("1", 2, 1, "3"), row("2", 3, 1, "4"), row("3", 4, 2, "5"), row("4", 6, 2, "6"), row("5", 8, 3, "7"), row("6", 12, 3, "8"),
    row("7", 16, 4, "9"), row("8", 24, 4, "9"), row("9", 32, 5)];
  const { message, couples } = buildCousinCouplesAnswer(rows, { ownerText: "Your" });
  expect(couples[0]).toMatchObject({ relation: "third cousins", close: true });
  const deeper = [row("1", 2, 1, "3"), row("2", 3, 1, "4"), row("3", 4, 2, "5"), row("4", 6, 2, "6"), row("5", 8, 3, "7"), row("6", 12, 3, "8"),
    row("7", 16, 4, "9"), row("8", 24, 4, "10"), row("9", 32, 5, "11"), row("10", 48, 5, "11"), row("11", 64, 6)];
  const far = buildCousinCouplesAnswer(deeper, { ownerText: "Your" });
  expect(far.couples[0]).toMatchObject({ relation: "fourth cousins", close: false });
  expect(far.message).toMatch(/^No close cousins: none of the couples among your 11 known ancestors on WikiTree were third cousins or closer\.\n1 couple was more distant cousins/);
  expect(message).toMatch(/^Yes\. One couple/);
});
