// Haunted Tree's saved scans (see seasonal_store.js), one record per member for each list ("cc7" or "watchlist"):
// { key, season, scannedAt, checkedAt, total, people, laidToRest }. Only the haunted people are kept, not the whole
// list. The names below are the ones it has always used, so scans saved before the store was shared still load.
import { createTreeStore } from "../seasonal_tree/seasonal_store";

const store = createTreeStore({
  dbName: "WBE_haunted_tree",
  savedFlag: "wbeHauntedTreeSaved",
  sourceKey: "wbeHauntedTreeSource",
});

/** The member's saved scan of this list ("cc7" or "watchlist") from this season, or null. */
export const loadHauntedTree = (userNumId, season, source = "cc7") => store.load(userNumId, season, source);

export const saveHauntedTree = (userNumId, record, source = "cc7") => store.save(userNumId, record, source);

/** The list the member last looked at: "cc7" (the default) or "watchlist". */
export const lastSource = () => store.lastSource();

export const rememberSource = (source) => store.rememberSource(source);

/** Off, outside October: delete the saved scans, if there are any. */
export const clearHauntedTreeIfSaved = () => store.clearIfSaved();
