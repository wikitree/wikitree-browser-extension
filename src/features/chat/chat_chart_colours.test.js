jest.mock("d3-scale-chromatic", () => ({
  interpolateSpectral: (t) => `spectral ${t.toFixed(2)}`,
  schemeTableau10: ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"],
}));

import { interpolateSpectral, schemeTableau10 } from "d3-scale-chromatic";
import { birthYearColouring, countValues, topValueColouring } from "./chat_chart_colours";

// The colourings the fan chart, descendant chart, spiral and fractal tree each had a copy of (2026-10-13).
test("birthYearColouring: oldest to newest along the scale, the legend in bands", () => {
  const byYear = birthYearColouring([1812, null, 1860, 1931]);
  expect(byYear.colourOf(1812)).toBe(interpolateSpectral(0));
  expect(byYear.colourOf(1931)).toBe(interpolateSpectral(1));
  expect(byYear.colourOf(null)).toBe("#d9d9d9");
  expect([byYear.keyOf(1812), byYear.keyOf(1860), byYear.keyOf(null)]).toEqual(["1800", "1850", "Unknown"]);
  expect(byYear.legend.map((item) => item.label)).toEqual(["1800–1849", "1850–1899", "1900–1949", "No birth year"]);
  expect(byYear.legend[0].colour).toBe(byYear.colourOf(1825));

  const quarters = birthYearColouring([1801, 1849], { span: 25, colourAt: (t) => `t${t.toFixed(2)}`, unknown: "#ccc" });
  expect(quarters.legend).toEqual([
    { key: "1800", label: "1800–1824", colour: "t0.23" },
    { key: "1825", label: "1825–1849", colour: "t0.75" },
    { key: "Unknown", label: "No birth year", colour: "#ccc" },
  ]);
  expect(birthYearColouring([null]).legend.map((item) => item.key)).toEqual(["Unknown"]);
});

test("topValueColouring: the commonest in colour, the rest grey Other", () => {
  const values = ["Devon", "Devon", "Kent", "", ..."ABCDEFGHI".split("")];
  const byPlace = topValueColouring(countValues(values), { unknownLabel: "No birthplace" });
  expect(byPlace.legend.map((item) => item.label)).toEqual(["Devon (2)", "A (1)", "B (1)", "C (1)", "D (1)", "E (1)", "F (1)", "G (1)", "H (1)", "Other (2)", "No birthplace"]);
  expect([byPlace.colourOf("Devon"), byPlace.colourOf("Kent"), byPlace.colourOf("")]).toEqual([schemeTableau10[0], "#9c9c9c", "#d9d9d9"]);
  expect([byPlace.keyOf("A"), byPlace.keyOf("Kent"), byPlace.keyOf(undefined)]).toEqual(["A", "Other", "Unknown"]);

  const surnames = topValueColouring([["Smith", 3], ["Cook", 1]], { top: 1, unknownLabel: "No surname", otherLabel: (kinds, people) => `${kinds} other surnames (${people})` });
  expect(surnames.legend.map((item) => item.label)).toEqual(["Smith (3)", "1 other surnames (1)", "No surname"]);
  expect(topValueColouring(new Map([["Kent", 1]]), { unknownLabel: "?" }).legend.map((item) => item.key)).toEqual(["Kent", "Unknown"]);
});
