// D3, "where is she buried?": WikiTree records burials as cemetery categories
// and Find a Grave / BillionGraves citations in the biography (live, 2026-10-03:
// the prompt became a failed person search; Cook-8721 is in "Motueka Cemetery,
// Motueka, Tasman").

import { pickCemeteryCategories } from "./chat_search_spec";
import { formatPreviewDate } from "./chat_preview_format";

const SUBJECT = String.raw`(this\s+person|the\s+profile\s+person|he|she|they|him|her|them|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const BURIAL_PROMPT_RES = [
  new RegExp(String.raw`^where\s+(?:is|was|were|are)\s+${SUBJECT}\s+buried$`, "i"),
  new RegExp(String.raw`^where\s+(?:is|was)\s+${SUBJECT}(?:'s|’s)\s+(?:grave|burial(?:\s+place)?|resting\s+place)$`, "i"),
  new RegExp(String.raw`^where\s+(?:is|was)\s+(?:his|her|their)()\s+(?:grave|burial(?:\s+place)?|resting\s+place)$`, "i"),
  new RegExp(String.raw`^(?:the\s+)?(?:burial(?:\s+place)?|grave|cemetery|resting\s+place)\s+(?:of|for)\s+${SUBJECT}$`, "i"),
  new RegExp(String.raw`^(?:which|what)\s+cemetery\s+(?:is|was)\s+${SUBJECT}\s+(?:buried\s+)?in$`, "i"),
];
const PROFILE_SUBJECT_RE = /^(?:|this\s+person|the\s+profile\s+person|he|she|they|him|her|them)$/i;

/** {target} ("" = the page profile), or null. */
export function parseBurialPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of BURIAL_PROMPT_RES) {
    const match = text.match(re);
    if (!match) continue;
    const target = String(match[1] || "").trim();
    if (PROFILE_SUBJECT_RE.test(target)) return { target: "" };
    // Case-insensitive patterns: a bare name must really be capitalised.
    if (!/-\d+$/.test(target) && !/^(?:[A-Z][^\s]*\s*)+$/.test(target)) return null;
    return { target };
  }
  return null;
}

/** Find a Grave / BillionGraves IDs cited in the biography wikitext. */
export function findGraveLinks(bio) {
  const text = String(bio || "");
  const links = [];
  for (const match of text.matchAll(/\{\{\s*FindAGrave\s*\|\s*(\d+)/gi)) {
    links.push(`Find a Grave memorial ${match[1]}: https://www.findagrave.com/memorial/${match[1]}`);
  }
  for (const match of text.matchAll(/findagrave\.com\/memorial\/(\d+)/gi)) {
    links.push(`Find a Grave memorial ${match[1]}: https://www.findagrave.com/memorial/${match[1]}`);
  }
  for (const match of text.matchAll(/\{\{\s*BillionGraves\s*\|\s*(\d+)/gi)) {
    links.push(`BillionGraves record ${match[1]}: https://billiongraves.com/grave/${match[1]}`);
  }
  return [...new Set(links)];
}

export function buildBurialAnswer(person) {
  const label = `${person.RealName || person.Name} (${person.Name})`;
  const pronoun = person.Gender === "Female" ? "She" : person.Gender === "Male" ? "He" : "They";
  const categories = Array.isArray(person.Categories) ? person.Categories : Object.values(person.Categories || {});
  const cemeteries = pickCemeteryCategories(categories);
  const graves = findGraveLinks(person.Bio || person.bio); // the API returns "bio"
  const death = person.DeathLocation
    ? `${pronoun} died in ${person.DeathLocation}${
        person.DeathDate && !/^0000/.test(person.DeathDate) ? ` (${formatPreviewDate(person.DeathDate)})` : ""
      }.`
    : "";
  const lines = [];
  if (cemeteries.length) {
    lines.push(
      `${label} is in the cemetery categor${cemeteries.length === 1 ? "y" : "ies"} ${cemeteries
        .map((name) => `"${name}"`)
        .join(" and ")}, so that is where WikiTree says ${pronoun.toLowerCase()} ${pronoun === "They" ? "are" : "is"} buried.`
    );
  }
  if (graves.length) {
    lines.push(`${cemeteries.length ? "Grave records" : `${label}'s biography cites`}: ${graves.join("; ")}.`);
  }
  if (!lines.length) {
    lines.push(
      `WikiTree doesn't record where ${label} is buried: there is no cemetery category and no Find a Grave or BillionGraves citation.${
        death ? ` ${death} That is the nearest clue.` : ""
      }`
    );
    return lines.join("\n");
  }
  if (death) lines.push(death);
  return lines.join("\n");
}
