chrome.storage.sync.get("distanceAndRelationship", (result) => {
  if (
    result.distanceAndRelationship &&
    $("body.BEE").length == 0 &&
    $("body.profile").length &&
    window.location.href.match("Space:") == null
  ) {
    const profileID = $("a.pureCssMenui0 span.person").text();
    const userID = Cookies.get("wikitree_wtb_UserName");
    var db = new Dexie("ConnectionFinderResults");
    db.version(1).stores({
      distance: "[userId+id]",
      connection: "[userId+id]",
    });
    db.open().then(function (db) {
      db.distance
        .get({ userId: userID, id: profileID })
        .then(function (result) {
          if (result == undefined) {
            initDistanceAndRelationship(userID, profileID);
          } else {
            if ($("#distanceFromYou").length == 0) {
              profileName = $("h1 span[itemprop='name']").text();
              $("h1").append(
                $(
                  `<span id='distanceFromYou' title='${profileName} is ${result.distance} degrees from you. \nClick to refresh.'>${result.distance}°</span>`
                )
              );

              $("#distanceFromYou").click(function (e) {
                e.preventDefault();
                $(this).fadeOut("slow").remove();
                $("#yourRelationshipText").fadeOut("slow").remove();
                initDistanceAndRelationship(userID, profileID);
              });

              var rdb = new Dexie("RelationshipFinderResults");
              rdb.version(1).stores({
                relationship: "[userId+id]",
              });
              rdb.open().then(function (rdb) {
                rdb.relationship
                  .get({ userId: userID, id: profileID })
                  .then(function (result) {
                    if (result != undefined) {
                      if (result.relationship != "") {
                        if (
                          $("#yourRelationshipText").length == 0 &&
                          $(".ancestorTextText").length == 0 &&
                          $("#ancestorListBox").length == 0
                        ) {
                          $("#yourRelationshipText").remove();
                          addRelationshipText(
                            result.relationship,
                            result.commonAncestors
                          );
                        }
                      }
                    } else {
                      doRelationshipText(userID, profileID);
                    }
                  });
              });
            }
          }
        });
    });
  }
});

async function getProfile(id, fields = "*") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: { action: "getProfile", key: id, fields: fields },
    });
    return result[0].profile;
  } catch (error) {
    console.error(error);
  }
}

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
  commonAncestorTextOut = commonAncestorText(commonAncestors);
  cousinText = $(
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
    initDistanceAndRelationship(id1, id2);
  });
  if (commonAncestors.length > 2) {
    $("#yourRelationshipText").append(
      $("<button class='small' id='showMoreAncestors'>More</button>")
    );
    $("#showMoreAncestors").click(function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#yourCommonAncestor li:nth-child(n+3)").toggle();
    });
  }
}

function commonAncestorText(commonAncestors) {
  let ancestorTextOut = "";
  const profileGender = $("body")
    .find("meta[itemprop='gender']")
    .attr("content");
  let possessiveAdj = "their";
  if (profileGender == "male") {
    possessiveAdj = "his";
  }
  if (profileGender == "female") {
    possessiveAdj = "her";
  }
  commonAncestors.forEach(function (commonAncestor) {
    thisAncestorType = ancestorType(
      commonAncestor.path2Length - 1,
      commonAncestor.ancestor.mGender
    ).toLowerCase();
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
  });
  return ancestorTextOut;
}

function doRelationshipText(userID, profileID) {
  getRelationshipFinderResult(userID, profileID).then(function (data) {
    if (data) {
      let out = "";
      var aRelationship = true;
      commonAncestors = [];
      realOut = "";
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
        if (data.commonAncestors.length == 0) {
          out = dummy.find("b").text();
        } else {
          profileGender = $("body")
            .find("meta[itemprop='gender']")
            .attr("content");
          if (oh2.match("is the")) {
            out = oh2.split("is the ")[1].split(" of")[0];
          } else if (oh2.match(" are ")) {
            out = oh2.split("are ")[1].replace(/cousins/, "cousin");
          }
          if (out.match(/nephew|niece/)) {
            if (profileGender == "male") {
              out = out.replace(/nephew|niece/, "uncle");
            }
            if (profileGender == "female") {
              out = out.replace(/nephew|niece/, "aunt");
            }
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

      var rdb = new Dexie("RelationshipFinderResults");
      rdb.version(1).stores({
        relationship: "[userId+id]",
      });
      rdb
        .open()
        .then(function (rdb) {
          rdb.relationship.put({
            userId: userID,
            id: profileID,
            relationship: out,
            commonAncestors: data.commonAncestors,
          });
          // Database opened successfully
        })
        .catch(function (err) {
          // Error occurred
        });
    }
  });
}

async function addDistance(data) {
  if ($("#degreesFromYou").length == 0) {
    window.distance = data.path.length;
    const profileName = $("h1 span[itemprop='name']").text();
    $("h1").append(
      $(
        `<span id='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
      )
    );
    var db = new Dexie("ConnectionFinderResults");
    db.version(1).stores({
      distance: "[userId+id]",
      connection: "[userId+id]",
    });
    db.open()
      .then(function (db) {
        db.distance.put({
          userId: Cookies.get("wikitree_wtb_UserName"),
          id: $("a.pureCssMenui0 span.person").text(),
          distance: window.distance,
        });
        // Database opened successfully
      })
      .catch(function (err) {
        // Error occurred
      });
  }
}

async function getDistance() {
  const id1 = Cookies.get("wikitree_wtb_UserName");
  const id2 = $("a.pureCssMenui0 span.person").text();
  data = await getConnectionFinderResult(id1, id2);
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

function initDistanceAndRelationship(userID, profileID) {
  $("#distanceFromYou").fadeOut().remove();
  $("#yourRelationshipText").fadeOut().remove();
  getProfile(profileID).then((person) => {
    const nowTime = Date.parse(Date());
    const created = Date.parse(
      person.Created.substr(0, 8).replace(/(....)(..)(..)/, "$1-$2-$3")
    );
    const timeDifference = nowTime - created;
    const nineDays = 777600000;
    if (
      person.Privacy > 29 &&
      person.Connected == 1 &&
      timeDifference > nineDays
    ) {
      getDistance();
      doRelationshipText(userID, profileID);
    }
  });
}
