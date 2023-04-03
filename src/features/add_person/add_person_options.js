/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { registerFeature } from "../../core/options/options_registry.js";

const addPersonRedesign = {
  name: "Add Person Redesign",
  id: "addPersonRedesign",
  description: "Redesigns the Add Person page for the convenience of advanced members.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
  // options: [],
};

registerFeature(addPersonRedesign);
