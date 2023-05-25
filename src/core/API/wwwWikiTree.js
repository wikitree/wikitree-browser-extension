/*
Created By: Aleš Trtnik (Trtnik-2)
*/

/********************************************************************
  getWikiTreePage     Retrieve web page from Wikitree using GET
    Parameters:
      callerID:         Prefarably unique name of the caller: "WhatLinksHere"
      page:             wikitree path and page 
      params:           parameters to the call
    Returns:            page content
*******************************************************************/

export const getWikiTreePage = (callerID, page, params) => {
  return wwwWikiTreeGet(
    ((page == "") || page.startsWith("/") ? "" : "/") +
      page +
      (params.startsWith("?") ? "" : "?") +
      params +
      (params == "" ? "" : "&") +
      "appid=WBE_" +
      callerID
  );
};

/********************************************************************
  getConnectionJSON   Retrieve JSON page of the connection between 2 profiles
    Parameters:
      callerID:         Prefarably unique name of the caller: "WhatLinksHere"
      id1:              WikiTreeID of start profile
      id2:              WikiTreeID of end profile
    Returns:            page content as JSON
    {
      error: 0, found: 1, cfdown: 0,
      person1: { mId: "10816946", mPageId: "11461145", mName: "Trtnik-2", mNameDB: "Trtnik-2", mColloquialName: "Ale\u0161", mLastNameAtBirth: "Trtnik", mLastNameCurrent: "Trtnik" },
      person2: { mId: "16653313", mPageId: "17925077", mName: "Mountjoy-279", mNameDB: "Mountjoy-279", mColloquialName: "William", mLastNameAtBirth: "Mountjoy", mLastNameCurrent: "Mountjoy" },
      relation: 0, ignoreIds: "", ignoreUsers: null,
      path: [
        {
          mId: "10816946", mName: "Trtnik-2", mNameDB: "Trtnik-2", pathType: "", mPrivacy: "40", mColloquialName: "Ale\u0161", mLastNameAtBirth: "Trtnik", 
          mBirthDateDecade: "1960s", mDeathDateDecade: "unknown", mGender: "Male", mPhoto: "Trtnik-2.jpg",
          mDerived: {
            Gender: "male", GenderColor: "#eef", GenderAsParent: "father", GenderAsSibling: "brother", GenderAsSpouse: "husband", GenderAsChild: "son", 
            GenderPronoun: "he", GenderPronounObject: "him", GenderPronounPossessive: "his", GenderPronounIs: "is", GenderPronounWas: "was",
          },
          isPrivate: 0,
          myphoto: '<img alt="Trtnik-2.jpg" src="/photo.php/thumb/7/74/Trtnik-2.jpg/75px-Trtnik-2.jpg" width="75" height="110" border="0" />',
        },
...
        {
          mId: "16653313", mName: "Mountjoy-279", mNameDB: "Mountjoy-279", pathType: "parent", mPrivacy: "60", mColloquialName: "William", mLastNameAtBirth: "Mountjoy", 
          mBirthDateDecade: "1710s", mDeathDateDecade: "1770s", mGender: "Male", mPhoto: "Mountjoy-279.jpg",
          mDerived: {
            Gender: "male", GenderColor: "#eef", GenderAsParent: "father", GenderAsSibling: "brother", GenderAsSpouse: "husband", GenderAsChild: "son", 
            GenderPronoun: "he", GenderPronounObject: "him", GenderPronounPossessive: "his", GenderPronounIs: "is", GenderPronounWas: "was",
          },
          mBirthDate: "1711-04-17", mDeathDate: "1777-09-27", isPrivate: 0,
          myphoto: '<img alt="Mountjoy-279.jpg" src="/photo.php/thumb/6/69/Mountjoy-279.jpg/75px-Mountjoy-279.jpg" width="75" height="113" border="0" />',
        },
      ],
      depth: 16, listCount: 0, maxDepth: 10,
    };
*******************************************************************/

export const getConnectionJSON = (callerID, id1, id2) => {
  return getWikiTreeJSON(callerID, "index.php", "", {
    title: "Special:Connection",
    action: "connect",
    person1Name: id1,
    person2Name: id2,
    relation: 0,
  }).then((json) => {
    return json;
  });
};

