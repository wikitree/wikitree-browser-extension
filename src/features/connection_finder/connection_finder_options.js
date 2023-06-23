/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isConnectionFinder } from "../../core/pageType";

registerFeature({
  name: "Connection Finder Options",
  id: "connectionFinderOptions",
  description: "Adds features to the Connection Finder page.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isConnectionFinder],
  options: [
    {
      id: "connectionFinderTable",
      type: OptionType.CHECKBOX,
      label: "Add a button to create a table of all the people in the connection path",
      defaultValue: true,
    },
  ],
});
