/**
 * Utility functions for WikiTree+ Query Builder
 */

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeQuotes(s) {
  return String(s ?? "")
    .replaceAll("\u201C", '"')
    .replaceAll("\u201D", '"')
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'");
}

export function collapseWs(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function maybeQuote(val) {
  const str = String(val ?? "").trim();
  return /\s/.test(str) ? `"${str}"` : str;
}

export function shortenPlaceholder(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  let short = t.split(" e.g.")[0].split(" (e.g.")[0].split(" (")[0].trim();
  if (!short) short = t;
  const maxLen = 24;
  if (short.length > maxLen) short = `${short.slice(0, maxLen - 3).trim()}...`;
  return short;
}
