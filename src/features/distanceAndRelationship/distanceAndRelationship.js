import $ from "jquery";
import Cookies from "js-cookie";
import {getPerson} from 'wikitree-js';
import "./distanceAndRelationship.css";
chrome.storage.sync.get("distanceAndRelationship", (result) => {
  // define user and profile IDs
  const profileID = $("a.pureCssMenui0 span.person").text();
  const userID = Cookies.get("wikitree_wtb_UserName");
  if (
    result.distanceAndRelationship &&
    $("body.BEE").length == 0 &&
    $("body.profile").length &&
    window.location.href.match("Space:") == null &&
    profileID != userID
  ) {
    // set up databases
    window.connectionFinderDBVersion = 1;
    window.relationshipFinderDBVersion = 1;
    const connectionFinderResultsDBReq = window.indexedDB.open("ConnectionFinderWTE", window.connectionFinderDBVersion);
    connectionFinderResultsDBReq.addEventListener("upgradeneeded", (event) => {
      var request = event.target;
      // @type IDBDatabase
      var db = request.result;
      // @type IDBTransaction
      var txn = request.transaction;
      if (event.oldVersion < 1) {
        const objectStore = db.createObjectStore("distance", {
          keyPath: "id",
        });
      } else {
        // @type IDBObjectStore
        var store = txn.objectStore("distance");
        store.createIndex("id");
      }
    });

    const relationshipFinderResultsDBReq = window.indexedDB.open(
      "RelationshipFinderWTE",
      window.relationshipFinderDBVersion
    );
    relationshipFinderResultsDBReq.addEventListener("upgradeneeded", (event) => {
      var request = event.target;
      // @type IDBDatabase
      var db = request.result;
      // @type IDBTransaction
      var txn = request.transaction;
      if (event.oldVersion < 1) {
        const objectStore = db.createObjectStore("relationship", {
          keyPath: "id",
        });
      } else {
        // @type IDBObjectStore
        var store = txn.objectStore("relationship");
        store.createIndex("id");
      }
    });

    // Do it
    connectionFinderResultsDBReq.onsuccess = function (event) {
      const connectionFinderResultsDB = event.target.result;
      const aRequest = connectionFinderResultsDB
        .transaction(["distance"], "readonly")
        .objectStore("distance")
        .get(profileID);
      aRequest.onsuccess = function () {
        if (aRequest.result == undefined) {
          initDistanceAndRelationship(userID, profileID);
        } else {
          if ($("#distanceFromYou").length == 0 && $("#degreesFromYou").length == 0 && aRequest.result.distance > 0) {
            // #degreesFromYou is in WT BEE.  If this is showing, don't show this (for now)
            const profileName = $("h1 span[itemprop='name']").text();
            $("h1").append(
              $(
                `<span id='distanceFromYou' title='${profileName} is ${aRequest.result.distance} degrees from you. \nClick to refresh.'>${aRequest.result.distance}°</span>`
              )
            );
            $("#distanceFromYou").on("click", function (e) {
              e.preventDefault();
              $(this).fadeOut("slow").remove();
              $("#yourRelationshipText").fadeOut("slow").remove();
              initDistanceAndRelationship(userID, profileID, true);
            });
          }
        }
      };
      aRequest.onerror = (error) => {
        console.log(error);
      };
    };
    relationshipFinderResultsDBReq.onsuccess = function (event) {
      const relationshipFinderResultsDB = event.target.result;
      let aRequest2 = relationshipFinderResultsDB
        .transaction(["relationship"], "readonly")
        .objectStore("relationship")
        .get(profileID);
      aRequest2.onsuccess = function () {
        if (aRequest2.result != undefined) {
          if (aRequest2.result.relationship != "") {
            if (
              $("#yourRelationshipText").length == 0 &&
              $(".ancestorTextText").length == 0 &&
              $("#ancestorListBox").length == 0
            ) {
              $("#yourRelationshipText").remove();
              addRelationshipText(aRequest2.result.relationship, aRequest2.result.commonAncestors);
            }
          }
        } else {
          doRelationshipText(userID, profileID);
        }
      };
      aRequest2.onerror = (error) => {
        console.log(error);
      };
    };
  }
});

