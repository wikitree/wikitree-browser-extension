import {
  buildHouseholdTableFromHousehold,
  looksLikeCensusTableHeaderRow,
  parseCensusWikitable,
} from "./censusTableUtils.js";

const headerlessTable = `{|
| Garry McBride || Head || M || 39
|-
| Ella McBride || Wife || F || 39
|-
| Lester McBride || Son || M || 1
|-
| '''Garry McBride, Jr''' || '''Son''' || '''M''' || '''3'''
|-
| William H Paddock || Boarder || M || 68
|}`;

const tableWithHeader = `{| border="1" cellpadding="4"
|- bgcolor=#E1F0B4
| Name || Sex || Age || Relationship || Birthplace
|-
| Alfred L Forrest || M || 58 || Head || Kentucky
|-
| Ada Forrest || F || 48 || Wife || Kentucky
|-
| '''Irene Forrest''' || '''F''' || '''30''' || '''Daughter''' || '''Kentucky'''
|}`;

// Name, sex, race, age, marital status, relation, occupation, birthplace.
const tableWithRaceColumn = `{|
| Garry V Mcbride || M || White || 54 || Married || Head || || New York
|-
| Ella V Mcbride || F || White || 54 || Married || Wife || || New York
|-
| Buster V Mcbride || M || White || 16 || Single || Son || || New York
|-
| '''Garry V Mcbride''' || '''M''' || '''White''' || '''15''' || '''Single''' || '''Son''' ||  || '''New York'''
|-
| Mary C Lagrange || F || White || 81 || Widowed || Mother-in-law || || New York
|}`;

describe("looksLikeCensusTableHeaderRow", () => {
  test("recognises a row of column labels", () => {
    expect(looksLikeCensusTableHeaderRow("| Name || Sex || Age || Relationship || Birthplace")).toBe(true);
  });

  test("does not mistake the head of the household for a header row", () => {
    expect(looksLikeCensusTableHeaderRow("| Garry McBride || Head || M || 39")).toBe(false);
  });

  test("does not mistake a name-only row for a header row", () => {
    expect(looksLikeCensusTableHeaderRow("| Ella McBride || Wife")).toBe(false);
  });
});

describe("parseCensusWikitable", () => {
  test("keeps the head of the household when the table has no header row", () => {
    const household = parseCensusWikitable(headerlessTable);

    expect(household.map((person) => person.Name)).toEqual([
      "Garry McBride",
      "Ella McBride",
      "Lester McBride",
      "Garry McBride, Jr",
      "William H Paddock",
    ]);
    expect(household[0].originalRelation).toBe("Head");
    expect(household[3].Relation).toBe("Self");
  });

  test("still drops the header row when there is one", () => {
    const household = parseCensusWikitable(tableWithHeader);

    expect(household.map((person) => person.Name)).toEqual(["Alfred L Forrest", "Ada Forrest", "Irene Forrest"]);
    expect(household[0].originalRelation).toBe("Head");
    expect(household[2].Relation).toBe("Self");
  });

  test("normalises the sex column to a full gender word and keeps the original", () => {
    const household = parseCensusWikitable(headerlessTable);

    expect(household[0]).toMatchObject({ Sex: "M", Gender: "Male" });
    expect(household[1]).toMatchObject({ Sex: "F", Gender: "Female" });
  });

  test("reads the birthplace column rather than the race column", () => {
    const household = parseCensusWikitable(tableWithRaceColumn);

    expect(household).toHaveLength(5);
    household.forEach((person) => {
      expect(person.BirthPlace).toBe("New York");
      expect(person.Race).toBe("White");
    });
  });
});

describe("buildHouseholdTableFromHousehold", () => {
  const household = [
    {
      Name: "Garry V Mcbride",
      Relation: "Father",
      MaritalStatus: "Married",
      Sex: "M",
      Gender: "Male",
      Race: "White",
      Age: "54",
      BirthPlace: "New York",
    },
    {
      Name: "Ella V Mcbride",
      Relation: "Mother",
      MaritalStatus: "Married",
      Sex: "F",
      Gender: "Female",
      Race: "White",
      Age: "54",
      BirthPlace: "New York",
    },
    {
      Name: "Garry V Mcbride",
      Relation: "Self",
      originalRelation: "Son",
      MaritalStatus: "Single",
      Sex: "M",
      Gender: "Male",
      Race: "White",
      Age: "15",
      BirthPlace: "New York",
      isMain: true,
    },
  ];

  test("orders the columns and shows the census relation for the profile person", () => {
    const table = buildHouseholdTableFromHousehold(household);

    expect(table.split("\n")[2]).toBe("| Name || Relation || MaritalStatus || Sex || Race || Age || BirthPlace");
    expect(table).toContain("| Garry V Mcbride || Father || Married || M || White || 54 || New York");
    // The profile person's row is bolded and shows "Son", not "Self".
    expect(table).toContain(
      "| '''Garry V Mcbride''' || '''Son''' || '''Single''' || '''M''' || '''White''' || '''15''' || '''New York'''"
    );
  });

  test("does not emit a Gender column alongside Sex, nor a stray LastName column", () => {
    const table = buildHouseholdTableFromHousehold([{ ...household[0], LastName: "Mcbride" }]);

    expect(table).not.toContain("Gender");
    expect(table).not.toContain("LastName");
  });

  test("returns nothing for an empty household", () => {
    expect(buildHouseholdTableFromHousehold([])).toBe("");
    expect(buildHouseholdTableFromHousehold(undefined)).toBe("");
  });
});
