import $ from "jquery";
// import draggable
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui-touch-punch";
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

  if ("ontouchstart" in window) {
    // Add touch event handlers
    let startDistance, startScale;
    imgElement.on("touchstart", function (e) {
      if (e.touches.length === 2) {
        let dx = e.touches[0].pageX - e.touches[1].pageX;
        let dy = e.touches[0].pageY - e.touches[1].pageY;
        startDistance = Math.sqrt(dx * dx + dy * dy);
        startScale = $(this).data("scale") || 1;
        e.preventDefault();
      }
    });
    imgElement.on("touchmove", function (e) {
      if (e.touches.length === 2) {
        let dx = e.touches[0].pageX - e.touches[1].pageX;
        let dy = e.touches[0].pageY - e.touches[1].pageY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let scaleFactor = distance / startDistance;
        let scale = startScale * scaleFactor;
        $(this).css("transform", `scale(${scale})`);
        $(this).data("scale", scale);
        e.preventDefault();
      }
    });
    imgElement.on("touchend", function (e) {
      if (e.touches.length < 2) {
        startDistance = null;
        startScale = null;
      }
    });
  }

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
  // Select the images on which you want to apply the zoom functionality
  let images = $("a:has(img.scale-with-grid), a:has(img[src*='thumb']:not(.commenter-image))");

  images.each(function () {
    let img = $(this).find("img");
    let imgSrc = img.attr("src");
    let imgAlt = img.attr("alt");

    if (imgSrc) {
      if (imgSrc.includes("thumb")) {
        imgSrc = imgSrc.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
      }

      let parent = $(this).css({ display: "inline-block", position: "relative" });
      const overlay = $('<div class="image_zoom_overlay">+</div>').appendTo(parent);
      // Set the overlay styles, making it larger than the plus sign
      overlay.css({
        "z-index": 99999,
        position: "absolute",
        bottom: "0",
        right: "0",
        height: "50%", // adjust this value as needed
        width: "50%", // adjust this value as needed
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
      });
      overlay.on({
        mousedown: function (e) {
          console.log("overlay clicked");
          e.preventDefault();
          e.stopPropagation();
          createZoomedImage(imgSrc, imgAlt);
          overlay.hide();
          // prevent click event propagation to document
          setTimeout(() => {
            $(document).one("click", function (clickEvent) {
              clickEvent.stopImmediatePropagation();
            });
          }, 0);
          return false;
        },
        touchstart: function (e) {
          e.preventDefault();
          e.stopPropagation();
          createZoomedImage(imgSrc, imgAlt);
          overlay.hide();
          // prevent click event propagation to document
          setTimeout(() => {
            $(document).one("click", function (clickEvent) {
              clickEvent.stopImmediatePropagation();
            });
          }, 0);
          return false;
        },
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
  });
}
