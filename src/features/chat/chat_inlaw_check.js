// "Check my in-laws" (the user, 2026-10-18, after a Discord tip: "when you add people to your tree, look for the
// in-laws and the ancestors of them in the database ... I could shorten connection eg. from 30 to 12"). Genie takes
// the people who married into the family (within a few degrees) and have a parent missing on WikiTree, and for each
// one runs "Check for profiles": the parents and siblings their biography names, searched for on WikiTree, and a
// duplicate check (a duplicate with parents attached would connect a whole branch in one merge).

const OWNER = String.raw`(my|our|his|her|their|the|this\s+person['’]s|[A-Z][A-Za-z'_-]*-\d+['’]s)`;
const IN_LAWS = String.raw`(?:in-?laws|in\s+laws)`;
// "my cousins' spouses", "the family's husbands and wives"
const KIN_SPOUSES = String.raw`(?:(?:cousins|relatives|relations|family|family['’]s|siblings|children|kids|aunts\s+and\s+uncles)['’]?\s+(?:spouses|husbands\s+and\s+wives|wives\s+and\s+husbands|partners|in-?laws))`;
const GROUP = String.raw`(?:${IN_LAWS}|${KIN_SPOUSES})`;
const ON_WT = String.raw`(?:\s+(?:on|in)\s+wikitree|\s+for\s+(?:profiles|families|parents))?`;
const DEGREES = String.raw`(?:\s+(?:within|to)\s+(\d{1,2})\s+degrees?)?`;
const FAMILIES = String.raw`(?:families|family|parents|ancestors|relatives)`;

const PATTERNS = [
  // "check my in-laws", "check the in-laws for profiles", "check my cousins' spouses on WikiTree"
  new RegExp(String.raw`^(?:check|search|look\s+(?:at|for))\s+${OWNER}\s+${GROUP}${ON_WT}${DEGREES}$`, "i"),
  // "check for profiles for my in-laws", "check for in-laws"
  new RegExp(String.raw`^check\s+for\s+(?:profiles\s+(?:for|of)\s+)?${OWNER}?\s*${GROUP}${ON_WT}${DEGREES}$`, "i"),
  // "find my in-laws' families on WikiTree", "are the in-laws' parents on WikiTree"
  new RegExp(String.raw`^(?:find|search\s+for|look\s+for|are)\s+${OWNER}\s+${GROUP}['’]?\s+${FAMILIES}(?:\s+(?:on|in)\s+wikitree)?${DEGREES}$`, "i"),
];

export const IN_LAW_DEGREES = { min: 2, max: 7, default: 5 };
export const IN_LAW_MOST = 15;

/** {owner: "my" | "her" | "the" | "Cook-8721's", degrees} or null. */
export function parseInLawCheckPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = (match[1] || "the").replace(/^this\s+person['’]s$/i, "the");
    const asked = Number(match[2]);
    const degrees = asked ? Math.max(IN_LAW_DEGREES.min, Math.min(IN_LAW_DEGREES.max, asked)) : IN_LAW_DEGREES.default;
    return { owner, degrees };
  }
  return null;
}

const idOf = (value) => String(Number(value) || "");

/** A Spouses field (a list, or an object keyed by Id) as spouse Ids, without the marriages marked not to show. */
function spouseIds(spouses) {
  const entries = Array.isArray(spouses) ? spouses.map((spouse) => [spouse?.Id, spouse]) : Object.entries(spouses || {});
  return entries
    .filter(([, spouse]) => !(spouse && (spouse.do_not_display === "1" || spouse.DoNotDisplay === "1")))
    .map(([key, spouse]) => idOf(spouse?.Id ?? key))
    .filter(Boolean);
}

/**
 * The family's blood relatives (the root's ancestors and their descendants) and the people married to them who
 * aren't. `people`: getPeople profiles with Father, Mother, Spouses and Meta.Degrees.
 * Returns {blood: Set(Id), inLaws: [{id, partnerId, partnerDegrees}]}, nearest partner first.
 */
