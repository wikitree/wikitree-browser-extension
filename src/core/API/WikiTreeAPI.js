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

  let prop = person?.[fieldName];

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

  let [day, month, year] = prop
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

  let serialized = tokens.join("");
  serialized = serialized.replaceAll(" ,", ","); // solves one of many possible issues when the day is unknown

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
      for (var p in data.Parents) {
        this._data.Parents[p] = new WikiTreeAPI.Person(data.Parents[p]);
      }
    }
    if (data.Children) {
      for (var c in data.Children) {
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

  // We use a few "setters". For the parents, we want to update the Parents Person objects as well as the ids themselves.
  // For TreeViewer we only set the parents and children, so we don't need setters for all the _data elements.
  setMother(person) {
    var id = person.getId();
    var oldId = this._data.Mother;
    this._data.Mother = id;
    if (!this._data.Parents) {
      this._data.Parents = {};
    } else if (oldId) {
      delete this._data.Parents[oldId];
    }
    this._data.Parents[id] = person;
  }
  setFather(person) {
    var id = person.getId();
    var oldId = this._data.Father;
    this._data.Father = id;
    if (!this._data.Parents) {
      this._data.Parents = {};
    } else if (oldId) {
      delete this._data.Parents[oldId];
    }
    this._data.Parents[id] = person;
  }
  setChildren(children) {
    this._data.Children = children;
  }
}; // End Person class definition

/**
 * Return a promise for a person object with the given id.
 * An API call is made and the promise will store the result (if successful)
 * in the cache (if enabled) before it is returned.
 *
 * @param {*} appId An application id (any string). 'TA-' will be prepended to denotes it as a "Tree App"
 * @param {*} id The WikiTree ID of the person to retrieve
 * @param {*} fields An array of field names to retrieve for the given person
 * @returns a Person object
 */
WikiTreeAPI.getPerson = async function (appId, id, fields) {
  // condLog("getPerson",appId, id, fields);
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getPerson",
    key: id,
    fields: fields.join(","),
    resolveRedirect: 1,
  });
  return new WikiTreeAPI.Person(result[0].person);
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
 * @param {*} appId An application id (any string). 'TA-' will be prepended to denotes it as a "Tree App"
 * @param {*} id
 * @param {*} depth
 * @param {*} fields
 * @returns
 */
