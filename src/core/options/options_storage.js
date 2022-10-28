import { getDefaultOptionValuesForFeature, getFeatureData, features } from "./options_registry"

/*
This function returns a Promise so it can be used in a couple of different ways:

1. Using then:

  checkIfFeatureEnabled("agc").then((result) => {
    if (result) {
      initAgc();
    }
  });

2. Using await:

  if (await checkIfFeatureEnabled("agc") {
    initAgc();
  });
*/

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
      chrome.storage.sync.get(itemKey,
        function (items) {
          let result = items[itemKey];

          if (result === undefined) {
            // no saved value for enabled yet. Use default.
            result = (featureData.defaultValue) ? true : false;
          }

          resolve(result);
        }
      );
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
        keysWithDefaults[feature.id] = (feature.defaultValue) ? true : false;
      }

      chrome.storage.sync.get(keysWithDefaults,
        function (items) {
          resolve(items);
        }
      );
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

      chrome.storage.sync.get(itemKey,
        function (items) {
          let loadedOptions = items[itemKey];

          let optionsToReturn = loadedOptions;

          if (defaultValues) {
            if (loadedOptions) {
              // use the spread operator to combine the default options and the loaded ones
              optionsToReturn = { ...defaultValues, ...loadedOptions }; 
            }
            else {
              optionsToReturn = defaultValues;
            }
          }

          resolve(optionsToReturn);
        }
      );
    } catch (ex) {
      reject(ex);
    }
  });
}

export { checkIfFeatureEnabled, getFeatureOptions, getEnabledStateForAllFeatures };