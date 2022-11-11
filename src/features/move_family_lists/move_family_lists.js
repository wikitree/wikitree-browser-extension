import $ from "jquery";
import "./move_family_lists.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("moveFamilyLists").then((result) => {
  if (result) {
    moveFamilyLists();
  }
});

async function moveFamilyLists() {
  if ($("body.profile").length && window.location.href.match("Space:") == null) {
    const ourVitals = $("div.ten div.VITALS");
    const familyLists = $("<div id='familyLists'></div>");
    ourVitals.each(function () {
      console.log($(this).text());
      if ($(this).find("span[itemprop='givenName']").length) {
        $(this).prop("id", "profileName");
      } else if ($(this).text().match(/^Born/)) {
        $(this).prop("id", "birthDetails");
        $(this).after(familyLists);
      } else if ($(this).text().match(/^Died/)) {
        $(this).prop("id", "birthDetails");
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
          $(this).prop("id", "childDetails");
        }
        $(this).appendTo(familyLists);
      }
    });
    $("#parentDetails").prepend($("span.showHideTree"));
    $("#childDetails").prepend($("span#showHideDescendants"));
    const leftHandColumn = $("div.ten").eq(0).prop("id", "leftColumn");
    const rightHandColumn = $("div.six").eq(0).prop("id", "rightColumn");

    if (window.innerWidth < 750 || rightHandColumn.find("#familyLists").length) {
      familyLists.fadeOut("slow", function () {
        familyLists.insertAfter($("#birthDetails"));
        familyLists.fadeIn("slow");
      });
    } else {
      familyLists.fadeOut("slow", function () {
        familyLists.insertBefore($("#geneticfamily"));
        familyLists.fadeIn("slow");
      });
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
}
