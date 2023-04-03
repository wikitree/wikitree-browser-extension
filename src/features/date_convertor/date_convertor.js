import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

function flipEuroDates() {
  $("#mBirthDate,#mDeathDate").on("change", function () {
    const euDateMatch = $(this)
      .val()
      .replace(/\./g, "-")
      .match(/([0-9]{2})[/-]([0-9]{2})[/-]([0-9]{4})/);
    if (euDateMatch != null) {
      $(this).val(euDateMatch[3] + "-" + euDateMatch[2] + "-" + euDateMatch[1]);
    }
  });
}

checkIfFeatureEnabled("dateConvertor").then((result) => {
  if (result) {
    flipEuroDates();
  }
});
