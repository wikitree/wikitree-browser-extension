// Relationship chains ("Sarah's father's wife's siblings' bios") written other
// ways, and the parts of a chain step the relation words alone don't carry.

import { shownGender } from "./chat_gender_display";
import { pathRelationship } from "./chat_relationship_data";

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
  const parts = [String(rootLabel || "").trim(), ...hops.map((hop) => String(hop || "").trim())].filter(Boolean);
  // A plural hop takes a bare apostrophe: "Ellen's siblings' children".
  return parts.reduce((text, part, index) => {
    if (!index) return part;
    const previous = parts[index - 1];
    return `${text}${index > 1 && /s$/i.test(previous) ? "'" : "'s"} ${part}`;
  }, "");
}

// "How is Martha Teece related to Philip?" said "Philip is 1 step away from
// Martha. No common ancestor was found." when he was her husband (live,
// 2026-10-04). A short connection path reads better as the chain of relatives.
const PATH_STEP_WORDS = [
  [/spouse|husband|wife/, ["husband", "wife", "spouse"]],
  [/parent|father|mother/, ["father", "mother", "parent"]],
  [/child|son|daughter/, ["son", "daughter", "child"]],
  [/sibling|brother|sister/, ["brother", "sister", "sibling"]],
];

function pathStepWord(person) {
  const type = String(person?.pathType || "").toLowerCase();
  const entry = PATH_STEP_WORDS.find(([pattern]) => pattern.test(type));
  if (!entry) return "";
  const gender = shownGender(person).toLowerCase();
  // A link through BioFather/BioMother: "biological father".
  return `${/^bio(?:parent|child|sibling)/.test(type) ? "biological " : ""}${entry[1][gender === "male" ? 0 : gender === "female" ? 1 : 2]}`;
}

/**
 * Connection path (path[i].pathType = how person i relates to person i-1) as
 * "Philip (Beacall-11) is Martha (Teece-118)'s husband". "" when the path is
 * longer than maxSteps or a step's relation is unknown.
 */
export function describeConnectionPath(path, sourceLabel, targetLabel, maxSteps = 3, relationship = "") {
  const steps = (Array.isArray(path) ? path : []).slice(1);
  if (!steps.length || steps.length > maxSteps) return "";
  const hops = steps.map(pathStepWord);
  if (hops.some((hop) => !hop)) return "";
  const isYou = sourceLabel === "you";
  const chain = isYou ? `your ${hops.join("'s ")}` : describeRelationChain(sourceLabel, hops);
  // With a relationship name from WikiTree: "…'s grandson (his daughter's son)".
  // (a blood line names itself from the path: WikiTree's word can be the source's side, "grandson" for a grandmother)
  const named = (pathRelationship(path)?.phrase || String(relationship || "").trim()).toLowerCase();
  if (named && hops.length > 1 && /^[a-z -]+$/.test(named)) {
    const gender = shownGender(path[0]).toLowerCase();
    const pronoun = isYou ? "your" : gender === "male" ? "his" : gender === "female" ? "her" : "their";
    const owner = isYou ? "your" : `${sourceLabel}'s`;
    return `${targetLabel} is ${owner} ${named} (${pronoun} ${hops.join("'s ")}).`;
  }
  return `${targetLabel} is ${chain}.`;
}

// H4 (live, 2026-10-03): "who were her nieces and nephews?" went to the AI,
// which said they weren't documented. They are the siblings' children; grand-
// and great- forms are left alone. Use as text.replace(NIECE_NEPHEW_RE, nieceNephewToChain).
export const NIECE_NEPHEW_RE = /\b(?:nieces\s+and\s+nephews|nephews\s+and\s+nieces|nieces?|nephews?)\b/gi;
export function nieceNephewToChain(word, offset, text) {
  if (/(?:grand|great)[\s-]*$/i.test(String(text || "").slice(0, offset))) return word;
  if (/and/i.test(word)) return "siblings's children";
  return /^niece/i.test(word) ? "siblings's daughters" : "siblings's sons";
}

