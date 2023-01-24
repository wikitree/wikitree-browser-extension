import { registerFeature, OptionType } from "../../core/options/options_registry";

const autoBio = {
  name: "Auto Bio",
  id: "autoBio",
  description: "Generates and automated biography from available data.",
  category: "Editing",
  defaultValue: true,
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

registerFeature(autoBio);
