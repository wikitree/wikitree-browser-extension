// Christmas Tree's season is 1 December to 7 January (Orthodox Christmas, after Twelfth Night), in the member's local
// time. Whoever has it on then finds it switched off once, on their first WikiTree page from 8 January (see
// seasonal_season.js); anyone can switch it back on.
import { seasonSwitch } from "../seasonal_tree/seasonal_season";

export const CHRISTMAS_MARK = "christmasTree_onAtChristmas";

const DECEMBER = 11; // 0-based months
const JANUARY = 0;
const ORTHODOX_CHRISTMAS = 7; // 25 December in the Julian calendar

/** True from 1 December to 7 January. */
export function isChristmasSeason(date = new Date()) {
  const month = date.getMonth();
  return month === DECEMBER || (month === JANUARY && date.getDate() <= ORTHODOX_CHRISTMAS);
}

/**
 * What this page load does, from the feature's switch and the mark: { on } (load it or not), plus markIt (it's on in
 * the season: set the mark) or switchOff (Orthodox Christmas is over: switch it off and remove the mark).
 */
export const christmasSwitch = seasonSwitch(isChristmasSeason);
