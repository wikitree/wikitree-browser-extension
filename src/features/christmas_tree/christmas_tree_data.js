// Christmas Tree's data: which profiles need help (Haunted Tree's checks, with Christmas names), the tree's rows, and
// the Advent doors. No API calls or page code here, so it's all unit-tested (christmas_tree_data.test.js).
//
// A full scan keeps:
// - rows: { rowKey: total } for everyone scanned, so the tree can show how much of each row is lit;
// - people: only those who need help or are Christmas folk, slimmed (slimChristmas), each with their row.
// A row's dark baubles come from people, so a Re-check (which reads just those people again) relights the tree.
import { HAUNTED_FIELDS, hauntedGroups, isProjectAccount, slimPerson } from "../haunted_tree/haunted_tree_data";

// Manager: so doors can offer profiles the member manages first
export const CHRISTMAS_FIELDS = `${HAUNTED_FIELDS},Manager`;

/**
 * The groups, in the order the popup shows them. The keys are Haunted Tree's, so its checks (hauntedGroups) are used
 * as they are. jobRank orders doors' jobs, quickest first. Only "scored" groups make a bauble dark.
 */
export const GROUPS = [
  {
    key: "ghost",
    icon: "❄️",
    title: "Lost in the snow",
    meaning: "No birth or death date at all, not even a decade.",
    job: "Add a date: even a decade or an 'about' year helps.",
    jobRank: 1,
    scored: true,
  },
  {
    key: "undead",
    icon: "🕯️",
    title: "Left out in the cold",
    meaning: "Born more than 110 years ago, but no death date.",
    job: "Find when they died, and add the date.",
    jobRank: 2,
    scored: true,
  },
  {
    key: "skeleton",
    icon: "🪨",
    title: "Lumps of coal",
    one: "A lump of coal", // for one person (a door, a tooltip)
    meaning: "Marked {{Unsourced}}.",
    job: "Add a source, then take away the {{Unsourced}} template.",
    notYet: "Sources alone don't count: take the {{Unsourced}} template out of the biography too.",
    jobRank: 3,
    scored: true,
  },
  {
    key: "headless",
    icon: "🪑",
    title: "Empty chairs at the table",
    one: "An empty chair at the table", // for one person (a door, a tooltip)
    meaning: "No parents entered.",
    job: "Add a parent.",
    jobRank: 4,
    scored: true,
  },
  {
    key: "lonewolf",
    icon: "🛷",
    title: "Not home for Christmas",
    meaning: "Not connected to the global family tree.",
    job: "Connect them to the global family tree.",
    jobRank: 5,
    scored: true,
  },
  {
    key: "christmas",
    icon: "🎄",
    title: "Christmas folk",
    meaning: "Born or died on 25 December.",
    scored: false,
  },
];

export const GROUP_BY_KEY = Object.fromEntries(GROUPS.map((group) => [group.key, group]));
const SCORED = new Set(GROUPS.filter((group) => group.scored).map((group) => group.key));

/** The groups looked for in a list: as Haunted Tree, everyone in a CC7 is connected, so no Lone wolves there. */
export const groupsFor = (source) =>
  GROUPS.map((group) => group.key).filter((k) => source !== "cc7" || k !== "lonewolf");

export const needsHelp = (groups) => (groups || []).some((key) => SCORED.has(key));

const isChristmasDay = (date) => /^\d{4}-12-25$/.test(String(date || ""));

/** The keys of the groups a getPeople person falls into (empty if none) for this list ("cc7" or "watchlist"). */
export function christmasGroups(person, thisYear, source = "cc7") {
  if (isProjectAccount(person)) return [];
  const keys = groupsFor(source);
  const groups = hauntedGroups(person, thisYear, keys);
  if (isChristmasDay(person.BirthDate) || isChristmasDay(person.DeathDate)) groups.push("christmas");
  return groups;
}

// --- The tree's rows ---------------------------------------------------------------------------------------------

export const UNDATED_ROW = "undated";
export const EARLY_ROW = "early"; // the watchlist's "Before 1500"
const EARLY_CENTURY = 1500;

function birthYear(person) {
  const year = /^(\d{4})/.exec(String(person.BirthDate || ""));
  if (year && year[1] !== "0000") return Number(year[1]);
  const decade = /^(\d{4})s$/.exec(String(person.BirthDateDecade || ""));
  return decade ? Number(decade[1]) : null;
}

/**
 * The row a person is on. CC7: their degree, 1 to 7 (as a string). Watchlist: the century they were born in ("1800"),
 * "early" before 1500, or "undated".
 */
export function rowOf(person, source = "cc7") {
  if (source === "cc7") {
    const degrees = Number(person.Meta?.Degrees ?? person.Degrees);
    return degrees >= 1 ? String(Math.min(degrees, 7)) : UNDATED_ROW;
  }
  const year = birthYear(person);
  if (year === null) return UNDATED_ROW;
  if (year < EARLY_CENTURY) return EARLY_ROW;
  return String(Math.floor(year / 100) * 100);
}

/**
 * The rows that have anyone on them, top of the tree first. CC7: degree 1 at the top. Watchlist: the newest century
 * at the top and the oldest at the bottom (the roots), with undated people at the very top, as the smallest row.
 */
