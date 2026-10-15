/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isWikiEdit } from "../../core/pageType";

registerFeature({
  name: "Find and Replace",
  id: "findAndReplace",
  description:
    "Find and replace text in the edit box of profiles, free-space pages and other wiki pages, with the Enhanced Editor on or off. " +
    "Search for plain text, wildcards (? any character, # any digit, * any characters) or regular expressions. " +
    "Open it with the toolbar button, from the edit menu, or with Ctrl+Shift+F (⌘⇧F on a Mac).",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isWikiEdit],
});
