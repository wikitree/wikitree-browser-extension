import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui-touch-punch";
import interact from "interactjs";

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("imageZoom").then((result) => {
  if (result) {
    import("./image_zoom.css");
    setupImageZoom();
  }
});

function makeDraggableOnTouch(imgElement) {
  let touchStartX;
  let touchStartY;
  let imageStartX;
  let imageStartY;

  imgElement.on("touchstart", function (e) {
    let touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    imageStartX = parseInt($(this).css("left"), 10);
    imageStartY = parseInt($(this).css("top"), 10);
    e.preventDefault();
  });

  imgElement.on("touchmove", function (e) {
    let touch = e.touches[0];
    let dx = touch.clientX - touchStartX;
    let dy = touch.clientY - touchStartY;
    $(this).css({
      left: imageStartX + dx,
      top: imageStartY + dy,
    });
    e.preventDefault();
  });
}

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
  imgElement.draggable({
    stop: function (event, ui) {
      $("body").css("cursor", "default");
    },
  });
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

  // Make the image draggable using interact.js
  interact(imgElement.get(0)).draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: "parent",
        endOnly: true,
      }),
    ],
    autoScroll: true,
    listeners: {
      move: function (event) {
        var target = event.target,
          x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx,
          y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

        // Fetch the current scale
        const scale = $(target).data("scale") || 1;

        target.style.webkitTransform = target.style.transform =
          "translate(" + x + "px, " + y + "px) scale(" + scale + ")";

        target.setAttribute("data-x", x);
        target.setAttribute("data-y", y);
      },
      end: function (event) {
        // Set the cursor back to default when dragging ends
        event.target.style.cursor = "default";
      },
    },
    onmove: function (event) {
      // Change the cursor to move when dragging starts
      event.target.style.cursor = "move";
    },
  });

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
      const overlay = $('<div class="image_zoom_overlay">🔍</div>').appendTo(parent);
      overlay.css({
        position: "absolute",
        bottom: "0",
        right: "0",
        height: "50%",
        width: "50%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
      });
      overlay.on({
        mousedown: function (e) {
          console.log("overlay clicked");
          e.preventDefault();
          e.stopPropagation();
          let zoomedImage = createZoomedImage(imgSrc, imgAlt);
          if ("ontouchstart" in window) {
            makeDraggableOnTouch(zoomedImage);
          } else {
            zoomedImage.draggable();
          }
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
      //img.draggable();
      overlay.show();
    }
  });
}
