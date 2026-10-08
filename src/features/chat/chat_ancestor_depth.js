// S10 (live, 2026-10-03): "how many generations of ancestors does she have?" went
// to the AI, which read only the parents off the bio. The ancestor list knows
// each row's generation (degrees); this reports how far back it reaches.

import { ancestorGenerationLabel as generationLabel } from "./chat_kin_labels";
export { ancestorGenerationLabel as generationLabel } from "./chat_kin_labels";
const OWNER = String.raw`(my|our|her|his|their|this\s+profile['’]s|[A-Z][A-Za-z'_ -]*-\d+['’]s)`;
const SUBJECT = String.raw`(I|we|she|he|they|this\s+person|[A-Z][A-Za-z'_ -]*-\d+)`;
const PATTERNS = [
  // "how many generations of ancestors does she have", "how many generations back do I go"
  new RegExp(String.raw`^how\s+many\s+generations(?:\s+of\s+ancestors)?(?:\s+back)?\s+(?:does|do|can)\s+${SUBJECT}\s+(?:have|go(?:\s+back)?|trace(?:\s+back)?)(?:\s+on\s+wikitree)?$`, "i"),
  new RegExp(String.raw`^how\s+many\s+generations\s+(?:back\s+)?(?:does|do)\s+${OWNER}\s+(?:(?:family\s+)?tree|ancestry|ancestors)\s+(?:go(?:\s+back)?|have|reach)$`, "i"),
  // "how far back does her tree go", "how deep is my family tree"
  new RegExp(String.raw`^how\s+far\s+back\s+(?:does|do)\s+${OWNER}\s+(?:(?:family\s+)?tree|ancestry|ancestors|line)\s+go$`, "i"),
  new RegExp(String.raw`^how\s+deep\s+is\s+${OWNER}\s+(?:(?:family\s+)?tree|ancestry)$`, "i"),
];

