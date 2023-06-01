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
  category: "Profile",
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
      id: "addMenuItem",
      type: OptionType.CHECKBOX,
      label: "Add a link to the profile menu.",
      defaultValue: true,
    },
    {
      id: "excludeVitals",
      type: OptionType.CHECKBOX,
      label: "Do not print vitals and family relationships.",
      defaultValue: true,
    },
    {
      id: "excludeDNA",
      type: OptionType.CHECKBOX,
      label: "Do not print DNA confirmations.",
      defaultValue: false,
    },
    {
      id: "excludeResearchNotes",
      type: OptionType.CHECKBOX,
      label: "Do not print research notes.",
      defaultValue: false,
    },
    {
      id: "excludeSources",
      type: OptionType.CHECKBOX,
      label: "Do not print sources.",
      defaultValue: false,
    },
  ],
};

registerFeature(printerFriendlyFeature);
