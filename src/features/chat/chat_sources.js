// D10, "what sources does this profile have?": the sources are the <ref>s and
// the lines under == Sources == in the biography wikitext (live, 2026-10-03: the
// bio handler read "profile" as a bio request and showed a husband's biography).

import { linesWithMore } from "./chat_more_text";
import { promptTarget } from "./chat_text_utils";

const SUBJECT = String.raw`(this\s+(?:profile|page|person)|the\s+profile(?:\s+person)?|(?:his|her|their)\s+(?:profile|page)|he|she|they|him|her|them|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const SOURCES = String.raw`(?:sources?|citations?|references?)`;
const SOURCES_PROMPT_RES = [
  // "what sources does this profile have", "how many sources does Cook-8721 have"
  new RegExp(String.raw`^(?:what|which|how\s+many)\s+${SOURCES}\s+(?:does|do|did)\s+${SUBJECT}\s+have$`, "i"),
  // "what are the sources for this profile", "list the sources on Cook-8721", "show me the citations of her"
  new RegExp(String.raw`^(?:what\s+are|list|show(?:\s+me)?|give\s+me)\s+(?:all\s+)?(?:the\s+)?${SOURCES}\s+(?:for|on|of|in)\s+${SUBJECT}$`, "i"),
  // "what sources are on this profile", "how many sources are there on her profile"
  new RegExp(String.raw`^(?:what|which|how\s+many)\s+${SOURCES}\s+(?:are|is)\s+(?:there\s+)?(?:on|in|for)\s+${SUBJECT}$`, "i"),
  // "list her sources", "show me Cook-8721's sources", "what are her sources"
  new RegExp(String.raw`^(?:what\s+are|list|show(?:\s+me)?|give\s+me)\s+(his|her|their|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s))\s+${SOURCES}$`, "i"),
];
// Q7, yes/no (2026-10-14: needed the AI): "is she sourced?", "is this profile unsourced?",
// "does she have any sources?", "are there sources on Cook-8721?"
const SOURCED_PROMPT_RES = [
  new RegExp(String.raw`^(?:is|was)\s+${SUBJECT}\s+((?:un-?)?sourced)$`, "i"),
  new RegExp(String.raw`^(?:does|do|did)\s+${SUBJECT}\s+have\s+(?:any\s+)?${SOURCES}()$`, "i"),
  new RegExp(String.raw`^(?:are|is)\s+there\s+(?:any\s+)?${SOURCES}\s+(?:on|in|for)\s+${SUBJECT}()$`, "i"),
];
const PROFILE_SUBJECT_RE =
  /^(?:|this\s+(?:profile|page|person)|the\s+profile(?:\s+person)?|(?:his|her|their)(?:\s+(?:profile|page))?|he|she|they|him|them)$/i;

/** {target, countOnly} ("" = the page profile), or null. */
export function parseProfileSourcesPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of SOURCES_PROMPT_RES) {
    const match = text.match(re);
    if (!match) continue;
    const target = promptTarget(String(match[1] || "").trim().replace(/(?:'s|’s)$/, ""), PROFILE_SUBJECT_RE);
    return target === null ? null : { target, countOnly: /^how\s+many\b/i.test(text) };
  }
  for (const re of SOURCED_PROMPT_RES) {
    const match = text.match(re);
    if (!match) continue;
    const target = promptTarget(match[1], PROFILE_SUBJECT_RE);
    return target === null ? null : { target, countOnly: false, ask: /^un/i.test(match[2] || "") ? "unsourced" : "sourced" };
  }
  return null;
}

/** Wikitext as plain text: links to their words, no bold, tags or list marks. */
export function cleanSourceText(text) {
  return String(text || "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$2 ($1)")
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s*[:*#]+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The biography's sources: each <ref> body, then each line under == Sources ==. */
export function extractBioSources(bio) {
  const text = String(bio || "");
  const sources = [];
  // "<ref" but not "<references />"; a bare named ref ("<ref name=x />") only
  // repeats an earlier one. No lookbehind: iOS 15 Safari can't parse it.
  const openTag = /<ref(?=[\s>/])([^>]*)>/gi;
  let match;
  while ((match = openTag.exec(text))) {
    if (/\/\s*$/.test(match[1])) continue;
    const end = text.toLowerCase().indexOf("</ref>", openTag.lastIndex);
    if (end < 0) break;
    const cleaned = cleanSourceText(text.slice(openTag.lastIndex, end));
    if (cleaned) sources.push(cleaned);
    openTag.lastIndex = end + "</ref>".length;
  }
  const section = text.match(/==+\s*Sources\s*==+([\s\S]*?)(?:\n==[^=]|$)/i);
  if (section) {
    const lines = section[1]
      .replace(/<references\s*\/?>/gi, "")
      .split(/\n(?=\s*[*#])/)
      .map(cleanSourceText)
      .filter((line) => line && !/^see also:?$/i.test(line));
    sources.push(...lines);
  }
  return [...new Set(sources)];
}

const MAX_LISTED = 15;
const MAX_SOURCE_CHARS = 220;

/** ask "sourced" | "unsourced": a yes/no question, answered Yes/No first. */
export function buildSourcesAnswer({ label, bio, countOnly = false, ask = "" }) {
  const sources = extractBioSources(bio);
  const answer = ask ? `${(ask === "sourced") === sources.length > 0 ? "Yes" : "No"}, ` : "";
  // (the template sets the Unsourced category whatever the biography holds)
  const template = ask && /\{\{\s*unsourced\b/i.test(String(bio || "")) ? " The biography also has the {{Unsourced}} template." : "";
  if (!sources.length) {
    return `${answer}${label} has no sources in the biography: no <ref> citations and nothing under == Sources ==.${template}`;
  }
  const noun = `source${sources.length === 1 ? "" : "s"}`;
  if (countOnly) return `${label} has ${sources.length} ${noun} in the biography.`;
  const shorten = (source) => (source.length > MAX_SOURCE_CHARS ? `${source.slice(0, MAX_SOURCE_CHARS - 1)}…` : source);
  const listed = linesWithMore(sources.map((source, index) => `${index + 1}. ${shorten(source)}`), MAX_LISTED, { after: " on the profile" });
  return `${answer}${label} has ${sources.length} ${noun} in the biography:${template ? `${template}` : ""}\n${listed}`;
}
