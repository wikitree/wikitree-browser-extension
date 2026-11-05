import {
  buildSiblingBirthGapMatches,
  formatSiblingBirthGapThreshold,
  isLikelySiblingBirthGapPrompt,
  parseSiblingBirthGapPrompt,
} from "./chat_sibling_birth_gap_filter";

describe("chat_sibling_birth_gap_filter prompt parsing", () => {
  test("parses sibling birth-gap prompt with decade scope", () => {
    const result = parseSiblingBirthGapPrompt(
      "Flintshire 1900s siblings with implausibly close birth dates (< 5 months apart)"
    );

    expect(result).toEqual({
      locationText: "Flintshire",
      startYear: 1900,
      endYear: 1909,
      yearLabel: "1900s",
      maxMonths: 5,
      inclusive: false,
      thresholdLabel: "< 5 months apart",
      understood: "Flintshire 1900s profiles with siblings born < 5 months apart",
    });
  });

  test("parses sibling birth-gap prompt with close births wording", () => {
    const result = parseSiblingBirthGapPrompt("Flintshire 1900s siblings with close births < 5 months apart");

    expect(result).toEqual({
      locationText: "Flintshire",
      startYear: 1900,
      endYear: 1909,
      yearLabel: "1900s",
      maxMonths: 5,
      inclusive: false,
      thresholdLabel: "< 5 months apart",
      understood: "Flintshire 1900s profiles with siblings born < 5 months apart",
    });
  });

  test("parses sibling birth-gap prompt with born within wording", () => {
    const result = parseSiblingBirthGapPrompt("Flintshire 1900s siblings born within 5 months of each other");

    expect(result).toEqual({
      locationText: "Flintshire",
      startYear: 1900,
      endYear: 1909,
      yearLabel: "1900s",
      maxMonths: 5,
      inclusive: true,
      thresholdLabel: "within 5 months apart",
      understood: "Flintshire 1900s profiles with siblings born within 5 months apart",
    });
  });

  test("detects sibling birth-gap prompts", () => {
    expect(
      isLikelySiblingBirthGapPrompt("Flintshire 1900s siblings with implausibly close birth dates (< 5 months apart)")
    ).toBe(true);
    expect(isLikelySiblingBirthGapPrompt("Flintshire 1900s siblings with close births < 5 months apart")).toBe(true);
    expect(isLikelySiblingBirthGapPrompt("Flintshire 1900s siblings born within 5 months of each other")).toBe(true);
    expect(isLikelySiblingBirthGapPrompt("Staffordshire 1850-1900 married but no children listed")).toBe(false);
  });

  test("formats threshold label", () => {
    expect(formatSiblingBirthGapThreshold(5)).toBe("< 5 months apart");
    expect(formatSiblingBirthGapThreshold(5, true)).toBe("within 5 months apart");
  });
});

describe("chat_sibling_birth_gap_filter match building", () => {
  test("finds sibling pairs sharing the same mother with implausibly close birth dates", () => {
    const people = [
      { Id: 1, Name: "Alpha-1", BirthDate: "1901-01-15", Father: 10, Mother: 20 },
      { Id: 2, Name: "Beta-2", BirthDate: "1901-05-20", Father: 10, Mother: 20 },
      { Id: 3, Name: "Gamma-3", BirthDate: "1901-07-25", Father: 10, Mother: 21 },
      { Id: 4, Name: "Delta-4", BirthDate: "1901-01-15", Father: 10, Mother: 20 },
      { Id: 5, Name: "Epsilon-5", BirthDate: "1901-11-20", Father: 10, Mother: 20 },
    ];

    const matches = buildSiblingBirthGapMatches(people, {
      maxMonths: 5,
      inclusive: false,
    });

    expect(matches).toEqual([
      {
        profileId: "1",
        profileWtId: "Alpha-1",
        profileBirthDate: "1901-01-15",
        siblingId: "2",
        siblingWtId: "Beta-2",
        siblingBirthDate: "1901-05-20",
        motherId: "20",
        sharedParent: "Both parents",
        gapDays: 125,
        matchedThreshold: "< 5 months apart",
      },
    ]);
  });
});
