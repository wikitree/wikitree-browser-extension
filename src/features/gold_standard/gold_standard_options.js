import { registerFeature } from "../../core/options/options_registry";
import { isProfileEdit, isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Gold Standard Inspector",
  id: "goldStandard",
  description: "Inspect a profile for Gold Standard issues.",
  category: "Profile",
  creators: [],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage, isProfileEdit],
});
