import { registerFeature, OptionType } from "../../core/options/options_registry";

const autoBio = {
  name: "Auto Bio",
  id: "autoBio",
  description: "Generates an automated biography from available data.",
  category: "Editing",
  defaultValue: true,
  options: [
    {
      id: "startWithName",
      type: OptionType.RADIO,
      label: "Start with",
      values: [
        {
          value: "FullName",
          text: "Full name",
        },
        {
          value: "BirthName",
          text: "Birth Name",
        },
      ],
      defaultValue: "BirthName",
    },
    {
      id: "deathPosition",
      type: OptionType.CHECKBOX,
      label: "Death immediately after birth",
      defaultValue: false,
    },
    {
      id: "inlineCitations",
      type: OptionType.CHECKBOX,
      label: "Inline Citations",
      defaultValue: true,
    },
    {
      id: "timeline",
      type: OptionType.CHECKBOX,
      label: "Timeline",
      defaultValue: false,
    },
  ],
};

registerFeature(autoBio);
