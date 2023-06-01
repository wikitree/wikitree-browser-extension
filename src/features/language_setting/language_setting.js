import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("languageSetting").then((result) => {
  if (result) {
    setLanguage();
  }
});

function setLanguage() {
  getFeatureOptions("languageSetting").then((options) => {
    window.languageSettingOptions = options;
    setTimeout(() => {
      if (options.language) {
        $("#mOptions_person_language").val(options.language);
        $("#languageToggleRow").hide();
        $("#languageRow").show();
      }
      if (window.languageSettingOptions.changeDefaultFromSelect) {
        $("#mOptions_person_language").on("change", function () {
          const language = $(this).val();
          window.languageSettingOptions.language = language;
          const storageName = "languageSetting_options";
          chrome.storage.sync.set({
            [storageName]: window.languageSettingOptions,
          });
        });
      }
    }, 1000);
  });
}
