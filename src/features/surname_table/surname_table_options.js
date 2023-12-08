/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isGenealogyPage } from "../../core/pageType";

registerFeature({
  name: "Surname Table Options",
  id: "surnameTable",
  description: "Adds columns and more functionality to surname genealogy pages.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isGenealogyPage],
});
