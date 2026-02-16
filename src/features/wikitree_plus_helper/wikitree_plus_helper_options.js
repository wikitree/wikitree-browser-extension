/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain, isPlusDomain } from "../../core/pageType";

registerFeature({
  name: "WikiTree+ Query Builder",
  id: "wikitreePlusHelper",
  description:
    "Build WikiTree+ queries using OR groups containing AND conditions; keeps NOT terms at the end of each group and SQL last.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain, isPlusDomain],
});
