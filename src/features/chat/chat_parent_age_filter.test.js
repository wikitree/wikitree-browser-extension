import {
  buildParentAgeAtBirthMatches,
  formatParentAgeAtBirthBounds,
  isLikelyParentAgeAtBirthPrompt,
  parseParentAgeAtBirthPrompt,
} from "./chat_parent_age_filter";

describe("chat_parent_age_filter prompt parsing", () => {
  test("parses parent-age prompt with leading location", () => {
    const result = parseParentAgeAtBirthPrompt("Cheshire Child born when parent was under 14 or over 70");

    expect(result).toEqual({
      locationText: "Cheshire",
      role: "parent",
      roleKeys: ["Father", "Mother"],
      underAge: 14,
      overAge: 70,
      startYear: null,
      endYear: null,
      boundsLabel: "under 14 or over 70",
      understood: "Cheshire children born when parent was under 14 or over 70",
    });
  });

  test("parses parent-age prompt with location and birth range prefix", () => {
    const result = parseParentAgeAtBirthPrompt(
      "Shropshire born 1800-1850 Child born when parent was under 14 or over 70"
    );

    expect(result).toEqual({
      locationText: "Shropshire",
      role: "parent",
      roleKeys: ["Father", "Mother"],
      underAge: 14,
      overAge: 70,
      startYear: 1800,
      endYear: 1850,
      boundsLabel: "under 14 or over 70",
      understood: "Shropshire born 1800-1850 children born when parent was under 14 or over 70",
    });
  });

  test("parses parent-age prompt without repeated child born wording", () => {
    const result = parseParentAgeAtBirthPrompt("Shropshire born 1800-1850 when parent was under 14 or over 70");

    expect(result).toEqual({
      locationText: "Shropshire",
      role: "parent",
      roleKeys: ["Father", "Mother"],
      underAge: 14,
      overAge: 70,
      startYear: 1800,
      endYear: 1850,
      boundsLabel: "under 14 or over 70",
      understood: "Shropshire born 1800-1850 children born when parent was under 14 or over 70",
    });
  });

  test("detects parent-age prompts with born in phrasing", () => {
    expect(isLikelyParentAgeAtBirthPrompt("children born in Staffordshire when mother was under 16")).toBe(true);
    expect(isLikelyParentAgeAtBirthPrompt("Shropshire born 1800-1850 when parent was under 14 or over 70")).toBe(true);
    expect(isLikelyParentAgeAtBirthPrompt("born in Devon")).toBe(false);
  });

  test("formats threshold label", () => {
    expect(formatParentAgeAtBirthBounds(14, 70)).toBe("under 14 or over 70");
    expect(formatParentAgeAtBirthBounds(14, null)).toBe("under 14");
    expect(formatParentAgeAtBirthBounds(null, 70)).toBe("over 70");
  });
});

describe("chat_parent_age_filter match building", () => {
  test("finds parent-age matches using child and parent birth years", () => {
    const children = [
      { Id: 1, Name: "Child-1", BirthDate: "1880-01-01", Father: 10, Mother: 20 },
      { Id: 2, Name: "Child-2", BirthDate: "1912-01-01", Father: 30, Mother: 40 },
      { Id: 3, Name: "Child-3", BirthDate: "1910-01-01", Father: 50, Mother: 60 },
    ];
    const parentsById = {
      10: { Id: 10, Name: "Father-10", BirthDate: "1868-01-01" },
      20: { Id: 20, Name: "Mother-20", BirthDate: "1840-01-01" },
      30: { Id: 30, Name: "Father-30", BirthDate: "1888-01-01" },
      40: { Id: 40, Name: "Mother-40", BirthDate: "1840-01-01" },
      50: { Id: 50, Name: "Father-50", BirthDate: "1890-01-01" },
      60: { Id: 60, Name: "Mother-60", BirthDate: "1892-01-01" },
    };

    const matches = buildParentAgeAtBirthMatches(children, parentsById, {
      roleKeys: ["Father", "Mother"],
      underAge: 14,
      overAge: 70,
    });

    expect(matches).toEqual([
      {
        childId: "1",
        childWtId: "Child-1",
        childBirthYear: 1880,
        parentId: "10",
        parentWtId: "Father-10",
        parentRole: "Father",
        parentBirthYear: 1868,
        parentAgeAtBirth: 12,
        matchedThreshold: "under 14",
      },
      {
        childId: "2",
        childWtId: "Child-2",
        childBirthYear: 1912,
        parentId: "40",
        parentWtId: "Mother-40",
        parentRole: "Mother",
        parentBirthYear: 1840,
        parentAgeAtBirth: 72,
        matchedThreshold: "over 70",
      },
    ]);
  });

  test("supports father-only filtering", () => {
    const matches = buildParentAgeAtBirthMatches(
      [{ Id: 1, Name: "Child-1", BirthDate: "1880-01-01", Father: 10, Mother: 20 }],
      {
        10: { Id: 10, Name: "Father-10", BirthDate: "1800-01-01" },
        20: { Id: 20, Name: "Mother-20", BirthDate: "1868-01-01" },
      },
      { roleKeys: ["Father"], overAge: 70 }
    );

    expect(matches).toEqual([
      {
        childId: "1",
        childWtId: "Child-1",
        childBirthYear: 1880,
        parentId: "10",
        parentWtId: "Father-10",
        parentRole: "Father",
        parentBirthYear: 1800,
        parentAgeAtBirth: 80,
        matchedThreshold: "over 70",
      },
    ]);
  });
});
