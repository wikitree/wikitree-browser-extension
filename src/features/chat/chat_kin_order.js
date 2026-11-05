// F5, "list her siblings in birth order": a trailing order clause on a family
// list (live, 2026-10-03: "There is no structured result yet" — the "list X"
// text filter caught it). The list is routed without it and sorted by birth.

const ORDER_CLAUSES = [
  { order: "birth", re: /\s*,?\s+(?:in\s+(?:order\s+of\s+birth|birth\s+order|chronological\s+order|age\s+order)|chronologically|oldest\s+(?:first|to\s+youngest)|eldest\s+first|(?:sorted|ordered|arranged)\s+by\s+(?:birth(?:\s+(?:date|year))?|age|date\s+of\s+birth)|by\s+(?:birth\s+(?:date|year)|age))$/i },
  // J9 (live, 2026-10-03): "her children sorted by death date" went to the AI,
  // which invented a child.
  { order: "death", re: /\s*,?\s+(?:in\s+(?:order\s+of\s+death|death\s+order)|(?:sorted|ordered|arranged)\s+by\s+(?:death(?:\s+(?:date|year))?|date\s+of\s+death)|by\s+death\s+(?:date|year))$/i },
  // "list my ancestors by generation" (imagined AB6, 2026-10-18): parents, then grandparents…
  { order: "generation", re: /\s*,?\s+(?:(?:sorted|ordered|arranged|listed|grouped)\s+)?(?:by|in\s+order\s+of)\s+generations?$|\s*,?\s+generation\s+by\s+generation$/i },
  { order: "birthDesc", re: /\s*,?\s+(?:youngest\s+(?:first|to\s+oldest)|newest\s+first|in\s+reverse\s+(?:birth|chronological)\s+order)$/i },
];

/** {basePrompt, order} when the prompt ends in an order clause, else null. */
export function splitKinOrderClause(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { order, re } of ORDER_CLAUSES) {
    const match = text.match(re);
    if (match && match.index > 0) return { basePrompt: text.slice(0, match.index).trim(), order };
  }
  return null;
}

function dateKey(person, order) {
  const value = String(
    /^death/.test(order) ? person?.death || person?.DeathDate || "" : person?.birth || person?.BirthDate || ""
  );
  const match = value.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return "";
  return `${match[1]}-${match[2] || "00"}-${match[3] || "00"}`;
}

/** A copy sorted by birth date ("birth" oldest first, "birthDesc" youngest first) or death date ("death"), undated last; or by generation. */
export function sortByBirth(rows, order) {
  if (order === "generation") return sortByGeneration(rows);
  const sign = order === "birthDesc" ? -1 : 1;
  return (rows || []).slice().sort((left, right) => {
    const a = dateKey(left, order);
    const b = dateKey(right, order);
    if (!a || !b) return (a ? 0 : 1) - (b ? 0 : 1);
    return sign * a.localeCompare(b);
  });
}

// (generation 1 is the parents; Ahnentafel numbers keep fathers before mothers)
function sortByGeneration(rows) {
  const number = (value) => (Number.isFinite(Number(value)) && value !== "" && value != null ? Number(value) : Infinity);
  return (rows || []).slice().sort((left, right) => number(left?.degrees) - number(right?.degrees) || number(left?.ahnen) - number(right?.ahnen));
}

// "who was her eldest brother" (imagined AA3, 2026-10-18): her brothers by birth, the first. (Children have their
// own pick, childPick.)
const PICK_RE =
  /^(?:who\s+(?:is|was)\s+)?(my|our|her|his|their|[A-Z][A-Za-z'_-]*-\d+['’]s)\s+(eldest|oldest|youngest|first[\s-]?born|last[\s-]?born)\s+(brother|sister|sibling)$/i;

/** {basePrompt: "her brothers", order, label: "eldest brother"} or null. */
export function splitKinPick(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(PICK_RE);
  if (!match) return null;
  const which = match[2].toLowerCase().replace(/[\s-]/g, "");
  const order = /^(?:youngest|lastborn)$/.test(which) ? "birthDesc" : "birth";
  return { basePrompt: `${match[1]} ${match[3].toLowerCase()}s`, order, label: `${match[2].toLowerCase()} ${match[3].toLowerCase()}` };
}

/** The first of rows in that order with a known birth date; undated: how many had none. */
export function pickByBirth(rows, order) {
  const dated = (rows || []).filter((row) => dateKey(row, order));
  return { picked: sortByBirth(dated, order)[0] || null, undated: (rows || []).length - dated.length };
}

export const KIN_ORDER_LABELS = { birth: "oldest first", birthDesc: "youngest first", death: "by death date", generation: "by generation" };
