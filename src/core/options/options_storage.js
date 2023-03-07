import { getDefaultOptionValuesForFeature, getFeatureData, features } from "./options_registry";
import {
  isWikiPage,
  isWikiEdit,
  isProfilePage,
  isProfileEdit,
  isSpacePage,
  isSpaceEdit,
  isCategoryPage,
  isCategoryEdit,
  isTemplatePage,
  isTemplateEdit,
  isHelpPage,
  isHelpEdit,
  isOtherPage,
  isOtherEdit,
  isSpecialPage,
  pageG2G,
} from "../common";

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
      chrome.storage.sync.get(itemKey, function (items) {
        let result = items[itemKey];

        if (result === undefined) {
          // no saved value for enabled yet. Use default.
          result = featureData.defaultValue ? true : false;
        }

        if (result && featureData.pages) {
          result = false;
          // feature is enabled, check if aplicable to the page URL.
          featureData.pages.forEach((element) => {
            if (!result) {
              switch (element) {
                case "AllPages": // all pages on wikitree
                  result = true;
                  break;
                case "AllWikiPages":
                  result = isWikiPage;
                  break;
                case "AllEditPages":
                  result = isWikiEdit;
                  break;
                case "ProfilePage":
                  result = isProfilePage;
                  break;
                /*
                  case "ProfileUser":
                    result = true;
                    break
                  case "ProfileMember":
                    result = true;
                    break
*/
                case "ProfileEdit":
                  result = isProfileEdit;
                  break;
                case "SpacePage":
                  result = isSpacePage;
                  break;
                case "SpaceEdit":
                  result = isSpaceEdit;
                  break;
                case "Category":
                  result = isCategoryPage;
                  break;
                case "CategoryEdit":
                  result = isCategoryEdit;
                  break;
                case "Template":
                  result = isTemplatePage;
                  break;
                case "TemplateEdit":
                  result = isTemplateEdit;
                  break;
                case "Help":
                  result = isHelpPage;
                  break;
                case "HelpEdit":
                  result = isHelpEdit;
                  break;
                case "OtherWiki":
                  result = isOtherPage;
                  break;
                case "OtherEdit":
                  result = isOtherEdit;
                  break;
                case "G2G":
                  result = pageG2G;
                  break;
                case "WatchList":
                  result = true;
                  break;
                case "BadgeHoldes":
                  result = true;
                  break;
                case "BadgeUser":
                  result = true;
                  break;
                case "BadgeUserEdit":
                  result = true;
                  break;
              }
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

        let optionsToReturn = loadedOptions;

        if (defaultValues) {
          if (loadedOptions) {
            // use the spread operator to combine the default options and the loaded ones
            optionsToReturn = { ...defaultValues, ...loadedOptions };
          } else {
            optionsToReturn = defaultValues;
          }
        }

        resolve(optionsToReturn);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

export { checkIfFeatureEnabled, getFeatureOptions, getEnabledStateForAllFeatures };
