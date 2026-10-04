// Tree completeness (2026-10-03, the "Wow!" visuals): "how complete is my tree?"
// answers generation by generation and opens the fan chart in its Brick walls
// mode, so the gaps show. The data is the fan chart's Ahnentafel slots.

import { FAN_CHART_MAX_GENERATIONS, fanChartStats, generationOfSlot } from "./chat_fan_chart_data";
import { ancestorWord, generationLabel } from "./chat_lifespans_data";

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const TREE = String.raw`(?:family\s+tree|tree|pedigree|ancestry|family\s+history)`;
// "How complete" means the Gold Standard checklist (the user, 2026-10-04), so these open
// the fan chart's Completeness mode; the counting and brick-wall ones open Brick walls.
const QUALITY_PATTERNS = [
  // "how complete is my tree", "how complete is Cook-8721's pedigree"
  new RegExp(String.raw`^how\s+(?:complete|full|filled[\s-]+in)\s+is\s+${OWNER}\s+${TREE}$`, "i"),
  // "pedigree completeness", "my tree completeness", "show her ancestry completeness"
  new RegExp(String.raw`^(?:(?:show|check)(?:\s+me)?\s+)?(?:the\s+)?(?:${OWNER}\s+)?(?:${TREE}|ancestors?['’]?)\s+completeness$`, "i"),
  new RegExp(String.raw`^(?:(?:show|check)(?:\s+me)?\s+)?(?:the\s+)?completeness\s+of\s+${OWNER}\s+${TREE}$`, "i"),
];
const PATTERNS = [
  // "how many of my ancestors are known / on WikiTree / do I know", "what percentage of her ancestors are on WikiTree"
  new RegExp(
    String.raw`^(?:how\s+many|what\s+(?:percentage|percent|proportion|fraction|share))\s+of\s+${OWNER}\s+ancestors\s+(?:are|do\s+(?:I|we)\s+(?:know|have))(?:\s+(?:known|identified|named|found|recorded|on\s+wikitree))?$`,
    "i"
  ),
  // "where are my brick walls", "show her brick walls", "find my brick walls"
  new RegExp(String.raw`^(?:where\s+are|(?:show|find|list)(?:\s+me)?)\s+${OWNER}\s+brick\s*walls$`, "i"),
  // "where are the gaps in my tree", "gaps in her pedigree"
  new RegExp(String.raw`^(?:(?:where|what)\s+are\s+|(?:show|find)(?:\s+me)?\s+)?(?:the\s+)?(?:gaps|holes|missing\s+ancestors)\s+in\s+${OWNER}\s+${TREE}$`, "i"),
];

// "Which of my ancestors need help?" (2026-10-04): research statuses first, then the
// least complete profiles and what each is missing.
const HELP_PATTERNS = [
  // "which of my ancestors need help", "which of her ancestors' profiles need the most work"
  new RegExp(
    String.raw`^(?:which|what)\s+(?:of\s+)?${OWNER}\s+ancestors?(?:['’]|['’]s)?\s*(?:profiles?\s+)?(?:need|needs|could\s+use|would\s+benefit\s+from)\s+(?:the\s+most\s+)?(?:help|work|attention|improv(?:ing|ement))$`,
    "i"
  ),
  // "which of my ancestors' profiles are the least complete", "which of his ancestors are least complete"
  new RegExp(String.raw`^(?:which|what)\s+(?:of\s+)?${OWNER}\s+ancestors?(?:['’]|['’]s)?\s*(?:profiles?\s+)?(?:are|is)\s+(?:the\s+)?least\s+complete$`, "i"),
];

