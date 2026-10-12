// Marriages a profile's manager chose not to show (WikiTree's "Don't show my ex(es)"): getPeople and getRelatives
// send it on each spouse as do_not_display (and DoNotDisplay) "1", and WikiTree's own pages leave the marriage out.
// Genie's charts and lists leave it out too (Murray Maloney, 2026-10-12: "Your charts are ignoring my 'Don't show
// my ex(es)' setting. I like the display, I just don't like seeing them"). As in the Family Timeline feature.

/** True when this spouse entry is a marriage marked not to show. */
export function isHiddenMarriage(spouse) {
  const flag = spouse?.do_not_display ?? spouse?.DoNotDisplay;
  return flag === "1" || flag === 1 || flag === true;
}

/** Someone's Spouses (a list, or an object keyed by Id) as a list, without the marriages marked not to show. */
export function shownSpouses(spouses) {
  const list = Array.isArray(spouses) ? spouses : Object.values(spouses || {});
  return list.filter((spouse) => spouse && !isHiddenMarriage(spouse));
}
