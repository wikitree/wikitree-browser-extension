/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isWikiEdit } from "../../core/pageType";

registerFeature({
  name: "Wikitable Wizard",
  id: "wikitableWizard",
  description: "Helps you to create and edit wikitables",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isWikiEdit],
  options: [
    {
      label: "Select a few unique lines of a table to launch the Wizard",
      id: "selectToLaunch",
      type: OptionType.CHECKBOX,
      defaultValue: true,
    },
  ],
});
