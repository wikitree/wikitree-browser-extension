/*
 * Suggestions Tab functionality for WikiTree+ Query Builder
 * Handles suggestions-specific state, query building, and UI
 */

import { esc, normalizeQuotes, collapseWs, maybeQuote } from "./wikitree_plus_helper_utils.js";
import suggestionsData from "./suggestions.json";

// Constants
const SUGGESTIONS_FIELDS = [
  { id: "WikiTreeID", label: "WikiTreeID", placeholder: "e.g. Darwin-15" },
  { id: "Name", label: "Name", placeholder: "e.g. Charles Darwin" },
  { id: "Country", label: "Country", placeholder: "e.g. England" },
  { id: "Manager", label: "Manager", placeholder: "e.g. Darwin-15" },
  { id: "CatTem", label: "CatTem", placeholder: "e.g. Unsourced_Profiles" },
  { id: "Stars", label: "Stars", placeholder: "e.g. 3stars" },
];

const SUGGESTIONS_LOCATION_FIELDS = [
  { value: "Location", label: "Location (any)" },
  { value: "BirthLocation", label: "BirthLocation" },
  { value: "DeathLocation", label: "DeathLocation" },
  { value: "MarriageLocation", label: "MarriageLocation" },
];

const SUGGESTIONS_MAGIC_WORDS = [
  {
    label: "Core",
    options: [
      { value: "IsInWikiData", label: "IsInWikiData" },
      { value: "Orphan", label: "Orphan" },
      { value: "Guest", label: "Guest" },
      { value: "ProjectManaged", label: "ProjectManaged" },
    ],
  },
  {
    label: "Centuries",
    options: Array.from({ length: 22 }, (_, i) => ({ value: `${i}Cen`, label: `${i}Cen` })),
  },
  {
    label: "Stars",
    options: ["1star", "2stars", "3stars", "4stars", "5stars"].map((val) => ({ value: val, label: val })),
  },
];

// Build suggestions options from the imported JSON data
function buildSuggestionsOptions() {
  const options = [];
  suggestionsData.group_order?.forEach((groupKey) => {
    const group = suggestionsData.groups?.[groupKey];
    if (!group) return;

    const groupLabel = group.title || groupKey;
    const optgroup = {
      label: groupLabel,
      options: [],
    };

    group.suggestion_ids?.forEach((dbeId) => {
      const suggestion = suggestionsData.suggestions?.[dbeId];
      if (!suggestion) return;
      optgroup.options.push({
        value: dbeId,
        label: suggestion.name || dbeId,
        description: suggestion.description || "",
      });
    });

    if (optgroup.options.length > 0) {
      options.push(optgroup);
    }
  });

  return options;
}

// Factory functions
function newSuggestionsRow() {
  return {
    not: false,
    text: "",
    fields: {},
    locationPairs: [{ fieldId: "", value: "" }],
    magicWords: [{ value: "" }],
    errCode: "",
  };
}

function defaultSuggestionsState() {
  return {
    query: "",
    errorId: "",
    showHidden: false,
    hideActive: false,
    maxErrors: "1000",
    groups: [{ rows: [newSuggestionsRow()] }],
    selectedGroupIndex: 0,
  };
}

function ensureSuggestionsState(state) {
  if (!state.suggestions) {
    state.suggestions = defaultSuggestionsState();
    return;
  }

  state.suggestions = {
    query: state.suggestions.query ?? "",
    errorId: state.suggestions.errorId ?? "",
    showHidden: !!state.suggestions.showHidden,
    hideActive: !!state.suggestions.hideActive,
    maxErrors: state.suggestions.maxErrors ?? "1000",
    groups:
      Array.isArray(state.suggestions.groups) && state.suggestions.groups.length
        ? state.suggestions.groups
        : [{ rows: [newSuggestionsRow()] }],
    selectedGroupIndex: Number.isFinite(state.suggestions.selectedGroupIndex)
      ? state.suggestions.selectedGroupIndex
      : 0,
  };

  const gidx = state.suggestions.selectedGroupIndex;
  if (!state.suggestions.groups[gidx]) {
    state.suggestions.selectedGroupIndex = 0;
  }
  state.suggestions.groups.forEach((group) => {
    if (!group.rows || !group.rows.length) {
      group.rows = [newSuggestionsRow()];
    }
    group.rows.forEach((row) => {
      row.not = !!row.not;
      row.text = row.text ?? "";
      row.fields = row.fields || {};
      row.locationPairs = Array.isArray(row.locationPairs) ? row.locationPairs : [{ fieldId: "", value: "" }];
      row.magicWords = Array.isArray(row.magicWords) ? row.magicWords : [{ value: "" }];
      row.errCode = row.errCode ?? "";
      if (!row.locationPairs.length) row.locationPairs.push({ fieldId: "", value: "" });
      if (!row.magicWords.length) row.magicWords.push({ value: "" });
    });
  });
}

