// "Find his family on WikiTree" (2026-10-07): a member asked, on an unconnected
// profile (Densham-156), whether Genie could look for the parents, siblings, wife
// and children named in the biography. The relatives are read from the biography
// (by the AI when there is a key; otherwise from "son of A & B", "married X" and
// census household tables), then each one is searched for on WikiTree and the
// candidates are scored. Genie suggests; it never connects anyone.

import { getCountryFromLocation } from "./chat_place_country";
import { makeProfileLink } from "./tables";
import { foldAccents, joinWithAnd } from "./chat_text_utils";

const SUBJECT_POSS = String.raw`(his|her|their|this\s+person(?:'s|’s)|the\s+profile\s+person(?:'s|’s)|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,4}(?:'s|’s))`;
const KIN_WORD = String.raw`(?:family(?:\s+members)?|relatives|relations|kin|parents|siblings|brothers\s+and\s+sisters|children|kids|sons\s+and\s+daughters|spouses?|wife|wives|husbands?)`;
// "wife or children", "parents, siblings and children": one or more, kept together.
const KIN = String.raw`(${KIN_WORD}(?:(?:\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or|&)\s+)${KIN_WORD})*)`;
const ON_WT = String.raw`(?:already\s+)?(?:on|in)\s+wikitree`;
const FIND = String.raw`(?:find|search\s+for|look\s+for|look\s+up|check\s+for|check)`;
// No owner named ("are any relatives on WikiTree?", "find the parents on WikiTree") means the page profile, not "me".
const SUBJECT = String.raw`(?:${SUBJECT_POSS}\s+|the\s+)?`;
const FIND_RELATIVES_RES = [
  new RegExp(String.raw`^${FIND}\s+(?:any\s+)?${SUBJECT}${KIN}\s+${ON_WT}$`, "i"),
  // "Are there profiles for this person's wife or children on WikiTree?" (Rowland-18000, 2026-10-12)
  new RegExp(String.raw`^(?:(?:are|is)\s+(?:there\s+)?)?(?:any\s+)?(?:profiles?\s+for\s+)?(?:any\s+(?:of\s+)?|some\s+(?:of\s+)?)?${SUBJECT}${KIN}\s+${ON_WT}$`, "i"),
  new RegExp(String.raw`^(?:which|who)\s+of\s+${SUBJECT}${KIN}\s+(?:are|is)\s+${ON_WT}$`, "i"),
  new RegExp(String.raw`^(?:search|check)\s+wikitree\s+for\s+(?:any\s+)?${SUBJECT}${KIN}$`, "i"),
  new RegExp(String.raw`^(?:does|do)\s+${SUBJECT_POSS}\s+${KIN}\s+(?:exist|have\s+profiles?)\s+${ON_WT}$`, "i"),
  new RegExp(
    String.raw`^${FIND}\s+(?:the\s+)?(?:family|relatives|people)\s+(?:named\s+|mentioned\s+|listed\s+)?in\s+${SUBJECT_POSS}\s+bio(?:graphy)?(?:\s+${ON_WT})?$`,
    "i"
  ),
];
// "Do any of the people in the bio have WT profiles?" (the user, 2026-10-07): the people a
// biography names, asked about as a group. Group 1 is the bio's owner when named.
const BIO = String.raw`(?:${SUBJECT_POSS}\s+|the\s+|this\s+)?(?:bio|biography|profile\s+text)`;
const BIO_PEOPLE = String.raw`(?:people|persons|individuals|names|relatives|relations|family(?:\s+members)?|anyone|anybody|everyone|everybody|someone|somebody)`;
const IN_BIO = String.raw`(?:(?:named|mentioned|listed|found)\s+)?(?:in|from)\s+${BIO}`;
const HAS_PROFILE = String.raw`(?:(?:already\s+)?(?:on|in)\s+wikitree|(?:already\s+)?(?:have|has|got)\s+(?:got\s+)?(?:a\s+|any\s+|their\s+own\s+|their\s+|its\s+own\s+)?(?:wikitree\s+)?profiles?(?:\s+(?:on|in)\s+wikitree)?|(?:already\s+)?exists?\s+on\s+wikitree)`;
FIND_RELATIVES_RES.push(
  new RegExp(String.raw`^(?:do|does|are|is|have|has)\s+(?:there\s+)?(?:any\s+(?:of\s+)?|all\s+(?:of\s+)?)?(?:the\s+)?${BIO_PEOPLE}\s+${IN_BIO}\s+${HAS_PROFILE}$`, "i"),
  new RegExp(String.raw`^(?:which|what|who)(?:\s+of)?(?:\s+the)?(?:\s+${BIO_PEOPLE})?\s+${IN_BIO}\s+(?:are|is|have|has)\s+(?:already\s+)?(?:on\s+wikitree|(?:got\s+)?(?:a\s+|any\s+)?(?:wikitree\s+)?profiles?(?:\s+on\s+wikitree)?)$`, "i"),
  new RegExp(String.raw`^(?:find|search\s+for|look\s+for|look\s+up|check(?:\s+for)?)\s+(?:any\s+of\s+)?(?:the\s+)?${BIO_PEOPLE}\s+${IN_BIO}(?:\s+on\s+wikitree)?$`, "i"),
  new RegExp(String.raw`^(?:search|check)\s+wikitree\s+for\s+(?:the\s+)?${BIO_PEOPLE}\s+${IN_BIO}$`, "i"),
  // The short form for the Help (the user, 2026-10-07): "check for profiles", "check the bio for profiles".
  new RegExp(String.raw`^(?:check|search|look)(?:\s+${BIO})?\s+for\s+(?:wikitree\s+)?profiles(?:\s+(?:in|from)\s+${BIO})?$`, "i")
);
const PROFILE_SUBJECT_RE = /^(?:his|her|their|this\s+person(?:'s|’s)|the\s+profile\s+person(?:'s|’s))$/i;

// Any word order (the user, 2026-10-07: "recognise Qs in various forms"): a question or
// "check/find" that names the bio, its people and WikiTree profiles, e.g. "Are the bio
// people on WikiTree?", "Do the names in the bio match any profiles?". It declines anything
// that asks for another action (create, link, merge …), about "me", or about duplicates.
const LOOSE_BIO_RE = /\b(?:bio|biography|profile\s+text)\b/i;
const LOOSE_PEOPLE_RE =
  /\b(?:people|persons|individuals|names|relatives|relations|family|kin|anyone|anybody|everyone|everybody|someone|somebody|parents|siblings|brothers|sisters|children|kids|sons|daughters|spouses?|wife|wives|husbands?)\b/i;
const LOOSE_PROFILE_RE = /\b(?:profiles?|on\s+wikitree|in\s+wikitree)\b/i;
const LOOSE_OPENING_RE = /^(?:do|does|did|are|is|were|was|have|has|which|who|what|whose|how\s+many|find|check|search|look|see\s+if|any|anyone|anybody|profiles?\s+for)\b/i;
// Politeness and "tell me" aren't about "me": dropped before the checks.
const LOOSE_POLITE_RE = /^(?:(?:can|could|would|will)\s+you\s+|please\s+|tell\s+me\s+|show\s+me\s+|let\s+me\s+know\s+)+/i;
const LOOSE_DECLINE_RE =
  /\b(?:my|me|mine|i|create|add|make|write|edit|update|link|connect|attach|merge|delete|remove|duplicates?|dupes?|born|died|married|lived|when|where|why|how\s+old|sources?|cited|citations?|census|dna)\b/i;
const LOOSE_KIN = [
  [/\bparents\b/i, ["father", "mother"]],
  [/\b(?:siblings|brothers|sisters)\b/i, ["sibling"]],
  [/\b(?:children|kids|sons|daughters)\b/i, ["child"]],
  [/\b(?:spouses?|wife|wives|husbands?)\b/i, ["spouse"]],
];
const LOOSE_BIO_WORD = String.raw`(?:'s|’s)\s+(?:bio|biography|profile\s+text)\b`;
const LOOSE_OWNER_ID_RE = new RegExp(String.raw`\b([A-Za-z][A-Za-z'_]*-\d+)${LOOSE_BIO_WORD}`);
const LOOSE_OWNER_NAME_RE = new RegExp(String.raw`\b((?:[A-Z][A-Za-z'.]*\s+){0,3}[A-Z][A-Za-z'.]*)${LOOSE_BIO_WORD}`);

/** The bio's owner when named ("Beacall-491's bio", "Philip Beacall's bio"); "" = the page profile. */
function looseBioOwner(text) {
  const id = text.match(LOOSE_OWNER_ID_RE);
  if (id) return id[1];
  const name = text.match(LOOSE_OWNER_NAME_RE);
  if (!name) return "";
  // The sentence's own capital ("Philip's bio …" is fine, "Do Philip's …" loses "Do").
  const words = name[1].split(/\s+/);
  if (name.index === 0 && words.length > 1 && LOOSE_OPENING_RE.test(words[0])) words.shift();
  return LOOSE_OPENING_RE.test(words.join(" ")) && words.length === 1 ? "" : words.join(" ");
}

function parseLooseBioPeoplePrompt(prompt) {
  const text = prompt.replace(LOOSE_POLITE_RE, "");
  if (text.split(" ").length > 16) return null;
  const withoutBio = text.replace(/\bprofile\s+text\b/gi, "bio");
  if (!LOOSE_OPENING_RE.test(text) || !LOOSE_BIO_RE.test(text) || !LOOSE_PEOPLE_RE.test(text) || !LOOSE_PROFILE_RE.test(withoutBio)) return null;
  if (LOOSE_DECLINE_RE.test(text)) return null;
  const roles = [...new Set(LOOSE_KIN.filter(([re]) => re.test(text)).flatMap(([, kinRoles]) => kinRoles))];
  return { target: looseBioOwner(text), roles };
}

/** {target ("" = the page profile), roles ([] = everyone)}, or null. */
export function parseFindRelativesPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\bWT(?!\+)\b/g, "WikiTree") // "WT profiles"
    .replace(/\s+/g, " ");
  for (const re of FIND_RELATIVES_RES) {
    const match = text.match(re);
    if (!match) continue;
    const subject = String(match[1] || "").trim();
    const kin = String(match[2] || "").trim();
    // "family" or "relatives" anywhere in the list means everyone; otherwise each kin word's roles.
    const roles = /\b(?:family|relatives|relations|kin)\b/i.test(kin)
      ? []
      : [...new Set(LOOSE_KIN.filter(([re]) => re.test(kin)).flatMap(([, kinRoles]) => kinRoles))];
    if (!subject || PROFILE_SUBJECT_RE.test(subject)) return { target: "", roles };
    const name = subject.replace(/(?:'s|’s)$/, "").trim();
    // Case-insensitive patterns: a bare name must really be capitalised.
    if (!/-\d+$/.test(name) && !/^(?:[A-Z][^\s]*\s*)+$/.test(name)) return null;
    return { target: name, roles };
  }
  return parseLooseBioPeoplePrompt(text);
}

// "Do Jean Prévost and Françoise Lamontagne have WikiTree profiles?", "locate profiles of the couple Jean
// Prévost and Françoise Lamontagne" (Heard-171, 2026-10-31): particular people, by name, each a capitalised
// first name and surname (with de, dit, van and the like between).
const PERSON_NAME = String.raw`\p{Lu}[\p{L}\p{M}'’.-]*(?:\s+(?:(?:de|du|des|la|le|dit|van|von|der|den|di|da|del|y)\s+)*\p{Lu}[\p{L}\p{M}'’.-]*){1,4}`;
const PERSON_NAMES = String.raw`(${PERSON_NAME}(?:\s*,\s*${PERSON_NAME})*(?:\s*,?\s+(?:and|&)\s+${PERSON_NAME})?)`;
const COUPLE_WORDS = String.raw`(?:the\s+couple\s+|(?:the\s+)?(?:husband\s+and\s+wife|married\s+couple)\s+)?`;
const ON_WIKITREE = String.raw`(?:\s+(?:already\s+)?(?:on|in)\s+wikitree)?`;
const NAMED_PEOPLE_RES = [
  new RegExp(
    String.raw`^(?:${FIND}|locate|search)\s+(?:the\s+)?(?:wikitree\s+)?profiles?\s+(?:of|for)\s+${COUPLE_WORDS}${PERSON_NAMES}${ON_WIKITREE}$`,
    "iu"
  ),
  new RegExp(String.raw`^(?:do(?:es)?|did)\s+${COUPLE_WORDS}${PERSON_NAMES}\s+(?:already\s+)?(?:have|has)\s+(?:a\s+|any\s+)?(?:wikitree\s+)?profiles?${ON_WIKITREE}$`, "iu"),
  new RegExp(String.raw`^(?:are|is)\s+${COUPLE_WORDS}${PERSON_NAMES}\s+(?:already\s+)?(?:on|in)\s+wikitree$`, "iu"),
  new RegExp(String.raw`^(?:is|are)\s+there\s+(?:a\s+|any\s+)?(?:wikitree\s+)?profiles?\s+(?:of|for)\s+${COUPLE_WORDS}${PERSON_NAMES}${ON_WIKITREE}$`, "iu"),
];
const NOT_A_PERSON_RE = /^(?:wikitree|genie|this|that|these|those|his|her|their|my|the|profile|profiles|bio|biography)$/i;

const PROFILE_ASK_RE =
  /\b(?:have|has|got)\s+(?:a\s+|any\s+)?(?:wikitree\s+)?profiles?\b|\b(?:locate|find|search\s+for|look\s+for|look\s+up)\b[^.?!]{0,40}\bprofiles?\b|\b(?:are|is)\s+(?:they|those\s+(?:people|two)|these\s+(?:people|two)|both(?:\s+of\s+them)?)\s+(?:on|in)\s+wikitree\b/i;
const THOSE_PEOPLE_RE = /\b(?:those|these)\s+(?:people|persons|two)\b|\bthe\s+couple\b|\b(?:them|they)\b/i;

/**
 * Whether the prompt asks if particular people have WikiTree profiles: by name, or as "those people" after
 * naming them ("…adoptive parents were Jean Prévost and Françoise Lamontagne. Do those people have WikiTree
 * profiles?"). Such a question is the planner's to read, not a WT+ search's (Heard-171, 2026-10-31).
 */
export function asksWhetherPeopleHaveProfiles(prompt) {
  const text = String(prompt || "");
  if (!PROFILE_ASK_RE.test(text)) return false;
  if (parseFindNamedPeoplePrompt(text)) return true;
  const names = (text.match(new RegExp(PERSON_NAME, "gu")) || []).filter((name) => !name.split(/\s+/).some((word) => NOT_A_PERSON_RE.test(word)));
  return names.length > 0 || THOSE_PEOPLE_RE.test(text);
}

/** {names, couple} for a question about particular named people's profiles, or null. */
export function parseFindNamedPeoplePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\bWT(?!\+)\b/g, "WikiTree")
    .replace(LOOSE_POLITE_RE, "")
    .replace(/\s+/g, " ");
  for (const re of NAMED_PEOPLE_RES) {
    const match = text.match(re);
    if (!match) continue;
    const names = match[1].split(/\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&)\s+/).map((name) => name.trim()).filter(Boolean);
    // (case-insensitive patterns: every name must really start with a capital, and none be a pronoun)
    if (!names.length || names.length > 6) return null;
    if (names.some((name) => !/^\p{Lu}/u.test(name) || name.split(/\s+/).some((word) => NOT_A_PERSON_RE.test(word)))) return null;
    const couple = /\b(?:couple|husband\s+and\s+wife)\b/i.test(text) && names.length === 2;
    return { names, couple };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Names

