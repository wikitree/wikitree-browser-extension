import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit, isCategoryPage, isSearchPage, isCategoryEdit
} from "../../core/pageType";

registerFeature({
  name: "Category Management",
  id: "categoryManagement",
  description: "Creating, filling, changing and emptying categories more efficiently",
  category: "Editing",
  creators: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isCategoryPage, isSearchPage, isCategoryEdit],
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
      defaultValue: false,
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
      defaultValue: false,
    },
    {
      id: "disableCategories",
      type: OptionType.CHECKBOX,
      label: "deactivate marked categories with <nowiki>",
      defaultValue: false,
    }
  ],
});