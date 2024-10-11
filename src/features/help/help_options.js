/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isWBESpace } from "../../core/pageType";

registerFeature({
  name: "Help",
  id: "help",
  description: "Adds WBE options to the WBE Help page.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isWBESpace],
});
