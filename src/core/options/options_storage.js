/*
Created By: Rob Pavey (Pavey-429)
*/

import { getDefaultOptionValuesForFeature, getFeatureData, features } from "./options_registry";

const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
const SHARED_AI_FEATURES = ["autoBio", "chat"];
const SHARED_AI_OPTION_IDS = [
  "aiProvider",
  "openAIKey",
  "openAIModel",
  "geminiKey",
  "geminiModel",
  "claudeKey",
  "claudeModel",
  "perplexityKey",
  "perplexityModel",
  "aiModel",
];

function isSharedAiFeature(featureId) {
  return SHARED_AI_FEATURES.includes(featureId);
}

function getSharedAiOptionStorageKeys() {
  return SHARED_AI_FEATURES.map((featureId) => `${featureId}_options`);
}

function extractSharedAiOptions(options = {}) {
  const extracted = {};
  SHARED_AI_OPTION_IDS.forEach((optionId) => {
    const value = options?.[optionId];
    if (value !== undefined && value !== null && value !== "") {
      extracted[optionId] = value;
    }
  });
  return extracted;
}

function collectLegacySharedAiOptions(storageItems = {}) {
  return getSharedAiOptionStorageKeys().reduce((merged, itemKey) => {
    return { ...merged, ...extractSharedAiOptions(storageItems?.[itemKey] || {}) };
  }, {});
}
/*
This function returns a Promise so it can be used in a couple of different ways:

1. Using then:

  shouldInitializeFeature("agc").then((result) => {
    if (result) {
      initAgc();
    }
  }); 

2. Using await:

  if (await shouldInitializeFeature("agc") {
    initAgc();
  });
*/

async function shouldInitializeFeature(featureId) {
  const result = await checkIfFeatureEnabled(featureId);
  if (result) {
    if (document.documentElement.getAttribute(`data-wbe-${featureId}`)) {
      // prevent each feature from initializing more than once in a single window
      document.documentElement.setAttribute(
        "data-wbe-conflict",
        `${document.documentElement.getAttribute("data-wbe-conflict") ?? Date.now().toString()} ${featureId}`
      );
      return false;
    } else {
      document.documentElement.setAttribute(`data-wbe-${featureId}`, Date.now().toString());
      return true;
    }
  }
  return false;
}

async function checkIfFeatureEnabled(featureId) {
  return new Promise((resolve, reject) => {
    try {
      if (!featureId) {
        reject(new Error("No featureId provided"));
      }

      const featureData = getFeatureData(featureId);
      if (!featureData) {
        reject(new Error(`Invalid featureId: ${featureId}`));
      }

      const itemKey = featureId;
      chrome.storage.sync.get(itemKey, function (items) {
        let result = items[itemKey];

        if (result === undefined) {
          // no saved value for enabled yet. Use default.
          result = featureData.defaultValue ? true : false;
        }

        // checks for correct page type
        if (result && featureData.pages) {
          result = false;
          // feature is enabled, check if aplicable to the page URL.
          featureData.pages.forEach((element) => {
            if (!result) {
              result = element;
            }
          });
        }

        resolve(result);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/*
This function returns a Promise so it can be used in a couple of different ways:

1. Using then:

  getEnabledStateForAllFeatures().then((featuresEnabled) => {
    ...
  });

2. Using await:

  const featuresEnabled = await getEnabledStateForAllFeatures();
*/

async function getEnabledStateForAllFeatures() {
  return new Promise((resolve, reject) => {
    try {
      let keysWithDefaults = {};

      for (let feature of features) {
        keysWithDefaults[feature.id] = feature.defaultValue ? true : false;
      }

      chrome.storage.sync.get(keysWithDefaults, function (items) {
        resolve(items);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/*
  const options = await getFeatureOptions("agc");

  This function returns a Promise so it can be used in a couple of different ways:

1. Using then:

  getFeatureOptions("agc").then((result) => {
    const options = result;
    ...
  });

2. Using await:

  const options = await getFeatureOptions("agc");
*/
async function getFeatureOptions(featureId) {
  return new Promise((resolve, reject) => {
    try {
      if (!featureId) {
        reject(new Error("No featureId provided"));
      }

      let options = {};

      const itemKey = featureId + "_options";

      let defaultValues = getDefaultOptionValuesForFeature(featureId);

      chrome.storage.sync.get(itemKey, function (items) {
        let loadedOptions = items[itemKey];
        const savedLocalOptions = loadedOptions || {};

        let optionsToReturn = loadedOptions;

        if (defaultValues) {
          if (loadedOptions) {
            // use the spread operator to combine the default options and the loaded ones
            optionsToReturn = { ...defaultValues, ...loadedOptions };
          } else {
            optionsToReturn = defaultValues;
          }
        }

        if (!optionsToReturn) {
          optionsToReturn = {};
        }

        if (!isSharedAiFeature(featureId)) {
          resolve(optionsToReturn);
          return;
        }

        chrome.storage.sync.get([SHARED_AI_OPTIONS_KEY, ...getSharedAiOptionStorageKeys()], function (sharedItems) {
          const sharedOptions = sharedItems?.[SHARED_AI_OPTIONS_KEY] || {};
          const legacySharedOptions = collectLegacySharedAiOptions(sharedItems);
          const migratedSharedOptions = { ...legacySharedOptions, ...sharedOptions };
          let didMigrate = false;

          // One-time migration path from legacy autoBio/chat feature-local storage.
          for (const optionId of SHARED_AI_OPTION_IDS) {
            const sharedValue = sharedOptions[optionId];
            const localValue = legacySharedOptions[optionId] ?? savedLocalOptions[optionId];
            const sharedMissing = sharedValue === undefined || sharedValue === null || sharedValue === "";
            const localPresent = localValue !== undefined && localValue !== null && localValue !== "";

            if (sharedMissing && localPresent) {
              migratedSharedOptions[optionId] = localValue;
              didMigrate = true;
            }
          }

          const mergedOptions = { ...optionsToReturn, ...migratedSharedOptions };

          if (didMigrate) {
            chrome.storage.sync.set({ [SHARED_AI_OPTIONS_KEY]: migratedSharedOptions }, () => {
              resolve(mergedOptions);
            });
          } else {
            resolve(mergedOptions);
          }
        });
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

export { shouldInitializeFeature, checkIfFeatureEnabled, getFeatureOptions, getEnabledStateForAllFeatures };
