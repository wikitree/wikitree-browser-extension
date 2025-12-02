/*
Created By: Miyako Jones (Jones-108375)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isFindAGraveCemeteryList } from "../../core/pageType";

registerFeature({
  name: "Find A Grave Memorial Extractor",
  id: "findAGraveMemorialExtractor",
  description:
    "Extracts memorial data from Find a Grave cemetery list pages and downloads as CSV. Optionally matches memorials with WikiTree profiles.",
  category: "Other",
  creators: [{ name: "Miyako Jones", wikitreeid: "Jones-108375" }],
  contributors: [],
  defaultValue: false,
  pages: [isFindAGraveCemeteryList],
  options: [
    {
      id: "useWikiTreeCheck",
      type: OptionType.CHECKBOX,
      label: "Match with WikiTree profiles",
      defaultValue: false,
    },
  ],
});
