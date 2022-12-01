import { registerFeature, OptionType } from "../../core/options/options_registry";

const formatSourceReferenceNumbersObject = {
  name: "Format Source Reference Numbers",
  id: "formatSourceReferenceNumbers",
  description: "Hide source reference numbers or make them smaller.",
  category: "Profile",
  defaultValue: false,
  options: [
    {
      id: "mode",
      type: OptionType.RADIO,
      label: "Options",
      values: [
        {
          value: "hide",
          text: "Hide them",
        },
        {
          value: "makeSmaller",
          text: "Make them smaller",
        },
      ],
      defaultValue: "makeSmaller",
    },
  ],
};

registerFeature(formatSourceReferenceNumbersObject);