// "I", "his", "Cook-8721" → the owner word parseAncestorListPrompt takes.
function ownerWord(word) {
  if (/^(?:I|me|we|us|my|our)$/i.test(word)) return "my";
  if (/^(?:she|her)$/i.test(word)) return "her";
  if (/^(?:he|him|his)$/i.test(word)) return "his";
  if (/^(?:they|them|their|this\s+person|this\s+profile['’]s)$/i.test(word)) return "their";
  return /['’]s$/.test(word) ? word : `${word}'s`;
}

/** The owner word for parseAncestorListPrompt ("my", "her", "Cook-8721's"), or null. */
export function parseAncestorDepthOwner(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of PATTERNS) {
    const match = t.match(re);
    if (match) return ownerWord(match[1]);
  }
  return null;
}

// Live, 2026-10-08 (on the Ancestors tab): "how many direct ancestors does he
// have? What is the earliest birthdate, and how many generations back is that
// ancestor?" went to the AI, which had only the bio. One summary answers the
// count, the depth and the earliest birth together.
const QUALIFIERS = String.raw`(?:(?:direct|known|recorded|documented|direct[\s-]line|total)\s+)*`;
const SUMMARY_PATTERNS = [
  // "how many direct ancestors does he have (on WikiTree)", "how many ancestors do I have"
  new RegExp(String.raw`^how\s+many\s+${QUALIFIERS}ancestors\s+(?:does|do|did)\s+${SUBJECT}\s+have(?:\s+(?:on|in)\s+wikitree)?$`, "i"),
  // "how many ancestors are in his tree", "how many ancestors are there in my family tree"
  new RegExp(String.raw`^how\s+many\s+${QUALIFIERS}ancestors\s+(?:are|is)\s+(?:there\s+)?(?:in|on)\s+${OWNER}\s+(?:family\s+)?tree$`, "i"),
  // "how many of his ancestors are known / on WikiTree"
  new RegExp(String.raw`^how\s+many\s+of\s+${OWNER}\s+${QUALIFIERS}ancestors\s+(?:are|have\s+been)\s+(?:known|recorded|identified|found|on\s+wikitree)$`, "i"),
  // "count his ancestors", "number of my ancestors", "his ancestor count"
  new RegExp(String.raw`^(?:count|number\s+of)\s+${OWNER}\s+${QUALIFIERS}ancestors$`, "i"),
  new RegExp(String.raw`^${OWNER}\s+ancestor\s+(?:count|summary|totals?)$`, "i"),
];
// Several questions in one prompt: an ancestor word plus at least two of these.
const SUMMARY_ASKS = [
  /\bhow\s+many\s+(?:of\s+\S+\s+)?(?:(?:direct|known|recorded|documented|total)\s+)*ancestors\b|\b(?:count|number|total)\s+of\b.*\bancestors\b/i,
  /\b(?:earliest|oldest|first)\s+(?:known\s+)?(?:birth|born|ancestor|date)|\bborn\s+(?:the\s+)?earliest\b|\bwho\s+was\s+born\s+first\b/i,
  /\bhow\s+many\s+generations\b|\bgenerations?\s+back\b|\bhow\s+far\s+back\b|\bhow\s+deep\b/i,
];
// Questions about some of the ancestors, or about other relatives, have their own answers.
const SUMMARY_DECLINE =
  /\b(?:born|died|lived|married|buried)\s+(?:in|at|near|before|after|between)\b|\bwhere\b|\bdescendants?\b|\bcousins?\b|\bsiblings?\b|\bchildren\b|\bin\s+common\b|\bshared?\b|\bmissing\b|\bbrick\s+walls?\b|\bno\s+(?:parents?|father|mother)\b|\bsources?\b|\bdna\b|\baverage\b|\bage\s+at\b|\blongest\b|\b(?:e|im)migra|\bmost\s+recent\b|\bconnect|\brelated\b/i;
const SUMMARY_OWNER_ID = /\b([A-Z][A-Za-z'_-]*-\d+)\b/;
const SUMMARY_OWNER_THIRD = /\b(he|him|his|she|her|they|them|their|this\s+person)\b/i;
const SUMMARY_OWNER_FIRST = /\b(I|me|my|we|us|our)\b/;

/** The owner word for an ancestor summary ("his", "my", "Cook-8721's"), or null. */
export function parseAncestorSummaryOwner(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of SUMMARY_PATTERNS) {
    const match = t.match(re);
    if (match) return ownerWord(match[1]);
  }
  const flat = t.replace(/[?!.;:,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/\bancestors?\b|\bancestry\b|\bpedigree\b/i.test(flat) || SUMMARY_DECLINE.test(flat)) return null;
  if (flat.split(" ").length > 40) return null;
  // One ask is enough when it's "how many ancestors does he have", whatever
  // else the prompt says ("can you see beyond the chart on this page?").
  const howManyHave = /\bhow\s+many\s+(?:(?:direct|known|recorded|documented|total)\s+)*ancestors\s+(?:does|do|did)\s+\S+(?:\s+\S+)?\s+have\b/i.test(flat);
  if (!howManyHave && SUMMARY_ASKS.filter((re) => re.test(flat)).length < 2) return null;
  const owner = flat.match(SUMMARY_OWNER_ID) || flat.match(SUMMARY_OWNER_THIRD) || flat.match(SUMMARY_OWNER_FIRST);
  // No person named: the profile person.
  return owner ? ownerWord(owner[1]) : "their";
}

/**
 * The count, the depth and the earliest-born ancestor. rows: ancestor rows
 * with degrees, birth, displayName, wtid. subject: "You have" or "Ted (Weatherall-111) has".
 */
export function buildAncestorSummaryMessage(rows, { subject, ownerText, maxGeneration = 25, formatDate = (d) => d }) {
  const list = (rows || []).filter((row) => Number(row?.degrees) >= 1);
  if (!list.length) return `${ownerText} tree has no ancestors recorded on WikiTree.`;
  const depth = buildAncestorDepthMessage(list, ownerText, maxGeneration).split("\n");
  const deepest = Math.max(...list.map((row) => Number(row.degrees)));
  const atLeast = deepest >= maxGeneration ? "at least " : "";
  const head = `${subject} ${list.length.toLocaleString()} known ancestor${list.length === 1 ? "" : "s"} on WikiTree, going back ${atLeast}${deepest} generation${deepest === 1 ? "" : "s"} (to the ${generationLabel(deepest)}).`;
  const year = (row) => {
    const match = String(row?.birth || "").match(/\b(\d{4})\b/);
    return match && match[1] !== "0000" ? Number(match[1]) : null;
  };
  const dated = list.filter((row) => year(row) !== null);
  // Earliest year first; within a year, the more distant generation.
  dated.sort((a, b) => year(a) - year(b) || Number(b.degrees) - Number(a.degrees) || String(a.birth).localeCompare(String(b.birth)));
  let earliest = "None of them has a birth year recorded.";
  if (dated.length) {
    const first = dated[0];
    const gen = Number(first.degrees);
    const one = generationLabel(gen).replace(/s$/, "");
    const place = first.birthLocation ? ` in ${first.birthLocation}` : "";
    earliest = `The earliest born is ${first.displayName || first.wtid} (${first.wtid}), born ${formatDate(first.birth) || first.birth}${place}: ${gen} generation${gen === 1 ? "" : "s"} back (a ${one}).`;
  }
  return [head, earliest, ...depth.slice(1)].join("\n");
}

/** rows: ancestor rows with degrees. ownerText: "Your" or "Ellen (Cook-8721)'s"; maxGeneration: the fetch limit. */
export function buildAncestorDepthMessage(rows, ownerText, maxGeneration) {
  const counts = new Map();
  for (const row of rows || []) {
    const generation = Number(row?.degrees);
    if (Number.isFinite(generation) && generation >= 1) counts.set(generation, (counts.get(generation) || 0) + 1);
  }
  if (!counts.size) return `${ownerText} tree has no ancestors recorded on WikiTree.`;
  const deepest = Math.max(...counts.keys());
  const atLeast = deepest >= maxGeneration ? "at least " : "";
  const lines = [...counts.keys()]
    .sort((a, b) => a - b)
    .map((generation) => `- ${generation}. ${generationLabel(generation)}: ${counts.get(generation)} of ${(2 ** generation).toLocaleString()}`);
  return `${ownerText} tree goes back ${atLeast}${deepest} generation${deepest === 1 ? "" : "s"} on WikiTree (to the ${generationLabel(deepest)}).\n${lines.join("\n")}`;
}
