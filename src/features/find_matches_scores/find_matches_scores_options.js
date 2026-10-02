/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isFindMatchesResults } from "../../core/pageType";

registerFeature({
  name: "Find Matches Scores",
  id: "findMatchesScores",
  description:
    "Adds a scored, sortable table to the Find Matches results page. Each possible match is " +
    "compared with the profile you searched for on dates, places, parents, spouses and children, " +
    "using the same evidence weights as the " +
    '<a href="https://apps.wikitree.com/apps/beacall6/duplicates/" target="_blank">Duplicate Finder</a> app, ' +
    "and the results are put in order of how likely they are to be the same person. Click a row to see " +
    "what matched and what did not.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isFindMatchesResults],
});
