import { registerFeature, OptionType } from "../../core/options/options_registry";

const changeFamilyLists = {
  name: "Change Family Lists",
  id: "changeFamilyLists",
  description: "Change the position and/or appearance of family lists (parents, siblings, spouses, and children)",
  category: "Profile",
  defaultValue: false,
  options: [
    {
      id: "moveToRight",
      type: OptionType.CHECKBOX,
      label: "Move to the right-hand column",
      defaultValue: true,
    },
  ],
};

registerFeature(changeFamilyLists);
