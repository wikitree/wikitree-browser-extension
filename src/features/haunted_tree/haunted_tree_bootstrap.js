// Loads Haunted Tree (chunk "haunted-tree") only in season and where it's enabled. After the season, the first page
// load clears away what it saved.
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";
import { isHauntedSeason } from "./haunted_tree_season";
import { clearHauntedTreeIfSaved } from "./haunted_tree_store";

if (isHauntedSeason()) {
  loadFeatureWhereEnabled("hauntedTree", () =>
    import(
      /* webpackChunkName: "haunted-tree" */
      "./haunted_tree"
    )
  );
} else {
  clearHauntedTreeIfSaved();
}
