import { registerFeature, OptionType } from "../../core/options/options_registry";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description: "Add your own phrases to the change summary phrases on edit pages.",
  category: "Editing",
  defaultValue: true,
};

registerFeature(customChangeSummaryOptions);
