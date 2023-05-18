/*
Created By: Ian Beacall (Beacall-6)
*/

import { isWikiPage, isWikiEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const whatLinksHere = {
  name: "What Links Here",
  id: "whatLinksHere",
  description:
    "Adds a 'What Links Here' button to the Find menu. Click to go to the What Links Here page;" +
    " right-click to copy wiki markdown for links to what links to the page.",
  category: "Links",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Aleš Trtnik", wikitreeid: "Trtnik-2" }],
  defaultValue: true,
  pages: [isWikiPage, isWikiEdit],
  options: [
    {
      id: "whatLinksHereSection",
      type: OptionType.CHECKBOX,
      label: "Add a 'What Links Here' section to wiki pages",
      defaultValue: false,
    },
  ],
};

registerFeature(whatLinksHere);
