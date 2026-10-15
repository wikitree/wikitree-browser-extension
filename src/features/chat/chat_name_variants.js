// Names that are the same name (2026-10-15): spellings with and without accents
// (José, Jose), and for surnames the One Name Study variants (Kool, Cole, Cool).
// The name cloud and the surname river count each group as one name, shown under
// the spelling the tree uses most, and list the spellings they grouped.

import { SURNAME_VARIANT_GROUPS } from "./chat_surname_variants_data";

const SPECIAL_LETTERS = { ł: "l", ø: "o", ß: "ss", æ: "ae", œ: "oe", đ: "d", ı: "i" };

/** "José" → "jose", "Müller" → "muller", "Łukasz" → "lukasz": for comparing, never for showing. */
export function foldName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łøßæœđı]/g, (letter) => SPECIAL_LETTERS[letter])
    .replace(/\s+/g, " ")
    .trim();
}

let surnameGroupOf = null;

/** The same key for every spelling of a One Name Study's surname (and for accent-only differences). */
export function surnameGroupKey(name) {
  if (!surnameGroupOf) {
    surnameGroupOf = new Map();
    SURNAME_VARIANT_GROUPS.forEach((group, index) => group.split("|").forEach((spelling) => surnameGroupOf.set(foldName(spelling), `variants:${index}`)));
  }
  const folded = foldName(name);
  return surnameGroupOf.get(folded) || folded;
}

// Your own groupings (2026-10-15): Smit and Smith in a South African tree, say. Kept in
// chrome.storage.local (shared by www and staging; sync storage is small and full) and
// applied to all of your charts. Per kind ("first" or "surname"): merges are pairs of
// folded names joined on top of the study and accent groups; splits are exact spellings
// taken out of those groups; mains are spellings you chose to show a group under (the
// last one chosen wins), exact and lower case.
export const NAME_GROUPS_STORAGE_KEY = "wbeChatNameGroups";
let custom = { first: { merges: [], splits: [], mains: [] }, surname: { merges: [], splits: [], mains: [] } };

function storage() {
  return typeof chrome !== "undefined" && chrome?.storage?.local ? chrome.storage.local : null;
}

function cleanCustom(value) {
  const kindOf = (entry) => ({
    merges: (Array.isArray(entry?.merges) ? entry.merges : []).filter((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((name) => typeof name === "string" && name)),
    splits: (Array.isArray(entry?.splits) ? entry.splits : []).filter((name) => typeof name === "string" && name),
    mains: (Array.isArray(entry?.mains) ? entry.mains : []).filter((name) => typeof name === "string" && name),
  });
  return { first: kindOf(value?.first), surname: kindOf(value?.surname) };
}

/** Reads your groupings (call before building a chart); resolves even without storage. */
export function loadCustomNameGroups() {
  const store = storage();
  if (!store) return Promise.resolve(custom);
  return new Promise((resolve) => {
    try {
      store.get([NAME_GROUPS_STORAGE_KEY], (stored) => {
        custom = cleanCustom(stored?.[NAME_GROUPS_STORAGE_KEY]);
        resolve(custom);
      });
    } catch (error) {
      resolve(custom);
    }
  });
}

function saveCustom() {
  const store = storage();
  if (!store) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      store.set({ [NAME_GROUPS_STORAGE_KEY]: custom }, () => resolve());
    } catch (error) {
      resolve();
    }
  });
}

/** For tests: replace your groupings without storage. */
export function setCustomNameGroups(value) {
  custom = cleanCustom(value);
}

const exactKey = (name) => `exact:${String(name || "").toLowerCase().trim()}`;

/** The key before your merges: the study or accent group, or the exact spelling once split off. */
function baseKey(name, kind) {
  if (custom[kind].splits.includes(String(name || "").toLowerCase().trim())) return exactKey(name);
  return kind === "surname" ? surnameGroupKey(name) : foldName(name);
}

/** The grouping key for a kind ("first" or "surname"), with your merges and splits applied. */
export function nameKeyFor(kind = "surname") {
  const parent = new Map();
  const find = (key) => {
    while (parent.has(key) && parent.get(key) !== key) key = parent.get(key);
    return key;
  };
  custom[kind].merges.forEach(([a, b]) => {
    const rootA = find(baseKey(a, kind));
    const rootB = find(baseKey(b, kind));
    if (rootA !== rootB) parent.set(rootB, rootA);
  });
  return (name) => find(baseKey(name, kind));
}

