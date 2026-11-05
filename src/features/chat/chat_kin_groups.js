// "Which of my ancestors were miners", "Mayflower passengers among my relatives", "am I descended from a
// Mayflower passenger", "my Huguenot ancestors" (imagined Q6/Q7/AC1/AD4, 2026-10-18): the category question
// ("my ancestors in the Miners category"). With no category of that name, the WT+ search takes every
// category with the words in it (CategoryWord). Anything that may be a date, place, name or relation declines.

const OWNERS = String.raw`(my|our|his|her|their|[A-Z][A-Za-z'_-]*-\d+['’]s)`;
const KIN = String.raw`(ancestors|descendants|relatives|relations|family|cousins)`;
// (and "X of the Y": "a Fellow of the Royal Society", the Darwin showcase, 2026-10-18)
const GROUP = String.raw`([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){0,2}(?:\s+of\s+the(?:\s+[A-Za-z][A-Za-z'’-]*){1,3})?)`;

// Words that start or make up something other than a group of people ("were born in Kent", "were twins").
const NOT_GROUPS = new Set(
  `a an the any all some most more both each none only also still ever really in on at of from to by with without for
  born died dead alive living buried baptised baptized christened married unmarried single widowed divorced related
  male males female females men women boys girls man woman twins triplets
  ancestors descendants relatives relations family families cousins brothers sisters siblings children kids sons
  daughters parents grandparents grandchildren uncles aunts nephews nieces husbands wives spouses
  people persons profiles ones those these them they unsourced sourced notable notables famous private public
  connected unconnected orphaned orphans adopted illegitimate immigrants emigrants older younger oldest youngest`
    .split(/\s+/)
    .filter(Boolean)
);

// "my Huguenot ancestors": only words known to name a group (an open list would take "my paternal ancestors").
const GROUP_ADJECTIVES = {
  huguenot: "Huguenots", quaker: "Quakers", mayflower: "Mayflower Passengers", methodist: "Methodists",
  puritan: "Puritans", acadian: "Acadians", mennonite: "Mennonites", amish: "Amish", moravian: "Moravians",
  loyalist: "Loyalists", jacobite: "Jacobites", palatine: "Palatines", baptist: "Baptists", pilgrim: "Pilgrims",
};

const OWNER_OF = { i: "my", we: "our", she: "her", he: "his", they: "their" };

const titleCase = (text) => text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

/** "miners" → "Miners", "Mayflower passenger" → "Mayflower Passengers"; null when it may not be a group. */
function groupName(text, { singular = false } = {}) {
  const [head, tail] = String(text || "").trim().split(/\s+of\s+the\s+/i);
  if (tail !== undefined) {
    // "Fellow of the Royal Society" → "Fellows of the Royal Society": the plural is the first part's
    const group = groupName(head, { singular });
    const tailWords = tail.toLowerCase().split(/\s+/);
    if (!group || !tailWords[0] || tailWords.some((word) => NOT_GROUPS.has(word))) return null;
    return `${group} of the ${titleCase(tailWords.join(" "))}`;
  }
  const words = String(text || "").trim().toLowerCase().split(/\s+/);
  if (!words[0] || words.some((word) => NOT_GROUPS.has(word))) return null;
  const last = words[words.length - 1];
  if (!singular && !/[a-z]s$/.test(last)) return null;
  if (singular && /s$/.test(last)) return null;
  const plural = singular ? [...words.slice(0, -1), `${last}s`] : words;
  return titleCase(plural.join(" "));
}

function ownerFrom(subject) {
  const lower = subject.toLowerCase();
  return OWNER_OF[lower] || `${subject}'s`;
}

// (the name as one token, _ for a space and ___ for ", ": "in the Fellows of the Royal Society category" read "of" as a place)
const categoryToken = (category) => category.replace(/,\s*/g, "___").replace(/\s+/g, "_");
const inCategory = (prefix, owner, kin, category) => `${prefix}${owner} ${kin} in the ${categoryToken(category)} category`;

/** The category question for a group-of-people prompt, or the prompt unchanged. */
export function rewriteGroupKin(prompt) {
  const text = String(prompt || "").trim().replace(/[.!?]+$/g, "");
  let match;
  // "which of my ancestors were miners" / "how many of her descendants were Quakers"
  match = text.match(new RegExp(String.raw`^(which|who|how\s+many)\s+of\s+${OWNERS}\s+${KIN}\s+(?:were|was|are|is)\s+(?:an?\s+)?${GROUP}$`, "i"));
  if (match) {
    const category = groupName(match[4]);
    if (category) return inCategory(/^how/i.test(match[1]) ? "how many of " : "", match[2], match[3], category);
  }
  // "my ancestors who were soldiers" / "were any of my ancestors miners"
  match =
    text.match(new RegExp(String.raw`^(?:(?:show|list)\s+(?:me\s+)?)?${OWNERS}\s+${KIN}\s+(?:who|that)\s+(?:were|was|are)\s+(?:an?\s+)?${GROUP}$`, "i")) ||
    text.match(new RegExp(String.raw`^(?:were|are)\s+any\s+of\s+${OWNERS}\s+${KIN}\s+${GROUP}$`, "i"));
  if (match) {
    const category = groupName(match[3]);
    if (category) return inCategory("", match[1], match[2], category);
  }
  // "Mayflower passengers among my relatives"
  match = text.match(new RegExp(String.raw`^(?:any\s+)?${GROUP}\s+(?:among|amongst)\s+${OWNERS}\s+${KIN}$`, "i"));
  if (match) {
    const category = groupName(match[1]);
    if (category) return inCategory("", match[2], match[3], category);
  }
  // "am I descended from a Mayflower passenger" / "is Cook-8721 descended from any Quakers"
  match = text.match(new RegExp(String.raw`^(?:am|are|is)\s+(I|we|she|he|they|[A-Z][A-Za-z'_-]*-\d+)\s+descended\s+from\s+(an?|any)\s+${GROUP}$`, "i"));
  if (match) {
    const category = groupName(match[3], { singular: /^an?$/i.test(match[2]) });
    if (category) return inCategory("", ownerFrom(match[1]), "ancestors", category);
  }
  // "my Huguenot ancestors" / "do I have any Quaker ancestors"
  const adjectives = Object.keys(GROUP_ADJECTIVES).join("|");
  match =
    text.match(new RegExp(String.raw`^(?:(?:show|list)\s+(?:me\s+)?)?${OWNERS}\s+(${adjectives})\s+${KIN}$`, "i")) ||
    text.match(new RegExp(String.raw`^(?:do|does|did)\s+(I|we|she|he|they|[A-Z][A-Za-z'_-]*-\d+)\s+have\s+any\s+(${adjectives})\s+${KIN}$`, "i"));
  if (match) {
    const owner = /^(my|our|his|her|their)$/i.test(match[1]) || /['’]s$/.test(match[1]) ? match[1] : ownerFrom(match[1]);
    return inCategory("", owner, match[3], GROUP_ADJECTIVES[match[2].toLowerCase()]);
  }
  return prompt;
}
