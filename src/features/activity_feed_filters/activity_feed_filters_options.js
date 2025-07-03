/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isNetworkFeed } from "../../core/pageType";

registerFeature({
  name: "Activity Feed Filters",
  id: "activityFeedFilters",
  description: "",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [ isNetworkFeed],
});
