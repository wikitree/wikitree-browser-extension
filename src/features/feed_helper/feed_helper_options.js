/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isNetworkFeed, isContributions } from "../../core/pageType";

registerFeature({
  name: "Feed Helper",
  id: "feedHelper",
  description: "",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isNetworkFeed, isContributions],
});
