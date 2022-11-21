import { registerFeature, OptionType } from "../../core/options/options_registry";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description: "Add your own options to the change summary options on edit pages.",
  category: "Editing",
  defaultValue: true,
};

registerFeature(customChangeSummaryOptions);

/*
  options: [
    {
      id: "myFirstOption",
      type: OptionType.CHECKBOX,
      label: "Enables my first option",
      defaultValue: true,
    },
  ],
*/
