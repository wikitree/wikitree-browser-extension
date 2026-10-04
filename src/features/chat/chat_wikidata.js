// Famous people on Wikidata (2026-10-04): Wikidata keeps each notable person's WikiTree ID
// (property P2949), so "Bill Clinton" → Blythe-6 without guessing his birth name. Free, no
// key, and CORS-open (origin=*), so the content script can ask it directly. Used only when
// the AI has named a specific person: a match must share the AI's birth year (±1), so a
// common name never picks some other famous namesake.

const API = "https://www.wikidata.org/w/api.php";
const WIKITREE_ID = "P2949";
const BIRTH = "P569";
const TIMEOUT_MS = 5000;

async function getJson(params, fetchImpl) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const query = new URLSearchParams({ ...params, format: "json", origin: "*" });
    const response = await fetchImpl(`${API}?${query}`, controller ? { signal: controller.signal } : undefined);
    return response?.ok ? await response.json() : null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const claimValue = (entity, property) => entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
const birthYearOf = (entity) => {
  const time = claimValue(entity, BIRTH)?.time; // "+1946-08-19T00:00:00Z"
  const match = String(time || "").match(/^[+-]?(\d{1,4})-/);
  return match ? Number(match[1]) : null;
};

/**
 * names: the names to search (the name the person is known by first). birthYear: the AI's.
 * → {wtId, label, qid} for the first search result with a WikiTree ID and a birth year
 * within a year of birthYear, or null (no birth year, nothing found, or Wikidata unreachable).
 */
export async function findWikiTreeIdOnWikidata(names, birthYear, { fetchImpl = globalThis.fetch } = {}) {
  const year = Number(birthYear);
  if (!Number.isFinite(year) || year <= 0 || typeof fetchImpl !== "function") return null;
  const tried = new Set();
  for (const raw of names || []) {
    const name = String(raw || "").trim();
    if (!name || !/\s/.test(name) || tried.has(name.toLowerCase())) continue; // (a full name only)
    tried.add(name.toLowerCase());
    try {
      const search = await getJson({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "5" }, fetchImpl);
      const ids = (search?.search || []).map((hit) => hit.id).filter(Boolean);
      if (!ids.length) continue;
      const data = await getJson({ action: "wbgetentities", ids: ids.join("|"), props: "claims|labels", languages: "en" }, fetchImpl);
      for (const id of ids) {
        const entity = data?.entities?.[id];
        const wtId = String(claimValue(entity, WIKITREE_ID) || "").trim();
        const born = birthYearOf(entity);
        if (wtId && born && Math.abs(born - year) <= 1) return { wtId, label: entity?.labels?.en?.value || name, qid: id };
      }
    } catch (error) {
      console.debug("wbe: Wikidata lookup failed", { name, error: error?.message || error });
      return null;
    }
  }
  return null;
}
