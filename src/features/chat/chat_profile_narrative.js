// "summarise this person's life" / "give me a timeline" (C10) are questions for
// the AI about the page profile, whose bio and dates the general fallback sends
// as context. Search mode made them WT+ or person searches (live, 2026-10-03).
const SUBJECT = String.raw`(?:this\s+(?:person|profile)|the\s+profile\s+person|him|her|them|[A-Z][A-Za-z' -]*-\d+)`;
const LIFE = String.raw`(?:(?:this\s+person|the\s+profile\s+person|[A-Z][A-Za-z' -]*-\d+)['’]s|his|her|their)\s+life`;
// Q9 (live, 2026-10-03): "summarize her biography" showed her husband's bio.
const BIO = String.raw`(?:(?:this\s+person|the\s+profile\s+person|[A-Z][A-Za-z' -]*-\d+)['’]s|his|her|their|this|the)\s+(?:bio(?:graphy)?|profile)`;
const PROFILE_NARRATIVE_RE = new RegExp(
  String.raw`^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:` +
    String.raw`(?:summari[sz]e|describe|tell\s+me\s+about|write\s+(?:a\s+)?(?:short\s+)?(?:summary|timeline)\s+(?:of|for))\s+(?:${SUBJECT}|${LIFE}|${BIO})` +
    String.raw`|(?:give\s+me|make|create|show(?:\s+me)?|build)\s+(?:a\s+)?(?:short\s+)?(?:summary|timeline|overview|life\s+story)(?:\s+(?:of|for)\s+(?:${SUBJECT}|${LIFE}|${BIO}))?` +
    String.raw`|(?:a\s+)?(?:summary|timeline|overview)\s+of\s+(?:${SUBJECT}|${LIFE}|${BIO})` +
    String.raw`|what\s+do\s+(?:we|you)\s+know\s+about\s+${SUBJECT}` +
    // C11: a profile review is the same kind of question.
    String.raw`|(?:what['’]?s|what\s+is)\s+wrong\s+with\s+${SUBJECT}` +
    String.raw`|(?:check|review|critique|assess)\s+${SUBJECT}` +
    String.raw`|(?:are\s+there\s+|does\s+${SUBJECT}\s+have\s+)?(?:any\s+)?(?:problems|issues|errors|mistakes)\s+(?:with|on|in)\s+${SUBJECT}` +
    String.raw`|how\s+(?:can|could)\s+(?:i|we)\s+improve\s+${SUBJECT}` +
    String.raw`)$`,
  "i"
);

export function isProfileNarrativePrompt(text) {
  return PROFILE_NARRATIVE_RE.test(
    String(text || "")
      .trim()
      .replace(/[.!?]+$/g, "")
  );
}
