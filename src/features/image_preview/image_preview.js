import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("imagePreview").then((result) => {
  if (result) {
    setupImagePreview();
  }
});

function setupImagePreview() {
  let hoverTimer; // timer for hover delay
  let zoomedImage = null;

  // Separate event delegation for images with the class "scale-with-grid"
  $(document).on("mouseover", "img.scale-with-grid", function (e) {
    clearTimeout(hoverTimer); // clear hover timer here
    console.log("mouseover on scale-with-grid");
    const alt = $(this).attr("alt");
    if (this.src) {
      // Remove the existing image preview if any
      $(".preview-image").remove();
      $(".dark-screen").remove();
      // Just add wheel event for zoom functionality
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
      $(this).draggable({
        start: function (event, ui) {
          $(this).data("originalTop", $(this).css("top"));
          $(this).data("originalLeft", $(this).css("left"));
        },
      });
    }
  });

  // Add mouseout event to remove the zoom functionality from "scale-with-grid" images
  $(document).on("mouseout", "img.scale-with-grid", function () {
    $(this).off("wheel"); // remove wheel event
    $(this).css("transform", `scale(1)`); // reset scaling
    $(this).data("scale", 1); // reset scale data
    // Check if the image is draggable before destroying it
    if ($(this).data("ui-draggable")) {
      $(this).draggable("destroy");
    }
    $(this).css({
      top: $(this).data("originalTop"),
      left: $(this).data("originalLeft"),
    });
  });

  // Separate event delegation for images with "thumb" in their src
  $(document).on("mouseover", "img[src*='thumb']", function (e) {
    clearTimeout(hoverTimer); // clear hover timer here
    console.log("mouseover on thumb");
    const src = $(this).attr("src");
    const alt = $(this).attr("alt");
    if (src) {
      const newSrc = src.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
      hoverTimer = setTimeout(function () {
        // Set up a dark screen
        setupDarkScreen();
        // create an img element
        const imgElement = $("<img>", {
          src: newSrc,
          alt: alt,
          class: "preview-image",
          css: {
            position: "absolute",
            width: "400px",
            boxShadow: "5px 5px 15px rgba(0,0,0,0.3)", // shadow
            zIndex: 20001,
            border: "2px solid white",
          },
        }).on("load", function () {
          // Recalculate top and left after image loads
          $(this).css({
            top: ($(window).height() - $(this).height()) / 2 + $(window).scrollTop(),
            left: ($(window).width() - $(this).width()) / 2,
          });
        });
        // append the image to body
        imgElement.appendTo("body");
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

  // Remove the preview when clicking outside the image
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
