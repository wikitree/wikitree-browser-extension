// Strict parser for "status + place + decade" prompts, e.g.
//   "Shropshire unsourced born in 1820s", "Shropshire 1820s no sources",
//   "born in the 1820s, Shropshire, missing sources".
// Every word must be accounted for, otherwise it returns null and the general
// parsers (and the AI) take over. When it does match, the result is complete, so
// the AI is not asked: the AI answers these differently from run to run.

const STATUS_PHRASES = [
  {
    term: "bioCheckUnsourced", // (see chat_search_spec.js: more accurate than Unsourced)
    pattern: /\b(?:unsourced|(?:with\s+)?no\s+sources?|missing\s+sources?|without\s+(?:any\s+)?sources?)\b/i,
  },
  { term: "Unconnected", pattern: /\b(?:unconnected|not\s+connected)\b/i },
  { term: "Orphan", pattern: /\b(?:orphan(?:ed)?|no\s+manager|unmanaged)\b/i },
];

const DECADE_PATTERN = /\b(?:born\s+)?(?:in\s+)?(?:the\s+)?(\d{3}0)'?s\b/i;
// Words that signal another constraint this parser can't express.
const OTHER_CONSTRAINT_WORDS =
  /\b(?:men|women|males?|females?|children|kids|sons?|daughters?|married|marriages?|died|deaths?|aged?|any|all|only|not|no|without|missing|gaps?|large|small|close|siblings?|spouses?|parents?|fathers?|mothers?|wives|wife|husbands?|please)\b/i;
const FILLER_WORDS = /\b(?:profiles?|people|persons?|born|in|from|and|with|who\s+are|that\s+are|are)\b/gi;

export function parseStatusPlaceDecadePrompt(prompt) {
  let text = ` ${String(prompt || "")
    .replace(/^\s*(?:search(?:\s+for)?|find|show(?:\s+me)?|list|get)\s+/i, "")
    .trim()} `;

  const decadeMatch = text.match(DECADE_PATTERN);
  if (!decadeMatch) return null;
  text = text.replace(decadeMatch[0], " , ");

  const statusTerms = [];
  for (const { term, pattern } of STATUS_PHRASES) {
    const match = text.match(pattern);
    if (match) {
      statusTerms.push(term);
      text = text.replace(match[0], " , ");
    }
  }
  if (!statusTerms.length) return null;

  if (OTHER_CONSTRAINT_WORDS.test(text)) return null;

  const place = text
    .replace(FILLER_WORDS, " , ")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
  // Only letters for the place, at most two comma parts of up to three words.
  const parts = place.split(", ");
  if (
    !place ||
    !/^[A-Za-z][A-Za-z' -]*(?:, [A-Za-z][A-Za-z' -]*)?$/.test(place) ||
    parts.some((part) => part.split(" ").length > 3)
  ) {
    return null;
  }

  const locationValue = /[\s,]/.test(place) ? `"${place}"` : place;
  const decade = `${decadeMatch[1]}s`;
  return {
    query: [...statusTerms, `Location=${locationValue}`, decade].join(" "),
    understood: `${statusTerms.join(", ")} profiles in ${place} born in the ${decade}`,
    place,
    decade,
    statusTerms,
  };
}
