/*
Created By: Aleš Trtnik (Trtnik-2)
*/

/********************************************************************
  wtAPIProfileSearch    Retrieve profile IDs based on the query.
    Parameters:
      callerID:         Prefarably unique name of the caller: "RandomProfile"
      query:            Words to search for: "Oak Hill Alabama"
      params: {         Optional parameters.
        maxProfiles:    Default: 10000
        pageSize:       Default: 100000
        pageIdx:        Default: 0
      }  
    Returns:            JS object
      {

        // For successful find
        "response": {
          "found": 195,
          "more": true,
          "profiles": [
            151444,
            ...
          ]
        }

        // For no match
        "response": {
            "found": 0
        }
      }
*******************************************************************/

// https://plus.wikitree.com/function/WTWebProfileSearch/apiExtRandomProfile.json?Query=Oak%20Hill%20Alabama&MaxProfiles=&Format=json
export const wtAPIProfileSearch = (callerID, query, params) => {
  let s = "";
  if (params) {
    s += "&MaxProfiles=" + (params.maxProfiles || 10000);
    if (params.pageSize) s += "&pageSize=" + params.pageSize;
    if (params.pageIdx) s += "&pageIdx=" + params.pageIdx;
  }
  return wtAPICall(`WTWebProfileSearch/apiExt${callerID}.json?Query=${query}${s}`);
};

/********************************************************************
  wtAPICatCIBSearch     Retrieve CategoryInfoBox categories
    Parameters:
      callerID:         Prefarably unique name of the caller: "CategoryPicker"
      cibType:          Type of CategoryInfoBox: "Cemetery" 
                        Recognized values: cemetery, cemeteryGroup, location, nameStudy, category
                        TopLevel is returned as (topLevel: true) in location and category searches so they can be excluded if necessary. 
      query:            Words to search for: "Oak Hill Alabama"
    Returns:            JS object:
      {

        // For successful find
        "response": {
            "found": 10,
            "categories": [
            {
                "category": "Oak Hill Cemetery, Atmore, Alabama",
                "name": "Oak Hill Cemetery",
                "parent": "Escambia County, Alabama, Cemeteries",
                "gParent": "Alabama, Cemeteries",
                "ggParent": "United States, Cemeteries",
                "location": "Atmore, Alabama",
                "locationParent": "Escambia County, Alabama"
            },
            ...
            ]
        }

        // For no match
        "response": {
            "found": 0
        }
      }
*******************************************************************/

// https://plus.wikitree.com/function/wtCatCIBSearch/apiExtCategoryPicker.json?Query=Oak%20Hill%20Alabama&cib=Cemetery&Format=json
export const wtAPICatCIBSearch = (callerID, cibType, query) =>
  wtAPICall(`wtCatCIBSearch/apiExt${callerID}.json?Query=${query}&cib=${cibType}`);

// *******************************************************************
// Base call to WikiTree+
// *******************************************************************

/*
const wtAPICall = (url) => {
  return fetch(`https://plus.wikitree.com/function/${url}&format=json`).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw response.statusText;
    }
  });
};
*/

const wtAPICall = (url) => {
  // Create an instance of AbortController
  const controller = new AbortController();
  const signal = controller.signal;

  // Start a timer to abort the request if it takes longer than 8 seconds (8000 milliseconds)
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  return fetch(`https://plus.wikitree.com/function/${url}&format=json`, { signal })
    .then((response) => {
      // Clear the timeout if the request completes in time
      clearTimeout(timeoutId);

      if (response.ok) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .catch((error) => {
      // Clear the timeout in case of an error
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        // Handle fetch timeout
        console.error("The request was aborted due to a timeout.");
        // Return a custom error object or response to indicate a timeout occurred
        return { timeout: true, message: "WT+ timeout" };
      } else {
        // Handle other errors
        throw error;
      }
    });
};
