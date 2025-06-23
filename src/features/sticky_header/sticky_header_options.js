import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType.js";

registerFeature({
  name: "Sticky Header",
  id: "stickyHeader",
  description: "Makes the WikiTree header stick to the top of the screen when scrolling down the page.",
  category: "Global/Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
  options: [
    {
      id: "g2gStickyHeader",
      type: OptionType.CHECKBOX,
      label: "G2G",
      defaultValue: true,
    },
  ],
});
