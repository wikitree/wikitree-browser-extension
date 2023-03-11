/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, displayName } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getRelatives } from "wikitree-js";
import "./change_family_lists.css";

checkIfFeatureEnabled("changeFamilyLists").then((result) => {
  const ancestorsButton = $("span.showHideTree").eq(0);
  const descendantsButton = $("span#showHideDescendants");
  if (result) {
    window.excludeValues = ["", null, "null", "0000-00-00", "unknown", "undefined", undefined, NaN, "NaN"];
    prepareFamilyLists().then(() => {
      getFeatureOptions("changeFamilyLists").then((options) => {
        if (options.moveToRight) {
          moveFamilyLists(true);
        }
        if (options.verticalLists) {
          $("#nVitals").addClass("vertical");
          reallyMakeFamLists();
        } else if (options.agesAtMarriages) {
          onlyAgesAtMarriages();
        }
        if (!options.verticalLists) {
          $("body").addClass("WTEsibHeaders");
          prepareHeadings();
          if (options.siblingAndChildCount) {
            addChildrenCount();
          }
        }
        if (options.changeHeaders) {
          setTimeout(function () {
            siblingsHeader(true);
          }, 1500);
        }

        if (!options.verticalLists) {
          $("#parentDetails").before(ancestorsButton);
          $("#childrenDetails").before(descendantsButton);
        } else {
          $("#parentDetails").prepend(ancestorsButton);
          $("#childrenDetails").prepend(descendantsButton);
        }
        $("span.showHideTree").eq(1).remove();
        setTimeout(function () {
          const openPadlock = $("img[title='Privacy Level: Open']");
          if (openPadlock.length) {
            addAddLinksToHeadings();
          }
        }, 3000);

        addParentStatus();
      });
    });
    window.onresize = function () {
      if ($("body.profile").length && window.location.href.match("Space:") == null) {
        moveFamilyLists(true);
      }
    };
  }
});

async function addAddLinksToHeadings() {
  $("div.VITALS:contains([children unknown])").attr("id", "childrenUnknownHeading");
  $("div.VITALS:contains([sibling(s) unknown])").attr("id", "siblingsUnknownHeading");
  $("div.VITALS:contains([spouse(s) unknown])").attr("id", "spousesUnknownHeading");

  const linkBase = $("a.pureCssMenui:contains(Edit)").attr("href").replace("Person", "Family");
  const headings = [
    ["#siblingsHeader", "sibling"],
    ["#siblingsUnknownHeading", "sibling"],
    [".spouseText:first-of-type", "spouse"],
    ["#spousesUnknownHeading", "spouse"],
    ["#childrenHeader", "child"],
    ["#childrenUnknownHeading", "child"],
    ["#parentsHeader", "father"],
    ["#fatherUnknown", "father"],
    ["#motherUnknown", "mother"],
  ];
  let whichParent;
  if (window.people) {
    if (!window.people[0] && window.people[0].Father) {
      whichParent = "mother";
    }

    headings.forEach(function (aHeading) {
      if (
        ["#siblingsUnknown", "#siblingsHeader"].includes(aHeading[0]) &&
        window.people[0]?.Mother == 0 &&
        window.people[0]?.Father == 0
      ) {
      } else {
        $(aHeading[0])
          .attr("title", "Right click to add a " + aHeading[1])
          .css("cursor", "pointer");
        $(aHeading[0]).on("contextmenu", function (e) {
          e.preventDefault();
          if (!aHeading[1]) {
            aHeading[1] = whichParent;
          }
          window.location = linkBase + "&who=" + aHeading[1];
        });
      }
    });
  }
}

