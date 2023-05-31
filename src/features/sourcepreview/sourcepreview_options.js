/*
 * Created By: Steve Harris (Harris-5439)
 * Contributor: Jonathan Duke (Duke-5773)
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfilePage,
  isProfileEdit,
  isSpacePage,
  isSpaceEdit,
  isCategoryPage,
  isCategoryEdit,
} from "../../core/pageType";

const sourcePreviewFeature = {
  name: "Preview Sources",
  id: "sPreviews", // keep ID the same to preserve configuration
  description: "Enable source previews on inline references.",
  category: "Navigation",
  creators: [{ name: "Steve Harris", wikitreeid: "Harris-5439" }],
  contributors: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  defaultValue: false,
  pages: [isProfilePage, isProfileEdit, isSpacePage, isSpaceEdit, isCategoryPage, isCategoryEdit],

  options: [
    {
      id: "removeBackReferences",
      type: OptionType.CHECKBOX,
      label: "Remove back-reference links from the preview window",
      defaultValue: true,
    },
  ],
};

registerFeature(sourcePreviewFeature);
