/**
 * Turning a source that is only a link to a FamilySearch or Ancestry tree profile, or only the template for
 * one ({{FamilySearch|LCJ1-DY7}}, {{Ancestry Tree|16950920|441412223}}), into a full citation of that tree.
 */
import { convertDate } from "./dateUtils.js";

const FS_ID = "[A-Z0-9]{4}-[A-Z0-9]{3,4}";
const FAMILY_SEARCH_TEMPLATE = new RegExp(`^\\{\\{\\s*FamilySearch\\s*\\|\\s*(${FS_ID})\\s*\\}\\}$`);
const FAMILY_SEARCH_LINKS = [
  new RegExp(`familysearch\\.org/(?:[a-z]{2}(?:-[a-z]+)?/)?tree/person/(?:[a-z]+/)?(${FS_ID})`, "i"),
  new RegExp(`ancestors\\.familysearch\\.org/[a-z]{2}(?:-[a-z]+)?/(${FS_ID})/`, "i"),
];
const ANCESTRY_TEMPLATE = /^\{\{\s*Ancestry[ _]Tree\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\}\}$/i;
const ANCESTRY_LINKS = [
  /ancestry\.[a-z.]+\/family-tree\/person\/tree\/(\d+)\/person\/(\d+)/i,
  /ancestry\.[a-z.]+\/pt\/PersonMatch\.aspx\?tid=(\d+)&pid=(\d+)/i,
];

/** A date as "24 Aug 2026". */
export function accessedDate(date = new Date()) {
  const pad = (number) => String(number).padStart(2, "0");
  return convertDate(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, "DsMY");
}

/**
 * The tree profile a source points to, when the source is only that: the template, a bare link or a
 * bracketed link, with an optional bullet and full stop around it.
 *
 * @param {string} text the source
 * @returns {{familySearch: string}|{ancestryTree: string, ancestryPerson: string}|null}
 */
export function treeProfileOfSource(text) {
  const source = String(text || "")
    .trim()
    .replace(/^\*\s*/, "")
    .replace(/\.$/, "");

  const template = source.match(FAMILY_SEARCH_TEMPLATE);
  if (template) {
    return { familySearch: template[1] };
  }
  const ancestryTemplate = source.match(ANCESTRY_TEMPLATE);
  if (ancestryTemplate) {
    return { ancestryTree: ancestryTemplate[1], ancestryPerson: ancestryTemplate[2] };
  }

  const link = source.match(/^(https?:\/\/\S+)$/) || source.match(/^\[(https?:\/\/\S+)(?:\s+[^\]]*)?\]$/);
  if (!link) {
    return null;
  }
  for (const pattern of FAMILY_SEARCH_LINKS) {
    const match = link[1].match(pattern);
    if (match) {
      return { familySearch: match[1].toUpperCase() };
    }
  }
  for (const pattern of ANCESTRY_LINKS) {
    const match = link[1].match(pattern);
    if (match) {
      return { ancestryTree: match[1], ancestryPerson: match[2] };
    }
  }
  return null;
}

/**
 * The full citation for a source that is only a tree link or template, or the text unchanged when it is
 * anything else. The citation is for the person whose name is given.
 *
 * Who keeps an Ancestry tree is not in the link or the template, so that part of a full Ancestry citation
 * is left for the person to add.
 *
 * @param {string} text the source
 * @param {string} name the name of the person the source is for
 * @param {Date} [date] when the tree was looked at
 */
export function expandTemplateCitation(text, name, date = new Date()) {
  const profile = treeProfileOfSource(text);
  if (!profile) {
    return text;
  }
  const accessed = accessedDate(date);
  const entry = name ? `entry for ${name}` : "entry";
  if (profile.familySearch) {
    return `'''Family Tree''': database, FamilySearch (http://familysearch.org/ : accessed ${accessed}), ${entry} ({{FamilySearch|${profile.familySearch}}}); contributed by various users.`;
  }
  return `'''Family Tree''': database, Ancestry (https://www.ancestry.com/ : accessed ${accessed}), ${entry} {{Ancestry Tree|${profile.ancestryTree}|${profile.ancestryPerson}}}.`;
}
