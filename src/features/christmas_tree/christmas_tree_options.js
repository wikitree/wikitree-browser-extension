import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType.js";

// Here all year; it switches itself off once each 7 January (Orthodox Christmas) is over (see christmas_tree_season.js)
registerFeature({
  name: "Christmas Tree",
  id: "christmasTree",
  description:
    "Your CC7 or watchlist drawn as a Christmas tree: lit where profiles are in good shape, dark where they need " +
    "help (no dates, no death date, unsourced, no parents, or not connected). Each day in December an Advent door " +
    "gives you one profile and one small job; do the job and a light comes on. Choose Christmas Tree in the Find " +
    "menu. It switches itself off after Orthodox Christmas (7 January); switch it back on if you want to keep going.",
  category: "Navigation/Find_Menu",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
