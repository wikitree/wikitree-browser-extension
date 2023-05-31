import $ from "jquery";
import { restoreOptions, restoreData } from "./upload";

if (window.location.hash) {
  (function (hash, dialog) {
    if (hash.indexOf("#Upload") === 0) {
      showUpload(hash, dialog);
    }
  })(
    window.location.hash,
    $(
      '<dialog id="settingsDialog">' +
        '<div class="dialog-header"></div>' +
        '<div class="dialog-content"></div></div></dialog>'
    )
      .appendTo(document.body)
      .on("close", function () {
        window.close();
      })
  );
}

function showUpload(hash, dialog) {
  dialog.get(0).showModal();
  let launch = function () {};
  let exit = function () {
    window.close();
  };

  function done() {
    $("#btnLaunch, #errorMessage").hide();
    $("#uploadText").text("Your file was processed successfully. Close the window to continue.");
    exit();
  }

  function failed(result) {
    $("#btnLaunch").show();
    $("#errorMessage").text("The file was not valid. Click the button to try another one.").fadeIn();
  }

  if (window.location.hash === "#UploadOptions") {
    dialog.find(".dialog-header").text("Restore Options");
    launch = function () {
      restoreOptions().then(done).catch(failed);
    };
  } else if (window.location.hash === "#UploadData") {
    dialog.find(".dialog-header").text("Restore Data");
    launch = function () {
      restoreData().then(done).catch(failed);
    };
  }

  $(
    '<div style="text-align: center;">' +
      '<p id="uploadText">Click the button below to upload your backup file.</p>' +
      '<p><button id="btnLaunch">Choose File</button>' +
      '<p id="errorMessage"></p></div>'
  ).appendTo(dialog.css("--dialog-height", "200px").find(".dialog-content"));

  $("#btnLaunch").on("click", () => {
    $("#errorMessage").hide();
    launch();
  });

  launch();
}
