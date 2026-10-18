// The router's canonical WT+ searches: "notables in my CC7", "dna-confirmed in Cook-8721's ancestors",
// "category Guitarists in my descendants", "unsourced female firstname Mary in my ancestors",
// "female birthplace Wales born before 1900 in my ancestors"; "notables in CC7" (no owner: the page person, else you). The router has already read
// the request, so these run as they are (chat_profile_search), not as a fresh prompt for the readers or the AI.

const FILTER = String.raw`(?:notables|dna-confirmed|unsourced|female|male)`;
const CANONICAL_RE = new RegExp(
  String.raw`^(?:(${FILTER}(?:\s+${FILTER})*)\s+)?(?:firstname\s+(\S+)\s+)?(?:lastname\s+(\S+)\s+)?(?:category\s+(.+?)\s+)?` +
    String.raw`(?:birthplace\s+(.+?)\s+)?(?:deathplace\s+(.+?)\s+)?(?:(born|died)\s+(before|after|between)\s+(\d{4}(?:-\d{4})?)\s+)?` +
    String.raw`in\s+(?:(?:(my)|(.+?)['’]s)\s+)?(cc7|ancestors|descendants)$`,
  "i"
);

/**
 * {filters: ["notables" | "dna-confirmed" | "unsourced" | "female" | "male"], firstName, lastName, category, birthPlace,
 * deathPlace, date: {event: "born" | "died", direction: "before" | "after" | "between", value} | null, mine, owner,
 * scope: "CC7" | "Ancestors" | "Descendants"}, or null.
 */
export function parseRouterCanonicalSearch(query) {
  const match = String(query || "")
    .trim()
    .match(CANONICAL_RE);
  if (!match || !(match[1] || match[2] || match[3] || match[4])) return null;
  return {
    filters: match[1] ? match[1].toLowerCase().split(/\s+/) : [],
    firstName: match[2] || "",
    lastName: match[3] || "",
    category: match[4] || "",
    birthPlace: match[5] || "",
    deathPlace: match[6] || "",
    date: match[7] ? { event: match[7].toLowerCase(), direction: match[8].toLowerCase(), value: match[9] } : null,
    mine: Boolean(match[10]),
    owner: match[11] || "",
    scope: { cc7: "CC7", ancestors: "Ancestors", descendants: "Descendants" }[match[12].toLowerCase()],
  };
}

export const isRouterCanonicalSearch = (query) => Boolean(parseRouterCanonicalSearch(query));
