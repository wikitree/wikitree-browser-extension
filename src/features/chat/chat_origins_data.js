// Ancestral origins streamgraph data (2026-10-03, the "Wow!" visuals): the
// ancestor rows behind "where were my ancestors born?" (C5) counted by birth
// (or death) country per generation. The d3 drawing lives in
// chat_origins_chart.js.

import { getCountryFromLocation } from "./chat_place_country";
import { yearOf } from "./chat_chart_common";

// Every country gets its own band, as in the Surname Stream (2026-10-05): no "Other countries" catch-all.
export const ORIGINS_TOP_COUNTRIES = Infinity;
export const OTHER_COUNTRIES = "Other countries";

/** "Parents", "Grandparents", "Great-grandparents", "2× great-grandparents", … */
export function generationName(generation) {
  if (generation === 1) return "Parents";
  if (generation === 2) return "Grandparents";
  if (generation === 3) return "Great-grandparents";
  return `${generation - 2}× great-grandparents`;
}

/**
 * rows: ancestor rows ({degrees, birthLocation, deathLocation, birth}).
 * Returns {keys, generations: [{generation, name, meanYear, total, unknown, counts: {country: n}}],
 * totals: [[country, n]], unknown, known} or null when there is nothing to draw.
 * Generations with no known place at the far end are dropped.
 */
export function buildOriginsSeries(rows, { field = "birthLocation", top = ORIGINS_TOP_COUNTRIES, keyOf = null, otherLabel = OTHER_COUNTRIES } = {}) {
  const OTHER = otherLabel;
  const byGeneration = new Map();
  const totals = new Map();
  let unknown = 0;
  (rows || []).forEach((row) => {
    const generation = Number(row?.degrees) || 0;
    if (generation < 1) return;
    if (!byGeneration.has(generation)) byGeneration.set(generation, { counts: new Map(), unknown: 0, years: [], people: new Map() });
    const bucket = byGeneration.get(generation);
    const year = yearOf(row?.birth);
    if (year) bucket.years.push(year);
    const country = keyOf ? keyOf(row) : getCountryFromLocation(row?.[field]);
    if (!country) {
      bucket.unknown += 1;
      unknown += 1;
      return;
    }
    bucket.counts.set(country, (bucket.counts.get(country) || 0) + 1);
    // Who they are, when the rows say (the surname river's do).
    if (row.name || row.wtid) {
      if (!bucket.people.has(country)) bucket.people.set(country, []);
      bucket.people.get(country).push({ name: row.name || row.wtid, wtid: row.wtid || "", year: year || null });
    }
    totals.set(country, (totals.get(country) || 0) + 1);
  });
  const sortedTotals = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!sortedTotals.length) return null;
  const keep = new Set(sortedTotals.slice(0, top).map(([country]) => country));
  const hasOther = sortedTotals.length > top;
  const keys = [...sortedTotals.slice(0, top).map(([country]) => country), ...(hasOther ? [OTHER] : [])];
  let generationNumbers = [...byGeneration.keys()].sort((a, b) => a - b);
  while (generationNumbers.length && !byGeneration.get(generationNumbers[generationNumbers.length - 1]).counts.size) generationNumbers.pop();
  const generations = generationNumbers.map((generation) => {
    const bucket = byGeneration.get(generation);
    const counts = Object.fromEntries(keys.map((key) => [key, 0]));
    // What's inside this generation's Other band, commonest first.
    const otherNames = [];
    bucket.counts.forEach((count, country) => {
      counts[keep.has(country) ? country : OTHER] += count;
      if (!keep.has(country)) otherNames.push([country, count]);
    });
    otherNames.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = [...bucket.counts.values()].reduce((sum, count) => sum + count, 0);
    const meanYear = bucket.years.length ? Math.round(bucket.years.reduce((sum, y) => sum + y, 0) / bucket.years.length) : null;
    const people = {};
    bucket.people.forEach((list, key) => {
      people[key] = [...list].sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.name.localeCompare(b.name));
    });
    return { generation, name: generationName(generation), meanYear, total, unknown: bucket.unknown, counts, otherNames, people };
  });
  return { keys, generations, totals: sortedTotals, unknown, known: sortedTotals.reduce((sum, [, count]) => sum + count, 0), otherKey: OTHER };
}

/**
 * One line about the drift: "In the parents' generation most were born in
 * New Zealand; 5 generations back, England (60%)." Empty when one country
 * leads throughout.
 */
export function describeOriginsShift(series) {
  const gens = (series?.generations || []).filter((gen) => gen.total);
  if (gens.length < 2) return "";
  const leader = (gen) => Object.entries(gen.counts).sort((a, b) => b[1] - a[1])[0];
  const [nearCountry] = leader(gens[0]);
  const far = gens[gens.length - 1];
  const [farCountry, farCount] = leader(far);
  if (nearCountry === farCountry) return "";
  const percent = Math.round((farCount / far.total) * 100);
  return `Nearest generation: mostly ${nearCountry}; ${far.generation} generations back: mostly ${farCountry} (${percent}%).`;
}

// Surname river (2026-10-04, the "Wow!" list): the same streamgraph, by surname at
// birth instead of country. Each ancestor counts once per generation (pedigree
// collapse can put one person in several slots of a generation).
// Every surname gets its own band (2026-10-04): no "rarer surnames" catch-all.
export const SURNAME_RIVER_TOP = Infinity;
export const OTHER_SURNAMES = "Rarer surnames";

/** The streamgraph series for ancestors' surnames at birth (LNAB), from fan chart slots. */
export function buildSurnameRiver(slots, { top = SURNAME_RIVER_TOP } = {}) {
  const seen = new Set();
  const rows = [];
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 2) return;
    const degrees = Math.floor(Math.log2(slot));
    const id = `${degrees}:${person.id || person.wtid}`;
    if (seen.has(id)) return;
    seen.add(id);
    rows.push({ degrees, birth: person.birth, lnab: person.lnab, name: person.fullName || person.name, wtid: person.wtid });
  });
  const surnameOf = (row) => {
    const name = String(row.lnab || "").trim();
    return name && !/^unknown$/i.test(name) ? name : "";
  };
  return buildOriginsSeries(rows, { keyOf: surnameOf, top, otherLabel: OTHER_SURNAMES });
}

/** The chat line for the river: how many surnames, the main ones, and when each first appears. */
export function describeSurnameRiver(series, ownerText) {
  if (!series?.totals?.length) return `${ownerText} ancestors have no surnames recorded on WikiTree yet.`;
  const owner = /^your$/i.test(ownerText) ? "your" : ownerText;
  const gens = series.generations;
  const firstSeen = (key) => gens.find((gen) => gen.counts[key])?.generation;
  const main = series.keys
    .filter((key) => key !== series.otherKey)
    .slice(0, 6)
    .map((key) => `${key} (${series.totals.find(([name]) => name === key)[1]}, from ${generationName(firstSeen(key)).toLowerCase()})`);
  const lines = [`${series.totals.length} surnames run through ${owner} ${series.known} ancestors over ${gens.length} generations. The biggest streams: ${main.join(", ")}.`];
  lines.push("Each band is a surname at birth, oldest generation on the left; a band widens where more ancestors carried it.");
  return lines.join("\n");
}
