import {
    registerFeature,
    OptionType,
  } from "../../core/options/options_registry.js";
  
  const darkModeFeature = {
    name: "Dark Mode",
    id: "darkMode",
    description: "Make WikiTree dark.",
    category: "Style",
    options: [
      {
        id: "mode",
        type: OptionType.RADIO,
        label: "When",
        values: [
          {
            value: "always",
            text: "Always",
          },
          {
            value: "system",
            text: "Follow my system preference",
          },
        ],
        defaultValue: "always",
      },
    ],
  };
  
  registerFeature(darkModeFeature);