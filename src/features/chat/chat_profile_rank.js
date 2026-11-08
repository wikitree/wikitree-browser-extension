import { foldAccents } from "./chat_text_utils";
import { personNameParts } from "./chat_person_name_parts";
// The WikiTree name search also returns sound-alike surnames (Beacall -> Bickel,
// Buckel), in no particular order. Put the rows that match the name as typed
// first: exact surname, then exact first name. A name that matches only as a
// middle name (Brian George Beacall for "George"; his wife Yvonne Margaret for
// "married Margaret") ranks below one that matches as the first name. The order
// is otherwise kept.
//
// The first name may also match the Preferred Name (RealName: "Babe" for George
// Herman Ruth) or, a step lower, a nickname (Carl Selmer "Babe" Ruth). Among
// equal name matches, profiles marked notable come first, and the famous one
// (Wikidata or the AI said who is meant) is pinned to the top (2026-11-08).

const norm = (value) => foldAccents(value).trim();

const firstToken = (value) => norm(value).split(/\s+/)[0] || "";

const nicknameTokens = (value) =>
  String(value || "")
    .split(/[,;/]/)
    .map(firstToken)
    .filter(Boolean);

function nameScore(row, firstName, lastName, spouseFirst) {
  let score = 0;
  if (lastName && [row?.lnab, row?.lastNameCurrent].some((value) => norm(value) === lastName)) score += 16;
  if (firstName) {
    if ([row?.firstName, row?.preferredName].some((value) => firstToken(value) === firstName)) score += 8;
    else if (nicknameTokens(row?.nicknames).includes(firstName)) score += 4;
  }
  if (row?.notable) score += 2;
  if (spouseFirst && firstToken(row?.matchedSpouse) === spouseFirst) score += 1;
  return score;
}

export function rankProfileRowsByName(rows = [], { firstName = "", lastName = "", spouseName = "" } = {}) {
  const wantedFirst = firstToken(firstName);
  const wantedLast = norm(lastName);
  const wantedSpouseFirst = firstToken(spouseName);
  const anyFlag = rows.some((row) => row?.famous || row?.notable);
  if (!wantedFirst && !wantedLast && !wantedSpouseFirst && !anyFlag) return rows;
  return rows
    .map((row, index) => ({
      row,
      index,
      famous: row?.famous ? 1 : 0,
      score: nameScore(row, wantedFirst, wantedLast, wantedSpouseFirst),
    }))
    .sort((left, right) => right.famous - left.famous || right.score - left.score || left.index - right.index)
    .map((entry) => entry.row);
}

// A Notability template about someone's relative ("He was the grandfather of [[Lincoln-103|...]]")
// doesn't make this person notable.
function isRelativeOfNotableTemplate(template) {
  if (String(template?.name || "").toLowerCase() !== "notability") return false;
  const text = String(template?.params?.text || "");
  return /\b(?:father|mother|grand(?:father|mother|son|daughter|parent|child)|ancestor|son|daughter|wife|husband|brother|sister|uncle|aunt|nephew|niece|cousin)\s+of\s+\[\[/i.test(
    text
  );
}

/** Wiki markup out of a template's text: [[Ruth-1|Babe Ruth]] → Babe Ruth, '''bold''' → bold. */
function plainTemplateText(text) {
  return String(text || "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[(?:https?:)?\/\/\S+\s+([^\]]*)\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first sentence, cut to about `max` characters at a word boundary. */
function firstSentence(text, max = 140) {
  const sentence = (String(text || "").match(/^.*?[.!?](?=\s|$)/) || [String(text || "")])[0].trim();
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/**
 * Is this getPeople profile marked notable on WikiTree? A Notability, Notables or
 * Succession template, a Wikidata link, or a WikiTree-* manager (the Notables
 * project's accounts) says so. → { notable, note }, note being the Notability
 * template's first sentence when it has one.
 */
export function profileNotability(person) {
  const templates = Array.isArray(person?.Templates) ? person.Templates : [];
  if (templates.some(isRelativeOfNotableTemplate)) return { notable: false, note: "" };
  const names = templates.map((template) => String(template?.name || "").toLowerCase());
  const notable =
    names.some((name) => /notab|^wikidata$|^succession$/.test(name)) ||
    (Array.isArray(person?.Managers) ? person.Managers : []).some((manager) =>
      /^WikiTree-\d+$/i.test(String(manager?.Name || ""))
    );
  const notability = templates.find((template) => String(template?.name || "").toLowerCase() === "notability");
  const note = notable && notability ? firstSentence(plainTemplateText(notability?.params?.text)) : "";
  return { notable, note };
}

/**
 * The full name for a name-search match: George Herman (Babe) Ruth Jr. A nickname is
 * added only when it is the name that was searched for (Carl Selmer "Babe" Ruth for
 * "Babe Ruth"): Ruth-1's "The Bambino, Sultan of Swat" would only crowd the list.
 */
export function searchMatchDisplayName(person, searchedFirstName = "") {
  const wanted = firstToken(searchedFirstName);
  const nicknameMatches = wanted && nicknameTokens(person?.Nicknames).includes(wanted);
  const named = { ...person, Nicknames: nicknameMatches ? person.Nicknames : "" };
  if (!named.FirstName && named.RealName) named.FirstName = named.RealName;
  if (!named.FirstName || !(named.LastNameAtBirth || named.LastNameCurrent)) return "";
  const parts = ["Prefix", "FirstName", "MiddleNames", "PreferredName"];
  if (nicknameMatches) parts.push("Nicknames");
  parts.push("LastNameAtBirth", "LastNameCurrent", "Suffix");
  return personNameParts(named, parts);
}

/**
 * Which row is the famous person who was meant? `wtId` is Wikidata's WikiTree ID
 * for them; with none (or not among the rows), the AI's birth and death years
 * pick a notable row, when exactly one fits (±1 year). → the row's index, or -1.
 */
export function findFamousRowIndex(rows = [], { wtId = "", birthYear = null, deathYear = null } = {}) {
  const wanted = String(wtId || "").trim().toLowerCase();
  if (wanted) {
    const byId = rows.findIndex((row) => String(row?.wtid || "").trim().toLowerCase() === wanted);
    if (byId >= 0) return byId;
  }
  const born = Number(birthYear);
  if (!Number.isFinite(born) || born <= 0) return -1;
  const died = Number(deathYear);
  const yearOf = (value) => Number(String(value || "").match(/^(\d{4})/)?.[1]) || null;
  const near = (value, year) => value && Math.abs(value - year) <= 1;
  const fits = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        row?.notable &&
        near(yearOf(row?.birth), born) &&
        (!Number.isFinite(died) || died <= 0 || !yearOf(row?.death) || near(yearOf(row?.death), died))
    );
  return fits.length === 1 ? fits[0].index : -1;
}
