/**
 * Links for the cemetery in the burial sentence. A cemetery can have a space page on WikiTree
 * (Space:Fairmont_Cemetery_Raton_NM_USA) as well as a category. The name of a space page cannot be worked out
 * from the cemetery's name, so a link the old bio already has (the monumental inscription under See also, say)
 * is used when its text is the cemetery's name; otherwise the cemetery's category, if the profile has one.
 */
import { formatWikiLink } from "./narrativePlaceUtils.js";

const normalizeName = (name) =>
  String(name || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* "Fairmont Cemetery, Raton, Colfax County" -> "Fairmont Cemetery"; a plot in brackets is not part of the name. */
function cemeteryNameOf(cemetery) {
  return String(cemetery || "")
    .split(",")[0]
    .replace(/\(.*$/, "")
    .replace(/_/g, " ")
    .trim();
}

/**
 * @param {string} cemetery the cemetery as written in the burial sentence
 * @param {{oldBio?: string, categories?: string[]}} [sources] the old bio's text and the profile's categories
 * @returns {{kind: "space"|"category", title: string}|null}
 */
export function findCemeteryLink(cemetery, { oldBio = "", categories = [] } = {}) {
  const name = normalizeName(cemeteryNameOf(cemetery));
  if (!name) {
    return null;
  }
  const spaceLink = /\[\[Space:([^|\]\n]+)\|([^\]\n]+)\]\]/g;
  let match;
  while ((match = spaceLink.exec(oldBio))) {
    if (normalizeName(match[2]) === name) {
      return { kind: "space", title: match[1].trim() };
    }
  }
  for (const line of categories) {
    const category = String(line).match(/\[\[:?Category:\s*([^|\]\n]+?)\s*(?:\|[^\]\n]*)?\]\]/i);
    const title = (category ? category[1] : String(line)).trim();
    if (title && normalizeName(title.split(",")[0]) === name) {
      return { kind: "category", title };
    }
  }
  return null;
}

/**
 * The cemetery as it is written in the burial sentence with its name linked (the rest of the place after the
 * name is left as it is), or the cemetery unchanged when there is nothing to link to.
 */
export function linkCemetery(cemetery, sources) {
  const link = findCemeteryLink(cemetery, sources);
  if (!link) {
    return cemetery;
  }
  const text = String(cemetery);
  const comma = text.indexOf(",");
  const head = comma === -1 ? text : text.slice(0, comma);
  const rest = comma === -1 ? "" : text.slice(comma);
  const plot = head.match(/\s*\(.*$/);
  const name = plot ? head.slice(0, plot.index) : head;
  return formatWikiLink(link, name.trim()) + (plot ? head.slice(plot.index) : "") + rest;
}