export function rowOrder(rows, source = "cc7") {
  const keys = Object.keys(rows || {}).filter((key) => rows[key] > 0);
  const rank = (key) => {
    if (key === UNDATED_ROW) return source === "cc7" ? 99 : -Infinity;
    if (key === EARLY_ROW) return Infinity;
    return source === "cc7" ? Number(key) : -Number(key);
  };
  return keys.sort((a, b) => rank(a) - rank(b));
}

/** What a row is called: "Degree 3", "1800s", "Before 1500", "Undated". */
export function rowLabel(key, source = "cc7") {
  if (key === UNDATED_ROW) return source === "cc7" ? "Other relatives" : "Undated";
  if (key === EARLY_ROW) return "Before 1500";
  return source === "cc7" ? `Degree ${key}` : `${key}s`;
}

// --- Scans -------------------------------------------------------------------------------------------------------

/** For Christmas folk: "born", "died" or "both" (on 25 December); otherwise null. */
export function christmasDay(person) {
  const born = isChristmasDay(person.BirthDate);
  const died = isChristmasDay(person.DeathDate);
  return born && died ? "both" : born ? "born" : died ? "died" : null;
}

/**
 * What we keep of a person: Haunted Tree's slim person, plus their row, whether the member manages them, and (for
 * Christmas folk) whether they were born or died on Christmas Day.
 */
export function slimChristmas(person, groups, source, memberId, degrees) {
  return {
    ...slimPerson(person, groups, degrees),
    row: rowOf(person, source),
    managed: memberId != null && person.Manager != null && String(person.Manager) === String(memberId),
    christmasDay: christmasDay(person),
  };
}

/** A full scan: { rows: { rowKey: total }, people: those who need help or are Christmas folk }. */
export function christmasFromScan(scanned, thisYear, source, memberId) {
  const rows = {};
  const people = [];
  for (const person of scanned) {
    if (isProjectAccount(person)) continue;
    const row = rowOf(person, source);
    rows[row] = (rows[row] || 0) + 1;
    const groups = christmasGroups(person, thisYear, source);
    if (groups.length) people.push(slimChristmas(person, groups, source, memberId));
  }
  return { rows, people };
}

function byIdOf(people) {
  const byId = new Map();
  for (const person of people) {
    byId.set(String(person.Id), person);
    // A merged-away profile comes back as the one it was merged into
    if (person.redirectedFrom) byId.set(String(person.redirectedFrom), person);
  }
  return byId;
}

/**
 * Re-check: the kept people against fresh getPeople results for just their Ids. Returns { people, fixed }: people as
 * they are now (anyone put right and not Christmas folk drops out; anyone not sent back is kept as they were), and
 * fixed, the Ids of those who needed help before and don't now. Rows keep the rows they were on.
 */
export function recheckChristmas(previous, fresh, thisYear, source, memberId) {
  const freshById = byIdOf(fresh);
  const people = [];
  const fixed = [];
  const seen = new Set();
  for (const before of previous) {
    const person = freshById.get(String(before.Id));
    if (!person) {
      people.push(before);
      continue;
    }
    if (seen.has(String(person.Id))) continue;
    seen.add(String(person.Id));
    const groups = christmasGroups(person, thisYear, source);
    if (needsHelp(before.groups) && !needsHelp(groups)) fixed.push(String(before.Id));
    if (groups.length)
      people.push({ ...slimChristmas(person, groups, source, memberId, before.Degrees), row: before.row });
  }
  return { people, fixed };
}

/**
 * Each row's totals for drawing the tree: [{ key, label, total, dark, lit }], top of the tree first. A row can't
 * have more dark people than it has people (a scan made before someone joined the list).
 */
export function treeRows(rows, people, source = "cc7") {
  const dark = {};
  for (const person of people) if (needsHelp(person.groups)) dark[person.row] = (dark[person.row] || 0) + 1;
  return rowOrder(rows, source).map((key) => {
    const total = rows[key];
    const rowDark = Math.min(dark[key] || 0, total);
    return { key, label: rowLabel(key, source), total, dark: rowDark, lit: total - rowDark };
  });
}

/**
 * How many of a row's baubles are lit, out of `baubles`, for `lit` of `total` people. Rounded, but a row with anyone
 * who needs help always has a dark bauble, and a row with anyone in good shape always has a lit one.
 */
export function litBaubles(lit, total, baubles) {
  if (!total || !baubles) return 0;
  if (lit >= total) return baubles;
  if (lit <= 0) return 0;
  const share = Math.round((baubles * lit) / total);
  return Math.min(baubles - 1, Math.max(1, share));
}

/** { counts: { groupKey: n }, dark: n who need help, total, percentLit: "96" } */
export function summarize(rows, people) {
  const counts = Object.fromEntries(GROUPS.map((group) => [group.key, 0]));
  let dark = 0;
  for (const person of people) {
    for (const key of person.groups) counts[key] = (counts[key] || 0) + 1;
    if (needsHelp(person.groups)) dark++;
  }
  const total = Object.values(rows || {}).reduce((sum, n) => sum + n, 0);
  const share = total ? (100 * (total - Math.min(dark, total))) / total : 0;
  const percentLit = share > 99 && share < 100 ? share.toFixed(1) : String(Math.floor(share));
  return { counts, dark, total, percentLit };
}
