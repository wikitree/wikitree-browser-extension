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

export const dataTablesLoad = (callerID) => {
  // Loading of template definition From Storage
  if (!dataTables.dataVersion) {
    chrome.storage.local.get(["alltemplates"], function (a) {
      if (a.alltemplates && a.alltemplates.version) {
        // Is in storage
        dataTables.templates = a.alltemplates.templates;
        dataTables.cleanup = a.alltemplates.cleanup;
        if (!dataTables.cleanup) {
          dataTables.cleanup = [];
        }
        dataTables.locations = a.alltemplates.locations;
        if (!dataTables.locations) {
          dataTables.locations = [];
        }
        dataTables.sources = a.alltemplates.sources;
        if (!dataTables.sources) {
          dataTables.sources = [];
        }
        dataTables.dataVersion = new Date(a.alltemplates.version);
        console.log(
          "Storage: " +
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
      } else {
        // Not in storage
        dataTables.dataVersion = new Date("2000-01-01T00:00:00+01:00");
      }
      // Loading of template definition From Extension
      fetch(chrome.runtime.getURL("features/wtPlus/templatesExp.json"))
        .then((resp) => resp.json())
        .then((jsonData) => {
          const d = new Date(jsonData.version);
          if (d.getTime() > dataTables.dataVersion.getTime()) {
            // Extension definition is newer
            dataTables.templates = jsonData.templates;
            dataTables.cleanup = jsonData.cleanup;
            if (!dataTables.cleanup) {
              dataTables.cleanup = [];
            }
            dataTables.locations = jsonData.locations;
            if (!dataTables.locations) {
              dataTables.locations = [];
            }
            dataTables.sources = jsonData.sources;
            if (!dataTables.sources) {
              dataTables.sources = [];
            }
            dataTables.dataVersion = d;
            console.log(
              "Extension: " +
                dataTables.dataVersion +
                ", " +
                dataTables.templates.length +
                " templates." +
                ", " +
                dataTables.cleanup.length +
                " cleanup." +
                ", " +
                dataTables.locations.length +
                " locations" +
                ", " +
                dataTables.sources.length +
                " sources."
            );
            chrome.storage.local.set({ alltemplates: jsonData });
          }
          if (dataTables.dataVersion.getTime() < new Date().getTime() - 6 * 3600 * 1000) {
            // Loading of template definition From Web
            fetch(`https://plus.wikitree.com/chrome/templatesExp.json?appid=${callerID}`)
              .then((resp) => resp.json())
              .then((jsonData) => {
                const d = new Date(jsonData.version);
                if (d.getTime() > dataTables.dataVersion.getTime()) {
                  // Web definition is newer
                  dataTables.templates = jsonData.templates;
                  dataTables.cleanup = jsonData.cleanup;
                  if (!dataTables.cleanup) {
                    dataTables.cleanup = [];
                  }
                  dataTables.locations = jsonData.locations;
                  if (!dataTables.locations) {
                    dataTables.locations = [];
                  }
                  dataTables.sources = jsonData.sources;
                  if (!dataTables.sources) {
                    dataTables.sources = [];
                  }
                  dataTables.dataVersion = d;
                  console.log(
                    "Web: " +
                      dataTables.dataVersion +
                      ", " +
                      dataTables.templates.length +
                      " templates." +
                      ", " +
                      dataTables.cleanup.length +
                      " cleanup." +
                      ", " +
                      dataTables.locations.length +
                      " locations" +
                      ", " +
                      dataTables.sources.length +
                      " sources."
                  );
                  chrome.storage.local.set({ alltemplates: jsonData });
                }
              });
          }
        });
    });
  }
};
