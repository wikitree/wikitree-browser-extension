// Descendant sunburst (2026-10-03, the "Wow!" visuals): the prompt parser and
// the tree built from getPeople's descendants. A child who descends from both
// parents (cousin marriages) is placed once, under the first parent reached.
// The d3 drawing lives in chat_descendant_chart.js.

import { fullWikiTreeName } from "./chat_fan_chart_data";
import { getCountryFromLocation } from "./chat_place_country";
import { RELATIVE_OWNER } from "./chat_chart_owner";

export const DESCENDANT_CHART_DEFAULT_GENERATIONS = 5;
export const DESCENDANT_CHART_MAX_GENERATIONS = 10;

const OWNER = String.raw`(${RELATIVE_OWNER}|my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const OWNER_AFTER = String.raw`(me|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+)`;
const CHART = String.raw`(?:(?:descendants?|descendancy|family)\s+(?:chart|sunburst|wheel|diagram)|sunburst)`;
const GENS = String.raw`(?:\s+(?:with|of|for|showing)?\s*(\d{1,2})\s+generations?)?`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;

const PATTERNS = [
  // "show me my descendant chart", "draw Cook-8721's descendant sunburst"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?${CHART}${GENS}$`, "i"),
  // "draw a descendant chart for her", "show a descendant sunburst of my descendants"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${CHART}\s+(?:of|for)\s+(?:${OWNER}\s+descendants|${OWNER_AFTER})${GENS}$`, "i"),
  // "show her descendants as a chart", "visualize my descendants"
  new RegExp(String.raw`^(?:show|draw|display)(?:\s+me)?\s+${OWNER}\s+descendants\s+(?:as|in)\s+an?\s+(?:chart|sunburst|wheel|diagram|fan\s+chart)${GENS}$`, "i"),
  new RegExp(String.raw`^(?:visuali[sz]e|chart|graph)\s+${OWNER}\s+descendants${GENS}$`, "i"),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "my";
  if (/^her$/i.test(raw)) return "her";
  if (/^(?:his|him)$/i.test(raw)) return "his";
  if (/^(?:their|them)$/i.test(raw)) return "their";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** {owner, generations, descendantPrompt} or null; owner as in parseFanChartPrompt. */
export function parseDescendantChartPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const ownerWord = match.slice(1, -1).find(Boolean);
    const owner = canonicalOwner(ownerWord);
    const asked = Number(match[match.length - 1]);
    const generations =
      Number.isFinite(asked) && asked > 0 ? Math.min(Math.max(asked, 1), DESCENDANT_CHART_MAX_GENERATIONS) : DESCENDANT_CHART_DEFAULT_GENERATIONS;
    const descendantPrompt = !owner
      ? "this profile's descendants"
      : /^(?:my|her|his|their)$/.test(owner)
      ? `${owner} descendants`
      : `${owner}'s descendants`;
    return { owner, generations, descendantPrompt };
  }
  return null;
}

function cleanDate(value) {
  const text = String(value || "");
  return text && !/^0000/.test(text) ? text : "";
}

function summarize(person) {
  return {
    id: person.Id,
    wtid: person.Name || "",
    // (WikiTree sends only the Id for a profile you may not see: private or unlisted, not on its Trusted List)
    name: person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name || "Private",
    hidden: !(person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name),
    fullName: fullWikiTreeName(person),
    lnab: person.LastNameAtBirth || "",
    gender: person.Gender || "",
    birth: cleanDate(person.BirthDate),
    death: cleanDate(person.DeathDate),
    birthLocation: person.BirthLocation || "",
    deathLocation: person.DeathLocation || "",
    birthCountry: getCountryFromLocation(person.BirthLocation || "") || "",
    photo: person.Photo || "",
    photoData: person.PhotoData || null,
    // (IsLiving is asked for by the DNA carriers chart: who could still take a test)
    living: Number(person.IsLiving) === 1,
  };
}

function birthSortKey(node) {
  return node.person.birth || "9999";
}

/**
 * people: getPeople's people map. Returns {person, children: [...]} rooted at
 * rootKey (an Id or WikiTree ID), or null when the root isn't in the map.
 */
// A descendants request can send the starting person masked (a negative Id, no name) even
// when a plain lookup shows them: Larry Maloney-2333, Public, live 2026-10-04. They're the
// masked profile with children whose parents aren't in the set; rootProfile fills them in.
function maskedRoot(list, childrenOf, rootProfile) {
  const ids = new Set(list.map((person) => String(person.Id)));
  const candidates = list.filter(
    (person) =>
      Number(person.Id) < 0 &&
      !person.Name &&
      childrenOf.has(String(person.Id)) &&
      ![person.Father, person.Mother].some((parentId) => Number(parentId) && ids.has(String(parentId)))
  );
  return candidates.length === 1 ? { ...candidates[0], ...rootProfile, Id: candidates[0].Id } : null;
}

