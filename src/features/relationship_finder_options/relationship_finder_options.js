/* Created By: Ian Beacall (Beacall-6) */
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { enhanceRelationshipResults, isRelationshipPage } from "./relationship_results";
import "./relationship_finder_options.css";

if (isRelationshipPage(window.location)) {
  shouldInitializeFeature("relationshipFinderOptions").then(async (enabled) => {
    if (!enabled) return;
    const options = await getFeatureOptions("relationshipFinderOptions");
    enhanceRelationshipResults(document, options, (keys, fields) =>
      WikiTreeAPI.getPeople("WBE_relationshipFinderOptions", keys, fields)
    );
  });
}
