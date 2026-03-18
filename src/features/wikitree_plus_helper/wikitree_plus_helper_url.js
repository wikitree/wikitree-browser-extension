/**
 * URL and form building for WikiTree+ searches
 * Consolidates query building and form population logic
 */

const WTPLUS_BASE = "https://plus.wikitree.com/default.htm";
const DEFAULT_REPORT = "srch1";

// Supported fields and magic words for suggestions search
const SUGGESTIONS_SUPPORTED = {
  // Extended search field names
  fields: new Set([
    "WikiTreeID",
    "Name",
    "BirthLocation",
    "DeathLocation",
    "MarriageLocation",
    "Location",
    "Country",
    "Manager",
    "CatTem",
    "Others",
    "Stars",
    "Info",
  ]),
  // Magic words (will match with regex for century and star patterns)
  magicWords: new Set(["IsInWikiData", "Orphan", "Guest", "ProjectManaged"]),
};

// Helper to filter query for suggestions search - keep only supported fields/magic words
function filterQueryForSuggestions(query) {
  const parts = String(query || "")
    .split(/\s+/)
    .map((part) => {
      // Convert LastNameAtBirth= and AllLastNames= to Name= for suggestions
      if (/^LastNameAtBirth=/i.test(part)) {
        return part.replace(/^LastNameAtBirth=/i, "Name=");
      }
      if (/^AllLastNames=/i.test(part)) {
        return part.replace(/^AllLastNames=/i, "Name=");
      }
      return part;
    })
    .filter((part) => {
      if (!part) return false;

      // Check if it's a supported field assignment (field=value)
      const fieldMatch = part.match(/^([^=]+)=/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        return SUGGESTIONS_SUPPORTED.fields.has(fieldName);
      }

      // Check if it's a supported magic word
      if (SUGGESTIONS_SUPPORTED.magicWords.has(part)) return true;

      // Check for century patterns (0Cen through 21Cen)
      if (/^\d{1,2}Cen$/i.test(part)) return true;

      // Check for star patterns (1star through 5stars)
      if (/^[1-5]stars?$/i.test(part)) return true;

      // Check for ERRxxx pattern
      if (/^ERR\d+$/i.test(part)) return true;

      // Keep quoted strings and regular text (may be location names, etc.)
      if (part.startsWith('"') || part.endsWith('"') || !/[=]/.test(part)) {
        // But filter out known unsupported magic words
        const knownUnsupported = [
          "male",
          "female",
          "NoGender",
          "connected",
          "unconnected",
          "unlinked",
          "PublicTree",
          "PrivateTree",
          "NoFather",
          "NoMother",
          "NoParents",
          "NoSpouses",
          "NoChildren",
          "mtDNA",
          "yDNA",
          "auDNA",
          "noGEDMatchID",
          "noMitoyDNAID",
          "Private",
          "PrivatePB",
          "PrivatePT",
          "PrivatePBPT",
          "Public",
          "PPP",
          "NeverEdited",
          "ApprovedMerge",
          "PendingMerge",
          "UnmergedMatch",
          "GEDCOMJunk",
          "SourceJunk",
          "MissingLocation",
          "UnknownCountry",
          "UnknownRegion",
          "Open",
          "Unsourced",
          "Unconnected",
          "Notables",
        ];
        if (knownUnsupported.includes(part)) return false;

        // Filter out Tree=, Ancestors=, Descendants=, CC7=, etc.
        if (/^(Tree|Ancestors|Descendants|CC7)=/i.test(part)) return false;

        return true;
      }

      return false;
    });

  return parts.join(" ").trim();
}

export function extractSuggestionId(query) {
  const q = String(query || "").trim();
  if (!q) return "";
  // Only extract ErrorID if explicitly formatted as "suggestions=123" or "errorid=123"
  // Plain numbers like "123456" should be treated as profile IDs → Query parameter
  let match = q.match(/(?:^|\s)(?:suggestions?|errorid)=(\d+)/i);
  if (match) return match[1];

  return "";
}

