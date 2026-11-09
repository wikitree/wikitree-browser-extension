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
  // Freeze background GIFs. A native loop, not $("*"): jQuery copies every element into one array with a single
  // push.apply, which throws "Maximum call stack size exceeded" on very large pages (e.g. a Bulk Trusted List
  // Changes list of ~9,000 profiles, 2026-11-09).
  const elements = document.getElementsByTagName("*");
  const frozenByUrl = new Map(); // GIF URL → Promise of a PNG data URL, so each GIF is converted once
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const bg = window.getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none" || !/\.gif/i.test(bg)) continue;
    const matches = bg.match(/url\(["']?(.*\.gif)["']?\)/i);
    if (!matches || !matches[1]) continue;
    const gifUrl = matches[1];
    if (!frozenByUrl.has(gifUrl)) {
      frozenByUrl.set(
        gifUrl,
        new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.src = gifUrl;
        })
      );
    }
    frozenByUrl.get(gifUrl).then((dataUrl) => {
      el.style.backgroundImage = `url('${dataUrl}')`;
    });
  }

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
        // Marker for the Highlight WBE Features option. Only the <img> case is
        // marked: a background GIF can sit on any container, and marking one
        // would stop everything inside it from being highlighted.
        $img.addClass("wbe-frozen-gif");
      };
      tempImg.src = src;
    }
  });
}
