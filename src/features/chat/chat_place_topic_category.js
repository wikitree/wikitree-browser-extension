// Deterministic "<place> <topic>" → Location + CategoryWord expansion.
//
// A prompt like "Chicago military" is not a person search and has no single
// category name — the useful WT+ query is a location scope crossed with every
// category word that expresses the topic:
//
//   Location="Chicago" CategoryWord=military
//     OR Location="Chicago" CategoryWord=army
//     OR Location="Chicago" CategoryWord=navy ...
//
// This module recognises that shape and reports the location plus the topic's
// synonym set; chat_profile_search turns it into the OR query, and
// chat_search_mode uses the boolean detector to route Search-mode prompts to
// WT+.

// Each group: `triggers` are the words a user might type; `synonyms` are the
// CategoryWord values we expand to. Trigger words that are also common given
// names or surnames (church, mason, nurse, cook, gunner) are deliberately left
// out so plain name searches are not hijacked.
export const CATEGORY_TOPIC_GROUPS = [
  {
    label: "military",
    triggers: [
      "military",
      "army",
      "navy",
      "naval",
      "war",
      "wars",
      "regiment",
      "regiments",
      "infantry",
      "cavalry",
      "artillery",
      "militia",
      "soldier",
      "soldiers",
      "veteran",
      "veterans",
    ],
    synonyms: ["military", "army", "navy", "naval", "war", "regiment", "infantry", "cavalry", "artillery", "veteran"],
  },
  {
    label: "mining",
    triggers: ["mining", "miner", "miners", "colliery", "collieries", "coalmining"],
    synonyms: ["mining", "miner", "colliery", "coal"],
  },
  {
    label: "railway",
    triggers: ["railroad", "railroads", "railway", "railways"],
    synonyms: ["railroad", "railway", "rail"],
  },
  {
    label: "maritime",
    triggers: ["maritime", "seafarers", "shipbuilding", "shipwrights"],
    synonyms: ["maritime", "mariner", "sailor", "seaman", "shipping"],
  },
  {
    label: "medical",
    triggers: ["medical", "medicine", "hospital", "hospitals"],
    synonyms: ["medical", "medicine", "hospital", "physician", "nurse", "surgeon"],
  },
  {
    label: "education",
    triggers: [
      "education",
      "educational",
      "school",
      "schools",
      "teacher",
      "teachers",
      "university",
      "universities",
      "college",
      "colleges",
      "academy",
    ],
    synonyms: ["school", "teacher", "university", "college", "academy"],
  },
  {
    // Legal professions. "law", "judge", "court" are common surnames, so they
    // are expansion synonyms only — never triggers.
    label: "legal",
    triggers: ["legal", "lawyer", "lawyers", "barrister", "barristers", "solicitor", "solicitors", "attorney", "attorneys"],
    synonyms: ["law", "lawyers", "judge", "solicitor", "attorney", "barristers"],
  },
  {
    // "church", "minister", "priest" are common names → synonyms only.
    label: "religious",
    triggers: ["religious", "clergy", "clergymen", "cathedral", "chapel", "ministry"],
    synonyms: ["church", "clergy", "minister", "priest", "cathedral", "chapel", "religious"],
  },
  {
    label: "politics",
    triggers: [
      "politics",
      "political",
      "politician",
      "politicians",
      "government",
      "mayor",
      "mayors",
      "senator",
      "senators",
      "parliament",
      "statesman",
    ],
    synonyms: ["politicians", "mayor", "senator", "parliament", "government", "governor", "statesman"],
  },
  {
    // "painter" is a common surname → synonym only; "art" is a given name → not a trigger.
    label: "arts",
    triggers: [
      "arts",
      "artist",
      "artists",
      "musician",
      "musicians",
      "composer",
      "composers",
      "actor",
      "actors",
      "actress",
      "author",
      "authors",
      "writer",
      "writers",
      "poet",
      "poets",
    ],
    synonyms: ["artists", "painters", "musicians", "composers", "actors", "writers", "authors", "poets"],
  },
  {
    label: "sports",
    triggers: [
      "sport",
      "sports",
      "athlete",
      "athletes",
      "football",
      "footballer",
      "footballers",
      "cricket",
      "cricketer",
      "cricketers",
      "olympic",
      "olympics",
      "baseball",
    ],
    synonyms: ["athletes", "sport", "footballers", "cricketers", "olympic"],
  },
  {
    label: "aviation",
    triggers: ["aviation", "aviator", "aviators", "pilot", "pilots", "aircraft"],
    synonyms: ["aviation", "aviator", "pilot"],
  },
  {
    // "constable" (John Constable) → synonym only.
    label: "police",
    triggers: ["police", "policeman", "policemen", "sheriff", "sheriffs", "detective", "detectives"],
    synonyms: ["police", "constable", "sheriff"],
  },
  {
    // "farmer" is a common surname → synonym only.
    label: "agriculture",
    triggers: ["farming", "agriculture", "agricultural"],
    synonyms: ["farmer", "farming", "agriculture"],
  },
  {
    // "noble" and "royal" are surnames → synonyms only.
    label: "nobility",
    triggers: ["nobility", "royalty", "aristocracy", "aristocratic", "peerage", "nobleman", "noblemen"],
    synonyms: ["nobility", "royalty", "peerage", "aristocracy"],
  },
  {
    label: "migration",
    triggers: [
      "pioneer",
      "pioneers",
      "settler",
      "settlers",
      "immigrant",
      "immigrants",
      "immigration",
      "emigrant",
      "emigrants",
      "emigration",
      "migration",
    ],
    synonyms: ["pioneer", "settlers", "immigrant", "emigrant", "migration"],
  },
  {
    label: "slavery",
    triggers: ["slavery", "enslaved", "slaves"],
    synonyms: ["slavery", "enslaved", "slave"],
  },
];

