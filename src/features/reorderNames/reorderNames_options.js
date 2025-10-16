/*
Created By: Elaine Martzen (Weatherall-96)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "ReorderNames",
  id: "reorderNames",
  description: "",
  category: "Profile",
  creators: [{ name: "Elaine Martzen", wikitreeid: "Weatherall-96" }],
  contributors: [],
  defaultValue: false,
  pages: [ isProfilePage],
});
