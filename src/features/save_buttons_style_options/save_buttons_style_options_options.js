/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit, isSpaceEdit } from "../../core/pageType";

registerFeature({
  name: "Save Buttons Style Options",
  id: "saveButtonsStyleOptions",
  description: "Turns the Compare and Return (Delete Draft) links in the Save section on the Edit page into buttons.",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit, isSpaceEdit],
  options: [
    {
      id: "buttonSize",
      type: OptionType.RADIO,
      label: "Button Size",
      values: [
        { value: "allSmall", text: "All Small" },
        { value: "halfSmall", text: "Small Compare and Return (Delete Draft) Buttons" },
        { value: "large", text: "All Large" },
      ],
      defaultValue: "halfSmall",
    },
  ],
});
