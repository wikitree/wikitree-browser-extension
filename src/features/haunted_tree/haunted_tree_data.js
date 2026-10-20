// What makes a CC7 profile "haunted", worked out from a few getPeople fields (no biographies, which would make
// the scan far heavier). Checked against the live API on 2026-10-19:
// - a missing date is "0000-00-00" with decade "unknown"; a private profile may send only the decade
// - a missing parent is 0, a parent the member isn't allowed to see is null (so null isn't "missing")
// - templates come as [{ name, params }], with the name as written ("unsourced" as often as "Unsourced")
// - Connected is 1 or 0 (getWatchlist sends the same fields as getProfile); a profile the member can't see has none

export const HAUNTED_FIELDS =
  "Id,Name,Derived.LongName,BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,Father,Mother,Templates,Connected,Meta";

export const UNDEAD_YEARS = 110;

/**
 * The groups, in the order the popup shows them. Only "scored" groups count towards how haunted the tree is. The
 * popup shows the meaning and the note; the Watchlist icons' tooltips show just the meaning.
 */
export const GROUPS = [
  {
    key: "undead",
    icon: "🧟",
    title: "The Undead",
    meaning: `Born more than ${UNDEAD_YEARS} years ago, but no death date.`,
    scored: true,
  },
  {
    key: "ghost",
    icon: "👻",
    title: "Ghosts",
    meaning: "No birth or death date at all, not even a decade.",
    scored: true,
  },
  {
    key: "skeleton",
    icon: "💀",
    title: "Skeletons in the closet",
    meaning: "Marked {{Unsourced}}.",
    scored: true,
  },
  {
    key: "headless",
    icon: "🐴",
    title: "Headless Horsemen",
    meaning: "No parents entered.",
    scored: true,
  },
  {
    key: "lonewolf",
    icon: "🐺",
    title: "Lone wolves",
    meaning: "Not connected to the global family tree.",
    scored: true,
  },
  {
    key: "halloween",
    icon: "🦇",
    title: "Halloween folk",
    meaning: "Born or died on 31 October.",
    note: "Not counted in the score.",
    scored: false,
  },
];

const SCORED = new Set(GROUPS.filter((group) => group.scored).map((group) => group.key));

export const GROUP_KEYS = GROUPS.map((group) => group.key);
// What the scans made before Lone wolves were added (2026-10-20) looked for; they have no looksFor
const FIRST_GROUP_KEYS = ["undead", "ghost", "skeleton", "headless", "halloween"];

/**
 * The groups a hunt through this list ("cc7" or "watchlist") looks for, saved with each full scan (as looksFor), so a
 * scan made before a group was added can say so. Everyone in a CC7 is connected to the member, so they're all
 * connected to the global family tree or none are: Lone wolves are only looked for in the watchlist.
 */
export const groupsFor = (source) => GROUP_KEYS.filter((key) => source !== "cc7" || key !== "lonewolf");

/** The scored groups a saved scan of this list didn't look for, because they were added after it was made. */
export function groupsNotLookedFor(record, source) {
  const looked = new Set(record?.looksFor || FIRST_GROUP_KEYS);
  return groupsFor(source).filter((key) => SCORED.has(key) && !looked.has(key));
}

function yearOf(date) {
  const match = /^(\d{4})/.exec(String(date || ""));
  return match && match[1] !== "0000" ? Number(match[1]) : null;
}

function decadeStartOf(decade) {
  const match = /^(\d{4})s$/.exec(String(decade || ""));
  return match ? Number(match[1]) : null;
}

/** True only when the API says there's no date: not when the field is simply missing (a profile we can't see). */
function dateIsMissing(date, decade) {
  if (yearOf(date) !== null || decadeStartOf(decade) !== null) return false;
  return decade === "unknown" || date === "0000-00-00";
}

/** The latest year the person could have been born in, or null. A decade counts as its last year. */
function latestBirthYear(person) {
  const year = yearOf(person.BirthDate);
  if (year !== null) return year;
  const decade = decadeStartOf(person.BirthDateDecade);
  return decade === null ? null : decade + 9;
}

const isZero = (value) => value !== null && value !== undefined && value !== "" && Number(value) === 0;

// WikiTree-N profiles (WikiTree-11, say) are accounts for WikiTree's projects, not people
export const isProjectAccount = (person) => /^WikiTree-\d+$/i.test(String(person?.Name || "").trim());

/** The keys of the groups a getPeople person falls into (empty if none), out of those given. */
export function hauntedGroups(person, thisYear = new Date().getFullYear(), keys = GROUP_KEYS) {
  if (isProjectAccount(person)) return [];
  const groups = [];
  const born = latestBirthYear(person);
  const noDeath = dateIsMissing(person.DeathDate, person.DeathDateDecade);
  if (born !== null && thisYear - born >= UNDEAD_YEARS && noDeath) groups.push("undead");
  if (noDeath && dateIsMissing(person.BirthDate, person.BirthDateDecade)) groups.push("ghost");
  if (Array.isArray(person.Templates) && person.Templates.some((t) => /^\s*unsourced\s*$/i.test(t?.name || ""))) {
    groups.push("skeleton");
  }
  if (isZero(person.Father) && isZero(person.Mother)) groups.push("headless");
  if (isZero(person.Connected)) groups.push("lonewolf");
  if (/-10-31$/.test(person.BirthDate || "") || /-10-31$/.test(person.DeathDate || "")) groups.push("halloween");
  return groups.filter((key) => keys.includes(key));
}

export const isScored = (groups) => (groups || []).some((key) => SCORED.has(key));

function lifeYear(date, decade) {
  return yearOf(date) ?? (decadeStartOf(decade) !== null ? decade : "");
}

