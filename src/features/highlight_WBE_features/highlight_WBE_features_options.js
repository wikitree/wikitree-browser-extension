/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";

registerFeature({
  name: "Highlight WBE Features",
  id: "highlightWBEFeatures",
  description: "Highlight WBE features with cyan borders.",
  category: "Global/Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
