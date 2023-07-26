import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit, isSpaceEdit, isWikiPage, isProfileHistoryDetail } from "../../core/pageType";

registerFeature({
  name: "Scissors",
  id: "scissors",
  description:
    "Adds scissors (like on profile pages) to Category, Help, Project, Template, and Change Details pages to copy various things.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [
    { name: "Riël Smit", wikitreeid: "Smit-641" },
    { name: "Aleš Trtnik", wikitreeid: "Trtnik-2" },
  ],
  defaultValue: true,
  pages: [isWikiPage, isProfileEdit, isSpaceEdit, isProfileHistoryDetail],
  options: [
    {
      id: "removeDates",
      type: OptionType.CHECKBOX,
      label: "Profile Link: Remove dates",
      defaultValue: false,
    },
    {
      id: "categoryTextLink",
      type: OptionType.CHECKBOX,
      label: "Category Link: [[:Category: X|X category]] (not [[:Category: X]])",
      defaultValue: true,
    },
  ],
});
