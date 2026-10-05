// E6/E12, "what was her mother's maiden name?" / "when was her husband born?":
// one fact about a relative. The relation path finds the people; this reads the
// fact off each (live, 2026-10-03: both became failed name searches).

import { partialDateSortKey as birthKey } from "./chat_dates";
import { formatPreviewDate } from "./chat_preview_format";
import { ageAtDeath } from "./chat_result_pick";

const RELATION = String.raw`(grandmothers?|grandfathers?|grandparents?|grandsons?|granddaughters?|grandchildren|grandchild|mother|father|parents?|husbands?|wife|wives|spouses?|sons?|daughters?|children|child|brothers?|sisters?|siblings?)`;
const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))`;
const FACT_WORDS = [
  { fact: "maidenName", re: /^(?:maiden\s+names?|birth\s+(?:sur)?names?|surnames?\s+at\s+birth|last\s+names?\s+at\s+birth|family\s+names?|lnab)$/i },
  { fact: "birth", re: /^(?:birth\s*days?|birth\s+dates?|dates?\s+of\s+birth|dob)$/i },
  { fact: "death", re: /^(?:death\s+dates?|dates?\s+of\s+death)$/i },
  { fact: "birthPlace", re: /^(?:birth\s*places?|places?\s+of\s+birth)$/i },
  { fact: "deathPlace", re: /^(?:death\s*places?|places?\s+of\s+death)$/i },
  // H1 (live, 2026-10-03): "what was her husband's name?" went to the AI, which
  // answered about someone from an earlier result.
  { fact: "name", re: /^(?:(?:full|first|given)\s+)?names?$/i },
];

const PATTERNS = [
  // "what was her mother's maiden name", "what is Cook-8721's father's birth date"
  {
    re: new RegExp(String.raw`^(?:what\s+(?:was|is|were|are)\s+)?${OWNER}\s+${RELATION}(?:'s|’s|'|’)\s+(.+)$`, "i"),
    fact: (m) => FACT_WORDS.find((entry) => entry.re.test(m[3].trim()))?.fact || "",
  },
  // "when was her husband born", "where did his father die"
  {
    re: new RegExp(String.raw`^(when|where)\s+(?:was|were|did)\s+${OWNER}\s+${RELATION}\s+(born|die)$`, "i"),
    fact: (m) => (/^born$/i.test(m[4]) ? (/^where$/i.test(m[1]) ? "birthPlace" : "birth") : /^where$/i.test(m[1]) ? "deathPlace" : "death"),
    shift: true,
  },
];

// F1/F12, "where was she born?" / "what was her maiden name?": the person's own
// fact (live, 2026-10-03: the AI asked which woman "she" meant).
const SELF_SUBJECT = String.raw`(he|she|they|this\s+person|the\s+profile\s+person|I|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3})`;
const SELF_PATTERNS = [
  {
    re: new RegExp(String.raw`^(when|where|when\s+and\s+where)\s+(?:was|were|did)\s+${SELF_SUBJECT}\s+(born|die)$`, "i"),
    owner: (m) => m[2],
    fact: (m) => (/^born$/i.test(m[3]) ? (/^where$/i.test(m[1]) ? "birthPlace" : "birth") : /^where$/i.test(m[1]) ? "deathPlace" : "death"),
  },
  {
    re: /^(?:what\s+(?:was|is)\s+)?(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))\s+(maiden\s+name|birth\s+(?:sur)?name|surname\s+at\s+birth|last\s+name\s+at\s+birth)$/i,
    owner: (m) => m[1],
    fact: () => "maidenName",
  },
];

function ownerFromText(ownerText) {
  const raw = String(ownerText || "")
    .replace(/(?:'s|’s)$/, "")
    .trim();
  if (/^(?:he|she|they|her|his|their|this\s+person|the\s+profile\s+person)$/i.test(raw)) return "";
  if (/^(?:I|my)$/i.test(raw)) return "me";
  // Case-insensitive patterns: a bare name must really be capitalised.
  if (!/-\d+$/.test(raw) && !/^(?:[A-Z][^\s]*\s*)+$/.test(raw)) return null;
  return raw;
}

// G3, "was she older than her husband?": birth dates compared.
const COMPARE_RE = new RegExp(
  String.raw`^(?:was|is|were|are)\s+${SELF_SUBJECT}\s+(older|younger)\s+than\s+${OWNER}\s+${RELATION}$`,
  "i"
);

/** {owner, relationRaw, fact} or null. owner: "" (profile), "me", or a name/ID. relationRaw "self" = the owner. */
export function parseRelativeFactPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const compare = text.match(COMPARE_RE);
  if (compare) {
    const subject = ownerFromText(compare[1]);
    const owner = ownerFromText(compare[3]);
    // "was Ellen older than her husband": subject and owner are the same person.
    if (subject !== null && owner !== null && (subject === owner || !owner)) {
      return { owner: subject, relationRaw: compare[4].toLowerCase(), fact: compare[2].toLowerCase() };
    }
  }
  for (const { re, owner, fact } of SELF_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const ownerKey = ownerFromText(owner(match));
    if (ownerKey === null) continue;
    return { owner: ownerKey, relationRaw: "self", fact: fact(match) };
  }
  for (const { re, fact, shift } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const ownerText = (shift ? match[2] : match[1]).replace(/(?:'s|’s)$/, "");
    const relationRaw = (shift ? match[3] : match[2]).toLowerCase();
    const factName = fact(match);
    if (!factName) continue;
    const owner = /^(?:her|his|their)$/i.test(ownerText) ? "" : /^my$/i.test(ownerText) ? "me" : ownerText;
    // Case-insensitive patterns: a bare name must really be capitalised.
    if (owner && owner !== "me" && !/-\d+$/.test(owner) && !/^(?:[A-Z][^\s]*\s*)+$/.test(owner)) return null;
    return { owner, relationRaw, fact: factName };
  }
  return null;
}

// S1/S9 (live, 2026-10-03): "how old was her second husband when he died?" went
// to the AI, which said his age wasn't recorded (b. 1831, d. 1880); "what was the
// age gap between her and her first husband?" was worked out from the bio.
const SPOUSE_ORDINAL = String.raw`(?:(first|second|third|fourth|1st|2nd|3rd|4th|last)\s+)?`;
const ORDINAL_VALUES = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: "last" };
const AGE_AT_DEATH_RE = new RegExp(
  String.raw`^(?:how\s+old\s+was\s+${OWNER}\s+${SPOUSE_ORDINAL}${RELATION}\s+when\s+(?:he|she|they)\s+died|at\s+what\s+age\s+did\s+${OWNER}\s+${SPOUSE_ORDINAL}${RELATION}\s+die)$`,
  "i"
);
const AGE_GAP_RE = new RegExp(
  String.raw`^(?:what\s+(?:was|is)\s+)?the\s+age\s+(?:gap|difference)\s+between\s+${SELF_SUBJECT}\s+and\s+${OWNER}\s+${SPOUSE_ORDINAL}${RELATION}$`,
  "i"
);

function withOrdinal(params, ordinalText, relationRaw) {
  if (!ordinalText) return params;
  // Ordinals pick a spouse by marriage date; "her second son" isn't handled here.
  if (!/^(?:husband|wife|spouse)$/i.test(relationRaw)) return null;
  return { ...params, ordinal: ORDINAL_VALUES[ordinalText.toLowerCase()] };
}

/** Age at death or age gap for a relative: {owner, relationRaw, fact, ordinal?} or null. */
export function parseRelativeAgePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const death = text.match(AGE_AT_DEATH_RE);
  if (death) {
    const [ownerText, ordinalText, relation] = death[1] ? [death[1], death[2], death[3]] : [death[4], death[5], death[6]];
    const owner = ownerFromText(ownerText);
    if (owner === null) return null;
    const relationRaw = relation.toLowerCase();
    return withOrdinal({ owner, relationRaw, fact: "ageAtDeath" }, ordinalText, relationRaw);
  }
  const gap = text.match(AGE_GAP_RE);
  if (gap) {
    const subject = ownerFromText(gap[1]);
    const owner = ownerFromText(gap[2]);
    if (subject === null || owner === null || (owner && subject !== owner)) return null;
    const relationRaw = gap[4].toLowerCase();
    return withOrdinal({ owner: subject, relationRaw, fact: "ageGap" }, gap[3], relationRaw);
  }
  return null;
}

/** "Charles Alley (Alley-2359) died aged about 49 (1831–1880-10-08)." per person. */
export function buildRelativeAgeAtDeathAnswer(people, labelOf) {
  const lines = people.map((person) => {
    const age = ageAtDeath(person?.BirthDate, person?.DeathDate);
    const dates = [person?.BirthDate, person?.DeathDate].map((value) => (value && !/^0000/.test(value) ? formatPreviewDate(value) : "?")).join("–");
    if (!age) return `${labelOf(person)}: I need both a birth and a death date (${dates})`;
    return `${labelOf(person)} died aged ${age.exact ? "" : "about "}${age.years} (${dates})`;
  });
  return lines.length === 1 ? `${lines[0]}.` : lines.map((line) => `- ${line}`).join("\n");
}

/** "William (Burton-13215) (b. 1829) was about 3 years older than Ellen (Cook-8721) (b. 1832)." */
export function buildAgeGapAnswer(owner, people, labelOf) {
  const ownerBirth = birthKey(owner?.BirthDate);
  if (!ownerBirth) return `${labelOf(owner)} has no birth date recorded, so I can't work out the gap.`;
  const ownerText = `${labelOf(owner)} (b. ${formatPreviewDate(owner.BirthDate)})`;
  const lines = people.map((person) => {
    const birth = birthKey(person?.BirthDate);
    if (!birth) return `${labelOf(person)}: no birth date recorded`;
    const personText = `${labelOf(person)} (b. ${formatPreviewDate(person.BirthDate)})`;
    const years = Math.abs(Number(birth.slice(0, 4)) - Number(ownerBirth.slice(0, 4)));
    const partial = /-00/.test(birth) || /-00/.test(ownerBirth);
    if (!years) return `${personText} and ${ownerText} were born the same year`;
    const [older, younger] = birth < ownerBirth ? [personText, ownerText] : [ownerText, personText];
    return `${older} was ${partial ? "about " : ""}${years} year${years === 1 ? "" : "s"} older than ${younger}`;
  });
  return lines.length === 1 ? `${lines[0]}.` : lines.map((line) => `- ${line}`).join("\n");
}

