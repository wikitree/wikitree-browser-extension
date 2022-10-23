import { getDefaultOptionValuesForFeature } from "./options_registry"

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

      const itemKey = featureId;
      chrome.storage.sync.get(itemKey,
        function (items) {
          const result = items[itemKey];

          resolve(result);
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

export { checkIfFeatureEnabled, getFeatureOptions };