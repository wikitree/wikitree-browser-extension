/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isNetworkFeed, isContributions } from "../../core/pageType";

registerFeature({
  name: "Feed Helper",
  id: "feedHelper",
  description:
    "Adds buttons to the Activity Feed and Contributions pages to check for anomalies, recent activity, and activity by new members and newly-badged members.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isNetworkFeed, isContributions],
  options: [
    {
      id: "newMemberThreeWayFilter",
      type: OptionType.CHECKBOX,
      label:
        "Three-way 'New Members' filter: click the new/newly-badged members button once to show only their activity, again to show only everyone else's, and again to show all activity",
      defaultValue: false,
    },
  ],
});
