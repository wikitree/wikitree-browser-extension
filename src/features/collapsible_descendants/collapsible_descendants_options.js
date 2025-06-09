/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isProfilePage, isDNADescendants } from "../../core/pageType";

registerFeature({
  name: "Collapsible Descendants",
  id: "collapsibleDescendants",
  description: "Add buttons to the descendants tree to collapse/expand individual branches.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage, isDNADescendants],
});
