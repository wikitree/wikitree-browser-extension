import { getFeatureData } from "./options_registry";

export function isFeatureEnabledForPage(featureId) {
  const featureData = getFeatureData(featureId);
  const defaultEnabled = featureData?.defaultValue !== undefined ? Boolean(featureData.defaultValue) : true;

  return new Promise((resolve) => {
    chrome.storage.sync.get(featureId, (items) => {
      let enabled = items?.[featureId];
      if (enabled === undefined) {
        enabled = defaultEnabled;
      }

      if (enabled && Array.isArray(featureData?.pages) && featureData.pages.length) {
        enabled = featureData.pages.some(Boolean);
      }

      resolve(Boolean(enabled));
    });
  });
}
