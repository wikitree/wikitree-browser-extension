import suggestionsData from "../wikitree_plus_helper/suggestions.json";

const WT_PLUS_ALLOWED_FIELDS = [
  "ProfileStatus",
  "WikiTreeID",
  "Prefix",
  "LastNameAtBirth",
  "FirstName",
  "PreferredName",
  "MiddleName",
  "Suffix",
  "Nicknames",
  "AllFirstNames",
  "CurrentLastName",
  "LastNameOther",
  "AllLastNames",
  "FullName",
  "BirthLocation",
  "BirthCountry",
  "BirthRegion",
  "DeathLocation",
  "DeathCountry",
  "DeathRegion",
  "MarriageLocation",
  "MarriageCountry",
  "MarriageRegion",
  "Location",
  "Country",
  "Region",
  "Dates",
  "DNA",
  "Relation",
  "Gender",
  "Privacy",
  "CategoryFull",
  "CategoryWord",
  "CategoryID",
  "SubCat0",
  "SubCat1",
  "SubCat2",
  "SubCat3",
  "SubCat4",
  "SubCat5",
  "SubCat6",
  "SubCat7",
  "SubCat8",
  "SubCat9",
  "Template",
  "TemplateFull",
  "TemplateText",
  "Tree",
  "Ancestors",
  "Descendants",
  "CC7",
  "Manager",
  "Created",
  "Creator_",
  "Stars",
  "LastEdit",
  "Merge",
  "heading",
  "Domain",
  "GEDFile",
  "WikiData",
  "FamilySearch",
  "FindAGrave",
  "profilelist",
  "changesmonth",
  "Suggestions",
  "sql",
];

const WT_PLUS_FIELD_NAME_MAP = new Map(WT_PLUS_ALLOWED_FIELDS.map((name) => [name.toLowerCase(), name]));

const WT_PLUS_RAW_TOKEN_CANONICAL = new Map([
  ["open", "Open"],
  ["unsourced", "Unsourced"],
  ["unconnected", "Unconnected"],
  ["orphan", "Orphan"],
  ["notables", "Notables"],
  ["connected", "connected"],
  ["unlinked", "unlinked"],
  ["publictree", "PublicTree"],
  ["privatetree", "PrivateTree"],
  ["male", "male"],
  ["female", "female"],
  ["nogender", "NoGender"],
  ["missinglocation", "MissingLocation"],
  ["unknowncountry", "UnknownCountry"],
  ["unknownregion", "UnknownRegion"],
  ["unofficiallocation", "UnofficialLocation"],
  ["b0", "B0"],
  ["d0", "D0"],
  ["pre1500", "pre1500"],
  ["nofather", "NoFather"],
  ["nomother", "NoMother"],
  ["noparents", "NoParents"],
  ["nospouses", "NoSpouses"],
  ["nochildren", "NoChildren"],
  ["mtdna", "mtDNA"],
  ["ydna", "yDNA"],
  ["audna", "auDNA"],
  ["nogedmatchid", "noGEDMatchID"],
  ["nomitoydnaid", "noMitoyDNAID"],
  ["private", "Private"],
  ["privatepb", "PrivatePB"],
  ["privatept", "PrivatePT"],
  ["privatepbpt", "PrivatePBPT"],
  ["public", "Public"],
  ["guest", "Guest"],
  ["projectmanaged", "ProjectManaged"],
  ["ppp", "PPP"],
  ["neveredited", "NeverEdited"],
  ["approvedmerge", "ApprovedMerge"],
  ["pendingmerge", "PendingMerge"],
  ["unmergedmatch", "UnmergedMatch"],
  ["gedcomjunk", "GEDCOMJunk"],
  ["sourcejunk", "SourceJunk"],
  ["isinwikidata", "IsInWikiData"],
  ["relation=father", "relation=father"],
  ["relation=mother", "relation=mother"],
  ["relation=parents", "relation=parents"],
  ["relation=spouses", "relation=spouses"],
  ["relation=children", "relation=children"],
  ["relation=siblings", "relation=siblings"],
  ["relation=nuclear", "relation=nuclear"],
  ["relation=addfather", "relation=addfather"],
  ["relation=addmother", "relation=addmother"],
  ["relation=addparents", "relation=addparents"],
  ["relation=addspouses", "relation=addspouses"],
  ["relation=addchildren", "relation=addchildren"],
  ["relation=addsiblings", "relation=addsiblings"],
  ["relation=addnuclear", "relation=addnuclear"],
]);

