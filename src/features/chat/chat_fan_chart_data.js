// Fan chart (the user asked for "Wow!" graphics, 2026-10-03): the prompt parser
// and the data side. Ancestors sit in Ahnentafel slots: the root is 1, a
// person's father 2n and mother 2n+1, so generation g holds slots 2^g … 2^(g+1)-1.
// The d3 drawing lives in chat_fan_chart.js.

import { getCountryFromLocation } from "./chat_place_country";
import { profileQuality } from "./chat_profile_quality_data";
import { PersonName } from "../auto_bio/person_name";

export const FAN_CHART_DEFAULT_GENERATIONS = 7;
export const FAN_CHART_MAX_GENERATIONS = 10;

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const OWNER_AFTER = String.raw`(me|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z' -]*?-\d+)`;
// (a plain "sunburst" is the descendant chart)
const CHART = String.raw`(?:(?:(?:ancestor|ancestry|ancestral|family|pedigree)\s+)?(?:fan\s+chart|fan|wheel)|(?:ancestor|ancestry|ancestral|pedigree)\s+sunburst)`;
const GENS = String.raw`(?:\s+(?:with|of|for|showing)?\s*(\d{1,2})\s+generations?)?`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;

const PATTERNS = [
  // "show me my fan chart", "draw Cook-8721's ancestor fan chart", "fan chart"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?${CHART}${GENS}$`, "i"),
  // "draw a fan chart of my ancestors", "show a fan chart for Cook-8721"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${CHART}\s+(?:of|for)\s+(?:${OWNER}\s+ancestors|${OWNER_AFTER})${GENS}$`, "i"),
  // "show my ancestors as a fan chart", "visualize her ancestors" (a plain
  // "show my ancestors" stays the ancestor list)
  new RegExp(String.raw`^(?:show|draw|display)(?:\s+me)?\s+${OWNER}\s+ancestors\s+(?:as|in)\s+an?\s+(?:fan\s+chart|fan|sunburst|wheel|chart|diagram)${GENS}$`, "i"),
  new RegExp(String.raw`^(?:visuali[sz]e|chart|graph)\s+${OWNER}\s+ancestors${GENS}$`, "i"),
];

// The surname view of the fan chart: "what surnames are in my tree?", "my ancestral surnames", "surname chart".
const SURNAME_PATTERNS = [
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestral\s+|ancestors?['’]?\s+|family\s+)?(?:surnames(?:\s+(?:chart|wheel|fan(?:\s+chart)?))?|surname\s+(?:chart|wheel|fan(?:\s+chart)?))$`, "i"),
  new RegExp(String.raw`^(?:what|which)\s+surnames\s+(?:are|appear)\s+in\s+${OWNER}\s+(?:family\s+)?(?:tree|ancestry|ancestors|pedigree)$`, "i"),
  new RegExp(String.raw`^(?:what|which)\s+surnames\s+(?:do|did)\s+${OWNER}\s+ancestors\s+have$`, "i"),
  new RegExp(String.raw`^(?:what|which)\s+are\s+${OWNER}\s+(?:ancestral\s+|ancestors?['’]?\s+|family\s+)surnames$`, "i"),
];

/** {owner, generations, ancestorPrompt, mode: "surname"} or null: the fan chart coloured by surname. */
export function parseSurnameChartPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of SURNAME_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, generations: FAN_CHART_DEFAULT_GENERATIONS, ancestorPrompt, mode: "surname" };
  }
  return null;
}

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "my";
  if (/^(?:her)$/i.test(raw)) return "her";
  if (/^(?:his|him)$/i.test(raw)) return "his";
  if (/^(?:their|them)$/i.test(raw)) return "their";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/**
 * {owner, generations, ancestorPrompt} or null. owner: "" (the page profile),
 * "my", "her", "his", "their" or a WikiTree ID. ancestorPrompt is a plain
 * "<owner> ancestors" phrase for the ancestor subject resolver.
 */
export function parseFanChartPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const ownerWord = match.slice(1).find((part, index, parts) => part && index < parts.length - 1 && !/^\d+$/.test(part));
    const genText = match[match.length - 1];
    const owner = canonicalOwner(ownerWord);
    const asked = Number(genText);
    const generations = Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 2), FAN_CHART_MAX_GENERATIONS) : FAN_CHART_DEFAULT_GENERATIONS;
    const ancestorPrompt = !owner
      ? "this profile's ancestors"
      : /^(?:my|her|his|their)$/.test(owner)
      ? `${owner} ancestors`
      : `${owner}'s ancestors`;
    return { owner, generations, ancestorPrompt };
  }
  return null;
}

