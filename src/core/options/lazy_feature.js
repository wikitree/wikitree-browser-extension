import { checkIfFeatureEnabled } from "./options_storage";

/*
Loads a feature's module only where it can run: the feature is enabled and its `pages` match this page
(checkIfFeatureEnabled checks both). The module still runs its own shouldInitializeFeature() when it loads.

`load` is a function that calls import(), so the feature's code becomes its own chunk instead of part of
content.js, which every WikiTree page loads.
*/
export function loadFeatureWhereEnabled(featureId, load) {
  return checkIfFeatureEnabled(featureId)
    .then((enabled) => (enabled ? load() : null))
    .catch((error) => {
      console.error(`wbe: failed to load ${featureId}`, error);
      return null;
    });
}
