import $ from "jquery";
//import "./my_feature.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("customStyle").then((result) => {
  if (result) {
    initCustomStyle();
  }
});

async function initCustomStyle() {
  let rules = "";
  const options = await getFeatureOptions("customStyle");
  const keys = Object.keys(options);
  keys.forEach(function (key) {
    let bits = key.split("_");
    if (bits[0] == "headings") {
      bits[0] = "h1,h2,h3";
    }
    rules += bits[0] + "{" + bits[1] + ":" + options[key] + ";}\n";
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
}
