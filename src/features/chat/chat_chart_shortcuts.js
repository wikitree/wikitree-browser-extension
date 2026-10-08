// Chart shortcuts (2026-10-03): "Beacall-9 fractal", "Jefferson descendants",
// "fan chart for Thomas Jefferson". The person is looked up first (a name may
// need a search), then the chart's own canonical prompt runs for their
// WikiTree ID, so each chart keeps one code path. The same list feeds the chart
// buttons along the top of Genie, which send the shortcut for the profile person.

/**
 * key, the button label and tooltip, the words that name it, and the canonical
 * prompt for a WikiTree ID (each one routes to its chart; see the tests).
 */
export const CHART_SHORTCUTS = [
  { key: "familymap", label: "Relationship Chart", title: "Relatives grouped by relationship, with names and dates", words: "relationship\\s+chart|family\\s+(?:map|matrix|cards|relationships)|kinship\\s+(?:map|dashboard)", prompt: (id) => `${id}'s relationship chart` },
  { key: "fan", label: "Fan", title: "Ancestors as a fan chart", words: "fan(?:\\s+chart)?|ancestors?\\s+(?:fan|chart|tree)|(?:family\\s+)?tree\\s+chart|pedigree(?:\\s+chart)?", prompt: (id) => `${id}'s fan chart` },
  { key: "explorer", label: "Explorer", title: "Family Explorer: zoom in for children, out for parents", words: "(?:family\\s+)?explorer|fractal(?:\\s+tree)?|family\\s+world|cc-?7\\s+tree", prompt: (id) => `${id}'s family explorer` },
  { key: "descendants", label: "Descendants", title: "Descendants as a sunburst", words: "descendants?(?:\\s+(?:chart|sunburst|tree))?|sunburst", prompt: (id) => `${id}'s descendant chart` },
  { key: "timeline", label: "Timeline", title: "Family timeline: births, marriages and deaths", words: "(?:family\\s+)?timeline", prompt: (id) => `${id}'s family timeline` },
  { key: "lifespans", label: "Lifespans", title: "Every ancestor's life as a bar", words: "lifespans?|life\\s+spans?", prompt: (id) => `${id}'s lifespans` },
  { key: "history", label: "History", title: "Ancestors' lives against world events", words: "(?:in\\s+)?history|history\\s+(?:chart|timeline)|ancestors\\s+in\\s+history", prompt: (id) => `${id}'s ancestors in history` },
  { key: "map", label: "Map", title: "Where the ancestors were born, on a world map", words: "(?:migration\\s+|ancestors?\\s+)?map", prompt: (id) => `map ${id}'s ancestors` },
  { key: "descmap", label: "Descendants' map", title: "Where the descendants were born, on a world map", words: "descendants?['’]?\\s+map", prompt: (id) => `${id}'s descendant map` },
  { key: "calendar", label: "Calendar", title: "Birthdays and death days round the year", words: "(?:family\\s+)?calendar|birthdays", prompt: (id) => `${id}'s family calendar` },
  { key: "names", label: "Names", title: "First names and surnames as a cloud", words: "names?(?:\\s+cloud)?|name\\s+cloud|word\\s+cloud", prompt: (id) => `${id}'s name cloud` },
  { key: "overview", label: "Overview", title: "A dashboard of the tree", words: "(?:tree\\s+)?overview|dashboard", prompt: (id) => `${id}'s tree overview` },
  { key: "xdna", label: "X-DNA", title: "Who could have passed down X-DNA", words: "x-?\\s?dna(?:\\s+chart)?", prompt: (id) => `${id}'s X-DNA chart` },
  { key: "ages", label: "Ages", title: "Lives & ages: age at death and at parenthood, with the ages that look wrong", words: "(?:lives\\s+and\\s+)?ages(?:\\s+chart)?|lives\\s+(?:and|&)\\s+ages", prompt: (id) => `${id}'s lives and ages` },
  { key: "dnalines", label: "DNA lines", title: "The Y-DNA and mtDNA lines, with the DNA tests connected to them", words: "dna\\s+lines|y\\s*(?:&|and)\\s*mt(?:\\s+lines)?", prompt: (id) => `${id}'s Y & mt lines` },
  { key: "dnaproof", label: "DNA confirmed", title: "Which parent links are confirmed with DNA", words: "dna[\\s-]+confirmed(?:\\s+chart)?", prompt: (id) => `${id}'s DNA confirmed chart` },
  { key: "ydnamap", label: "Y-DNA map", title: "Map of the profiles connected to this person's Y-DNA test, by birthplace", words: "y[\\s-]?dna\\s+(?:match\\s+)?map", prompt: (id) => `${id}'s Y-DNA match map` },
  { key: "dnatesters", label: "Who could test?", title: "Who carries this person's Y-DNA or mtDNA and could take a test", words: "dna\\s+(?:testers|carriers)", prompt: (id) => `who could take a DNA test for ${id}` },
];

