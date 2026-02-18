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
  let match = q.match(/(?:^|\s)(?:suggestions?|errorid)=(\d+)/i);
  if (match) return match[1];

  match = q.match(/Suggestions\s*=\s*(\d+)/i);
  if (match) return match[1];

  match = q.match(/Suggestions\s*=\s*"([^"]+)"/i);
  if (match) {
    const firstId = match[1].trim().split(/\s+/)[0];
    return firstId || "";
  }

  return "";
}

// Internal helper - creates the URL object
function createUrl(query, searchType, includeRender, suggestionId = "") {
  const u = new URL(WTPLUS_BASE);
  if (searchType === "suggestions") {
    u.searchParams.set("report", "err6");
    const resolvedSuggestionId = suggestionId || extractSuggestionId(query);
    if (resolvedSuggestionId) {
      u.searchParams.set("ErrorID", resolvedSuggestionId);
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
export function buildPlusUrl(query, searchType, includeRender = false, suggestionId = "") {
  const u = createUrl(query, searchType, includeRender, suggestionId);
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

        if (suggestionId) {
          // Remove the suggestions=XXX part from the query
          const cleanedQuery = q.replace(/(?:suggestions?|errorid)=\d+\s*/gi, "").trim();
          if ($query.length) $query.val(cleanedQuery);
          // ErrorID is a select dropdown - select it and trigger change
          if ($errorId.length) {
            $errorId.val(suggestionId).trigger("change");
          }
        } else {
          if ($query.length) $query.val(q);
        }
        if ($maxErrors.length) $maxErrors.val("1000");
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
