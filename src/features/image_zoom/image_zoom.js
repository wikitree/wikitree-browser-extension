import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("imageZoom").then((result) => {
  if (result) {
    setupImageZoom();
  }
});

function setupImageZoom() {
  let hoverTimer; // timer for hover delay
  let zoomedImage = null;
  let originalPosition = {};

  // Separate event delegation for images with the class "scale-with-grid"
  $(document).on("mouseover", "img.scale-with-grid", function (e) {
    const alt = $(this).attr("alt");
    if (this.src) {
      originalPosition = $(this).offset();
      $(this).on("wheel", function (e) {
        e.preventDefault();
        const delta = Math.sign(e.originalEvent.deltaY);
        let scaleFactor;
        if (delta < 0) {
          scaleFactor = 1.1;
        } else {
          scaleFactor = 0.9;
        }

        let scale = $(this).data("scale") || 1;
        scale = scale * scaleFactor;
        $(this).css("transform", `scale(${scale})`);
        $(this).data("scale", scale);
      });
      $(this).draggable();
    }
  });

  $(document).on("mouseout", "img.scale-with-grid", function () {
    $(this).off("wheel"); // remove wheel event
    $(this).css("transform", `scale(1)`); // reset scaling
    $(this).data("scale", 1); // reset scale data
    $(this).draggable("destroy");
    $(this).offset(originalPosition);
  });

  // Separate event delegation for images with "thumb" in their src
  $(document).on("mouseover", "img[src*='thumb']:not(.commenter-image)", function (e) {
    const src = $(this).attr("src");
    const alt = $(this).attr("alt");
    if (
      src &&
      !(
        $(".x-privacy img[title*='Privacy Level: Private']").length &&
        $(this).closest("#content.x-profile-person").length
      )
    ) {
      const newSrc = src.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
      hoverTimer = setTimeout(function () {
        setupDarkScreen();
        const imgElement = $("<img>", {
          src: newSrc,
          alt: alt,
          class: "zoom-image",
          css: {
            position: "absolute",
            width: "400px",
            boxShadow: "5px 5px 15px rgba(0,0,0,0.3)", // shadow
            zIndex: 20001,
            border: "2px solid white",
          },
        });
        imgElement.appendTo("body");
        imgElement.css({
          top: ($(window).height() - imgElement.height()) / 2 + $(window).scrollTop(),
          left: ($(window).width() - imgElement.width()) / 2,
        });
        imgElement.draggable();
        imgElement.dblclick(function () {
          $(".dark-screen").remove();
          imgElement.remove();
        });
        imgElement.on("wheel", function (e) {
          e.preventDefault();
          const delta = Math.sign(e.originalEvent.deltaY);
          let scaleFactor;
          if (delta < 0) {
            scaleFactor = 1.1;
          } else {
            scaleFactor = 0.9;
          }

          let scale = $(this).data("scale") || 1;
          scale = scale * scaleFactor;
          $(this).css("transform", `scale(${scale})`);
          $(this).data("scale", scale);
        });
        zoomedImage = imgElement;
      }, 1000); // 1 second delay before showing the image
    }
  });

  $(document).on("mouseout", "img[src*='thumb']:not(.commenter-image)", function () {
    clearTimeout(hoverTimer);
  });

  $(document).on("click", function (e) {
    if (!zoomedImage || $(e.target).is(zoomedImage)) return;
    $(".dark-screen").remove();
    zoomedImage.remove();
    zoomedImage = null;
  });

  function setupDarkScreen() {
    let darkScreen = $("<div>").appendTo("body");
    darkScreen.css({
      position: "fixed",
      top: 0,
      left: 0,
      height: "100%",
      width: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 20000,
    });
    darkScreen.addClass("dark-screen");
  }
}
