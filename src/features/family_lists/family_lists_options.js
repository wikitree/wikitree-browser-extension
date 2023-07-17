/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Family Lists",
  id: "familyLists",
  description:
    "Adds buttons to the WBE editor menu (Biography) to generate information " +
    "about the profile person's parents, siblings, spouses, and/or children. See Auto Bio for options.",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit],
});
