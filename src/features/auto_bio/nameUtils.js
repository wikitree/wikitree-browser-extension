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
  const parts = getComparableNameString(value)
    .trim()
    .split(/\s+/)
    .map((part) => normalizeNamePart(part))
    .filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts[parts.length - 1] || "",
  };
}

function firstNamesLikelyMatch(leftFirstName, rightFirstName) {
  if (!leftFirstName || !rightFirstName) return false;
  if (leftFirstName === rightFirstName) return true;

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

  return left.lastName === right.lastName && firstNamesLikelyMatch(left.firstName, right.firstName);
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
