// D4, "list her children with their birth places": the trailing "with their …"
// clause asks for extra details on a family list, not a filter of an earlier table
// (live, 2026-10-03: "There is no structured result yet"). The list is routed
// without the clause and its preview lines show the asked-for details.

const DETAIL_WORDS = [
  { detail: "birthPlace", re: /^(?:birth\s*places?|places?\s+of\s+birth|birth\s*locations?|where\s+(?:they\s+were\s+)?born)$/i },
  { detail: "deathPlace", re: /^(?:death\s*places?|places?\s+of\s+death|death\s*locations?|where\s+they\s+died)$/i },
  { detail: "birthDate", re: /^(?:birth\s*(?:dates?|years?)|dates?\s+of\s+birth|birthdays?)$/i },
  { detail: "deathDate", re: /^(?:death\s*(?:dates?|years?)|dates?\s+of\s+death)$/i },
  { detail: "places", re: /^(?:places?|locations?)$/i },
];

const CONNECTOR_RE = /\s*,?\s+(?:with|and|including|showing|plus)\s+(?:their\s+|the\s+|his\s+|her\s+|its\s+)?/gi;

function parseDetailList(text) {
  const parts = text
    .split(/\s*(?:,|\band\b|&)\s*(?:their\s+|the\s+)?/i)
    .map((part) => part.trim())
    .filter(Boolean);
  // "birth and death places": a bare "birth" borrows the last part's noun.
  const sharedNoun = (parts[parts.length - 1] || "").match(/\s(places?|dates?|years?|locations?)$/i)?.[1] || "";
  const details = [];
  for (const rawPart of parts) {
    const part = /^(?:birth|death)$/i.test(rawPart) && sharedNoun ? `${rawPart} ${sharedNoun}` : rawPart;
    const hit = DETAIL_WORDS.find((entry) => entry.re.test(part));
    if (!hit) return null;
    if (hit.detail === "places") details.push("birthPlace", "deathPlace");
    else details.push(hit.detail);
  }
  return details.length ? [...new Set(details)] : null;
}

/** {basePrompt, details} when the prompt ends in a details clause, else null. */
export function splitKinDetailsClause(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  // The first connector whose whole remainder is details: "children and
  // grandchildren with their birth places" splits at "with", not "and".
  for (const match of text.matchAll(CONNECTOR_RE)) {
    const basePrompt = text.slice(0, match.index).trim();
    const details = basePrompt ? parseDetailList(text.slice(match.index + match[0].length)) : null;
    if (details) return { basePrompt, details };
  }
  return null;
}

/** " — born in X; died in Y" for the asked-for places (dates are always shown). */
export function formatKinPlaceDetails(person, details = []) {
  const wanted = new Set(details);
  const parts = [];
  if (wanted.has("birthPlace")) parts.push(`born in ${String(person?.birthLocation || person?.BirthLocation || "").trim() || "an unrecorded place"}`);
  if (wanted.has("deathPlace")) parts.push(`died in ${String(person?.deathLocation || person?.DeathLocation || "").trim() || "an unrecorded place"}`);
  return parts.length ? ` — ${parts.join("; ")}` : "";
}
