// Sex at Birth marked "other/do not display" (DataStatus.Gender "blank": user, 2026-10-12, "Another that we should
// respect is the 'blank' Gender"). WikiTree keeps the Gender field for Y-DNA and mtDNA lines, but shows the person
// in neutral words (parent, child, spouse, sibling, their) and green instead of pink or blue (Help:Sex_and_Gender).
// Genie's charts, words and colours do the same. DNA lines still read Gender itself, and so does working out
// whom a word means ("his wife", "her" in a follow-up): that's the family link, not how the person is shown.

/** The gender to show: "" when it's marked not to show (DataStatus.Gender "blank"), else Gender. */
export function shownGender(person) {
  const status = person?.DataStatus?.Gender ?? person?.data_status?.gender ?? person?.data_status?.Gender;
  return String(status || "").toLowerCase() === "blank" ? "" : person?.Gender || "";
}
