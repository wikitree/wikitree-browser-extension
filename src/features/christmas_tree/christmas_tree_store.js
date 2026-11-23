// Christmas Tree's saved scans (see seasonal_store.js), one record per member for each list ("cc7" or "watchlist"):
// { key, season, scannedAt, checkedAt, rows, people, doors }. Only the people who need help (and Christmas folk) are
// kept, with each row's total, and the Advent doors opened so far.
import { createTreeStore } from "../seasonal_tree/seasonal_store";

const store = createTreeStore({
  dbName: "WBE_christmas_tree",
  savedFlag: "wbeChristmasTreeSaved",
  sourceKey: "wbeChristmasTreeSource",
});

/** The member's saved scan of this list ("cc7" or "watchlist") from this season (see seasonOf), or null. */
export const loadChristmasTree = (userNumId, season, source = "cc7") => store.load(userNumId, season, source);

export const saveChristmasTree = (userNumId, record, source = "cc7") => store.save(userNumId, record, source);

/** The list the member last looked at: "cc7" (the default) or "watchlist". */
export const lastSource = () => store.lastSource();

export const rememberSource = (source) => store.rememberSource(source);

/** Off, out of season: delete the saved scans, if there are any. */
export const clearChristmasTreeIfSaved = () => store.clearIfSaved();