async function prepareFamilyLists() {
  if ($("body.profile").length && window.location.href.match("Space:") == null && $("#nVitals").length == 0) {
    const ourVitals = $("div.ten div.VITALS");
    const familyLists = $("<div id='nVitals'></div>");
    ourVitals.each(function () {
      if ($(this).find("span[itemprop='givenName']").length) {
        $(this).prop("id", "profileName");
      } else if ($(this).text().match(/^Born/)) {
        $(this).prop("id", "birthDetails");
        $(this).after(familyLists);
      } else if ($(this).text().match(/^Died/)) {
        $(this).prop("id", "deathDetails");
      } else {
        if (
          $(this)
            .text()
            .match(/(^Son|^Daughter|^\[?Child\b)\sof/i)
        ) {
          $(this).prop("id", "parentDetails").addClass("familyList");
        }
        if (
          $(this)
            .text()
            .match(/(^Sister|^Brother|^\[?Sibling)\sof/i)
        ) {
          $(this).prop("id", "siblingDetails").addClass("familyList");
        }
        if (
          $(this)
            .text()
            .match(/(^Wife|^Husband|^\[?Spouse)\sof/i)
        ) {
          $(this).addClass("spouseDetails").addClass("familyList");
        }
        if (
          $(this)
            .text()
            .match(/(^\[?Father|^\[?Mother|^\[?Parent|^\[Children)\sof/i)
        ) {
          $(this).prop("id", "childrenDetails").addClass("familyList");
        }
        $(this).appendTo(familyLists);
      }
    });

    $("#parentDetails").prepend($("span.showHideTree").eq(0));
    $("#childrenDetails").prepend($("span#showHideDescendants"));
  }
}

async function onlyAgesAtMarriages() {
  const id = $("a.pureCssMenui0 span.person").text();
  getRelatives([id], {
    getSpouses: true,
    fields: ["*"],
  }).then((personData) => {
    window.people = [personData[0]];
    addMarriageAges();
  });
}

async function moveFamilyLists(firstTime = false, wasClicked = false) {
  const leftHandColumn = $("div.ten").eq(0).prop("id", "leftColumn");
  const rightHandColumn = $("div.six").eq(0).prop("id", "rightColumn");
  const familyLists = $("#nVitals");

  if (firstTime == false) {
    let right;
    if (window.innerWidth < 767 || rightHandColumn.find(familyLists).length) {
      familyLists.fadeOut("slow", function () {
        familyLists.insertAfter($("#birthDetails"));
        familyLists.fadeIn("slow");
      });
      right = false;
    } else {
      familyLists.fadeOut("slow", function () {
        if ($("a[href='/wiki/Project_protection']").length) {
          familyLists.insertBefore($("a[href='/wiki/Project_protection']").closest("div"));
        } else if ($("#geneticfamily").length) {
          familyLists.insertBefore($("#geneticfamily"));
        } else {
          rightHandColumn.prepend(familyLists);
        }
        familyLists.fadeIn("slow");
      });
      right = true;
    }
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.moveToRight = right;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({
        [storageName]: optionsData,
      });
    });
  } else {
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      if (window.innerWidth < 767) {
        familyLists.insertAfter($("#birthDetails"));
      } else if (optionsData.moveToRight) {
        if ($("div.six a[href='/wiki/Project_protection']").length) {
          familyLists.insertAfter($("div.six a[href='/wiki/Project_protection']").closest("div"));
        } else if ($("#geneticfamily").length) {
          familyLists.insertBefore($("#geneticfamily"));
        } else {
          rightHandColumn.prepend(familyLists);
        }
      }
    });
  }
}

function reallyMakeFamLists() {
  if ($("body.profile").length && $("body[class*=page-Space_]").length == 0) {
    const profileWTID = $("a.pureCssMenui0 span.person").text();
    if ($("ul.pureCssMenu.pureCssMenum li:nth-child(2) li:contains('Edit')").length) {
      const profileID = $("ul.pureCssMenu.pureCssMenum li:nth-child(2) li:contains('Edit')")
        .find("a")
        .attr("href")
        .split("&u=")[1];
    }
    if (profileWTID) {
      $.ajax({
        url: "https://api.wikitree.com/api.php",
        type: "POST",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        dataType: "json",
        data: {
          action: "getRelatives",
          keys: profileWTID,
          getParents: "1",
          getSpouses: "1",
          getChildren: "1",
          getSiblings: "1",
          fields:
            "BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,Connected,DataStatus",
          format: "json",
        },
        success: function (data) {
          const oPerson = data;
          window.people = [oPerson[0]["items"][0]["person"]];
          if (oPerson[0]["items"][0]["person"]?.Connected == 1) {
            window.profileIsConnected = true;
          } else {
            window.profileIsConnected = false;
          }
          const orels = ["Children", "Parents", "Siblings", "Spouses"];
          orels.forEach(function (rel) {
            if (oPerson[0]["items"] != null) {
              if (!window.excludeValues.includes(oPerson[0]["items"][0]["person"][rel])) {
                if (oPerson[0]["items"][0]["person"][rel].length != 0) {
                  oPerson[0]["items"].forEach(function (item) {
                    const pKeys = Object.keys(item["person"][rel]);
                    pKeys.forEach(function (pKey) {
                      if (rel == "Parents") {
                        window.hasParents = true;
                      } else if (rel == "Children") {
                        window.hasChildren = true;
                      }
                      window.people.push(item["person"][rel][pKey]);
                    });
                  });
                }
              }
            }
          });
          const mSpouseSpans = $("span[itemprop='spouse']");
          let spouseId = "";
          mSpouseSpans.each(function () {
            const theSpouse = $(this);
            const spouseLinkA = $(this).find("a[href*='wiki']");
            const spouseLink = spouseLinkA.attr("href");
            spouseLinkA.addClass("spouseLink");
            if (spouseLink) {
              const spouseBits = spouseLink.split("/");
              if (spouseBits[2]) {
                spouseId = spouseBits[2];
              } else {
                spouseId = "#n";
              }
            } else {
              spouseId = "#n";
            }
            window.people.forEach(function (aPerson) {
              let spouseDates = "";
              if (aPerson.Name == spouseId.replace("_", " ")) {
                spouseDates = displayDates(aPerson);
                if (aPerson.Name.match(/[']/) != null) {
                  aPerson.Name = aPerson.Name.replace("'", "");
                }
                const idName = aPerson.Name.replace(".", "");
                if ($("#" + idName + "-bdDates").length == 0) {
                  theSpouse.append(
                    " <span class='spouseDates bdDates' id='" + idName + "-bdDates'>" + spouseDates + "</span>"
                  );
                }
                addDataToPerson(theSpouse.closest("div"), aPerson);
                theSpouse.attr("data-gender", aPerson.Gender);
              }
            });
          });

          //if (typeof profileWTID != "undefined" && !diff && $("#yourConnection").length == 0) {
          const mID = profileWTID;

          $("#siblingsHeader").off("click");
          $("body").on("click", "#siblingsHeader", function () {
            siblingsHeader();
          });

          setTimeout(function () {
            addHalfsStyle();
          }, 1000);
          /*
            window.intervalID = setInterval(addUncertain, 500);
            window.triedUncertain = 0;
            */

          fixAllPrivates();

          // cleaning up
          if ($("span.large:contains(Family Member)").length == 0) {
            makeFamLists();
            $(".familyList li").each(function () {
              if (
                $(this)
                  .text()
                  .match(/^,|^Sister|^Brother|^\sand\s/)
              ) {
                $(this).remove();
              }
            });
          }

          $("span#spousesUnknown").each(function () {
            if ($(this).text() == "") {
              $(this).remove();
            }
          });
        },
        error: function (xhr, status) {
          $("#output").append("<br>There was an error getting the person:" + data[0].status);
        },
      });
    }
  }
}

async function addHalfsStyle() {
  if ($("#nVitals span.half").length && $(".parent_1,.parent_2").length == 0) {
    $("#parentList li").each(function (index) {
      let p1id = "dummy";
      let p2id = "dummy";
      if (index == 0 && $(this).data("id") != undefined) {
        $(this).addClass("parent_1");
        p1id = $(this).data("id");
      }
      if (index == 1 && $(this).data("id") != undefined) {
        $(this).addClass("parent_2");
        p2id = $(this).data("id");
      }
      $("#siblingList li").each(function () {
        let father = $(this).data("father");
        let mother = $(this).data("mother");
        let thisID = $(this).data("id");
        let thisLi = $(this);
        if ((father == p1id && p1id != undefined) || (thisLi.attr("id") == "profilePerson" && BioPerson.Father != 0)) {
          $(this).find(".bdDates").addClass("parent_1");
        }
        if ((mother == p2id && p2id != undefined) || (thisLi.attr("id") == "profilePerson" && BioPerson.Mother != 0)) {
          $(this).addClass("parent_2");
        }
      });
    });
  }
}

function addDataToPerson(el, pData) {
  if (pData) {
    let oGender = "";
    if (pData.DataStatus.Gender == "blank" || pData.Gender == "") {
    } else {
      oGender = pData.Gender;
    }
    el.attr("data-gender", oGender);
    el.attr("data-id", pData.Id);
    el.attr("data-father", pData.Father);
    if (pData?.DataStatus?.Father) {
      el.attr("data-father-status", pData.DataStatus.Father);
    }
    el.attr("data-mother", pData.Mother);
    if (pData?.DataStatus?.Mother) {
      el.attr("data-mother-status", pData.DataStatus.Mother);
    }
  }
}

function siblingsHeader(first = false) {
  const els = [".spouseText", "#siblingsHeader", "#parentsHeader", "#childrenHeader"];
  els.forEach(function (elo) {
    let el = $(elo);
    let tDataText = el.attr("data-this-text");
    let tDataReplace = el.attr("data-replace-text");
    el.text(tDataReplace);
    el.attr("data-this-text", tDataReplace);
    el.attr("data-replace-text", tDataText);
    el.addClass("clickable");
  });
  let isOn = false;
  if ($("#siblingsHeader").text().match("iblings")) {
    isOn = true;
  }
  if (first == false) {
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.changeHeaders = isOn;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({
        [storageName]: optionsData,
      });
    });
  }
}

async function spouseToSpouses() {
  if ($(".aSpouse").length > 1) {
    let spouseText;
    $(".aSpouse").each(function (index) {
      spouseText = $(this).find("a.spouseText");
      spouseText.addClass("clickable");
      if (index == 0) {
        if (spouseText.attr("data-alt-text") == "Spouse: ") {
          spouseText.attr("data-alt-text", "Spouses: ");
          spouseText.attr("data-replace-text", "Spouses: ");
        } else if (spouseText.text() == "Spouse: ") {
          spouseText.text("Spouses: ");
          spouseText.attr("data-this-text", "Spouses: ");
        }
      } else {
        spouseText.remove();
      }
      $(this).appendTo($("#spouseDetails"));
    });
  }
}

function fixAllPrivates() {
  fixNakedPrivates();
  fixPrivates("Daughter", "children");
  fixPrivates("Son", "children");
  fixPrivates("Sister", "sibling");
  fixPrivates("Brother", "sibling");
  fixPrivates("Mother", "parent");
  fixPrivates("Father", "parent");

  $(".bdDates").each(function () {
    let oText = $(this).text().replace(/\s/g, "");
    if (oText == "(-)") {
      $(this).text("");
    }
  });
}

function fixNakedPrivates() {
  const tNodes = textNodesUnder(document.body);
  const rgx1 = /(mother)|(father)/g;
  const rgx2 = /(sister)|(brother)/g;
  const rgx3 = /(((Brother)|(Sister))\sof)\s(\[private.*)/g;
  const rgx4 = /((Brother)|(Sister))\sof/g;
  const rgx5 = /(((Husband)|(Wife))\sof)\s(\[private.*)/gm;
  const rgx6 = /((Husband)|(Wife))\sof/g;
  for (let n = 0; n < tNodes.length; n++) {
    let firstMatch = tNodes[n].textContent.match(rgx3);
    let ip;
    if (firstMatch != null) {
      let bors = firstMatch[0].match(rgx2);
      let borsof = firstMatch[0].match(rgx4);
      if (borsof != null) {
        let borsofText = document.createTextNode(borsof);
        tNodes[n].parentNode.insertBefore(borsofText, tNodes[n]);
        let textB = "Siblings: ";
        let textA = borsof;
        let sibsHeader = $(
          '<span id="siblingsHeader" class="clickable" data-replace-text="' +
            textB +
            ' " data-alt-text="' +
            textA +
            ' " data-original-text="' +
            textB +
            ' " data-this-text="' +
            textA +
            ' ">' +
            textA +
            " </span>"
        );
        $(borsofText).replaceWith(sibsHeader);
        $("#siblingsHeader").on("click", function () {
          siblingsHeader();
        });
      }
      ip = "sibling";
      let nSpan = createPrivateAndDates(tNodes[n], tNodes[n].nextSibling, ip);
      tNodes[n].parentNode.insertBefore(nSpan, tNodes[n]);
    }
    let firstMatch2 = tNodes[n].textContent.match(rgx5);
    if (firstMatch2 != null) {
      let husbandOrWife = firstMatch2[0].match(rgx5);
      let husbandOrWifeOf = firstMatch2[0].match(rgx6);
      let privateText = firstMatch2[0].match(/private wife|husband/);
      let fullPrivateText;
      if (privateText) {
        fullPrivateText = "[" + privateText[0] + "]";
      } else {
        fullPrivateText = "[private spouse]";
      }
      const spouseText = $(
        '<a class="spouseText clickable" data-alt-text="Spouse: " data-original-text="' +
          husbandOrWifeOf[0] +
          ' " data-this-text="' +
          husbandOrWifeOf[0] +
          ' " data-replace-text="Spouse: ">' +
          husbandOrWifeOf[0] +
          " </a>"
      );

      if (tNodes[n].nextSibling.nextSibling.textContent.match(/^\]/)) {
        tNodes[n].parentNode.removeChild(tNodes[n].nextSibling.nextSibling);
      }

      const privateBit = $(
        '<span itemprop="spouse" itemtype="https://schema.org/Person" data-gender="Female"><a title="" class="spouseLink"><span itemprop="name"><strong>' +
          fullPrivateText +
          '</strong></span></a></span>"'
      );
      privateBit.append($(tNodes[n].nextSibling));

      $(tNodes[n].parentNode).append(spouseText, privateBit);
    }
    if (tNodes[n].textContent.match(/^\]?((,)|(\sand)).*\[pr/)) {
      let pMatch = tNodes[n].textContent.match(rgx1);
      let sMatch = tNodes[n].textContent.match(rgx2);
      if (pMatch != null) {
        ip = "parent";
      } else if (sMatch != null) {
        ip = "sibling";
      } else {
        ip = "child";
      }
      let nSpan = createPrivateAndDates(tNodes[n], tNodes[n].nextSibling, ip);
      if (tNodes[n].parentNode) {
        tNodes[n].parentNode.insertBefore(nSpan, tNodes[n]);
      }
    }
  }
}

function makeFamLists() {
  const dparents = document.querySelectorAll('[itemprop="parent"]');
  let dchildren = document.querySelectorAll('span[itemprop="children"]');
  const addSibling = $("a:contains('[add sibling]')");
  const addChild = $("a:contains('[add child]')");
  const motherQ = $("a:contains('[mother?]')");
  const fatherQ = $("a:contains('[father?]')");
  const childrenQ = $("a:contains('[children?]')");
  const spouseQ = $("a:contains('[add spouse?]'),a:contains('[spouse?]')");

  const noParentsPublic = " of [father unknown] and [mother unknown]";
  const noFatherPublic = / of \[father unknown\] and $/;
  const noMotherPublic = /and \[mother unknown\]/;

  if (dparents) {
    var dparentsText = $(dparents[0]).parent().text();
  }
  const childrenQSpan = $("<span id='childrenUnknownQ'></span>");
  if (childrenQ.length) {
    childrenQ.after(childrenQSpan);
    $("#childrenUnknownQ").append(childrenQ);
  }

  dparents.forEach(function (aParent) {
    if (aParent.nextElementSibling) {
      if (aParent.nextElementSibling.tagName == "IMG") {
        aParent.setAttribute("data-dna", aParent.nextElementSibling.getAttribute("title"));
      }
    }
  });

  dchildren = document.querySelectorAll('span[itemprop="children"]');

  if (dparents.length > 0) {
    const ofNode2 = $("#parentsHeader")
      .parent()
      .contents()
      .filter(function () {
        return this.textContent.match(/(father)|(mother) unknown/);
      });
    list2ol(dparents, "parentList");
    if ($("#parentList li").length) {
      dchildren = document.querySelectorAll('span[itemprop="children"]');
      if ($("#parentList")[0].previousSibling) {
        if ($("#parentList")[0].previousSibling.textContent == "\nand\n") {
          $("#parentList")[0].previousSibling.remove();
        }
      }
      let pWord;
      if (ofNode2.length) {
        ofNode2.each(function (n2) {
          if ($(this).text().match("mother")) {
            pWord = "mother";
          } else {
            pWord = "father";
          }
          const fUnknown = $("<li>[" + pWord + " unknown]</li>");
          if (pWord == "father") {
            fUnknown.prependTo($("#parentList"));
          } else {
            fUnknown.appendTo($("#parentList"));
          }
          $(this).remove();
        });
      }
    }
  } else {
    $("<ol id='parentList' class='nameList'></ol>").appendTo($("#parentDetails"));
    if ($("#parentList").length) {
      if ($("#parentList")[0].previousSibling.textContent == "\nand\n") {
        $("#parentList")[0].previousSibling.remove();
      }
      if ($("#parentList")[0].previousSibling.previousSibling.textContent == "\nand\n") {
        $("#parentList")[0].previousSibling.previousSibling.remove();
      }
    }
  }

  if ($("#parentDetails").length) {
    const parentsNodes = $("#parentDetails")[0].childNodes;
    parentsNodes.forEach(function (aNode) {
      if (aNode.textContent == noParentsPublic) {
        aNode.remove();
        $("<li id='fatherUnknown'>[father unknown]</li><li id='motherUnknown'>[mother unknown]</li>").appendTo(
          $("#parentList")
        );
      } else if (aNode.textContent.match(noFatherPublic)) {
        aNode.remove();
        $("<li id='fatherUnknown'>[father unknown]</li>").prependTo($("#parentList"));
      }
    });
    if (dparentsText.match(noMotherPublic)) {
      $("<li id='motherUnknown'>[mother unknown]</li>").appendTo($("#parentList"));
    }
  }

  let sibs = document.querySelectorAll('span[itemprop="sibling"]');
  if (sibs.length > 0) {
    list2ol(sibs, "siblingList");
    sibs = document.querySelectorAll('span[itemprop="sibling"]');
  } else {
    let siblingVITALS = $(
      ".VITALS:contains(sibling),.VITALS:contains(Sibling),.VITALS:contains(brothers),.VITALS:contains(brother),.VITALS:contains(sister)"
    );
    siblingVITALS.attr("id", "siblingDetails");
    $("<ol id='siblingList' class='nameList'></ol>").appendTo($("#siblingDetails"));
  }

  let noSiblingsPublic = "[sibling(s) unknown]";
  if ($("#siblingDetails").length) {
    let sNodes = $("#siblingDetails")[0].childNodes;
    sNodes.forEach(function (aNode) {
      if (aNode.textContent == noSiblingsPublic && aNode.nodeType == 3) {
        aNode.remove();
        let sibsUnknown = $("<li id='siblingsUnknown'>[sibling(s) unknown]</li>");
        $("#siblingList").append(sibsUnknown);
        let sibWord;
        if ($("meta[content='male']").length) {
          sibWord = "Brother";
        } else if ($("meta[content='female']").length) {
          sibWord = "Sister";
        } else {
          sibWord = "Sibling";
        }
        if ($("#siblingsHeader").length == 0) {
          let sibHeader = $(
            '<span id="siblingsHeader" class="clickable" data-replace-text="Siblings: " data-this-text="' +
              sibWord +
              ' of " data-alt-text="Siblings: " data-original-text="' +
              sibWord +
              ' of ">' +
              sibWord +
              " of </span>"
          );
          $(sibHeader).prependTo($("#siblingDetails"));
          $("#siblingsHeader").on("click", function () {
            siblingsHeader();
          });
        }
      }
    });
  }

  const kids = document.querySelectorAll('span[itemprop="children"]');
  if (kids.length > 0) {
    list2ol(kids, "childrenList");
  }

  addHalfsStyle();
  setUpMarriedOrSpouse();
  siblingOf();
  extraBitsForFamilyLists();
  spouseToSpouses();

  if (addSibling.length) {
    let asib = $(addSibling);
    $("#siblingList").append($("<li id='addSibling'></li>"));
    $("#addSibling").append(asib);
    if ($("li:contains('[siblings unknown]')").length) {
      $("li:contains('[siblings unknown]')").remove();
    }
  }

  if (spouseQ.length) {
    $(spouseQ).addClass("addSpouse");
    let noSpouseSpan = $("<span id='spousesUnknown'></span>");
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#childrenDetails").length) {
        spouseDetails.insertBefore($("#childrenDetails"));
      }
    }
    $(spouseQ).appendTo(noSpouseSpan);
    noSpouseSpan.appendTo($("#spouseDetails"));
  }
  $(".aSpouse").prependTo($("#spouseDetails"));
  if (addChild.length) {
    let ac = $(addChild);
    $("#childrenList").append($("<li id='addChild'></li>"));
    $("#addChild").append(ac);
    if ($("li:contains('[children unknown]')").length) {
      $("li:contains('[children unknown]')").remove();
    }
  }
  if (motherQ.length) {
    let mq = $(motherQ);
    $("#parentList").append($("<li id='motherQ'></li>"));
    $("#motherQ").append(mq);
    if ($("li:contains('[mother unknown]')").length) {
      $("li:contains('[mother unknown]')").remove();
    }
  }
  if (fatherQ.length) {
    let fq = $(fatherQ);
    $("#parentList").prepend($("<li id='fatherQ'></li>"));
    $("#fatherQ").append(fq);
    if ($("li:contains('[father unknown]')").length) {
      $("li:contains('[father unknown]')").remove();
    }
  }

  // $(".aSpouse").length > 1 &&

  if ($("#childrenList li").length) {
    let sameParent = true;
    let checkParent = "mother";
    const parentIDs = [];
    if ($(".aSpouse").length) {
      if ($(".aSpouse").data("gender") == "male") {
        checkParent = "father";
      }
    }
    $("#childrenList li").each(function () {
      const parentID = $(this).data(checkParent);
      if (!parentIDs.includes(parentID)) {
        parentIDs.push(parentID);
      }
    });
    console.log(parentIDs);
    if (parentIDs.length > 1 || $(".aSpouse").length > 1) {
      $(".aSpouse").each(function (index) {
        console.log(parentIDs);
        let spouseID = $(this).data("id");
        let aSpouse = $(this);
        $("#childrenList li").each(function () {
          if ($(this).data("mother") == spouseID || $(this).data("father") == spouseID) {
            $(this).addClass("spouse_" + (parseInt(index) + 1));
            aSpouse.addClass("spouse_" + (parseInt(index) + 1));
          }
        });
      });
    }
  }
}

function list2ol(items, olid) {
  const nList = document.createElement("ol");
  nList.id = olid;
  nList.className = "nameList";
  items[0].parentNode.insertBefore(nList, items[0]);

  const dnaImg = $(
    "<img src='https://www.wikitree.com/images/icons/dna/DNA-confirmed.gif' height='12' width='38' alt='DNA confirmed' class='dnaConfirmed' title='DNA confirmed'>"
  );

  items.forEach(function (item) {
    var dob, dobStatus, dod, dodStatus, ddates, doby, dody, dobyStatus, dodyStatus, dHalf;
    let nLi = document.createElement("li");
    let dNext = item.nextSibling;
    if (dNext) {
      if (dNext.nodeType == 3) {
        if (dNext.textContent.match("private")) {
          let removedAnd = (dNext.textContent = dNext.textContent.replace(" and ", ""));
          let ip = olid.replace(/list/i, "");
          let nSpan = $("<span itemprop='" + ip + "' class='" + ip + "'>" + removedAnd + "</span>");
          nSpan.append($(dNext.nextSibling));
          let nLi2 = $("<li></li>");
          $(nLi2).append(nSpan);
          $(nList).append(nLi2);
        } else {
          item.parentNode.removeChild(item.nextSibling);
        }
      }
    }
    if (item.nextSibling != null) {
      if (item.nextSibling.textContent == "[half]") {
        dHalf = item.nextSibling.cloneNode(true);
        item.parentNode.removeChild(item.nextSibling);
        item.parentNode.removeChild(item.nextSibling);
      }
    }
    let oGender = gender(item.firstChild.textContent);
    if (item.getAttribute("data-private")) {
      if (oGender != null) {
        nLi.setAttribute("data-gender", oGender);
      }
    }

    oGender = "";

    nLi.appendChild(item);
    if (typeof dHalf != "undefined") {
      dHalf.textContent = " [half]";
      dHalf.className = "half";
      nLi.appendChild(dHalf);
    }

    if (item.getAttribute("data-dna")) {
      let anImg = dnaImg.clone();
      nLi.append(anImg[0]);
    }
    nList.appendChild(nLi);

    let dLink = item.querySelector("a");
    if (dLink != "undefined" && dLink != null) {
      let dhref = dLink.href;
      let dbits = dhref.split("wiki/");

      let did = decodeURIComponent(dbits[1].replace(/#.*/, ""));
      let dPeep = "";
      let peeps = window.people;

      let pLen = peeps.length;
      for (let w = 0; w < pLen; w++) {
        if (did == peeps[w].Name.replace(/_/g, " ")) {
          dPeep = peeps[w];
        }
      }
      addDataToPerson($(dLink).closest("li"), dPeep);
      list2ol2(dPeep);
      let dchildren = document.querySelectorAll('span[itemprop="children"]');
    }
  });
  while (nList.nextSibling) {
    nList.parentNode.removeChild(nList.nextSibling);
  }

  window.inserted = false;
  window.insertInterval = setInterval(insertInSibList, 500);
  window.triedInsertSib = 0;
}

function list2ol2(person) {
  let pdata = person;
  let dob, dod, doby, dody;
  let dobStatus = "";
  let dodStatus = "";
  if (pdata != null && pdata != undefined) {
    if (typeof pdata["BirthDate"] != "undefined") {
      dob = pdata["BirthDate"];
      dobStatus = status2symbol(pdata["DataStatus"]["BirthDate"]);
    } else {
      dob = "";
    }
    if (typeof pdata["DeathDate"] != "undefined") {
      dod = pdata["DeathDate"];
      dodStatus = status2symbol(pdata["DataStatus"]["DeathDate"]);
    } else {
      dod = "";
    }

    if (isOK(dob)) {
      doby = dobStatus + dob.split("-")[0];
      if (doby.replace(/[~<>]/, "") == "0000") {
        doby = "   ";
      }
    } else {
      doby = " ";
      var disGender, male, female;
      let disID = htmlEntities(pdata["Name"]);

      if (disID) {
        let disLink = document.querySelector("#nVitals a[href='/wiki/" + disID);

        if (isOK(disLink)) {
          let disTitle = disLink.title;

          const regex1 = /(Daughter)|(Sister)|(Mother)|(Wife)/g;
          const female = disTitle.match(regex1);
          const regex2 = /(\bSon\b)|(\bBrother\b)|(\bFather\b)|(\bHusband\b)/g;
          const male = disTitle.match(regex2);
          if (female == null && male != null) {
            disGender = "male";
          } else if (female != null && male == null) {
            disGender = "female";
          } else {
            disGender = "";
          }

          let dLi = disLink.parentNode.parentNode;
          dLi.setAttribute("data-gender", disGender);

          const regex3 = /[0-9]{4}/g;
          const dobycheck = disTitle.match(regex3);
          if (dobycheck == null) {
            doby = " ";
          } else {
            doby = dobycheck[0];
            dody = "   ";
          }
        }
      }
    }
    if (isOK(dod)) {
      dody = dodStatus + dod.split("-")[0];
      if (dody.replace(/[~<>]/, "") == "0000") {
        dody = "   ";
      }
    } else {
      dody = " ";
    }
    if (isOK(doby)) {
      if (doby.trim() == "") {
        if (person.BirthDateDecade) {
          if (isOK(person.BirthDateDecade)) {
            doby = person.BirthDateDecade;
          }
        }
      }
    }
    if (isOK(dody)) {
      if (dody.trim() == "") {
        if (person.DeathDateDecade) {
          if (isOK(person.DeathDateDecade)) {
            dody = person.DeathDateDecade;
          }
        }
      }
    }
    let ddates = "";
    if (doby != " " || dody != " ") {
      ddates = "(" + doby + " - " + dody + ")";
    } else {
      ddates = "";
    }
    if (typeof ddates == "undefined") {
      ddates = "";
    }

    let datesSpan = document.createElement("span");
    datesSpan.className = "bdDates";
    datesSpan.setAttribute("data-birth-year", doby);
    datesSpan.setAttribute("data-death-year", dody);
    let ddn = document.createTextNode(" " + ddates);
    datesSpan.appendChild(ddn);
    let das = document.querySelectorAll("#nVitals a");
    let done = false;
    let checkit = encodeURIComponent(pdata["Name"]).replaceAll(/%2C/g, ",");
    das.forEach(function (ana) {
      var re = new RegExp(checkit + "$");
      if (ana.href == "https://www.wikitree.com/wiki/" + checkit && done == false) {
        ana.parentNode.appendChild(datesSpan);
        done = true;
        if (typeof pdata["Gender"] != "undefined") {
          if (pdata["Gender"] == "Male") {
            ana.parentNode.parentNode.setAttribute("data-gender", "male");
          } else if (pdata["Gender"] == "Female") {
            ana.parentNode.parentNode.setAttribute("data-gender", "female");
          }

          if (pdata["Gender"] == "" || pdata.DataStatus.Gender == "blank") {
            ana.parentNode.parentNode.setAttribute("data-gender", "");
          }
        }
      }
    });
  }
}

function textNodesUnder(el) {
  var n,
    a = [],
    walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  while ((n = walk.nextNode())) a.push(n);
  return a;
}

async function addChildrenCount() {
  if ($("#childrenCount").length == 0) {
    const siblingLength = $(".VITALS span[itemprop='sibling']").length;
    $("<span id='siblingCount'>(" + siblingLength + ")</span>").insertAfter(
      $(".VITALS span[itemprop='sibling']").eq(siblingLength - 1)
    );

    const childrenLength = $(".VITALS span[itemprop='children']").length;
    $("<span id='childrenCount'>(" + childrenLength + ")</span>").insertAfter(
      $(".VITALS span[itemprop='children']").eq(childrenLength - 1)
    );
  }
}

async function prepareHeadings() {
  $(".VITALS").each(function () {
    let textNodes = textNodesUnder($(this)[0]);
    textNodes.forEach(function (aNode, index) {
      let n1 = aNode;
      let n2 = textNodes[index + 1];
      let pNode = n1.parentNode;
      const regex = /(\bSon\b|\bDaughter\b|\bBrother\b|\bSister\b|\bHusband\b|\bWife\b|\bFather\b|\bMother\b)(\sof)?/;
      let ofMatch = n1.textContent.match("of");
      let regexMatch = n1.textContent.match(regex);
      let wrongMatch = false;
      if (regexMatch && ofMatch == null && n2.textContent.match(" of ") == null) {
        wrongMatch = true;
      }
      if (regexMatch && wrongMatch != true) {
        pNode.removeChild(n1);
        $(pNode).prepend(
          $("<span class='clickable familyListHeading'>" + regexMatch[0].replace(" of", "") + " of </span>")
        );
        if ([" of ", " of\n"].includes(n2.textContent)) {
          pNode.removeChild(n2);
        } else if (n2.textContent.match(" of ")) {
          n2.textContent = n2.textContent.replace(" of ", " ");
        }
      }
    });
  });

  $(".familyListHeading").each(function () {
    let altText;
    let thisID;
    let thisClass;
    if (
      $(this)
        .text()
        .match(/\bSon\b|Daughter/)
    ) {
      altText = "Parents: ";
      thisID = "parentsHeader";
    }
    if (
      $(this)
        .text()
        .match(/\bBrother\b|Sister/)
    ) {
      altText = "Siblings: ";
      thisID = "siblingsHeader";
    }
    if (
      $(this)
        .text()
        .match(/\bHusband\b|Wife/)
    ) {
      altText = "Spouse: ";
      thisClass = "spouseText";
    }
    if (
      $(this)
        .text()
        .match(/Father|Mother/)
    ) {
      altText = "Children: ";
      thisID = "childrenHeader";
    }
    if (thisClass) {
      $(this).addClass(thisClass);
    }
    if (thisID) {
      $(this).prop("id", thisID);
    }
    $(this)
      .attr("data-original-text", $(this).text())
      .attr("data-replace-text", altText)
      .attr("data-alt-text", altText)
      .attr("data-this-text", $(this).text())
      .on("click", function () {
        siblingsHeader();
      });
  });
}

function createPrivateAndDates(aNode, nextSib, ip) {
  let nSpan = document.createElement("span");
  nSpan.setAttribute("itemprop", ip);
  nSpan.setAttribute("data-private", "1");
  $(nSpan).addClass(ip);
  let nComma = document.createTextNode(",");
  let nText = aNode.textContent.replace(/.*\[/, "[");
  nText = nText.replace(/((Brother)|(Sister))\sof\s/, "");
  nText = nText + "]";
  nText = nText.replace(/\s\]/, "]");
  nSpan.appendChild(document.createTextNode(nText));
  let dBDdates = aNode.nextSibling;
  if (dBDdates) {
    dBDdates.className = "bdDates";
    dBDdates.textContent = dBDdates.textContent.replace("unknown", " ");
    dBDdates.setAttribute("data-birth-year", "");
    dBDdates.setAttribute("data-death-year", "");
    nSpan.appendChild(aNode.nextSibling);
  }
  return nSpan;
}

function fixPrivates(thing1, thing2) {
  const ds = document.querySelectorAll(".VITALS span[title^='" + thing1 + "']");
  ds.forEach(function (aSpan) {
    $(aSpan).attr("itemprop", thing2);
    const oTextNodes = textNodesUnder(aSpan);
    oTextNodes.forEach(function (aTextNode) {
      if (aTextNode.textContent.match(/\[.+\s$/)) {
        aTextNode.textContent = aTextNode.textContent.replace(/\s$/, "]");
      }
      if (aTextNode.textContent == "]") {
        aSpan.removeChild(aTextNode);
      }
    });
    const aSmall = $(aSpan).find("small");
    $(aSpan).append(aSmall);
  });
}

function gender(drel) {
  const rgx1 = /(father)|(brother)|(son)/g;
  const rgx2 = /(mother)|(sister)|(daughter)/g;

  if (drel.match(rgx1) != null) {
    return "male";
  } else if (drel.match(rgx2) != null) {
    return "female";
  }

  const males = ["father", "brother", "son"];
  const females = ["mother", "sister", "daughter"];
  if (males.includes(drel)) {
    return "male";
  } else if (females.includes(drel)) {
    return "female";
  }
  return null;
}

function insertInSibList() {
  window.triedInsertSib++;
  if (window.people) {
    const pPerson = window.people[0];
    if (window.inserted == false) {
      if ($("#profilePerson").length == 0 && window.people) {
        pPerson.bYear = "";
        if (pPerson.BirthDate) {
          pPerson.bYear = pPerson.BirthDate.split("-")[0];
        } else if (pPerson.BirthDateDecade) {
          pPerson.bYear = parseInt(pPerson.BirthDateDecade.replace("s", "")) + 5;
        }
        if (pPerson.DeathDate) {
          pPerson.dYear = pPerson.DeathDate.split("-")[0];
        } else if (pPerson.DeathDateDecade) {
          pPerson.dYear = parseInt(pPerson.DeathDateDecade.replace("s", "")) + 5;
        }
        let sibDates = $("#siblingList .bdDates");
        let inserter = "";
        if ($("#siblingList li").length) {
          inserter = $(
            '<li id="profilePerson"><span itemprop="sibling" itemtype="http://schema.org/Person" data-private="0"><a href="#n" class="activeProfile">' +
              displayName(pPerson)[0] +
              '</a><span class="bdDates" data-birth-year="' +
              pPerson.bYear +
              '" data-death-year="' +
              pPerson.dYear +
              '">' +
              displayDates(pPerson) +
              "</span></span></li>"
          );
        }

        let theSib, sibDate, sibBY;
        sibDates.each(function (index) {
          if (!theSib) {
            sibDate = $(this).text().split("-");
            if (sibDate.length > 1) {
              sibBY = sibDate[0];
              if (sibBY.match(/s/) != null) {
                sibBY = parseInt(sibBY.replace(/[s(~<>]/g, "").trim());
              } else {
                sibBY = parseInt(sibBY.replace(/[s(~<>]/g, "").trim());
              }

              if (pPerson.bYear < sibBY) {
                theSib = $(this);
              }
            }
          }
        });
        if ($("#siblingsUnknown").length == 0 && inserter != "") {
          if (!theSib) {
            $("#siblingList").append(inserter);
          } else {
            inserter.insertBefore(theSib.parent().parent());
          }
        }
      }
    }
    if ($(".parent_1").length) {
      $("#profilePerson .bdDates").addClass("parent_1");
    }
    if ($(".parent_2").length) {
      $("#profilePerson").addClass("parent_2");
    }
    try {
      if (pPerson.Gender) {
        if (pPerson.Gender == "Male") {
          $("#profilePerson").attr("data-gender", "male");
        } else if (pPerson.Gender == "Female") {
          $("#profilePerson").attr("data-gender", "female");
        }
        if (pPerson.DataStatus.Gender == "blank" || pPerson.Gender == "") {
          $("#profilePerson").attr("data-gender", "");
        }
      }
    } catch (err) {
      console.log(err);
    }
    $("#addSibling").appendTo($("#addSibling").parent());
    clearInterval(window.insertInterval);
  }
  if (window.triedInsertSib > 9) {
    clearInterval(window.insertInterval);
  }

  // temporary fix
  $("#siblingList li").each(function () {
    if (
      $(this)
        .text()
        .match(/\] and	\[private/)
    ) {
      $(this).remove();
    }
  });
}

function setUpMarriedOrSpouse() {
  if ($(".VITALS span[itemprop='spouse']").length) {
    let spousess;
    if ($(".aSpouse").length > 1) {
      spousess = "s";
    } else {
      spousess = "";
    }
    document.querySelectorAll(".VITALS span[itemprop='spouse']").forEach(function (spoos) {
      let spoosPar = spoos.parentElement;
      let spoosText = spoosPar.firstChild;
      spoosText = spoosText.textContent.trim();
      let newA = document.createElement("a");
      newA.classList.add("spouseText");
      newA.setAttribute("data-alt-text", "Spouse" + spousess + ": ");
      newA.setAttribute("data-original-text", spoosText + " ");
      newA.setAttribute("data-this-text", spoosText + " ");
      newA.setAttribute("data-replace-text", "Spouse" + spousess + ": ");
      newA.setAttribute("data-alt-text", "Spouse" + spousess + ": ");
      newA.innerText = spoosText + " ";
      spoosPar.insertBefore(newA, spoos);
      spoosPar.removeChild(spoosPar.firstChild);
    });

    if ($(".spouseText").length == 0) {
      $(".aSpouse").each(function () {
        let husNode = $(this)
          .contents()
          .filter(function () {
            return this.textContent.match(/^(Husband)|(Wife) of(.*)/);
          });

        if (husNode.length) {
          let husSplit = husNode[0].textContent.split("\n");
          let dReplacer = "Spouse: ";
          let dTexty = husSplit[0];
          let spText = $(
            "<a class='spouseText' data-alt-text='Spouse: ' data-original-text='" +
              husSplit[0] +
              "' data-replace='" +
              dReplacer +
              "' data-text='" +
              dTexty +
              " '>" +
              dTexty +
              " </a>"
          );
          husNode.replaceWith(spText);
          spText.after($(document.createTextNode(husSplit[1])));
        }
      });
    }

    let spouseVITALS = $(".VITALS.spouseDetails");
    spouseVITALS.addClass("aSpouse");
    $("div.aSpouse").each(function (index, el) {
      const marriageSpan = $("<span class='marriageDetails'></span>");
      const spouseName = $(this).find("span[itemprop='spouse']");
      marriageSpan.insertAfter(spouseName);
      while (marriageSpan[0].nextSibling) {
        marriageSpan.append(marriageSpan[0].nextSibling);
      }

      let privateSpouse = marriageSpan.text().match(/private.*\([0-9]{4}/);
      if (privateSpouse != null) {
        let psDates = marriageSpan.find("span.SMALL");
        if (psDates.length) {
          psDates.addClass("bdDates");
          let itemPropSpan = $("<span itemprop='spouse'></span>");
          let spLink = $("<a class='spouseLink privateSpouse'></a>");
          let nameSpan = $("<span itemprop='name'></span>");
          psDates.appendTo(itemPropSpan);
          while (marriageSpan[0].childNodes[0]) {
            nameSpan.append(marriageSpan[0].childNodes[0]);
          }
          nameSpan.appendTo(spLink);
          spLink.prependTo(itemPropSpan);

          itemPropSpan.insertBefore(marriageSpan);
          nameSpan.text(nameSpan.text().replace(" ]", "]"));
        }
      }

      getFeatureOptions("changeFamilyLists").then((options) => {
        if (options.agesAtMarriages) {
          addMarriageAges();
        }
      });
    });

    $(".spouseText").eq(0).prependTo("#spouseDetails");
    $(".spouseText").on("click", function () {
      siblingsHeader();
    });
    spouseToSpouses();
  }
}

function extraBitsForFamilyLists() {
  let noSiblingsPublic = "[sibling(s) unknown]";
  let privateSibsUnknown = $("#siblingDetails").find("a.BLANK");
  let noSpouseSpan = $("<span id='spousesUnknown'></span>");
  if (privateSibsUnknown.length) {
    let sibsUnknown = $("<span id='siblingsUnknown'></span>");
    sibsUnknown.append(privateSibsUnknown);
    sibsUnknown.appendTo("#siblingDetails");
    $("#siblingList").remove();
    $("#parentDetails").prependTo("#nVitals");
    $("#siblingDetails").insertAfter("#parentDetails");
  } else if ($("#siblingDetails").length) {
    let sNodes = $("#siblingDetails")[0].childNodes;
    sNodes.forEach(function (aNode) {
      if (aNode.textContent == noSiblingsPublic && aNode.nodeType == 3) {
        aNode.remove();
        let sibsUnknown = $("<li id='siblingsUnknown'>[sibling(s) unknown]</li>");
        if ($("#siblingList").length == 0) {
          sibsUnknown = $("<span id='siblingsUnknown'> [sibling(s) unknown]</span>");
          $("#siblingDetails").append(sibsUnknown);
        }

        $("#siblingList").append(sibsUnknown);
        let sibWord;
        if ($("meta[content='male']").length) {
          sibWord = "Brother ";
        } else if ($("meta[content='female']").length) {
          sibWord = "Sister ";
        } else {
          sibWord = "Sibling ";
        }

        if ($("#siblingsHeader").length == 0) {
          let sibHeader = $(
            '<span id="siblingsHeader" class="clickable" data-replace-text="' +
              sibWord +
              ' of" data-this-text="Siblings: " data-alt-text="Siblings: " data-original-text="' +
              sibWord +
              ' of">Siblings: </span>'
          );
          $(sibHeader).prependTo($("#siblingDetails"));
        }
      }
    });
  }

  let noChildrenPublic = "[children unknown]";
  let childrenVITALS = $(".VITALS:contains(children)");
  let noChildrenVITALS = $(".VITALS:contains('[children unknown]')");
  childrenVITALS.attr("id", "childrenDetails");
  if ($("#childrenDetails").length && noChildrenVITALS.length) {
    let noKids = childrenVITALS.contents().filter(function () {
      return this.textContent == noChildrenPublic;
    });
    let noKidsSpan = $("<span id='childrenUnknown'></span>");
    noKidsSpan.appendTo($("#childrenDetails"));
    $("#childrenUnknown").append($(noKids));
  }

  let noSpousePublic = "[spouse(s) unknown]";
  let noSpousePrivate = "[spouse?]";
  let spouseVITALS = $(".VITALS.spouseDetails");
  let noSpouseVITALS = $(".VITALS:contains('[spouse(s) unknown]')");
  spouseVITALS.addClass("aSpouse");
  if ($(".aSpouse").length) {
    $(".aSpouse").each(function () {
      let noSpouse = $(this)
        .contents()
        .filter(function () {
          return this.textContent == noSpousePublic;
        });
      if (noSpouse.length == 0) {
        noSpouse = $(this)
          .contents()
          .filter(function () {
            return this.textContent == noSpousePrivate;
          });
      }

      if (noSpouse.length) {
        noSpouseSpan.appendTo($(this));
        $("#spousesUnknown").append($(noSpouse));
        $("#spouseDetails").insertAfter($("#siblingDetails"));
        if ($("#spouseDetails").length == 0) {
          if ($("#siblingDetails").length == 0) {
            $("<div class='VITALS' id='spouseDetails'></div>").insertAfter($("#parentDetails"));
          } else {
            $("<div class='VITALS' id='spouseDetails'></div>").insertAfter($("#siblingDetails"));
          }
        }
      }
      $(this).appendTo($("#spouseDetails"));
    });
  } else if ($("div.VITALS:contains([spouse(s) unknown])").length) {
    let noSpouse = $("div.VITALS:contains([spouse(s) unknown])")
      .contents()
      .filter(function () {
        return this.textContent == noSpousePublic;
      });
    let noSpouseSpan = $("<span id='spousesUnknown'></span>");
    noSpouseSpan.appendTo($("div.VITALS:contains([spouse(s) unknown])"));
    $("#spousesUnknown").append($(noSpouse));
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#siblingDetails").length) {
        spouseDetails.insertAfter($("#siblingDetails"));
      } else if ($("#parentDetails").length) {
        spouseDetails.insertAfter($("#parentDetails"));
      }
    }
    noSpouseSpan.appendTo($("#spouseDetails"));
  } else if ($("a:contains([spouse?])").length) {
    noSpouseSpan = $("<span id='spousesUnknown'></span>");
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#siblingDetails").length) {
        spouseDetails.insertAfter($("#siblingDetails"));
      } else if ($("#parentDetails").length) {
        spouseDetails.insertAfter($("#parentDetails"));
      }
    }
    noSpouseSpan.appendTo($("#spouseDetails"));
    //$("a:contains([spouse?])").appendTo(noSpouseSpan);
  }
  $("#childrenDetails").insertAfter($("#spouseDetails"));
  $("span:contains(private son),span:contains(private father),span:contains(private brother)")
    .closest("li")
    .attr("data-gender", "male");
  $("span:contains(private daughter),span:contains(private sister),span:contains(private mother)")
    .closest("li")
    .attr("data-gender", "female");
}

async function addMarriageAges() {
  window.runningAMA = 0;
  if (window.doneMarriageAges == undefined) {
    window.ama = setInterval(amaTimer, 2000);
    window.doneMarriageAges = false;

    function amaTimer() {
      window.runningAMA++;
      if (window.people[0]?.Spouses != undefined) {
        window.doneMarriageAges = true;
        let oSpouses = Object.entries(window.people[0]?.Spouses);
        oSpouses.forEach(function (aSpouse) {
          let aSp = aSpouse[1];
          if (isOK(aSp.marriage_date)) {
            let bioPersonMarriageAge;
            if (!excludeValues.includes(window.people[0].BirthDate)) {
              bioPersonMarriageAge = getMarriageAge(window.people[0].BirthDate, aSp.marriage_date, window.people[0]);
            }
            let aSpMarriageAge = getMarriageAge(aSp.BirthDate, aSp.marriage_date, aSp);
            let spBit = "";
            let bpBit = "";
            if (bioPersonMarriageAge) {
              bpBit = window.people[0].FirstName + " (" + bioPersonMarriageAge + ")";
            }
            if (isOK(aSp.BirthDate)) {
              spBit = aSp.FirstName + " (" + aSpMarriageAge + ")";
              if (bioPersonMarriageAge) {
                spBit = "; " + spBit;
              }
            }
            $(`.spouseDetails a[href\$="${aSp.Name.replaceAll(/\s/g, "_")}"]`)
              .closest("div")
              .append($("<span class='marriageAges'>" + bpBit + spBit + "</span>"));
          }
        });
      }
      if (window.runningAMA > 10 || window.doneMarriageAges == true) {
        clearInterval(window.ama);
      }
    }
  }
}

function getMarriageAge(d1, d2, mPerson) {
  const bDate = getApproxDate(d1);
  const mDate = getApproxDate(d2);

  let approx = "";

  if (
    bDate.Approx == true ||
    mDate.Approx == true ||
    (mPerson.DataStatus.BirthDate != "certain" && mPerson.DataStatus.BirthDate != "")
  ) {
    approx = "~";
  }
  const dt1 = bDate.Date;
  const dt2 = mDate.Date;
  const ageAtMarriage = getAge(dt1, dt2);
  return approx + ageAtMarriage[0];
}

function getApproxDate(theDate) {
  let approx = false;
  let aDate;
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    const bits = theDate.split("-");
    if (theDate.match(/00\-00$/) != null || !bits[1]) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      aDate = bits[0] + "-" + bits[1] + "-" + "16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

export function getAge(start, end = false) {
  let start_day, start_month, start_year, end_day, end_month, end_year;
  if (typeof start === "object") {
    start_day = parseInt(start.start.date);
    start_month = parseInt(start.start.month);
    start_year = parseInt(start.start.year);
    end_day = parseInt(start.end.date);
    end_month = parseInt(start.end.month);
    end_year = parseInt(start.end.year);
    console.log();
  } else {
    const startSplit = start.split("-");
    start_day = parseInt(startSplit[2]);
    start_month = parseInt(startSplit[1]);
    start_year = parseInt(startSplit[0]);

    const endSplit = end.split("-");
    end_day = parseInt(endSplit[2]);
    end_month = parseInt(endSplit[1]);
    end_year = parseInt(endSplit[0]);
  }

  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (isLeapYear(start_year)) {
    month[1] = 29;
  }
  const firstMonthDays = month[start_month - 1] - start_day;

  let restOfYearDays = 0;
  for (let i = start_month; i < 12; i++) {
    restOfYearDays = restOfYearDays + month[i];
  }
  const firstYearDays = firstMonthDays + restOfYearDays;
  let fullYears = end_year - (start_year + 1);
  let lastYearMonthDays = 0;
  if (isLeapYear(end_year)) {
    month[1] = 29;
  } else {
    month[1] = 28;
  }
  for (let i = 0; i < end_month - 1; i++) {
    lastYearMonthDays = lastYearMonthDays + month[i];
  }
  let lastYearDaysTotal = 0;
  lastYearDaysTotal = end_day + lastYearMonthDays;
  let totalExtraDays = lastYearDaysTotal + firstYearDays;
  let andDays;
  if (totalExtraDays > 364) {
    fullYears++;
    let yearDays = 365;
    if (isLeapYear(start_year) && start_month < 3) {
      yearDays++;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      yearDays++;
    }
    andDays = totalExtraDays - yearDays;
  } else {
    andDays = totalExtraDays;

    if (isLeapYear(start_year) && start_month < 3) {
      totalExtraDays--;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      totalExtraDays--;
    }
  }
  const totalDays = Math.round(fullYears * 365.25) + andDays;
  return [fullYears, andDays, totalDays];
}

function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}

function siblingOf() {
  if ($(".VITALS").length) {
    $(".VITALS").each(function () {
      let elem = $(this)[0];
      for (var nodes = elem.childNodes, i = nodes.length; i--; ) {
        var node = nodes[i],
          nodeType = node.nodeType;
        if (nodeType == 3) {
          if (node.textContent == "Sister of\n" || node.textContent == "Brother of\n") {
            let nSpan = document.createElement("span");
            nSpan.id = "siblingsHeader";
            nSpan.setAttribute("data-replace-text", "Siblings: ");
            nSpan.setAttribute("data-alt-text", "Siblings: ");
            nSpan.setAttribute("data-original-text", node.textContent.replace("\n", " "));
            $(nSpan).addClass("clickable");
            nSpan.setAttribute("data-this-text", node.textContent.replace("\n", " "));
            nSpan.append(node.textContent);
            node.replaceWith(nSpan);
            $("#siblingsHeader").on("click", function () {
              siblingsHeader();
            });
          }

          if (node.textContent == "Daughter" || node.textContent == "Son" || node.textContent == "Child") {
            let nSpan = document.createElement("span");
            nSpan.id = "parentsHeader";
            nSpan.className = "clickable";
            nSpan.setAttribute("data-replace-text", "Parents: ");
            nSpan.setAttribute("data-alt-text", "Parents: ");
            nSpan.setAttribute("data-original-text", node.textContent + " of ");
            nSpan.setAttribute("data-this-text", node.textContent + " of ");

            nSpan.append(node.textContent);
            node.replaceWith(nSpan);

            $("#parentsHeader").on("click", function () {
              siblingsHeader();
            });
            $("#parentsHeader").text($("#parentsHeader").attr("data-this-text"));

            let ofNode = $("#parentsHeader")
              .parent()
              .contents()
              .filter(function () {
                return this.textContent == " of " || this.textContent == " of\n";
              });
            ofNode.remove();
          }

          if (
            node.textContent == "Mother of " ||
            node.textContent == "Mother of\n" ||
            node.textContent == "Father of " ||
            node.textContent == "Father of\n"
          ) {
            let nSpan = document.createElement("span");
            nSpan.id = "childrenHeader";
            nSpan.className = "clickable";
            let cWord;
            if ($("span[itemprop='children']").length > 1) {
              cWord = "Children:\n";
            } else {
              cWord = "Child:\n";
            }

            nSpan.append(node.textContent);
            node.replaceWith(nSpan);
            nSpan.setAttribute("data-replace-text", cWord);
            nSpan.setAttribute("data-alt-text", cWord);
            nSpan.setAttribute("data-original-text", node.textContent);
            nSpan.setAttribute("data-this-text", node.textContent);
            $("#childrenHeader").on("click", function () {
              siblingsHeader();
            });
          }
        }
      }
    });
  }
}

function status2symbol(ostatus) {
  switch (ostatus) {
    case "guess":
      return "~";
      break;
    case "abt":
      return "~";
      break;
    case "before":
      return "<";
      break;
    case "bef":
      return "<";
      break;
    case "after":
      return ">";
      break;
    case "aft":
      return ">";
      break;
    case "certain":
      return "";
      break;
    default:
      return "";
  }
}

function addParentStatus() {
  setTimeout(function () {
    if (window.people) {
      const profileP = window.people[0];
      if (profileP.DataStatus?.Father == "10") {
        $("#parentList li[data-gender='male'] a").append($("<span class='uncertain'>[uncertain]</span>"));
      }
      if (profileP.DataStatus?.Father == "5") {
        $("#parentList li[data-gender='male'] a").append($("<span class='non-biological'>[non-biological]</span>"));
      }
      if (profileP.DataStatus?.Mother == "10") {
        $("#parentList li[data-gender='female'] a").append($("<span class='uncertain'>[uncertain]</span>"));
      }
      if (profileP.DataStatus?.Mother == "5") {
        $("#parentList li[data-gender='female'] a").append($("<span class='non-biological'>[non-biological]</span>"));
      }
    }
  }, 3000);
}
