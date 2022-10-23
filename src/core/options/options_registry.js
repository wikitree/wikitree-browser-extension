

// an array of information about features and their options
// This is constructed by the features registering their options in register_feature_options.js
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

const OptionType = {
  GROUP: "group",
  TEXT_LINE: "textLine",
  CHECKBOX: "checkbox",
  RADIO: "radio",
  SELECT: "select",
  NUMBER: "number",
  COLOR: "color",
}

function fillDefaultValuesForOptions(defaultValues, options, useTestDefaults) {

  for (let option of options) {

    if (option.type == OptionType.GROUP) {
      if (option.options) {
        fillDefaultValuesForOptions(defaultValues, option.options, useTestDefaults);
      }
    } else if (option.type == OptionType.TEXT_LINE) {
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

export { registerFeature, features, getDefaultOptionValuesForFeature, OptionType };