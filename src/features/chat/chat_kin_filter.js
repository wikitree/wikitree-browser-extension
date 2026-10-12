import { yearOf } from "./chat_text_utils";
// "how many of her siblings were born in England?" (live, 2026-10-03: AI). The
// relation counter has no place or date filter; this splits the clause off so
// the plain relation routes, and filters its people afterwards. Descendant and
// ancestor lists have their own filters (H5, R6) and route before this.

const FILTER_RE =
  /^(?:(how\s+many|which|who)\s+of\s+|(?:list|show(?:\s+me)?)\s+)?((?:my|his|her|their|[A-Z][A-Za-z' -]*?['’]s?)\s+[a-z' -]+?)\s+(?:(?:who|that)\s+)?(?:were\s+|was\s+)?(born|died)\s+(?:(in)\s+([A-Za-z][A-Za-z ,.'-]*)|(before|after)\s+(\d{4}))$/i;

/** {basePrompt, mode, filter} or null. basePrompt is the plain relation list ("her siblings"). */
export function splitKinFilterClause(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const match = text.match(FILTER_RE);
  if (!match) return null;
  const died = /^died$/i.test(match[3]);
  const filter = match[4]
    ? { field: died ? "DeathLocation" : "BirthLocation", place: match[5].trim() }
    : { field: died ? "DeathDate" : "BirthDate", direction: match[6].toLowerCase(), year: Number(match[7]) };
  return { basePrompt: match[2].trim(), mode: /^how\s+many$/i.test(match[1] || "") ? "count" : "list", filter };
}

/** {matched, unknown}: unknown people have no value for the field. */
export function applyKinFilter(people, filter) {
  const matched = [];
  let unknown = 0;
  for (const person of people || []) {
    if (/Location$/.test(filter.field)) {
      const place = String(person?.[filter.field] || "").toLowerCase();
      if (!place) unknown += 1;
      else if (place.includes(filter.place.toLowerCase())) matched.push(person);
    } else {
      const year = yearOf(person?.[filter.field]);
      if (year === null) unknown += 1;
      else if (filter.direction === "before" ? year < filter.year : year > filter.year) matched.push(person);
    }
  }
  return { matched, unknown };
}

/** "born in England", "died before 1900". */
export function kinFilterPhrase(filter) {
  const verb = /^Death/.test(filter.field) ? "died" : "born";
  return filter.place ? `${verb} in ${filter.place}` : `${verb} ${filter.direction} ${filter.year}`;
}