// The heatmap (2026-10-04): the same answer, with the grid instead of the fan chart.
const HEATMAP_PATTERNS = [
  // "completeness heatmap", "my pedigree heatmap", "show Cook-8721's tree completeness heat map"
  new RegExp(String.raw`^(?:(?:show|draw|make|open)(?:\s+me)?\s+)?(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:(?:${TREE}|ancestors?['’]?)\s+)?(?:completeness\s+)?heat\s*map$`, "i"),
  // "which branches of my tree are most complete", "which of her branches are the least complete"
  new RegExp(
    String.raw`^which\s+(?:branches\s+of\s+${OWNER}\s+${TREE}|of\s+${OWNER}\s+branches|${OWNER}\s+branches)\s+(?:are|is)\s+(?:the\s+)?(?:most|least|more|less|best|worst)\s+(?:complete|researched|filled[\s-]+in)$`,
    "i"
  ),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/**
 * Fan chart params ({owner, generations, ancestorPrompt, mode: "completeness" | "brickwalls",
 * completeness: true}, plus heatmap: true or help: true) or null.
 */
export function parseCompletenessPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const [patterns, mode, extra] of [
    [HEATMAP_PATTERNS, "brickwalls", { heatmap: true }],
    [HELP_PATTERNS, "completeness", { help: true }],
    [QUALITY_PATTERNS, "completeness", {}],
    [PATTERNS, "brickwalls", {}],
  ]) {
    for (const re of patterns) {
      const match = text.match(re);
      if (!match) continue;
      const owner = canonicalOwner(match.slice(1).find(Boolean));
      const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
      return { owner, generations: FAN_CHART_MAX_GENERATIONS, ancestorPrompt, mode, completeness: true, ...extra };
    }
  }
  return null;
}

/**
 * The nearest missing parents: [{child, slot, generation, missing: "father"|"mother"|"parents"}],
 * closest generation first. Only people inside the loaded generations count (the last
 * generation's parents weren't asked for).
 */
export function nearestGaps(slots) {
  const maxGeneration = generationOfSlot(slots.length - 1);
  const gaps = [];
  const seen = new Set();
  slots.forEach((person, slot) => {
    if (!person || slot < 1) return;
    const generation = generationOfSlot(slot);
    if (generation >= maxGeneration) return;
    const id = String(person.id || person.wtid);
    if (seen.has(id)) return;
    seen.add(id);
    const father = slots[2 * slot];
    const mother = slots[2 * slot + 1];
    if (father && mother) return;
    gaps.push({ child: person, slot, generation, missing: !father && !mother ? "parents" : !father ? "father" : "mother" });
  });
  return gaps.sort((a, b) => a.generation - b.generation || a.slot - b.slot);
}

/** "Your tree, generation by generation: …" plus the nearest gaps. ownerText: "Your" or "Cook-8721's". */
export function buildCompletenessSummary(slots, ownerText) {
  const { rows, found, possible, deepest } = fanChartStats(slots);
  if (!found) return `${ownerText} tree has no parents recorded on WikiTree yet, so the first gap is right at the start.`;
  const shown = rows.filter((row) => row.generation <= Math.max(deepest, 1));
  const lines = [`${ownerText} tree, generation by generation (${found} of ${possible} ancestors over ${rows.length} generations, ${Math.round((100 * found) / possible)}%):`];
  shown.forEach((row) => {
    const percent = Math.round((100 * row.found) / row.possible);
    lines.push(`• ${generationLabel(row.generation)}: ${row.found} of ${row.possible} (${percent}%)${row.found === row.possible ? " ✓" : ""}`);
  });
  const gaps = nearestGaps(slots);
  if (gaps.length) {
    const named = gaps.slice(0, 3).map((gap) => {
      const who = gap.slot === 1 ? gap.child.name || gap.child.wtid : `${gap.child.name || gap.child.wtid} (${ancestorWord(gap.generation, gap.child.gender).toLowerCase()})`;
      return `${who} has no ${gap.missing} recorded`;
    });
    const more = gaps.length - named.length;
    lines.push(`The nearest gaps: ${named.join("; ")}${more > 0 ? `; and ${more} more brick wall${more === 1 ? "" : "s"}` : ""}. The fan chart marks them all.`);
  } else {
    lines.push(`No brick walls inside ${rows.length} generations.`);
  }
  return lines.join("\n");
}

// Completeness heatmap (2026-10-04, the "Wow!" list): the pedigree as a grid, one row per
// generation and one column per branch (the ancestors `branchGeneration` back, 16
// great-great-grandparents by default). Nearer generations are one cell per ancestor,
// spanning the columns of their branches; further back, each cell is one branch's
// share of the ancestors found in that generation.
export const HEATMAP_BRANCH_GENERATIONS = [3, 4, 5];

/**
 * {generations, branchGeneration, columns, branches: [{slot, person}], rows: [{generation,
 * found, possible, cells: [{col, span, found, possible, slot, person, quality}]}]}. slot/person
 * are the cell's ancestor (one-ancestor cells) or its branch's (aggregated cells); quality
 * is the profile completeness score (0–1, the average over the cell's profiles) or null.
 */