/********************************************************************
  getRelationJSON   Retrieve JSON page of the relationship between 2 profiles
    Parameters:
      callerID:         Prefarably unique name of the caller: "WhatLinksHere"
      id1:              WikiTreeID of start profile
      id2:              WikiTreeID of end profile
    Returns:            page content as JSON
    {
      "error":0,
      "commonAncestors":[
        {
          "ancestor_id":10826015,"path1Length":2,"path2Length":3,
          "ancestor":{
            "mId":"10826015","mName":"Kosec-1","mPrivacy":"60",
            "mDerived":{
              "Age":"107","AgeAtDeath":"at age 76","BirthDateFuzzy":"4 Feb 1916","DeathDateFuzzy":"18 May 1992","BirthDateDecade":"1910s","DeathDateDecade":"1990s","ShortName":"Jo\u017eica (Kosec) Stupica","LongName":"Josipina (Kosec) Stupica","LongNamePrivate":"Jo\u017eica (Kosec) Stupica","LongNameWithDates":"Josipina (Kosec) Stupica (1916-1992)","BirthName":"Josipina Kosec","BirthNamePrivate":"Jo\u017eica Kosec","registrationDate":"","registrationAge":"","registrationAgeDays":"",
              "Citation":"WikiTree contributors, &quot;Josipina (Kosec) Stupica (1916-1992),&quot; WikiTree: The Free Family Tree, (https:\/\/www.wikitree.com\/wiki\/Kosec-1 : accessed 25 May 2023).",
              "Gender":"female","GenderColor":"#fee","GenderAsParent":"mother","GenderAsSibling":"sister","GenderAsSpouse":"wife","GenderAsChild":"daughter","GenderPronoun":"she","GenderPronounObject":"her","GenderPronounPossessive":"her","GenderPronounIs":"is","GenderPronounWas":"was"
            },
          "mFirstName":"Josipina","mColloquialName":"Jo\u017eica","mLastNameCurrent":"Stupica","mLastNameAtBirth":"Kosec","mSuffix":"","mGender":"Female","displayName":"Jo\u017eica Kosec"
          },"yDNA":0,"mtDNA":0
        },{
          "ancestor_id":10826016,"path1Length":2,"path2Length":3,
          "ancestor":{
            "mId":"10826016","mName":"Stupica-4","mPrivacy":"60",
            "mDerived":{
              "Age":"112","AgeAtDeath":"at age 80","BirthDateFuzzy":"30 May 1910","DeathDateFuzzy":"22 Jun 1990","BirthDateDecade":"1910s","DeathDateDecade":"1990s","ShortName":"Franc Stupica","LongName":"Franc Stupica","LongNamePrivate":"Franc Stupica","LongNameWithDates":"Franc Stupica (1910-1990)","BirthName":"Franc Stupica","BirthNamePrivate":"Franc Stupica","registrationDate":"","registrationAge":"","registrationAgeDays":"",
              "Citation":"WikiTree contributors, &quot;Franc Stupica (1910-1990),&quot; WikiTree: The Free Family Tree, (https:\/\/www.wikitree.com\/wiki\/Stupica-4 : accessed 25 May 2023).",
              "Gender":"male","GenderColor":"#eef","GenderAsParent":"father","GenderAsSibling":"brother","GenderAsSpouse":"husband","GenderAsChild":"son","GenderPronoun":"he","GenderPronounObject":"him","GenderPronounPossessive":"his","GenderPronounIs":"is","GenderPronounWas":"was"
            },
            "mFirstName":"Franc","mColloquialName":"Franc","mLastNameCurrent":"Stupica","mLastNameAtBirth":"Stupica","mSuffix":"","mGender":"Male","displayName":"Franc Stupica"
        },"yDNA":0,"mtDNA":0
        },{
          "ancestor_id":10826015,"path1Length":2,"path2Length":3,
          "ancestor":{
            "mId":"10826015","mName":"Kosec-1","mPrivacy":"60",
            "mDerived":{
              "Age":"107","AgeAtDeath":"at age 76","BirthDateFuzzy":"4 Feb 1916","DeathDateFuzzy":"18 May 1992","BirthDateDecade":"1910s","DeathDateDecade":"1990s","ShortName":"Jo\u017eica (Kosec) Stupica","LongName":"Josipina (Kosec) Stupica","LongNamePrivate":"Jo\u017eica (Kosec) Stupica","LongNameWithDates":"Josipina (Kosec) Stupica (1916-1992)","BirthName":"Josipina Kosec","BirthNamePrivate":"Jo\u017eica Kosec","registrationDate":"","registrationAge":"","registrationAgeDays":"",
              "Citation":"WikiTree contributors, &quot;Josipina (Kosec) Stupica (1916-1992),&quot; WikiTree: The Free Family Tree, (https:\/\/www.wikitree.com\/wiki\/Kosec-1 : accessed 25 May 2023).",
              "Gender":"female","GenderColor":"#fee","GenderAsParent":"mother","GenderAsSibling":"sister","GenderAsSpouse":"wife","GenderAsChild":"daughter","GenderPronoun":"she","GenderPronounObject":"her","GenderPronounPossessive":"her","GenderPronounIs":"is","GenderPronounWas":"was"
            },
            "mFirstName":"Josipina","mColloquialName":"Jo\u017eica","mLastNameCurrent":"Stupica","mLastNameAtBirth":"Kosec","mSuffix":"","mGender":"Female","displayName":"Jo\u017eica Kosec"
          },"yDNA":0,"mtDNA":1
        }
      ],
      "html":"..."
    }
*******************************************************************/

export const getRelationJSON = (callerID, id1, id2) => {
  return getWikiTreeJSON(callerID, "index.php", "", {
    title: "Special:Relationship",
    action: "getRelationship",
    person1_name: id1,
    person2_name: id2,
  }).then((json) => {
    return json;
  });
};

/********************************************************************
  getWikiTreeJSON     Retrieve JSON page from Wikitree.com using POST
    Parameters:
      callerID:         Prefarably unique name of the caller: "WhatLinksHere"
      page:             wikitree path and page 
      params:           parameters to the call
      data:             data to be posted as FormData
    Returns:            page content as JSON
*******************************************************************/

export const getWikiTreeJSON = (callerID, page, params, data) => {
  return wwwWikiTreePostJSON(
    (page.startsWith("/") ? "" : "/") +
      page +
      (params.startsWith("?") ? "" : "?") +
      params +
      (params == "" ? "" : "&") +
      "appid=WBE_" +
      callerID,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams(data).toString(),
    }
  );
};

// *******************************************************************
// Base GET call to WikiTree
// *******************************************************************

const wwwWikiTreeGet = (url) => {
  return fetch(`https://www.wikitree.com${url}`).then((response) => {
    if (response.ok) {
      return response.text();
    } else {
      throw response.statusText;
    }
  });
};
// *******************************************************************
// Base POST call to WikiTree returning JSON
// *******************************************************************

const wwwWikiTreePostJSON = (url, data) => {
  return fetch(`https://www.wikitree.com${url}`, data).then((response) => {
    if (response.ok) {
      //return response.text().then(JSON.parse)
      return response.json();
    } else {
      throw response.statusText;
    }
  });
};
