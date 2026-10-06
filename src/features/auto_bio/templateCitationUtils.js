/**
 * Turning a source that is only a {{FamilySearch}} or {{Ancestry Tree}} template into a full
 * citation of the tree the template points to.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A date as "24 Aug 2026". */
export function accessedDate(date = new Date()) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/* The whole source is the template: a bullet or a trailing full stop around it is allowed, other text is not. */
const FAMILY_SEARCH = /^\*?\s*(\{\{\s*FamilySearch\s*\|\s*([A-Z0-9]{4}-[A-Z0-9]{3,4})\s*\}\})\.?$/;
const ANCESTRY_TREE = /^\*?\s*(\{\{\s*Ancestry[ _]Tree\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\}\})\.?$/i;

export function isBareTemplateSource(text) {
  const trimmed = String(text || "").trim();
  return FAMILY_SEARCH.test(trimmed) || ANCESTRY_TREE.test(trimmed);
}

/**
 * The full citation for a source that is only a template, or the text unchanged when it is
 * anything else. The citation is for the person whose name is given.
 *
 * Who keeps an Ancestry tree is not in the template, so that part of a full Ancestry citation is
 * left for the person to add.
 *
 * @param {string} text the source
 * @param {string} name the name of the person the template is for
 * @param {Date} [date] when the tree was looked at
 */
export function expandTemplateCitation(text, name, date = new Date()) {
  const trimmed = String(text || "").trim();
  const accessed = accessedDate(date);
  const entry = name ? `entry for ${name}` : "entry";

  const familySearch = trimmed.match(FAMILY_SEARCH);
  if (familySearch) {
    return `'''Family Tree''': database, FamilySearch (http://familysearch.org/ : accessed ${accessed}), ${entry} (${familySearch[1]}); contributed by various users.`;
  }

  const ancestry = trimmed.match(ANCESTRY_TREE);
  if (ancestry) {
    return `'''Family Tree''': database, Ancestry (https://www.ancestry.com/ : accessed ${accessed}), ${entry} ${ancestry[1]}.`;
  }

  return text;
}
