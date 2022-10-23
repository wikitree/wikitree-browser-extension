import "./register_feature_options";
import { features } from "../core/options/options_registry"
import { readdirSync } from "fs";

describe("Feature configuration", () => {
  for (const feature of features) {
    it(`Feature "${feature.id}" provides valid configuration`, () => {
      expect(feature.id).toBeTruthy();
      expect(feature.name).toBeTruthy();
      expect(feature.description).toBeTruthy();
    });
  }
});

describe("Feature folders", () => {
  // Folders containing a feature with a different id than the folder name.
  const legacyIds = {
    printerfriendly: "printerFriendly",
    "wt+": "wtplus",
    spacepreview: "spacePreviews",
    sourcepreview: "sPreviews",
  };

  const featureFolders = readdirSync("src/features", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const featureIds = features.map((feature) => feature.id);

  for (const folder of featureFolders) {
    it(`Folder "${folder}" contains a registered feature`, () => {
      const expectedId = legacyIds[folder] || folder;
      expect(featureIds).toContain(expectedId);
    });
  }
});
