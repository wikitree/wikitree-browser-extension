/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const darkModeFeature = {
  name: "Dark Mode",
  id: "darkMode",
  description: "Make WikiTree dark.",
  category: "Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [true],
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
