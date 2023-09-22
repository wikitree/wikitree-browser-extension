import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit,
  isCategoryPage,
  isSearchPage,
  isCategoryEdit,
  isCategoryHistory,
  isProfilePage,
  isPlusDomain,
} from "../../core/pageType";

registerFeature({
  name: "Category Management",
  id: "categoryManagement",
  description: "Creating, filling, changing and emptying categories more efficiently",
  category: "Editing",
  creators: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  contributors: [{ name: "Magnus Manske", wikitreeid: "Manske-74" }],
  defaultValue: true,
  pages: [isProfileEdit, isCategoryPage, isSearchPage, isCategoryEdit, isCategoryHistory, isProfilePage, isPlusDomain],
  options: [
    {
      id: "catALotCategory",
      type: OptionType.CHECKBOX,
      label: "batch add, change and remove category for profiles in one category",
      defaultValue: true,
    },
    {
      id: "catALotSearchResults",
      type: OptionType.CHECKBOX,
      label: "batch add category for profiles within search results",
      defaultValue: true,
    },
    {
      id: "catALotWikiTreePlus",
      type: OptionType.CHECKBOX,
      label: "batch add category for profiles within WikiTree+ search results",
      defaultValue: true,
    },
    {
      id: "catMarkDelete",
      type: OptionType.CHECKBOX,
      label: "add link to request deletion",
      defaultValue: false,
    },
    {
      id: "catMarkRename",
      type: OptionType.CHECKBOX,
      label: "add link to ask new name, edit new category and request renaming",
      defaultValue: false,
    },
    {
      id: "catCopyRename",
      type: OptionType.CHECKBOX,
      label: "add link to copy and rename category",
      defaultValue: true,
    },
    {
      id: "showExitLinks",
      type: OptionType.CHECKBOX,
      label: "show exit links in category edit and history page",
      defaultValue: true,
    },
    {
      id: "showCategoryLinksProfile",
      type: OptionType.CHECKBOX,
      label: "enable category change in profile",
      defaultValue: true,
    },
  ],
});
