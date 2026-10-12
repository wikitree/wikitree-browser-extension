// Whose chart: a relative of the page person (or of you), optionally with their name (2026-10-10).
// "his daughter Carol Moak's lifespans" on Moak-135 was a name search for the whole phrase; the
// chart parsers knew only "his", "my" and WikiTree IDs. The owner here is the relation walk from
// the page person, narrowed by the name words when there are any.

// (no capture groups: it goes inside each chart parser's own OWNER group)
const RELATIVE_WORD = String.raw`(?:(?:great[\s-]*)*grand[\s-]*)?(?:father|mother|parent|son|daughter|child|children|brother|sister|sibling|husband|wife|spouse|partner|uncle|aunt|nephew|niece|cousin)s?(?:[\s-]in[\s-]law)?`;
const ORDINAL = String.raw`(?:(?:first|second|third|fourth|eldest|oldest|youngest|elder|older|younger|late)\s+)?`;
const RELATION_CHAIN = String.raw`(?:${ORDINAL}${RELATIVE_WORD}['’]s\s+)*${ORDINAL}${RELATIVE_WORD}`;
const NAME_WORDS = String.raw`(?:\s+[A-Za-z][A-Za-z'.-]*){0,3}?`;

/** "his daughter Carol Moak's", "my mother's father's", "her first husband's" (for an OWNER group). */
export const RELATIVE_OWNER = String.raw`(?:my|our|her|his|their)\s+${RELATION_CHAIN}${NAME_WORDS}['’]s`;

const RELATIVE_OWNER_PARTS = new RegExp(
  String.raw`^((?:my|our|her|his|their)\s+${RELATION_CHAIN})((?:\s+[A-Za-z][A-Za-z'.-]*){0,3}?)['’]s\b`,
  "i"
);

/** {relation: "his daughter", names: ["Carol", "Moak"]} from the start of a chart prompt, or null. */
export function parseRelativeOwner(text) {
  const match = String(text || "")
    .trim()
    .match(RELATIVE_OWNER_PARTS);
  if (!match) return null;
  const relation = match[1].replace(/^our\b/i, "my").replace(/\s+/g, " ").trim();
  const names = match[2].trim().split(/\s+/).filter(Boolean);
  // ("my children's" alone: the relation; "his ancestors'" never gets here)
  return { relation, names };
}

const nameWordsOf = (person) =>
  [
    person?.FirstName,
    person?.MiddleName,
    person?.RealName,
    person?.BirthName,
    person?.LongName,
    person?.Nicknames,
    person?.LastNameAtBirth,
    person?.LastNameCurrent,
    person?.Derived?.ShortName,
    person?.Derived?.LongName,
    String(person?.Name || "").replace(/-\d+$/, ""),
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-zÀ-ɏ'-]+/)
    .filter(Boolean);

/** The relatives whose names include every typed word ("Carol", "Moak"; any case). */
export function relativesNamed(people, names) {
  if (!names?.length) return people || [];
  const wanted = names.map((name) => name.toLowerCase().replace(/[.']+$/, ""));
  return (people || []).filter((person) => {
    const words = nameWordsOf(person);
    return wanted.every((word) => words.includes(word));
  });
}
