// Name cloud (2026-10-03, the "Wow!" visuals): the first names and surnames among
// someone's ancestors, sized by how many carried them and coloured by when. The
// data comes from the fan chart's Ahnentafel slots; the drawing is
// chat_name_cloud.js.

import { yearOf } from "./chat_chart_common";
import { groupNameSpellings, isCustomGroup, nameKeyFor } from "./chat_name_variants";
import { generationOfSlot } from "./chat_fan_chart_data";
import { CHART_OWNER as OWNER, canonicalChartOwner as canonicalOwner } from "./chat_chart_owner";

export const NAME_CLOUD_GENERATIONS = 8;

const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;
const PATTERNS = [
  // "name cloud", "show my ancestors' name cloud", "Cook-8721's family names cloud"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+|ancestral\s+|family\s+)?(?:(?:first\s+)?names?|word)\s+cloud$`, "i"),
  // "name cloud of my ancestors"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:first\s+)?names?\s+cloud\s+(?:of|for)\s+${OWNER}\s+ancestors$`, "i"),
  // "what are the most common (first) names in my tree", "most popular names among her ancestors"
  new RegExp(
    String.raw`^(?:what\s+(?:are|were)\s+)?(?:the\s+)?(?:most\s+(?:common|popular|frequent)|commonest|favou?rite)\s+(?:first\s+|given\s+|christian\s+)?names\s+(?:in|among|of)\s+${OWNER}\s+(?:family\s+(?:tree)?|tree|ancestry|ancestors|pedigree)$`,
    "i"
  ),
  // "what names run in my family"
  new RegExp(String.raw`^(?:what|which)\s+(?:first\s+)?names\s+run\s+in\s+${OWNER}\s+family$`, "i"),
];

// The surname river (2026-10-04): surnames by generation as a streamgraph.
const RIVER_PATTERNS = [
  // "surname river", "show my surname river", "Cook-8721's surnames streamgraph", "my ancestors' surname river"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+|ancestral\s+|family\s+)?surnames?\s+(?:river|stream(?:graph)?)$`, "i"),
  // "surnames by generation", "my ancestors' surnames by generation"
  new RegExp(String.raw`^${LEAD}(?:the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+|family\s+)?(?:sur|family\s+|last\s+)names\s+(?:by|per|in\s+each)\s+generation$`, "i"),
  // "how did the surnames change over the generations", "how have my family's surnames changed through the generations"
  new RegExp(
    String.raw`^how\s+(?:did|have|do)\s+(?:the\s+)?(?:${OWNER}\s+)?(?:family['’]s\s+|ancestors?['’]?\s+)?(?:sur|family\s+|last\s+)names\s+chang(?:e|ed)\s+(?:over|across|through|down)\s+(?:the\s+)?generations$`,
    "i"
  ),
];


/** {owner, ancestorPrompt} (plus river: true for the surname river) or null; owner as in parseFanChartPrompt. */
export function parseNameCloudPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const [patterns, river] of [
    [RIVER_PATTERNS, true],
    [PATTERNS, false],
  ]) {
    for (const re of patterns) {
      const match = text.match(re);
      if (!match) continue;
      const owner = canonicalOwner(match[1]);
      const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
      return river ? { owner, ancestorPrompt, river: true } : { owner, ancestorPrompt };
    }
  }
  return null;
}

/** The given name to count: the first word, without initials or bracketed nicknames. */
export function firstNameOf(person) {
  const words = String(person?.firstName || person?.name || "")
    .replace(/\([^)]*\)|"[^"]*"/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/^[A-Z]\.?$/.test(word) && !/^(?:Sir|Lady|Dr|Rev|Capt|Col|Lord|King|Queen|Prince|Princess|Duke|Earl)\.?$/i.test(word));
  return words[0] ? words[0].replace(/[.,]+$/, "") : "";
}

