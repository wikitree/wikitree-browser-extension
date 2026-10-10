// DNA in the fan chart (2026-10-03, the "Wow!" visuals): "who could I have inherited
// X-DNA from?" opens the fan chart in its X-DNA mode, and every ancestor's tip shows
// the expected share of autosomal DNA. Expected values only: real inheritance
// varies (a 3rd great-grandparent can leave no detectable DNA at all).

import { FAN_CHART_MAX_GENERATIONS, generationOfSlot } from "./chat_fan_chart_data";
import { ancestorWord, generationLabel } from "./chat_kin_labels";
import { RELATIVE_OWNER } from "./chat_chart_owner";

const OWNER = String.raw`(${RELATIVE_OWNER}|my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const X = String.raw`(?:x[\s-]*dna|x[\s-]*chromosomes?|x[\s-]*chromosome\s+dna)`;
const PATTERNS = [
  // "X-DNA fan chart", "my X-DNA chart", "show her X chromosome inheritance", "X-DNA inheritance chart"
  new RegExp(
    String.raw`^(?:(?:show|draw|make|open|display|give)(?:\s+me)?\s+)?(?:the\s+|an?\s+)?(?:${OWNER}\s+)?${X}(?:\s+(?:inheritance|ancestors|lines?|paths?))?(?:\s+(?:fan\s+)?(?:chart|map|tree|fan))?$`,
    "i"
  ),
  // "who could I have inherited X-DNA from", "who did she get her X chromosome from"
  new RegExp(
    String.raw`^(?:which|who)(?:\s+of\s+${OWNER}\s+ancestors)?\s+(?:could|can|might|did|do|does)\s+(I|we|she|he|they|[A-Z][A-Za-z'_ -]*?-\d+)\s+(?:have\s+)?(?:inherit(?:ed)?|get|got|receive[d]?)\s+(?:my\s+|her\s+|his\s+|their\s+|an?\s+)?${X}\s+from$`,
    "i"
  ),
  // "which of my ancestors could have passed down X-DNA", "who passed X-DNA to me"
  new RegExp(
    String.raw`^(?:which|who)(?:\s+of\s+${OWNER}\s+ancestors)?\s+(?:could\s+have\s+|might\s+have\s+)?(?:passed|pass|given|gave|contributed)(?:\s+down)?\s+(?:${X})(?:\s+to\s+(me|us|her|him|them))?$`,
    "i"
  ),
];

const CONFIRMED = String.raw`(?:dna[\s-]*confirmed|confirmed\s+(?:by|with)\s+dna|dna[\s-]*(?:proof|proven|confirmation))`;
// "DNA confirmed chart", "which of her ancestors are DNA confirmed" ("show my DNA confirmed
// ancestors" stays the WT+ list, parseDnaConfirmedPrompt in chat_router)
const PROOF_PATTERNS = [
  new RegExp(
    String.raw`^(?:(?:show|draw|make|open|display|give)(?:\s+me)?\s+)?(?:the\s+|an?\s+)?(?:${OWNER}\s+)?${CONFIRMED}(?:\s+(?:ancestors|lines?|parents|links))?(?:\s+(?:fan\s+)?(?:chart|tree|fan))$`,
    "i"
  ),
  new RegExp(String.raw`^(?:which|who)\s+of\s+${OWNER}\s+ancestors\s+(?:are|were|is|have\s+been)\s+${CONFIRMED}$`, "i"),
];

const YMT = String.raw`(?:y[\s-]*dna|mt[\s-]*dna|mitochondrial(?:\s+dna)?)`;
// "Y-DNA and mtDNA lines", "show my Y-DNA line", "her mtDNA line chart", "Y & mt lines",
// "who did I get my Y-DNA from", "where did her mtDNA come from"
const LINE_PATTERNS = [
  new RegExp(
    String.raw`^(?:(?:show|draw|make|open|display|give)(?:\s+me)?\s+)?(?:the\s+)?(?:${OWNER}\s+)?(?:${YMT}|y)(?:\s*(?:and|&|\+)\s*(?:${YMT}|mt))?\s+(?:lines?|lineages?|inheritance)(?:\s+(?:fan\s+)?(?:chart|tree|fan))?$`,
    "i"
  ),
  new RegExp(String.raw`^(?:who|which\s+ancestors?)\s+did\s+(I|we|she|he|they|[A-Z][A-Za-z'_ -]*?-\d+)\s+(?:get|inherit)\s+(?:my|her|his|their)\s+${YMT}\s+from$`, "i"),
  new RegExp(String.raw`^where\s+did\s+${OWNER}\s+${YMT}\s+come\s+from$`, "i"),
];

