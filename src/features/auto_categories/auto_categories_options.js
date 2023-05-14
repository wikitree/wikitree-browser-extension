/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Auto Categories",
  id: "autoCategories",
  description: "Adds categories to a biography based on the available data.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit],
});
