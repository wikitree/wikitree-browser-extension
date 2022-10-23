import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "./verifyID.css";
import { extractRelatives, displayName } from "../../core/common";

chrome.storage.sync.get("verifyID", (result) => {
  if (result.verifyID) {
    if ($("body.page-Special_EditFamily").length) {
      checkAttachPersonID();
      // Try not to clash with BEE
      $("body").addClass("verifyID");
    }
  }
});

// Get birth and death dates status as symbols: < ~ >
function bdDatesStatus(person) {
  var bdStatus = "";
  var ddStatus = "";
  if (person != undefined) {
    if (typeof person["DataStatus"] != "undefined") {
      if (person["BirthDate"] != "0000-00-00") {
        if (person["DataStatus"]["BirthDate"] != "") {
          if (person["DataStatus"]["BirthDate"] == "guess") {
            bdStatus = "~";
          } else if (person["DataStatus"]["BirthDate"] == "before") {
            bdStatus = "<";
          } else if (person["DataStatus"]["BirthDate"] == "after") {
            bdStatus = ">";
          }
        }
      }
    }

    if (typeof person["DataStatus"] != "undefined") {
      if (person["DeathDate"] != "0000-00-00") {
        if (person["DataStatus"]["DeathDate"] != "") {
          if (person["DataStatus"]["DeathDate"] == "guess") {
            ddStatus = "~";
          } else if (person["DataStatus"]["DeathDate"] == "before") {
            ddStatus = "<";
          } else if (person["DataStatus"]["DeathDate"] == "after") {
            ddStatus = ">";
          }
        }
      }
    }

    return [bdStatus, ddStatus];
  } else {
    return ["", ""];
  }
}

// Make dates to display e.g. 1990s -> ~1995
function displayDates(fPerson) {
  if (fPerson != undefined) {
    const mbdDatesStatus = bdDatesStatus(fPerson);
    const bdStatus = mbdDatesStatus[0];
    const ddStatus = mbdDatesStatus[1];

    let fbd = "";
    let fdd = "";

    if (
      fPerson["BirthDate"] != "" &&
      fPerson["BirthDate"] != "0000-00-00" &&
      typeof fPerson["BirthDate"] != "undefined" &&
      fPerson["BirthDate"] != "unknown"
    ) {
      fbd = fPerson["BirthDate"].split("-")[0];
    } else if (
      typeof fPerson["BirthDateDecade"] != "undefined" &&
      fPerson["BirthDateDecade"] != "unknown"
    ) {
      fbd = fPerson["BirthDateDecade"];
      decadeMidpoint = fPerson["BirthDateDecade"].slice(0, -2) + 5;
    } else {
      fbd = "";
    }

    if (typeof fPerson["IsLiving"] != "undefined") {
      if (fPerson["IsLiving"] == 1) {
        fdd = "living";
      }
    }
    if (fdd == "") {
      if (
        fPerson["DeathDate"] != "" &&
        fPerson["DeathDate"] != "0000-00-00" &&
        typeof fPerson["DeathDate"] != "undefined"
      ) {
        fdd = fPerson["DeathDate"].split("-")[0];
      } else if (
        typeof fPerson["DeathDateDecade"] != "undefined" &&
        fPerson["DeathDateDecade"] != "unknown"
      ) {
        fdd = fPerson["DeathDateDecade"];
        decadeMidpoint = fPerson["DeathDateDecade"].slice(0, -2) + 5;
      } else {
        fdd = "";
      }
    }

    const fDates = "(" + bdStatus + fbd + " - " + ddStatus + fdd + ")";

    return fDates;
  } else {
    return "";
  }
}

// Make relatives easier to handle as arrays
function addRelativeArraysToPerson(zPerson) {
  const zSpouses = extractRelatives(zPerson.Spouses, zPerson, "Spouse");
  zPerson.Spouse = zSpouses;
  const zChildren = extractRelatives(zPerson.Children, zPerson, "Child");
  zPerson.Child = zChildren;
  const zSiblings = extractRelatives(zPerson.Siblings, zPerson, "Sibling");
  zPerson.Sibling = zSiblings;
  const zParents = extractRelatives(zPerson.Parents, zPerson, "Parent");
  zPerson.Parent = zParents;
  return zPerson;
}

// Show some details of the profile entered in the "Add parent/etc." box
async function checkAttachPersonID() {
  $("body.page-Special_EditFamily #mName").keyup(function () {
    $("#verification").remove();
    if (window.timeoutId) {
      clearTimeout(timeoutId);
    }
    if (
      $(this)
        .val()
        .match(/.+\-.+/)
    ) {
      const theKey = $(this).val();
      window.timeoutId = setTimeout(function () {
        $.ajax({
          url: "https://api.wikitree.com/api.php",
          crossDomain: true,
          xhrFields: { withCredentials: true },
          type: "POST",
          dataType: "json",
          data: {
            action: "getRelatives",
            getParents: "1",
            getSiblings: "0",
            getSpouses: "0",
            getChildren: "0",
            keys: theKey,
            fields: "*",
          },
          success: function (data) {
            let ah2 = $("<h3>?</h3>");
            let aUL = $("<ul></ul>");
            if (data[0]?.items) {
              let person = data[0].items[0].person;
              person = addRelativeArraysToPerson(person);
              $("#mName").after($("<div id='verification'><x>x</x></div>"));
              $("#verification").draggable();
              if (person.Created) {
                console.log(displayName(person)[0], displayDates(person, true));
                ah2 = $(
                  "<h3><a href='https://www.wikitree.com/wiki/" +
                    person.Name +
                    "' target='_blank'>" +
                    displayName(person)[0] +
                    " " +
                    displayDates(person, true) +
                    "</a></h3>"
                );
                if (person.BirthLocation && person.BirthLocation != null) {
                  aUL.append($("<li>b. " + person.BirthLocation + "</li>"));
                }
                if (person.DeathLocation && person.DeathLocation != null) {
                  aUL.append($("<li>d. " + person.DeathLocation + "</li>"));
                }
                const oRels = ["Parent"];
                oRels.forEach(function (aR) {
                  let psWord = aR + "s";
                  if (person[aR].length == 1) {
                    psWord = aR;
                  }
                  if (aR == "Child" && person[aR].length > 1) {
                    psWord = "Children";
                  }
                  if (person[aR].length > 0) {
                    const newSection = $(
                      "<section><h4>" + psWord + "</h4><ul></ul></section>"
                    );
                    person[aR].forEach(function (aP) {
                      newSection
                        .find("ul")
                        .append($("<li>" + displayName(aP)[0] + "</li>"));
                    });
                    $("#verification").append(newSection);
                  }
                });
              } else {
                ah2 = $("<h3>Private</h3>");
                aUL = $("<ul></ul>");
              }
            } else {
              ah2 = $("<h3>?</h3>");
              aUL = $("<ul></ul>");
            }
            $("#verification").prepend(aUL).prepend(ah2);
            $("#verification").dblclick(function () {
              $(this).fadeOut();
            });
            $("#verification x").click(function () {
              $("#verification").fadeOut();
            });
          },
        });
      }, 500);
    }
  });
}
