// The Family Explorer's person card (user, 2026-10-12: "Can you add much more information in these cards?"):
// what is known about someone from the people loaded (see summarizeWorldPerson): when and where they were born
// and died, how old they were, their parents, each husband or wife with when and where they married and their
// children together, and their brothers and sisters. Pure; the views draw it.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// (WikiTree's date status: "guess" shows as "about")
const STATUS_WORDS = { guess: "about", before: "before", after: "after" };

function parts(date) {
  const [y, m, d] = String(date || "")
    .split("-")
    .map((part) => Number(part) || 0);
  return y ? { y, m, d } : null;
}

/** "12 March 1769", "March 1769" or "1769", with "about", "before" or "after" from the date's status. */
export function cardDate(date, status = "") {
  const at = parts(date);
  if (!at) return "";
  const month = at.m >= 1 && at.m <= 12 ? MONTHS[at.m - 1] : "";
  const text = [month && at.d ? String(at.d) : "", month, String(at.y)].filter(Boolean).join(" ");
  const word = STATUS_WORDS[String(status || "").toLowerCase()];
  return word ? `${word} ${text}` : text;
}

/** "1769", or "about 1769", "before 1769" or "after 1769" from the date's status. */
export function cardYear(date, status = "") {
  const at = parts(date);
  if (!at) return "";
  const word = STATUS_WORDS[String(status || "").toLowerCase()];
  return word ? `${word} ${at.y}` : String(at.y);
}

/**
 * When something happened, to follow a verb: "on 12 March 1769" for a day, "in March 1769" or "in 1769", and no
 * "on" or "in" before "about", "before" or "after" (user, 2026-10-13: "It says 'in' and then gives a day").
 */
export function cardWhen(date, status = "") {
  const text = cardDate(date, status);
  if (!text || STATUS_WORDS[String(status || "").toLowerCase()]) return text;
  return `${parts(date).d && parts(date).m ? "on" : "in"} ${text}`;
}

/** How old someone was when they died: {years, about}, or null when it can't be told. */
export function ageAtDeath(person) {
  const born = parts(person?.birth);
  const died = parts(person?.death);
  if (!born || !died) return null;
  let years = died.y - born.y;
  const exact = Boolean(born.m && born.d && died.m && died.d);
  if (exact && (died.m < born.m || (died.m === born.m && died.d < born.d))) years -= 1;
  if (years < 0 || years > 120) return null;
  const sure = (status) => !STATUS_WORDS[String(status || "").toLowerCase()];
  return { years, about: !exact || !sure(person.birthStatus) || !sure(person.deathStatus) };
}

/** "aged 99" or "aged about 99" from ageAtDeath; "" with no age. */
export const agedText = (age) => (age ? `aged ${age.about ? "about " : ""}${age.years}` : "");

const byBirth = (a, b) => (a.birth || "9999").localeCompare(b.birth || "9999") || a.id - b.id;

/**
 * Everything the card shows about `id`: {born: {date, place}, died: {date, place}, age, parents, marriages:
 * [{spouse (or null when not loaded), wtid, married ("on 20 November 1820", see cardWhen), place, children, hidden}], children (with no husband or
 * wife here), siblings: [{person, half}], hidden: {children, siblings}}. Hidden (private) profiles are only counted.
 */
export function cardFacts(people, id) {
  const person = people.get(id);
  if (!person) return null;
  const everyone = [...people.values()];
  const shown = (other) => other && !other.hidden;
  const parents = [person.fatherId, person.motherId].map((parentId) => people.get(parentId)).filter(shown);
  const allChildren = everyone.filter((other) => other.id !== id && (other.fatherId === id || other.motherId === id));
  const children = allChildren.filter(shown).sort(byBirth);
  const otherParent = (child) => (child.fatherId === id ? child.motherId : child.fatherId);
  // Husbands and wives: theirs, and anyone loaded who lists them; then the other parent of any child.
  const marriages = [];
  const marriageOf = new Map();
  const addMarriage = (spouseId, wtid = "", married = "", place = "", marriedStatus = "") => {
    if (!spouseId || spouseId === id) return;
    const known = marriageOf.get(spouseId);
    if (known) {
      if (!known.married) Object.assign(known, { married, marriedStatus });
      known.place = known.place || place;
      return;
    }
    const spouse = people.get(spouseId);
    if (spouse?.hidden) return;
    const entry = { spouse: spouse || null, wtid: spouse?.wtid || wtid, married, marriedStatus, place, children: [], hidden: 0 };
    marriageOf.set(spouseId, entry);
    marriages.push(entry);
  };
  (person.spouses || []).forEach((spouse) => addMarriage(spouse.id, spouse.wtid, spouse.married, spouse.place, spouse.status));
  everyone.forEach((other) => (other.spouses || []).forEach((spouse) => spouse.id === id && addMarriage(other.id, other.wtid, spouse.married, spouse.place, spouse.status)));
  children.forEach((child) => {
    const parentId = otherParent(child);
    if (parentId && people.has(parentId) && !marriageOf.has(parentId)) addMarriage(parentId);
  });
  const loose = [];
  let looseHidden = 0;
  children.forEach((child) => (marriageOf.get(otherParent(child))?.children || loose).push(child));
  allChildren.forEach((child) => {
    if (!child.hidden) return;
    const marriage = marriageOf.get(otherParent(child));
    if (marriage) marriage.hidden += 1;
    else looseHidden += 1;
  });
  marriages.sort((a, b) => (a.married || a.children[0]?.birth || "9999").localeCompare(b.married || b.children[0]?.birth || "9999"));
  const sameParent = (other, key) => person[key] && other[key] === person[key];
  const allSiblings = everyone.filter((other) => other.id !== id && (sameParent(other, "fatherId") || sameParent(other, "motherId")));
  const siblings = allSiblings
    .filter(shown)
    .sort(byBirth)
    .map((other) => ({ person: other, half: !(sameParent(other, "fatherId") && sameParent(other, "motherId")) && Boolean(person.fatherId && person.motherId && other.fatherId && other.motherId) }));
  return {
    born: { date: cardDate(person.birth, person.birthStatus), place: person.birthLocation || "" },
    died: { date: cardDate(person.death, person.deathStatus), place: person.deathLocation || "" },
    age: ageAtDeath(person),
    parents,
    marriages: marriages.map(({ marriedStatus, ...entry }) => ({ ...entry, married: cardWhen(entry.married, marriedStatus) })),
    children: loose,
    siblings,
    hidden: { children: looseHidden, siblings: allSiblings.length - siblings.length },
  };
}
