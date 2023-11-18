/*
Created By: Rob Pavey
*/

import fs from "fs";

function doesFolderExist(path) {
  return fs.existsSync(path);
}

function createFolderPathIfNeeded(path) {
  if (!fs.existsSync(path)) {
    try {
      fs.mkdirSync(path);
    } catch (error) {
      console.log("createFolderPathIfNeeded: error creating: " + path);
      console.log(error);
      return false;
    }
  }

  return true;
}

function writeFile(path, text) {
  try {
    fs.writeFileSync(path, text, { mode: 0o644 });
  } catch (err) {
    // An error occurred
    console.log("Failed to write output file: " + path);
    console.error(err);
    return false;
  }
  return true;
}

function checkParameters(parameters) {
  const testName = parameters.testName;
  if (!testName) {
    console.log("Parameter check failed. testName missing.");
    return false;
  }

  if (testName.search(/\-/) == -1) {
    console.log("Parameter check failed. testName should contain a dash.");
    return false;
  }

  return true;
}

function checkForRequiredFolders() {
  const requiredFolders = ["src", "scripts", "src/features", "src/features/agc", "src/features/agc/regression_data"];

  for (let folder of requiredFolders) {
    if (!doesFolderExist(folder)) {
      console.log("Not running in correct folder. Missing path: " + folder);
      return false;
    }
  }

  return true;
}

function createTestFolder(testName) {
  const testPath = "src/features/agc/regression_data/" + testName;

  if (doesFolderExist(testPath)) {
    console.log("Path already exists: " + testPath);
  }

  if (!createFolderPathIfNeeded(testPath)) return false;

  return true;
}

function createTestFiles(testName) {
  const testPath = "src/features/agc/regression_data/" + testName;

  const inputFilePath = testPath + "/" + testName + "_input.txt";
  const refFilePath = testPath + "/" + testName + "_refout.txt";

  // write blank input file
  if (!writeFile(inputFilePath, "")) {
    return false;
  }

  // write blank ref file
  if (!writeFile(refFilePath, "")) {
    return false;
  }

  return true;
}

async function createAgcTestDir() {
  let parameters = {
    testName: "",
  };

  if (process.argv.length > 2) {
    let testName = process.argv[2];
    parameters.testName = testName.toLowerCase();
  }

  console.log("Creating new AGC test case directory.");
  console.log("  testName is '" + parameters.testName + "'");

  // do some sanity checks
  if (!checkParameters(parameters)) {
    return;
  }

  // first double check that we are running in the correct folder
  if (!checkForRequiredFolders()) {
    return;
  }

  // Now create all the folders for the new site
  if (!createTestFolder(parameters.testName)) {
    console.log("Falied to created test folder");
    return;
  }

  // Now create all the files from the template files
  if (!createTestFiles(parameters.testName)) {
    console.log("Falied to created site files from templates");
    return;
  }
}

createAgcTestDir();
