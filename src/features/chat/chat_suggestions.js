// Follow-up buttons under an AI answer (2026-10-08). The AI writes them, so
// some led nowhere: "show Weatherall-111's family tree chart" and "show John
// Theodore Weatherall's (Weatherall-113) bio" were sent straight back to the
// AI, which said it couldn't. Each suggestion is now tidied, checked against
// what Genie's own code answers, and dropped if nothing takes it; the gaps are
// filled with requests on the same topic that are known to work.

import { ChatIntent, routeChatPrompt } from "./chat_router";

const ID = String.raw`[A-Z][A-Za-z'_-]*-\d+`;

// Every word of a relation the relatives code can walk ("father's wife's siblings", "2nd cousins once removed").
const KIN_WORD =
  /^(?:mothers?|fathers?|mums?|moms?|dads?|parents?|sisters?|brothers?|siblings?|daughters?|sons?|child|children|kids?|wife|wives|husbands?|spouses?|partners?|aunts?|uncles?|nieces?|nephews?|cousins?|grand\w*|great|step\w*|half|in-?laws?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|\d+(?:st|nd|rd|th)|\d+x|once|twice|thrice|removed|full|older|younger|eldest|oldest|youngest|other|all|of|and|the|known|living)$/i;

function isKinRelation(relationRaw) {
  const words = String(relationRaw || "")
    .toLowerCase()
    .replace(/['’]s?\b/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  return words.length > 0 && words.every((word) => KIN_WORD.test(word));
}

/** "show John Weatherall's (Weatherall-113) bio" → "show Weatherall-113's bio". */
export function tidySuggestion(text) {
  return String(text || "")
    .replace(/[`*]/g, "")
    .replace(new RegExp(String.raw`\b[A-Z][\w.'’-]*(?:\s+[A-Z(][\w.'’()-]*){0,5}['’]s\s+\((${ID})\)`, "g"), "$1's")
    .replace(new RegExp(String.raw`\b[A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,5}\s+\((${ID})\)`, "g"), "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!]+$/, "");
}

// A bio request for a WikiTree ID or the profile person ("show Smith-1's bio"):
// the bio handler takes these before the router.
const BIO_RE = new RegExp(String.raw`^(?:(?:show|read|open)\s+(?:me\s+)?)?(?:${ID}|his|her|their)['’]s?\s+(?:bio|biography)$`, "i");
const SEARCH_LEAD_RE = /^(?:find|search|look\s+(?:up|for)|list|who\s+(?:was|were|is|are)|profiles?\b|people\b)/i;

/** True when Genie's own code, not the AI, would answer this request. */
export function suggestionRunsLocally(text, route = routeChatPrompt) {
  if (BIO_RE.test(text)) return true;
  let routed;
  try {
    routed = route(text, {});
  } catch (error) {
    return false;
  }
  const intent = routed?.intent;
  // A button starts a new search, so there's no earlier result to filter.
  if (!intent || intent === ChatIntent.FALLBACK_AI || intent === ChatIntent.LAST_RESULT_OPERATION) return false;
  if (intent === ChatIntent.RELATION_COUNT) {
    const params = routed.params || {};
    return Boolean(params.cousinDegree || params.allCousins || isKinRelation(params.relationRaw));
  }
  // A name search takes almost anything; keep only what reads as one.
  if (intent === ChatIntent.PROFILE_SEARCH) return SEARCH_LEAD_RE.test(text);
  return true;
}

/** The form of a suggestion that runs locally ("show X's family tree chart" → "X's family tree chart"), or "". */
export function workingSuggestion(text, route = routeChatPrompt) {
  const tidy = tidySuggestion(text);
  if (!tidy) return "";
  const bare = tidy.replace(/^(?:please\s+)?(?:show|display|open|give)\s+(?:me\s+)?/i, "");
  const variants = [tidy, bare, `show ${bare}`];
  return variants.find((variant) => variant && suggestionRunsLocally(variant, route)) || "";
}

// Requests on the topic of the question, for the person it was about. Every
// form here is checked in the tests.
const TOPICS = [
  {
    re: /\bancest|\bforebears?\b|\bgenerations?\b|\bgrand(?:parents?|father|mother)|\bpedigree\b|\bfamily\s+tree\b|\bearliest\b|\boldest\b|\bhow\s+far\s+back\b/i,
    prompts: (id) => [`how many ancestors does ${id} have`, `${id}'s fan chart`, `${id}'s lifespans`],
  },
  {
    re: /\bdescend|\bgrandchild|\bgreat-grandchild|\boffspring\b|\bliving\s+relatives\b/i,
    prompts: (id) => [`how many descendants does ${id} have`, `${id}'s descendant chart`, `${id}'s descendant map`],
  },
  {
    re: /\bsources?\b|\bcitations?\b|\bevidence\b|\bproof\b|\brecords?\b|\bcensus\b/i,
    prompts: (id) => [`show ${id}'s sources`, `${id}'s DNA confirmed chart`, `${id}'s family timeline`],
  },
  {
    re: /\brelated\b|\bconnect|\bcousins?\b|\brelationship\b/i,
    prompts: (id) => [`my connection to ${id}`, `${id}'s relationship chart`, `${id}'s family explorer`],
  },
  {
    re: /\bwhere\b|\bmigrat|\bemigrat|\bimmigrat|\bmoved?\b|\bcountr(?:y|ies)\b|\bplaces?\b|\blived\b|\bsettled\b/i,
    prompts: (id) => [`map ${id}'s ancestors`, `${id}'s descendant map`, `${id}'s family timeline`],
  },
  {
    re: /\bhistory\b|\bwars?\b|\bevents?\b|\bera\b|\bperiod\b|\bcentury\b/i,
    prompts: (id) => [`what history did ${id} live through`, `${id}'s life line`, `${id}'s ancestors in history`],
  },
  {
    re: /\bsiblings?\b|\bbrothers?\b|\bsisters?\b|\bchildren\b|\bkids\b|\bwife\b|\bhusband\b|\bspouses?\b|\bmarri|\bfamily\b/i,
    prompts: (id) => [`${id}'s family timeline`, `${id}'s relationship chart`, `${id}'s family calendar`],
  },
];
const DEFAULT_PROMPTS = (id) => [`how many ancestors does ${id} have`, `${id}'s family timeline`, `${id}'s family explorer`];

/** Topic requests for a question about one person (a WikiTree ID), most relevant first. */
export function topicSuggestions(question, id) {
  if (!new RegExp(`^${ID}$`).test(String(id || ""))) return [];
  const topic = TOPICS.find((entry) => entry.re.test(String(question || "")));
  return [...(topic ? topic.prompts(id) : []), ...DEFAULT_PROMPTS(id)];
}

/**
 * The follow-ups to show: the AI's that run locally (tidied), then topic
 * requests until there are `want`. question: what the user asked; id: the
 * person it was about.
 */
export function vetSuggestions(suggestions, { question = "", id = "", want = 2, max = 3, route = routeChatPrompt } = {}) {
  const chosen = [];
  const seen = new Set();
  const add = (text) => {
    const key = text.toLowerCase().replace(/^show\s+/, "");
    if (!text || seen.has(key) || chosen.length >= max) return;
    seen.add(key);
    chosen.push(text);
  };
  for (const suggestion of suggestions || []) add(workingSuggestion(suggestion, route));
  for (const prompt of topicSuggestions(question, id)) {
    if (chosen.length >= want) break;
    if (suggestionRunsLocally(prompt, route)) add(prompt);
  }
  return chosen;
}
