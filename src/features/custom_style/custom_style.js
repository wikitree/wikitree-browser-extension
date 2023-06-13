import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("customStyle").then((result) => {
  if (result) {
    initCustomStyle();
    import("./custom_style.css");
  }
});

async function initCustomStyle() {
  let rules = "";
  const options = await getFeatureOptions("customStyle");
  const keys = Object.keys(options);
  keys.forEach(function (key) {
    if (options[key]) {
      let bits = key.split("_");

      if (bits[0] == "headings") {
        bits[0] = "h1,h2,h3,\n" + "#themeTable caption";
        if (bits[1] == "color") {
          bits[0] += ",button.copyWidget";
        }
      }
      if (bits[1] == "padding" || bits[1] == "border-radius") {
        options[key] += "px";
      }

      if (bits[1] == "box-shadow") {
        options[key] = options[key] += "px " + options[key] + "px " + options[key] + "px " + options[key] + "px gray";
        //          options[key] += "px";
      }
      if (bits[0] == "date-headings") {
        bits[0] = "span.HISTORY-DATE:not(body.profile .HISTORY-DATE),span.THANKYOU-DATE";
      }
      if (bits[0] == "color1") {
        bits[0] = "ul.profile-tabs li,\n" + ".ten.columns div.SMALL[style='background-color:#e1f0b4;']";
      }
      if (bits[0] == "color2") {
        bits[0] = "ul.profile-tabs li.current,\n" + "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color3") {
        bits[0] = "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color4") {
        bits[0] = "div.SMALL[style='background-color:#eeeeee;']";
      }

      /*
        ".qa-voting,li.qa-q-item-tag-item a,\n" +
          "td.qa-form-tall-label,\n" +
          "a.qa-nav-main-link.qa-nav-main-selected:link,\n" +
          ".qa-form-tall-data";
      */

      /* 

          "span.qa-a-count,\n" +
          "ul.profile-tabs li.current,\n" +
          "div.SMALL[style='background-color:#ffe183;'],\n" +
          "span.qa-q-item-who-title,\n" +
          ".qa-nav-main-link:hover,\n" +
          ".qa-nav-sub-link:hover";

          */

      /*
 + "span.qa-q-item-who-title";
          */

      if (bits[0] == "link") {
        bits[0] =
          "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,a.qa-tag-link,a.new)";
      }
      if (bits[0] == "link2") {
        bits[0] = ".qa-q-item-tag-item a:link";
      }
      if (bits[0] == "scissorsText") {
        bits[0] = "button.copyWidget";
      }
      if (bits[0] == "visitedLink") {
        bits[0] =
          "a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a)";
      }

      rules += bits[0] + "{" + bits[1] + ":" + options[key] + " !important;}\n";
    }
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
}