/** What we keep of a person: enough to list and link them. */
export function slimPerson(person, groups, degrees) {
  const born = lifeYear(person.BirthDate, person.BirthDateDecade);
  const died = lifeYear(person.DeathDate, person.DeathDateDecade);
  return {
    Id: person.Id,
    Name: person.Name,
    LongName: person.LongName || "",
    years: born || died ? `${born || "?"}–${died || "?"}` : "",
    Degrees: degrees ?? person.Meta?.Degrees ?? person.Degrees ?? null,
    groups,
  };
}

/** The haunted people from a full scan, slimmed. `keys` are the groups looked for (see groupsFor). */
export function hauntedFromScan(scanned, thisYear, keys) {
  const people = [];
  for (const person of scanned) {
    const groups = hauntedGroups(person, thisYear, keys);
    if (groups.length) people.push(slimPerson(person, groups));
  }
  return people;
}

/** People who were in a scored group before and aren't now, given the fresh profiles by Id. */
function newlyRested(previous, freshById, thisYear, keys) {
  const rested = [];
  for (const before of previous) {
    if (!isScored(before.groups)) continue;
    const fresh = freshById.get(String(before.Id));
    if (fresh && !isScored(hauntedGroups(fresh, thisYear, keys)))
      rested.push(slimPerson(fresh, before.groups, before.Degrees));
  }
  return rested;
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
 * Re-check: the stored haunted people against fresh getPeople results for just their Ids. Anyone not sent back
 * (deleted) is dropped. Returns { people, rested }.
 */
export function recheckHaunted(previous, fresh, thisYear, keys) {
  const freshById = byIdOf(fresh);
  const people = [];
  const seen = new Set();
  for (const before of previous) {
    const person = freshById.get(String(before.Id));
    if (!person || seen.has(String(person.Id))) continue;
    seen.add(String(person.Id));
    const groups = hauntedGroups(person, thisYear, keys);
    if (groups.length) people.push(slimPerson(person, groups, before.Degrees));
  }
  return { people, rested: newlyRested(previous, freshById, thisYear, keys) };
}

/** Full rescan: the new haunted list, and who from the old one has been put right. Returns { people, rested }. */
export function rescanHaunted(previous, scanned, thisYear, keys) {
  return {
    people: hauntedFromScan(scanned, thisYear, keys),
    rested: newlyRested(previous, byIdOf(scanned), thisYear, keys),
  };
}

/** The laid-to-rest list: old and new, once each, leaving out anyone who is haunted again. */
export function mergeLaidToRest(before, rested, people) {
  const hauntedAgain = new Set(people.filter((p) => isScored(p.groups)).map((p) => String(p.Id)));
  const merged = new Map();
  for (const person of [...before, ...rested]) {
    if (!hauntedAgain.has(String(person.Id))) merged.set(String(person.Id), person);
  }
  return [...merged.values()];
}

/** Closest relatives first, then by name. */
export function sortPeople(people) {
  const name = (p) => p.LongName || p.Name || "";
  return [...people].sort((a, b) => (a.Degrees ?? 99) - (b.Degrees ?? 99) || name(a).localeCompare(name(b)));
}

/**
 * The people who are haunted only because of these groups: in at least one of them, and in no other scored group.
 * (Those a newly added group put into the score.)
 */
export function hauntedOnlyBy(people, keys) {
  return people.filter(
    (person) =>
      person.groups.some((key) => keys.includes(key)) &&
      !person.groups.some((key) => SCORED.has(key) && !keys.includes(key))
  );
}

/** { counts: { groupKey: n }, haunted: n in a scored group, percent: "3.2" } */
export function summarize(people, total) {
  const counts = Object.fromEntries(GROUPS.map((group) => [group.key, 0]));
  let haunted = 0;
  for (const person of people) {
    for (const key of person.groups) counts[key] = (counts[key] || 0) + 1;
    if (isScored(person.groups)) haunted++;
  }
  const share = total ? (100 * haunted) / total : 0;
  const percent = share > 0 && share < 1 ? share.toFixed(1) : String(Math.round(share));
  return { counts, haunted, percent };
}

/** The WikiTree ID a profile link points to ("/wiki/Teece-273" gives "Teece-273"), or null if it isn't one. */
export function wikiTreeIdFromHref(href) {
  const match = /^(?:https:\/\/www\.wikitree\.com)?\/wiki\/([^/:?#]+-\d+)$/.exec(String(href || ""));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    return match[1];
  }
}

/** A WikiTree ID in one form, so a link's ID and the API's Name can be matched. */
export const wikiTreeIdKey = (id) =>
  String(id || "")
    .replace(/ /g, "_")
    .toLowerCase();

/**
 * A whole list read a page at a time: getPage(offset) gives { people, total }, and after the first page, three are
 * read at once. Anyone in two pages (the list changed while it was read) is kept once. onProgress(read, total).
 */
export async function readAllPages(getPage, pageSize, onProgress = () => {}) {
  const first = await getPage(0);
  const pages = [first.people];
  let read = first.people.length;
  onProgress(read, first.total);
  const offsets = [];
  if (first.people.length >= pageSize) {
    for (let offset = pageSize; offset < first.total; offset += pageSize) offsets.push(offset);
  }
  let next = 0;
  const reader = async () => {
    while (next < offsets.length) {
      const index = next++;
      const { people } = await getPage(offsets[index]);
      pages[index + 1] = people;
      read += people.length;
      onProgress(read, first.total);
    }
  };
  await Promise.all([reader(), reader(), reader()]);
  const byId = new Map();
  for (const person of pages.flat()) byId.set(String(person.Id), person);
  return [...byId.values()];
}
