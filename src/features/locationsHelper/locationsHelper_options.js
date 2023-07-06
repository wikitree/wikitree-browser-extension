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
} from "../../core/pageType";

registerFeature({
  name: "Locations Helper",
  id: "locationsHelper",
  description:
    "Manipulates the suggested locations, highlighting likely correct locations," +
    " based on family members' locations, and demoting likely wrong locations, based on the dates." +
    " There is an option to automatically correct the names of US states before they joined the Union." +
    " e.g. 'Massachusetts Bay Colony' to 'Province of Massachusetts Bay'.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson, isSpaceEdit, isNewSpace],
  options: [
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
  ],
});
