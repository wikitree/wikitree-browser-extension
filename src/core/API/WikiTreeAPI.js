/*
 * WikiTreeAPI.js
 *
 * Provide a "Person" object where data is gathered from the WikiTree API.
 * We use the WikiTree API action "getPerson" to retrieve the profile data and then store it in object fields.
 *
 */

// Put our functions into a "WikiTreeAPI" namespace.
export const WikiTreeAPI = {};

if (typeof API_URL === "undefined") {
  var API_URL = "https://api.wikitree.com/api.php";
}

const dateTokenCache = {};

/**
 * Serializes WikiTree fuzzy date using formatting string
 * @param  {object}  person Person object received from WikiTree API
 * @param  {string}  fieldName Name of the fuzzy date to be serialized, possible values: `BirthDate`, `DeathDate`,
 *                      `marriage_date` (if 'person' is a 'Spouse')
 * @param  {object}  options object containing foloowing options
 *                      * {string} [formatString="MMM DD, YYYY"]
 *                      * {boolean} [withCertainty=true]
 * @return {string} Serialized date
 */
window.wtDate = function (person, fieldName, options = {}) {
  const MONTHS = [
    // just to keep it more compact and not too long (more than 120 characters)
    ...["January", "February", "March", "April", "May", "June"],
    ...["July", "August", "September", "October", "November", "December"],
  ];

  const CERTAINTY_MAP = { guess: "about", before: "before", after: "after" }; // '' & 'certain' will produce ''

  const DEFAULT_OPTIONS = { formatString: "MMM DD, YYYY", withCertainty: true };
  options = { ...DEFAULT_OPTIONS, ...options };
  let tokens = [];
  function tokenize(formatString) {
    if (dateTokenCache[formatString]) return dateTokenCache[formatString];

    let prev = null;

    for (let letter of formatString) {
      if (prev !== letter && ("DMY".includes(prev) || "DMY".includes(letter))) {
        // prev and letter are different and one of them is one on D|M|Y
        tokens[tokens.length] = letter;
      } else if (
        (!"DMY".includes(prev) && !"DMY".includes(letter)) || // both prev and letter are not one of D|M|Y
        (prev === letter && "DMY".includes(letter)) || // prev and letter are same and one of D|M|Y
        (!"DMY".includes(letter) && (prev !== letter || !"DMY".includes(prev)))
      ) {
        tokens[tokens.length - 1] += letter;
      }
      prev = letter;
    }

    dateTokenCache[formatString] = tokens;
    return tokens;
  }

  tokens = tokenize(options.formatString);

  const prop = person?.[fieldName];

  if (!prop || prop === "0000-00-00") {
    switch (fieldName) {
      case "BirthDate":
        return person?.["BirthDateDecade"];
      case "DeathDate":
        return person?.["DeathDateDecade"];
      default:
        return "[unknown]";
    }
  }

  const [day, month, year] = prop
    .split("-")
    .reverse()
    .map((x) => parseInt(x));

  if (month === 0) {
    // month is unknown, rest doesn't makes sense
    tokens = tokens.filter((token) => token.includes("Y"));
  }

  tokens = tokens
    .map((token) => {
      if (!"DMY".includes(token[0])) return token;

      return Object({
        D: day ? day : null,
        DD: day ? String(day).padStart(2, "0") : null,
        M: month ? month : null,
        MM: month ? String(month).padStart(2, "0") : null,
        MMM: month ? MONTHS[month - 1].slice(0, 3) : null,
        MMMM: month ? MONTHS[month - 1] : null,
        YYYY: year ? String(year).padStart(4, "0") : null,
      })[token];
    })
    .filter((token) => token !== null);

  const serialized = tokens.join("").replaceAll(" ,", ","); // solves one of many possible issues when the day is unknown

  const certainty = options.withCertainty ? `${CERTAINTY_MAP?.[person?.DataStatus[fieldName]] || ""} ` : "";

  return `${certainty}${serialized}`;
};

