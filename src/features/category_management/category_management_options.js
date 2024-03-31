/*
 * Created By: Florian Straub (Straub-620)
 * Contributor: Magnus Manske (Manske-74)
 * Contributor: Aleš Trtnik (Trtnik-2) plus.wikitree.com support
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit,
  isCategoryPage,
  isSearchPage,
  isCategoryEdit,
  isCategoryHistory,
  isProfilePage,
  isPlusProfileSearch,
  isPlusDomain,
} from "../../core/pageType";

registerFeature({
  name: "Category Management",
  id: "categoryManagement",
  description: "Creating, filling, changing and emptying categories more efficiently",
  category: "Editing",
  creators: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  contributors: [
    { name: "Magnus Manske", wikitreeid: "Manske-74" },
    { name: "Aleš Trtnik", wikitreeid: "Trtnik-2" },
  ],
  defaultValue: true,
  pages: [
    isProfileEdit,
    isCategoryPage,
    isSearchPage,
    isCategoryEdit,
    isCategoryHistory,
    isProfilePage,
    isPlusProfileSearch,
    isPlusDomain,
  ],
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
      id: "catALotCemeteryReport",
      type: OptionType.CHECKBOX,
      label: "add missing categories via Cemetery Report and Partial Cemeteries",
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
    {
      id: "addProfileFromCategory",
      type: OptionType.CHECKBOX,
      label: "add profile directly from category",
      defaultValue: true,
    },
  ],
});
