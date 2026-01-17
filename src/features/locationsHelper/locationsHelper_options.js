/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isSpaceEdit,
  isNewSpace,
  isUploadPhoto,
  isImagePage,
} from "../../core/pageType";

registerFeature({
  name: "Locations Helper",
  id: "locationsHelper",
  description:
    "Manipulates the suggested locations, highlighting likely correct locations," +
    " based on family members' locations, and demoting likely wrong locations, based on the dates." +
    " Additional options:" +
    " 1) Enable improved (experimental) location suggestions." +
    " 2) Automatically correct some date-based location names:" +
    " US state names before they joined the Union," +
    " Canadian regional districts," +
    " German country names and Wallenhorst," +
    " UK towns and villages," +
    " South African provinces. " +
    "3) Add 'County' to US locations. " +
    "4) Use native language for country names.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: true,
  pages: [
    isProfileEdit,
    isProfileAddRelative,
    isAddUnrelatedPerson,
    isSpaceEdit,
    isNewSpace,
    isUploadPhoto,
    isImagePage,
  ],
  options: [
    {
      id: "newLocations",
      type: OptionType.RADIO,
      label: "Use Experimental Location Suggestions",
      values: [
        {
          value: "no",
          text: "No",
        },
        {
          value: "augment",
          text: "Augment existing",
        },
        {
          value: "only",
          text: "Use Exclusively",
        },
      ],
      defaultValue: "no",
    },
    {
      id: "allDates",
      type: OptionType.CHECKBOX,
      label: "Include all date ranges when suggesting experimental locations",
      defaultValue: false,
    },
    {
      id: "correctLocations",
      type: OptionType.CHECKBOX,
      label: "Correct Locations",
      defaultValue: false,
    },
    {
      id: "addUSCounty",
      type: OptionType.CHECKBOX,
      label: "Add 'County' to US locations",
      defaultValue: false,
    },
    {
      id: "nativeName",
      type: OptionType.CHECKBOX,
      label: "Use native names for locations (the name of the country in its own language)",
      defaultValue: false,
    },
  ],
});
