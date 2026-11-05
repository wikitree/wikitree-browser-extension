/*
Created By: Ian Beacall (Beacall-6)

Ranking the Find Matches results by how likely each one is to be the same person.

WikiTree's Special:FindMatches results are ordered by nothing in particular, and the page
itself shows too little to tell a real duplicate from a stranger who shares a name and a
decade. This fetches the full profiles behind the results, scores each against the profile
being searched using the Duplicate Finder's evidence weights (see match_scoring.js), and
puts them in a sorted table above the original list.

The original list is left alone.
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
import { foldText } from "./match_locations";
import { scorePair } from "./match_scoring";
import { collectWtIds, readResultBlocks } from "./find_matches_page";
import { compareScored, fetchProfiles } from "./find_matches_core";
import { mountPanel, profileFetchNotice, renderError, renderTable, renderTransientNotice } from "./find_matches_table";

const WBE_FMS_APP_ID = "WBE_find_matches_scores";

shouldInitializeFeature("findMatchesScores").then(async (result) => {
  if (!result) {
    return;
  }

  import("./find_matches_scores.css");
  await init();
});

async function init() {
  const blocks = readResultBlocks();
  if (!blocks.length) {
    return;
  }

  const panels = blocks.map((block) => mountPanel(block));

  let profilesById;
  try {
    profilesById = await fetchProfiles(WBE_FMS_APP_ID, collectWtIds(blocks));
  } catch (error) {
    console.error("[findMatchesScores] fetch error", error);
    panels.forEach((panel) => renderError(panel, error?.message || "Could not load the profiles to score."));
    return;
  }

  blocks.forEach((block, index) => {
    const anchor = profilesById.get(foldText(block.anchorWtId));
    if (!anchor) {
      // Nothing to score against. Say so briefly, then take the panel away rather than
      // leaving a failure notice sitting over a page that is working perfectly well.
      renderTransientNotice(panels[index], profileFetchNotice());
      return;
    }

    const scored = block.candidates
      .map((candidate) => {
        const profile = profilesById.get(foldText(candidate.wtId));
        return profile ? { ...candidate, profile, result: scorePair(anchor, profile) } : null;
      })
      .filter(Boolean)
      .sort(compareScored);

    // A candidate can fail to load: private profiles, and IDs that have since been merged
    // away, both come back empty. They stay in WikiTree's own list below, so say how many
    // are missing rather than letting the table quietly be shorter than the list.
    const unscored = block.candidates
      .filter((candidate) => !profilesById.has(foldText(candidate.wtId)))
      .map((candidate) => candidate.wtId);

    renderTable(panels[index], anchor, scored, unscored);
  });
}
