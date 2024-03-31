/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const addPersonRedesign = {
  name: "Add Person Redesign",
  id: "addPersonRedesign",
  description: "Redesigns the Add Person page for the convenience of advanced members.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  defaultValue: false,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
  options: [
    {
      id: "additionalFields",
      type: OptionType.CHECKBOX,
      label: "Add additional fields (Prefix, Nicknames, Other Last Names, Suffix, and Biography)",
      defaultValue: false,
    },
    {
      id: "categoryPicker",
      type: OptionType.CHECKBOX,
      label: "Add a category picker (adds them below Biography, please move them up later)",
      defaultValue: true, //no clue if this is pushed
    },
  ],
};

registerFeature(addPersonRedesign);