const FACT_LABELS = {
  maidenName: "last name at birth",
  birth: "birth",
  death: "death",
  birthPlace: "birth place",
  deathPlace: "death place",
  name: "name",
};

function factValue(person, fact) {
  const date = (value) => (value && !/^0000/.test(value) ? formatPreviewDate(value) : "");
  if (fact === "maidenName") return String(person?.LastNameAtBirth || "").trim();
  if (fact === "birth") {
    return [date(person?.BirthDate), person?.BirthLocation ? `in ${person.BirthLocation}` : ""].filter(Boolean).join(" ");
  }
  if (fact === "death") {
    return [date(person?.DeathDate), person?.DeathLocation ? `in ${person.DeathLocation}` : ""].filter(Boolean).join(" ");
  }
  if (fact === "birthPlace") return String(person?.BirthLocation || "").trim();
  if (fact === "deathPlace") return String(person?.DeathLocation || "").trim();
  return "";
}

/** people: API person objects; labelOf(person) → "Hannah Hutton (Hutton-734)". */
export function buildRelativeFactAnswer(people, fact, labelOf) {
  const label = FACT_LABELS[fact] || fact;
  if (fact === "name") {
    const names = people.map((person) => labelOf(person));
    return names.length === 1 ? `${names[0]}.` : names.map((name) => `- ${name}`).join("\n");
  }
  const lines = people.map((person) => {
    const value = factValue(person, fact);
    // "Martha … was born in Wrockwardine", not "Martha …: birth place Wrockwardine" (2026-10-04).
    const verb = { birth: "was born", death: "died", birthPlace: "was born in", deathPlace: "died in" }[fact] || "";
    if (!value) return `${labelOf(person)}: no ${label} recorded`;
    return verb ? `${labelOf(person)} ${verb} ${value}` : `${labelOf(person)}: ${label} ${value}`;
  });
  return lines.length === 1 ? `${lines[0]}.` : lines.map((line) => `- ${line}`).join("\n");
}

