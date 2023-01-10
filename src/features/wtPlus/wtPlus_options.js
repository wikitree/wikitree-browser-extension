import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "WikiTree+ Edit Helper",
  id: "wtplus",
  description: "Adds multiple editing features.",
  category: "Editing",
  defaultValue: true,
  options: [
    {
      id: "wtplusSourceInline",
      type: OptionType.CHECKBOX,
      label: "Add pasted sources as inline citation instead of bulleted list",
      defaultValue: true,
    },
  ],
});
