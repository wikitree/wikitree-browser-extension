/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage } from "../../core/pageType";

registerFeature({
  name: "Space Style",
  id: "spaceStyle",
  description:
    "On space pages, this feature removes the right sidebar and moves the profile manager box to the main content area.",
  category: "Global/Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpacePage],
  options: [
    {
      id: "alwaysWide",
      type: OptionType.CHECKBOX,
      label: "Always wide layout",
      description: "Always remove the right sidebar and make the page content full width.",
      defaultValue: false,
    },
    {
      id: "wideIfComment",
      type: OptionType.CHECKBOX,
      label: "Wide for profiles with marker",
      description:
        'If a profile contains this marker: <span class="wbe-wide"></span> – the page will be shown wide (no sidebar).',
      defaultValue: true,
    },
  ],
});
