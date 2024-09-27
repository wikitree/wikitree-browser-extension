/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isAncestry } from "../../core/pageType";

registerFeature({
  name: "Ancestry Match",
  id: "ancestryMatch",
  description: "Testing Ancestry Match Feature",
  category: "External",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isAncestry],
});
