import { findFamousRowIndex, profileNotability, rankProfileRowsByName, searchMatchDisplayName } from "./chat_profile_rank";

// The live result for "George Beacall married Margaret" (2026-10-02), in the order
// the name search returned it.
const rows = [
  { wtid: "Bickel-119", firstName: "George", lnab: "Bickel" },
  { wtid: "Buckel-47", firstName: "Georg Anton", lnab: "Buckel" },
  { wtid: "Beacall-48", firstName: "Brian", lnab: "Beacall" },
  { wtid: "Beacall-107", firstName: "George", lnab: "Beacall" },
  { wtid: "Beacall-398", firstName: "George", lnab: "Beacall" },
  { wtid: "Smith-1", firstName: "Mary", lnab: "Jones", lastNameCurrent: "Beacall" },
];

describe("rankProfileRowsByName", () => {
  test("exact surname and first name first, then exact surname, then the rest, keeping order", () => {
    expect(rankProfileRowsByName(rows, { firstName: "George", lastName: "Beacall" }).map((row) => row.wtid)).toEqual([
      "Beacall-107",
      "Beacall-398",
      "Beacall-48",
      "Smith-1",
      "Bickel-119",
      "Buckel-47",
    ]);
  });

  test("first-name matches outrank middle-name matches, for the person and the spouse (live, 2026-10-02)", () => {
    const live = [
      { wtid: "Beacall-107", firstName: "Frederick", middleName: "George", lnab: "Beacall", matchedSpouse: "Margaret" },
      { wtid: "Beacall-398", firstName: "George", lnab: "Beacall", matchedSpouse: "Margaret" },
      { wtid: "Beacall-48", firstName: "Brian", middleName: "George", lnab: "Beacall", matchedSpouse: "Yvonne" },
    ];
    expect(
      rankProfileRowsByName(live, { firstName: "George", lastName: "Beacall", spouseName: "Margaret" }).map(
        (row) => row.wtid
      )
    ).toEqual(["Beacall-398", "Beacall-107", "Beacall-48"]);
  });

  test("no name given: order unchanged", () => {
    expect(rankProfileRowsByName(rows, {})).toBe(rows);
  });
});

// Live getPeople data for "Babe Ruth" (2026-11-08), trimmed.
const ruth1 = {
  Id: 2772,
  Name: "Ruth-1",
  FirstName: "George",
  MiddleName: "Herman",
  RealName: "Babe",
  Nicknames: "The Bambino, Sultan of Swat",
  LastNameAtBirth: "Ruth",
  LastNameCurrent: "Ruth",
  Suffix: "Jr.",
  Templates: [
    { name: "United States", params: [] },
    {
      name: "Notability",
      params: {
        category: "United States of America, Notables",
        text: "Babe Ruth was an American Major League Baseball player, who played for the [[Wikipedia:Boston Red Sox|Boston Red Sox]]. He hit 714 home runs.",
      },
    },
    { name: "Wikidata", params: { Q213812: "" } },
  ],
  Managers: [{ Id: "12574016", Name: "WikiTree-35" }],
};
const ruth90 = {
  Id: 1704695,
  Name: "Ruth-90",
  FirstName: "Carl Selmer",
  RealName: "Carl Selmer",
  Nicknames: "Babe",
  LastNameAtBirth: "Ruth",
  LastNameCurrent: "Ruth",
  Templates: [],
  Managers: [{ Id: "1", Name: "Smith-5" }],
};

describe("Babe Ruth: preferred names, nicknames and notables", () => {
  const rowOf = (person, birth) => ({
    wtid: person.Name,
    firstName: person.FirstName,
    preferredName: person.RealName,
    nicknames: person.Nicknames,
    lnab: person.LastNameAtBirth,
    birth,
    ...profileNotability(person),
  });

  test("a preferred-name match outranks a nickname match, and both outrank a sound-alike", () => {
    const rows = [
      { wtid: "Rudd-1270", firstName: "Madeline", nicknames: "Babe", lnab: "Rudd" },
      rowOf(ruth90, "1902-09-16"),
      rowOf(ruth1, "1895-02-06"),
    ];
    expect(rankProfileRowsByName(rows, { firstName: "Babe", lastName: "Ruth" }).map((row) => row.wtid)).toEqual([
      "Ruth-1",
      "Ruth-90",
      "Rudd-1270",
    ]);
  });

  test("a notable profile goes first among equal name matches, but not above a better name match", () => {
    const plain = { wtid: "Smith-1", firstName: "John", lnab: "Smith" };
    const notable = { wtid: "Smith-2", firstName: "John", lnab: "Smith", notable: true };
    const notableSoundAlike = { wtid: "Smyth-3", firstName: "John", lnab: "Smyth", notable: true };
    expect(
      rankProfileRowsByName([notableSoundAlike, plain, notable], { firstName: "John", lastName: "Smith" }).map(
        (row) => row.wtid
      )
    ).toEqual(["Smith-2", "Smith-1", "Smyth-3"]);
  });

  test("the famous row is pinned first whatever its name score", () => {
    const rows = [{ wtid: "Ruth-90", firstName: "Babe", lnab: "Ruth" }, { wtid: "Blythe-6", firstName: "William", lnab: "Blythe", famous: true }];
    expect(rankProfileRowsByName(rows, { firstName: "Babe", lastName: "Ruth" })[0].wtid).toBe("Blythe-6");
  });

  test("profileNotability reads the Notability template's first sentence, without wiki markup", () => {
    expect(profileNotability(ruth1)).toEqual({
      notable: true,
      note: "Babe Ruth was an American Major League Baseball player, who played for the Boston Red Sox.",
    });
    expect(profileNotability(ruth90)).toEqual({ notable: false, note: "" });
    expect(profileNotability({ Managers: [{ Name: "WikiTree-145" }] })).toEqual({ notable: true, note: "" });
  });

  test("a Notability template about a relative doesn't make the person notable", () => {
    const grandfather = { Templates: [{ name: "Notability", params: { text: "He was the grandfather of [[Lincoln-103|Abraham Lincoln]]." } }] };
    expect(profileNotability(grandfather).notable).toBe(false);
  });

  test("full names show the preferred name, and a nickname only when it was searched for", () => {
    expect(searchMatchDisplayName(ruth1, "Babe")).toBe("George Herman (Babe) Ruth Jr.");
    expect(searchMatchDisplayName(ruth90, "Babe")).toBe('Carl Selmer "Babe" Ruth');
    expect(searchMatchDisplayName(ruth90, "Carl")).toBe("Carl Selmer Ruth");
  });

  test("findFamousRowIndex: Wikidata's ID first, else the one notable row born (and died) in the AI's years", () => {
    const rows = [rowOf(ruth90, "1902-09-16"), { ...rowOf(ruth1, "1895-02-06"), death: "1948-08-16" }];
    expect(findFamousRowIndex(rows, { wtId: "ruth-1" })).toBe(1);
    expect(findFamousRowIndex(rows, { birthYear: 1895, deathYear: 1948 })).toBe(1);
    expect(findFamousRowIndex(rows, { birthYear: 1895, deathYear: 1960 })).toBe(-1);
    // (Ruth-90 isn't notable, so his birth year alone doesn't make him the famous one)
    expect(findFamousRowIndex(rows, { birthYear: 1902 })).toBe(-1);
    expect(findFamousRowIndex(rows, {})).toBe(-1);
  });
});
