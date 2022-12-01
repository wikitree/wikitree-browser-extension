import $ from "jquery";
//import "./my_feature.css";
import { createProfileSubmenuLink } from "../../core/common";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("customStyle").then((result) => {
  if (result) {
    initCustomStyle();
    const options = {
      title: "Add or/remove sections for a minimal view",
      id: "minimalButton",
      text: "Minimal View",
      url: "#n",
    };
    createProfileSubmenuLink(options);
  }
});

async function initCustomStyle() {
  let rules = "";
  const options = await getFeatureOptions("customStyle");
  const keys = Object.keys(options);
  keys.forEach(function (key) {
    if (options[key]) {
      let bits = key.split("_");
      if (bits[0] == "hide") {
        if (["DNA", "Collaboration", "Research", "Images"].includes(bits[1])) {
          $(".six.columns span.large:contains('" + bits[1] + "')")
            .closest("div")
            .hide();
        } else if (["comments", "footer"].includes(bits[1])) {
          rules += "#" + bits[1] + "{display:none;}\n";
        } else if (bits[1] == "Matches") {
          $(
            ".sixteen.columns span.large:contains('Matches and Merges'),.five.columns span.large:contains('Pending Merges'),.five.columns span.large:contains('Unmerged Matches'),.five.columns span.large:contains('Rejected Matches')"
          )
            .closest("div")
            .hide();
        } else if (bits[1] == "more-genealogy-tools-button") {
          $("a.button.small:contains(More Genealogy Tools)").closest("p").hide();
        } else if (bits[1] == "profiles-of-the-week") {
          rules +=
            "body.profile div.sixteen.columns div.box.rounded.row:contains('degrees from'),#themeTable {display:none}\n";
          $("body.profile div.sixteen.columns p:contains('degrees from')").closest("div.sixteen.columns").hide();
        } else if (bits[1] == "what-links-here") {
          rules += "#whatLinksHereSection {display:none;}\n";
        }
      } else {
        if (bits[0] == "headings") {
          bits[0] = "h1,h2,h3,\n" + "#themeTable caption";
          if (bits[1] == "color") {
            bits[0] += ",button.copyWidget";
          }
        }
        if (bits[1] == "padding") {
          options[key] += "px";
        }
        if (bits[1] == "border-radius") {
          options[key] += "px";
        }
        if (bits[1] == "box-shadow") {
          options[key] = options[key] += "px " + options[key] + "px " + options[key] + "px " + options[key] + "px gray";
          //          options[key] += "px";
        }
        if (bits[0] == "date-headings") {
          bits[0] = "span.HISTORY-DATE,span.THANKYOU-DATE";
        }
        if (bits[0] == "color1") {
          bits[0] =
            "ul.profile-tabs li,.ten.columns div.SMALL[style='background-color:#e1efbb;']," +
            ".qa-voting,li.qa-q-item-tag-item a,\n" +
            "td.qa-form-tall-label,\n" +
            "a.qa-nav-main-link.qa-nav-main-selected:link,\n" +
            ".qa-form-tall-data";
        }
        if (bits[0] == "color2") {
          bits[0] =
            "span.qa-a-count,\n" +
            "ul.profile-tabs li.current,\n" +
            "div.SMALL[style='background-color:#ffe183;'],\n" +
            "span.qa-q-item-who-title,\n" +
            ".qa-nav-main-link:hover,\n" +
            ".qa-nav-sub-link:hover";
        }
        if (bits[0] == "color3") {
          bits[0] = "span.qa-q-item-who-title";
        }

        if (bits[0] == "link") {
          bits[0] = "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link)";
        }
        if (bits[0] == "link2") {
          bits[0] = ".qa-q-item-tag-item a:link";
        }

        rules += bits[0] + "{" + bits[1] + ":" + options[key] + " !important;}\n";
      }
    }
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
}