// Words that qualify a war so "Chicago civil war" strips "civil" from the place.
const TOPIC_QUALIFIERS = new Set([
  "civil",
  "world",
  "revolutionary",
  "korean",
  "vietnam",
  "boer",
  "napoleonic",
  "cold",
  "crimean",
  "spanish",
  "mexican",
]);

const LEAD_COMMAND_RE = /^(?:search(?:\s+for)?|find|show(?:\s+me)?|list|get|look(?:\s+up)?|all|the)\s+/i;
const TRAILING_NOUN_RE = /\s+(?:categor(?:y|ies)|profiles?|people|members?|records?)\s*$/i;

const TRIGGER_TO_GROUP = new Map();
const ALL_TRIGGERS = new Set();
for (const group of CATEGORY_TOPIC_GROUPS) {
  for (const trigger of group.triggers) {
    TRIGGER_TO_GROUP.set(trigger, group);
    ALL_TRIGGERS.add(trigger);
  }
}

// Location tokens that signal the "place" is really a filter/status word, so
// the match should be declined rather than producing Location=<status>.
const LOCATION_STOP_WORDS = new Set([
  ...ALL_TRIGGERS,
  "unsourced",
  "unconnected",
  "orphan",
  "orphaned",
  "connected",
  "notable",
  "notables",
  "male",
  "female",
  "men",
  "women",
  "people",
  "profiles",
  "and",
  "or",
  "not",
  "in",
  "from",
  "of",
  "at",
]);

function cleanWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function findGroup(word) {
  return TRIGGER_TO_GROUP.get(cleanWord(word)) || null;
}

function buildMatch(group, rawLocation) {
  const location = String(rawLocation || "")
    .replace(/^(?:in|from|of|at)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!location) return null;
  // Digits mean a date/count crept in — not a plain place.
  if (/\d/.test(location)) return null;

  const locationTokens = location
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!locationTokens.length || locationTokens.length > 4) return null;
  // Every token being a stop/trigger/status word means there is no real place.
  if (locationTokens.every((token) => LOCATION_STOP_WORDS.has(cleanWord(token)))) return null;

  return { location, label: group.label, synonyms: [...group.synonyms] };
}

/**
 * Recognise a "<place> <topic>" / "<topic> in <place>" prompt.
 * Returns { location, label, synonyms } or null.
 */
export function matchLocationTopicCategory(prompt) {
  let text = String(prompt || "").trim();
  if (!text) return null;

  let previous;
  do {
    previous = text;
    text = text.replace(LEAD_COMMAND_RE, "").trim();
  } while (text !== previous);
  text = text.replace(/[?.!]+$/g, "").trim();
  text = text.replace(TRAILING_NOUN_RE, "").trim();
  if (!text) return null;

  // Form A: "<topic> in|from|of|at <place>"
  const connectiveMatch = text.match(/^([A-Za-z]+)\s+(?:in|from|of|at)\s+(.+)$/i);
  if (connectiveMatch) {
    const group = findGroup(connectiveMatch[1]);
    if (group) {
      const built = buildMatch(group, connectiveMatch[2]);
      if (built) return built;
    }
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // Form B: "<place> <topic>" — topic is the last word (the common case).
  const lastGroup = findGroup(tokens[tokens.length - 1]);
  if (lastGroup) {
    let locationTokens = tokens.slice(0, -1);
    // "Chicago civil war" → drop the "civil" qualifier from the place.
    if (locationTokens.length > 1) {
      const trailing = cleanWord(locationTokens[locationTokens.length - 1]);
      if (TOPIC_QUALIFIERS.has(trailing)) {
        locationTokens = locationTokens.slice(0, -1);
      }
    }
    const built = buildMatch(lastGroup, locationTokens.join(" "));
    if (built) return built;
  }

  // Form C: "<topic> <place>" — topic is the first word.
  const firstGroup = findGroup(tokens[0]);
  if (firstGroup) {
    const built = buildMatch(firstGroup, tokens.slice(1).join(" "));
    if (built) return built;
  }

  return null;
}

/** Boolean form for routing decisions. */
export function isLocationTopicCategoryPrompt(prompt) {
  return Boolean(matchLocationTopicCategory(prompt));
}