WikiTreeAPI.getAncestors = async function (appId, id, depth, fields) {
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getAncestors",
    key: id,
    depth: depth,
    fields: fields.join(","),
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
 * @param {*} appId An application id (any string). 'TA-' will be prepended to denotes it as a "Tree App"
 * @param {*} IDs can be a single string, with a single ID or a set of comma separated IDs. OR it can be an array of IDs
 * @param {*} fields an array of fields to return for each profile (same as for getPerson or getProfile)
 * @param {*} options an option object which can contain these key-value pairs
 *                    - bioFormat	Optional: "wiki", "html", or "both"
 *                    - getParents	If true, the parents are returned
 *                    - getChildren	If true, the children are returned
 *                    - getSiblings	If true, the siblings are returned
 *                    - getSpouses	If true, the spouses are returned
 * @returns a Promise for the JSON in the returned API response
 */
WikiTreeAPI.getRelatives = async function (appId, IDs, fields, options = {}) {
  let getRelativesParameters = {
    appId: appId,
    action: "getRelatives",
    keys: IDs.join(","),
    fields: fields.join(","),
    resolveRedirect: 1,
  };

  // go through the options object, and add any of those options to the getRelativesParameters
  for (const key in options) {
    if (Object.hasOwnProperty.call(options, key)) {
      const element = options[key];
      getRelativesParameters[key] = element;
    }
  }
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
 * @param {*} appId An application id (any string). 'TA-' will be prepended to denotes it as a "Tree App"
 * @param {*} IDs can be a single string, with a single ID or a set of comma separated IDs. OR it can be an array of IDs
 * @param {*} fields an array of fields to return for each profile (almost the same as for getPerson or getProfile)
 *       - Can include Mother, Father, Spouses (which will include marriage data), but ignores fields Children,Parents, Siblings --> use options to get those people included
 * @param {*} options an option object which can contain these key-value pairs
 *                    - bioFormat	Optional: "wiki", "html", or "both"
 *                    - siblings	If 1, then get siblings of profiles, If 0 (default), do not get siblings
 *                    - ancestors	Number of generations of ancestors (parents) to return from the starting id(s). Default 0.
 *                    - descendants Number of generations of descendants (children) to return from the starting id(s). Default 0.
 *                    - nuclear	    Number of generations of nuclear relatives (parents, children, siblings, spouses) to return from the starting id(s). Default 0.
 *                    - minGeneration   Generation number to start at when gathering relatives
 *                    - limit       The maximum number of related profiles to return (default 1000)
 *                    - start   	The starting number of the returned page of (limit) profiles (default 0)
 *      See https://github.com/wikitree/wikitree-api/blob/main/getPeople.md for more detail
 * @returns a Promise for the [status, resultByKey , people] JSON items in an array from the returned API response
 */
WikiTreeAPI.getPeople = async function (appId, IDs, fields, options = {}) {
  let theKeys = IDs;
  // condLog("IDs", IDs, typeof IDs);
  if (typeof IDs == "object" /*  && IDs.indexOf(",") > -1 */) {
    theKeys = IDs.join(",");
  }
  let getPeopleParameters = {
    appId: appId,
    action: "getPeople",
    keys: theKeys,
    fields: fields.join(","),
  };

  // go through the options object, and add any of those options to the getPeopleParameters
  for (const key in options) {
    if (Object.hasOwnProperty.call(options, key)) {
      const element = options[key];
      getPeopleParameters[key] = element;
    }
  }
  // condLog("NEED: getPeopleParameters: ", getPeopleParameters);

  const result = await WikiTreeAPI.postToAPI(getPeopleParameters);
  return [result[0].status, result[0].resultByKey, result[0].people];
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
 * @param {*} appId An application id (any string). 'TA-' will be prepended to denotes it as a "Tree App"
 * @param {*} limit
 * @param {*} getPerson
 * @param {*} getSpace
 * @param {*} fields
 * @returns
 */
WikiTreeAPI.getWatchlist = async function (appId, limit, getPerson, getSpace, fields) {
  const result = await WikiTreeAPI.postToAPI({
    appId: appId,
    action: "getWatchlist",
    limit: limit,
    getPerson: getPerson,
    getSpace: getSpace,
    fields: fields.join(","),
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

/**
 * This is just a wrapper for JavaScript's fetch() call, sending along necessary options for the WikiTree API.
 *
 * @param {*} postData
 * @param {*} signal (optional) The AbortController.signal to listen on for aborting the call
 * @returns
 */
WikiTreeAPI.postToAPI = async function (postData, signal) {
  condLog(`>>>>> postToAPI ${postData.action} ${postData.key || postData.keys}`, postData);

  let formData = new FormData();
  for (var key in postData) {
    // We prepend 'TA-' to any appId to indicate the app is run as part of the "Tree Apps"
    const value = key == "appId" ? `TA-${postData[key]}` : postData[key];
    formData.append(key, value);
  }

  // If we have a token, add it to our form data.
  if (typeof appsToken != "undefined") {
    formData.append("token", appsToken);
  }

  // We're POSTing the data, so we don't worry about URL size limits and want JSON back.
  let options = {
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

/**
 * Utility function to get/set cookie data.
 * Adapted from https://github.com/carhartl/jquery-cookie which is obsolete and has been
 * superseded by https://github.com/js-cookie/js-cookie. The latter is a much more complete cookie utility.
 * Here we just want to get and set some simple values in limited circumstances to track an API login.
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
      var days = options.expires;
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
  var cookies = document.cookie.split("; ");

  var result = key ? null : {};
  for (var i = 0, l = cookies.length; i < l; i++) {
    var parts = cookies[i].split("=");
    var name = parts.shift();
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
