import { makeAncestorProfileTable, makeCousinProfileTable, makeStandardProfileTable } from "./tables";

describe("makeStandardProfileTable removed column", () => {
  test("defaults standard profile tables to WT ID ascending", () => {
    const table = makeStandardProfileTable("Relatives", [
      {
        wtid: "Beta-2",
        firstName: "Beta",
        lnab: "Example",
        lastNameCurrent: "",
        degrees: "",
        birth: "",
        death: "",
        birthLocation: "",
        deathLocation: "",
      },
    ]);

    expect(table.defaultOrder).toEqual([[0, "asc"]]);
  });

  test("maps degree-first sort orders for descendants and CC tables", () => {
    const table = makeStandardProfileTable(
      "Descendants",
      [
        {
          wtid: "Beta-2",
          firstName: "Beta",
          lnab: "Example",
          lastNameCurrent: "",
          degrees: 2,
          birth: "",
          death: "",
          birthLocation: "",
          deathLocation: "",
        },
      ],
      [
        [5, "asc"],
        [0, "asc"],
      ]
    );

    expect(table.columns[table.defaultOrder[0][0]].key).toBe("degrees");
    expect(table.defaultOrder).toEqual([
      [4, "asc"],
      [0, "asc"],
    ]);
  });

  test("defaults ancestor profile tables to Ahnen ascending", () => {
    const table = makeAncestorProfileTable("Ancestors", [
      {
        ahnen: 2,
        wtid: "Parent-1",
        firstName: "Parent",
        lnab: "Example",
        lastNameCurrent: "",
        birth: "",
        death: "",
        birthLocation: "",
        deathLocation: "",
      },
    ]);

    expect(table.defaultOrder).toEqual([[0, "asc"]]);
  });

  test("shows removed column when rows include removed values", () => {
    const table = makeStandardProfileTable("Cousins", [
      {
        wtid: "Cousin-1",
        firstName: "Exact",
        lnab: "Cousin",
        lastNameCurrent: "",
        degrees: "",
        removed: 0,
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
      },
      {
        wtid: "Cousin-2",
        firstName: "OnceRemoved",
        lnab: "Cousin",
        lastNameCurrent: "",
        degrees: "",
        removed: 1,
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
      },
    ]);

    expect(table.columns.some((column) => column.key === "removed")).toBe(true);
  });

  test("shows a linked category column when rows include matched categories", () => {
    const table = makeStandardProfileTable("Relatives", [
      {
        wtid: "Soldier-1",
        firstName: "Alice",
        lnab: "Example",
        lastNameCurrent: "",
        degrees: "",
        birth: "",
        death: "",
        birthLocation: "Yorkshire",
        deathLocation: "",
        categoryDisplay: "British Army, World War II",
        categoryPageName: "British_Army,_World_War_II",
      },
    ]);

    const categoryColumn = table.columns.find((column) => column.key === "categoryDisplay");
    expect(categoryColumn).toBeTruthy();
    expect(categoryColumn.render(table.rows[0])).toContain(
      "https://www.wikitree.com/wiki/Category:British_Army%2C_World_War_II"
    );
    expect(categoryColumn.render(table.rows[0])).toContain("British Army, World War II");
  });

  test("uses a cousin ordinal column and omits the degrees column for cousin tables", () => {
    const table = makeCousinProfileTable("Cousins", [
      {
        wtid: "Cousin-1",
        firstName: "Exact",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "3rd",
        removed: 0,
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
      },
    ]);

    expect(table.columns.some((column) => column.key === "cousinOrdinal" && column.title === "#")).toBe(true);
    expect(table.columns.some((column) => column.key === "degrees")).toBe(false);
    expect(table.defaultOrder).toEqual([
      [4, "asc"],
      [5, "asc"],
      [2, "asc"],
      [1, "asc"],
      [0, "asc"],
    ]);
  });

  test("hides removed column when rows do not include removed values", () => {
    const table = makeStandardProfileTable("Relatives", [
      {
        wtid: "Sibling-1",
        firstName: "Sibling",
        lnab: "Tester",
        lastNameCurrent: "",
        degrees: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
      },
    ]);

    expect(table.columns.some((column) => column.key === "removed")).toBe(false);
    expect(table.columns.some((column) => column.key === "categoryDisplay")).toBe(false);
  });
});

describe("makeAncestorProfileTable age at death", () => {
  const rows = [{ ahnen: 2, wtid: "Roosevelt-2", firstName: "James", lnab: "Roosevelt", birth: "1828-07-16", death: "1900-12-08", ageAtDeath: 72 }];

  test("adds an Age at death column after Death, sorted by it (user: 'by age at death' was sorted by Ahnen)", () => {
    const table = makeAncestorProfileTable("Ancestors by age at death", rows, [[7, "desc"], [0, "asc"]], { withAgeAtDeath: true });
    expect(table.columns.map((column) => column.title).slice(5, 9)).toEqual(["Birth", "Death", "Age at death", "Birth Location"]);
    expect(table.columns[table.defaultOrder[0][0]].key).toBe("ageAtDeath");
    expect(table.defaultOrder).toEqual([[7, "desc"], [0, "asc"]]);
  });

  test("no age column unless asked", () => {
    const table = makeAncestorProfileTable("Ancestors", rows);
    expect(table.columns.some((column) => column.key === "ageAtDeath")).toBe(false);
  });
});