/**
 * Serializes WikiTree complete name
 * @param  {object}  person Person object received from WikiTree API
 * @param  {object}  options object containing foloowing options
 *                      * {array[string]} fields - possible values: `FirstName`, `LastNameCurrent`, `LastNameAtBirth`,
 *                                                                  `MiddleName`, `Nickname`, `Prefix`, `Suffix`
 * @return {string} Serialized name
 */
window.wtCompleteName = function (person, options = {}) {
  const DEFAULT_OPTIONS = { fields: ["FirstName", "LastNameCurrent", "LastNameAtBirth", "MiddleName"] };
  options = { ...DEFAULT_OPTIONS, ...options };
  let lastName = null;
  const has = (field) => options.fields.includes(field);

  if (has("LastNameAtBirth") && has("LastNameCurrent")) {
    lastName =
      person?.LastNameCurrent !== person.LastNameAtBirth
        ? (person?.LastNameAtBirth ? `(${person.LastNameAtBirth}) ` : null) + person.LastNameCurrent
        : person?.LastNameAtBirth || null;
  } else if (has("LastNameAtBirth")) {
    lastName = person?.LastNameAtBirth ? person.LastNameAtBirth : person?.LastNameCurrent || null;
  } else if (has("LastNameCurrent")) {
    lastName = person?.LastNameCurrent ? person.LastNameCurrent : person?.LastNameAtBirth || null;
  }

  const result = [
    has("Prefix") && person?.Prefix ? person.Prefix : null,
    has("FirstName") && (person?.FirstName || person.RealName) ? person.FirstName || person.RealName : null,
    has("MiddleName") && person?.MiddleName ? person.MiddleName : null,
    has("Nickname") && person?.Nicknames ? `<span class="nickname">„${person.Nicknames}"</span>` : null,
    lastName,
    has("Suffix") && person?.Suffix ? person.Suffix : null,
  ];

  return result.filter((part) => part !== null).join(" ");
};

WikiTreeAPI.Person = class Person {
  constructor(data) {
    this._data = data;

    if (data.Parents) {
      for (const p in data.Parents) {
        this._data.Parents[p] = new WikiTreeAPI.Person(data.Parents[p]);
      }
    }
    if (data.Children) {
      for (const c in data.Children) {
        this._data.Children[c] = new WikiTreeAPI.Person(data.Children[c]);
      }
    }
  }

  // Basic "getters" for the data elements.
  getId() {
    return this._data.Id;
  }
  getName() {
    return this._data.Name;
  }
  getGender() {
    return this._data.Gender;
  }
  getBirthDate() {
    return this._data.BirthDate;
  }
  getBirthLocation() {
    return this._data.BirthLocation;
  }
  getDeathDate() {
    return this._data.DeathDate;
  }
  getDeathLocation() {
    return this._data.DeathLocation;
  }
  getChildren() {
    return this._data.Children;
  }
  getFatherId() {
    return this._data.Father;
  }
  getMotherId() {
    return this._data.Mother;
  }
  getDisplayName() {
    return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate;
  }
  getFirstName() {
    return this._data.FirstName;
  }
  getLastNameCurrent() {
    return this._data.LastNameCurrent;
  }
  getPhotoUrl() {
    if (this._data.PhotoData && this._data.PhotoData["url"]) {
      return this._data.PhotoData["url"];
    }
  }

  // Getters for Mother and Father return the Person objects, if there is one.
  // The getMotherId and getFatherId functions above return the actual .Mother and .Father data elements (ids).
  getMother() {
    if (this._data.Mother && this._data.Parents) {
      return this._data.Parents[this._data.Mother];
    }
  }
  getFather() {
    if (this._data.Father && this._data.Parents) {
      return this._data.Parents[this._data.Father];
    }
  }
}; // End Person class definition

/**
 *
 * @param {*} input
 * @returns {string} If the input is a string, return it as is, otherwise, if it is an array, return a comma separated string of its elements
 */
function commaSeparatedString(input) {
  return Array.isArray(input) ? input.join(",") : String(input ?? "");
}

