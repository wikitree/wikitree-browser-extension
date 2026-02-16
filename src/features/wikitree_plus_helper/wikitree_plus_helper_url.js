/**
 * URL and form building for WikiTree+ searches
 * Consolidates query building and form population logic
 */

const WTPLUS_BASE = "https://plus.wikitree.com/default.htm";
const DEFAULT_REPORT = "srch1";

export function extractSuggestionId(query) {
  const q = String(query || "").trim();
  if (!q) return "";
  // Only extract ErrorID if explicitly formatted as "suggestions=123" or "errorid=123"
  // Plain numbers like "123456" should be treated as profile IDs → Query parameter
  const match = q.match(/(?:^|\s)(?:suggestions?|errorid)=(\d+)/i);
  return match ? match[1] : "";
}

// Internal helper - creates the URL object
function createUrl(query, searchType, includeRender) {
  const u = new URL(WTPLUS_BASE);
  if (searchType === "suggestions") {
    u.searchParams.set("report", "err6");
    const suggestionId = extractSuggestionId(query);
    if (suggestionId) {
      u.searchParams.set("ErrorID", suggestionId);
      // Remove the suggestions=XXX part from the query string
      const cleanedQuery = query.replace(/(?:suggestions?|errorid)=\d+\s*/gi, "").trim();
      if (cleanedQuery) {
        u.searchParams.set("Query", cleanedQuery);
      }
    } else if (query) {
      u.searchParams.set("Query", query);
    }
    u.searchParams.set("MaxErrors", "1000");
    if (includeRender) {
      u.searchParams.set("render", "1");
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
export function buildPlusUrl(query, searchType, includeRender = false) {
  const u = createUrl(query, searchType, includeRender);
  return u.toString();
}

// Exported version for form population
export function populatePlusForm(query, searchType, $) {
  const q = String(query || "").trim();
  if (!q) return;

  if (searchType === "suggestions") {
    // Suggestions mode - populate the suggestions form (#formSuggestionsAll)
    const $form = $("#formSuggestionsAll");
    if ($form.length) {
      const suggestionId = extractSuggestionId(q);
      const $query = $form.find("[name='Query']");
      const $maxErrors = $form.find("[name='MaxErrors']");
      
      if (suggestionId) {
        // Remove the suggestions=XXX part from the query
        const cleanedQuery = q.replace(/(?:suggestions?|errorid)=\d+\s*/gi, "").trim();
        if ($query.length) $query.val(cleanedQuery);
      } else {
        if ($query.length) $query.val(q);
      }
      if ($maxErrors.length) $maxErrors.val("1000");
    }
  } else {
    // Text search mode - populate the text search form (#formSearchText)
    const $form = $("#formSearchText");
    if ($form.length) {
      const $query = $form.find("[name='Query']");
      const $maxProfiles = $form.find("[name='MaxProfiles']");
      const $format = $form.find("[name='Format']");
      
      if ($query.length) $query.val(q);
      if ($maxProfiles.length) $maxProfiles.val("500");
      if ($format.length) $format.val("");  // Default to HTML
    }
  }
}

