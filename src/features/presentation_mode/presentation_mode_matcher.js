/*
Created By: Ian Beacall (Beacall-6)
*/

/*
Finds private facts in page text.

Some facts are specific enough to hide wherever they appear: a full name with a private part ("Ian Christopher
Beacall"), a full date ("14 Apr 1969"), the ID of an unlisted profile. Others would hide far too much if hidden
everywhere ("Christopher", "1969", "Birkenhead"), so they are hidden only in that person's context: on their own
pages, or in a row or list item that links to them.

A name inside a link to a profile belongs to that profile: "Philip Beacall" linking to a public ancestor isn't the
private Philip Beacall, so there only the linked person's own facts count.

Matching: thousands of names and dates make one huge regular expression slow, so each pattern is filed under the
first word it can start with. A text is split into words, and only the patterns filed under each word are tried
there, as sticky regular expressions.
*/

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WORD = /[\p{L}\p{N}]+/gu;
const END = "(?![\\p{L}\\p{N}])";
const SEP = "(?:\\s*[-./,]\\s*|\\s+)";
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A phrase as a pattern source: any run of spaces matches any whitespace, and a full stop is optional. */
function phraseSource(phrase) {
  return phrase
    .trim()
    .split(/\s+/)
    .map((part) => escapeRegExp(part).replace(/\\\./g, "\\.?"))
    .join("\\s+");
}

function firstWord(text) {
  const match = text.match(/[\p{L}\p{N}]+/u);
  return match ? match[0].toLowerCase() : "";
}

/**
 * Patterns filed under the word they start with. Each pattern remembers whose it is (owners: profile Ids) and
 * whether it is a name, so a name in a link to someone else can be left alone.
 */
class AnchorIndex {
  constructor() {
    this.map = new Map();
    this.entries = new Map();
  }

  add(source, anchors, { owner = null, isName = false } = {}) {
    let entry = this.entries.get(source);
    if (!entry) {
      entry = { regex: new RegExp(source + END, "iuy"), owners: new Set(), isName };
      this.entries.set(source, entry);
      for (const anchor of new Set(anchors.map((a) => a.toLowerCase()).filter(Boolean))) {
        if (!this.map.has(anchor)) this.map.set(anchor, []);
        this.map.get(anchor).push(entry);
      }
    }
    if (owner !== null) entry.owners.add(owner);
  }

  addPhrase(phrase, options) {
    const trimmed = phrase.replace(/^[^\p{L}\p{N}]+/u, "");
    if (trimmed) this.add(phraseSource(trimmed), [firstWord(trimmed)], options);
  }

  get size() {
    return this.entries.size;
  }
}

const dayAnchors = (d) => {
  const days = [`${d}`, `0${d}`];
  return days.flatMap((day) => [day, `${day}st`, `${day}nd`, `${day}rd`, `${day}th`]);
};

function monthSource(m) {
  const full = MONTHS[m - 1];
  const extra = m === 9 ? "|Sept\\.?" : "";
  return `(?:${full}|${full.slice(0, 3)}\\.?${extra})`;
}

function monthAnchors(m) {
  const full = MONTHS[m - 1];
  return [full, full.slice(0, 3), ...(m === 9 ? ["Sept"] : [])];
}

/** The ways a full date or a month and year gets written. */
export function addDatePatterns(index, { y, m, d }) {
  if (!y || !m) return;
  const month = monthSource(m);
  if (d) {
    const day = `0?${d}(?:st|nd|rd|th)?`;
    index.add(`${day}${SEP}(?:of\\s+)?${month}${SEP}${y}`, dayAnchors(d)); // 14 Apr 1969, 14th of April, 1969
    index.add(`${month}${SEP}${day}${SEP}${y}`, monthAnchors(m)); // April 14, 1969
    index.add(`${y}${SEP}0?${m}${SEP}0?${d}`, [`${y}`]); // 1969-04-14
    index.add(`0?${d}${SEP}0?${m}${SEP}${y}`, [`${d}`, `0${d}`]); // 14/04/1969
    index.add(`0?${m}${SEP}0?${d}${SEP}${y}`, [`${m}`, `0${m}`]); // 04/14/1969
  } else {
    index.add(`${month}${SEP}${y}`, monthAnchors(m)); // Apr 1969
  }
}

/** "Example-7" or "Van der Byl-59" as it appears in text, with spaces or underscores. */
function profileIdSource(name) {
  return name
    .split(/[\s_]+/)
    .map(escapeRegExp)
    .join("[\\s_]+");
}

/** Lowercase, with spaces for underscores, for looking a WikiTree ID up. */
export const normaliseProfileId = (name) => decodeSafely(name).replace(/_/g, " ").trim().toLowerCase();

function decodeSafely(text) {
  try {
    return decodeURIComponent(text);
  } catch (error) {
    return text;
  }
}

