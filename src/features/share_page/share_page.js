/*
Created By: TODO author name (TODO WikiTree ID)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { copyToClipboard } from "../../core/clipboard.js";
import {
  CHANNELS,
  KIND_LABELS,
  buildText,
  detectPageKind,
  getChannel,
  intentUrl,
  lifeSummary,
  measure,
  photoLinks,
  shareUrlFor,
  swapTag,
} from "./share_page_core";

shouldInitializeFeature("sharePage").then((result) => {
  if (result) {
    init();
  }
});

async function init() {
  const kind = detectPageKind(window.location.pathname);
  if (kind === "other" || !isPubliclyShareable(kind)) return;
  import("./share_page.css");
  const options = await getFeatureOptions("sharePage");
  addShareButton(() => openDialog(kind, options));
}

/**
 * Only offer Share where the public can see the page.
 * TODO: this is not a privacy check yet. WikiTree does not expose a privacy level in the page
 * markup that this feature has been able to confirm, so decide with the WikiTree team how to detect
 * Private and Unlisted profiles (and private images) before this feature is released.
 */
function isPubliclyShareable(kind) {
  if (kind === "profile") return $("#pageData").length > 0;
  return true;
}

// ---------------------------------------------------------------------------------------------
// The Share button
// ---------------------------------------------------------------------------------------------

function addShareButton(onClick) {
  if ($(".wbe-share-button").length) return;
  const $button = $(
    '<button type="button" class="wbe-share-button" title="Share this page on social media">Share</button>'
  );
  $button.on("click", (e) => {
    e.preventDefault();
    onClick();
  });
  const $jumpNav = $("#jump-nav");
  const $heading = $("h1").first();
  if ($jumpNav.length) {
    $('<li class="wbe-share-item"></li>').append($button).appendTo($jumpNav);
  } else if ($heading.length) {
    $heading.after($button);
  } else {
    // Tree widgets and Tree Apps views have no heading to attach to.
    $button.addClass("wbe-share-floating");
    $("body").append($button);
  }
}

// ---------------------------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------------------------

function pageTitle() {
  const fromTitle = document.title.replace(/\s*\|\s*WikiTree.*$/i, "").trim();
  if (fromTitle) return fromTitle;
  const fromHeading = $("h1").first().text().replace(/\s+/g, " ").trim();
  if (fromHeading) return fromHeading;
  const id = decodeURIComponent(window.location.pathname).split("/").filter(Boolean)[1];
  return id || "this page";
}

/** Photos on the page, as full-size addresses with the image page that shows each one. */
function collectPhotos(kind) {
  const found = [];
  const seen = new Set();
  const add = (src, alt) => {
    if (!src) return;
    const links = photoLinks(src);
    if (!links || seen.has(links.full)) return;
    if (links.thumbWidth && links.thumbWidth < 150) return; // avatars and icons
    seen.add(links.full);
    found.push({
      id: "photo" + found.length,
      label: (alt || "").trim() || links.fileName,
      thumb: src, // the size the page already loaded, so the dialog does not pull full-size files
      full: links.full,
      pageUrl: links.pageUrl,
      fileName: links.fileName,
    });
  };
  if (kind === "fullImage") {
    add(window.location.href, "");
    return found;
  }
  // The profile's own photos first, then everything else in the page content.
  $("img.profile--photo").each((i, img) => add(img.src, img.alt));
  $('img[src*="/photo.php/"]')
    .not(".profile--photo")
    .filter((i, img) => !$(img).closest(".person--avatar, .avatar--40, .img-profile, header, nav, footer").length)
    .each((i, img) => add(img.src, img.alt));
  return kind === "imagePage" ? found.slice(0, 1) : found;
}

