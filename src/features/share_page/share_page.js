/*
Created By: TODO author name (TODO WikiTree ID)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { copyToClipboard } from "../../core/clipboard.js";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import {
  BASE_URL,
  CHANNELS,
  KIND_LABELS,
  appNameFromSlug,
  buildText,
  detectPageKind,
  getChannel,
  intentUrl,
  isShareablePrivacy,
  lifeSummary,
  measure,
  pageSummary,
  photoLinks,
  profileKeyFor,
  shareUrlFor,
  swapTag,
  viewSlug,
} from "./share_page_core";

shouldInitializeFeature("sharePage").then((result) => {
  if (result) {
    init();
  }
});

async function init() {
  const kind = detectPageKind(window.location.pathname);
  if (kind === "other" || !(await isPubliclyShareable(kind))) return;
  import("./share_page.css");
  const options = await getFeatureOptions("sharePage");
  addShareButton(() => openDialog(kind, options));
}

/**
 * Only offer Share where the public can see the page. A profile or free-space page (and the tree, widget or
 * image that belongs to one) is shareable when WikiTree's API reports it as Public (50) or Open (60) and not
 * living. If the level cannot be read, the button is not shown.
 */
async function isPubliclyShareable(kind) {
  const key = profileKeyFor(kind, window.location.pathname, window.location.hash);
  if (!key) return true;
  try {
    const [profile] = await WikiTreeAPI.getProfile("sharePage", key, ["Privacy", "IsLiving"]);
    // An image's file name only looks like a profile ID; if no such profile exists, the image does not belong to one.
    if (!profile && (kind === "imagePage" || kind === "fullImage")) return true;
    return isShareablePrivacy(profile);
  } catch (e) {
    return false;
  }
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

const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

/** The app and person shown by a Tree Apps view, read from the page the member is looking at. */
function readAppContext() {
  const slug = viewSlug(window.location.hash);
  const selected = clean($("#view-select option:selected").text());
  return {
    appName: clean($("#view-title").first().text()) || selected || appNameFromSlug(slug),
    person: clean($("#name-placeholder").first().text()),
  };
}

/** The opening text, section names and counts of a help, project, free-space or category page. */
function readPageFacts() {
  const $body = $(".body-text").first();
  const paragraphs = $body
    .find("p")
    .filter((i, el) => !$(el).closest("table").length)
    .map((i, el) => $(el).clone().find("sup, script, style").remove().end().text())
    .get();
  const sections = $body
    .find("h2")
    .map((i, el) => clean($(el).text()).replace(/\s*\[edit\]$/i, ""))
    .get()
    .filter((text) => text && !/^contents$/i.test(text));
  const counts = {};
  $("main h2").each((i, el) => {
    const m = clean($(el).text()).match(/^(Subcategories|Pages|Person Profiles|Profiles)\s*\((\d[\d,]*)\)/i);
    if (!m) return;
    const n = parseInt(m[2].replace(/,/g, ""), 10);
    if (/^sub/i.test(m[1])) counts.subcategories = n;
    else if (/^pages/i.test(m[1])) counts.pages = n;
    else counts.profiles = n;
  });
  return { paragraphs, sections, counts };
}

/**
 * A picture of the chart or tree on screen in a Tree Apps view, as the member sees it. Returns an Image (from the
 * page's SVG) or the canvas itself, or null when the view is plain text and tables.
 */
async function captureAppGraphic() {
  const area = (el) => {
    const box = el.getBoundingClientRect();
    return box.width * box.height;
  };
  const candidates = $("#view-container svg, #view-container canvas")
    .toArray()
    .filter((el) => el.getBoundingClientRect().width >= 200 && el.getBoundingClientRect().height >= 200)
    .sort((a, b) => area(b) - area(a));
  const found = candidates[0];
  if (!found) return null;
  if (found.tagName.toLowerCase() === "canvas") return found;

  // Copy the styles the page's own CSS gives the SVG, because the copy is drawn on its own.
  const box = found.getBoundingClientRect();
  const copy = found.cloneNode(true);
  const from = [found, ...found.querySelectorAll("*")];
  const to = [copy, ...copy.querySelectorAll("*")];
  const properties = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "visibility",
    "display",
  ];
  from.forEach((el, i) => {
    const computed = getComputedStyle(el);
    properties.forEach((property) => to[i].style.setProperty(property, computed.getPropertyValue(property)));
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  copy.setAttribute("width", String(Math.round(box.width)));
  copy.setAttribute("height", String(Math.round(box.height)));
  if (!copy.getAttribute("viewBox"))
    copy.setAttribute("viewBox", `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
  const xml = new XMLSerializer().serializeToString(copy);
  return loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
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
 * Draw the share card in WikiTree's colours with the WikiTree logo.
 *   - summary { fields, bio }: data fields and a short text (profiles, and help, project, free-space and category pages)
 *   - graphic: a picture of the chart on screen (Tree Apps), shown large beside the title
 *   - otherwise: the page title and a picture
 * @param {string} kind - a key of KIND_LABELS
 * @param {string} title - the heading on the card
 * @param {{photoSrc?: string, summary?: {fields: {label: string, lines: string[], names?: boolean}[], bio: string}|null,
 *          subtitle?: string, graphic?: HTMLImageElement|HTMLCanvasElement|null}} [extras]
 */
async function drawShareCard(kind, title, extras = {}) {
  const { photoSrc = "", summary = null, subtitle = "", graphic = null } = extras;
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
  g.fillText("WikiTree.com", 48, 614);
  g.font = font("400 20px");
  g.textAlign = "right";
  g.fillText("The FREE Family Tree", 1152, 614);
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
  if (graphic) {
    // Tree Apps: the app's name and person on the left, the chart as the member sees it on the right
    g.font = font("700 52px");
    wrapText(g, title, 48, 200, 420, 60, 3);
    if (subtitle) {
      g.fillStyle = BRAND.muted;
      g.font = font("400 26px");
      wrapText(g, subtitle, 48, 330, 420, 34, 3);
    }
    const w = graphic.naturalWidth || graphic.width;
    const h = graphic.naturalHeight || graphic.height;
    const box = { x: 500, y: 100, w: 652, h: 468 };
    const scale = Math.min(box.w / w, box.h / h);
    g.drawImage(graphic, box.x + (box.w - w * scale) / 2, box.y + (box.h - h * scale) / 2, w * scale, h * scale);
  } else if (summary) {
    g.font = font("700 44px");
    wrapText(g, title, 48, 184, 800, 50, 2);
    summary.fields.slice(0, 4).forEach((field, i) => {
      const x = 48 + (i % 2) * 410;
      const y = 272 + Math.floor(i / 2) * 88;
      g.fillStyle = BRAND.green;
      g.font = font("700 14px");
      g.fillText(field.label.toUpperCase(), x, y);
      field.lines.slice(0, 2).forEach((line, row) => {
        const secondary = row === 1 && !field.names; // a place under a date is lighter; every name is bold
        g.fillStyle = secondary ? BRAND.muted : BRAND.ink;
        g.font = font(secondary ? "400 18px" : "700 21px");
        g.fillText(fitLine(g, line, 380), x, y + 27 + row * 24);
      });
    });
    if (photo) drawPhoto(892, 100, 260, 300);
    if (summary.bio) {
      // the text sits just below the data fields, and gets more room and a larger size when there are fewer of them
      const rows = Math.ceil(Math.min(summary.fields.length, 4) / 2);
      const layout = [
        { y: 280, size: 25, line: 36, lines: 7 },
        { y: 272 + 88 + 22, size: 23, line: 32, lines: 5 },
        { y: 272 + 176 + 22, size: 21, line: 28, lines: 4 },
      ][rows];
      g.fillStyle = BRAND.ink;
      g.font = font(`400 ${layout.size}px`);
      wrapText(g, summary.bio, 48, layout.y, 1104, layout.line, layout.lines);
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
          <p class="wbe-share-hint wbe-share-summary-hint"></p>
        </div>
        <label class="wbe-share-linkchoice" hidden>
          <input type="checkbox" id="wbeShareProfileLink">
          <span>Link to the person's profile instead, so anyone can open it</span>
        </label>
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
  const app = kind === "treeApp" ? readAppContext() : null;
  const title = app ? app.appName || "Tree Apps" : pageTitle();
  const viewUrl = shareUrlFor(kind, window.location.href);
  // A Tree Apps view opens only for people logged in to WikiTree, so the member can link to the profile instead.
  const personId = kind === "treeApp" ? profileKeyFor(kind, window.location.pathname, window.location.hash) : "";
  const profileUrl = personId ? `${BASE_URL}/wiki/${encodeURI(personId)}` : "";
  const isImageKind = kind === "imagePage" || kind === "fullImage";
  const photos = collectPhotos(kind);

  const images = [];
  if (!isImageKind || !photos.length) {
    images.push({ id: "card", label: "Share card for this page", card: true, thumb: "" });
  }
  photos.forEach((p) => images.push(p));

  const state = {
    url: viewUrl,
    channel: getChannel(options.defaultChannel).id,
    text: "",
    edited: false,
    selected: [images[0].id],
    blobs: {},
  };
  const textOptions = { hashtags: options.includeHashtags !== false, context: app || {} };
  const suggested = () => buildText(kind, title, state.url, getChannel(state.channel), textOptions);
  state.text = suggested();

  const $overlay = $(DIALOG_HTML);
  const $dialog = $overlay.find(".wbe-share-dialog");
  const $text = $overlay.find("#wbeShareText");
  const $status = $overlay.find(".wbe-share-status");
  const say = (message) => $status.text(message);

  // The card is drawn once the chart (Tree Apps) has been captured, and again when the member edits its summary.
  const cardSummary =
    options.cardSummary === false
      ? null
      : kind === "profile"
      ? lifeSummary(readProfileFacts())
      : pageSummary(kind, readPageFacts());
  state.bio = cardSummary ? cardSummary.bio : "";
  // Only profiles put a photo on the card; a logo or badge cropped to a portrait looks wrong on the other pages.
  const cardPhoto = kind === "profile" || !cardSummary ? (photos[0] && photos[0].full) || "" : "";
  const graphicPromise = kind === "treeApp" ? captureAppGraphic().catch(() => null) : Promise.resolve(null);
  let cardPromise;
  let cardRun = 0;
  function redrawCard() {
    const run = ++cardRun;
    delete state.blobs.card;
    cardPromise = graphicPromise
      .then((graphic) =>
        drawShareCard(kind, title, {
          photoSrc: graphic ? "" : cardPhoto,
          summary: cardSummary ? { fields: cardSummary.fields, bio: state.bio } : null,
          subtitle: app ? app.person : "",
          graphic,
        })
      )
      .then((canvas) => {
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
    $overlay.find(".wbe-share-pvlink").text(state.url);

    // actions
    const link = intentUrl(channel, state.text, state.url, options.mastodonInstance);
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
    if (kind === "treeApp" && state.url === viewUrl) {
      notes.push(
        "Tree Apps views open only for people logged in to WikiTree. Anyone else sees the login page." +
          (profileUrl ? " Tick the box above the post text to link to the person's profile instead." : "")
      );
    }
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
  if (profileUrl) {
    const $choice = $overlay.find(".wbe-share-linkchoice").prop("hidden", false);
    $choice.find("input").on("change", (e) => {
      const previous = state.url;
      state.url = e.target.checked ? profileUrl : viewUrl;
      // swap the address wherever it appears, keeping whatever else the member has written
      state.text = state.text.split(previous).join(state.url);
      $text.val(state.text);
      renderPost();
    });
  }
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
  if (cardSummary) {
    $overlay.find(".wbe-share-summary").prop("hidden", false);
    $overlay
      .find(".wbe-share-summary-hint")
      .text(
        kind === "profile"
          ? "Built from this profile's dates, places and family lists. Check it before you post."
          : kind === "category"
          ? "Counts are from this category page. Edit the text if you like."
          : "Taken from the top of this page. Check it before you post."
      );
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
