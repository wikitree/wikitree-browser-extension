import { registerFeature, OptionType } from "../../core/options/options_registry";
//import { } from "../../core/pageType";

registerFeature({
  name: "CC7 Changes",
  id: "cc7Changes",
  description: "Tracks changes in your CC7. Click the button in the Find menu to see the changes.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [true],
});
