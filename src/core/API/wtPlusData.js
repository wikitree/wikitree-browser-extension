/*
Created By: Aleš Trtnik (Trtnik-2)
*/

/********************************************************************
  dataTablesLoad     Loads all definitions from the storage
    Parameters:
      callerID:         Prefarably unique name of the caller: "WhatLinksHere"
    Returns:            none
*******************************************************************/

export const dataTables = {};

export const dataTableTemplateFindByName = (name) => {
  return dataTables.templates.filter((item) => item.name.toUpperCase() === name.toUpperCase())[0];
};

const readLocalStorage = async (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        //reject();  // will cause an exception for undefined
        resolve(null);
      } else {
        resolve(result[key]);
      }
    });
  });
};

function processdata(json, d, name) {
  dataTables.templates = json.templates;
  dataTables.cleanup = json.cleanup;
  if (!dataTables.cleanup) {
    dataTables.cleanup = [];
  }
  dataTables.locations = json.locations;
  if (!dataTables.locations) {
    dataTables.locations = [];
  }
  dataTables.sources = json.sources;
  if (!dataTables.sources) {
    dataTables.sources = [];
  }
  dataTables.dataVersion = d;
  console.log(
    name +
      ": " +
      dataTables.dataVersion +
      ", " +
      dataTables.templates.length +
      " templates" +
      ", " +
      dataTables.cleanup.length +
      " cleanup" +
      ", " +
      dataTables.locations.length +
      " locations" +
      ", " +
      dataTables.sources.length +
      " sources."
  );
}

export const dataTablesLoad = (callerID) => {
  // Loading of template definition From Storage
  if (dataTables.dataVersion) {
    return Promise.resolve();
  } else {
    return readLocalStorage("alltemplates").then((json) => {
      if (json && json.version) {
        // Is in storage
        const d = new Date(json.version);
        processdata(json, d, "Storage");
      } else {
        // Not in storage
        dataTables.dataVersion = new Date("2000-01-01T00:00:00+01:00");
      }
      // Loading of template definition From Extension
      return fetch(chrome.runtime.getURL("features/wtPlus/templatesExp.json"))
        .then((resp) => resp.json())
        .then((jsonData) => {
          const d = new Date(jsonData.version);
          if (d.getTime() > dataTables.dataVersion.getTime()) {
            //if (d.getTime() > dataTables.dataVersion) {
            // Extension definition is newer
            processdata(jsonData, d, "Extension");
            chrome.storage.local.set({ alltemplates: jsonData });
          }
          if (dataTables.dataVersion.getTime() < new Date().getTime() - 6 * 3600 * 1000) {
            //if (dataTables.dataVersion < new Date().getTime() - 6 * 3600 * 1000) {
            // Loading of template definition From Web
            return fetch(`https://plus.wikitree.com/chrome/templatesExp.json?appid=${callerID}`)
              .then((resp) => resp.json())
              .then((jsonData) => {
                const d = new Date(jsonData.version);
                if (d.getTime() > dataTables.dataVersion.getTime()) {
                  //if (d.getTime() > dataTables.dataVersion) {The above is not working for Kay.
                  // Web definition is newer
                  processdata(jsonData, d, "Web");
                  chrome.storage.local.set({ alltemplates: jsonData });
                  /*
                } else {
                  dataTables.dataVersion = new Date().getTime();
                  chrome.storage.local.set({ alltemplates: jsonData });
*/
                }
              });
          } else {
            return Promise.resolve();
          }
        });
    });
  }
};
