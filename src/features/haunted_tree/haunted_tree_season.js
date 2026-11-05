// Haunted Tree is a Halloween feature, but anyone can keep using it afterwards. It's on the Options page all year (off
// by default). Whoever has it on in October finds it switched off once, on their first WikiTree page from 1 November
// (their local time). If they switch it back on, it stays on until the next Halloween is over.
//
// The once: a mark in chrome.storage.sync (so every browser the member uses agrees) says it was on in October.
// Switching it off removes the mark, so a member who switches it back on isn't switched off again.

export const HALLOWEEN_MARK = "hauntedTree_onAtHalloween";

/** True in October, the Haunted Tree's season. */
export function isHauntedSeason(date = new Date()) {
  return date.getMonth() === 9; // 0-based
}

/**
 * What this page load does, from the feature's switch and the mark: { on } (load it or not), plus markIt (it's on in
 * October: set the mark) or switchOff (Halloween is over: switch it off and remove the mark).
 */
export function halloweenSwitch({ enabled, marked }, date = new Date()) {
  if (isHauntedSeason(date)) return { on: enabled, markIt: enabled && !marked };
  if (marked) return { on: false, switchOff: true };
  return { on: enabled };
}
