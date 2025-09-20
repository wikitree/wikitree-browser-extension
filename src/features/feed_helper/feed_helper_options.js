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
});
