import {
  buildSpousalAgeGapMatches,
  formatSpousalAgeGapThreshold,
  isLikelySpousalAgeGapPrompt,
  parseSpousalAgeGapPrompt,
} from "./chat_spouse_age_gap_filter";

describe("chat_spouse_age_gap_filter prompt parsing", () => {
  test("parses spousal age gap prompt with decade scope", () => {
    const result = parseSpousalAgeGapPrompt("Lancashire 1800s Large spousal age gaps (> 20 years)");

    expect(result).toEqual({
      locationText: "Lancashire",
      startYear: 1800,
      endYear: 1809,
      yearLabel: "1800s",
      minGapYears: 20,
      inclusive: false,
      thresholdLabel: "over 20 years",
      understood: "Lancashire 1800s profiles with spousal age gaps over 20 years",
    });
  });

  test("detects spouse-gap prompts", () => {
    expect(isLikelySpousalAgeGapPrompt("Lancashire 1800s Large spousal age gaps (> 20 years)")).toBe(true);
    expect(isLikelySpousalAgeGapPrompt("Shropshire born 1800-1850 when parent was under 14 or over 70")).toBe(false);
  });

  test("formats gap threshold label", () => {
    expect(formatSpousalAgeGapThreshold(20)).toBe("over 20 years");
    expect(formatSpousalAgeGapThreshold(20, true)).toBe("at least 20 years");
  });
});

describe("chat_spouse_age_gap_filter match building", () => {
  test("finds spouse pairs with large age gaps and dedupes mirrored pairs", () => {
    const people = [
      {
        Id: 1,
        Name: "Alpha-1",
        BirthDate: "1801-01-01",
        Spouses: {
          2: { Id: 2, Name: "Beta-2" },
        },
      },
      {
        Id: 2,
        Name: "Beta-2",
        BirthDate: "1828-01-01",
        Spouses: {
          1: { Id: 1, Name: "Alpha-1" },
        },
      },
      {
        Id: 3,
        Name: "Gamma-3",
        BirthDate: "1802-01-01",
        Spouses: {
          4: { Id: 4, Name: "Delta-4" },
        },
      },
    ];
    const spousesById = {
      2: { Id: 2, Name: "Beta-2", BirthDate: "1828-01-01" },
      4: { Id: 4, Name: "Delta-4", BirthDate: "1815-01-01" },
    };

    const matches = buildSpousalAgeGapMatches(people, spousesById, {
      minGapYears: 20,
      inclusive: false,
    });

    expect(matches).toEqual([
      {
        profileId: "1",
        profileWtId: "Alpha-1",
        profileBirthYear: 1801,
        spouseId: "2",
        spouseWtId: "Beta-2",
        spouseBirthYear: 1828,
        ageGap: 27,
        olderPartner: "Alpha-1",
        matchedThreshold: "over 20 years",
      },
    ]);
  });
});
