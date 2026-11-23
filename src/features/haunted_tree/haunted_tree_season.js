// Haunted Tree is a Halloween feature, but anyone can keep using it afterwards. Its season is October: whoever has it
// on then finds it switched off once, on their first WikiTree page from 1 November (see seasonal_season.js).
import { seasonSwitch } from "../seasonal_tree/seasonal_season";

export const HALLOWEEN_MARK = "hauntedTree_onAtHalloween";

/** True in October, the Haunted Tree's season. */
export function isHauntedSeason(date = new Date()) {
  return date.getMonth() === 9; // 0-based
}

/**
 * What this page load does, from the feature's switch and the mark: { on } (load it or not), plus markIt (it's on in
 * October: set the mark) or switchOff (Halloween is over: switch it off and remove the mark).
 */
export const halloweenSwitch = seasonSwitch(isHauntedSeason);
