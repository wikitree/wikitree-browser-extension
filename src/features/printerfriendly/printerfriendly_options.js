/*
Created By: Jamie Nelson (Nelson-3486)
Contributors: Jonathan Duke (Duke-5773)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage, isSpacePage } from "../../core/pageType";

const printerFriendlyFeature = {
  name: "Printer Friendly Bio",
  id: "printerFriendly",
  description: "Reformat profile pages for printing.",
  category: "Global",
  ordinal: -1,
  creators: [{ name: "Jamie Nelson", wikitreeid: "Nelson-3486" }],
  contributors: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  defaultValue: true,
  pages: [isProfilePage, isSpacePage],
  options: [
    {
      id: "onBrowserPrint",
      type: OptionType.CHECKBOX,
      label: "Apply formatting when directly using the browser's print option.",
      defaultValue: false,
    },
    {
      id: "printVitals",
      type: OptionType.CHECKBOX,
      label: "Include vitals and family relationships.",
      defaultValue: false,
    },
    {
      id: "addMenuItem",
      type: OptionType.CHECKBOX,
      label: "Add a link to the profile menu.",
      defaultValue: true,
    },
  ],
};

registerFeature(printerFriendlyFeature);
