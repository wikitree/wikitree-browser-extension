import { ancestorWord, tableFromLifespanRows, tableFromSlots, tableFromTree } from "./chat_chart_table";

const person = (wtid, name, lnab, gender, birth = "") => ({ wtid, name, lnab, gender, birth, death: "", birthLocation: "Wem, Shropshire" });

describe("chart tables", () => {
  test("ancestor words", () => {
    expect([1, 2, 3, 5].map((generation) => ancestorWord(generation, "Female"))).toEqual(["Mother", "Grandmother", "Great-grandmother", "3x great-grandmother"]);
  });

  test("fan slots: Ahnen, relation, first name without the surname", () => {
    const slots = [null, person("A-1", "Ann Smith", "Smith", "Female"), person("B-2", "Bob Smith", "Smith", "Male"), null, person("C-3", "Carl Jones", "Jones", "Male")];
    const table = tableFromSlots("Your ancestors", slots);
    expect(table.columns.map((column) => column.title)).toEqual(["Ahnen", "Relation", "WT ID", "First Name", "Last Name", "Birth", "Death", "Birth Location"]);
    expect(table.rows.map((row) => [row.ahnen, row.relation, row.firstName])).toEqual([
      [1, "Self", "Ann"],
      [2, "Father", "Bob"],
      [4, "Grandfather", "Carl"],
    ]);
    expect(table.rows[0].displayName).toBe("Ann Smith");
  });

  test("descendant tree, generation by generation", () => {
    const tree = { person: person("A-1", "Ann", "Smith", "Female"), children: [{ person: person("D-1", "Dan", "Smith", "Male"), children: [{ person: { ...person("", "Private", "", ""), hidden: true }, children: [] }] }] };
    const table = tableFromTree("Her descendants", tree);
    expect(table.rows.map((row) => row.relation)).toEqual(["Self", "Son", "Grandchild"]);
    expect(table.rows[2].hidden).toBe(true);
  });

  test("lifespan rows keep relation and fall back to the chart's years", () => {
    const table = tableFromLifespanRows("Close family", [{ ...person("A-1", "Ann", "", "Female"), relation: "Mother", start: 1850, end: 1900, endKnown: true }]);
    expect(table.rows[0]).toMatchObject({ relation: "Mother", birth: "1850", death: "1900" });
  });
});
