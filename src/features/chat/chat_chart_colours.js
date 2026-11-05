// The birth-year and commonest-value (surname, country) colourings the fan chart, descendant chart,
// spiral and fractal tree share. Each gives colourOf/keyOf for a year or value (empty = unknown) and the
// legend; the chart maps its people to years or values. Keys only need to match between keyOf and legend.

import { interpolateSpectral, schemeTableau10 } from "d3-scale-chromatic";

const UNKNOWN_FILL = "#d9d9d9";
const OTHER_FILL = "#9c9c9c";

/**
 * Birth years as colours along `colourAt` (0 the oldest year found, 1 the newest; red to blue by default),
 * with the legend in `span`-year bands ("1850–1899").
 */
export function birthYearColouring(years, { span = 50, colourAt = interpolateSpectral, unknown = UNKNOWN_FILL } = {}) {
  const found = years.filter(Boolean);
  const min = found.length ? Math.min(...found) : 0;
  const max = found.length ? Math.max(...found) : 0;
  const colourOf = (year) => (year ? colourAt((year - min) / Math.max(1, max - min)) : unknown);
  const bandOf = (year) => Math.floor(year / span) * span;
  const bands = [];
  if (found.length) for (let start = bandOf(min); start <= max; start += span) bands.push(start);
  return {
    colourOf,
    keyOf: (year) => (year ? String(bandOf(year)) : "Unknown"),
    legend: [
      ...bands.map((start) => ({
        key: String(start),
        label: `${start}–${start + span - 1}`,
        colour: colourOf(Math.min(Math.max(start + Math.floor(span / 2), min), max)),
      })),
      { key: "Unknown", label: "No birth year", colour: unknown },
    ],
  };
}

/**
 * The `top` commonest values in their own colours and the rest grey. `counts`: a Map or [[value, count]].
 * `otherLabel(kinds, people)` names the grey ones; it only shows when there are some.
 */
export function topValueColouring(
  counts,
  { top = 9, unknownLabel, unknown = UNKNOWN_FILL, other = OTHER_FILL, otherLabel = (kinds, people) => `Other (${people})` } = {}
) {
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = sorted.slice(0, top);
  const rest = sorted.slice(top);
  const colours = new Map(shown.map(([value], index) => [value, schemeTableau10[index % 10]]));
  const otherPeople = rest.reduce((sum, [, count]) => sum + count, 0);
  return {
    colourOf: (value) => (value ? colours.get(value) || other : unknown),
    keyOf: (value) => (value ? (colours.has(value) ? value : "Other") : "Unknown"),
    legend: [
      ...shown.map(([value, count]) => ({ key: value, label: `${value} (${count})`, colour: colours.get(value) })),
      ...(otherPeople ? [{ key: "Other", label: otherLabel(rest.length, otherPeople), colour: other }] : []),
      { key: "Unknown", label: unknownLabel, colour: unknown },
    ],
  };
}

/** Counts of each non-empty value. */
export function countValues(values) {
  const counts = new Map();
  values.forEach((value) => {
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}