// The buttons along the top of Genie, in order (the descendants' map is reached from the descendant chart).
export const CHART_BAR_KEYS = ["fan", "explorer", "descendants", "lifespans", "history", "map", "calendar", "names", "overview", "familymap", "ages", "xdna", "dnalines", "ydnamap", "dnatesters"];

// (lower case too: "beacall-9 fractal" can only be an ID)
const WIKITREE_ID = String.raw`[A-Za-z][A-Za-z'_ ]*?[A-Za-z]-\d+`;
// A name: up to five words, the first capitalised ("Jefferson", "Thomas Jefferson", "Mary Ann de la Cour").
const NAME = String.raw`[A-Z][A-Za-z'’.-]*(?:\s+[A-Za-z'’.-]+){0,4}`;
// Capitalised words that start a sentence, not a name.
const NOT_A_NAME = /^(?:show|list|find|open|draw|make|get|give|display|who|what|which|where|when|how|why|is|are|was|were|do|does|did|can|could|my|our|your|his|her|their|the|a|an|this|that|me|i|map|plot|explore)\b/i;

function chartFor(word) {
  const text = String(word || "").trim();
  return CHART_SHORTCUTS.find((chart) => new RegExp(`^(?:${chart.words})$`, "i").test(text)) || null;
}

/**
 * {chart, owner} for "<person> <chart>" or "<chart> for/of <person>", or null.
 * The person is a WikiTree ID or a capitalised name; anything else ("my fan
 * chart", "show descendants") is left to the other parsers.
 */
export function parseChartShortcutPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
  if (!text || text.length > 80) return null;
  const owner = String.raw`(${WIKITREE_ID}|${NAME})`;
  const before = text.match(new RegExp(String.raw`^${owner}(?:['’]s?)?\s+(.+)$`));
  const after = text.match(new RegExp(String.raw`^(.+?)\s+(?:for|of)\s+${owner}$`));
  // Try every split, the shortest name first: "Thomas Jefferson descendants' map".
  const candidates = [];
  if (before) {
    const words = text.split(" ");
    for (let i = 1; i < words.length; i++) {
      candidates.push([words.slice(0, i).join(" ").replace(/['’]s?$/, ""), words.slice(i).join(" ")]);
    }
  }
  if (after) candidates.push([after[2], after[1]]);
  for (const [who, word] of candidates) {
    const chart = chartFor(word);
    if (!chart) continue;
    const isId = new RegExp(`^${WIKITREE_ID}$`).test(who);
    if (!isId && (!new RegExp(`^${NAME}$`).test(who) || NOT_A_NAME.test(who))) continue;
    return { chart: chart.key, owner: who };
  }
  return null;
}

/** The canonical prompt for a chart key and a WikiTree ID, or "". */
export function chartShortcutCanonicalPrompt(key, wtid) {
  const chart = CHART_SHORTCUTS.find((item) => item.key === key);
  return chart && wtid ? chart.prompt(wtid) : "";
}

/** What a chart button sends for a person: "Beacall-9 fan chart". */
export function chartButtonPrompt(key, wtid) {
  const chart = CHART_SHORTCUTS.find((item) => item.key === key);
  if (!chart || !wtid) return "";
  const word = { familymap: "relationship chart", fan: "fan chart", explorer: "Family Explorer", descendants: "descendants", timeline: "timeline", lifespans: "lifespans", history: "in history", map: "map", calendar: "calendar", names: "name cloud", overview: "overview", ages: "ages", xdna: "X-DNA", dnalines: "DNA lines", dnaproof: "DNA confirmed", dnatesters: "DNA testers", ydnamap: "Y-DNA map", descmap: "descendants' map" }[key];
  return `${wtid} ${word}`;
}
