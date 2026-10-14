// D3, "where is she buried?": WikiTree records burials as cemetery categories
// and Find a Grave / BillionGraves citations in the biography (live, 2026-10-03:
// the prompt became a failed person search; Cook-8721 is in "Motueka Cemetery,
// Motueka, Tasman").

import { applySameCemetery, compileSearchSpec, pickCemeteryCategories } from "./chat_search_spec";
import { formatPreviewDate } from "./chat_preview_format";
import { shownGender } from "./chat_gender_display";
import { profileLabel, promptTarget } from "./chat_text_utils";

const SUBJECT = String.raw`(this\s+person|the\s+profile\s+person|he|she|they|him|her|them|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const BURIAL_PROMPT_RES = [
  new RegExp(String.raw`^where\s+(?:is|was|were|are)\s+${SUBJECT}\s+buried$`, "i"),
  new RegExp(String.raw`^where\s+(?:is|was)\s+${SUBJECT}(?:'s|’s)\s+(?:grave|burial(?:\s+place)?|resting\s+place)$`, "i"),
  new RegExp(String.raw`^where\s+(?:is|was)\s+(?:his|her|their)()\s+(?:grave|burial(?:\s+place)?|resting\s+place)$`, "i"),
  new RegExp(String.raw`^(?:the\s+)?(?:burial(?:\s+place)?|grave|cemetery|resting\s+place)\s+(?:of|for)\s+${SUBJECT}$`, "i"),
  new RegExp(String.raw`^(?:which|what)\s+cemetery\s+(?:is|was)\s+${SUBJECT}\s+(?:buried\s+)?in$`, "i"),
];
const PROFILE_SUBJECT_RE = /^(?:|this\s+person|the\s+profile\s+person|he|she|they|him|her|them)$/i;

// C13, "who else is buried in this cemetery?": the page person's cemetery category, searched on WT+
// (the AI's sameCemeteryAs; without a key it was "needs AI", 2026-10-14).
const CEMETERY_WORDS = String.raw`(?:cemetery|graveyard|churchyard)`;
const OTHERS_BURIED_RES = [
  new RegExp(
    String.raw`^(?:who|which\s+(?:other\s+)?(?:people|profiles))\s+else\s+(?:is|are|was|were)\s+buried\s+(?:in\s+(?:this|that|the\s+same|(?:his|her|their)(?:\s+own)?)\s+${CEMETERY_WORDS}|there|with\s+(?:him|her|them)|(?:in\s+the\s+same\s+${CEMETERY_WORDS}|in\s+the\s+same\s+place|alongside|near)\s+(?:as\s+)?${SUBJECT})$`,
    "i"
  ),
  new RegExp(String.raw`^(?:who|which\s+(?:people|profiles))\s+(?:is|are|was|were)\s+(?:also\s+)?buried\s+in\s+(?:this|that|(?:his|her|their))\s+${CEMETERY_WORDS}$`, "i"),
  new RegExp(String.raw`^(?:(?:show|list|find)\s+(?:me\s+)?)?(?:the\s+)?(?:other\s+)?(?:people|profiles|others)\s+(?:also\s+)?buried\s+in\s+(?:this|that|the\s+same|(?:his|her|their))\s+${CEMETERY_WORDS}$`, "i"),
];

/** {target} ("" = the page profile), plus others: true for "who else is buried there", or null. */
export function parseBurialPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of OTHERS_BURIED_RES) {
    const match = text.match(re);
    if (!match) continue;
    const target = promptTarget(match[1], PROFILE_SUBJECT_RE);
    return target === null ? null : { target, others: true };
  }
  for (const re of BURIAL_PROMPT_RES) {
    const match = text.match(re);
    if (!match) continue;
    const target = promptTarget(match[1], PROFILE_SUBJECT_RE);
    return target === null ? null : { target };
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
  const label = profileLabel(person);
  const pronoun = { Female: "She", Male: "He" }[shownGender(person)] || "They";
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

/**
 * "Who else is buried in this cemetery?": {query, note} for a WT+ search of the person's cemetery
 * categories, or {message} when they have none.
 */
export function buildOthersBuriedSearch(person) {
  const label = profileLabel(person);
  const categories = Array.isArray(person.Categories) ? person.Categories : Object.values(person.Categories || {});
  const cemeteries = pickCemeteryCategories(categories);
  if (!cemeteries.length) {
    const graves = findGraveLinks(person.Bio || person.bio);
    return {
      message: `${label} has no cemetery category on WikiTree, so I can't search for others buried there.${
        graves.length ? ` The biography cites ${graves.join("; ")}.` : ""
      } Adding the category (for example "Motueka Cemetery, Motueka, Tasman") would make this work.`,
    };
  }
  const compiled = compileSearchSpec(applySameCemetery({ sameCemeteryAs: person.Name }, cemeteries));
  if (!compiled.query || compiled.errors.length) return { message: `I couldn't make a search for ${cemeteries.join(" or ")}.` };
  return {
    query: compiled.query,
    note: `${label} is in the cemetery categor${cemeteries.length === 1 ? "y" : "ies"} ${cemeteries
      .map((name) => `"${name}"`)
      .join(" and ")}, so here is everyone in ${cemeteries.length === 1 ? "that category" : "those categories"} on WikiTree.`,
  };
}
