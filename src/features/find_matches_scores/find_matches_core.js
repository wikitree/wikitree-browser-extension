/*
Created By: Ian Beacall (Beacall-6)

The parts of Find Matches Scores that the chat reuses ("does this person have duplicates?"):
loading the profiles behind a set of results, and ordering scored results. Kept free of
the feature's page start-up so importing it has no side effects.
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { PROFILE_FIELDS, buildProfiles } from "./find_matches_profiles";

/** getPeople keys per request. Each key also pulls in its nuclear family, so keep batches small. */
const BATCH_SIZE = 12;

/* -------------------------------------------------------------------- API loading ---- */

export async function fetchProfiles(appId, wtIds) {
  const raw = new Map();

  for (let index = 0; index < wtIds.length; index += BATCH_SIZE) {
    const batch = wtIds.slice(index, index + BATCH_SIZE);
    // nuclear:1 returns each profile's parents, spouses, children and siblings as further
    // entries in the same flat map, which is where the family evidence comes from.
    const [, , people] = await WikiTreeAPI.getPeople(appId, batch, PROFILE_FIELDS, {
      nuclear: 1,
      limit: 1000,
    });

    if (people && typeof people === "object") {
      for (const person of Object.values(people)) {
        if (person && person.Id) {
          raw.set(String(person.Id), person);
        }
      }
    }
  }

  return buildProfiles(raw, wtIds);
}

/* ------------------------------------------------------------------------ sorting ---- */

/** Best first. Rejects always sink, whatever else they have going for them. */
export function compareScored(left, right) {
  if (left.result.rejected !== right.result.rejected) {
    return left.result.rejected ? 1 : -1;
  }
  if (right.result.score !== left.result.score) {
    return right.result.score - left.result.score;
  }
  return right.result.points - left.result.points;
}
