// Who a question is about when it names no one (the user, 2026-10-11: "All Qs should follow
// whoever is in the picker"). The page's profile person, unless someone is chosen in the
// "About" picker above Genie's box. Code that reads the page itself (its DNA box, its biography,
// its spouse links) asks focusIsPagePerson() first.
import { getProfilePersonInfo } from "../../core/common";

let focus = null;

/** Choose a person ({Name, FullName, FirstName, LastNameAtBirth, Gender, Id, ...}), or null for the page's. */
export function setFocusPerson(info) {
  focus = info?.Name ? { ...info } : null;
}

/** Fill in what a later getPerson found (the name, gender, dates) for the same person. */
export function updateFocusPerson(wtId, info) {
  if (focus && focus.Name === wtId && info) focus = { ...focus, ...info, Name: focus.Name };
}

export function getChosenFocusPerson() {
  return focus;
}

/** getProfilePersonInfo(), but for the chosen person when there is one. */
export function getFocusPersonInfo() {
  return focus || getProfilePersonInfo();
}

/** Whether the question's person is the one on this page (so the page can be read for them). */
export function focusIsPagePerson() {
  if (!focus) return true;
  const page = getProfilePersonInfo();
  return Boolean(page?.Name) && String(page.Name).toLowerCase() === String(focus.Name).toLowerCase();
}

/** Build the focus info from a picker person ({wtId, name, isMe}) and, later, a getPerson result. */
export function focusInfoFromPicker(person, found = null) {
  if (!person?.wtId) return null;
  const name = person.isMe || person.name === person.wtId ? "" : String(person.name || "");
  const realName = String(found?.RealName || found?.FirstName || "").trim();
  const lastName = String(found?.LastNameAtBirth || "").trim();
  const fullName = name || [realName, lastName].filter(Boolean).join(" ") || person.wtId;
  return {
    Name: person.wtId,
    Id: found?.Id || undefined,
    FullName: fullName,
    FirstName: realName || (name ? name.split(/\s+/)[0] : ""),
    LastNameAtBirth: lastName || (name ? name.split(/\s+/).slice(-1)[0] : ""),
    Gender: found?.Gender || "",
    BirthDate: found?.BirthDate || "",
    DeathDate: found?.DeathDate || "",
    BirthYear: String(found?.BirthDate || "").slice(0, 4).replace(/^0000$/, ""),
  };
}
