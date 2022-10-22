/*
MIT License

Copyright (c) 2020 Robert M Pavey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//------------------------------
// Date set used for residence facts
//------------------------------
const residenceDataSet = [
  {
    'sourceStrings' : [ "1841 England Census", "1841 Wales Census", "Census 1841", ],
    'year': 1841,
    'actualDate' : "6 June 1841",
    'refTitle' : "1841 Census",
    'bioString' : "1841 census",
  },
  {
    'sourceStrings' : [ "1851 England Census", "1851 Wales Census", "Census 1851", ],
    'year': 1851,
    'actualDate' : "30 March 1851",
    'refTitle' : "1851 Census",
    'bioString' : "1851 census",
  },
  {
    'sourceStrings' : [ "1861 England Census", "1861 Wales Census", "Census 1861", ],
    'year': 1861,
    'actualDate' : "7 April 1861",
    'refTitle' : "1861 Census",
    'bioString' : "1861 census",
  },
  {
    'sourceStrings' : [ "1871 England Census", "1871 Wales Census", "Census 1871", ],
    'year': 1871,
    'actualDate' : "2 April 1871",
    'refTitle' : "1871 Census",
    'bioString' : "1871 census",
  },
  {
    'sourceStrings' : [ "1881 England Census", "1881 Wales Census", "Census 1881", ],
    'year': 1881,
    'actualDate' : "3 April 1881",
    'refTitle' : "1881 Census",
    'bioString' : "1881 census",
  },
  {
    'sourceStrings' : [ "1891 England Census", "1891 Wales Census", "Census 1891", ],
    'year': 1891,
    'actualDate' : "5 April 1891",
    'refTitle' : "1891 Census",
    'bioString' : "1891 census",
  },
  {
    'sourceStrings' : [ "1901 England Census", "1901 Wales Census", "Census 1901", ],
    'year': 1901,
    'actualDate' : "31 March 1901",
    'refTitle' : "1901 Census",
    'bioString' : "1901 census",
  },
  {
    'sourceStrings' : [ "1911 England Census", "1911 Wales Census", "Census 1911", ],
    'year': 1911,
    'actualDate' : "2 April 1911",
    'refTitle' : "1911 Census",
    'bioString' : "1911 census",
  },
  {
    'sourceStrings' : [ "1939 England and Wales Register", ],
    'year': 1939,
    'actualDate' : "29 September 1939",
    'refTitle' : "1939 Register",
    'bioString' : "1939 register",
  },

  // United States Federal Census
  {
    'sourceStrings' : [ "1790 United States Federal Census", ],
    'year': 1790,
    'actualDate' : "2 August 1790",
    'refTitle' : "1790 Census",
    'bioString' : "1790 census",
  },
  {
    'sourceStrings' : [ "1800 United States Federal Census", ],
    'year': 1800,
    'actualDate' : "4 August 1800",
    'refTitle' : "1800 Census",
    'bioString' : "1800 census",
  },
  {
    'sourceStrings' : [ "1810 United States Federal Census", ],
    'year': 1810,
    'actualDate' : "6 August 1810",
    'refTitle' : "1810 Census",
    'bioString' : "1810 census",
  },
  {
    'sourceStrings' : [ "1820 United States Federal Census", ],
    'year': 1820,
    'actualDate' : "7 August 1820",
    'refTitle' : "1820 Census",
    'bioString' : "1820 census",
  },
  {
    'sourceStrings' : [ "1830 United States Federal Census", ],
    'year': 1830,
    'actualDate' : "1 June 1830",
    'refTitle' : "1830 Census",
    'bioString' : "1830 census",
  },
  {
    'sourceStrings' : [ "1840 United States Federal Census", ],
    'year': 1840,
    'actualDate' : "1 June 1840",
    'refTitle' : "1840 Census",
    'bioString' : "1840 census",
  },
  {
    'sourceStrings' : [ "1850 United States Federal Census", ],
    'year': 1850,
    'actualDate' : "1 June 1850",
    'refTitle' : "1850 Census",
    'bioString' : "1850 census",
  },
  {
    'sourceStrings' : [ "1860 United States Federal Census", ],
    'year': 1860,
    'actualDate' : "1 June 1860",
    'refTitle' : "1860 Census",
    'bioString' : "1860 census",
  },
  {
    'sourceStrings' : [ "1870 United States Federal Census", ],
    'year': 1870,
    'actualDate' : "1 June 1870",
    'refTitle' : "1870 Census",
    'bioString' : "1870 census",
  },
  {
    'sourceStrings' : [ "1880 United States Federal Census", ],
    'year': 1880,
    'actualDate' : "June 1880",
    'refTitle' : "1880 Census",
    'bioString' : "1880 census",
  },
  {
    'sourceStrings' : [ "1890 United States Federal Census", ],
    'year': 1890,
    'actualDate' : "2 June 1890",
    'refTitle' : "1890 Census",
    'bioString' : "1890 census",
  },
  {
    'sourceStrings' : [ "1900 United States Federal Census", ],
    'year': 1900,
    'actualDate' : "1 June 1900",
    'refTitle' : "1900 Census",
    'bioString' : "1900 census",
  },
  {
    'sourceStrings' : [ "1910 United States Federal Census", ],
    'year': 1910,
    'actualDate' : "15 April 1910",
    'refTitle' : "1910 Census",
    'bioString' : "1910 census",
  },
  {
    'sourceStrings' : [ "1920 United States Federal Census", ],
    'year': 1920,
    'actualDate' : "5 January 1920",
    'refTitle' : "1920 Census",
    'bioString' : "1920 census",
  },
  {
    'sourceStrings' : [ "1930 United States Federal Census", ],
    'year': 1930,
    'actualDate' : "1 April 1930",
    'refTitle' : "1930 Census",
    'bioString' : "1930 census",
  },
  {
    'sourceStrings' : [ "1940 United States Federal Census", ],
    'year': 1940,
    'actualDate' : "1 April 1940",
    'refTitle' : "1940 Census",
    'bioString' : "1940 census",
  },

  // United states non-population census
  {
    'sourceStrings' : [ "Federal Census Non-Population Schedule", ],
    'citationStrings' : [ "Census Year: 1850" ],
    'year': 1850,
    'actualDate' : "1850",
    'refTitle' : "1850 Non-Population Census",
    'bioString' : "1850 non-population census",
  },
  {
    'sourceStrings' : [ "Federal Census Non-Population Schedule", ],
    'citationStrings' : [ "Census Year: 1860" ],
    'year': 1860,
    'actualDate' : "1860",
    'refTitle' : "1860 Non-Population Census",
    'bioString' : "1860 non-population census",
  },
  {
    'sourceStrings' : [ "Federal Census Non-Population Schedule", ],
    'citationStrings' : [ "Census Year: 1870" ],
    'year': 1870,
    'actualDate' : "1870",
    'refTitle' : "1870 Non-Population Census",
    'bioString' : "1870 non-population census",
  },
  {
    'sourceStrings' : [ "Federal Census Non-Population Schedule", ],
    'citationStrings' : [ "Census Year: 1880" ],
    'year': 1880,
    'actualDate' : "1880",
    'refTitle' : "1880 Non-Population Census",
    'bioString' : "1880 non-population census",
  },

  // Canada
  {
    'sourceStrings' : [ "1871 Census of Canada", ],
    'year': 1871,
    'actualDate' : "2 April 1871",
    'refTitle' : "1871 Census",
    'bioString' : "1871 census",
  },
  {
    'sourceStrings' : [ "1881 Census of Canada", ],
    'year': 1881,
    'actualDate' : "4 April 1881",
    'refTitle' : "1881 Census",
    'bioString' : "1881 census",
  },
  {
    'sourceStrings' : [ "1891 Census of Canada", ],
    'year': 1891,
    'actualDate' : "6 April 1891",
    'refTitle' : "1891 Census",
    'bioString' : "1891 census",
  },
  {
    'sourceStrings' : [ "1901 Census of Canada", ],
    'year': 1901,
    'actualDate' : "31 March 1901",
    'refTitle' : "1901 Census",
    'bioString' : "1901 census",
  },
  {
    'sourceStrings' : [ "1911 Census of Canada", ],
    'year': 1911,
    'actualDate' : "1 June 1911",
    'refTitle' : "1911 Census",
    'bioString' : "1911 census",
  },
  {
    // Only some provinces like Manitoba
    'sourceStrings' : [ "1916 Canada Census", ],
    'year': 1916,
    'actualDate' : "1 June 1916",
    'refTitle' : "1916 Census",
    'bioString' : "1916 census",
  },
  {
    'sourceStrings' : [ "1921 Census of Canada", ],
    'year': 1921,
    'actualDate' : "1 June 1921",
    'refTitle' : "1921 Census",
    'bioString' : "1921 census",
  },
  {
    'sourceStrings' : [ "Census of BC - 1911", ],
    'year': 1911,
    'actualDate' : "1 June 1911",
    'refTitle' : "1911 Census",
    'bioString' : "1911 census",
  },

  // entries with no date - just used for refTitle
  {
    'sourceStrings' : [ "Electoral Register", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "Electoral Register",
    'bioString' : "an electoral register",
  },
  {
    'sourceStrings' : [ "Voter Register", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "Voter Register",
    'bioString' : "a register of voters",
  },
  {
    'sourceStrings' : [ "Crew List", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "Crew List",
    'bioString' : "a crew list",
  },
  {
    'sourceStrings' : [ "City Directories", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "City Directory",
    'bioString' : "a city directory",
  },
  // Other U.S.
  {
    'sourceStrings' : [ "U.S. WWII Draft Card", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "WWII Draft Card",
    'bioString' : "a WWII draft card",
  },
  {
    'sourceStrings' : [ "Social Security Applications and Claims Index", ],
    'year': 0,
    'actualDate' : "",
    'refTitle' : "Social Security Application",
    'bioString' : "a social security record",
  },
];

const DateAccuracy = Object.freeze({"none": 0, "five_years": 1, "year_approx": 2, "year": 3, "quarter": 4, "month": 5, "day": 6});
const LocationAccuracy = Object.freeze({"none": 0, "country":1, "state":2, "county":3, "district": 4, "town": 5, "street": 6, "full": 7});

const birthDateAccuracyDataSet = [
  {
    'sourceStrings' : [ "England & Wales, Civil Registration Birth Index", ],
    'dateAccuracy': DateAccuracy.quarter,
    'locationAccuracy': LocationAccuracy.district,
  },
  {
    'sourceStrings' : [ "1841 England Census", "1841 Wales Census", ],
    'dateAccuracy': DateAccuracy.five_years,
    'locationAccuracy': LocationAccuracy.county,
  },
  {
    'sourceStrings' : [ "England Census", "Wales Census", ],
    'dateAccuracy': DateAccuracy.year_approx,
    'locationAccuracy': LocationAccuracy.town,
  },
  {
    'sourceStrings' : [ "1939 England and Wales Register", "Birth Certificate"],
    'dateAccuracy': DateAccuracy.day,
    'locationAccuracy': LocationAccuracy.none,
  },
  {
    'sourceStrings' : [ "England & Wales, Death Index, 1916-2007", "FreeBMD Death Index"],
    'dateAccuracy': DateAccuracy.year_approx,
    'locationAccuracy': LocationAccuracy.none,  // death registration does not record birth location
  },
  {
    'sourceStrings' : [ "Burial", ],
    'dateAccuracy': DateAccuracy.year_approx,
    'locationAccuracy': LocationAccuracy.town,
  },
  {
    'sourceStrings' : [ "U.S. WWII Draft Card", ],
    'dateAccuracy': DateAccuracy.day,
    'locationAccuracy': LocationAccuracy.town,
  },
];

const deathDateAccuracyDataSet = [
  {
    'sourceStrings' : [ "England & Wales, Death Index", ],
    'dateAccuracy': DateAccuracy.quarter,
    'locationAccuracy': LocationAccuracy.district,
  },
  {
    'sourceStrings' : [ "England & Wales, National Probate Calendar", ],
    'dateAccuracy': DateAccuracy.day,
    'locationAccuracy': LocationAccuracy.full,
  },
  {
    'sourceStrings' : [ "Burial", ],
    'dateAccuracy': DateAccuracy.month,
    'locationAccuracy': LocationAccuracy.town,
  },
];

const BioFormat = Object.freeze({"formatUnknown":0, "format2011":1, "format2020":2});

const FactType = Object.freeze({"unknown":-1, "name":0, "birth":1, "marriage": 2, "death":3, "residence":4,
  "burial":5, "military":6, "census":7,
  "arrival":8, "departure":9, "employment":10, "baptism":11, "probate":12, "will":13, "event":14,
  "immigration":15, "alias":16, "source": 17,
 });

 const sectionNamesFormat2020 = [
  { 'name': "Name:", 'id': FactType.name },
  { 'name': "Born", 'id': FactType.birth },
  { 'name': "Marriage", 'id': FactType.marriage },
  { 'name': "Died", 'id': FactType.death },
  { 'name': "Residence", 'id': FactType.residence },
  { 'name': "Buried", 'id': FactType.burial },
  { 'name': "Military", 'id': FactType.military },
  { 'name': "Census:", 'id': FactType.census },
  { 'name': "Arrival", 'id': FactType.arrival },
  { 'name': "Departure", 'id': FactType.departure },
  { 'name': "Employment", 'id': FactType.employment },
  { 'name': "EMPLOY", 'id': FactType.employment },
  { 'name': "Occupation:", 'id': FactType.employment },
  { 'name': "Baptism:", 'id': FactType.baptism },
  { 'name': "Christening:", 'id': FactType.baptism },
  { 'name': "Probate", 'id': FactType.probate },
  { 'name': "Will", 'id': FactType.will },
  { 'name': "Event:", 'id': FactType.event },
];

const sectionNamesFormat2011 = [
  { 'name': "Name", 'id': FactType.name },
  { 'name': "Birth", 'id': FactType.birth },
  { 'name': "Marriage", 'id': FactType.marriage },
  { 'name': "Death", 'id': FactType.death },
  { 'name': "Residence", 'id': FactType.residence },
  { 'name': "Burial", 'id': FactType.burial },
  { 'name': "Military", 'id': FactType.military },
  { 'name': "Census", 'id': FactType.census }, // may never occur
  { 'name': "Arrival", 'id': FactType.arrival },
  { 'name': "Departure", 'id': FactType.departure },
  { 'name': "Employment", 'id': FactType.employment },
  { 'name': "EMPLOY", 'id': FactType.employment },
  { 'name': "Occupation", 'id': FactType.employment },
  { 'name': "Baptism", 'id': FactType.baptism },
  { 'name': "Christening", 'id': FactType.baptism },
  { 'name': "Immigration", 'id': FactType.immigration },
  { 'name': "Alias", 'id': FactType.alias },
  { 'name': "Probate", 'id': FactType.probate },
  { 'name': "Source", 'id': FactType.source },
];

const ancestryDbIdMap = new Map([
  ['5967', "England, Pallot's Marriage Index, 1780-1837"],
  ['8913', "England & Wales, Civil Registration Marriage Index, 1837-1915"]
]);


//------------------------------
// Utility functions
//------------------------------
function isDigit(char) {
  return (char >= "0" && char <= "9");
}

function removeTrailingPeriodAndSpaces(str) {
  str = str.trim();
  if (str[str.length-1] == ".") {
    str = str.substr(0, str.length-1);
    str = str.trim();
  }
  return str;
}

function stringRemoveAnythingAfterPrefixes(string, prefixes) {
  let result = string;
  for (let prefix of prefixes) {
    let index = result.indexOf(prefix);
    if (index != -1) {
      result = result.substring(0, index);
    }
  }

  return result;
}

function normalizeLocationFragment(fragment) {
  var result = removeTrailingPeriodAndSpaces(fragment.toLowerCase());
  result = result.replace(/  /g, " ").replace(/\./g, "").trim();
  result = result.replace(/saint/g, "st");
  return result;
}

// If the two locations are equivalent, or one is a more accurate version of the other, return the most accurate
// This is based on a lot of guesswork!
function getCombinedLocation(locationA, locationB) {

  if (locationA == undefined) {
    return locationB;
  }
  else if (locationB == undefined) {
    return locationA;
  }
  else if (locationA == "") {
    return locationB;
  }
  else if (locationB == "") {
    return locationA;
  }

  var arrayA = locationA.split(",");
  for (var i = 0; i < arrayA.length; i++) {
    arrayA[i] = normalizeLocationFragment(arrayA[i]);
  }

  var arrayB = locationB.split(",");
  for (var i = 0; i < arrayB.length; i++) {
    arrayB[i] = normalizeLocationFragment(arrayB[i]);
  }

  // if all of A is contained in B in the same order return B
  var iA = 0;
  var iB = 0;
  while (iA < arrayA.length && iB < arrayB.length) {
    if (arrayA[iA] == arrayB[iB]) {
      iA++;
      iB++;
    }
    else {
      iB++;
    }
  }
  if (iA == arrayA.length) {
    return locationB;
  }

  // if all of B is contained in A in the same order return A
  var iA = 0;
  var iB = 0;
  while (iA < arrayA.length && iB < arrayB.length) {
    if (arrayA[iA] == arrayB[iB]) {
      iA++;
      iB++;
    }
    else {
      iA++;
    }
  }
  if (iB == arrayB.length) {
    return locationA;
  }

  return undefined;
}

function regexIndexOf(text, re, i) {
  var indexInSuffix = text.slice(i).search(re);
  return indexInSuffix < 0 ? indexInSuffix : indexInSuffix + i;
}

const extendedAsciiArray = [ ['Š','S'], ['š','s'], ['Ž','Z'], ['ž','z'], ['À','A'], ['Á','A'], ['Â','A'], ['Ã','A'], ['Ä','A'], ['Å','A'], ['Æ','A'], ['Ç','C'], ['È','E'], ['É','E'], ['Ê','E'], ['Ë','E'], ['Ì','I'], ['Í','I'], ['Î','I'], ['Ï','I'], ['Ñ','N'], ['Ò','O'], ['Ó','O'], ['Ô','O'], ['Õ','O'], ['Ö','O'], ['Ø','O'], ['Ù','U'], ['Ú','U'], ['Û','U'], ['Ü','U'], ['Ý','Y'], ['Þ','B'], ['ß','Ss'], ['à','a'], ['á','a'], ['â','a'], ['ã','a'], ['ä','a'], ['å','a'], ['æ','a'], ['ç','c'], ['è','e'], ['é','e'], ['ê','e'], ['ë','e'], ['ì','i'], ['í','i'], ['î','i'], ['ï','i'], ['ð','o'], ['ñ','n'], ['ò','o'], ['ó','o'], ['ô','o'], ['õ','o'], ['ö','o'], ['ø','o'], ['ù','u'], ['ú','u'], ['û','u'], ['ý','y'], ['þ','b'], ['ÿ','y'], ['’',"'"], ['”','"'], ['“','"'], ["●","*"]];
function removeExtendedAsciiCharacters(string)
{
    var replaceString = string;
    for (var i = 0; i < extendedAsciiArray.length; i++) {
        var extChar = extendedAsciiArray[i];
        const regex = new RegExp(extChar[0], "g");
        replaceString = replaceString.replace(regex, extChar[1]);                
    }
    return replaceString;
}

function extractTemplate(str, startIndex) {
  var result = undefined;
  var isValid = false;

  var templateStartIndex = str.indexOf("{{", startIndex);
  if (templateStartIndex != -1) {
    var templateEndIndex = str.indexOf("}}", templateStartIndex);
    var firstPipeIndex = str.indexOf("|", templateStartIndex);
    var dbId = 0;
    var recordId = 0;
    var recordType = "";
    if (firstPipeIndex != -1 && firstPipeIndex < templateEndIndex) {
      recordType = str.substring(templateStartIndex+2, firstPipeIndex).trim();
      var secondPipeIndex = str.indexOf("|", firstPipeIndex+1);
      if (secondPipeIndex != -1 && secondPipeIndex < templateEndIndex) {
        dbId = str.substring(firstPipeIndex+1, secondPipeIndex).trim();
        recordId = str.substring(secondPipeIndex+1, templateEndIndex).trim();
      }
      else
      {
        dbId = str.substring(firstPipeIndex+1, templateEndIndex).trim();
      }
      isValid = true;

      result = new Object;
      result.dbId = dbId;
      result.recordId = recordId;
      result.recordType = recordType;
      result.startIndex = templateStartIndex;
      result.endIndex = templateEndIndex+2;
    }
  }

  return result;
}

function templatesAreDuplicates(template1, template2) {
  var isDuplicate = false;
  if (template1.recordType.toLowerCase() == template2.recordType.toLowerCase() && template2.dbId != 0) {
    // we have two templates of the same type and both have DB IDs
    if (template1.dbId == template2.dbId) {
      if (template1.recordId == template2.recordId) {
        isDuplicate = true;
      }
      else if (template2.recordId == 0) {
        isDuplicate = true;
      }
      else if (template1.recordId == 0) {
        // this seems unlikely and is harder to fix
        console.log("Found possible duplicate template but not removed");
      }
    }
    else if (template1.recordId == template2.recordId ) {
      // the record IDs are the same but the DB IDs are not. This can happen when one if a number and the other is not.
      const dbId1IsNum = template1.dbId.replace(/^\d+$/, "").length == 0;
      const dbId2IsNum = template2.dbId.replace(/^\d+$/, "").length == 0;
      if (dbId1IsNum != dbId2IsNum) {
        // one is a number and one is not
        isDuplicate = true;
      }
    }
  }

  return isDuplicate;
}

function removeTemplateFromString(str, template) {
  var startIndex = template.startIndex;
  var endIndex = template.endIndex;
  if (endIndex < str.length) {
    if (str[endIndex] == " ") {
      endIndex++; // avoid building up extra spaces
    }
  }
  else if (startIndex > 0 && str[startIndex-1] == " ") {
    startIndex--;
  }
  return str.substr(0, startIndex) + str.substr(endIndex);
}

function fixupLinksInString(str) {
  if (str.includes("http")) {
    // Check for Ancestry links that can be changed to templates
    if (str.search(/http\:\/\/trees\.ancestry\.com\/rd\?f\=image\&guid=/i) != -1) {
      str = str.replace(/http\:\/\/trees\.ancestry\.com\/rd\?f\=image\&guid\=([0-9a-f\-]+)\&tid\=([0-9]+)\&pid\=[0-9]+/gi,
                        "{{Ancestry Tree Media|$2|$1}}");
    }
    if (str.search(/http\:\/\/search\.ancestry\.com\/cgi\-bin/i) != -1) {
      str = str.replace(/http:\/\/search\.ancestry\.com\/cgi\-bin\/sse.dll\? *db\=([^\&]+)\&h\=([0-9]+)(?:\&ti\=[0-9]+)?(?:\&indiv\=try)?(?:\&gss\=pt)?/gi,
                        "{{Ancestry Record|$1|$2}}");
    }
    if (str.search(/http\:\/\/search\.ancestry\.co\.uk\/cgi\-bin/i) != -1) {
      str = str.replace(/http:\/\/search\.ancestry\.co\.uk\/cgi\-bin\/sse.dll\? *db\=([^\&]+)\&h\=([0-9]+)(?:\&ti\=[0-9]+)?(?:\&indiv\=try)?(?:\&gss\=pt)?/gi,
                        "{{Ancestry Record|$1|$2}}");
    }
    if (str.search(/http\:\/\/search\.ancestry\.com\.au\/cgi\-bin\//i) != -1) {
      str = str.replace(/http:\/\/search\.ancestry\.com\.au\/cgi\-bin\/sse.dll\? *db\=([^\&]+)\&h\=([0-9]+)(?:\&ti\=[0-9]+)?(?:\&indiv\=try)?(?:\&gss\=pt)?/gi,
                        "{{Ancestry Record|$1|$2}}");
    }
    if (str.search(/http\:\/\/search\.ancestry\.ca\/cgi\-bin\//i) != -1) {
      str = str.replace(/http:\/\/search\.ancestry\.ca\/cgi\-bin\/sse.dll\? *db\=([^\&]+)\&h\=([0-9]+)(?:\&ti\=[0-9]+)?(?:\&indiv\=try)?(?:\&gss\=pt)?/gi,
                        "{{Ancestry Record|$1|$2}}");
    }
  }

  if (str.search(/APID[ \:]+1\,/) != -1) {
    str = str.replace(/APID[ \:]+1,(\w+)\:\:(\w+)/g, "{{Ancestry Record|$1|$2}}");
  }

  // remove any bad templates, e.g. ones with dbId and record id set to zero
  var template = extractTemplate(str, 0);
  while (template != undefined) {
    var nextSearchStartIndex = template.endIndex;
    if (template.dbId == 0 && template.recordId == 0) {
      nextSearchStartIndex = template.startIndex;
      str = removeTemplateFromString(str, template);
    }
    template = extractTemplate(str, nextSearchStartIndex);
  }

  // now check if we have any duplicate templates
  var template1 = extractTemplate(str, 0);
  if (template1 != undefined) {
    var nextSearchStartIndex = template1.endIndex;
    var template2 = extractTemplate(str, nextSearchStartIndex);

    while (template2 != undefined) {
      if (templatesAreDuplicates(template1, template2)) {
        str = removeTemplateFromString(str, template2);
      }
      else {
        nextSearchStartIndex = template2.endIndex;
      }

      template2 = extractTemplate(str, nextSearchStartIndex);
    }
  }

  return str;
}

function cleanupSourceText(sourceText) {

  // sometime non-breaking space characters are in the source
  var str = sourceText.replace(/\&nbsp\;/g, " ");

  var str = fixupLinksInString(str);

  str = str.trim().replace(/  */g, " ");  // remove unnecesary spaces

  // Sources can contain strings like this that we want to remove:
  // Data Changed: Date: 15 JUL 2011 Time: 12:02:33.
  str = str.replace(/ *Data Changed\: *Date\: *\d+ *\w+ *\d+ *Time\: *\d+\:\d+\:\d+/, "");

  if (str.includes("Record ID Number")) {
    // check if it is an ID that we want to keep
    let keepText = false;
    if (str.search(/ *Record ID Number\: *MH\:/)) {
      //str = str.replace(/ *Record ID Number\: *MH\:([^\s]+)/, " MyHeritage Tree: $1");
      keepText = true;
    }
    if (!keepText) {
      str = str.replace(/ *Record ID Number\: *[^\s]+/, "");
    }
  }
  str = str.replace(/ *User ID\: *[^\s]+/, "");

  str = str.replace(".Original data", ". Original data");

  str = str.replace(/Repository\:\s*\[\[[^\]]*\]\]\.?\s*/, "");

  if (str.search(/myheritage/i) != -1) {
    str = str.replace(/\&lt\;a\&gt\;/g, "");
    str = str.replace(/\&lt\;\/a\&gt\;/g, "");
    str = str.replace(/nbsp\;/g, "");
    str = str.replace(/\&amp\;/g, "");

    str = str.replace(/([^\s]+)(Birth\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Birth name\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Birth place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence date\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Gender\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Death\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Parents\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Children\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Husband\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Wife\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Siblings\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Burial\:)/g, "$1; $2");
  }

  const noteDangle = "Note:";
  if (str.endsWith(noteDangle)) {
    str = str.substring(0, str.length - noteDangle.length).trim();
  }

  // remove any punctuation at the end of the source. We will be adding a period before the citation.
  str = str.replace(/[\s\;\.\,\:]*$/, "");

  return str;
}

function cleanupCitationText(citationText) {
  var str = citationText.replace(/\&nbsp\;/g, " ");

  var str = fixupLinksInString(str);

  str = str.trim().replace(/  */g, " ");  // remove unnecesary spaces

  // a lot of old citations have "Page:  Class:" in them - i.e. the Page is blank.
  str = str.replace("Page: Class:", "Class:");

  if (str.search(/myheritage/i) != -1 || str.includes("Data: Text: ")) {
    str = str.replace(/([^\s]+)(Birth\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Birth name\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Birth place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence date\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Residence\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Gender\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Marriage date\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Marriage place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Death\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Death place\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Parents\:)/g, "$1; $2");
    str = str.replace(/([^\s]+)(Children\:)/g, "$1; $2");
  }

  if (str.includes("<")) {
    str = str.replace(/\<blockquote\>/g, "");
    str = str.replace(/\<\/blockquote\>/g, "");
  }

  if (str.includes(" CONT ")) {
    str = str.replace(/ CONT /g, "\n* ");
  }

  return str;
}

function parseAncestryCitation(citation) {

  // Given a citation like this:
  // "London Metropolitan Archives, All Saints, Edmonton, Register of marriages, DRO/040/A/01, Item 016 {{Ancestry Record|1623|1721795}}"
  // return an object that has:
  // text = "London Metropolitan Archives, All Saints, Edmonton, Register of marriages, DRO/040/A/01, Item 016"
  // dbId = "1623"
  // recordId = "1721795"

  const templateStart = "{{";
  const templateStartIndex = citation.indexOf(templateStart);
  if (templateStartIndex == -1) {
    return { 'text': citation };
  }

  const templateTextIndex = templateStartIndex + templateStart.length;
  const templateEnd = "}}";
  const templateEndIndex = citation.indexOf(templateEnd, templateTextIndex);
  if (templateEndIndex == -1) {
    return { 'text': citation };
  }

  const templateText = citation.substring(templateTextIndex, templateEndIndex);
  const templateArray = templateText.split("|");

  var result = { 'text': citation.substring(0, templateStartIndex).trim() };

  if (templateArray.length > 1 && templateArray[0].trim() == "Ancestry Record") {
    if (templateArray.length >= 2) {
      result.dbId = templateArray[1].trim();
    }
    if (templateArray.length >= 3) {
      result.recordId = templateArray[2].trim();
    }
  }

  return result;
}

function ensureBlankLine(text) {
  // make sure there is a blank line before the next section of research notes
  if (!text.endsWith("\n\n") && !text.endsWith("=\n")) {
    if (text.endsWith("\n")) {
      text = text.concat("\n");
    }
    else {
      text = text.concat("\n\n");
    }
  }

  return text;
}

// Global vars
var userOptions;

const MonthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const DateQualifiers = Object.freeze({"none":0, "before":1, "about":2, "after":3});

class FactDate {

  // This represents the date for an Ancestry Fact. 
  // Ancestry does allow an arbitray string as a date but flags it and requires the used to click "Save Anyway"
  // This class attempts to handle any date that Ancestry does not flag in this way.

  constructor (dateString) {
    this.inputString = dateString;
    this.bioString = "";
    this.isValid = false;
    this.day = 0;
    this.month = 0;
    this.year = 0;
    this.qualifier = 0;
    this.monthString = 0;
    this.qualifierString = 0;
    this.isRange = false;
    this.endYear = 0;

    this.parseDate();
  }

  isYearOnly() {
    return (this.isValid && this.year != 0 && this.month == 0 && this.day == 0);
  }

  buildBioString() {
    var out = "";

    if (this.isRange) {
      out = this.year.toString() + " and " + this.endYear.toString();
    }
    else {
      if (this.day != 0) {
        out = out.concat(this.day);
      }

      if (this.month != 0) {
        if (out.length > 0) {
          out = out.concat(" ");
        }
        out = out.concat(this.monthString);
      }

      if (this.year != 0) {
        if (out.length > 0) {
          out = out.concat(" ");
        }
        out = out.concat(this.year);
      }
    }

    this.bioString = out;
  }

  monthStringToMonth(inString) {
    var word = inString.toLowerCase();

    if (word.length < 3) {
      return 0;
    }

    var month = 0;
    for (const monthString of MonthStrings) {
      const lowerCaseMonthString = monthString.toLowerCase();
      month++;

      if (lowerCaseMonthString.startsWith(word)) {
        return month;
      }
    }

    return 0;
  }

  parseDate() {

    // console.log("FactDate: string is: '" + this.inputString + "'");
    
    // Parse the string to see if it is a valid date string
    this.isValid = true;
    this.day = 0;
    this.month = 0;
    this.year = 0;
    this.qualifier = 0;
    this.monthString = "";
    this.qualifierString = 0;

    // remove any leading colons
    var cleanedInput = this.inputString.trim();
    while (cleanedInput.length > 0 && cleanedInput[0] == ":") {
      cleanedInput = cleanedInput.substr(1);
    }
    cleanedInput = cleanedInput.trim();
    const datePrefix = "Date:";
    if (cleanedInput.startsWith(datePrefix)) {
      cleanedInput = cleanedInput.substr(datePrefix.length);
    }
    // remove railing periods
    while (cleanedInput.endsWith(".")) {
      cleanedInput = cleanedInput.substring(0, cleanedInput.length-1);
    }

    var array = cleanedInput.split(/[\.\,\/\s]+/);

    if (array.length == 4 &&
      ((array[0].toLowerCase() == "bet" && array[2].toLowerCase() == "and") ||
       (array[0].toLowerCase() == "from" && array[2].toLowerCase() == "to"))) {
          // this is a range
      this.isValid = false;
      let startYear = array[1];
      let endYear = array[3];
      if (/^\d+$/.test(startYear) && /^\d+$/.test(endYear)) {
        const start = parseInt(startYear);
        const end = parseInt(endYear);
        if (isFinite(start) && isFinite(end)) {
          if (start > 200 && end > 200 && this.year == 0) {
            this.year = start;
            this.endYear = end;
            this.isRange = true;
            this.isValid = true;
          }
        }
      }
    }
    else if (array.length <= 5)
    {
      // each one of the fields can either be digits (year or day), month (only allow three or more letters), year range, Abt/Bef/Aft
      for (const field of array) {
        if (/^\d+$/.test(field) ||
            /^\d+th$/i.test(field) || /^\d+st$/i.test(field) || /^\d+nd$/i.test(field) || /^\d+rd$/i.test(field)) {
          
          var cleanedField = field;
          if (!/^\d+$/.test(cleanedField)) {
            // Only allow suffix on field for day
            if (this.day != 0) {
              this.isValid = false;
              break;
            }
            // there is a suffix on the field, remove it
            cleanedField = cleanedField.substr(0,cleanedField.length-2);
          }

          // field is all digits, must be year or date (or in rare cases a month (in form 10/06/1657))
          const number = parseInt(cleanedField);
          if (isNaN(number)) {
            this.isValid = false;
            break;
          }

          if (number < 32 && this.day == 0) {
            this.day = number;
          }
          else if (number <= 12 && this.month == 0) {
            // the only cases I have seen so far are in English form with day first. e.g. 10/06/1657 in Robinson-8669
            this.month = number;
            this.monthString = MonthStrings[number-1];
          }
          else if (number > 200 && this.year == 0) {
            this.year = number;
          }
          else {
            this.isValid = false;
            break;
          }
        }
        else if (/^[A-Za-z]+$/.test(field)) {
          // field is all letters must be month or qualifier
          var word = field.toLowerCase();

          if (word.length < 3) {
            continue;
          }

          var month = this.monthStringToMonth(word);
          if (month != 0) {
            this.month = month;
            this.monthString = MonthStrings[month-1];
          }

          if (this.month == 0) {
            // no month found. Check for qualifier
            if ("abt".startsWith(word)) {
              this.qualifier = DateQualifiers.about;
              this.qualifierString = "About";
            }
            else if ("about".startsWith(word)) {
              this.qualifier = DateQualifiers.about;
              this.qualifierString = "About";
            }
            else if ("circa".startsWith(word)) {
              this.qualifier = DateQualifiers.about;
              this.qualifierString = "About";
            }
            else if ("before".startsWith(word)) {
              this.qualifier = DateQualifiers.before;
              this.qualifierString = "Before";
            }
            else if ("after".startsWith(word)) {
              this.qualifier = DateQualifiers.after;
              this.qualifierString = "After";
            }
            else if ("cal".startsWith(word)) {
              // do nothing - can happen on format2011 bios - not sure what it means
            }
            else {
              this.isValid = false;
              break;
            }
          }
        }
        else if (/^\d+[\-\–]\d+$/.test(field)) { // sometimes have en dash
          // looks like a date range (but could also be an unusual format like 10-1894)
          const rangeArray =  field.split(/[\-\–]/);
          const start = parseInt(rangeArray[0]);
          const end = parseInt(rangeArray[1]);
          if (isFinite(start) && isFinite(end)) {
            if (start > 200 && end > 200 && this.year == 0) {
              this.year = start;
              this.endYear = end;
              this.isRange = true;
            }
            else if (start >= 1 && start <= 12 && end > 200 && end < 3000 && this.day == 0 && this.month == 0 && this.year == 0) {
              this.month = start;
              this.year = end;
              this.monthString = MonthStrings[this.month-1];
            }
          }
          else {
            this.isValid = false;
            break;
          }
        }
        else if (/^[A-Za-z]+\-[A-Za-z]+-[A-Za-z]+$/.test(field)) {
          // looks like it could be a format like Jan-Feb-Mar
          var month1String = field.replace(/^(\w+)\-\w+-\w+$/, "$1");
          var month1 = this.monthStringToMonth(month1String);
          var month2String = field.replace(/^\w+\-(\w+)-\w+$/, "$1");
          var month2 = this.monthStringToMonth(month2String);
          var month3String = field.replace(/^\w+\-\w+-(\w+)$/, "$1");
          var month3 = this.monthStringToMonth(month3String);
          if (month1 != 0 && month2 != 0 && month3 != 0 && month2 == month1+1 && month3 == month2+1 &&
              this.month == 0) {
            // it is a valid quarter, and we don't have a month, for now use fist month of quarter
            this.month = month1;
            this.monthString = MonthStrings[month1-1];
          }
          else {
            this.isValid = false;
            break;
          }
        }
        else if (/^\d\d[A-Za-z][A-Za-z][A-Za-z]\d\d\d\d$/.test(field)) {
          // looks like a date like this 08DEC1879
          if (this.year != 0 || this.month != 0 || this.day != 0) {
            this.isValid = false;
            break;
          }
          
          var dayString = field.replace(/^(\d\d)\w\w\w\d\d\d\d$/, "$1");
          var monthString = field.replace(/^\d\d(\w\w\w)\d\d\d\d$/, "$1");
          var month = this.monthStringToMonth(monthString);
          var yearString = field.replace(/^\d\d\w\w\w(\d\d\d\d)$/, "$1");

          const day = parseInt(dayString);
          const year = parseInt(yearString);
          if (isNaN(day) || isNaN(year) || month == 0) {
            this.isValid = false;
            break;
          }

          this.day = day;
          this.month = month;
          this.monthString = MonthStrings[month-1];
          this.year = year;
        }
        else if (/^\d+\-\d+-\d+$/.test(field)) {
          // looks like a date with all digits and "-" separators e.g. 9-10-1932 (we would have to guess whether day or month is first)
          this.isValid = false;
          break;
        }
        else if (/^\d+\-\w+-\d+$/.test(field)) {
          // looks like a date with "-" separators e.g. 9-Sep-1932. We do not handle this currently
          this.isValid = false;
          break;
        }
        else if (field != "") {
          // unknown field
          this.isValid = false;
          break;
        }
      }
    }

    if (this.isValid) {
      if (this.year == 0 || this.year < 0 || this.year > 2200) {
        this.isValid = false;
      }

      if (this.isRange && !(this.month == 0 && this.day == 0)) {
        this.isValid = false;
      }
    }

    if (this.isValid) {
//      console.log("FactDate: day is: " + this.day + ", year is: " + this.year + ", qualifier is " + this.qualifier);
//      console.log("FactDate: monthString is: " + this.monthString + ", month is: " + this.month);
      this.buildBioString();
//      console.log("FactDate: bioString is: '" + this.bioString + "'");
    }
    else {
      // console.log("FactDate: INVALID, input is '" + this.inputString + "'");
    }
  }

  static isStringAValidDate(string) {
    var factDate = new FactDate(string);
    return factDate.isValid;
  }

  static compareDates(a, b)
  {
    if (!(a.isValid && b.isValid)) {
      // one or both dates is invalid, the invalid date comes first
      if (a.isValid) {
        return 1;
      }
      if (b.isValid) {
        return -1;
      }
      return 0; // both invalid      
    }
    if (a.year < b.year) {
      return -1;
    }
    else if (a.year > b.year) {
      return 1;
    }
    else if (a.month != 0 && b.month != 0 ) {
      if (a.month < b.month) {
        return -1;
      }
      else if (a.month > b.month) {
        return 1;
      }

      if (a.day != 0 && b.day != 0) {
        if (a.day < b.day) {
          return -1;
        }
        else if (a.day > b.day) {
          return 1;
        }
      }
    }

    // dates are the same within the accuracy they specified - test qualifiers.
    if (a.qualifier != b.qualifier) {
      if (a.qualifier == DateQualifiers.before) {
        return -1;
      }
      else if (a.qualifier == DateQualifiers.after) {
        return 1;
      }
      else if (b.qualifier == DateQualifiers.before) {
        return 1;
      }
      else if (b.qualifier == DateQualifiers.after) {
        return -1;
      }
      else if (a.qualifier == DateQualifiers.about) {
        // we arbitrarily say that "about" is before "none"
        return -1;
      }

      // should never get here
      return -1;
    }

    if (a.isRange != b.isRange)
    {
      // say that a range comes after the start date
      if (a.isRange) {
        return 1;
      }
      else {
        return -1; // b must be a range
      }
    }
    else if (a.isRange) {
      // they must both be ranges so compare endYear
      if (a.endYear < b.endYear) {
        return -1;
      }
      else if (a.endYear > b.endYear) {
        return 1;
      }
    }

    // they are identical within the accuracy they both specify. What do we do if one date only specifies year and one is exact?
    // it is pretty arbitrary but we should be deterministic about it.
    // we use the rule that an unspecified field is before a specified one. So 1800 is before 10 Sep 1880
    if (a.month < b.month) {
      return -1;
    }
    else if (a.month > b.month) {
      return 1;
    }
    else if (a.day < b.day) {
      return -1;
    }
    else if (a.day > b.day) {
      return 1;
    }

    // they appear to be identical
    return 0;
  }

  absDaysBetweenDates(otherFactDate) {

    var factDate1 = new FactDate(this.bioString);
    var factDate2 = new FactDate(otherFactDate.bioString);
    if (factDate1.day != factDate2.day && (factDate1.day == 0 || factDate2.day == 0)) {
      factDate1.day = 0;
      factDate2.day = 0;
    }
    if (factDate1.month != factDate2.month && (factDate1.month == 0 || factDate2.month == 0)) {
      factDate1.month = 0;
      factDate2.month = 0;
    }
    factDate1.buildBioString()
    factDate2.buildBioString()

    const date1 = new Date(factDate1.bioString);
    const date2 = new Date(factDate2.bioString);
    const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
    const millisecondsPerDay = 1000*60*60*24;
    return Math.round(diffInMilliseconds / millisecondsPerDay);
  }
}

class Ref {
  constructor(name, body) {
    this.name = name;
    this.body = body;
    this.sourceId = "";
    this.citation = "";
    this.source = undefined;  // the source object for this ref, set when sourceId is resolved

    this.owningRef = undefined;
    this.ownedRefs = [];
    this.generateRef = false;
    this.primaryRefNeedsName = false;
    this.outputName = "";
  }

  extractSourceId(bio) {
    let idStartIndex = -1;
    let idEndIndex = -1;
    let citationStartIndex = -1;

    if (bio.useSpanId) {
      const prefix = "[[#";
      let prefixStartIndex = this.body.indexOf(prefix);
      if (prefixStartIndex != -1) {
        idStartIndex = prefixStartIndex + prefix.length;
        idEndIndex = this.body.indexOf("]]", idStartIndex);
        citationStartIndex = idEndIndex + 3;
      }
    }
    else {
      const prefix = "Source: S";
      let prefixStartIndex = this.body.indexOf(prefix);
      if (prefixStartIndex != -1) {
        idStartIndex = prefixStartIndex + prefix.length-1; // keep the S
        idEndIndex = this.body.indexOf(" ", idStartIndex);
        citationStartIndex = idEndIndex + 1;
      }
    }

    if (idStartIndex < idEndIndex) {
      this.sourceId = this.body.substring(idStartIndex, idEndIndex);
      this.citation = this.body.substring(citationStartIndex);
      this.citation = cleanupCitationText(this.citation);
    }
    else if (this.body.startsWith("APID 1,")) {
      const ancestryRecordTemplate = this.body.replace(/APID 1,(\w+)\:\:(\w+)\./g, "{{Ancestry Record|$1|$2}}");
      this.citation = "Ancestry record with no citation details: " + ancestryRecordTemplate;
    }
    else {
      this.citation = this.body;
      this.citation = cleanupCitationText(this.citation);
      if (this.citation[this.citation.length-1] != ".") {
        this.citation += ".";
      }
      // We used to add " No source specified for this citation in GEDCOM" but there are cases like: Wheatley-921
      // where the source IDs were removed and pasted into the refs. This isn't really an error.
    }

   // console.log("ExtractSourceId, this.sourceId = " + this.sourceId + ", this.body = " + this.body);
  }

  getMatchingSourceData(dataSet) {
    // if there is an owning ref then that may have a source when this one does not.
    const ref = (this.owningRef != undefined) ? this.owningRef : this;

    if (ref.source == undefined) {
      return undefined;
    }
    const sourceText = ref.source.text;
    const citationText = ref.body;
    for (const data of dataSet) {
      for (const sourceString of data.sourceStrings) {
        if (sourceText.includes(sourceString)) {
          if (data.citationStrings != undefined) {
            for (const citationString of data.citationStrings) {
              if (citationText.includes(citationString)) {
                return data;
              }
            }
          }
          else {
            return data;
          }
        }
      }
    }
    return undefined;
  }

  getMatchingResidenceData() {
    return this.getMatchingSourceData(residenceDataSet);
  }

  getMatchingBirthDateAccuracyData() {
    return this.getMatchingSourceData(birthDateAccuracyDataSet);
  }

  getMatchingDeathDateAccuracyData() {
    return this.getMatchingSourceData(deathDateAccuracyDataSet);
  }
}

class Fact {
  constructor(date, location, description, refs, unnamedRefs, sectionName, sectionId) {

    //this.date = date;
    this.location = location;
    this.description = description;
    this.refs = refs;
    this.unnamedRefs = unnamedRefs;

    this.sectionName = sectionName;
    this.factType = sectionId;

    this.marriageHusband = "";
    this.marriageWife = "";
    this.marriageChildren = [];

    this.factDate = new FactDate(date);

    // This are used to link Arrival and Departure facts for example
    this.ownedFact = undefined;
    this.owningFact = undefined;

    // used to hide a fact so it doesn't get written to the generated bio
    this.isHidden = false;

    this.suspectMarriage = false; // this is set in format2011 for parent marriages

    this.locationStringForBio = this.location;
  }

  getDateStringForOutput() {
    return this.factDate.bioString;
  }

  getDateStringForNarrative() {
    // This is like getDateStringForOutput but it will check for quarterly dates and instead of:
    //  October 1854
    // it will output:
    //  the October quarter of 1854

    const sourcesThatUseQuarters = [
      { 'string': "Birth Index", 'monthsBefore': 2 },
      { 'string': "Death Index", 'monthsBefore': 1 },
    ];

    if (this.factDate.isValid && this.factDate.day == 0 && this.factDate.month != 0) {
        // In records from ancestry quarters always seem to use the first month of the quarter
      if (this.factDate.month == 1 || this.factDate.month == 4 || this.factDate.month == 7 || this.factDate.month == 10) {
        for (var ref of this.refs.values()) {
          if (ref.source != undefined && ref.source.text != "") {
            const sourceText = ref.source.text;
      
            // See if the source include one of the predetermined strings
            for (var sourceThatUsesQuarters of sourcesThatUseQuarters) {
              if (sourceText.includes(sourceThatUsesQuarters.string)) {
                // If a birth is registered in a quarter it could have happened before that quarter
                var startMonth = this.factDate.month - sourceThatUsesQuarters.monthsBefore;
                var startYear = this.factDate.year;
                if (startMonth < 1) {
                  startMonth += 12;
                  startYear--;
                }
                
                var endMonth = this.factDate.month + 2; // end month of quarter
                var endYear = this.factDate.year;

                const startMonthString = MonthStrings[startMonth-1]; //January is 0
                const endMonthString = MonthStrings[endMonth-1]; //January is 0

                if (startYear == endYear) {
                  return "between " + startMonthString + " and " + endMonthString + " " + endYear;
                }
                return "between " + startMonthString + " " + startYear + " and " + endMonthString + " " + endYear;
              }
            }
          }
        }
      }
    }

    return this.factDate.bioString;
  }

  absDaysBetweenFacts(otherFact) {
    return this.factDate.absDaysBetweenDates(otherFact.factDate);
  }
 
  getLocationStringForOutput() {

    var latLonUrl = "";
    if (userOptions.include_mapLinks &&
      this.latitude != undefined && this.latitude != "" &&
      this.longitude != undefined && this.longitude != "") {

      var isLatLonValid = false;
      var lat = this.latitude.trim();
      var lon = this.longitude.trim();
      if (lat[lat.length-1] == ".") {
        lat = lat.substr(0,lat.length-1).trim();
      }
      if (lon[lon.length-1] == ".") {
        lon = lon.substr(0,lon.length-1).trim();
      }

      if (!isDigit(lat[0])) {
        if (lat[0].toLowerCase() == "n") {
          lat = lat.substring(1);
        }
        else if (lat[0].toLowerCase() == "e") {
          lat = "-" + lat.substring(1);
        }
      }

      if (!isDigit(lon[0])) {
        if (lon[0].toLowerCase() == "e") {
          lon = lon.substring(1);
        }
        else if (lon[0].toLowerCase() == "w") {
          lon = "-" + lon.substring(1);
        }
      }

      if (/^\-?[\d\.]*$/.test(lat) && /^\-?[\d\.]*$/.test(lon)) {
        latLonUrl = "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lon;
      }
    }

    var locationString = this.locationStringForBio;

    if (latLonUrl != "") {
      locationString = "[" + latLonUrl + " " + locationString + "]";
    }

    return locationString;
  }

  getSectionNameForSourceTitle(ref) {
    const source = ref.source;
    // This is used to put a title on a source (in the ref)

    var defaultName = undefined;

    if (this.factType == FactType.burial) {
      defaultName = "Burial";
    }
    if (this.factType == FactType.baptism) {
      defaultName = "Baptism";
    }
    if (this.factType == FactType.birth) {
      if (source != undefined && source.text.includes("Birth Index")) {
        return "Birth Registration";
      }
      // The date of birth can come from many places
      const matchingResidenceData = ref.getMatchingResidenceData();
      if (matchingResidenceData != undefined) {
        return matchingResidenceData.refTitle;
      }
      if (source != undefined && source.text.includes("Find A Grave Index")) {
        return "Gravestone";
      }
      if (source != undefined && source.text.includes("Marriage Bond")) {
        return "Marriage Bond";
      }
      defaultName = "Birth";
    }

    if (this.factType == FactType.marriage) {
      if (this.suspectMarriage) {
        return "Marriage of other person";
      }

      defaultName = "Marriage";
    }

    if (this.factType == FactType.death && source != undefined) {
      if (source.text.includes("Death Index")) {
        return "Death Registration";
      }
      if (source.text.includes("Probate")) {
        return "Probate";
      }
      if (source.text.includes("Will")) {
        return "Will";
      }
      if (source.text.includes("Burial")) {
        return "Burial";
      }
      if (source.text.includes("Find A Grave Index")) {
        return "Gravestone";
      }
      defaultName = "Death";
    }
    if (this.factType == FactType.residence) {
      const matchingResidenceData = ref.getMatchingResidenceData();
      if (matchingResidenceData != undefined) {
        return matchingResidenceData.refTitle;
      }

      if (source != undefined && source.text.includes("Marriage Bond")) {
        return "Marriage Bond";
      }

      defaultName = "Residence";
    }
    if (this.factType == FactType.employment) {
      const matchingResidenceData = ref.getMatchingResidenceData();
      if (matchingResidenceData != undefined) {
        return matchingResidenceData.refTitle;
      }

      defaultName = "Employment";
    }
    if (this.factType == FactType.census) {
      const matchingResidenceData = ref.getMatchingResidenceData();
      if (matchingResidenceData != undefined) {
        return matchingResidenceData.refTitle;
      }

//      defaultName = "Census";
    }
    if (this.factType == FactType.name && source != undefined) {

      const sourceToRefTitles = [
        ["Quarter Sessions", "Quarter Sessions"],
        ["Select Births and Christenings", "Child Baptism"],
        ["Church of England Baptisms, 1813-", "Child Baptism"],
        ["Births and Baptisms, 1813-", "Child Baptism"],
        ["Christening Index", "Child Baptism"],
        ["Social Security Applications and Claims Index", "Child Social Security"],
        ["Church of England Marriages, 1", "Child Marriage"],
        ["Marriages and Banns", "Child Marriage"],
        ["Select Marriages,", "Child Marriage"],
        ["Marriage Records", "Child Marriage"],
        ["Death Records", "Child Death"],
        ["Obituary Index", "Child Death"],
        ["Death Certificates", "Child Death"],
      ];
      // we need to look at the ref to determine what title to use
      for (const sourceToRefTitle of sourceToRefTitles) {
        if (source.text.includes(sourceToRefTitle[0])) {
          return sourceToRefTitle[1];
        }  
      }
      
      defaultName = "Unclassified";
    }

    if (source != undefined && (source.text.toLowerCase().includes("member tree") || source.text.toLowerCase().includes("family tree")))
    {
      const recordPrefix = "Record for ";
      const recordPrefixIndex = ref.citation.indexOf(recordPrefix);
      if (recordPrefixIndex != -1) {
        const recordNameIndex = recordPrefixIndex + recordPrefix.length;
        var recordName = ref.citation.substr(recordNameIndex);

        // Sometimes the source citation contains links or templates. We just want the first part that
        // would be the name
        recordName = stringRemoveAnythingAfterPrefixes(recordName,
          ["link:", "Link:", "https:", "http:", "{", "[", "*", "\n", ","]);
        recordName = removeTrailingPeriodAndSpaces(recordName);

        return "Family Tree record for " + recordName;
      }

      if (source.text.includes("Title: Family tree ") || source.text.includes("Title: Public Member Trees")) {
        return "Family Tree";
      }

      if (defaultName == undefined) {
        return "Family Tree";
      }
    }

    if (defaultName == undefined) {
      defaultName = this.sectionName;
      // remove any trailing :  (in fact remove any : characters)
      defaultName = defaultName.replace(/\:/g,"").trim();
    }

    return defaultName;
  }

  getCleanDateForOtherFields() {
    /*
    // remove trailing . or spaces
    var dateString = this.date;
    while (dateString[dateString.length-1] == "." || dateString[dateString.length-1] == " ") {
      if (dateString.length > 1) {
        dateString = dateString.substring(0, dateString.length-1);
      }
    }

    // remove leading spaces or zeros
    while (dateString[0] == "0" || dateString[0] == " ") {
      if (dateString.length > 1) {
        dateString = dateString.substring(1);
      }
    }

    return dateString;
    */
    if (this.factDate.isValid) {
      return this.factDate.bioString;
    }
    return this.factDate.inputString;
  }

  extractDateFromSourceOrCitation() {

    for (var ref of this.refs.values()) {
      if (this.factType == FactType.residence) {
        var isMarriageRef = false;
        if (ref.source != undefined && ref.source.text.includes("Marriages"))
        {
          isMarriageRef = true;
        }
        else if (ref.citation.includes("Marriages")) {
          isMarriageRef = true;
        }
        if (isMarriageRef) {
          const marriageDateIndex = ref.citation.indexOf("Marriage date:");
          if (marriageDateIndex != -1) {
            const endDateIndex = ref.citation.indexOf(";", marriageDateIndex);
            if (endDateIndex != -1) {
              const dateString = ref.citation.substring(marriageDateIndex + "Marriage date:".length, endDateIndex);
              const newFactDate = new FactDate(dateString);
              if (newFactDate.isValid) {
                this.factDate = newFactDate;
                return true;
              }
            }
          }
        }
      }
  
    }

    return false;
  }
  
  
  // if all the refs use the have the same matching residence data then return that, otherwise return undefined
  getMatchingResidenceData() {
    var matchingResidenceData = undefined;
    if (this.refs.size == 1) {
      const ref = this.refs.values().next().value;  // first element in Map

      matchingResidenceData = ref.getMatchingResidenceData();
    }
    else if (this.refs.size > 1) {
      // there is more than one ref. See if they all have the same matchingResidenceData
      var isFirst = true;
      for (var ref of this.refs.values()) {
        if (isFirst) {
          isFirst = false;
          matchingResidenceData = ref.getMatchingResidenceData();
        }
        else {
          var thisMatchingResidenceData = ref.getMatchingResidenceData();
          if (thisMatchingResidenceData != undefined && thisMatchingResidenceData != matchingResidenceData) {
            matchingResidenceData = undefined;
            break;
          }
        }
      }
    }  

    return matchingResidenceData;
  }

  removeDuplicateRefs() {

    if (this.isHidden) return;

    const refs = Array.from(this.refs.values());

    if (refs.length < 2) return;

    for (var refIndex = 0; refIndex < refs.length; refIndex++) {

      const ref = refs[refIndex];
      for (var otherRefIndex = 0; otherRefIndex < refIndex; otherRefIndex++) {
        const otherRef = refs[otherRefIndex];
        var isDuplicate = false;
        
        if (ref.owningRef == undefined && otherRef.owningRef == undefined) {
          if (ref.citation.toLowerCase() == otherRef.citation.toLowerCase()) {
            if (ref.source != undefined && otherRef.source != undefined) {
              if (ref.source.text.toLowerCase() == otherRef.source.text.toLowerCase()) {
                // it is a duplicate, ref is the same as a previous ref
                isDuplicate = true;
              }
            }
            else if (ref.source == undefined && otherRef.source == undefined) {
              isDuplicate = true;
            }
          }
        }

        if (isDuplicate) {
          // this is a duplicate, however since we are changing this very late in the day - after analyze and name refs
          // we need to fix things up.

          // change any owned refs of the otherRef to point to "ref" instead
          for (var ownedRef of otherRef.ownedRefs) {
            ownedRef.owningRef = ref;
            ref.ownedRefs.push(ownedRef);
          }
          otherRef.owningRef = ref;
          ref.ownedRefs.push(otherRef);

          otherRef.ownedRefs = [];
        }
      }
    }
  }

  removeRefsOwnedBySameRef() {
    if (this.isHidden) return;

    const refs = Array.from(this.refs.values());

    var refsToRemove = new Set;

    if (refs.length < 2) return;

    for (var refIndex = 0; refIndex < refs.length; refIndex++) {
      const ref = refs[refIndex];

      var refCitation = "";
      var refSource = "";
      if (ref.owningRef != undefined) {
        refCitation = ref.owningRef.citation.toLowerCase();
        if (ref.owningRef.source != undefined) {
          refSource = ref.owningRef.source.text.toLowerCase();
        }
      }
      else {
        refCitation = ref.citation.toLowerCase();
        if (ref.source != undefined) {
          refSource = ref.source.text.toLowerCase();
        }
      }

      for (var otherRefIndex = 0; otherRefIndex < refIndex; otherRefIndex++) {
        const otherRef = refs[otherRefIndex];

        var otherRefCitation = "";
        var otherRefSource = "";
        if (otherRef.owningRef != undefined) {
          otherRefCitation = otherRef.owningRef.citation.toLowerCase();
          if (otherRef.owningRef.source != undefined) {
            otherRefSource = otherRef.owningRef.source.text.toLowerCase();
          }
        }
        else {
          otherRefCitation = otherRef.citation.toLowerCase();
          if (otherRef.source != undefined) {
            otherRefSource = otherRef.source.text.toLowerCase();
          }
        }

        if (otherRef.owningRef == ref) {
          refsToRemove.add(otherRef);

          ref.ownedRefs = ref.ownedRefs.filter(function(refIter) {
            return refIter != otherRef;
          });
        }
        else if (ref.owingRef == otherRef) {
          refsToRemove.add(ref);

          otherRef.ownedRefs = otherRef.ownedRefs.filter(function(refIter) {
            return refIter != ref;
          });
        }
        else if (refCitation == otherRefCitation && refSource == otherRefSource) {
          if (otherRef.owningRef != undefined) {
            refsToRemove.add(otherRef);
          }
          else if (ref.owningRef != undefined) {
            refsToRemove.add(ref);
          }
          else {
            // this should never happen, duplicate refs neither owned by the other
          }
        }
      }
    }

    for (var refToRemove of refsToRemove) {
      this.refs.delete(refToRemove.name);
    }
  }

}

class FileFact {
  constructor(fileLink, fileFormat, description, sectionName) {
    this.fileLink = fileLink;
    this.fileFormat = fileFormat;
    this.description = description;
    this.sectionName = sectionName;
  }
}

class FactSection {
  constructor(name, text) {
    this.name = name;
    this.text = text;
    this.facts = [];
    this.fileFacts = [];
    this.factType = FactType.unknown;
  }

  parseFileSectionFacts() {

    // break the text into an array of lines
    var array = this.text.split("\n");

    // for each file there seem to be three lines: File, Format and Note:
    var fileLink = "";
    var fileFormat = "";
    var fileDescription = "";

    // Local function called when we find the line beyond the current fact
    function onFileFactCompleted(factSection) {
      if (fileLink != "") {
        //console.log("Creating file fact. Link is: " + fileLink);

        // check if this is a duplicate
        var newFact = new FileFact(fileLink, fileFormat, fileDescription, factSection.name);
        factSection.fileFacts.push(newFact);

        fileLink = "";
        fileFormat = "";
        fileDescription = "";
      }
    }

    // loop through the lines of the File section
    for (var i = 0; i < array.length; i++) {
      var line = array[i];
      if (line.startsWith("File:")) {
        onFileFactCompleted(this);
        fileLink = line.replace("File: ", "").trim();
      }
      else if (line.startsWith("Format:")) {
        fileFormat = line.replace("Format: ", "").trim();
      }
      else {
        if (fileDescription != "") {
          fileDescription = fileDescription + " ";
        }
        fileDescription = fileDescription + line.trim();
      }
    }
    onFileFactCompleted(this);
  }

  parseNoteSectionFacts(bio) {

    var noteText = this.text.trim();

    if (noteText.length == 0) {
      return;
    }

    if (noteText.includes("http")) {
      if (noteText.includes("Note: http://search.findmypast.co.uk")) {
        var indexOfNote = noteText.indexOf(" Note: http://search.findmypast.co.uk")
        if (indexOfNote) {
          var citationDetail = noteText.substring(0, indexOfNote);
          var indexOfLink = indexOfNote + 7;
          var indexOfNextSpace = noteText.indexOf(" ", indexOfLink);
          if (indexOfNextSpace == -1) {
            noteText = "[" + noteText.substring(indexOfLink) + " Findmypast] " + citationDetail;
          }
        }
      }

      if (noteText.includes("http://trees.ancestry.com/rd?f=image&guid=")) {
         noteText = noteText.replace(/http\:\/\/trees\.ancestry\.com\/rd\?f\=image\&guid\=([0-9a-f\-]+)\&tid\=([0-9]+)\&pid\=[0-9]+/g,
         "{{Ancestry Tree Media|$2|$1}}");
      }
      if (noteText.includes("http://trees.ancestry.com/rd?f=sse")) {
         noteText = noteText.replace(/http\:\/\/trees\.ancestry\.com\/rd\?f\=sse\&db\=([0-9a-z\-]+)\&h\=([0-9]+)\&ti=0\&indiv=try\&gss=pt/g,
         "{{Ancestry Record|$1|$2}}");
      }
    }

    // remove any HTML tags that will not work on WikiTree
    noteText = noteText.replace(/\&lt\;/g, "<");
    noteText = noteText.replace(/\&gt\;/g, ">");
    noteText = noteText.replace(/\'\'\'/g, "");
    noteText = noteText.replace(/\<p style=[^\>]+\>/g, "");
    noteText = noteText.replace(/\<\/p\>/g, "");
    noteText = noteText.replace(/style=\"[^\"]+\"/g, "");

    for (var existingNote of bio.noteLines) {
      if (existingNote == noteText) {
        return;
      }
    }

    bio.noteLines.push(noteText);
  }

  parseSectionFacts(bio) {
    if (this.name == "File") {
      this.parseFileSectionFacts();
      return;
    }

    if (this.name == "Note:") {
      this.parseNoteSectionFacts(bio);
      return;
    }

    if (this.name.toLowerCase() == "fsftid") {
      var fsId = this.text.trim();
      var fsId = this.text.trim().replace(/[^w]*(\w\w\w\w\-\w\w\w).*/, "$1");
      bio.otherSourceLines.push("* FamilySearch ID: [https://www.familysearch.org/tree/find/id?search=1&id="
       + fsId + " " + fsId + "].");
      return true;
    }
  
  
    if (this.name == "Origin:") {
      // Origin gives latitude and logitude. Presuably for the origin of a map.
      // For now we ignore it. This appears to be in FamilyTreeMaker GEDCOMs
      return;
    }

    if (this.name.startsWith("MH:")) {
      // Seen this in Carlsdotter-1116. Could be something to do with My Heritage?
      return;
    }

    var sectionName = this.name;
    var factType = this.factType;

    // The latest (c2020) format has the <ref> and </ref> tags on separate lines
    // Some earlier variations (c2018) do not, to make it easier to parse add newlines if not there
    var text = this.text.replace(/([^\n])<ref>/g, "$1\n<ref>\n");
    text = text.replace(/([^\n])<\/ref>/g, "$1\n</ref>\n");

    // the above 2 lines fail if there is already a \n before the < but there is not after the >
    text = text.replace(/<ref>([^\n])/g, "<ref>\n$1");
    text = text.replace(/<\/ref>([^\n])/g, "</ref>\n$1");

    text = text.replace(/([^\n])<ref name\=([^\s\/>]+)\s*>/g, "$1\n<ref name=$2>\n");
    text = text.replace(/([^\n])<ref name\=([^\s\/]+)\s*\/>/g, "$1\n<ref name=$2 />\n");

    // the above 2 lines fail if there is already a \n before the <ref but there is not after the >
    text = text.replace(/<ref name\=([^\s\/>]+)\s*>/g, "<ref name=$1>\n");
    text = text.replace(/<ref name\=([^\s\/]+)\s*\/>/g, "<ref name=$1 />\n");

    //console.log("SectionName = " + sectionName + ", id = " + this.factType);

    // break the text into an array of lines
    var array = text.split("\n");

    var i;
    var description = "";
    var date = "";
    var location = "";
    var refs = new Map;
    var unnamedRefs = [];

    var marriageHusband = "";
    var marriageWife = "";
    var marriageChildren = [];

    var fullName = "";
    var surname = "";
    var givenName = "";

    var ageString = "";
    var occupation = "";

    var latitude = "";
    var longitude = "";

    var eventFactStarted = false;
    var factCompleted = false;

    // Local function called when we find the line beyond the current fact
    function onFactCompleted(factSection, howCompleted) {

      // if there was no date and only one of description or location the line will have been put in description
      // but it actually belongs in location
      if (date == "" && description != "" && location == "") {
        if (factType != FactType.name && factType != FactType.employment) {
          location = description;
          description = "";
        }
      }

      if (factType == FactType.marriage) {

        if (description == "Marriage") {
          description = "";
        }
        else if (description.startsWith("Marriage ")) {
          description = description.replace("Marriage ", "").trim();
        }
      }
      else if (factType == FactType.residence || factType == FactType.census) {
        // Sometimes a census (1881 particularly) with have a description that contains something like Marital Status: MarriedRelationship to Head: Head.
        // This is ugly. We could make it more narrative but for now the quick fix is to add a space and period.
        // Examples:
        // - Marital Status: MarriedRelationship to Head: Head
        // - Relation to Head: SelfRelative Relation to Head: Wife.
        description = description.replace(/(Marital [Ss]tatus: [^R\s]+)(Relation)/, "$1. $2")
        description = description.replace(/(Relation to Head: [^R\s]+)(Relative)/, "$1. $2")
        description = description.replace(/(Age: [^M\s]+)(Marital)/, "$1. $2")
        description = description.replace(/(Religion: [^M\s]+)(Marital)/, "$1. $2")
      }
      else if (factType == FactType.military) {
        if (description == "Service:") {
          description = "";
        }
        else if (description.startsWith("Service: ")) {
          description = description.replace("Service: ", "");
        }
      }

      var newFact = new Fact(date, location, description, refs, unnamedRefs, sectionName, factType);

      if (factSection.name == "Marriage") {
        newFact.marriageHusband = marriageHusband;
        newFact.marriageWife = marriageWife;
        newFact.marriageChildren = marriageChildren;
      }

      if (ageString != "") {
        newFact.age = ageString;
      }

      if (occupation != "") {
        newFact.occupation = occupation;
      }

      newFact.latitude = latitude;
      newFact.longitude = longitude;

      factSection.facts.push(newFact);
      date = "";
      location = "";
      description = "";

      refs = new Map;
      unnamedRefs = [];

      marriageHusband = "";
      marriageWife = "";
      marriageChildren = [];

      ageString = "";
      occupation = "";

      factType = factSection.factType;
      eventFactStarted = false;
      factCompleted = false;

      //console.log("Fact created (" + howCompleted + "):")
      //console.log(newFact);
    }

    for (i = 0; i < array.length; i++) {
      var line = array[i];

      //console.log("parseSectionFacts, line is:", line);
  
      if (line.startsWith("<ref")) {
        // found start of a ref (or group of refs)
        do {
          if (line[line.length - 2] == "/") {

            const quoteIndex = line.indexOf('"');
            // there are some rare 2018 imports that have no quotes around the name
            if (quoteIndex == -1) {
              line = line.replace(/<ref name\=([^\s\/]+)\s*\/>/g, "<ref name=\"$1\" />");
            }

            // this is an instance rather than a definition
            const namePrefix = 'name="';
            const nameIndex = line.indexOf(namePrefix);
            const nameStartIndex = nameIndex + namePrefix.length;
            const nameSuffix = '"';
            const nameEndIndex = line.indexOf(nameSuffix, nameStartIndex);
            if (nameIndex != -1 && nameEndIndex != -1) {
              const name = line.substring(nameStartIndex, nameEndIndex);
              //console.log("Ref instance: name = " + name);
              var ref = new Ref(name, "");
              refs.set(name, ref);
            }
            else {
              console.log("ERROR: Ref instance not parsed. Line is: " + line);
            }
            i++;
          }
          else {
            // this is a definition
            const quoteIndex = line.indexOf('"');
            const bareNamePrefix = 'name=';
            // there are some rare 2018 imports that have no quotes around the name
            if (bareNamePrefix != -1 && quoteIndex == -1) {
              line = line.replace(/<ref name\=([^\s\/]+)\s*>/g, "<ref name=\"$1\">");
            }

            const namePrefix = 'name="';
            const nameIndex = line.search(namePrefix);
            const nameStartIndex = nameIndex + namePrefix.length;
            const nameSuffix = '">';
            const nameEndIndex = line.search(nameSuffix);
            var name = "";
            if (nameIndex != -1 && nameEndIndex != -1) {
              name = line.substring(nameStartIndex, nameEndIndex);
            }

            var body = array[i + 1];
            //console.log("Ref body: name = " + name + ", body = " + body);

            var lineIndex = i + 2;
            while (lineIndex < array.length && !array[lineIndex].startsWith("</ref>")) {
              body = body.concat("\n", array[lineIndex]);
              lineIndex++;
            }

            var ref = new Ref(name, body);

            if (name != "") {
              refs.set(name, ref);
            }
            else {
              // unnamed ref, these are unusual. Currently we store them in a separate array
              unnamedRefs.push(ref);
            }

            i =  lineIndex + 1;;
          }

          line = array[i];
        } while (line != undefined && line.startsWith("<ref"))

        // console.log("Refs: size is " + refs.size);

        i--;
        factCompleted = true;
      }
      else if (line.length <= 2) {
        // ignore lines with two or less characters. Sometime GEDCOMpare seems to randomly add 1 or two digit numbers.
      }
      else if (this.name == "Event:" && (!eventFactStarted || factCompleted)
               && line.search(/^\w+$/) != -1 && !FactDate.isStringAValidDate(line)) {
        if (factCompleted) {
          onFactCompleted(this, "on finding start of event fact");
        }
        var typeString = line.trim();
        sectionName = typeString;
        // set the factType for this sectionName
        for (var entry of sectionNamesFormat2020) {
          if (entry.name == sectionName) {
            factType = entry.id;
            break;
          }
        }
        eventFactStarted = true;
      }
      else if (this.name == "Event:" && (!eventFactStarted || factCompleted) && line.includes("SLAKE")) {
        // This handles a weird event in Stoddard-1992. Not sure if it occurs elsewhere
        if (i < array.length - 2) {
          i = i + 2;
        }
      }
      else if (factType == FactType.name && i == 0) {
        fullName = removeTrailingPeriodAndSpaces(line);
        description = line; // for consistency
        //console.log("Full name is : '" + fullName + "'");
      }
      else if (factType == FactType.name && line.startsWith("Given Name: ")) {
        givenName = line.replace("Given Name: ", "");
        givenName = removeTrailingPeriodAndSpaces(givenName);
        //console.log("Given name is : '" + givenName + "'");
      }
      else if (factType == FactType.name && line.startsWith("Surname: ")) {
        surname = line.replace("Surname: ", "");
        surname = removeTrailingPeriodAndSpaces(surname);
        //console.log("Surname is : '" + surname + "'");
      }
      else if (factType == FactType.name && line.startsWith("''Found multiple versions of name")) {
        // ignore this line for now
      }
      else if (factType == FactType.name && line.includes("in the NAME tag")) {
        // ignore this line for now
      }
      else if (factType == FactType.birth && line.startsWith("''Found multiple copies of birth date.")) {
        // ignore this line for now
      }
      else if (factType == FactType.death && line.startsWith("''Found multiple copies of death date.")) {
        // ignore this line for now
      }
      else if (factType == FactType.marriage && line.startsWith("Husband ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding husband");
        }
        marriageHusband = removeTrailingPeriodAndSpaces(line.replace("Husband ", ""));
      }
      else if (factType == FactType.marriage && line.startsWith("Wife ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding wife");
        }
        marriageWife = removeTrailingPeriodAndSpaces(line.replace("Wife ", ""));
      }
      else if (factType == FactType.marriage && line.startsWith("Child: ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding child");
        }
        marriageChildren.push(line.replace("Child: ", "").trim());
      }
      else if (factType == FactType.marriage && line == "Marriage") {
        // Ignore a line with just Marriage on it, it is sometimes added before each marriage
      }
      else if (factType == FactType.name && line.toLowerCase() == "married") {
        // Ignore a line with just "married" on it, it is sometimes indicating a married name?
      }
      else if (line.startsWith("MH:")) {
        // Not common. Seen in Carlsdotter-1116. Could be related to MyHeritage though that profile comes from a Gramps GEDCOM
        // Ignore this line and possibly a "RIN" line afterwards
        if (i < array.length - 1) {
          const nextLine = array[i+1];
          if (nextLine == "RIN") {
            i++;
          }
        }
      }
      else if (factType == FactType.residence && date != "" && line.startsWith("Source:")) {
        // this is a rare situation. Seem like a bug in GEDCOMpare. Sometimes, after the location and before the refs
        // There is a line with "Source:" alone on it followed by another line with some unidentified stuff on it.
        //console.log("'Source:' found");
        if (i < array.length - 1) {
          const nextLine = array[i+1];
          //console.log("Line following 'Source:' is : '" + nextLine + "'");

          const notePrefix = "Note: ";
          if (nextLine.startsWith(notePrefix)) {
            const noteText = nextLine.substr(notePrefix.length);
            const agePrefix = "Age: ";
            if (noteText.startsWith(agePrefix)) {
              ageString = removeTrailingPeriodAndSpaces(noteText.substr(agePrefix.length));
            }
            else {
              description += " " + nextLine.substr(notePrefix.length);
            }
          }
          else if (nextLine.startsWith("APID")) {
            var ref = new Ref("", nextLine);
            unnamedRefs.push(ref);
          }
          else {
            description += " " + nextLine;
          }

          i++;  // skip the next line
        }
      }
      else if (line.startsWith("-") || line.startsWith(":")) {
        // Unusual hybrid format that seems to have been generated in 2018
        // There could be a date, place and description on this line
        line = line.substr(1).trim();
        var multipleColons = false;
        while (line[0] == ":") {
          line = line.substr(1).trim();
          multipleColons = true;
        }

        // assume it is a date followed by a location and then perhaps a description
        // unless there were multiple colons
        if (!multipleColons) {
          var commaIndex = line.indexOf(",");
          var hyphenIndex = line.indexOf("-");
          var separatorIndex = commaIndex;
          if (commaIndex == -1 || (hyphenIndex != -1 && hyphenIndex < separatorIndex)) {
            separatorIndex = hyphenIndex;
          }

          var dateString = "";
          if (separatorIndex != -1) {
            dateString = line.substring(0, separatorIndex);
          }
          else if (FactDate.isStringAValidDate(line)) {
            dateString = line;
          }

          if (dateString != "" && (factCompleted || date != "")) {
            onFactCompleted(this, "on finding date");
          }
          date = dateString.trim();

          if (separatorIndex != -1) {
            line = line.substring(separatorIndex+1).trim();
            if (line != "") {
              location = line;
              factCompleted = true;
            }
          }
        }

      }
      else if (FactDate.isStringAValidDate(line)) {
        if (factCompleted || date != "") {
          onFactCompleted(this, "on finding date");
        }

        date = line;
        //console.log("Date: " + date);
      }
      else if (line == "File") {
        // sometime this happens with custom Ancestry facts, if it happens we need to skip the next 3 lines
        factCompleted = true;
        if (i + 3 < array.length) {
          i = i + 3;
        }
        else {
          i = array.length;
        }
      }
      else if (line == "Map:") {
        // Some profiles (probably not from Ancestry) contain a Map: line followed by a latitude and longitude
        if (i + 2 < array.length) {
          const latLine = array[i+1];
          const latPrefix = "Latitude: ";
          const longPrefix = "Longitude: ";
          if (latLine.startsWith(latPrefix)) {
            latitude = latLine.substr(latPrefix.length);
            i++;
          }
          const longLine = array[i+1];
          if (longLine.startsWith(longPrefix)) {
            longitude = longLine.substr(longPrefix.length);
            i++;
          }
        }
      }
      else if (line.startsWith("Note:")) {
        // exampleL Bodie-155 has Note lines and no description lines.
        if (description != "") {
          description += " ";
        }
        description += line;

        if (date != "" && location != "") {
          factCompleted = true;
        }
      }
      else {
        if (factCompleted) {
          onFactCompleted(this, "on finding description or location");
        }

        // could be description or location
        if (date == "" && description == "") {
          // assume it is a description

          description = line;
          //console.log("Description: " + line);
        }
        else if (location == "") {
          // assume it is a location
          location = line;
          //console.log("Location: " + line);

          var nextLineIsNote = false;
          var nextLineIsDateAndWeNeedDate = false;
          if (i + 1 < array.length) {
            nextLineIsNote = array[i+1].startsWith("Note:");
            if (date == "") {
              nextLineIsDateAndWeNeedDate = FactDate.isStringAValidDate(array[i+1]);
            }
          }

          // do not mark fact as completed if there is a "Note:" line following.
          if (!nextLineIsNote && !nextLineIsDateAndWeNeedDate) {
            factCompleted = true;
          }
        }
        else {
          // It never actualy gets here because the fact gets completed when it adds the location
          bio.addAlertMessage("The " + this.name + " section had an unexpected line: " + line);
        }
      }
    }

    if (factCompleted || description != "" || date != "") {
      onFactCompleted(this, "on end section");
    }
  }

  parseObjectSectionFactsFormat2011() {

    // break the text into an array of lines
    var array = this.text.split("\n");

    // for each file there seem to be three lines: File, Format and Note:
    var fileLink = "";
    var fileFormat = "";
    var fileDescription = "";

    // Local function called when we find the line beyond the current fact
    function onFileFactCompleted(factSection) {
      // We don't want to add external file links that are to local files on someone's computer
      if (fileLink != "" && fileLink.includes("http")) {
        //console.log("Creating file fact. Link is: " + fileLink);

        // check if this is a duplicate
        var newFact = new FileFact(fileLink, fileFormat, fileDescription, factSection.name);
        factSection.fileFacts.push(newFact);

        fileLink = "";
        fileFormat = "";
        fileDescription = "";
      }
    }

    // loop through the lines of the File section
    for (var i = 0; i < array.length; i++) {
      var line = array[i];
      if (line.startsWith(":: File:")) {
        onFileFactCompleted(this);
        fileLink = line.replace(":: File: ", "").trim();
      }
      else if (line.startsWith(":: Format:")) {
        fileFormat = line.replace(":: Format: ", "").trim();
      }
      else if (line.startsWith(":: Title:")) {
        fileDescription = line.replace(":: Title: ", "").trim();
      }
    }
    onFileFactCompleted(this);
  }

  parseFamilySearchIdSection(bio) {

    // break the text into an array of lines
    var array = this.text.split("\n");

    var fsId = "";

    if (array.length == 1) {
      //console.log(array[0]);

      if (this.name.toLowerCase() == "fsftid") {
        // Expect a line like:
        // : FSFTID KWVS-QDY
        fsId = array[0].replace(": FSFTID", "").trim();
      }
      else if (this.name.toLowerCase() == "fid") {
        // Expect a line like:
        // : FID LHDQ-JBL
        fsId = array[0].replace(": FID", "").trim();
      }
    }

    if (fsId != "") {
      const remainder = fsId.replace(/\w\w\w\w\-\w\w\w/, "").trim();

      if (remainder == "") {
        bio.otherSourceLines.push("* FamilySearch ID: [https://www.familysearch.org/tree/find/id?search=1&id="
         + fsId + " " + fsId + "].");
      }
      else {
        bio.addAlertMessage("The " + this.name + " section had an unexpected line: " + array[0]);
      }
    }
  }

  parseFamilySearchLinkSection(bio) {

    // Example line:
    // : FSLINK https://familysearch.org/tree/#view=ancestor&person=M66W-QHR


    // break the text into an array of lines
    var array = this.text.split("\n");

    var fsLink = "";

    if (array.length == 1) {
      //console.log(array[0]);

      fsLink = array[0].replace(": FSLINK", "").trim();
    }

    if (fsLink != "") {
      bio.otherSourceLines.push("* [" + fsLink + " FamilySearch Person link]");
    }
  }

  parseAncestralFileNumberSection(bio) {

    // break the text into an array of lines
    var array = this.text.split("\n");

    var afn = "";

    if (array.length == 1) {
      //console.log(array[0]);

      if (this.name.toLowerCase() == "ancestral file number") {
        // Expect a line like:
        // :  File Number:  1G3L-SW
        afn = array[0].replace(/:\s+File Number:\s+/i, "").trim();

        // Can also look like:
        // :Ancestral File Number:  5134-S7
        if (!afn || afn == array[0]) {
          afn = array[0].replace(/:\s*Ancestral File Number:\s+/i, "").trim();
        }
      }
    }

    if (afn != "") {
      const remainder = afn.replace(/\w\w\w\w\-\w\w/, "").trim();

      if (remainder == "") {
        bio.otherSourceLines.push("* Ancestral File Number: [https://www.familysearch.org/search/family-trees/results?q.afnId=" + afn + " " + afn + "].");
      }
      else {
        bio.addAlertMessage("The " + this.name + " section had an unexpected line: " + array[0]);
      }
    }
  }

  parseRecordFileNumberSection(bio) {
    // break the text into an array of lines
    var array = this.text.split("\n");

    var rfn = "";

    if (array.length == 1) {

      // We are interested in lines like this:
      // : Record File Number: geni:6000000008508719699
      // if they do not have geni in them then we ignore them

      var line = array[0];
      if (line.indexOf("geni") != -1) {
        rfn = line.replace(/:\s+Record File Number:\s+geni:/i, "").trim();
      }
    }

    if (rfn != "") {
      const remainder = rfn.replace(/\d+/, "").trim();

      if (remainder == "") {
        bio.otherSourceLines.push("* Geni Person ID: [https://www.geni.com/people/-/"
         + rfn + " " + rfn + "].");
      }
      else {
        bio.addAlertMessage("The " + this.name + " section had an unexpected line: " + array[0]);
      }
    }
  }

  detectJunkSection(bio, lcSectionName, text, sectionName) {

    let remainder = undefined;

    if (lcSectionName == "user id") {
      // === User ID ===
      // : User ID:  D78C9883C0854969BF3EC5CEB8DA83233DC2
      remainder = text.replace(/\: *(?:User )?ID\: *[\d\w\-]+/i, "").trim();
    }

    if (lcSectionName == "upd") {
      // === UPD ===
      // :  12 MAR 2013 15:21:45 GMT -0500 
      remainder = text.replace(/\: +(?:UPD *)?\d+ \w+ \d\d\d\d [\d\:]+ \w+[ \-\+\d]+/i, "").trim();
    }

    if (lcSectionName == "data changed") {
      // === Data Changed ===
      // : Data Changed:  
      // :: Date:  23 Feb 2015
      // ::: Time:  17:22
      // Prior to import, this record was last changed 17:22 23 Feb 2015.
      remainder = text.replace(/\: *(?:Data *)?Changed\: *\n\:\: (?:Date.*)?(?:\d* .*)?\n(?:\:\:\: .*\n)?Prior.*/i, "").trim();
    }

    if (lcSectionName == "crea") {
      // === CREA ===
      // : CREA 
      // :: Date:  29 Nov 2013
      // ::: Time:  12:17:26
      remainder = text.replace(/\: CREA *\n\:\: Date\: .*\n\:\:\: Time\:.*/i, "").trim();
    }

    if (lcSectionName == "creat") {
      // === CREAT ===
      // : CREAT 31 DEC 2002
      remainder = text.replace(/\: CREAT \d+ \w+ \d+/i, "").trim();
    }

    if (lcSectionName == "modif") {
      // === MODIF ===
      // : MODIF 31 DEC 2002
      remainder = text.replace(/\: MODIF \d+ \w+ \d+/i, "").trim();
    }

    if (lcSectionName == "fsv") {
      // === FSV ===
      // : FSV 1338611559
      remainder = text.replace(/\: FSV *\d*/i, "").trim();
    }

    if (lcSectionName == "tag") {
      // === TAG ===
      // : TAG 
      remainder = text.replace(/\: TAG[^\n]*/i, "").trim();
    }

    for (var suffix = 1; suffix < 10; suffix++) {
      const tagName = "tag" + suffix;
      if (lcSectionName == tagName) {
        // === TAGn ===
        // : TAGn 
        remainder = text.replace(/\: *TAG\d[^\n]*/i, "").trim();
        break;
      }
    }

    if (lcSectionName == "ppexclude") {
      // === PPEXCLUDE ===
      // : PPEXCLUDE 
      remainder = text.replace(/\: PPEXCLUDE[^\n]*/i, "").trim();
    }

    if (lcSectionName == "lds endowment") {
      // === LDS Endowment ===
      // : LDS Endowment:  
      // :: Date:  18 JUL 1973
      // :: LDS Temple:  PROVO
      remainder = text.replace(/\: +(?:LDS *)?Endowment\: *\n\:\:(?: *Date\:)?[^\n]*(?:\n\:\: LDS Temple\: +[^\n]*)?/i, "").trim();
    }

    if (lcSectionName == "lds baptism") {
      // === LDS Baptism ===
      // : LDS Baptism:  
      // :: Date:  21 JUN 1973
      // :: LDS Temple:  PROVO
      remainder = text.replace(/\: +(?:LDS *)?Baptism\: *\n\:\: (?:Date\: )?[^\n]*(?:\n\:\: LDS Temple\: +[^\n]*)?/i, "").trim();
    }

    if (lcSectionName == "lds sealing child") {
      // === LDS Sealing Child ===
      // : LDS Sealing Child:  
      // :: Date:  19 Oct 1981
      // :: Child of Family:  @F6@
      remainder = text.replace(/\: +(?:LDS *)?Sealing Child\: *\n\:\:(?: *Date\:)?[^\n]*(?:\n\:\: Child of Family\: +[^\n]*)?/i, "").trim();
    }

    if (lcSectionName == "record file number") {
      // === Record File Number ===
      // : Record File Number: geni:6000000008508719699
      remainder = text.replace(/\: +Record File Number: [^\n]*/i, "").trim();
    }

    if (lcSectionName == "record id number") {
      // === Record ID Number ===
      // : Record ID Number:  MH:I85
      remainder = text.replace(/\: +(?:Record +)?ID Number: [^\n]*/i, "").trim();
    }

    if (lcSectionName == "submitter") {
      // === Submitter ===
      // : Submitter: @I4172712771740123321@
      remainder = text.replace(/\: +Submitter: [^\n]*/i, "").trim();
    }

    if (lcSectionName == "color") {
      // === COLOR ===
      // : COLOR 9
      remainder = text.replace(/\: +COLOR \d*/i, "").trim();
    }

    if (lcSectionName == "reference") {
      // === Reference ===
      // : Reference:  186
      remainder = text.replace(/\: Reference\: *\d*/i, "").trim();
    }

    if (lcSectionName == "ancestors of interest") {
      // === Ancestors of Interest ===
      // : Ancestors of Interest:  MEDIUM
      remainder = text.replace(/\: Ancestors of Interest\: *\w*/i, "").trim();
    }

    if (lcSectionName == "physical description") {
      // === Physical Description ===
      // :  Description:  
      // ::  ID:  78A1B237-E1F7-4A33-8CF9-ECCEB7143B68
      // ::  ID Number:  MH:IF453
      remainder = text.replace(/\: +Description\: *\n\:\: +ID\: +[^\n]*\n\:\: +ID Number\: +[^\n]*/i, "").trim();
    }

    if (remainder == "") {
      return true;  // everything was matched and removed
    }

    // sometimes due to a merge there is a standard GEDCOM verbiage at the end of a section
    if (remainder) {
      remainder = bio.cleanTextThatMayContainGedcomName(remainder);
      if (!remainder) {
        return true;  // now looks OK
      }
    }

    if (remainder) {
      // the section name must have matched but there was data remaining or no match
      let message = "";
      if (remainder == text) {
        // No match at all
        message = "Found the unrecognized text '" + remainder + "' within the '" + sectionName + "' section.";
        message += " This is not the usual format for the section. The profile may have been edited.";
      }
      else {
        message = "Found the unrecognized text '" + remainder + "' within the '" + sectionName + "' section.";
        message += " This may be user entered text that should be in the biography or the result of a merge.";
      }
      bio.addAlertMessage(message);
      return true;
    }

    return false;
  }

  parseSectionFactsFormat2011(bio) {
    if (this.name == "Object") {
      this.parseObjectSectionFactsFormat2011();
      return true;
    }

    if (this.name == "Note") {
      this.parseNoteSectionFacts(bio);
      return true;
    }

    const lcSectionName = this.name.toLowerCase();

    if (lcSectionName == "fsftid" || lcSectionName == "fid") {
      this.parseFamilySearchIdSection(bio);
      return true;
    }

    if (lcSectionName == "fslink") {
      this.parseFamilySearchLinkSection(bio);
      return true;
    }

    if (lcSectionName == "ancestral file number") {
      this.parseAncestralFileNumberSection(bio);
      return true;
    }

    if (lcSectionName == "record file number") {
      this.parseRecordFileNumberSection(bio);
      return true;
    }

    if (this.detectJunkSection(bio, lcSectionName, this.text, this.name)) {
      return true;
    }

    // set the sectionId for this section
    var sectionName = this.name;
    for (var entry of sectionNamesFormat2011) {
      if (entry.name == sectionName) {
        this.factType = entry.id;
      }
    }
    var factType = this.factType;

    // Warn about unknown fact types
    if (factType == FactType.unknown && lcSectionName != "event") {
      bio.addAlertMessage("Found an unknown section name '" + sectionName + "'.");
    }

    // To make it easier to parse (more like format2020) put a newline before ang refs
    var text = this.text.replace(/([^\n])<ref>/g, "$1\n<ref>\n");
    text = text.replace(/([^\n])<\/ref>/g, "$1\n</ref>\n");

    // the above 2 lines fail if there is already a \n before the < but there is not after the >
    text = text.replace(/<ref>([^\n])/g, "<ref>\n$1");
    text = text.replace(/<\/ref>([^\n])/g, "</ref>\n$1");

    text = text.replace(/([^\n])<ref name\=([^\s\/>]+)\s*>/g, "$1\n<ref name=$2>\n");
    text = text.replace(/([^\n])<ref name\=([^\s\/]+)\s*\/>/g, "$1\n<ref name=$2 />\n");

    // the above 2 lines fail if there is already a \n before the <ref but there is not after the >
    text = text.replace(/<ref name\=([^\s\/>]+)\s*>/g, "<ref name=$1>\n");
    text = text.replace(/<ref name\=([^\s\/]+)\s*\/>/g, "<ref name=$1 />\n");
    
    // console.log(text);

    // break the text into an array of lines
    var array = text.split("\n");

    var i;
    var description = "";
    var date = "";
    var location = "";
    var refs = new Map;
    var unnamedRefs = [];

    var extraData = [];

    var marriageHusband = "";
    var marriageWife = "";
    var marriageChildren = [];

    var fullName = "";
    var surname = "";
    var givenName = "";

    var ageString = "";
    var occupation = "";
    var causeOfDeath = "";

    var latitude = "";
    var longitude = "";

    var factStarted = false;
    var factCompleted = false;

    var abortDueToError = false;

    // Local function called when we find the line beyond the current fact
    function onFactCompleted(factSection, howCompleted) {

      // Do some sanity checks to make sure we are not processing some meaningful user written
      // section

      // I'm not sure that this check makes any sense. If there is an event that is not known
      // it could be a perfectly valid event. I can't think of a way to spot it has been edited
      if (factType == FactType.unknown && lcSectionName != "event") {
        if (description.length > 200) {
          var testDate = new FactDate(date);
          if (!testDate.isValid) {
            bio.errorMessage = "Found a fact in the unknown section '" + sectionName + "' with a description of '" + description + "'.";
            bio.errorMessage += " This profile looks like it may have been edited.";
            bio.errorMessage += " If you want to proceed anyway try removing those lines first.";
            abortDueToError = true;
          }
        }
      }

      // we prefer undefined to an empt array on the fact
      let extraDataToAdd = undefined;
      if (extraData.length > 0) {
        extraDataToAdd = extraData;
      }

      var newFact = new Fact(date, location, description, refs, unnamedRefs, sectionName, factType);

      newFact.extraData = extraDataToAdd;


      if (factType == FactType.marriage) {
      //if (factSection.name == "Marriage") {
        newFact.marriageHusband = marriageHusband;
        newFact.marriageWife = marriageWife;
        newFact.marriageChildren = marriageChildren;

        // Before we add this fact to the fact section, check if it is a parent marriage
        // if it is before the birth date it is probably a parent marriage
        const birthFactDate = new FactDate(bio.birthDate);
        const thisFactDate = new FactDate(date);
        if (thisFactDate.isValid && birthFactDate.isValid && FactDate.compareDates(thisFactDate, birthFactDate) <= 0) {
          // marriage is before birth (or the same date)
          newFact.suspectMarriage = true;
        }
        else {
          // otherwise, if the person marrying is different to this person it is probably the parent
          var personMarrying = marriageHusband;
          if (bio.personGender == "Male") {
            personMarrying = marriageHusband;
          }
          else if (bio.personGender == "Female") {
            personMarrying = marriageWife;
          }

          const wikiLinkStart = "[[";
          if (personMarrying.includes(wikiLinkStart)) {
            const indexStartOfWikiId = personMarrying.indexOf(wikiLinkStart) + wikiLinkStart.length;
            const indexEndOfWikiEnd = personMarrying.indexOf("|", indexStartOfWikiId);
            if (indexEndOfWikiEnd != -1) {
              var wikiId = personMarrying.substring(indexStartOfWikiId, indexEndOfWikiEnd).toLowerCase();
              wikiId = wikiId.replace(" ", "_"); // WikiId should never contain space
              if (bio.wikiId.toLowerCase() != wikiId) {
                // this is a different person
                newFact.suspectMarriage = true;
              }
            }
          }
        }

        if (newFact.suspectMarriage) {
          bio.suspectMarriageFacts.push(newFact);
        }

      }

      if (ageString != "") {
        newFact.age = ageString;
      }

      if (occupation != "") {
        newFact.occupation = occupation;
      }

      if (causeOfDeath != "") {
        newFact.causeOfDeath = causeOfDeath;
      }

      newFact.latitude = latitude;
      newFact.longitude = longitude;

      factSection.facts.push(newFact);

      date = "";
      location = "";
      description = "";

      refs = new Map;
      unnamedRefs = [];
      extraData = [];

      marriageHusband = "";
      marriageWife = "";
      marriageChildren = [];

      ageString = "";
      occupation = "";
      causeOfDeath = "";

      factCompleted = false;
      factStarted = false;
      factType = factSection.factType;
      sectionName = factSection.name;

      //console.log("Fact created (" + howCompleted + "):")
      //console.log(newFact);
    }

    function addExtraData(dataLine) {
      // old impl
      /*
      if (description.length > 0) {
        description = description.concat(", ");
      }
      description = description.concat(dataLine);
      */

      // new impl
      // description = description.concat("\n: ", noteString);

      extraData.push(dataLine);
    }

    for (i = 0; i < array.length && !abortDueToError; i++) {
      var line = array[i];

      // sometimes has a <br> on end of line (maybe only if edited)
      line = line.replace("<br>", "");

      if (line.trim() == "") continue;

      //console.log("parseSectionFacts, line is:", line);
  
      if (line.startsWith("<ref")) {
        // found start of a ref (or group of refs)
        do {
          if (line[line.length - 2] == "/") {
            // this is an instance rather than a definition
            const namePrefix = 'name="';
            const nameIndex = line.indexOf(namePrefix);
            const nameStartIndex = nameIndex + namePrefix.length;
            const nameSuffix = '"';
            const nameEndIndex = line.indexOf(nameSuffix, nameStartIndex);
            if (nameIndex != -1 && nameEndIndex != -1) {
              const name = line.substring(nameStartIndex, nameEndIndex);
              //console.log("Ref instance: name = " + name);
              var ref = new Ref(name, "");
              refs.set(name, ref);
            }
            else {
              console.log("ERROR: Ref instance not parsed. Line is: " + line);
            }
            i++;
          }
          else {
            // this is a definition
            const namePrefix = 'name="';
            const nameIndex = line.search(namePrefix);
            const nameStartIndex = nameIndex + namePrefix.length;
            const nameSuffix = '">';
            const nameEndIndex = line.search(nameSuffix);
            var name = "";
            if (nameIndex != -1 && nameEndIndex != -1) {
              name = line.substring(nameStartIndex, nameEndIndex);
            }

            var body = array[i + 1];
            //console.log("Ref body: name = " + name + ", body = " + body);

            var lineIndex = i + 2;
            while (lineIndex < array.length && !array[lineIndex].startsWith("</ref>")) {
              body = body.concat("\n", array[lineIndex]);
              lineIndex++;
            }

            var ref = new Ref(name, body);

            if (name != "") {
              refs.set(name, ref);
            }
            else {
              // unnamed ref, these are unusual. Currently we store them in a separate array
              unnamedRefs.push(ref);
            }

            i =  lineIndex + 1;;
          }

          line = array[i];
        } while (line != undefined && line.startsWith("<ref"))

        // console.log("Refs: size is " + refs.size);

        i--;
      }
      else if (/^\s*\:\s*Date\s*\:/.test(line)) {
        // It is always an error to have a line like this:
        // : Date: 3 Jun 1593
        // It indicates the bio has been edited (there should always be at least two :: before date)
        bio.errorMessage = "Found line '" + line + "'. There should always be at least two colons before the word 'Date'.";
        bio.errorMessage += " It appears that this profile has been edited and cannot be parsed.";
        return false;
      }
      else if (/^\s*\:\s*Place\s*\:/.test(line)) {
        // It is always an error to have a line like this:
        // : Place:   Heacham, Norfolk, England 
        // It indicates the bio has been edited (there should always be at least two :: before Place)
        bio.errorMessage = "Found line '" + line + "'. There should always be at least two colons before the word 'Place'.";
        bio.errorMessage += " It appears that this profile has been edited and cannot be parsed.";
        return false;
      }
      else if (line.length <= 2 && line.indexOf(":") == -1) {
        // ignore lines with two or less characters. Sometime GEDCOMpare seems to randomly add 1 or two digit numbers.
      }
      else if (factType == FactType.name && line.startsWith(": Name: ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding name");
        }
        var name = line.replace(": Name: ", "");
        name = removeTrailingPeriodAndSpaces(name);
        description = name; // for consistency

        if (fullName == "") {
          fullName = name;
        }
        //console.log("Full name is : '" + fullName + "'");
        if (description != "") {
          factStarted = true;
        }

        factCompleted = true; // A name fact only requires one line
      }
      else if (factType == FactType.name && line.startsWith(":: Given Name: ")) {
        givenName = line.replace(":: Given Name: ", "");
        givenName = removeTrailingPeriodAndSpaces(givenName);
        //console.log("Given name is : '" + givenName + "'");
      }
      else if (factType == FactType.name && line.startsWith(":: Surname: ")) {
        surname = line.replace(":: Surname: ", "");
        surname = removeTrailingPeriodAndSpaces(surname);
        //console.log("Surname is : '" + surname + "'");
      }
      else if (factType == FactType.name && line.startsWith("Found multiple versions of NAME")) {
        // ignore this line for now
      }
      else if (factType == FactType.name && line.includes("in the NAME tag")) {
        // ignore this line for now
      }
      else if (factType == FactType.birth && line.startsWith("Found multiple copies of BIRT DATE.")) {
        // ignore this line for now
      }
      else if (factType == FactType.death && line.startsWith("Found multiple copies of DEAT DATE.")) {
        // ignore this line for now
      }
      else if (line.startsWith(": User ID:") || line.startsWith(":: User ID:") || line.startsWith(":: Record ID Number:")) {
        // ignore this line for now
      }
      else if (/^\:+ +ID\: +/.test(line) || /^\:+ +ID Number\: +/.test(line)) {
          // ignore this line for now
      }
      else if (factType == FactType.marriage && line.startsWith(": Husband: ")) {
        // Normally there is a ref in between marriages but in case not we check for a second "Husband" line
        if (factCompleted || (factStarted && marriageHusband != "")) {
          onFactCompleted(this, "on finding husband");
        }
        marriageHusband = line.replace(": Husband: ", "").trim();
        factStarted = true;
      }
      else if (factType == FactType.marriage && line.startsWith(": Wife: ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding wife");
        }
        marriageWife = line.replace(": Wife: ", "").trim();
        factStarted = true;
      }
      else if (factType == FactType.marriage && line.startsWith(": Child: ")) {
        if (factCompleted) {
          onFactCompleted(this, "on finding child");
        }
        marriageChildren.push(line.replace(": Child: ", "").trim());
        factStarted = true;
      }
      else if (factType == FactType.marriage && line.startsWith(":: Relationship to Father: ")) {
        // This is talking about the preceeding child of the marriage, ignore for now 
      }
      else if (factType == FactType.marriage && line.startsWith(":: Relationship to Mother: ")) {
        // This is talking about the preceeding child of the marriage, ignore for now 
      }
      else if (factType == FactType.marriage && line.startsWith(":: MARRNAME ")) {
        // Ignore for now, we should already have the name in the link on a preceeding line
      }
      else if (factType == FactType.marriage && line.startsWith("::: Given Name: ")) {
        // Ignore for now, we should already have the name in the link on a preceeding line
      }
      else if (factType == FactType.marriage && line.startsWith("::: Surname: ")) {
        // Ignore for now, we should already have the name in the link on a preceeding line
      }
      else if (line.startsWith(":: Object:")) {
        // Sometimes there is an object embedded inside another section, usuall the object is
        // also in the Object section so ignore this one.
        // Example:
        // :: Object:  
        // ::: File:  http:\//trees.ancestry.com/rd?f=image&guid=03e7ecdb-cc5e-4ab7-810b-a456aeaa606d&tid=70689642&pid=17
        // ::: Format:  com/rd?f=image&guid=03e7ecdb-cc5e-4ab7-810b-a456aeaa606d&tid=70689642&pid=17
        // ::: Title:  UK, City&County Directories  1766-1946
        // ::: Type:  PHOTO
        // ::: Scrapbook:  Y
        // ::: Primary or Preferred:  N
        while (i+1 < array.length && array[i+1].startsWith(":::")) {
          i++;
        }
      }
      else if (line.startsWith(":: Source: ")) {
        // I haven't found a consistent way to use this yet. Usually there are lines like "::: Note" following it.
        // Occasionally there is a lines like:
        //   :: Source: [[#S497]]<br>			
        //   ::: Page:  Schuerman<br>			
        // But that seems rare. For now ignore this line.
        if (line.startsWith(":: Source: [[#")) {
          // remove the ":: " from start
          var body = line.substr(3);
          var nextLine = array[i+1];
          let isFirstItem = true; // puting a \n at start of first line will get trimmed later
          while (nextLine != undefined && nextLine.startsWith(":::")) {

            let cleanedLine = nextLine.trim();
            var numColons = 0;
            // remove any leading :
            // count the number of : characters at start.
            while (cleanedLine.length > 0 && cleanedLine[0] == ":") {
              cleanedLine = cleanedLine.substr(1);
              colonPrefix += ":";
              numColons++;
            }
            cleanedLine = cleanedLine.trim();
            if (cleanedLine != "") {
              if (isFirstItem) {
                body = body + " " + cleanedLine;
                isFirstItem = false;
              }
              else {
                body = body + "\n* " + cleanedLine;
              }
            }
            i++;
            nextLine = array[i+1];
          }

          var ref = new Ref("", body);
          unnamedRefs.push(ref);
        }
      }
      else if (/\:+ Map\:/.test(line)) {
        var isError = false;
        // Some profiles (probably not from Ancestry) contain a :: Map: line followed by a latitude and longitude
        var cleanedLine = line.trim();
        var colonPrefix = "";
        var numColons = 0;
        // remove any leading :
        // count the number of : characters at start.
        while (cleanedLine.length > 0 && cleanedLine[0] == ":") {
          cleanedLine = cleanedLine.substr(1);
          colonPrefix += ":";
          numColons++;
        }
        cleanedLine = cleanedLine.trim();

        // The lat and should have one extra :
        colonPrefix += ":";

        if (i + 2 < array.length) {
          const latLine = array[i+1];
          const latPrefix = colonPrefix + " Latitude: ";
          const longPrefix = colonPrefix + " Longitude: ";
          if (latLine.startsWith(latPrefix)) {
            latitude = latLine.substr(latPrefix.length);
            i++;
          }
          else {
            isError = true;
          }
          const longLine = array[i+1];
          if (longLine.startsWith(longPrefix)) {
            longitude = longLine.substr(longPrefix.length);
            i++;
          }
          else {
            isError = true;
          }

          if (isError) {
            // error, "Type" lines should only occur within an "Event" section.
            bio.errorMessage = "Found line '" + line + "' within a '" + this.name + "' section.";
            bio.errorMessage += " 'Map' lines should be followed by Latitude and Longitude lines.";
            return false;
          }
        }
      }
      else if (line.startsWith(":: Latitude:")) {
        // Latitude is not always under a Map section - (e.g. Robinson-8669)
        const lat = line.replace(/\:\: Latitude\: */,"").trim();
        if (lat != line) {
          latitude = lat;
        }
      }
      else if (line.startsWith(":: Longitude:")) {
        // Longitude is not always under a Map section - (e.g. Robinson-8669)
        const long = line.replace(/\:\: Longitude\: */,"").trim();
        if (long != line) {
          longitude = long;
        }
      }
      else if (line.startsWith(":: COR")) {
        // Coordinates for a map
        while (i+1 < array.length && array[i+1].startsWith(":::")) {
          i++;
        }
      }
      else if (line.startsWith(":: CREA")) {
        // Created date/time, ignore the following lines
        while (i+1 < array.length && array[i+1].startsWith(":::")) {
          i++;
        }
      }
      else if (line.startsWith(":: Type: ")) {
        var typeString = line.substring(":: Type: ".length).trim();
        if (this.name == "Event") {
          sectionName = typeString;
          // set the factType for this sectionName
          for (var entry of sectionNamesFormat2011) {
            if (entry.name == sectionName) {
              factType = entry.id;
            }
          }
        }
        else if (sectionName == typeString) {
          // We may never get here. But if the "Type" matches this section type we can just ignore it
        }
        else if (/^\d+$/.test(typeString)) {
          // The type string is just a number. like:
          // :: Type:  3
          // This seems to happen in very early GEDCOM profiles. Just ignore the Type line
        }
        else {
          // error, "Type" lines should only occur within an "Event" section.
          bio.errorMessage = "Found line '" + line + "' within a '" + this.name + "' section.";
          bio.errorMessage += " 'Type' lines are only expected within an 'Event' section.";
          return false;  
        }

      }
      else if (line.search(/^\:\: *Place\:/) != -1) {
        var placeString = line.replace(/\:\: *Place\:/, "").trim();
        placeString = placeString.replace(/,,/g, ",");
        placeString = placeString.replace(/, ,/g, ",");
        placeString = placeString.replace(/\s*,\s*$/, "");

        location = placeString;
        factStarted = true;
      }
      else if (line.startsWith(":: Data Changed:  ")) {
        // can be followed by a date and time that it was changed
        while (i+1 < array.length && array[i+1].startsWith(":::")) {
          i++;
        }
      }
      else if (line.startsWith(": Data Changed:  ")) {
        // can be followed by a date and time that it was changed
        while (i+1 < array.length && ( array[i+1].startsWith("::") || array[i+1].startsWith(":::") )) {
          i++;
        }
      }
      else if (line.search(": Data Changed:$") == 0) {
        // can be followed by a date and time that it was changed
        while (i+1 < array.length && ( array[i+1].startsWith("::") || array[i+1].startsWith(":::") )) {
          i++;
        }
      }
      else if (line.startsWith(":: WT_REMOVED_FOR_PRIVACY") || line.startsWith("::: WT_REMOVED_FOR_PRIVACY")) {
        // ignore these
      }
      else if (line == "File") {
        // sometime this happens with custom Ancestry facts, if it happens we need to skip the next 3 lines
        factCompleted = true;
        if (i + 3 < array.length) {
          i = i + 3;
        }
        else {
          i = array.length;
        }
      }
      else if (line.startsWith(":: PREF ")) {
        // ignore line
      }
      else if (line.startsWith(": " + this.name + ":") || line.startsWith(": Census:")) {

        var isCensusInsideAnotherSection = false;
        if (!line.startsWith(": " + this.name + ":")) {
          isCensusInsideAnotherSection = true;
        }

        // For most sections (like Birth etc) this signals the start of a block for the same event
        // but marriages are a special case where there is usually husband/wife/child data before this.
        if (!factCompleted && factStarted && !(this.name == "Marriage" && !isCensusInsideAnotherSection)) {
          factCompleted = true;
        }

        if (factCompleted || date != "" || location != "") {
          onFactCompleted(this, "on finding start of fact");
        }

        // if this is a census fact inside another section then change the factType
        // (Just for this fact - it get changed back in onFactCompleted)
        var factName = this.name;
        if (isCensusInsideAnotherSection) {
          factName = "Census";
          sectionName = "Census";
          factType = FactType.census;
        }

        // see if there is more on the line, if so add it to description
        var extra = line.replace(": " + factName + ":", "").trim();
        // Sometimes there is just a Y - ignore this
        if (extra == "Y") {
          extra = "";
        }
        if (extra != "") {
          if (sectionName == "Occupation") {
            occupation = extra;
            factStarted = true;
          }
          else {
            if (description != "") {
              description = description.concat(", ");
            }
            description = description.concat(extra);
          }
        }
        if (description != "")
        {
          factStarted = true;
        }
      }
      else if (line.search("Removed ABT from [^ ]+ Date and marked as uncertain") == 0) {
        // ignore this line, it is correctly updated data field
      }
      else if (line.search("Could not parse date out of ") == 0) {
        // Add an alert
        bio.addAlertMessage("Found the message '" + line + "' within the '" + this.name + "' section. This may mean that the data field was not correctly set on import.");
      }
      else if (line.search(": [^:\s]+:$") == 0) {
        
        // Found a single colon field like:
        // : Census:
        // : Marriage:
        // That is not the name of this section and is not one of the expected ones like
        // Husband, Wife, Child
        // Treat this as an error
        
        var lineKeyword = line.replace(/: ([^:\s]+):.*/, "$1");
        bio.errorMessage = "Found line '" + line + "' within a '" + this.name + "' section.";
        bio.errorMessage += " Lines like this are only expected within the '" + lineKeyword + "' section.";
        return false;  
      }
      else if (line.search(/:\s*$/) == 0) {
        // found a single colon on its own. This indicates the start of the next fact
        if (!factCompleted && factStarted) {
          factCompleted = true;
        }

        if (factCompleted || date != "" || location != "") {
          onFactCompleted(this, "on finding start of fact");
        }
      }
      else if (sectionName == "Occupation" && line.startsWith(": ")) {

        // For Occupation sections this signals the start of a block for the same event
        if (!factCompleted && factStarted) {
          factCompleted = true;
        }

        if (factCompleted || date != "" || location != "") {
          onFactCompleted(this, "on finding start of fact");
        }

        // see if there is more on the line, if so add it to description
        var extra = line.replace(": ", "").trim();
        if (extra != "") {
          occupation = extra;
        }
      }
      else if (line.startsWith("::: Note:")) {
        var noteString = line.replace("::: Note:", "").trim();
        addExtraData(noteString);
      }
      else if (line.startsWith(":::: Age:")) {
        if (i + 1 < array.length) {
          var nextLine = array[i+1];
          if (nextLine.startsWith("::::")) {
            i++;
            ageString = nextLine.replace("::::", "").trim();
          }
        }
        factStarted = true;
      }
      else if (factType == FactType.death && line.startsWith(":: Cause:")) {
        var deathCauseString = line.replace(":: Cause:", "").trim();
        if (causeOfDeath != "") {
          causeOfDeath = causeOfDeath.concat(", ");
        }
        causeOfDeath = removeTrailingPeriodAndSpaces(causeOfDeath.concat(deathCauseString));
        factStarted = true;
      }
      else if (line.search(/^\:\: *Date\:/) != -1) {
        var dateString = line.replace(/\:\: *Date\:/, "").trim();

        if (!FactDate.isStringAValidDate(dateString)) {
          let ignoreDateString = false;
          // check if there only special characters in the dataString, if so we can ignore it
          let letterNumberIndex = dateString.search(/[^\_\-\.\#\?]+/);
          if (letterNumberIndex == -1) {
            ignoreDateString = true;
          }
          else if (dateString.toLowerCase() != "deceased") {
            ignoreDateString = true;
          }
          else if (dateString.toLowerCase() != "dead") {
            ignoreDateString = true;
          }

          if (!ignoreDateString) {
            bio.errorMessage = "Found invalid date format '" + dateString + "' within a '" + this.name + "' section.";
            bio.errorMessage += " Please change this date to a valid date format and rerun AGC.";
            return false;
          }
        }
        else {
          date = dateString;
        }
        factStarted = true;
      }
      else if (line.startsWith(":: ") && line.indexOf(":", 3) == -1) {
        // sometimes rather than :: Date and :: Place the lines look like:
        // :: ABT 1874
        // :: New York
        if (factCompleted) {
          onFactCompleted(this, "on finding description or location");
        }

        const text = line.replace(":: ", "").trim();

        if (date == "" && FactDate.isStringAValidDate(text)) {
          date = text;
          factStarted = true;
        }
        else if (date == "") {
          addExtraData(text);
          factStarted = true;
        }
        else if (location == "") {
          location = text;
          factStarted = true;
        }
        else {
          // can't just throw this away, add it to description:
          addExtraData(text);
          factStarted = true;
        }
      }
      else if (line.trim() == "") {
        // blank line - ignore
      }
      else {

        var cleanedLine = line.trim();
        var numColons = 0;
        // remove any leading :
        // count the number of : characters at start.
        while (cleanedLine.length > 0 && cleanedLine[0] == ":") {
          cleanedLine = cleanedLine.substr(1);
          numColons++;
        }
        cleanedLine = cleanedLine.trim();

        if (numColons == 0) {
          cleanedLine = bio.cleanTextThatMayContainGedcomName(cleanedLine).trim();

          if (cleanedLine) {
            let lineIsOK = false;
            if (factType == FactType.name) {
              if (cleanedLine == "Couldn't find any valid last name at birth.") {
                // can ignore this line
                bio.addAlertMessage("Found warning in Name fact: " + cleanedLine);
                lineIsOK = true;
              }
              else if (cleanedLine == "Couldn't find any valid first name.") {
                // can ignore this line
                bio.addAlertMessage("Found warning in Name fact: " + cleanedLine);
                lineIsOK = true;
              }
              else if (cleanedLine == "An explicit Surname and Married Name were both found.") {
                // can ignore this line
                bio.addAlertMessage("Found warning in Name fact: " + cleanedLine);
                lineIsOK = true;
              }
            }

            if (!lineIsOK) {
              // error, fallback case
              bio.errorMessage = "Found line '" + line + "' within a '" + this.name + "' section.";
              bio.errorMessage += " This is not consistent with the normal format for an early GEDCOM import.";
              bio.errorMessage += " Profile may have been merged or edited.";
              return false;
            }
          }
        }
        else {        
          if (factCompleted && numColons < 2) {
            onFactCompleted(this, "on finding description or location");
          }

          if (cleanedLine.length > 1) {    // ignore single digits like "Y"
            addExtraData(cleanedLine.trim());
            factStarted = true;
          }
        }
      }
    }

    if (factCompleted || factStarted) {
      onFactCompleted(this, "on end section");
    }

    if (abortDueToError) {
      return false;
    }

    return true;
  }
}

class Source {
  constructor(id, text) {
    this.id = id;
    this.text = text;
    this.usedByRef = false;
  }
}

class FamilySearchUriBuilder {

  constructor() {
    this.uri = "https://www.familysearch.org/search/record/results";
  }

  getFamilySearchCollectionIdForEnglandCensus(year) {
    const englandCensusFsCollections = [ 
      { 'year': 1841, 'collectionId' : "1493745" },
      { 'year': 1851, 'collectionId' : "2563939" },
      { 'year': 1861, 'collectionId' : "1493747" },
      { 'year': 1871, 'collectionId' : "1538354" },
      { 'year': 1881, 'collectionId' : "2562194" },
      { 'year': 1891, 'collectionId' : "1865747" },
      { 'year': 1901, 'collectionId' : "1888129" },
      { 'year': 1911, 'collectionId' : "1921547" },
    ];
    var collectionId = "";
    for (var census of englandCensusFsCollections) {
      if (census.year == year) {
        collectionId = census.collectionId;
      }
    }

    return collectionId;
  }

  encode(string) {
    // ensure string is a string (sometime a number like a date is passed in)
    string = "" + string;

    // Note that encodeUri does not encode the & character, so a string like "St Peter & Paul" will
    // terminate a query as "St Peter ". The function encodeUriComponent does encode & and alot more 
    // more characters. But it ends up not helping because FamilySearch seems to unencode the & before processing
    // the search. So we treat it specially and just remove any &, ?, or = characters.
    string = string.replace(/[\&\?\=]/g, "");

    string = encodeURI(string);

    return string;
  }

  addSearchTerm(string) {
    if (string == undefined || string == "") {
      return;
    }

    if (!this.searchTermAdded) {
      this.uri = this.uri.concat("?", string);
      this.searchTermAdded = true;
    }
    else {
      this.uri = this.uri.concat("&", string);
    }
  }

  addGivenName(firstName, middleNames) {
    var givenName = "q.givenName=" + this.encode(firstName);
    if (middleNames != undefined && middleNames != "") {
      givenName = givenName.concat(this.encode(" " + middleNames));
    }
    this.addSearchTerm(givenName);
  }

  addSurname(string) {
    this.addSearchTerm("q.surname=" + this.encode(string));
  }

  addBirthDate(string) {
    this.addSearchTerm("q.birthLikeDate.from=" + this.encode(string));
    this.addSearchTerm("q.birthLikeDate.to=" + this.encode(string));
  }

  addBirthDates(startDate, endDate) {
    this.addSearchTerm("q.birthLikeDate.from=" + this.encode(startDate));
    this.addSearchTerm("q.birthLikeDate.to=" + this.encode(endDate));
  }

  addBirthPlace(string) {
    if (string != "") {
      this.addSearchTerm("q.birthLikePlace=" + this.encode(string));
    }
  }

  addDeathDate(string) {
    this.addSearchTerm("q.deathLikeDate.from=" + this.encode(string));
    this.addSearchTerm("q.deathLikeDate.to=" + this.encode(string));
  }

  addMarriageDate(string) {
    this.addSearchTerm("q.marriageLikeDate.from=" + this.encode(string));
    this.addSearchTerm("q.marriageLikeDate.to=" + this.encode(string));
  }

  addMarriageLocation(string) {
    this.addSearchTerm("q.marriageLikePlace=" + this.encode(string));
  }

  addSpouseGivenName(string) {
    this.addSearchTerm("q.spouseGivenName=" + this.encode(string));
  }

  addSpouseSurname(string) {
    this.addSearchTerm("q.spouseSurname=" + this.encode(string));
  }

  addResidenceDate(string) {
    this.addSearchTerm("q.residenceDate.from=" + this.encode(string));
    this.addSearchTerm("q.residenceDate.to=" + this.encode(string));
  }

  addResidencePlace(string) {
    this.addSearchTerm("q.residencePlace=" + this.encode(string));
  }

  addCollectionId(string) {
    this.addSearchTerm("f.collectionId=" + this.encode(string));
  }

  getUri() {
    return this.uri;
  }
}

class FamilySearchTreeUriBuilder {

  constructor() {
    this.uri = "https://www.familysearch.org/tree/find/name";
  }

  encode(string) {
    // ensure string is a string (sometime a number like a date is passed in)
    string = "" + string;

    // Note that encodeUri does not encode the & character, so a string like "St Peter & Paul" will
    // terminate a query as "St Peter ". The function encodeUriComponent does encode & and alot more 
    // more characters. But it ends up not helping because FamilySearch seems to unencode the & before processing
    // the search. So we treat it specially and just remove any &, ?, or = characters.
    string = string.replace(/[\&\?\=]/g, "");

    string = encodeURI(string);

    return string;
  }

  addSearchTerm(string) {
    if (string == undefined || string == "") {
      return;
    }

    if (!this.searchTermAdded) {
      this.uri = this.uri.concat("?", string);
      this.searchTermAdded = true;
    }
    else {
      this.uri = this.uri.concat("&", string);
    }
  }

  addSelf(firstName, middleNames, lastName) {
    var selfName = "self=" + this.encode(firstName);
    if (middleNames != undefined && middleNames != "") {
      selfName = selfName.concat(this.encode(" " + middleNames));
    }
    selfName = selfName.concat(this.encode("|" + lastName));
    this.addSearchTerm(selfName);
  }

  addGender(string) {
    this.addSearchTerm("gender=" + string);
  }

  addBirth(birthLocation, birthYear) {
    var query = birthLocation + "|" + birthYear + "-" + birthYear;
    this.addSearchTerm("birth=" + this.encode(query));
  }

  addFather(firstNames, lastName) {
    var query = firstNames + "|" + lastName ;
    query = this.encode(query);
    query += "%7C0%7C0%7Cmale"
    this.addSearchTerm("parent1=" + query);
  }

  addMother(firstNames, lastName) {
    var query = firstNames + "|" + lastName ;
    query = this.encode(query);
    query += "%7C0%7C0%7Cfemale"
    this.addSearchTerm("parent2=" + query);
  }

  getUri() {
    return this.uri;
  }
}

class FreeBmdUriBuilder {

  constructor() {
    this.uri = "https://www.freebmd.org.uk/cgi/search.pl";
    this.searchTermAdded = false;
  }

  addSearchTerm(string) {
    if (string == undefined || string == "") {
      return;
    }
    if (!this.searchTermAdded) {
      this.uri = this.uri.concat("?", string);
      this.searchTermAdded = true;
    }
    else {
      this.uri = this.uri.concat("&", string);
    }
  }

  addType(string) {
    this.addSearchTerm("type=" + encodeURI(string));
  }

  addFirstNames(firstName, middleNames) {
    var givenName = "given=" + encodeURI(firstName);
    if (middleNames != undefined && middleNames != "") {
      givenName = givenName.concat(encodeURI(" " + middleNames));
    }
    this.addSearchTerm(givenName);
  }

  addSurname(string) {
    this.addSearchTerm("surname=" + encodeURI(string));
  }

  addYear(string) {
    this.addSearchTerm("start=" + encodeURI(string));
    this.addSearchTerm("end=" + encodeURI(string));
  }

  addAadDob(string) {
    this.addSearchTerm("aad=" + encodeURI(string));
  }

  getUri() {
    return this.uri;
  }
}

class GroUriBuilder {

  constructor() {
    this.uri = "https://www.gro.gov.uk/gro/content/certificates/indexes_search.asp";
    this.searchTermAdded = false;
  }

  addSearchTerm(string) {
    if (string == undefined || string == "") {
      return;
    }
    if (!this.searchTermAdded) {
      this.uri = this.uri.concat("?", string);
      this.searchTermAdded = true;
    }
    else {
      this.uri = this.uri.concat("&", string);
    }
  }

  addIndex(string) {
    this.addSearchTerm("index=" + encodeURI(string));
  }

  addFirstNames(firstName, middleNames) {
    this.addSearchTerm("forename1=" + encodeURI(removeExtendedAsciiCharacters(firstName)));

    if (middleNames != undefined && middleNames != "") {
      const spaceIndex = middleNames.indexOf(" ");
      if (spaceIndex != -1) {
        middleNames = middleNames.substring(0, spaceIndex);
      }
      this.addSearchTerm("forename2=" + encodeURI(removeExtendedAsciiCharacters(middleNames)));
    }
  }

  addSurname(string) {
    this.addSearchTerm("surname=" + encodeURI(removeExtendedAsciiCharacters(string)));
  }

  addYear(string) {
    this.addSearchTerm("year=" + encodeURI(string));
  }

  addAge(string) {
    this.addSearchTerm("age=" + encodeURI(string));
  }

  addGenderMale() {
    this.addSearchTerm("gender=M");
  }

  addGenderFemale() {
    this.addSearchTerm("gender=F");
  }

  getUri() {
    return this.uri;
  }
}

class GeniTreeUriBuilder {

  constructor() {
    this.uri = "https://www.geni.com/search";

    // &names=&group=everyone&title=
    // &first_name=Charles&middle_name=&last_names=Duck
    // &display_name=&nicknames=&maiden_name=&suffix=&claimed_status=any&living_status=any&gender=any
    // &shared_status=any&current%5Bcountry%5D=&current%5Bcountry_code%5D=&current%5Blocation%5D=
    // &parent_names=James+Duck&sibling_names=&partner_names=&child_names=
    // &birth%5Byear_range%5D=circa&birth%5Byear%5D=1847&birth%5Bend_year%5D=&birth%5Bcountry%5D=
    // &birth%5Bcountry_code%5D=&birth%5Blocation%5D=
    // &death%5Byear_range%5D=circa&death%5Byear%5D=1924&death%5Bend_year%5D=&death%5Bcountry%5D=
    // &death%5Bcountry_code%5D=&death%5Blocation%5D=
    // &baptism%5Byear_range%5D=circa&baptism%5Byear%5D=&baptism%5Bend_year%5D=&baptism%5Bcountry%5D=
    // &baptism%5Bcountry_code%5D=&baptism%5Blocation%5D=
    // &burial%5Byear_range%5D=circa&burial%5Byear%5D=&burial%5Bend_year%5D=&burial%5Bcountry%5D=
    // &burial%5Bcountry_code%5D=&burial%5Blocation%5D=

    // https://www.geni.com/search?first_name=Charles&middle_name=&last_names=Duck&parent_names=James+Duck&birth%5Byear%5D=1847&death%5Byear%5D=1924
  }

  encode(string) {
    // ensure string is a string (sometime a number like a date is passed in)
    string = "" + string;

    // Note that encodeUri does not encode the & character, so a string like "St Peter & Paul" will
    // terminate a query as "St Peter ". The function encodeUriComponent does encode & and alot more 
    // more characters. But it ends up not helping because FamilySearch seems to unencode the & before processing
    // the search. So we treat it specially and just remove any &, ?, or = characters.
    string = string.replace(/[\&\?\=]/g, "");

    string = encodeURI(string);

    return string;
  }

  addSearchTerm(string) {
    if (string == undefined || string == "") {
      return;
    }

    if (!this.searchTermAdded) {
      this.uri = this.uri.concat("?", string);
      this.searchTermAdded = true;
    }
    else {
      this.uri = this.uri.concat("&", string);
    }
  }

  addNames(firstName, middleNames, lastName) {
    this.addSearchTerm("first_name=" + this.encode(firstName));
    this.addSearchTerm("middle_name=" + this.encode(middleNames));
    this.addSearchTerm("last_names=" + this.encode(lastName));
  }

  addBirth(birthLocation, birthYear) {
    this.addSearchTerm("birth%5Byear%5D=" + this.encode(birthYear));
    this.addSearchTerm("birth%5Blocation%5D=" + this.encode(birthLocation));
  }

  addParents(parentString) {
    // &parent_names=James+Duck+Sarah+Lamb
    this.addSearchTerm("parent_names=" + this.encode(parentString));
  }

  addGender(genderString) {
    this.addSearchTerm("gender=" + this.encode(genderString));
  }

  getUri() {
    return this.uri;
  }
}

class CitationBuilder {

  constructor(dateToday, biography) {
    this.dateToday = dateToday;
    this.bio = biography;
    this.origData = "";
    this.citationRef = "";
    this.template = "";
    this.dataString = "";
  }

  getFamilySearchUriForEnglandCensusForYearAndResidence(year, residenceLocation) {
    var censusFactDate = new FactDate(year);
    const lastName = this.bio.getLastNameOnDate(censusFactDate);
    const firstName = this.bio.result.firstName;
    const middleName = this.bio.result.middleName;
    var birthFactDate = new FactDate(this.bio.birthDate);
    var birthLocation = "";

    const birthFact = this.bio.getFirstFactOfFactType(FactType.birth);
    if (birthFact != undefined) {
      birthFactDate = birthFact.factDate;
      birthLocation = birthFact.location;
    }

    var familySearchUri = "";
    if (firstName != "" && lastName != "" && collectionId != "" && birthFactDate.isValid) {
      var uriBuilder = new FamilySearchUriBuilder();
      uriBuilder.addGivenName(firstName, middleName);
      uriBuilder.addSurname(lastName);
      uriBuilder.addBirthDates(birthFactDate.year-1, birthFactDate.year+1);
      uriBuilder.addBirthPlace(birthLocation);
      uriBuilder.addResidenceDate(year);
      if (residenceLocation != "") {
        uriBuilder.addResidencePlace(residenceLocation);
      }
      var collectionId = uriBuilder.getFamilySearchCollectionIdForEnglandCensus(year);
      uriBuilder.addCollectionId(collectionId);
      familySearchUri = uriBuilder.getUri();
    }  

    return familySearchUri;
  }

  getNationalArchivesUriForEnglandCensus(year, classAndPieceSuffix) {
    var uri = "[https://discovery.nationalarchives.gov.uk/results/";

    if (year == 1911) {
      // the usual search doesn't work for 1911 census on National Archives
      if (classAndPieceSuffix != "") {
        uri = uri.concat("r?id=C13339");
        uri = uri.concat("&_q=", classAndPieceSuffix);
      }
      else {
        uri = uri.concat("r?_dss=range&_sd=");
        uri = uri.concat(year);
        uri = uri.concat("&_ed=");
        uri = uri.concat(year);
        uri = uri.concat("&_hb=tna&_q=Census+Returns+");
        uri = uri.concat(year);
      }
    }
    else {
      uri = uri.concat("r?_dss=range&_sd=");
      uri = uri.concat(year);
      uri = uri.concat("&_ed=");
      uri = uri.concat(year);
      uri = uri.concat("&_hb=tna&_q=Census+Returns+");
      uri = uri.concat(year);
      if (classAndPieceSuffix != "") {
        uri = uri.concat("+", classAndPieceSuffix);
      }
    }

    uri = uri.concat(" The National Archives]");

    return uri;
  }

  addAccessedDateIfWanted(text) {
    var newText = text;

    const option = userOptions.references_accessedDate;

    if (option != "none") {
      var date = "unknown date";

      if (option == "before") {

        // If there are gedcomNames then we want to use the latest date of all the gedcom imports
        let importDate = this.dateToday;
        let lastImportDateObj = undefined;
        for (let nameObj of this.bio.gedcomNames) {
          if (nameObj.date) {
            // Need to convert the date to the correct form
            var timestamp = Date.parse(nameObj.date);
            if (!isNaN(timestamp)) {
              const importDateObj = new Date(nameObj.date);

              if (importDateObj && (!lastImportDateObj || importDateObj.getTime() > lastImportDateObj.getTime())) {
                const day = importDateObj.getDate();
                const month = MonthStrings[importDateObj.getMonth()]; //January is 0
                const year = importDateObj.getFullYear();
                importDate = day.toString() + " " + month + " " + year;
                lastImportDateObj = importDateObj;
              }
            }
          }
        }

        date = "before " + importDate;
      }
      else if (option == "today") {
        date = this.dateToday;
      }

      newText = newText.concat(" (accessed " + date + ")");
    }

    return newText;
  }
  
  cleanAndCombineSourceAndCitationForUnknownCases(fact, ref) {

    var sourceText = "";
    var includeAccessedDate = true;
    var cleanedSourceAndCitation = "";

    if (ref.source != undefined) {
      sourceText = ref.source.text.trim();
    }
    else if (ref.sourceId != "") {
      // there was a source ID so the source is missing
      sourceText = "Missing source ID " + ref.sourceId;
    }
    else {
      if (!ref.citation.includes("http") && !ref.citation.includes("{{")) {
        // this is for the "Source:" lines in facts. They are usually meaningless things so saying we accessed them
        // makes no sense.
        includeAccessedDate = false;
      }
    }

    if (sourceText != "") {
      cleanedSourceAndCitation = sourceText;
      if (!sourceText.endsWith(".")) {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat(".");
      }

      if (ref.citation != "") {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat(" Citing: ");
      }
    }

    cleanedSourceAndCitation = cleanedSourceAndCitation.concat(ref.citation);
    if (includeAccessedDate) {
      cleanedSourceAndCitation = this.addAccessedDateIfWanted(cleanedSourceAndCitation);
    }

    return cleanedSourceAndCitation;
  }

  cleanSource_ExtractOrigData(sourceText) {
    var origData = "";
    const orgDataPrefix = "Original data - ";
    const origDataIndex = sourceText.indexOf(orgDataPrefix);
    if (origDataIndex != -1) {
      const origDataStart = origDataIndex + orgDataPrefix.length;
      if (origDataStart != -1) {
        var origDataEnd = sourceText.indexOf(" Note:", origDataStart);
        var origData = "";
        if (origDataEnd == -1) {
          origData = sourceText.substring(origDataStart);
        }
        else {
          origData = sourceText.substring(origDataStart, origDataEnd);
        }
        origDataEnd = origData.search(" Data imaged from");
        if (origDataEnd != -1) {
          origData = origData.substring(0, origDataEnd);
        }
        origData = origData.trim();

        var cleanedOrigData = origData.replace(
          /Census Returns of England and Wales, (....)\. Kew\, Surrey\, England\: The National Archives of the UK \(TNA\)\: Public Record Office \(PRO\)\, ....\./,
          "[https://discovery.nationalarchives.gov.uk/results/r?_dss=range&_sd=$1&_ed=$1&_hb=tna&_q=Census+Returns+England+Wales General Register Office: $1 Census Returns] [https://discovery.nationalarchives.gov.uk/details/a/A13530124 The National Archives, Kew]");

        if (cleanedOrigData != "") {
          origData = cleanedOrigData;
        }
      }
    }
    else {
      // No "Original data"
      origData = sourceText;
      // Remove the "British Isles Census Index provided by The Church ..." part
      const origDataEnd = origData.search(" British Isles Census Index provided by The Church");
      if (origDataEnd != -1) {
        origData = origData.substring(0, origDataEnd);
      }
      origData = origData.trim();
    }

    return origData;
  }

  extractTemplateAndDataString(citation) {
    var citationRem = citation;

    const possiblePrexix = "Database online. ";
    if (citationRem.startsWith(possiblePrexix)) {
      citationRem = citationRem.substring(possiblePrexix.length);
    }

    const notePrefix = "Note:";
    var noteStart = citation.indexOf(notePrefix);

    var dataPrefix = "Note: Data: Text: ";
    var dataNoteStart = citation.indexOf(dataPrefix);

    if (dataNoteStart == -1) {
      // There was no "Note: Data: Text: ", this can happen for 1911 census
      dataPrefix = "Data: Text: ";
      dataNoteStart = citation.indexOf(dataPrefix);
    }

    if (noteStart != -1) {
      if (dataNoteStart == -1 || noteStart < dataNoteStart) {
        var beforeNote = citation.substring(0, noteStart).trim();

        // On some older case there is just text like "141 Name: Page" in beforeNote
        beforeNote = beforeNote.replace(/\d* *Name\: *Page */, "").trim();
        beforeNote = beforeNote.replace(/TMPLT FIELD */, "").trim();

        if (beforeNote != "") {
          if (this.citationRef != "") {
            this.citationRef = this.citationRef.concat(" ");
          }
          this.citationRef = this.citationRef.concat(beforeNote);
        }
        citationRem = citation.substring(noteStart+notePrefix.length).trim();
      }
      else if (dataNoteStart != -1) {
        // dataNoteStart comes before noteStart
        var beforeNote = citation.substring(0, dataNoteStart).trim();
        if (beforeNote != "") {
          if (this.citationRef != "") {
            this.citationRef = this.citationRef.concat(" ");
          }
          this.citationRef = this.citationRef.concat(beforeNote);
        }
        citationRem = citation.substring(dataNoteStart).trim();
      }
    }
    else if (dataNoteStart != -1) {
      var beforeNote = citation.substring(0, dataNoteStart).trim();
      if (beforeNote != "") {
        if (this.citationRef != "") {
          this.citationRef = this.citationRef.concat(" ");
        }
        this.citationRef = this.citationRef.concat(beforeNote);
      }
      citationRem = citation.substring(dataNoteStart).trim();
    }

    if (dataNoteStart == -1) {
      // failed to parse the more modern style. There is an old style that has "TMPLT FIELD" in it
      var tfPrefix = "TMPLT FIELD";
      var tfIndex = citation.indexOf(tfPrefix);
      if (tfIndex != -1) {
        var beforeNote = citation.substring(0, tfIndex).trim();
        citationRem = citation.substring(tfIndex+tfPrefix.length).trim();

        citationRem = citationRem.replace(/^Name\: *Page *(?:VALUE *)?/,"").trim();

        if (citationRem == beforeNote) {
          beforeNote = "";
        }

        if (beforeNote != "") {
          if (this.citationRef != "") {
            this.citationRef = this.citationRef.concat(" ");
          }
          this.citationRef = this.citationRef.concat(beforeNote);
        }
      }
    }

    // switch dataNoteStart to be an index into citationRem
    dataNoteStart = citationRem.indexOf(dataPrefix);

    if (dataNoteStart != -1) {
      var dataStart = dataNoteStart + dataPrefix.length;

      var templateStart = citationRem.indexOf("{{");
      if (templateStart != -1) {
        const templateEnd = citationRem.indexOf("}}", templateStart);
        this.template = citationRem.substring(templateStart, templateEnd+2);

        if (dataStart < templateStart-1) {
          this.dataString = citationRem.substring(dataStart, templateStart-1);

          // There could be more after the template
          var postTemplate = citationRem.substring(templateEnd+2);
          if (postTemplate != "") {
            // sometimes there is a "Note: " at the start of post template
            postTemplate = postTemplate.replace(/^ *Note\: */, "");
            postTemplate.trim();
            if (postTemplate != "") {
              if (this.citationRef != "") {
                this.citationRef = this.citationRef.concat(" ");
              }
              this.citationRef = this.citationRef.concat(postTemplate);
            }
          }
        }
        else {
          this.dataString = citationRem.substring(dataStart);
        }
      }
      else {
        this.dataString = citationRem.substring(dataStart);
      }

      // a "Note:"" might be on the end in which case remove it
      this.dataString = this.dataString.replace(/ *Note\: *$/, "");
    }
    else {
      // no note - could still be a template
      var templateStart = citationRem.indexOf("{{");
      if (templateStart != -1) {
        const templateEnd = citationRem.indexOf("}}", templateStart);
        this.template = citationRem.substring(templateStart, templateEnd+2);

        this.citationRef = this.citationRef.concat(" ", citationRem.substring(0, templateStart)).trim();

        // sometimes there is a "Link: " before the template
        this.citationRef = this.citationRef.replace(/ Link\: *$/, "");

        // sometimes there is a "Note: " at the start
        this.citationRef = this.citationRef.replace(/^Note\: /, "");

        // There could be more after the template
        var postTemplate = citationRem.substring(templateEnd+2);
        if (postTemplate != "") {
          // sometimes there is a "Note: " at the start of post template
          postTemplate = postTemplate.replace(/^ *Note\: */, "");
          postTemplate.trim();
          this.citationRef = this.citationRef.concat(" ", postTemplate).trim();
        }
      }
      else {
        // no template, treat the whole of citationRem as citationRef
        this.citationRef = this.citationRef.concat(" ", citationRem).trim();
      }
    }

    this.citationRef = this.citationRef.replace(/(?: File)*(?: \@\w\d*\@)*$/g, "").trim();
  }

  buildCleanedSourceAndCitation(lineBreakBeforeRef) {
    var cleanedSourceAndCitation = this.origData;
    var lineLength = cleanedSourceAndCitation.length;
    const lineMax = 50;

    this.citationRef = this.citationRef.trim();
    // remove any punctuation on end of citationRef
    this.citationRef = this.citationRef.replace(/[ \.\;\,]*$/g, "");

    this.citationRef = this.citationRef.replace(/^Data\: */g, "");
    this.citationRef = this.citationRef.replace(/^Text\: */g, "");
    this.citationRef = this.citationRef.replace(/ *Note\: *$/g, "");

    if (this.citationRef != "") {
      if (!/^.*[\:\,\.]$/.test(cleanedSourceAndCitation)) {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat(",");
      }
      if (lineBreakBeforeRef && lineLength + this.citationRef.length > lineMax) {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat("<br/>\n");
        lineLength = 0;
      }
      else {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat(" ");
      }
      cleanedSourceAndCitation = cleanedSourceAndCitation.concat(this.citationRef);
      lineLength += this.citationRef.length;
    }
    cleanedSourceAndCitation = cleanedSourceAndCitation.concat(".");

    if (this.template != "") {
      var templateString = this.addAccessedDateIfWanted(this.template);
      if (lineLength + templateString.length > lineMax) {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat("<br/>\n");
        lineLength = 0;
      }
      cleanedSourceAndCitation = cleanedSourceAndCitation.concat(templateString);
      lineLength += templateString.length;
    }

    this.dataString = this.dataString.trim();
    if (this.dataString != "") {
      if (this.template != "") {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat(",");
      }
      if (lineLength + this.dataString.length > lineMax) {
        cleanedSourceAndCitation = cleanedSourceAndCitation.concat("<br/>\n");
        lineLength = 0;
      }
      cleanedSourceAndCitation = cleanedSourceAndCitation.concat(this.dataString);
    }
    if (this.template != "" || this.dataString != "") {
      cleanedSourceAndCitation = cleanedSourceAndCitation.concat(".");
    }

    return cleanedSourceAndCitation;
  }
  
  cleanSource_AncestryCensusEnglandWales(fact, sourceText, citation) {

    // It is not OK to use the date from the fact because sometimes a 1911 census is used as source for
    // a marriage for example.
    var year = sourceText.replace(/.*(\d\d\d\d) England Census.*/, "$1");
    if (year.length != 4) {
      year = fact.factDate.year;
    }

    const titleString = "Census Returns of England and Wales";
    var familySearchUri = "";

    // currently overriding the orig data from the source completely
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {

      familySearchUri = this.getFamilySearchUriForEnglandCensusForYearAndResidence(year, fact.location);
      
      if (familySearchUri != "") {
        this.origData = "[" + familySearchUri + " " + year + " " + titleString + "]";
      }
      else {
        this.origData = year + " " + titleString;
      }
      this.origData = this.origData.concat(", original data from ");

      var nationalArchivesUri = this.getNationalArchivesUriForEnglandCensus(year, "");
      this.origData = this.origData.concat(nationalArchivesUri);
    }
    else {
      this.origData = "" + year + " Census Returns of England and Wales, original data from The National Archives.";
    }

    this.extractTemplateAndDataString(citation);

    if (this.dataString != "") {
      var cleanedDataString = this.dataString.replace(
        /Birth date\: ([^\;]+)\;* Birth place: ([^\;]+)\;* Residence date: ([^\;]+)\;* Residence place: ([^\;]+)\;*/,
        "Birth date: $1, Birth place: $2,<br/>Residence date: $3, Residence place: $4");

      // some older gedcoms imports have a different format
      cleanedDataString = cleanedDataString.replace(
        /Name\: *([^\;]+)\;* *Birth Date: *([^\;]+)\;* *Birth Place: *([^\;]+)\;* *Residence Date: *([^\;]+)\;* *Residence Place: *([^\;]+)\;* */,
        "Name: $1, Birth date: $2, Birth place: $3,<br/>Residence date: $4, Residence place: $5");

      cleanedDataString = cleanedDataString.replace(
        /Name\: *([^\;]+)\;* *Birth: *([^\;\d]+[\d]+)([^\;]+)\;* *Residence: *([^\;\d]+[\d]+)([^\;]+)\;* */,
        "Name: $1, Birth date: $2, Birth place: $3,<br/>Residence date: $4, Residence place: $5");
  
      if (cleanedDataString != undefined || cleanedDataString.length > this.dataString.length) {
        this.dataString = cleanedDataString;
      }
    }

    // if there is a citationRef attempt to add more to the National Archives link
    if (this.citationRef != "" && userOptions.sources_addFreeLinksForSubscriptionSources)
    {
      var classAndPiece = "";
      const bookIndex = this.citationRef.indexOf("Book:");
      if (bookIndex != -1) {
        classAndPiece = this.citationRef.substring(0,bookIndex);
      }
      else {
        const folioIndex = this.citationRef.indexOf("Folio");
        if (folioIndex != -1) {
          classAndPiece = this.citationRef.substring(0,folioIndex);
        }
        else if (this.citationRef.search(/Class\:\s*[^;\s]+\; Piece\:*\s*[^;\s]+\;* */) != -1) {
          classAndPiece = this.citationRef;
        }
      }
      if (classAndPiece != "") {
        classAndPiece = classAndPiece.replace(/\&nbsp\;/g," ");
        var classAndPieceSuffix = classAndPiece.replace(/Class\:\s*([^;]+)\; Piece\:*\s*([^;\s]+)\;*.*/, "$1+$2")

        // ocasionally there is a space in the class, like "RG 9", eliminate spaces
        classAndPieceSuffix = classAndPieceSuffix.replace(/ /g, "");

        // if there is anything bad for a URL in classAndPieceSuffix, give up
        if (classAndPieceSuffix.search(/[ \;\:\,\.\/\\\?\&\%]/) == -1) {
          // we can now create an improved link to National Archives
          if (familySearchUri != "") {
            this.origData = "[" + familySearchUri + " " + year + " " + titleString + "]";
          }
          else {
            this.origData = year + " " + titleString;
          }
          this.origData = this.origData.concat(", original data from ");

          var nationalArchivesUri = this.getNationalArchivesUriForEnglandCensus(year, classAndPieceSuffix);
          this.origData = this.origData.concat(nationalArchivesUri, ", reference:");
        }
      }
    }

    return this.buildCleanedSourceAndCitation(false);
  }

  cleanSource_AncestryBmdBirthReg(fact, sourceText, citation) {

    var indexTitle = "England & Wales, FreeBMD Birth Index, 1837-1915";
    var endIndex = sourceText.indexOf("FreeBMD Publication:");
    if (endIndex != -1) {
      indexTitle = sourceText.substring(0, endIndex).trim();
    }
    else {
      endIndex = sourceText.indexOf("Ancestry.com");
      if (endIndex != -1) {
        indexTitle = sourceText.substring(0, endIndex).trim();
      }
    }
    // sometimes there is an "Author:" before the publication so it gets left at end of string
    indexTitle = indexTitle.replace(/ *Author\: *$/, "");
    // sometimes there is a "Title:" at the start
    indexTitle = indexTitle.replace(/^ *Title\: */, "");

    // currently overriding the orig data from the source completely
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      const firstName = this.bio.result.firstName;
      const middleName = this.bio.result.middleName;
      const lnab = this.bio.lnab;

      var uriBuilder = new FreeBmdUriBuilder();
      uriBuilder.addType("Births");
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(lnab);
      uriBuilder.addYear(fact.factDate.year);

      this.origData = "[" + uriBuilder.getUri();
      this.origData = this.origData.concat(" ", indexTitle, "], ");

      uriBuilder = new GroUriBuilder();
      uriBuilder.addIndex("EW_Birth");
      uriBuilder.addYear(fact.factDate.year);
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(lnab);
      if (this.bio.personGender == "Male") {
        uriBuilder.addGenderMale();
      }
      else {
        uriBuilder.addGenderFemale();
      }

      this.origData = this.origData.concat("original data from [", uriBuilder.getUri(), " General Register Office]");
    }
    else {
      this.origData = indexTitle + ", ";
      this.origData = this.origData.concat("original data from General Register Office");
    }

    this.extractTemplateAndDataString(citation);

    if (this.dataString != "") {
      var cleanedDataString = this.dataString.replace(
        /Birth date\: ([^\;]+)\;* Birth place: ([^\;]+)\;*/,
        "Birth date: $1, Birth place: $2")

      if (cleanedDataString != undefined || cleanedDataString.length > this.dataString.length) {
        this.dataString = cleanedDataString;
      }
    }

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryEnglandSelectBirthAndChristenings(fact, sourceText, citation) {
    // currently overriding the orig data from the source completely
    const title = "England Births and Christenings, 1538-1975";
    this.origData = title;

    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      if (fact.factDate.isValid && fact.factDate.year != 0) {
        const firstName = this.bio.result.firstName;
        const middleName = this.bio.result.middleName;
        const lastName = this.bio.lnab;
        if (firstName != "" && fact.location != "" && lastName != "") {
          var location = fact.location;

          var uriBuilder = new FamilySearchUriBuilder;
          uriBuilder.addGivenName(firstName, middleName);
          uriBuilder.addSurname(lastName);
          uriBuilder.addBirthDate(fact.factDate.year);
          uriBuilder.addBirthPlace(location);
          uriBuilder.addCollectionId("1473014");

          this.origData = "[" + uriBuilder.getUri();
          this.origData = this.origData.concat(" ", title, "]");
        }
      }
    }

    this.extractTemplateAndDataString(citation);

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryDeathReg(fact, sourceText, citation) {
    var isBmd = false;
    var indexTitle = "England & Wales, Death Index, 1916-2007";
    // FreeBMD England & Wales, Civil Registration Death Index, 1837-1915 Publication: Name: Ancestry.com Operations Inc; Location: Provo, UT, USA; Date: 2006; NOTEGeneral Register Office. <i>England and Wales Civil Registration Indexes</i>. London, England: General Register Office. © Crown copyright. Published by permission of the Controller of HMSO and the Office for National Statistics. You must not copy on, transfer or reproduce records without the prior permission of ONS. Database Copyright © 1998-2003 Graham Hart, Ben Laurie, Camilla von Massenbach and David Mayall.
    var endIndex = sourceText.indexOf("FreeBMD Publication:");
    if (endIndex != -1) {
      indexTitle = sourceText.substring(0, endIndex).trim();
      isBmd = true;
    }
    else {
      if (sourceText.indexOf("FreeBMD") != -1) {
        endIndex = sourceText.indexOf("Publication: ");
        if (endIndex != -1) {
          indexTitle = sourceText.substring(0, endIndex).trim();
          isBmd = true;
        }
      }
      if (endIndex == -1) {
        endIndex = sourceText.indexOf("Ancestry.com");
        if (endIndex != -1) {
          indexTitle = sourceText.substring(0, endIndex).trim();
        }
      }
    }
    // sometimes there is an "Author:" before the publication so it gets left at end of string
    indexTitle = indexTitle.replace(/ *Author\: *$/, "");
    // sometimes there is a "Title:" at the start
    indexTitle = indexTitle.replace(/^ *Title\: */, "");

    this.origData = indexTitle + ", ";
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      const firstName = this.bio.result.firstName;
      const middleName = this.bio.result.middleName;
      const currentLastName = this.bio.result.currentLastName;

      if (isBmd) {
        var uriBuilder = new FreeBmdUriBuilder();
        uriBuilder.addType("Deaths");
        uriBuilder.addFirstNames(firstName, middleName);
        uriBuilder.addSurname(currentLastName);
        uriBuilder.addYear(fact.factDate.year);

        this.origData = "[" + uriBuilder.getUri();
        this.origData = this.origData.concat(" ", indexTitle, "], ");
      }
      else {
        this.origData = indexTitle + ", ";
      }

      var uriBuilder = new GroUriBuilder();
      uriBuilder.addIndex("EW_Death");
      uriBuilder.addYear(fact.factDate.year);
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(currentLastName);
      if (this.bio.personGender == "Male") {
        uriBuilder.addGenderMale();
      }
      else {
        uriBuilder.addGenderFemale();
      }

      this.origData = this.origData.concat("original data from [", uriBuilder.getUri()," General Register Office]");
    }
    else {
      this.origData = indexTitle + ", ";
      this.origData = this.origData.concat("original data from General Register Office");
    }

    this.extractTemplateAndDataString(citation);

    if (this.dataString != "") {
      var cleanedDataString = this.dataString.replace(
        /Birth date\: ([^\;]+)\;* Birth place: Death date\: ([^\;]+)\;* Death place: ([^\;]+)\;*/,
        "Birth date: $1, Death date: $2, Death place: $3")

      if (cleanedDataString != undefined || cleanedDataString.length > this.dataString.length) {
        this.dataString = cleanedDataString;
      }
    }

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryProbate(fact, sourceText, citation) {
    // currently overriding the orig data from the source completely
    this.origData = "England & Wales, National Probate Calendar (Index of Wills and Administrations), 1858-1966";

    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      if (fact.factDate.isValid && fact.factDate.year != 0) {
        const firstName = this.bio.result.firstName;
        const middleName = this.bio.result.middleName;
        const currentLastName = this.bio.result.currentLastName;
        if (firstName != "" && currentLastName != "") {
          var uriBuilder = new FamilySearchUriBuilder;
          uriBuilder.addGivenName(firstName, middleName);
          uriBuilder.addSurname(currentLastName);
          uriBuilder.addDeathDate(fact.factDate.year);
          uriBuilder.addCollectionId("2451051");

          this.origData = "[" + uriBuilder.getUri();
          this.origData = this.origData.concat(" England & Wales, National Probate Calendar (Index of Wills and Administrations), 1858-1966]");
        }
      }
    }

    this.extractTemplateAndDataString(citation);

    if (this.dataString != "") {
      var cleanedDataString = this.dataString.replace(
        /Birth date\: ([^\;]+)\;* Birth place: Death date\: ([^\;]+)\;* Death place: ([^\;]+)\;*/,
        "Birth date: $1, Death date: $2, Death place: $3")

      if (cleanedDataString != undefined || cleanedDataString.length > this.dataString.length) {
        this.dataString = cleanedDataString;
      }
    }

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestrySelectEnglandMarriages(fact, sourceText, citation) {
    // currently overriding the orig data from the source completely
    this.origData = "England, Select Marriages, 1538–1973";

    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      if (fact.factDate.isValid && fact.factDate.year != 0) {
        const firstName = this.bio.result.firstName;
        const middleName = this.bio.result.middleName;
        if (firstName != "" && fact.marriageHusband != "" && fact.marriageWife != "" && fact.location != "") {
          var personName = fact.marriageHusband;
          var spouseName = fact.marriageWife;
          if (this.bio.personGender == "Female") {
            personName = fact.marriageWife;
            spouseName = fact.marriageHusband;
          }
          // have to assume that the last name is after the last space
          var personLastName = personName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
          var personFirstNames = personName.replace(/(.*[^ ]+) [^ ]+$/, "$1");
          var spouseLastName = spouseName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
          var spouseFirstNames = spouseName.replace(/(.*[^ ]+) [^ ]+$/, "$1");

          if (personLastName == this.bio.lnab) {
            // sometimes the marriageWife has the maiden name even when she has been married before
            personLastName = this.bio.getLastNameBeforeMarriage(fact);
          }

          if (personLastName != "" && personFirstNames != "" && spouseLastName != "" && spouseFirstNames != "") {
            var location = fact.location;

            var uriBuilder = new FamilySearchUriBuilder;
            uriBuilder.addGivenName(personFirstNames);
            uriBuilder.addSurname(personLastName);
            uriBuilder.addMarriageLocation(location);
            uriBuilder.addMarriageDate(fact.factDate.year);
            uriBuilder.addSpouseGivenName(spouseFirstNames);
            uriBuilder.addSpouseSurname(spouseLastName);
            uriBuilder.addCollectionId("1473015");
  
            this.origData = "[" + uriBuilder.getUri();
            this.origData = this.origData.concat(" England, Select Marriages, 1538–1973]");
          }
        }
      }
    }

    this.extractTemplateAndDataString(citation);

    if (this.dataString != "") {
      var cleanedDataString = this.dataString.replace(
        // Note that Residence place can be blank
        /Marriage date\: ([^\;]+)\;* Marriage place: ([^\;]+)\;* Residence date\: ([^\;]*)\;* *Residence place: ([^\;]+)\;*/,
        "Marriage date: $1, Marriage place: $2, Residence date: $3, Residence place: $4")

      if (cleanedDataString != undefined || cleanedDataString.length > this.dataString.length) {
        this.dataString = cleanedDataString;
      }
    }
    // Marriage date: 16 Apr 1826; Marriage place: Upton Lovell, Wiltshire, England; Residence date: Residence place: England.

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryEnglandCivilMarriage(fact, sourceText, citation) {
    var isBmd = false;
    var indexTitle = "England and Wales Marriage Registration Index";
    // FreeBMD England & Wales, Civil Registration Death Index, 1837-1915 Publication: Name: Ancestry.com Operations Inc; Location: Provo, UT, USA; Date: 2006; NOTEGeneral Register Office. <i>England and Wales Civil Registration Indexes</i>. London, England: General Register Office. © Crown copyright. Published by permission of the Controller of HMSO and the Office for National Statistics. You must not copy on, transfer or reproduce records without the prior permission of ONS. Database Copyright © 1998-2003 Graham Hart, Ben Laurie, Camilla von Massenbach and David Mayall.
    var endIndex = sourceText.indexOf("FreeBMD Publication:");
    if (endIndex != -1) {
      indexTitle = sourceText.substring(0, endIndex).trim();
      isBmd = true;
    }
    else {
      if (sourceText.indexOf("FreeBMD") != -1) {
        endIndex = sourceText.indexOf("Publication: ");
        if (endIndex != -1) {
          indexTitle = sourceText.substring(0, endIndex).trim();
          isBmd = true;
        }
      }
      else if (endIndex == -1) {
        endIndex = sourceText.indexOf("Ancestry.com");
        if (endIndex != -1) {
          indexTitle = sourceText.substring(0, endIndex).trim();
        }
        else {
          indexTitle = sourceText;
        }
      }
    }
    // sometimes there is an "Author:" before the publication so it gets left at end of string
    indexTitle = indexTitle.replace(/ *Author\: *$/, "");
    // sometimes there is a "Title:" at the start
    indexTitle = indexTitle.replace(/^ *Title\: */, "");
    
    this.origData = indexTitle;

    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      if (fact.factDate.isValid && fact.factDate.year != 0) {
        const firstName = this.bio.result.firstName;
        const middleName = this.bio.result.middleName;
        if (firstName != "" && fact.location != "") {
          var personName = fact.marriageHusband;
          var spouseName = fact.marriageWife;
          if (this.bio.personGender == "Female") {
            personName = fact.marriageWife;
            spouseName = fact.marriageHusband;
          }

          var personLastName = this.bio.lnab;
          var personFirstNames = firstName;

          if (personName != "") {
            // have to assume that the last name is after the last space
            personLastName = personName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
            personFirstNames = personName.replace(/(.*[^ ]+) [^ ]+$/, "$1");
          }

          if (personLastName == this.bio.lnab) {
            // sometimes the marriageWife has the maiden name even when she has been married before
            personLastName = this.bio.getLastNameBeforeMarriage(fact);
          }

          var spouseLastName = "";
          var spouseFirstNames = "";

          if (spouseName != "") {
            // have to assume that the last name is after the last space
            spouseLastName = spouseName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
            spouseFirstNames = spouseName.replace(/(.*[^ ]+) [^ ]+$/, "$1");
          }
          
          if (personLastName != "" && personFirstNames != "") {
            var location = fact.location;

            var uriBuilder = new FamilySearchUriBuilder;
            uriBuilder.addGivenName(personFirstNames);
            uriBuilder.addSurname(personLastName);
            uriBuilder.addMarriageLocation(location);
            uriBuilder.addMarriageDate(fact.factDate.year);

            if (spouseLastName != "" && spouseFirstNames != "") {
              uriBuilder.addSpouseGivenName(spouseFirstNames);
              uriBuilder.addSpouseSurname(spouseLastName);
            }

            uriBuilder.addCollectionId("2285732");
  
            this.origData = "[" + uriBuilder.getUri();
            this.origData = this.origData.concat(" ", indexTitle, "]");
          }
        }
      }
    }

    this.extractTemplateAndDataString(citation);

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryFreeBmdEnglandMarriages(fact, sourceText, citation) {
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      const firstName = this.bio.result.firstName;
      const middleName = this.bio.result.middleName;
      const lnab = this.bio.lnab;

      var personName = fact.marriageHusband;
      var spouseName = fact.marriageWife;
      if (this.bio.personGender == "Female") {
        personName = fact.marriageWife;
        spouseName = fact.marriageHusband;
      }
      // have to assume that the last name is after the last space
      var personLastName = personName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
      var personFirstNames = personName.replace(/(.*[^ ]+) [^ ]+$/, "$1");
      var spouseLastName = spouseName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
      var spouseFirstNames = spouseName.replace(/(.*[^ ]+) [^ ]+$/, "$1");

      if (personLastName == "") {
        personLastName = lnab;
      }
      if (personFirstNames == "") {
        personFirstNames = firstName;
      }

      var uriBuilder = new FreeBmdUriBuilder();
      uriBuilder.addType("Marriages");
      uriBuilder.addFirstNames(personFirstNames);
      uriBuilder.addSurname(personLastName);
      uriBuilder.addYear(fact.factDate.year);

      this.origData = "[" + uriBuilder.getUri();
      this.origData = this.origData.concat(" FreeBMD Marriage Index]");
    }
    else {
      this.origData = "FreeBMD Marriage Index.";
    }

    this.extractTemplateAndDataString(citation);

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryFamilyTree(fact, sourceText, citation) {
    var sourceTemplate = "";
    var sourceTemplateIndex = sourceText.indexOf("{{");
    if (sourceTemplateIndex != -1) {
      var sourceTemplateEndIndex = sourceText.indexOf("}}", sourceTemplateIndex);
      if (sourceTemplateEndIndex != -1) {
        // We have a template
        sourceTemplate = sourceText.substring(sourceTemplateIndex, sourceTemplateEndIndex+2);
      }
    }

    if (sourceTemplate != "") {
      this.origData = "Ancestry Member Family Tree " + sourceTemplate;
    }
    else {
      this.origData = "Ancestry Member Family Tree";
    }
    //Ancestry Family Trees 134 Name: Page Ancestry Family Trees

    var cleanedCitation = citation.replace(/^Page\: Ancestry Family Trees Data\: Text\: /, "");
    cleanedCitation = cleanedCitation.replace(/Name\: Page Ancestry Family Trees */, "");
    cleanedCitation = cleanedCitation.replace(/Ancestry Family Trees */g, "");

    this.citationRef = cleanedCitation;

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanSource_AncestryGeneral(fact, sourceText, citation) {
    // Remove the standard Ancestry verbiage (it may or may not have a period on end or a comma before Inc)
    if (/Ancestry\.com\.* Publication\: Ancestry\.com Operations\,* Inc\.*/.test(sourceText)) {
      this.origData = sourceText.replace(/Ancestry\.com\.* Publication\: Ancestry\.com Operations\,* Inc\.*/, "");
    }
    else if (/Ancestry\.com and The Church of Jesus Christ of Latter\-day Saints Publication\: Ancestry\.com Operations\,* Inc\.*\,*/.test(sourceText)) {
      this.origData = sourceText.replace(/Ancestry\.com and The Church of Jesus Christ of Latter\-day Saints Publication\: Ancestry\.com Operations\,* Inc\.*\,*/, "");
    }
    else if (/^Ancestry\.com .* Publication\:.*/.test(sourceText)) {
      this.origData = sourceText.replace(/^Ancestry\.com and The Church of Jesus Christ of Latter\-day Saints /, "");
      this.origData = this.origData.replace(/^Ancestry\.com /, "");
      this.origData = this.origData.replace(/ Publication\: Name\: Online publication \- Provo\, UT\, USA\:/, "");
      this.origData = this.origData.replace(/ Publication\: Name\: Ancestry\.com Operations\, Inc\.\; Location\: Provo\, UT\, USA\; Date\: \d\d\d\d\;*/, "");
      this.origData = this.origData.replace(/ Publication\: Name\: Ancestry\.com Operations\, Inc\.\; Location\: Lehi\, UT\, USA\; Date\: \d\d\d\d\;*/, "");
      this.origData = this.origData.replace(/ The Generations Network\, Inc\.*\,*\;*(?: Location\: Provo\, UT\, USA\;)?(?: Date\: \d\d\d\d\;)?(?: \d\d\d\d)?/, "");
      this.origData = this.origData.replace(/ MyFamily\.com\, Inc\.\, \d\d\d\d/, "");
      this.origData = this.origData.replace(/ Publication\: Name\:/, "");
    }
    else if (/^Ancestry\.com\,* .* \(.*Ancestry\.com Operations\,* Inc\.*\,* \d\d\d\d\)\.*/.test(sourceText)) {
      this.origData = sourceText.replace(/^Ancestry\.com\,* /, "");
      this.origData = this.origData.replace(/ \(.*Ancestry\.com Operations\,* Inc\.*\,* \d\d\d\d\)\.*/, "");
    }
    else if (/Publication\: Name\: Ancestry\.com Operations\,* Inc\.*\;*/.test(sourceText)) {
      this.origData = sourceText.replace(/Publication\: Name\: Ancestry\.com Operations\,* Inc\.*\;*(?: Location\: Provo\, UT\, USA\;)?(?: Date\: \d\d\d\d\;)?/, "");
    }
    else if (/Ancestry\.com Publication\: Online publication \- Provo, UT, USA\: The Generations Network\, Inc\.\, \d\d\d\d/.test(sourceText)) {
      this.origData = sourceText.replace(/Ancestry\.com Publication\: Online publication \- Provo, UT, USA\: The Generations Network\, Inc\.\, \d\d\d\d/, "");
    }
    else if (/Ancestry\.com and The Church of Jesus Christ of Latter\-day Saints Publication\: Online publication \- Provo\, UT\, USA\: The Generations Network\, Inc\.\, \d\d\d\d/.test(sourceText)) {
      this.origData = sourceText.replace(/Ancestry\.com and The Church of Jesus Christ of Latter\-day Saints Publication\: Online publication \- Provo\, UT\, USA\: The Generations Network\, Inc\.\, \d\d\d\d/, "");
    }
    else if (/Ancestry\.com\, .* \(Online publication \- Provo\, UT\, USA\: Ancestry.com Operations Inc\, \d\d\d\d. .*\)/.test(sourceText)) {
      this.origData = sourceText.replace(/^Ancestry\.com\, /, "");
      this.origData = this.origData.replace(/ \(Online publication \- Provo\, UT\, USA\: Ancestry.com Operations Inc\, \d\d\d\d. (.*)\)/g, "$1");
      this.origData = this.origData.replace(/Ancestry\.com Operations Inc\, \d\d\d\d\.* */, "");
      this.origData = this.origData.replace(/Online publication \- Provo\, UT\, USA\: Ancestry\.com Operations Inc\, \d\d\d\d\.* */, "");
    }
    else if (/Author\: Ancestry\.com Publication\: Online publication \- Provo\, UT\, USA\: Ancestry\.com Operations\,* Inc\.*\,* \d\d\d\d\.*/.test(sourceText)) {
      this.origData = sourceText.replace(/Author\: Ancestry\.com Publication\: Online publication \- Provo\, UT\, USA\: Ancestry\.com Operations\,* Inc\.*\,* \d\d\d\d\.*/, "");
    }
    else if (/^Abbreviation\: .*Title\: .*Ancestry\.com Operations.*/.test(sourceText)) {
      this.origData = sourceText.replace(/^Abbreviation\: (.*) Title\: *.*/, "$1");
    }
    else if (/^Abbreviation\: .*Title\: .*Ancestry\.com.*/.test(sourceText)) {
      this.origData = sourceText.replace(/^Abbreviation\: (.*) Title\: *.*/, "$1");
    }
    else {
      // this occasionally happens. There is no Ancestry.com in sourceText
      // but there is an Ancestry template in citation for example
      this.origData = sourceText;
    }

    this.origData = this.origData.trim();

    // sometimes there is a hanging "Note: " on the end of origData
    this.origData = this.origData.replace(/ *Note\: *$/, "");

    this.origData = this.origData.replace(/Original data *\-*\:* *Compiled from publicly available sources\.* */g, "");

    this.origData = this.origData.replace(/[\,\.\;]*$/, "");

    this.extractTemplateAndDataString(citation);

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanAndCombineSourceAndCitationForAncestryCases(fact, ref) {

    var sourceText = "";
    var cleanedSourceAndCitation = "";

    if (ref.source != undefined) {
      sourceText = ref.source.text.trim();
    }
    else {
      return "";
    }

    if (/^Ancestry Family Trees Publication/.test(sourceText) ||
        /^Title\: Ancestry Family Trees Publication/.test(sourceText) ||
        /^Ancestry Family Trees \(Online publication/.test(sourceText) ||
        /^Title\: Public Member Trees/.test(sourceText) ||
        /^Author: Ancestry\.com Title: Public Member Trees Publication/.test(sourceText)) {
      return this.cleanSource_AncestryFamilyTree(fact, sourceText, ref.citation);
    }

    if (fact.factType == FactType.residence || fact.factType == FactType.census || fact.factType == FactType.employment) {
      if (/^.... England Census/.test(sourceText) ||
          /^Title\: .... England Census Author\: Ancestry\.com/.test(sourceText) ||
          /^Author\: Ancestry\.com Title\: .... England Census/.test(sourceText) ||
          /^Author\: Ancestry\.com .* British Isles Census Index/.test(sourceText) ||
          /^Ancestry.com .*.... England Census Publication/.test(sourceText) ||
          /^Abbreviation\: \d\d\d\d England Census Title\: Ancestry\.com/.test(sourceText)) {
        return this.cleanSource_AncestryCensusEnglandWales(fact, sourceText, ref.citation);
      }

      // sometimes a parish marriage can be a residence source
      if (/^England, Select Marriages, 1538–1973/.test(sourceText) ||
          /^Author\: Ancestry\.com Title\: England \& Wales Marriages/.test(sourceText)) {
        return this.cleanSource_AncestrySelectEnglandMarriages(fact, sourceText, ref.citation);
      }
    }
    
    if (fact.factType == FactType.birth || fact.factType == FactType.name) {
      if (/^England & Wales\, FreeBMD Birth Index/.test(sourceText) ||
          /^Title\: England & Wales\, FreeBMD Birth Index/.test(sourceText) ||
          /^England \& Wales\, Civil Registration Birth Index\, 1837\-1915 FreeBMD Publication/.test(sourceText) ||
          /^Author\: FreeBMD Title\: England & Wales\, FreeBMD Birth Index/.test(sourceText)) {
        return this.cleanSource_AncestryBmdBirthReg(fact, sourceText, ref.citation);
      }

      // A census is sometimes a birth source
      if (/^.... England Census/.test(sourceText) ||
          /^Title\: .... England Census Author\: Ancestry\.com/.test(sourceText) ||
          /^Ancestry.com .... England Census Publication/.test(sourceText)) {
        return this.cleanSource_AncestryCensusEnglandWales(fact, sourceText, ref.citation);
      }
    }

    if (fact.factType == FactType.baptism || fact.factType == FactType.name) {
      if (/^(?:Ancestry\.com )?England\, Select Births and Christenings/.test(sourceText) ||
          /^Abbreviation\: England\, Select Births and Christenings\, 1538\-1975 Title\: Ancestry.com/.test(sourceText)) {
        return this.cleanSource_AncestryEnglandSelectBirthAndChristenings(fact, sourceText, ref.citation);
      }
    }
    
    if (fact.factType == FactType.death) {
      if (/^England & Wales\, Death Index/.test(sourceText) ||
          /^Title\: England & Wales\, Death Index/.test(sourceText) ||
          /^England \& Wales\, FreeBMD Death Index/.test(sourceText) ||
          /^Abbreviation\: *England *\& *Wales\, FreeBMD Death Index/.test(sourceText) ||
          /^FreeBMD England \& Wales\, Civil Registration Death Index/.test(sourceText)) {
        return this.cleanSource_AncestryDeathReg(fact, sourceText, ref.citation);
      }

      if (/^England \& Wales\, National Probate Calendar/.test(sourceText) ||
          /^Title\: +England \& Wales\, National Probate Calendar/.test(sourceText)) {
        return this.cleanSource_AncestryProbate(fact, sourceText, ref.citation);
      }
    }
    
    if (fact.factType == FactType.marriage || fact.factType == FactType.name) {
      if (/^England, Select Marriages, 1538–1973/.test(sourceText)) {
        return this.cleanSource_AncestrySelectEnglandMarriages(fact, sourceText, ref.citation);
      }

      if (/^England \& Wales\, Civil Registration Marriage Index/.test(sourceText)) {
        return this.cleanSource_AncestryEnglandCivilMarriage(fact, sourceText, ref.citation);
      }

      if (/^England \& Wales\, FreeBMD Marriage Index\, 1837\-1915 FreeBMD Publication/.test(sourceText) ||
          /^FreeBMD England \& Wales\, FreeBMD Marriage Index/.test(sourceText) ||
          /^Abbreviation\: *England *\& *Wales\, FreeBMD Marriage Index/.test(sourceText)) {
          return this.cleanSource_AncestryFreeBmdEnglandMarriages(fact, sourceText, ref.citation);
      }

      // the 1911 census is sometimes a marriage source
      if (/^.... England Census/.test(sourceText) ||
          /^Title\: .... England Census Author\: Ancestry\.com/.test(sourceText) ||
          /^Ancestry.com .... England Census Publication/.test(sourceText)) {
        return this.cleanSource_AncestryCensusEnglandWales(fact, sourceText, ref.citation);
      }
    }

    // No specific case found, try removing the Anestry.com text
    return this.cleanSource_AncestryGeneral(fact, sourceText, ref.citation);
  }

  cleanSource_MyHeritageGeneral(fact, sourceText, citation) {
    // This is a placeholder. Currently it looks as if GEDCOM imports from MyHeritage do not use
    // refs (inline citations) - only source lists.
    this.origData = sourceText;

    this.origData = this.origData.trim();

    this.extractTemplateAndDataString(citation);

    return this.buildCleanedSourceAndCitation(true);
  }

  cleanAndCombineSourceAndCitationForMyHeritageCases(fact, ref) {

    var sourceText = "";
    var cleanedSourceAndCitation = "";

    if (ref.source != undefined) {
      sourceText = ref.source.text.trim();
    }
    else {
      return "";
    }

    // No specific case found, try removing the Anestry.com text
    return this.cleanSource_MyHeritageGeneral(fact, sourceText, ref.citation);
  }

  cleanAndCombineSourceAndCitationForKnownCases(fact, ref) {

    var sourceText = "";
    if (ref.source != undefined) {
      sourceText = ref.source.text.trim();
    }
    else {
      return "";
    }

    var isAncestry = /Ancestry\.com/.test(sourceText);
    if (!isAncestry) {
      isAncestry = /\{\{Ancestry/.test(ref.citation);
    }

    if (isAncestry) {
      return this.cleanAndCombineSourceAndCitationForAncestryCases(fact, ref);
    }

    var isMyHeritage = /MyHeritage/.test(sourceText);
    
    if (isMyHeritage) {
      return this.cleanAndCombineSourceAndCitationForMyHeritageCases(fact, ref);
    }

    return "";
  }
  
  cleanAndCombineSourceAndCitation(fact, ref) {
    this.origData = "";
    this.citationRef = "";
    this.template = "";
    this.dataString = "";

    var cleanedSourceAndCitation = "";

    cleanedSourceAndCitation = this.cleanAndCombineSourceAndCitationForKnownCases(fact, ref);

    if (cleanedSourceAndCitation == "") {
      cleanedSourceAndCitation = this.cleanAndCombineSourceAndCitationForUnknownCases(fact, ref);
    }

    // some old GEDCOM imports (2011-2012) has " CONT " in them that should be replaced with line breaks
    cleanedSourceAndCitation = cleanedSourceAndCitation.replace(/ CONT /g,"<br/>")

    return cleanedSourceAndCitation;
  }

  generateReference(fact, ref) {

    var refString = "";

    if (ref.owningRef != undefined) {
      if (ref.generateRef) {
        // this may be a bug but sometimes, for refs on suspect marriages, the owning ref is itself owned
        var owningRef = ref.owningRef;
        while (owningRef.owningRef != undefined) {
          if (!owningRef.generateRef) {
            return "";
          }
          owningRef = owningRef.owningRef;
        }
        refString = refString.concat('<ref name="', owningRef.outputName, '"/>');
      }
    }
    else {
      if (ref.primaryRefNeedsName) {
        refString = refString.concat('<ref name="', ref.outputName, '">');
      }
      else {
        refString = refString.concat('<ref>');
      }

      if (userOptions.references_addNewlineWithin) {
        refString = refString.concat("\n");
      }

      if (userOptions.references_meaningfulNames) {
        refString = refString.concat("'''", fact.getSectionNameForSourceTitle(ref), "''': ");
      }

      const cleanedSourceAndCitation = this.cleanAndCombineSourceAndCitation(fact, ref);
      refString = refString.concat(cleanedSourceAndCitation);

      if (userOptions.references_addNewlineWithin) {
        refString = refString.concat("\n");
      }
      refString = refString.concat("</ref>");
    }

    if (userOptions.references_addNewline && refString != "") {
      refString = refString.concat("\n");
    }

    return refString;
  }

  cleanSourceOnly_MyHeritage_ParseStandard(sourceText) {

    var mediaIndex = sourceText.search(/Media\: *[\d\-]* *Collection/);
    if (mediaIndex == -1) {
      mediaIndex = sourceText.search(/Collection Media\: *[\d\-]* /);
    }
    if (mediaIndex == -1) {
      mediaIndex = sourceText.search(/Media\: *[\d\-]* *Smart Matching/);
    }
    if (mediaIndex == -1) {
      mediaIndex = sourceText.search(/Media\: *[\d\-]* *https/);
    }

    if (mediaIndex == -1) {
      return undefined;
    }

    var result = new Object;
    result.mediaCollection = "";
    result.myHeritageLinks = "";
    result.data = "";

    var beforeMedia = sourceText.substring(0, mediaIndex).trim();
    var data = sourceText.substring(mediaIndex).trim();

    var mediaCollection = data.replace(/(Media\: *[\d\-]* *Collection *\d*).*/, "$1");
    if (mediaCollection == data) {
      // failed to match
      mediaCollection = data.replace(/(Media\: *[\d\-]*) *Smart Matching.*/, "$1");
    }
    if (mediaCollection == data) {
      mediaCollection = data.replace(/(Media\: *[\d\-]*) *https.*/, "$1");
    }
    if (mediaCollection == data) {
      // failed to match
      mediaCollection = data.replace(/(Collection Media\: *[\d\-]*).*/, "$1");
    }
    if (mediaCollection == data) {
      return undefined;
    }

    data = data.substring(mediaCollection.length).trim();

    data = data.replace(/\&lt\;br\&gt\;/g,"<br>");
    data = data.replace(/\&lt\;/g,"<");
    data = data.replace(/\&gt\;/g,">");
    data = data.replace(/ Certainty\: *\d* *$/,"");
    data = data.replace(/\<br\>/g,"<br/>");

    var link1 = "";
    var link1Index = data.search(/https\:\/\/www\.myheritage\./);
    if (link1Index != -1) {
      data = data.substring(link1Index);
      link1 = data.replace(/(https\:\/\/www\.myheritage\.[^ ]*).*/, "$1");
      data = data.substring(link1.length).trim();
    }
    else {
      result.beforeMedia = beforeMedia;
      result.mediaCollection = mediaCollection;
      result.data = data;
      return result;
    }

    var myHeritageLinks = "<br/>[" + link1 + " MyHeritage " + mediaCollection + "] (subscription may be required)";

    var link2 = "";
    var link2Index = data.search(/^ *https\:\/\/www\.myheritage\./);
    if (link2Index != -1) {
      data = data.substring(link2Index);
      link2 = data.replace(/(https\:\/\/www\.myheritage\.[^ ]*).*/, "$1");
      data = data.substring(link2.length).trim();

      if (link2 != link1) {
        myHeritageLinks += "<br/>[" + link2 + " MyHeritage]";
      }
    }

    // Sometimes there is a "Certainty" after the links and before the data, remove it
    data = data.replace(/^Certainty\: *\d* */,"");

    result.beforeMedia = beforeMedia;
    result.mediaCollection = mediaCollection;
    result.myHeritageLinks = myHeritageLinks;
    result.data = data;
    return result;
  }
  
  cleanSourceOnly_MyHeritageCensusEnglandWales(sourceText, is1939) {
    var cleanedSource = "";

    var year = "";
    if (is1939) {
      year = sourceText.replace(/^(\d\d\d\d) Register of England \& Wales Publication.*/, "$1");
    }
    else {
      year = sourceText.replace(/^(\d\d\d\d) England \& Wales Census Publication.*/, "$1");
    }
    if (year.length != 4 || year == sourceText) {
      year = sourceText.replace(/^(\d\d\d\d) .*/, "$1");
    }
    if (year.length != 4 || year == sourceText) {
      return "";
    }

    var familySearchUri = this.getFamilySearchUriForEnglandCensusForYearAndResidence(year, "");
    var nationalArchivesUri = this.getNationalArchivesUriForEnglandCensus(year, "");

    // this is a fallback if we can't parse the data
    var censusTitle = year + " England & Wales Census"

    if (is1939) {
      censusTitle = "1939 Register of England & Wales";
    }

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    if (result.myHeritageLinks == "") {
      return censusTitle + "<br/>" + result.data;
    }

    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    var householdIndex = data.search(/\<br\/\>\<a id\=\'household\'\>(?:\<\/a\>)?/);
    if (householdIndex != -1) {
      var beforeHousehold = data.substring(0, householdIndex);

      beforeHousehold = beforeHousehold.replace(/\<br\/\>\; */g,"<br/>");

      // The census details are all smooshed together with no spaces or semi colons between them.
      // Sometimes not even any colons. This loop adds the separators.
      // There is a risk that one of the fields (like an address) could contain one of the separators.
      // If we ever see that happening we could add some extra checks (though it is not obvious right now how)
      const separators = [
        "Parish", "Series", "Line", "Municipal borough", "Township", "Piece", "Image", "Parlamentary borough",
        "Registrar's district", "Registration district", "Enumerated by", "County", "Enum\. District",
        "Country", "Page", "Date", "Family", "Superintendent registrar's district", "Ecclesiastical district"
      ];
      for (var startSep of separators) {
        var startIndex = beforeHousehold.indexOf(startSep);
        if (startIndex != -1) {
          var fieldStartIndex = startIndex + startSep.length;

          var closestNextSepIndex = beforeHousehold.indexOf("See household", fieldStartIndex);
          for (var endSep of separators) {
            var endIndex = beforeHousehold.indexOf(endSep, fieldStartIndex);
            if (endIndex != -1 && endIndex < closestNextSepIndex) {
              closestNextSepIndex = endIndex;
            }
          }

          if (closestNextSepIndex != -1 && closestNextSepIndex > fieldStartIndex) {
            // we have found a field between two indices, do some sanity checks
            var field = beforeHousehold.substring(fieldStartIndex, closestNextSepIndex).trim();
            if (field != "" && field[0] == ":") {
              field = field.substring(1).trim(); // remove leading :
            }
            if (field != "") {
              beforeHousehold = beforeHousehold.substring(0,fieldStartIndex) + ": " + field + "; " + beforeHousehold.substring(closestNextSepIndex);
            }
          }
        }
      }

      beforeHousehold = beforeHousehold.replace(/See household members/,"<br/>Household members:<br/>");

      var household = data.substring(householdIndex);
      household = household.replace(/^\<br\/\>\<a id\=\'household\'\>(?:\<\/a\>)?Household\<br\/\>/,"");

      household = household.replace(/\<br\/\>([^\;]*)\; *\<a href\=\"(https\:[^\"]*)\"\>([^\<\;]*)(?:\<\/a\>)?\; *(\d*)/g,"<br/>$1; [$2 $3]; $4");

      var residenceLocation = beforeHousehold.replace(/.*\<br\/\>Residence\: *\d\d\d\d *\-* ([^\<]+)\<br\/\>.*/, "$1");
      if (residenceLocation == beforeHousehold) {
        residenceLocation = "";
      }

      var series = beforeHousehold.replace(/.*\; Series\: ([^\;]+)\;.*/, "$1");
      var piece = beforeHousehold.replace(/.*\; Piece\: ([^\;]+)\;.*/, "$1");
      var seriesAndPiece = "";
      if (series != beforeHousehold && piece != beforeHousehold) {
        piece = piece.replace(/^0*/, ""); // remove leading zeros
        seriesAndPiece = series + "+" + piece;
      }

      if (!is1939) {
        familySearchUri = this.getFamilySearchUriForEnglandCensusForYearAndResidence(year, residenceLocation);
        nationalArchivesUri = this.getNationalArchivesUriForEnglandCensus(year, seriesAndPiece);
      }
  
      data = beforeHousehold + household;
    }

    if (is1939) {
      cleanedSource = censusTitle;
    }
    else {
      if (userOptions.sources_addFreeLinksForSubscriptionSources) {
        cleanedSource = "[" + familySearchUri + " " + censusTitle + "]";
      }
      else {
        cleanedSource = censusTitle;
      }
      cleanedSource = cleanedSource.concat(", original data from ");
      if (userOptions.sources_addFreeLinksForSubscriptionSources) {
        cleanedSource = cleanedSource.concat(nationalArchivesUri);
      }
      else {
        cleanedSource = cleanedSource.concat("The National Archives");
      }
    }

    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritage_England_BirthIndex(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    if (result.myHeritageLinks == "") {
      return "";
    }

    var beforeMedia = result.beforeMedia;
    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    // sometimes there is a ";" at the start of a line, this is needed for some (like census) but nit for this one
    data = data.replace(/\<br\/\>\;* */g,"<br/>");

    var indexTitle = "England & Wales, Birth Index, 1837-2005";
    // England & Wales, Death Index, 1837-2005 Publication: MyHeritage
    var endIndex = beforeMedia.indexOf("Publication: MyHeritage");
    if (endIndex != -1) {
      indexTitle = sourceText.substring(0, endIndex).trim();
    }

    cleanedSource = indexTitle + ", ";
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      var firstName = this.bio.result.firstName;
      var middleName = this.bio.result.middleName;
      const lnab = this.bio.lnab;

      var birthFactDate = new FactDate(this.bio.birthDate);

      var nameString = data.replace(/^([^\:\<]*)\<br\/\>.*/,"$1");
      if (nameString != data && nameString != "") {
        var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(nameString);
        if (parsedName) {
          currentLastName = parsedName.lastName;
          if (parsedName.firstNames.indexOf(" ") != -1) {
            var parsedMiddleNames = parsedName.firstNames.replace(/^[^ ]+ (.+)$/, "$1");
            if (parsedMiddleNames != parsedName.firstNames && parsedMiddleNames != "") {
              middleName = parsedMiddleNames;
            }
            var parsedFirstName = parsedName.firstNames.replace(/^([^ ]+) *.*$/, "$1");
            if (parsedFirstName != parsedName.firstNames && parsedFirstName != "") {
              firstName = parsedFirstName;
            }
          }
          else {
            firstName = parsedName.firstNames;
          }
        }          
      }

      var birthDateString = data.replace(/.*\<br\/\>Birth date: *([^\:\<]*)\<br\/\>.*/,"$1");
      if (birthDateString != data && birthDateString != "") {
        var dataBirthFactDate = new FactDate(birthDateString);
        if (dataBirthFactDate.isValid) {
          birthFactDate = dataBirthFactDate;
        }
      }

      var uriBuilder = new FreeBmdUriBuilder();
      uriBuilder.addType("Births");
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(lnab);
      uriBuilder.addYear(birthFactDate.year);

      cleanedSource = "[" + uriBuilder.getUri();
      cleanedSource = cleanedSource.concat(" ", indexTitle, "], ");

      uriBuilder = new GroUriBuilder();
      uriBuilder.addIndex("EW_Birth");
      if (birthFactDate.isValid) {
        uriBuilder.addYear(birthFactDate.year);
      }
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(lnab);
      if (this.bio.personGender == "Male") {
        uriBuilder.addGenderMale();
      }
      else {
        uriBuilder.addGenderFemale();
      }

      cleanedSource = cleanedSource.concat("original data from [", uriBuilder.getUri()," General Register Office]");
    }
    else {
      cleanedSource = indexTitle + ", ";
      cleanedSource = cleanedSource.concat("original data from General Register Office");
    }

    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritage_England_DeathIndex(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    if (result.myHeritageLinks == "") {
      return "";
    }

    var beforeMedia = result.beforeMedia;
    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    // sometimes there is a ";" at the start of a line, this is needed for some (like census) but nit for this one
    data = data.replace(/\<br\/\>\;* */g,"<br/>");

    var indexTitle = "England & Wales, Death Index, 1837-2005";
    // England & Wales, Death Index, 1837-2005 Publication: MyHeritage
    var endIndex = beforeMedia.indexOf("Publication: MyHeritage");
    if (endIndex != -1) {
      indexTitle = sourceText.substring(0, endIndex).trim();
    }

    cleanedSource = indexTitle + ", ";
    if (userOptions.sources_addFreeLinksForSubscriptionSources) {
      var firstName = this.bio.result.firstName;
      var middleName = this.bio.result.middleName;

      var currentLastName = this.bio.result.currentLastName;
      var deathFactDate = new FactDate(this.bio.deathDate);
      var birthFactDate = new FactDate(this.bio.birthDate);

      var nameString = data.replace(/^([^\:\<]*)\<br\/\>.*/,"$1");
      if (nameString != data && nameString != "") {
        var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(nameString);
        if (parsedName) {
          currentLastName = parsedName.lastName;
          if (parsedName.firstNames.indexOf(" ") != -1) {
            var parsedMiddleNames = parsedName.firstNames.replace(/^[^ ]+ (.+)$/, "$1");
            if (parsedMiddleNames != parsedName.firstNames && parsedMiddleNames != "") {
              middleName = parsedMiddleNames;
            }
            var parsedFirstName = parsedName.firstNames.replace(/^([^ ]+) *.*$/, "$1");
            if (parsedFirstName != parsedName.firstNames && parsedFirstName != "") {
              firstName = parsedFirstName;
            }
          }
          else {
            firstName = parsedName.firstNames;
          }
        }          
      }

      var deathDateString = data.replace(/.*\<br\/\>Death date: *([^\:\<]*)\<br\/\>.*/,"$1");
      if (deathDateString != data && deathDateString != "") {
        var dataDeathFactDate = new FactDate(deathDateString);
        if (dataDeathFactDate.isValid) {
          deathFactDate = dataDeathFactDate;
        }
      }

      var birthDateString = data.replace(/.*\<br\/\>Birth date: *([^\:\<]*)\<br\/\>.*/,"$1");
      if (birthDateString != data && birthDateString != "") {
        var dataBirthFactDate = new FactDate(birthDateString);
        if (dataBirthFactDate.isValid) {
          birthFactDate = dataBirthFactDate;
        }
      }

      var uriBuilder = new FreeBmdUriBuilder();
      uriBuilder.addType("Deaths");
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(currentLastName);
      if (deathFactDate.isValid) {
        uriBuilder.addYear(deathFactDate.year);
      }
      if (birthFactDate.isValid) {
        uriBuilder.addAadDob(birthFactDate.year);
      }

      cleanedSource = "[" + uriBuilder.getUri();
      cleanedSource = cleanedSource.concat(" ", indexTitle, "], ");

      uriBuilder = new GroUriBuilder();
      uriBuilder.addIndex("EW_Death");
      if (deathFactDate.isValid) {
        uriBuilder.addYear(deathFactDate.year);
      }
      if (birthFactDate.isValid && deathFactDate.isValid) {
        uriBuilder.addAge(deathFactDate.year - birthFactDate.year);
      }
      uriBuilder.addFirstNames(firstName, middleName);
      uriBuilder.addSurname(currentLastName);
      if (this.bio.personGender == "Male") {
        uriBuilder.addGenderMale();
      }
      else {
        uriBuilder.addGenderFemale();
      }

      cleanedSource = cleanedSource.concat("original data from [", uriBuilder.getUri()," General Register Office]");
    }
    else {
      cleanedSource = indexTitle + ", ";
      cleanedSource = cleanedSource.concat("original data from General Register Office");
    }

    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(namesString) {
    var result = undefined;

    var lastNameString = namesString.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
    var firstNamesString = namesString.replace(/(.*[^ ]+) [^ ]+$/, "$1");
    var bornIndex = namesString.search(/\(born/);
    if (bornIndex != -1) {
      lastNameString = namesString.replace(/.*\(born *([^\)]+)\)$/, "$1");
      namesString = namesString.substring(0, bornIndex).trim();
      firstNamesString = namesString.replace(/(.*[^ ]+) [^ ]+$/, "$1");
    }
    if (lastNameString != "" && lastNameString != namesString &&
        firstNamesString != "" && firstNamesString != namesString) {
      result = new Object;
      result.lastName = lastNameString;
      result.firstNames = firstNamesString;
    }

    return result;
  }

  cleanSourceOnly_MyHeritage_FamilySearchFamilyTree(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    data = data.replace(/\<br\/\>\; */g,"<br/>");
    data = data.replace(/\<a\>/g,"");
    data = data.replace(/\<\/a\>/g,"");

    // get the details for the tree search
    var lastName = this.bio.lnab;
    const firstName = this.bio.result.firstName;
    const middleName = this.bio.result.middleName;
    var firstNames = firstName;
    if (middleName != "") {
      firstNames += " " + middleName;
    }
    var birthFactDate = new FactDate(this.bio.birthDate);
    var birthYear = birthFactDate.year;
    var birthLocation = "";

    var fatherLastName = "";
    var fatherFirstNames = "";
    var motherLastName = "";
    var motherFirstNames = "";
    const parents = this.bio.parents;
    if (parents != undefined) {
      if (parents.father != undefined) {
        var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(parents.father.name);
        if (parsedName) {
          fatherLastName = parsedName.lastName;
          fatherFirstNames = parsedName.firstNames;
        }          
      }
      
      if (parents.mother != undefined) {
        var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(parents.mother.name);
        if (parsedName) {
          motherLastName = parsedName.lastName;
          motherFirstNames = parsedName.firstNames;
        }       
      }   
    }

    // Example data:
    // Cordelia Pollard DENNIS (born Skewes)<br/>
    // Birth name: Cordelia POLLARD<br/>
    // Gender: Female<br/>
    // Birth: 1831 - Devonshire, England<br/>
    // Marriage: Circa Feb 1858 - Bideford, Devon, England<br/>
    // Death: July 1911 - Dorset, England<br/>
    // Parents: William Skewes, Cordelia Skewes (born Pollard)<br/>
    // Husband: Richard DENNIS<br/>
    // Children: George Pollard Dennis, Joseph Thomas DENNIS, Richard Henry DENNIS, William Skewes DENNIS

    // attempt to get the search details from the data (to match the tree we are looking for)
    var namesString = data.replace(/^([^\:\<]*)\<br\/\>.*/,"$1");
    if (namesString != data && namesString != "") {
      var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(namesString);
      if (parsedName) {
        lastName = parsedName.lastName;
        firstNames = parsedName.firstNames;
      }
    }

    var birthString = data.replace(/.*\<br\/\>Birth: *([^\:\<]*)\<br\/\>.*/,"$1");
    if (birthString != data && birthString != "") {
      var dashIndex = birthString.search(/\-/);
      if (dashIndex != -1) {
        var dateString = birthString.substring(0,dashIndex);
        var locationString = birthString.substring(dashIndex+1);

        birthFactDate = new FactDate(dateString);
        if (birthFactDate.isValid) {
          birthYear = birthFactDate.year;
        }
        if (locationString != "") {
          birthLocation = "";
        }   
      }
      else {
        birthFactDate = new FactDate(birthString);
        if (birthFactDate.isValid) {
          birthYear = birthFactDate.year;
        }
      }
    }
    // Parents: William Skewes, Cordelia Skewes (born Pollard)<br/>
    var parentsString = data.replace(/.*\<br\/\>Parents: *([^\:\<]*)\<br\/\>.*/,"$1");
    if (parentsString != data && parentsString != "") {
      var commaIndex = parentsString.search(/\,/);
      if (commaIndex != -1) {
        var fatherName = parentsString.substring(0,commaIndex).trim();
        var motherName = parentsString.substring(commaIndex+1).trim();
        
        var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(fatherName);
        if (parsedName) {
          fatherLastName = parsedName.lastName;
          fatherFirstNames = parsedName.firstNames;
        }

        parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(motherName);
        if (parsedName) {
          motherLastName = parsedName.lastName;
          motherFirstNames = parsedName.firstNames;
        }
      }

    }

    var uriBuilder = new FamilySearchTreeUriBuilder();
    uriBuilder.addSelf(firstName, middleName,lastName);
    uriBuilder.addGender(this.bio.personGender.toLowerCase());
    uriBuilder.addBirth(birthLocation, birthYear);
    uriBuilder.addFather(fatherFirstNames, fatherLastName);
    uriBuilder.addMother(motherFirstNames, motherLastName);
    var familySearchUri = uriBuilder.getUri();

    cleanedSource = "[" + familySearchUri + " FamilySearch Family Tree]"
    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritage_GeniFamilyTree(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    data = data.replace(/\<br\/\>\; */g,"<br/>");
    data = data.replace(/\<a\>/g,"");
    data = data.replace(/\<\/a\>/g,"");

    // get the details for the tree search
    var lastName = this.bio.lnab;
    const firstName = this.bio.result.firstName;
    const middleName = this.bio.result.middleName;
    var firstNames = firstName;
    if (middleName != "") {
      firstNames += " " + middleName;
    }
    var birthFactDate = new FactDate(this.bio.birthDate);
    var birthYear = birthFactDate.year;
    var birthLocation = "";

    var fatherName = "";
    var motherName = "";
    const parents = this.bio.parents;
    if (parents != undefined) {
      if (parents.father != undefined) {
        fatherName = parents.father.name;
      }
      
      if (parents.mother != undefined) {
        motherName = parents.mother.name;
      }   
    }

    // Example data:
    // Cordelia Pollard DENNIS (born Skewes)<br/>
    // Birth name: Cordelia POLLARD<br/>
    // Gender: Female<br/>
    // Birth: 1831 - Devonshire, England<br/>
    // Marriage: Circa Feb 1858 - Bideford, Devon, England<br/>
    // Death: July 1911 - Dorset, England<br/>
    // Parents: William Skewes, Cordelia Skewes (born Pollard)<br/>
    // Husband: Richard DENNIS<br/>
    // Children: George Pollard Dennis, Joseph Thomas DENNIS, Richard Henry DENNIS, William Skewes DENNIS

    // Charles Duck
    // Gender: Male
    // Birth: Apr 22 1847 - Marlborough, Wiltshire, England, United Kingdom
    // Occupation: Master saddler
    // Marriage: Spouse: Jane Eliza Duck (born Wheedon) - 1869 - Richmond, Surrey
    // Death: 1924
    // Father: James Duck
    // Mother: Sarah Duck (born Lamb)
    // Wives: Jane Eliza Duck (born Wheedon), Edith Kate Duck (born Barfield)
    // Children: Samuel J Duck, Edith Robinson (born Duck), Charles Edwin Duck, Agnes Sarah Facy (born Duck), Kate Maynard (born Duck), William Henry Duck, Joyce Shergold (born Duck)
    // Siblings: George Duck, James William Duck, William C Duck,Edwin Duck, Albert Duck, Ann Duck, Henry Duck, Hannah Duck, John Duck, Samuel Duck, Sarah Duck

    // attempt to get the search details from the data (to match the tree we are looking for)
    var namesString = data.replace(/^([^\:\<]*)\<br\/\>.*/,"$1");
    if (namesString != data && namesString != "") {
      var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(namesString);
      if (parsedName) {
        lastName = parsedName.lastName;
        firstNames = parsedName.firstNames;
      }
    }

    var birthString = data.replace(/.*\<br\/\>Birth: *([^\:\<]*)\<br\/\>.*/,"$1");
    if (birthString != data && birthString != "") {
      var dashIndex = birthString.search(/\-/);
      if (dashIndex != -1) {
        var dateString = birthString.substring(0,dashIndex);
        var locationString = birthString.substring(dashIndex+1);

        birthFactDate = new FactDate(dateString);
        if (birthFactDate.isValid) {
          birthYear = birthFactDate.year;
        }
        if (locationString != "") {
          birthLocation = "";
        }   
      }
      else {
        birthFactDate = new FactDate(birthString);
        if (birthFactDate.isValid) {
          birthYear = birthFactDate.year;
        }
      }
    }
    var fatherString = data.replace(/.*\<br\/\>Father: *([^\:\<]*)\<br\/\>.*/,"$1");
    if (fatherString != data && fatherString != "") {
      var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(fatherString);
      if (parsedName) {
        fatherName = parsedName.firstNames + " " + parsedName.lastName;
      }
    }
    var motherString = data.replace(/.*\<br\/\>Mother: *([^\:\<]*)\<br\/\>.*/,"$1");
    if (motherString != data && motherString != "") {
      var parsedName = this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree_ParseName(motherString);
      if (parsedName) {
        motherName = parsedName.firstNames + " " + parsedName.lastName;
      }
    }

    var parentsString = fatherString + " " + motherName;

    var uriBuilder = new GeniTreeUriBuilder();
    uriBuilder.addNames(firstName, middleName,lastName);
    uriBuilder.addGender(this.bio.personGender.toLowerCase());
    uriBuilder.addBirth(birthLocation, birthYear);
    uriBuilder.addParents(parentsString);
    var geniUri = uriBuilder.getUri();

    cleanedSource = "[" + geniUri + " Geni Family Tree]"
    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritage_MyHeritageFamilyTree(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    var beforeMedia = result.beforeMedia;
    var media = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    var treeName = beforeMedia;
    var treeIndex = beforeMedia.indexOf("MyHeritage family tree");
    if (treeIndex != -1) {
      treeName = beforeMedia.substring(0, treeIndex);
    }
    treeName = treeName.replace(/\<p\>/g, "").trim();

    data = data.replace(/\<br\/\>\; */g,"<br/>");
    data = data.replace(/\<a\>/g,"");
    data = data.replace(/\<\/a\>/g,"");

    cleanedSource = "MyHeritage family tree " + treeName;
    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_MyHeritageGeneral(sourceText) {
    var cleanedSource = "";

    // get mediaCollection, myHeritageLink and remaining data
    const result = this.cleanSourceOnly_MyHeritage_ParseStandard(sourceText);
    if (result == undefined) {
      return "";
    }
    var beforeMedia = result.beforeMedia;
    var mediaCollection = result.mediaCollection;
    var myHeritageLinks = result.myHeritageLinks;
    var data = result.data;

    var publicationIndex = beforeMedia.indexOf(" Publication: MyHeritage");
    if (publicationIndex != -1) {
      beforeMedia = beforeMedia.substring(0, publicationIndex);
    }

    data = data.replace(/\<br\/\>\; */g,"<br/>");
    data = data.replace(/\<a\>/g,"");
    data = data.replace(/\<\/a\>/g,"");

    cleanedSource = beforeMedia;
    cleanedSource = cleanedSource.concat(myHeritageLinks, "<br/>", data);

    return cleanedSource;
  }

  cleanSourceOnly_ForAncestryCases(sourceText) {

    let origSourceText = sourceText;

    sourceText = this.bio.replaceAncestryLinksWithTemplates(sourceText);

    if (/^Abbreviation\: .* TMPLT .* FIELD /.test(sourceText)) {
      var abbrev = sourceText.replace(/^Abbreviation\: (.*) Title\:.*/, "$1");
      if (abbrev == sourceText) {
        abbrev = sourceText.replace(/^Abbreviation\: (.*) TMPLT.*/, "$1");
        if (abbrev == sourceText) {
          return "";
        }
      }
      const dataPrefix = "Data: Text:";
      var dataIndex = sourceText.indexOf(dataPrefix);
      
      if (/^ *Source \#[\d]* *$]/.test(sourceText)) {
        // this is an empty source. But if we return "" it will not get cleaned
      }

      if (dataIndex == -1) {
        return abbrev;
      }
      else {
        var result = abbrev;
        if (result != "") {
          result += " ";
        }
        result += sourceText.substring(dataIndex+dataPrefix.length);
        return result;
      }
    }
    else if (sourceText != origSourceText) {
      result = sourceText;
      return result;
    }

    return "";
  }

  cleanSourceForMyHeritageCases(sourceText) {

    if (/^\d\d\d\d England \& Wales Census Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritageCensusEnglandWales(sourceText, false);
    }

    if (/^1939 Register of England \& Wales Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritageCensusEnglandWales(sourceText, true);
    }

    if (/England \& Wales\, Birth Index\, \d\d\d\d *\- *\d\d\d\d Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritage_England_BirthIndex(sourceText);
    }

    if (/England \& Wales\, Death Index\, \d\d\d\d *\- *\d\d\d\d Publication\: MyHeritage/.test(sourceText) ||
        /England \& Wales Deaths\, GRO Indexes\, \d\d\d\d *\- *\d\d\d\d Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritage_England_DeathIndex(sourceText);
    }

    if (/^FamilySearch Family Tree Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritage_FamilySearchFamilyTree(sourceText);
    }

    if (/^Geni World Family Tree Publication\: MyHeritage/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritage_GeniFamilyTree(sourceText);
    }

    if (/^.*Web Site \<p\>MyHeritage family tree/.test(sourceText)) {
      return this.cleanSourceOnly_MyHeritage_MyHeritageFamilyTree(sourceText);
    }

    // No specific case found, try general cleanup
    return this.cleanSourceOnly_MyHeritageGeneral(sourceText);
  }
  
  cleanSourceForKnownCases(sourceText) {

    if (/Ancestry Family Trees/.test(sourceText) ||
        /Abbreviation\: .* TMPLT/.test(sourceText) ) {
      return this.cleanSourceOnly_ForAncestryCases(sourceText);
    }

    var isMyHeritage = /MyHeritage/.test(sourceText); 
    if (isMyHeritage) {
      return this.cleanSourceForMyHeritageCases(sourceText);
    }

    return "";
  }
  
  cleanSourceForUnknownCases(sourceText) {
    return sourceText;
  }
  
  cleanSourceOnly(sourceText) {
    var cleanedSource = "";

    cleanedSource = this.cleanSourceForKnownCases(sourceText);

    if (cleanedSource == "") {
      cleanedSource = this.cleanSourceForUnknownCases(sourceText);
    }

    return cleanedSource;
  }
}

class BiographyWriter {

  constructor(biography) {

    this.biography = biography;
    this.text = "";

    this.dateToday = this.getDateTodayString();

    this.citationBuilder = new CitationBuilder(this.dateToday, this.biography);
  }

  // Get today's date in dd mm yyyy format
  getDateTodayString() {
    const today = this.biography.runDate;
    const day = today.getDate();
    const month = MonthStrings[today.getMonth()]; //January is 0
    const year = today.getFullYear();
    const dateToday = day.toString() + " " + month + " " + year;
    return dateToday;
  }

  getText() {
    return this.text;
  }

  append(stringToAppend) {
    this.text += stringToAppend;
  }

  getDateString(fact) {
    return fact.getDateStringForOutput();
  }

  getNarrativeDateString(fact) {
    return fact.getDateStringForNarrative();
  }

  getLocationString(fact) {
    return fact.getLocationStringForOutput();
  }

  getDescription(fact) {
    let desc = fact.description.trim();

    // trim can remove a leading \n needed before a : in the extra data.
    if (desc != "" && desc[0] == ":") {
      desc = "\n" + desc;
    }
    return desc;
  }

  getInLocationString(fact) {
    // Since locationString can be blank make a string that says " in <location>" so it works even if blank
    const locationString = this.getLocationString(fact);
    var inLocationString = "";
    if (locationString != "") {
      var firstChar = locationString[0];

      // if locationString is a URL then get the first char of the text
      if (firstChar == "[") {
        const spaceIndex = locationString.indexOf(" ");
        if (spaceIndex != -1 && spaceIndex < locationString.length-2) {
          firstChar = locationString[spaceIndex+1];
        }
      }
      if (firstChar >= '0' && firstChar <= '9') {
        inLocationString = " at " + locationString;
      }
      else {
        inLocationString = " in " + locationString;
      }
    }
    else if (userOptions.narrative_addAtUnknownLocation) {
      inLocationString = " at an unknown location";
    }

    return inLocationString;
  }

  getLcDatePrep(fact, dateString) {
    var lcDatePrep = "on";
    if (dateString.includes("and")) {
      lcDatePrep = "between";
    }
    else if (dateString.length <= 4 || (dateString[0] < '0' || dateString[0] > '9'))
    {
      lcDatePrep = "in";
    }

    if (fact.factDate.qualifier == DateQualifiers.before)
    {
      lcDatePrep = "before";
    }
    else if (fact.factDate.qualifier == DateQualifiers.after)
    {
      lcDatePrep = "after";
    }
    else if (fact.factDate.qualifier == DateQualifiers.about)
    {
      lcDatePrep = lcDatePrep + " about";
    }

    return lcDatePrep;
  }

  getUcDatePrep(fact, dateString) {
    var ucDatePrep = "On";
    if (dateString.includes("and")) {
      ucDatePrep = "Between";  
    }
    else if (dateString.length <= 4 || (dateString[0] < '0' || dateString[0] > '9'))
    {
      ucDatePrep = "In";  
    }

    if (fact.factDate.qualifier == DateQualifiers.before)
    {
      ucDatePrep = "Before";  
    }
    else if (fact.factDate.qualifier == DateQualifiers.after)
    {
      ucDatePrep = "After";  
    }
    else if (fact.factDate.qualifier == DateQualifiers.about)
    {
      ucDatePrep = ucDatePrep + " about";
    }

    return ucDatePrep;
  }

  getLcOnNarrativeDate(fact) {
    const narrativeDateString = this.getNarrativeDateString(fact);
    if (narrativeDateString != "") {
      if (narrativeDateString.startsWith("between")) {
        return narrativeDateString;
      }
      const dateString = this.getDateString(fact);
      return this.getLcDatePrep(fact, dateString) + " " + narrativeDateString;
    }
    else {
      return "on an unknown date";
    }       
  }

  getUcOnNarrativeDate(fact) {
    const narrativeDateString = this.getNarrativeDateString(fact);
    if (narrativeDateString != "") {
      const dateString = this.getDateString(fact);
      return this.getUcDatePrep(fact, dateString) + " " + narrativeDateString;
    }
    else {
      return "On an unknown date";
    }       
  }

  writeMarriageChildren(fact) {

    if (fact.marriageChildren.length > 0) {
      if (!fact.marriageChildren[0].startsWith("@")) {
        this.append(" The couple had ");
        if (fact.marriageChildren.length == 1) {
          this.append("one child: ");
        }
        else {
          this.text = this.text.concat(fact.marriageChildren.length, " children: ");
        }
        var childAdded = false;
        var countdown = fact.marriageChildren.length;
        for (var child of fact.marriageChildren) {
          var childName = child.trim();
          if (childName.endsWith(".")) {
            childName = childName.replace(".", "");
          }
          if (childAdded) {
            if (countdown == 1) {
              this.append(" and ");
            }
            else {
              this.append(", ");
            }
          }
          this.append(childName);
          childAdded = true;
          countdown--;
        }
        this.append(".");
      }
    }
  }

  writeAllRefs(fact) {

    if (userOptions.references_addNewlineBeforeFirst) {
      if (this.text[this.text.length-1] != "\n")
      {
        this.append("\n");
      }
    }

    // first output the primary refs, then the secondary refs
    for (var ref of fact.refs.values()) {
      if (ref.owningRef == undefined) {
        this.append(this.citationBuilder.generateReference(fact, ref));
      }
    }
    for (var ref of fact.refs.values()) {
      if (ref.owningRef != undefined) {
        this.append(this.citationBuilder.generateReference(fact, ref));
      }
    }
  }

  writeStickers() {
    // Add the "Died Young" sticker if appropriate
    if (!this.biography.textBeforeBio.includes("{{Died Young}}")) {
      var birthDate = this.biography.birthDate;
      var deathDate = this.biography.deathDate;
      const timeDiff = (new Date(deathDate)) - (new Date(birthDate));
      const yearsOfAgeAtDeath = timeDiff / (1000 * 60 * 60 * 24 * 365); // convert milliseconds to years
      if (yearsOfAgeAtDeath < 12) {
        this.append("{{Died Young}}\n");
      }
    }
  }

  writeFactOccupation(fact) {
    if (fact.occupation != undefined && fact.occupation != "") {
      var pronoun = " He ";
      if (this.biography.personGender == "Female") {
        pronoun = " She ";
      }

      this.text = this.text.concat(pronoun, "was employed as a ", fact.occupation, ".");
    }
  }

  writeFactRecordedAge(fact) {
    if (fact.age != undefined && fact.age != "") {
      this.text = this.text.concat(" Age was recorded as ", fact.age, ".");
    }
  }

  writeChildOfParentsString() {
    const parents = this.biography.parents;
    if (parents == undefined) return "";
    if (parents.father == undefined && parents.mother == undefined) return "";

    var parentString = " ";
    if (this.biography.personGender == "Male") {
      parentString = parentString.concat("He was the son of ");
    }
    else if (this.biography.personGender == "Female") {
      parentString = parentString.concat("She was the daughter of ");
    }
    else {
      parentString = parentString.concat("They were the child of ");
    }

    if (parents.father != undefined) {
      parentString = parentString.concat("[[", parents.father.wikiId,"|", parents.father.name, "]]");
      if (parents.mother != undefined) {
        parentString = parentString.concat(" and ");
      }
    }

    if (parents.mother != undefined) {
      parentString = parentString.concat("[[", parents.mother.wikiId,"|", parents.mother.name, "]]");
    }

    parentString = parentString.concat(".");
    this.append(parentString);
  }

  getAgeStringForFact(fact) {

    var birthFactDate = undefined;
    if (this.biography.preferredBirthFact != undefined) {
      birthFactDate = this.biography.preferredBirthFact.factDate;
    }
    else {
      birthFactDate = new FactDate(this.biography.birthDate);
    }

    if (birthFactDate.qualifier != DateQualifiers.none || birthFactDate.month == "") {
      // we do not have an exact birth date. But sometimes the baptism date is very close to the approximate birth date
      // In that case we don't need to say this is approximate
      const baptismFact = this.biography.getFirstFactOfFactType(FactType.baptism);
      if (baptismFact != undefined && baptismFact.factDate.isValid && baptismFact.factDate.month != "") {
        // we have a more accurate baptism date than birth date
        if (baptismFact.factDate.year - birthFactDate.year <= 1) {
          birthFactDate = baptismFact.factDate;
        }
      }
    }

    var thisFactDate = fact.factDate;
    if (fact.factType == FactType.death) {
      if (!thisFactDate.isValid || thisFactDate.qualifier != DateQualifiers.none || thisFactDate.month == "") {
        // we do not have an exact date for this death fact. But the burial date should always is always be close
        // In that case we don't need to say this is approximate
        const burialFactSection = this.biography.factSectionMap.get(FactType.burial);
        if (burialFactSection != undefined && burialFactSection.facts.length > 0) {
          const burialFact = burialFactSection.facts[0];
          if (burialFact.factDate.isValid) {
            if (!thisFactDate.isValid || (burialFact.factDate.month != "" && thisFactDate.month == "")
                                      || (burialFact.qualifier == DateQualifiers.none && thisFactDate.qualifier != DateQualifiers.none)) {
              // we have a more accurate burial date than death date
              if (burialFact.factDate.year - thisFactDate.year <= 1) {
                thisFactDate = burialFact.factDate;
              }
            }
          }
        }
      }
    }


    if (!birthFactDate.isValid || !thisFactDate.isValid) {
      return "";
    }

    // we could use the Javascript Date class to calculate the difference. In cases where there is not an exact date
    // it uses the end of the month or year. It also doesn't take account of date qualifiers such as "about".

    if (birthFactDate.year > thisFactDate.year) {
      return "";
    }

    var isApproximate = false;
    var yearDiff = thisFactDate.year - birthFactDate.year;

    var monthDiff = 0;
    var dayDiff = 0;

    if (thisFactDate.month != 0 && birthFactDate.month != 0) {
      monthDiff = thisFactDate.month - birthFactDate.month;
      if (monthDiff < 0) {
        yearDiff -= 1;
        monthDiff += 12;
      }

      if (thisFactDate.day != 0 && birthFactDate.day != 0) {
        dayDiff = thisFactDate.day - birthFactDate.day;
        if (dayDiff < 0) {
          if (monthDiff == 0) {
            yearDiff -= 1;
          }
          monthDiff -= 1;
          dayDiff = birthFactDate.absDaysBetweenDates(thisFactDate);
        }
      }

      if (yearDiff < 2 && (thisFactDate.day == 0 || birthFactDate.day == 0)) {
        // less than 2 years old, if no day then it is approximate, it could be a birth registration with is only accurate to quarter
        isApproximate = true;
      }
    }
    else {
      // when the birth has a month and the fact does not we assume that the fact is on Jan 1. Otherwise the ages disagree with the sorting.
      if (birthFactDate.month != 0 && yearDiff > 0) {
        yearDiff -= 1;
      }

      isApproximate = true;
    }

    var ageString = "" + yearDiff;
    if (yearDiff < 2) {
      if (yearDiff < 1) {
        if (isApproximate) {
          ageString = "an infant";
        }
        else {
          if (monthDiff > 1) {
            ageString = "" + monthDiff + " months";
          }
          else if (monthDiff == 1) {
            ageString = "one month";
          }
          else if (dayDiff > 1) {
            ageString = "" + dayDiff + " days";
          }
          else if (dayDiff == 1 || isApproximate) {
            ageString = "one day";
          }
          else {
            ageString = "less than one day";
          }
        }
      }
      else {
        if (!isApproximate) {
          const ageInMonths = monthDiff + 12;
          ageString = "" + ageInMonths + " months";
        }
      }
    }

    if (isApproximate && ageString != "an infant") {
      ageString = "about " + ageString;
    }

    return ageString;
  }

  getMarriageAgeString(fact) {
    var ageString = "";
    if (userOptions.include_age != "none" && userOptions.include_age != "death_only") {
      ageString = this.getAgeStringForFact(fact);
    }
    return ageString;
  }

  getResidenceAgeString(fact) {
    var ageString = "";
    if (userOptions.include_age == "most") {
      ageString = this.getAgeStringForFact(fact);
    }

    if (ageString != "") {
      if (ageString != "an infant") {
        ageString = " (age " + ageString + ")";
      }
      else {
        ageString = " (an infant)";
      }
    }
    
    return ageString;
  }

  getDeathAgeString(fact, force) {
    var ageString = "";
    if (force || userOptions.include_age != "none") {
      ageString = this.getAgeStringForFact(fact);
    }

    if (ageString != "") {
      if (ageString != "an infant") {
        ageString = "at the age of " + ageString + " ";
      }
      else {
        ageString = "as an infant ";
      }
    }

    return ageString;
  }

  writeRefsFromNameFact(nameFactWithRefs, checkOnly) {
    if (nameFactWithRefs == undefined) return false;

    var allNonNameRefs = [];
    for (var fact of this.biography.facts) {
      if (fact.factType != FactType.name) {
        if (fact.refs.size > 0) {
          for (var ref of fact.refs.values()) {
            allNonNameRefs.push(ref);
          }
        }
      }
    }

    var uniqueAdditionalRefs = [];
    for (var ref of nameFactWithRefs.refs.values()) {
      // compare with all existing refs that are not on the name fact
      var foundMatch = false;
      for (var otherRef of allNonNameRefs) {
        if (ref.source != undefined && otherRef.source != undefined && 
            ref.source.text.trim() == otherRef.source.text.trim() && ref.citation.trim() == otherRef.citation.trim()) {
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        uniqueAdditionalRefs.push(ref);
      }
    }

    // there are user options to supress some of these options
    var unsupressedAdditionalRefs = [];
    if (uniqueAdditionalRefs.length > 0) {
      for (var ref of uniqueAdditionalRefs) {
        let title = nameFactWithRefs.getSectionNameForSourceTitle(ref);
        let supressed = false;
        if (title == "Child Baptism" && userOptions.sources_supressChildBaptisms) {
          supressed = true;
        }
        else if (title == "Child Marriage" && userOptions.sources_supressChildMarriages) {
          supressed = true;
        }
        if (!supressed) {
          unsupressedAdditionalRefs.push(ref);
        }
      }
    }

    if (unsupressedAdditionalRefs.length > 0) {
      if (checkOnly) {
        return true;
      }

      this.text = this.text.concat("=== Sources with no fact or date ===\n\n");

      this.text = this.text.concat("There are additional sources with no facts or date. Often these are sources for the baptism or marriage of children that mention the parents or father.",
                      " This section can just be removed if you will be adding those children and using these sources there.")
      for (var ref of unsupressedAdditionalRefs) {
        this.append(this.citationBuilder.generateReference(nameFactWithRefs, ref));
        if (this.text[this.text.length-1] != "\n") {
          this.text = this.text.concat("\n");
        }
      }
      this.text = this.text.concat("\n");
      return true;
    }

    return false;
  }

  writeExtraDataForFact(fact) {
    // in 2011 format there can be extra data. It looks best to add this after the refs.
    if (fact.extraData != undefined) {
      for (let dataLine of fact.extraData) {
        if (this.text[this.text.length-1] != "\n") {
          this.text = this.text.concat("\n");
        }
        this.text = this.text.concat(": ", dataLine);
        //this.text = this.text.concat("<br/>- ", dataLine);
      }
    }
  }

  writeDescriptionRefsExtraDataAndTerminatingNewlines(fact) {

    // If the extra data is only one line append it to the description
    let extraDataToAdd = undefined;
    if (fact.extraData != undefined && fact.extraData.length == 1) {
      if (fact.description.length > 0) {
        fact.description = fact.description.concat(", ");
      }
      fact.description = fact.description.concat(fact.extraData[0]);
      fact.extraData = undefined;
    }

    const description = this.getDescription(fact);
    if (description != "") {
      this.text = this.text.concat(" ", description);
    }

    this.writeAllRefs(fact);

    // in 2011 format there can be extra data. It looks best to add this after the refs.
    this.writeExtraDataForFact(fact);

    // we want two newlines before the next fact.
    if (this.text[this.text.length-1] != "\n") {
      this.append("\n");
    }
    this.append("\n");
  }

  writeFacts(writeFactsWithDates) {

    var nameFactWithRefs = undefined;

    var haveOutputParentsOnEvent = false;

    const prefName = this.biography.prefName;

    for (var fact of this.biography.facts) {

      if (fact.factType == FactType.name) {
        if (fact.refs.size > 0) {
          nameFactWithRefs = fact;
        }

        continue;
      }

      if (fact.isHidden) {
        continue;
      }

      if (fact.owningFact != undefined) {
        continue;
      }

      var factSupressed = false;

      var dateString = this.getDateString(fact);
      var locationString = this.getLocationString(fact);

      if (dateString == "") {
        if (writeFactsWithDates) {
          this.hasFactsWithNoDate = true;
          continue;
        }
      }
      else {
        if (!writeFactsWithDates) {
          continue;
        }
      }

      if (fact.factType == FactType.birth) {
        // Custom format for birth
        this.text = this.text.concat(prefName, " was born ", this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");

        if (!haveOutputParentsOnEvent) {
          this.writeChildOfParentsString();
          haveOutputParentsOnEvent = true;
        }
      }
      else if (fact.factType == FactType.baptism) {
        // Custom format for baptism

        // For now, this is the only string that changed based on locale, if there are more we should generalize this
        var baptisedString = "baptised";
        if (userOptions.spelling == "en_us") {
          baptisedString = "baptized";
        }
        this.text = this.text.concat(prefName, " was ", baptisedString, " ", this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");
        if (!haveOutputParentsOnEvent) {
          this.writeChildOfParentsString();
          haveOutputParentsOnEvent = true;
        }
      }
      else if (fact.factType == FactType.marriage) {
        // Custom format for marriage

        if (fact.suspectMarriage) {
          factSupressed = true;
        }
        else {
          var spouseName = "";
          var pronoun = "he";
          if (this.biography.personGender == "Male") {
            spouseName = fact.marriageWife;
          }
          else {
            pronoun = "she";
            spouseName = fact.marriageHusband;
          }

          var ageString = this.getMarriageAgeString(fact);
          if (ageString != "") {
            this.text = this.text.concat("When ", prefName, " was ", ageString, " ", pronoun);
          }
          else {
            this.append(prefName);
          }

          const onDate = this.getLcOnNarrativeDate(fact);
          const inLocation = this.getInLocationString(fact);
          if (spouseName != "" && spouseName != undefined && spouseName[0] != "@") {
            this.text = this.text.concat(" married ", spouseName, " ", onDate, inLocation, ".");
          }
          else {
            this.text = this.text.concat(" married ", onDate, inLocation, ".");
          }

          this.writeMarriageChildren(fact);
        }
      }
      else if (fact.factType == FactType.employment) {
        // Custom format for employment/occupation
        // See if the ref matches a known sourceString
        var matchingResidenceData = fact.getMatchingResidenceData();

        if (matchingResidenceData != undefined && userOptions.narrative_useResidenceData) {
          if (fact.factDate.year == matchingResidenceData.year) {
            // we found a residenceData with a year, so we will just use the this.text string from that and not use date
            this.text = this.text.concat("In the ", matchingResidenceData.bioString);
          }
          else {
            // we still want to use the date but use the bio string also
            this.text = this.text.concat(this.getUcOnNarrativeDate(fact), " according to ", matchingResidenceData.bioString);
          }
        }
        else {
          this.text = this.text.concat(this.getUcOnNarrativeDate(fact));
        }
        this.text = this.text.concat(" ", prefName);
          
        this.append(this.getResidenceAgeString(fact));
        if (fact.occupation != undefined && fact.occupation != "") {
          if (fact.wasCombinedWithResidenceOrCensus) {
            var pronoun = "She";
            if (this.biography.personGender == "Male") {
              pronoun = "He";
            }
            this.text = this.text.concat(" was living", this.getInLocationString(fact), ". ",
              pronoun, " was employed as a ", fact.occupation, ".");
          }
          else {
            this.text = this.text.concat(" was employed as a ", fact.occupation, this.getInLocationString(fact), ".");
          }
        }
        else {
          if (fact.wasCombinedWithResidenceOrCensus) {
            this.text = this.text.concat(" was living", this.getInLocationString(fact), ".");
          }
          else {
            this.text = this.text.concat(" was employed", this.getInLocationString(fact), ".");
          }
        }
      }
      else if (fact.factType == FactType.residence || fact.factType == FactType.census) {
        // Custom format for residence or census

        if ((dateString == "" || locationString == "") && fact.refs.size == 0 && !fact.extraData) {
          // census fact has no date or no location and no refs - just suppress it. It must have come from some source that is referenced elsewhere
          factSupressed = true;
        }
        else {
          // See if the ref matches a known sourceString
          var matchingResidenceData = fact.getMatchingResidenceData();

          if (matchingResidenceData != undefined && userOptions.narrative_useResidenceData) {
            if (fact.factDate.year == matchingResidenceData.year) {
              // we found a residenceData with a year, so we will just use the this.text string from that and not use date
              this.text = this.text.concat("In the ", matchingResidenceData.bioString);
            }
            else {
              // we still want to use the date but use the bio string also
              this.text = this.text.concat(this.getUcOnNarrativeDate(fact), " according to ", matchingResidenceData.bioString);
            }
          }
          else {
            let isCensus = false;
            if (fact.factType == FactType.census) {
              isCensus = true;
            }
            else if (matchingResidenceData && matchingResidenceData.bioString.toLowerCase().includes("census")) {
              isCensus = true;
            }

            if (!isCensus || userOptions.narrative_useFullCensusDate) {
              this.text = this.text.concat(this.getUcOnNarrativeDate(fact));
            }
            else {
              let year = fact.factDate.year;
              this.text = this.text.concat("In ", year);
            }
          }

          this.text = this.text.concat(" ", prefName);
          this.append(this.getResidenceAgeString(fact));

          this.text = this.text.concat(" was living", this.getInLocationString(fact), ".");

          this.writeFactOccupation(fact);
          this.writeFactRecordedAge(fact);
        }
      }
      else if (fact.factType == FactType.death) {
        // Custom format for death
        this.text = this.text.concat(prefName, " died ");
        var ageString = this.getDeathAgeString(fact, false);
        if (ageString != "") {
          this.text = this.text.concat(ageString);
        }
        this.text = this.text.concat(this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");
        if (fact.causeOfDeath != undefined) {
          this.text = this.text.concat(" Cause of death was ", fact.causeOfDeath, ".");
        }
      }
      else if (fact.factType == FactType.burial) {
        // Custom format for burial
        var hasDeathDate = false;
        if (fact.ownedFact != undefined && fact.ownedFact.factType == FactType.death) {
          this.text = this.text.concat(prefName, " died ");

          const displayDeathDate = fact.ownedFact.factDate.qualifier == DateQualifiers.none;

          // Only force the age if there is going to be no date for the death
          var ageString = this.getDeathAgeString(fact, !displayDeathDate);
          this.text = this.text.concat(ageString);

          if (displayDeathDate) {
            this.text = this.text.concat(this.getLcOnNarrativeDate(fact.ownedFact));
            hasDeathDate = true;
          }

          const commonDeathAndBurialLocation = getCombinedLocation(fact.location, fact.ownedFact.location);
          if (fact.ownedFact.location != "" && commonDeathAndBurialLocation == undefined) {
            this.text = this.text.concat(this.getInLocationString(fact.ownedFact));
          }

          if (this.text[this.text.length-1] != " ") {
            this.text = this.text.concat(" ");
          }

          this.text = this.text.concat("and");
        }
        else {
          this.text = this.text.concat(prefName);
        }

        if (hasDeathDate && fact.factDate.qualifier == DateQualifiers.after) {
          this.text = this.text.concat(" was buried", this.getInLocationString(fact), ".");
        }
        else {
          this.text = this.text.concat(" was buried ", this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");
        }
      }
      else if (fact.factType == FactType.probate) {
        // Custom format for probate
        this.text = this.text.concat("Probate was granted ");
        this.text = this.text.concat(this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");
      }
      else if (fact.factType == FactType.military) {
        // Custom format for military

        this.text = this.text.concat(prefName, " served in the military");
        if (dateString != "") {
          if (fact.factDate.isRange) {
            this.text = this.text.concat(" from ", fact.factDate.year, " to ", fact.factDate.endYear);
          }
          else {
            this.text = this.text.concat(" ", this.getLcOnNarrativeDate(fact));
          }
        }
        this.text = this.text.concat(this.getInLocationString(fact), ".");
      }
      else if (fact.factType == FactType.departure) {
        // Custom format for departure
        this.text = this.text.concat(prefName, " departed ", locationString, " ", this.getLcOnNarrativeDate(fact), ".");

        if (fact.ownedFact != undefined && fact.ownedFact.factType == FactType.residence) {
          var residenceLocationString = fact.ownedFact.getLocationStringForOutput();
          if (residenceLocationString == "") {
            residenceLocationString = fact.ownedFact.description;
          }
          else if (fact.ownedFact.description != "") {
            residenceLocationString = residenceLocationString + " (" + fact.ownedFact.description + ")";
          }
          this.text = this.text.concat(" Recorded residence was ", residenceLocationString, ".");
        }
      }
      else if (fact.factType == FactType.arrival) {
        // Custom format for arrival
        if (fact.ownedFact != undefined && fact.ownedFact.factType == FactType.departure) {
          var departureDateString = fact.ownedFact.getDateStringForOutput();
          var departureLocationString = fact.ownedFact.getLocationStringForOutput();
          if (departureLocationString == "") {
            departureLocationString = fact.ownedFact.description;
          }
          else if (fact.ownedFact.description != "") {
            departureLocationString = departureLocationString + " (" + fact.ownedFact.description + ")";
          }

          if (fact.ownedFact.factDate.isValid) {
            var lcDepartureDatePrep = "on";
            if (departureDateString.length <= 4 || (departureDateString[0] < '0' || departureDateString[0] > '9'))
            {
              var lcDepartureDatePrep = "in";
            }
            this.text = this.text.concat(prefName, " departed ", departureLocationString, " ", lcDepartureDatePrep, " ", departureDateString, " and arrived in ", locationString, " ", this.getLcOnNarrativeDate(fact), ".");
          }
          else {
            this.text = this.text.concat(prefName, " departed ", departureLocationString, " and arrived in ", locationString, " ", this.getLcOnNarrativeDate(fact), ".");
          }
        }
        else if (locationString != "") {
          this.text = this.text.concat(prefName, " arrived in ", locationString, " ", this.getLcOnNarrativeDate(fact), ".");
        }
        else {
          this.text = this.text.concat(prefName, " arrived ", this.getLcOnNarrativeDate(fact), ".");
        }

        if (fact.ownedFact != undefined && fact.ownedFact.factType == FactType.residence) {
          var residenceLocationString = fact.ownedFact.getLocationStringForOutput();
          if (residenceLocationString == "") {
            residenceLocationString = fact.ownedFact.description;
          }
          else if (fact.ownedFact.description != "") {
            residenceLocationString = residenceLocationString + " (" + fact.ownedFact.description + ")";
          }
          this.text = this.text.concat(" Recorded residence was ", residenceLocationString, ".");
        }
      }
      else {
        // we create a string that is : date, "in" location, description, refs
        var sectionName = fact.sectionName.trim();
        if (sectionName.endsWith(":")) {
          sectionName = sectionName.substr(0, sectionName.length-1);  // remove trailing colon - we are going to add one anyway
        }

        if (dateString != "") {
          let date = this.getNarrativeDateString(fact);
          if (date.includes("and")) {
            date = "Between " + date;
          }
          this.text = this.text.concat(sectionName + ": " + date, this.getInLocationString(fact), ".");
        }
        else {
          if (locationString != "") {
            this.text = this.text.concat(sectionName + ": ", this.getInLocationString(fact), ".");
          }
          else {
            this.text = this.text.concat(sectionName + ":");
          }
        }
      }

      if (!factSupressed) {
        this.writeDescriptionRefsExtraDataAndTerminatingNewlines(fact);
      }
    }

    // we only want to write these additional refs once, either with the facts with dates or without
    if (!writeFactsWithDates) {
      this.writeRefsFromNameFact(nameFactWithRefs, false);
    }
    else {
      // this just does a full check to see if the section is needed
      this.hasNameFactWithRefs = this.writeRefsFromNameFact(nameFactWithRefs, true);
    }
  }

  writeExternalMediaLinks() {
    // External file links (fileFacts)
    if (userOptions.include_externalMedia) {
      var haveOutputMediaHeader = false;
      for (const factSection of this.biography.factSectionArray) {
        if (factSection.fileFacts.length > 0) {

          for (const fileFact of factSection.fileFacts) {
            if (!haveOutputMediaHeader) {
              this.text = this.text.concat("'''External media links:''' (These may require a subscription to view)\n");
              haveOutputMediaHeader = true;
            }

            const fileDescription = removeTrailingPeriodAndSpaces(fileFact.description);
            var fileFormat = removeTrailingPeriodAndSpaces(fileFact.fileFormat);
            if (fileFormat == "") {
              fileFormat = "unknown format";
            }
            this.text = this.text.concat("* " + fileDescription + " (" + fileFormat + " file): " + fileFact.fileLink + "\n");
          }
        }
      }
    }
  }

  writeResearchNotes() {
    var haveOutputResearchNotesHeader = false;


    function outputResearchNotesHeader(writer) {
      if (!haveOutputResearchNotesHeader) {
        // there should be two newlines before the header
        if (!writer.text.endsWith("\n\n")) {
          if (writer.text.endsWith("\n")) {
            writer.text = writer.text.concat("\n");
          }
          else {
            writer.text = writer.text.concat("\n\n");
          }
        }
        writer.text = writer.text.concat("== Research Notes ==\n");
        haveOutputResearchNotesHeader = true;
      }
      else {
        writer.text = ensureBlankLine(writer.text);
      }
    }

    this.text = this.text.concat(this.biography.textAfterBioBeforeResearchNotes);

    // Existing research notes
    if (this.biography.existingResearchNotes != "") {
      outputResearchNotesHeader(this);
      this.text = this.text.concat(this.biography.existingResearchNotes);
    }

    // Write any facts that had no date so didn't fit in a chonological narrative
    if (this.hasFactsWithNoDate || this.hasNameFactWithRefs) {
      outputResearchNotesHeader(this);
      if (this.hasFactsWithNoDate) {
        this.text = this.text.concat("=== Facts with no date ===\n\n");
      }
      this.writeFacts(false);
    }

    // If there were notes then add that to the addedResearchNotes
    if (this.biography.noteLines.length > 0) {
      if (this.biography.addedResearchNotes) {
        this.biography.addedResearchNotes = ensureBlankLine(this.biography.addedResearchNotes);
      }

      this.biography.addedResearchNotes = this.biography.addedResearchNotes.concat("=== Notes from external profile ===\n");

      for (var note of this.biography.noteLines) {
        this.biography.addedResearchNotes = this.biography.addedResearchNotes.concat(note, "\n");
      }
    }

    // Research notes added during processing (these would already include subheadings)
    if (this.biography.addedResearchNotes != "") {
      outputResearchNotesHeader(this);
      this.text = this.text.concat(this.biography.addedResearchNotes);
    }

    // Suspect marriages
    if (this.biography.suspectMarriageFacts.length > 0) {
      outputResearchNotesHeader(this);

      this.text = this.text.concat("=== Other marriages ===\nGenerated by WikiTree AGC. These marriages look like marriages of other people. Usually these are parent marriages.\n\n");

      for (const fact of this.biography.suspectMarriageFacts) {
        const groom = (fact.marriageHusband != undefined && fact.marriageHusband != "") ? fact.marriageHusband : "An unknown person";
        const bride = (fact.marriageWife != undefined && fact.marriageWife != "") ? fact.marriageWife : "an unknown person";
        this.text = this.text.concat(groom, " married ", bride, " ", this.getLcOnNarrativeDate(fact), this.getInLocationString(fact), ".");

        this.writeMarriageChildren(fact);

        this.writeDescriptionRefsExtraDataAndTerminatingNewlines(fact);
      }
    }

    // Alert messages
    if (this.biography.alertMessages.length > 0 && userOptions.researchNotes_includeIssuesToBeChecked) {
      outputResearchNotesHeader(this);

      this.text = this.text.concat("=== Issues to be checked ===\nGenerated by WikiTree AGC. This section should be removed when all issues have been looked at.\n");
      for (const issue of this.biography.alertMessages) {
        this.text = this.text.concat("* ", issue, "\n");
      }
    }

    if (haveOutputResearchNotesHeader) {
      // we want a blank line between research notes and sources
      this.text = ensureBlankLine(this.text);
    }

    // sometimes (e.g. Carlsdotter-1116) this text is just the Notes heading
    let textAfterResearchNotesBeforeSources = this.biography.textAfterResearchNotesBeforeSources.trim();
    if (textAfterResearchNotesBeforeSources && textAfterResearchNotesBeforeSources != "=== Notes ===") {
      this.text = this.text.concat(textAfterResearchNotesBeforeSources, "\n\n");
    }

    return this.text;
  }

  writeBioText() {

    if (this.biography.textBeforeBio != "") {
      this.append(this.biography.textBeforeBio);
    }

    // check if there are any active refs, this is used to see if it is unsourced and also to decide whether to write "See also:"
    var hasActiveRefs = false;
    for (var fact of this.biography.facts) {
      if (fact.isHidden || fact.owningFact != undefined) {
        continue;
      }
      for (var ref of fact.refs.values()) {
        if (ref.owningRef == undefined) {
          hasActiveRefs = true;
          break;
        }
      }
      if (hasActiveRefs) {
        break;
      }
    }

    if (this.biography.sourcesMap.size == 0 && this.biography.otherSourceLines == 0) {
      // this may be an unsourced bio. Need to check if there are any refs
      if (!hasActiveRefs) {
        const unsourcedString = "{{Unsourced}}";
        if (!this.biography.textBeforeBio.includes("{{Unsourced")) {
          this.text = this.text.concat(unsourcedString, "\n");
        }
      }
    }

    this.append("== Biography ==\n");

    this.writeStickers();

    if (this.biography.preamble != "") {
      this.text += this.biography.preamble;

      // we put two additional hard returns after the preamble if there are any facts to keep the preamble
      // (which could be a manually written biography) and the generated biography separate.
      // But if the preamble looks like it is just stickers then don't do this.
      if (this.biography.facts.length > 0 && !this.text.endsWith("}}\n\n")) {
        this.text += "\n\n";
      }
    }

    this.writeFacts(true);

    // Now output the External Media Links if any
    this.writeExternalMediaLinks();

    // Now output the researchNotes if any
    this.writeResearchNotes();

    // Now output the required sources header and any remaining sources without refs
    this.text = ensureBlankLine(this.text);
    this.text = this.text.concat("== Sources ==\n<references />\n");

    if (this.biography.sourcesMap.size > 0 || this.biography.otherSourceLines.length > 0) {
      if (hasActiveRefs) {
        this.append("See also:\n");
      }

      for (var source of this.biography.sourcesMap.values()) {
        if (!source.text.toLowerCase().includes("gedcom")) {
          const cleanedSourceText = this.citationBuilder.cleanSourceOnly(source.text);
          this.text += "* " + cleanedSourceText + "\n";
        }
      }
      for (var line of this.biography.otherSourceLines) {
        const cleanedSourceText = this.citationBuilder.cleanSourceOnly(line);
        this.text += cleanedSourceText + "\n";
      }
    }

    this.text += this.biography.textAfterSources;
  }
}

class Biography {
  constructor(origText) {
    this.origText = origText;
    this.facts = [];

    this.noteLines = [];

    this.textBeforeBio = "";  // this existing text before the == Biography == line. (should be stickers and categories)
    this.textAfterBioBeforeResearchNotes = "";
    this.textAfterResearchNotesBeforeSources = "";
    this.textAfterSources = "";
    this.existingResearchNotes = "";


    this.addedResearchNotes = "";
    this.alertMessages = [];

    this.format = BioFormat.formatUnknown;

    this.suspectMarriageFacts = []; // in format2011 this is used to track suspect marriages

    this.preferredFactMap = new Map;  // used to store preferred fact for unique fact types like birth/death/burial

    this.gedcomNames = [];

    this.useSpanId = true;  // if this is new format without span Ids this will be set to false
  }

  addAlertMessage(alertMessage) {
    var isDuplicate = false;
    for (var message of this.alertMessages) {
      if (message == alertMessage) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      this.alertMessages.push(alertMessage);
    }
  }

  doSanityChecks() {

    var bioStartIndex = this.origText.search(/==\s*Biography\s*==/);
    if (bioStartIndex == -1) {
      // there is no Biography line. This is how early GEDCOM profiles were created.
      // If this looks like an old format profile then allow it and add the biography line.
      let hasStandardPreamble = this.origText.indexOf("This person was created through the import") != -1;
      if (!hasStandardPreamble) {
        hasStandardPreamble = this.origText.search(/This person was created on \d+ \w+ \d+ through the import of/) != -1;
      }
      const hasUserId = this.origText.indexOf("=== User ID ===") != -1;
      const hasName = this.origText.indexOf("=== Name ===") != -1;

      if (!(hasStandardPreamble || hasUserId || hasName)) {
        this.errorMessage = "Failed to find '== Biography ==' line in text.";
        this.errorMessage += " It does not look like an early import so it has probably been edited.";
        this.errorMessage += " You can try adding the == Biography ==' line and rerunning AGC.";
        return false;
      }

      this.addAlertMessage("No '== Biography ==' was found so one was added at start. Check whether there are categories or project boxes that it should be moved to be after.");

      let text = this.origText;
      bioStartIndex = 0;
      while (/^\[\[Category\:[^\]\n]+\]\]\s*\n/.test(text) || /^\{\{\s*Unsourced\s*\}\}\s*\n/.test(text)) {
        // skip this line
        let nextNewLineIndex = text.indexOf("\n");
        if (nextNewLineIndex != -1) {
          bioStartIndex += nextNewLineIndex + 1;
          text = this.origText.substring(bioStartIndex);
        }
        else {
          bioStartIndex = this.origText.length;
          break;
        }
      }
      this.origText = this.origText.substring(0, bioStartIndex) + "== Biography ==\n" + this.origText.substring(bioStartIndex);
    }

    var sourcesIndex = this.origText.search(/===?\s*Sources\s*===?/);
    if (sourcesIndex == -1) {
      // there is no Sources line. This is how early GEDCOM profiles were created.
      // If this looks like an old format profile then allow it and add the Sources line at the end.
      let hasStandardPreamble = this.origText.indexOf("This person was created through the import") != -1;
      if (!hasStandardPreamble) {
        hasStandardPreamble = this.origText.search(/This person was created on \d+ \w+ \d+ through the import of/) != -1;
      }
      const hasUserId = this.origText.indexOf("=== User ID ===") != -1;
      const hasName = this.origText.indexOf("=== Name ===") != -1;

      if (!(hasStandardPreamble || hasUserId || hasName)) {
        this.errorMessage = "Failed to find '== Sources ==' line in text.";
        this.errorMessage += " It does not look like an early import so it has probably been edited.";
        this.errorMessage += " You can try adding the == Sources ==' line and rerunning AGC.";
        return false;
      }

      this.addAlertMessage("No '== Sources ==' was found so one was added at the end. Check whether this caused any issues.");
      this.origText = this.origText + "\n== Sources ==\n";
    }

    var preamble = this.origText.substring(0, bioStartIndex);
    var nonSpaceInPreambleIndex = preamble.search(/[^\s\n]/);

    if (nonSpaceInPreambleIndex != -1) {
      //console.log("The first line is not '== Biography ==', looking for stickers and categories");
      this.bioWasEdited = true;

      // get the text between start and == Biography ==
      bioStartIndex = this.origText.search(/\n\s*==\s*Biography\s*==\s*\n/);

      if (bioStartIndex == -1) {
        this.errorMessage = "Failed to find separate '== Biography ==' line in text.";
        return false;
      }

      this.textBeforeBio = this.origText.substring(0, bioStartIndex);
      if (this.textBeforeBio[this.textBeforeBio.length-1] != "\n") {
        this.textBeforeBio += "\n";
      }
      //console.log("textBeforeBio:\n" + this.textBeforeBio);

      return true;
    }

    // check for more than one Biography line.
    const textAfterBio = this.origText.substr(bioStartIndex + 13);
    const secondBioStartIndex = textAfterBio.search(/\n\s*==\s*Biography\s*==\s*\n/);
    if (secondBioStartIndex != -1) {
      this.errorMessage = "There is more than one '== Biography ==' line in text.";
      return false;
    }

    const badDateMessageIndex = this.origText.indexOf("''Could not interpret date in");
    if (badDateMessageIndex != -1) {
      const nextQuoteIndex = this.origText.indexOf("''", badDateMessageIndex+2);
      const nextNewlineIndex = this.origText.indexOf("\n", badDateMessageIndex+2);
      var endMessageIndex = nextQuoteIndex+2;
      if (nextNewlineIndex != -1 && nextNewlineIndex < endMessageIndex) {
        endMessageIndex = nextNewlineIndex;
      }
      const message = this.origText.substring(badDateMessageIndex, endMessageIndex);
      // There is an unrecognized date format
      this.errorMessage = "The profile contains " + message +
        ". Ignoring this message can result in bad dates in the profile data fields." +
        " Please check the dates and remove this message before running WikiTree AGC.";
      return false;
    }
    
    return true;
  }

  detectBioFormat() {

    this.format = BioFormat.formatUnknown;

    // Check for bio format
    if (this.origText.includes("''This biography is a rough draft. It was auto-generated by a GEDCOM import and needs to be edited.''")){
      this.format = BioFormat.format2011;
    }
    else if (this.origText.includes("''This biography was auto-generated by a GEDCOM import. It's a rough draft and needs to be edited.''")) {
      this.format = BioFormat.format2011;
    }
    else if (this.origText.search(/\<ref\>[^-]+\-\d+ was created by \[\[[^\]]+\]\] through the import of /) != -1) {
      this.format = BioFormat.format2011;
    }
    else if (this.origText.search(/This person was created through the import of /) != -1) {
      this.format = BioFormat.format2011;
    }
    else if (this.origText.search(/This person was created on \d+ \w+ \d+ through the import of /) != -1) {
      this.format = BioFormat.format2011;
    }
    else if (this.origText.search(/WikiTree profile [^-]+\-\d+ created through the import of /) != -1) {
      this.format = BioFormat.format2011;
    }
    else {
      const nameTitle = "'''Name:'''";
      const nameTitleIndex = this.origText.search(nameTitle);
  
      const bornTitle = "'''Born'''";
      const bornTitleIndex = this.origText.search(bornTitle);
  
      const diedTitle = "'''Died'''";
      const diedTitleIndex = this.origText.search(diedTitle);
  
      if (nameTitleIndex != -1 || bornTitleIndex != -1 || diedTitleIndex != -1) {
        this.format = BioFormat.format2020;
      }
      else {
        const nameTitleIndex2011 = this.origText.indexOf("=== Name ===");
        const birthTitleIndex = this.origText.indexOf("=== Birth ===");
        const deathTitleIndex = this.origText.indexOf("=== Death ===");
        if (nameTitleIndex2011 != -1 || birthTitleIndex != -1 || deathTitleIndex != -1) {
          //if (this.origText.includes(":: Date:") && this.origText.includes(":: Place:")) {
            this.format = BioFormat.format2011;
          //}
        }
        else {
          // unusual case. Search for the Biography line, but we handle cases without it.
          var bioStartIndex = this.origText.search(/==\s*Biography\s*==\s*/);
          if (bioStartIndex == -1) {
            bioStartIndex = 0;
          }

          var nextTopLevelHeaderIndex = regexIndexOf(this.origText, /==[^=]+==\s*\n/, bioStartIndex + 13);
          if (nextTopLevelHeaderIndex == -1) {
            nextTopLevelHeaderIndex = this.origText.length;
          }

          const bioContents = this.origText.substring(bioStartIndex, nextTopLevelHeaderIndex);

          const firstSubHeaderIndex = bioContents.search(/===[^=]+===\s*\n/);
          const firstBoldTitleIndex = bioContents.search(/'''[^'\n]+'''/);

          if (firstBoldTitleIndex != -1) {
            if (firstSubHeaderIndex != -1) {
              this.format = (firstBoldTitleIndex < firstSubHeaderIndex) ? BioFormat.format2020 : BioFormat.format2011;
            }
            else {
              this.format = BioFormat.format2020;
            }
          }
          else {
            if (firstSubHeaderIndex != -1) {
              this.format = BioFormat.format2011;
            }
          }
        }
      }

    }
  }

  static compareFacts(a, b) {

    // If one of the Facts is a birth and the other is not and they have the same year we want the birth to come first
    // This can happen when a person is born in 1841 so there is a census record with a date of 1841 and a birth with
    // a date of January 1841.
    const aIsBirth = a.factType == FactType.birth;
    const bIsBirth = b.factType == FactType.birth;
    if (aIsBirth != bIsBirth) {
      if (Math.abs(a.factDate.year - b.factDate.year) <= 2) {
        // whichever one is the birth should come first
        if (aIsBirth) {
          return -1;
        }
        return 1;
      }
      else if (a.factType != FactType.name && b.factType != FactType.name) {
        // for most fact types they should never come before the birth anyway.
        // Especially for the case where the other one does not have a date. For example a departure with no date, if it comes before
        // the birth then the birth could take its refs in consolidateRefs
        if (aIsBirth && !b.factDate.isValid) {
          return -1; // the birth (a) should come first
        }
        if (bIsBirth && !a.factDate.isValid) {
          return 1; // the birth (b) should come first
        }
      }
    }

    // If one of the Facts is a death and the other is a burial and they have the same year we want the death to come first.
    if (a.factDate.year == b.factDate.year) {
      // If either of the facts have no specified day (or if they specify the exact same date)
      if (a.factDate.day == 0 || b.factDate.day == 0 || (a.factDate.day == b.factDate.day && a.factDate.month == b.factDate.month)) {
        if (a.factType == FactType.death) {
          if (b.factType == FactType.burial || b.factType == FactType.will || b.factType == FactType.probate) {
            return -1;  // death comes before burial, will or probate
          }
          // anything else comes before death
          return 1;
        }
        else if (b.factType == FactType.death) {
          if (a.factType == FactType.burial || a.factType == FactType.will || a.factType == FactType.probate) {
            return 1;  // death comes before burial, will or probate
          }
          // anything else comes before death
          return -1;
        }
      }
    }

    const dateCompare = FactDate.compareDates(a.factDate, b.factDate);
    if (dateCompare < 0) {
      return -1;
    }
    else if (dateCompare > 0) {
      return 1;
    }
    else if (a.location < b.location) {
      return -1;
    }
    else if (a.location > b.location) {
      return 1;
    }
    else if (a.description < b.description) {
      return -1;
    }
    else if (a.description > b.description) {
      return 1;
    }
    else if (a.refs < b.refs) {
      return -1;
    }
    else if (a.refs > b.refs) {
      return 1;
    }

    // identical so far, compare extra data (if any)
    if (a.extraData != undefined || b.extraData != undefined) {
      if (b.extraData == undefined)  {
        return 1;
      }
      if (a.extraData == undefined)  {
        return -1;
      }
      if (a.extraData.length > a.extraData.length) {
        return 1;
      }
      if (a.extraData.length < a.extraData.length) {
        return -1;
      }
      // there are the same length
      for (let i=0; i < a.extraData.length; ++i) {
        let aData = a.extraData[i];
        let bData = b.extraData[i];
        if (aData > bData) {
          return 1;
        }
        if (aData < bData) {
          return -1;
        }
      }
    }

    return 0;
  }

  parseFacts(factsText) {
    //console.log("factsText is:");
    //console.log(factsText);

    // The facts are tricky to parse.
    // Not all facts have references/sources with a <ref>
    // All of the facts are in sections with bold titles like '''Name:'''
    // Some of the sections contain multiple facts.

    // The first thing to do is to separate into fact sections.
    // We make the assumption that '''<word with optional : on end>''' is not going to occur elsewhere in the facts.
    // We will create a map of factSections.
    const sectionSeparator = /'''([\w \,\.\-\(\)\:]+)'''/
    const factSectionTextArray = factsText.split(sectionSeparator);

    //console.log("split factsText is:");
    //console.log(factSectionTextArray);

    var foundKnownTitle = false;

    // the first entry factSectionTextArray is always "" since the separator is always at the start
    this.factSectionMap = new Map;
    this.factSectionArray = [];
    var i;
    for (i = 1; i < factSectionTextArray.length; i = i + 2) {
      var sectionName = factSectionTextArray[i];
      var sectionText = factSectionTextArray[i + 1].trim();

      // get the factType for this section
      var factType = FactType.unknown;
      for (var entry of sectionNamesFormat2020) {
        if (entry.name == sectionName) {
          factType = entry.id;
        }
      }

      // handle the case where the first name is used as a section title (2018 sub-format)
      if (!foundKnownTitle) {
        if (factType == FactType.unknown) {
          sectionText = sectionName + " " + sectionText;
          sectionName = "Name:";
          factType = FactType.name;
        }
        else {
          foundKnownTitle = true;
        }
      }

      var section = new FactSection(sectionName, sectionText);
      section.factType = factType;
  
      //console.log("Added FactSection with sectionName '" + sectionName + "'");  

      section.parseSectionFacts(this, factType);

      if (section.factType == FactType.unknown) {
        this.factSectionArray.push(section);
      }
      else {
        var existingSection = this.factSectionMap.get(section.factType);
        if (existingSection != undefined) {
          //console.log("Found a duplicate section named '" + sectionName + "', appending facts to it");
          existingSection.facts = existingSection.facts.concat(section.facts);
          existingSection.text = existingSection.text.concat(section.text);   // just store this for debugging
        }
        else {
          this.factSectionMap.set(section.factType, section);
          this.factSectionArray.push(section);
        }
      }

      // append the section facts to the list of all facts for the bio
      this.facts = this.facts.concat(section.facts);
    }
    //         console.log("factSectionMap:");
    //         console.log(this.factSectionMap);

    this.facts.sort(Biography.compareFacts);
  }

  createSourceMap(sourcesText) {
    //const sourceSeparator = "* Source: <span id='";
//    const sourceSeparator = /^ *\* */m;
    const sourceSeparator = "\n";
    const sourceTextArray = sourcesText.split(sourceSeparator);
    //console.log("sourceTextArray has " + sourceTextArray.length + " elements:");
    //console.log(sourceTextArray);
    // the first element will sometimes be blank
    if (sourceTextArray[0] == "") {
      sourceTextArray.shift(); // remove the empty string from the front
    }

    // check for the 2021 format without spanId
    if (this.format != BioFormat.format2011) {
      const spanPrefix = "Source: <span id='";
      const spanPrefixStartIndex = sourcesText.indexOf(spanPrefix);

      if (spanPrefixStartIndex == -1) {
        this.useSpanId = false;
      }
    }

    // we now have an array of source strings, we want to create Source objects and store them in a map
    this.sourcesMap = new Map;
    this.otherSourceLines = [];

    for (const sourceString of sourceTextArray) {
      var cleanString = sourceString.trim();

      if (cleanString.length < 3) {
        continue;
      }

      if (cleanString.search(/^\*?\s*Repository\s*:/) != -1) {
        continue;
      }

      var text = "";
      var id = "";
      if (cleanString != "") {
        let sourcePrefixFound = false;
        if (this.useSpanId) {
          let sourcePrefix = "* Source: <span id='";
          let prefixStartIndex = cleanString.indexOf(sourcePrefix);
          // in Belding-505 there is no space after the * (possibly edited), support that anyway
          if (prefixStartIndex == -1) {
            sourcePrefix = "*Source: <span id='";
            prefixStartIndex = cleanString.indexOf(sourcePrefix);
          }
          if (prefixStartIndex != -1) {
            sourcePrefixFound = true;
            const idStartIndex = prefixStartIndex + sourcePrefix.length;
            const closeQuoteIndex = cleanString.indexOf("'", idStartIndex);
            id = cleanString.substring(idStartIndex, closeQuoteIndex);
            const spanTerminator = "</span> ";
            const spanTerminatorIndex = cleanString.indexOf(spanTerminator, closeQuoteIndex);
            const textStartIndex = spanTerminatorIndex + spanTerminator.length;
            text = cleanString.substr(textStartIndex);
          }
        }
        else {
          const sourcePrefix = "* Source: ";
          const prefixStartIndex = cleanString.indexOf(sourcePrefix);
          if (prefixStartIndex != -1) {
            sourcePrefixFound = true;
            const idStartIndex = prefixStartIndex + sourcePrefix.length;
            const endingSpaceIndex = cleanString.indexOf(" ", idStartIndex);
            id = cleanString.substring(idStartIndex, endingSpaceIndex);
            text = cleanString.substr(endingSpaceIndex+1);
          }
        }

        if (!sourcePrefixFound) { 
          // this is not a source created by gedcom - it could be a source from an existing profile
          text = cleanString;

          if (text[0] == ":") {
            continue;
          }

          // There could already be a "See also:" line
          if (text.toLowerCase().trim() == "see also:") {
            continue;
          }

          // we don't want duplicate *'s at start of line
          text = text.replace(/^\*\s*\*/, "*");

          // we want a space after the * at beginning of line
          text = text.replace(/^\*([^ ])/, "* $1");

          // if there is no * at the beginning then add one
          if (text[0] != "*") {
            text = "* " + text;
          }

        }

        // remove any trailing newline characters from text
        while (text[text.length-1] == "\n") {
          text = text.substr(0, text.length-1);
        }

        if (text.length < 4) {
          continue; // ignore any stray characters on a line 
        }

        // do the same fixes that we do for citation text for Ancestry links and APIDs etc
        text = cleanupSourceText(text);

        if (id != "") {
          this.sourcesMap.set(id, new Source(id, text));
        }
        else {
          this.otherSourceLines.push(text);
        }
      }
    }

    return true;
  }

  createSourceMapFormat2011(sourcesText) {
    // break the text into an array of lines
    var lineArray = sourcesText.split("\n");

    // Various different 2011 formats format source differently
    // see whether more of the lines start with * or :
    var numStarLines = 0;
    var numColonLines = 0;
    var hasHeading = false;
    for (var line of lineArray) {
      if (line.length > 0) {
        if (line[0] == "*") {
          numStarLines++;
        }
        else if (line[0] == ":") {
          numColonLines++;
        }
        else if (line.includes("Page:") || line.includes("Text:")) {
          numColonLines++;
        }
        else if (line.startsWith("===")) {
          hasHeading = true;
        }
      }
    }

    if (!hasHeading && numColonLines == 0) {
      // we should be able to parse this the same way as 2020 format
      return this.createSourceMap(sourcesText);
    }

    this.sourcesMap = new Map;
    this.otherSourceLines = [];

    // Sometimes there is a Source section with no lines like:
    //   : Source <span id='S3298722087'>S3298722087</span>
    // We have a special section for handling them. It may be overkill since
    // it was written when I was combining the === Source === sections with the
    // === Sources === section.

    let spanIdIndex = sourcesText.indexOf("span id");
    if (spanIdIndex != -1) {
      var lastSourceCreated;
      for (var line of lineArray) {
        var cleanString = line.trim();
        if (cleanString == "") {
          continue;
        }

        if (cleanString.search(/^\*?\s*Repository\s*:/) != -1) {
          continue;
        }

        var text = "";
        var id = "";

        var sourcePrefix = "Source: <span id='";
        var prefixStartIndex = cleanString.search(sourcePrefix);
        if (prefixStartIndex == -1) {
          // try an alternative sometimes used in 2011 format
          sourcePrefix = "Source <span id='";
          prefixStartIndex = cleanString.search(sourcePrefix);
        }

        if (prefixStartIndex != -1) {
          const idStartIndex = prefixStartIndex + sourcePrefix.length;
          const closeQuoteIndex = cleanString.indexOf("'", idStartIndex);
          id = cleanString.substring(idStartIndex, closeQuoteIndex);
          const spanTerminator = "</span>";
          const spanTerminatorIndex = cleanString.search(spanTerminator);
          const textStartIndex = spanTerminatorIndex + spanTerminator.length;
          text = cleanString.substr(textStartIndex).trim();
        }
        else if (cleanString[0] == ":" && lastSourceCreated != undefined) {
          // in 2011 format sometimes there are lines starting with : that are continuations of the previous source
          text = cleanString;
          while (text[0] == ":") {
            text = text.substr(1);
          }
          while (text[text.length-1] == "\n") {
            text = text.substr(0, text.length-1);
          }
          text = cleanupSourceText(text);
          if (text.length > 0) {
            if (lastSourceCreated.text.length > 0) {
              lastSourceCreated.text += ". ";
            }
            lastSourceCreated.text += text.trim();
          }
          continue;
        }
        else { 
          // this is not a source created by gedcom - it could be a source from an existing profile
          // We will add it to otherSourceLines
          text = cleanString;

          // It could be a line with a span id in it but not starting as expected.
          // In this case it is best to abort since we could be losing data.
          // See Harrison-3584 for an example
          const spanText = "<span id='";
          let spanIndex = cleanString.search(spanText);
          if (spanIndex != -1) {
            this.errorMessage = "Unrecognized line in sources:\n";
            this.errorMessage += cleanString;
            this.errorMessage += "\nThis profile looks like it may have been edited.";
            this.errorMessage += " If you want to proceed anyway try removing those lines first.";
            return false;
          }

          if (text[0] == ":") {
            // We used to ignore lines starting with : if not following a proper source
            // Hovever this could lose data (see Denman-1). So we now keep then and (further below)
            // We avoid adding a * in front
            //continue;
          }

          if (text.includes("=== Notes ===")) {
            continue;
          }

          // we don't want duplicate *'s at start of line
          text = text.replace(/^\*\s*\*/, "*");

          // we want a space after the * at beginning of line
          text = text.replace(/^\*([^ ])/, "* $1");

          // if there is no * at the beginning then add one
          if (text[0] != "*" && text[0] != ":") {
            text = "* " + text;
          }

          // remove any trailing \n
          while (text[text.length-1] == "\n") {
            text = text.substr(0, text.length-1);
          }
          text = text.trim();
        }

        // remove any trailing newline characters from text
        while (text[text.length-1] == "\n") {
          text = text.substr(0, text.length-1);
        }

        if (text.length < 4 && id == "") {
          continue; // ignore any stray characters on a line 
        }

        text = cleanupSourceText(text);

        //console.log("source: id = '" + id + "', text = '" + text + "'");
        lastSourceCreated = new Source(id, text);
        if (id != "") {
          this.sourcesMap.set(id, lastSourceCreated);
        }
        else {
          this.otherSourceLines.push(text);
          lastSourceCreated = undefined;
        }
      } 
    }
    else {
      // this may be a very old 2010 or 2011 format with no span IDs
      // These sources are often in a === Source === header.
      var lastSourceCreated;
      for (var line of lineArray) {
        var cleanString = line.trim();
        if (cleanString == "") {
          continue;
        }

        var text = "";
        var id = "";

        var sourcePrefix = "Source: [[";
        var prefixStartIndex = cleanString.indexOf(sourcePrefix);

        if (prefixStartIndex != -1) {
          const idStartIndex = prefixStartIndex + sourcePrefix.length;
          const closeQuoteIndex = cleanString.indexOf("]]", idStartIndex);
          id = cleanString.substring(idStartIndex, closeQuoteIndex);
          const textStartIndex = closeQuoteIndex + 2;
          text = cleanString.substr(textStartIndex).trim();
        }
        else if (cleanString[0] == ":" && lastSourceCreated != undefined) {
          // in 2011 format sometimes there are lines starting with : that are continuations of the previous source
          text = cleanString;
          while (text[0] == ":") {
            text = text.substr(1);
          }
          while (text[text.length-1] == "\n") {
            text = text.substr(0, text.length-1);
          }
          // remove standard line prefixes
          text = text.replace(/^\s*Page\:\s*/, "");
          text = text.replace(/^\s*Note\:\s*/, "");
          text = text.replace(/^\s*Data\:\s*/, "");
          text = text.replace(/^\s*Text\:\s*/, "");

          text = cleanupSourceText(text);
          if (text.length > 0) {
            if (lastSourceCreated.text.length > 0) {
              lastSourceCreated.text += ". ";
            }
            lastSourceCreated.text += text.trim();
          }
          continue;
        }
        else { 
          // this is not a source created by gedcom - it could be a source from an existing profile
          // We will add it to otherSourceLines
          text = cleanString;

          // It could be a line with a span id in it but not starting as expected.
          // In this case it is best to abort since we could be losing data.
          // See Harrison-3584 for an example
          const spanText = "<span id='";
          let spanIndex = cleanString.search(spanText);
          if (spanIndex != -1) {
            this.errorMessage = "Unrecognized line in sources:\n";
            this.errorMessage += cleanString;
            this.errorMessage += "\nThis profile looks like it may have been edited.";
            this.errorMessage += " If you want to proceed anyway try removing those lines first.";
            return false;
          }

          if (text[0] == ":") {
            continue;
          }

          if (text.includes("=== Notes ===")) {
            continue;
          }

          // See unknown-138116 for example
          text = text.replace(/Page\:\s*Ancestry Family Trees Data\:\s*Text\:\s*/, "Ancestry Family Trees "); 

          // we don't want duplicate *'s at start of line
          text = text.replace(/^\*\s*\*/, "*");

          // we want a space after the * at beginning of line
          text = text.replace(/^\*([^ ])/, "* $1");

          // if there is no * at the beginning then add one
          if (text[0] != "*") {
            text = "* " + text;
          }

          // remove any trailing \n
          while (text[text.length-1] == "\n") {
            text = text.substr(0, text.length-1);
          }
          text = text.trim();
        }

        // remove any trailing newline characters from text
        while (text[text.length-1] == "\n") {
          text = text.substr(0, text.length-1);
        }

        if (text.length < 4 && id == "") {
          continue; // ignore any stray characters on a line 
        }

        text = cleanupSourceText(text);

        //console.log("source: id = '" + id + "', text = '" + text + "'");
        lastSourceCreated = new Source(id, text);
        if (id != "") {
          this.sourcesMap.set(id, lastSourceCreated);
        }
        else {
          this.otherSourceLines.push(text);
          lastSourceCreated = undefined;
        }
      } 
    }

    return true;
  }

  handlePersonFirstNameAsSectionTitle(bioStartIndex) {
    const firstTitleIndex = this.origText.indexOf("'''", bioStartIndex);

    if (firstTitleIndex == -1) return -1;

    const titleEndIndex = this.origText.indexOf("'''", firstTitleIndex+3);
    const title = this.origText.substring(firstTitleIndex+3, titleEndIndex);

    if (title == "Born" || title == "Died") {
      return -1;
    }

    // if we get this far we probably do have a title which is a first name
    if (title == this.prefName) {
      return firstTitleIndex;
    }

    return -1;
  }

  checkForExternalFilesSection(text) {

    const externalFilesStartIndex = text.search(/===\s+External Files\s+===\s*\n/i);
    if (externalFilesStartIndex == -1) {
      return text;
    }
    var endHeadingIndex = text.indexOf("\n", externalFilesStartIndex);
    if (endHeadingIndex == -1) {
      return text;
    }

    const headerString = /==+\s*[^=]+\s*=+\s*\n/;
    var endSectionIndex = regexIndexOf(text, headerString, endHeadingIndex);
    if (endSectionIndex == -1) {
      endSectionIndex = text.length;
    }

    // this section consists of line of the form:
    // * File <span id='M2520'>M2520</span> File: 1851 England Census(44).jpg Format: jpg.  1851 England Census.  1851 Class: HO107; Piece: 2380; Folio: 105; Page: 28; GSU roll: 87670-87671. 
    // The source information is a duplication of the sources an the files are numbers that do not resolve to anything
    // So all we can do is to ignore it.

    const newText = text.substring(0, externalFilesStartIndex) + text.substring(endSectionIndex, text.length)

    return newText;
  }

  flattenNoteReferences(text)
  {
    const spanRegEx = /\<span id\=['"]N\d+['"]\>/;
    var firstSpanIndex = text.search(spanRegEx);
  
    if (firstSpanIndex == -1) {
      return text;
    }
  
    var newText = text;
  
    var notesMap = new Map;
  
    // Example note definition line
    // Note <span id='N0068'>N0068<span> SE/ULA10382. 
  
    while (firstSpanIndex != -1) {
      var lineStartIndex = newText.lastIndexOf("\n", firstSpanIndex);
      if (lineStartIndex == -1) {
        lineStartIndex = 0;
      }
  
      var lineEndIndex = newText.indexOf("\n", firstSpanIndex);
      if (lineEndIndex == -1) {
        lineEndIndex = newText.length;
      }
  
      var nextCorrectSpanEnding = newText.indexOf("</span>", firstSpanIndex);
      var nextBrokenSpanEnding = newText.indexOf("<span>", firstSpanIndex);
      var nextSpanEnding = nextCorrectSpanEnding;
      if (nextSpanEnding != -1) {
        if (nextBrokenSpanEnding != -1 && nextBrokenSpanEnding < nextSpanEnding) {
          nextSpanEnding = nextBrokenSpanEnding;
        }
      }
      else {
        nextSpanEnding = nextBrokenSpanEnding;
      }
      if (nextSpanEnding > lineEndIndex) {
        // we don't currently allow a newline in the span definition
        return text;
      }
  
      var spanIdStartIndex = newText.indexOf(">", firstSpanIndex);
      if (spanIdStartIndex == -1 || spanIdStartIndex > nextSpanEnding-1) {
        // Should never happen
        return text;
      }
  
      var spanId = newText.substring(spanIdStartIndex+1, nextSpanEnding);
  
      var spanContentStartIndex = newText.indexOf(">", spanIdStartIndex+1);
      if (spanContentStartIndex == -1 || spanContentStartIndex > lineEndIndex-1) {
        // Should never happen
        return text;
      }
  
      var spanContent = newText.substring(spanContentStartIndex+1, lineEndIndex);
  
      var spanContent = newText.substring(spanContentStartIndex+1, lineEndIndex);

      // the content could continue on next lines
      while (lineEndIndex < newText.length && newText[lineEndIndex+1] == ":") {
        var nextLineEndIndex = newText.indexOf("\n", lineEndIndex+1);
        if (nextLineEndIndex == -1) {
          nextLineEndIndex = newText.length;
        }

        var extraSpanContent = newText.substring(lineEndIndex+2, nextLineEndIndex).trim();
        if (extraSpanContent.trim()) {
          if (spanContent) {
            spanContent += "<br/>";
          }
          spanContent += extraSpanContent;
        }
        lineEndIndex = nextLineEndIndex;
      }
  
      notesMap.set(spanId, { text: spanContent, used: false });
      newText = newText.substring(0, lineStartIndex) + newText.substring(lineEndIndex, newText.length);
  
      firstSpanIndex = newText.search(spanRegEx);
    }
  
    // we have now recorded and removed all note definitions
    // now replace all the note references
  
    // Assume that all note references look like this:
    // Note: [[#N0501]]
  
    const noteDefRegEx = /\[\[\#N\d+\]\]/;
    var defIndex = newText.search(noteDefRegEx);
  
    while (defIndex != -1) {
      var idStartIndex = defIndex+3;
      var idEndIndex = newText.indexOf("]", idStartIndex);
      if (idEndIndex == -1) {
        return text; // can never happen
      }
  
      var id = newText.substring(idStartIndex, idEndIndex);
  
      var textToReplaceStartIndex = defIndex;
      var textToReplaceEndIndex = idEndIndex+2;
  
      var noteStartIndex = newText.lastIndexOf("Note:", defIndex);
      if (noteStartIndex != -1 && defIndex - noteStartIndex < 8) {
        textToReplaceStartIndex = noteStartIndex;
      }
  
      var content = "";
      if (notesMap.has(id)) {
        let note = notesMap.get(id);
        content = note.text;
        note.used = true;
      }
      else {
        const textBeingRemoved = newText.substring(textToReplaceStartIndex, textToReplaceEndIndex);
        this.addAlertMessage("No note found for id " + id + ". This text was just removed '" + textBeingRemoved + "'.");
      }
  
      newText = newText.substring(0, textToReplaceStartIndex) + content + newText.substring(textToReplaceEndIndex, newText.length);
  
      defIndex = newText.search(noteDefRegEx);
    }

    for (let [id, note] of notesMap) {
      if (!note.used) {
        this.addAlertMessage("No note uses id " + id + ". This text was just removed '" + note.text + "'.");
      }
    }
  
    return newText;
  }
    
  flattenNoteReferencesFormat2011_N(text)
  {
    const spanRegEx = /\<span id\=['"]NI?\d+['"]\>/;
    var firstSpanIndex = text.search(spanRegEx);
  
    if (firstSpanIndex == -1) {
      return text;
    }
  
    var newText = text;
  
    var notesMap = new Map;
  
    // Example note definition lines
    // : Note <span id='N9'>N9</span>
    // : He was a baker in Meppel
      
    while (firstSpanIndex != -1) {
      var lineStartIndex = newText.lastIndexOf("\n", firstSpanIndex);
      if (lineStartIndex == -1) {
        lineStartIndex = 0;
      }
  
      var lineEndIndex = newText.indexOf("\n", firstSpanIndex);
      if (lineEndIndex == -1) {
        lineEndIndex = newText.length;
      }
  
      var nextCorrectSpanEnding = newText.indexOf("</span>", firstSpanIndex);
      var nextBrokenSpanEnding = newText.indexOf("<span>", firstSpanIndex);
      var nextSpanEnding = nextCorrectSpanEnding;
      if (nextSpanEnding != -1) {
        if (nextBrokenSpanEnding != -1 && nextBrokenSpanEnding < nextSpanEnding) {
          nextSpanEnding = nextBrokenSpanEnding;
        }
      }
      else {
        nextSpanEnding = nextBrokenSpanEnding;
      }
      if (nextSpanEnding > lineEndIndex) {
        // we don't currently allow a newline in the span definition
        return text;
      }
  
      var spanIdStartIndex = newText.indexOf(">", firstSpanIndex);
      if (spanIdStartIndex == -1 || spanIdStartIndex > nextSpanEnding-1) {
        // Should never happen
        return text;
      }
  
      var spanId = newText.substring(spanIdStartIndex+1, nextSpanEnding);
  
      var spanContentStartIndex = newText.indexOf(">", spanIdStartIndex+1);
      if (spanContentStartIndex == -1 || spanContentStartIndex > lineEndIndex-1) {
        // Should never happen
        return text;
      }
  
      var spanContent = newText.substring(spanContentStartIndex+1, lineEndIndex);

      // the content could continue on next lines with : characters at the start
      // However, there can sometimes be : characters at the start of the next note
      while (lineEndIndex < newText.length && newText[lineEndIndex+1] == ":") {
        var nextLineEndIndex = newText.indexOf("\n", lineEndIndex+1);
        if (nextLineEndIndex == -1) {
          nextLineEndIndex = newText.length;
        }

        var extraSpanContent = newText.substring(lineEndIndex+2, nextLineEndIndex).trim();

        // check for this line being a new note
        var colonSpanIndex = extraSpanContent.search(spanRegEx);
        if (colonSpanIndex != -1) {
          break;
        }

        if (extraSpanContent.trim()) {
          if (spanContent) {
            spanContent += "<br/>";
          }
          spanContent += extraSpanContent;
        }
        lineEndIndex = nextLineEndIndex;
      }
  
      notesMap.set(spanId, { text: spanContent, used: false });
      newText = newText.substring(0, lineStartIndex) + newText.substring(lineEndIndex, newText.length);
  
      firstSpanIndex = newText.search(spanRegEx);
    }
  
    // we have now recorded and removed all note definitions
    // now replace all the note references
  
    // Assume that all note references look like this:
    // Note: [[#N0501]]
  
    const noteDefRegEx = /\[\[\#NI?\d+\]\]/;
    var defIndex = newText.search(noteDefRegEx);
    var defIndex2 = newText.search(noteDefRegEx);
  
    while (defIndex != -1) {
      var idStartIndex = defIndex+3;
      var idEndIndex = newText.indexOf("]", idStartIndex);
      if (idEndIndex == -1) {
        return text; // can never happen
      }
  
      var id = newText.substring(idStartIndex, idEndIndex);
  
      var textToReplaceStartIndex = defIndex;
      var textToReplaceEndIndex = idEndIndex+2;
  
      var noteStartIndex = newText.lastIndexOf(": Note:", defIndex);
      if (noteStartIndex != -1 && defIndex - noteStartIndex < 10) {
        textToReplaceStartIndex = noteStartIndex;
      }
  
      var content = "";
      if (notesMap.has(id)) {
        let note = notesMap.get(id);
        content = note.text;
        note.used = true;
      }
      else {
        const textBeingRemoved = newText.substring(textToReplaceStartIndex, textToReplaceEndIndex);
        this.addAlertMessage("No note found for id " + id + ". This text was just removed '" + textBeingRemoved + "'.");
      }
  
      newText = newText.substring(0, textToReplaceStartIndex) + content + newText.substring(textToReplaceEndIndex, newText.length);
  
      defIndex = newText.search(noteDefRegEx);
    }

    const noteDefRegEx2 = /\@NI?\d+\@/;
    var defIndex = newText.search(noteDefRegEx2);
    while (defIndex != -1) {
      var idStartIndex = newText.indexOf("@", defIndex);
      idStartIndex += 1;
      var idEndIndex = newText.indexOf("@", idStartIndex);
      if (idEndIndex == -1) {
        return text; // can never happen
      }
  
      var id = newText.substring(idStartIndex, idEndIndex);
  
      var textToReplaceStartIndex = defIndex;
      var textToReplaceEndIndex = idEndIndex+1;
  
      var noteStartIndex = newText.lastIndexOf(": Note:", defIndex);
      if (noteStartIndex != -1 && defIndex - noteStartIndex < 10) {
        textToReplaceStartIndex = noteStartIndex;
      }
  
      var content = "";
      if (notesMap.has(id)) {
        let note = notesMap.get(id);
        content = note.text;
        note.used = true;
      }
      else {
        const textBeingRemoved = newText.substring(textToReplaceStartIndex, textToReplaceEndIndex);
        this.addAlertMessage("No note found for id " + id + ". This text was just removed '" + textBeingRemoved + "'.");
      }
  
      newText = newText.substring(0, textToReplaceStartIndex) + content + newText.substring(textToReplaceEndIndex, newText.length);
  
      defIndex = newText.search(noteDefRegEx2);
    }
  
    for (let [id, note] of notesMap) {
      if (!note.used) {
        this.addAlertMessage("No note uses id " + id + ". This text was just removed '" + note.text + "'.");
      }
    }
  
    return newText;
  }
    
  flattenNoteReferencesFormat2011_HI(text)
  {
    const spanRegEx = /\<span id\=['"]HI\d+['"]\>/;
    var firstSpanIndex = text.search(spanRegEx);
  
    if (firstSpanIndex == -1) {
      return text;
    }
  
    var newText = text;
  
    var notesMap = new Map;
  
    // Example note definition line
    // <span id='HI1085'>HI1085</span>(Research):Name: Andrew Smart Morrison
  
    while (firstSpanIndex != -1) {
      var lineStartIndex = newText.lastIndexOf("\n", firstSpanIndex);
      if (lineStartIndex == -1) {
        lineStartIndex = 0;
      }
  
      var lineEndIndex = newText.indexOf("\n", firstSpanIndex);
      if (lineEndIndex == -1) {
        lineEndIndex = newText.length;
      }
  
      var nextCorrectSpanEnding = newText.indexOf("</span>", firstSpanIndex);
      var nextBrokenSpanEnding = newText.indexOf("<span>", firstSpanIndex);
      var nextSpanEnding = nextCorrectSpanEnding;
      if (nextSpanEnding != -1) {
        if (nextBrokenSpanEnding != -1 && nextBrokenSpanEnding < nextSpanEnding) {
          nextSpanEnding = nextBrokenSpanEnding;
        }
      }
      else {
        nextSpanEnding = nextBrokenSpanEnding;
      }
      if (nextSpanEnding > lineEndIndex) {
        // we don't currently allow a newline in the span definition
        return text;
      }
  
      var spanIdStartIndex = newText.indexOf(">", firstSpanIndex);
      if (spanIdStartIndex == -1 || spanIdStartIndex > nextSpanEnding-1) {
        // Should never happen
        return text;
      }
  
      var spanId = newText.substring(spanIdStartIndex+1, nextSpanEnding);
  
      var spanContentStartIndex = newText.indexOf(">", spanIdStartIndex+1);
      if (spanContentStartIndex == -1 || spanContentStartIndex > lineEndIndex-1) {
        // Should never happen
        return text;
      }
  
      var spanContent = newText.substring(spanContentStartIndex+1, lineEndIndex);

      // the content could continue on next lines
      while (lineEndIndex < newText.length && newText[lineEndIndex+1] == ":") {
        var nextLineEndIndex = newText.indexOf("\n", lineEndIndex+1);
        if (nextLineEndIndex == -1) {
          nextLineEndIndex = newText.length;
        }

        var extraSpanContent = newText.substring(lineEndIndex+2, nextLineEndIndex).trim();
        if (extraSpanContent.trim()) {
          if (spanContent) {
            spanContent += "<br/>";
          }
          spanContent += extraSpanContent;
        }
        lineEndIndex = nextLineEndIndex;
      }
  
      notesMap.set(spanId, { text: spanContent, used: false });
      newText = newText.substring(0, lineStartIndex) + newText.substring(lineEndIndex, newText.length);
  
      firstSpanIndex = newText.search(spanRegEx);
    }
  
    // we have now recorded and removed all note definitions
    // now replace all the note references
  
    // Assume that all note references look like this:
    // :   @HI1085@
  
    const noteDefRegEx = /\@HI\d+\@/;
    var defIndex = newText.search(noteDefRegEx);
  
    while (defIndex != -1) {
      var idStartIndex = defIndex+1;
      var idEndIndex = newText.indexOf("@", idStartIndex);
      if (idEndIndex == -1) {
        return text; // can never happen
      }
  
      var id = newText.substring(idStartIndex, idEndIndex);
  
      var textToReplaceStartIndex = defIndex;
      var textToReplaceEndIndex = idEndIndex+2;
  
      var noteStartIndex = newText.lastIndexOf(":", defIndex);
      if (noteStartIndex != -1 && defIndex - noteStartIndex < 8) {
        textToReplaceStartIndex = noteStartIndex;
      }
  
      var content = "";
      if (notesMap.has(id)) {
        let note = notesMap.get(id);
        content = note.text;
        note.used = true;
      }
      else {
        const textBeingRemoved = newText.substring(textToReplaceStartIndex, textToReplaceEndIndex);
        this.addAlertMessage("No note found for id " + id + ". This text was just removed '" + textBeingRemoved + "'.");
      }
  
      newText = newText.substring(0, textToReplaceStartIndex) + content + newText.substring(textToReplaceEndIndex, newText.length);
  
      defIndex = newText.search(noteDefRegEx);
    }
  
    for (let [id, note] of notesMap) {
      if (!note.used) {
        this.addAlertMessage("No note uses id " + id + ". This text was just removed '" + note.text + "'.");
      }
    }
  
    return newText;
  }
    
  flattenNoteReferencesFormat2011(text)
  {
    var newText = this.flattenNoteReferencesFormat2011_HI(text);
    newText = this.flattenNoteReferencesFormat2011_N(newText);
    return newText;
  }

  parseBio() {
    // find the biography header
    var bioHeader = /==\s*Biography\s*==\s*\n/;
    var bioHeaderIndex = this.origText.search(bioHeader);
    if (bioHeaderIndex == -1) {
       bioHeader = /===\s*Biography\s*===\s*\n/;
       bioHeaderIndex = this.origText.search(bioHeader);

      if (bioHeaderIndex == -1) {
        this.errorMessage = "No biography line found.";
        return false;
      }
    }
    //console.log("Pos of biography header is " + bioHeaderIndex);

    const indexOfNewLineAfterBio = this.origText.indexOf("\n", bioHeaderIndex);
    if (indexOfNewLineAfterBio == -1) {
      this.errorMessage = "Nothing found after Biography line.";
      return false;
    }
    var startOfWholeBio = indexOfNewLineAfterBio + 1;

    const topLeveHeaderString = /==\s*[^=]+\s*==\s*\n/;
    const subHeaderString = /===\s*[^=]+\s*===\s*\n/;
    const titleString = /^\s*'''[^'\n]+'''/m;

    const firstTopLevelHeaderAfterBioStartIndex = regexIndexOf(this.origText, topLeveHeaderString, startOfWholeBio);
    const firstSubHeaderAfterBioStartIndex = regexIndexOf(this.origText, subHeaderString, startOfWholeBio);
    const firstTitleAfterBioStartIndex = regexIndexOf(this.origText, titleString, startOfWholeBio);

    if (firstTitleAfterBioStartIndex == -1) {
      this.errorMessage = "No fact section titles found in Biography.";
      return false; // no fact section titles 
    }

    if (firstTopLevelHeaderAfterBioStartIndex != -1 && firstTopLevelHeaderAfterBioStartIndex < firstTitleAfterBioStartIndex) {
      this.errorMessage = "No fact section titles before next top level heading.";
      return false; // no fact section titles before next top level heading 
    }
    if (firstSubHeaderAfterBioStartIndex != -1 && firstSubHeaderAfterBioStartIndex < firstTitleAfterBioStartIndex) {
      this.errorMessage = "No fact section titles before next sub heading.";
      return false; // no fact section titles before next sub heading 
    }
    
    var startIndexOfGedcomBio = firstTitleAfterBioStartIndex;

    // because titleString starts with ^ it matches the newline before the title. We want the start of the title itself.
    if (this.origText[startIndexOfGedcomBio] == "\n") {
      startIndexOfGedcomBio++;
    }

    //console.log("Whole bio starts with: " + this.origText.substr(startOfWholeBio, nameTitle.length));
    if (startIndexOfGedcomBio != startOfWholeBio) {
      var preamble = this.origText.substr(startOfWholeBio, startIndexOfGedcomBio - startOfWholeBio);

      // check that is not all white space
      const firstNonSpaceIndex = preamble.search(/[^\s]/);
      if (firstNonSpaceIndex != -1) {
        //console.log("There is a preamble before name title, startIndexOfGedcomBio=" + startIndexOfGedcomBio + " startOfWholeBio=" + startOfWholeBio);
        this.preamble = preamble;
        //console.log("Preamble:");
        //console.log(this.preamble);
      }
      else {
        this.preamble = "";
      }
    }
    else {
      this.preamble = "";
    }

    // Make a new string that is the whole of the original text AFTER startIndexOfGedcomBio
    var gedcomBioText = this.origText.substr(startIndexOfGedcomBio);

    gedcomBioText = this.flattenNoteReferences(gedcomBioText);

    var sourcesHeader = "== Sources ==\n";
    var sourcesHeaderStartIndex = gedcomBioText.search(sourcesHeader);
    if (sourcesHeaderStartIndex == -1) {
      // In really old gedcoms (e.g. Jenner-10 imported Jan 2011) it appears to have used a subsection for sources
      sourcesHeader = "=== Sources ===\n";
      sourcesHeaderStartIndex = gedcomBioText.search(sourcesHeader);
    }

    var factsEndIndex = gedcomBioText.length;
    if (sourcesHeaderStartIndex != -1) {
      factsEndIndex = sourcesHeaderStartIndex;
    }

    // There will never be research notes in the bio generated by gedcom but we allow for the fact the use could add one before running this
    const researchNotesHeader = /==\s*Research Notes\s*==\s*\n/i;
    const researchNotesHeaderStartIndex = gedcomBioText.search(researchNotesHeader);

    // There could be other sections after the bio but before the researchNotes.
    const nextTopLevelHeader = /==\s+[^=]+\s+==\s*\n/i;
    var nextTopLevelHeaderStartIndex = gedcomBioText.search(nextTopLevelHeader);

    const nextSubHeader = /===\s+[^=]+\s+===\s*\n/i;
    var nextSubHeaderStartIndex = gedcomBioText.search(nextSubHeader);

    var nextHeaderStartIndex = nextTopLevelHeaderStartIndex;
    if (nextSubHeaderStartIndex != -1) {
      if (nextTopLevelHeaderStartIndex == -1 || nextSubHeaderStartIndex < nextTopLevelHeaderStartIndex) {
        nextHeaderStartIndex = nextSubHeaderStartIndex;
      }
    }

    if (researchNotesHeaderStartIndex != -1) {
      if (nextHeaderStartIndex < researchNotesHeaderStartIndex) {
        // there were one or more sections after the bio and before research notes
        this.textAfterBioBeforeResearchNotes = gedcomBioText.substring(nextTopLevelHeaderStartIndex, researchNotesHeaderStartIndex);
        factsEndIndex = nextHeaderStartIndex;
      }
      else {
        factsEndIndex = researchNotesHeaderStartIndex;
      }

      //console.log("Found Research Notes starting at " + researchNotesHeaderStartIndex);

      var newlineIndex = gedcomBioText.indexOf("\n", researchNotesHeaderStartIndex);

      // this will find sources if nothing else before it, only look for top-level since sub-headers are part of research notes.
      nextHeaderStartIndex = regexIndexOf(gedcomBioText, nextTopLevelHeader, newlineIndex);

      this.existingResearchNotes = gedcomBioText.substring(newlineIndex+1, nextHeaderStartIndex);
      //console.log("Existing Research Notes are: '" + this.existingResearchNotes + "'");
    }
    else {
      factsEndIndex = nextHeaderStartIndex;
    }

    const factsText = gedcomBioText.substr(0, factsEndIndex);

    if (nextHeaderStartIndex < sourcesHeaderStartIndex) {
      this.textAfterResearchNotesBeforeSources = gedcomBioText.substring(nextHeaderStartIndex, sourcesHeaderStartIndex);
    }

    this.textAfterBioBeforeResearchNotes = this.checkForExternalFilesSection(this.textAfterBioBeforeResearchNotes);
    this.textAfterResearchNotesBeforeSources = this.checkForExternalFilesSection(this.textAfterResearchNotesBeforeSources);

    var sourcesText = "";
    if (sourcesHeaderStartIndex != -1) {
      const sourcesStartIndex = sourcesHeaderStartIndex + sourcesHeader.length;

      const referencesLine = "<references */>";
      const referencesStartIndex = regexIndexOf(gedcomBioText, referencesLine, sourcesHeaderStartIndex);
      if (referencesStartIndex == -1 || referencesStartIndex < sourcesStartIndex) {
        this.errorMessage = "No references line found after sources line.";
        return false;
      }
      var sourcesEndIndex = referencesStartIndex;
      
      nextTopLevelHeaderStartIndex = regexIndexOf(gedcomBioText, nextTopLevelHeader, sourcesStartIndex);
      nextSubHeaderStartIndex = regexIndexOf(gedcomBioText, nextSubHeader, sourcesStartIndex);
      nextHeaderStartIndex = nextTopLevelHeaderStartIndex;
      if (nextSubHeaderStartIndex != -1) {
        if (nextTopLevelHeaderStartIndex == -1 || nextSubHeaderStartIndex < nextTopLevelHeaderStartIndex) {
          nextHeaderStartIndex = nextSubHeaderStartIndex;
        }
      }
  
      const pleaseEditString = /\<\!\-\- Please edit\, add\, or delete anything in this text\. Thank you\! \-\-\>/g;
      const pleaseEditAndBeBoldString = /\<\!\-\- Please edit\, add\, or delete anything in this text\, including this note\. Be bold and experiment\! If you make a mistake you can always see the previous version of the text on the Changes page\. \-\-\>/g;

      if (nextHeaderStartIndex != -1) {
        if (nextHeaderStartIndex < referencesStartIndex) {
          this.errorMessage = "Sub-header found after Sources heading and before references line.";
          return false;
        }

        // there is another section after the sources (not standard)
        this.textAfterSources = gedcomBioText.substr(nextHeaderStartIndex);
        this.textAfterSources = this.textAfterSources.replace(pleaseEditString, "").trim();
        this.textAfterSources = this.textAfterSources.replace(pleaseEditAndBeBoldString, "").trim();

        // allow for both spellings
        let acknowledgmentsSubSectionStartIndex = regexIndexOf(gedcomBioText, "=== Acknowledgments ===", sourcesStartIndex);
        if (acknowledgmentsSubSectionStartIndex != -1) {
          // It is an error that GEDCOM creates a === header for acknowledgements. It should be a == header.
          this.textAfterSources = this.textAfterSources.replace("=== Acknowledgments ===", "== Acknowledgments ==");
        }
        let acknowledgementsSubSectionStartIndex = regexIndexOf(gedcomBioText, "=== Acknowledgements ===", sourcesStartIndex);
        if (acknowledgementsSubSectionStartIndex != -1) {
          // It is an error that GEDCOM creates a === header for acknowledgements. It should be a == header.
          this.textAfterSources = this.textAfterSources.replace("=== Acknowledgements ===", "== Acknowledgements ==");
        }
      }

      // Sometimes the sources are between the sources header and the "references" line. Sometime they are after the references line.
      sourcesText = gedcomBioText.substring(sourcesStartIndex, sourcesEndIndex);
      const startOfTextAfterReferences = referencesStartIndex + referencesLine.length;
      var endOfTextAfterReferences = nextHeaderStartIndex;
      if (endOfTextAfterReferences == -1) {
        endOfTextAfterReferences = gedcomBioText.length;
      }
      sourcesText += gedcomBioText.substring(startOfTextAfterReferences, endOfTextAfterReferences);

      sourcesText = sourcesText.replace(pleaseEditString, "").trim();
      sourcesText = sourcesText.replace(pleaseEditAndBeBoldString, "").trim();
    }

    if (!this.createSourceMap(sourcesText)) {
      this.errorMessage = "Failed to parse sources section.";
      return false;
    }

    this.parseFacts(factsText);

    //console.log(this.facts);
    return true;
  }

  parseFactsFormat2011(factsText) {
    //console.log("factsText is:");
    //console.log(factsText);

    // The facts are tricky to parse.
    // Not all facts have references/sources with a <ref>
    // All of the facts are in sections with sub header titles like === Name ===
    // Some of the sections contain multiple facts.

    // The first thing to do is to separate into fact sections.
    // We make the assumption that === <word> === is not going to occur elsewhere in the facts.
    // We will create a map of factSections.
    const sectionSeparator = /===\s*([\w \,\.\-]+)\s*===/
    const factSectionTextArray = factsText.split(sectionSeparator);

    //console.log("split factsText is:");
    //console.log(factSectionTextArray);

    // the first entry factSectionTextArray is always "" since the separator is always at the start
    this.factSectionMap = new Map;
    this.factSectionArray = [];

    var i;
    for (i = 1; i < factSectionTextArray.length; i = i + 2) {
      const sectionName = factSectionTextArray[i].trim();
      const sectionText = factSectionTextArray[i + 1].trim();

      var section = new FactSection(sectionName, sectionText);
  
      //console.log("Added FactSection with sectionName '" + sectionName + "'");  

      if (!section.parseSectionFactsFormat2011(this)) {
        return false;
      }

      if (section.factType == FactType.unknown) {
        this.factSectionArray.push(section);
      }
      else {
        var existingSection = this.factSectionMap.get(section.factType);
        if (existingSection != undefined) {
          //console.log("Found a duplicate section named '" + sectionName + "', appending facts to it");
          existingSection.facts = existingSection.facts.concat(section.facts);
          existingSection.text = existingSection.text.concat(section.text);   // just store this for debugging
        }
        else {
          this.factSectionMap.set(section.factType, section);
          this.factSectionArray.push(section);
        }
      }

      // append the section facts to the list of all facts for the bio
      this.facts = this.facts.concat(section.facts);
    }
    //         console.log("factSectionMap:");
    //         console.log(this.factSectionMap);

    this.facts.sort(Biography.compareFacts);

    return true;
  }

  cleanTextThatMayContainGedcomName(text) {


    // There are actually 4 possible bits of data:
    // 1. gedcom name (gcName)
    // 2, date (date)
    // 3. ID of person who imported (userId)
    // 4. wiki-id of the profile it was imported into (profileId)
    // Due to merges these can different not be obvious
    // first step is to replace all mentions of a GEDCOM with
    // %GEDCOM^gcName^date^userId^profileId%

    // These lines should always be removed - they don't contain gedcom name etc.
    text = text.replace(/\s*\*?\s*\'\'This biography is a rough draft\. It was auto-generated by a GEDCOM import and needs to be edited\.\'\'/, "");
    text = text.replace(/\s*\*?\s*\'\'This biography was auto-generated by a GEDCOM import\. It's a rough draft and needs to be edited\.\'\'/, "");
    text = text.replace(/\s*\*?\s*\'\'No more info is currently available\. Can you add to this biography\?\'\'/, "");

    // Sometimes there is more data in this section. The challenge is to delete it without deleting
    // valid data that could have been put between sections like this in a merge.
    // Example:
    //''This biography was auto-generated by a GEDCOM import.
    //<ref>Arseneau-156 was created by [[Sinclair-484 | Rick Sinclair]] through the import of Ronalda-four.ged on Nov 10, 2015.
    // ''This comment and citation can be deleted after the biography has been edited and primary sources are included.''
    //</ref> It's a rough draft and needs to be edited.''
    text = text.replace(/\s*\*?\s*\'\'This biography was auto-generated by a GEDCOM import\.\<ref\>([^\-]+\-\d+) was created by (\[\[[\-\w]+ \| [\w ]+\]\]) through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on *(\w+ *\w+\,? *\d\d\d\d)\. \'\'This comment and citation can be deleted after the biography has been edited and primary sources are included\.\'\'\<\/ref\> It\'s a rough draft and needs to be edited\.\'\'/gi,
      "%GEDCOM^$3^$4^$2^$1%");
    text = text.replace(/\s*\*?\s*This person was created through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on (\w+ \w+\,? \d\d\d\d)\. *The following data was included in the gedcom\. You may wish to edit it for readability\./gi,
      "%GEDCOM^$1^$2^^%");
    // NOTE that the gedcom name below will match something like: DownloadGedcom.aspx.ged
    text = text.replace(/\s*\*?\s*This person was created on (\d+ \w+ \d\d\d\d) through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged)\./gi,
      "%GEDCOM^$2^$1^^%");

    // Sometimes (rarely) there is just the first part of one of those strings
    text = text.replace(/\s*\*?\s*This person was created through the import of *([^\.]+\.(?:[^\.\n]*\.)*ged) on *(\w+ \w+\,? \d\d\d\d)\./gi,
      "%GEDCOM^$1^$2^^%");
    // Neville-1671 was created by [[Bindner-1 | Jessica Bindner]] through the import of condensedgedcom.ged on Jan 11, 2014. 
    text = text.replace(/\s*\*?\s*([^\-\n\.\*\<\>]+\-\d+) was created by (\[\[[^\]]+\]\]) through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on *(\w+ *\w+\,? *\d\d\d\d)\./gi,
      "%GEDCOM^$3^$4^$2^$1%");

    // Text like this is sometimes in the Acknowledgments section:
    // Thank you to [[Moore-13396 | Sherry Clendenon]] for creating WikiTree profile Ratliff-245 through the import
    // of Moore - Johnson-tree-Aug2013-2.ged on Aug 17, 2013. Click to the Changes page for the details of edits by
    // Sherry and others.
    // The part "Click to the Changes page..." will already have been removed.
    // Thank you to [[Burton-2487 | Merilee Burton]] for creating WikiTree profile Stockley-122 through the import of burton[1].ged_2013-12-25.ged on Dec 26, 2013. Click to the Changes page for the details of edits by Merilee and others.
    // Thank you to [[Plowright-6 | John Plowright]] for creating WikiTree profile Gaylard.-11 through the import of
    // PLOWRIGHT-a1.ged on Feb  7, 2013.
    text = text.replace(
      /\s*\*?\s*Thank you to (\[\[[^\]]+\]\]) for creating WikiTree profile ([^\-]+\-\d+) through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on ([^\.]+)\./gi,
      "%GEDCOM^$3^$4^$1^$2%").trim();

    // remove any sources which are just a reference to the gedcom - this is in the change history
    // * WikiTree profile Brockenhuus-1 created through the import of famstieger.GED on Nov 27, 2011
    // by [[Stieger-1 | Paul Stieger]].
    // See the [http://www.wikitree.com/index.php?title=Special:NetworkFeed&who=Brockenhuus-1 Changes page]
    // for the details of edits by Paul and others.
    // * WikiTree profile West-1618 created through the import of Michael John McCook Family Tre.ged on Aug 8, 2011 by [[McCook-17 | Michael McCook]]
    text = text.replace(
      /\s*\*?\s*WikiTree profile ([^\-]+\-\d+) created through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on *(\w+\s+\w+\,? \d\d\d\d) by (\[\[[^\]]+\]\])\.?/gi,
      "%GEDCOM^$2^$3^$4^$1%").trim();
    // WikiTree profile Stockley-122 created through the import of Coley Wolford Stayton McCarroll Bond.ged on Aug 7, 2011 by Tom Coley.
    text = text.replace(
      /\s*\*?\s*WikiTree profile ([^\-]+\-\d+) created through the import of ([^\.]+\.(?:[^\.\n]*\.)*ged) on *(\w+\s+\w+\,? \d\d\d\d) by ([^\.]+)\./gi,
      "%GEDCOM^$2^$3^$4^$1%").trim();
  
    // See the [http://www.wikitree.com/index.php?title=Special:NetworkFeed&who=Biddick-9 Changes page] for the details of edits by Dan and others.
    // or
    // See the Changes page for the details of edits by Tom and others.
    text = text.replace(
      /\s*See the \[[^\]]+\] for the details of edits by [^ ]+ and others\./gi,
      "").trim();
      text = text.replace(
        /\s*See the Changes page for the details of edits by [^ ]+ and others\./gi,
        "").trim();
  
    // now go through all the GEDCOM markers and extract the info

    const markerPrefix = "%GEDCOM^";
    let nextMarkerIndex = text.indexOf(markerPrefix);
    while (nextMarkerIndex != -1) {
      let startGedcomNameIndex = nextMarkerIndex + markerPrefix.length;
      let endGedcomNameIndex = text.indexOf("^", startGedcomNameIndex);
      if (endGedcomNameIndex == -1) {
        nextMarkerIndex = text.indexOf(markerPrefix, startGedcomNameIndex);
        continue;
      }
      let startDateIndex = endGedcomNameIndex+1;
      let endDateIndex = text.indexOf("^", startDateIndex);
      if (endDateIndex == -1) {
        nextMarkerIndex = text.indexOf(markerPrefix, startDateIndex);
        continue;
      }
      let startUserIdIndex = endDateIndex+1;
      let endUserIdIndex = text.indexOf("^", startUserIdIndex);
      if (endUserIdIndex == -1) {
        nextMarkerIndex = text.indexOf(markerPrefix, startUserIdIndex);
        continue;
      }
      let startProfileIdIndex = endUserIdIndex+1;
      let endProfileIdIndex = text.indexOf("%", startProfileIdIndex);
      if (endProfileIdIndex == -1) {
        nextMarkerIndex = text.indexOf(markerPrefix, startProfileIdIndex);
        continue;
      }
      let gedcomName = text.substring(startGedcomNameIndex, endGedcomNameIndex);
      let date = text.substring(startDateIndex, endDateIndex);
      let userId = text.substring(startUserIdIndex, endUserIdIndex);
      let profileId = text.substring(startProfileIdIndex, endProfileIdIndex);

      let nameFound = false;
      for (let nameObj of this.gedcomNames) {
        if (nameObj.name == gedcomName) {
          let userIdMatch = nameObj.userId == userId || !nameObj.userId || !userId;
          let profileIdMatch = nameObj.profileId == profileId || !nameObj.profileId || !profileId;
          if (userIdMatch && profileIdMatch) {
            nameFound = true;

            // possibly add detail
            if (!nameObj.userId && userId) {
              nameObj.userId = userId;
            }
            if (!nameObj.profileId && profileId) {
              nameObj.profileId = profileId;
            }
            break;
          }
        }
      }

      if (!nameFound) {
        let nameObj = { name: gedcomName, date: date, userId: userId, profileId: profileId };
        this.gedcomNames.push(nameObj);
      }

      nextMarkerIndex = text.indexOf(markerPrefix, endProfileIdIndex);
    }

    // remove the GEDCOM markers that we added
    text = text.replace(/\%GEDCOM\^[^\^]+\^[^\%]+\%/g, "");

    return text.trim();
  }

  parseBioFormat2011() {

    // remove any lines that just contain "----". These can be created by merges
    this.origText = this.origText.replace(/\n\-\-\-\-\n/g, "");

    // find the biography header
    // find the biography header
    var bioHeader = /==\s*Biography\s*==\s*\n/;
    var bioHeaderIndex = this.origText.search(bioHeader);
    if (bioHeaderIndex == -1) {
       bioHeader = /===\s*Biography\s*===\s*\n/;
       bioHeaderIndex = this.origText.search(bioHeader);
    }

    var startOfWholeBio = 0;
    if (bioHeaderIndex != -1) {
      const indexOfNewLineAfterBio = this.origText.indexOf("\n", bioHeaderIndex);
      if (indexOfNewLineAfterBio == -1) {
        this.errorMessage = "Nothing found after Biography line.";
        return false;
      }
      startOfWholeBio = indexOfNewLineAfterBio + 1;
    }

    //console.log("Pos of biography header is " + bioHeaderIndex);

    const topLeveHeaderString = /==\s*[^=]+\s*==\s*\n/;
    const subHeaderString = /===\s*[^=]+\s*===\s*\n/;

    const firstTopLevelHeaderAfterBioStartIndex = regexIndexOf(this.origText, topLeveHeaderString, startOfWholeBio);
    const firstSubHeaderAfterBioStartIndex = regexIndexOf(this.origText, subHeaderString, startOfWholeBio);

    let startIndexOfGedcomBio = firstSubHeaderAfterBioStartIndex;

    if (firstSubHeaderAfterBioStartIndex == -1) {
      //this.errorMessage = "No fact section headings found.";
      //return false; // no fact section headings 
      startIndexOfGedcomBio = firstTopLevelHeaderAfterBioStartIndex;
    }

    if (firstTopLevelHeaderAfterBioStartIndex != -1 && firstTopLevelHeaderAfterBioStartIndex < firstSubHeaderAfterBioStartIndex) {
      //this.errorMessage = "No fact section headings found before next top-level heading.";
      //return false; // no fact section headings 
      startIndexOfGedcomBio = firstTopLevelHeaderAfterBioStartIndex;
    }

    //console.log("Whole bio starts with: " + this.origText.substr(startOfWholeBio, nameTitle.length));
    if (startIndexOfGedcomBio != startOfWholeBio) {
      var preamble = this.origText.substr(startOfWholeBio, startIndexOfGedcomBio - startOfWholeBio);

      preamble = this.cleanTextThatMayContainGedcomName(preamble);

      // eliminate extra hard returns
      preamble = preamble.replace(/\n\s*\n\s*\n/g, "\n\n");

      // eliminate the "No biography" text like this:
      // ''No biography yet.<ref> ''This comment and citation should be deleted after a short biography has been added and primary sources have been cited.''</ref> Can you add information or sources?''
      preamble = preamble.replace(/\<ref\>\s*\'\'This comment and citation should be deleted after a short biography has been added and primary sources have been cited\.\'\'\<\/ref\>/, "");
      preamble = preamble.replace(/\'\'No biography yet\.\s*Can you add information or sources\?\'\'/, "");

      // check that is not all white space
      const firstNonSpaceIndex = preamble.search(/[^\s]/);
      if (firstNonSpaceIndex != -1) {
        //console.log("There is a preamble before name title");
        this.preamble = preamble;
        //console.log("Preamble:");
        //console.log(this.preamble);
      }
      else {
        this.preamble = "";
      }
    }
    else {
      this.preamble = "";
    }

    // Make a new string that is the whole of the original text AFTER startIndexOfGedcomBio
    var gedcomBioText = this.origText.substr(startIndexOfGedcomBio);

    gedcomBioText = this.flattenNoteReferencesFormat2011(gedcomBioText);
    
    // In really old gedcoms (e.g. Jenner-10 imported Jan 2011) it appears to have used a subsection for sources
    const sourcesHeader = /\=\=\=?\s*Sources\s*\=\=\=?\n/;
    var sourcesHeaderStartIndex = gedcomBioText.search(sourcesHeader);

    var factsEndIndex = gedcomBioText.length;
    if (sourcesHeaderStartIndex != -1) {
      factsEndIndex = sourcesHeaderStartIndex;
    }
    else {
      // there is no sources section. This is a red flag and could be grounds to bail out
      this.errorMessage = "There is no '== Sources ==' heading. This is needed to parse the biography.";
      return false;
    }

    // There will never be research notes in the bio generated by gedcom by we allow for the fact the use could add one before running this
    const researchNotesHeader = /==\s*Research Notes\s*==\s*\n/i;
    const researchNotesHeaderStartIndex = gedcomBioText.search(researchNotesHeader);

    // There could be other sections after the bio but before the researchNotes.
    const nextTopLevelHeader = /==\s+[^=]+\s+==\s*\n/i;
    const nextSubHeader = /===\s+[^=]+\s+===\s*\n/i;
    var nextTopLevelHeaderStartIndex = gedcomBioText.search(nextTopLevelHeader);

    if (researchNotesHeaderStartIndex != -1) {
      if (nextTopLevelHeaderStartIndex < researchNotesHeaderStartIndex && nextTopLevelHeaderStartIndex != -1) {
        // there were one or more sections after the bio and before research notes
        this.textAfterBioBeforeResearchNotes = gedcomBioText.substring(nextTopLevelHeaderStartIndex, researchNotesHeaderStartIndex);
        factsEndIndex = nextTopLevelHeaderStartIndex;
      }
      else {
        factsEndIndex = researchNotesHeaderStartIndex;
      }
      
      //console.log("Found Research Notes starting at " + researchNotesHeaderStartIndex);

      var newlineIndex = gedcomBioText.indexOf("\n", researchNotesHeaderStartIndex);

      // this will find sources if nothing else before it
      nextTopLevelHeaderStartIndex = regexIndexOf(gedcomBioText, nextTopLevelHeader, newlineIndex);

      this.existingResearchNotes = gedcomBioText.substring(newlineIndex+1, nextTopLevelHeaderStartIndex);
      //console.log("Existing Research Notes are: '" + this.existingResearchNotes + "'");
    }

    const factsText = gedcomBioText.substr(0, factsEndIndex);

    if (nextTopLevelHeaderStartIndex == -1) {
      nextTopLevelHeaderStartIndex = sourcesHeaderStartIndex; // can happen if we have === Sources ===
    }

    if (nextTopLevelHeaderStartIndex < sourcesHeaderStartIndex
        && nextTopLevelHeaderStartIndex != -1 && sourcesHeaderStartIndex != -1) {
      this.textAfterResearchNotesBeforeSources = gedcomBioText.substring(nextTopLevelHeaderStartIndex, sourcesHeaderStartIndex);
    }

    var sourcesText = "";
    if (sourcesHeaderStartIndex != -1) {
      let sourcesStartIndex = gedcomBioText.indexOf("\n", sourcesHeaderStartIndex);
      if (sourcesStartIndex == -1) {
        sourcesStartIndex = gedcomBioText.length;
      }
      else {
        sourcesStartIndex++; // move past \n
      }

      const referencesLine = "<references */>";
      var referencesStartIndex = regexIndexOf(gedcomBioText, referencesLine, sourcesHeaderStartIndex);

      var noReferencesLine = false;
      if (referencesStartIndex == -1) {
        // An example of one with no "<references />" isBrodie-85
        referencesStartIndex = gedcomBioText.length;
        noReferencesLine = true;
      }
      
      if (referencesStartIndex < sourcesStartIndex) {
        this.errorMessage = "No references line found after the sources heading.";
        return false;
      }
      var sourcesEndIndex = referencesStartIndex;
      
      nextTopLevelHeaderStartIndex = regexIndexOf(gedcomBioText, nextTopLevelHeader, sourcesStartIndex);
      var nextSubHeaderStartIndex = regexIndexOf(gedcomBioText, nextSubHeader, sourcesStartIndex);

      if (nextSubHeaderStartIndex != -1) {
        if (nextTopLevelHeaderStartIndex != -1) {
          if (nextSubHeaderStartIndex < nextTopLevelHeaderStartIndex) {
            nextTopLevelHeaderStartIndex = nextSubHeaderStartIndex;
          }
        }
        else {
          nextTopLevelHeaderStartIndex = nextSubHeaderStartIndex;
        }
      }

      // <!-- Please edit, add, or delete anything in this text, including this note. Be bold and experiment! If you make a mistake you can always see the previous version of the text on the Changes page. -->
      const pleaseEditString = /\<\!\-\- Please edit\, add\, or delete anything in this text\. Thank you\! \-\-\>/g;
      const pleaseEditAndBeBoldString = /\<\!\-\- Please edit\, add\, or delete anything in this text\, including this note\. Be bold and experiment\! If you make a mistake you can always see the previous version of the text on the Changes page\. \-\-\>/g;

      if (nextTopLevelHeaderStartIndex != -1) {
        if (!noReferencesLine && nextTopLevelHeaderStartIndex < referencesStartIndex) {
          // This is a case which can happen, there can be sources in between the == Sources == and <references /> lines
          // There can also be === Notes === sections in there.
          nextTopLevelHeaderStartIndex = regexIndexOf(gedcomBioText, nextTopLevelHeader, referencesStartIndex);          
          nextSubHeaderStartIndex = regexIndexOf(gedcomBioText, nextSubHeader, referencesStartIndex);

          if (nextSubHeaderStartIndex != -1) {
            if (nextTopLevelHeaderStartIndex != -1) {
              if (nextSubHeaderStartIndex < nextTopLevelHeaderStartIndex) {
                nextTopLevelHeaderStartIndex = nextSubHeaderStartIndex;
              }
            }
            else {
              nextTopLevelHeaderStartIndex = nextSubHeaderStartIndex;
            }
          }
        }
      }

      if (nextTopLevelHeaderStartIndex != -1) {
        // there is another section after the sources (not standard)
        this.textAfterSources = gedcomBioText.substr(nextTopLevelHeaderStartIndex);
        this.textAfterSources = this.textAfterSources.replace(pleaseEditString, "").trim();
        this.textAfterSources = this.textAfterSources.replace(pleaseEditAndBeBoldString, "").trim();

        // allow for both spellings of Acknowledgments
        let acknowledgmentsSubSectionStartIndex = regexIndexOf(gedcomBioText, "=== Acknowledgments ===", sourcesStartIndex);
        if (acknowledgmentsSubSectionStartIndex != -1) {
          // It is an error that GEDCOM creates a === header for acknowledgements. It should be a == header.
          this.textAfterSources = this.textAfterSources.replace(/\=\=\= Acknowledgments \=\=\=/g, "== Acknowledgments ==");
        }
        let acknowledgementsSubSectionStartIndex = regexIndexOf(gedcomBioText, "=== Acknowledgements ===", sourcesStartIndex);
        if (acknowledgementsSubSectionStartIndex != -1) {
          // It is an error that GEDCOM creates a === header for acknowledgements. It should be a == header.
          this.textAfterSources = this.textAfterSources.replace(/\=\=\= Acknowledgements \=\=\=/g, "== Acknowledgements ==");
        }

        this.textAfterSources = this.textAfterSources.replace(
          /\s*Click to the Changes page for the details of edits by [^ ]+ and others\./g,
          "").trim();
        
        this.textAfterSources = this.cleanTextThatMayContainGedcomName(this.textAfterSources);

        // sometimes there is more than one "== Acknowledgments ==" heading. If so remove the 2nd (and any more)
        const ackString1 = "== Acknowledgments ==";
        const ackString2 = "== Acknowledgements ==";
        let ackIndex1 = this.textAfterSources.indexOf(ackString1);
        let ackIndex2 = this.textAfterSources.indexOf(ackString2);
        let ackIndex = ackIndex1;
        let ackString = ackString1;
        if (ackIndex == -1 || (ackIndex2 != -1 && ackIndex2 < ackIndex)) {
          ackIndex = ackIndex2;
          ackString = ackString2;
        }
        if (ackIndex != -1) {
          let nextAckIndex1 = this.textAfterSources.indexOf(ackString1, ackIndex + ackString.length);
          let nextAckIndex2 = this.textAfterSources.indexOf(ackString2, ackIndex + ackString.length);
          let nextAckIndex = nextAckIndex1;
          ackString = ackString1;
          if (nextAckIndex == -1 || (nextAckIndex2 != -1 && nextAckIndex2 < nextAckIndex)) {
            nextAckIndex = nextAckIndex2;
            ackString = ackString2;
          }
          while (nextAckIndex != -1) {
            this.textAfterSources = this.textAfterSources.substring(0, nextAckIndex).trim()
                  + this.textAfterSources.substring(nextAckIndex + ackString.length);

            nextAckIndex1 = this.textAfterSources.indexOf(ackString1, ackIndex + ackString.length);
            nextAckIndex2 = this.textAfterSources.indexOf(ackString2, ackIndex + ackString.length);
            nextAckIndex = nextAckIndex1;
            ackString = ackString1;
            if (nextAckIndex == -1 || (nextAckIndex2 != -1 && nextAckIndex2 < nextAckIndex)) {
              nextAckIndex = nextAckIndex2;
              ackString = ackString2;
            }
          }
        }

        // Sometimes the "== Acknowledgments ==" heading section is empty, if so remove it
        this.textAfterSources = this.textAfterSources.replace(/\=\=\s*Acknowledge?ments\s*\=\=\s*$/, "");

        // Sometimes there is an empty "=== Notes ===" heading section, if so remove it
        this.textAfterSources = this.textAfterSources.replace(/\=\=\=?\s*Notes\s*\=\=\=?\s*$/, "");
      }

      // Sometimes the sources are between the sources header and the "references" line. Sometime they are after the references line.
      sourcesText = gedcomBioText.substring(sourcesStartIndex, sourcesEndIndex);
      const startOfTextAfterReferences = (noReferencesLine) ? referencesStartIndex : referencesStartIndex + referencesLine.length;
      var endOfTextAfterReferences = nextTopLevelHeaderStartIndex;
      if (endOfTextAfterReferences == -1) {
        endOfTextAfterReferences = gedcomBioText.length;
      }
      sourcesText += gedcomBioText.substring(startOfTextAfterReferences, endOfTextAfterReferences);

      sourcesText = sourcesText.replace(pleaseEditString, "").trim();
      sourcesText = sourcesText.replace(pleaseEditAndBeBoldString, "").trim();

      sourcesText = this.cleanTextThatMayContainGedcomName(sourcesText);

      // remove any lines of the form "No REPO record found with id R-593030340."
      sourcesText = sourcesText.replace(/No REPO record found with id R[\-\d]+\./g, "").trim();

      // remove any lines of the form "No SOUR record found with id *. *"
      sourcesText = sourcesText.replace(/No SOUR record found with id [\-\d]*\s*\.[^\n]*\n/g, "").trim();
      sourcesText = sourcesText.replace(/No SOUR record found with id S\-[\-\d\s\.]+/g, "").trim();
    }


    // If the user wants to keep the gedcom names write them out at the end of "textAfterSources"
    if (!userOptions.removeGedcomVerbiage && this.gedcomNames.length > 0) {

      // check if there is an acknowledgements setion
      let ackIndex = this.textAfterSources.search(/\=\=\s*Acknowledge?ments\s*\=\=/);
      if (ackIndex == -1) {
        this.textAfterSources = this.textAfterSources.concat("\n== Acknowledgments ==");
      }

      for (let gedcomNameObj of this.gedcomNames) {
        let message = "\n* ";
        if (gedcomNameObj.profileId) {
          message += "Profile " + gedcomNameObj.profileId;
        }
        else {
          message += "This person";
        }
        message += " was created through the import of " + gedcomNameObj.name + " on " + gedcomNameObj.date;
        if (gedcomNameObj.userId) {
          message += " by " + gedcomNameObj.userId;
        }
        message += ".";

       this.textAfterSources = this.textAfterSources.concat(message);
      }
    }

    
    if (!this.createSourceMapFormat2011(sourcesText)) {
      if (!this.errorMessage) {
        this.errorMessage = "Failed to parse the sources section.";
      }
      return false;
    }

    const result = this.parseFactsFormat2011(factsText);

    //console.log(this.facts);
    return result;
  }

  removeDuplicateFacts() {
    // they have already been sorted

    for (var factIndex = 0; factIndex < this.facts.length; factIndex++) {
      const fact = this.facts[factIndex];
      // look for any facts following this one with the same date
      var otherFactIndex = factIndex + 1;
      while (otherFactIndex < this.facts.length) {
        const otherFact = this.facts[otherFactIndex];
        if (otherFact.factDate.inputString != fact.factDate.inputString) {
          break; // dates not the same
        }

        var isIdentical = false;
        if (fact.location == otherFact.location && fact.description == otherFact.description && fact.sectionName == otherFact.sectionName) {
          var refsIdentical = false;
          if (fact.refs.size == otherFact.refs.size && fact.unnamedRefs.length == otherFact.unnamedRefs.length)
          {
            refsIdentical = true;
            for (var ref of fact.refs.values()) {
              const otherRef = fact.refs.get(ref.name);
              if (otherRef != undefined) {
                if (otherRef.body != ref.body) {
                  refsIdentical = false;
                  break;
                } 
              }
              else {
                refsIdentical = false;
                break;
              }
            }

            for (var index = 0; index < fact.unnamedRefs.length; index++) {
              const ur1 = fact.unnamedRefs[index]
              const ur2 = otherFact.unnamedRefs[index]
              if (ur1.name != ur2.name || ur1.body != ur2.body) {
                refsIdentical = false;
                break;
              }
            }
          }

          if (refsIdentical) {
            isIdentical = true;
          }
        }

        if (isIdentical) {
          // delete the duplicate
          //console.log("Removing fact:");
          //console.log(fact);
          this.facts.splice(otherFactIndex, 1);

          // this is messy - each section also stores a list of facts. We need to delete it from there also
          const section = this.factSectionMap.get(otherFact.factType);
          if (section != undefined) {
            for (var sectionFactIndex = 0; sectionFactIndex < section.facts.length; sectionFactIndex++) {
              if (section.facts[sectionFactIndex] == otherFact) {
                section.facts.splice(sectionFactIndex, 1);
                break;
              }
            }
          }
        }
        else {
          otherFactIndex++;
        }
      }

    }
  }

  findEarliestAndLatestDates() {
    // the facts are sorted so we just find the first with a valid date and the last with a valid date.

    var earliestFactWithDate = undefined;
    var latestFactWithDate = undefined;

    for (var fact of this.facts) {

      if (fact.factDate.isValid) {

        if (earliestFactWithDate == undefined) {
          earliestFactWithDate = fact;
        }

        latestFactWithDate = fact;
      }
    }

    if (earliestFactWithDate != undefined) {
      this.earliestFactDate = earliestFactWithDate.factDate;
      this.latestFactDate = latestFactWithDate.factDate;
    }
  }

  handleFactsWithNoDatePass1() {

    var datesChanged = false;

    for (var fact of this.facts) {

      if (!fact.factDate.isValid) {

        if (fact.factType == FactType.name) {
          // this is normal
          continue;
        }

        //console.log("Fact with no date:");
        //console.log(fact);

        if (fact.factType == FactType.burial) {
          // sometimes a burial fact is created for a Find a Grave record but there is no burial date.
          // If we have a death date we can say it is after that
          if (this.deathDate != "") {
            fact.factDate = new FactDate(this.deathDate);
            fact.factDate.qualifier = DateQualifiers.after;
            datesChanged = true;
            this.addAlertMessage("A burial fact had no date. Changed its date to be after the death date.")
          }
          // otherwise, if there are any facts with valid dates we know the latest date. Make it after that
          else if (this.latestFactDate != undefined) {
            fact.factDate = this.latestFactDate;
            fact.factDate.qualifier = DateQualifiers.after;
            datesChanged = true;
            this.addAlertMessage("A burial fact had no date. Changed its date to be after the last fact with a date.")
          }
        }
      }
    }  

    if (datesChanged) {
      this.facts.sort(Biography.compareFacts);
    }
  }

  combineExtraDataForFacts(mainFact, otherFact) {
    // combine extraData (if not the same)
    let isExtraDataTheSame = true;
    if ((mainFact.extraData == undefined) != (otherFact.extraData == undefined)) {
      isExtraDataTheSame = false;
    }
    else if (mainFact.extraData != undefined && otherFact.extraData != undefined) {
      if (mainFact.extraData.length != otherFact.extraData.length) {
        isExtraDataTheSame = false;
      }
      else {
        for (let i=0; i < mainFact.extraData.length; ++i) {
          if (mainFact.extraData[i] != otherFact.extraData[i]) {
            isExtraDataTheSame = false;
            break;
          }
        }
      }
    }
    if (!isExtraDataTheSame && otherFact.extraData != undefined && otherFact.extraData.length > 0) {
      if (mainFact.extraData == undefined) {
        mainFact.extraData = [];
      }
      for (let dataLine of otherFact.extraData) {
        // only add the line if it is not already in mainFact
        let isDuplicate = false;
        for (let existingLine of mainFact.extraData) {
          if (existingLine == dataLine) {
            isDuplicate = true;
          }
        }
        if (!isDuplicate) {
          mainFact.extraData.push(dataLine);
        }
      }
    }
  }

  handleDuplicateMarriages() {
    // Sometimes an extra marriage fact is created from a census which records how long the couple have been married
    // If this is left as a marriage if can cause issues. Mostly just by having two marriages instead of one.
    // The marriage ref is always an unnamed ref so the census ref doesn't get removed - they are just left as duplicate refs.

    var datesChanged = false;

    const marriageSection = this.factSectionMap.get(FactType.marriage);

    if (marriageSection != undefined && marriageSection.facts.length > 1) {
      // there are multiple marriages, see if any are within a year of each other

      for (var marriageFactIndex = 0; marriageFactIndex < marriageSection.facts.length; marriageFactIndex++) {
        const m1Fact = marriageSection.facts[marriageFactIndex];

        for (var otherFactIndex = marriageFactIndex + 1; otherFactIndex < marriageSection.facts.length; otherFactIndex++) {
          const m2Fact = marriageSection.facts[otherFactIndex];

          if (m1Fact != m2Fact) {

            if (m1Fact.factDate.isValid && m2Fact.factDate.isValid) {
              // both have valid dates
              if (Math.abs(m1Fact.factDate.year - m2Fact.factDate.year) <= 1) {
                // they are within a year of each other

                var sameSpouseOrSpouseUndefined = false;
                var spouse = "";
                if (this.personGender == "Male") {
                  if (m1Fact.marriageWife == m2Fact.marriageWife || m1Fact.marriageWife == "" || m2Fact.marriageWife == "") {
                    sameSpouseOrSpouseUndefined = true;
                    if (m1Fact.marriageWife != "") {
                      spouse = m1Fact.marriageWife;
                    }
                    else{
                      spouse = m2Fact.marriageWife;
                    }
                  }
                }
                else if (this.personGender == "Female") {
                  if (m1Fact.marriageHusband == m2Fact.marriageHusband || m1Fact.marriageHusband == "" || m2Fact.marriageHusband == "") {
                    sameSpouseOrSpouseUndefined = true;
                    if (m1Fact.marriageHusband != "") {
                      spouse = m1Fact.marriageHusband;
                    }
                    else{
                      spouse = m2Fact.marriageHusband;
                    }
                  }
                }

                // if they have the same or undefined spouse then combine them into m1Fact and mark m2Fact hidden
                if (sameSpouseOrSpouseUndefined) {
                  //console.log("Combining two different marriage facts");
                  if (spouse != "") {
                    if (this.personGender == "Male") {
                      if (m1Fact.marriageWife == "") {
                        m1Fact.marriageWife = spouse;
                        m1Fact.marriageChildren = m2Fact.marriageChildren;
                      }
                    }
                    else if (this.personGender == "Female") {
                      if (m1Fact.marriageHusband == "") {
                        m1Fact.marriageHusband = spouse;
                        m1Fact.marriageChildren = m2Fact.marriageChildren;
                      }
                    }
                  }

                  // take best date (assume longest date is best)
                  if (m2Fact.factDate.bioString > m1Fact.factDate.bioString) {
                    m1Fact.factDate = m2Fact.factDate;
                  }

                  // combine descriptions (if not the same)
                  if (m2Fact.description != "" && m2Fact.description != m1Fact.description) {
                    m1Fact.description += " " + m2Fact.description;
                  }

                  // combine extraData (if not the same)
                  this.combineExtraDataForFacts(m1Fact, m2Fact);

                  // combine refs
                  for (var m2Ref of m2Fact.refs.values()) {
                    var m1Ref = m1Fact.refs.get(m2Ref.name);
                    if (m1Ref != undefined) {
                      if (m1Ref.body == "" && m2Ref.body != "") {
                        m1Ref.body = m2Ref.body;
                      }
                    }
                    else {
                      m1Fact.refs.set(m2Ref.name, m2Ref);
                    }
                  }

                  // combine unnamed refs
                  for (var m2Ref of m2Fact.unnamedRefs) {
                    m1Fact.unnamedRefs.push(m2Ref);
                  }
                  m2Fact.unnamedRefs = [];

                  m2Fact.isHidden = true;

                  this.addAlertMessage("Combined two marriage facts. First dated '" + m1Fact.factDate.bioString + "', second dated '" + m2Fact.factDate.bioString + "'.")
                  datesChanged = true;  // probably unnecessary
                }
              }
            }
          }
        }
      }
    }

    if (datesChanged) {
      this.facts.sort(Biography.compareFacts);
    }
  }

  combineRefsOnCombinedFacts(mainFact, otherFact) {
    // combine refs
    // NOTES on refs:
    // 1. The facts should have no unnamed_refs at this time
    //    (because this function should be called after consolidateRefs)
    // 2. If a ref has a blank body it is usually because it is owned by another ref
    // 3. If handleDuplicates found a duplicate it does not use owningRef - it just sets one body to ""

    for (var otherRef of otherFact.refs.values()) {

      var otherRefName = otherRef.name;

      // refs that are not shared at all can be named "unnamed_n" where n is only
      // unique within the fact. This renames the one we are moving to be unique on the new fact
      if (otherRefName.startsWith("unnamed")) {
        if (mainFact.refs.has(otherRefName)) {
          var prefix = 1;
          otherRefName = "unnamed_" + prefix;
          while (mainFact.refs.has(otherRefName)) {
            prefix++;
            otherRefName = "unnamed_" + prefix;
          }
        }
        otherRef.name = otherRefName;
      }
      
      var mainRef = mainFact.refs.get(otherRefName);
      if (mainRef != undefined && mainRef.owningRef == undefined && otherRef.ownedRefs.length == 0) {
        if (mainRef.body == "" && otherRef.body != "") {
          mainRef.body = otherRef.body;
        }
      }
      else {
      mainFact.refs.set(otherRefName, otherRef);
      }
    }
 }

  tryToMergeFactsOnSameDate() {
    var datesChanged = false;

    for (var factIndexA = 0; factIndexA < this.facts.length; factIndexA++) {
      const factA = this.facts[factIndexA];

      if (factA.isHidden || factA.owningFact != undefined) continue;

      if (!(factA.factType == FactType.residence || factA.factType == FactType.employment || factA.factType == FactType.census )) {
        continue;
      }

      for (var factIndexB = factIndexA + 1; factIndexB < this.facts.length; factIndexB++) {
        const factB = this.facts[factIndexB];

        if (factA.isHidden) continue; // FactA could get hidden during this loop

        if (factB.isHidden || factB.owningFact != undefined) continue;

        if (!(factB.factType == FactType.residence || factB.factType == FactType.employment || factB.factType == FactType.census )) {
          continue;
        }
  
        if (factA != factB) {

          if (factA.factDate.isValid && factB.factDate.isValid) {
            // both have valid dates

            const daysBetweenFacts = factA.absDaysBetweenFacts(factB);

            if (daysBetweenFacts <= 3) {
              // they are within a few days of each other

              const factAResidenceData = factA.getMatchingResidenceData();
              const factBResidenceData = factB.getMatchingResidenceData();

              if (factAResidenceData == undefined || factAResidenceData != factBResidenceData) {
                if (factAResidenceData != undefined && factBResidenceData != undefined) {
                  // different residence data
                  continue;
                }
                if (factAResidenceData == undefined) {
                  if (!(factA.refs.size == 0 && factA.unnamedRefs.length == 0)) {
                    continue;
                  }
                }
                if (factBResidenceData == undefined) {
                  if (!(factB.refs.size == 0 && factB.unnamedRefs.length == 0)) {
                    continue;
                  }
                }
              }

              const combinedLocation = getCombinedLocation(factA.location, factB.location);
              if (combinedLocation == undefined) continue;

              var mainFact = factA;
              var otherFact = factB;
              if (factA.factType != factB.factType) {
                if (factB.factType == FactType.census) {
                    mainFact = factB;
                    otherFact = factA;
                }
                else if (factA.factType != FactType.census && factB.factType == FactType.employment)
                {
                  mainFact = factB;
                  otherFact = factA;
                }
              }

              // build message - do this before modifying facts
              var message = "Combined two residence/census/occupation facts.";
              message = message.concat(" First dated '", mainFact.factDate.bioString, "' with location ", mainFact.location, " and section ", mainFact.sectionName, ".");
              message = message.concat(" Second dated '", otherFact.factDate.bioString, "' with location ", otherFact.location, " and section ", otherFact.sectionName, ".");
              this.addAlertMessage(message);

              // combine them into mainFact and mark otherFact hidden
              mainFact.location = combinedLocation; // use best location

              // take best date (assume longest date is best)
              if (otherFact.factDate.bioString > mainFact.factDate.bioString) {
                mainFact.factDate = otherFact.factDate;
              }

              if (mainFact.occupation == undefined || mainFact.occupation == "") {
                mainFact.occupation = otherFact.occupation;
              }
              if (mainFact.age == undefined || mainFact.age == "") {
                mainFact.age = otherFact.age;
              }

              // combine descriptions (if not the same)
              if (otherFact.description != "" && otherFact.description != mainFact.description) {
                mainFact.description += " " + otherFact.description;
              }

              // combine extraData (if not the same)
              this.combineExtraDataForFacts(mainFact, otherFact);

              if (otherFact.factType == FactType.census || otherFact.factType == FactType.residence) {
                mainFact.wasCombinedWithResidenceOrCensus = true;
              }

              // combine refs
              this.combineRefsOnCombinedFacts(mainFact, otherFact);

              otherFact.isHidden = true;

              datesChanged = true;  // probably unnecessary
            }
          }
        }
      }
    }

    if (datesChanged) {
      this.facts.sort(Biography.compareFacts);
    }
  }

  checkForDuplicateUnnamedRefs() {
    // linking together arrivals and departures only works currently because they share the same ref names
    // Some formats do not name refs at all (like Bowler-883 which is a 2018 import, probably not from Ancestry).

    function checkForSuperset(unnamedRefMap, ref) {
      // sometimes there is a ref in unnamedRefMap whose body is very close but not quite the same. If ones is a superset of another
      // then we could combine them
      var supersetBody;
      for (var mapEntry of unnamedRefMap.values()) {
        if (ref.body.length != mapEntry.ref.body.length) {
          var shorterString;
          var shorterStringLength;
          var longerString;
          var longerStringLength;
          if (ref.body.length > mapEntry.ref.body.length) {
            shorterString = mapEntry.ref.body;
            shorterStringLength = mapEntry.ref.body.length;
            longerString = ref.body;
            longerStringLength = ref.body.length;
          }
          else {
            longerString = mapEntry.ref.body;
            longerStringLength = mapEntry.ref.body.length;
            shorterString = ref.body;
            shorterStringLength = ref.body.length;
          }

          // find first diff from start
          var startIndex;
          var fromEndIndex;
          for (startIndex = 0; startIndex < shorterStringLength; startIndex++) {
            if (shorterString[startIndex] != longerString[startIndex]) {
              break;
            }
          }
          for (fromEndIndex = 0; fromEndIndex < shorterStringLength; fromEndIndex++) {
            if (shorterString[shorterStringLength-1-fromEndIndex] != longerString[longerStringLength-1-fromEndIndex]) {
              break;
            }
          }

          if (startIndex + fromEndIndex == shorterStringLength) {
            // the shorter string is a subset of the longer string
            if (ref.body.length > mapEntry.ref.body.length) {
              unnamedRefMap.delete(shorterString);
              unnamedRefMap.set(longerString, mapEntry);
            }

            // console.log("checkForDuplicateUnnamedRefs: Found superset changing citation from :\n" + shorterString + "\nto :\n" + longerString);

            mapEntry.ref.body = longerString;
            ref.body = longerString;

            return longerString;
          }
        }
      }

      return undefined;
    }

    function handleDuplicate(unnamedRefMap, ref) {
      // this is a duplicate of a ref on another fact
      var mapValue = unnamedRefMap.get(ref.body);

      if (mapValue.name == undefined) {
        const newName = "prev_unnamed_" + nextNewRefNameSuffix++;
        mapValue.name = newName;
        mapValue.ref.name = newName;

        // make the other ref a named ref, moving it from unnamedRefs to refs
        var otherFact = mapValue.fact;
        otherFact.refs.set(mapValue.ref.name, mapValue.ref);
        otherFact.unnamedRefs = otherFact.unnamedRefs.filter(function(otherFactRef) {
          return otherFactRef.name != mapValue.ref.name;
        });

        //console.log("Moved ref named " + mapValue.ref.name + " on " + otherFact.sectionName + " fact from unnamedRefs to refs");
      }
      
      // make this ref a named ref that points to the other ref
      // NOTE: not using owningRef and ownedRefs here, if we do it causes issues. It is confusing.
      ref.name = mapValue.name;
      ref.body = "";
      fact.refs.set(mapValue.ref.name, ref);

      //console.log("Changed ref on " + fact.sectionName + " to reference a ref named " + mapValue.ref.name);
    }

    var nextNewRefNameSuffix = 1;

    var unnamedRefMap = new Map;  // key is the entire ref body

    // So we try to fix that her by searching for identical unnamed refs and converting them to named refs
    for (var fact of this.facts) {
      var newUnnamedRefs = [];  // used to delete dup refs within the same fact
      var existingUnnamedRefsOnThisFact = new Set;
      for (var ref of fact.unnamedRefs) {
        if (!existingUnnamedRefsOnThisFact.has(ref.body)) {
          existingUnnamedRefsOnThisFact.add(ref.body);

          if (unnamedRefMap.has(ref.body)) {
            var mapValue = unnamedRefMap.get(ref.body);
            if (mapValue.fact != fact) {
              // this is a duplicate of a ref on another fact
              handleDuplicate(unnamedRefMap, ref);
            }
            else {
              // this is a duplicate on the same fact. So just ignore it
            }
          }
          else {
            // sometimes there is a ref in unnamedRefMap whose body is very close but not quite the same. If ones is a superset of another
            // then we could combine them
            const supersetBody = checkForSuperset(unnamedRefMap, ref);
            if (supersetBody != undefined) {
              var mapValue = unnamedRefMap.get(supersetBody);
              if (mapValue.fact != fact) {
                handleDuplicate(unnamedRefMap, ref);
              }
            }
            else {
              var mapValue = { 'fact': fact, 'ref': ref };
              unnamedRefMap.set(ref.body, mapValue);
  
              newUnnamedRefs.push(ref);
              //console.log(ref.body + "not found in unnamedRefMap, added");
              //console.log("Added ref named '" + ref.name + "' on " + fact.sectionName + " fact to newUnnamedRefs");  
            }
          }
        }
      }

      fact.unnamedRefs = newUnnamedRefs;
    }
  }

  consolidateRefs() {

    this.checkForDuplicateUnnamedRefs();

    // replace multiple uses of refs with a single <ref> for each
    // generally it is the latest (chronologically) use of the ref that should own it.

    // First create a local map of all ref bodies.
    // Loop through all facts and, for each of their refs, make sure it is in the map
    var allRefs = new Map;
    for (var fact of this.facts) {
      //            console.log("addRefs loop. fact.refs:");
      //            console.log(fact.refs);
      for (var ref of fact.refs.values()) {
        if (ref.body != "" && ref.name != "" && !allRefs.has(ref.name)) {
          //                     console.log("Adding an element to allRefs map. Key is " + ref.name);
          allRefs.set(ref.name, ref);
        }
      }
    }

    //console.log(allRefs);

    // now remove all refs instances except the latest one and make sure that has a body
    // to do this we loop over the facts array in reverse
    var refProcessed = new Map;
    for (var factIndex = this.facts.length - 1; factIndex >= 0; factIndex--) {
      //            console.log("consolidateRefs reverse loop. factIndex = " + factIndex);
      //            console.log(this.facts[factIndex].refs);
      var fact = this.facts[factIndex];

      for (var ref of fact.refs.values()) {
        // console.log("consolidateRefs reverse loop. ref name = " + ref.name);
        // do a sanity check
        if (ref.name == "") {
          // This ref is unnamed, so we just leave it, it must have a body
          // Actually this should never happen because we put unnamed refs in a separate array
        }
        else if (!allRefs.has(ref.name)) {
          console.log("ERROR: the ref name '" + ref.name + "' has no body");
        }
        else {
          if (refProcessed.has(ref.name)) {

            // For some types of facts we want to link the ones with the same ref name
            var owningFact = refProcessed.get(ref.name);
            if (owningFact.factType == FactType.arrival && fact.factType == FactType.departure) {
              if (fact.owningFact != undefined || owningFact.ownedFact != undefined) {
                console.log("Arrival and Departure facts cannot be linked because they already have links");
              }
              else {
                //console.log("Linking Arrival and Departure facts with ref name = " + ref.name);
                fact.owningFact = owningFact;
                owningFact.ownedFact = fact;
              }
            }
            if ((owningFact.factType == FactType.arrival || owningFact.factType == FactType.departure) && fact.factType == FactType.residence) {
              if (fact.owningFact != undefined || owningFact.ownedFact != undefined) {
                console.log("Arrival/Departure and Residence facts cannot be linked because they already have links");
              }
              else {
                //console.log("Linking Arrival/Departure and Residence facts with ref name = " + ref.name);
                fact.owningFact = owningFact;
                owningFact.ownedFact = fact;
              }
            }
            if (owningFact.factType == FactType.burial && fact.factType == FactType.death && fact.refs.size == 1) {
              // if the death is "before" the burial or is approximate
              if ((fact.factDate.qualifier == DateQualifiers.about || fact.factDate.qualifier == DateQualifiers.before) || fact.factDate.month == 0) {
                if (fact.location == "" && fact.description == "") {
                  if (fact.owningFact != undefined || owningFact.ownedFact != undefined) {
                    console.log("Burial and death facts cannot be linked because they already have links");
                  }
                  else {
                    //console.log("Linking Burial/Death facts with ref name = " + ref.name);
                    fact.owningFact = owningFact;
                    owningFact.ownedFact = fact;
                  }
                }
              }
              // if the burial is "after" the death or is approximate
              else if ((owningFact.factDate.qualifier == DateQualifiers.about || owningFact.factDate.qualifier == DateQualifiers.after) || owningFact.factDate.month == 0) {
                if (fact.description == "" || owningFact.description == "") {
                  if (fact.owningFact != undefined || owningFact.ownedFact != undefined) {
                    console.log("Burial and death facts cannot be linked because they already have links");
                  }
                  else {
                    //console.log("Linking Burial/Death facts with ref name = " + ref.name);
                    fact.owningFact = owningFact;
                    owningFact.ownedFact = fact;
                  }
                }
              }
            }

            // a chronologically later fact has this ref so remove this ref from this fact
            //console.log("Deleting ref named '" + ref.name + "' from fact index " + factIndex);
            if (fact.factType == FactType.name) {
              fact.refs.delete(ref.name);
            }
            else {
              var owningFact = refProcessed.get(ref.name);
              var owningRef = owningFact.refs.get(ref.name);
              owningRef.ownedRefs.push(ref);
              ref.owningRef = owningRef;
              ref.body = "";
            }
          }
          else {
            // this is the chronologically latest fact using this ref so put the body here
            if (ref.body == "") {
              // console.log("Adding body '" + allRefs.get(ref.name).body + "' to ref named '" + ref.name + "' from fact index " + factIndex);
              ref.body = allRefs.get(ref.name).body;
            }

            refProcessed.set(ref.name, fact);
          }
        }
      }
    }

    // now go through all the refs remaining and, since they should all have bodies, generate the sourceId and citation from the body
    for (var fact of this.facts) {
      for (var ref of fact.refs.values()) {
        if (ref.body != "") {
          ref.extractSourceId(this);  // now we have a body extract the sourceId and citation
        }
      }
      for (var ref of fact.unnamedRefs) {
        if (ref.body != "") {
          ref.extractSourceId(this);  // now we have a body extract the sourceId and citation
        }
      }
    }

    // Sometimes we have refs left on the Name fact or ones on the Born fact that belong elsewhere. There are some special cases that cause this.
    // So let's see if we can fix them
    for (var fact of this.facts) {

      // We do this for Name and Born but also for facts with no date (sometime a marriage ref is attached to a Residence fact with no date)
      if (fact.factType == FactType.name || fact.factType == FactType.birth || !fact.factDate.isValid) {
        if (fact.refs.size > 0) {
          // We have refs on the Name or Born fact that we could not find a better place for

          // The first situation that this occurs for is marriages. It seems to add the persions marriage ref (a named ref) to the Name fact
          // but also add an unnamed ref for the husbands marriage record to the marriage. In this case we want to remove the one on the marriage
          // and copy the one from the Name fact
          for (var marriageFact of this.facts) {

            if (marriageFact.factType == FactType.marriage) {
              if (marriageFact.unnamedRefs.length > 0) {

                //console.log("!!!!!! ConsolidateRefs, marriage has " + marriageFact.unnamedRefs.length + " unnamedRefs");

                // for each unnamed ref on the marriage fact go through the refs on the Name fact looking for one with the same SourceId
                var unmatchedUnnamedRefs = [];
                for (var marriageRef of marriageFact.unnamedRefs) {

                  //console.log("!!!!!! ConsolidateRefs, marriage unnamedRef: sourceId is " + marriageRef.sourceId + ", citation is : " + marriageRef.citation);

                  var deleteRef = false;

                  for (var nameFactRef of fact.refs.values()) {

                    //console.log("!!!!!! ConsolidateRefs, factRef: sourceId is " + nameFactRef.sourceId + ", citation is : " + nameFactRef.citation);

                    if (nameFactRef.sourceId == marriageRef.sourceId) {
                      //console.log(">>>>> ConsolidateRefs, found matching sourceIds. nameFactRef name is '" + nameFactRef.name + "'");
                      //console.log(">>>>> nameFactRef.citation '" + nameFactRef.citation + "'");
                      //console.log(">>>>> marriageRef.citation '" + marriageRef.citation + "'");
                      

                      // this looks like the right situation. But we don't want to remove sources by mistake. Check the citation, for a man they will be the same
                      if (nameFactRef.citation == marriageRef.citation) {
                        deleteRef = true;
                      }
                      else {
                        const marriageCitationDetails = parseAncestryCitation(marriageRef.citation);
                        const nameFactCitationDetails = parseAncestryCitation(nameFactRef.citation);

                        if (nameFactCitationDetails.dbId != undefined && nameFactCitationDetails.dbId == marriageCitationDetails.dbId) {
                          // both citations are citing the same database
                          if (nameFactCitationDetails.recordId != undefined && nameFactCitationDetails.recordId == marriageCitationDetails.recordId) {
                            deleteRef = true;
                          }
                          else if (nameFactCitationDetails.text != "" && nameFactCitationDetails.text == marriageCitationDetails.text) {
                            deleteRef = true;
                          }
                          else if (nameFactCitationDetails.recordId != undefined && marriageCitationDetails.recordId != undefined) {
                            // If one record is for this person and the other is for the spouse they are sometimes just one record apart
                            // This would never be true for a child marriage or a marriage to a different spouse
                            const nameFactRecordNumber = Number.parseInt(nameFactCitationDetails.recordId);
                            const marriageRecordNumber = Number.parseInt(marriageCitationDetails.recordId);
                            if (isFinite(nameFactRecordNumber) && isFinite(marriageRecordNumber)) {
                              if (Math.abs(nameFactRecordNumber - marriageRecordNumber) == 1) {
                                deleteRef = true;
                              }
                            }
                          }
                        }
                      }

                      if (deleteRef) {
                        // we have found a matching nameFact ref
                        break;
                      }
                    }
                  }

                  if (deleteRef) {
                    // we want to:
                    // 1. Copy nameFactRef to the marriageFact.refs map
                    // 2. remove nameFactRef from the fact.refs map
                    //console.log("ConsolidateRefs, moving a ref. marriageRef sourceId = " + marriageRef.sourceId + ", nameFactRef.sourceId = " + nameFactRef.sourceId);
                    //console.log("ConsolidateRefs nameFactRef.name " + nameFactRef.name);
                    
                    marriageFact.refs.set(nameFactRef.name, nameFactRef);
                    fact.refs.delete(nameFactRef.name);
                    
                    if (fact.refs.size == 0 && !fact.factDate.isValid) {
                      // if this is a fact with no remaining refs and no date then avoid generating anything for it
                      fact.isHidden = true;
                    }
                  }
                  else {
                    // this unnamed ref was not matched
                    unmatchedUnnamedRefs.push(marriageRef)

                    //console.log("ConsolidateRefs unmatched unnamed ref = " + marriageRef.citation);
                  }
                }

                // set the unnamedRefs array to just contain the unmatched ones
                marriageFact.unnamedRefs = unmatchedUnnamedRefs;
              }
            }
          }
    
        }
      }
    }

    // check for multiple name facts and add a research note if they exist
    if (userOptions.researchNotes_alternateNames) {
      var names = [];
      var nameSet = new Set();  // used to filter out duplicate names
      for (var fact of this.facts) {

        if (fact.factType == FactType.name) {
          var name = fact.description;
          name = removeTrailingPeriodAndSpaces(name);
          name = name.replace(/\//g, "");
          var lcName = name.toLowerCase();

          if (lcName != this.currentLastName.toLowerCase() && !nameSet.has(lcName)) {
            names.push(name);
            nameSet.add(lcName);
          }
        }
      }
      if (names.length > 1) {
        this.addedResearchNotes = this.addedResearchNotes.concat("=== Alternate Names ===\n\nThere are alternate names for this person:\n")
        for (const name of names) {
          this.addedResearchNotes = this.addedResearchNotes.concat("* ", name, "\n");
        }
      }
    }

    // At this point if we have any unnamedRefs on any facts we want to move them to the refs map. This is so that we don't need
    // to worry about having two arrays to loop through.
    for (var fact of this.facts) {

      if (fact.unnamedRefs.length > 0) {
        var nameSuffix = 1;

        for (var unnamedRef of fact.unnamedRefs) {
          const refName = "unnamed_" + nameSuffix;
          unnamedRef.name = refName;
          fact.refs.set(refName, unnamedRef);
          nameSuffix++;
        }
      }
    }

    //console.log(this.facts);
    return true;
  }

  replaceAncestryLinksWithTemplates(text) {
    // There are sometimes ancestry links that did not get converted to Ancestry templates
    // Example profiles are: Bayley-507, Harbour-271, Key-2394, Page-3163

    // if the URL is already in [ ] - i.e. a wikitree external link then do not replace
    if (text.includes("[http")) {
      return text;
    }

    if (text.includes("http://trees.ancestry.com/rd?f=sse")) {
      text = text.replace(/http\:\/\/trees\.ancestry\.com\/rd\?f\=sse\&db\=([0-9a-z\-]+)\&h\=([0-9-]+)(\&ti=0)?(\&indiv=try)(\&gss=pt)?/g,
      "{{Ancestry Record|$1|$2}}");
    }
    if (text.includes("http://trees.ancestry.com/pt/AMTCitationRedir.aspx")) {
      text = text.replace(/http\:\/\/trees\.ancestry\.com\/pt\/AMTCitationRedir.aspx\?tid\=([0-9-]+)\&pid\=([0-9-]+)/g,
      "{{Ancestry Tree|$1|$2}}");
    }
    if (text.includes("http://trees.ancestry.com/tree/")) {
      text = text.replace(/http\:\/\/trees\.ancestry\.com\/tree\/([0-9a-z\-]+)\/person\/([0-9-]+)/g,
      "{{Ancestry Tree|$1|$2}}");
    }
    if (text.includes("https://www.ancestry.com/family-tree/")) {
      text = text.replace(/https\:\/\/www\.ancestry\.com\/family\-tree\/tree\/([0-9a-z\-]+)\/family/g,
      "{{Ancestry Tree|$1|0}}");
    }

    // http://trees.ancestry.com/pt/AMTCitationRedir.aspx?tid=70689642&pid=17

    return text;
  }

  embedSourceInfo() {
    // Loop over all facts, and the refs in those facts
    // For each ref, look for a matching source and embed the Source Information into the ref
    // For all sources that have been embedded, remove the source

    for (var fact of this.facts) {
      for (var ref of fact.refs.values()) {
        //console.log("embedSourceInfo. ref.sourceId = " + ref.sourceId);
        if (ref.owningRef == undefined) {
          if (this.sourcesMap.has(ref.sourceId)) {
            const source = this.sourcesMap.get(ref.sourceId);

            // check for rare non-ancestry sources that need fixing up
            if (ref.citation.includes("http")) {
              if (ref.citation.includes("Note: http://search.findmypast.co.uk")) {
                var indexOfNote = ref.citation.indexOf(" Note: http://search.findmypast.co.uk")
                if (indexOfNote) {
                  var citationDetail = ref.citation.substring(0, indexOfNote);
                  var indexOfLink = indexOfNote + 7;
                  var indexOfNextSpace = ref.citation.indexOf(" ", indexOfLink);
                  if (indexOfNextSpace == -1) {
                    ref.citation = "[" + ref.citation.substring(indexOfLink) + " Findmypast] " + citationDetail;
                  }
                }
              }

              // Some broken links from Carlsdotter-116. These end up being substituted into the citation
              // Note <span id='N0499'>N0499<span> https://app.arkivdigital.se/volumev72425?image=24
              // Note <span id='N0500'>N0500<span> https://sok.riksarkivet.se/bildvisningC0009225_00029#?c=&m=&s=&cv=28&xywh=-325%2C872%2C5970%2C3925
              if (ref.citation.includes("https://app.arkivdigital.se/volume")) {
                ref.citation = ref.citation.replace(/(https\:\/\/app\.arkivdigital\.se\/volume)(\w*\?)/gi, "$1/$2");
              }
              if (ref.citation.includes("https://sok.riksarkivet.se/bildvisning")) {
                ref.citation = ref.citation.replace(/(https\:\/\/sok\.riksarkivet\.se\/bildvisning)(\w)/gi, "$1/$2");
              }
            }

            // There are sometimes ancestry links that did not get converted to Ancestry templates
            // Example profiles are: Bayley-507, Harbour-271, Key-2394, Page-3163
            ref.citation = this.replaceAncestryLinksWithTemplates(ref.citation);
            source.text = this.replaceAncestryLinksWithTemplates(source.text);

            // Check for rare situation where the source text has " Note:" on the end of it and remove it
            // This seems to happen for sources that were built in Ancestry by the user.
            if (source.text.includes(" Note:")) {
              const indexOfNote = source.text.indexOf(" Note:");
              //console.log("indexOfNote is " + indexOfNote + " and length is " + source.text.length);
              if (indexOfNote == source.text.length - 6)
              {
                source.text = source.text.substring(0, indexOfNote);
              }
            }

            // For Ancestry sources, typically the ref citation contains something like {{Ancestry Record|2448|111241}} and the 
            // source contains something like {{Ancestry Record|2448|0}}.
            // If this is the case we want to leave off the one from the source.
            const ancestryRecordPrefix = "{{Ancestry Record|";
            if (ref.citation.includes(ancestryRecordPrefix) && source.text.includes(ancestryRecordPrefix)) {
              var refRecordIndex = ref.citation.indexOf(ancestryRecordPrefix);
              var sourceRecordIndex = source.text.indexOf(ancestryRecordPrefix);
              // to be more thourough we could compare the numbers but for now just remove the source one
              const sourceRecordCloseIndex = source.text.indexOf("}}", sourceRecordIndex);
              var newSourceText = source.text.substring(0, sourceRecordIndex) + source.text.substring(sourceRecordCloseIndex+2, source.text.length);
              source.text = newSourceText;
            }

            // sometimes the source contains a Find A Grave link with no memorial ID. This will trigger profile suggestion 571.
            source.text = source.text.replace(" http://www.findagrave.com/cgi-bin/fg.cgi.", "");
            source.text = source.text.replace(" Note: <i>Find A Grave</i>. Find A Grave.", "");

            ref.source = source;
            source.usedByRef = true;
          }
          else if (ref.sourceId != "") {
            // this is an error, the source Id was not in the map. Add an alert message.
            // Note that a sourceId of "" can happen for residence facts with "Source" lines in them.

            // This usually happens for UK civil marriages and Pallots marriage index. It seems to be an issue with GEDCOMpare. If a person in Ancestry
            // doesn't have a marriage source for a DB but their spouse does for the same marriage then it uses the spouses record, but it fails to add the source.
            // We can repair this for the DB's that we know about.
            var haveFix = false;
            const ancestryRecordPrefix = "{{Ancestry Record|";
            if (ref.citation.includes(ancestryRecordPrefix)) {
              var refRecordIndex = ref.citation.indexOf(ancestryRecordPrefix);
              if (refRecordIndex != -1) {
                const dbStartIndex = refRecordIndex + ancestryRecordPrefix.length;
                var nextBarIndex = ref.citation.indexOf("|", dbStartIndex);
                if (nextBarIndex != -1) {
                  var dbId = ref.citation.substring(dbStartIndex, nextBarIndex);

                  const sourceDescription = ancestryDbIdMap.get(dbId);
                  if (sourceDescription != undefined) {
                    var source = new Source(ref.sourceId, sourceDescription);
                    source.usedByRef = true;
                    ref.source = source;
                    this.sourcesMap.set(ref.sourceId, source);
                    haveFix = true;
                  }
                }
              }
            }

            if (!haveFix) {
              const alertMessage = "There is no source with source id '" + ref.sourceId
                + "'. GEDCOMPare typically does this when there is a source which is a record for a different person (such as the spouse). The ref is still added but is missing the source repository data.";
              this.addAlertMessage(alertMessage);
            }
          }
        }

        if (ref.source != undefined && ref.source.text != "") {
          // sometimes there is an Ancestry template in source and one in the citation and they are duplicates
          var template1 = extractTemplate(ref.source.text, 0);
          if (template1 != undefined) {
            var nextSearchStartIndex = 0;
            var template2 = extractTemplate(ref.citation, nextSearchStartIndex);

            while (template2 != undefined) {
              if (templatesAreDuplicates(template1, template2)) {
                ref.citation = removeTemplateFromString(ref.citation, template2);
              }
              else {
                nextSearchStartIndex = template2.endIndex;
              }

              template2 = extractTemplate(ref.citation, nextSearchStartIndex);
            }
          }
        }

      }
    }

    // Removed used sources
    for (var source of this.sourcesMap.values()) {
      if (source.usedByRef) {
        var result = this.sourcesMap.delete(source.id);
        if (!result) {
          console.log("Failed to delete source with id: " + source.id);
        }
      }
    }

    //console.log("At end of embedSourceInfo:");
    //console.log(this.facts);
    //console.log(this.sourcesMap);

    return true;
  }

  embedSourceInfoForSourceFacts() {
    // source facts only occur in 2011 format (and only in early ones)
    // The source fact cusually has a spad id reference

    // Loop over all source facts and try to match up with sources and embed the soure info
    for (var fact of this.facts) {

      if (fact.factType == FactType.source) {
        if (fact.description && fact.description.startsWith("[[")) {
          let sourceId = fact.description.replace(/\[\[\#([^\]]+)\]\].*/, "$1");
          let sourceText = "";
          if (this.sourcesMap.has(sourceId)) {
            const source = this.sourcesMap.get(sourceId);
            source.text = this.replaceAncestryLinksWithTemplates(source.text);
            sourceText = source.text;
            source.usedByRef = true;
          }

          let citation = "";
          let pageText = "";

          let data = fact.extraData;
          if (data) {
            for (let line of data) {
              if (line.startsWith("Text:")) {
                let textData = line.replace(/Text\:\s*/, "");

                textData = this.replaceAncestryLinksWithTemplates(textData);
                citation += textData;
              }
              else if (line.startsWith("Page:")) {
                pageText = line.replace(/Page\:\s*/, "");
              }
            }
          }


          // We have a citation which could just be an Ancestry Family Tree template
          // plus we have the text from the source. For the case we know of we can format nicely,
          // otherwise just stick them together with a space between
          if (citation.includes ("{{Ancestry Tree")) {
            // Title: Ancestry Family Trees. Publication: Online publication - Provo, UT, USA: The Generations Network. Original data: Family Tree files submitted by Ancestry members. Note: This information comes from 1 or more individual Ancestry Family Tree files. This source citation points you to a current version of those files. Note: The owners of these tree files may have removed or changed information since this source citation was created. APID: 1030
            sourceText = sourceText.replace(/Title: Ancestry Family Trees\. Publication\: Online publication \- Provo\, UT\, USA\: The Generations Network\./, "").trim();
            sourceText = sourceText.replace(/Original data\: Family Tree files submitted by Ancestry members\./, "").trim();
            sourceText = sourceText.replace(/Note\: This information comes from 1 or more individual Ancestry Family Tree files\./, "").trim();
            sourceText = sourceText.replace(/This source citation points you to a current version of those files\./, "").trim();
            sourceText = sourceText.replace(/Note\: The owners of these tree files may have removed or changed information since this source citation was created./, "").trim();
          }
          else {
            if (citation && sourceText) {
              citation += ". ";
            }
            citation += sourceText;
          }

          citation = "* " + citation;

          // add this as an additional source line
          this.otherSourceLines.push(citation);

          fact.isHidden = true;
        }
      }
    }

    return true;
  }

  removeDuplicateRefs() {

    // first find refs where the citation and source are the same and make them won each other
    for (var fact of this.facts) {
      fact.removeDuplicateRefs();
    }

    // Now there could be multiple refs on the same fact that have the same owning ref
    // remove those
    for (var fact of this.facts) {
      fact.removeRefsOwnedBySameRef();
    }
  }

  improveAndAbbreviateLocations() {

    var countryIndexOfLastLocationOutput = -1;

    const countryStrings = [
      [ ", England", ", England, United Kingdom"],
      [ ", Wales", ", Wales, United Kingdom"],
      [ ", Scotland", ", Scotland, United Kingdom"],
      [ ", United Kingdom", "UK"],  // must come after the above countires that make up the UK
      [ ", Ireland"],
      [ ", United States", ", United States of America", ", USA"],
      [ ", Canada"],
      [ ", New Zealand"],
      [ ", Australia"],
      [ ", France"],
      [ ", Germany"],
      [ ", Austria"],
      [ ", Italy"],
      [ ", Spain"],
      [ ", Switzerland"],
      [ ", Netherlands"],
      [ ", Sweden"],
      [ ", Norway"],
      [ ", Denmark"],
      [ ", Czech Republic"],
      [ ", Hungary"],
      [ ", Mexico"],
      [ ", Peru"],
      [ ", China"],
      [ ", Japan"],
      [ ", Thailand"],
      [ ", Vietnam"],
      [ ", Taiwan"],
      [ ", French Polynesia"],
      [ ", South Africa"],
      [ ", Zimbabwe"],
    ];

    for (var fact of this.facts) {
      if (!fact.isHidden) {
        var locationString = fact.location;

        // remove trailing . or spaces
        while (locationString[locationString.length-1] == "." || locationString[locationString.length-1] == " ") {
          if (locationString.length > 1) {
            locationString = locationString.substring(0, locationString.length-1);
          }
        }

        // if there is a word character immediately after a comma then add a space
        locationString = locationString.replace(/,(\w)/g, ", $1");

        // optionally remove country if it is the same as the last one output
        if (userOptions.narrative_includeCountry != "always" || userOptions.narrative_standardizeCountry) {

          var countryIndex = -1;
          var countryString = null;
          var stdCountryString = null;
          for (var country = 0; country < countryStrings.length; country++) {
            let firstVariant = true;
            let firstVariantName = null;
            for (var variant of countryStrings[country]) {
              if (firstVariant) {
                firstVariant = false;
                firstVariantName = variant;
              }

              if (locationString.endsWith(variant)) {
                countryIndex = country;
                countryString = variant;
                if (firstVariantName && firstVariantName != variant) {
                  stdCountryString = firstVariantName;
                }
                break;
              }
            }
            if (countryIndex != -1) {
              break;
            }
          }
          if (countryIndex != -1) {
            // we found a country, decide whether to remove it
            var removeCountry = false;

            if (userOptions.narrative_includeCountry == "never") {
              removeCountry = true;
            }
            else if (userOptions.narrative_includeCountry == "first") {
              if (countryIndexOfLastLocationOutput != -1) {
                if (countryIndex == countryIndexOfLastLocationOutput) {
                  removeCountry = true;
                }
              }
            }

            if (removeCountry) {
              locationString = locationString.substring(0, locationString.length - countryString.length);
            }
            else if (stdCountryString && userOptions.narrative_standardizeCountry) {
              locationString = locationString.substring(0, locationString.length - countryString.length);
              locationString += stdCountryString;
            }

            countryIndexOfLastLocationOutput = countryIndex;
          }
        }

        fact.locationStringForBio = locationString;
      }
    }

  }

  checkForLinksInFacts() {
    for (var fact of this.facts) {
      if (fact.description.includes("http")) {
        // There is a link in the fact description, we want to remove the link and create a ref for it instead
        // We also need to fix up any "/" characters that have been removed

        const possibleLinkPrefixes = [
          ["http:/search.findmypast.co.ukrecord?", "http://search.findmypast.co.uk/record?", "Findmypast"],
          ["https:/search.findmypast.co.ukrecord?", "https://search.findmypast.co.uk/record?", "Findmypast"],
          ["http:/www.findmypast.co.uk/", "http://www.findmypast.co.uk/", "Findmypast"],
          ["https:/www.findmypast.co.uk/", "http://www.findmypast.co.uk/", "Findmypast"],
          ["http:/search.findmypast.co.uk/bnaviewarticle?", "http://search.findmypast.co.uk/bna/viewarticle?", "Findmypast British Newspaper Archive"],
          ["https:/search.findmypast.co.uk/bnaviewarticle?", "https://search.findmypast.co.uk/bna/viewarticle?", "Findmypast British Newspaper Archive"],
          ["http:/search.findmypast.co.uk/", "http://search.findmypast.co.uk/", "Findmypast"],
          ["https:/search.findmypast.co.uk/", "http://search.findmypast.co.uk/", "Findmypast"],
          ["https:/books.google.combooks?", "https://books.google.com/books?", "Google books"],
        ];

        for (const linkPrefixEntry of possibleLinkPrefixes) {

          const linkPrefix = linkPrefixEntry[0];

          if (fact.description.includes(linkPrefix)) {
            var indexOfLinkStart = fact.description.indexOf(linkPrefix);
            var indexOfLinkEnd = fact.description.indexOf(" ", indexOfLinkStart+linkPrefix.length);
            if (indexOfLinkEnd == -1) {
              indexOfLinkEnd = fact.description.indexOf(".", indexOfLinkStart+linkPrefix.length);
              if (indexOfLinkEnd == -1) {
                indexOfLinkEnd = fact.description.length;
              }
            }
            var link = fact.description.substring(indexOfLinkStart, indexOfLinkEnd);
            fact.description = fact.description.replace(link, "").trim();
            if (fact.description.length <= 2) {
              fact.description = "";
            }
            if (fact.description.includes(" .")) {
              fact.description = fact.description.replace(" .", ".");
            }
            if (fact.description.includes("..")) {
              fact.description = fact.description.replace("..", ".");
            }

            link = link.replace(linkPrefix, linkPrefixEntry[1]);

            // Now generate a new ref using this link
            const refName = "Ref for link " + link;
            const refBody = "[" + link + " " + linkPrefixEntry[2] + "]";
            var ref = new Ref(refName, refBody);
            ref.source = undefined;
            ref.citation = refBody;
            fact.refs.set(refName, ref);
          }
        }
      }
    }

  }

  checkForLinksInFileFacts() {

    // first remove any duplicate file facts.
    // Usually this would be caused by two duplicate file factSections.
    // But we may as well be thorough and remove any duplicate file facts even if in the same section.
    var foundFileFacts = [];
    for (const factSection of this.factSectionArray) {
      for (var factIndex = 0; factIndex < factSection.fileFacts.length; factIndex++) {
        const fact = factSection.fileFacts[factIndex];
        var foundDuplicate = false;
        for (var foundFact of foundFileFacts) {
          if (foundFact.fileLink == fact.fileLink &&
            foundFact.description == fact.description
            && foundFact.fileFormat == fact.fileFormat) {
            foundDuplicate = true;
            break;
          }
        }
        if (foundDuplicate) {
          factSection.fileFacts.splice(factIndex, 1);
          factIndex--;
        }
        else {
          foundFileFacts.push(fact);
        }
      }
    }

    for (const factSection of this.factSectionArray) {
      for (var fact of factSection.fileFacts) {
        if (fact.fileLink.includes("http")) {
          // Have seen cases where the file lines look like this:
          // '''File'''
          // File: http:\/trees.ancestry.comrd?f=image&guid=500e04a1-04b5-4f60-94a3-e20202dc69d0&tid=168113710&pid=20.
          // Format: com/rd?f=image&guid=500e04a1-04b5-4f60-94a3-e20202dc69d0&tid=168113710&pid=20.
          // WilliamMclean1901Census
          // PHOTO
          // Scrapbook: Y.
          var link = fact.fileLink;
          link = removeTrailingPeriodAndSpaces(link);
          link = link.replace("\\\/", "//");
          link = link.replace("\.comr", ".com/r");
          fact.fileLink = link;
          if (fact.fileFormat.length > 10) {
            var newFormat = "";
            const prefix = "com/rd?f=";
            if (fact.fileFormat.startsWith(prefix)) {
              const ampIndex = fact.fileFormat.indexOf("&");
              if (ampIndex != -1) {
                newFormat = fact.fileFormat.substring(prefix.length, ampIndex);
              }
            }
            fact.fileFormat = newFormat;
          }
        }
      }
    }
  }

  tryToSeparateResidenceFactsWithMultipleRefs() {

    var newFacts = [];

    for (var fact of this.facts) {

      if (fact.factType == FactType.residence) {
        if (!fact.isHidden && fact.refs.size > 1) {

          // if any of the refs have matching ResidenceData then make them their own fact.

          // we will construct an array of objects where each one stores: matchingResidenceData, array of refs using this residenceData.
          var matchingResidenceDataArray = [];

          for (var ref of fact.refs.values()) {
            var matchingResidenceData = ref.getMatchingResidenceData();

            var isAlreadyInArray = false;
            for (var data of matchingResidenceDataArray) {
              if (data.residenceData == matchingResidenceData) {
                // add this to the list of refs for this residence data
                data.refs.push(ref);
                isAlreadyInArray = true;
              }
            }

            if (!isAlreadyInArray) {
              matchingResidenceDataArray.push({ residenceData: matchingResidenceData, refs: [ ref ]})
            }
          }

          if (matchingResidenceDataArray.length > 1) {
            // we want to add new facts and move some refs to the new facts
            for (var data of matchingResidenceDataArray) {
              var refs = new Map;
              for (ref of data.refs) {
                refs.set(ref.name, ref);
              }
              var newFact = new Fact(fact.factDate.bioString, fact.location, fact.description, refs, [], fact.sectionName, fact.factType);
              newFacts.push(newFact);
            }
            fact.isHidden = true;
          }
        }
      }

    }

    if (newFacts.length > 0) {
      for (var fact of newFacts) {
        this.facts.push(fact);
      }

      this.facts.sort(Biography.compareFacts);
    }
  }

  handleFactsWithNoDatePass2() {
    var datesChanged = false;

    for (var fact of this.facts) {

      if (!fact.factDate.isValid && fact.factType != FactType.name && !fact.isHidden && !fact.owningFact) {
        // this fact has no valid date, it is not a name and is not hidden

        if (fact.extractDateFromSourceOrCitation()) {
          datesChanged = true;
          continue;
        }

        var ownsOtherRefs = false;
        var hasOwnedRefs = false;
        var hasRefsWithBody = false;
        
        for (var ref of fact.refs.values()) {
          if (ref.owningRef) {
            hasOwnedRefs = true;
          }
          else {
            hasRefsWithBody = true;
          }
          if (ref.ownedRefs.length > 0) {
            ownsOtherRefs = true;
          }
        }

        var nowHasValidDate = false;
        if (hasOwnedRefs) {
          // if we can find another fact with a date that has the same refs then we can just change the date to the same as that fact
          for (var ref of fact.refs.values()) {
            if (ref.owningRef) {
              for (var otherFact of this.facts) {
                if (otherFact != fact && otherFact.factDate.isValid) {
                  for (var otherRef of otherFact.refs.values()) {
                    if (ref.owningRef == otherRef) {
                      // it looks good but this doesn't make sense to do for certain fact types
                      if (!(fact.factType == FactType.birth && otherFact.factType != FactType.birth)) {
                        fact.factDate = otherFact.factDate;
                        const dateString = otherFact.getDateStringForOutput();
                        this.addAlertMessage("A fact of type '" + fact.sectionName + "' had no date but shared a ref with a '" + otherFact.sectionName + "' fact with the date '" + dateString + "'. So the fact with no date had its date set to that.")
                        nowHasValidDate = true;
                        datesChanged = true;
                        break;
                      }
                    }
                  }
                }
              }
            }

            if (nowHasValidDate) {
              break;
            }
          }
        }

        // OK, so we could not handle it using an owningRef.
        // TBD

        if (hasRefsWithBody) {
          var otherFactWithSameRecordId;
          var otherFactWithSameDbId;
          var otherFactWithSameSource;

          for (var ref of fact.refs.values()) {
            if (!ref.owningRef) {
              for (var otherFact of this.facts) {
                if (otherFact != fact && otherFact.factDate.isValid) {

                  // Some records mention the birth date but are not related to an event on the birth date. So if this fact
                  // is not a birth and the other fact is then ignore it
                  if (fact.factType != FactType.birth && otherFact.factType == FactType.birth) {
                    continue;
                  }

                  for (var otherRef of otherFact.refs.values()) {
                    while (otherRef.owningRef != undefined) {
                      otherRef = otherRef.owningRef;
                    }

                    const thisCitationParsed = parseAncestryCitation(ref.citation);
                    const otherCitationParsed = parseAncestryCitation(otherRef.citation);

                    if (thisCitationParsed.recordId != undefined && thisCitationParsed.recordId == otherCitationParsed.recordId) {
                      otherFactWithSameRecordId = otherFact;
                    }
                    
                    if (thisCitationParsed.dbId != undefined && thisCitationParsed.dbId == otherCitationParsed.dbId) {
                      otherFactWithSameDbId = otherFact;
                    }

                    if (ref.sourceId != "" && ref.sourceId == otherRef.sourceId) {
                      // they are using the same source, if this is a residence and the other fact is a marriage then use the marriage date
                      if (fact.factType == FactType.residence && otherFact.factType == FactType.marriage) {
                        otherFactWithSameSource = otherFact;
                      }
                    }
                  }
                }
              }
            }
          }

          var factToTakeDateFrom;
          var shareType = "";
          if (otherFactWithSameRecordId != undefined) {
            factToTakeDateFrom = otherFactWithSameRecordId;
            shareType = "record ID";
          }
          else if (otherFactWithSameDbId != undefined) {
            factToTakeDateFrom = otherFactWithSameDbId;
            shareType = "DB ID";
          }
          else if (otherFactWithSameSource != undefined) {
            factToTakeDateFrom = otherFactWithSameSource;
            shareType = "source";
          }

          if (factToTakeDateFrom != undefined) {
            fact.factDate = factToTakeDateFrom.factDate;
            const dateString = factToTakeDateFrom.getDateStringForOutput();
            this.addAlertMessage("A fact of type '" + fact.sectionName + "' had no date but shared a " + shareType + " with a '" + factToTakeDateFrom.sectionName + "' fact with the date '" + dateString + "'. So the fact with no date had its date set to that.")
            nowHasValidDate = true;
            datesChanged = true;
          }

          if (nowHasValidDate) {
            break;
          }
        }
      }
    }

    if (datesChanged) {
      this.facts.sort(Biography.compareFacts);
    } 
  }

  generateBio() {
    var writer = new BiographyWriter(this);
    writer.writeBioText();
    return writer.text;
  }

  useMoreAccurateDates() {

    var datesChanged = false;

    for (var fact of this.facts) {

      if (fact.factType == FactType.residence && fact.refs.size == 1) {

        const ref = fact.refs.values().next().value;  // first element in Map

        const matchingResidenceData = ref.getMatchingResidenceData();

        if (matchingResidenceData != undefined) {
          if (fact.factDate.year == matchingResidenceData.year) {
            var factDate = new FactDate(matchingResidenceData.actualDate);
            if (factDate.isValid && fact.factDate.bioString != factDate.bioString && factDate.month != 0) {
              //console.log("useMoreAccurateDates: replacing residence date " + fact.factDate.bioString + " with " + factDate.bioString);
              fact.factDate = factDate;
              datesChanged = true;
            }
          }
        }
        
      }
    }

    if (datesChanged) {
      this.facts.sort(Biography.compareFacts);
    }
  }

  getFirstFactOfFactType(factType) {
    const factSection = this.factSectionMap.get(factType);
    if (factSection != undefined && factSection.facts.length > 0) {
      return factSection.facts[0];
    }
    return undefined;
  }

  getLastNameOnDate(factDate) {
    if (this.personGender == "Male") {
      return this.currentLastName;
    }

    var lastName = this.lnab;

    for (var fact of this.facts) {
      if (!fact.isHidden && fact.factDate.isValid) {
        const dateCompare = FactDate.compareDates(factDate, fact.factDate);
        if (dateCompare < 0) {
          return lastName;
        }
      }

      if (fact.factType == FactType.marriage) {
        const husbandName = fact.marriageHusband;
        if (husbandName != undefined && husbandName != "") {
          lastName = husbandName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
        }
      }
    }

    return lastName;
  }

  getLastNameBeforeMarriage(marriageFact) {
    if (this.personGender == "Male") {
      return this.currentLastName;
    }

    var lastName = this.lnab;

    for (var fact of this.facts) {
      if (!fact.isHidden && fact.factDate.isValid) {
        const dateCompare = FactDate.compareDates(marriageFact.factDate, fact.factDate);
        if (dateCompare <= 0) {
          // This other marriage is later or the same date
          const daysBetween = fact.factDate.absDaysBetweenDates(marriageFact.factDate);

          return lastName;
        }

        if (fact.factType == FactType.marriage) {
          const husbandName = fact.marriageHusband;
          if (husbandName != undefined && husbandName != marriageFact.husbandName) {
            lastName = husbandName.replace(/.*[^ ]+ ([^ ]+)$/, "$1");
          }
        }
      }
    }

    return lastName;
  }

  checkForMultipleFactsOfATypeThatShouldBeUnique(factType, factTypeName, profileFieldDate) {
    // check for multiple birth/death/etc facts
    const factSection = this.factSectionMap.get(factType);

    const profileFieldFactDate = new FactDate(profileFieldDate);

    if (factSection != undefined && factSection.facts.length > 0) {
      this.preferredFactMap.set(factType, factSection.facts[0]);
    }

    if (factSection != undefined && factSection.facts.length > 1) {
      // There are multiple facts of this type
      var hasMultipleDates = false;
      var firstDate = "";
      var hasMultipleLocations = false;
      var firstLocation = "";
      var preferredFact = undefined;

      var allFactData = [];

      for (var fact of factSection.facts) {
        if (fact.isHidden) {
          continue;
        }

        if (fact.factDate.isValid) {
          const cleanDate = fact.getCleanDateForOtherFields();
          if (firstDate == "") {
            firstDate = cleanDate;
          }
          else if (firstDate != cleanDate) {
            hasMultipleDates = true;
          }

          const cleanFactDate = new FactDate(cleanDate);
          if (cleanFactDate.bioString == profileFieldFactDate.bioString && preferredFact == undefined) {
            preferredFact = fact;
          }
        }

        var location = fact.location;
        if (location != "") {
          if (firstLocation == "") {
            firstLocation = location;
          }
          else if (firstLocation != location) {
            hasMultipleLocations = true;
          }
        }

        // check if we already have an exact same entry in which case we don't add it
        var isDuplicate = false;
        for (var factData of allFactData) {
          if (factData.date.bioString == fact.factDate.bioString && factData.location == location) {
            if (factData.description == fact.description && factData.extraData == fact.extraData) {
              isDuplicate = true;
            }
          }
        }

        if (!isDuplicate) {
          allFactData.push({ 'date': fact.factDate, 'location': location,
           'description': fact.description, 'extraData': fact.extraData });
        }
      }

      if (preferredFact == undefined) {
        preferredFact = factSection.facts[0];
      }

      this.preferredFactMap.set(factType, preferredFact);

      // ensure the preferred fact has a location (if it is missing one and one of the other facts has one)
      if (preferredFact.location == "" && firstLocation != "") {
        preferredFact.location = firstLocation;
      }

      // hide all the other facts and move their references to the preferred fact
      for (var fact of factSection.facts) {
        if (fact != preferredFact) {
          fact.isHidden = true;
          this.combineRefsOnCombinedFacts(preferredFact, fact);
        }
      }

      var alertString = "There is more than one " + factTypeName + " fact. ";
      if (hasMultipleDates) {
        if (hasMultipleLocations) {
          alertString = alertString.concat("They have different dates and locations. ");
        }
        else {
          alertString = alertString.concat("They have different dates. ");
        }
      }
      else {
        if (hasMultipleLocations) {
          alertString = alertString.concat("They have different locations. ");
        }
        else {
          alertString = alertString.concat("They all have the same date and location. ");
        }
      }
      alertString = alertString.concat("Using " + factTypeName + " date of ", preferredFact.getDateStringForOutput(), " and location of ", preferredFact.location);

      // add a list of all the facts of this type
      if (hasMultipleDates || hasMultipleLocations) {
        for (var factData of allFactData) {
          alertString = alertString.concat("\n**");
          var dateString = factData.date.bioString;
          if (dateString == "") {
            dateString = "none";
          }
          alertString = alertString.concat(" Date: ", dateString);

          var locationString = factData.location;
          if (locationString == "") {
            locationString = "none";
          }
          alertString = alertString.concat(", Location: ", locationString);

          var description = factData.description;
          if (description != undefined && description != "") {
            alertString = alertString.concat("\n*** Description: ", description);
          }

          var extraData = factData.extraData;
          if (extraData != undefined && extraData.length != 0) {
            for (let dataLine of extraData) {
              alertString = alertString.concat("\n*** ", dataLine);
            }
          }
        }
      }

      this.addAlertMessage(alertString)
    }
  }

  checkForMultipleBirthFacts() {
    this.checkForMultipleFactsOfATypeThatShouldBeUnique(FactType.birth, "birth", this.birthDate);
  }

  checkForMultipleDeathFacts() {
    this.checkForMultipleFactsOfATypeThatShouldBeUnique(FactType.death, "death", this.deathDate);
  }

  checkCurrentLastName(result) {
    if (this.personGender == "Female" && this.currentLastName != undefined) {
      const lnab = this.lnab;

      // we want to traverse the marriages in sorted order and collect the marriages
      var husbandNames = [];
      var lastHusbandName = "";

      var numValidMarriages = 0;
      for (var fact of this.facts) {
        if (fact.factType == FactType.marriage && !fact.suspectMarriage) {
          var husband = fact.marriageHusband;
          if (husband != undefined && husband != "" && husband[0] != "@") {

            if (husband.startsWith("[[")) {
              husband = husband.replace(/\[\[[^\|\]]*\|([^\]]*)\]\]/, "$1");
            }

            husbandNames.push(husband);
            lastHusbandName = husband;
          }
          else {
            lastHusbandName = "";
          }

          numValidMarriages++;
        }
      }

      if (lastHusbandName != "") {
        if (!lastHusbandName.endsWith(this.currentLastName)) {
          if (lnab == this.currentLastName) {
            if (userOptions.otherFields_useLastHusbandNameForCurrentLastName) {
              const lastSpaceIndex = lastHusbandName.trim().lastIndexOf(" ");
              const lastHusbandLastName = lastHusbandName.substr(lastSpaceIndex+1);
              result.currentLastName = lastHusbandLastName;
              if (userOptions.researchNotes_issueForClnToLastHusband) {
                this.addAlertMessage("Changed '''Current Last Name''' from LNAB of '" + this.currentLastName
                  + "' to the last name '" + lastHusbandLastName + "' of the last husband '" + lastHusbandName + "'.")
              }
            }
            else {
              this.addAlertMessage("The profile '''Current Last Name''' of '" + this.currentLastName
                + "' is the same as the '''Last Name at Birth''' but there are marriage facts. The last husband's name is '" + lastHusbandName + "'.")
            }
          }
          else {
            // the name of the last husband is not the same as the current last name
            this.addAlertMessage("The profile '''Current Last Name''' of '" + this.currentLastName + "' does not match the last name of the last husband '" + lastHusbandName + "'.")
          }
        }
      }
      else {
        if (numValidMarriages > 0) {
          if (lnab == this.currentLastName) {
            // the current last name is the same as last name at birth but there are marriage facts
            this.addAlertMessage("The profile '''Current Last Name''' of '" + this.currentLastName + "' is the same as the '''Last Name at Birth''' but there are marriage facts.")
          }
        }
        else {
          if (lnab != this.currentLastName) {
            // the current last name is not the same as last name at birth but there are no marriages
            this.addAlertMessage("The profile '''Current Last Name''' of '" + this.currentLastName + "' is not the same as the '''Last Name at Birth''' of '" + lnab + "' but there are no marriage facts.")
          }
        }
      }
    }
  }

  checkForAdditionalIssues() {

    this.checkForMultipleBirthFacts();
    this.checkForMultipleDeathFacts();

    var previousMarriageFact = undefined;

    for (var fact of this.facts) {

      if (fact.isHidden) {
        continue;
      }

      if (fact.factType == FactType.residence) {
        if (fact.refs.size > 1) {
          // if they all have the same matching residence data then it is not an issue
          var haveDifferentMatchingResidenceData = false;
          var matchingResidenceData = undefined;
          var isFirst = true;
          for (var ref of fact.refs.values()) {
            if (isFirst) {
              isFirst = false;
              matchingResidenceData = ref.getMatchingResidenceData();
            }
            else {
              var thisMatchingResidenceData = ref.getMatchingResidenceData();
              if (thisMatchingResidenceData != matchingResidenceData) {
                haveDifferentMatchingResidenceData = true;
                break;
              }
            }
          }

          if (haveDifferentMatchingResidenceData) {
            const dateString = fact.getDateStringForOutput();
            this.addAlertMessage("There is more than one reference for a residence fact on date '" + dateString + "'. Check if that date is correct for both events. Sometimes they should be separate narrative events.")
          }
        }
      }

      if (fact.factType == FactType.marriage) {
        if (previousMarriageFact != undefined) {
          const daysBetweenMarriages = fact.absDaysBetweenFacts(previousMarriageFact);
          if (daysBetweenMarriages < 60) {
            const thisMarriageDateString = fact.getDateStringForOutput();
            const otherMarriageDateString = previousMarriageFact.getDateStringForOutput();
            if (daysBetweenMarriages == 0) {
              this.addAlertMessage("There are two marriages on the same date. Check if these are the same marriage. Marriage date is " + thisMarriageDateString + ".");
            }
            else {
              this.addAlertMessage("There are two marriages only " + daysBetweenMarriages + " days apart. Check if these are the same marriage. First is on "
                + otherMarriageDateString + " and second is on " + thisMarriageDateString + ".");
            }
          }
        }
        previousMarriageFact = fact;
      }
    }
  }

  compareRefAccuracy(ref1, ref2, dataSet) {
    var ref1DateAccuracy = DateAccuracy.none;
    var ref2DateAccuracy = DateAccuracy.none;

    const ref1Data = ref1.getMatchingSourceData(dataSet);
    const ref2Data = ref2.getMatchingSourceData(dataSet);

    if (ref1Data != undefined && ref1Data.dateAccuracy != undefined) {
      ref1DateAccuracy = ref1Data.dateAccuracy;
    }
    
    if (ref2Data != undefined && ref2Data.dateAccuracy != undefined) {
      ref2DateAccuracy = ref2Data.dateAccuracy;
    }

    return ref1DateAccuracy - ref2DateAccuracy; 
  }

  analyzeAndNameReferences() {

    // if references_named option is "minimal" or "selective" then we store a date with each primary ref
    if (userOptions.references_named == "minimal" || userOptions.references_named == "selective") {
      for (var fact of this.facts) {
        for (var ref of fact.refs.values()) {
          if (!ref.owningRef) {
            ref.factDate = fact.factDate;
          }
        }
      }
    }

    for (var fact of this.facts) {

      if (fact.isHidden || fact.owningFact != undefined) {
        continue;
      }

      if (userOptions.references_named == "multiple_use" || userOptions.references_named == "all") {
        // secondary refs are always used, the all option is tested later to force name on all refs
        for (var ref of fact.refs.values()) {
          if (ref.owningRef) {
            ref.generateRef = true;
            ref.owningRef.primaryRefNeedsName = true;
          }
        }
        continue;
      }    
      if (userOptions.references_named == "never") {
        // secondary refs are never used
        continue;
      }

      // We only get this far for "minimal" and "selective"

      // First scan the refs to see if there are any primary refs. Primary refs are the ones where the
      // ref body was moved to (or started) on this fact. They can be identified by whether owningRef is undefined.
      // Also record the first ref
      var firstRef = undefined;
      var firstPrimaryRef = undefined;
      var firstSecondaryRef = undefined;
      for (var ref of fact.refs.values()) {
        if (firstRef == undefined) {
          firstRef = ref;
        }

        if (!ref.owningRef && firstPrimaryRef == undefined) {
          firstPrimaryRef = ref;
        }

        if (ref.owningRef && firstSecondaryRef == undefined) {
          firstSecondaryRef = ref;
        }
      }

      if (firstSecondaryRef == undefined) {
        continue; // nothing to do here
      }

      if (userOptions.references_named == "minimal" && firstPrimaryRef != undefined) {
        // there is a primary ref so never used secondary refs in the "minimal" option
        continue;
      }

      // Now we are either using "selective" or "minimal". If "minimal" then we must output 
      // at least one secondary ref. Otherwise we treat them the same.

      const isBirth = fact.factType == FactType.birth;
      const isDeath = fact.factType == FactType.death;

      if (!isBirth && !isDeath) {
        // no accuracy tests, if no primary ref, add all the refs since we have no way to select the "best"
        if (firstPrimaryRef == undefined) {
          for (var ref of fact.refs.values()) {
            if (ref.owningRef) {
              ref.generateRef = true;
              ref.owningRef.primaryRefNeedsName = true;
            }
          }
        }

        continue;
      }

      //console.log("analyzeAndNameReferences. Is birth or death. FactSection=" + fact.sectionName + ", firstPrimaryRef=" + firstPrimaryRef);

      // if we get here then it is a birth or death record and ref naming option is "minimal" or "selective"
      const dataSet = (isBirth) ? birthDateAccuracyDataSet : deathDateAccuracyDataSet;

      var bestRefForDate = undefined; 
      var bestRefForLocation = undefined; 
      for (var ref of fact.refs.values()) {
        var data = (ref.owningRef != undefined) ? ref.owningRef.getMatchingSourceData(dataSet) :  ref.getMatchingSourceData(dataSet);
        if (data == undefined) {
          data = { 'dateAccuracy': DateAccuracy.none, 'locationAccuracy': LocationAccuracy.none }
        }
        var dateAccuracy = data.dateAccuracy;
        var locationAccuracy = data.locationAccuracy;
        const dateOfPrimaryFact = (ref.owningRef == undefined) ? ref.factDate : ref.owningRef.factDate;

        var thisIsNewBestDate = false;
        if (bestRefForDate == undefined) {
          thisIsNewBestDate = true;
        }
        else if (dateAccuracy > bestRefForDate.dateAccuracy) {
          thisIsNewBestDate = true;
        }
        else if (dateAccuracy == bestRefForDate.dateAccuracy) {
          const dateCompare = FactDate.compareDates(dateOfPrimaryFact, bestRefForDate.dateOfPrimaryFact);
          if (dateCompare < 0) {
            thisIsNewBestDate = true;
          }
          else if (dateCompare == 0) {
            if (locationAccuracy > bestRefForDate.locationAccuracy) {
              thisIsNewBestDate = true;
            }
          }
        }

        var thisIsNewBestLocation = false;
        if (bestRefForLocation == undefined) {
          thisIsNewBestLocation = true;
        }
        else if (locationAccuracy > bestRefForLocation.locationAccuracy) {
          thisIsNewBestLocation = true;
        }
        else if (locationAccuracy == bestRefForLocation.locationAccuracy) {
          const dateCompare = FactDate.compareDates(dateOfPrimaryFact, bestRefForDate.dateOfPrimaryFact);
          if (dateCompare < 0) {
            thisIsNewBestLocation = true;
          }
          else if (dateCompare == 0) {
            if (dateAccuracy > bestRefForLocation.dateAccuracy) {
              thisIsNewBestLocation = true;
            }
          }
        }

        //console.log("analyzeAndNameReferences. ref.name" + ref.name + ", thisIsNewBestDate=" + thisIsNewBestDate + ", thisIsNewBestLocation=" + thisIsNewBestLocation);

        if (thisIsNewBestDate) {
          bestRefForDate = { 'dateAccuracy': dateAccuracy, 'locationAccuracy': locationAccuracy, 'dateOfPrimaryFact': dateOfPrimaryFact, 'ref': ref };
        }
        if (thisIsNewBestLocation) {
          bestRefForLocation = { 'dateAccuracy': dateAccuracy, 'locationAccuracy': locationAccuracy, 'dateOfPrimaryFact': dateOfPrimaryFact, 'ref': ref };
        }
      }

      // if a primary ref was selected for date, no need to do anything
      if (bestRefForDate.ref.owningRef != undefined) {
        bestRefForDate.ref.generateRef = true;
        bestRefForDate.ref.owningRef.primaryRefNeedsName = true;
      }

      if (bestRefForLocation.ref.owningRef != undefined && bestRefForDate != bestRefForLocation && userOptions.references_named == "selective") {
        bestRefForLocation.ref.generateRef = true;
        bestRefForLocation.ref.owningRef.primaryRefNeedsName = true;
      }
    }

    var usedNames = new Set;
    // now go through all the primary refs on all facts and, if they need names, generate them.
    for (var fact of this.facts) {
      if (fact.isHidden || fact.owningFact != undefined) {
        continue;
      }

      for (var ref of fact.refs.values()) {

        if (userOptions.references_named == "all" && ref.owningRef == undefined) {
          ref.primaryRefNeedsName = true;
        }

        if (ref.primaryRefNeedsName) {
          let nameBase = fact.getSectionNameForSourceTitle(ref).toLowerCase();

          // There is a length limit of 80 characters for refnames. Since we could add upto 3 characters impose a
          // limit of 77 on nameBase
          while (nameBase.length > 77) {
            let lastSpaceIndex = nameBase.lastIndexOf(" ");
            if (lastSpaceIndex != -1) {
              nameBase = nameBase.substring(0, lastSpaceIndex);
            }
          }
          if (nameBase.length > 77) {
            nameBase = nameBase.substring(0, 77);
          }

          var nameCandidate = nameBase;

          var suffix = 1;
          while (usedNames.has(nameCandidate)) {
            suffix++;
            nameCandidate = nameBase + " " + suffix;
          }

          ref.outputName = nameCandidate;
          usedNames.add(nameCandidate);
        }
      }
    }
  }

  improveFirstPrefAndMiddleNames(result) {

    // Note: this causes issues for some countries (such as Sweden) where middle names
    // are not used and multiple first names are normal.
    // So the fix is to say that this is not done unless:
    // 1. It is an old format profile, and
    // 2. THe birth is in England

    function getCountryFromLocation(location) {
      var country = location.replace(/^.*\, *([^\,\.]+)[ \.]*$/,"$1");
      if (country != location) {
        country = country.trim().toLowerCase();
        return country;
      }
      return "";
    }

    function isLocationValidForMiddleNames(location) {
      var result = false;
      if (location != undefined && location != "") {
        const country = getCountryFromLocation(location);
        if (country == "england" || country == "united kingdom") {
          result = true;
        }
        else if (country == "usa" || country == "united states" || country == "united states of america") {
          result = true;
        }
      }
      return result;
    }

    if (this.format != BioFormat.format2011) {
      return;
    }

    if (userOptions.dataFields_moveNamesFromFirstToMiddle == "never") {
      return;
    }

    var countryValidForMiddleNames = false;

    if (isLocationValidForMiddleNames(this.birthLocation)) {
      countryValidForMiddleNames = true;
    }
    else if (isLocationValidForMiddleNames(this.deathLocation)) {
      countryValidForMiddleNames = true;
    }
    else {
      for (var fact of this.facts) {
        if (isLocationValidForMiddleNames(fact.location)) {
          countryValidForMiddleNames = true;
        }
      }
    }

    if (!countryValidForMiddleNames) {
      return;
    }

    var newFirstName = this.firstName;
    var newPrefName = this.prefName;
    var newMiddleName = this.middleName;

    var firstNameArray = this.firstName.split(" ");

    if (firstNameArray.length > 1) {
      // there are multiple first names
      newFirstName = firstNameArray[0];

      var alertMessage = "Multiple names found in '''Proper First Name''' field. Changed from '"
          + this.firstName + "' to '" + newFirstName + "'."

      if (this.firstName == this.prefName) {
        newPrefName = newFirstName;

        alertMessage += " Same for '''Preferred Name''' field."
      }

      // add the remaining first names at the start of the middle names
      var middleNameArray = this.middleName.split(" ");
      var namesToAddAtStartOfMiddleName = "";
      for (var name of firstNameArray) {
        if (name != newFirstName) {
          const index = middleNameArray.findIndex(element => element == name);
          if (index == -1) {
            if (namesToAddAtStartOfMiddleName.length != 0) {
              namesToAddAtStartOfMiddleName += " ";
            }
            namesToAddAtStartOfMiddleName += name
          }
        }
      }
      if (namesToAddAtStartOfMiddleName != "") {
        if (newMiddleName.length != 0) {
          newMiddleName = " " + newMiddleName;
        }
        newMiddleName = namesToAddAtStartOfMiddleName + newMiddleName;
      }

      if (newMiddleName != this.middleName) {
        alertMessage += " Changed '''Middle Name''' field to '" + newMiddleName + "'.";
      }

      this.addAlertMessage(alertMessage);
    }

    this.firstName = newFirstName;
    result.firstName = newFirstName;
    this.prefName = newPrefName;
    result.prefName = newPrefName;
    this.middleName = newMiddleName;
    result.middleName = newMiddleName;
  }

  improveOtherFields(result) {

    if (userOptions.otherFields_useBaptismForBirthDate) {
      // check birth date
      var currBirthDate = this.birthDate;
      const birthFact = this.getFirstFactOfFactType(FactType.birth);
      const baptismFact = this.getFirstFactOfFactType(FactType.baptism);

      if (baptismFact)
      {
        const bapDate = baptismFact.getCleanDateForOtherFields();

        if (birthFact) {
          // If there is a birth fact that suggests that there was a source attached to the birth fact in Ancestry.
          // That could be for a burial (which is not exact, or could be from a document like the 1939 Register which is exact)
          // Currently we still replace with 'before' the baptism date if the birth date is just a year and same year as baptism.
        }

        //console.log("Birth date is '" + currBirthDate + "' bap date is '" + bapDate +"'");

        if (currBirthDate.length == 4 && bapDate.length > 4) {
          // the baptism date may be more accurate, the birth date is just a year
          const birthYear = parseInt(currBirthDate);
          const baptismYear = parseInt(bapDate.substring(bapDate.length-4));
          if (!isNaN(birthYear) && !isNaN(baptismYear)) {
            const yearDiff = Math.abs(baptismYear - birthYear);
            if (yearDiff <= 1) {
              // they are within a year of each other
              // so, if the baptism date is a good date we should use it and mark birth date as "before" this date
              if (bapDate[0] >= '0' && bapDate[0] <= '9') {
                //console.log("Replacing birth date of " + currBirthDate + " with baptism date of " + bapDate);
                result.birthDate = bapDate;
                result.birthDateIsBefore = true;

                if (userOptions.researchNotes_issueForBirthToBeforeBaptism) {
                  this.addAlertMessage("Changed birth date from '" + currBirthDate + "' to 'before' the baptism date of '" + bapDate + "'.");
                }

                // We should also change the birth date in the biography if possible
                const birthFactSection = this.factSectionMap.get(FactType.birth);
                if (birthFactSection != undefined && birthFactSection.facts.length > 0) {
                  const birthFact = birthFactSection.facts[0];
                  var birthFactDate = birthFact.factDate;
                  if (birthFactDate.qualifier == DateQualifiers.about) {
                    const yearDiff = Math.abs(baptismYear - birthFactDate.year);
                    if (yearDiff <= 1) {
                      birthFactDate = Object.assign(birthFactDate, baptismFact.factDate);
                      birthFactDate.qualifier = DateQualifiers.before;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (userOptions.otherFields_useBurialForDeathDate) {
        // check death date
      var currDeathDate = this.deathDate;
      const deathFact = this.getFirstFactOfFactType(FactType.death);
      const burialFact = this.getFirstFactOfFactType(FactType.burial);

      if (burialFact)
      {
        const burDate = burialFact.getCleanDateForOtherFields();

        // Currently we ignore whether there is a death date (see comments on baptism above)

        // console.log("Death date is '" + currDeathDate + "' bur date is '" + burDate +"'");

        if (currDeathDate.length == 4 && burDate.length > 4) {
          // the burial date may be more accurate, the death date is just a year
          const deathYear = parseInt(currDeathDate);
          const burialYear = parseInt(burDate.substring(burDate.length-4));
          if (!isNaN(deathYear) && !isNaN(burialYear)) {
            const yearDiff = Math.abs(burialYear - deathYear);
            if (yearDiff <= 1) {
              // they are within a year of each other
              // so, if the burial date is a good date we should use it and mark death date as "before" this date
              if (burDate[0] >= '0' && burDate[0] <= '9') {
                //console.log("Replacing death date of " + currDeathDate + " with burial date of " + burDate);
                result.deathDate = burDate;
                result.deathDateIsBefore = true;

                if (userOptions.researchNotes_issueForDeathToBeforeBurial) {
                  this.addAlertMessage("Changed death date from '" + currDeathDate + "' to 'before' the burial date of '" + burDate + "'.");
                }

                // We should also change the death date in the biography if possible
                const deathFactSection = this.factSectionMap.get(FactType.death);
                if (deathFactSection != undefined && deathFactSection.facts.length > 0) {
                  const deathFact = deathFactSection.facts[0];
                  var deathFactDate = deathFact.factDate;
                  if (deathFactDate.qualifier == DateQualifiers.about) {
                    const yearDiff = Math.abs(burialYear - deathFactDate.year);
                    if (yearDiff <= 1) {
                      deathFactDate = Object.assign(deathFactDate, burialFact.factDate);
                      deathFactDate.qualifier = DateQualifiers.before;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    this.checkCurrentLastName(result);
  }
}

export function editBio(editBioInput) {

  //console.log("editBioInput:");
  //console.log(editBioInput);
  
  var biography = new Biography(editBioInput.bioText);

  biography.wikiId = editBioInput.wikiId;
  biography.birthDate = editBioInput.birthDate;
  biography.birthLocation = editBioInput.birthLocation;
  biography.deathDate = editBioInput.deathDate;
  biography.deathLocation = editBioInput.deathLocation;
  biography.personGender = editBioInput.personGender;
  biography.firstName = editBioInput.firstName;
  biography.prefName = editBioInput.prefName;
  biography.middleName = editBioInput.middleName;
  biography.currentLastName = editBioInput.currentLastName;
  biography.runDate = editBioInput.runDate;
  biography.parents = editBioInput.parents;
  userOptions = editBioInput.options;

  //console.log("Options:");
  //console.log(userOptions);

  var result = {
      'succeeded' : false,
      'bioText' : "",
      'birthDate' : editBioInput.birthDate,
      'birthDateIsBefore' : editBioInput.birthDateIsBefore,
      'deathDate' : editBioInput.deathDate,
      'deathDateIsBefore' : editBioInput.deathDateIsBefore,
      'firstName' : editBioInput.firstName,
      'prefName' : editBioInput.prefName,
      'middleName' : editBioInput.middleName,
      'currentLastName' : editBioInput.currentLastName,
  }

  if (!biography.doSanityChecks()) {
    result.errorMessage = biography.errorMessage;
    return result;
  }
  //console.log("Passed sanity tests");

  // get LNAB from wiki Id
  const endOfNameIndex = biography.wikiId.indexOf("-");
  if (endOfNameIndex == -1) {
    result.errorMessage = "Wiki ID does not contain a hyphen";
    return result;
  }
  biography.lnab = biography.wikiId.substring(0, endOfNameIndex);

  biography.detectBioFormat();
  //console.log("biography.format = " + biography.format);

  if (biography.format == BioFormat.format2020) {
    const parseStatus = biography.parseBio();
    if (!parseStatus) {
      console.log("parseBio failed");
      result.errorMessage = biography.errorMessage;
      return result;
    }
  }
  else if (biography.format == BioFormat.format2011) {
    const parseStatus = biography.parseBioFormat2011();
    if (!parseStatus) {
      console.log("parseBioFormat2011 failed");
      result.errorMessage = biography.errorMessage;
      return result;
    }
  }
  else {
    result.errorMessage = "Unknown biography format.";
    return result;
  }

  biography.removeDuplicateFacts();

  if (!biography.embedSourceInfoForSourceFacts()) {
    console.log("embedSourceInfoForSourceFacts failed");
    return result;
  }

  biography.findEarliestAndLatestDates();

  biography.handleFactsWithNoDatePass1();

  biography.handleDuplicateMarriages();

  if (!biography.consolidateRefs()) {
    console.log("consolidateRefs failed");
    return result;
  }

  if (!biography.embedSourceInfo()) {
    console.log("embedSourceInfo failed");
    return result;
  }

  // Not sure when best to do this but must be done before generateBio
  biography.improveFirstPrefAndMiddleNames(result);

  // this must be done before useMoreAccurateDates
  biography.tryToSeparateResidenceFactsWithMultipleRefs();

  biography.handleFactsWithNoDatePass2();

  // For most censuses the fact date is just the year. This can make it sort incorrectly. If we know the correct date we can
  // change the date then re-sort the facts. This has to be done after we consolidated the refs.
  biography.useMoreAccurateDates();

  biography.tryToMergeFactsOnSameDate();

  // check for any web links in fact description that should be replaced source references
  biography.checkForLinksInFacts();

  biography.checkForLinksInFileFacts();

  // do some more checks that can generate alert messages
  biography.checkForAdditionalIssues();

  biography.analyzeAndNameReferences();

  // we can sometimes improve the values of other fields such as birth and death date based on the facts we have gathered
  biography.improveOtherFields(result);

  biography.removeDuplicateRefs();

  biography.improveAndAbbreviateLocations();

  // Make the result accessible to the biography so that if we need the current last name etc
  // while generating bio text we have it.
  biography.result = result;

  // Generate the new bio string that will be put in the textbox
  var newBio = biography.generateBio();

  result.bioText = newBio;
  result.succeeded = true;

  return result;
}
