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

const LEAD_IN = /^\s*(?:(?:search(?:\s+for)?|find|show(?:\s+me)?|list|get|give\s+me)\s+)?(?:(?:who|which\s+(?:people|profiles))(?:\s+(?:was|were|is|are))?\s+)?/i;

const STATUS_FLAGS = [
  ["Unsourced", /\b(?:unsourced|(?:with\s+)?no\s+sources?|without\s+(?:any\s+)?sources?|missing\s+sources?)\b/i, "no sources"],
  ["Unconnected", /\b(?:unconnected|not\s+connected)\b/i, "not connected"],
  ["Orphan", /\b(?:orphan(?:ed)?s?|unmanaged|(?:with\s+)?no\s+managers?)\b/i, "no manager"],
  ["NoParents", /\b(?:with\s+)?(?:no|without|missing)\s+parents\b/i, "no parents"],
  ["NoFather", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?father\b/i, "no father"],
  ["NoMother", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?mother\b/i, "no mother"],
  ["NoSpouses", /\b(?:with\s+)?(?:no|without|missing)\s+(?:a\s+)?(?:spouses?|partners?)\b/i, "no spouse"],
  ["NoChildren", /\b(?:with\s+)?(?:no|without|missing)\s+children\b/i, "no children"],
];

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
const NATIONALITY_PATTERN = new RegExp(`\\b(${Object.keys(NATIONALITIES).join("|")})\\b`);
// Without a destination, WikiTree's own Emigrants / Immigrants categories are all there is to search.
const EMIGRANT_PATTERN = /\b(?:who\s+)?(emigrated|emigrants|immigrated|immigrants)\b/i;

// "emigrated to Australia" = died there, not born there; "emigrants from X" the other way round.
const MIGRATION_PATTERN =
  /\b(?:emigrated|emigrants|immigrated|immigrants)\s+(to|from)\s+([A-Z][A-Za-z'.-]*(?:\s+(?:(?:of|upon|on)\s+)?[A-Z][A-Za-z'.-]*){0,3})/;

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
const FILLER = new Set(["and", "profiles", "profile", "people", "persons", "person", "who", "that", "were", "was", "is", "are", "the", "all", "with", "a", "an", "also", "please", "me"]);
const PLACE_PREPOSITIONS = new Set(["in", "at", "from"]);
const PLACE_STOP = new Set([...Object.keys(EVENT_WORDS), ...FILLER, "in", "at", "from", "before", "after", "no", "without", "not", "or"]);

const PLACE_PARTICLES = new Set(["of", "on", "upon", "de", "la", "le", "du", "van", "von", "der", "del"]);
// Place names with "and" or "the" inside them: one word to the reader, so "and" can't end a place there.
const JOINED_PLACES = [
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
const clean = (word) => word.replace(/^[^A-Za-z0-9§]+|[^A-Za-z0-9§'-]+$/g, "");

/** The words of a sentence as a spec, or null when any word isn't accounted for. */
export function parseSearchSpecPrompt(prompt) {
  let text = ` ${String(prompt || "")
    .trim()
    .replace(/[?!.\s]+$/, "")
    .replace(LEAD_IN, "")} `;
  if (!text.trim()) return null;

  const flags = [];
  const flagLabels = [];
  for (const [flag, pattern, label] of STATUS_FLAGS) {
    const match = text.match(pattern);
    if (match) {
      flags.push(flag);
      flagLabels.push(label);
      text = text.replace(match[0], " §F ");
    }
  }
  let nationality = null;
  text = text.replace(NATIONALITY_PATTERN, (whole, word) => {
    nationality = nationality ? false : { word, country: NATIONALITIES[word] };
    return " §N ";
  });
  if (nationality === false) return null;
  let migration = null;
  text = text.replace(MIGRATION_PATTERN, (whole, direction, place) => {
    migration = { direction: direction.toLowerCase(), place: place.trim() };
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
  const trailing = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const word = tokens[i];
    const low = word.toLowerCase();
    if (word.startsWith("§")) {
      if (word.startsWith("§D")) {
        spanned.push({ index: Number(word.slice(2)), event: event || "birth" });
        if (!event) sawBareDate = true;
      }
      if (word === "§N") {
        sawMarker = true;
        continue;
      }
      if (word === "§O" || word === "§M") {
        sawMarker = true;
        // "Kent farmers 1850s": the words before an occupation word are its place
        if (word === "§O" && !event && lead.length && lead.some(looksLikeNationality)) return null;
        if (word === "§O" && !event && lead.length && lead.every(isName) && lead.length <= 3) {
          places.push({ text: lead.join(" "), event: "any" });
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
    return null;
  }

  if (trailing.length) {
    if (trailing.length > 3) return null;
    places.push({ text: trailing.join(" "), event: "birth" });
    sawMarker = true;
  }
  const names = {};
  if (lead.length) {
    if (!sawMarker || lead.length > 2 || !lead.every(isName)) return null;
    // "Scottish emigrants to Canada", "Irish farmers": a nationality, not a surname
    if ((migration || occupation) && lead.some(looksLikeNationality)) return null;
    if (lead.length === 2) names.firstName = lead[0];
    names.lastNameAtBirth = lead[lead.length - 1];
  }

  const spec = {};
  if (created) spec.created = created;
  if (Object.keys(names).length) spec.names = names;
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
  if (!Object.keys(spec).length) return null;
  // Something to search on besides a gender or a status word alone.
  if (!spec.names && !spec.places && !spec.dates && !occupation && !emigrantCategory) return null;
  // a nationality on its own ("Irish") says too little
  if (nationality && !occupation && !migration && !emigrantCategory && !spec.dates && !spec.flags && !spec.gender && !spec.names && spec.places.length < 2) return null;

  return { spec, understood: describeSpec(spec, flagLabels, createdLabel, { migration, occupation, nationality, emigrantCategory }) };
}

function describeSpec(spec, flagLabels, createdLabel = "", { migration, occupation, nationality, emigrantCategory } = {}) {
  const span = ({ from, to }) => (from !== undefined && to !== undefined ? (from === to ? `${from}` : `${from}–${to}`) : from !== undefined ? `${from} or later` : `${to} or earlier`);
  const parts = [];
  const name = [spec.names?.firstName, spec.names?.lastNameAtBirth].filter(Boolean).join(" ");
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
  parts.push(...flagLabels);
  return parts.join(", ");
}
