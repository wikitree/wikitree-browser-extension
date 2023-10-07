/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit, isSpaceEdit, isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";

registerFeature({
  name: "Editor Expander",
  id: "editorExpander",
  description:
    "Adds a button to the editor toolbar to expand the editor to nearly full screen. This is useful for editing long bios or adding large tables.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isSpaceEdit, isProfileAddRelative, isAddUnrelatedPerson],
});