/**
 * Return a promise for a person object with the given id.
 * An API call is made and the promise will construct a Person object from the result (if successful)
 *
 * @param {*} appId An application id (any string). 'WBE-' will be prepended to denotes it as a "Tree App"
 * @param {*} id The WikiTree ID of the person to retrieve
 * @param {*} fields an array or comma separated string of field names to return for each profile
 * @returns a promise that resolves to a Person object
 */
WikiTreeAPI.getPerson = async function (appId, id, fields) {
  // condLog("getPerson",appId, id, fields);
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getPerson",
    key: id,
    fields: commaSeparatedString(fields),
    resolveRedirect: 1,
  });
  return new WikiTreeAPI.Person(result[0].person);
};

/**
 * Return a promise for a profile object with the given id.
 * An API call is made and the promise will return the profile object from the result (if successful)
 *
 * @param {*} appId An application id (any string). 'WBE-' will be prepended to denotes it as a "Tree App"
 * @param {*} id The WikiTree ID of the person to retrieve
 * @param {*} fields an array or comma separated string of field names to return for each profile
 * @param {*} options an option object which can contain these key-value pairs
 *             - bioFormat	Optional: "wiki", "html", or "both"
 *             - resolveRedirect Optional. If 1, then requested profiles that are redirections are followed to the final profile (default: 1)
 * @returns a promise that resolves to an array [profile, status, page_name] as returned in the api.
 * See https://github.com/wikitree/wikitree-api/blob/main/getProfile.md for more detail
 */
WikiTreeAPI.getProfile = async function (appId, id, fields = "", options = {}) {
  // condLog("getProfile", appId, id, fields, options);
  const getProfileParameters = { ...options };
  getProfileParameters.appId = appId;
  getProfileParameters.action = "getProfile";
  getProfileParameters.key = id;
  getProfileParameters.fields = commaSeparatedString(fields);

  const result = await WikiTreeAPI.postToAPI(getProfileParameters);
  return [result[0].profile, result[0].status, result[0].page_name];
};

/**
 * To get a set of Ancestors for a given id, we POST to the API's getAncestors action. When we get a result back,
 * we leave the result as an array of objects
 * Note that postToAPI returns the Promise from JavaScript's fetch() call.
 * This function returns a Promise (as result of the await), which gets resolved once the await returns.
 *
 * So we can use this through our asynchronous actions with something like:
 * WikiTree.getAncestors(appId, myID, 5, ['Id','Name', 'LastNameAtBirth']).then(function(ancestors) {
 *    // the "ancestors" here is the profile data in result[0].ancestors, an array of objects,
 *    // where result is what was returned by the API call
 * });
 *
 * WARNING:  If you just do a NewAncestorsArray = WikiTree.getAncestors(appId,id,depth,fields);
 *     --> what you get is the promise object - NOT the array of ancestors you might expect.
 * You HAVE to use the .then() with embedded function, or await, to wait and process the results
 *
 * @param {*} appId An application id (any string). 'WBE_' will be prepended if not present
 * @param {*} id The WikiTree ID or numerical ID of the person for which to retrieve ancestors
 * @param {*} depth The number of generations back to follow the parent ids
 * @param {*} fields an array or comma separated string of fields to return for each profile
 * @returns An array of ancestor profiles
 */
WikiTreeAPI.getAncestors = async function (appId, id, depth, fields) {
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getAncestors",
    key: id,
    depth: depth,
    fields: commaSeparatedString(fields),
    resolveRedirect: 1,
  });
  return result[0].ancestors;
};

