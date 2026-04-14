import {
  DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION,
  MAX_SUPPORTED_COUSIN_DEGREE,
  formatCousinLabel,
  parseCousinRelationRequest,
  selectPeopleAtMinimalSharedGeneration,
} from "./chat_cousin_helpers";

describe("chat_cousin_helpers parsing", () => {
  test("parses cousin degree with birth-location filter", () => {
    expect(parseCousinRelationRequest("third cousins born in England")).toEqual({
      cousinDegree: 3,
      relationLabel: "3rd cousins",
      location: "England",
      locationField: "BirthLocation",
    });
  });

  test("parses numeric ordinal cousin label", () => {
    expect(parseCousinRelationRequest("9th cousin")).toEqual({
      cousinDegree: 9,
      relationLabel: "9th cousins",
      location: "",
      locationField: "",
    });
  });

  test("parses plain cousins as all cousins through the supported range", () => {
    expect(parseCousinRelationRequest("cousins born in England")).toEqual({
      allCousins: true,
      maxAncestorGeneration: DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION,
      relationLabel: "cousins",
      location: "England",
      locationField: "BirthLocation",
    });
  });

  test("parses cousins with an explicit upper bound", () => {
    expect(parseCousinRelationRequest("cousins up to 6th cousins born in England")).toEqual({
      allCousins: true,
      maxAncestorGeneration: 7,
      relationLabel: "cousins",
      location: "England",
      locationField: "BirthLocation",
    });

    expect(parseCousinRelationRequest("cousins through sixth cousins")).toEqual({
      allCousins: true,
      maxAncestorGeneration: 7,
      relationLabel: "cousins",
      location: "",
      locationField: "",
    });
  });

  test("rejects cousin degrees above current supported limit", () => {
    expect(parseCousinRelationRequest("10th cousins born in England")).toBeNull();
  });

  test("formats cousin labels", () => {
    expect(formatCousinLabel(3, true)).toBe("3rd cousins");
    expect(formatCousinLabel(1, false)).toBe("1st cousin");
  });
});

describe("chat_cousin_helpers selection", () => {
  test("keeps only people whose minimal shared generation matches target and adds removed", () => {
    const subjectKeys = ["User-1"];
    const generationBuckets = [
      {
        generation: 1,
        people: [{ Name: "Sibling-1" }],
      },
      {
        generation: 2,
        people: [
          { Name: "FirstCousin-1", Meta: { Degrees: 4 } },
          { Name: "Sibling-1", Meta: { Degrees: 4 } },
        ],
      },
      {
        generation: 4,
        people: [
          { Name: "ThirdCousin-1", Meta: { Degrees: 4 } },
          { Name: "ThirdCousinOnceRemoved-1", Meta: { Degrees: 5 } },
          { Name: "FirstCousin-1", Meta: { Degrees: 4 } },
          { Name: "User-1", Meta: { Degrees: 4 } },
        ],
      },
    ];

    expect(selectPeopleAtMinimalSharedGeneration(generationBuckets, 4, subjectKeys)).toEqual([
      { Name: "ThirdCousin-1", Meta: { Degrees: 4 }, removed: 0 },
      { Name: "ThirdCousinOnceRemoved-1", Meta: { Degrees: 5 }, removed: 1 },
    ]);
  });
});
