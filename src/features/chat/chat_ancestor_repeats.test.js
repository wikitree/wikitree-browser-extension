jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { ancestorRepeats, buildAncestorRepeatsLine, buildAncestorSummaryMessage } from "./chat_ancestor_depth";
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
