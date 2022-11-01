import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const g2g = {
  name: "G2G Options",
  id: "g2g",
  description: "Add various things to G2G.",
  category: "Other",
  defaultValue: false,
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
};

// Just importing this file will register all the features
registerFeature(g2g);