async function getConnectionFinderResult(id1, id2, relatives = 0) {
  try {
    const result = await $.ajax({
      url: "https://www.wikitree.com/index.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      data: {
        title: "Special:Connection",
        action: "connect",
        person1Name: id1,
        person2Name: id2,
        relation: relatives,
        ignoreIds: "",
      },
      type: "POST",
      dataType: "json",
      success: function (data) {},
      error: function (error) {
        console.log(error);
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}

async function getRelationshipFinderResult(id1, id2) {
  try {
    const result = await $.ajax({
      url: "https://www.wikitree.com/index.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      data: {
        title: "Special:Relationship",
        action: "getRelationship",
        person1_name: id1,
        person2_name: id2,
      },
      type: "POST",
      dataType: "json",
      success: function (data) {},
      error: function (error) {
        console.log(error);
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}

function addRelationshipText(oText, commonAncestors) {
  const commonAncestorTextResult = commonAncestorText(commonAncestors);
  let commonAncestorTextOut = commonAncestorTextResult.text;
  const cousinText = $(
    "<div id='yourRelationshipText' title='Click to refresh' class='relationshipFinder'>Your " +
      oText +
      "<ul id='yourCommonAncestor' style='white-space:nowrap'>" +
      commonAncestorTextOut +
      "</ul></div>"
  );
  $("h1").after(cousinText);
  $("#yourRelationshipText").click(function (e) {
    e.stopPropagation();
    let id1 = Cookies.get("wikitree_wtb_UserName");
    let id2 = $("a.pureCssMenui0 span.person").text();
    initDistanceAndRelationship(id1, id2, true);
  });
  if (commonAncestorTextResult.count > 2) {
    $("#yourRelationshipText").append($("<button class='small' id='showMoreAncestors'>More</button>"));
    $("#showMoreAncestors").click(function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#yourCommonAncestor li:nth-child(n+3)").toggle();
    });
  }
}

function commonAncestorText(commonAncestors) {
  let result = {};
  let ancestorTextOut = "";
  const profileGender = $("body").find("meta[itemprop='gender']").attr("content");
  let possessiveAdj = "their";
  if (profileGender == "male") {
    possessiveAdj = "his";
  }
  if (profileGender == "female") {
    possessiveAdj = "her";
  }
  let ancestorsAdded = [];
  commonAncestors.forEach(function (commonAncestor) {
    const thisAncestorType = ancestorType(
      commonAncestor.path2Length - 1,
      commonAncestor.ancestor.mGender
    ).toLowerCase();
    if (!ancestorsAdded.includes(commonAncestor.ancestor.mName)) {
      ancestorTextOut +=
        '<li>Your common ancestor, <a href="https://www.wikitree.com/wiki/' +
        commonAncestor.ancestor.mName +
        '">' +
        commonAncestor.ancestor.mDerived.LongNameWithDates +
        "</a>, is " +
        possessiveAdj +
        " " +
        thisAncestorType +
        ".</li>";
      ancestorsAdded.push(commonAncestor.ancestor.mName);
    }
  });
  result.text = ancestorTextOut;
  result.count = ancestorsAdded.length;
  return result;
}

function doRelationshipText(userID, profileID) {
  getRelationshipFinderResult(userID, profileID).then(function (data) {
    if (data) {
      let out = "";
      var aRelationship = true;
      const commonAncestors = [];
      let realOut = "";
      let dummy = $("<html></html>");
      dummy.append($(data.html));
      if (dummy.find("h1").length) {
        if (dummy.find("h1").eq(0).text() == "No Relationship Found") {
          aRelationship = false;
          console.log("No Relationship Found");
        }
      }
      if (dummy.find("h2").length && aRelationship == true) {
        let oh2 = dummy
          .find("h2")
          .eq(0)
          .text()
          .replaceAll(/[\t\n]/g, "");
        let secondName = dummy.find("b").parent().text().split(out)[1];
        const userFirstName = dummy.find(`p a[href\$='${userID}']`).eq(0).text().split(" ")[0];
        const profileFirstName = $("h1 span[itemprop='name']").text().split(" ")[0];
        if (data.commonAncestors.length == 0) {
          out = dummy.find("b").text();

          if (secondName.match(profileFirstName)) {
            out = dummy.find("h2").text().replace("(DNA Confirmed)", "").trim();
          }
        } else {
          const profileGender = $("body").find("meta[itemprop='gender']").attr("content");
          if (oh2.match("is the")) {
            out = oh2.split("is the ")[1].split(" of")[0];
          } else if (oh2.match(" are ")) {
            out = oh2
              .split("are ")[1]
              .replace(/cousins/, "cousin")
              .replace(/siblings/, "sibling");
          }
          if (out.match(/nephew|niece/)) {
            if (profileGender == "male") {
              out = out.replace(/nephew|niece/, "uncle");
            }
            if (profileGender == "female") {
              out = out.replace(/nephew|niece/, "aunt");
            }
          }
          if (
            dummy
              .find("h2")
              .eq(0)
              .text()
              .match(userFirstName + "'s")
          ) {
            out = dummy
              .find("h2")
              .eq(0)
              .text()
              .split(userFirstName + "'s")[1]
              .trim();
          }
        }
        let outSplit = out.split(" ");
        outSplit[0] = ordinalWordToNumberAndSuffix(outSplit[0]);
        out = outSplit.join(" ");
        if (
          $("#yourRelationshipText").length == 0 &&
          $(".ancestorTextText").length == 0 &&
          $("#ancestorListBox").length == 0
        ) {
          $("#yourRelationshipText").remove();
          addRelationshipText(out, data.commonAncestors);
        }
      }

      const relationshipFinderResultsDBReq = window.indexedDB.open(
        "RelationshipFinderWTE",
        window.relationshipFinderDBVersion
      );
      relationshipFinderResultsDBReq.onsuccess = function (event) {
        var relationshipFinderResultsDB = event.target.result;
        const obj = {
          userId: userID,
          id: profileID,
          distance: window.distance,
          relationship: out,
          commonAncestors: data.commonAncestors,
        };
        addToDB("RelationshipFinderWTE", window.relationshipFinderDBVersion, "relationship", obj);
      };
    }
  });
}

async function addDistance(data) {
  if ($("#degreesFromYou").length == 0) {
    window.distance = data.path.length - 1;
    const profileName = $("h1 span[itemprop='name']").text();
    if (window.distance > 0 && $("#degreesFromYou").length == 0) {
      // #degreesFromYou is in WT BEE.  If this is showing, don't show this (for now)
      $("h1").append(
        $(
          `<span id='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
        )
      );
    }
    const connectionFinderResultsDBReq = window.indexedDB.open("ConnectionFinder", window.connectionFinderDBVersion);
    connectionFinderResultsDBReq.onsuccess = function (event) {
      var connectionFinderResultsDB = event.target.result;
      const profileID = $("a.pureCssMenui0 span.person").text();
      const userID = Cookies.get("wikitree_wtb_UserName");
      const obj = {
        userId: userID,
        id: profileID,
        distance: window.distance,
      };
      addToDB("ConnectionFinderWTE", window.connectionFinderDBVersion, "distance", obj);
    };
    connectionFinderResultsDBReq.onerror = function (error) {
      console.log(error);
    };
  }
}

async function getDistance() {
  const id1 = Cookies.get("wikitree_wtb_UserName");
  const id2 = $("a.pureCssMenui0 span.person").text();
  const data = await getConnectionFinderResult(id1, id2);
  addDistance(data);
}

function ordinal(i) {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

function ancestorType(generation, gender) {
  let relType;
  if (generation > 0 || generation == 0) {
    if (gender == "Female") {
      relType = "Mother";
    } else if (gender == "Male") {
      relType = "Father";
    } else {
      relType = "Parent";
    }
  }
  if (generation > 1) {
    relType = "Grand" + relType.toLowerCase();
  }
  if (generation > 2) {
    relType = "Great-" + relType.toLowerCase();
  }
  if (generation > 3) {
    relType = ordinal(generation - 2) + " " + relType;
  }
  return relType;
}

function ordinalWordToNumberAndSuffix(word) {
  const ordinalsArray = [
    ["first", "1st"],
    ["second", "2nd"],
    ["third", "3rd"],
    ["fourth", "4th"],
    ["fifth", "5th"],
    ["sixth", "6th"],
    ["seventh", "7th"],
    ["eigth", "8th"],
    ["ninth", "9th"],
    ["tenth", "10th"],
    ["eleventh", "11th"],
    ["twelfth", "12th"],
    ["thirteenth", "13th"],
    ["fourteenth", "14th"],
    ["fifteenth", "15th"],
    ["sixteenth", "16th"],
    ["seventeenth", "17th"],
    ["eighteenth", "18th"],
    ["nineteenth", "19th"],
    ["twentieth", "20th"],
    ["twenty-first", "21st"],
    ["twenty-second", "22nd"],
    ["twenty-third", "23rd"],
    ["twenty-fourth", "24th"],
    ["twenty-fifth", "25th"],
  ];
  ordinalsArray.forEach(function (arr) {
    if (word == arr[0]) {
      word = arr[1];
      return arr[1];
    }
  });
  return word;
}

function initDistanceAndRelationship(userID, profileID, clicked = false) {
  $("#distanceFromYou").fadeOut().remove();
  $("#yourRelationshipText").fadeOut().remove();
  if (clicked == true) {
    getDistance();
    doRelationshipText(userID, profileID);
  } else {
    getPerson(profileID).then((person) => {
      const nowTime = Date.parse(Date());
      let timeDifference = 0;
      if (person.Created) {
        const created = Date.parse(person.Created.substr(0, 8).replace(/(....)(..)(..)/, "$1-$2-$3"));
        timeDifference = nowTime - created;
      }
      const nineDays = 777600000;
      if (person.Privacy > 29 && person.Connected == 1 && timeDifference > nineDays) {
        getDistance();
        doRelationshipText(userID, profileID);
      }
    });
  }
}

function addToDB(db, dbv, os, obj) {
  var aDB = window.indexedDB.open(db, dbv);
  aDB.onsuccess = function (event) {
    const xdb = aDB.result;
    const transaction = xdb.transaction([os], "readwrite");
    transaction.oncomplete = function (event) {
      var insert = xdb.transaction([os], "readwrite").objectStore(os).put(obj);
    };
  };
}