const fold = (value) =>
  foldAccents(value)
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const yearOf = (value) => {
  const match = String(value || "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  const year = match ? Number(match[1]) : 0;
  return year && !/^0000/.test(String(value)) ? year : 0;
};

/** "Mary (Singleton) Densham" → {given: ["Mary"], birthSurname: "Singleton", surname: "Densham"}. */
export function splitName(raw) {
  let text = String(raw || "")
    .replace(/'''|''/g, "")
    .replace(/\s+/g, " ")
    .trim();
  let birthSurname = "";
  const maiden = text.match(/\(([A-Z][A-Za-z'-]+)\)/) || text.match(/\bn[ée]e\s+([A-Z][A-Za-z'-]+)/i);
  if (maiden) {
    birthSurname = maiden[1];
    text = text.replace(maiden[0], " ").replace(/\s+/g, " ").trim();
  }
  const parts = text.split(" ").filter(Boolean);
  if (!parts.length) return { given: [], surname: "", birthSurname };
  const surname = parts.length > 1 ? parts[parts.length - 1] : "";
  const given = parts.length > 1 ? parts.slice(0, -1) : parts;
  return { given: given.map((part) => part.replace(/\.$/, "")), surname, birthSurname };
}

/** A person asked about by name, searched for like a relative the biography names in passing. */
export function relativeFromName(name, { partnerKey = "" } = {}) {
  const parts = splitName(name);
  const surnames = [parts.surname, parts.birthSurname].filter(Boolean);
  return { role: "other", ...parts, surnames, birthYear: 0, birthPlace: "", gender: "", evidence: [], asked: true, ...(partnerKey ? { partnerKey } : {}) };
}

/**
 * The people asked about, as the biography knows them when it names them (Heard-171's "adoptive parents
 * Jean Prévost and Françoise Lamontagne (aka Leblanc)" are her father and mother there, with their years
 * and each other); the rest by name alone. `couple`: the two asked about are married to each other.
 */
export function namedPeopleAsRelatives(names, bioRelatives = [], { couple = false } = {}) {
  const used = new Set();
  const firstOf = (name) => fold(splitName(name).given[0]);
  const sameFirst = (relative, first) => fold(relative.given?.[0]) === first;
  const byName = names.map((name) => {
    const wanted = splitName(name);
    const last = [wanted.surname, wanted.birthSurname].map(fold).filter(Boolean);
    const known = bioRelatives.find(
      (relative) =>
        !used.has(relative) &&
        sameFirst(relative, firstOf(name)) &&
        [relative.surname, relative.birthSurname, ...(relative.surnames || [])].map(fold).some((surname) => surname && last.includes(surname))
    );
    if (known) used.add(known);
    return known;
  });
  // The bio may give one of them by another surname ("Françoise Lamontagne (aka Françoise Leblanc)", read as
  // Françoise Leblanc): the only one in the bio with that first name is the one meant.
  const people = names.map((name, index) => {
    let known = byName[index];
    if (!known) {
      const sameFirstName = bioRelatives.filter((relative) => sameFirst(relative, firstOf(name)));
      if (sameFirstName.length === 1 && !used.has(sameFirstName[0])) known = sameFirstName[0];
    }
    if (!known) return relativeFromName(name);
    used.add(known);
    // (her surname as asked is searched for too)
    const asked = splitName(name).surname;
    const surnames = asked && !(known.surnames || []).some((surname) => fold(surname) === fold(asked)) ? [...(known.surnames || []), asked].slice(0, 3) : known.surnames;
    return { ...known, surnames, asked: true };
  });
  // Two asked about as a couple, and not already the bio's father and mother: each other's spouse.
  const unpaired = people.filter((person) => !["father", "mother", "spouse"].includes(person.role));
  if (couple && people.length === 2 && unpaired.length) return people.map((person) => ({ ...person, partnerKey: "asked couple" }));
  return people;
}

/** Same person, roughly: first names start alike (Elizah/Elijah, Elisabeth/Elizabeth) and years agree. */
function samePerson(a, b) {
  if (roleGroup(a.role) !== roleGroup(b.role)) return false;
  // Henry William and Henrietta Ricketts: a father is never his wife.
  if (a.role !== b.role && a.role !== "parent" && b.role !== "parent") return false;
  if (a.gender && b.gender && a.gender !== b.gender) return false;
  // Two people named only in passing are one only with the same surname too.
  if (a.role === "other" && fold(a.surname) !== fold(b.surname)) return false;
  const first = (person) => fold(person.given[0]);
  const fa = first(a);
  const fb = first(b);
  if (!fa || !fb) return false;
  if (fa === fb) return !(a.birthYear && b.birthYear) || Math.abs(a.birthYear - b.birthYear) <= 4;
  // A census misreading (Mildred/Wildred): one letter off, same year give or take one.
  const slip = fa.length >= 4 && fb.length >= 4 && oneEditApart(fa, fb);
  const sameStart = fa.length >= 3 && fb.length >= 3 && fa.slice(0, 3) === fb.slice(0, 3);
  if (!slip && !sameStart) return false;
  if (a.birthYear && b.birthYear) return Math.abs(a.birthYear - b.birthYear) <= (slip ? 1 : 2);
  return sameStart;
}

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}

const roleGroup = (role) => (role === "father" || role === "mother" || role === "parent" ? "parent" : role);

function placeDetail(place) {
  const text = String(place || "").trim();
  if (!text || /^not\s+in\b/i.test(text) || /^(?:unknown|n\/?a|-)$/i.test(text)) return 0;
  return text.split(",").length + text.length / 1000;
}

/** Combine mentions of one person across records: fuller names, most specific place, years averaged. */
export function mergeRelatives(list) {
  const merged = [];
  for (const person of list) {
    const same = merged.find((entry) => samePerson(entry, person));
    if (!same) {
      merged.push({ ...person, given: [...person.given], years: person.birthYear ? [person.birthYear] : [], evidence: [...(person.evidence || [])] });
      continue;
    }
    if (same.role === "parent" && person.role !== "parent") same.role = person.role;
    if (same.role !== "parent") delete same.likelyFather;
    // Fuller names win: "Edith May" over "Edith M". A different spelling of the
    // first name is kept, so both are searched for.
    const firstNames = [...new Set([...(same.altFirst || [same.given[0]]), person.given[0]].filter(Boolean))];
    const fullness = (given) => given.length * 100 + given.join(" ").length;
    if (fullness(person.given) > fullness(same.given)) same.given = [...person.given];
    same.altFirst = firstNames.filter((name) => fold(name) !== fold(same.given[0]));
    if (!same.surname && person.surname) same.surname = person.surname;
    // "John Fabian (Beacall) Lacon" after "his son, John Beacall": the fuller form, married name and all.
    if (!same.birthSurname && person.birthSurname) {
      same.birthSurname = person.birthSurname;
      if (person.surname) same.surname = person.surname;
    }
    if (!same.linkedId && person.linkedId) same.linkedId = person.linkedId;
    if (person.birthYear) same.years.push(person.birthYear);
    if (placeDetail(person.birthPlace) > placeDetail(same.birthPlace)) same.birthPlace = person.birthPlace;
    if (!same.gender && person.gender) same.gender = person.gender;
    for (const item of person.evidence || []) if (!same.evidence.includes(item)) same.evidence.push(item);
  }
  return merged
    .map(({ likelyFather, ...person }) => (person.role === "parent" && likelyFather ? { ...person, role: "father", gender: person.gender || "Male" } : person))
    .filter((person) => person.role !== "parent") // "son of X" alone: never matched to a father or mother
    .map(({ years, altFirst = [], ...person }) => ({
      ...person,
      firstNames: [person.given[0], ...altFirst.filter((name) => fold(name) !== fold(person.given[0]))],
      birthYear: years.length ? Math.round(years.reduce((sum, year) => sum + year, 0) / years.length) : 0,
    }));
}

// ---------------------------------------------------------------------------
// Reading the biography without AI

function cleanCell(cell) {
  return String(cell || "")
    .replace(/^\s*[|!]\s*/, "")
    .replace(/'''|''/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .trim();
}

function parseAge(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  if (/\b(?:mo|mos|month|months|m|wk|wks|weeks?|d|days?)\b/i.test(value) && !/\byears?\b/i.test(value)) return 0;
  const number = Number((value.match(/\d+/) || [])[0]);
  return Number.isFinite(number) && value.match(/\d/) ? number : null;
}

/** The census year a table belongs to: the last "1851 census" before it. */
function censusYearBefore(text, index) {
  const before = text.slice(Math.max(0, index - 2500), index);
  const matches = [...before.matchAll(/\b(1[6-9]\d\d)\s+(?:[A-Z][a-z]+\s+){0,3}census\b/gi)];
  return matches.length ? Number(matches[matches.length - 1][1]) : 0;
}

/** Census household tables ({| ... |}) as {year, header, rows: [{cells, bold}]}. */
export function readCensusTables(bio) {
  const text = String(bio || "");
  const tables = [];
  for (const match of text.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const year = censusYearBefore(text, match.index);
    if (!year) continue;
    const rows = match[0]
      .split(/\n\|-[^\n]*/)
      .slice(1)
      .map((row) => {
        const line = row.replace(/\n\|\}\s*$/, "").trim();
        return { bold: /'''/.test(line), cells: line.split(/\|\||!!/).map(cleanCell) };
      })
      .filter((row) => row.cells.length > 1);
    if (rows.length < 2 || isRecordTable(rows)) continue;
    const header = rows[0].cells.map((cell) => fold(cell));
    if (!header.includes("name")) continue;
    tables.push({ year, header, rows: rows.slice(1) });
  }
  return tables;
}

/** "Name:||Philip Beacall", "Father:||…": one record's fields, a label to a row (not a household). */
function isRecordTable(rows) {
  return rows.filter((row) => /:\s*$/.test(row.cells[0])).length * 2 >= rows.length;
}

/**
 * Record tables ({| … |} of "Label:||value" rows: a baptism, a marriage, one census entry) as
 * {kind, year, fields: Map(label → value)}. The census tables there were read as households, each label a
 * person: "Estimated Birth Year:", "Spouse's Name:" (Beacall-11, 2026-10-18).
 */
export function readRecordTables(bio) {
  const text = String(bio || "");
  const records = [];
  for (const match of text.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const rows = match[0]
      .split(/\n\|-[^\n]*/)
      .slice(1)
      .map((row) => row.replace(/\n\|\}\s*$/, "").trim().split(/\|\||!!/).map(cleanCell))
      .filter((cells) => cells.length > 1);
    if (rows.length < 2 || !isRecordTable(rows.map((cells) => ({ cells })))) continue;
    const fields = new Map();
    for (const cells of rows) {
      const label = fold(cells[0].replace(/:\s*$/, ""));
      if (label && !fields.has(label)) fields.set(label, cells.slice(1).find((cell) => cell) || "");
    }
    // "Baptism:" or "1861 England Census:" on the line before the table; else the record type.
    // ("… on September 3, 1855.<ref>Marriage:": what follows the tag)
    const lead = (text.slice(Math.max(0, match.index - 200), match.index).trim().split(/\n|>|\.\s/).pop() || "").replace(/[:\s]+$/, "");
    const dated = [...fields].find(([label, value]) => /\bdate\b/.test(label) && /\b1[0-9]\d\d\b/.test(value));
    const census = lead.match(/\b(1[6-9]\d\d)\b.*\bcensus\b/i);
    const kind = census ? "census" : fold(fields.get("record type") || fields.get("event type") || lead).split(" ")[0] || "record";
    const year = census ? Number(census[1]) : dated ? Number(dated[1].match(/\b1[0-9]\d\d\b/)[0]) : 0;
    records.push({ kind: kind === "christening" ? "baptism" : kind, year, fields });
  }
  return records;
}

/** The family a record gives: a baptism whose father or mother is the subject gives a child; the subject's own, parents and a spouse. */
function relativesFromRecord(record, subject) {
  const { fields } = record;
  const get = (...labels) => labels.map((label) => fields.get(label)).find(Boolean) || "";
  const firstNames = [subject.FirstName, subject.RealName].map(fold).filter(Boolean);
  const surnames = [subject.LastNameAtBirth, subject.LastNameCurrent].map(fold).filter(Boolean);
  const isSubject = (value) => {
    const name = splitName(value);
    return Boolean(name.given.length) && firstNames.includes(fold(name.given[0])) && surnames.includes(fold(name.surname));
  };
  const evidence = [`${record.year ? `${record.year} ` : ""}${record.kind}`];
  const make = (role, value, extra = {}) => {
    const name = splitName(value);
    return name.given.length && name.surname ? [{ role, ...name, birthYear: 0, birthPlace: "", evidence, ...extra }] : [];
  };
  const sex = fold(get("gender", "sex"));
  const gender = sex.startsWith("m") ? "Male" : sex.startsWith("f") ? "Female" : "";
  const out = [];
  const groom = get("groom");
  const bride = get("bride");
  const parentIsSubject = isSubject(get("father", "father's name")) || isSubject(get("mother", "mother's name"));
  // Philip Beacall's son Philip, baptised 1860, father Philip Beacall: the record's year says whose it is.
  const subjectBorn = yearOf(subject.BirthDate);
  const juniors = parentIsSubject && (!subjectBorn || !record.year || record.year >= subjectBorn + 12);
  if (groom && bride) {
    if (isSubject(groom)) out.push(...make("spouse", bride, { gender: "Female" }), ...make("father", get("groom's father", "grooms father"), { gender: "Male" }));
    if (isSubject(bride)) out.push(...make("spouse", groom, { gender: "Male" }), ...make("father", get("bride's father", "brides father"), { gender: "Male" }));
  } else if (isSubject(get("name")) && !juniors) {
    out.push(...make("father", get("father", "father's name"), { gender: "Male" }));
    out.push(...make("mother", get("mother", "mother's name"), { gender: "Female" }));
    out.push(...make("spouse", get("spouse's name", "spouse", "spouse name")));
  } else if (parentIsSubject) {
    // (a baptism: about the year of birth)
    const born = record.kind === "baptism" ? record.year : 0;
    out.push(...make("child", get("name"), { gender, birthYear: born, birthPlace: get("birth place", "where born", "baptism place") }));
  }
  // Witnesses and the like are searched for as people named.
  for (const witnesses of [get("witnesses", "witness")].filter(Boolean)) {
    for (const one of witnesses.split(/\s*(?:&|\band\b|,)\s*/)) out.push(...make("other", one));
  }
  return out;
}

const RELATION_ROLES = {
  head: "head",
  wife: "wife",
  husband: "husband",
  son: "son",
  daughter: "daughter",
  child: "child",
  dau: "daughter",
  father: "father",
  mother: "mother",
  brother: "brother",
  sister: "sister",
  grandson: "grandson",
  granddaughter: "granddaughter",
  grandchild: "grandchild",
  granddau: "granddaughter",
  "son-in-law": "son-in-law",
  "daughter-in-law": "daughter-in-law",
  "father-in-law": "father-in-law",
  "mother-in-law": "mother-in-law",
  "brother-in-law": "brother-in-law",
  "sister-in-law": "sister-in-law",
  nephew: "nephew",
  niece: "niece",
};
// The sex a relation word gives, for a table with no sex column.
const RELATION_GENDER = {
  wife: "Female", husband: "Male", son: "Male", daughter: "Female", father: "Male", mother: "Female", brother: "Male", sister: "Female",
  grandson: "Male", granddaughter: "Female", "son-in-law": "Male", "daughter-in-law": "Female", "father-in-law": "Male",
  "mother-in-law": "Female", "brother-in-law": "Male", "sister-in-law": "Female", nephew: "Male", niece: "Female",
};

/** "Son in Law", "Grand Daughter", "Grandau." → the RELATION_ROLES word, or "" (servant, visitor, step-son …). */
function relationOf(cell) {
  const text = fold(cell)
    .replace(/\s*-?\s*in\s*-?\s*law\b/, "-in-law")
    .replace(/^grand\s+/, "grand");
  return RELATION_ROLES[text.split(" ")[0]] || "";
}

const CHILD_RELATIONS = ["son", "daughter", "child"];
const GRANDCHILD_RELATIONS = ["grandson", "granddaughter", "grandchild"];

function relativesFromCensus(table, subject) {
  const col = (...names) => table.header.findIndex((cell) => names.some((name) => cell === name || cell.startsWith(name)));
  const nameCol = col("name");
  const relCol = col("relation", "relationship", "role");
  const ageCol = col("age");
  const sexCol = col("sex", "gender");
  const placeCol = col("birth place", "birthplace", "where born", "born");
  const people = table.rows.map((row) => {
    const name = splitName(row.cells[nameCol]);
    const age = ageCol >= 0 ? parseAge(row.cells[ageCol]) : null;
    const sex = fold(sexCol >= 0 ? row.cells[sexCol] : "");
    const relation = relationOf(relCol >= 0 ? row.cells[relCol] : "");
    return {
      bold: row.bold,
      name,
      relation,
      age,
      birthYear: age != null ? table.year - age : 0,
      gender: sex.startsWith("m") ? "Male" : sex.startsWith("f") ? "Female" : RELATION_GENDER[relation] || "",
      birthPlace: placeCol >= 0 ? row.cells[placeCol] : "",
    };
  });
  const subjectFirst = fold(subject.FirstName);
  const subjectSurnames = [subject.LastNameAtBirth, subject.LastNameCurrent].map(fold).filter(Boolean);
  let self = people.find((person) => person.bold);
  if (!self) {
    self = people.find(
      (person) => fold(person.name.given[0]) === subjectFirst && subjectSurnames.includes(fold(person.name.surname))
    );
  }
  const evidence = `${table.year} census`;
  const make = (person, role) => ({
    role,
    given: person.name.given,
    surname: person.name.surname,
    birthSurname: person.name.birthSurname,
    birthYear: person.birthYear,
    birthPlace: person.birthPlace,
    gender: person.gender || (role === "father" ? "Male" : role === "mother" ? "Female" : ""),
    evidence: [evidence],
  });
  // "Check for all the names in the profile" (the user, 2026-10-18): everyone else in the table, an
  // employer or a fellow servant, is searched for too, as someone named, not as family.
  const out = self ? censusKin(table, self, people, subjectSurnames, relCol >= 0, make) : [];
  const placed = new Set(out.map((entry) => entry.source));
  const isSubjectRow = (person) => person === self || (!self && fold(person.name.given[0]) === subjectFirst);
  for (const person of people) {
    if (placed.has(person) || isSubjectRow(person) || !person.name.given.length || !person.name.surname) continue;
    out.push({ ...make(person, "other"), source: person });
  }
  return out.map(({ source, ...entry }) => entry);
}

/** The subject's relatives in one census table, each with its row as `source`. */
function censusKin(table, self, people, subjectSurnames, hasRelations, makeEntry) {
  const make = (person, role) => ({ ...makeEntry(person, role), source: person });
  const out = [];
  let others = people.filter((person) => person !== self);
  // Two households in one table (Joseph Amato's and Frank Schmitzer's, 1950): the relations are to
  // each head, so keep only the people who share the subject's family's surname.
  if (people.filter((person) => person.relation === "head").length > 1) {
    const family = [...subjectSurnames, fold(self.name.surname)].filter(Boolean);
    others = others.filter((person) => family.includes(fold(person.name.surname)));
  }
  if (hasRelations) {
    for (const person of others) {
      const role = censusRole(self, person, people, subjectSurnames);
      if (role) out.push(make(person, role));
    }
    return out;
  }
  // No relationship column (the 1841 census): a child listed with two adults of
  // the family name is taken to be with its parents and brothers and sisters.
  if (self.age == null || self.age >= 16) return [];
  const family = others.filter((person) => subjectSurnames.includes(fold(person.name.surname)));
  const father = family.find((person) => person.gender === "Male" && person.age != null && person.age >= self.age + 15);
  const mother = family.find((person) => person.gender === "Female" && person.age != null && person.age >= self.age + 15);
  if (!father && !mother) return [];
  if (father) out.push(make(father, "father"));
  if (mother) out.push(make(mother, "mother"));
  for (const person of family) {
    if (person === father || person === mother) continue;
    if (person.age != null && person.age < 30) out.push(make(person, "sibling"));
  }
  return out;
}

/**
 * What a household member is to the subject, from both rows' relation to the head; "" when the
 * table doesn't say for sure (a son-in-law in a grandchild's household may be the parent).
 */
function censusRole(self, person, people, subjectSurnames) {
  const rel = person.relation;
  const ageGap = (other) => (other.age != null && self.age != null ? other.age - self.age : null);
  if (CHILD_RELATIONS.includes(self.relation)) {
    if (rel === "head") return person.gender === "Female" ? "mother" : "father";
    if (rel === "wife") return "mother";
    if (CHILD_RELATIONS.includes(rel)) return "sibling";
    // The head's parents and parents-in-law are the subject's grandparents; the head's brothers and
    // sisters (or in-law ones) uncles and aunts; the head's nephews and nieces cousins.
    if (["father", "mother", "father-in-law", "mother-in-law"].includes(rel)) return "grandparent";
    if (["brother", "sister", "brother-in-law", "sister-in-law"].includes(rel)) return "parentSibling";
    if (rel === "nephew" || rel === "niece") return "cousin";
    return "";
  }
  if (GRANDCHILD_RELATIONS.includes(self.relation)) {
    if (rel === "head" || rel === "wife" || rel === "husband") return "grandparent";
    if (CHILD_RELATIONS.includes(rel)) {
      // A son or daughter of the subject's surname, old enough, may be the parent: not said.
      const gap = ageGap(person);
      const ownSurname = subjectSurnames.includes(fold(person.name.surname));
      if (ownSurname && (gap == null || gap >= 14)) return "";
      return "parentSibling";
    }
    if (GRANDCHILD_RELATIONS.includes(rel)) {
      const surname = fold(person.name.surname);
      if (!surname) return "";
      const head = people.find((other) => other.relation === "head");
      const headSurname = fold(head?.name.surname);
      if (!subjectSurnames.includes(surname)) return "cousin";
      // The subject's own surname: a brother or sister, unless the grandparents share it too (a cousin
      // through a son would) or the ages are too far apart.
      if (headSurname && subjectSurnames.includes(headSurname)) return "";
      const gap = ageGap(person);
      return gap != null && Math.abs(gap) <= 20 ? "sibling" : "";
    }
    return "";
  }
  if (self.relation === "head") {
    if (["head", "wife", "husband"].includes(rel)) return "spouse";
    if (CHILD_RELATIONS.includes(rel)) return "child";
    if (rel === "father") return "father";
    if (rel === "mother") return "mother";
    if (rel === "brother" || rel === "sister") return "sibling";
    if (GRANDCHILD_RELATIONS.includes(rel)) return "grandchild";
    if (rel === "son-in-law" || rel === "daughter-in-law") return "childInLaw";
    if (rel === "father-in-law" || rel === "mother-in-law") return "parentInLaw";
    if (rel === "nephew" || rel === "niece") return "siblingChild";
    return "";
  }
  if (self.relation === "wife" || self.relation === "husband") {
    // Relations are to the head: the head's mother-in-law is the wife's own mother.
    if (["head", "wife", "husband"].includes(rel)) return "spouse";
    if (CHILD_RELATIONS.includes(rel)) return "child";
    if (rel === "father-in-law") return "father";
    if (rel === "mother-in-law") return "mother";
    if (rel === "father" || rel === "mother") return "parentInLaw";
    if (GRANDCHILD_RELATIONS.includes(rel)) return "grandchild";
    if (rel === "son-in-law" || rel === "daughter-in-law") return "childInLaw";
    return "";
  }
  return "";
}

// Name words, or initials with a full stop ("Mary A. Smith"); any other full stop ends the name.
const NAME_WORD = String.raw`(?:[A-Z][A-Za-z'-]+|[A-Z]\.?)`;
const NAME = String.raw`${NAME_WORD}(?:\s+(?:\([A-Z][A-Za-z'-]+\)|${NAME_WORD})){0,5}`;

// Words that can open a sentence about the subject's own marriage ("On 3 May he married …").
const SENTENCE_OPENERS = new Set(["on", "in", "at", "the", "after", "when", "later", "then", "he", "she", "they", "his", "her", "their", "this", "a", "an", "marriage", "married", "by", "about", "before", "aged", "age"]);

/** "Joseph married Rebecca Catley" in William's bio is his parents' marriage, not his. */
function marriageIsSomeoneElses(text, index, subject) {
  const start = Math.max(text.lastIndexOf(". ", index), text.lastIndexOf("\n", index), text.lastIndexOf("* ", index));
  const lead = text.slice(start + 1, index).replace(/^[\s*(]+/, "").split(/[\s,(]+/)[0] || "";
  // "Frank's daughter Mildred married Wayne Rose": a child's marriage, not Frank's.
  if (/'s\s+(?:son|daughter|child|brother|sister|father|mother|grandson|granddaughter)\b/i.test(text.slice(start + 1, index))) return true;
  if (!/^[A-Z][a-z'-]+$/.test(lead) || SENTENCE_OPENERS.has(lead.toLowerCase())) return false;
  const own = [subject?.FirstName, subject?.RealName, subject?.MiddleName, subject?.LastNameAtBirth, subject?.LastNameCurrent, subject?.Nicknames]
    .flatMap((value) => String(value || "").split(/[\s,]+/))
    .map(fold)
    .filter(Boolean);
  return !own.includes(fold(lead));
}

/** "Martha Teece (~1835 - ~1909)": the birth year in brackets after a name (not "<1807", a bound). */
function yearAfter(text, end) {
  const match = text.slice(end, end + 30).match(/^\s*\(\s*(?:~|abt\.?\s*|about\s+|c\.?\s*|ca\.?\s*)?(1[0-9]\d\d)\b/i);
  return match ? Number(match[1]) : 0;
}

const KIN_WORD_ROLES = {
  wife: ["spouse", "Female"],
  husband: ["spouse", "Male"],
  son: ["child", "Male"],
  daughter: ["child", "Female"],
  brother: ["sibling", "Male"],
  sister: ["sibling", "Female"],
  father: ["father", "Male"],
  mother: ["mother", "Female"],
};

/**
 * Wikitext as plain sentences, with where each profile link's words now sit: {text, links: [{start, end, id}]}.
 * Tables and template calls are dropped; the citations' words are kept, unless dropRefs.
 */
function plainWithLinks(wikitext, { dropRefs = false } = {}) {
  let cleaned = String(wikitext || "");
  if (dropRefs) cleaned = cleaned.replace(/<ref[^>/]*>[\s\S]*?<\/ref>/g, "");
  cleaned = cleaned
    .replace(/\{\|[\s\S]*?\n\|\}/g, " ")
    .replace(/<ref[^>]*\/>/g, " ")
    .replace(/<\/?ref[^>]*>/g, " ")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/'''|''/g, "")
    .replace(/<br\s*\/?>/gi, " ");
  let text = "";
  let last = 0;
  const links = [];
  for (const match of cleaned.matchAll(/\[\[(?:([^|\]]*)\|)?([^\]]*)\]\]/g)) {
    text += cleaned.slice(last, match.index);
    const id = String(match[1] || "").trim();
    if (/^[^:]+-\d+$/.test(id)) links.push({ start: text.length, end: text.length + match[2].length, id: id.replace(/ /g, "_") });
    text += match[2];
    last = match.index + match[0].length;
  }
  return { text: text + cleaned.slice(last), links };
}

function relativesFromText(bio, subject) {
  const linkNames = new Map(); // id → the name as written, for the people linked in passing
  for (const match of String(bio || "").matchAll(/\[\[([^|\]:]+-\d+)\|([^\]]+)\]\]/g)) {
    const id = match[1].trim().replace(/ /g, "_");
    if (!linkNames.has(id)) linkNames.set(id, match[2].replace(/'''|''/g, "").replace(/\s+/g, " ").trim());
  }
  // "daughter of [[Farrar-123|Perrin Farrar]]": the biography links straight to the relative's profile. Only a
  // name that is the link counts: "his daughter, Elizabeth Beacall (2)" took her grandmother's [[Beacall-12|Elizabeth
  // Beacall]], linked earlier, when links were matched by name (Beacall-11, 2026-10-18).
  const { text, links } = plainWithLinks(bio);
  const linkAt = (found, start) => {
    const link = found.find((span) => start >= span.start && start < span.end);
    return link ? { linkedId: link.id } : {};
  };
  const linkedId = (match, group) => linkAt(links, match.indices[group][0]);
  const out = [];
  const parents = new RegExp(String.raw`\b(?:son|daughter|child)\s+of\s+(${NAME})\s+(?:&|and)\s+(${NAME})`, "gd");
  for (const match of text.matchAll(parents)) {
    out.push({ role: "father", ...splitName(match[1]), gender: "Male", evidence: ["biography"], ...linkedId(match, 1) });
    out.push({ role: "mother", ...splitName(match[2]), gender: "Female", evidence: ["biography"], ...linkedId(match, 2) });
  }
  // "His parents were John Carr (<1807 - >1823) and Elizabeth Beacall (<1798 - >1823)" (Beacall-491).
  const parentsWere = new RegExp(String.raw`\b[Hh](?:is|er)\s+parents\s+(?:were|are)\s+(${NAME})(?:\s*\([^)]*\))?\s+(?:&|and)\s+(${NAME})`, "gd");
  for (const match of text.matchAll(parentsWere)) {
    const fatherEnd = match.index + match[0].indexOf(match[1]) + match[1].length;
    const motherEnd = match.index + match[0].length;
    out.push({ role: "father", ...splitName(match[1]), gender: "Male", birthYear: yearAfter(text, fatherEnd), evidence: ["biography"], ...linkedId(match, 1) });
    out.push({ role: "mother", ...splitName(match[2]), gender: "Female", birthYear: yearAfter(text, motherEnd), evidence: ["biography"], ...linkedId(match, 2) });
  }
  // (the lookahead stops "John" alone matching inside "John Densham & Mary …")
  const oneParent = new RegExp(String.raw`\b(?:son|daughter|child)\s+of\s+(${NAME})(?![A-Za-z'-]|\s+\(?[A-Z]|\s*(?:&|and\b))`, "gd");
  for (const match of text.matchAll(oneParent)) {
    // One parent with the subject's birth surname is the father ("daughter of Perrin Farrar"), unless the bio
    // names her as the mother too: "son of Elizabeth A. Rowland" (a widow, by her married name; Rowland-18000,
    // 2026-10-18) is the 1881 census's "Wife". So it stays a parent until mergeRelatives has seen everyone.
    const name = splitName(match[1]);
    const likelyFather = Boolean(name.surname && fold(name.surname) === fold(subject?.LastNameAtBirth));
    out.push({ role: "parent", ...(likelyFather ? { likelyFather } : {}), ...name, evidence: ["biography"], ...linkedId(match, 1) });
  }
  const married = new RegExp(String.raw`\bmarri(?:ed|age\s+(?:of\s+\S+\s+)?to)\s+(?:to\s+)?(${NAME})`, "gd");
  for (const match of text.matchAll(married)) {
    if (marriageIsSomeoneElses(text, match.index, subject)) continue;
    const name = splitName(match[1]);
    if (!name.surname) continue;
    out.push({
      role: "spouse",
      ...name,
      birthSurname: name.birthSurname || name.surname,
      birthYear: yearAfter(text, match.index + match[0].length),
      evidence: ["biography"],
      ...linkedId(match, 1),
    });
  }
  // "His wife was Bridget Christine McNulty" (Cassidy-5148): a surname not the subject's is her birth name.
  // "His sister was Hannah Beacall (1819 - )", "his son, John Beacall (4)" (Beacall-491).
  const kin = new RegExp(
    String.raw`\b(?:[Hh]is|[Hh]er)\s+([Ww]ife|[Hh]usband|[Ss]on|[Dd]aughter|[Bb]rother|[Ss]ister|[Ff]ather|[Mm]other)(?:\s+was|\s+is|,)?\s+(${NAME})`,
    "gd"
  );
  for (const match of text.matchAll(kin)) {
    if (/'s\s+(?:son|daughter|child|brother|sister|father|mother)\b/i.test(text.slice(Math.max(0, match.index - 40), match.index))) continue;
    const name = splitName(match[2]);
    if (!name.surname) continue;
    const [role, gender] = KIN_WORD_ROLES[match[1].toLowerCase()];
    const own = [subject?.LastNameAtBirth, subject?.LastNameCurrent].map(fold).includes(fold(name.surname));
    const isWife = role === "spouse" && gender === "Female";
    out.push({
      role,
      ...name,
      gender,
      ...(isWife && !own && !name.birthSurname ? { birthSurname: name.surname } : {}),
      birthYear: yearAfter(text, match.index + match[0].length),
      evidence: ["biography"],
      ...linkedId(match, 2),
    });
  }
  // "Their children were...", then a list: "# John Fabian (Beacall) Lacon (~1856 - >1939)". Read without the
  // citations: a baptism table in a <ref> after each child ended the list at the first (Beacall-11, 2026-10-18).
  const listed = plainWithLinks(bio, { dropRefs: true });
  const childList = /\b(?:[Tt]heir|[Hh]is|[Hh]er)\s+children\s+(?:were|are|included|was)\b[^\n]*\n+((?:[ \t]*[#*][^\n]*(?:\n|$))+)/dg;
  const listItem = new RegExp(String.raw`^[ \t]*[#*]+\s*(${NAME})`, "d");
  for (const list of listed.text.matchAll(childList)) {
    let lineStart = list.indices[1][0];
    for (const line of list[1].split("\n")) {
      const match = line.match(listItem);
      const at = lineStart;
      lineStart += line.length + 1;
      if (!match) continue;
      const name = splitName(match[1]);
      if (!name.given.length) continue;
      const link = linkAt(listed.links, at + match.indices[1][0]);
      out.push({ role: "child", ...name, birthYear: yearAfter(line, match[0].length), evidence: ["biography"], ...link });
    }
  }
  // Anyone else the text links to (a godparent, a witness): searched for as named, not as family.
  const used = new Set(out.map((person) => person.linkedId).filter(Boolean));
  for (const [id, raw] of linkNames) {
    if (used.has(id)) continue;
    const name = splitName(raw);
    if (name.given.length && name.surname) out.push({ role: "other", ...name, evidence: ["biography"], linkedId: id });
  }
  return out.map((person) => ({ birthYear: 0, birthPlace: "", ...person }));
}

/** The relatives a biography names, read by code (no AI). */
export function readRelativesFromBio(bio, subject) {
  const fromText = relativesFromText(bio, subject);
  const fromCensus = readCensusTables(bio).flatMap((table) => relativesFromCensus(table, subject));
  const fromRecords = readRecordTables(bio).flatMap((record) => relativesFromRecord(record, subject));
  return finishRelatives([...fromText, ...fromCensus, ...fromRecords], subject);
}

const CLOSE_ROLES = ["father", "mother", "spouse", "child", "sibling", "parent"];

/**
 * With AI, the close family comes from the AI; the census tables' grandparents, uncles, cousins and
 * in-laws (which the AI isn't asked for), and anyone else there it missed, are still read by code and
 * added, minus anyone already listed.
 */
export function censusKinBeyond(relatives, bio, subject) {
  const raw = readCensusTables(bio)
    .flatMap((table) => relativesFromCensus(table, subject))
    .filter((person) => !CLOSE_ROLES.includes(person.role));
  if (!raw.length) return [];
  const sameName = (a, b) => fold(a.given[0]) === fold(b.given[0]) && fold(a.surname) === fold(b.surname);
  return finishRelatives(raw, subject).filter((person) => !relatives.some((other) => sameName(other, person)));
}

/** Family surnames for children and siblings; a wife's birth name kept apart from her married one. */
/** The surnames a woman's child would have: the child's own when it's a husband's, else her husbands'. */
function childSurnamesOfWoman(child, subject, relatives) {
  // (his surname at birth first: "Sébastien Cholet dit Laviolette" is a Cholet on WikiTree)
  const husbands = [
    ...new Set(relatives.filter((person) => person.role === "spouse").map((person) => person.birthSurname || person.surname).filter(Boolean)),
  ];
  const known = [child.surname, child.birthSurname].filter(Boolean);
  const own = known.find((name) => husbands.some((husband) => fold(husband) === fold(name)));
  if (own) return [own];
  if (husbands.length) return husbands;
  const married = subject.LastNameCurrent && fold(subject.LastNameCurrent) !== fold(subject.LastNameAtBirth) ? subject.LastNameCurrent : "";
  return [married || subject.LastNameAtBirth || subject.LastNameCurrent || ""];
}

function finishRelatives(list, subject) {
  const subjectSurname = subject.LastNameAtBirth || subject.LastNameCurrent || "";
  const isSubject = (person) =>
    fold(person.given[0]) === fold(subject.FirstName) &&
    [subject.LastNameAtBirth, subject.LastNameCurrent].map(fold).includes(fold(person.surname));
  const merged = mergeRelatives(list).filter((person) => person.given.length);
  // Someone the text names as a parent or sibling isn't also an uncle or cousin from a census table.
  // Nor is anyone named in passing who is a relative somewhere else, or the subject.
  const close = merged.filter((person) => CLOSE_ROLES.includes(person.role));
  const family = merged.filter((person) => person.role !== "other");
  // ("John Fabian (Beacall) Lacon" in the list is the census's John Beacall: Beacall-11, 2026-10-18)
  const surnamesOf = (person) => [person.surname, person.birthSurname].map(fold).filter(Boolean);
  const sameName = (a, b) => fold(a.given[0]) === fold(b.given[0]) && surnamesOf(a).some((name) => surnamesOf(b).includes(name));
  return merged
    .filter((person) => CLOSE_ROLES.includes(person.role) || !close.some((other) => sameName(other, person)))
    .filter((person) => person.role !== "other" || (!family.some((other) => sameName(other, person)) && !isSubject(person)))
    .filter((person) => !(person.role === "spouse" && isSubject(person)))
    .map((person) => {
      const surnames = [];
      // A father the bio names with his own surname is searched by that alone: John Carr is
      // just John Carr, not a Beacall (Beacall-491; the user, 2026-10-07).
      if (person.role === "father" && person.surname) surnames.push(person.surname);
      // A woman's children have their father's surname: Marie Anne Heard's were Cholets, not
      // "Joseph Heard" (Heard-171, 2026-10-31).
      else if (person.role === "child" && subject.Gender === "Female") surnames.push(...childSurnamesOfWoman(person, subject, merged));
      else if (["child", "sibling", "father"].includes(person.role)) surnames.push(subjectSurname);
      if (person.birthSurname) surnames.push(person.birthSurname);
      if (person.surname) surnames.push(person.surname);
      if (person.role === "mother" || person.role === "spouse") surnames.push(subjectSurname);
      const unique = [...new Set(surnames.filter(Boolean).map((name) => name.trim()))];
      const opposite = { Male: "Female", Female: "Male" }[subject.Gender] || "";
      const gender = person.gender || (person.role === "spouse" ? opposite : "");
      return { ...person, gender, surnames: unique.slice(0, 2) };
    });
}

// ---------------------------------------------------------------------------
// Reading the biography with AI

/** Wikitext trimmed for the AI: share tokens and category links carry no family. */
export function bioForAi(bio, maxChars = 24000) {
  return String(bio || "")
    .replace(/\{\{\s*Ancestry\s+Sharing\s*\|[^}]*\}\}/gi, "")
    .replace(/\[\[Category:[^\]]*\]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, maxChars);
}

export function buildRelativesAiPrompt(bio, subject) {
  const label = [subject.FirstName, subject.MiddleName, subject.LastNameAtBirth].filter(Boolean).join(" ");
  return [
    "You read a WikiTree biography and list the subject's close relatives that it names.",
    `The subject is ${label} (${subject.Name}), born ${subject.BirthDate || "unknown"}.`,
    "Relatives: father, mother, spouse (every marriage), child, sibling (including half-siblings).",
    'Everyone else the biography names as a person (an employer, a servant, a witness, others in a census household) has role "other". Not the subject, and not people who are only historical background.',
    "Combine every mention of the same person (baptism, census, marriage, will) into one entry with their fullest name.",
    'Return JSON only: {"relatives":[{"role":"father|mother|spouse|child|sibling|other","name":"given names and surname","birthSurname":"surname at birth if known, e.g. a wife\'s maiden name","birthYear":1842,"birthPlace":"place","gender":"Male|Female|","evidence":"e.g. 1881 census"}]}',
    "birthYear: from a stated date, or census year minus age; 0 when unknown. Don't guess names that aren't in the text.",
    "Biography:",
    bioForAi(bio),
  ].join("\n");
}

const AI_ROLES = new Set(["father", "mother", "spouse", "child", "sibling", "other"]);

/** Checks the AI's JSON and turns it into the same shape as readRelativesFromBio. */
export function relativesFromAiJson(parsed, subject) {
  const items = Array.isArray(parsed?.relatives) ? parsed.relatives : [];
  const list = [];
  for (const item of items.slice(0, 60)) {
    const role = String(item?.role || "").toLowerCase();
    if (!AI_ROLES.has(role)) continue;
    const name = splitName(item?.name);
    if (!name.given.length) continue;
    const year = Number(item?.birthYear);
    list.push({
      role,
      ...name,
      birthSurname: String(item?.birthSurname || name.birthSurname || "").trim(),
      birthYear: Number.isFinite(year) && year > 1000 && year < 2100 ? Math.round(year) : 0,
      birthPlace: String(item?.birthPlace || "").trim(),
      gender: /^m/i.test(item?.gender) ? "Male" : /^f/i.test(item?.gender) ? "Female" : "",
      evidence: item?.evidence ? [String(item.evidence).slice(0, 60)] : [],
    });
  }
  return finishRelatives(list, subject);
}

// ---------------------------------------------------------------------------
// Scoring WikiTree's candidates

function givenNamesOf(profile) {
  return [profile.FirstName, profile.MiddleName, profile.Nicknames, String(profile.RealName || "")]
    .join(" ")
    .split(/\s+/)
    .map(fold)
    .filter(Boolean);
}

function placeWords(place) {
  return fold(place)
    .split(/[\s,-]+/)
    .filter((word) => word.length > 2 && !["england", "united", "kingdom", "the", "and", "county", "parish", "usa", "states", "not", "upon", "on"].includes(word));
}

const UK_NATIONS = new Set(["England", "Wales", "Scotland", "Northern Ireland", "United Kingdom", "Great Britain"]);
const COUNTRIES = new Set([
  ...UK_NATIONS,
  "Ireland", "United States", "Canada", "Australia", "New Zealand", "South Africa", "India", "Germany", "France",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Italy", "Spain", "Portugal", "Norway", "Sweden", "Denmark",
  "Finland", "Poland", "Russia", "Mexico", "Jamaica", "Isle of Man", "Jersey", "Guernsey",
].map((name) => name.toLowerCase()));
const US_STATES = new Set(
  ("alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas " +
    "kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada ohio oklahoma oregon " +
    "pennsylvania tennessee texas utah vermont virginia washington wisconsin wyoming")
    .split(" ")
    .concat(["new hampshire", "new jersey", "new mexico", "new york", "north carolina", "north dakota", "rhode island", "south carolina", "south dakota", "west virginia"])
);
const ENGLISH_COUNTIES = new Set(
  ("bedfordshire berkshire buckinghamshire cambridgeshire cheshire cornwall cumberland derbyshire devon dorset durham essex " +
    "gloucestershire hampshire herefordshire hertfordshire huntingdonshire kent lancashire leicestershire lincolnshire middlesex norfolk " +
    "northamptonshire northumberland nottinghamshire oxfordshire rutland shropshire somerset staffordshire suffolk surrey sussex " +
    "warwickshire westmorland wiltshire worcestershire yorkshire london hereford").split(" ")
);

/** The country of a place, only when the place makes it clear ("Ohio" → United States; "Bristol": unknown). */
function countryOf(place) {
  const text = String(place || "").trim();
  if (!text || /^not\s+in\b/i.test(text)) return "";
  const country = getCountryFromLocation(text).toLowerCase();
  const words = fold(text).split(/[\s,]+/).filter(Boolean);
  const tails = [country, words.slice(-2).join(" "), words[words.length - 1]];
  for (const tail of tails) {
    if (COUNTRIES.has(tail)) return tail === "united kingdom" || tail === "great britain" ? "england" : tail;
    if (US_STATES.has(tail)) return "united states";
    if (ENGLISH_COUNTIES.has(tail)) return "england";
  }
  return "";
}

// Census abbreviations, read as the full name for searching and comparing.
const ABBREVIATIONS = {
  wm: "william", wim: "william", willm: "william", chas: "charles", geo: "george", jas: "james", jno: "john",
  thos: "thomas", saml: "samuel", richd: "richard", robt: "robert", edwd: "edward", edw: "edward",
  benj: "benjamin", benjn: "benjamin", jos: "joseph", josh: "joshua", margt: "margaret", hy: "henry", hen: "henry",
  fredk: "frederick", fredc: "frederick", danl: "daniel", alexr: "alexander", elizth: "elizabeth", eliz: "elizabeth",
  christr: "christopher", nathl: "nathaniel", abm: "abraham", isaac: "isaac", mattw: "matthew", micl: "michael",
};
// Pet names that stand for a formal one.
const NICKNAMES = {
  elizabeth: ["eliza", "betsy", "betsey", "betty", "bessie", "bess", "lizzie", "beth", "elisa"],
  mary: ["polly", "molly", "mamie", "mae", "may"],
  margaret: ["peggy", "maggie", "meg", "madge", "margery"],
  martha: ["patty", "mattie"],
  sarah: ["sally", "sadie"],
  ann: ["annie", "nancy", "anna", "anne", "hannah"],
  catherine: ["kate", "kitty", "katie", "kath", "katherine"],
  frances: ["fanny"],
  ellen: ["nellie", "nelly", "helen", "eleanor"],
  john: ["jack", "johnny"],
  henry: ["harry", "hal"],
  richard: ["dick"],
  edward: ["ted", "ned"],
  william: ["bill", "will", "willie", "billy"],
  james: ["jim", "jem"],
  robert: ["bob", "bert"],
  albert: ["bert", "bertie"],
  thomas: ["tom", "tommy"],
};

/** A name and its full form ("chas" → "chas", "charles"). */
function firstNameForms(name) {
  const full = ABBREVIATIONS[name.replace(/\.$/, "")];
  return full ? [name, full] : [name];
}

function nicknameOf(a, b) {
  const pairs = (x, y) => (NICKNAMES[x] || []).includes(y);
  return [a, ...firstNameForms(a)].some((name) => pairs(name, b) || pairs(b, name));
}

/** Within two letters, same first letter, both names long enough to tell apart. */
function spellingClose(a, b) {
  const shorter = Math.min(a.length, b.length);
  if (!a || !b || a[0] !== b[0] || shorter < 3) return false;
  // Short names differ by a swapped letter too often (Jane, June) — only an added one counts (Ann, Anne).
  if (shorter < 5) return a.length !== b.length && editDistance(a, b) === 1;
  return editDistance(a, b) <= (shorter >= 6 ? 2 : 1);
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = temp;
    }
  }
  return row[b.length];
}

/** Same surname, or a spelling WikiTree's search treats as a variant (Densham/Denham/Densem). */
function surnameFit(wanted, profile) {
  const have = [profile.LastNameAtBirth, profile.LastNameCurrent, profile.LastNameOther]
    .flatMap((name) => String(name || "").split(","))
    .map(fold)
    .filter(Boolean);
  if (have.some((name) => wanted.includes(name))) return "same";
  const close = (a, b) => (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) || oneEditApart(a, b);
  return have.some((name) => wanted.some((other) => close(name, other))) ? "variant" : "";
}

function personName(profile) {
  return [profile.FirstName, profile.MiddleName, profile.LastNameAtBirth].filter(Boolean).join(" ") || profile.Name;
}

/**
 * How well a WikiTree profile fits a relative from the biography: {score 0–100, reasons, conflicts}.
 * `expectedParents`: [{role, given, surnames}] the relative's own parents, when the bio says who they are.
 * `parentsById`: the candidates' parents, loaded once for all candidates.
 */
export function scoreCandidate(
  relative,
  profile,
  { expectedParents = [], parentsById = new Map(), expectedPartner = null, spousesById = new Map() } = {}
) {
  const reasons = [];
  const conflicts = [];
  const notes = []; // facts that neither help nor hurt ("Father on WikiTree: …")
  let standIn = null; // another profile where the subject should be (Beacall-11 for Beacall-491)
  const no = (why) => ({ score: 0, reasons, conflicts: [why], notes });
  let score = 0;
  const wanted = relative.given.map(fold).filter(Boolean);
  const firsts = (relative.firstNames || relative.given.slice(0, 1)).map(fold).filter(Boolean);
  const have = givenNamesOf(profile);
  const firstHave = fold(profile.FirstName).split(" ")[0];
  if (!wanted.length || !have.length) return no("no first name to compare");
  const expanded = firsts.flatMap(firstNameForms);
  if (expanded.includes(firstHave)) score += 30;
  else if (expanded.some((name) => have.includes(name))) score += 22;
  else if (firsts.some((name) => spellingClose(name, firstHave) || nicknameOf(name, firstHave))) {
    // Census spellings and pet names (Fredric/Frederick, Cealia/Celia, Betsy/Elizabeth).
    score += 20;
    reasons.push(`Named ${profile.FirstName} (biography: ${relative.given[0]})`);
  } else return no("first name differs");
  if (relative.gender && profile.Gender && relative.gender !== profile.Gender) return no("different gender");

  const middleWanted = wanted.slice(1).filter((name) => name.length > 1);
  const middleHave = fold(profile.MiddleName).split(" ").filter(Boolean);
  if (middleWanted.length && middleHave.length) {
    const agrees = middleWanted.some((name) =>
      middleHave.some((other) => other === name || (other[0] === name[0] && (other.length === 1 || name.length === 1)))
    );
    if (agrees) {
      score += 10;
      reasons.push(`Same middle name (${profile.MiddleName})`);
    } else {
      score -= 15;
      conflicts.push(`Middle name ${profile.MiddleName} (biography: ${relative.given.slice(1).join(" ")})`);
    }
  }

  const surname = surnameFit(relative.surnames.map(fold), profile);
  if (surname === "same") score += 15;
  else if (surname === "variant") score += 3;
  else return no("different surname");
  // A wife or mother found by her married name, but born with another surname.
  if (relative.birthSurname && profile.LastNameAtBirth && !surnameFit([fold(relative.birthSurname)], { LastNameAtBirth: profile.LastNameAtBirth })) {
    score -= 15;
    conflicts.push(`Surname at birth ${profile.LastNameAtBirth} (biography: ${relative.birthSurname})`);
  }
  // With no maiden name in the bio, her surname there is her married one: a woman born with it
  // (Mary Margaret Cassidy, Cassidy-804, daughter of Michael Cassidy) is very likely someone else.
  const marriedWoman =
    relative.role === "mother" || (["spouse", "grandparent", "parentInLaw"].includes(relative.role) && relative.gender === "Female");
  if (marriedWoman && !relative.birthSurname && profile.LastNameAtBirth && surnameFit(relative.surnames.map(fold), { LastNameAtBirth: profile.LastNameAtBirth })) {
    score -= 20;
    conflicts.push(`Surname at birth ${profile.LastNameAtBirth}, which is her married name`);
  }

  const born = yearOf(profile.BirthDate);
  if (!relative.birthYear && relative.yearRange && born) {
    // No year in the bio: only a window from the subject's own birth, so it counts for little.
    const [from, to] = relative.yearRange;
    if (born < from || born > to) return no(`born ${born}, outside ${from}–${to}`);
    score += 5;
  }
  if (relative.birthYear && born) {
    const gap = Math.abs(relative.birthYear - born);
    if (gap > 6) return no(`born ${born}, not about ${relative.birthYear}`);
    if (gap <= 1) score += 20;
    else if (gap <= 3) score += 10;
    (gap <= 3 ? reasons : conflicts).push(gap ? `Born ${born} (biography: about ${relative.birthYear})` : `Born ${born}`);
  }

  const wantCountry = countryOf(relative.birthPlace);
  const haveCountry = countryOf(profile.BirthLocation);
  if (wantCountry && haveCountry && wantCountry !== haveCountry) {
    const uk = (country) => ["england", "wales", "scotland", "northern ireland"].includes(country);
    if (!(uk(wantCountry) && uk(haveCountry))) return no(`born in ${profile.BirthLocation}`);
    score -= 25; // at least as far off as another county (−15) — Markinch, Fife for Whitchurch, Hampshire
    conflicts.push(`Born in ${profile.BirthLocation} (biography: ${relative.birthPlace})`);
  } else {
    const wantPlace = placeWords(relative.birthPlace);
    const havePlace = placeWords(profile.BirthLocation);
    if (wantPlace.length && havePlace.length) {
      const shared = wantPlace.filter((word) => havePlace.includes(word));
      if (shared.length) {
        score += Math.min(20, 10 * shared.length);
        reasons.push(`Born in ${profile.BirthLocation}`);
      } else {
        score -= 15;
        conflicts.push(`Born in ${profile.BirthLocation} (biography: ${relative.birthPlace})`);
      }
    } else if (wantPlace.length) {
      // Nothing to check the place against: common names otherwise match strangers on name and year alone.
      score -= 10;
      conflicts.push("No birthplace on WikiTree to compare");
    }
  }

  for (const [field, label] of [
    ["Father", "father"],
    ["Mother", "mother"],
  ]) {
    const parent = parentsById.get(Number(profile[field]));
    if (!parent) continue;
    const options = expectedParents.filter((entry) => entry.role === label);
    const Label = label[0].toUpperCase() + label.slice(1);
    const parentText = `${personName(parent)} (${parent.Name})`;
    if (!options.length) {
      notes.push(`${Label} on WikiTree: ${parentText}`);
      continue;
    }
    // The census can name one mother twice (Barbara 1818, Barbray 1828): any of them will do.
    const expected = options.find((entry) => firstNameAgrees(parent, entry)) || options[0];
    // The subject is on WikiTree: a child whose father there is another John Cassidy (Cassidy-3843,
    // not Cassidy-5079) belongs to another family, unless one of the two is a duplicate.
    if (expected.id && Number(parent.Id) !== Number(expected.id)) {
      if (expected.isSubject && firstNameAgrees(parent, expected)) standIn = parent;
      score -= 10;
      conflicts.push(`${Label} is ${parentText}, not ${expected.wtid || "this profile"}`);
      continue;
    }
    const expectedName = [expected.given?.[0], expected.surnames?.[0]].filter(Boolean).join(" ");
    if (!firstNameAgrees(parent, expected)) {
      score -= 25;
      conflicts.push(`${Label} is ${parentText} (biography: ${expectedName})`);
    } else if (expected.surnames?.length && !surnameFit(expected.surnames.map(fold), parent)) {
      score -= 10;
      conflicts.push(`${Label} is ${parentText} (biography: ${expectedName})`);
    } else {
      score += 15;
      reasons.push(`${Label} is ${parentText}, as in the biography`);
    }
  }
  // A parent's or spouse's existing marriages: Mary Polly Singleton (Singleton-3809), offered as
  // Albert Densham's mother, is married on WikiTree to Alexander McNutt, not John Densham.
  const spouses = spousesById.get(Number(profile.Id)) || [];
  if (expectedPartner?.given?.length && spouses.length) {
    // The bio's mother "Elizabeth Clements" is not a WikiTree wife born Mitchell, married name Black.
    const maiden =
      expectedPartner.role === "mother"
        ? (expectedPartner.surnames || []).map(fold).filter((name) => !surnameFit([name], { LastNameAtBirth: profile.LastNameAtBirth }))
        : [];
    const fits = (spouse) =>
      firstNameAgrees(spouse, expectedPartner) &&
      (!maiden.length || Boolean(surnameFit(maiden, { LastNameAtBirth: spouse.LastNameAtBirth }))) &&
      (!expectedPartner.surnames?.length || Boolean(surnameFit(expectedPartner.surnames.map(fold), spouse)));
    const partner = spouses.find(fits);
    // Bryce-1298 is married to Edward Francis Cassidy (Cassidy-3578), not to Edward John (Cassidy-5148), the subject.
    const otherProfile = partner && expectedPartner.id && Number(partner.Id) && Number(partner.Id) !== expectedPartner.id;
    if (otherProfile) {
      const middleWanted = fold(expectedPartner.given[1] || "");
      const middleHave = fold(String(partner.MiddleName || "").split(/\s+/)[0]);
      const sameName = !middleWanted || !middleHave || middleWanted[0] === middleHave[0];
      if (sameName && expectedPartner.isSubject) standIn = partner;
      score -= sameName ? 10 : 25;
      conflicts.push(
        sameName
          ? `Married to ${personName(partner)} (${partner.Name}), another profile (a duplicate of ${expectedPartner.wtid}?)`
          : `Married to ${personName(partner)} (${partner.Name}), not ${expectedPartner.wtid}`
      );
    } else if (partner) {
      // The bio's couple, maiden name and all, married to each other on WikiTree is the strongest sign there is;
      // a wife who only shares a first name (Elizabeth Walker, maiden name unknown) much less so.
      // A husband's surname is the family's, so for a mother his name alone is enough.
      score += maiden.length || expectedPartner.role === "father" ? 25 : 15;
      reasons.push(`Married to ${personName(partner)} (${partner.Name}), as in the biography`);
    } else {
      score -= 25;
      conflicts.push(`Married to ${spouses.map((spouse) => `${personName(spouse)} (${spouse.Name})`).join(", ")}`);
    }
  }
  return { score: Math.max(0, Math.min(100, score)), reasons, conflicts, notes, standIn };
}

/** Spelling-blind sound of a name: Catherine and Kathryn, Barbara and Barbray come close. */
function soundOf(name) {
  return fold(name).replace(/^k/, "c").replace(/ph/g, "f").replace(/th/g, "t").replace(/y/g, "i").replace(/(.)\1/g, "$1");
}

/** Whether a WikiTree person's given names include the bio's first name, allowing for spelling and pet names. */
function firstNameAgrees(person, expected) {
  const wanted = [...(expected.firstNames || []), ...(expected.given || []).slice(0, 1)].map(fold).filter(Boolean);
  return givenNamesOf(person).some((have) =>
    wanted.some((want) => have === want || nicknameOf(want, have) || spellingClose(have, want) || spellingClose(soundOf(have), soundOf(want)))
  );
}

/** Who a father, mother or spouse should be married to, from the bio. */
export function expectedPartnerFor(relative, subject, relatives) {
  // Two people asked about as a couple ("the couple Jean Prévost and Françoise Lamontagne").
  if (relative.partnerKey) return relatives.find((person) => person !== relative && person.partnerKey === relative.partnerKey) || null;
  const find = (role) => relatives.find((person) => person.role === role) || null;
  if (relative.role === "mother") return find("father");
  if (relative.role === "father") return find("mother");
  // A grandmother at the head's side in the census (Harriet Teece's husband, had he lived): one of the
  // other sex and surname, only when there's just the one.
  if (relative.role === "grandparent" && relative.gender) {
    const partners = relatives.filter(
      (person) => person.role === "grandparent" && person.gender && person.gender !== relative.gender && fold(person.surname) === fold(relative.surname)
    );
    return partners.length === 1 ? partners[0] : null;
  }
  if (relative.role === "spouse") {
    return {
      given: [subject.FirstName, ...String(subject.MiddleName || "").split(/\s+/)].filter(Boolean),
      surnames: [subject.LastNameAtBirth, subject.LastNameCurrent].filter(Boolean),
      id: Number(subject.Id) || 0,
      wtid: subject.Name || "",
      isSubject: true,
    };
  }
  return null;
}

/** The parents each relative should have, from what the bio says about the family. */
export function expectedParentsFor(relative, subject, relatives) {
  const subjectEntry = {
    isSubject: true,
    id: Number(subject.Id) || 0,
    wtid: subject.Name || "",
    role: subject.Gender === "Female" ? "mother" : "father",
    given: [subject.FirstName].filter(Boolean),
    surnames: [subject.LastNameAtBirth, subject.LastNameCurrent].filter(Boolean),
  };
  if (relative.role === "child") {
    const spouses = relatives.filter((person) => person.role === "spouse");
    const other = spouses.length === 1 ? [{ ...spouses[0], role: subjectEntry.role === "father" ? "mother" : "father" }] : [];
    return [subjectEntry, ...other];
  }
  if (relative.role === "sibling") {
    return relatives.filter((person) => person.role === "father" || person.role === "mother");
  }
  // An uncle or aunt from the grandparents' household (Samuel Teece, son of Harriet): the
  // grandparents of the same surname are the parents.
  if (relative.role === "parentSibling") {
    return relatives
      .filter((person) => person.role === "grandparent" && person.gender && fold(person.surname) === fold(relative.surname))
      .map((person) => ({ ...person, role: person.gender === "Female" ? "mother" : "father" }));
  }
  return [];
}

/** Whether a bio relative is someone already attached to the subject on WikiTree. */
export function findAttached(relative, attached) {
  const group = roleGroup(relative.role);
  return attached.find((entry) => {
    if (relative.linkedId && sameWikiTreeId(entry.profile.Name, relative.linkedId)) return true;
    if (roleGroup(entry.role) !== group) return false;
    const pseudo = { role: entry.role, given: fold(entry.profile.FirstName).split(" "), birthYear: yearOf(entry.profile.BirthDate) };
    return samePerson({ ...relative, given: relative.given.map(fold) }, pseudo);
  });
}

/**
 * The subject's wider family on WikiTree, for the bio's grandparents, uncles, cousins and in-laws:
 * a grandparent is looked for among the parents' parents, an uncle among the parents' siblings.
 * `getRelatives(ids, options)` → [{person}] as WikiTreeAPI.getRelatives returns them. At most two calls,
 * and none when the bio names no such relatives.
 */
export async function furtherAttached(attached, relatives, getRelatives) {
  const wanted = new Set(relatives.map((relative) => relative.role).filter((role) => !CLOSE_ROLES.includes(role)));
  if (!wanted.size) return [];
  const idsOf = (roles) => attached.filter((entry) => roles.includes(entry.role)).map((entry) => Number(entry.profile?.Id)).filter(Boolean);
  // [their role to the subject, whose relatives, which list]
  const steps = [
    ["grandparent", idsOf(["father", "mother"]), "Parents"],
    ["parentSibling", idsOf(["father", "mother"]), "Siblings"],
    ["grandchild", idsOf(["child"]), "Children"],
    ["childInLaw", idsOf(["child"]), "Spouses"],
    ["parentInLaw", idsOf(["spouse"]), "Parents"],
    ["siblingChild", idsOf(["sibling"]), "Children"],
  ].filter(([role, ids]) => ids.length && (wanted.has(role) || (role === "parentSibling" && wanted.has("cousin"))));
  const listOf = (person, key) => {
    const value = person?.[key] || {};
    return Array.isArray(value) ? value : Object.values(value);
  };
  const load = async (ids, options) => {
    try {
      return new Map(((await getRelatives(ids, options)) || []).map((item) => [Number(item?.person?.Id), item.person]).filter(([id]) => id));
    } catch (error) {
      console.warn("wbe: couldn't load the wider family", error);
      return new Map();
    }
  };
  const OPTION = { Parents: "getParents", Siblings: "getSiblings", Children: "getChildren", Spouses: "getSpouses" };
  const ids = [...new Set(steps.flatMap(([, stepIds]) => stepIds))];
  const options = Object.fromEntries(steps.map(([, , key]) => [OPTION[key], 1]));
  const people = ids.length ? await load(ids, options) : new Map();
  const out = [];
  const seen = new Set();
  const add = (role, profile) => {
    const key = `${role}|${profile?.Id}`;
    if (!profile?.Id || seen.has(key)) return;
    seen.add(key);
    out.push({ role, profile });
  };
  for (const [role, stepIds, key] of steps) {
    for (const id of stepIds) for (const profile of listOf(people.get(id), key)) add(role, profile);
  }
  // Cousins: the uncles' and aunts' children, one more call.
  const uncles = out.filter((entry) => entry.role === "parentSibling").map((entry) => Number(entry.profile.Id));
  if (wanted.has("cousin") && uncles.length) {
    const families = await load([...new Set(uncles)], { getChildren: 1 });
    for (const id of uncles) for (const profile of listOf(families.get(id), "Children")) add("cousin", profile);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The answer

const byGender = (female, male, either) => (gender) => (gender === "Female" ? female : gender === "Male" ? male : either);
const ROLE_WORDS = {
  father: () => "Father",
  mother: () => "Mother",
  spouse: byGender("Wife", "Husband", "Spouse"),
  child: byGender("Daughter", "Son", "Child"),
  sibling: byGender("Sister", "Brother", "Sibling"),
  grandparent: byGender("Grandmother", "Grandfather", "Grandparent"),
  parentSibling: byGender("Aunt", "Uncle", "Aunt or uncle"),
  cousin: () => "Cousin",
  grandchild: byGender("Granddaughter", "Grandson", "Grandchild"),
  childInLaw: byGender("Daughter-in-law", "Son-in-law", "Child-in-law"),
  parentInLaw: byGender("Mother-in-law", "Father-in-law", "Parent-in-law"),
  siblingChild: byGender("Niece", "Nephew", "Niece or nephew"),
  other: () => "", // someone named in passing: no family word
};
/** "Grandmother Harriet Teece", or just "Arthur T. Field" for someone who isn't family. */
const withRole = (relative, text) => [ROLE_WORDS[relative.role](relative.gender), text].filter(Boolean).join(" ");
const ROLE_ORDER = ["father", "mother", "spouse", "child", "sibling", "grandparent", "parentSibling", "cousin", "grandchild", "childInLaw", "parentInLaw", "siblingChild", "other"];

export function describeRelative(relative) {
  const surname = relative.birthSurname || relative.surnames[0] || relative.surname || "";
  const others = (relative.firstNames || []).slice(1);
  const name = [...relative.given, surname].filter(Boolean).join(" ") + (others.length ? ` (also written ${others.join(", ")})` : "");
  const details = [relative.birthYear ? `b. about ${relative.birthYear}` : "", relative.birthPlace].filter(Boolean).join(", ");
  return `${withRole(relative, name)}${details ? ` (${details})` : ""}`;
}

const LIKELY = 75;
const POSSIBLE = 55;

/** results: [{relative, attached?, candidates: [{profile, score, reasons, conflicts}]}] */
/** A relative in a few words: "Daughter Mary, b. about 1924". */
function relativeShort(relative) {
  return `${withRole(relative, relative.given[0] || "?")}${relative.birthYear ? `, b. about ${relative.birthYear}` : ""}`;
}

/** "Ellen Maria (Watkins) Rowland": a wife or mother by her birth and married names, as WikiTree writes them. */
function relativeFullName(relative) {
  const surname = relative.birthSurname || relative.surnames?.[0] || relative.surname || "";
  const others = (relative.firstNames || []).slice(1);
  const married =
    relative.role === "mother" || (relative.role === "spouse" && relative.gender === "Female")
      ? (relative.surnames || []).find((name) => name && fold(name) !== fold(surname)) || ""
      : "";
  const surnames = married && surname ? `(${surname}) ${married}` : surname;
  // AI can put the maiden name in the given names too: "Mary Singleton (Singleton) Densham" (2026-10-18)
  const given = [...(relative.given || [])];
  while (given.length > 1 && [surname, married].some((name) => name && fold(name) === fold(given[given.length - 1]))) given.pop();
  return [...given, surnames].filter(Boolean).join(" ") + (others.length ? ` (also ${others.join(", ")})` : "");
}

/** "Wife Ellen Maria (Watkins) Rowland, b. about 1867 (searched for Ellen Watkins and Ellen Rowland, born 1862–1872)":
 * the tester couldn't tell whether "Wife Ellen" had been looked for under her maiden name (2026-10-12). */
function relativeNotFound(entry) {
  const relative = entry.relative;
  const searched = entry.searched || [];
  const names = joinWithAnd(searched);
  const how = names ? ` (searched for ${names}${entry.searchedYears ? `, born ${entry.searchedYears}` : ""})` : "";
  return `${withRole(relative, relativeFullName(relative))}${relative.birthYear ? `, b. about ${relative.birthYear}` : ""}${how}`;
}

/**
 * The answer: a short summary in the chat, and every candidate side by side with
 * what the bio says in a results table that opens with it.
 */
/** The profile person's own duplicates, from Find Matches (the user, 2026-10-07: "Duplicate check
 * should be run with this question"). `duplicates`: {loginNeeded, noAnchor, total, likely: [describeDuplicate(…)]}. */
export function duplicateLines(duplicates, subjectLabel) {
  const lines = [];
  if (!duplicates || duplicates.noAnchor) return lines; // (nothing to compare the candidates with)
  const who = subjectLabel.replace(/\s*\([^()]*\)$/, "");
  if (duplicates.loginNeeded) lines.push("", `To check for duplicates of ${who} too, log in to WikiTree.`);
  else if (duplicates.likely?.length) {
    const count = duplicates.likely.length;
    const from = duplicates.source === "finder" ? " (from the Duplicate Finder)" : "";
    lines.push("", `**${who} may have ${count === 1 ? "a duplicate" : `${count} duplicates`} on WikiTree${from}:**`);
    for (const d of duplicates.likely) {
      const heading = d.percent === false ? "Possible duplicate:" : `Possible duplicate (${d.score}%):`;
      lines.push("", `**${heading}** ${d.wtId} ${d.name}${d.span ? `, ${d.span}` : ""}`);
      if (d.why) lines.push(`- ✓ ${d.why}`);
      if (d.warn) lines.push(`- ✗ ${d.warn}`);
    }
  } else if (duplicates.source === "finder") {
    lines.push("", `The Duplicate Finder lists no possible duplicates of ${who}.`);
  } else if (duplicates.total) {
    lines.push("", `No likely duplicates of ${who}: none of the ${duplicates.total} profile${duplicates.total === 1 ? "" : "s"} Find Matches lists scores 65% or more.`);
  } else {
    lines.push("", `Find Matches lists no possible duplicates of ${who}.`);
  }
  return lines;
}

/**
 * `askedNames`: the people the question named ("do Jean Prévost and Françoise Lamontagne have profiles?"):
 * only they were searched for, some perhaps from the biography of `subjectLabel` (which may be "").
 */
export function buildFindRelativesAnswer({ subjectLabel, results: allResults, readBy, duplicates = null, askedNames = null }) {
  const asked = Array.isArray(askedNames) && askedNames.length > 0;
  // People named in passing (an employer, a fellow servant) are searched for too, but listed apart.
  const results = asked ? allResults : allResults.filter((entry) => entry.relative.role !== "other");
  const named = asked ? [] : allResults.filter((entry) => entry.relative.role === "other");
  const sorted = [...results].sort(
    (a, b) => ROLE_ORDER.indexOf(a.relative.role) - ROLE_ORDER.indexOf(b.relative.role) || (a.relative.birthYear || 9999) - (b.relative.birthYear || 9999)
  );
  const shown = (entry) => entry.candidates.filter((c) => c.score >= POSSIBLE).slice(0, 3);
  const attached = sorted.filter((entry) => entry.attached);
  const found = sorted.filter((entry) => !entry.attached && shown(entry).length);
  const missing = sorted.filter((entry) => !entry.attached && !shown(entry).length);
  const total = allResults.length;
  const others = named.length ? ` and ${named.length} other ${named.length === 1 ? "person" : "people"}` : "";
  const fromBio = asked && subjectLabel && allResults.some((entry) => entry.relative.role !== "other");
  const lines = [
    asked
      ? `I searched WikiTree for ${joinWithAnd(askedNames)}${fromBio ? `, with what ${subjectLabel}'s biography says about them (${readBy})` : ""}.`
      : `${subjectLabel}'s biography names ${results.length} relative${results.length === 1 ? "" : "s"}${others} (${readBy}). I searched WikiTree for ${total === 1 ? "them" : "each one"}.`,
  ];
  // Both found, married to each other on WikiTree: the answer to "where is this couple?".
  const couple = sorted
    .map((entry) => shown(entry)[0])
    .filter((best) => best?.couplePartner && sorted.some((other) => Number(shown(other)[0]?.profile?.Id) === Number(best.couplePartner.Id)));
  if (couple.length === 2) {
    const [a, b] = couple.map((best) => `${personName(best.profile)} (${best.profile.Name})`);
    lines.push("", `**Found as a couple:** ${a} and ${b} are married to each other on WikiTree.`);
  }
  lines.push(...duplicateLines(duplicates, subjectLabel));
  // Beacall-491's family all turned up under Philip Beacall (Beacall-11): this profile may be his duplicate.
  const standIns = new Map();
  for (const entry of found) {
    const best = shown(entry)[0];
    if (best?.standIn?.Name) standIns.set(best.standIn.Name, { profile: best.standIn, count: (standIns.get(best.standIn.Name)?.count || 0) + 1 });
  }
  const twin = [...standIns.values()].sort((a, b) => b.count - a.count)[0];
  if (twin && twin.count >= 2) {
    const id = subjectLabel.match(/\(([^()]+)\)$/)?.[1] || "this profile";
    const listed = (duplicates?.likely || []).some((d) => String(d.wtId).toLowerCase() === String(twin.profile.Name).toLowerCase());
    lines.push(
      "",
      listed
        ? `**${twin.count} of the relatives below are already in the family of ${personName(twin.profile)} (${twin.profile.Name}),** which backs that up: a merge would bring the whole family together.`
        : `**${twin.count} of them are already in the family of ${personName(twin.profile)} (${twin.profile.Name}).** If that's the same person, ${id} may be a duplicate of ${twin.profile.Name}: a merge would bring the whole family together.`
    );
  }
  // One or two matches read better in the chat than in a popup table.
  const namedFound = named.filter((entry) => !entry.attached && shown(entry).length);
  const matchCount = [...found, ...namedFound].reduce((sum, entry) => sum + shown(entry).length, 0);
  const useTable = matchCount > 2;
  if (found.length) {
    lines.push("", `**May already be on WikiTree (${found.length}):**`);
    for (const entry of found) {
      if (useTable) {
        lines.push(`- ${relativeShort(entry.relative)}: ${shown(entry).map((c) => `${c.profile.Name} (${c.score}%)`).join(", ")}`);
        continue;
      }
      // **Daughter Mary Cassidy**
      // Biography: born about 1924, Pennsylvania
      // Possible match (55%): Cassidy-2478 Mary Kathryn Cassidy, 1925–1977
      // - ✓ Born 1925 (biography: about 1924)
      // - ✗ No birthplace on WikiTree to compare
      const relative = entry.relative;
      const bioBorn = [relative.birthYear ? `about ${relative.birthYear}` : "", relative.birthPlace].filter(Boolean).join(", ");
      lines.push("", `**${withRole(relative, relativeFullName(relative))}**`);
      if (bioBorn) lines.push(`Biography: born ${bioBorn}`);
      for (const c of shown(entry)) {
        const birth = yearOf(c.profile.BirthDate);
        const death = yearOf(c.profile.DeathDate);
        const span = birth || death ? `, ${birth || "?"}–${death || ""}` : "";
        // A blank line and a bold heading set each match apart (the user, 2026-10-07).
        lines.push("", `**${c.score >= LIKELY ? "Likely" : "Possible"} match (${c.score}%):** ${c.profile.Name} ${personName(c.profile)}${span}`);
        for (const reason of c.reasons) lines.push(`- ✓ ${reason}`);
        for (const conflict of c.conflicts) lines.push(`- ✗ ${conflict}`);
        for (const note of c.notes || []) lines.push(`- ${note}`);
      }
    }
  }
  if (attached.length) {
    lines.push("", `**Already connected (${attached.length}):** ${attached.map((entry) => `${relativeShort(entry.relative)} (${entry.attached.profile.Name})`).join("; ")}`);
  }
  if (missing.length) {
    lines.push("", `**No good match, so probably not on WikiTree yet (${missing.length}):**`, ...missing.map((entry) => `- ${relativeNotFound(entry)}`));
  }
  if (named.length) {
    // Arthur T. Field, b. about 1841, Shrewsbury (1881 census): Field-123 Arthur Thomas Field (80%)
    lines.push("", `**Others named in the biography, not family (${named.length}):**`);
    const byYear = [...named].sort((a, b) => (a.relative.birthYear || 9999) - (b.relative.birthYear || 9999));
    for (const entry of byYear) {
      const relative = entry.relative;
      const about = [relative.birthYear ? `b. about ${relative.birthYear}` : "", relative.birthPlace].filter(Boolean).join(", ");
      const where = (relative.evidence || []).filter((item) => /census/.test(item)).join(", ");
      const label = `${relativeFullName(relative)}${about ? `, ${about}` : ""}${where ? ` (${where})` : ""}`;
      const matches = shown(entry);
      if (entry.attached) lines.push(`- ${label}: already connected (${entry.attached.profile.Name})`);
      else if (matches.length) {
        const list = matches.map((c) => `${c.profile.Name} ${personName(c.profile)} (${c.score}%)`).join(", ");
        lines.push(`- ${label}: ${matches[0].score >= LIKELY ? "likely" : "possibly"} ${list}`);
      } else {
        const names = joinWithAnd(entry.searched || []);
        lines.push(`- ${label}: no good match${names ? ` (searched for ${names}${entry.searchedYears ? `, born ${entry.searchedYears}` : ""})` : ""}`);
      }
    }
  }
  if (found.length || namedFound.length) {
    lines.push(
      "",
      `${useTable ? "The table compares each one with the biography. " : ""}These are suggestions from names, dates and places: check the profiles before adding a relationship.`
    );
  }

  // Only the possible matches: the point is people who may be on WikiTree but aren't attached.
  const rows = [...found, ...namedFound].flatMap((entry) => {
    const relative = entry.relative;
    const base = {
      relative:
        relative.role === "other" ? `${relativeFullName(relative)}${relative.asked ? "" : " (named in the biography)"}` : withRole(relative, relativeFullName(relative)),
      bioBorn: [relative.birthYear ? `about ${relative.birthYear}` : "", relative.birthPlace].filter(Boolean).join(", "),
      gender: relative.gender || "",
    };
    const profileRow = (profile, extra) => ({
      ...base,
      wtid: profile.Name || "",
      name: personName(profile),
      born: [yearOf(profile.BirthDate) || "", profile.BirthLocation || ""].filter(Boolean).join(", "),
      died: yearOf(profile.DeathDate) || "",
      ...extra,
    });
    return shown(entry).map((c) =>
      profileRow(c.profile, {
        match: `${c.score >= LIKELY ? "Likely" : "Possible"} (${c.score}%)`,
        why: [...c.reasons, ...(c.notes || [])].join("; "),
        but: c.conflicts.join("; "),
      })
    );
  });
  const table = {
    title: asked ? `Profiles for ${joinWithAnd(askedNames)}` : `Relatives in ${subjectLabel}'s biography`,
    defaultOrder: [],
    columns: [
      { title: asked ? "Asked about" : "In the biography", key: "relative" },
      { title: "Born (biography)", key: "bioBorn" },
      { title: "WikiTree", key: "wtid", render: (row) => makeProfileLink(row.wtid, row.wtid) },
      { title: "Name", key: "name" },
      { title: "Born", key: "born" },
      { title: "Died", key: "died", cellClass: "chat-date-cell" },
      { title: "Match", key: "match", cellClass: "nowrap-cell" },
      { title: "Why", key: "why" },
      { title: "But", key: "but" },
    ],
    rows,
  };
  return useTable ? { message: lines.join("\n"), table, autoOpen: true } : { message: lines.join("\n") };
}

/** When a relative's birth year isn't known: the years they could have been born, from the subject's. */
export function yearRangeFor(role, subjectYear) {
  if (!subjectYear) return null;
  const offsets = {
    spouse: [-15, 20], child: [15, 50], sibling: [-25, 25], father: [-65, -15], mother: [-50, -14],
    grandparent: [-110, -30], parentSibling: [-60, 10], cousin: [-40, 40], grandchild: [30, 100],
    childInLaw: [0, 60], parentInLaw: [-80, -5], siblingChild: [-10, 60], other: [-70, 50],
  };
  const [from, to] = offsets[role] || [-30, 30];
  return [subjectYear + from, subjectYear + to];
}

const COUNTRY_WORDS = new Set(["england", "wales", "scotland", "ireland", "united kingdom", "uk", "great britain", "usa", "united states", "america"]);

/** The county (or state) in a birthplace, to narrow a search: "Bradford, Wiltshire" → "Wiltshire". */
export function searchCounty(place) {
  const text = String(place || "").trim();
  if (!text || /^not\s+in\b/i.test(text)) return "";
  const parts = (text.includes(",") ? text.split(",") : text.split(/\s+/)).map((part) => part.trim()).filter(Boolean);
  const local = parts.filter((part) => !COUNTRY_WORDS.has(part.toLowerCase()));
  return local.length ? local[local.length - 1] : "";
}

/** One profile's check in a line or two, for "check my in-laws": the relatives not attached that may be on
 * WikiTree ({relative: "Father John Jones", matches: ["Jones-45 John Jones (82%)"]}) and likely duplicates. */
export function checkLeads({ results = [], duplicates = null } = {}) {
  const found = results
    .filter((entry) => !entry.attached)
    .map((entry) => ({ entry, shown: (entry.candidates || []).filter((c) => c.score >= POSSIBLE).slice(0, 3) }))
    .filter(({ shown }) => shown.length)
    .map(({ entry, shown }) => ({
      relative: `${ROLE_WORDS[entry.relative.role](entry.relative.gender)} ${relativeFullName(entry.relative)}`,
      matches: shown.map((c) => `${c.profile.Name} ${personName(c.profile)} (${c.score}%)`),
    }));
  const likely = (duplicates?.likely || []).map((d) => `${d.wtId} ${d.name}${d.percent === false ? "" : ` (${d.score}%)`}`);
  return { found, duplicates: likely };
}

/** Runs promises a few at a time. */
export async function mapLimited(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const RELATIVE_SPOUSE_FIELDS = "Id,Name,FirstName,MiddleName,Nicknames,LastNameAtBirth,LastNameCurrent,RealName";

/** getRelatives' Spouses come as an object keyed by Id, or an empty list. */
export function spousesOf(person) {
  const spouses = person?.Spouses || {};
  return Array.isArray(spouses) ? spouses : Object.values(spouses);
}

export const CANDIDATE_FIELDS =
  "Id,Name,FirstName,MiddleName,Nicknames,LastNameAtBirth,LastNameCurrent,LastNameOther,RealName,Gender,BirthDate,BirthLocation,DeathDate,DeathLocation,Father,Mother";

/**
 * Searches WikiTree for each relative and scores what comes back.
 * `searchPerson(params)` → matches; `getPeople(ids)` → profiles (injected for tests).
 */
// (not fold(), which drops the digits: Beacall-149 isn't Beacall-20)
const wtIdKey = (id) => String(id || "").trim().replace(/ /g, "_").toLowerCase();
const sameWikiTreeId = (a, b) => Boolean(a && b) && wtIdKey(a) === wtIdKey(b);

export async function searchRelatives({ subject, relatives, attached = [], searchPerson, getPeople, getSpouses = null, getProfiles = null }) {
  const subjectYear = yearOf(subject.BirthDate);
  const pending = relatives.map((relative) => ({
    relative: relative.birthYear ? relative : { ...relative, yearRange: yearRangeFor(relative.role, subjectYear) },
    attached: findAttached(relative, attached),
    candidates: [],
  }));
  const toSearch = pending.filter((entry) => !entry.attached);
  toSearch.forEach((entry) => (entry.searched = []));
  const yearParams = (relative) => {
    if (relative.birthYear) return { BirthDate: String(relative.birthYear), dateSpread: 5 };
    if (!relative.yearRange) return {};
    const [from, to] = relative.yearRange;
    return { BirthDate: String(Math.round((from + to) / 2)), dateSpread: Math.min(20, Math.ceil((to - from) / 2)) };
  };
  const runSearch = async (params) => {
    try {
      const result = await searchPerson(params);
      const matches = (Array.isArray(result) ? result : result?.matches || []).filter(
        (match) => match?.Id && Number(match.Id) !== Number(subject.Id)
      );
      return { matches, total: Array.isArray(result) ? matches.length : Number(result?.total) || matches.length };
    } catch (error) {
      console.warn("wbe: relative search failed", params, error);
      return { matches: [], total: 0 };
    }
  };

  // One search per family (surname and county, no first name) finds the census
  // spellings a first-name search misses: "Fredric", "Chas", "Cealia" (2026-10-07 test
  // on 40 connected profiles).
  const pools = new Map();
  for (const entry of toSearch) {
    const county = searchCounty(entry.relative.birthPlace);
    const surname = entry.relative.surnames[0];
    if (!county || !surname || !entry.relative.birthYear) continue;
    const key = `${fold(surname)}|${fold(county)}`;
    if (!pools.has(key)) pools.set(key, { surname, county, years: [], matches: [] });
    pools.get(key).years.push(entry.relative.birthYear);
  }
  await mapLimited([...pools.values()], 2, async (pool) => {
    const from = Math.min(...pool.years) - 3;
    const to = Math.max(...pool.years) + 3;
    if (to - from > 40) return; // too wide for one search; the name searches cover it
    const { matches } = await runSearch({
      LastName: pool.surname,
      BirthLocation: pool.county,
      BirthDate: String(Math.round((from + to) / 2)),
      dateSpread: Math.max(1, Math.min(20, Math.ceil((to - from) / 2))),
      limit: 200,
    });
    pool.matches = matches;
  });

  const found = await mapLimited(toSearch, 2, async (entry) => {
    const { relative } = entry;
    const byId = new Map();
    const county = searchCounty(relative.birthPlace);
    const pool = pools.get(`${fold(relative.surnames[0] || "")}|${fold(county)}`);
    for (const match of pool?.matches || []) byId.set(Number(match.Id), match);
    const search = async (firstName, surname, place = "") => {
      const full = ABBREVIATIONS[fold(firstName).replace(/\.$/, "")];
      const params = { FirstName: full ? full[0].toUpperCase() + full.slice(1) : firstName, LastName: surname, limit: 50, ...yearParams(relative) };
      if (place) params.BirthLocation = place;
      // (for the answer: "searched for Ellen Watkins and Ellen Rowland")
      const searchedName = `${params.FirstName} ${surname}`;
      if (!entry.searched.includes(searchedName)) entry.searched.push(searchedName);
      if (params.BirthDate && params.dateSpread) {
        const year = Number(params.BirthDate);
        entry.searchedYears = `${year - params.dateSpread}–${year + params.dateSpread}`;
      }
      const { matches, total } = await runSearch(params);
      for (const match of matches) byId.set(Number(match.Id), match);
      return total;
    };
    // Few calls (WikiTree limits them): one search by name and year, narrowed by the county
    // when it finds more than one page (a wrong William Turner in the first 50 of 253 hid
    // the right one). Other surnames and spellings only while nothing good has turned up.
    const good = () => [...byId.values()].some((profile) => scoreCandidate(relative, profile).score >= POSSIBLE);
    const [firstName, ...otherFirsts] = (relative.firstNames || [relative.given[0]]).slice(0, 2);
    const [surname, ...otherSurnames] = relative.surnames;
    const total = await search(firstName, surname);
    if (total > 50 && county) await search(firstName, surname, county);
    for (const other of otherSurnames) if (!good()) await search(firstName, other, total > 50 ? county : "");
    for (const other of otherFirsts) if (!good()) await search(other, surname, total > 50 ? county : "");
    return [...byId.values()];
  });
  // A profile the biography links to is fetched by its ID: a search by name and year can miss it.
  const linkedIds = [...new Set(toSearch.map((entry) => entry.relative.linkedId).filter(Boolean))];
  if (getProfiles && linkedIds.length) {
    const profiles = ((await getProfiles(linkedIds).catch(() => [])) || []).filter((profile) => profile?.Id);
    toSearch.forEach((entry, index) => {
      const profile = profiles.find((item) => sameWikiTreeId(item.Name, entry.relative.linkedId));
      if (profile && !found[index].some((item) => Number(item.Id) === Number(profile.Id))) found[index].push(profile);
    });
  }
  const parentIds = new Set();
  found.flat().forEach((profile) => {
    if (Number(profile.Father) > 0) parentIds.add(Number(profile.Father));
    if (Number(profile.Mother) > 0) parentIds.add(Number(profile.Mother));
  });
  const parentsById = new Map();
  if (parentIds.size) {
    const ids = [...parentIds];
    for (let start = 0; start < ids.length; start += 100) {
      const people = (await getPeople(ids.slice(start, start + 100))) || [];
      people.forEach((person) => person?.Id && parentsById.set(Number(person.Id), person));
    }
  }
  const all = pending.map((item) => item.relative);
  const score = (spousesById) =>
    toSearch.forEach((entry, index) => {
      const options = {
        expectedParents: expectedParentsFor(entry.relative, subject, all),
        parentsById,
        expectedPartner: expectedPartnerFor(entry.relative, subject, all),
        spousesById,
      };
      entry.candidates = found[index]
        .map((profile) => {
          const scored = { profile, ...scoreCandidate(entry.relative, profile, options) };
          if (!sameWikiTreeId(profile.Name, entry.relative.linkedId)) return scored;
          // The biography's own link outweighs any doubt from names and dates.
          return { ...scored, score: Math.max(LIKELY, Math.min(100, scored.score + 40)), reasons: ["The biography links to this profile", ...scored.reasons] };
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);
    });
  score(new Map());
  // Then the marriages of the father, mother and spouse candidates still in the running: those at 40% or
  // more, and the best few whose name fits only as a spelling (Jean Provost for the bio's Jean Prévost, 38%).
  const partnerIds = toSearch
    .filter((entry) => expectedPartnerFor(entry.relative, subject, all))
    .flatMap((entry) =>
      entry.candidates.filter((candidate, index) => candidate.score >= 40 || index < 5).map((candidate) => Number(candidate.profile.Id))
    );
  if (getSpouses && partnerIds.length) {
    const spousesById = new Map();
    const ids = [...new Set(partnerIds)];
    for (let start = 0; start < ids.length; start += 50) {
      const batch = (await getSpouses(ids.slice(start, start + 50))) || new Map();
      batch.forEach((value, key) => spousesById.set(Number(key), value));
    }
    score(spousesById);
    confirmCouples(toSearch, subject, all, spousesById);
  }
  return pending;
}

/**
 * The bio's couple found as a couple: a candidate for the father married on WikiTree to a candidate for the
 * mother vouches for both, whatever their spellings (Jean Provost and Françoise Leblanc for the bio's "Jean
 * Prévost and Françoise Lamontagne (aka Leblanc)", Heard-171, 2026-10-31).
 */
function confirmCouples(entries, subject, relatives, spousesById) {
  const byRelative = new Map(entries.map((entry) => [entry.relative, entry]));
  for (const entry of entries) {
    const partner = byRelative.get(expectedPartnerFor(entry.relative, subject, relatives));
    if (!partner) continue;
    const partnerProfiles = new Map(partner.candidates.map((candidate) => [Number(candidate.profile.Id), candidate.profile]));
    let changed = false;
    for (const candidate of entry.candidates) {
      const spouse = (spousesById.get(Number(candidate.profile.Id)) || []).find((item) => partnerProfiles.has(Number(item?.Id)));
      if (!spouse) continue;
      const profile = partnerProfiles.get(Number(spouse.Id));
      const named = relativeFullName(partner.relative);
      const whom = partner.relative.role === "other" ? named : `the biography's ${ROLE_WORDS[partner.relative.role](partner.relative.gender).toLowerCase()}, ${named}`;
      const reason = `Married to ${personName(profile)} (${profile.Name}), who fits ${whom}`;
      candidate.reasons = [reason, ...candidate.reasons.filter((item) => !item.startsWith("Married to "))];
      candidate.conflicts = candidate.conflicts.filter((item) => !item.startsWith("Married to "));
      candidate.score = Math.max(candidate.score, LIKELY);
      candidate.couplePartner = profile;
      changed = true;
    }
    if (changed) entry.candidates.sort((a, b) => b.score - a.score);
  }
}
