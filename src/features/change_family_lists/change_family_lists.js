import $ from "jquery";
import "./change_family_lists.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("changeFamilyLists").then((result) => {
  if (result) {
    prepareFamilyLists().then(() => {
      moveFamilyLists(true);
    });
    window.onresize = function () {
      if ($("body.profile").length && window.location.href.match("Space:") == null) {
        moveFamilyLists(true);
      }
    };
  }
});

async function prepareFamilyLists() {
  const featureId = "changeFamilyLists";
  const optionsData = getFeatureOptions(featureId).then((options) => {
    console.log(options);
  });

  if ($("body.profile").length && window.location.href.match("Space:") == null) {
    const ourVitals = $("div.ten div.VITALS");
    const familyLists = $("<div id='familyLists'></div>");
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
            .match(/^Son|^Daughter|^Child/)
        ) {
          $(this).prop("id", "parentDetails");
        }
        if (
          $(this)
            .text()
            .match(/^Sister|^Brother|^Sibling/)
        ) {
          $(this).prop("id", "siblingDetails");
        }
        if (
          $(this)
            .text()
            .match(/^Wife|^Husband|^Spouse/)
        ) {
          $(this).addClass("spouseDetails");
        }
        if (
          $(this)
            .text()
            .match(/^Father|^Mother|^Parent/)
        ) {
          $(this).prop("id", "childrenDetails");
        }
        $(this).appendTo(familyLists);
      }
    });
    familyLists.on("dblclick", function () {
      moveFamilyLists();
    });
  }
}

async function moveFamilyLists(firstTime = false) {
  $("#parentDetails").prepend($("span.showHideTree"));
  $("#childDetails").prepend($("span#showHideDescendants"));
  const leftHandColumn = $("div.ten").eq(0).prop("id", "leftColumn");
  const rightHandColumn = $("div.six").eq(0).prop("id", "rightColumn");
  const familyLists = $("#familyLists");

  if (firstTime == false) {
    let right;
    if (window.innerWidth < 768 || rightHandColumn.find(familyLists).length) {
      familyLists.fadeOut("slow", function () {
        familyLists.insertAfter($("#birthDetails"));
        familyLists.fadeIn("slow");
      });
      right = false;
    } else {
      familyLists.fadeOut("slow", function () {
        familyLists.insertBefore($("#geneticfamily"));
        familyLists.fadeIn("slow");
      });
      right = true;
    }
    const optionsData = { moveToRight: right };
    console.log(optionsData);
    const storageName = "changeFamilyLists_options";
    chrome.storage.sync.set(
      {
        [storageName]: optionsData,
      },
      function () {
        chrome.runtime.sendMessage({ message: "restore_options" });
      }
    );
  } else {
    if (window.innerWidth < 768) {
      familyLists.insertAfter($("#birthDetails"));
    } else {
      familyLists.insertBefore($("#geneticfamily"));
    }
  }
  /*
        else if (sync.w_dataRight == 1) {
      if (window.sc) {
        pppA = window.sc.querySelector("a[href='/wiki/Project_protection']");
        if (pppA) {
          pppDiv = pppA.parentElement;
          if (wasClicked == 1) {
            $(nVitals).fadeOut("slow", function () {
              window.sc.insertBefore(nVitals, pppDiv.nextSibling);
              $(nVitals).fadeIn("slow");
            });
          } else {
            window.sc.insertBefore(nVitals, pppDiv.nextSibling);
          }
        } else if (typeof nVitals != "undefined") {
          if (wasClicked == 1) {
            $(nVitals).fadeOut("slow", function () {
              window.sc.insertBefore(nVitals, sc.firstChild);
              $(nVitals).fadeIn("slow");
            });
          } else {
            if (nVitals) {
              window.sc.insertBefore(nVitals, sc.firstChild);
            }
          }
        }
      }
    }
    */
}
