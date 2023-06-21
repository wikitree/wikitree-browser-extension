import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("imageZoom").then((result) => {
  if (result) {
    import("./image_zoom.css");
    setupImageZoom();
  }
});

function wheelZoomHandler(e) {
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
}

function createZoomedImage(src, alt) {
  const imgElement = $("<img>", {
    src: src,
    alt: alt,
    class: "zoom-image",
    css: {
      position: "absolute",
      width: "auto",
      maxWidth: "100%",
      maxHeight: "100%",
      boxShadow: "5px 5px 15px rgba(0,0,0,0.3)",
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
  imgElement.on("wheel", wheelZoomHandler);
  imgElement.on("click", function () {
    let scale = $(this).data("scale") || 1;
    scale = scale * 1.1; // Choose your scale factor, 1.1 as an example
    $(this).css("transform", `scale(${scale})`);
    $(this).data("scale", scale);
  });
  setupDarkScreen(imgElement);
  return imgElement;
}

function setupDarkScreen(zoomedImage) {
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
  darkScreen.on("click", function () {
    if (zoomedImage) {
      zoomedImage.remove();
    }
    $(".dark-screen").remove();
  });
}

function setupImageZoom() {
  let hoverTimer;
  let zoomedImage = null;
  let originalPosition = {};
  let mouseOutTimer = null;

  $(document).on(
    "mouseover",
    "a:has(img.scale-with-grid), a:has(img[src*='thumb']:not(.commenter-image))",
    function (e) {
      clearTimeout(mouseOutTimer);
      let img = $(this).find("img");
      let imgSrc = img.attr("src");
      let imgAlt = img.attr("alt");

      // Check if an overlay already exists for this image
      if (img.parent().find(".image_zoom_overlay").length > 0) {
        return; // If it does, exit the function
      }

      if (imgSrc) {
        if (imgSrc.includes("thumb")) {
          imgSrc = imgSrc.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
        }

        originalPosition = img.offset();
        let parent = $(this).css({ display: "inline-block", position: "relative" });
        const overlay = $('<div class="image_zoom_overlay">+</div>').appendTo(parent);

        overlay.css({ "z-index": 99999, position: "absolute", bottom: "0", right: "0" });

        overlay.one("pointerdown", (e) => {
          console.log("overlay clicked");
          e.preventDefault();
          e.stopPropagation();
          createZoomedImage(imgSrc, imgAlt);
          overlay.hide();
          return false;
        });

        overlay.on("mouseover", (e) => {
          $(this)
            .closest("a")
            .on("click", function (e) {
              e.preventDefault();
            });
        });

        overlay.on("mouseout", (e) => {
          $(this).closest("a").off("click");
        });

        img.addClass("zoomable");
        img.on("wheel", wheelZoomHandler);
        img.draggable();
        overlay.show();
      }
    }
  );

  $(document).on("mouseout", "a:has(img.scale-with-grid), a:has(img[src*='thumb']:not(.commenter-image))", function () {
    mouseOutTimer = setTimeout(() => {
      let img = $(this).find("img");
      img.off("wheel");
      img.css("transform", `scale(1)`);
      img.data("scale", 1);
      if (img.data("ui-draggable")) {
        img.draggable("destroy");
      }
      img.offset(originalPosition);
      img.css({ position: "static", top: "auto", left: "auto" });
      img.removeClass("zoomable");
      $(this).css({ display: "", position: "" });
      $(this).find(".image_zoom_overlay").remove();
    }, 500);
  });

  $(document).on("click", function (e) {
    if (!zoomedImage || $(e.target).is(zoomedImage)) return;
    $(".dark-screen").remove();
    zoomedImage.remove();
    zoomedImage = null;
  });
}
