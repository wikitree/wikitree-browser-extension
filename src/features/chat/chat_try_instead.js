// "We need AI" for a question Genie can't read without AI: offer shorter wordings the strict reader
// does understand, made from the person's own words (the user, 2026-10-16: people don't read
// "What can I type?"). Only offered as buttons; nothing runs until they press one.
//   "Are there any Beacalls born in Shropshire in the 1820s that married twice?"
//     → "Beacalls born in Shropshire in the 1820s"
import { parseSearchSpecPrompt } from "./chat_spec_parser";

const LEAD_IN =
  /^(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:(?:show|list|find|give|get|tell)\s+(?:me\s+|us\s+)?(?:about\s+)?(?:all\s+)?(?:of\s+)?|(?:are|were)\s+there\s+(?:any\s+)?|do\s+(?:I|we)\s+have\s+(?:any\s+)?|I\s+(?:want|need|would\s+like)\s+(?:to\s+(?:see|find)\s+)?)/i;
const CLAUSE_BREAK = /\s*,\s*|\s+(?:and|but|or|so)\s+(?:also\s+)?(?=(?:who|that|which|were|was|had|have|has|with|did|are|is)\b)|\s+(?=(?:who|that|which)\s)/i;
const MAX_TRIES = 3;

function tidy(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:]+|[\s,;:?!.]+$/g, "");
}

// The whole wording without its lead-in first ("show me", "are there any"), then shorter ones,
// dropping clauses from the end.
function candidates(prompt) {
  const whole = tidy(prompt);
  const stripped = tidy(whole.replace(LEAD_IN, "").replace(/^the\s+/i, ""));
  const full = [stripped, whole];
  const partial = [];
  for (const base of [stripped, whole]) {
    const clauses = base.split(CLAUSE_BREAK).map(tidy).filter(Boolean);
    for (let count = clauses.length - 1; count >= 1; count -= 1) partial.push(clauses.slice(0, count).join(" "));
  }
  return { full, partial };
}

export function tryInsteadPrompts(prompt) {
  const original = tidy(prompt).toLowerCase();
  const { full, partial } = candidates(prompt);
  const reads = (text) => text.toLowerCase() !== original && parseSearchSpecPrompt(text)?.understood;
  // (all of it, read without the lead-in: that one is enough)
  const whole = full.find(reads);
  if (whole) return [whole];
  const seen = new Set();
  const tries = [];
  for (const text of partial) {
    if (tries.length >= MAX_TRIES) break;
    const understood = reads(text);
    if (!understood || seen.has(understood)) continue;
    seen.add(understood);
    tries.push(text);
  }
  return tries;
}