export function buildCompletenessGrid(slots, branchGeneration = 4) {
  const generations = generationOfSlot((slots?.length || 2) - 1);
  const branchLevel = Math.max(1, Math.min(branchGeneration, generations));
  const columns = 2 ** branchLevel;
  const branches = [];
  for (let slot = columns; slot < 2 * columns; slot += 1) branches.push({ slot, person: slots[slot] || null });
  const rows = [];
  for (let generation = 1; generation <= generations; generation += 1) {
    const cells = [];
    if (generation <= branchLevel) {
      const span = 2 ** (branchLevel - generation);
      for (let slot = 2 ** generation; slot < 2 ** (generation + 1); slot += 1) {
        const person = slots[slot] || null;
        cells.push({ col: (slot - 2 ** generation) * span, span, found: person ? 1 : 0, possible: 1, slot, person, quality: person?.quality ? person.quality.score : null });
      }
    } else {
      const width = 2 ** (generation - branchLevel);
      branches.forEach((branch, col) => {
        let found = 0;
        const scores = [];
        for (let slot = branch.slot * width; slot < (branch.slot + 1) * width; slot += 1) {
          if (!slots[slot]) continue;
          found += 1;
          if (slots[slot].quality) scores.push(slots[slot].quality.score);
        }
        const quality = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
        cells.push({ col, span: 1, found, possible: width, slot: branch.slot, person: branch.person, quality, scored: scores.length });
      });
    }
    const found = cells.reduce((sum, cell) => sum + cell.found, 0);
    // The row's average profile score, each profile counted once.
    let scored = 0;
    let total = 0;
    cells.forEach((cell) => {
      if (cell.quality === null || cell.quality === undefined) return;
      const n = cell.possible === 1 ? 1 : cell.scored;
      scored += n;
      total += cell.quality * n;
    });
    rows.push({ generation, found, possible: 2 ** generation, cells, quality: scored ? total / scored : null, scored });
  }
  return { generations, branchGeneration: branchLevel, columns, branches, rows };
}

/** The branches, best first: [{slot, person, found, possible}] over the generations beyond the branch level. */
export function branchCompleteness(grid) {
  const totals = grid.branches.map((branch) => ({ ...branch, found: 0, possible: 0 }));
  grid.rows
    .filter((row) => row.generation > grid.branchGeneration)
    .forEach((row) =>
      row.cells.forEach((cell) => {
        totals[cell.col].found += cell.found;
        totals[cell.col].possible += cell.possible;
      })
    );
  return totals.sort((a, b) => b.found / (b.possible || 1) - a.found / (a.possible || 1) || a.slot - b.slot);
}

/** One line for the chat: the fullest branch, the ones that go no further, and the unknown ones. */
export function describeBranchCompleteness(grid) {
  const ranked = branchCompleteness(grid).filter((branch) => branch.possible);
  const known = ranked.filter((branch) => branch.person);
  if (known.length < 2) return "";
  const who = (branch) => `${branch.person.name || branch.person.wtid} (${branch.person.wtid})`;
  const percent = (branch) => Math.round((100 * branch.found) / branch.possible);
  const best = known[0];
  const worst = known[known.length - 1];
  if (percent(best) === percent(worst)) return "";
  const parts = [`Beyond the ${generationLabel(grid.branchGeneration).toLowerCase()}, the fullest branch is ${who(best)}'s (${percent(best)}%).`];
  const empty = known.filter((branch) => !branch.found);
  if (empty.length > 1) {
    const named = (value) => value && !/^unknown$/i.test(value);
    const label = (person) => (named(person.lnab) ? person.lnab : named(person.name) ? person.name : `unnamed (${person.wtid})`);
    const names = empty.slice(0, 5).map((branch) => label(branch.person));
    parts.push(`${empty.length} branches go no further back: ${names.join(", ")}${empty.length > 5 ? "…" : ""}.`);
  } else parts.push(`The emptiest is ${who(worst)}'s (${percent(worst)}%).`);
  const unknown = grid.branches.filter((branch) => !branch.person).length;
  if (unknown) parts.push(`${unknown} of the ${generationLabel(grid.branchGeneration).toLowerCase()} ${unknown === 1 ? "isn't" : "aren't"} on WikiTree yet.`);
  parts.push("The heatmap shows every branch.");
  return parts.join(" ");
}
