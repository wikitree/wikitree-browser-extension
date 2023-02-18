import { registerFeature, OptionType } from "../../core/options/options_registry";

const autoBio = {
  name: "Auto Bio",
  id: "autoBio",
  description: "Generates an automated biography from available data.",
  category: "Editing",
  defaultValue: true,
  options: [
    {
      id: "inlineCitations",
      type: OptionType.CHECKBOX,
      label: "Inline Citations",
      defaultValue: true,
    },
    {
      id: "timeline",
      type: OptionType.RADIO,
      label: "Timeline",
      values: [
        {
          value: "table",
          text: "Table",
        },
        {
          value: "list",
          text: "List",
        },
      ],
      defaultValue: "table",
    },
  ],
};

registerFeature(autoBio);
