import $ from "jquery";
import { restoreOptions, restoreData } from "./upload";

if (window.location.hash) {
  if (window.location.hash.indexOf("#Upload") === 0) {
    let launch = function () {};
    let exit = function () {
      window.close();
    };

    function done() {
      $("#btnLaunch").hide();
      $("#btnDone").show();
      exit();
    }

    function failed() {
      alert("The file was not valid.");
      $("#btnLaunch").show();
      $("#btnDone").hide();
    }

    if (window.location.hash === "#UploadOptions") {
      $("<h1>Upload Options<h1>").prependTo(document.body);
      launch = function () {
        restoreOptions().then(done).catch(failed);
      };
    } else if (window.location.hash === "#UploadData") {
      $("<h1>Upload Data<h1>").prependTo(document.body);
      launch = function () {
        restoreData().then(done).catch(failed);
      };
    }

    $(
      '<div style="margin-top: 35vh; text-align: center;"><button id="btnLaunch">Choose File</button><button id="btnDone">Continue</button></div>'
    ).appendTo(document.body);
    $("#btnLaunch").on("click", () => {
      launch();
    });
    $("#btnDone")
      .hide()
      .on("click", () => {
        exit();
      });

    launch();
  }
}
