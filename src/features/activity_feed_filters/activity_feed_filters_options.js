/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isNetworkFeed, isContributions } from "../../core/pageType";

registerFeature({
  name: "Activity Feed Filters",
  id: "activityFeedFilters",
  description:
    "Adds two buttons to the Watchlist and Contributions Activity Feeds to filter between Profiles and Space Pages.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isNetworkFeed, isContributions],
});
