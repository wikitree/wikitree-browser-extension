/*
Created By: Ian Beacall (Beacall-6)
*/
import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Add Search Boxes",
  id: "addSearchBoxes",
  description: "Add a Google Search box and/or a Help Search box to the bottom of every page.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
  options: [
    {
      id: "addGoogle",
      type: OptionType.CHECKBOX,
      label: "Add Google Search Box",
      defaultValue: true,
    },
    {
      id: "addHelp",
      type: OptionType.CHECKBOX,
      label: "Add Help Search Box",
      defaultValue: true,
    },
  ],
});
