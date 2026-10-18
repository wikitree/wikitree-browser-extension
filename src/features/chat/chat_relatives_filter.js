// "Can you tell me which of my ancestors are members of the guitarists category?" (the user, 2026-10-17):
// a category among someone's ancestors, descendants or relatives, read without AI; also "my unsourced
// ancestors", "my famous relatives", "my female ancestors" (and these together). The category phrase is
// found first, in the ways people write it, then the other filters; what's left must be only an owner, a
// group of relatives and filler words, or the prompt is left for the other readers (no guessing at what an
// unknown word means).

import { KIN_DATE_SPAN, KIN_DATE_SPAN_PLACE_RE, kinDateSpan } from "./chat_kin_date_span";

// "in the Guitarists category", "members of Category: Guitarists", "[[Category:Guitarists]]", "categorised as Guitarists"
// (after "category", a name runs to the end or stops before "born", "who"…: "in category Guitarists born in Kent" is two things;
// before "category", it holds no "in" or "of": "which of my ancestors are members of the X category")
const STOP = String.raw`\s(?:born|died|who|whose|which|that|with|living|lived|from|and|or)\b`;
const TO_END = String.raw`((?:(?!${STOP}).)+?)["”]?(?=${STOP}|\s*$)`;
const NO_PREPOSITION = String.raw`((?:(?!\b(?:in|of|to|under|within)\s).)+?)`;
const CATEGORY_PHRASES = [
  /\[\[\s*category\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/i,
  new RegExp(String.raw`\b(?:in|of|to|under|within)\s+(?:the\s+)?category\s*:\s*["“]?` + TO_END, "i"),
  new RegExp(String.raw`\b(?:in|of|to|under|within)\s+(?:the\s+)?category\s+(?:called\s+|named\s+)?["“]?` + TO_END, "i"),
  new RegExp(String.raw`\b(?:in|of|to|under|within)\s+(?:the\s+)?["“]?` + NO_PREPOSITION + String.raw`["”]?\s+category\b`, "i"),
  new RegExp(String.raw`\bcategori[sz]ed\s+(?:as|in|under)\s+["“]?` + TO_END, "i"),
];

// The other filters, named as in the canonical query.
const FILTER_PHRASES = [
  { filter: "notables", re: /\b(?:notables?|famous|well[- ]known|celebrated)(?:\s+(?:people|persons|profiles|ones))?\b/gi },
  {
    filter: "unsourced",
    re: /\b(?:unsourced|(?:(?:with|having)\s+|(?:that|which|who)\s+(?:have|has)\s+)no\s+sources?|without\s+(?:any\s+)?sources?|(?:(?:still\s+)?needs?|needing)\s+(?:any\s+|more\s+)?sources?)\b/gi,
  },
  { filter: "female", re: /\b(?:female|women|ladies)\b/gi },
  { filter: "male", re: /\b(?:male|men)\b/gi },
];
const FILTER_ORDER = FILTER_PHRASES.map((item) => item.filter);

// "named John", "called Mary", "with the surname Smith": one name each. ("named John Smith" leaves "Smith",
// an unknown word, so it declines.)
const NAME = String.raw`([A-Za-z][A-Za-z'’-]*)`;
const NAME_PHRASES = [
  {
    key: "firstName",
    re: new RegExp(
      String.raw`\b(?:named|called|christened|(?:with|having|had|has|have)\s+the\s+(?:first|given|christian)\s+name(?:\s+of)?|whose\s+(?:first|given|christian)\s+name\s+(?:is|was))\s+` + NAME + String.raw`\b`,
      "i"
    ),
  },
  {
    key: "lastName",
    re: new RegExp(
      String.raw`\b(?:surnamed|(?:with|having|had|has|have)\s+the\s+(?:surname|last\s+name|family\s+name)(?:\s+of)?|whose\s+(?:surname|last\s+name|family\s+name)\s+(?:is|was))\s+` + NAME + String.raw`\b`,
      "i"
    ),
  },
];

// "born in Wales", "died in Kent before 1850", "born after 1900", "born between 1800 and 1850": with a filter, a
// name or a category only (a place or a date alone is a kin list, chat_router). One place and one date.
const BEFORE_AFTER_OR_SPAN = String.raw`(?:(before|after)\s+(\d{4})|${KIN_DATE_SPAN})`;
const RELATIVES_AHEAD = String.raw`(?=\s+(?:among(?:st)?|in|of|from)\s+(?:my|our|his|her|their)\b|\s*$)`;
const EVENT_PHRASES = [
  { place: true, re: new RegExp(String.raw`\b(?:(?:who|that)\s+(?:were|was)\s+)?(born|died)\s+in\s+(.+?)(?:\s+${BEFORE_AFTER_OR_SPAN})?` + RELATIVES_AHEAD, "i") },
  { place: false, re: new RegExp(String.raw`\b(?:(?:who|that)\s+(?:were|was)\s+)?(born|died)\s+${BEFORE_AFTER_OR_SPAN}(?=\s|$)`, "i") },
];

// "died in Kent before 1850" → {deathPlace: "Kent", date: {event: "died", direction: "before", value: "1850"}}
function readEvents(text) {
  let rest = String(text || "");
  const events = { birthPlace: "", deathPlace: "", date: null };
  for (const { place, re } of EVENT_PHRASES) {
    const match = rest.match(re);
    if (!match) continue;
    const event = match[1].toLowerCase();
    const dateGroups = match.slice(place ? 3 : 2);
    if (place) {
      const name = cleanCategoryName(match[2]);
      // ("born in the 1850s" is a date: the next phrase)
      if (KIN_DATE_SPAN_PLACE_RE.test(name)) continue;
      // (a year, "my …" or relatives are no place: decline)
      if (!name || /\b(?:my|our|ancestors?|descendants?|relatives?|cousins?|family)\b|\d/i.test(name)) return null;
      events[event === "died" ? "deathPlace" : "birthPlace"] = name;
    }
    if (dateGroups[0] || dateGroups.slice(2).some(Boolean)) {
      if (events.date) return null;
      const value = dateGroups[0] ? dateGroups[1] : kinDateSpan(dateGroups.slice(2));
      if (!value) return null;
      events.date = { event, direction: dateGroups[0] ? dateGroups[0].toLowerCase() : "between", value };
    }
    rest = `${rest.slice(0, match.index)} ${rest.slice(match.index + match[0].length)}`;
  }
  return { rest, events };
}

// Words that can sit around the owner and the relatives without changing the question.
const FILLER = new Set(
  (
    "can could would will you please tell me show list find give let know want to i'd like see " +
    "which who whom what of among from are is were was be any anyone anybody all do does did have has there " +
    "that in the a members member belong belongs belonging listed included part " +
    "profiles profile people persons ones among amongst tree how many count number"
  ).split(" ")
);

const RELATIVES = [
  { re: /^(?:ancestors?|forebears?|forefathers?)$/, scope: "ancestors" },
  { re: /^descendants?$/, scope: "descendants" },
  { re: /^(?:relatives?|relations?|cc7|family|kin|cousins?)$/, scope: "cc7" },
];

const WIKITREE_ID = /^[A-Z][A-Za-z'_-]*-\d+$/;

function ownerOf(word) {
  if (/^(?:my|our|me|i|mine|ours|we|us)$/i.test(word)) return "my";
  if (/^(?:her|his|their|hers|theirs)$/i.test(word)) return "her";
  const id = word.replace(/['’]s$/, "");
  return WIKITREE_ID.test(id) ? id : "";
}

/** "the guitarists" → "Guitarists"; "Category: Wem, Shropshire" or "Wem___Shropshire" → "Wem, Shropshire"; "" for nothing usable. */
export function cleanCategoryName(text) {
  const name = String(text || "")
    .replace(/^\s*(?:the\s+)?(?:category\s*:\s*)?/i, "")
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    // (one token, so no preposition inside the name splits it: "Fellows_of_the_Royal_Society"; ___ is ", ")
    .replace(/___/g, ", ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length > 120 || /[[\]{}|=<>]/.test(name)) return "";
  // (WikiTree category names start with a capital, as on a wiki)
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * {filters: ["notables" | "unsourced" | "female" | "male"], firstName, lastName, category, birthPlace, deathPlace,
 * date: {event: "born" | "died", direction: "before" | "after" | "between", value: "1850" | "1800-1850"} | null, owner: "my" | "her" |
 * WikiTree ID | "" (the page person, else you), scope: "ancestors" | "descendants" | "cc7"} for relatives with a category, a filter or a name, or null.
 */
export function parseRelativesFilterPrompt(text) {
  const prompt = String(text || "")
    .trim()
    .replace(/[?.!]+$/, "")
    .trim();
  if (/\bcategor/i.test(prompt)) {
    for (const phrase of CATEGORY_PHRASES) {
      const match = prompt.match(phrase);
      if (!match) continue;
      const category = cleanCategoryName(match[1]);
      if (!category) continue;
      const parsed = readFiltersAndRelatives(`${prompt.slice(0, match.index)} ${prompt.slice(match.index + match[0].length)}`);
      if (parsed) return { ...parsed, category };
    }
    return null;
  }
  const parsed = readFiltersAndRelatives(prompt);
  return parsed && (parsed.filters.length || parsed.firstName || parsed.lastName) ? { ...parsed, category: "" } : null;
}

function readFiltersAndRelatives(text) {
  const found = new Set();
  let rest = String(text || "");
  for (const { filter, re } of FILTER_PHRASES) {
    rest = rest.replace(re, () => {
      found.add(filter);
      return " ";
    });
  }
  if (found.has("female") && found.has("male")) return null;
  const names = { firstName: "", lastName: "" };
  for (const { key, re } of NAME_PHRASES) {
    const match = rest.match(re);
    if (!match) continue;
    names[key] = cleanCategoryName(match[1]);
    rest = `${rest.slice(0, match.index)} ${rest.slice(match.index + match[0].length)}`;
  }
  const read = readEvents(rest);
  const relatives = read && readRelatives(read.rest);
  return relatives ? { filters: FILTER_ORDER.filter((filter) => found.has(filter)), ...names, ...read.events, ...relatives } : null;
}

// "which of my ancestors are" → {owner: "my", scope: "ancestors"}; null when any other word is left.
function readRelatives(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[,;:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let owner = "";
  let scope = "";
  for (const raw of words) {
    const word = raw.replace(/['’]s$/, "");
    const relatives = RELATIVES.find((item) => item.re.test(word));
    if (relatives) {
      if (scope) return null;
      scope = relatives.scope;
      continue;
    }
    // (an ID keeps its capitals: read it from the original spelling)
    const who = ownerOf(raw) || ownerOf(originalCase(text, raw));
    if (who) {
      if (owner && owner !== who) return null;
      owner = who;
      continue;
    }
    if (!FILLER.has(raw)) return null;
  }
  // (no owner: the page person, else you, as in the kin lists)
  return scope ? { owner, scope } : null;
}

function originalCase(text, lowerWord) {
  return (
    String(text || "")
      .split(/[\s,;:]+/)
      .find((word) => word.toLowerCase() === lowerWord) || lowerWord
  );
}

/** The router's canonical form: "unsourced firstname John category Guitarists in my ancestors" (run by chat_profile_search). */
export function relativesFilterQuery({ filters = [], firstName = "", lastName = "", category = "", birthPlace = "", deathPlace = "", date = null, owner, scope }) {
  const whose = !owner ? "" : owner === "my" ? "my " : `${owner}'s `;
  const what = [
    ...filters,
    firstName ? `firstname ${firstName}` : "",
    lastName ? `lastname ${lastName}` : "",
    category ? `category ${category}` : "",
    birthPlace ? `birthplace ${birthPlace}` : "",
    deathPlace ? `deathplace ${deathPlace}` : "",
    date ? `${date.event} ${date.direction} ${date.value}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${what} in ${whose}${scope === "cc7" ? "CC7" : scope}`;
}
