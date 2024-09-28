/*
Created By: Eric Stamper (Stamper-1306)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

const showSuggestions = {
  name: "Show Suggestions",
  id: "showSuggestions",
  description: "Show the suggestions for a profile without needing to go to the edit page.",
  category: "Profile",
  creators: [{ name: "Eric Stamper", wikitreeid: "Stamper-1306" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
  options: [
    {
      id: "AutoSuggestions",
      type: OptionType.CHECKBOX,
      label: "Automatically load suggestions on every profile, without needing to click the suggestions button.",
      defaultValue: false,
    },
  ],
};

registerFeature(showSuggestions);
