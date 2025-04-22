/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isImagePage } from "../../core/pageType";

registerFeature({
  name: "Image Page Options",
  id: "imagePageOptions",
  description: "",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isImagePage],
  options: [
    {
      id: "addCopyButtons",
      type: OptionType.CHECKBOX,
      label: "Add copy buttons to image templates",
      defaultValue: true,
    },
    {
      id: "addLabel",
      type: OptionType.CHECKBOX,
      label: "Add label parameter to image template examples",
      defaultValue: false,
    },
    {
      id: "fixCaption",
      type: OptionType.CHECKBOX,
      label: "Use image title as the caption in image templates",
      defaultValue: false,
    },
  ],
});
