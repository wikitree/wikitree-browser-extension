// Finding a named person in the family (2026-10-08). "John Theodore Weatherall"
// asked on Weatherall-111's page: when the name isn't linked on the page, and the
// surname is the profile person's or the user's, look for it in that person's
// CC7 (getPeople, nuclear 7) before searching the whole of WikiTree.

const norm = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const words = (value) => norm(value).split(" ").filter(Boolean);
const surnameOfId = (wtId) => String(wtId || "").replace(/-\d+$/, "").replace(/_/g, " ");

/** The surnames that make a name "family": the profile person's and the user's. */
export function familySurnames({ profileWtId = "", profileLastName = "", profileFullName = "", userWtId = "" } = {}) {
  const names = [surnameOfId(profileWtId), profileLastName, words(profileFullName).pop(), surnameOfId(userWtId)];
  return new Set(names.map(norm).filter(Boolean));
}

/** The target's surname (its last word) is one of the family's. */
export function hasFamilySurname(target, surnames) {
  const last = words(String(target || "").replace(/\([^)]*\)/g, " ")).pop();
  return Boolean(last && surnames?.has(last));
}

/**
 * The profile in `profiles` (getPeople rows) that `target` names, or null when
 * none or more than one fit equally well. First and last names must match;
 * middle names, when given, pick between namesakes.
 */
export function findNameInProfiles(target, profiles) {
  const parts = words(String(target || "").replace(/\([^)]*\)/g, " "));
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const middles = parts.slice(1, -1);
  let best = null;
  let bestScore = 0;
  let tie = false;
  for (const profile of profiles || []) {
    if (!profile?.Name) continue;
    const lasts = new Set([profile.LastNameAtBirth, profile.LastNameCurrent, ...String(profile.LastNameOther || "").split(",")].map(norm).filter(Boolean));
    if (!lasts.has(last)) continue;
    const given = [...words(profile.FirstName), ...words(profile.MiddleName)];
    const known = [...words(profile.RealName), ...words(profile.Derived?.ShortName || profile.ShortName)];
    if (given[0] !== first && known[0] !== first) continue;
    let score = 100;
    for (const middle of middles) {
      if (given.includes(middle) || known.includes(middle)) score += 20;
      else if (lasts.has(middle)) score += 10; // "Annie Thomason Weatherall"
      else score -= 50;
    }
    if (score > bestScore) {
      best = profile;
      bestScore = score;
      tie = false;
    } else if (score === bestScore && profile.Name !== best?.Name) {
      tie = true;
    }
  }
  return best && !tie && bestScore > 0 ? best : null;
}

/** "John Theodore Weatherall's (Weatherall-113) bio" → "Weatherall-113's bio": the ID decides. */
export function preferBracketedIds(text) {
  const id = String.raw`(\p{L}[\p{L}\p{M}0-9_'-]*-\d+)`;
  // A capitalised name, not a capitalised command word ("Show John Smith (Smith-1)").
  const lead = String.raw`(?!(?:Show|Open|Read|Display|Get|Find|Give|Tell|Who|What|When|Where|How|Is|Was|Did|Please|Map|List|Draw)\b)`;
  const word = String.raw`\p{Lu}[\p{L}\p{M}.'’-]*`;
  const name = String.raw`${lead}${word}(?:\s+(?:${word}|\([^)]*\)|de|da|di|du|del|della|den|der|la|le|van|von|ten|ter|of))*?`;
  return String(text || "")
    .replace(new RegExp(String.raw`${name}['’]s\s+\(${id}\)`, "gu"), "$1's")
    .replace(new RegExp(String.raw`${name}\s+\(${id}\)(['’]s)?`, "gu"), (_, wtId, possessive) => `${wtId}${possessive ? "'s" : ""}`);
}
