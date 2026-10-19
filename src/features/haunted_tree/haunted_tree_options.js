import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType.js";

// Here all year; it switches itself off once each Halloween is over (see haunted_tree_season.js)
registerFeature({
  name: "Haunted Tree",
  id: "hauntedTree",
  description:
    "A Halloween hunt through your CC7 or watchlist for the Undead (no death date), Ghosts (no dates at all), " +
    "Skeletons in the closet (unsourced) and more. Choose Haunted Tree in the Find menu. Icons mark them on " +
    "profile pages, your watchlist, search results and surname pages too. It switches itself off when Halloween " +
    "is over; switch it back on if you want to keep hunting.",
  category: "Navigation/Find_Menu",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