export function familyInLaws(people, rootId) {
  const byId = new Map();
  for (const person of people || []) if (idOf(person?.Id)) byId.set(idOf(person.Id), person);
  const children = new Map();
  for (const [id, person] of byId) {
    for (const parent of [idOf(person.Father), idOf(person.Mother)]) {
      if (!parent) continue;
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(id);
    }
  }
  // Blood: the root's ancestors and everyone descended from them (up first, then only down, so a nephew's
  // mother, who married in, isn't reached through him).
  const root = idOf(rootId);
  const ancestors = new Set(byId.has(root) ? [root] : []);
  const up = [...ancestors];
  while (up.length) {
    const person = byId.get(up.shift());
    for (const parent of [idOf(person?.Father), idOf(person?.Mother)]) {
      if (parent && byId.has(parent) && !ancestors.has(parent)) {
        ancestors.add(parent);
        up.push(parent);
      }
    }
  }
  const blood = new Set(ancestors);
  const down = [...ancestors];
  while (down.length) {
    for (const child of children.get(down.shift()) || []) {
      if (!blood.has(child)) {
        blood.add(child);
        down.push(child);
      }
    }
  }
  const seen = new Map();
  for (const id of blood) {
    const partnerDegrees = Number(byId.get(id)?.Meta?.Degrees) || 0;
    for (const spouse of spouseIds(byId.get(id)?.Spouses)) {
      if (blood.has(spouse)) continue;
      const known = seen.get(spouse);
      if (!known || partnerDegrees < known.partnerDegrees) seen.set(spouse, { id: spouse, partnerId: id, partnerDegrees });
    }
  }
  const inLaws = [...seen.values()].sort((a, b) => a.partnerDegrees - b.partnerDegrees || Number(a.id) - Number(b.id));
  return { blood, inLaws };
}

/** "father", "mother", "parents", or "" when both parents are on WikiTree. */
export function missingParents(person) {
  const father = Boolean(idOf(person?.Father));
  const mother = Boolean(idOf(person?.Mother));
  if (father && mother) return "";
  if (!father && !mother) return "parents";
  return father ? "mother" : "father";
}

/** The in-laws worth checking: a parent missing, both missing first, then the nearest. */
export function inLawsToCheck(inLaws, profilesById, most = IN_LAW_MOST) {
  const withGap = inLaws
    .map((entry) => ({ ...entry, profile: profilesById.get(entry.id), missing: missingParents(profilesById.get(entry.id)) }))
    .filter((entry) => entry.profile?.Name && entry.missing);
  withGap.sort((a, b) => (a.missing === "parents" ? 0 : 1) - (b.missing === "parents" ? 0 : 1) || a.partnerDegrees - b.partnerDegrees);
  return { picked: withGap.slice(0, most), total: withGap.length };
}

const peopleCount = (count) => `${count} ${count === 1 ? "person" : "people"}`;

/**
 * The summary. `checked`: [{label, partnerLabel, missing, found: [{relative, matches: ["Jones-45 (82%)"]}],
 * duplicates: ["Jones-99 (78%)"], failed, noBio, nothingNamed}]; `whose`: "your" | "Bob Smith's".
 */
export function buildInLawCheckMessage(checked, { whose, degrees, inLawCount, gapCount, capped }) {
  const lines = [
    `${whose === "your" ? "Your" : whose} family within ${degrees} degrees has ${peopleCount(inLawCount)} married into it; ${
      gapCount === inLawCount ? "all" : gapCount
    } of them ${gapCount === 1 ? "has" : "have"} a parent missing on WikiTree. I checked ${capped ? `the ${checked.length} nearest` : checked.length === 1 ? "that one" : `those ${checked.length}`}: the parents and siblings each biography names, searched for on WikiTree, and possible duplicates.`,
  ];
  const leads = checked.filter((entry) => entry.found.length || entry.duplicates.length);
  if (leads.length) {
    lines.push("", `**Worth a look (${leads.length}):**`);
    for (const entry of leads) {
      lines.push("", `**${entry.label}**, married to ${entry.partnerLabel} (no ${entry.missing} on WikiTree)`);
      for (const item of entry.found) lines.push(`- ${item.relative}: may be ${item.matches.join(", ")}`);
      if (entry.duplicates.length) lines.push(`- Possible duplicate${entry.duplicates.length === 1 ? "" : "s"}: ${entry.duplicates.join(", ")}`);
    }
  }
  const failed = checked.filter((entry) => entry.failed);
  const quiet = checked.filter((entry) => !entry.failed && !entry.found.length && !entry.duplicates.length);
  const named = quiet.filter((entry) => !entry.noBio && !entry.nothingNamed);
  const unnamed = quiet.filter((entry) => entry.noBio || entry.nothingNamed);
  if (named.length) lines.push("", `**No matches found:** ${named.map((entry) => entry.label).join("; ")}`);
  if (unnamed.length) lines.push("", `**No parents or siblings named in the biography:** ${unnamed.map((entry) => entry.label).join("; ")}`);
  if (failed.length) lines.push("", `**Couldn't check:** ${failed.map((entry) => entry.label).join("; ")}`);
  if (!leads.length && checked.length) lines.push("", "Nothing to follow up this time.");
  if (leads.length) {
    lines.push(
      "",
      "Open a profile and ask Genie to \"Check for profiles\" to see the reasons for each match. These are suggestions: check them before connecting anyone. Connecting an in-law's parents can shorten connection paths a lot."
    );
  }
  if (capped) lines.push("", `${capped} more ${capped === 1 ? "person" : "people"} with a parent missing weren't checked. Ask again within fewer degrees, or open their profiles one by one.`);
  return lines.join("\n");
}
