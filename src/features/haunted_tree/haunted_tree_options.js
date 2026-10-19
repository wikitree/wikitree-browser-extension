import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType.js";
import { isHauntedSeason } from "./haunted_tree_season";

// Registered only in season, so for the rest of the year it isn't on the Options page and never loads
if (isHauntedSeason()) {
  registerFeature({
    name: "Haunted Tree",
    id: "hauntedTree",
    description:
      "A Halloween hunt through your CC7 or watchlist for the Undead (no death date), Ghosts (no dates at all), " +
      "Skeletons in the closet (unsourced) and more. Choose Haunted Tree in the Find menu. Icons mark them on " +
      "profile pages, your watchlist, search results and surname pages too. Only here from 1 October to 1 November.",
    category: "Navigation/Find_Menu",
    creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
    contributors: [],
    defaultValue: false,
    pages: [isMainDomain],
  });
}
