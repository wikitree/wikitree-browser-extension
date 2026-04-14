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
        [6, "asc"],
        [0, "asc"],
      ]
    );

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
  });
});
