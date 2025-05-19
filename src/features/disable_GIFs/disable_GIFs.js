/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("disableGIFs").then((result) => {
  if (result) {
    stopAllGifs();
  }
});

function stopAllGifs() {
  // Freeze background GIFs
  $("*").each(function () {
    const $el = $(this);
    const bg = $el.css("background-image");
    const matches = bg && bg.match(/url\(["']?(.*\.gif)["']?\)/i);
    if (matches && matches[1]) {
      const gifUrl = matches[1];
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        $el.css("background-image", `url('${dataUrl}')`);
      };
      img.src = gifUrl;
    }
  });

  // Freeze inline GIF <img> elements
  $("img").each(function () {
    const $img = $(this);
    const src = $img.attr("src");
    if (src && /\.gif(\?|#|$)/i.test(src)) {
      const tempImg = new window.Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(tempImg, 0, 0);
        $img.attr("src", canvas.toDataURL("image/png"));
      };
      tempImg.src = src;
    }
  });
}