const SUBJECT_OWNER = { i: "my", we: "my", me: "my", us: "my", she: "her", her: "her", he: "his", him: "his", they: "their", them: "their" };

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (SUBJECT_OWNER[raw.toLowerCase()]) return SUBJECT_OWNER[raw.toLowerCase()];
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** Fan chart params ({owner, generations, ancestorPrompt, mode: "xdna", dna: true}) or null. */
export function parseDnaChartPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match.slice(1).find(Boolean));
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, generations: 8, ancestorPrompt, mode: "xdna", dna: true };
  }
  for (const re of LINE_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, generations: 8, ancestorPrompt, mode: "dnalines", dna: true };
  }
  for (const re of PROOF_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, generations: 8, ancestorPrompt, mode: "dnaproof", dna: true };
  }
  return null;
}

/** Gender of the person in a slot: fathers are even, mothers odd, the root from the profile. */
function slotGender(slots, slot) {
  if (slot === 1) return slots[1]?.gender || "";
  return slot % 2 === 0 ? "Male" : "Female";
}

/**
 * Expected X-DNA share for every slot (0 when no X can come down that line): a man
 * gets his only X from his mother; a woman gets one from each parent. Null when the
 * root's gender isn't recorded. Length: slotCount.
 */
export function xDnaShares(slots, slotCount = slots.length) {
  const rootGender = slots[1]?.gender;
  if (rootGender !== "Male" && rootGender !== "Female") return null;
  const share = new Array(slotCount).fill(0);
  share[1] = 1;
  for (let slot = 1; 2 * slot + 1 < slotCount; slot += 1) {
    if (!share[slot]) continue;
    if (slotGender(slots, slot) === "Male") share[2 * slot + 1] = share[slot];
    else {
      share[2 * slot] = share[slot] / 2;
      share[2 * slot + 1] = share[slot] / 2;
    }
  }
  return share;
}

/** Expected autosomal share from the person in a slot, summed over every slot they fill (pedigree collapse). */
export function autosomalShare(slots, slot) {
  const person = slots[slot];
  if (!person || slot < 2) return slot === 1 ? 1 : 0;
  const id = String(person.id ?? person.wtid);
  let total = 0;
  slots.forEach((other, s) => {
    if (s > 1 && other && String(other.id ?? other.wtid) === id) total += 1 / 2 ** generationOfSlot(s);
  });
  return total;
}

/** "25%", "3.1%", "0.39%". */
export function percentText(share) {
  const percent = share * 100;
  if (percent >= 10) return `${Math.round(percent * 10) / 10}%`.replace(/\.0%$/, "%");
  if (percent >= 1) return `${Math.round(percent * 10) / 10}%`;
  return `${Math.round(percent * 100) / 100}%`;
}

/** Per generation: {generation, possible (X slots), found}. The possible counts are Fibonacci numbers. */
export function xDnaRows(slots) {
  const shares = xDnaShares(slots);
  if (!shares) return null;
  const generations = Math.min(generationOfSlot(slots.length - 1), FAN_CHART_MAX_GENERATIONS);
  const rows = [];
  for (let generation = 1; generation <= generations; generation += 1) {
    let possible = 0;
    let found = 0;
    for (let slot = 2 ** generation; slot < 2 ** (generation + 1); slot += 1) {
      if (!shares[slot]) continue;
      possible += 1;
      if (slots[slot]) found += 1;
    }
    rows.push({ generation, possible, found, slots: 2 ** generation });
  }
  return rows;
}

