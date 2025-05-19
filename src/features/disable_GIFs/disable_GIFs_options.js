/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";

registerFeature({
  name: "Disable GIFs",
  id: "disableGIFs",
  description: "Disables animated GIFs by converting them to static images.",
  category: "Global/Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
