/*
Created By: Elaine Martzen (Weatherall-96)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "ReorderNames",
  id: "reorderNames",
  description:
    "Reorders non-Latin alphabet names; each language appears on its own line in the family box. " +
    "Supports Chinese, Cyrillic, Greek, Hebrew, and Korean. Caveat: sometimes not all OLNs are displayed.",
  category: "Profile",
  creators: [{ name: "Elaine Martzen", wikitreeid: "Weatherall-96" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});
