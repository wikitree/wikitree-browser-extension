import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("surnameTable").then((result) => {
  if (result) {
    import("./surname_table.css");
    initSurnameTable();
  }
});