// ---------------------------------------------------------------------------------------------
// The share card: a picture drawn from the page title, so no screenshot (and no permission) is needed
// ---------------------------------------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrapText(g, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (g.measureText(test).width > maxWidth && line) {
      lines++;
      if (lines === maxLines) {
        g.fillText(line.replace(/\s*\S*$/, "") + "…", x, y);
        return;
      }
      g.fillText(line, x, y);
      y += lineHeight;
      line = words[i];
    } else {
      line = test;
    }
  }
  g.fillText(line, x, y);
}

function fitLine(g, text, maxWidth) {
  if (g.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && g.measureText(shortened + "…").width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return shortened.trimEnd() + "…";
}

// WikiTree brand, taken from the live site: the header and footer colours and Roboto from its stylesheet,
// the gold from the logo's emblem.
const BRAND = {
  green: "#25422d",
  ink: "#393a3c",
  paper: "#fcfcfc",
  band: "#f0f0eb",
  gold: "#f8a820",
  muted: "rgba(57, 58, 60, 0.72)",
};
const CARD_FONT = 'Roboto, "Helvetica Neue", Arial, sans-serif';
// Same address as the page, so the canvas stays clean enough to save.
const LOGO_PATH = "/images/wikitree-logo-tagline.png";

/**
 * Draw the share card in WikiTree's colours with the WikiTree logo. With a summary (profiles) it shows the
 * data fields, a short biography and a portrait; without one it shows the page title and a picture.
 * @param {{fields: {label: string, lines: string[]}[], bio: string}|null} summary
 */
async function drawShareCard(kind, title, photoSrc, summary) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const g = canvas.getContext("2d");
  const font = (spec) => `${spec} ${CARD_FONT}`;

  // Roboto is already on the page for WikiTree itself; make sure it has loaded before drawing with it.
  if (document.fonts && document.fonts.load) {
    await Promise.all([document.fonts.load("700 44px Roboto"), document.fonts.load("400 20px Roboto")]).catch(() => {});
  }
  const [logo, photo] = await Promise.all([loadImage(LOGO_PATH), photoSrc ? loadImage(photoSrc) : null]);

  g.fillStyle = BRAND.paper;
  g.fillRect(0, 0, 1200, 630);

  // header band with the logo, as on the site
  g.fillStyle = BRAND.band;
  g.fillRect(0, 0, 1200, 76);
  g.fillStyle = BRAND.gold;
  g.fillRect(0, 76, 1200, 3);
  if (logo) {
    const height = 52;
    g.drawImage(logo, 48, 12, (logo.width / logo.height) * height, height);
  } else {
    g.fillStyle = BRAND.green;
    g.font = font("700 34px");
    g.fillText("WikiTree", 48, 50);
  }

  // footer band
  g.fillStyle = BRAND.green;
  g.fillRect(0, 584, 1200, 46);
  g.fillStyle = "#ffffff";
  g.font = font("700 20px");
  g.fillText("wikitree.com", 48, 614);
  g.font = font("400 20px");
  g.textAlign = "right";
  g.fillText("The free family tree", 1152, 614);
  g.textAlign = "left";

  g.fillStyle = BRAND.green;
  g.font = font("700 20px");
  g.fillText((KIND_LABELS[kind] || "").toUpperCase(), 48, 128);

  const drawPhoto = (x, y, w, h) => {
    const scale = Math.max(w / photo.width, h / photo.height);
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.drawImage(
      photo,
      x + (w - photo.width * scale) / 2,
      y + (h - photo.height * scale) / 2,
      photo.width * scale,
      photo.height * scale
    );
    g.restore();
    g.strokeStyle = BRAND.band;
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  };

  g.fillStyle = BRAND.ink;
  if (summary) {
    g.font = font("700 44px");
    wrapText(g, title, 48, 184, 800, 50, 2);
    summary.fields.slice(0, 4).forEach((field, i) => {
      const x = 48 + (i % 2) * 410;
      const y = 272 + Math.floor(i / 2) * 88;
      g.fillStyle = BRAND.green;
      g.font = font("700 14px");
      g.fillText(field.label.toUpperCase(), x, y);
      g.fillStyle = BRAND.ink;
      g.font = font("700 21px");
      g.fillText(fitLine(g, field.lines[0], 380), x, y + 27);
      if (field.lines[1]) {
        g.fillStyle = BRAND.muted;
        g.font = font("400 18px");
        g.fillText(fitLine(g, field.lines[1], 380), x, y + 51);
      }
    });
    if (photo) drawPhoto(892, 100, 260, 300);
    if (summary.bio) {
      g.fillStyle = BRAND.ink;
      g.font = font("400 21px");
      wrapText(g, summary.bio, 48, 470, 1104, 28, 4);
    }
  } else {
    g.font = font("700 52px");
    wrapText(g, title, 48, 200, photo ? 540 : 1104, 62, 5);
    if (photo) drawPhoto(652, 112, 500, 440);
  }
  return canvas;
}

