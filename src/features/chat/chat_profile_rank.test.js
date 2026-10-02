import { rankProfileRowsByName } from "./chat_profile_rank";

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
