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
