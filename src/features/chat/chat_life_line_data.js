// One person's life on a single line (2026-10-04, the "Wow!" visuals): birth to death
// as one axis marked with ages, the family events along it (marriages, children,
// the deaths of parents, spouses and children, grandchildren) above, and the world
// events they lived through below. The rows come from buildFamilyTimelineRows; the
// d3 drawing lives in chat_life_line.js.

import { yearOf } from "./chat_chart_common";
import { rowSpan } from "./chat_family_timeline_data";
import { livedThrough, placeRegions } from "./chat_world_events_data";

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s|[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3}['’]s)`;
const OWNER_AFTER = String.raw`(me|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3})`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|put)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make|put)(?:\s+me)?\s+)?`;
const LINE = String.raw`(?:life\s*line|life\s+chart|life\s+at\s+a\s+glance|life\s+on\s+(?:a|one)\s+(?:single\s+)?line|life\s+in\s+(?:a|one)\s+(?:single\s+)?line)`;

const PATTERNS = [
  // "show my lifeline", "Philip's life line", "draw Beacall-11's life on a single line", "her life at a glance"
  { re: new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${OWNER}\s+${LINE}$`, "i"), after: false },
  // "a lifeline for Beacall-11", "the life line of Philip Beacall", "lifeline for me"
  { re: new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:life\s*line|life\s+chart)\s+(?:of|for)\s+${OWNER_AFTER}$`, "i"), after: true },
  // "put his life on one line"
  { re: new RegExp(String.raw`^${LEAD}${OWNER}\s+life\s+(?:on|in)\s+(?:a|one)\s+(?:single\s+)?line$`, "i"), after: false },
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "me";
  if (/^(?:her|his|him|their|them|this\s+(?:profile|person))$/i.test(raw)) return "";
  return raw;
}

/** {owner, lifeLine: true} or null. owner: "me", "" (the page's profile), an ID or a name. */
export function parseLifeLinePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const { re } of PATTERNS) {
    const match = text.match(re);
    if (match) return { owner: canonicalOwner(match[1]), lifeLine: true };
  }
  return null;
}

/** Event kinds: the major ones get a label on the line; the minor ones are dots. */
export const LIFE_EVENT_KINDS = {
  birth: { label: "Born", major: true },
  marriage: { label: "Marriage", major: true },
  child: { label: "Child born", major: true },
  loss: { label: "A death in the family", major: true },
  sibling: { label: "Sibling born", major: false },
  siblingLoss: { label: "Sibling died", major: false },
  grandchild: { label: "Grandchild born", major: false },
  death: { label: "Died", major: true },
};

/**
 * rows: from buildFamilyTimelineRows. → {self, start, end, endKnown, living, family:
 * [{year, age, kind, text, wtid}], history: [{event, age}]} or null without a birth year.
 * Family events outside the life are left out, except a parent who died before the birth.
 */
export function buildLifeLine(rows, { now = new Date().getFullYear(), fallbackCountries = [] } = {}) {
  const self = (rows || []).find((row) => row.role === "self");
  const start = yearOf(self?.birth);
  if (!start) return null;
  const deathYear = yearOf(self.death);
  const living = !deathYear && !!self.isLiving;
  const endKnown = !!deathYear;
  const others = rows.filter((row) => row !== self);
  const lastKnown = Math.max(start, ...others.flatMap((row) => [yearOf(row.birth), yearOf(row.death), yearOf(row.marriage)]).filter((year) => year && year <= now));
  // No death year: the line runs to the last family event, or 60 years, whichever is later.
  const end = deathYear || (living ? now : Math.min(now, Math.max(start + 60, lastKnown)));
  const within = (year) => year && year >= start && year <= end;
  const family = [];
  const add = (year, kind, text, row = null) => family.push({ year, age: year - start, kind, text, wtid: row?.wtid || "" });
  add(start, "birth", `Born${self.birthLocation ? ` in ${self.birthLocation}` : ""}`, self);
  const who = (row) => `${row.relation} ${row.name}`;
  // Only "before"/"after" dates are dropped: they bound a date rather than give it.
  const bounded = (status) => status === "before" || status === "after";
  others.forEach((row) => {
    const born = bounded(row.birthStatus) ? 0 : yearOf(row.birth);
    const died = bounded(row.deathStatus) ? 0 : yearOf(row.death);
    if (row.role === "parent" && died && died <= end) {
      if (died >= start) add(died, "loss", `${who(row)} died`, row);
      else family.push({ year: died, age: died - start, kind: "loss", text: `${who(row)} died before ${self.name} was born`, wtid: row.wtid, before: true });
    }
    if (row.role === "spouse") {
      const married = yearOf(row.marriage);
      if (within(married)) add(married, "marriage", `Married ${row.name}${row.marriagePlace ? ` in ${row.marriagePlace}` : ""}`, row);
      if (within(died)) add(died, "loss", `${who(row)} died`, row);
    }
    if (row.role === "sibling") {
      if (born > start && within(born)) add(born, "sibling", `${who(row)} born`, row);
      if (within(died)) add(died, "siblingLoss", `${who(row)} died`, row);
    }
    if (row.role === "child") {
      if (within(born)) add(born, "child", `${who(row)} born`, row);
      if (within(died)) add(died, "loss", `${who(row)} died`, row);
    }
    if (row.role === "grandchild" && within(born)) add(born, "grandchild", `Grandchild ${row.name} born${row.parentName ? ` (child of ${row.parentName})` : ""}`, row);
  });
  if (deathYear) add(deathYear, "death", `Died${self.deathLocation ? ` in ${self.deathLocation}` : ""}, aged about ${deathYear - start}`, self);
  const order = Object.keys(LIFE_EVENT_KINDS);
  family.sort((a, b) => a.year - b.year || order.indexOf(a.kind) - order.indexOf(b.kind));
  // Their world: where they were born, married and died.
  const extraRegions = others.filter((row) => row.role === "spouse" && row.marriagePlace).flatMap((row) => placeRegions(row.marriagePlace));
  const history = livedThrough({ ...self, start, end, extraRegions }, fallbackCountries);
  return { self, start, end, endKnown, living, family, history, places: buildLifePlaces(self, others, start, end), household: buildHousehold(others, start, end) };
}

/** "Wallasey, Cheshire, England, United Kingdom" → "Wallasey, Cheshire". */
export function shortPlace(location) {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ");
}

/**
 * Where the life was lived, as far as the family's records say: birth, marriages,
 * the children's births and the death, each with a place. → [{from, to, place, full,
 * reasons: [text]}], one stretch per place in turn (the same place again joins up).
 */
export function buildLifePlaces(self, others, start, end) {
  const points = [];
  if (self.birthLocation) points.push({ year: start, location: self.birthLocation, text: "born there" });
  others.forEach((row) => {
    if (row.role === "spouse" && row.marriagePlace && yearOf(row.marriage)) points.push({ year: yearOf(row.marriage), location: row.marriagePlace, text: `married ${row.name} there` });
    if (row.role === "child" && row.birthLocation && yearOf(row.birth) && row.birthStatus !== "before" && row.birthStatus !== "after") {
      points.push({ year: yearOf(row.birth), location: row.birthLocation, text: `${row.name} born there` });
    }
  });
  const deathYear = yearOf(self.death);
  if (self.deathLocation && deathYear) points.push({ year: deathYear, location: self.deathLocation, text: "died there" });
  const stretches = [];
  points
    .filter((point) => point.year >= start && point.year <= end)
    .sort((a, b) => a.year - b.year)
    .forEach((point) => {
      const place = shortPlace(point.location);
      const last = stretches[stretches.length - 1];
      if (last && last.place.toLowerCase() === place.toLowerCase()) last.reasons.push(`${point.year}: ${point.text}`);
      else stretches.push({ from: point.year, place, full: point.location, reasons: [`${point.year}: ${point.text}`] });
    });
  stretches.forEach((stretch, index) => {
    stretch.to = index + 1 < stretches.length ? stretches[index + 1].from : end;
  });
  return stretches;
}

/**
 * The close family alive each year of the life: [{year, parents, spouses, children,
 * grandchildren}]. A spouse counts from the marriage (or the first child); unknown
 * deaths are guessed as rowSpan does.
 */
export function buildHousehold(others, start, end) {
  const spans = others
    .map((row) => {
      const span = rowSpan(row);
      if (!span) return null;
      let from = span.start;
      if (row.role === "spouse") from = yearOf(row.marriage) || from;
      return { role: row.role, from, to: span.end };
    })
    .filter(Boolean);
  const years = [];
  for (let year = start; year <= end; year += 1) {
    const alive = (role) => spans.filter((span) => span.role === role && span.from <= year && year <= span.to).length;
    years.push({ year, parents: alive("parent"), spouses: alive("spouse"), children: alive("child"), grandchildren: alive("grandchild") });
  }
  return years;
}

const plural = (count, word) => `${count} ${count === 1 ? word : word === "child" ? "children" : word === "grandchild" ? "grandchildren" : `${word}s`}`;
const ages = (events) => {
  const low = Math.min(...events.map((e) => e.age));
  const high = Math.max(...events.map((e) => e.age));
  return low === high ? `at ${low}` : `between ${low} and ${high}`;
};

/** The chat paragraph: the life in a few sentences, naming the person, not "he"/"she". */
export function buildLifeLineSummary(line, label) {
  if (!line) return `${label} has no birth year on WikiTree, so I can't draw the life line.`;
  const name = line.self.name || label;
  const span = line.living ? `born ${line.start}, living` : `${line.start}–${line.endKnown ? line.end : "?"}`;
  const lines = [`${label}'s life on one line (${span}${line.endKnown ? `, about ${line.end - line.start} years` : ""}):`];
  const of = (kind) => line.family.filter((event) => event.kind === kind && !event.before);
  const marriages = of("marriage");
  if (marriages.length) lines.push(`• Married ${marriages.map((e) => `${e.text.replace(/^Married /, "")} in ${e.year} (aged ${e.age})`).join("; then ")}.`);
  const children = of("child");
  if (children.length) lines.push(`• ${plural(children.length, "child")} born ${children[0].year === children[children.length - 1].year ? children[0].year : `${children[0].year}–${children[children.length - 1].year}`}, when ${name} was ${ages(children).replace(/^at /, "")}.`);
  const losses = of("loss");
  if (losses.length) lines.push(`• Losses: ${losses.map((e) => `${e.text.replace(/ died$/, "")} (${e.year}, ${name} aged ${e.age})`).join("; ")}.`);
  const before = line.family.filter((event) => event.before);
  if (before.length) lines.push(`• ${before.map((e) => e.text).join("; ")}.`);
  const grandchildren = of("grandchild");
  if (grandchildren.length) lines.push(`• ${plural(grandchildren.length, "grandchild")} born in ${name}'s lifetime, the first in ${grandchildren[0].year} (aged ${grandchildren[0].age}).`);
  const events = line.history.filter((entry) => entry.event.kind !== "record");
  if (events.length) lines.push(`• World events along the way: ${events.slice(0, 4).map(({ event, age }) => `${event.label.replace(/^The\b/, "the")} (${age ? `aged ${age}` : "born during it"})`).join(", ")}${events.length > 4 ? `, and ${events.length - 4} more` : ""}.`);
  if (!line.endKnown && !line.living) lines.push(`(No death year is recorded, so the line stops at ${line.end}.)`);
  if (lines.length === 1) lines.push("No marriages, children or family deaths with dates are recorded on WikiTree yet.");
  return lines.join("\n");
}
