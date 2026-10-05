// E5, "which of her children had children of their own?": each child's own
// child count. Live, 2026-10-03, the AI asked which woman "her" meant.

const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))`;
const KIDS = String.raw`(?:children|kids|sons|daughters)`;
const HAVE = String.raw`(?:had|have|has)`;
const PATTERNS = [
  // "which of her children had children of their own", "which of Ellen's kids had no children"
  new RegExp(String.raw`^(?:which|who)\s+of\s+${OWNER}\s+${KIDS}\s+${HAVE}\s+(no|any)?\s*(?:children|kids|issue|descendants)(?:\s+of\s+their\s+own)?$`, "i"),
  // "which of her children never had children"
  new RegExp(String.raw`^(?:which|who)\s+of\s+${OWNER}\s+${KIDS}\s+(never)\s+had\s+(?:any\s+)?(?:children|kids)(?:\s+of\s+their\s+own)?$`, "i"),
  // "did all of her children have children"
  new RegExp(String.raw`^did\s+(?:all\s+(?:of\s+)?)?${OWNER}\s+${KIDS}\s+have\s+(any\s+)?(?:children|kids)(?:\s+of\s+their\s+own)?$`, "i"),
];

// I8 (live, 2026-10-03): "how many of her children married?" — the AI guessed
// from the bio. Each child's recorded spouses are counted instead.
const MARRIED = String.raw`(?:married|got\s+married|were\s+married|was\s+married|wed)`;
const MARRIED_PATTERNS = [
  // "how many of her children married", "which of her children never married"
  new RegExp(String.raw`^(?:how\s+many|which|who)\s+of\s+${OWNER}\s+${KIDS}\s+(never|didn't|did\s+not)?\s*(?:get\s+married|marry|${MARRIED})$`, "i"),
  // "did all of her children marry"
  new RegExp(String.raw`^did\s+(?:all\s+(?:of\s+)?)?${OWNER}\s+${KIDS}\s+()(?:marry|get\s+married)$`, "i"),
];

function ownerTarget(raw) {
  if (/^(?:her|his|their)$/i.test(raw)) return "";
  if (/^my$/i.test(raw)) return "me";
  if (!/-\d+$/.test(raw) && !/^(?:[A-Z][^\s]*\s*)+$/.test(raw)) return null;
  return raw;
}

/** {target, without, kind?} ("" = page profile, "me" = the user), or null. kind "spouses" = married. */
export function parseChildrenWithChildrenPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  // "which of her sons…": only that gender.
  const gender = /\bsons\b/i.test(text) ? "Male" : /\bdaughters\b/i.test(text) ? "Female" : "";
  const withGender = (params) => (params && gender ? { ...params, gender } : params);
  for (const re of MARRIED_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const target = ownerTarget(match[1].replace(/(?:'s|’s)$/, "").trim());
    if (target === null) return null;
    return withGender({ target, without: Boolean(match[2]), kind: "spouses" });
  }
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const target = ownerTarget(match[1].replace(/(?:'s|’s)$/, "").trim());
    if (target === null) return null;
    return withGender({ target, without: /^(?:no|never)$/i.test(String(match[2] || "")) });
  }
  return null;
}

/** rows: [{label, spouseCount}] in birth order. */
export function buildChildrenMarriedAnswer(subjectLabel, rows, { without = false } = {}) {
  if (!rows.length) return `WikiTree has no children recorded for ${subjectLabel}.`;
  const married = rows.filter((row) => row.spouseCount > 0);
  const unmarried = rows.filter((row) => !row.spouseCount);
  const total = `${rows.length} ${rows.length === 1 ? "child" : "children"}`;
  const note = "(No spouse on WikiTree doesn't mean they never married.)";
  if (without) {
    if (!unmarried.length) return `All of ${subjectLabel}'s ${total} have a spouse recorded on WikiTree.`;
    return `${unmarried.length} of ${subjectLabel}'s ${total} ${
      unmarried.length === 1 ? "has" : "have"
    } no spouse recorded on WikiTree:\n${unmarried.map((row) => `- ${row.label}`).join("\n")}\n${note}`;
  }
  if (!married.length) return `None of ${subjectLabel}'s ${total} have a spouse recorded on WikiTree. ${note}`;
  const line = (row) => `- ${row.label}${row.spouseCount > 1 ? ` (${row.spouseCount} spouses)` : ""}`;
  const rest = unmarried.length ? `\nNo spouse recorded: ${unmarried.map((row) => row.label).join(", ")}.` : "";
  return `${married.length} of ${subjectLabel}'s ${total} ${
    married.length === 1 ? "has" : "have"
  } a spouse on WikiTree:\n${married.map(line).join("\n")}${rest}`;
}

/** rows: [{label, childCount}] in birth order. */
export function buildChildrenWithChildrenAnswer(subjectLabel, rows, { without = false } = {}) {
  if (!rows.length) return `WikiTree has no children recorded for ${subjectLabel}.`;
  const withKids = rows.filter((row) => row.childCount > 0);
  const withoutKids = rows.filter((row) => !row.childCount);
  const line = (row) => `- ${row.label}: ${row.childCount} ${row.childCount === 1 ? "child" : "children"}`;
  const total = `${rows.length} ${rows.length === 1 ? "child" : "children"}`;
  if (without) {
    if (!withoutKids.length) return `All of ${subjectLabel}'s ${total} have children recorded on WikiTree.`;
    return `${withoutKids.length} of ${subjectLabel}'s ${total} ${
      withoutKids.length === 1 ? "has" : "have"
    } no children recorded on WikiTree:\n${withoutKids.map((row) => `- ${row.label}`).join("\n")}\n(No children on WikiTree doesn't mean they had none.)`;
  }
  if (!withKids.length) return `None of ${subjectLabel}'s ${total} have children recorded on WikiTree.`;
  const rest = withoutKids.length ? `\nNo children recorded: ${withoutKids.map((row) => row.label).join(", ")}.` : "";
  return `${withKids.length} of ${subjectLabel}'s ${total} ${
    withKids.length === 1 ? "has" : "have"
  } children on WikiTree:\n${withKids.map(line).join("\n")}${rest}`;
}