/**
 * Words for the cloud: [{text, count, people:[{wtid, name, birthYear, generation}], meanYear,
 * gender, spellings?}] for "first" or "surname", most first. Each ancestor counts once (pedigree
 * collapse puts some in several slots). gender: the commoner gender for a first name.
 * Spellings of one name count together under the commonest (2026-10-15): José and Jose, and
 * for surnames the One Name Study variants too; spellings lists them ([[spelling, n]]) when
 * there are several. Your own groupings apply too (yours: true when they made the group).
 */
export function buildNameCloud(slots, kind = "first") {
  const found = [];
  const seen = new Set();
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 2) return;
    const id = String(person.id || person.wtid);
    if (seen.has(id)) return;
    seen.add(id);
    const text = kind === "surname" ? String(person.lnab || "").trim() : firstNameOf(person);
    if (!text || /^unknown$/i.test(text)) return;
    found.push({ person, slot, text });
  });
  const groups = groupNameSpellings(
    found.map(({ text }) => text),
    nameKeyFor(kind === "surname" ? "surname" : "first"),
    kind === "surname" ? "surname" : "first"
  );
  const words = new Map();
  found.forEach(({ person, slot, text: spelling }) => {
    const text = groups.labelOf(spelling);
    const entry = words.get(text) || { text, count: 0, people: [], years: [], male: 0, female: 0 };
    entry.count += 1;
    const birthYear = yearOf(person.birth);
    if (birthYear) entry.years.push(birthYear);
    if (person.gender === "Male") entry.male += 1;
    if (person.gender === "Female") entry.female += 1;
    entry.people.push({ wtid: person.wtid || "", name: person.fullName || [person.name || person.wtid || "", person.lnab && !String(person.name || "").includes(person.lnab) ? person.lnab : ""].filter(Boolean).join(" "), lnab: person.lnab || "", birthYear, generation: person.generation ?? generationOfSlot(slot) });
    words.set(text, entry);
  });
  return [...words.values()]
    .map(({ years, male, female, ...entry }) => ({
      ...entry,
      meanYear: years.length ? Math.round(years.reduce((sum, year) => sum + year, 0) / years.length) : null,
      gender: male > female ? "Male" : female > male ? "Female" : "",
      ...(groups.spellings.has(entry.text) ? { spellings: groups.spellings.get(entry.text) } : {}),
      // (yours: grouped by you, not by a One Name Study or accents)
      ...(groups.spellings.has(entry.text) && isCustomGroup(groups.spellings.get(entry.text).map(([name]) => name), kind === "surname" ? "surname" : "first") ? { yours: true } : {}),
    }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

/** The chat reply: the top names, and the name passed down most generations. */
export function buildNameCloudSummary(slots, ownerText, scope = "ancestors") {
  const first = buildNameCloud(slots, "first");
  const surnames = buildNameCloud(slots, "surname");
  if (!first.length && !surnames.length) return `${ownerText} ${scope} have no names recorded on WikiTree yet.`;
  const top = (list, gender) =>
    list
      .filter((word) => word.count > 1 && (!gender || word.gender === gender))
      .slice(0, 4)
      .map((word) => `${word.text} (${word.count})`);
  const lines = [];
  const men = top(first, "Male");
  const women = top(first, "Female");
  if (men.length || women.length) {
    lines.push(
      `The commonest first names among ${ownerText.toLowerCase() === "your" ? "your" : ownerText} ${scope}: ${[
        men.length ? `men ${men.join(", ")}` : "",
        women.length ? `women ${women.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("; ")}.`
    );
  } else if (first.length) {
    lines.push(`${ownerText} ${scope} have ${first.length} different first names, none used twice.`);
  }
  // A name that ran down the generations: the first name spanning the most generations.
  const span = (word) => {
    const generations = word.people.map((person) => person.generation);
    return Math.max(...generations) - Math.min(...generations) + 1;
  };
  const longest = first.filter((word) => word.count > 2).sort((a, b) => span(b) - span(a) || b.count - a.count)[0];
  if (longest && span(longest) >= 3) lines.push(`"${longest.text}" ran through ${span(longest)} generations.`);
  if (surnames.length) lines.push(`${surnames.length} surnames in all; the cloud has both.`);
  return lines.join("\n");
}
