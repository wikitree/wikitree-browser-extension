// Ancestor lifespans (2026-10-03, the "Wow!" visuals): every ancestor's life as a
// bar, a generation per band, with how many were alive in each year beneath. The
// data comes from the fan chart's Ahnentafel slots; the d3 drawing is
// chat_lifespans_chart.js.

import { yearOf } from "./chat_chart_common";
import { generationOfSlot } from "./chat_fan_chart_data";

export const LIFESPANS_GENERATIONS = 6;

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;
const CHART = String.raw`(?:life\s*spans?|life\s*lines?|lifespan\s+chart|life\s+expectancy)`;
const PATTERNS = [
  // "lifespans", "show my ancestors' lifespans", "Cook-8721's ancestor lifespans", "a lifespan chart"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+|ancestral\s+)?${CHART}(?:\s+chart)?$`, "i"),
  // "lifespans of my ancestors", "life expectancy of her ancestors"
  new RegExp(String.raw`^${LEAD}(?:the\s+)?${CHART}(?:\s+chart)?\s+(?:of|for)\s+${OWNER}\s+ancestors$`, "i"),
  // "how long did my ancestors live", "how long did Cook-8721's ancestors live"
  new RegExp(String.raw`^how\s+long\s+did\s+${OWNER}\s+ancestors\s+live(?:\s+for)?$`, "i"),
  // "a lifespan chart of Cook-8721", "lifespans for me"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:life\s*spans?\s+chart|life\s*spans|life\s*lines)\s+(?:of|for)\s+(me|us|her|him|them|[A-Z][A-Za-z' -]*?-\d+)$`, "i"),
];
// The Descendants view: chart words only ("how long did my descendants live" stays the
// age-at-death answer).
const DESCENDANT_PATTERNS = [
  // "my descendants' lifespans", "Cook-8721's descendant lifespans", "descendants lifespan chart"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?descendants?['’]?\s+${CHART}(?:\s+chart)?$`, "i"),
  // "lifespans of her descendants", "a lifespan chart for my descendants"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${CHART}(?:\s+chart)?\s+(?:of|for)\s+${OWNER}\s+descendants$`, "i"),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me|us)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^him$/i.test(raw)) return "his";
  if (/^them$/i.test(raw)) return "their";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** {owner, ancestorPrompt, view?: "descendants"} or null; owner as in parseFanChartPrompt. */
export function parseLifespansPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  const result = (match, extra = {}) => {
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, ...extra };
  };
  for (const re of DESCENDANT_PATTERNS) {
    const match = text.match(re);
    if (match) return result(match, { view: "descendants" });
  }
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (match) return result(match);
  }
  return null;
}

/** "Father", "Grandmother", "Great-grandfather", "3x great-grandmother". */
export function ancestorWord(generation, gender) {
  const base = gender === "Female" ? "mother" : gender === "Male" ? "father" : "parent";
  if (generation <= 0) return "";
  if (generation === 1) return base[0].toUpperCase() + base.slice(1);
  if (generation === 2) return `Grand${base}`;
  if (generation === 3) return `Great-grand${base}`;
  return `${generation - 2}x great-grand${base}`;
}

/** "Parents", "Grandparents", "Great-grandparents", "3x great-grandparents". */
export function generationLabel(generation) {
  if (generation === 0) return "";
  return `${ancestorWord(generation, "")}s`;
}

/**
 * One row per dated person in the slots: {slot, generation, side, wtid, name, gender,
 * relation, start, end, endKnown, living, age}. side: "father" or "mother" (whose
 * line, from the root), "" for the root. Rows without a birth year are counted in
 * `undated`.
 */
export function buildLifespanRows(slots, now = new Date().getFullYear()) {
  const rows = [];
  let undated = 0;
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 1) return;
    const start = yearOf(person.birth);
    if (!start) {
      undated += 1;
      return;
    }
    const generation = generationOfSlot(slot);
    const death = yearOf(person.death);
    const living = !death && slot === 1 && start > now - 100;
    const end = death || (living ? now : Math.min(start + 60, now));
    rows.push({
      slot,
      generation,
      side: generation === 0 ? "" : slot < 3 * 2 ** (generation - 1) ? "father" : "mother",
      wtid: person.wtid || "",
      name: person.name || person.wtid || "",
      lnab: person.lnab || "",
      gender: person.gender || "",
      relation: ancestorWord(generation, person.gender),
      birthLocation: person.birthLocation || "",
      start,
      end: Math.max(end, start),
      endKnown: Boolean(death),
      living,
      age: death && death >= start ? death - start : null,
    });
  });
  rows.sort((a, b) => a.slot - b.slot);
  return { rows, undated };
}

/** "Son", "Granddaughter", "Great-grandchild", "3x great-grandson". */
export function descendantWord(generation, gender) {
  const base = gender === "Female" ? "daughter" : gender === "Male" ? "son" : "child";
  if (generation <= 0) return "";
  if (generation === 1) return base[0].toUpperCase() + base.slice(1);
  if (generation === 2) return `Grand${base}`;
  if (generation === 3) return `Great-grand${base}`;
  return `${generation - 2}x great-grand${base}`;
}

/** "Children", "Grandchildren", "Great-grandchildren", "3x great-grandchildren". */
export function descendantGenerationLabel(generation) {
  if (generation <= 0) return "";
  return descendantWord(generation, "").replace(/child$/i, (word) => `${word}ren`);
}

/**
 * Lifespans rows for a descendant tree (from buildDescendantTree), the Descendants view
 * (2026-10-03, after the Close family | Ancestors merge): a band per generation, each row
 * knowing its family branch (which of the root's children it comes down from: .branch, an
 * index, and .branchName). No death year: living if born in the last 100 years, else an open
 * end. → {rows, undated, branches: [names]}
 */
