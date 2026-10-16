import { PersonName } from "../auto_bio/person_name";

/**
 * PersonName's name for these parts ("FullName", "PedigreeName", …), or "" when it can't make one.
 * PersonName writes "(Smith) null" when one surname is missing, so the other fills it: "Jim Dixon".
 */
export function personNameParts(person, parts) {
  if (!person) return "";
  const lnab = person.LastNameAtBirth || person.LastNameCurrent;
  const current = person.LastNameCurrent || person.LastNameAtBirth;
  try {
    const name = new PersonName({ ...person, LastNameAtBirth: lnab, LastNameCurrent: current }).withParts(parts);
    return typeof name === "string" && !name.startsWith("Invalid name part") ? name.replace(/\s+/g, " ").trim() : "";
  } catch (error) {
    return "";
  }
}
