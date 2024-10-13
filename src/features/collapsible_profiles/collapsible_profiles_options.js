/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage, isProfilePage } from "../../core/pageType";
import "./collapsible_profiles.css";

registerFeature({
  name: "Collapsible Profiles",
  id: "collapsibleProfiles",
  description: "",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isSpacePage, isProfilePage],
});