function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "")
    .trim();
}

function tokenizeWtPlusQuery(queryText) {
  const text = String(queryText || "").trim();
  if (!text) return [];
  const tokens = [];
  const re = /[^\s=]+=(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s]+)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s]+/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function canonicalizeWtPlusRawToken(token) {
  const text = stripSurroundingQuotes(token);
  if (!text) return null;

  if (/^(?:OR|NOT)$/i.test(text)) {
    return text.toUpperCase();
  }

  if (/^Tree[0-9A-Za-z_-]+$/i.test(text)) {
    return `Tree${text.slice(4)}`;
  }

  if (/^fg(?:cem|mem)\d+$/i.test(text)) {
    return text.toLowerCase();
  }

  // ERRxxx is a magic word for the suggestions report (err6), not the text search (srch1).
  // Suggestion numbers in text search must be written as Suggestions=NNN.
  // Do not accept ERRxxx as a valid raw token here; callers should convert to Suggestions=NNN first.

  if (/^[1-5]stars?$/i.test(text)) {
    const n = text.match(/^([1-5])/i)?.[1] || "";
    return n === "1" ? "1star" : `${n}stars`;
  }

  if (/^\d{1,2}cen$/i.test(text)) {
    const n = Number.parseInt(text, 10);
    return Number.isFinite(n) ? `${n}Cen` : null;
  }

  if (/^age\d{1,3}$/i.test(text)) {
    const n = Number.parseInt(text.slice(3), 10);
    return Number.isFinite(n) ? `age${n}` : null;
  }

  if (/^LastEdit\d{4}$/i.test(text)) {
    const n = Number.parseInt(text.slice(8), 10);
    return Number.isFinite(n) ? `LastEdit${n}` : null;
  }

  if (/^creator_/i.test(text) && text.length > "Creator_".length) {
    return `Creator_${text.slice("Creator_".length)}`;
  }

  if (/^B\d{4}$/i.test(text) || /^D\d{4}$/i.test(text) || /^\d{4}s$/i.test(text)) {
    return text;
  }

  return WT_PLUS_RAW_TOKEN_CANONICAL.get(text.toLowerCase()) || null;
}

function normalizeWtPlusFieldName(fieldName) {
  const text = String(fieldName || "").trim();
  if (!text) return "";
  return WT_PLUS_FIELD_NAME_MAP.get(text.toLowerCase()) || "";
}

function normalizeWtPlusFieldAssignment(token) {
  const idx = token.indexOf("=");
  if (idx <= 0) return null;

  const rawName = token.slice(0, idx);
  const rawValue = token.slice(idx + 1);
  const fieldName = normalizeWtPlusFieldName(rawName);
  if (!fieldName) return null;

  const value = String(rawValue || "").trim();
  if (!value) return null;

  if (fieldName === "sql") {
    const inner = value
      .replace(/^sql\s*=\s*/i, "")
      .replace(/^"|"$/g, "")
      .replace(/^'|'$/g, "")
      .trim();
    return inner ? `sql="${inner.replace(/"/g, "'")}"` : null;
  }

  return `${fieldName}=${value}`;
}

