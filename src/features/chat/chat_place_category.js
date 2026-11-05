// "Slave owners in Mississippi": the AI's query (Location=Mississippi
// CategoryWord="Slave Owners") is already a good search (1,373). WikiTree also
// has a "Mississippi, Slave Owners" tree whose county subcategories hold people
// with no Mississippi place recorded (SubCat9: 1,303); OR'd together, 1,632.
// Without an exact one, the AI picks a broader tree from the WT+ picker list
// ("England, Potters") and it is OR'd in with the Location kept: Staffordshire
// potters 33 by word, 70 by that tree. Trees only ever add to the AI's query.
// Replacing the query was the old bug: a seed category guessed blind ("United
// States, Slave Owners") gave 0, and a chosen tree alone narrowed most cases
// (Natchez 33 vs 56, London butchers 27 vs 50; live, 2026-10-03).

const TOKEN_RE = /[^\s=]+=(?:"[^"]*"|'[^']*'|[^\s]+)|"[^"]*"|'[^']*'|[^\s]+/g;

const unquote = (value) =>
  String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

const normalize = (value) =>
  String(value || "")
    .replace(/__+/g, ", ")
    .replace(/_+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();

/**
 * One any-event Location and one or more category terms, nothing OR'd:
 * "Location=Mississippi CategoryWord="Slave Owners"" → {place, topic, topics, baseTokens}.
 */
export function parsePlaceCategoryQuery(query) {
  const text = String(query || "").trim();
  if (!text || /\s+OR\s+/i.test(text)) return null;
  const tokens = text.match(TOKEN_RE) || [];
  const locations = tokens.filter((t) => /^Location=/i.test(t));
  const categories = tokens.filter((t) => /^(?:CategoryWord|CategoryFull)=/i.test(t));
  if (locations.length !== 1 || !categories.length) return null;
  const place = unquote(locations[0].slice(locations[0].indexOf("=") + 1)).replace(/_/g, " ");
  const topics = categories.map((token) =>
    unquote(token.slice(token.indexOf("=") + 1))
      .replace(/__+/g, ", ")
      .replace(/_/g, " ")
  );
  if (!place || topics.some((topic) => !topic || topic.includes(","))) return null;
  const baseTokens = tokens.filter((t) => t !== locations[0] && !categories.includes(t));
  return { place, topic: topics.join(" "), topics, baseTokens, locationToken: locations[0] };
}

/** The category named exactly "Place, Topic" in a WT+ category-picker reply. */
export function pickPlaceCategory(categories, place, topic) {
  const wanted = normalize(`${place}, ${topic}`);
  const list = Array.isArray(categories) ? categories : [];
  const hit = list.find((entry) => normalize(entry?.category || entry?.Name || "") === wanted);
  return hit ? String(hit.category || hit.Name).trim() : "";
}

/** A category tree branch OR'd with the original query. */
export function buildPlaceCategoryQuery(originalQuery, treeTokens, categoryName) {
  const tree = [...(treeTokens || []), `SubCat9="${categoryName}"`].join(" ").trim();
  return `${tree} OR ${String(originalQuery || "").trim()}`;
}

/** Broad categories first, so the cap keeps them (the picker lists regiments first). */
export function orderCategoryNamesForChoice(names, limit = 80) {
  const parts = (name) => String(name).split(",").length;
  return [...new Set((names || []).map((name) => String(name || "").trim()).filter(Boolean))]
    .sort((a, b) => parts(a) - parts(b) || a.length - b.length)
    .slice(0, limit);
}

export function buildCategoryChoicePrompt(rawPrompt, place, topic, names) {
  return [
    "Pick the WikiTree category tree to add to a search. Its subcategories are included, and the search keeps the place filter, so choose the broadest category for the topic in the country or region that contains the place (for Staffordshire potters: \"England, Potters\").",
    "Never pick one regiment, ship, census, name study or family, or a category that names no place at all (\"Soldiers\"). If none fits, return an empty category.",
    'Return strict JSON only: {"category":"<exact name from the list>"} or {"category":""}.',
    `Request: ${String(rawPrompt || "").trim()}`,
    `Place: ${place}`,
    `Topic: ${topic}`,
    "Categories:",
    ...(names || []).map((name) => `- ${name}`),
  ].join("\n");
}

/** Only a name from the list counts. */
export function parseCategoryChoice(reply, names) {
  try {
    const text = String(reply || "");
    const parsed = JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
    const wanted = normalize(parsed?.category || "");
    if (!wanted) return "";
    return (names || []).find((name) => normalize(name) === wanted) || "";
  } catch (error) {
    return "";
  }
}