/**
 * To get a set of Relatives for a given id or a SET of ids, we POST to the API's getRelatives action.
 * When we get a result back, we leave the result as an array of objects
 * Note that postToAPI returns the Promise from JavaScript's fetch() call.
 * That feeds our await here, which also returns a Promise, which gets resolved when the wait is over.
 *
 * So we can use this through our asynchronous actions with something like:
 *
 *   WikiTree.getRelatives(appId, nextIDsToLoad, ["Id", "Name", "LastNameAtBirth"], { getParents: true }).then(
 *       function (peopleList) {
 *           // FUNCTION STUFF GOES HERE TO PROCESS THE ITEMS returned
 *           for (let index = 0; index < peopleList.length; index++) {
 *               thePeopleList.add(peopleList[index].person);
 *           }
 *       }
 *   );
 *
 * NOTE:  the "peopleList" here that is the input to the .then function is the JSON from our API call, namely
 * result[0].items, which will be an array of objects.
 * Each object (or item) has a key, user_id, user_name, then a person object (that contains the fields requested),
 * and inside that person object could be a Parents object, a Children object, a Siblings object and a Spouses object.
 * If there is a Parents object, then in the list of fields will be Mother and Father, even if they weren't originally
 * in the fields list parameter.
 *
 * WARNING:  See note above about what you get if you don't use the .then() ....
 *
 * @param {*} appId An application id (any string). 'WBE_' will be prepended if not present already
 * @param {*} IDs A string of one or more comma separated IDs, OR an array of (string) IDs.
 * @param {*} fields an array, or comma separated string of fields to return for each profile (same as for getPerson or getProfile)
 * @param {*} options an option object which can contain these key-value pairs
 *                    - bioFormat	Optional: "wiki", "html", or "both"
 *                    - getParents	If true, the parents are returned
 *                    - getChildren	If true, the children are returned
 *                    - getSiblings	If true, the siblings are returned
 *                    - getSpouses	If true, the spouses are returned
 * @returns a Promise for the JSON in the returned API response
 */
WikiTreeAPI.getRelatives = async function (appId, IDs, fields, options = {}) {
  const getRelativesParameters = { ...options };
  getRelativesParameters.appId = appId;
  getRelativesParameters.action = "getRelatives";
  getRelativesParameters.keys = commaSeparatedString(IDs);
  getRelativesParameters.fields = commaSeparatedString(fields);
  getRelativesParameters.resolveRedirect = 1;

  // condLog("getRelativesParameters: ", getRelativesParameters);

  const result = await WikiTreeAPI.postToAPI(getRelativesParameters);
  return result[0].items;
};

/**
 * To get a set of PEOPLE for a given id or a SET of ids, we POST to the API's getPeople action.
 * When we get a result back, we return the result as an array of three objects (or object of objects)
 * Note that postToAPI returns the Promise from JavaScript's fetch() call.
 * That feeds our await here, which also returns a Promise, which gets resolved when the wait is over.
 *
 * So we can use this through our asynchronous actions with something like:
 *
 *   WikiTree.getPeople(appId, nextIDsToLoad, ["Id", "Name", "LastNameAtBirth"], { ancestors: 5, minGeneration:3 }).then(
 *       function (result) {
 *          const statusText = result[0];
 *          const resultsByKey = result[1];
 *          const peopleList = result[2]; // NOTE:  This will be an object, not an array, traverse it using for..in structure
 *
 *           // FUNCTION STUFF GOES HERE TO PROCESS THE ITEMS returned
 *           for (const thisID in  peopleList) {
 *               thePeopleList.add(peopleList[thisID]);
 *           }
 *       }
 *   );
 *
 * NOTE:  the "result" here that is the input to the .then function is an array from JSON from our API call, namely
 * result[0] = statusText (usually an empty string if nothing has gone wrong)
 * result[1] = an object containing the original Keys used in the initial API request, and the Id # for each  of those profiles
 * result[2] = an object of objects - each of the sub-objects is a WikiTree profile, with its ID # as the key to the object (Id pure number, not WikiTreeID of lastname-1234 format)
 *
 * Each sub-object has a key which is the user_id, and the object is the person object (that contains the fields requested),
 * and inside that person object could be a Parents object, a Children object, a Siblings object and a Spouses object.
 * If there is a Parents object, then in the list of fields will be Mother and Father, even if they weren't originally
 * in the fields list parameter.
 *
 * WARNING:  See note above about what you get if you don't use the .then() ....
 *
 * @param {*} appId An application id (any string). 'WBE-' will be prepended to denotes it as a "Tree App"
 * @param {*} IDs A string of one or more comma separated IDs, OR an array of (string) IDs.
 * @param {*} fields an array, or comma separated string of fields to return for each profile (almost the same as for getPerson or getProfile)
 *       - Can include Mother, Father, Spouses (which will include marriage data), but ignores fields Children,Parents, Siblings --> use options to get those people included
 * @param {*} options an option object which can contain the following key-value pairs
 *                    - bioFormat	Optional: "wiki", "html", or "both"
 *                    - siblings	If 1, then get siblings of profiles, If 0 (default), do not get siblings
 *                    - ancestors	Number of generations of ancestors (parents) to return from the starting id(s). Default 0.
 *                    - descendants Number of generations of descendants (children) to return from the starting id(s). Default 0.
 *                    - nuclear	    Number of generations of nuclear relatives (parents, children, siblings, spouses) to return from the starting id(s). Default 0.
 *                    - minGeneration   Generation number to start at when gathering relatives (default 0)
 *                    - limit       The maximum number of related profiles to return (default 1000)
 *                    - start   	The starting number of the returned page of (limit) profiles (default 0)
 *      See https://github.com/wikitree/wikitree-api/blob/main/getPeople.md for more detail
 * @returns a Promise for the [status, resultByKey , people] JSON items in an array from the returned API response
 */
