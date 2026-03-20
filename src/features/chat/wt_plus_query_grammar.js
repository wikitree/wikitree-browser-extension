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
  "IsLiving",
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

function validateAndRepairWtPlusQuery(queryText) {
  const tokens = tokenizeWtPlusQuery(queryText);
  if (!tokens.length) {
    return { isValid: false, normalizedQuery: "", diagnostics: ["empty-query"] };
  }

  const diagnostics = [];
  const normalizedTokens = [];

  for (const token of tokens) {
    if (token.includes("=")) {
      const normalizedField = normalizeWtPlusFieldAssignment(token);
      if (!normalizedField) {
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

function isLikelySuggestionsPrompt(queryText) {
  const text = String(queryText || "").toLowerCase();
  return (
    /\b(?:suggestion|suggestions|error\s*id|errorid|err\d+)\b/.test(text) ||
    /\b(?:show\s+hidden|hide\s+active|max\s+errors?)\b/.test(text)
  );
}

function translateSuggestionsFreeTextToQuery(queryText) {
  const text = String(queryText || "").trim();
  if (!text) return null;

  const suggestionIdMatch = text.match(/(?:suggestions?|error\s*id|errorid|err)\s*[:=#-]?\s*(\d{1,6})/i);
  const suggestionId = suggestionIdMatch?.[1] || "";

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

  if (!suggestionId && !remainder) {
    return null;
  }

  const queryTerms = [];
  if (suggestionId) {
    queryTerms.push(`Suggestions=${suggestionId}`);
  }
  if (remainder) {
    queryTerms.push(remainder);
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
  translateSuggestionsFreeTextToQuery,
};