/** The vitals and family lists shown on a profile, read from the page's own markup. */
function readProfileFacts() {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  const names = (selector) => [
    ...new Set(
      $(selector)
        .map((i, el) => clean($(el).find('[itemprop="name"]').first().text() || $(el).text()))
        .get()
        .filter(Boolean)
    ),
  ];
  const place = (scope, prop) => clean($(`${scope} [itemprop="${prop}"] [itemprop="name"]`).first().text());
  const spouses = $("#Spouses .spouse")
    .map((i, el) => {
      const $spouse = $(el);
      const name = clean($spouse.find('[itemprop="spouse"] [itemprop="name"]').first().text());
      const married = (clean($spouse.text()).match(/\bmarried\s+(.*)$/) || [])[1] || "";
      const when = married.replace(/\s+at age \d+.*$/, "");
      const split = when.match(/^(?:(.*?)\s+)?in\s+(.+)$/);
      return { name, date: split ? clean(split[1]) : clean(when), place: split ? clean(split[2]) : "" };
    })
    .get()
    .filter((spouse) => spouse.name);
  const gender = String(
    $("#pageData").data("mgender") || $('meta[itemprop="gender"]').attr("content") || ""
  ).toLowerCase();
  return {
    firstName: String($("#pageData").data("mfirstname") || ""),
    gender: gender === "male" || gender === "female" ? gender : "",
    birth: { date: clean($('#Birth time[itemprop="birthDate"]').first().text()), place: place("#Birth", "birthPlace") },
    death: {
      date: clean($('#Death time[itemprop="deathDate"]').first().text()),
      place: place("#Death", "deathPlace"),
      age: (clean($("#Death").first().text()).match(/\bat age (\d+)/) || [])[1] || "",
    },
    parents: names('#Parents [itemprop="parent"]'),
    spouses,
    children: names('#Children [itemprop="children"]'),
  };
}

// ---------------------------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------------------------

const DIALOG_HTML = `
<div class="wbe-share-overlay">
  <div class="wbe-share-dialog" role="dialog" aria-modal="true" aria-labelledby="wbeShareTitle">
    <div class="wbe-share-head">
      <img class="wbe-share-logo" src="/images/wikitree-logo-2024.png" alt="WikiTree">
      <h2 id="wbeShareTitle">Share this page</h2>
      <button type="button" class="wbe-share-close" aria-label="Close">&times;</button>
    </div>
    <div class="wbe-share-body">
      <div class="wbe-share-col">
        <h3>1. Where to share</h3>
        <div class="wbe-share-channels" role="radiogroup" aria-label="Where to share"></div>
        <h3>2. Picture</h3>
        <div class="wbe-share-images"></div>
        <p class="wbe-share-hint wbe-share-imghint"></p>
        <div class="wbe-share-summary" hidden>
          <h3><label for="wbeShareSummary">Summary on the card</label></h3>
          <textarea id="wbeShareSummary" rows="4" spellcheck="true"></textarea>
          <p class="wbe-share-hint">Built from this profile's dates, places and family lists. Check it before you post.</p>
        </div>
        <h3><label for="wbeShareText">3. Post text</label></h3>
        <textarea id="wbeShareText" rows="9" spellcheck="true"></textarea>
        <div class="wbe-share-meter"><span class="wbe-share-count"></span><span class="wbe-share-limit"></span></div>
        <button type="button" class="wbe-share-reset">Reset to suggested text</button>
      </div>
      <div class="wbe-share-col">
        <h3>Preview on <span class="wbe-share-pvname"></span></h3>
        <div class="wbe-share-post">
          <div class="wbe-share-pvtext"></div>
          <div class="wbe-share-pvmedia"></div>
          <div class="wbe-share-pvlink"></div>
        </div>
        <h3>4. Post it</h3>
        <div class="wbe-share-actions"></div>
        <ol class="wbe-share-how"></ol>
        <div class="wbe-share-note" hidden></div>
        <p class="wbe-share-status" role="status" aria-live="polite"></p>
      </div>
    </div>
  </div>
</div>`;