// Internal helper - creates the URL object
function createUrl(query, searchType, includeRender, suggestionId = "", suggestionOptions = {}) {
  const u = new URL(WTPLUS_BASE);
  const hintedSuggestionId = suggestionId || extractSuggestionId(query);
  const effectiveSearchType = searchType === "suggestions" ? "suggestions" : searchType;

  if (effectiveSearchType === "suggestions") {
    u.searchParams.set("report", "err6");
    const showHidden = !!suggestionOptions.showHidden;
    const hideActive = !!suggestionOptions.hideActive;
    const maxErrors = suggestionOptions.maxErrors || "1000";
    const resolvedSuggestionId = hintedSuggestionId;
    if (resolvedSuggestionId) {
      u.searchParams.set("ErrorID", resolvedSuggestionId);
      // Remove the suggestions=XXX part from the query string and filter for supported fields
      let cleanedQuery = query
        .replace(/(?:^|\s)(?:suggestions?|errorid)\s*=\s*\d+\s*/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      cleanedQuery = filterQueryForSuggestions(cleanedQuery);
      if (cleanedQuery) {
        u.searchParams.set("Query", cleanedQuery);
      }
    } else if (query) {
      const cleanedQuery = filterQueryForSuggestions(query);
      if (cleanedQuery) {
        u.searchParams.set("Query", cleanedQuery);
      }
    }
    u.searchParams.set("MaxErrors", String(maxErrors));
    if (showHidden) {
      u.searchParams.set("ShowHidden", "1");
    }
    if (hideActive) {
      u.searchParams.set("HideActive", "1");
    }
    if (includeRender) {
      // For suggestions, use wbe=1 to trigger auto-submit instead of render=1
      u.searchParams.set("wbe", "1");
    }
  } else {
    u.searchParams.set("report", DEFAULT_REPORT);
    u.searchParams.set("Query", query);
    if (includeRender) {
      u.searchParams.set("render", "1");
    }
  }
  return u;
}

// Exported version that gets searchType from global state (passed from caller)
export function buildPlusUrl(query, searchType, includeRender = false, suggestionId = "", suggestionOptions = {}) {
  const u = createUrl(query, searchType, includeRender, suggestionId, suggestionOptions);
  return u.toString();
}

// Exported version for form population
export function populatePlusForm(query, searchType, $, suggestionOptions = {}) {
  const q = String(query || "").trim();
  if (!q) return;

  if (searchType === "suggestions") {
    // Suggestions mode - populate the suggestions form (#formSuggestionsAll)
    const $form = $("#formSuggestionsAll");
    if ($form.length) {
      // Expand the suggestions accordion if collapsed
      const $accordion = $("a[href='#err-wrapper']");
      if ($accordion.length && $accordion.hasClass("collapsed")) {
        $accordion.click();
      }

      // Use setTimeout to ensure accordion is expanded and form is ready
      setTimeout(() => {
        const suggestionId = extractSuggestionId(q);
        const $query = $form.find("[name='Query']");
        const $errorId = $form.find("select[name='ErrorID'], #ErrorID");
        const $maxErrors = $form.find("[name='MaxErrors']");
        const $showHidden = $form.find("[name='ShowHidden']");
        const $hideActive = $form.find("[name='HideActive']");
        const showHidden = !!suggestionOptions.showHidden;
        const hideActive = !!suggestionOptions.hideActive;
        const maxErrors = suggestionOptions.maxErrors || "1000";

        if (suggestionId) {
          // Remove the suggestions=XXX part from the query and filter for supported fields
          let cleanedQuery = q
            .replace(/(?:^|\s)(?:suggestions?|errorid)\s*=\s*\d+\s*/gi, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
          cleanedQuery = filterQueryForSuggestions(cleanedQuery);
          if ($query.length) $query.val(cleanedQuery);
          // ErrorID is a select dropdown - select it and trigger change
          if ($errorId.length) {
            $errorId.val(suggestionId).trigger("change");
          }
        } else {
          const cleanedQuery = filterQueryForSuggestions(q);
          if ($query.length) $query.val(cleanedQuery);
        }
        if ($maxErrors.length) $maxErrors.val(String(maxErrors));
        if ($showHidden.length) $showHidden.prop("checked", showHidden);
        if ($hideActive.length) $hideActive.prop("checked", hideActive);
      }, 100);
    }
  } else {
    // Text search mode - populate the text search form (#formSearchText)
    const $form = $("#formSearchText");
    if ($form.length) {
      // Expand the search accordion if collapsed
      const $accordion = $("a[href='#srch-wrapper']");
      if ($accordion.length && $accordion.hasClass("collapsed")) {
        $accordion.click();
      }

      // Use setTimeout to ensure accordion is expanded and form is ready
      setTimeout(() => {
        const $query = $form.find("[name='Query']");
        const $maxProfiles = $form.find("[name='MaxProfiles']");
        const $format = $form.find("[name='Format']");

        if ($query.length) $query.val(q);
        if ($maxProfiles.length) $maxProfiles.val("500");
        if ($format.length) $format.val(""); // Default to HTML
      }, 100);
    }
  }
}
