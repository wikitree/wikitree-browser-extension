// Without AI, Genie reads short searches ("Babe Ruth", "Beacalls in Devon 1820s"), and said
// "Genie understands short searches, not questions" to "I'm looking for Babe Ruth." The polite
// lead-in is taken off first, so the search under it runs (the user, 2026-11-08). Only a
// lead-in that asks to find or search, so the rest is what to look for:
//   "I'm looking for Babe Ruth."               → "Babe Ruth"
//   "Can you help me find the Beacalls in Devon?" → "the Beacalls in Devon"
//   "search for the profile of John Smith"     → "John Smith"
//   "find my 3rd cousins"                      → "my 3rd cousins" (the router took "my 3rd cousins" as a name)
// "search watchlist for Smith" keeps its command word. With AI on, the AI reads the whole prompt.

const VERB =
  "(?:find|locate|track\\s+down|look\\s+(?:for|up)|search\\s+for|search(?!\\s+(?:my\\s+|the\\s+)?watch\\s*list\\b)(?=\\s))";
const IM = "I(?:['’]m|\\s+am)";
const LEAD_IN = new RegExp(
  "^(?:(?:hi|hello|hey)(?:\\s+genie)?[,!.]*\\s+)?(?:please\\s+)?(?:" +
    [
      `(?:can|could|would|will)\\s+you\\s+(?:please\\s+)?(?:help\\s+me\\s+(?:to\\s+)?)?${VERB}`,
      `help\\s+me\\s+(?:to\\s+)?${VERB}`,
      `${IM}\\s+(?:currently\\s+|still\\s+|also\\s+)?(?:looking|searching|hunting)\\s+for`,
      `${IM}\\s+trying\\s+to\\s+${VERB}`,
      `I(?:\\s+(?:want|need|wish|would\\s+like)|['’]d\\s+like)\\s+to\\s+${VERB}`,
      "(?:looking|searching|hunting)\\s+for",
      VERB,
    ].join("|") +
    ")\\s+(?:me\\s+)?",
  "i"
);
// ("the profile of Babe Ruth", "someone called Babe Ruth": what follows is the name)
const PROFILE_OF = /^(?:(?:the|a|any)\s+)?(?:profiles?|person|people|someone|somebody|anyone|records?)\s+(?:of|for|named|called|by\s+the\s+name(?:\s+of)?)\s+/i;
const ON_WIKITREE = /\s+(?:on|in)\s+wiki\s*tree$/i;

/** The search under a polite lead-in, or "" when the prompt has none (or nothing follows it). */
export function stripSearchLeadIn(prompt) {
  const text = String(prompt || "")
    .replace(/\s+/g, " ")
    .trim();
  const match = text.match(LEAD_IN);
  if (!match) return "";
  const rest = text
    .slice(match[0].length)
    .replace(/[\s?!.]+$/g, "")
    .replace(PROFILE_OF, "")
    .replace(ON_WIKITREE, "")
    .trim();
  return /[\p{L}\d]/u.test(rest) ? rest : "";
}
