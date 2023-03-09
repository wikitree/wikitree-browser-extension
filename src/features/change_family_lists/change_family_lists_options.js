/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfilePage } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const changeFamilyLists = {
  name: "Change Family Lists",
  id: "changeFamilyLists",
  description: "Change the position and/or appearance of family lists (parents, siblings, spouses, and children)",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],

  options: [
    {
      id: "moveToRight",
      type: OptionType.CHECKBOX,
      label: "Move to the right-hand column",
      defaultValue: false,
    },
    {
      id: "verticalLists",
      type: OptionType.CHECKBOX,
      label: "Vertical family lists with dates",
      defaultValue: false,
    },
    {
      id: "changeHeaders",
      type: OptionType.CHECKBOX,
      label:
        "'Parents:', 'Siblings:', 'Spouses:', and 'Children:' instead of " +
        "'Son/Daughter of', 'Brother/Sister of', 'Husband/Wife of', and 'Father/Mother of'",
      defaultValue: false,
    },
    {
      id: "agesAtMarriages",
      type: OptionType.CHECKBOX,
      label: "Add ages at marriage",
      defaultValue: true,
    },
    {
      id: "siblingAndChildCount",
      type: OptionType.CHECKBOX,
      label: "Add sibling and child counts",
      defaultValue: true,
    },
  ],
};

registerFeature(changeFamilyLists);