WikiTreeAPI.getPeople = async function (appId, IDs, fields, options = {}) {
  const getPeopleParameters = { ...options };
  getPeopleParameters.appId = appId;
  getPeopleParameters.action = "getPeople";
  getPeopleParameters.keys = commaSeparatedString(IDs);
  getPeopleParameters.fields = commaSeparatedString(fields);

  const result = await WikiTreeAPI.postToAPI(getPeopleParameters);
  return [result[0].status, result[0].resultByKey, result[0].people];
};

/**
 * Search person profiles using API filters similar to Special:SearchPerson.
 *
 * @param {*} appId An application id (any string). 'WBE_' will be prepended if not present already
 * @param {*} searchParams Object containing search filters (e.g. FirstName, LastName, RealName, BirthDate)
 * @param {*} fields Optional array or comma separated string of fields to return for matches
 * @param {*} options Optional search options (e.g. dateInclude, dateSpread, sort, limit, start)
 * @returns a Promise for [status, matches, total, start, limit]
 */
WikiTreeAPI.searchPerson = async function (appId, searchParams = {}, fields = "", options = {}) {
  const VALID_SEARCH_ARGS = new Set([
    "FirstName",
    "LastName",
    "BirthDate",
    "DeathDate",
    "RealName",
    "LastNameCurrent",
    "BirthLocation",
    "DeathLocation",
    "Gender",
    "fatherFirstName",
    "fatherLastName",
    "motherFirstName",
    "motherLastName",
    "watchlist",
    "dateInclude",
    "dateSpread",
    "centuryTypo",
    "isLiving",
    "skipVariants",
    "lastNameMatch",
    "sort",
    "secondarySort",
    "limit",
    "start",
  ]);

  const parameters = { ...options };
  parameters.appId = appId;
  parameters.action = "searchPerson";

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (!VALID_SEARCH_ARGS.has(key)) {
      return;
    }
    if (value === undefined || value === null || value === "") {
      return;
    }
    parameters[key] = value;
  });

  if (fields && commaSeparatedString(fields) !== "") {
    parameters.fields = commaSeparatedString(fields);
  }

  const result = await WikiTreeAPI.postToAPI(parameters);
  return [result[0].status, result[0].matches || [], result[0].total || 0, result[0].start || 0, result[0].limit || 0];
};

/**
 * Find the connection path between two profiles.
 *
 * @param {*} appId An application id (any string). 'WBE_' will be prepended if not present already
 * @param {*} keys Two IDs as an array or comma-separated string
 * @param {*} fields Optional fields to include for each visible profile in the path
 * @param {*} options Optional parameters for getConnections (e.g., relation, ignoreIds, nopath)
 * @returns The first object in the API response array with status, path/pathLength, etc.
 */
