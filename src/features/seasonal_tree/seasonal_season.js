// A seasonal tree is on the Options page all year (off by default). Whoever has it on during its season finds it
// switched off once, on their first WikiTree page after the season (their local time). If they switch it back on, it
// stays on until the next season is over.
//
// The once: a mark in chrome.storage.sync (so every browser the member uses agrees) says it was on during the season.
// Switching it off removes the mark, so a member who switches it back on isn't switched off again.

/**
 * A function ({ enabled, marked }, date) => what this page load does: { on } (load it or not), plus markIt (it's on
 * in season: set the mark) or switchOff (the season is over: switch it off and remove the mark).
 * isInSeason(date) says whether a date is in the tree's season.
 */
export function seasonSwitch(isInSeason) {
  return ({ enabled, marked }, date = new Date()) => {
    if (isInSeason(date)) return { on: enabled, markIt: enabled && !marked };
    if (marked) return { on: false, switchOff: true };
    return { on: enabled };
  };
}
