/*
 * Query parsing for WikiTree+ Query Builder
 * Parses query strings back into state structure
 */

import { extractSuggestionId } from "./wikitree_plus_helper_suggestions.js";

function parseQueryToState(queryString, searchType) {
  // Parse a query string back into state structure
  if (searchType === "suggestions") {
    // For suggestions, we mainly store the raw query
    return {
      searchType: "suggestions",
      groups: [],
      suggestions: {
        query: queryString,
        errorId: extractSuggestionId(queryString),
      },
    };
  }

  // For text search, tokenize and parse into groups
  const tokens = tokenizeQuery(queryString);
  const groups = [];
  let currentGroup = { rows: [] };
  let currentRow = { not: false, fields: {}, multiFields: {}, sqlConditions: [] };

  tokens.forEach((token) => {
    if (token.type === "OR") {
      if (currentRow.fields && Object.keys(currentRow.fields).length > 0) {
        currentGroup.rows.push(currentRow);
        currentRow = { not: false, fields: {}, multiFields: {}, sqlConditions: [] };
      }
      if (currentGroup.rows.length > 0) {
        groups.push(currentGroup);
        currentGroup = { rows: [] };
      }
    } else if (token.type === "NOT") {
      currentRow.not = true;
    } else if (token.type === "term") {
      const identified = identifyRawTerm(token.value);
      if (identified.fieldId) {
        currentRow.fields[identified.fieldId] = identified.value;
      }
    }
  });

  if (currentRow.fields && Object.keys(currentRow.fields).length > 0) {
    currentGroup.rows.push(currentRow);
  }
  if (currentGroup.rows.length > 0) {
    groups.push(currentGroup);
  }

  if (groups.length === 0) {
    groups.push({ rows: [{ not: false, fields: {}, multiFields: {}, sqlConditions: [] }] });
  }

  return {
    searchType: "text",
    groups,
    selectedGroupIndex: 0,
  };
}

function tokenizeQuery(str) {
  const tokens = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i++;
      continue;
    }

    // Check for OR
    if (str.substr(i, 3).toUpperCase() === " OR" && (i + 3 >= str.length || /\s/.test(str[i + 3]))) {
      tokens.push({ type: "OR" });
      i += 3;
      continue;
    }

    // Check for NOT
    if (str.substr(i, 4).toUpperCase() === "NOT " || (i === 0 && str.substr(i, 3).toUpperCase() === "NOT")) {
      tokens.push({ type: "NOT" });
      i += str.substr(i, 4).toUpperCase() === "NOT " ? 4 : 3;
      continue;
    }

    // Read a value or term
    const result = readValue(str, i);
    if (result) {
      tokens.push({ type: "term", value: result.value });
      i = result.nextIndex;
    } else {
      const termResult = readRawTerm(str, i);
      tokens.push({ type: "term", value: termResult.value });
      i = termResult.nextIndex;
    }
  }

  return tokens;
}

function readValue(str, startIndex) {
  let i = startIndex;
  const quot = str[i];
  if (quot !== '"' && quot !== "'") return null;

  i++;
  let val = "";
  while (i < str.length) {
    const ch = str[i];
    if (ch === quot) {
      i++;
      return { value: val, nextIndex: i };
    }
    if (ch === "\\") {
      i++;
      if (i < str.length) {
        val += str[i];
        i++;
      }
    } else {
      val += ch;
      i++;
    }
  }
  return { value: val, nextIndex: i };
}

function readRawTerm(str, startIndex) {
  let i = startIndex;
  let term = "";
  while (i < str.length) {
    const ch = str[i];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      break;
    }
    term += ch;
    i++;
  }
  return { value: term, nextIndex: i };
}

function identifyRawTerm(term) {
  // Try to identify field=value pattern
  const eqIndex = term.indexOf("=");
  if (eqIndex > 0) {
    const fieldId = term.substring(0, eqIndex);
    const value = term.substring(eqIndex + 1);
    return { fieldId, value };
  }

  // Return as-is for magic words and other terms
  return { fieldId: null, value: term };
}

export { parseQueryToState, tokenizeQuery, readValue, readRawTerm, identifyRawTerm };
