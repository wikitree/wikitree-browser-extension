/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain, isAppsDomain } from "../../core/pageType";

registerFeature({
  name: "Presentation Mode",
  id: "presentationMode",
  description:
    "Hides the details only you can see (private names, dates, places and photos of you and your family, and any " +
    "email addresses) so you can share your screen or record a video. It asks WikiTree what the public sees of the " +
    "private profiles on your watchlist and hides the rest. Turn it on before you record and off afterwards. It " +
    "reduces the risk; it can't promise to catch everything, so use the Check button first. To show one hidden " +
    "thing, rest the pointer on it for a moment (or hold Alt, Option on a Mac, to show it at once).",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain, isAppsDomain],
  options: [
    {
      id: "hideStyle",
      type: OptionType.SELECT,
      label: "Hide private details with",
      values: [
        { value: "line", text: "Underline (a blank line)" },
        { value: "blur", text: "Blur" },
        { value: "bars", text: "White bars" },
      ],
      defaultValue: "line",
    },
    {
      id: "showBadge",
      type: OptionType.CHECKBOX,
      label: "Show the Presentation Mode label in the corner",
      defaultValue: true,
      comment:
        "The label has Check (show what's hidden), Refresh (fetch your private profiles again) and Off buttons. " +
        "It appears in recordings.",
    },
  ],
});