WikiTreeAPI.getConnections = async function (appId, keys, fields = [], options = {}) {
  const parameters = { ...options };
  parameters.appId = appId;
  parameters.action = "getConnections";
  parameters.keys = commaSeparatedString(keys);
  if (fields && commaSeparatedString(fields) !== "") {
    parameters.fields = commaSeparatedString(fields);
  }

  const result = await WikiTreeAPI.postToAPI(parameters);
  return result[0];
};

/**
 * To get the Watchlist for the logged in user, we POST to the API's getWatchlist action. When we get a result back,
 * we leave the result as an array of objects
 * Note that postToAPI returns the Promise from JavaScript's fetch() call.
 * That feeds our await here, which also returns a Promise, which gets resolved when the wait is over.
 *
 * So we can use this through our asynchronous actions with something like:
 * WikiTree.getWatchlist(appId, limit, getPerson, getSpace, fields).then(function(list) {
 *    // the "list" here is the profile data in result[0].watchlist, which will be an array of objects,
 *    // where "result" is the JSON that was returned from the API call.
 * });
 *
 * @param {*} appId An application id (any string). 'WBE_' will be prepended if not already present
 * @param {*} fields Optional an array or comma-separated list of fields to return for each profile
 * @param {*} options an option object which can contain the following key-value pairs
 *            - limit Integer value = how many Watchlist items to return. Default = 100
 *            - offset	Starting offset of returned profiles. Default = 0
 *            - order	The sort order for the returned profiles: user_id, user_name, user_last_name_current, user_birth_date,
 *              user_death_date, or page_touched. Default = user_id.
 *            - getPerson Default = 1. If 1, the person profiles on the watchlist are returned
 *            - getSpace Default = 1. If 1, the space profiles are returned, otherwise not
 *            - onlyLiving	If 1, then the person profiles returned are limited to those that are living
 *            - excludeLiving	If 1, then the person profiles returned are limited to those that are not living
 *            - bioFormat	Optional: "wiki", "html", or "both"
 * @returns a Promise for the [profile, status , page_name] JSON items in an array from the returned API response
 */

WikiTreeAPI.getWatchlist = async function (appId, fields, options = {}) {
  const parameters = { ...options };
  parameters.appId = appId;
  parameters.action = "getWatchlist";
  if (fields) parameters.fields = commaSeparatedString(fields);

  const result = await WikiTreeAPI.postToAPI(parameters);
  return [result[0].watchlist, result[0].watchlistCount, result[0].status];
};

WikiTreeAPI.getSpaceWatchlist = async function (appId, limit, fields) {
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getWatchlist",
    limit: limit,
    getPerson: 0, // Exclude person profiles
    getSpace: 1, // Include space profiles
    fields: commaSeparatedString(fields),
    resolveRedirect: 1,
  });
  return result[0].watchlist;
};

// Define the condLog function
function condLog(message, ...optionalParams) {
  if (window.debugMode) {
    console.log(message, ...optionalParams);
  }
}

// Function to check login status
WikiTreeAPI.isLoggedIntoAPI = async function (userNumId, appId = "WBE_check_login") {
  if (!userNumId) return false;
  const loginStatus = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "clientLogin",
    checkLogin: userNumId,
  });
  console.log("API Login Status: ", loginStatus);

  return loginStatus?.clientLogin?.result == "ok";
};

/**
 * This is just a wrapper for JavaScript's fetch() call, sending along necessary options for the WikiTree API.
 *
 * @param {*} postData
 * @param {*} signal (optional) The AbortController.signal to listen on for aborting the call
 * @returns
 */
