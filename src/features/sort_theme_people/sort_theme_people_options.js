/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Featured Connections Table",
  id: "sortThemePeople",
  description:
    "Replaces the Featured Connections section on profile pages with a table sorted by degree of closeness to the profile person.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});