export function buildDescendantTree(people, rootKey, generations = DESCENDANT_CHART_MAX_GENERATIONS, rootProfile = null) {
  const list = Object.values(people || {}).filter(Boolean);
  const childrenOf = new Map();
  list.forEach((person) => {
    [person.Father, person.Mother].forEach((parentId) => {
      if (!Number(parentId)) return;
      const key = String(parentId);
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key).push(person);
    });
  });
  let root = list.find((person) => String(person.Id) === String(rootKey) || String(person.Name) === String(rootKey));
  if (!root && rootProfile) root = maskedRoot(list, childrenOf, rootProfile);
  if (!root) return null;
  const placed = new Set([String(root.Id)]);
  const top = { person: summarize(root), children: [], depth: 0 };
  let level = [[root, top]];
  for (let depth = 1; depth <= generations && level.length; depth += 1) {
    const next = [];
    level.forEach(([person, node]) => {
      (childrenOf.get(String(person.Id)) || []).forEach((child) => {
        if (placed.has(String(child.Id))) return;
        placed.add(String(child.Id));
        const childNode = { person: summarize(child), children: [], depth };
        node.children.push(childNode);
        next.push([child, childNode]);
      });
      node.children.sort((a, b) => birthSortKey(a).localeCompare(birthSortKey(b)));
    });
    level = next;
  }
  return top;
}

/** {total, byGeneration: [{generation, count}], surnames: [[surname, count]]}, the root not counted. */
export function descendantTreeStats(tree) {
  const byGeneration = new Map();
  const surnames = new Map();
  let total = 0;
  const walk = (node) => {
    node.children.forEach((child) => {
      total += 1;
      byGeneration.set(child.depth, (byGeneration.get(child.depth) || 0) + 1);
      if (child.person.lnab) surnames.set(child.person.lnab, (surnames.get(child.person.lnab) || 0) + 1);
      walk(child);
    });
  };
  if (tree) walk(tree);
  return {
    total,
    byGeneration: [...byGeneration.entries()].sort((a, b) => a[0] - b[0]).map(([generation, count]) => ({ generation, count })),
    surnames: [...surnames.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}

function generationNoun(generation, count) {
  const plural = count === 1 ? "" : "ren";
  if (generation === 1) return `child${plural}`;
  if (generation === 2) return `grandchild${plural}`;
  if (generation === 3) return `great-grandchild${plural}`;
  return `${generation - 2}x great-grandchild${plural}`;
}

/** "Ellen's descendant chart shows 212 descendants over 5 generations: 9 children, …". */
export function buildDescendantChartSummary(tree, ownerText, generations) {
  const { total, byGeneration, surnames } = descendantTreeStats(tree);
  if (!total) return `${ownerText} descendant chart is empty: no children are recorded on WikiTree.`;
  const parts = byGeneration.map(({ generation, count }) => `${count.toLocaleString()} ${generationNoun(generation, count)}`);
  const surnameText = surnames.length > 1 ? ` The most common surnames are ${surnames.slice(0, 3).map(([name, count]) => `${name} (${count})`).join(", ")}.` : "";
  return `${ownerText} descendant chart shows ${total.toLocaleString()} descendant${total === 1 ? "" : "s"} over ${generations} generation${
    generations === 1 ? "" : "s"
  }: ${parts.join(", ")}.${surnameText}`;
}

/** A getPeople profile in the shape the tree charts and maps use. */
export function summarizeTreePerson(person) {
  return summarize(person);
}

/**
 * A set of profiles that aren't one person's descendants (those connected to a DNA test)
 * as a tree: each hangs under a parent in the set (the father first), the rest under a
 * root with no place, so a map draws parent → child moves within the set only.
 */
export function buildForest(people, rootLabel = "") {
  const list = Object.values(people || {}).filter((person) => person?.Name);
  const nodes = new Map(list.map((person) => [String(person.Id), { person: summarize(person), children: [] }]));
  const top = { person: { name: rootLabel }, children: [] };
  list.forEach((person) => {
    const parent = nodes.get(String(person.Father)) || nodes.get(String(person.Mother));
    (parent || top).children.push(nodes.get(String(person.Id)));
  });
  return top;
}
