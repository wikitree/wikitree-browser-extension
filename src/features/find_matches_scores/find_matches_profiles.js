/*
Created By: Ian Beacall (Beacall-6)

Turning a getPeople response into the records the scorer works on.

getPeople with nuclear:1 answers with one flat map of everybody — the profiles asked for and
their relatives together, related only by the Father, Mother and Spouses fields on each one.
There is no child list anywhere in the response; a profile's children are found by looking
for the profiles that point back at it.
*/

import { compactDateYear, toCompactDate } from "./match_dates";
import { foldText } from "./match_locations";

/** Everything the scorer reads, for the searched profiles and their relatives alike. */
export const PROFILE_FIELDS = [
  "Id",
  "Name",
  "FirstName",
  "MiddleName",
  "RealName",
  "LastNameAtBirth",
  "LastNameCurrent",
  "LastNameOther",
  "Gender",
  "BirthDate",
  "DeathDate",
  "BirthDateDecade",
  "DeathDateDecade",
  "BirthLocation",
  "DeathLocation",
  "Father",
  "Mother",
  "Spouses",
].join(",");

/**
 * Turn the flat API map into the records match_scoring expects, keyed by folded WikiTree ID.
 * Children are found by scanning the map for anyone whose Father or Mother is this profile —
 * the API gives no child list, only the parent pointers on the children themselves.
 */
export function buildProfiles(raw, wtIds) {
  const childrenByParentId = new Map();
  for (const person of raw.values()) {
    for (const parentId of [person.Father, person.Mother]) {
      const key = String(parentId || "");
      if (key === "" || key === "0") continue;
      if (!childrenByParentId.has(key)) {
        childrenByParentId.set(key, []);
      }
      childrenByParentId.get(key).push({
        nameKey: foldText(person.FirstName || person.RealName || ""),
        birthYear: compactDateYear(toCompactDate(person.BirthDate, person.BirthDateDecade)) || null,
        birthCompact: toCompactDate(person.BirthDate, person.BirthDateDecade),
        wtId: person.Name || "",
        displayName: person.FirstName || person.RealName || "",
      });
    }
  }

  const wanted = new Set(wtIds.map((wtId) => foldText(wtId)));
  const profiles = new Map();

  for (const person of raw.values()) {
    const key = foldText(person.Name || "");
    if (!key || !wanted.has(key)) {
      continue;
    }

    const parentRefs = [];
    for (const [role, parentId] of [
      ["Father", person.Father],
      ["Mother", person.Mother],
    ]) {
      const parent = raw.get(String(parentId || ""));
      if (parent) {
        parentRefs.push({
          role,
          firstName: parent.FirstName || parent.RealName || "",
          lnab: parent.LastNameAtBirth || "",
          wtId: parent.Name || "",
          displayName: displayNameOf(parent),
        });
      }
    }

    const spouses = Object.values(person.Spouses || {}).map((spouse) => ({
      id: String(spouse.Id || ""),
      wtId: spouse.Name || "",
      displayName: displayNameOf(spouse),
      marriageYear: compactDateYear(toCompactDate(spouse.marriage_date, "")) || null,
    }));

    profiles.set(key, {
      ...person,
      birthCompact: toCompactDate(person.BirthDate, person.BirthDateDecade),
      deathCompact: toCompactDate(person.DeathDate, person.DeathDateDecade),
      fatherId: String(person.Father || ""),
      motherId: String(person.Mother || ""),
      parentRefs,
      spouses,
      children: childrenByParentId.get(String(person.Id)) || [],
    });
  }

  return profiles;
}

export function displayNameOf(person) {
  return [
    person.FirstName || person.RealName || "",
    person.MiddleName || "",
    person.LastNameCurrent || person.LastNameAtBirth || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}