/** True when the spellings are together only because you grouped them. */
export function isCustomGroup(names, kind = "surname") {
  return new Set((names || []).map((name) => baseKey(name, kind))).size > 1;
}

const lowerName = (name) => String(name || "").toLowerCase().trim();

function chooseMain(kind, name) {
  const entry = custom[kind];
  entry.mains = [...entry.mains.filter((main) => main !== lowerName(name)), lowerName(name)];
}

/** Show a group under this spelling from now on. */
export async function setMainName(kind, name) {
  chooseMain(kind, name);
  await saveCustom();
}

/** Count two names as one from now on, shown as main (a unless given; null keeps the commonest). Merging also undoes a split of either. */
export async function mergeNames(kind, a, b, main = a) {
  const entry = custom[kind];
  if (main) chooseMain(kind, main);
  const lower = [a, b].map((name) => String(name || "").toLowerCase().trim());
  entry.splits = entry.splits.filter((name) => !lower.includes(name));
  if (nameKeyFor(kind)(a) !== nameKeyFor(kind)(b)) entry.merges.push([foldName(a), foldName(b)]);
  await saveCustom();
}

/** Count each of these spellings on its own: drops your merges, splits study and accent groups. */
export async function ungroupNames(kind, names) {
  const entry = custom[kind];
  const folded = new Set((names || []).map(foldName));
  entry.merges = entry.merges.filter(([a, b]) => !folded.has(a) && !folded.has(b));
  entry.mains = entry.mains.filter((main) => !(names || []).some((name) => lowerName(name) === main));
  // One name: take it out of its study or accent group (Cole from Kool); several: if still together.
  const single = (names || []).length === 1 && (kind === "first" || surnameGroupKey(names[0]) !== foldName(names[0]));
  if (single || new Set((names || []).map(nameKeyFor(kind))).size < (names || []).length) {
    (names || []).forEach((name) => {
      const lower = String(name).toLowerCase().trim();
      if (!entry.splits.includes(lower)) entry.splits.push(lower);
    });
  }
  await saveCustom();
}

/**
 * names: every name as found (repeats count). Returns {labelOf(name), spellings}: labelOf
 * gives the group's commonest spelling (or the one you chose, when kind is given); spellings
 * maps that label to [[spelling, count]], the label first, then commonest first, for the
 * groups with more than one spelling.
 */
export function groupNameSpellings(names, keyOf = foldName, kind = "") {
  const mains = kind ? custom[kind]?.mains || [] : [];
  const rank = (name) => mains.indexOf(lowerName(name));
  const byKey = new Map();
  (names || []).forEach((name) => {
    if (!name) return;
    const key = keyOf(name);
    const counts = byKey.get(key) || new Map();
    counts.set(name, (counts.get(name) || 0) + 1);
    byKey.set(key, counts);
  });
  const labels = new Map();
  const spellings = new Map();
  byKey.forEach((counts) => {
    const list = [...counts.entries()].sort((a, b) => rank(b[0]) - rank(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]));
    list.forEach(([name]) => labels.set(name, list[0][0]));
    if (list.length > 1) spellings.set(list[0][0], list);
  });
  return { labelOf: (name) => labels.get(name) || name, spellings };
}

/** "Kool (3), Cole (2), Cool" */
export function spellingsText(list) {
  return (list || []).map(([name, count]) => (count > 1 ? `${name} (${count})` : name)).join(", ");
}

/** Your groupings in words, for the chat: "Surnames: Smit + Smith. Counted on their own: Cole." */
export function describeCustomNameGroups() {
  const lines = [];
  [
    ["surname", "Surnames"],
    ["first", "First names"],
  ].forEach(([kind, label]) => {
    const { merges, splits } = custom[kind];
    if (merges.length) lines.push(`${label} counted as one: ${merges.map(([a, b]) => `${a} + ${b}`).join("; ")}.`);
    if (splits.length) lines.push(`${label} counted on their own: ${splits.join(", ")}.`);
  });
  return lines.join("\n");
}

