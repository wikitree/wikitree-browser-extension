// S10 (live, 2026-10-03): "how many generations of ancestors does she have?" went
// to the AI, which read only the parents off the bio. The ancestor list knows
// each row's generation (degrees); this reports how far back it reaches.

import { ancestorGenerationLabel as generationLabel } from "./chat_kin_labels";
import { fullName } from "./chat_text_utils";

// Full names, not "James (Roosevelt-7)" (the user, 2026-10-12)
const name = (row) => `${fullName({ name: row.displayName, lnab: row.lnab, wtid: row.wtid }) || row.wtid} (${row.wtid || "private"})`;
export { ancestorGenerationLabel as generationLabel } from "./chat_kin_labels";
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);
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
  // "give me details of his ancestors", "information about my ancestors" (user,
  // 2026-10-09: details of the ancestors in a table, not an 8-generation chart)
  new RegExp(
    String.raw`^(?:(?:please\s+)?(?:give|show|tell|send)(?:\s+me)?\s+)?(?:the\s+|some\s+|more\s+|all\s+the\s+)?(?:details|information|info|facts|everything|data)\s+(?:of|about|on|for)\s+(?:all\s+(?:of\s+)?)?${OWNER}\s+${QUALIFIERS}ancestors$`,
    "i"
  ),
  // "what can you tell me about his ancestors", "what do you know about my ancestors"
  new RegExp(String.raw`^what\s+(?:can|do|could)\s+you\s+(?:tell\s+me|know|find(?:\s+out)?)\s+about\s+${OWNER}\s+${QUALIFIERS}ancestors$`, "i"),
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

/**
 * "How many ancestors does he have?", "count my ancestors", "his ancestor count": the number alone, which
 * WikiTree+ gives without loading them (the user, 2026-10-18: "it could be just a number"). Not with the
 * earliest, the generations or repeats asked too, and not "his ancestor summary".
 */
export function asksOnlyAncestorCount(text) {
  const flat = String(text || "").replace(/[?!.;:,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/\bhow\s+many\b[^?]*\bancestors\b|\b(?:count|number)\s+(?:of\s+)?\S+\s+(?:\S+\s+)?ancestors\b|\bancestor\s+(?:count|totals?)\b/i.test(flat)) return false;
  return !SUMMARY_ASKS.slice(1).some((re) => re.test(flat)) && !asksAboutRepeats(flat) && !asksAboutCousinMarriage(flat);
}

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
  // ("cousin marriages in my tree": the tree is the ancestors, and "cousin" is the question)
  const cousins = asksAboutCousinMarriage(flat);
  const ancestorWord = cousins ? /\bancestors?\b|\bancestry\b|\bpedigree\b|\b(?:family\s+)?tree\b/i : /\bancestors?\b|\bancestry\b|\bpedigree\b/i;
  if (!ancestorWord.test(flat) || SUMMARY_DECLINE.test(cousins ? flat.replace(COUSIN_MARRIAGE_ASK, " ") : flat)) return null;
  if (flat.split(" ").length > 40) return null;
  // One ask is enough when it's "how many ancestors does he have", whatever
  // else the prompt says ("can you see beyond the chart on this page?").
  const howManyHave = /\bhow\s+many\s+(?:(?:direct|known|recorded|documented|total)\s+)*ancestors\s+(?:does|do|did)\s+\S+(?:\s+\S+)?\s+have\b/i.test(flat);
  if (!howManyHave && !asksAboutRepeats(flat) && SUMMARY_ASKS.filter((re) => re.test(flat)).length < 2) return null;
  const owner = flat.match(SUMMARY_OWNER_ID) || flat.match(SUMMARY_OWNER_THIRD) || flat.match(SUMMARY_OWNER_FIRST);
  // No person named: the profile person.
  return owner ? ownerWord(owner[1]) : "their";
}