function normalizeAiEscapedWtPlusQuotes(queryText) {
  return String(queryText || "").replace(/\\+(["'])/g, "$1");
}

function validateAndRepairWtPlusQuery(queryText) {
  const normalizedInput = normalizeAiEscapedWtPlusQuotes(queryText);
  const tokens = tokenizeWtPlusQuery(normalizedInput);
  if (!tokens.length) {
    return { isValid: false, normalizedQuery: "", diagnostics: ["empty-query"] };
  }

  const diagnostics = [];
  const normalizedTokens = [];

  for (const token of tokens) {
    if (token.includes("=")) {
      const normalizedField = normalizeWtPlusFieldAssignment(token);
      if (!normalizedField) {
        // Check if the LHS is a known raw token — AI sometimes emits RawToken=value
        // instead of the bare token (e.g. ProjectManaged="England Project" → ProjectManaged).
        const lhs = token.slice(0, token.indexOf("=")).trim();
        const canonicalRaw = lhs ? canonicalizeWtPlusRawToken(lhs) : null;
        if (canonicalRaw && !/^(?:OR|NOT)$/i.test(canonicalRaw)) {
          normalizedTokens.push(canonicalRaw);
          diagnostics.push(`repaired-raw-as-field:${token}`);
          continue;
        }
        diagnostics.push(`invalid-field:${token}`);
        return { isValid: false, normalizedQuery: "", diagnostics };
      }
      normalizedTokens.push(normalizedField);
      continue;
    }

    const normalizedRaw = canonicalizeWtPlusRawToken(token);
    if (!normalizedRaw) {
      diagnostics.push(`invalid-token:${token}`);
      return { isValid: false, normalizedQuery: "", diagnostics };
    }

    normalizedTokens.push(normalizedRaw);
  }

  const normalizedQuery = normalizedTokens.join(" ").trim();
  if (!normalizedQuery) {
    diagnostics.push("empty-normalized-query");
    return { isValid: false, normalizedQuery: "", diagnostics };
  }

  return { isValid: true, normalizedQuery, diagnostics };
}

// Words that appear in suggestion titles as absence/negation qualifiers.
// When a title has one (e.g. "Empty biography"), the matching query must also
// contain at least one absence synonym.
const TITLE_ABSENCE_ADJECTIVES = new Set([
  "empty",
  "missing",
  "no",
  "blank",
  "absent",
  "without",
  "expired",
  "unbalanced",
  "unclosed",
  "unused",
  "unknown",
  "unrecognized",
  "incorrect",
  "wrong",
  "short",
  "duplicate",
  "duplicated",
]);

const QUERY_ABSENCE_QUALIFIERS_RE =
  /\b(?:no|not|none|missing|empty|blank|without|expired|absent|lacking|zero|unrecognized|incorrect|wrong|duplicate|duplicated|short|unused|unbalanced|unclosed)\b/i;

const SUGGESTION_STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "a",
  "an",
  "in",
  "of",
  "is",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "are",
  "has",
  "have",
  "this",
  "that",
  "which",
  "where",
  "when",
  "was",
  "been",
  "be",
  "use",
  "using",
  "used",
  "also",
  "too",
  "very",
  "can",
  "will",
  "may",
  "its",
  "it",
  "if",
  "as",
  "from",
  "but",
  "than",
  "so",
  "all",
  "about",
  "into",
  "only",
  "same",
]);

let _suggestionKeywordIndex = null;

const SUGGESTION_PHRASE_ALIASES = [
  {
    code: "931",
    patterns: [
      /\bproject\s*managed\b.*\b(?:with\s+no|missing|without)\b.*\bproject\s*box\b/i,
      /\bmanaged\s+by\b.*\b(?:with\s+no|missing|without)\b.*\bproject\s*box\b/i,
      /\bno\b.*\bproject\s*box\b.*\bproject\s*managed\b/i,
    ],
    titleHint: "Project managed but no project box",
  },
  {
    // Profiles missing both birth and death dates map to the WT+ "No Dates"
    // suggestion group. These four codes cover the open-privacy No-Dates cases;
    // emitting them together (Suggestions="131 132 133 134") matches any of them.
    // Without this alias the keyword matcher grabs a single FindAGrave date code
    // (e.g. 573) and leaks the unmatched word ("death") into a bogus Location.
    code: "131 132 133 134",
    patterns: [
      /\b(?:no|missing|without|empty|blank)\b.*\bbirth\b.*\bdeath\b.*\bdates?\b/i,
      /\b(?:no|missing|without|empty|blank)\b.*\bdeath\b.*\bbirth\b.*\bdates?\b/i,
      /\bno\s+dates?\b/i,
    ],
    titleHint: "No birth or death date",
  },
  {
    code: "802",
    patterns: [/\b(?:empty|blank|no)\b.*\bbiograph(?:y|ies)\b/i, /\bno\b.*\bbio\b/i],
    titleHint: "Empty biography",
  },
  {
    code: "803",
    patterns: [
      /\b(?:almost|near(?:ly)?)\b.*\bempty\b.*\bbiograph(?:y|ies)\b/i,
      /\bshort\b.*\bbiograph(?:y|ies)\b/i,
      /\bthin\b.*\bbio\b/i,
    ],
    titleHint: "Almost empty biography",
  },
  {
    code: "853",
    patterns: [/\bgedcom\b.*\bjunk\b/i, /\bgedcom\b.*\bunclean(?:ed)?\b/i, /\bunclean(?:ed)?\b.*\bgedcom\b/i],
    titleHint: "GEDCOM Junk",
  },
  {
    code: "891",
    patterns: [/\bmissing\b.*\btemplate\b/i, /\btemplate\b.*\b(?:missing|doesn\s*'?t\s+exist|not\s+found)\b/i],
    titleHint: "Missing template (system)",
  },
  {
    code: "901",
    patterns: [
      /\bunconnected\b.*\bempty\b.*\bpublic\b.*\bprofile\b/i,
      /\bempty\b.*\bunconnected\b.*\bpublic\b.*\bprofile\b/i,
    ],
    titleHint: "Unconnected empty public profile",
  },
  {
    code: "902",
    patterns: [
      /\bunconnected\b.*\bempty\b.*\bopen\b.*\bprofile\b/i,
      /\bempty\b.*\bunconnected\b.*\bopen\b.*\bprofile\b/i,
    ],
    titleHint: "Unconnected empty open profile",
  },
  {
    code: "509",
    patterns: [/\bmissing\b.*\bgender\b/i, /\bno\b.*\bgender\b/i, /\bgender\b.*\b(?:missing|unknown|blank|unset)\b/i],
    titleHint: "Missing gender",
  },
  {
    code: "811",
    patterns: [
      /\bunclean(?:ed)?\b.*\bprofile\b.*\bafter\b.*\bmerge\b/i,
      /\bmerge\b.*\bcleanup\b/i,
      /\bbiograph(?:y|ies)\b.*\bnot\b.*\bclean(?:ed|up)\b.*\bmerge\b/i,
    ],
    titleHint: "Uncleaned profile after merge",
  },
  {
    code: "825",
    patterns: [
      /\bseparator\s+line\b.*\b={4,}\b/i,
      /\buse\b.*\bseparator\s+line\b.*\b----\b/i,
      /\bheading\b.*\bseparator\b.*\bequals\b/i,
    ],
    titleHint: "Use separator line ----",
  },
  {
    code: "831",
    patterns: [
      /\bduplicate(?:d)?\b.*\bline(?:s)?\b/i,
      /\bduplicate(?:d)?\b.*\bparagraph(?:s)?\b/i,
      /\bmultiple\b.*\bduplicated\b.*\bline(?:s)?\b/i,
    ],
    titleHint: "Multiple duplicated lines",
  },
];

function normalizeSuggestionFreeText(queryText) {
  return String(queryText || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSuggestionByPhraseAlias(queryText) {
  if (/\bSuggestions\s*=\s*\d+\b/i.test(String(queryText || ""))) return null;

  const text = normalizeSuggestionFreeText(queryText);
  if (!text) return null;

  for (const alias of SUGGESTION_PHRASE_ALIASES) {
    if (!Array.isArray(alias?.patterns) || !alias?.code) continue;
    if (alias.patterns.some((pattern) => pattern.test(text))) {
      return {
        code: String(alias.code),
        dbeId: `DBE_${alias.code}`,
        cleanTitle: String(alias.titleHint || "").toLowerCase(),
      };
    }
  }

  return null;
}

function buildSuggestionKeywordIndex() {
  if (_suggestionKeywordIndex) return _suggestionKeywordIndex;

  const index = [];
  const allSuggestions = suggestionsData?.suggestions || {};

  for (const [dbeId, suggestion] of Object.entries(allSuggestions)) {
    const code = String(suggestion.code || "").trim();
    if (!code) continue;

    const rawTitle = String(suggestion.title || "");
    // Strip leading group prefix such as "Profile completeness - " or "FindAGrave - "
    const cleanTitle = rawTitle
      .replace(/^[^-]+-\s*/, "")
      .trim()
      .toLowerCase();

    const titleWords = cleanTitle
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length >= 3);

    const absenceWords = titleWords.filter((w) => TITLE_ABSENCE_ADJECTIVES.has(w));
    const contentWords = titleWords.filter((w) => !TITLE_ABSENCE_ADJECTIVES.has(w) && !SUGGESTION_STOP_WORDS.has(w));

    if (contentWords.length === 0) continue;

    index.push({
      code,
      dbeId,
      cleanTitle,
      contentWords,
      hasAbsenceWords: absenceWords.length > 0,
    });
  }

  _suggestionKeywordIndex = index;
  return index;
}

/**
 * Try to match a free-text query against suggestion titles using keyword
 * analysis.  Returns { code, dbeId, cleanTitle } or null.
 *
 * Matching rules:
 * - For titles with absence adjectives ("empty", "missing", "no", …):
 *   require an absence synonym in the query AND at least one content word
 *   (≥ 5 chars) present in the query.
 * - For other titles: require ALL content words present in the query.
 *
 * Ties are broken by the total character length of matched content words
 * (longer words → more specific match).
 */
function matchSuggestionByNaturalLanguage(queryText) {
  // Skip if the query already carries an explicit Suggestions= term.
  if (/\bSuggestions\s*=\s*\d+\b/i.test(String(queryText || ""))) return null;

  const aliasMatch = matchSuggestionByPhraseAlias(queryText);
  if (aliasMatch) return aliasMatch;

  const text = normalizeSuggestionFreeText(queryText);
  if (text.length < 3) return null;

  const index = buildSuggestionKeywordIndex();
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of index) {
    const { contentWords, hasAbsenceWords } = entry;
    const matchedContent = contentWords.filter((w) => text.includes(w));

    if (matchedContent.length === 0) continue;

    if (hasAbsenceWords) {
      // Require an absence qualifier in the query.
      if (!QUERY_ABSENCE_QUALIFIERS_RE.test(text)) continue;
      // Require at least one distinctive content word (≥ 5 chars).
      if (!matchedContent.some((w) => w.length >= 5)) continue;
    } else {
      // Require all content words.
      if (matchedContent.length < contentWords.length) continue;
    }

    // Score: favour more / longer matched words.
    const score = matchedContent.length * 10 + matchedContent.reduce((s, w) => s + w.length, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

function isLikelySuggestionsPrompt(queryText) {
  const text = String(queryText || "").toLowerCase();
  if (
    /\b(?:suggestion|suggestions|error\s*id|errorid|err\d+)\b/.test(text) ||
    /\b(?:show\s+hidden|hide\s+active|max\s+errors?)\b/.test(text)
  ) {
    return true;
  }
  // Also return true when the text appears to describe a known suggestion type
  // (e.g. "no biography", "gedcom junk") even without the word "suggestion".
  return matchSuggestionByNaturalLanguage(queryText) !== null;
}

function translateSuggestionsFreeTextToQuery(queryText) {
  const text = String(queryText || "").trim();
  if (!text) return null;

  const suggestionIdMatch = text.match(/(?:suggestions?|error\s*id|errorid|err)\s*[:=#-]?\s*(\d{1,6})/i);
  let suggestionId = suggestionIdMatch?.[1] || "";
  let nlMatchedTitle = "";

  // If no explicit ID, try natural-language title matching.
  if (!suggestionId) {
    const nlMatch = matchSuggestionByNaturalLanguage(text);
    if (nlMatch) {
      suggestionId = String(nlMatch.code);
      nlMatchedTitle = String(nlMatch.cleanTitle || "");
    }
  }

  const showHidden = /\bshow\s+hidden\b/i.test(text);
  const hideActive = /\bhide\s+active\b/i.test(text);
  const maxErrorsMatch = text.match(/\bmax\s+errors?\s*[:=]?\s*(\d{1,5})\b/i);
  const maxErrors = maxErrorsMatch?.[1] || "1000";

  let remainder = text
    .replace(/\bshow\s+hidden\b/gi, " ")
    .replace(/\bhide\s+active\b/gi, " ")
    .replace(/\bmax\s+errors?\s*[:=]?\s*\d{1,5}\b/gi, " ")
    .replace(/\b(?:search|find|show|list|get)\b/gi, " ")
    .replace(/\b(?:suggestions?|error\s*id|errorid|err)\s*[:=#-]?\s*\d{1,6}\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // When the id came from a natural-language phrase (not an explicit
  // "Suggestions=NNN"), the descriptive words that matched the suggestion title
  // ("empty biography", "missing gender", …) are still in the remainder and
  // would otherwise leak into a bogus Location scope. Drop the matched title
  // words plus generic qualifier/filler words, leaving only a real place.
  if (nlMatchedTitle) {
    const descriptorWords = new Set([
      ...normalizeSuggestionFreeText(nlMatchedTitle).split(/\s+/).filter(Boolean),
      "empty", "blank", "no", "not", "non", "none", "missing", "without", "lacking",
      "short", "almost", "nearly", "near", "thin", "uncleaned", "unclean", "unconnected",
      "duplicated", "duplicate", "hidden", "broken", "bad", "invalid", "wrong",
      "date", "dates", "birth", "death", "born", "died",
      "profile", "profiles", "people", "person", "member", "members", "bio",
      "with", "after", "that", "the", "a", "an", "by", "but", "and", "or",
      "at", "all", "any", "whatsoever", "even", "still",
    ]);
    remainder = remainder
      .split(/\s+/)
      .filter((word) => {
        const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalized && !descriptorWords.has(normalized);
      })
      .join(" ")
      .trim();
  }

  if (!suggestionId && !remainder) {
    return null;
  }

  const queryTerms = [];
  if (suggestionId) {
    // A multi-code suggestionId ("131 132 133 134") must be quoted so the query
    // tokenizer keeps it as one Suggestions= value instead of splitting the
    // trailing codes into bare (invalid) tokens.
    queryTerms.push(`Suggestions=${/\s/.test(suggestionId) ? `"${suggestionId}"` : suggestionId}`);
  }
  if (remainder) {
    // Emit only valid query-builder terms: recognized raw tokens stay bare,
    // anything else is treated as a location scope. Raw free text (e.g.
    // "England") is not valid WT+ text-search syntax.
    const leftoverWords = [];
    for (const word of remainder.replace(/^(?:in|from)\s+/i, "").split(/\s+/)) {
      const canonicalWord = canonicalizeWtPlusRawToken(word);
      if (canonicalWord) {
        queryTerms.push(canonicalWord);
      } else {
        leftoverWords.push(word);
      }
    }
    if (leftoverWords.length) {
      const place = leftoverWords.join(" ").replace(/^["']|["']$/g, "");
      queryTerms.push(`Location=${/[\s,]/.test(place) ? `"${place}"` : place}`);
    }
  }

  return {
    searchType: "suggestions",
    suggestionId,
    query: queryTerms.join(" ").trim(),
    options: {
      showHidden,
      hideActive,
      maxErrors,
    },
    understood: suggestionId ? `suggestion ${suggestionId}${remainder ? ` with ${remainder}` : ""}` : remainder,
  };
}

export {
  WT_PLUS_ALLOWED_FIELDS,
  canonicalizeWtPlusRawToken,
  normalizeWtPlusFieldName,
  tokenizeWtPlusQuery,
  validateAndRepairWtPlusQuery,
  isLikelySuggestionsPrompt,
  matchSuggestionByNaturalLanguage,
  translateSuggestionsFreeTextToQuery,
};
