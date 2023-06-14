/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./g2g_.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
shouldInitializeFeature("usabilityTweaks").then((result) => {
  if (result) {
    setupImagePreview();
  }
});

function setupImagePreview() {
  const imagePreview = document.createElement("div");
  imagePreview.id = "imagePreview";
  imagePreview.style.display = "none";
  imagePreview.style.border = "2px solid #000"; // Border styling
  imagePreview.style.boxShadow = "5px 5px 15px rgba(0,0,0,0.3)"; // Adding a shadow for a stylish look
  document.body.appendChild(imagePreview);

  let hoverTimer; // timer for hover delay

  $(document).on(
    {
      mouseover: function (e) {
        console.log("mouseover");
        const src = $(this).attr("src");
        const alt = $(this).attr("alt");
        if (src && src.includes("thumb")) {
          hoverTimer = setTimeout(function () {
            // delay the execution
            const newSrc = src.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
            $("#imagePreview").html(`<img src="${newSrc}" width="300" alt="${alt}">`);
            $("#imagePreview").fadeIn(200);
            let xPos = e.pageX + 50;
            let yPos = e.pageY + 50;
            if (xPos + 300 > $(window).width()) {
              xPos = $(window).width() - 310;
            }
            if (yPos + $("#imagePreview").height() > $(window).height()) {
              yPos = $(window).height() - ($("#imagePreview").height() + 10);
            }
            $("#imagePreview").css({
              position: "absolute",
              top: yPos,
              left: xPos,
            });
          }, 1000); // 1000ms delay before showing the preview
        }
      },
      mouseout: function () {
        clearTimeout(hoverTimer); // cancel the timer if the mouse has moved out before the delay
        $("#imagePreview").fadeOut(200);
      },
    },
    "img"
  );
}

$(document).ready(function () {
  setupImagePreview();
});
