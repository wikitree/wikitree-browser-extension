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
  // "people with the surname Alley" became "…surname Ellen": Alley is Ellen
  // (Cook) Alley's married name (live I9, 2026-10-03). The last word of a name
  // of three or more words is a surname, and so is a word introduced as one.
  const fullName =
    [person.displayName, ...aliasVariants]
      .map((value) => normalizePersonMemoryToken(value))
      .sort((left, right) => right.split(" ").length - left.split(" ").length)[0] || "";
  const fullTokens = fullName.split(" ").filter(Boolean);
  const lastSurname = fullTokens.length >= 3 ? fullTokens[fullTokens.length - 1] : "";
  const SURNAME_CONTEXT_RE = /\b(?:(?:sur|last|family|maiden)\s*names?|named|called)\s+(?:(?:of|is|was|=)\s+)?$/i;

  for (const alias of aliasVariants) {
    const cleanedAlias = String(alias || "").trim();
    if (!cleanedAlias || cleanedAlias.length < 3) {
      continue;
    }
    // A bare surname names a family, not this person; a possessive (stored
    // before extractAliasCandidates refused them) names someone else's relative.
    const aliasToken = normalizePersonMemoryToken(cleanedAlias);
    if (aliasToken === surname || POSSESSIVE_RE.test(cleanedAlias)) {
      continue;
    }
    if (!aliasToken.includes(" ") && lastSurname && aliasToken === lastSurname) {
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
    if (
      !aliasToken.includes(" ") &&
      (SURNAME_CONTEXT_RE.test(sourcePrompt.slice(0, match.index)) ||
        /^\s*(?:family|line|surname|clan)\b/i.test(sourcePrompt.slice(span[1])))
    ) {
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

// The person the last answer was about: exactly one WikiTree ID in the message
// and no multi-row table. "Abraham (Lincoln-103) is 21 steps away" → Lincoln-103;
// a list of ancestors → null.
export function pickAnswerSubject(messageText, table = null) {
  if (Array.isArray(table?.rows) && table.rows.length > 1) return null;
  const people = extractResolvedPeopleFromMessage(messageText);
  const ids = [...new Set(people.map((person) => person.wtId))];
  return ids.length === 1 ? people.find((person) => person.wtId === ids[0]) : null;
}

// Who "he"/"she" means next (user, 2026-10-10): the profile person until the user names someone.
// An answer about one person only becomes the subject when the question named that person (their
// ID, or a capitalised word of their name: "his son John" → John Weatherall). A question naming
// nobody ("where was his father born?") keeps the subject as it was; one naming someone else
// clears it, back to the profile person.
const WIKITREE_ID_IN_PROMPT = /\b[A-Za-z][A-Za-z'_-]*-\d{1,7}\b/;
export function promptNamesSomeone(prompt) {
  const text = String(prompt || "").trim();
  if (WIKITREE_ID_IN_PROMPT.test(text)) return true;
  // a capitalised word that isn't the first word or "I"
  return text
    .split(/\s+/)
    .slice(1)
    .some((word) => /^[A-Z][a-z'-]+(?:'s)?[?,.!]*$/.test(word) && !/^I(?:'[a-z]+)?$/.test(word));
}

export function promptNamesPerson(prompt, person) {
  const text = String(prompt || "");
  if (!person?.wtId) return false;
  if (text.toLowerCase().includes(person.wtId.toLowerCase())) return true;
  const words = String(person.displayName || "")
    .split(/[\s()]+/)
    .filter((word) => /^[A-Z][A-Za-z'-]{2,}$/.test(word));
  return words.some((word) => new RegExp(`\\b${word}(?:'s)?\\b`).test(text));
}

export function nextAnswerSubject(previous, candidate, userPrompt) {
  if (candidate && promptNamesPerson(userPrompt, candidate)) return candidate;
  if (promptNamesSomeone(userPrompt)) return null;
  return previous || null;
}

// "his wife" right after an answer about Lincoln → "Lincoln-103's wife". The
// pronoun must fit the person's gender ("her" never means Lincoln); otherwise
// the prompt is unchanged and the profile person applies.
export function rewritePronounToSubject(prompt, subject, gender = "") {
  const text = String(prompt || "");
  const match = text.match(/\b(his|her|their)\s+(?=[A-Za-z])/i);
  if (!match || !subject?.wtId) return { changed: false, prompt: text };
  const pronoun = match[1].toLowerCase();
  const personGender = String(gender || "").toLowerCase();
  const fits = pronoun === "their" || (pronoun === "his" ? personGender === "male" : personGender === "female");
  if (!fits) return { changed: false, prompt: text };
  return {
    changed: true,
    prompt: `${text.slice(0, match.index)}${subject.wtId}'s ${text.slice(match.index + match[0].length)}`,
  };
}
