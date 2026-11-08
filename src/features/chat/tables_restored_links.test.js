import { buildResultsTableHtml, makeStandardProfileTable } from "./tables";

// Genie keeps its history in sessionStorage as JSON, which drops render functions. A table
// reopened after closing and reopening Genie lost its WT ID links (the user, 2026-11-08).
describe("a table restored from storage keeps its links", () => {
  const rows = [
    {
      wtid: "Ruth-1",
      firstName: "George",
      lnab: "Ruth",
      spouse: "Helen Woodford",
      spouseList: [{ wtid: "Woodford-12", firstName: "Helen", lnab: "Woodford" }],
    },
  ];
  const table = makeStandardProfileTable("Profile search: Babe Ruth", rows);
  const restored = JSON.parse(JSON.stringify(table));

  test("the stored table has lost its render functions", () => {
    expect(restored.columns.some((column) => typeof column.render === "function")).toBe(false);
  });

  test("WT ID and spouse cells link as they did before storage", () => {
    const html = buildResultsTableHtml(restored);
    expect(html).toContain('href="https://www.wikitree.com/wiki/Ruth-1"');
    expect(html).toContain('href="https://www.wikitree.com/wiki/Woodford-12"');
    expect(html).toBe(buildResultsTableHtml(table));
  });

  test("a column the storage can't explain stays plain, escaped text", () => {
    const html = buildResultsTableHtml({ columns: [{ title: "Note", key: "note" }], rows: [{ note: "<b>x</b>" }] });
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
