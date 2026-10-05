// S10 (live, 2026-10-03): "how many generations of ancestors does she have?" went
// to the AI, which read only the parents off the bio. The ancestor list knows
// each row's generation (degrees); this reports how far back it reaches.

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

/** The owner word for parseAncestorListPrompt ("my", "her", "Cook-8721's"), or null. */
export function parseAncestorDepthOwner(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of PATTERNS) {
    const match = t.match(re);
    if (!match) continue;
    const word = match[1];
    if (/^(?:I|we|my|our)$/i.test(word)) return "my";
    if (/^(?:she|her)$/i.test(word)) return "her";
    if (/^(?:he|his)$/i.test(word)) return "his";
    if (/^(?:they|their|this\s+person|this\s+profile['’]s)$/i.test(word)) return "their";
    return /['’]s$/.test(word) ? word : `${word}'s`;
  }
  return null;
}

export function generationLabel(generation) {
  if (generation === 1) return "parents";
  if (generation === 2) return "grandparents";
  if (generation === 3) return "great-grandparents";
  return `${generation - 2}x great-grandparents`;
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
