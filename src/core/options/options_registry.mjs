// an array of information about features and there options
// This is constructed by the features registering in options_init.mjs
const features = [
];

function registerFeature(featureData) {
  features.push(featureData);
}

function getFeatureData(featureId) {
  for (let feature of features) {
    if (feature.id == featureId) {
      return feature;
    }
  }
}

function fillDefaultValuesForOptions(defaultValues, options, useTestDefaults) {

  for (let option of options) {

    if (option.type == "group") {
      if (option.options) {
        fillDefaultValuesForOptions(defaultValues, option.options, useTestDefaults);
      }
    } else if (option.type == "comment" || option.type == "textLine") {
      // no defaultValues property wanted for these
    } else {

      if (option.id) {
        let defaultValue = option.defaultValue;

        if (useTestDefaults && option.defaultTestValue !== undefined) {
          defaultValue = option.defaultTestValue;
        }

        if (defaultValue !== undefined) {
          defaultValues[option.id] = defaultValue;
        }
      }
    }
  }
}

function getDefaultOptionValuesForFeature(featureId, useTestDefaults = false) {

  const feature = getFeatureData(featureId);

  if (!feature) {
    return undefined;
  }

  const defaultValues = {};
  fillDefaultValuesForOptions(defaultValues, feature.options, useTestDefaults);

  return defaultValues;
}

export { registerFeature, features, getDefaultOptionValuesForFeature };