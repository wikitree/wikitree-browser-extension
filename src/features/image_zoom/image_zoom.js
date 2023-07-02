import $ from "jquery";
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
  let newScale = scale * scaleFactor;
  let imgWidth = $(this).width();
  $(this).parent().css("zIndex", "90000");
  $(this).parent().css("position", "relative");

  // If the new width exceeds the viewport, change transform origin
  if (imgWidth * newScale > $(window).width()) {
    $(this).css("transform-origin", "left");
    $(this).css("left", "0");
  } else {
    $(this).css("transform-origin", "");
    centreImage($(this));
  }

  $(this).css("transform", `scale(${newScale})`);
  $(this).data("scale", newScale);

  // Clear any existing click event handlers on document
  $(document).off("click.resetZoom");

  // Add a new click event handler on document
  let imgElement = $(this);
  $(document).on("click.resetZoom", function (event) {
    if (!$(event.target).closest(".zoom-image").length) {
      imgElement.css("transform", "scale(1)");
      imgElement.data("scale", 1);
      // Re-center the image
      centreImage(imgElement);
      // Unbind this event once reset is done
      $(document).off("click.resetZoom");
    }
  });
}

function createZoomedImage(src, alt) {
  let startDistance = null;
  let startScale = null;

  const imgElement = $("<img>", {
    src: src,
    alt: alt,
    class: "zoom-image",
    css: {
      position: "absolute",
      width: "auto",
      maxWidth: "90%",
      maxHeight: "90%",
      boxShadow: "5px 5px 15px rgba(0,0,0,0.3)",
      zIndex: 9666667,
      border: "2px solid white",
    },
  });
  imgElement.appendTo("body");

  if (window.imageZoomOptions?.zoomInPlace) {
    imgElement.on("wheel", wheelZoomHandler);
  }
  imgElement.on("click", function () {
    let scale = $(this).data("scale") || 1;
    let newScale = scale * 1.1; // Choose your scale factor, 1.1 as an example

    imgElement.on("click", function (event) {
      event.stopPropagation(); // This stops the event from bubbling up
      let scale = $(this).data("scale") || 1;
      let newScale = scale * 1.1;
      let imgWidth = $(this).width();

      // If the new width will exceed the viewport, change transform origin
      if (imgWidth * newScale > $(window).width()) {
        $(this).css("transform-origin", "left");
        $(this).css("left", "0");
      } else {
        $(this).css("transform-origin", "");
        centreImage(imgElement);
      }

      $(this).css("transform", `scale(${newScale})`);
      $(this).data("scale", newScale);
    });

    $(document).on("click", function (event) {
      if (!$(event.target).closest(".zoom-image").length) {
        imgElement.css("transform", "scale(1)");
        imgElement.data("scale", 1);
        // Re-center the image
        centreImage(imgElement);
      }
    });

    $(this).css("transform", `scale(${newScale})`);
    $(this).data("scale", newScale);
  });

  $(document).on("keyup.zoomImage", function (e) {
    if (e.key === "Escape") {
      imgElement.remove();
      $(".dark-screen").remove();
      // Unbind this event once the image is removed
      $(document).off("keyup.zoomImage");
    }
  });

  if ("ontouchstart" in window) {
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

  // Adjust image position to center it
  centreImage(imgElement);

  return imgElement;
}

function centreImage(imgElement) {
  // Adjust image position to center it
  const imageWidth = imgElement.width();
  const imageHeight = imgElement.height();
  const windowWidth = $(window).width();
  const windowHeight = $(window).height();
  const scrollLeft = $(window).scrollLeft();
  const scrollTop = $(window).scrollTop();
  const left = scrollLeft + (windowWidth - imageWidth) / 2;
  const top = scrollTop + (windowHeight - imageHeight) / 2;
  imgElement.css({ left: left, top: top });
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
    zIndex: 9666666,
  });
  darkScreen.addClass("dark-screen");
  darkScreen.on("click", function () {
    if (zoomedImage) {
      zoomedImage.remove();
    }
    $(".dark-screen").remove();
  });
}

async function setupImageZoom() {
  window.imageZoomOptions = await getFeatureOptions("imageZoom");
  console.log(window.imageZoomOptions);
  let images = $("a:has(img.scale-with-grid), a:has(img[src*='thumb']:not(.commenter-image))");
  const magnifier = $('<div class="magnifier"></div>').appendTo("body");

  images.each(function () {
    let img = $(this).find("img");
    let imgSrc = img.attr("src");
    let imgAlt = img.attr("alt");

    if (imgSrc) {
      if (imgSrc.includes("thumb")) {
        imgSrc = imgSrc.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
      }

      let parent = $(this).css({ display: "inline-block", position: "relative" });
      const overlay = $('<div class="image_zoom_overlay"><span>🔍</span></div>').appendTo(parent);
      overlay.css({
        position: "absolute",
        bottom: "0",
        right: "0",
        height: "30px",
        width: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
      overlay.on({
        mousedown: function (e) {
          console.log("overlay clicked");
          e.preventDefault();
          e.stopPropagation();
          let zoomedImage = createZoomedImage(imgSrc, imgAlt);
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

      // Add the magnifying glass functionality
      if (window.imageZoomOptions?.addMagnifier) {
        img.parent().on("mousemove", function (event) {
          const imgOffset = img.offset();
          const xPos = event.pageX - imgOffset.left;
          const yPos = event.pageY - imgOffset.top;

          const overlaySize = 30; // size of your overlay in pixels

          // Check if cursor is within the overlay area
          if (yPos > img.height() - overlaySize && xPos > img.width() - overlaySize) {
            magnifier.css("display", "none");
            return;
          }

          magnifier.css({
            "background-position": `${-xPos * 2 + magnifier.width() / 2}px ${-yPos * 2 + magnifier.height() / 2}px`,
            left: `${event.pageX - magnifier.width() / 2}px`,
            top: `${event.pageY - magnifier.height() / 2}px`,
            "background-image": `url(${imgSrc})`,
            display: "block",
            "background-size": `${img.width() * 2}px ${img.height() * 2}px`,
          });
        });

        $(document).on("mouseout", function () {
          magnifier.css("display", "none");
        });
      }

      img.addClass("zoomable");
      img.on("wheel", wheelZoomHandler);
      overlay.show();
    }
  });
}