WikiTreeAPI.postToAPI = async function (postData, signal) {
  condLog(`>>>>> postToAPI ${postData.action} ${postData.key || postData.keys}`, postData);

  const formData = new FormData();
  for (let key in postData) {
    // We prepend 'WBE_' to the appId (if it not already there) to indicate the call is part of WBE
    let value = postData[key];
    if (key == "appId") {
      if (typeof value === "string") {
        value = value.startsWith("WBE") ? value : `WBE_${value}`;
      } else {
        value = "WBE";
      }
    }
    formData.append(key, value);
  }

  // If we have a token, add it to our form data.
  if (typeof appsToken != "undefined") {
    formData.append("token", appsToken);
  }

  // We're POSTing the data, so we don't worry about URL size limits and want JSON back.
  const options = {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(formData),
  };
  if (signal) {
    options["signal"] = signal;
  }

  const response = await fetch(API_URL, options);
  if (!response.ok) {
    // condLog(" ${response.status}: ${response.statusText} ");
    throw new Error(`HTTP error! Status: ${response.status}: ${response.statusText}`);
  }
  return await response.json();
};

WikiTreeAPI.lookupProfile = function (wtId, resultByKey, people) {
  let rslt = resultByKey[wtId];
  if (!rslt) {
    // If the id in the original api request contained spaces (e.g. "Van der Byl-59"), then resultByKey will typically also have it with a space.
    // However, when we want to lookup the profile, we don't always have the id with spaces, or vice versa. To save us the trouble of figuring out
    // what is the case in each situation, we just try both ways here.
    if (wtId.includes("_")) {
      rslt = resultByKey[wtId.replace("_", " ")];
    } else if (wtId.includes(" ")) {
      rslt = resultByKey[wtId.replace(" ", "_")];
    }
  }

  if (rslt) {
    let id = rslt.Id;
    if (rslt.status && rslt.status.startsWith("Redirected")) {
      id = rslt.status.match(/\d+/)[0];
    }
    return people[id];
  }
  return null;
};

/**
 * Utility function to get/set cookie data.
 * Adapted from https://github.com/carhartl/jquery-cookie which is obsolete and has been
 * superseded by https://github.com/js-cookie/js-cookie. The latter is a much more complete cookie utility.
 * Here we just want to get and set some simple values in limited circumstances to track e.g. an API login.
 * So we'll use a stripped-down function here and eliminate a prerequisite. This function should not be used
 * in complex circumstances.
 *
 * @param {*} key The name of the cookie to set/read. If reading and no key, then array of all key/value pairs is returned.
 * @param {*} value The value to set the cookie to. If undefined, the value is instead returned. If null, cookie is deleted.
 * @param {*} options Used when setting the cookie:
 *            - options.expires = Date or number of days in the future (converted to Date for cookie)
 *            - options.path, e.g. "/"
 *            - options.domain, e.g. "apps.wikitree.com"
 *            - options.secure, if true then cookie created with ";secure"
 * @returns
 */
WikiTreeAPI.cookie = function (key, value, options) {
  if (options === undefined) {
    options = {};
  }

  // If we have a value, we're writing/setting the cookie.
  if (value !== undefined) {
    if (value === null) {
      options.expires = -1;
    }
    if (typeof options.expires === "number") {
      const days = options.expires;
      options.expires = new Date();
      options.expires.setDate(options.expires.getDate() + days);
    }
    value = String(value);
    return (document.cookie = [
      encodeURIComponent(key),
      "=",
      value,
      options.expires ? "; expires=" + options.expires.toUTCString() : "",
      options.path ? "; path=" + options.path : "",
      options.domain ? "; domain=" + options.domain : "",
      options.secure ? "; secure" : "",
    ].join(""));
  }

  // We're not writing/setting the cookie, we're reading a value from it.
  let cookies = document.cookie.split("; ");

  let result = key ? null : {};
  for (let i = 0, l = cookies.length; i < l; i++) {
    const parts = cookies[i].split("=");
    let name = parts.shift();
    name = decodeURIComponent(name.replace(/\+/g, " "));
    value = parts.join("=");
    value = decodeURIComponent(value.replace(/\+/g, " "));

    if (key && key === name) {
      result = value;
      break;
    }
    if (!key) {
      result[name] = value;
    }
  }
  return result;
};
