// G9, "how many of her children died before her?": compare each child's death
// date with the parent's (live, 2026-10-03: fell to the AI).

const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))`;
const SUBJECT = String.raw`(she|he|they|I|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3})`;
const KIDS = String.raw`(?:children|kids|sons|daughters)`;
const PATTERNS = [
  // "how many of her children died before her", "which of Ellen's children died before she did"
  { mode: "before", re: new RegExp(String.raw`^(?:how\s+many|which|who)\s+of\s+${OWNER}\s+${KIDS}\s+died\s+before\s+(?:her|him|them|me|she\s+did|he\s+did|they\s+did|I\s+did|their\s+(?:mother|father|parent))$`, "i") },
  // "which of her children outlived her", "how many of her children survived her"
  { mode: "after", re: new RegExp(String.raw`^(?:how\s+many|which|who)\s+of\s+${OWNER}\s+${KIDS}\s+(?:outlived|survived)\s+(?:her|him|them|me|their\s+(?:mother|father|parent))$`, "i") },
  // "did she outlive any of her children", "which of her children did she outlive"
  { mode: "before", re: new RegExp(String.raw`^did\s+${SUBJECT}\s+outlive\s+any\s+of\s+(?:her|his|their|my)\s+${KIDS}$`, "i") },
  { mode: "before", re: new RegExp(String.raw`^(?:which|how\s+many)\s+of\s+${OWNER}\s+${KIDS}\s+did\s+(?:she|he|they|I)\s+outlive$`, "i") },
];

/** {target, mode} ("" = page profile, "me" = the user), or null. */
export function parseOutlivedPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { mode, re } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const raw = match[1].replace(/(?:'s|’s)$/, "").trim();
    if (/^(?:her|his|their|she|he|they)$/i.test(raw)) return { target: "", mode };
    if (/^(?:my|I)$/i.test(raw)) return { target: "me", mode };
    if (!/-\d+$/.test(raw) && !/^(?:[A-Z][^\s]*\s*)+$/.test(raw)) return null;
    return { target: raw, mode };
  }
  return null;
}

function dateKey(value) {
  const match = String(value || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return null;
  return { year: match[1], full: `${match[1]}-${match[2] || "00"}-${match[3] || "00"}`, exact: match[2] !== "00" && match[3] !== "00" && Boolean(match[2]) && Boolean(match[3]) };
}

/** "before" | "after" | "unsure" | "unknown" for a child's death against the parent's. */
export function compareDeaths(childDeath, parentDeath) {
  const child = dateKey(childDeath);
  const parent = dateKey(parentDeath);
  if (!child || !parent) return "unknown";
  if (child.year !== parent.year) return child.year < parent.year ? "before" : "after";
  if (!child.exact || !parent.exact) return "unsure";
  return child.full < parent.full ? "before" : child.full > parent.full ? "after" : "unsure";
}

/** parent: {label, death}; children: [{label, death, living}]. */
export function buildOutlivedAnswer({ parent, children, mode }) {
  if (!children.length) return `WikiTree has no children recorded for ${parent.label}.`;
  if (!dateKey(parent.death)) return `${parent.label} has no death date recorded, so I can't compare.`;
  const groups = { before: [], after: [], unsure: [], unknown: [] };
  for (const child of children) groups[child.living ? "after" : compareDeaths(child.death, parent.death)].push(child);
  const wanted = groups[mode];
  const total = `${children.length} ${children.length === 1 ? "child" : "children"}`;
  const verb = mode === "before" ? "died before" : "outlived";
  const lines = wanted.map((child) => `- ${child.label}${child.death && dateKey(child.death) ? ` (d. ${dateKey(child.death).full.replace(/-00/g, "")})` : ""}`);
  const notes = [
    groups.unsure.length ? `${groups.unsure.map((child) => child.label).join(", ")} died the same year, so the order isn't certain.` : "",
    groups.unknown.length ? `${groups.unknown.length} ${groups.unknown.length === 1 ? "child has" : "children have"} no death date.` : "",
  ].filter(Boolean);
  const head = wanted.length
    ? `${wanted.length} of ${parent.label}'s ${total} ${verb} ${parent.label.split(" (")[0]}:\n${lines.join("\n")}`
    : `None of ${parent.label}'s ${total} ${verb} ${parent.label.split(" (")[0]}, going by the recorded dates.`;
  return notes.length ? `${head}\n${notes.join(" ")}` : head;
}
