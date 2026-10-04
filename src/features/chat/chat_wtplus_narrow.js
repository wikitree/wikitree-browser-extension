// C33, "how many have no sources?" after a WT+ search: narrow that search with a
// WT+ flag instead of starting a new one (live, 2026-10-03, it re-ran the base
// query). The flag is checked by WT+ itself, which the loaded rows can't do.

const NARROW_FLAGS = [
  { flag: "Unsourced", label: "unsourced", re: /\b(?:unsourced|no\s+sources?|without\s+(?:any\s+)?sources?|lack(?:ing)?\s+sources?|need(?:ing)?\s+sources?)\b/i },
  { flag: "Unconnected", label: "unconnected", re: /\b(?:unconnected|not\s+connected(?:\s+to\s+the\s+(?:main\s+)?tree)?)\b/i },
  { flag: "Orphan", label: "without a manager", re: /\b(?:orphan(?:ed|s)?|no\s+managers?|without\s+(?:a\s+)?managers?|unmanaged)\b/i },
  { flag: "NoParents", label: "with no parents", re: /\b(?:no\s+parents|without\s+parents|parentless)\b/i },
  { flag: "NoChildren", label: "with no children", re: /\b(?:no\s+children|without\s+children|childless)\b/i },
  { flag: "NoSpouses", label: "with no spouse", re: /\b(?:no\s+spouses?|without\s+(?:a\s+)?spouses?|never\s+married|unmarried)\b/i },
  { flag: "Notables", label: "notable", re: /\b(?:notables?|famous)\b/i },
];

// Must clearly refer to the current results, so a fresh search isn't swallowed.
const FOLLOWUP_RE =
  /^(?:and\s+)?(?:how\s+many(?:\s+of\s+(?:them|these|those|the(?:se)?\s+results))?|which(?:\s+of\s+(?:them|these|those))?(?:\s+ones)?|which\s+ones|(?:show\s+(?:me\s+)?|filter\s+(?:to\s+)?|keep\s+)?(?:only|just)(?:\s+the)?|show\s+(?:me\s+)?the|filter\s+(?:to\s+)?the|of\s+(?:them|these|those),?\s+(?:how\s+many|which))\b/i;

/** {flag, label, countOnly} or null. */
export function parseWtPlusNarrowPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  if (!FOLLOWUP_RE.test(text)) return null;
  // A named place or surname ("how many Beacalls have no sources") is a new search.
  const rest = text.replace(FOLLOWUP_RE, "").trim();
  if (/\b(?:in|from|born|died|named|called)\s+[A-Z]/.test(rest) || /\b[A-Z][a-z]+s\b/.test(rest)) return null;
  const hits = NARROW_FLAGS.filter((entry) => entry.re.test(rest));
  if (hits.length !== 1) return null;
  return { flag: hits[0].flag, label: hits[0].label, countOnly: /^(?:and\s+)?how\s+many\b/i.test(text) };
}

/** The query with the flag added to every OR branch, ahead of any NOT clause. */
export function narrowWtPlusQuery(query, flag) {
  return String(query || "")
    .split(/\s+OR\s+/)
    .map((branch) => {
      if (new RegExp(`(?:^|\\s)${flag}(?:\\s|$)`).test(branch)) return branch;
      const notIndex = branch.search(/\sNOT\s/);
      return notIndex >= 0
        ? `${branch.slice(0, notIndex)} ${flag}${branch.slice(notIndex)}`
        : `${branch} ${flag}`;
    })
    .join(" OR ");
}

/** The WT+ query behind the current result (a grouped table keeps it on its source). */
export function getResultWtPlusQuery(result) {
  return String(result?.wtPlusQuery || result?.sourceResult?.wtPlusQuery || "").trim();
}

// C33, live 2026-10-03: "only the women" then "how many have no sources?" re-ran
// the unfiltered search + Unsourced, so it counted the men too. A table filtered
// in the browser keeps only its own rows from the WT+ answer.
export function isLocallyFilteredResult(result) {
  return Boolean(result?.filterContext) || / filtered \(/.test(String(result?.title || ""));
}

/** narrowResult ({message, table}) cut down to the current rows' WT IDs. */
export function restrictNarrowResultToRows(narrowResult, currentRows, label, narrowedQuery) {
  const rows = narrowResult?.table?.rows;
  if (!Array.isArray(rows) || !Array.isArray(currentRows)) return narrowResult;
  const keep = new Set(currentRows.map((row) => String(row?.wtid || "").trim()).filter(Boolean));
  const kept = rows.filter((row) => keep.has(String(row?.wtid || "").trim()));
  const total = keep.size;
  return {
    ...narrowResult,
    message: `${kept.length} of the ${total} profile${total === 1 ? "" : "s"} in the current filtered table ${
      kept.length === 1 ? "is" : "are"
    } ${label} (WT+ query: ${narrowedQuery}).`,
    table: kept.length ? { ...narrowResult.table, rows: kept, title: `${narrowResult.table.title || "Results"} (current table only)` } : undefined,
  };
}
