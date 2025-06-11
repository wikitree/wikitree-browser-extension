import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";

registerFeature({
  name: "Text Expander",
  id: "textExpander",
  description:
    "Automatically expands your own abbreviations as you type. " +
    "Set your own abbreviations by clicking the arrow icon with the other WBE buttons. " +
    "(Not compatible with the Enhanced Editor.)",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
