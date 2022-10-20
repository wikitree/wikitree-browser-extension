import { getDefaultOptionValuesForFeature } from "../../core/options/options_registry.mjs"

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
          console.log("getFeatureOptions, items:");
          console.log(items);

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

          console.log("getFeatureOptions, featureId is: " + featureId + ", loadedOptions:");
          console.log(loadedOptions);
          console.log("getFeatureOptions, optionsToReturn:");
          console.log(optionsToReturn);

          resolve(optionsToReturn);
        }
      );
    } catch (ex) {
      reject(ex);
    }
  });
}

export { getFeatureOptions };