// The chat command (2026-10-15): "count Smith as Smit", "group Smith with Smit", "treat Smith
// and Smit as the same surname", "ungroup Smith", "show my name groupings". Names are 1-4
// words of letters; anything looser declines (the AI can rephrase it).
const NAME = String.raw`((?:(?!and\b|as\b|with\b|from\b|the\b)[\p{L}'’-]+)(?:\s+(?!and\b|as\b|with\b|from\b|the\b)[\p{L}'’-]+){0,3})`;
const KIND = String.raw`(?:\s+as\s+(?:one|the\s+same)(?:\s+(sur|first\s+|given\s+|last\s+|family\s+)?name)?)?`;
const KIND_APART = String.raw`(?:\s+as\s+(?:separate|different)(?:\s+(sur|first\s+|given\s+|last\s+|family\s+)?names?)?)?`;
const MERGE_PATTERNS = [
  new RegExp(String.raw`^(?:count|treat|group)\s+${NAME}\s+(?:as|with)\s+${NAME}(?:\s+(?:in\s+)?(?:my\s+)?(?:charts?|name\s+clouds?|surname\s+rivers?))?$`, "iu"),
  new RegExp(String.raw`^(?:count|treat|group)\s+${NAME}\s+and\s+${NAME}(?:\s+together)?${KIND}$`, "iu"),
  new RegExp(String.raw`^${NAME}\s+(?:is|are)\s+the\s+same\s+(sur|first\s+|given\s+|last\s+|family\s+)?name\s+as\s+${NAME}$`, "iu"),
];
const UNGROUP_PATTERNS = [
  new RegExp(String.raw`^(?:ungroup|separate|split)\s+${NAME}(?:\s+(?:and|from)\s+${NAME})?${KIND_APART}$`, "iu"),
  new RegExp(String.raw`^(?:count|treat)\s+${NAME}(?:\s+and\s+${NAME})?\s+(?:separately|on\s+(?:its|their)\s+own|as\s+(?:a\s+)?(?:separate|different)\s+(sur|first\s+|given\s+|last\s+|family\s+)?names?)$`, "iu"),
  new RegExp(String.raw`^stop\s+grouping\s+${NAME}(?:\s+(?:and|with)\s+${NAME})?$`, "iu"),
];
const LIST_PATTERN = /^(?:show|list|what\s+are)\s+(?:me\s+)?my\s+(?:own\s+)?(?:sur)?name\s+group(?:ing)?s$/i;

/** {action: "merge"|"ungroup"|"list", kind, names, main?} or null; main: the name to show the group as ("count Smith as Smit": Smit). */
export function parseNameGroupingPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!]+$/g, "")
    .replace(/^please\s+/i, "")
    .replace(/\s+please$/i, "")
    .replace(/["“”]/g, "");
  if (LIST_PATTERN.test(text)) return { action: "list" };
  const kindOf = (word) => (/^(?:first|given)/i.test(String(word || "").trim()) ? "first" : "surname");
  for (const [patterns, action] of [
    [MERGE_PATTERNS, "merge"],
    [UNGROUP_PATTERNS, "ungroup"],
  ]) {
    for (const re of patterns) {
      const match = text.match(re);
      if (!match) continue;
      const [, a, b, kindWord] = match;
      // "Smith is the same surname as Smit": the kind sits between the names.
      const names = re === MERGE_PATTERNS[2] ? [a, match[3]] : [a, b];
      const kind = kindOf(re === MERGE_PATTERNS[2] ? b : kindWord);
      const cleaned = names.filter(Boolean).map((name) => name.trim());
      if (action === "merge" && (cleaned.length !== 2 || foldName(cleaned[0]) === foldName(cleaned[1]))) return null;
      // Names look like names ("count births as deaths" isn't one), unless the prompt says "name".
      const nameLike = (name) => /^\p{Lu}/u.test(name) || /^(?:(?:van|von|de|du|da|di|le|la|der|den|ter|ten)\s+)+\p{Lu}/u.test(name);
      if (!/name/i.test(text) && !cleaned.every(nameLike)) return null;
      // "count A as B", "group A with B", "A is the same surname as B": B is the one to show.
      const main = action === "merge" && re !== MERGE_PATTERNS[1] ? cleaned[1] : "";
      return main ? { action, kind, names: cleaned, main } : { action, kind, names: cleaned };
    }
  }
  return null;
}
