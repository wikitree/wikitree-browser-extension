/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isNetworkFeed } from "../../core/pageType";

registerFeature({
  name: "Watchlist Activity Feed Filters",
  id: "activityFeedFilters",
  description: "Adds two buttons to the Watchlist Activity Feed to filter between Profiles and Space Pages.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isNetworkFeed],
});
