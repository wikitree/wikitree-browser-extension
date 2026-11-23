// Christmas Tree's Advent doors, 1 to 24, plus a big door 25 for Christmas Day. Each door, once opened, holds one
// person who needs help and one job (a group key from christmas_tree_data.js), and is kept with the member's saved scan,
// so it holds the same person each time. Door 25 is a present instead, when there's a Christmas folk relative to give.
// A door is done when a Re-check shows its job is no longer needed. No API calls or page code here (tested in
// christmas_tree_doors.test.js).
//
// A door: { door, Id, Name, LongName, years, Degrees, job, swapped, swappedFrom, done }. job "folk" is a Christmas folk
// relative, given when nobody is left who needs help; job "empty" (Id null) means there was nobody at all to give. Both
// are done once opened.
import { GROUP_BY_KEY, needsHelp } from "./christmas_tree_data";
import { slimPerson } from "../haunted_tree/haunted_tree_data";

export const DOOR_COUNT = 25;
export const CHRISTMAS_DOOR = 25;
export const FOLK_JOB = "folk";
export const EMPTY_JOB = "empty";

const DECEMBER = 11; // 0-based months
const NOVEMBER = 10;

/**
 * The season a date belongs to: December's year (January 2027 is in season 2026). November counts as the coming
 * season, so a tree lit before the doors open is still there on 1 December.
 */
export function seasonOf(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= NOVEMBER ? year : year - 1;
}

/**
 * How many doors can be opened on this date: in December, one more each day up to 25; after Christmas (and for the
 * rest of the year, for anyone who keeps it on), all 25 of last season's; in November, none yet.
 */
export function openDoorCount(date = new Date()) {
  const month = date.getMonth();
  if (month === DECEMBER) return Math.min(date.getDate(), DOOR_COUNT);
  if (month === NOVEMBER) return 0;
  return DOOR_COUNT;
}

/** The quickest job for these groups (the scored group with the lowest jobRank), or null. */
export function jobFor(groups) {
  let best = null;
  for (const key of groups || []) {
    const group = GROUP_BY_KEY[key];
    if (!group?.scored) continue;
    if (!best || group.jobRank < GROUP_BY_KEY[best].jobRank) best = key;
  }
  return best;
}

/** The Ids already given to a door, including anyone swapped out of one. */
function usedIds(doors) {
  const used = new Set();
  for (const door of doors || []) {
    if (door.Id != null) used.add(String(door.Id));
    if (door.swappedFrom != null) used.add(String(door.swappedFrom));
  }
  return used;
}

const nameOf = (person) => person.LongName || person.Name || "";

/** A fixed shuffle: the same number for the same Id every time, but no alphabetical (or Id) order. */
const shuffleKey = (person) => Math.imul(Number(person.Id) || 0, 2654435761) >>> 0;

/**
 * Who goes behind the next door, from the kept people. The jobs take turns, so the doors aren't all the same: the job
 * given least so far (quickest first, on a tie), among the jobs someone still needs. Within that job, closest relatives
 * first, then those the member manages, then a fixed shuffle (not by name, or the watchlist's doors would all be
 * Aarons and Abrahams). Someone who needs more than one kind of help can be given any of
 * them. Nobody is given twice. When nobody is left who needs help, a Christmas folk relative instead. With
 * `folkFirst` (the Christmas Day door), a Christmas folk relative if there is one: a present, not a job.
 * Returns { person, job } or null.
 */
export function pickForDoor(people, doors, { folkFirst = false } = {}) {
  const used = usedIds(doors);
  const unused = (people || []).filter((person) => !used.has(String(person.Id)));
  const folk = unused
    .filter((person) => (person.groups || []).includes("christmas"))
    .sort((a, b) => (a.Degrees ?? 99) - (b.Degrees ?? 99) || nameOf(a).localeCompare(nameOf(b)));
  if (folkFirst && folk.length) return { person: folk[0], job: FOLK_JOB };

  const given = {};
  for (const door of doors || []) if (door.job) given[door.job] = (given[door.job] || 0) + 1;
  const jobs = new Set();
  for (const person of unused) for (const key of person.groups || []) if (GROUP_BY_KEY[key]?.scored) jobs.add(key);
  if (jobs.size) {
    const job = [...jobs].sort(
      (a, b) => (given[a] || 0) - (given[b] || 0) || GROUP_BY_KEY[a].jobRank - GROUP_BY_KEY[b].jobRank
    )[0];
    const person = unused
      .filter((p) => p.groups.includes(job))
      .sort(
        (a, b) =>
          (a.Degrees ?? 99) - (b.Degrees ?? 99) ||
          Number(Boolean(b.managed)) - Number(Boolean(a.managed)) ||
          shuffleKey(a) - shuffleKey(b)
      )[0];
    return { person, job };
  }
  return folk.length ? { person: folk[0], job: FOLK_JOB } : null;
}