const HOW = {
  intent: (c) => [`Open ${c.name} with the text filled in.`, "Add any saved pictures.", "Post."],
  link: (c) => ["Copy the post text.", `Open ${c.name} with the link attached.`, "Paste the text, then post."],
  copy: () => ["Save the picture.", "Copy the caption.", "Open the app, add the picture and paste."],
};

function openDialog(kind, options) {
  if ($(".wbe-share-overlay").length) return;
  const opener = document.activeElement;
  const title = pageTitle();
  const url = shareUrlFor(kind, window.location.href);
  const isImageKind = kind === "imagePage" || kind === "fullImage";
  const photos = collectPhotos(kind);

  const images = [];
  if (!isImageKind || !photos.length) {
    images.push({ id: "card", label: "Share card for this page", card: true, thumb: "" });
  }
  photos.forEach((p) => images.push(p));

  const state = {
    channel: getChannel(options.defaultChannel).id,
    text: "",
    edited: false,
    selected: [images[0].id],
    blobs: {},
  };
  const textOptions = { hashtags: options.includeHashtags !== false };
  const suggested = () => buildText(kind, title, url, getChannel(state.channel), textOptions);
  state.text = suggested();

  const $overlay = $(DIALOG_HTML);
  const $dialog = $overlay.find(".wbe-share-dialog");
  const $text = $overlay.find("#wbeShareText");
  const $status = $overlay.find(".wbe-share-status");
  const say = (message) => $status.text(message);

  // The card is drawn from the first photo on the page, and again when the member edits its summary.
  const facts = kind === "profile" && options.cardSummary !== false ? lifeSummary(readProfileFacts()) : null;
  state.bio = facts ? facts.bio : "";
  const cardPhoto = (photos[0] && photos[0].full) || "";
  let cardPromise;
  let cardRun = 0;
  function redrawCard() {
    const run = ++cardRun;
    delete state.blobs.card;
    const summary = facts ? { fields: facts.fields, bio: state.bio } : null;
    cardPromise = drawShareCard(kind, title, cardPhoto, summary).then((canvas) => {
      const card = images.find((i) => i.card);
      if (card && run === cardRun) {
        card.thumb = canvas.toDataURL("image/png");
        card.fileName = "wikitree-share-card.png";
        renderImages();
        renderPost();
      }
      return canvas;
    });
    return cardPromise;
  }

  function getBlob(image) {
    if (!state.blobs[image.id]) {
      state.blobs[image.id] = image.card
        ? cardPromise.then((canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png")))
        : fetch(image.full).then((r) => r.blob());
    }
    return state.blobs[image.id];
  }
  function chosenImages() {
    const channel = getChannel(state.channel);
    return state.selected
      .map((id) => images.find((i) => i.id === id))
      .filter(Boolean)
      .slice(0, channel.max);
  }

  function renderChannels() {
    const $box = $overlay.find(".wbe-share-channels").empty();
    CHANNELS.forEach((c) => {
      const $b = $('<button type="button" role="radio" class="wbe-share-channel"></button>');
      $b.attr("aria-checked", String(c.id === state.channel));
      $b.append($("<b></b>").text(c.name)).append($("<span></span>").text(c.tag));
      $b.on("click", () => {
        state.channel = c.id;
        state.text = state.edited && !c.noTags ? swapTag(state.text, c) : suggested();
        if (c.noTags) state.edited = false;
        $text.val(state.text);
        renderChannels();
        renderImages();
        renderPost();
      });
      $box.append($b);
    });
  }

  function renderImages() {
    const $box = $overlay.find(".wbe-share-images").empty();
    images.forEach((image) => {
      const index = state.selected.indexOf(image.id);
      const $b = $('<button type="button" class="wbe-share-image"></button>');
      $b.attr("aria-pressed", String(index > -1));
      if (image.thumb) $b.append($('<img alt="">').attr("src", image.thumb));
      else $b.append('<span class="wbe-share-placeholder">Drawing card…</span>');
      if (index > -1) $b.append($("<span class='wbe-share-badge'></span>").text(index + 1));
      $b.append($("<small></small>").text(image.label));
      $b.on("click", () => {
        const at = state.selected.indexOf(image.id);
        if (at > -1) state.selected.splice(at, 1);
        else {
          state.selected.push(image.id);
          getBlob(image).catch(() => {}); // fetch now so a phone's share sheet can open straight from a tap
        }
        renderImages();
        renderPost();
      });
      $box.append($b);
    });
    const channel = getChannel(state.channel);
    const count = state.selected.length;
    $overlay
      .find(".wbe-share-imghint")
      .text(
        !count
          ? "No picture selected. The post will be text and link only."
          : count > channel.max
          ? `${channel.name} takes up to ${channel.max} picture${channel.max > 1 ? "s" : ""}. Only the first ${
              channel.max
            } in your order are used.`
          : "Select pictures to add or remove them. The numbers show the order."
      );
  }

  function renderPost() {
    const channel = getChannel(state.channel);
    const used = measure(state.text, channel);
    const over = used > channel.limit;
    $overlay.find(".wbe-share-count").text(used.toLocaleString()).toggleClass("wbe-share-over", over);
    $overlay
      .find(".wbe-share-limit")
      .text(` of ${channel.limit.toLocaleString()} characters${channel.urlWeight ? " (links count as 23)" : ""}`);

    // preview
    $overlay.find(".wbe-share-pvname").text(channel.name);
    $overlay.find(".wbe-share-pvtext").text(state.text);
    const shown = chosenImages().slice(0, 4);
    const $media = $overlay.find(".wbe-share-pvmedia").empty();
    shown.forEach((image) => {
      if (image.thumb) $media.append($('<img alt="">').attr("src", image.thumb));
    });
    $media.attr("data-count", shown.length);
    $overlay.find(".wbe-share-pvlink").text(url);

    // actions
    const link = intentUrl(channel, state.text, url, options.mastodonInstance);
    const $actions = $overlay.find(".wbe-share-actions").empty();
    const button = (label, primary, handler, disabled) =>
      $('<button type="button" class="wbe-share-btn"></button>')
        .toggleClass("wbe-share-primary", !!primary)
        .prop("disabled", !!disabled)
        .text(label)
        .on("click", handler);
    const open = () =>
      $('<a class="wbe-share-btn" target="_blank" rel="noopener"></a>').attr("href", link).text(`Open ${channel.name}`);
    const copyButton = (primary) =>
      button(channel.mode === "copy" ? "Copy caption" : "Copy post text", primary, async () => {
        try {
          await copyToClipboard(state.text);
          say("Post text copied.");
        } catch (e) {
          say("Could not copy. Select the text and copy it yourself.");
        }
      });
    const saveButton = () => {
      const n = chosenImages().length;
      return button(n > 1 ? `Save ${n} pictures` : "Save picture", false, saveImages, !n);
    };

    if (channel.mode === "intent") {
      $actions.append(open().addClass("wbe-share-primary"), copyButton(false), saveButton());
    } else if (channel.mode === "link") {
      $actions.append(copyButton(true), open(), saveButton());
    } else {
      $actions.append(saveButton(), copyButton(true));
    }
    if (canShareFiles()) $actions.append(button("Share…", false, systemShare, !chosenImages().length));

    const $how = $overlay.find(".wbe-share-how").empty();
    HOW[channel.mode](channel).forEach((step) => $how.append($("<li></li>").text(step)));

    const notes = [];
    if (channel.note) notes.push(channel.note);
    if (channel.mode === "intent" && chosenImages().length && !channel.noTags) {
      notes.push(
        `${channel.name} cannot receive pictures through a link. Save them first, then add them in the composer.`
      );
    }
    if (over)
      notes.push(
        `The text is ${(used - channel.limit).toLocaleString()} characters over the limit for ${
          channel.name
        }. Shorten it before posting.`
      );
    if (kind === "treeApp")
      notes.push("Tree Apps may ask the person who opens this link to log in to apps.wikitree.com.");
    const $note = $overlay.find(".wbe-share-note").empty().prop("hidden", !notes.length);
    notes.forEach((n) => $note.append($("<p></p>").text(n)));
  }

  async function saveImages() {
    const chosen = chosenImages();
    say("Preparing pictures…");
    try {
      for (const image of chosen) {
        const blob = await getBlob(image);
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = image.fileName || "wikitree-image.jpg";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10000);
      }
      say(chosen.length > 1 ? "Pictures saved to your downloads." : "Picture saved to your downloads.");
    } catch (e) {
      say("Could not save the picture. Try again, or save it from the page.");
    }
  }

  function canShareFiles() {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }));
    } catch (e) {
      return false;
    }
  }

  async function systemShare() {
    try {
      const files = await Promise.all(
        chosenImages().map(async (image) => {
          const blob = await getBlob(image);
          return new File([blob], image.fileName || "wikitree-image.jpg", { type: blob.type || "image/jpeg" });
        })
      );
      await navigator.share({ text: state.text, files });
    } catch (e) {
      if (e && e.name !== "AbortError") say("Could not open the share sheet. Use Copy and Save instead.");
    }
  }

  // events
  $text.on("input", () => {
    state.text = $text.val();
    state.edited = true;
    renderPost();
  });
  $overlay.find(".wbe-share-reset").on("click", () => {
    state.edited = false;
    state.text = suggested();
    $text.val(state.text);
    renderPost();
  });
  function close() {
    clearTimeout(redrawTimer);
    $(document).off("keydown.wbeShare");
    $overlay.remove();
    if (opener && opener.focus) opener.focus();
  }
  $overlay.find(".wbe-share-close").on("click", close);
  $overlay.on("mousedown", (e) => {
    if (e.target === $overlay[0]) close();
  });
  $(document).on("keydown.wbeShare", (e) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "Tab") {
      const $focusable = $dialog.find("button:not(:disabled), a[href], textarea").filter(":visible");
      if (!$focusable.length) return;
      const first = $focusable[0];
      const last = $focusable[$focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  const $summary = $overlay.find("#wbeShareSummary");
  let redrawTimer;
  if (facts) {
    $overlay.find(".wbe-share-summary").prop("hidden", false);
    $summary.val(state.bio).on("input", () => {
      state.bio = $summary.val();
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(redrawCard, 300);
    });
  }
  redrawCard();
  $text.val(state.text);
  renderChannels();
  renderImages();
  renderPost();
  getBlob(images.find((i) => i.id === state.selected[0])).catch(() => {});
  $("body").append($overlay);
  $overlay.find(".wbe-share-close").trigger("focus");
}
