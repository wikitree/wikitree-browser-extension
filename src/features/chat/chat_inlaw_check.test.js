jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => null) }));

import { buildInLawCheckMessage, familyInLaws, inLawsToCheck, missingParents, parseInLawCheckPrompt } from "./chat_inlaw_check";
import { routeChatPrompt, ChatIntent } from "./chat_router";
import { checkLeads } from "./chat_bio_relatives";

describe("parseInLawCheckPrompt", () => {
  test.each([
    ["check my in-laws", { owner: "my", degrees: 5 }],
    ["Check the in-laws for profiles", { owner: "the", degrees: 5 }],
    ["check for in-laws", { owner: "the", degrees: 5 }],
    ["check for profiles for my in-laws", { owner: "my", degrees: 5 }],
    ["check my cousins' spouses on WikiTree", { owner: "my", degrees: 5 }],
    ["check Smith-12's in-laws within 3 degrees", { owner: "Smith-12's", degrees: 3 }],
    ["find my in-laws' families on WikiTree", { owner: "my", degrees: 5 }],
    ["are the in-laws' parents on WikiTree?", { owner: "the", degrees: 5 }],
    ["check her in-laws within 12 degrees", { owner: "her", degrees: 7 }],
  ])("%s", (prompt, expected) => {
    expect(parseInLawCheckPrompt(prompt)).toEqual(expected);
  });

  test.each(["who are my in-laws", "check for profiles", "my sister-in-law", "check my cousins", "how many in-laws do I have"])(
    "declines %s",
    (prompt) => {
      expect(parseInLawCheckPrompt(prompt)).toBeNull();
    }
  );

  test("routes before the in-law rewrites", () => {
    expect(routeChatPrompt("check my in-laws").intent).toBe(ChatIntent.IN_LAW_CHECK);
    expect(routeChatPrompt("Check for profiles").intent).toBe(ChatIntent.FIND_BIO_RELATIVES);
  });
});

describe("familyInLaws", () => {
  // Root 1; parents 2 + 3; sibling 4 married to 10 (in-law); 4's child 5 married to 11; 3's other husband 12
  // (a step-parent: not blood, married to blood). 10's own parent 13 is in the set but isn't married to blood.
  const people = [
    { Id: 1, Father: 2, Mother: 3, Meta: { Degrees: 0 } },
    { Id: 2, Spouses: { 3: {} }, Meta: { Degrees: 1 } },
    { Id: 3, Spouses: { 2: {}, 12: {} }, Meta: { Degrees: 1 } },
    { Id: 4, Father: 2, Mother: 3, Spouses: { 10: {} }, Meta: { Degrees: 1 } },
    { Id: 5, Father: 4, Mother: 10, Spouses: [{ Id: 11 }, { Id: 14, do_not_display: "1" }], Meta: { Degrees: 2 } },
    { Id: 10, Father: 13, Meta: { Degrees: 2 } },
    { Id: 13, Meta: { Degrees: 3 } },
  ];

  test("blood is the ancestors and their descendants; spouses not blood are in-laws, nearest first", () => {
    const { blood, inLaws } = familyInLaws(people, 1);
    expect([...blood].sort()).toEqual(["1", "2", "3", "4", "5"]);
    expect(inLaws).toEqual([
      { id: "10", partnerId: "4", partnerDegrees: 1 },
      { id: "12", partnerId: "3", partnerDegrees: 1 },
      { id: "11", partnerId: "5", partnerDegrees: 2 },
    ]);
  });

  test("picks the in-laws with a parent missing, both missing first", () => {
    const { inLaws } = familyInLaws(people, 1);
    const byId = new Map([
      ["10", { Name: "Jones-1", Father: 13, Mother: 0 }],
      ["11", { Name: "Brown-2", Father: 0, Mother: 0 }],
      ["12", { Name: "Gray-3", Father: 7, Mother: 8 }],
    ]);
    const { picked, total } = inLawsToCheck(inLaws, byId);
    expect(total).toBe(2);
    expect(picked.map((entry) => [entry.id, entry.missing])).toEqual([
      ["11", "parents"],
      ["10", "mother"],
    ]);
    expect(missingParents({ Father: 1, Mother: 2 })).toBe("");
  });
});

describe("checkLeads and the message", () => {
  test("unattached relatives with a possible match, and likely duplicates", () => {
    const leads = checkLeads({
      results: [
        {
          relative: { role: "father", given: ["John"], surnames: ["Jones"], gender: "Male" },
          candidates: [{ profile: { Name: "Jones-45", FirstName: "John", LastNameAtBirth: "Jones" }, score: 82 }],
        },
        { relative: { role: "sibling", given: ["Ann"], surnames: ["Jones"], gender: "Female" }, candidates: [{ profile: { Name: "Jones-9" }, score: 30 }] },
        { relative: { role: "mother", given: ["Mary"], surnames: ["Jones"] }, attached: { profile: {} }, candidates: [] },
      ],
      duplicates: { likely: [{ wtId: "Jones-99", name: "Mary Jones", score: 78 }] },
    });
    expect(leads).toEqual({
      found: [{ relative: "Father John Jones", matches: ["Jones-45 John Jones (82%)"] }],
      duplicates: ["Jones-99 Mary Jones (78%)"],
    });

    const message = buildInLawCheckMessage(
      [
        { label: "Mary Jones (Jones-1)", partnerLabel: "Tom Smith (Smith-4)", missing: "parents", ...leads },
        { label: "Ann Brown (Brown-2)", partnerLabel: "Bob Smith (Smith-5)", missing: "mother", found: [], duplicates: [], noBio: true },
        { label: "Joe Gray (Gray-3)", partnerLabel: "Bob Smith (Smith-5)", missing: "father", found: [], duplicates: [] },
        { label: "Al Hill (Hill-3)", partnerLabel: "Bob Smith (Smith-5)", missing: "father", found: [], duplicates: [], failed: true },
      ],
      { whose: "your", degrees: 5, inLawCount: 9, gapCount: 6, capped: 2 }
    );
    expect(message).toContain("Your family within 5 degrees has 9 people married into it; 6 of them have a parent missing");
    expect(message).toContain("**Mary Jones (Jones-1)**, married to Tom Smith (Smith-4) (no parents on WikiTree)");
    expect(message).toContain("- Father John Jones: may be Jones-45 John Jones (82%)");
    expect(message).toContain("- Possible duplicate: Jones-99 Mary Jones (78%)");
    expect(message).toContain("**No matches found:** Joe Gray (Gray-3)");
    expect(message).toContain("**No parents or siblings named in the biography:** Ann Brown (Brown-2)");
    expect(message).toContain("**Couldn't check:** Al Hill (Hill-3)");
    expect(message).toContain("2 more people with a parent missing weren't checked");
  });
});
