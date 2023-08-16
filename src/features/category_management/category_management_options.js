import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit, isCategoryPage, isSearchPage
} from "../../core/pageType";

registerFeature({
  name: "Category Management",
  id: "categoryManagement",
  description: "Creating, filling, changing and emptying categories more efficiently",
  category: "Editing",
  creators: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isCategoryPage, isSearchPage],
  options: [
    {
      id: "catALotCategory",
      type: OptionType.CHECKBOX,
      label: "Cat-A-Lot: add/change/remove category of multiple profiles in one category",
      defaultValue: true,
    },
    {
      id: "catALotSearchResults",
      type: OptionType.CHECKBOX,
      label: "Cat-A-Lot: add category of multiple profiles within search results",
      defaultValue: false,
    },
  ],
});