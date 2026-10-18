// A strict reader for short, plain-English searches, for when there is no AI (2026-10-10).
// It writes the same search spec the AI would write (chat_search_spec.js), so the tested
// compileSearchSpec turns it into WT+ syntax. Every word has to be accounted for: names,
// places, dates, "born/died/married", a few status words. One word it doesn't know and it
// returns null, so the general parsers (and the form) take over. Examples it reads:
//   "Smith born in Kent before 1800", "John Smith born 1820 in Ohio",
//   "Devon births post-1850", "women who died in Texas 1900-1950",
//   "Who was born in Devon in 1820?"
// What it deliberately leaves alone: a bare "Kent 1820s" (a surname or a place?), "1800s"
// (a century or a decade?), and anything with a word it can't place.

import { withAccentsMasked } from "./chat_accent_mask";
import { isKnownPlaceName } from "./chat_known_places";
import { projectAccountMap, projectKey } from "./chat_project_accounts";
import { namesWikiTree, withoutOnWikiTree } from "./chat_wikitree_help";

const LEAD_IN = /^\s*(?:(?:search(?:\s+for)?|find|show(?:\s+me)?|list|get|give\s+me)\s+)?(?:(?:who(?:\s+else)?|which\s+(?:people|profiles))(?:\s+(?:was|were|is|are))?\s+)?/i;
// "how many profiles have the surname Alley?", "how many people were born in Kent in 1820?": a count is the
// search, and its result says how many it found (2026-10-14). ("Who else died in Motueka in 1898?" above.)
const COUNT_LEAD_IN =
  /^\s*how\s+many\s+(?:(?:profiles|people|persons)\s+)?(?:(?:are|were)\s+there\s+)?(?:(?:on|in)\s+WikiTree\s+)?(?:(?:that|who)\s+)?(?:(?:have|has|had|did|were|was|are|is)\s+)?/i;

// "with the surname Alley", "surnamed Alley": the word after it is the surname, whatever its case.
const SURNAME_PHRASE =
  /\b(?:(?:with|having|has|have|had)\s+)?(?:the\s+|a\s+)?(?:surname|last\s+name|family\s+name)\s+(?:of\s+)?([A-Za-z][A-Za-z'-]*)|\bsurnamed\s+([A-Za-z][A-Za-z'-]*)/i;

