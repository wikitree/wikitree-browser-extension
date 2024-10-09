const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

// Configuration
const featuresDir = path.join(__dirname, "../src/features");
const srcDir = path.join(__dirname, "../src");
const contentFile = path.join(srcDir, "content.js");
const registerOptionsFile = path.join(featuresDir, "register_feature_options.js");

// User Inputs using yargs
const argv = yargs
  .option("featureName", {
    alias: "f",
    description: "Name of the new feature in snake_case",
    type: "string",
    demandOption: true,
  })
  .option("authorName", {
    alias: "a",
    description: "Name of the author",
    type: "string",
    demandOption: true,
  })
  .option("authorId", {
    alias: "i",
    description: "ID of the author",
    type: "string",
    demandOption: true,
  })
  .option("category", {
    alias: "c",
    description: "Category of the feature",
    type: "string",
    demandOption: true,
  })
  .option("pageTypes", {
    alias: "p",
    description: "Comma-separated list of page types",
    type: "string",
    demandOption: true,
  })
  .help()
  .alias("help", "h").argv;

const { featureName, authorName, authorId, category, pageTypes } = argv;
const pagesArray = pageTypes.split(",").map((page) => page.trim());
const pageTypesImport = pagesArray.join(", ");

const featureDir = path.join(featuresDir, featureName);
const camelFeatureName = featureName
  .split("_")
  .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
  .join("");
const humanReadableFeatureName = featureName
  .split("_")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");

// Create Feature Directory and Files
const createFeatureFiles = () => {
  if (!fs.existsSync(featureDir)) {
    fs.mkdirSync(featureDir);
  }

  const files = [
    {
      filename: `${featureName}.js`,
      content: `/*
Created By: ${authorName} (${authorId})
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("${camelFeatureName}").then((result) => {
  if (result) {
    init();
  }
});
`,
    },
    {
      filename: `${featureName}_options.js`,
      content: `/*
Created By: ${authorName} (${authorId})
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { ${pageTypesImport} } from "../../core/pageType";

registerFeature({
  name: "${humanReadableFeatureName}",
  id: "${camelFeatureName}",
  description: "",
  category: "${category}",
  creators: [{ name: "${authorName}", wikitreeid: "${authorId}" }],
  contributors: [],
  defaultValue: false,
  pages: [${pagesArray.map((page) => ` ${page}`).join(",")}],
});
`,
    },
    {
      filename: `${featureName}.css`,
      content: `/* Styles for ${camelFeatureName} feature */
`,
    },
  ];

  files.forEach(({ filename, content }) => {
    const filePath = path.join(featureDir, filename);
    fs.writeFileSync(filePath, content);
  });

  console.log(`Feature files for '${featureName}' created successfully.`);
};

// Update content.js
const updateContentFile = () => {
  const importStatement = `import "./features/${featureName}/${featureName}";\n`;
  const marker = "/* MARKER: Default place for new features. Move these to a more appropriate place.*/";

  let content = fs.readFileSync(contentFile, "utf8");
  const index = content.indexOf(marker);
  if (index !== -1) {
    content = content.slice(0, index + marker.length) + "\n" + importStatement + content.slice(index + marker.length);
    fs.writeFileSync(contentFile, content);
    console.log(`Updated '${contentFile}' with new feature import.`);
  } else {
    console.error("Marker not found in content.js");
  }
};

// Update register_feature_options.js
const updateRegisterOptionsFile = () => {
  const importStatement = `import "./${featureName}/${featureName}_options";`;
  const marker = "/* MARKER: Default place for registering feature options */";

  let content = fs.readFileSync(registerOptionsFile, "utf8");
  const index = content.indexOf(marker);
  if (index !== -1) {
    const lines = content.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line === marker);

    // Extract existing feature imports following the marker
    let featureImports = lines.slice(startIndex + 1).filter((line) => line.startsWith("import "));

    // Add the new feature import and sort alphabetically
    featureImports.push(importStatement);
    featureImports.sort((a, b) => a.localeCompare(b));

    // Combine all the parts back together, keeping the rest of the file intact
    const newContent = [
      ...lines.slice(0, startIndex + 1),
      ...featureImports,
      ...lines.slice(startIndex + 1 + featureImports.length - 1),
    ].join("\n");

    fs.writeFileSync(registerOptionsFile, newContent);
    console.log(`Updated '${registerOptionsFile}' with new feature options import.`);
  } else {
    console.error("Marker not found in register_feature_options.js");
  }
};

// Run the script
createFeatureFiles();
updateContentFile();
updateRegisterOptionsFile();
console.log("Feature creation complete.");
