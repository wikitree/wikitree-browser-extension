export const PERSON_MEMORY_ALIAS_STOPWORDS = new Set([
  // Conversational replies — never person names. Without these a bare "Sure."
  // or "Yes" looks like a plausible surname and gets run as a profile search.
  "sure",
  "yes",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "nope",
  "nah",
  "thanks",
  "please",
  "alright",
  "absolutely",
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

// A remembered nickname followed by another name word is the start of a
// different full name: "Stephen Fry" is not the remembered "Stephen" (Alfred
// Stephen Fry, live 2026-10-03). The next word counts as a name when it is
// capitalized, or when it belongs to the remembered person's own name
// ("stephen fry" typed in lower case), including the surname in its WikiTree ID.
export function aliasStartsLongerName(prompt, aliasRegex, rememberedDisplayName = "", rememberedWtId = "") {
  const text = String(prompt || "");
  const match = aliasRegex?.exec(text);
  if (!match) return false;
  const nextWord = (text.slice(match.index + match[0].length).match(/^\s+([\p{L}][\p{L}\p{M}'’-]*)/u) || [])[1];
  if (!nextWord || PERSON_MEMORY_ALIAS_STOPWORDS.has(nextWord.toLowerCase())) return false;
  if (/^\p{Lu}/u.test(nextWord)) return true;
  // The display name can lack the surname ("Alfred Stephen"); the WikiTree ID
  // (Fry-6447) carries it.
  const nameTokens = normalizePersonMemoryToken(
    `${rememberedDisplayName} ${String(rememberedWtId || "").replace(/-\d+$/, "")}`
  ).split(" ");
  return nameTokens.includes(normalizePersonMemoryToken(nextWord));
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

const POSSESSIVE_RE = /['’]s?(?:\s|$)/;

export function extractAliasCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }

  if (!isLikelyPersonAliasLabel(raw)) {
    return [];
  }
  // "Calvin's father" names Calvin's relative: neither it nor "Calvin's" is a
  // name for that relative (live, 2026-10-03).
  if (POSSESSIVE_RE.test(raw)) {
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

// Rewrites a remembered alias in the prompt to the remembered person's name,
// so later handlers resolve the same profile. Moved from chat.js for testing.
export function rewritePromptWithRememberedPerson(prompt, person) {
  const wtId = String(person.wtId || "").trim();
  const replacement = sanitizeResolvedPersonDisplayName(person.displayName || "", wtId);
  if (!wtId || !replacement) {
    return { prompt, changed: false, matchedAlias: "", person: null };
  }

  const sourcePrompt = String(prompt || "");
  if (!sourcePrompt.trim()) {
    return { prompt: sourcePrompt, changed: false, matchedAlias: "", person: null };
  }

  if (new RegExp(`\\b${escapeRegExp(wtId)}\\b`, "i").test(sourcePrompt)) {
    return { prompt: sourcePrompt, changed: false, matchedAlias: "", person };
  }

  const aliasVariants = Array.isArray(person.aliases) ? person.aliases.slice() : [];
  aliasVariants.sort((left, right) => String(right || "").length - String(left || "").length);

  // Text a longer alias already matched and declined to rewrite: a shorter
  // alias inside it ("Fry" inside "stephen fry") is the same mention.
  const declinedSpans = [];
  const insideDeclinedSpan = (start, end) => declinedSpans.some(([from, to]) => start >= from && end <= to);
  const surname = normalizePersonMemoryToken(wtId.replace(/-\d+$/, ""));

  for (const alias of aliasVariants) {
    const cleanedAlias = String(alias || "").trim();
    if (!cleanedAlias || cleanedAlias.length < 3) {
      continue;
    }
    // A bare surname names a family, not this person; a possessive (stored
    // before extractAliasCandidates refused them) names someone else's relative.
    if (normalizePersonMemoryToken(cleanedAlias) === surname || POSSESSIVE_RE.test(cleanedAlias)) {
      continue;
    }
    const aliasRegex = buildResolvedAliasRegex(cleanedAlias);
    if (!aliasRegex) {
      continue;
    }
    const match = aliasRegex.exec(sourcePrompt);
    if (!match) {
      continue;
    }
    const span = [match.index, match.index + match[0].length];
    if (insideDeclinedSpan(...span)) {
      continue;
    }
    // Never swap in a name that says less than what was typed: "Stephen Fry"
    // remembered for Fry-2606 (display name "Stephen") became "Stephen", which
    // then matched another remembered Stephen (live, 2026-10-03).
    const aliasTokens = new Set(normalizePersonMemoryToken(cleanedAlias).split(" "));
    if (
      aliasStartsLongerName(sourcePrompt, aliasRegex, person.displayName, wtId) ||
      normalizePersonMemoryToken(replacement)
        .split(" ")
        .every((token) => aliasTokens.has(token))
    ) {
      declinedSpans.push(span);
      continue;
    }
    const nextPrompt = sourcePrompt.replace(aliasRegex, replacement);
    if (nextPrompt !== sourcePrompt) {
      return { prompt: nextPrompt, changed: true, matchedAlias: cleanedAlias, person };
    }
  }

  return { prompt: sourcePrompt, changed: false, matchedAlias: "", person };
}