export function buildDescendantLifespanRows(tree, now = new Date().getFullYear()) {
  const rows = [];
  const branches = [];
  let undated = 0;
  if (!tree?.person) return { rows, undated, branches };
  const add = (node, generation, branch) => {
    const person = node.person;
    const start = yearOf(person.birth);
    if (!start) {
      undated += 1;
      return;
    }
    const death = yearOf(person.death);
    const living = !death && start > now - 100;
    const end = death || (living ? now : Math.min(start + 60, now));
    rows.push({
      slot: rows.length,
      generation,
      group: descendantGenerationLabel(generation),
      branch,
      branchName: branch >= 0 ? branches[branch] : "",
      wtid: person.wtid || "",
      name: person.name || person.wtid || "",
      lnab: person.lnab || "",
      gender: person.gender || "",
      relation: descendantWord(generation, person.gender),
      birthLocation: person.birthLocation || "",
      hidden: Boolean(person.hidden),
      start,
      end: Math.max(end, start),
      endKnown: Boolean(death),
      living,
      age: death && death >= start ? death - start : null,
    });
  };
  add(tree, 0, -1);
  // A generation at a time, branch by branch (the bands need each generation together).
  let level = (tree.children || []).map((child, index) => {
    branches.push(child.person?.name || child.person?.wtid || "");
    return { node: child, branch: index };
  });
  for (let generation = 1; level.length; generation += 1) {
    level.forEach(({ node, branch }) => add(node, generation, branch));
    level = level.flatMap(({ node, branch }) => (node.children || []).map((child) => ({ node: child, branch })));
  }
  return { rows, undated, branches };
}

/** How many of the rows (with known deaths, or living) were alive in each year: [{year, count}]. */
export function aliveByYear(rows) {
  const known = rows.filter((row) => row.endKnown || row.living);
  if (!known.length) return [];
  const first = Math.min(...known.map((row) => row.start));
  const last = Math.max(...known.map((row) => row.end));
  const delta = new Map();
  known.forEach((row) => {
    delta.set(row.start, (delta.get(row.start) || 0) + 1);
    delta.set(row.end + 1, (delta.get(row.end + 1) || 0) - 1);
  });
  const series = [];
  let count = 0;
  for (let year = first; year <= last; year += 1) {
    count += delta.get(year) || 0;
    series.push({ year, count });
  }
  return series;
}

/**
 * The headline facts: {byCentury:[{century, average, count}], longest, shortest,
 * peak:{year,count}, atRootBirth:{count, oldest}, average, counted}.
 */
export function lifespanStats(rows) {
  const ancestors = rows.filter((row) => row.generation > 0);
  const aged = ancestors.filter((row) => Number.isFinite(row.age));
  const centuries = new Map();
  aged.forEach((row) => {
    const century = Math.floor(row.start / 100) * 100;
    const entry = centuries.get(century) || { century, total: 0, count: 0 };
    entry.total += row.age;
    entry.count += 1;
    centuries.set(century, entry);
  });
  const byCentury = [...centuries.values()]
    .sort((a, b) => a.century - b.century)
    .map(({ century, total, count }) => ({ century, average: Math.round(total / count), count }));
  const byAge = aged.slice().sort((a, b) => b.age - a.age || a.slot - b.slot);
  const series = aliveByYear(ancestors);
  const peak = series.reduce((best, point) => (point.count > (best?.count || 0) ? point : best), null);
  const root = rows.find((row) => row.generation === 0);
  let atRootBirth = null;
  if (root) {
    const alive = ancestors.filter((row) => (row.endKnown || row.living) && row.start <= root.start && root.start <= row.end);
    const oldest = alive.slice().sort((a, b) => a.start - b.start || a.slot - b.slot)[0] || null;
    atRootBirth = { count: alive.length, oldest };
  }
  return {
    byCentury,
    longest: byAge[0] || null,
    shortest: byAge.length > 1 ? byAge[byAge.length - 1] : null,
    peak: peak && peak.count > 1 ? peak : null,
    atRootBirth,
    average: aged.length ? Math.round(aged.reduce((sum, row) => sum + row.age, 0) / aged.length) : null,
    counted: aged.length,
  };
}

const lower = (text) => String(text || "").replace(/^\w/, (ch) => ch.toLowerCase());

/** The chat reply that goes with the chart. ownerText: "Your" or "Cook-8721's". */
export function buildLifespansSummary(rows, ownerText, undated = 0) {
  const stats = lifespanStats(rows);
  const root = rows.find((row) => row.generation === 0);
  if (!stats.counted) {
    return `${ownerText} ancestors don't have enough birth and death dates on WikiTree to chart their lifespans${undated ? ` (${undated} have no birth year)` : ""}.`;
  }
  const lines = [`${ownerText} ancestors lived ${stats.average} years on average (${stats.counted} with both dates).`];
  if (stats.byCentury.length > 1) {
    lines.push(`By century of birth: ${stats.byCentury.map((c) => `${c.century}s ${c.average}`).join(" · ")}.`);
  }
  if (stats.longest) lines.push(`Longest-lived: ${stats.longest.name}, ${lower(stats.longest.relation)}, ${stats.longest.age} (${stats.longest.start}–${stats.longest.end}).`);
  if (stats.peak) lines.push(`Most alive at once: ${stats.peak.count}, in ${stats.peak.year}.`);
  if (root && stats.atRootBirth?.count) {
    const { count, oldest } = stats.atRootBirth;
    lines.push(
      `When ${root.name} was born in ${root.start}, ${count} of these ancestors were alive${
        oldest ? `; the eldest was ${oldest.name} (${lower(oldest.relation)}, born ${oldest.start})` : ""
      }.`
    );
  }
  return lines.join("\n");
}