// K6 (live, 2026-10-03): "who was her mother-in-law?" opened her own mother's
// bio. In-laws through a spouse or child are relation chains. Brothers- and
// sisters-in-law are two different chains, so they're left alone.
export function rewriteInLawTerms(text) {
  return String(text || "")
    .replace(/\b(mother|father|parent)(s?)[\s-]+in[\s-]+law\b/gi, (_, noun, plural) => `spouse's ${noun.toLowerCase()}${plural}`)
    .replace(/\b(sons?|daughters?|child|children)[\s-]+in[\s-]+law\b/gi, (_, noun) =>
      /^son/i.test(noun) ? "children's husbands" : /^daughter/i.test(noun) ? "children's wives" : "children's spouses"
    );
}

// "Here are children" reads fine; a singular label needs "Here is the grandfather" (live, 2026-10-04: "Here are grandfather for Philip").
export function relationshipListLead(label, count) {
  const text = String(label || "");
  if (/(?:s|children|people|kin)$/i.test(text)) return `Here are ${text}`;
  return count === 1 ? `Here is the ${text}` : `Here are the ${text}s`;
}

/** A table's title: "Children of Charles Darwin (Darwin-15)" (the user, 2026-10-11: not "children for Charles"). */
export function relativesTableTitle(noun, owner) {
  const text = String(noun || "").trim();
  // "Ancestors of Charles Darwin born in England", not "Ancestors born in England of …"
  const split = text.match(/^(.+?)\s+((?:born|died|by|who|whose|living|lived|from|with|that|in)\b.*)$/i);
  const [head, tail] = split ? [split[1], ` ${split[2]}`] : [text, ""];
  return `${head.charAt(0).toUpperCase()}${head.slice(1)} of ${owner}${tail}`;
}

/** "Marguerite's children's bios", "Abraham's parents' bios" (the user, 2026-10-11: not "children bios for"). */
export function relativesBiosTitle(owner, noun) {
  const relatives = /s$/i.test(noun) ? `${noun}'` : `${noun}'s`;
  return `${owner}'s ${relatives} bios`;
}

/**
 * "Found both of Abraham's parents.", "Found Charles's 10 children." (the user, 2026-10-11: "Found 2 parents for
 * Abraham" read oddly). noun is already singular or plural for count.
 */
export function foundRelativesLead(noun, count, firstName) {
  const owner = `${firstName}'s`;
  if (noun === "parents" && count === 2) return `Found both of ${owner} parents.`;
  if (noun === "parent" && count === 1) return `Found one of ${owner} parents.`;
  return `Found ${owner} ${count === 1 ? noun : `${count} ${noun}`}.`;
}

/** 1 → "children", 2 → "grandchildren", 3 → "great-grandchildren", 5 → "3x great-grandchildren". */
export function descendantGenerationWord(degree, count = 2) {
  const one = count === 1;
  const base = one ? "child" : "children";
  if (degree === 1) return base;
  if (degree === 2) return `grand${base}`;
  if (degree === 3) return `great-grand${base}`;
  return `${degree - 2}x great-grand${base}`;
}

/**
 * "How many descendants does Philip have?" listed them under "Here are
 * descendants…" (live, 2026-10-04). The count, generation by generation:
 * "Philip (Beacall-11) has 109 descendants on WikiTree within 10 generations:
 * 11 children, 40 grandchildren, …". rows: kin rows with .degrees.
 */
export function descendantCountMessage(rows, subjectLabel, subjectVerb = "has", generation = 0) {
  const list = Array.isArray(rows) ? rows : [];
  const byDegree = new Map();
  list.forEach((row) => {
    const degree = Number(row?.degrees);
    if (Number.isFinite(degree) && degree >= 1) byDegree.set(degree, (byDegree.get(degree) || 0) + 1);
  });
  const parts = [...byDegree.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([degree, count]) => `${count} ${descendantGenerationWord(degree, count)}`);
  const within = generation ? ` within ${generation} generations` : "";
  const total = `${subjectLabel} ${subjectVerb} ${list.length} descendant${list.length === 1 ? "" : "s"} on WikiTree${within}`;
  return parts.length > 1 ? `${total}: ${parts.join(", ")}.` : `${total}.`;
}
