import $ from "jquery";
import "jquery-ui-touch-punch";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("imageZoom").then((result) => {
  if (result) {
    import("./image_zoom.css");
    setupImageZoom();
  }
});

let wheelZoomTimeoutId = null;
let wheelZoomEnabled = false;
let showMagnifier = false;
let isZoomInPlace = false;

function wheelZoomHandler(e) {
  if (!wheelZoomEnabled || !isZoomInPlace) {
    return;
  }

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
  if (newScale < 1) {
    newScale = 1;
  }
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

  //if (window.imageZoomOptions?.zoomInPlace) {
  wheelZoomEnabled = true;
  imgElement.on("wheel", wheelZoomHandler);
  //}
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
        $("#magnifier").hide();
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
  imgElement.on("load", function () {
    centreImage(imgElement);
  });

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

  console.log("Image Width:", imageWidth);
  console.log("Image Height:", imageHeight);
  console.log("Window Width:", windowWidth);
  console.log("Window Height:", windowHeight);
  console.log("Calculated Left:", left);
  console.log("Calculated Top:", top);

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

function toggleMagnifier() {
  showMagnifier = !showMagnifier;
  updateFeatureOptions("imageZoom", "showMagnifier", showMagnifier);
  showToggleMessage("showMagnifier", "Magnifier", showMagnifier);
}
function toggleZoomInPlace() {
  isZoomInPlace = !isZoomInPlace;
  updateFeatureOptions("imageZoom", "zoomInPlace", isZoomInPlace);
  showToggleMessage("zoomInPlace", "Zoom in Place", isZoomInPlace);
}
function showToggleMessage(option, optionText, optionValue) {
  let messageWord = optionValue ? "enabled" : "disabled";
  $("<div class='toggle-message'>" + optionText + " " + messageWord + "</div>")
    .appendTo("body")
    .delay(1000)
    .fadeOut(2000, function () {
      $(this).remove();
    });
}

export function updateFeatureOptions(featureName, optionName, optionValue) {
  return new Promise((resolve, reject) => {
    getFeatureOptions(featureName).then((optionsData) => {
      optionsData[optionName] = optionValue;
      const storageName = featureName + "_options";
      chrome.storage.sync.set(
        {
          [storageName]: optionsData,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        }
      );
    });
  });
}

// Helper function to create buttons and attach event listeners
function createButton(id, text, clickEvent, accessKey) {
  const button = $(`<button id='${id}'>${text}</button>`).appendTo("body").on("click", clickEvent);
  return button;
}

async function setupImageZoom() {
  window.imageZoomOptions = await getFeatureOptions("imageZoom");
  showMagnifier = window.imageZoomOptions?.showMagnifier || false;
  isZoomInPlace = window.imageZoomOptions?.zoomInPlace || false;
  // Simplified button creation
  createButton(
    "toggleZoomInPlace",
    "Toggle Zoom in Place",
    (e) => {
      e.preventDefault();
      toggleZoomInPlace();
    },
    "z"
  );
  createButton(
    "toggleMagnifier",
    "Toggle Magnifier",
    (e) => {
      e.preventDefault();
      toggleMagnifier();
    },
    "m"
  );

  let images = $("a:has(img.scale-with-grid), a:has(img[src*='thumb']:not(.commenter-image))");
  const magnifier = $('<div id="magnifier"></div>').appendTo("body");

  images.each(function () {
    let img = $(this).find("img");
    let imgSrc = img.attr("src");
    let imgAlt = img.attr("alt");
    const imgWidth = img.width();
    const imgHeight = img.height();
    let isThumb;
    if (imgSrc) {
      if (imgSrc.includes("thumb")) {
        isThumb = true;
      }
      let parent = $(this).css({ display: "inline-block", position: "relative" });
      const overlay = $('<div class="image_zoom_overlay"><span>🔍</span></div>').appendTo(parent);
      if (imgWidth < 100 || imgHeight < 100) {
        overlay.addClass("small-image");
      }

      overlay.on({
        mousedown: function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (isThumb && !img.hasClass("beenZoomed")) {
            imgSrc = imgSrc.replace("/thumb/", "/").replace(/\/[^/]+$/, "");
            img.addClass("beenZoomed");
          }
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
      //if (window.imageZoomOptions?.addMagnifier) {
      img.parent().on("mouseenter", function () {
        // Store the image title and then remove it
        imgTitle = img.attr("title");
        img.attr("title", "");
      });

      img.parent().on("mousemove", function (event) {
        let scale = img.data("scale") || 1;
        if (scale !== 1) {
          magnifier.hide();
          return;
        }

        if (showMagnifier && imgWidth > 76) {
          if (!isMagnifying) {
            // If not currently magnifying, set a timer to start magnification
            timeoutId = setTimeout(() => {
              isMagnifying = true;
              updateMagnifier(event, img, magnifier, imgSrc);
            }, 1500);
          } else {
            // If already magnifying, update the magnifier immediately
            updateMagnifier(event, img, magnifier, imgSrc);
            magnifier.addClass("magnifierActive");
            $("img").addClass("magnifierActive");
          }
        }
        event.stopPropagation(); // stop event propagation to prevent it from reaching other elements
      });

      img.parent().on("mouseout wheel", function () {
        // When mouse leaves the image, clear the timer and reset the flag
        clearTimeout(timeoutId);
        isMagnifying = false;
        img.attr("title", imgTitle);
        // If magnifier is showing, hide it
        if (magnifier.css("display") !== "none") {
          magnifier.css("display", "none");
        }
      });

      magnifier.on("mousemove", function (event) {
        event.stopPropagation(); // Prevent the magnifier from triggering the mousemove event
      });
      //}

      img.addClass("zoomable");
      //if (window.imageZoomOptions?.zoomInPlace) {
      img.on("wheel", function (e) {
        wheelZoomHandler.call(this, e);
      });
      img.on("mouseenter", function (e) {
        wheelZoomTimeoutId = setTimeout(
          function () {
            enableWheelZoom(e);
          }.bind(this),
          1500
        );
      });

      img.on("mouseleave", function () {
        clearTimeout(wheelZoomTimeoutId);
        wheelZoomEnabled = false;
        $(this).removeClass("magnifierActive");
        $("img").removeClass("magnifierActive");
      });
      // }
      overlay.show();
    }
  });
  function enableWheelZoom(e) {
    wheelZoomEnabled = true;
  }
}

let timeoutId;
let isMagnifying = false;
let imgTitle;

function updateMagnifier(event, img, magnifier, imgSrc) {
  const imgOffset = img.offset();
  const xPos = event.pageX - imgOffset.left;
  const yPos = event.pageY - imgOffset.top;

  const overlaySize = 50; // size of your overlay in pixels

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
    cursor: "none !important",
  });
}
