/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isActivityFeed } from "../../core/pageType";

registerFeature({
  name: "Hide My Contributions",
  id: "hideMyContributions",
  description: "Stores your preference to hide or show your own contributions on Activity Feed pages.",
  category: "Community",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isActivityFeed],
  options: [
    {
      id: "hideMyContributionsValue",
      type: OptionType.CHECKBOX,
      label: "Hide my contributions",
      defaultValue: false,
    },
  ],
});
