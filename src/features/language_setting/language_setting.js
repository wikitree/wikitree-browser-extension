import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("languageSetting").then((result) => {
  if (result) {
    setLanguage();
  }
});

function setLanguage() {
  getFeatureOptions("languageSetting").then((options) => {
    console.log(options);
    window.languageSettingOptions = options;
    setTimeout(() => {
      if (options.language) {
        console.log(options);
        $("#mOptions_person_language").val(options.language);
        $("#languageToggleRow").hide();
        $("#languageRow").show();
      }
      $("#mOptions_person_language").on("change", function () {
        const language = $(this).val();
        window.languageSettingOptions.language = language;
        const storageName = "languageSetting_options";
        chrome.storage.sync.set({
          [storageName]: window.languageSettingOptions,
        });
      });
    }, 1000);
  });
}
