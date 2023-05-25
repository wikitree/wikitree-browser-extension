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

const wtAPICall = (url) => {
  return fetch(`https://plus.wikitree.com/function/${url}&format=json`).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw response.statusText;
    }
  });
};
