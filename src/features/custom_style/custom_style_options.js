import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const myCustomStyle = {
  name: "Custom Style",
  id: "customStyle",
  description: "Add your own style rules to WikiTree.",
  category: "Style",
  defaultValue: true,
  options: [
    {
      id: "headings_background-color",
      type: "color",
      label: "Headings: Background color",
      defaultValue: "#E1F0B4",
    },
    {
      id: "headings_color",
      type: "color",
      label: "Headings: Text color",
      defaultValue: "#000000",
    },
  ],
};

// Just importing this file will register all the features
registerFeature(myCustomStyle);
