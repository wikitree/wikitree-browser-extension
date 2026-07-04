export const PERSON_MEMORY_ALIAS_STOPWORDS = new Set([
  "about",
  "after",
  "all",
  "also",
  "ancestor",
  "ancestors",
  "and",
  "answer",
  "any",
  "are",
  "because",
  "before",
  "between",
  "bio",
  "bios",
  "biography",
  "biographies",
  "can",
  "cant",
  "children",
  "connection",
  "connections",
  "count",
  "cousin",
  "cousins",
  "current",
  "descendant",
  "descendants",
  "distance",
  "does",
  "family",
  "find",
  "first",
  "for",
  "found",
  "fourth",
  "from",
  "grandchild",
  "grandchildren",
  "grandparent",
  "grandparents",
  "great",
  "has",
  "have",
  "here",
  "identify",
  "in",
  "is",
  "list",
  "lookup",
  "many",
  "match",
  "matches",
  "mode",
  "name",
  "not",
  "of",
  "only",
  "parent",
  "parents",
  "person",
  "people",
  "profile",
  "profiles",
  "relationship",
  "relationships",
  "relative",
  "relatives",
  "removed",
  "result",
  "results",
  "search",
  "second",
  "seventh",
  "show",
  "sibling",
  "siblings",
  "sixth",
  "spouse",
  "spouses",
  "summary",
  "that",
  "the",
  "their",
  "there",
  "these",
  "third",
  "those",
  "through",
  "times",
  "try",
  "up",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "without",
  "yet",
  "you",
  "your",
]);

export function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildResolvedAliasRegex(alias, options = {}) {
  const escapedAlias = escapeRegExp(alias);
  if (!escapedAlias) {
    return null;
  }

  const disallowPossessive = options?.disallowPossessive !== false;
  const possessiveGuard = disallowPossessive ? "(?!['’]s\\b)" : "";
  return new RegExp(`\\b${escapedAlias}\\b${possessiveGuard}`, "i");
}

export function normalizePersonMemoryToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isWikiTreeId(value) {
  return /^[A-Za-z][A-Za-z0-9_-]+-\d{1,7}$/i.test(String(value || "").trim());
}

export function isLikelyPersonAliasLabel(value) {
  const normalized = normalizePersonMemoryToken(value);
  if (!normalized) {
    return false;
  }

  if (isWikiTreeId(value)) {
    return true;
  }

  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length || tokens.length > 5) {
    return false;
  }

  return !tokens.some((token) => PERSON_MEMORY_ALIAS_STOPWORDS.has(token));
}

export function sanitizeResolvedPersonDisplayName(value, fallback = "") {
  const raw = String(value || "").trim();
  if (isLikelyPersonAliasLabel(raw)) {
    return raw;
  }

  return String(fallback || "").trim();
}

export function extractAliasCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }

  if (!isLikelyPersonAliasLabel(raw)) {
    return [];
  }

  const candidates = new Set([raw]);
  raw
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
    .filter((part) => part.length >= 3 && !PERSON_MEMORY_ALIAS_STOPWORDS.has(normalizePersonMemoryToken(part)))
    .forEach((part) => candidates.add(part));

  return Array.from(candidates);
}

export function extractResolvedPeopleFromMessage(text) {
  const sourceText = String(text || "");
  if (!sourceText) {
    return [];
  }

  const matches = [];
  const seen = new Set();
  const pattern = /([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{1,60}?)\s*\(([A-Za-z][A-Za-z0-9_-]+-\d{1,7})\)/g;
  let match;

  while ((match = pattern.exec(sourceText)) !== null) {
    const displayName = String(match[1] || "").trim();
    const wtId = String(match[2] || "").trim();
    if (!wtId || !extractAliasCandidates(displayName).length) {
      continue;
    }

    const dedupeKey = `${displayName}::${wtId}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    matches.push({ displayName, wtId });
  }

  return matches;
}