// "profiles I created", "how many profiles have I created?", "created by me", "created by Beacall-6": WT+'s
// Created=Creator_ID (the signed-in user's ID is put in by the caller, as for "profiles I manage").
const CREATED_BY_ME =
  /\b(?:(?:that|which)\s+)?(?:(?:have|did)\s+)?I\s+(?:have\s+|['’]ve\s+)?creat(?:ed|e)\b|\bcreated\s+by\s+me\b|\bmy\s+created(?=\s+profiles?\b)/i;
const CREATED_BY_ID = /\bcreated\s+by\s+([A-Za-z][A-Za-z0-9_'-]*-\d+)\b/i;
// ("profiles I created in 2023": the year stays for CREATED_PATTERN)
const CREATED_WHEN = /^\s+(?:(?:in\s+or\s+)?(?:in|before|after|since|until|during|from|by)\s+\d{4}|this\s+year|last\s+year)\b/i;

const STATUS_FLAGS = [
  ["Unsourced", /\b(?:unsourced|(?:with\s+)?no\s+sources?|without\s+(?:any\s+)?sources?|missing\s+sources?)\b/i, "no sources"],
  ["Unconnected", /\b(?:unconnected|not\s+connected)\b/i, "not connected"],
  ["Orphan", /\b(?:orphan(?:ed)?s?|unmanaged|(?:with\s+)?no\s+managers?)\b/i, "no manager"],
  ["NoParents", /\b(?:with\s+)?(?:no|without|missing)\s+parents\b/i, "no parents"],
  ["NoFather", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?father\b/i, "no father"],
  ["NoMother", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?mother\b/i, "no mother"],
  ["NoSpouses", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?(?:spouses?|partners?)\b/i, "no spouse"],
  ["NoChildren", /\b(?:with\s+)?(?:no|without|missing)\s+children\b/i, "no children"],
  // Bio Check and Research Status (WT+ magic words, 2026-10-10). Candidate before Gold: each match is
  // taken out of the text, so "gold standard candidates" isn't also Gold.
  ["BioStyleIssues", /\b(?:with\s+)?(?:bio(?:graphy)?\s+)?(?:style\s+(?:issues|problems)|bio\s*check\s+(?:issues|problems))\b/i, "biography style issues"],
  ["ResearchGoldCandidate", /\b(?:research\s+status\s+)?gold[\s-]+standard\s+candidates?\b/i, "Gold Standard Candidate"],
  ["ResearchGold", /\b(?:research\s+status\s+)?gold[\s-]+standard\b/i, "Gold Standard"],
  ["ResearchSilver", /\b(?:research\s+status\s+)?silver[\s-]+standard\b/i, "Silver Standard"],
  ["ResearchHelp", /\b(?:(?:with\s+)?(?:research\s+)?help\s+requested|(?:that\s+)?requested\s+(?:research\s+)?help|research\s+help)\b/i, "help requested"],
  ["ResearchReview", /\b(?:with\s+)?sources\s+to\s+review\b/i, "sources to review"],
  ["ResearchUnfinished", /\b(?:research\s+status\s+)?unfinished\b/i, "research unfinished"],
  ["ResearchUnset", /\b(?:with\s+)?(?:no|without)\s+(?:an?\s+)?research\s+status(?:\s+set)?\b/i, "no research status"],
  // WT+ NotableProfile (news, 2026-09-20): any notable template on the profile
  ["NotableProfile", /\b(?:with\s+)?(?:an?\s+|any\s+)?notables?\s+templates?\b/i, "with a notable template"],
  // "who are notables", "a member of a notable category" (WT video, 2026-10-16); not the Notables Project or Sticker
  [
    "Notables",
    /\b(?:(?:is|are|was|were)\s+)?(?:(?:an?\s+)?members?\s+of\s+|in\s+)?(?:an?\s+|the\s+)?(?:notables?|famous)(?:\s+(?:category|categories|people|persons|profiles))?\b(?!\s+(?:project|sticker))/i,
    "notables",
  ],
];

// "my relatives", "which of Joseph's relatives", "his relatives who …", "relatives born in Kent": blood
// relatives within CC7 (chat_search_spec.js bloodRelativesTerm). No owner = the profile being viewed.
// "notable relatives": the Notables flag too. (WT video, 2026-10-16)
const RELATIVES =
  /\b(?:(?:which|who|how\s+many)\s+of\s+|among\s+)?(?:(my|our|his|her|their)\s+|([A-Z][A-Za-z'-]*(?:-\d+)?)['’]s\s+)?(?:(notable|famous|well[- ]known)\s+)?(?:blood\s+)?(?:relatives|relations|kinsfolk|kin)\b(?:\s+(?:who|that))?(?:\s+(?:was|were|is|are|has|have|had))?/i;

// "content rank 1", "with a content rank of 8", "content rank below 4", "low content rank": WT+'s
// Content Rank, 1 (least content) to 10 (most) (chat_search_spec.js contentRanks).
const CONTENT_RANK =
  /\b(?:with\s+)?(?:an?\s+)?(?:(low)\s+content\s+ranks?|content\s+ranks?\s+(?:of\s+)?(?:(below|under|less\s+than|above|over|more\s+than)\s+)?(10|[1-9]))\b/i;

function readContentRank(match) {
  if (match[1]) return { rank: { max: 3 }, label: "low content rank (1–3)" };
  const value = Number(match[3]);
  if (!match[2]) return { rank: value, label: `content rank ${value}` };
  if (/^(?:below|under|less)/i.test(match[2])) return value > 1 ? { rank: { max: value - 1 }, label: `content rank below ${value}` } : null;
  return value < 10 ? { rank: { min: value + 1 }, label: `content rank above ${value}` } : null;
}

// "with no birth date", "missing a death date": WT+'s B0 / D0 (the spec's missingDates). These went to the
// FindAGrave suggestions instead ("FindAGrave - Empty birth date"): Edwards 7 there, 2,420 with B0 (2026-10-12).
// "no birth place" / "no death location": the blank field (missingPlaces), not "Wrong word in last name at birth".
const MISSING_FIELD =
  /\b(?:with\s+)?(?:no|without|missing|(?:an?\s+)?(?:empty|blank|unknown))\s+(?:an?\s+|any\s+)?(birth|death)\s*(dates?|places?|locations?)\b/gi;

// The same words at the very end of a name ("Category: Rodeo Cowboys without a father"), as [pattern, WT+ term].
export const STATUS_FLAG_TAILS = STATUS_FLAGS.map(([term, re]) => [new RegExp(`\\s+(?:${re.source})$`, "i"), term]);

// "profiles I manage", "managed by me", "my managed profiles": manager "me", the signed-in user (the
// caller puts in the ID). Not "my profiles": that could be the watchlist.
const MANAGED_BY_ME = /\b(?:(?:that|which)\s+)?I\s+manage\b|\b(?:managed\s+by\s+me|my\s+managed(?=\s+profiles?\b))\b/i;

// "managed by Beacall-6", "managed by the Mayflower Project": a WikiTree ID, or a project read as its account
// from the list the search already uses (Mayflower Project: WikiTree-9). WT+'s Manager= takes only an ID
// (Manager="Mayflower Project" finds 0), so a manager it can't place declines. The general parser took the
// rest of the sentence as the name: Manager="the Mayflower Project with no sources" (sweep, 2026-10-12).
const PROJECT_ACCOUNTS = projectAccountMap();
const MANAGED_BY = /\bmanaged\s+by\s+(?!me\b(?!-\d))(?:the\s+)?/i;

/** The manager named after "managed by" and where its words end; false when they name no ID or project. */
function readManager(text) {
  const by = text.match(MANAGED_BY);
  if (!by) return null;
  const start = by.index + by[0].length;
  const words = [...text.slice(start).matchAll(/\S+/g)].slice(0, 6);
  const end = (count) => start + words[count - 1].index + words[count - 1][0].length;
  const first = clean(words[0]?.[0] || "");
  if (/^[A-Za-z][A-Za-z0-9_'-]*-\d+$/.test(first)) return { id: first, label: first, from: by.index, to: end(1) };
  for (let count = words.length; count > 0; count -= 1) {
    const project = PROJECT_ACCOUNTS.get(projectKey(words.slice(0, count).map(([word]) => word).join(" ")));
    if (project) return { id: project.id, label: `the ${project.name} (${project.id})`, from: by.index, to: end(count) };
  }
  return false;
}

const FEMALE = /\b(?:women|woman|females?|girls?)\b/i;
const MALE = /\b(?:men|man|males?|boys?)\b/i;

// Years or year ranges, each tied to the event word before it ("died 1900-1950").
const DATE_PATTERN = new RegExp(
  [
    "\\b(?:(before|after|since|until|pre|post)[\\s-]*(\\d{4}))\\b",
    "\\b(?:between\\s+)?(\\d{4})\\s*(?:-|\\u2013|\\u2014|\\bto\\b|\\band\\b)\\s*(\\d{4})\\b",
    "\\b(?:in\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)\\s+century\\b",
    "\\b(?:in\\s+)?(?:the\\s+)?(\\d{3}0)'?s\\b",
    "\\b(?:in\\s+)?(\\d{4})\\b",
  ].join("|"),
  "gi"
);

const CREATED_PATTERN =
  /\b(?:(?:was|were|are|is)\s+)?(?:created|added)\s+(in\s+or\s+(?:before|by|after)|before|after|since|until|in|during|from)\s+(\d{4})(?:\s+(?:or|and)\s+(\d{4}))?\b/gi;

// Occupation words are WikiTree category words; the synonyms are the ones its categories use.
const OCCUPATIONS = [
  [/\bfarmers\b/i, "farmers", ["Farmers", "Yeomen", "Husbandmen"]],
  [/\b(?:doctors|physicians|surgeons)\b/i, "doctors", ["Doctors", "Physicians", "Surgeons"]],
  [/\b(?:sailors|mariners|seamen)\b/i, "sailors", ["Mariners", "Sailors", "Seamen"]],
  [/\bteachers\b/i, "teachers", ["Teachers", "Schoolmasters", "Schoolmistresses"]],
  [/\b(?:clergy|clergymen|ministers|priests|vicars)\b/i, "clergy", ["Clergy", "Ministers", "Priests", "Vicars"]],
  // WikiTree categorises these groups too ("twins born in Lancashire": BirthLocation + CategoryWord=Twins
  // 380, Triplets 865, Quadruplets 66, Devon Centenarians 37, Kent Convicts 130; live, 2026-10-10)
  [/\btwins\b/i, "twins", ["Twins"]],
  [/\btriplets\b/i, "triplets", ["Triplets"]],
  [/\bquadruplets\b/i, "quadruplets", ["Quadruplets"]],
  [/\bcentenarians\b/i, "centenarians", ["Centenarians"]],
  [/\bconvicts\b/i, "convicts", ["Convicts"]],
];
// "Irish farmers", "Scottish emigrants to Canada": a nationality is read as born in that country.
const NATIONALITIES = {
  English: "England", Welsh: "Wales", Scottish: "Scotland", Irish: "Ireland", American: "United States",
  Canadian: "Canada", Australian: "Australia", German: "Germany", French: "France", Dutch: "Netherlands",
  Italian: "Italy", Swedish: "Sweden", Norwegian: "Norway", Danish: "Denmark", Polish: "Poland",
  Spanish: "Spain", Portuguese: "Portugal", Swiss: "Switzerland", Finnish: "Finland", Russian: "Russia",
  Mexican: "Mexico", Hungarian: "Hungary", Austrian: "Austria", Belgian: "Belgium", Greek: "Greece",
  Czech: "Czech Republic", Slovak: "Slovakia", Romanian: "Romania", Bulgarian: "Bulgaria", Serbian: "Serbia",
  Croatian: "Croatia", Slovenian: "Slovenia", Albanian: "Albania", Ukrainian: "Ukraine", Lithuanian: "Lithuania",
  Latvian: "Latvia", Estonian: "Estonia", Icelandic: "Iceland", Turkish: "Turkey", Brazilian: "Brazil",
  Argentine: "Argentina", Argentinian: "Argentina", Chilean: "Chile", Peruvian: "Peru", Cuban: "Cuba",
  Jamaican: "Jamaica", Chinese: "China", Japanese: "Japan", Korean: "South Korea", Vietnamese: "Vietnam",
  Filipino: "Philippines", Egyptian: "Egypt", Israeli: "Israel", Lebanese: "Lebanon", Iranian: "Iran",
  Maltese: "Malta", Luxembourgish: "Luxembourg",
};
/** "English" → "England"; anything else → "". */
export const nationalityCountry = (word) => NATIONALITIES[word] || "";
const NATIONALITY_PATTERN = new RegExp(`\\b(${Object.keys(NATIONALITIES).join("|")})\\b`);
// Without a destination, WikiTree's own Emigrants / Immigrants categories are all there is to search.
const EMIGRANT_PATTERN = /\b(?:who\s+)?(emigrated|emigrants|immigrated|immigrants)\b/i;

// "emigrated to Australia" = died there, not born there; "emigrants from X" the other way round.
// ("went to", "moved to", "settled in" read as "emigrated to"; "left" as "emigrated from", 2026-10-10)
const MIGRATION_PATTERN =
  /\b(?:(?:emigrated|emigrants|immigrated|immigrants)\s+(to|from)|(?:went|moved|sailed|travell?ed|settled)\s+(to|in)|(left))\s+(?:the\s+)?([A-Z][A-Za-z'.-]*(?:\s+(?:(?:of|upon|on)\s+)?[A-Z][A-Za-z'.-]*){0,3})/;
// ("the USA": WikiTree writes United States; BirthLocation=USA found none of Darwin-15's relatives, live 2026-10-16)
const UNITED_STATES = /^(?:USA|U\.S\.A\.?|US|U\.S\.?|United\s+States\s+of\s+America)$/;

const EVENT_WORDS = {
  born: "birth",
  birth: "birth",
  births: "birth",
  died: "death",
  death: "death",
  deaths: "death",
  married: "marriage",
  marriage: "marriage",
  marriages: "marriage",
};
const PLURAL_EVENT_WORDS = new Set(["births", "deaths", "marriages"]);
// (and "anyone born in Kent", "people called Smith", "the Smith family from Kent", 2026-10-10)
const FILLER = new Set([
  "and", "profiles", "profile", "people", "persons", "person", "who", "that", "were", "was", "is", "are", "the", "all", "with",
  "a", "an", "also", "please", "me", "anyone", "everyone", "anybody", "everybody", "family", "families",
]);
// ("the Beacalls of Shropshire": "of" before a place)
const PLACE_PREPOSITIONS = new Set(["in", "at", "from", "of"]);
const PLACE_STOP = new Set([...Object.keys(EVENT_WORDS), ...FILLER, "in", "at", "from", "before", "after", "no", "without", "not", "or"]);

const PLACE_PARTICLES = new Set(["of", "on", "upon", "de", "la", "le", "du", "van", "von", "der", "del"]);
// Place names with "and", "the" or "of" inside them: one word to the reader, so "and" can't end a place there
// (and "Isle of Man" isn't the surname Isle in Man).
const JOINED_PLACES = [
  "Isle of Man",
  "Isle of Wight",
  "Isle of Skye",
  "Trinidad and Tobago",
  "Bosnia and Herzegovina",
  "Antigua and Barbuda",
  "Saint Kitts and Nevis",
  "St Kitts and Nevis",
  "Saint Vincent and the Grenadines",
  "Turks and Caicos",
  "Sao Tome and Principe",
  "Wallis and Futuna",
  "Saint Pierre and Miquelon",
];
const joinPlaces = (text) =>
  JOINED_PLACES.reduce(
    (out, place) =>
      out.replace(new RegExp(`\\b${place.replace(/ /g, "\\s+")}\\b`, "gi"), (found) => found.replace(/\s+/g, "_")),
    text
  );

const validYear = (year) => year >= 1000 && year <= 2100;

function readDates(text) {
  const dates = [];
  let rejected = false;
  const replaced = text.replace(DATE_PATTERN, (whole, bound, boundYear, from, to, century, decade, year) => {
    let range = null;
    if (bound) {
      const y = Number(boundYear);
      const kind = bound.toLowerCase();
      if (kind === "before" || kind === "pre") range = { to: y - 1 };
      else if (kind === "until") range = { to: y };
      else if (kind === "after" || kind === "post") range = { from: y + 1 };
      else range = { from: y };
    } else if (from) {
      const a = Number(from);
      const b = Number(to);
      range = { from: Math.min(a, b), to: Math.max(a, b) };
    } else if (century) {
      const n = Number(century);
      range = n >= 10 && n <= 21 ? { from: (n - 1) * 100, to: n * 100 - 1 } : null;
    } else if (decade) {
      const d = Number(decade);
      // (1800s could be the century or the decade: decline, don't guess)
      range = d % 100 === 0 ? null : { from: d, to: d + 9 };
    } else if (year) {
      range = { from: Number(year), to: Number(year) };
    }
    if (!range || [range.from, range.to].some((y) => y !== undefined && !validYear(y))) {
      rejected = true;
      return " ";
    }
    dates.push(range);
    return ` §D${dates.length - 1} `;
  });
  return rejected ? null : { dates, text: replaced };
}

const looksLikeNationality = (word) => /(?:ish|ese|ian|ican)$|^(?:French|Dutch|Swiss|Greek|German|Welsh|Manx)$/i.test(word);
const isName = (word) => /^[A-Z][A-Za-z'-]+$/.test(word);
// (a surname's hyphened parts are capitalised, "Smith-Jones": "Kent-born" and "Kent-area" aren't surnames)
const isSurname = (word) => isName(word) && word.split("-").every((part) => /^[A-Z]/.test(part));
const clean = (word) => word.replace(/^[^A-Za-z0-9§]+|[^A-Za-z0-9§'-]+$/g, "");

/** The words of a sentence as a spec, or null when any word isn't accounted for. */
// Accented names and places ("Müllers born in Zürich", "people born in Montréal") are read as plain
// stand-ins and put back afterwards (2026-10-12): see chat_accent_mask.js.
export function parseSearchSpecPrompt(prompt) {
  return withAccentsMasked(prompt, parseAsciiSearchSpecPrompt);
}

function parseAsciiSearchSpecPrompt(prompt) {
  // (Find a Grave's own checks are suggestions; "Find a Grave profiles in Devon" isn't the surname Grave)
  if (/\bfind\s*a\s*grave\b/i.test(String(prompt || ""))) return null;
  // WikiTree (or WT) is never a name or a place: "Owner of WikiTree" isn't the surname Owner in
  // a place called WikiTree (live, 2026-10-14).
  prompt = withoutOnWikiTree(prompt);
  if (namesWikiTree(prompt)) return null;
  let text = ` ${String(prompt || "")
    .trim()
    .replace(/[?!.\s]+$/, "")
    .replace(COUNT_LEAD_IN, "")
    .replace(LEAD_IN, "")} `;
  if (!text.trim()) return null;
  // (joined first, so the "Man" of "Isle of Man" isn't read as men)
  text = joinPlaces(text);
  // (the manager before the status words: they end its name, "the Mayflower Project with no sources")
  const manager = readManager(text);
  if (manager === false) return null;
  if (manager) text = `${text.slice(0, manager.from)} §F ${text.slice(manager.to)}`;

  const flags = [];
  const flagLabels = [];
  let relativesOf = "";
  const relativesMatch = text.match(RELATIVES);
  if (relativesMatch) {
    const [, pronoun, name, notable] = relativesMatch;
    relativesOf = /^(?:my|our)$/i.test(pronoun || "") ? "me" : name || "current";
    if (notable) {
      flags.push("Notables");
      flagLabels.push("notables");
    }
    text = text.replace(relativesMatch[0], " §K ");
  }
  for (const [flag, pattern, label] of STATUS_FLAGS) {
    if (flags.includes(flag)) continue;
    const match = text.match(pattern);
    if (match) {
      flags.push(flag);
      flagLabels.push(label);
      text = text.replace(match[0], " §F ");
    }
  }
  let contentRank;
  const rankMatch = text.match(CONTENT_RANK);
  if (rankMatch) {
    const read = readContentRank(rankMatch);
    if (!read) return null;
    contentRank = read.rank;
    flagLabels.push(read.label);
    text = text.replace(rankMatch[0], " §F ");
  }
  const missingDates = [];
  const missingPlaces = [];
  text = text.replace(MISSING_FIELD, (all, event, field) => {
    const isDate = /^date/i.test(field);
    (isDate ? missingDates : missingPlaces).push(event.toLowerCase());
    flagLabels.push(`no ${event.toLowerCase()} ${isDate ? "date" : "place"}`);
    return " §F ";
  });
  let managedByMe = false;
  text = text.replace(MANAGED_BY_ME, () => {
    managedByMe = true;
    return " §F ";
  });
  let creator = "";
  for (const pattern of [CREATED_BY_ID, CREATED_BY_ME]) {
    const match = text.match(pattern);
    if (!match) continue;
    if (creator) return null;
    creator = pattern === CREATED_BY_ID ? match[1] : "me";
    const rest = text.slice(match.index + match[0].length);
    text = `${text.slice(0, match.index)} §K ${CREATED_WHEN.test(rest) ? "created" : ""}${rest}`;
  }
  let surname = "";
  const surnameMatch = text.match(SURNAME_PHRASE);
  if (surnameMatch) {
    const word = surnameMatch[1] || surnameMatch[2];
    if (PLACE_STOP.has(word.toLowerCase()) || SURNAME_PHRASE.test(text.replace(surnameMatch[0], " "))) return null;
    surname = `${word[0].toUpperCase()}${word.slice(1)}`;
    text = text.replace(surnameMatch[0], " §S ");
  }
  let nationality = null;
  text = text.replace(NATIONALITY_PATTERN, (whole, word) => {
    nationality = nationality ? false : { word, country: NATIONALITIES[word] };
    return " §N ";
  });
  if (nationality === false) return null;
  let migration = null;
  text = text.replace(MIGRATION_PATTERN, (whole, direction, moved, left, place) => {
    const where = place.trim();
    migration = { direction: direction ? direction.toLowerCase() : moved ? "to" : "from", place: UNITED_STATES.test(where) ? "United States" : where };
    return " §M ";
  });
  let emigrantCategory = null;
  if (!migration) {
    text = text.replace(EMIGRANT_PATTERN, (whole, word) => {
      emigrantCategory = /^im/i.test(word) ? "Immigrants" : "Emigrants";
      return " §M ";
    });
  }
  let occupation = null;
  for (const [pattern, label, names] of OCCUPATIONS) {
    const match = text.match(pattern);
    if (!match) continue;
    if (occupation) return null;
    occupation = { label, names };
    text = text.replace(match[0], " §O ");
  }
  let gender = "";
  const female = FEMALE.test(text);
  const male = MALE.test(text);
  if (female && male) return null;
  if (female || male) {
    gender = female ? "female" : "male";
    text = text.replace(female ? FEMALE : MALE, " §G ");
  }
  // "created in 2023", "created before 2015", "created in or before 2015", "created after 2015", "created in 2023 or 2024"
  let created = null;
  let createdLabel = "";
  // "created this year", "added last year"
  const thisYear = new Date().getFullYear();
  text = text.replace(/\b(created|added)\s+(this|last)\s+year\b/gi, (whole, verb, which) => `${verb} in ${which.toLowerCase() === "this" ? thisYear : thisYear - 1}`);
  text = text.replace(CREATED_PATTERN, (whole, kind, first, second) => {
    if (created) {
      created = false;
      return " ";
    }
    const a = Number(first);
    const b = second ? Number(second) : null;
    const k = kind.toLowerCase().replace(/\s+/g, " ");
    if (b !== null) created = { years: [a, b] };
    else if (k === "before" || k === "until") created = { to: k === "before" ? a - 1 : a };
    else if (k === "after" || k === "since") created = { from: k === "after" ? a + 1 : a };
    else if (/^in or (?:before|by)$/.test(k)) created = { to: a };
    else if (/^in or after$/.test(k)) created = { from: a };
    else created = { from: a, to: a };
    createdLabel = `created ${whole.replace(/^\s*(?:profiles?\s+)?(?:(?:was|were|are|is)\s+)?(?:created|added)\s+/i, "")}`.trim();
    return " §C ";
  });
  if (created === false) return null;
  const read = readDates(text);
  if (!read) return null;
  const { dates } = read;
  text = read.text;

  // (a comma after a word stays with it, for "Hampshire, England")
  const rawTokens = joinPlaces(text).split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map(clean);
  const commaAfter = rawTokens.map((token) => /,$/.test(token));
  const lead = [];
  const places = [];
  const spanned = [];
  let event = null;
  // (only an event word or "in Place" says a leading word is a name; a status word beside one word could be a place)
  let sawMarker = false;
  let sawBareDate = false;
  // (the words before an occupation, read as its place: "Kent farmers")
  let occupationLead = "";
  // "people called John Smith": a whole name after it; "named Mary" could be either name, so that declines
  let calledName = false;
  const trailing = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const word = tokens[i];
    const low = word.toLowerCase();
    if (word.startsWith("§")) {
      if (word.startsWith("§D")) {
        spanned.push({ index: Number(word.slice(2)), event: event || "birth" });
        if (!event) sawBareDate = true;
      }
      if (word === "§N" || word === "§S" || word === "§K") {
        sawMarker = true;
        continue;
      }
      if (word === "§O" || word === "§M") {
        sawMarker = true;
        // "Kent farmers 1850s": the words before an occupation word are its place
        if (word === "§O" && !event && lead.length && lead.some(looksLikeNationality)) return null;
        if (word === "§O" && !event && lead.length && lead.every(isName) && lead.length <= 3) {
          occupationLead = lead.join(" ");
          places.push({ text: occupationLead, event: "any" });
          lead.length = 0;
        }
      }
      continue;
    }
    if (EVENT_WORDS[low]) {
      sawMarker = true;
      // "Kent births 1850-1860": the words before a plural event word are its place
      if (PLURAL_EVENT_WORDS.has(low) && !event && lead.length) {
        places.push({ text: lead.join(" "), event: EVENT_WORDS[low] });
        lead.length = 0;
      }
      event = EVENT_WORDS[low];
      continue;
    }
    if (PLACE_PREPOSITIONS.has(low)) {
      const words = [];
      let placeText = "";
      // ("born in the Isle of Wight")
      if (tokens[i + 1]?.toLowerCase() === "the" && tokens[i + 2] && /^[A-Z]/.test(tokens[i + 2])) i += 1;
      while (i + 1 < tokens.length) {
        const next = tokens[i + 1];
        const nextLow = next.toLowerCase();
        if (!next || next.startsWith("§") || PLACE_STOP.has(nextLow) || !/^[A-Za-z][A-Za-z'._-]*$/.test(next)) break;
        words.push(next.replace(/_/g, " "));
        placeText += `${placeText ? (commaAfter[i] ? ", " : " ") : ""}${next.replace(/_/g, " ")}`;
        i += 1;
        // a comma ends the place unless another place word follows ("Hampshire, England")
        if (commaAfter[i] && !(tokens[i + 1] && /^[A-Z]/.test(tokens[i + 1]))) break;
      }
      if (words.length > 4) return null;
      // ("Kent twice" is a place and a word that isn't: all capitalised, or all lower case, with the odd "of"/"upon")
      const significant = words.filter((word) => !PLACE_PARTICLES.has(word.toLowerCase()) || /^[A-Z]/.test(word));
      if (!(significant.every((word) => /^[A-Z]/.test(word)) || words.every((word) => /^[a-z]/.test(word)))) return null;
      if (words.length) {
        sawMarker = true;
        places.push({ text: placeText, event: event || "any" });
      }
      continue;
    }
    if (FILLER.has(low)) continue;
    if ((low === "called" || low === "named") && !event && !places.length && !lead.length) {
      calledName = true;
      continue;
    }
    // a word before any event or place word is a name; after one it can't be placed
    // ("Mary Smith 1820 Ohio": capitalised words after a bare year are its place)
    if (sawBareDate && !event && lead.length === 2 && isName(word)) {
      trailing.push(word);
      continue;
    }
    if (!event && !places.length && /^[A-Za-z][A-Za-z'-]*$/.test(word)) {
      lead.push(word);
      continue;
    }
    // "Smith born 1850 Kent": a known place straight after the event's words
    if (event && isName(word)) {
      const two = tokens[i + 1] && isName(tokens[i + 1]) ? `${word} ${tokens[i + 1]}` : "";
      if (two && isKnownPlaceName(two)) {
        places.push({ text: two, event });
        sawMarker = true;
        i += 1;
        continue;
      }
      if (isKnownPlaceName(word)) {
        places.push({ text: word, event });
        sawMarker = true;
        continue;
      }
    }
    return null;
  }

  // "Methodist ministers in Cornwall", "Quaker farmers in Pennsylvania": beside "in" another place, a word before
  // a job that isn't a known place may describe the job, not place it (Location=Methodist, sweep 2026-10-12): a
  // town in Cornwall wouldn't need Cornwall. On its own it stays the place ("Boston doctors"), and beside a birth
  // place it's where they worked ("Plymouth sailors born in Devon").
  if (
    occupationLead &&
    !isKnownPlaceName(occupationLead) &&
    places.some((place) => place.text !== occupationLead && place.event === "any")
  ) {
    return null;
  }
  if (calledName) {
    if (lead.length !== 2) return null;
    sawMarker = true;
  }
  if (trailing.length) {
    if (trailing.length > 3) return null;
    places.push({ text: trailing.join(" "), event: "birth" });
    sawMarker = true;
  }
  // "Devon profiles with no sources", "unsourced Devon profiles", "Kent people": a known place on its own with
  // status words. It goes out as Location=; on its own that asks first whether it's a birth, marriage or death
  // place, or a surname ("Kent" is both). With dates beside it ("Lancashire profiles with no death date born
  // before 1850") it runs as the place, and the result offers the surname instead, when WikiTree+ has
  // profiles that way (Lancashire, England and Wales are surnames too; the user, 2026-10-12). "Garver
  // profiles" is a surname as before (2026-10-10). "The Kent family" is a surname (it ran as the place,
  // Location=Kent, 2026-10-12).
  const namedFamily = /\bfamily\b/i.test(prompt);
  if (
    lead.length &&
    lead.every(isName) &&
    isKnownPlaceName(lead.join(" ")) &&
    !namedFamily &&
    !places.length &&
    !managedByMe &&
    !creator &&
    !occupation &&
    !migration &&
    !emigrantCategory &&
    !nationality &&
    (flags.length || missingDates.length || missingPlaces.length || /\b(?:profiles|people|persons)\b/i.test(prompt))
  ) {
    places.push({ text: lead.join(" "), event: "any" });
    lead.length = 0;
    sawMarker = true;
  }
  // "the Smiths", "the Smith family", "Beacall family": a surname on its own, named as a family, is a name
  // (it declined: no marker; "the Smiths" became AllLastNames=the Location=Smiths, 2026-10-12). Whether
  // "Smiths" is the Smith family is the search's question (it counts both surnames on WikiTree+).
  if (
    lead.length === 1 &&
    isName(lead[0]) &&
    (namedFamily ||
      (!isKnownPlaceName(lead[0]) &&
        (/\bfamilies\b/i.test(prompt) || (tokens.length === 2 && tokens[0].toLowerCase() === "the" && /s$/.test(lead[0])))))
  ) {
    sawMarker = true;
  }
  // "Edwards profiles with no birth date", "Garver people unsourced": a name that isn't a known place, as
  // profiles, with status words, is a surname (as "Garver profiles" is elsewhere; 2026-10-12).
  if (
    lead.length === 1 &&
    isName(lead[0]) &&
    !isKnownPlaceName(lead[0]) &&
    !looksLikeNationality(lead[0]) &&
    (flags.length || missingDates.length || missingPlaces.length) &&
    /\b(?:profiles|people|persons)\b/i.test(prompt)
  ) {
    sawMarker = true;
  }
  // "Kent profiles born in Ohio", "Lancashire people who emigrated": a known place as profiles beside another
  // place, a job or a migration could be the place or the surname, and neither reading is the likelier. Decline.
  // ("Kent profiles managed by me born 1850" and "Kent profiles English" stay surnames, as before.)
  if (
    lead.length &&
    !namedFamily &&
    isKnownPlaceName(lead.join(" ")) &&
    (places.length || occupation || migration || emigrantCategory) &&
    /\b(?:profiles|people|persons)\b/i.test(prompt)
  ) {
    return null;
  }
  const names = {};
  if (surname) {
    if (lead.length) return null;
    names.anyLastName = surname;
  }
  if (lead.length) {
    if (!sawMarker || lead.length > 2 || !lead.every(isName) || !isSurname(lead[lead.length - 1])) return null;
    // "Scottish emigrants to Canada", "Irish farmers": a nationality, not a surname
    if ((migration || occupation) && lead.some(looksLikeNationality)) return null;
    if (lead.length === 2) names.firstName = lead[0];
    // any last name, as the AI is told to use: "Robinson born in Devon" also finds the women who married a
    // Robinson (LastNameAtBirth found 4 of the AI's 15, user 2026-10-11)
    names.anyLastName = lead[lead.length - 1];
  }

  const spec = {};
  if (created) spec.created = created;
  if (Object.keys(names).length) spec.names = names;
  // "Beacalls in my ancestors", "twins in my family", "cousin marriages in my tree" ran Location="my ancestors",
  // Location=my and MarriageLocation=cousin: relatives are never a place (2026-10-17).
  if (places.some((place) => /^(?:my|our|his|her|their|your)\b/i.test(place.text) || /\b(?:ancestors|descendants|relatives|family|tree|cousins?)$/i.test(place.text))) {
    return null;
  }
  if (places.length) spec.places = places;
  if (spanned.length) {
    const seen = new Set();
    spec.dates = [];
    for (const { index, event: dateEvent } of spanned) {
      if (seen.has(dateEvent)) return null;
      seen.add(dateEvent);
      spec.dates.push({ event: dateEvent, ...dates[index] });
    }
  }
  if (nationality) {
    if (migration?.direction === "from" || (spec.places || []).some((place) => place.event === "birth" && !migration)) return null;
    spec.places = [...(spec.places || []), { text: nationality.country, event: "birth" }];
  }
  if (emigrantCategory) {
    if (occupation) return null;
    spec.categories = [{ name: emigrantCategory, match: "word" }];
  }
  if (migration) {
    const there = { text: migration.place, event: migration.direction === "to" ? "death" : "birth" };
    const notThere = { text: migration.place, event: migration.direction === "to" ? "birth" : "death" };
    spec.places = [...(spec.places || []), there];
    if (!nationality) spec.notPlaces = [notThere];
  }
  if (occupation) spec.anyOf = occupation.names.map((name) => ({ categories: [{ name, match: "word" }] }));
  if (gender) spec.gender = gender;
  if (flags.length) spec.flags = flags;
  if (contentRank !== undefined) {
    // (a rank range is one search per rank, which can't be combined with the occupations' anyOf)
    if (typeof contentRank === "object" && spec.anyOf) return null;
    spec.contentRank = contentRank;
  }
  if (missingDates.length) spec.missingDates = [...new Set(missingDates)];
  if (missingPlaces.length) spec.missingPlaces = [...new Set(missingPlaces)];
  if (relativesOf) spec.tree = { relativesOf };
  if (managedByMe) spec.manager = "me";
  else if (manager) spec.manager = manager.id;
  if (creator) spec.creator = creator;
  if (!Object.keys(spec).length) return null;
  // Something to search on besides a gender or a status word alone (the profiles you manage or created are enough).
  if (!spec.names && !spec.places && !spec.dates && !occupation && !emigrantCategory && !managedByMe && !manager && !creator && !relativesOf) return null;
  // a nationality on its own ("Irish") says too little
  if (nationality && !occupation && !migration && !emigrantCategory && !spec.dates && !spec.flags && !spec.missingDates && !spec.missingPlaces && !spec.gender && !spec.names && spec.places.length < 2) return null;

  return { spec, understood: describeSpec(spec, flagLabels, createdLabel, { migration, occupation, nationality, emigrantCategory, manager }) };
}

function describeSpec(spec, flagLabels, createdLabel = "", { migration, occupation, nationality, emigrantCategory, manager } = {}) {
  const span = ({ from, to }) => (from !== undefined && to !== undefined ? (from === to ? `${from}` : `${from}–${to}`) : from !== undefined ? `${from} or later` : `${to} or earlier`);
  const parts = [];
  const relativesOf = spec.tree?.relativesOf;
  if (relativesOf) {
    const whose = relativesOf === "me" ? "your" : relativesOf === "current" ? "this person's" : `${relativesOf}'s`;
    parts.push(`${whose} blood relatives (within 7 degrees, not in-laws)`);
  }
  const name = [spec.names?.firstName, spec.names?.anyLastName || spec.names?.lastNameAtBirth].filter(Boolean).join(" ");
  if (name) parts.push(name);
  if (spec.gender) parts.push(spec.gender === "female" ? "women" : "men");
  if (occupation) parts.push(occupation.label);
  const verb = { birth: "born", death: "died", marriage: "married", any: "with a place" };
  for (const event of ["birth", "death", "marriage", "any"]) {
    const place = (spec.places || []).filter((entry) => entry.event === event && entry.text !== migration?.place).map((entry) => `in ${entry.text}`);
    const date = (spec.dates || []).filter((entry) => entry.event === event).map(span);
    const detail = [...place, ...date].join(" ");
    if (detail) parts.push(`${verb[event]} ${detail}`);
  }
  if (migration) parts.push(`emigrated ${migration.direction} ${migration.place} (${migration.direction === "to" ? "died there, born elsewhere" : "born there, died elsewhere"})`);
  if (emigrantCategory) parts.push(`in the ${emigrantCategory} categories`);
  if (nationality) parts.push(`(${nationality.word} read as born in ${nationality.country})`);
  if (createdLabel) parts.push(createdLabel);
  if (spec.creator === "me") parts.push("created by you");
  else if (spec.creator) parts.push(`created by ${spec.creator}`);
  if (spec.manager === "me") parts.push("managed by you");
  else if (manager) parts.push(`managed by ${manager.label}`);
  parts.push(...flagLabels);
  return parts.join(", ");
}
