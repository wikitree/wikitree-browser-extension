import { canonicalChartOwner as canonicalOwner } from "./chat_chart_prompt";
// Tree overview (2026-10-03, the "Wow!" visuals): "tell me about my tree" answers
// with a dashboard of the ancestors: how complete, where from, which surnames, how
// long they lived, when they were born, how long a generation was. Each panel opens
// its full chart. The data is the fan chart's Ahnentafel slots; the popup is
// chat_tree_overview.js.

import { fanChartCountries, fanChartRepeats, fanChartStats, fanChartSurnames, generationOfSlot } from "./chat_fan_chart_data";
import { ancestorWord } from "./chat_kin_labels";
import { buildLifespanRows, lifespanStats } from "./chat_lifespans_data";
import { buildCalendarEvents, MONTHS } from "./chat_family_calendar_data";
import { yearOf } from "./chat_chart_common";

export const TREE_OVERVIEW_GENERATIONS = 8;

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const TREE = String.raw`(?:family\s+tree|tree|ancestry|ancestors|pedigree|family\s+history)`;
const PATTERNS = [
  // "tell me about my tree", "tell me about her ancestors", "summarise my ancestry", "analyse Cook-8721's family tree"
  new RegExp(String.raw`^(?:tell\s+me\s+about|summari[sz]e|analy[sz]e|describe|give\s+me\s+an?\s+(?:overview|summary)\s+of)\s+${OWNER}\s+${TREE}$`, "i"),
  // "my tree stats", "Cook-8721's family tree overview", "family tree statistics", "tree overview"
  new RegExp(
    String.raw`^(?:(?:show|give)(?:\s+me)?\s+)?(?:the\s+|an?\s+)?(?:${OWNER}\s+)?(?:family\s+tree|tree|ancestry|pedigree)\s+(?:stats|statistics|overview|summary|dashboard|report(?:\s+card)?|facts)$`,
    "i"
  ),
  // "overview of my tree", "statistics for her ancestors"
  new RegExp(String.raw`^(?:(?:show|give)(?:\s+me)?\s+)?(?:an?\s+|the\s+)?(?:overview|summary|stats|statistics|dashboard)\s+(?:of|for)\s+${OWNER}\s+${TREE}$`, "i"),
];


/** {owner, ancestorPrompt} or null. */
export function parseTreeOverviewPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt };
  }
  return null;
}

const average = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);

/**
 * Parents' ages when their child (in the line) was born: {father, mother, overall,
 * count, youngest, oldest}. youngest/oldest: {name, relation, age, childName}.
 */
export function generationInterval(slots) {
  const fathers = [];
  const mothers = [];
  const all = [];
  (slots || []).forEach((parent, slot) => {
    if (!parent || slot < 2) return;
    const child = slots[Math.floor(slot / 2)];
    const parentBorn = yearOf(parent.birth);
    const childBorn = yearOf(child?.birth);
    if (!parentBorn || !childBorn) return;
    const age = childBorn - parentBorn;
    if (age < 12 || age > 75) return; // (a date slip, not a real age)
    const entry = { name: parent.name || parent.wtid, relation: ancestorWord(generationOfSlot(slot), parent.gender), age, childName: child.name || child.wtid, wtid: parent.wtid };
    (slot % 2 === 0 ? fathers : mothers).push(age);
    all.push(entry);
  });
  const sorted = all.slice().sort((a, b) => a.age - b.age);
  return {
    father: average(fathers),
    mother: average(mothers),
    overall: average(all.map((entry) => entry.age)),
    count: all.length,
    youngest: sorted[0] || null,
    oldest: sorted.length > 1 ? sorted[sorted.length - 1] : null,
  };
}

/** Everything the dashboard shows, from the slots. */
export function buildTreeOverview(slots) {
  const stats = fanChartStats(slots);
  const { rows } = buildLifespanRows(slots);
  const lifespans = lifespanStats(rows);
  const repeats = fanChartRepeats(slots);
  const births = buildCalendarEvents(slots).filter((event) => event.type === "birth" && event.generation > 0);
  const months = MONTHS.map((name, index) => ({ name, count: births.filter((event) => event.month === index + 1).length }));
  // The earliest-born ancestor.
  let earliest = null;
  slots.forEach((person, slot) => {
    if (!person || slot < 2) return;
    const born = yearOf(person.birth);
    if (born && (!earliest || born < earliest.year)) {
      earliest = { year: born, name: person.name || person.wtid, wtid: person.wtid, relation: ancestorWord(generationOfSlot(slot), person.gender), place: person.birthLocation || "" };
    }
  });
  return {
    root: slots[1] || null,
    stats,
    percent: stats.possible ? Math.round((100 * stats.found) / stats.possible) : 0,
    countries: fanChartCountries(slots),
    surnames: fanChartSurnames(slots),
    lifespans,
    months,
    datedBirths: births.length,
    interval: generationInterval(slots),
    repeats: repeats.groups.filter((group) => group.start).length,
    people: repeats.people,
    earliest,
  };
}

/** The chat reply: a few headline facts (the dashboard has the rest). ownerText: "Your" or "Cook-8721's". */
export function buildTreeOverviewSummary(overview, ownerText) {
  const { stats, percent, countries, surnames, lifespans, interval, earliest, repeats } = overview;
  if (!stats.found) return `${ownerText} tree has no parents recorded on WikiTree yet, so there's nothing to sum up.`;
  const owner = ownerText === "Your" ? "your" : ownerText;
  const lines = [`${ownerText} tree: ${stats.found} ancestors over ${stats.rows.length} generations (${percent}% of the ${stats.possible} possible), back ${stats.deepest} generations.`];
  if (earliest) lines.push(`The earliest-born: ${earliest.name}, ${earliest.relation.toLowerCase()}, born ${earliest.year}${earliest.place ? ` in ${earliest.place}` : ""}.`);
  if (countries.length) {
    const total = countries.reduce((sum, [, count]) => sum + count, 0);
    lines.push(`Origins: ${countries.slice(0, 3).map(([country, count]) => `${country} ${Math.round((100 * count) / total)}%`).join(", ")}.`);
  }
  if (surnames.length) lines.push(`Most common surnames: ${surnames.slice(0, 4).map(([surname, count]) => `${surname} (${count})`).join(", ")}.`);
  if (lifespans.average) lines.push(`On average ${owner} ancestors lived to ${lifespans.average}.`);
  if (interval.overall) lines.push(`A generation lasted ${interval.overall} years on average (fathers ${interval.father ?? "?"}, mothers ${interval.mother ?? "?"}).`);
  if (repeats) lines.push(`${repeats} ancestor${repeats === 1 ? " appears" : "s appear"} more than once (cousins who married).`);
  return lines.join("\n");
}
