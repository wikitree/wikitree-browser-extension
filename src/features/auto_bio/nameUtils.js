/**
 * Name-matching helpers for auto_bio.
 */

export function getNameVariantsAll(name, firstNameVariants) {
  if (!name) return [name];
  if (!firstNameVariants) return [name];
  const lower = name.toLowerCase();
  const seenCanonicals = new Set();
  const seenVariants = new Set();

  for (const [canonical, variants] of Object.entries(firstNameVariants)) {
    if (canonical.toLowerCase() === lower || variants.some((variant) => variant.toLowerCase() === lower)) {
      seenCanonicals.add(canonical);
      variants.forEach((variant) => seenVariants.add(variant));
    }
  }

  if (!seenCanonicals.size && !seenVariants.size) return [name];

  return [...new Set([...seenCanonicals, ...seenVariants])];
}

export function getEditDistance(string1, string2) {
  string1 = string1?.toLowerCase();
  string2 = string2?.toLowerCase();

  if (!string1 || !string2) {
    return false;
  }

  const costs = [];
  for (let i = 0; i <= string1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= string2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (string1[i - 1] !== string2[j - 1]) {
            newValue = Math.min(newValue, lastValue, costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[string2.length] = lastValue;
  }
  return costs[string2.length];
}

export function getSimilarity(string1, string2) {
  if (!string1 || !string2) return 0;
  string1 = string1?.toLowerCase();
  string2 = string2?.toLowerCase();
  const longer = Math.max(string1.length, string2.length);
  if (longer === 0) return 1;
  return (longer - getEditDistance(string1, string2)) / longer;
}

function getComparableNameString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.PersonName?.FullName || value.PersonName?.BirthName || value.FullName || value.Name || "";
}

const nonDecomposingLetterFallbacks = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
};

const nonDecomposingLetterPattern = /[ßæœøđłþ]/g;

function normalizeNamePart(value) {
  return getComparableNameString(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(nonDecomposingLetterPattern, (char) => nonDecomposingLetterFallbacks[char] || char)
    .replace(/[^a-z]/g, "");
}

function getComparableFirstAndLastNames(value) {
  const raw = getComparableNameString(value).trim().split(/\s+/);
  const parts = raw.map((part) => normalizeNamePart(part)).filter(Boolean);

  /* A married woman is "Ida Elisabeth (Dyer) Coombes" on WikiTree and "Ida Dyer" on the record
  of her marriage. Both surnames are hers, so both count as a match. */
  const lastNames = [];
  if (parts.length > 0) {
    lastNames.push(parts[parts.length - 1]);
  }
  raw.forEach(function (part) {
    if (/^\(.*\)$/.test(part)) {
      const inBrackets = normalizeNamePart(part);
      if (inBrackets && !lastNames.includes(inBrackets)) {
        lastNames.push(inBrackets);
      }
    }
  });

  return {
    firstName: parts[0] || "",
    lastName: parts[parts.length - 1] || "",
    lastNames,
  };
}

/**
 * Whether one name is written as an initial standing for the other: a marriage index recording
 * "C F Coombes" is the "Charles Francis Coombes" whose profile this is. Without this he is read
 * as somebody else and ends up married to himself.
 *
 * @param {string} left - a name or an initial
 * @param {string} right - a name or an initial
 */
export function isInitialFor(left = "", right = "") {
  const one = String(left).trim().replace(/\.$/, "").toLowerCase();
  const other = String(right).trim().replace(/\.$/, "").toLowerCase();
  if (!one || !other) {
    return false;
  }
  if (one.length !== 1 && other.length !== 1) {
    return false;
  }
  return one[0] === other[0];
}

/**
 * Whether a first name matches any of these names, allowing for an initial.
 * @param {string} firstName
 * @param {string[]} names
 */
export function matchesNameOrInitial(firstName, names = []) {
  return names.some((name) => name && isInitialFor(firstName, String(name).trim().split(/\s+/)[0]));
}

function firstNamesLikelyMatch(leftFirstName, rightFirstName) {
  if (!leftFirstName || !rightFirstName) return false;
  if (leftFirstName === rightFirstName) return true;
  if (isInitialFor(leftFirstName, rightFirstName)) return true;

  const similarity = getSimilarity(leftFirstName, rightFirstName);
  if (similarity >= 0.8) {
    return true;
  }

  const sharedPrefixLength = Math.min(3, leftFirstName.length, rightFirstName.length);
  return (
    sharedPrefixLength >= 3 &&
    leftFirstName.slice(0, sharedPrefixLength) === rightFirstName.slice(0, sharedPrefixLength) &&
    similarity >= 2 / 3
  );
}

export function namesMatchByFirstAndLast(leftName, rightName) {
  const left = getComparableFirstAndLastNames(leftName);
  const right = getComparableFirstAndLastNames(rightName);

  if (!left.firstName || !left.lastName || !right.firstName || !right.lastName) {
    return false;
  }

  const surnamesOverlap = left.lastNames.some((surname) => right.lastNames.includes(surname));
  return surnamesOverlap && firstNamesLikelyMatch(left.firstName, right.firstName);
}

export function isSameName(name, nameVariants, strength = 0.9) {
  let sameName = false;
  nameVariants.forEach(function (variant) {
    if (variant && name) {
      if (getSimilarity(variant?.toLowerCase(), name?.toLowerCase()) > strength) {
        sameName = true;
      }
    }
  });
  return sameName;
}

/* "Garry V McBride III" splits into a first name and a last name, and the generational
suffix is then lost from every variant built out of them, so a citation carrying the suffix
scores only 0.79 against "Garry V McBride" and never matches. */
const generationalSuffixPattern = /[\s,]+(jn?r|sn?r|junior|senior|I{1,3}|IV|VI{0,3}|IX|XI{0,3})\.?$/i;

export function withoutGenerationalSuffix(name) {
  return (name || "").replace(generationalSuffixPattern, "").trim();
}

function generationalSuffix(name) {
  const match = (name || "").match(generationalSuffixPattern);
  if (!match) {
    return "";
  }
  return match[1]
    .toLowerCase()
    .replace(/^(jnr|junior)$/, "jr")
    .replace(/^(snr|senior)$/, "sr");
}

/* A father and son of the same name differ only by the suffix, and the suffix-free variants
score well past the similarity threshold. Two *different* stated suffixes are a definite no.
One name without a suffix says nothing either way, so that stays a match. */
export function generationalSuffixesConflict(nameA, nameB) {
  const suffixA = generationalSuffix(nameA);
  const suffixB = generationalSuffix(nameB);
  return Boolean(suffixA && suffixB && suffixA !== suffixB);
}

/* Possessive form of a name, for sentences that open a paragraph and so cannot lean on a
pronoun for their referent: "Garry's known children were:". */
export function possessiveName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("'") ? trimmed : `${trimmed}'s`;
}
