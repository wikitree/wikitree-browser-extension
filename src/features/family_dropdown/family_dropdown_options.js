/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Family Dropdown",
  id: "familyDropdown",
  description:
    "Adds a dropdown menu to the edit page to quickly copy the WikiLinks " +
    "of family members and see the sources on their profiles.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson],
  options: [
    {
      id: "convertDD-MM-YYYY",
      type: OptionType.CHECKBOX,
      label:
        "Convert DD-MM-YYYY. (WikiTree accepts the data format MM-DD-YYYY. If you're nto American, you may use DD-MM-YYYY. This option will convert your DD-MM-YYYY to an accepted format.)",
      defaultValue: true,
    },
  ],
});
