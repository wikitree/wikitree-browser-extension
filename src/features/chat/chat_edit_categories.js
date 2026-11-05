// Category suggestions on the profile edit page. The AI reads the biography and says what to look
// for (places, cemeteries, occupations, ships...); the code searches the category database for
// each and offers only categories that exist and aren't on the profile yet.

const SUGGEST_PROMPT = new RegExp(
  String.raw`^(?:please\s+)?(?:` +
    // "suggest categories", "find some more categories for this profile"
    String.raw`(?:suggest|find|recommend|propose|look\s+for|search\s+for)\s+(?:some\s+|any\s+|the\s+)?(?:other\s+|more\s+|new\s+)?categor(?:y|ies)` +
    String.raw`(?:\s+(?:for|to\s+add\s+to)\s+(?:this|the|his|her|their)\s+(?:profile|bio|biography|person))?` +
    // "category suggestions"
    String.raw`|categor(?:y|ies)\s+suggestions?` +
    // "what categories should I add?", "which other categories could this profile have?"
    String.raw`|(?:what|which)\s+(?:other\s+|more\s+)?categories\s+(?:should|could|can|might)\s+(?:i|we)\s+add(?:\s+to\s+(?:this|the)\s+(?:profile|bio|biography))?` +
    String.raw`|(?:what|which)\s+(?:other\s+|more\s+)?categories\s+(?:fit|apply|are\s+missing)` +
    String.raw`)\s*[?.!]*$`,
  "i"
);

/** "suggest categories" on the edit page ("add categories" stays Auto Categories). */
export function isCategorySuggestPrompt(prompt, { onEditPage = false } = {}) {
  return Boolean(onEditPage) && SUGGEST_PROMPT.test(String(prompt || "").trim());
}

const CATEGORY_LINK = /\[\[\s*Category\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/gi;
const norm = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The categories already in the text, normalised for comparing. */
export function existingCategories(text) {
  return new Set([...String(text || "").matchAll(CATEGORY_LINK)].map((match) => norm(match[1])));
}

const CIB_TYPES = new Set(["category", "location", "cemetery"]);
export const MAX_CATEGORY_SEARCHES = 8;

/** The one AI call: what to search the category database for. */
export function categorySearchPrompt(bio, facts = {}) {
  const known = Object.entries(facts)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return [
    "You help add categories to a WikiTree profile. Read the profile below and list what to search WikiTree's category database for.",
    "Look for: places the person lived, was born, married, died or was buried; cemeteries and churches; occupations; military service and units; ships and migrations; schools; religion; notable events.",
    'Answer with JSON only: an array of at most 8 objects like {"search": "Oak Hill Cemetery Atmore Alabama", "type": "cemetery", "why": "buried there"}.',
    '"type" is "cemetery" for a cemetery, "location" for a town, county or country, and "category" for anything else.',
    '"search" is a few plain words, no "Category:". Every word must be in the category\'s name, so keep it short: an occupation as its plural ("Farmers", "Blacksmiths"), a cemetery as its name and town, a ship or unit by its name.',
    "Only list things the text states; don't guess. Say [] if there's nothing.",
    known ? `\nForm details:\n${known}` : "",
    `\nBiography:\n${String(bio || "").slice(0, 12000)}`,
  ].join("\n");
}

/** The AI's answer as [{search, type, why}], or null when it isn't the JSON asked for. */
export function parseCategorySearches(response) {
  const raw = String(response || "");
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) return null;
  let list;
  try {
    list = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  return list
    .map((item) => ({
      search: String(item?.search || "")
        .replace(/^\s*category\s*:\s*/i, "")
        .replace(/[[\]{}|<>]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      type: CIB_TYPES.has(String(item?.type || "").toLowerCase()) ? String(item.type).toLowerCase() : "category",
      why: String(item?.why || "").trim(),
    }))
    .filter((item) => item.search.length >= 3 && !seen.has(norm(item.search)) && seen.add(norm(item.search)))
    .slice(0, MAX_CATEGORY_SEARCHES);
}

const STOP = new Set(["the", "of", "and", "in", "at", "on", "a", "an", "for", "to", "from", "st", "saint"]);
const words = (text) =>
  norm(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP.has(word));

/** The words of the biography and form, for pickCategory's `context`. */
export function contextWords(...texts) {
  return new Set(words(texts.join(" ")));
}

/**
 * The best category for one search, or null. A match needs most of the search's words
 * (in its name, location or parents); top-level and existing categories are left out. With
 * `context` (contextWords of the profile), every other word in the category's name must be on the
 * profile: a Devon farmer's "Farmers" search returns "Arkansas Farmers" too (live, 2026-10-14).
 */
export function pickCategory(search, categories, existing = new Set(), context = null) {
  const wanted = words(search);
  if (!wanted.length || !Array.isArray(categories)) return null;
  let best = null;
  categories.forEach((entry, index) => {
    const name = String(entry?.category || "").trim();
    if (!name || entry?.topLevel || existing.has(norm(name))) return;
    const own = new Set(words(`${name} ${entry.name || ""} ${entry.aka || ""} ${entry.location || ""}`));
    const around = new Set(words(`${entry.parent || ""} ${entry.locationParent || ""} ${entry.gParent || ""}`));
    const hits = wanted.filter((word) => own.has(word) || around.has(word)).length;
    const ownHits = wanted.filter((word) => own.has(word)).length;
    if (!ownHits || hits / wanted.length < 0.6) return;
    if (context && words(name).some((word) => !wanted.includes(word) && !context.has(word))) return;
    // more of the search in the name, then fewer extra words, then the database's order
    const score = hits * 10 + ownHits * 5 - Math.abs(words(name).length - wanted.length) - index / 1000;
    if (!best || score > best.score) best = { category: name, score };
  });
  return best?.category || null;
}

const IS_CATEGORY_LINE = /^\s*\[\[\s*Category\s*:/i;

/**
 * The text with [[Category: name]] added after the categories at the top (or as the first line), and
 * where it went (`at`, `added`), so a cursor after it can move down. Unchanged when the category is already there.
 */
export function addCategoryToText(text, category) {
  const source = String(text || "");
  const name = String(category || "").trim();
  if (!name || existingCategories(source).has(norm(name))) return { text: source, at: -1, added: "" };
  const lines = source.split("\n");
  let after = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (IS_CATEGORY_LINE.test(lines[i])) after = i;
    else if (lines[i].trim()) break;
  }
  const at = after < 0 ? 0 : lines.slice(0, after + 1).join("\n").length + 1;
  const line = `[[Category: ${name}]]\n`;
  // (always text = before + added + after, so it can go in with setRangeText)
  const { where, added } = at > source.length ? { where: source.length, added: `\n${line}` } : { where: at, added: line };
  return { text: source.slice(0, where) + added + source.slice(where), at: where, added };
}

/** The answer above the buttons. */
export function categorySuggestionsMessage(found) {
  if (!found.length) return "I looked for categories that fit this biography, but found none that aren't on the profile already.";
  const lines = found.map((item) => `- ${item.category}${item.why ? ` (${item.why})` : ""}`);
  return `Categories that may fit, from the category database:\n${lines.join("\n")}\n\nCheck each one's page before adding it. Each button adds the category at the top of the biography.`;
}
