import { stripSurroundingQuotes, parseScopeTerms } from "./chat_filter_scope";

export function parseMarriedNoChildrenPrompt(queryText) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
    .replace(/^\s*(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  const patterns = [
    /^(.+?)\s+married\s+but\s+no\s+children(?:\s+listed)?$/i,
    /^(.+?)\s+married\s+with\s+no\s+children(?:\s+listed)?$/i,
  ];

  let scopeText = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }
    scopeText = stripSurroundingQuotes(match[1]);
    break;
  }

  if (!scopeText) {
    return null;
  }

  const { locationText, startYear, endYear, yearLabel } = parseScopeTerms(scopeText);
  if (!locationText && !Number.isFinite(startYear) && !Number.isFinite(endYear)) {
    return null;
  }

  const scopeParts = [];
  if (locationText) {
    scopeParts.push(locationText);
  }
  if (yearLabel) {
    scopeParts.push(yearLabel);
  }
  const scopeLabel = scopeParts.length ? `${scopeParts.join(" ")} profiles` : "profiles";

  return {
    locationText,
    startYear,
    endYear,
    yearLabel,
    understood: `${scopeLabel} married but with no children listed`,
  };
}

export function isLikelyMarriedNoChildrenPrompt(queryText) {
  return parseMarriedNoChildrenPrompt(queryText) !== null;
}