/** The chat reply for the X-DNA chart. ownerText: "Your" or "Cook-8721's". */
export function buildXDnaSummary(slots, ownerText, { chartOpened = true } = {}) {
  const root = slots[1];
  const rows = xDnaRows(slots);
  const owner = ownerText === "Your" ? "you" : ownerText.replace(/['’]s$/, "");
  if (!rows) return `${ownerText} profile has no gender recorded, so I can't trace the X chromosome.${chartOpened ? " The fan chart's X-DNA mode needs it." : ""}`;
  const male = root.gender === "Male";
  const lines = [
    male
      ? `${ownerText === "Your" ? "As a man, you" : `${owner}, a man,`} got ${ownerText === "Your" ? "your" : "his"} only X chromosome from ${ownerText === "Your" ? "your" : "his"} mother, so no X-DNA comes down the direct paternal line.`
      : `${ownerText === "Your" ? "As a woman, you" : `${owner}, a woman,`} got one X chromosome from each parent, but ${ownerText === "Your" ? "your" : "her"} father passed on only his mother's.`,
    "Ancestors who could have passed X-DNA down, generation by generation:",
  ];
  rows.slice(0, 6).forEach((row) => {
    lines.push(`• ${generationLabel(row.generation)}: ${row.possible} of ${row.slots}${row.found < row.possible ? ` (${row.found} on WikiTree)` : ""}`);
  });
  // Gaps worth researching: a missing X-DNA ancestor whose child is recorded.
  const shares = xDnaShares(slots);
  const gaps = shares.filter((share, slot) => share && slot > 1 && !slots[slot] && slots[Math.floor(slot / 2)]).length;
  if (gaps) lines.push(chartOpened
    ? `${gaps} missing X-DNA ancestor${gaps === 1 ? " is" : "s are"} outlined in purple: the gaps worth researching for an X match.`
    : `${gaps} missing X-DNA ancestor${gaps === 1 ? " is a gap" : "s are gaps"} worth researching for an X match.`);
  lines.push("The counts follow the Fibonacci sequence.");
  if (chartOpened) lines[lines.length - 1] += " The fan chart colours them by expected share; hover anyone for their expected autosomal DNA too.";
  return lines.join("\n");
}

// How sure each parent link is (the "DNA confirmed" fan chart mode, 2026-10-04). WikiTree
// keeps a status for a profile's father and mother (getProfile.md, DataStatus): 30
// confirmed with DNA, 20 confident, 10 uncertain, 5 non-biological; blank isn't marked.
export const PARENT_STATUSES = [
  { key: "dna", label: "Confirmed with DNA", colour: "#6a3bb5" },
  { key: "confident", label: "Confident", colour: "#4f9a4a" },
  { key: "unmarked", label: "Not marked", colour: "#d4d8de" },
  { key: "uncertain", label: "Uncertain", colour: "#e0a030" },
  { key: "nonbio", label: "Non-biological", colour: "#8fa3b8" },
];
const STATUS_CODES = { 30: "dna", 20: "confident", 10: "uncertain", 5: "nonbio" };

/** The status key of the link from the child in slot/2 to the parent in slot. */
export function parentLinkStatus(slots, slot) {
  const child = slots?.[Math.floor(slot / 2)];
  if (!child || slot < 2) return "";
  const code = Number(slot % 2 === 0 ? child.fatherStatus : child.motherStatus);
  return STATUS_CODES[code] || "unmarked";
}

/** {dna, confident, unmarked, uncertain, nonbio} counts over the recorded ancestors. */
export function parentStatusCounts(slots) {
  const counts = Object.fromEntries(PARENT_STATUSES.map((status) => [status.key, 0]));
  (slots || []).forEach((person, slot) => {
    if (person && slot >= 2) counts[parentLinkStatus(slots, slot)] += 1;
  });
  return counts;
}

/** The chat message for the "DNA confirmed" chart: counts, then who is confirmed or uncertain. */
export function buildParentStatusSummary(slots, ownerText) {
  const counts = parentStatusCounts(slots);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (!total) return `${ownerText} ancestors aren't on WikiTree yet, so there are no parent links to check.`;
  const generations = generationOfSlot(slots.length - 1);
  const parts = PARENT_STATUSES.filter((status) => counts[status.key]).map((status) => `${counts[status.key]} ${status.label.toLowerCase().replace("dna", "DNA")}`);
  const lines = [`${ownerText} ${total} ancestors in ${generations} generations, by how sure each parent link is: ${parts.join(", ")}.`];
  const named = (key) =>
    slots
      .map((person, slot) => (person && slot >= 2 && parentLinkStatus(slots, slot) === key ? `${person.name} (${person.wtid}), ${ancestorWord(generationOfSlot(slot), slot % 2 === 0 ? "Male" : "Female").toLowerCase()}` : ""))
      .filter(Boolean);
  const dna = named("dna");
  const uncertain = named("uncertain");
  if (dna.length) lines.push(`Confirmed with DNA:\n${dna.slice(0, 12).map((line) => `- ${line}`).join("\n")}${dna.length > 12 ? `\n…and ${dna.length - 12} more.` : ""}`);
  else lines.push("None of these links is marked as confirmed with DNA yet.");
  if (uncertain.length) lines.push(`Marked uncertain (worth a look):\n${uncertain.slice(0, 8).map((line) => `- ${line}`).join("\n")}`);
  lines.push("The chart colours each ancestor by the link to their child: purple is confirmed with DNA, green confident, amber uncertain.");
  return lines.join("\n");
}

// Y-DNA and mtDNA lines (the fan chart's "DNA lines" mode, 2026-10-04). Y-DNA passes
// father to son, so it follows the father's father's line (slots 2, 4, 8, …); mtDNA
// passes from a mother to all her children, so it follows the mother's mother's line
// (slots 3, 7, 15, …). Tests connected to the ancestors on those lines show which
// lines have DNA evidence.

/** "y", "mt" or "" for a slot. */
export function dnaLineOf(slot) {
  if (slot < 2) return "";
  if ((slot & (slot - 1)) === 0) return "y";
  if (((slot + 1) & slot) === 0) return "mt";
  return "";
}

/** The recorded ancestors on the Y and mt lines: [{slot, line, person}], nearest first. */
export function dnaLineAncestors(slots) {
  const found = [];
  for (let slot = 2; slot < (slots || []).length; slot += 1) {
    const line = dnaLineOf(slot);
    if (line && slots[slot]?.wtid) found.push({ slot, line, person: slots[slot] });
  }
  return found;
}

/** The tests of a line's type connected to one ancestor: {count, haplogroups, takers}. */
export function lineTestSummary(tests, line) {
  const type = line === "y" ? "yDNA" : "mtDNA";
  const ofType = (tests || []).filter((test) => test.dna_type === type);
  const haplogroups = [...new Set(ofType.map((test) => (line === "y" ? test.haplo : test.haplom)).filter(Boolean))];
  const takers = [...new Set(ofType.map((test) => test.taker?.Name).filter(Boolean))];
  return { count: ofType.length, haplogroups, takers };
}

/** Who carries the root's lines: a man carries his father's Y; everyone carries their mother's mtDNA. */
export function dnaLineCarrierNote(root, line) {
  const name = root?.name || "The centre person";
  if (line === "mt") return `${name} carries this mtDNA`;
  if (root?.gender === "Male") return `${name} carries this Y-DNA`;
  if (root?.gender === "Female") return `${name}'s father and brothers carry this Y-DNA`;
  return "Carried by the centre person's father's sons";
}

/** The chat message for the DNA lines chart: how far back each line goes and who carries it. */
export function buildDnaLinesSummary(slots, ownerText, { chartOpened = true } = {}) {
  const root = slots?.[1];
  const ancestors = dnaLineAncestors(slots);
  const furthest = (line) => ancestors.filter((a) => a.line === line).pop();
  const describe = (line) => {
    const last = furthest(line);
    const kind = line === "y" ? "Y-DNA (father to son)" : "mtDNA (mother to child)";
    if (!last) return `- ${kind}: no ${line === "y" ? "father" : "mother"} recorded yet.`;
    const generation = generationOfSlot(last.slot);
    const born = [last.person.birth ? String(last.person.birth).slice(0, 4) : "", last.person.birthLocation].filter(Boolean).join(", ");
    return `- ${kind}: back ${generation} generation${generation === 1 ? "" : "s"} to ${last.person.name} (${last.person.wtid})${born ? `, born ${born}` : ""}. ${dnaLineCarrierNote(root, line)}.`;
  };
  return [
    `${ownerText} direct DNA lines:`,
    describe("y"),
    describe("mt"),
    ...(chartOpened ? ["The chart shows both lines and checks WikiTree for DNA tests connected to each ancestor on them: darker means a test is connected (hover for the haplogroup)."] : []),
  ].join("\n");
}

// Who else carries a living person's lines (the user, 2026-10-04: Murray has tested, and
// "who could test" should still mean something on his page). His carriers are found from
// the earliest known ancestor on each line, not from him.
/** {y, mt}: the furthest recorded ancestor on each line, {slot, person, generation}, or null. */
export function furthestLineAncestors(slots) {
  const ancestors = dnaLineAncestors(slots);
  const furthest = (line) => {
    const last = ancestors.filter((a) => a.line === line).pop();
    return last ? { ...last, generation: generationOfSlot(last.slot) } : null;
  };
  return { y: furthest("y"), mt: furthest("mt") };
}

/** The line's heading: "Murray's Y-DNA line goes back 5 generations to William (Moloney-741), born 1760." */
export function lineSharersHeading(root, line, entry) {
  const name = root?.name || root?.wtid || "This person";
  const kind = line === "y" ? (root?.gender === "Female" ? "father's Y-DNA line" : "Y-DNA line") : "mtDNA line";
  const born = entry.person.birth ? `, born ${String(entry.person.birth).slice(0, 4)}` : "";
  return `${name}'s ${kind} goes back ${entry.generation} generation${entry.generation === 1 ? "" : "s"} to ${entry.person.name} (${entry.person.wtid})${born}. Everyone below who carries it shares it with ${name}.`;
}

/** The descendant generations to load from a line's furthest ancestor to reach today. */
export function lineSharersGenerations(entry) {
  return Math.min(10, Math.max(4, (entry?.generation || 0) + 3));
}

// Who could take a DNA test for an ancestor (the descendant chart's "DNA carriers"
// mode, 2026-10-04). A man's Y-DNA reaches his sons, their sons and so on; a woman's
// mtDNA reaches all her children but only her daughters pass it on. So for a man the
// carriers are his male-line descendants, for a woman everyone descended from her
// through daughters only.

/** "y", "mt" or "": whether the last person in chain (root … person) carries the root's Y or mtDNA. */
export function dnaCarrierKind(chain) {
  const people = chain || [];
  if (people.length < 2) return "";
  const rootGender = people[0]?.gender;
  if (rootGender === "Male") return people.every((person) => person?.gender === "Male") ? "y" : "";
  if (rootGender === "Female") return people.slice(0, -1).every((person) => person?.gender === "Female") ? "mt" : "";
  return "";
}

/** The carriers in a descendant tree ({person, children}): [{person, depth, kind}], nearest first. */
export function dnaCarriers(tree) {
  const found = [];
  const walk = (node, chain) => {
    const next = [...chain, node.person];
    const kind = dnaCarrierKind(next);
    if (kind) found.push({ person: node.person, depth: next.length - 1, kind });
    // (no carriers below someone who isn't one)
    if (next.length === 1 || kind) (node.children || []).forEach((child) => walk(child, next));
  };
  if (tree?.person) walk(tree, []);
  return found.sort((a, b) => a.depth - b.depth);
}

/** Private profiles (no gender or name shown) whose parent passes the line on: possible living carriers. */
export function hiddenCarrierChildren(tree) {
  const rootGender = tree?.person?.gender;
  if (rootGender !== "Male" && rootGender !== "Female") return 0;
  let count = 0;
  const passesOn = (node, chain) => {
    const next = [...chain, node.person];
    if (next.length === 1) return true;
    const kind = dnaCarrierKind(next);
    // a man passes Y-DNA to sons; only a woman passes mtDNA on
    return kind === "y" || (kind === "mt" && node.person.gender === "Female");
  };
  const walk = (node, chain) => {
    if (!passesOn(node, chain)) return;
    const next = [...chain, node.person];
    (node.children || []).forEach((child) => {
      if (child.person?.hidden) count += 1;
      else walk(child, next);
    });
  };
  if (tree?.person) walk(tree, []);
  return count;
}

function generationText(depth) {
  if (depth === 1) return "child";
  if (depth === 2) return "grandchild";
  if (depth === 3) return "great-grandchild";
  return `${depth - 2}x great-grandchild`;
}

/** The chat message: who carries the root's Y or mtDNA, the living ones first. */
/** testers: WikiTree IDs of the takers of tests of this line's type connected to the person. */
export function buildDnaCarrierSummary(tree, ownerText, generations, testers = [], { brief = false } = {}) {
  const root = tree?.person;
  if (!root) return "I couldn't load that person's descendants.";
  const name = root.name || root.wtid;
  if (root.gender !== "Male" && root.gender !== "Female") return `${name}'s gender isn't recorded, so I can't tell which DNA lines pass down.`;
  const male = root.gender === "Male";
  const carriers = dnaCarriers(tree);
  const living = carriers.filter((carrier) => carrier.person.living);
  const what = male ? "Y-DNA (passed from father to son)" : "mtDNA (passed from a mother to all her children, and on through daughters)";
  const lines = [
    `${name}'s ${what}: ${carriers.length} descendant${carriers.length === 1 ? "" : "s"} on WikiTree within ${generations} generations carr${carriers.length === 1 ? "ies" : "y"} it${
      living.length ? `, ${living.length} of them living` : ""
    }.`,
  ];
  const line = (carrier) => `- ${carrier.person.name}${carrier.person.wtid ? ` (${carrier.person.wtid})` : ""}, ${generationText(carrier.depth)}${carrier.person.birth ? `, born ${String(carrier.person.birth).slice(0, 4)}` : ""}`;
  // Carriers who have already tested (the user, 2026-10-04: the "could test" list for
  // Moloney-741 was exactly the two men who had).
  const testedSet = new Set(testers);
  const untested = living.filter((carrier) => !testedSet.has(carrier.person.wtid));
  const testWord = male ? "Y-DNA" : "mtDNA";
  if (testers.length) {
    lines.push(`Already tested: ${testers.length} ${testWord} test${testers.length === 1 ? " is" : "s are"} connected to ${name} on WikiTree, taken by ${testers.join(", ")}.`);
  }
  if (untested.length) {
    lines.push(`Living and not yet tested, so they could take a ${testWord} test:\n${untested.slice(0, 12).map(line).join("\n")}${untested.length > 12 ? `\n…and ${untested.length - 12} more.` : ""}`);
  } else if (living.length) {
    lines.push(`Every living carrier on WikiTree has already tested. Any others would be among the private profiles, or not on WikiTree yet.`);
  } else if (carriers.length) {
    const birthYear = (carrier) => Number(String(carrier.person.birth || "").slice(0, 4)) || 0;
    const youngest = carriers
      .slice()
      .sort((a, b) => birthYear(b) - birthYear(a) || b.depth - a.depth)
      .slice(0, 6);
    lines.push(`None is marked living on WikiTree. The most recent carriers, whose descendants could test:\n${youngest.map(line).join("\n")}`);
  }
  const hidden = hiddenCarrierChildren(tree);
  if (hidden) {
    lines.push(
      `${hidden} private profile${hidden === 1 ? " is a child" : "s are children"} of carriers: WikiTree doesn't show you ${hidden === 1 ? "it" : "them"}, and living people are usually private. Use the green Apps button below, then ask again, to see who they are.`
    );
  }
  if (brief) return lines.join("\n");
  lines.push(
    male
      ? `${name}'s mtDNA came from his mother: ask "who could take a DNA test for" her to find its carriers.`
      : `${name}'s sons carry her mtDNA but can't pass it on; her Y-DNA line is her father's.`
  );
  lines.push(`A test only proves the line if each father-son${male ? "" : " or mother-daughter"} link is right: the DNA confirmed chart shows which are already confirmed.`);
  return lines.join("\n");
}

const TEST_WORD = String.raw`(?:(?:y[\s-]*dna|mt[\s-]*dna|dna)\s+test)`;
const FOR_WHOM = String.raw`(me|us|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+)`;
const OBJECT_OWNER = { me: "my", us: "my", her: "her", him: "his", them: "their" };
// "who could take a DNA test for him", "who could do a Y-DNA test for Beacall-13",
// "who carries his Y-DNA", "who has her mtDNA", "Beacall-13's DNA carriers", "DNA test candidates for her"
const CARRIER_PATTERNS = [
  new RegExp(String.raw`^who\s+(?:could|can|might|should)\s+(?:take|do)\s+an?\s+${TEST_WORD}\s+(?:for|to\s+(?:prove|confirm|check))\s+${FOR_WHOM}(?:['’]s\s+(?:line|y[\s-]*dna|mt[\s-]*dna))?$`, "i"),
  new RegExp(String.raw`^(?:who|which\s+(?:descendants|relatives|living\s+(?:people|relatives)))\s+(?:carr(?:y|ies)|has|have|inherited)\s+${OWNER}\s+(?:y[\s-]*dna|mt[\s-]*dna|mitochondrial\s+dna)$`, "i"),
  new RegExp(String.raw`^(?:(?:show|find|list)(?:\s+me)?\s+)?(?:${OWNER}\s+)?(?:y[\s-]*dna\s+|mt[\s-]*dna\s+)?(?:dna\s+)?(?:carriers|test(?:ing)?\s+candidates)(?:\s+for\s+${FOR_WHOM})?$`, "i"),
];

/** Descendant chart params ({owner, generations, descendantPrompt, mode: "dnacarriers", dna: true}) or null. */
export function parseDnaCarrierPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of CARRIER_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const word = String(match.slice(1).find(Boolean) || "").trim();
    const owner = OBJECT_OWNER[word.toLowerCase()] || canonicalOwner(word);
    const descendantPrompt = !owner ? "this profile's descendants" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} descendants` : `${owner}'s descendants`;
    return { owner, generations: 8, descendantPrompt, mode: "dnacarriers", dna: true };
  }
  return null;
}
