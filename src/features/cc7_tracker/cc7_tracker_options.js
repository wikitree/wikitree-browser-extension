import { registerFeature, OptionType } from "../../core/options/options_registry";
//import { } from "../../core/pageType";

registerFeature({
  name: "CC7 Tracker",
  id: "cc7Tracker",
  description: "Tracks changes in your CC7.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [true],
});
