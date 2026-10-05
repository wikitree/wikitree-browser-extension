// G2, "which of her siblings died first?": one relative picked by a date or
// lifespan (live, 2026-10-03: it listed all 5 siblings).

import { formatPreviewDate } from "./chat_preview_format";

const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))`;
const RELATIONS = String.raw`(siblings|brothers|sisters|grandchildren|grandsons|granddaughters|children|kids|sons|daughters|husbands|wives|spouses|parents)`;
const PICKS = [
  { pick: "diedFirst", re: /^died\s+(?:first|earliest|soonest)$/i },
  { pick: "diedLast", re: /^died\s+(?:last|latest)$/i },
  { pick: "bornFirst", re: /^(?:was|were)\s+born\s+first$|^(?:was|is)\s+(?:the\s+)?(?:oldest|eldest)$/i },
  { pick: "bornLast", re: /^(?:was|were)\s+born\s+last$|^(?:was|is)\s+(?:the\s+)?youngest$/i },
  { pick: "longest", re: /^lived\s+(?:the\s+)?longest$|^lived\s+to\s+the\s+greatest\s+age$|^lived\s+the\s+longest\s+life$/i },
  { pick: "shortest", re: /^(?:lived\s+the\s+shortest(?:\s+life)?|died\s+(?:the\s+)?youngest)$/i },
];
const PICK_RE = new RegExp(String.raw`^(?:which|who)\s+of\s+${OWNER}\s+${RELATIONS}\s+(.+)$`, "i");

/** {owner, relationRaw, pick} or null. owner: "" (profile), "me", or a name/ID. */
export function parseRelativePickPrompt(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(PICK_RE);
  if (!match) return null;
  const pick = PICKS.find((entry) => entry.re.test(match[3].trim()))?.pick;
  if (!pick) return null;
  const raw = match[1].replace(/(?:'s|’s)$/, "").trim();
  const relationRaw = match[2].toLowerCase() === "kids" ? "children" : match[2].toLowerCase();
  if (/^(?:her|his|their)$/i.test(raw)) return { owner: "", relationRaw, pick };
  if (/^my$/i.test(raw)) return { owner: "me", relationRaw, pick };
  if (!/-\d+$/.test(raw) && !/^(?:[A-Z][^\s]*\s*)+$/.test(raw)) return null;
  return { owner: raw, relationRaw, pick };
}

function key(value) {
  const match = String(value || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return "";
  return `${match[1]}-${match[2] || "00"}-${match[3] || "00"}`;
}

function lifespanDays(person) {
  const birth = key(person?.BirthDate);
  const death = key(person?.DeathDate);
  if (!birth || !death) return null;
  const toDays = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return year * 365.25 + (month || 6) * 30.44 + (day || 15);
  };
  return toDays(death) - toDays(birth);
}

const PICK_TEXT = {
  diedFirst: "died first",
  diedLast: "died last",
  bornFirst: "was born first",
  bornLast: "was born last",
  longest: "lived longest",
  shortest: "had the shortest life",
};

/** people: API person objects; labelOf(person) → "Name (ID)". */
export function buildRelativePickAnswer({ ownerLabel, relationRaw, people, pick, labelOf }) {
  if (!people.length) return `WikiTree has no ${relationRaw} recorded for ${ownerLabel}.`;
  const byLife = pick === "longest" || pick === "shortest";
  const field = pick.startsWith("died") ? "DeathDate" : "BirthDate";
  const value = (person) => (byLife ? lifespanDays(person) : key(person?.[field]) || null);
  const usable = people.filter((person) => value(person) !== null);
  const missing = people.length - usable.length;
  const missingNote = missing
    ? ` ${missing} of the ${people.length} ${
        byLife ? `${missing === 1 ? "doesn't" : "don't"} have both birth and death dates` : `${missing === 1 ? "has" : "have"} no ${field === "DeathDate" ? "death date" : "birth date"}`
      }, so ${missing === 1 ? "isn't" : "aren't"} counted.`
    : "";
  if (!usable.length) return `None of ${ownerLabel}'s ${relationRaw} have the dates needed.${missingNote}`;
  const descending = pick === "diedLast" || pick === "bornLast" || pick === "longest";
  const sorted = usable.slice().sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
    return descending ? -order : order;
  });
  const chosen = sorted[0];
  const runnerUp = sorted[1];
  const yearOnly = (person) => /-00-00$/.test(key(person?.[field]));
  const tied =
    !byLife &&
    runnerUp &&
    key(runnerUp[field]).slice(0, 4) === key(chosen[field]).slice(0, 4) &&
    (yearOnly(chosen) || yearOnly(runnerUp) || key(runnerUp[field]) === key(chosen[field]));
  const dates = [
    key(chosen.BirthDate) ? `b. ${formatPreviewDate(chosen.BirthDate)}` : "",
    key(chosen.DeathDate) ? `d. ${formatPreviewDate(chosen.DeathDate)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const age = byLife ? `, aged about ${Math.floor(lifespanDays(chosen) / 365.25)}` : "";
  const tieNote = tied ? ` ${labelOf(runnerUp)} has a date in the same year, so the order isn't certain.` : "";
  return `Of ${ownerLabel}'s ${relationRaw}, ${labelOf(chosen)} ${PICK_TEXT[pick]} (${dates}${age}).${tieNote}${missingNote}`;
}
