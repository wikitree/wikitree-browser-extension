// Haunted Tree is a Halloween feature: it exists only from 1 October to 1 November (the member's local time), every
// year. Outside that window it isn't registered, so it's missing from the Options page and does nothing.

/** True from 1 October to 1 November, inclusive. */
export function isHauntedSeason(date = new Date()) {
  const month = date.getMonth(); // 0-based: 9 is October
  return month === 9 || (month === 10 && date.getDate() === 1);
}