function cleanDate(value) {
  const text = String(value || "");
  return text && !/^0000/.test(text) ? text : "";
}

export function yearOf(value) {
  const match = cleanDate(value).match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

// (WikiTree sends only the Id for a profile you may not see, e.g. when not signed in to the API: "Private")
function displayName(person) {
  return person?.RealName || person?.Derived?.ShortName || person?.FirstName || person?.Name || "Private";
}

/** "First Middle (LNAB) Current": the LNAB in brackets only when it differs; "" without a first name or surname. */
export function fullWikiTreeName(person) {
  if (!person?.FirstName || !(person.LastNameAtBirth || person.LastNameCurrent)) return "";
  try {
    // (PersonName writes "(Smith) null" when one surname is missing: fill it from the other.)
    const lnab = person.LastNameAtBirth || person.LastNameCurrent;
    const current = person.LastNameCurrent || person.LastNameAtBirth;
    const name = new PersonName({ ...person, LastNameAtBirth: lnab, LastNameCurrent: current }).withParts([
      "FirstName",
      "MiddleNames",
      "LastNameAtBirth",
      "LastNameCurrent",
    ]);
    return typeof name === "string" && !name.startsWith("Invalid name part") ? name.replace(/\s+/g, " ").trim() : "";
  } catch (error) {
    return "";
  }
}

/**
 * people: getPeople's people map (keyed by Id, with Father and Mother Ids).
 * Returns slots[1 … 2^(generations+1)-1]; each is a person summary or null.
 */
export function buildFanSlots(people, rootKey, generations) {
  const byId = new Map();
  const byName = new Map();
  Object.values(people || {}).forEach((person) => {
    if (!person) return;
    if (person.Id !== undefined) byId.set(String(person.Id), person);
    if (person.Name) byName.set(String(person.Name), person);
  });
  const root = byId.get(String(rootKey)) || byName.get(String(rootKey)) || null;
  const total = 2 ** (generations + 1);
  const slots = new Array(total).fill(null);
  if (!root) return slots;
  const summarize = (person) => ({
    id: person.Id,
    wtid: person.Name || "",
    name: displayName(person),
    hidden: displayName(person) === "Private" && !person?.Name,
    fullName: fullWikiTreeName(person),
    lnab: person.LastNameAtBirth || "",
    gender: person.Gender || "",
    birth: cleanDate(person.BirthDate),
    death: cleanDate(person.DeathDate),
    birthLocation: person.BirthLocation || "",
    deathLocation: person.DeathLocation || "",
    birthCountry: getCountryFromLocation(person.BirthLocation || "") || "",
    photo: person.Photo || "",
    photoData: person.PhotoData || null,
    fatherId: Number(person.Father) || 0,
    motherId: Number(person.Mother) || 0,
    // How sure each parent link is ("30" = confirmed with DNA): see parentLinkStatus.
    fatherStatus: String(person.DataStatus?.Father ?? ""),
    motherStatus: String(person.DataStatus?.Mother ?? ""),
    // The Gold Standard checklist, when the loader asked for its fields (see profileQuality).
    ...(person.NoChildren !== undefined ? { quality: profileQuality(person) } : {}),
  });
  const people0 = new Array(total).fill(null);
  people0[1] = root;
  slots[1] = summarize(root);
  for (let slot = 1; slot < total / 2; slot += 1) {
    const person = people0[slot];
    if (!person) continue;
    const father = Number(person.Father) ? byId.get(String(person.Father)) : null;
    const mother = Number(person.Mother) ? byId.get(String(person.Mother)) : null;
    if (father) {
      people0[slot * 2] = father;
      slots[slot * 2] = summarize(father);
    }
    if (mother) {
      people0[slot * 2 + 1] = mother;
      slots[slot * 2 + 1] = summarize(mother);
    }
  }
  return slots;
}

export function generationOfSlot(slot) {
  return Math.floor(Math.log2(slot));
}

/** Per generation: {generation, found, possible}; plus totals and the deepest generation reached. */
export function fanChartStats(slots) {
  const generations = generationOfSlot(slots.length - 1);
  const rows = [];
  let found = 0;
  let possible = 0;
  let deepest = 0;
  for (let generation = 1; generation <= generations; generation += 1) {
    let count = 0;
    for (let slot = 2 ** generation; slot < 2 ** (generation + 1); slot += 1) if (slots[slot]) count += 1;
    rows.push({ generation, found: count, possible: 2 ** generation });
    found += count;
    possible += 2 ** generation;
    if (count) deepest = generation;
  }
  return { rows, found, possible, deepest };
}

/**
 * Pedigree collapse: ancestors who fill more than one slot (cousins who married).
 * Each repeated ancestor's own ancestors repeat too, so a "start" is a repeat whose
 * child in that slot isn't one; those are the points where two lines meet.
 * → {groups: [{id, name, wtid, slots, start}] (starts first, then most slots),
 *    bySlot: Map(slot → group), people: distinct people in the chart}.
 */
export function fanChartRepeats(slots) {
  const byId = new Map();
  let people = 0;
  slots.forEach((person, slot) => {
    if (!person || slot < 1) return;
    const key = String(person.id ?? person.wtid);
    if (!byId.has(key)) {
      byId.set(key, { id: person.id, name: person.name || person.wtid, wtid: person.wtid, slots: [] });
      people += 1;
    }
    byId.get(key).slots.push(slot);
  });
  const groups = [...byId.values()].filter((group) => group.slots.length > 1);
  const bySlot = new Map();
  groups.forEach((group) => group.slots.forEach((slot) => bySlot.set(slot, group)));
  groups.forEach((group) => {
    group.start = group.slots.some((slot) => slot > 1 && !bySlot.has(Math.floor(slot / 2)));
  });
  groups.sort((a, b) => Number(b.start) - Number(a.start) || b.slots.length - a.slots.length || a.slots[0] - b.slots[0]);
  return { groups, bySlot, people };
}

/** The birth countries in the chart, most common first: [[country, count], …]. */
export function fanChartCountries(slots) {
  const counts = new Map();
  slots.forEach((person, slot) => {
    if (!person || slot === 1 || !person.birthCountry) return;
    counts.set(person.birthCountry, (counts.get(person.birthCountry) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Surnames at birth among the ancestors (each person once, however often they appear): [[surname, count]], most first. */
export function fanChartSurnames(slots) {
  const counts = new Map();
  const seen = new Set();
  slots.forEach((person, slot) => {
    if (!person || slot === 1 || !person.lnab) return;
    const id = String(person.id || person.wtid);
    if (seen.has(id)) return;
    seen.add(id);
    counts.set(person.lnab, (counts.get(person.lnab) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** "Your ancestors carry 57 surnames. The most common: …", for the surname view of the fan chart. */
export function buildSurnameSummary(slots, ownerText) {
  const surnames = fanChartSurnames(slots);
  if (!surnames.length) return `${ownerText} ancestors have no surnames recorded on WikiTree yet.`;
  const top = surnames.slice(0, 6).map(([surname, count]) => `${surname} (${count})`);
  const father = slots[2]?.lnab;
  const mother = slots[3]?.lnab;
  const lines = [`${ownerText} ancestors carry ${surnames.length} surname${surnames.length === 1 ? "" : "s"} over ${fanChartStats(slots).rows.length} generations. The most common: ${top.join(", ")}.`];
  if (father || mother) lines.push(`The fan chart colours each surname, so you can follow ${[father, mother].filter(Boolean).join(" and ")} back up their lines.`);
  return lines.join("\n");
}

function generationWord(generation) {
  if (generation === 1) return "parents";
  if (generation === 2) return "grandparents";
  if (generation === 3) return "great-grandparents";
  return `${generation - 2}x great-grandparents`;
}

/** "Your fan chart shows 87 of 254 ancestors over 7 generations (34%) …". */
export function buildFanChartSummary(slots, ownerText) {
  const { found, possible, deepest, rows } = fanChartStats(slots);
  const generations = rows.length;
  if (!found) return `${ownerText} fan chart is empty: no parents are recorded on WikiTree.`;
  const percent = Math.round((found / possible) * 100);
  let complete = 0;
  while (complete < rows.length && rows[complete].found === rows[complete].possible) complete += 1;
  const fullText = complete ? ` Every ancestor is filled in through the ${generationWord(complete)}.` : "";
  const countries = fanChartCountries(slots).slice(0, 3);
  const countryText = countries.length ? ` Most were born in ${countries.map(([country, count]) => `${country} (${count})`).join(", ")}.` : "";
  return `${ownerText} fan chart shows ${found} of ${possible} possible ancestors over ${generations} generations (${percent}%), reaching back ${deepest} generation${
    deepest === 1 ? "" : "s"
  }.${fullText}${countryText}`;
}