/**
 * Turns the private facts into the indexes the page code uses.
 * @param {Object[]} facts From privateFactsFromPeople()
 * @param {Object} [options]
 * @param {boolean} [options.emails] Also hide email addresses
 */
export function compileFacts(facts, { emails = true } = {}) {
  const global = new AnchorIndex();
  const context = new Map();
  const byId = new Map();
  const idByName = new Map();

  for (const fact of facts || []) {
    byId.set(fact.id, fact);
    if (fact.name) idByName.set(normaliseProfileId(fact.name), fact.id);

    fact.phrases.forEach((phrase) => global.addPhrase(phrase, { owner: fact.id, isName: true }));
    fact.dates.forEach((date) => addDatePatterns(global, date));
    if (fact.hidden && fact.name) global.add(profileIdSource(fact.name), [firstWord(fact.name)], { owner: fact.id });

    const own = new AnchorIndex();
    fact.tokens.forEach((token) => own.addPhrase(token));
    fact.dates.forEach((date) => own.add(`${date.y}`, [`${date.y}`]));
    for (const place of fact.places) {
      own.addPhrase(place);
      const first = place.split(",")[0].trim();
      if (first.length > 2 && first !== place) own.addPhrase(first);
    }
    if (own.size) context.set(fact.id, own);
  }

  return { global, context, byId, idByName, emails };
}

/**
 * Where the private facts are in a text.
 * @param {string} text
 * @param {Object} compiled From compileFacts()
 * @param {Iterable<number>} [contextIds] The people this text belongs to (see the file comment)
 * @param {number|null} [linkedId] For text in a link to a profile (see personInLink): that profile's Id, or 0 when
 *   nothing about them is private. Then only that person's names and facts count, and contextIds are ignored.
 * @returns {Array<[number, number]>} Start and end offsets, sorted and merged
 */
export function findPrivateRanges(text, compiled, contextIds = [], linkedId = null) {
  if (!text || !compiled) return [];
  const inLink = linkedId !== null && linkedId !== undefined;
  const indexes = [compiled.global];
  for (const id of inLink ? [linkedId] : contextIds) {
    const own = compiled.context.get(id);
    if (own) indexes.push(own);
  }

  const ranges = [];
  WORD.lastIndex = 0;
  let word;
  while ((word = WORD.exec(text))) {
    const key = word[0].toLowerCase();
    for (const index of indexes) {
      const patterns = index.map.get(key);
      if (!patterns) continue;
      for (const { regex, owners, isName } of patterns) {
        if (inLink && isName && index === compiled.global && !owners.has(linkedId)) continue;
        regex.lastIndex = word.index;
        const match = regex.exec(text);
        if (match) ranges.push([word.index, word.index + match[0].length]);
      }
    }
  }

  if (compiled.emails && text.includes("@")) {
    EMAIL.lastIndex = 0;
    let email;
    while ((email = EMAIL.exec(text))) ranges.push([email.index, email.index + email[0].length]);
  }

  return mergeRanges(ranges);
}

export function mergeRanges(ranges) {
  const sorted = ranges.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  return merged;
}

/**
 * The private person a link points to, if any: /wiki/Example-7, ?u=102, #name=Example-7 and so on.
 * @returns {number|null}
 */
export function personIdFromHref(href, compiled) {
  if (!href || !compiled) return null;
  const decoded = decodeSafely(href);
  for (const match of decoded.matchAll(/(?:^|[/=#])([^/?&#=]+?-\d+)(?=$|[/?&#])/gu)) {
    const id = compiled.idByName.get(normaliseProfileId(match[1]));
    if (id) return id;
  }
  const numeric = decoded.match(/[?&](?:u|id|user_id|userid)=(\d+)(?=$|[&#])/i);
  if (numeric && compiled.byId.has(Number(numeric[1]))) return Number(numeric[1]);
  return null;
}

/**
 * Who a link points to, from its href or (in the Tree Apps) its data-id.
 * @returns {number|null} The Id of a person with private facts; 0 for a link to anyone else's profile; null when it
 *   isn't a link to a profile.
 */
export function personInLink(href, dataId, compiled) {
  if (!compiled) return null;
  const id = personIdFromHref(href, compiled);
  if (id) return id;
  if (dataId && /^\d+$/.test(String(dataId).trim())) {
    const numeric = Number(dataId);
    return compiled.byId.has(numeric) ? numeric : 0;
  }
  if (!href) return null;
  const decoded = decodeSafely(href);
  const profile =
    /\/(?:wiki|treewidget)\/\p{L}[^/?&#=:]*?-\d+(?=$|[/?#])/u.test(decoded) ||
    /[?&]title=Special:EditPerson\b/i.test(decoded);
  return profile ? 0 : null;
}
