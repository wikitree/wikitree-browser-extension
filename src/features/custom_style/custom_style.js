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
    let important = " !important";
    if (options[key]) {
      let bits = key.split("_");
      let selectors;

      if (bits[0] == "headings") {
        selectors = "h1,h2,h3,h4,h5,h6\n" + "#themeTable caption";
        if (bits[1] == "color") {
          selectors += ",button.copyWidget";
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
        selectors = "span.HISTORY-DATE:not(body.profile .HISTORY-DATE),span.THANKYOU-DATE";
      }
      if (bits[0] == "color1") {
        selectors = "ul.profile-tabs li,\n" + ".ten.columns div.SMALL[style='background-color:#e1f0b4;']";
      }
      if (bits[0] == "color2") {
        selectors = "ul.profile-tabs li.current,\n" + "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color3") {
        selectors = "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color4") {
        selectors = "div.SMALL[style='background-color:#eeeeee;']";
      }

      if (bits[0] == "link") {
        selectors =
          "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,a.qa-tag-link,a.new)";
      }
      if (bits[0] == "link2") {
        selectors = ".qa-q-item-tag-item a:link";
      }
      if (bits[0] == "scissorsText") {
        selectors = "button.copyWidget";
      }
      if (bits[0] == "visitedLink") {
        selectors =
          "a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a)";
      }
      rules += selectors + "{" + bits[1] + ":" + options[key] + important + ";}\n";
    }
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
}