// "How many are repeats?" (Elaine, live 2026-10-09): ancestors reached by more
// than one line, as when cousins married. Each row is one person; a person's
// places in the pedigree = the sum over their children in it (the root's
// parents start with one each).
const REPEATS_ASK = /\b(?:repeats?|repeated|duplicated?|twice|more\s+than\s+once|multiple\s+times|pedigree\s+collapse|implex|cousins?\s+(?:who\s+)?marr(?:y|ied|iages?))\b/i;
// "did any of my ancestors marry their cousin", "cousin marriages in my tree" (imagined Z4, 2026-10-18)
const COUSIN_MARRIAGE_ASK =
  /\bcousins?\s+(?:who\s+)?marr(?:y|ied|iages?)\b|\bmarr(?:y|ied|ying)\s+(?:their|his|her|a|my|our)\s+(?:own\s+)?(?:(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+)?cousins?\b/i;
// "who married twice", "which of my ancestors remarried": spouses, not repeats
const MARRIED_AGAIN = /\b(?:married|marry|wed)\s+(?:twice|more\s+than\s+once|multiple\s+times|again)\b|\bremarr(?:y|ied|iage)\w*/gi;

/** The prompt asks about repeated ancestors. */
export function asksAboutRepeats(text) {
  const t = String(text || "");
  return COUSIN_MARRIAGE_ASK.test(t) || REPEATS_ASK.test(t.replace(MARRIED_AGAIN, " "));
}

/** The prompt asks about cousins who married. */
export function asksAboutCousinMarriage(text) {
  return COUSIN_MARRIAGE_ASK.test(String(text || ""));
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const REMOVED = ["", "once removed", "twice removed", "three times removed", "four times removed"];

/** How two people are related through an ancestor up and down from them: "second cousins once removed". */
export function cousinRelation(up1, up2) {
  if (up1 === 1 && up2 === 1) return "brother and sister";
  const degree = Math.min(up1, up2) - 1;
  const removed = Math.abs(up1 - up2);
  if (degree < 1) return removed === 1 ? "aunt or uncle and niece or nephew" : "a great-aunt or uncle and grand-niece or nephew";
  const name = `${ORDINALS[degree - 1] || `${degree}th`} cousins`;
  return removed ? `${name} ${REMOVED[removed] || `${removed} times removed`}` : name;
}

/**
 * The couples in the pedigree who were related: [{father, mother, ancestor, relation, steps}], closest first.
 * A couple is a row's parents (the root's parents are ahnen 2 and 3); their nearest shared ancestor names it.
 */
export function ancestorCousinCouples(rows) {
  const list = (rows || []).filter((row) => row?.profileId && Number(row?.degrees) >= 1);
  const byId = new Map(list.map((row) => [row.profileId, row]));
  const known = (id) => (id && id !== "0" && byId.has(String(id)) ? String(id) : "");
  const upFrom = (id) => {
    const steps = new Map();
    const queue = [[id, 0]];
    for (let at = 0; at < queue.length; at++) {
      const [personId, step] = queue[at];
      const row = byId.get(personId);
      [known(row?.fatherId), known(row?.motherId)].filter(Boolean).forEach((parentId) => {
        if (steps.has(parentId)) return;
        steps.set(parentId, step + 1);
        queue.push([parentId, step + 1]);
      });
    }
    return steps;
  };
  const pairs = list.map((row) => [known(row.fatherId), known(row.motherId)]);
  const rootFather = list.find((row) => Number(row.ahnen) === 2);
  const rootMother = list.find((row) => Number(row.ahnen) === 3);
  if (rootFather && rootMother) pairs.push([rootFather.profileId, rootMother.profileId]);
  const seen = new Set();
  const couples = [];
  pairs.forEach(([fatherId, motherId]) => {
    if (!fatherId || !motherId || seen.has(`${fatherId}|${motherId}`)) return;
    seen.add(`${fatherId}|${motherId}`);
    const mine = upFrom(fatherId);
    const theirs = upFrom(motherId);
    let best = null;
    mine.forEach((up1, id) => {
      const up2 = theirs.get(id);
      if (up2 && (!best || up1 + up2 < best.up1 + best.up2)) best = { id, up1, up2 };
    });
    if (!best) return;
    couples.push({
      father: byId.get(fatherId),
      mother: byId.get(motherId),
      ancestor: byId.get(best.id),
      relation: cousinRelation(best.up1, best.up2),
      steps: best.up1 + best.up2,
      // Third cousins or closer, at most once removed: what "married a cousin" usually means. In a tree
      // 25 generations deep almost every couple is related somewhere (2026-10-18: "13th cousins twice removed").
      close: Math.min(best.up1, best.up2) <= 4 && Math.abs(best.up1 - best.up2) <= 1,
    });
  });
  return couples.sort((a, b) => a.steps - b.steps || Number(a.father.degrees) - Number(b.father.degrees));
}

/**
 * Ancestors in more than one place in the pedigree, most places first:
 * [{row, places}], plus slots: the places all the rows fill.
 */
export function ancestorRepeats(rows) {
  const list = (rows || []).filter((row) => row?.profileId && Number(row?.degrees) >= 1);
  const byId = new Map(list.map((row) => [row.profileId, row]));
  const places = new Map(list.map((row) => [row.profileId, Number(row.ahnen) === 2 || Number(row.ahnen) === 3 ? 1 : 0]));
  const waiting = new Map(list.map((row) => [row.profileId, 0]));
  const parentsOf = (row) => [row.fatherId, row.motherId].filter((id) => id && id !== "0" && byId.has(String(id))).map(String);
  list.forEach((row) => parentsOf(row).forEach((id) => waiting.set(id, waiting.get(id) + 1)));
  // Children before parents, so each count is complete when it's passed up.
  const ready = list.filter((row) => !waiting.get(row.profileId));
  while (ready.length) {
    const row = ready.pop();
    parentsOf(row).forEach((id) => {
      places.set(id, places.get(id) + places.get(row.profileId));
      waiting.set(id, waiting.get(id) - 1);
      if (!waiting.get(id)) ready.push(byId.get(id));
    });
  }
  const repeated = list
    .map((row) => ({ row, places: places.get(row.profileId) }))
    .filter((entry) => entry.places > 1)
    .sort((a, b) => b.places - a.places || Number(a.row.degrees) - Number(b.row.degrees));
  const slots = [...places.values()].reduce((sum, count) => sum + count, 0);
  return { repeated, slots };
}

/** One line on the repeats; empty when there are none and none were asked about. */
export function buildAncestorRepeatsLine(rows, { asked = false } = {}) {
  const { repeated, slots } = ancestorRepeats(rows);
  if (!repeated.length) return asked ? "None of them is a repeat: no ancestor appears in more than one line, so no two of them who married were cousins." : "";
  const couples = asked ? ancestorCousinCouples(rows) : [];
  const coupleLines = couples
    .slice(0, 5)
    .map((couple) => `- ${name(couple.father)} and ${name(couple.mother)}, ${couple.relation} (through ${name(couple.ancestor)})`);
  const more = couples.length > 5 ? `\n- and ${couples.length - 5} more` : "";
  const married = coupleLines.length
    ? `\n${couples.length === 1 ? "The couple who were related" : `The ${couples.length} couples who were related`}:\n${coupleLines.join("\n")}${more}`
    : "";
  const top = repeated[0];
  const unique = (rows || []).filter((row) => row?.profileId && Number(row?.degrees) >= 1).length;
  return (
    `${repeated.length.toLocaleString()} of them ${repeated.length === 1 ? "is a repeat" : "are repeats"}, reached by more than one line (cousins who married), ` +
    `so the ${unique.toLocaleString()} people fill ${slots.toLocaleString()} places in the pedigree. ` +
    `The most repeated is ${name(top.row)}, in ${top.places.toLocaleString()} places.${married}`
  );
}

/**
 * "Did any of his ancestors marry their cousin?": the related couples, the nearest generation first (the user,
 * 2026-10-18: the summary led with counts and a table of every ancestor). Returns {message, couples}.
 * ownerText: "Your" or "Ted (W-111)'s".
 */
export function buildCousinCouplesAnswer(rows, { ownerText, shown = 8 }) {
  const list = (rows || []).filter((row) => row?.profileId && Number(row?.degrees) >= 1);
  const couples = ancestorCousinCouples(list).sort(
    (a, b) => Number(a.father.degrees) - Number(b.father.degrees) || a.steps - b.steps
  );
  const owners = ownerText === "Your" ? "your" : ownerText;
  const known = `${owners} ${list.length.toLocaleString()} known ancestors on WikiTree`;
  if (!couples.length) {
    return { couples, message: `No. None of ${known} married a relative: no ancestor appears in more than one line.` };
  }
  const line = (couple) =>
    `- ${capitalise(generationLabel(Number(couple.father.degrees)))}: ${name(couple.father)} and ${name(couple.mother)}, ${couple.relation} (through ${name(couple.ancestor)})`;
  const close = couples.filter((couple) => couple.close);
  const distant = couples.filter((couple) => !couple.close);
  const distantLine = distant.length
    ? `${close.length ? "Another" : ""} ${distant.length.toLocaleString()} couple${distant.length === 1 ? " was" : "s were"} more distant cousins (fourth cousins or further), which is usual in a tree this deep${
        close.length ? "." : `. The nearest, by generation:`
      }`.trim()
    : "";
  const message = close.length
    ? [
        `Yes. ${close.length === 1 ? "One couple" : `${close.length.toLocaleString()} couples`} among ${known} ${close.length === 1 ? "was" : "were"} close cousins (third cousins or closer).`,
        close.length > shown ? `The ${shown} nearest, by generation:` : close.length === 1 ? "The couple:" : "By generation:",
        ...close.slice(0, shown).map(line),
        ...(distantLine ? [distantLine] : []),
        ...(couples.length > 1 ? [`All ${couples.length.toLocaleString()} related couples are in the table.`] : []),
      ]
    : [
        `No close cousins: none of the couples among ${known} were third cousins or closer.`,
        distantLine,
        ...distant.slice(0, Math.min(shown, 3)).map(line),
        `All ${distant.length.toLocaleString()} are in the table.`,
      ];
  return { couples, message: message.join("\n") };
}

/**
 * The count, the depth and the earliest-born ancestor. rows: ancestor rows
 * with degrees, birth, displayName, wtid. subject: "You have" or "Ted (Weatherall-111) has".
 */
export function buildAncestorSummaryMessage(rows, { subject, ownerText, maxGeneration = 25, formatDate = (d) => d, askedRepeats = false }) {
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
    earliest = `The earliest born is ${name(first)}, born ${formatDate(first.birth) || first.birth}${place}: ${gen} generation${gen === 1 ? "" : "s"} back (a ${one}).`;
  }
  const repeats = buildAncestorRepeatsLine(list, { asked: askedRepeats });
  return [head, earliest, repeats, ...depth.slice(1)].filter(Boolean).join("\n");
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
