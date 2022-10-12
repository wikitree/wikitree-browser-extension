import $ from 'jquery';
import {isOK} from '../../core/common';
import './draftList.css';

chrome.storage.sync.get("draftList", (result) => {
  if (result.draftList) {
    // Check that WikiTree BEE hasn't added this already
    if ($("a.drafts").length == 0) {
      addDraftsToFindMenu();
    }
    if ($("body.page-Special_EditPerson").length && $("a.drafts").length) {
      saveDraftList();
    }
  }
});

async function updateDraftList() {
  const profileWTID = $("a.pureCssMenui0 span.person").text();
  let addDraft = false;
  let timeNow = Date.now();
  let lastWeek = timeNow - 604800000;
  let isEditPage = false;
  if (
    $("#draftStatus:contains(saved),#status:contains(Starting with previous)")
      .length
  ) {
    addDraft = true;
    theName = $("h1")
      .text()
      .replace("Edit Profile of ", "")
      .replaceAll(/\//g, "")
      .replaceAll(/ID|LINK|URL/g, "");
  } else if ($("body.page-Special_EditPerson").length) {
    isEditPage = true;
  }
  if (localStorage.drafts) {
    let draftsArr = [];
    let draftsArrIDs = [];
    let drafts = JSON.parse(localStorage.drafts);
    drafts.forEach(function (draft) {
      if (!draftsArrIDs.includes(draft[0])) {
        if (
          (addDraft == false || window.fullSave == true) &&
          draft[0] == profileWTID &&
          isEditPage == true
        ) {
        } else {
          if (draft[1] > lastWeek) {
            draftsArr.push(draft);
            draftsArrIDs.push(draft[0]);
          }
        }
      }
    });

    if (!draftsArrIDs.includes(profileWTID) && addDraft == true) {
      draftsArr.push([profileWTID, timeNow, theName]);
    }

    localStorage.setItem("drafts", JSON.stringify(draftsArr));
  } else {
    if (addDraft == true && window.fullSave != true) {
      localStorage.setItem(
        "drafts",
        JSON.stringify([[profileWTID, timeNow, theName]])
      );
    }
  }
  return true;
}

async function showDraftList() {
  if (localStorage.drafts) {
    await updateDraftList();
  }
  $("#myDrafts").remove();
  $("body").append(
    $("<div id='myDrafts'><h2>My Drafts</h2><x>x</x><table></table></div>")
  );
  $("#myDrafts").dblclick(function () {
    $(this).slideUp();
  });
  $("#myDrafts x").click(function () {
    $(this).parent().slideUp();
  });
  $("#myDrafts").draggable();

  if (localStorage.drafts != undefined && localStorage.drafts != "[]") {
    window.drafts = JSON.parse(localStorage.drafts);
    window.draftCalls = 0;
    window.tempDraftArr = [];
    window.drafts.forEach(function (draft, index) {
      theWTID = draft[0];
      if (!isOK(theWTID)) {
        delete window.drafts[index];
        window.draftCalls++;
      } else {
        $.ajax({
          url:
            "https://www.wikitree.com/index.php?title=" +
            theWTID +
            "&displayDraft=1",
          type: "GET",
          dataType: "html", // added data type
          success: function (res) {
            window.draftCalls++;
            dummy = $(res);
            aWTID = dummy
              .find("h1 button[aria-label='Copy ID']")
              .data("copy-text");
            if (
              dummy.find("div.status:contains('You have an uncommitted')")
                .length
            ) {
              window.tempDraftArr.push(aWTID);
              useLink = dummy.find("a:contains(Use the Draft)").attr("href");
              if (useLink != undefined) {
                personID = useLink.match(/&u=[0-9]+/)[0].replace("&u=", "");
                draftID = useLink.match(/&ud=[0-9]+/)[0].replace("&ud=", "");
                window.drafts.forEach(function (yDraft) {
                  if (yDraft[0] == aWTID) {
                    yDraft[3] = personID;
                    yDraft[4] = draftID;
                  }
                });
              }
            }
            if (window.draftCalls == window.drafts.length) {
              window.newDraftArr = [];
              window.drafts.forEach(function (aDraft) {
                if (
                  window.tempDraftArr.includes(aDraft[0]) &&
                  isOK(aDraft[0])
                ) {
                  window.newDraftArr.push(aDraft);
                }
              });

              newDraftArr.forEach(function (xDraft) {
                dButtons = "<td></td><td></td>";
                if (xDraft[3] != undefined) {
                  dButtons =
                    "<td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                    xDraft[3] +
                    "&ud=" +
                    xDraft[4] +
                    "' class='small button'>USE</a></td><td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                    xDraft[3] +
                    "&dd=" +
                    xDraft[4] +
                    "' class='small button'>DISCARD</a></td>";
                }

                $("#myDrafts table").append(
                  $(
                    "<tr><td><a href='https://www.wikitree.com/index.php?title=" +
                      xDraft[0] +
                      "&displayDraft=1'>" +
                      xDraft[2] +
                      "</a></td>" +
                      dButtons +
                      "</tr>"
                  )
                );
              });
              $("#myDrafts").slideDown();
              if (newDraftArr.length == 0) {
                $("#myDrafts").append($("<p>No drafts!</p>"));
              }
              localStorage.setItem("drafts", JSON.stringify(newDraftArr));
            }
          },
          error: function (res) {},
        });
      }
    });
  } else {
    $("#myDrafts").append($("<p>No drafts!</p>"));
    $("#myDrafts").slideDown();
  }
}

function saveDraftList() {
  window.fullSave = false;
  $("#wpSave").click(function () {
    window.fullSave = true;
  });
  window.addEventListener("beforeunload", (event) => {
    updateDraftList();
  });
  $("#wpSaveDraft").click(function () {
    updateDraftList();
  });
  setInterval(updateDraftList, 60000);
}

function addDraftsToFindMenu() {
  connectionLi = $("li a.pureCssMenui[href='/wiki/Special:Connection']");
  newLi = $(
    "<li><a class='pureCssMenui drafts' id='draftsLink' title='See your uncommitted drafts'>Drafts</li>"
  );
  newLi.insertAfter(connectionLi.parent());
  $("li a.drafts").click(function (e) {
    e.preventDefault();
    showDraftList();
  });
}