function makeDoor(number, pick, extra = {}) {
  if (!pick) {
    const empty = { Id: null, Name: "", LongName: "", years: "", Degrees: null, job: EMPTY_JOB, swapped: false };
    return { door: number, ...empty, swappedFrom: null, done: true };
  }
  const { person, job } = pick;
  return {
    door: number,
    Id: person.Id,
    Name: person.Name,
    LongName: person.LongName || "",
    years: person.years || "",
    Degrees: person.Degrees ?? null,
    job,
    swapped: false,
    swappedFrom: null,
    done: job === FOLK_JOB,
    ...extra,
  };
}

const byNumber = (doors) => [...doors].sort((a, b) => a.door - b.door);

/**
 * Open door `number` (if it can be opened on this date). Returns { doors, door }: the doors with this one added if it
 * was new, and the door (null if it can't be opened yet). With nobody left to put behind it, the door is an "empty"
 * one. Opening a door that's already open just gives it back.
 */
export function openDoor(doors, number, people, date = new Date()) {
  const current = doors || [];
  if (number < 1 || number > openDoorCount(date)) return { doors: current, door: null };
  const existing = current.find((door) => door.door === number);
  if (existing) return { doors: current, door: existing };
  const door = makeDoor(number, pickForDoor(people, current, { folkFirst: number === CHRISTMAS_DOOR }));
  return { doors: byNumber([...current, door]), door };
}

/** True if this door can still be swapped: open, not done, not a Christmas folk door, and not swapped before. */
export const canSwap = (door) => Boolean(door) && !door.swapped && !door.done && door.Id != null;

/**
 * Swap the person behind door `number` for the next one (once per door). The person swapped out isn't given to
 * another door. Returns { doors, door }; unchanged if it can't be swapped or there's nobody else.
 */
export function swapDoor(doors, number, people) {
  const current = doors || [];
  const old = current.find((door) => door.door === number);
  if (!canSwap(old)) return { doors: current, door: old || null };
  const pick = pickForDoor(people, current);
  if (!pick || pick.job === FOLK_JOB) return { doors: current, door: old };
  const door = makeDoor(number, pick, { swapped: true, swappedFrom: old.Id });
  return { doors: byNumber(current.map((d) => (d.door === number ? door : d))), door };
}

/**
 * The doors after a Re-check or rescan, given the kept people as they are now: a door is done once its person no
 * longer has its job's group. Someone no longer kept at all has been put right (the kept people are only those who
 * need help, plus Christmas folk). Doors already done stay done.
 */
export function checkDoors(doors, people, fresh = []) {
  const byId = new Map((people || []).map((person) => [String(person.Id), person]));
  // Profiles just read from WikiTree (full API records), for the name and years of someone no longer kept
  const freshById = new Map((fresh || []).map((person) => [String(person.Id), slimPerson(person, [])]));
  return (doors || []).map((door) => {
    const person = byId.get(String(door.Id));
    const now = person || freshById.get(String(door.Id));
    // The name and years as WikiTree has them now (the member may have just put them right)
    const named =
      now && door.Id != null
        ? {
            ...door,
            Name: now.Name || door.Name,
            LongName: now.LongName || door.LongName,
            years: now.years ?? door.years,
          }
        : door;
    if (door.done) return named;
    const done = !person || !(person.groups || []).includes(door.job);
    return done ? { ...named, done: true } : named;
  });
}

/** The star on top lights when every door that can be opened today has been opened and done. */
export function starLit(doors, date = new Date()) {
  const count = openDoorCount(date);
  if (!count) return false;
  const done = new Set((doors || []).filter((door) => door.done).map((door) => door.door));
  for (let number = 1; number <= count; number++) if (!done.has(number)) return false;
  return true;
}