/** Which getRelatives list a relation word reads, and the gender filter. */
export function relationSelector(relationRaw) {
  const word = String(relationRaw || "").toLowerCase();
  if (/^(?:mother|father|parents?)$/.test(word)) {
    return { list: "Parents", gender: word === "mother" ? "Female" : word === "father" ? "Male" : "" };
  }
  if (/^(?:husbands?|wife|wives|spouses?)$/.test(word)) {
    return { list: "Spouses", gender: /^husband/.test(word) ? "Male" : /^wi/.test(word) ? "Female" : "" };
  }
  // N4 (live, 2026-10-03): "where were her grandparents born?" went to WT+.
  if (/^grand(?:mothers?|fathers?|parents?)$/.test(word)) {
    return { list: "Parents", gender: /^grandmother/.test(word) ? "Female" : /^grandfather/.test(word) ? "Male" : "", grand: true };
  }
  // I10: grandchildren are the children's children (the handler walks two steps).
  if (/^grand(?:sons?|daughters?|children|child)$/.test(word)) {
    return { list: "Children", gender: /^grandson/.test(word) ? "Male" : /^granddaughter/.test(word) ? "Female" : "", grand: true };
  }
  if (/^(?:sons?|daughters?|children|child)$/.test(word)) {
    return { list: "Children", gender: /^son/.test(word) ? "Male" : /^daughter/.test(word) ? "Female" : "" };
  }
  return { list: "Siblings", gender: /^brother/.test(word) ? "Male" : /^sister/.test(word) ? "Female" : "" };
}

