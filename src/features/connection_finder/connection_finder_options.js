/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isConnectionFinder } from "../../core/pageType";

registerFeature({
  name: "Connection Finder Options",
  id: "connectionFinderOptions",
  description:
    "Adds features to the Connection Finder page, " +
    "including a button to create a table of the people in the connection path " +
    "and a button to display summaries of the surnames in the connection path.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isConnectionFinder],
  options: [
    {
      id: "branches",
      type: OptionType.CHECKBOX,
      label: "Add branch details to heading (e.g. ': 4 branches (4-7-5-10)')",
      defaultValue: true,
    },
    {
      id: "surnameSummaries",
      type: OptionType.CHECKBOX,
      label: "Add a button to display summaries of the surnames in the connection path",
      defaultValue: true,
    },
  ],
});
