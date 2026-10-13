import { normalizeYearValue, parseScopeTerms } from "./chat_filter_scope";

// One reader for the filter searches' place and years (three copies had drifted apart, 2026-10-13).
test.each([
  ["Devon 1850-1860", { locationText: "Devon", startYear: 1850, endYear: 1860, yearLabel: "1850-1860" }],
  ["Devon born 1860-1850", { locationText: "Devon", startYear: 1850, endYear: 1860, yearLabel: "1850-1860" }],
  ["in Devon born between 1850 and 1860", { locationText: "Devon", startYear: 1850, endYear: 1860, yearLabel: "1850-1860" }],
  ['"Devon" between 1850 to 1860', { locationText: "Devon", startYear: 1850, endYear: 1860, yearLabel: "1850-1860" }],
  ["from Devon 1850s", { locationText: "Devon", startYear: 1850, endYear: 1859, yearLabel: "1850s" }],
  ["in Devon", { locationText: "Devon", startYear: null, endYear: null, yearLabel: "" }],
  ["", { locationText: "", startYear: null, endYear: null, yearLabel: "" }],
])("parseScopeTerms(%p)", (text, scope) => {
  expect(parseScopeTerms(text)).toEqual(scope);
});

test("normalizeYearValue", () => {
  expect([normalizeYearValue("1850-03-00"), normalizeYearValue("abt 1850"), normalizeYearValue("0000-00-00"), normalizeYearValue(null)]).toEqual(["1850", "1850", "", ""]);
});
