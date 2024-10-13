/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage, isProfilePage } from "../../core/pageType";
import "./collapsible_profiles.css";

registerFeature({
  name: "Collapsible Profiles",
  id: "collapsibleProfiles",
  description:
    "Adds a button to the submenu of profile and space pages to collapse all sections and make them togglable.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpacePage, isProfilePage],
  options: [
    {
      id: "automaticallyAddButtons",
      type: OptionType.CHECKBOX,
      label: "Automatically add toggle buttons",
      defaultValue: false,
    },
  ],
});