/** fact "older" | "younger": owner against each relative, by birth date. */
export function buildAgeComparisonAnswer(owner, people, fact, labelOf) {
  const ownerBirth = birthKey(owner?.BirthDate);
  if (!ownerBirth) return `${labelOf(owner)} has no birth date recorded, so I can't compare.`;
  const lines = people.map((person) => {
    const birth = birthKey(person?.BirthDate);
    if (!birth) return `${labelOf(person)}: no birth date recorded`;
    const sameYear = birth.slice(0, 4) === ownerBirth.slice(0, 4);
    const partial = /-00/.test(birth) || /-00/.test(ownerBirth);
    if (birth === ownerBirth || (sameYear && partial)) {
      return `${labelOf(person)} (b. ${formatPreviewDate(person.BirthDate)}): born the same year, so I can't tell`;
    }
    const ownerOlder = ownerBirth < birth;
    const years = Math.abs(Number(birth.slice(0, 4)) - Number(ownerBirth.slice(0, 4)));
    const yes = fact === "older" ? ownerOlder : !ownerOlder;
    return `${yes ? "Yes" : "No"} — ${labelOf(person)} (b. ${formatPreviewDate(person.BirthDate)}) was ${
      ownerOlder ? "younger" : "older"
    } by about ${years} year${years === 1 ? "" : "s"}`;
  });
  const head = `${labelOf(owner)} was born ${formatPreviewDate(owner.BirthDate)}.`;
  return lines.length === 1 ? `${head} ${lines[0]}.` : `${head}\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