// Query building
function buildSuggestionsQuery(state) {
  ensureSuggestionsState(state);
  const groups = state.suggestions.groups.map((group) => {
    const positives = [];
    const negatives = [];

    group.rows.forEach((row) => {
      const rowTerms = [];
      const rowText = collapseWs(normalizeQuotes(row.text || ""));
      if (rowText) rowTerms.push(rowText);

      Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
        const rawVal = collapseWs(normalizeQuotes(value));
        if (!rawVal) return;
        let finalVal = rawVal;
        if (fieldId === "Stars") {
          if (/^\d+$/.test(finalVal)) {
            finalVal = `${finalVal}stars`;
          } else if (/^\d+star$/i.test(finalVal)) {
            finalVal = `${finalVal}s`;
          }
        }
        rowTerms.push(`${fieldId}=${maybeQuote(finalVal)}`);
      });

      if (Array.isArray(row.locationPairs)) {
        row.locationPairs.forEach((pair) => {
          if (pair.fieldId && pair.value) {
            const rawLoc = collapseWs(normalizeQuotes(pair.value));
            if (rawLoc) {
              const term = `${pair.fieldId}=${maybeQuote(rawLoc)}`;
              rowTerms.push(term);
            }
          }
        });
      }

      if (Array.isArray(row.magicWords)) {
        row.magicWords.forEach((entry) => {
          const rawVal = collapseWs(normalizeQuotes(entry?.value || ""));
          if (rawVal) rowTerms.push(rawVal);
        });
      }

      const errRaw = collapseWs(normalizeQuotes(row.errCode || ""));
      if (errRaw) {
        const errVal = /^ERR/i.test(errRaw) ? errRaw : `ERR${errRaw}`;
        rowTerms.push(errVal);
      }

      rowTerms.forEach((term) => {
        if (row.not) {
          negatives.push(term);
        } else {
          positives.push(term);
        }
      });
    });

    let groupStr = "";
    if (positives.length) groupStr += positives.join(" ");
    if (negatives.length) groupStr += (groupStr ? " " : "") + negatives.map((t) => `NOT ${t}`).join(" ");
    return collapseWs(groupStr);
  });

  const query = groups.filter((g) => g).join(" OR ");
  const suggestionId = String(state.suggestions.errorId || "").trim();
  return { query, warnings: [], onlySql: false, suggestionId, infoMessage: "" };
}

function getSuggestionOptions(state) {
  ensureSuggestionsState(state);
  return {
    showHidden: !!state.suggestions.showHidden,
    hideActive: !!state.suggestions.hideActive,
    maxErrors: state.suggestions.maxErrors || "1000",
  };
}

// Extract suggestion ID from query (for legacy parsing)
function extractSuggestionId(queryString) {
  // Simple extraction - looks for DBE-nnn pattern
  const match = queryString.match(/\bDBE-\d+\b/);
  return match ? match[0] : "";
}

export {
  SUGGESTIONS_FIELDS,
  SUGGESTIONS_LOCATION_FIELDS,
  SUGGESTIONS_MAGIC_WORDS,
  buildSuggestionsOptions,
  newSuggestionsRow,
  defaultSuggestionsState,
  ensureSuggestionsState,
  buildSuggestionsQuery,
  getSuggestionOptions,
  extractSuggestionId,
};
