// Relationship chains ("Sarah's father's wife's siblings' bios") written other
// ways, and the parts of a chain step the relation words alone don't carry.

const RELATION_WORD =
  "(?:fathers?|dads?|mothers?|mums?|moms?|parents?|sons?|daughters?|child(?:ren)?|kids?|wi(?:fe|ves)|husbands?|spouses?|partners?|brothers?|sisters?|siblings?|(?:grand)?(?:aunts?|uncles?)|grand(?:father|mother|parent)s?)";
const ORDINAL_WORD = "(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last|latest|current)";
const RELATION_STEP_RE = new RegExp(`^(?:the\\s+)?(?:${ORDINAL_WORD}\\s+)?${RELATION_WORD}$`, "i");
const ENDS_WITH_RELATION_RE = new RegExp(`'s\\s+(?:${ORDINAL_WORD}\\s+)?${RELATION_WORD}$`, "i");

const ORDINALS = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  last: "last",
  latest: "last",
  current: "last",
};

/**
 * "siblings of the wife of Sarah's father" and "bios of the siblings of
 * Sarah's father's wife" -> "Sarah's father's wife's siblings[ bios]".
 * Only rewrites when every "of" part but the last is a relation word and the
 * last part ends in a possessive relation (so "connection of X" or "bios of
 * Sarah" are left alone). Returns null when there is nothing to rewrite.
 */
export function rewriteOfRelationChain(prompt) {
  const text = String(prompt || "")
    .replace(/[’`]/g, "'")
    .trim();
  const lead = text.match(/^(?:(?:please\s+)?(?:show|list|give|get|open)\s+(?:me\s+)?)?(?:the\s+)?/i)?.[0] || "";
  let body = text.slice(lead.length).replace(/[?.!]+$/, "");
  let wantsBios = false;
  const bioLead = body.match(/^(?:bios?|biograph(?:y|ies)|profiles?)\s+of\s+(?:the\s+)?/i);
  if (bioLead) {
    wantsBios = true;
    body = body.slice(bioLead[0].length);
  }
  const bioTail = body.match(/'?s?\s+(?:bios?|biograph(?:y|ies))$/i);
  if (bioTail) {
    wantsBios = true;
    body = body.slice(0, -bioTail[0].length);
  }

  const parts = body.split(/\s+of\s+(?:the\s+)?/i).map((part) => part.trim());
  if (parts.length < 2 || parts.some((part) => !part)) {
    return null;
  }
  const anchor = parts[parts.length - 1];
  const steps = parts.slice(0, -1);
  if (!steps.every((step) => RELATION_STEP_RE.test(step))) {
    return null;
  }
  if (!ENDS_WITH_RELATION_RE.test(anchor)) {
    return null;
  }

  const chain = [anchor, ...steps.reverse().map((step) => step.replace(/^the\s+/i, ""))].join("'s ");
  return wantsBios ? `${chain}${/s$/i.test(chain) ? "'" : "'s"} bios` : chain;
}

/** "second wife" -> { ordinal: 2, word: "wife" }; "wife" -> { ordinal: null, word: "wife" }. */
export function splitOrdinalFromRelation(segment) {
  const text = String(segment || "").trim();
  const match = text.match(new RegExp(`^(${ORDINAL_WORD})\\s+(.+)$`, "i"));
  if (!match) {
    return { ordinal: null, word: text };
  }
  return { ordinal: ORDINALS[match[1].toLowerCase()] ?? null, word: match[2].trim() };
}

/**
 * Pick the nth spouse by marriage date (undated marriages after dated ones, in
 * the order given). Returns [] when there is no such spouse.
 */
export function pickSpouseByOrdinal(spouses = [], ordinal) {
  const list = Array.isArray(spouses) ? spouses : Object.values(spouses || {});
  if (!ordinal) {
    return list;
  }
  const dateKey = (spouse) => {
    const value = String(spouse?.marriage_date || spouse?.MarriageDate || "").replace(/-/g, "");
    return /^\d{8}$/.test(value) && Number(value) > 0 ? Number(value) : Infinity;
  };
  const ordered = list
    .map((spouse, index) => ({ spouse, index }))
    .sort((a, b) => dateKey(a.spouse) - dateKey(b.spouse) || a.index - b.index)
    .map((entry) => entry.spouse);
  const picked = ordinal === "last" ? ordered[ordered.length - 1] : ordered[ordinal - 1];
  return picked ? [picked] : [];
}

/** "Benny (Cantrell-3638)" + ["father", "wife"] -> "Benny (Cantrell-3638)'s father's wife". */
export function describeRelationChain(rootLabel, hops = []) {
  return [String(rootLabel || "").trim(), ...hops.map((hop) => String(hop || "").trim())]
    .filter(Boolean)
    .join("'s ");
}
