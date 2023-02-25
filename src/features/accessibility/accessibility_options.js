import { registerFeature, OptionType } from "../../core/options/options_registry";

const accessibilityFeature = {
  name: "Accessibility Mode",
  id: "accessibility",
  description: "Style options to make profiles more readable.",
  category: "Style",
  defaultValue: false,
  options: [
    {
      id: "listItemSpacing",
      type: OptionType.SELECT,
      label: "The amount of spacing to add between list items.",
      values: [
        {
          value: 0,
          text: "none",
        },
        {
          value: 50,
          text: "50% (half)",
        },
        {
          value: 75,
          text: "75%",
        },
        {
          value: 100,
          text: "100% (standard)",
        },
        {
          value: 150,
          text: "150%",
        },
        {
          value: 200,
          text: "200% (double)",
        },
        {
          value: 300,
          text: "300%",
        },
        {
          value: 400,
          text: "400% (extra wide)",
        },
      ],
      defaultValue: 100,
    },
    {
      id: "spaceSourceItemsOnly",
      type: OptionType.CHECKBOX,
      label: "Limit additional spacing to only lists under the Sources section.",
      defaultValue: true,
    },
  ],
};

registerFeature(accessibilityFeature);
