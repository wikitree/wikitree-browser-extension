/*
Created By: Ian Beacall (Beacall-6)
*/

/*
Works out what a logged-in member can see that the public can't, person by person.

The input is the same getPeople answer fetched twice: once with the member's login (`authed`) and once without it
(`anon`). Anything in the first that the second leaves out is private. WikiTree decides what's private, so these
functions never have to know the privacy rules themselves.
*/

const NAME_FIELDS = [
  "FirstName",
  "MiddleName",
  "RealName",
  "Nicknames",
  "LastNameAtBirth",
  "LastNameCurrent",
  "LastNameOther",
];
// Fields that can hold several names, comma separated.
const LIST_FIELDS = new Set(["Nicknames", "LastNameOther"]);

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** Every name a field holds, e.g. "Bob, Bobby" in Nicknames gives two. */
function namesIn(person, field) {
  const value = clean(person?.[field]);
  if (!value) return [];
  return LIST_FIELDS.has(field) ? value.split(/\s*,\s*/).filter(Boolean) : [value];
}

/** Lowercase words of a name, without punctuation: "Mary-Ann (Rice)" → ["mary", "ann", "rice"]. */
export function nameWords(text) {
  return (
    clean(text)
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  ).filter((word) => word.length > 1);
}

/** Every name word the public can see for this person. */
function publicWords(anon) {
  const words = new Set();
  if (!anon) return words;
  for (const field of [...NAME_FIELDS, "MiddleInitial", "Prefix", "Suffix"]) {
    namesIn(anon, field).forEach((name) => nameWords(name).forEach((word) => words.add(word)));
  }
  return words;
}

/**
 * The ways a name is usually written: "Ian Beacall", "Ian Christopher Beacall", "Ian C. Beacall",
 * "Maureen (Rice) Beacall", "Beacall, Ian".
 */
export function nameVariants(person) {
  const firsts = unique([
    ...namesIn(person, "FirstName"),
    ...namesIn(person, "RealName"),
    ...namesIn(person, "Nicknames"),
  ]);
  const middle = clean(person.MiddleName);
  const initial = clean(person.MiddleInitial) || (middle ? `${middle[0]}.` : "");
  const birth = clean(person.LastNameAtBirth);
  const current = clean(person.LastNameCurrent) || birth;
  const lasts = unique([current, birth, ...namesIn(person, "LastNameOther")]);
  // "" is the name without a middle name (unique() would drop it as blank).
  const middles = ["", ...unique([middle, initial])];

  const variants = [];
  for (const first of firsts) {
    for (const mid of middles) {
      const firstMid = mid ? `${first} ${mid}` : first;
      if (mid) variants.push(firstMid);
      for (const last of lasts) {
        variants.push(`${firstMid} ${last}`);
        variants.push(`${last}, ${firstMid}`);
      }
      if (birth && current && birth.toLowerCase() !== current.toLowerCase()) {
        variants.push(`${firstMid} (${birth}) ${current}`);
      }
    }
  }
  return unique(variants.filter((variant) => nameWords(variant).length > 1));
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = clean(value).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** "1969-04-14" → {y:1969, m:4, d:14}; "1927-00-00" → {y:1927, m:0, d:0}; blank → null. */
export function parseDate(value) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  return y ? { y, m, d } : null;
}

/**
 * The private facts for one person.
 * @param {Object} authed The person as the logged-in member sees them.
 * @param {Object|null} anon The same person as the public sees them; null when the public can't see them at all.
 * @returns {Object|null} null when nothing about them is private.
 */
export function privateFactsFor(authed, anon) {
  if (!authed?.Id) return null;
  const hidden = !anon || !anon.Name || Number(anon.Id) < 0;
  const seen = hidden ? new Set() : publicWords(anon);

  // Name words the public never sees: all of them for a hidden profile, otherwise e.g. a middle name.
  const words = new Set();
  for (const field of NAME_FIELDS) {
    namesIn(authed, field).forEach((name) => nameWords(name).forEach((word) => !seen.has(word) && words.add(word)));
  }
  const tokens = unique(NAME_FIELDS.flatMap((field) => namesIn(authed, field))).filter((name) =>
    nameWords(name).some((word) => words.has(word))
  );
  const phrases = nameVariants(authed).filter((variant) => nameWords(variant).some((word) => words.has(word)));

  const dates = [];
  for (const field of ["BirthDate", "DeathDate"]) {
    const date = parseDate(authed[field]);
    if (date && (hidden || clean(anon[field]) !== clean(authed[field]))) dates.push(date);
  }

  const places = [];
  for (const field of ["BirthLocation", "DeathLocation"]) {
    const place = clean(authed[field]);
    if (place && (hidden || clean(anon[field]) !== place)) places.push(place);
  }

  const photo = clean(authed.Photo);
  const photoPrivate = Boolean(photo) && (hidden || clean(anon.Photo) !== photo);
  const bio = clean(authed.bio ?? authed.Bio);
  const bioPrivate = Boolean(bio) && (hidden || !clean(anon.bio ?? anon.Bio));

  if (!hidden && !tokens.length && !phrases.length && !dates.length && !places.length && !photoPrivate && !bioPrivate) {
    return null;
  }

  return {
    id: Number(authed.Id),
    name: clean(authed.Name),
    hidden,
    phrases,
    tokens,
    dates,
    places,
    photo: photoPrivate ? photo : "",
    bioPrivate,
    publicName: hidden ? "Private" : publicName(anon),
  };
}

/** How the public sees the name, for the tab title: "Ian C. Beacall". */
function publicName(anon) {
  const first = clean(anon.RealName) || clean(anon.FirstName);
  const initial = clean(anon.MiddleInitial);
  const last = clean(anon.LastNameCurrent) || clean(anon.LastNameAtBirth);
  return [first, initial, last].filter(Boolean).join(" ") || "Private";
}

/**
 * Pairs up the two getPeople answers and returns the private facts for everyone who has some.
 * @param {Object} authedPeople getPeople's `people` from the logged-in call
 * @param {Object} anonPeople getPeople's `people` from the call without the login
 */
export function privateFactsFromPeople(authedPeople, anonPeople) {
  const anonById = new Map();
  Object.values(anonPeople || {}).forEach((person) => {
    if (Number(person?.Id) > 0) anonById.set(Number(person.Id), person);
  });
  return Object.values(authedPeople || {})
    .map((person) => privateFactsFor(person, anonById.get(Number(person?.Id)) || null))
    .filter(Boolean);
}
