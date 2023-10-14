import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit,
  isSpaceEdit,
  isWikiPage,
  isProfileHistoryDetail,
  isNetworkFeed,
  isCategoryPage,
  isCategoryEdit,
} from "../../core/pageType";

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
  pages: [
    isWikiPage,
    isProfileEdit,
    isSpaceEdit,
    isProfileHistoryDetail,
    isNetworkFeed,
    isCategoryEdit,
    isCategoryPage,
  ],
  options: [
    {
      id: "removeDates",
      type: OptionType.CHECKBOX,
      label: "Profile Link: Remove dates",
      defaultValue: false,
    },
    {
      id: "spaceLinkFormat",
      type: OptionType.RADIO,
      label: "Space Link Format",
      defaultValue: "withParameter",
      values: [
        { value: "withParameter", text: "[[Space: X|X]]" },
        { value: "noParameter", text: "[[:Space: X]]" },
      ],
    },
    {
      id: "categoryLinkFormat",
      type: OptionType.RADIO,
      label: "Category Link Format",
      defaultValue: "withParameter",
      values: [
        { value: "withParameter", text: "[[:Category: X|X category]]" },
        { value: "noParameter", text: "[[:Category: X]]" },
      ],
    },
  ],
});
