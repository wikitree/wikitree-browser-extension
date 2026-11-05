/**
 * Helpers for the list of children in an auto-generated biography.
 */

// Rough age at which someone is likely to have started a family, for ordering only.
const typicalAgeAtParenthood = 25;

/* Children known only from citations have no dates, and an all-zero order date sorts the
list to the very top of the narrative — ahead of the censuses of the person's own childhood.
Put it where children plausibly arrived instead: a generation after the person's birth, and
never after their death, so the death sentence still comes last. */
export function estimateChildListDate(person) {
  const birthYear = parseInt((person?.BirthDate || "").slice(0, 4), 10);
  const deathYear = parseInt((person?.DeathDate || "").slice(0, 4), 10);
  if (!birthYear) {
    return deathYear ? `${deathYear}-00-00` : "0000-00-00";
  }
  let year = birthYear + typicalAgeAtParenthood;
  if (deathYear && year >= deathYear) {
    year = deathYear;
  }
  return `${year}-00-00`;
}

/* Children found only in citations often have no dates and no status, and the empty bits
would otherwise leave "Name  ." with stray spaces before the ref tags. */
export function joinChildBits(...bits) {
  return bits
    .map((bit) => (bit || "").trim())
    .filter(Boolean)
    .join(" ");
}
