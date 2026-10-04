/*
Created By: Azure Robinson (Robinson-27225)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { copyToClipboard } from "../../core/clipboard.js";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { BRAND, CARD_FONT, drawDnaPanel, drawRankBadge, drawScoreBadge } from "./share_page_card_art";
import {
  BASE_URL,
  CHANNELS,
  CROP_SHAPES,
  KIND_LABELS,
  appNameFromSlug,
  appSummary,
  buildText,
  cleanHeading,
  cropRect,
  detectPageKind,
  getChannel,
  fileIdFor,
  intentUrl,
  isNameSafe,
  isShareablePrivacy,
  lifeSummary,
  measure,
  parseGenealogyText,
  pageSummary,
  photoLinks,
  profileKeyFor,
  safeRelativeIds,
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
  if (kind === "other" || !(await checkShareable(kind)).ok) return;
  import("./share_page.css");
  const options = await getFeatureOptions("sharePage");
  addShareButton(kind, async ($button) => {
    // Tree Apps lets people move to another person without reloading, so the level is checked again at the click.
    const now = await checkShareable(kind);
    if (!now.ok) return showNotShareable($button);
    const key = profileKeyFor(kind, window.location.pathname, window.location.hash);
    // Living people's names stay off the card, so find out who is safe to name before the dialog opens.
    const safeIds = kind === "profile" ? await fetchSafeRelativeIds(key) : new Set();
    const chart = kind === "treeApp" ? await chartPermission(key) : { allowed: false, reason: "" };
    openDialog(kind, options, now.profile, { safeIds, chart });
  });
}

/**
 * Whether the page can be shared, and the profile the API returned. A profile or free-space page (and the tree,
 * widget or image that belongs to one) is shareable when WikiTree's API reports it as Public (50) or Open (60) and
 * not living. If the level cannot be read, it is not shareable.
 */
async function checkShareable(kind) {
  const key = profileKeyFor(kind, window.location.pathname, window.location.hash);
  if (!key) return { ok: true, profile: null };
  try {
    const [profile] = await WikiTreeAPI.getProfile("sharePage", key, [
      "Privacy",
      "IsLiving",
      "FirstName",
      "MiddleName",
      "LastNameCurrent",
    ]);
    // An image's file name only looks like a profile ID; if no such profile exists, the image does not belong to one.
    if (!profile && (kind === "imagePage" || kind === "fullImage")) return { ok: true, profile: null };
    return { ok: isShareablePrivacy(profile), profile };
  } catch (e) {
    return { ok: false, profile: null };
  }
}

/**
 * The IDs of a person's parents, spouses and children who may be named on the card: the API says they are not living and
 * not Private. If the API cannot be reached nobody is safe, so relatives are counted but not named.
 */
async function fetchSafeRelativeIds(key) {
  try {
    const items = await WikiTreeAPI.getRelatives("sharePage", [key], ["Name", "IsLiving", "Privacy"], {
      getParents: 1,
      getSpouses: 1,
      getChildren: 1,
    });
    return safeRelativeIds(items && items[0] && items[0].person);
  } catch (e) {
    return new Set();
  }
}

/**
 * Whether the picture of a Tree Apps chart may go on the card. The picture is whatever the page shows, so it is used only
 * for the fan chart, which shows ancestors, and only when the API says every ancestor in it is deceased and not Private.
 */
async function chartPermission(key) {
  if (viewSlug(window.location.hash) !== "fanchart") {
    return {
      allowed: false,
      reason: "Only the fan chart's picture is put on the card, because other views can show living people.",
    };
  }
  const generations = parseInt(clean($("#numGensInBBar").first().text()).replace(/\D/g, ""), 10) || 6;
  try {
    const ancestors = await WikiTreeAPI.getAncestors("sharePage", key, Math.min(10, generations), [
      "Name",
      "IsLiving",
      "Privacy",
    ]);
    if (Array.isArray(ancestors) && ancestors.length && ancestors.every(isNameSafe))
      return { allowed: true, reason: "" };
  } catch (e) {
    // treated as unsafe below
  }
  return {
    allowed: false,
    reason: "The chart's picture is not on the card, because it may include living or private people.",
  };
}

function showNotShareable($button) {
  $(".wbe-share-denied").remove();
  const $note = $('<span class="wbe-share-denied" role="status">Only Public and Open pages can be shared.</span>');
  $button.closest("li, h1, body").length ? $button.after($note) : $("body").append($note);
  setTimeout(() => $note.remove(), 5000);
}

// ---------------------------------------------------------------------------------------------
// The Share button
// ---------------------------------------------------------------------------------------------

function addShareButton(kind, onClick) {
  if ($(".wbe-share-button").length) return;
  const $toolbar = wbeButtonContainer();
  const $jumpNav = $("#jump-nav");
  // Category, Help and Project pages: the "Categories: ..." row under the title, which every visitor sees
  const $categories = $("#Categories").first();
  const $heading = $("h1").first();
  const $button = $toolbar
    ? toolbarButton()
    : $jumpNav.length || $categories.length || $heading.length
    ? jumpBarLink()
    : $('<button type="button" class="wbe-share-button" title="Share this page on social media">Share</button>');
  $button.on("click", (e) => {
    e.preventDefault();
    onClick($button);
  });
  if ($toolbar) {
    $toolbar.append($button);
  } else if ($jumpNav.length) {
    $('<li class="wbe-share-item"></li>').append($button).appendTo($jumpNav);
  } else if ($categories.length) {
    $categories.prepend($button.addClass("wbe-share-in-categories")); // floated to the right-hand end of the row
  } else if ($heading.length) {
    // at the end of the title line (Project pages, say), after the Scissors ID / LINK / URL buttons if they're there
    const $copyButtons = $heading.find(".copy--buttons").first();
    $button.addClass("wbe-share-in-heading");
    $copyButtons.length ? $copyButtons.after($button) : $heading.append($button);
  } else {
    // Tree widgets and Tree Apps views have no heading to attach to.
    $button.addClass("wbe-share-floating");
    // a full-screen image already has another feature's button at the bottom right
    if (kind === "fullImage") $button.addClass("wbe-share-top");
    $("body").append($button);
  }
}

/**
 * The row of WBE icon buttons (Clipboard, Notes, ...) beside the site's own buttons on profiles and free-space pages.
 * The other features may not have made it yet, so it is made here in the same place common.js puts it. It only exists
 * when the member is signed in, so other pages, and signed-out visitors, get the text button instead.
 */
function wbeButtonContainer() {
  const $existing = $(".clipboardContainer").first();
  if ($existing.length) return $existing;
  const $actions = $(".profile--actions.float-end").first();
  if (!$actions.length) return null;
  const $container = $("<span>").addClass("clipboardContainer");
  const $readingMode = $actions.find("a.action--reading-mode");
  $readingMode.length ? $container.insertBefore($readingMode.first()) : $actions.append($container);
  return $container;
}

// The share icon (as images/share.svg), drawn inline so it takes the colour of the link it is in.
const SHARE_ICON =
  '<svg class="wbe-share-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" ' +
  'stroke-width="1.75" stroke-linecap="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/>' +
  '<circle cx="18" cy="19" r="2.6"/><path fill="none" d="M8.26 10.69 15.74 6.31M8.26 13.31 15.74 17.69"/></svg>';

/** Among text links (a jump bar, a Categories row) or at the end of the title line: a "Share" link with the share icon. */
function jumpBarLink() {
  return $(
    `<a href="#" class="wbe-share-button wbe-share-link" title="Share this page on social media">${SHARE_ICON}Share</a>`
  );
}

/** An icon button built like the ones common.js adds, so it gets the same size and tooltip. */
function toolbarButton() {
  const title = "Share this page on social media";
  const icon = chrome.runtime.getURL("images/share.svg");
  return $("<a>")
    .attr({ id: "sharePageButton", href: "#", "aria-label": title })
    .attr({ "data-bs-title": title, "data-bs-toggle": "tooltip", "data-tooltip": title })
    .addClass("wbe-button wbe-share-button")
    .append($("<span>").addClass("icon--sharePage").css("background-image", `url(${icon})`));
}

// ---------------------------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------------------------

function pageTitle() {
  const fromTitle = document.title.replace(/\s*\|\s*WikiTree.*$/i, "").trim();
  if (fromTitle) return fromTitle;
  const fromHeading = textWithoutControls($("h1").first()).replace(/\s+/g, " ").trim();
  if (fromHeading) return fromHeading;
  const id = decodeURIComponent(window.location.pathname).split("/").filter(Boolean)[1];
  return id || "this page";
}

const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

/** The app and person shown by a Tree Apps view, read from the page the member is looking at. */
function readAppContext(profile) {
  const slug = viewSlug(window.location.hash);
  const selected = clean($("#view-select option:selected").text());
  return {
    slug,
    generations: clean($("#numGensInBBar").first().text()).replace(/\D/g, ""),
    description: clean($("#view-description").first().text()),
    appName: clean($("#view-title").first().text()) || selected || appNameFromSlug(slug),
    person:
      clean($("#name-placeholder").first().text()) ||
      (profile
        ? clean([profile.FirstName, profile.MiddleName, profile.LastNameCurrent].filter(Boolean).join(" "))
        : ""),
  };
}

/** The opening text, section names and counts of a help, project, free-space or category page. */
/**
 * An element's text without the controls inside it: footnote markers, WikiTree's "[edit]" link, and the Link and URL
 * copy buttons that Scissors adds to headings.
 */
function textWithoutControls($el) {
  return $el
    .clone()
    .find(
      "sup, script, style, button, .wbe-share-button, ul.copy--buttons, .copy--buttons, .scissors, .editsection, .mw-editsection"
    )
    .remove()
    .end()
    .text();
}

/**
 * What a surname's genealogy hub shows: its numbers (profiles, collaboration score, rank, DNA tests), the coordinator of
 * its one-name study with their photo, and the study's background picture.
 */
function readGenealogyFacts() {
  const hub = parseGenealogyText($("main").first().text());
  const $title = $(".page--title").first();
  const titleText = clean($title.text());
  const link = $title.find('a[href*="/wiki/"]').first();
  hub.coordinator = /Coordinator:/i.test(titleText) ? clean(link.text()) : "";
  const avatar = $title.find('img[src*="/photo.php/"]').first().attr("src") || "";
  hub.coordinatorPhoto = hub.coordinator && avatar ? (photoLinks(avatar) || {}).full || "" : "";
  const background =
    ($("#surname-heading").first().length ? getComputedStyle($("#surname-heading")[0]).backgroundImage : "") || "";
  const url = (background.match(/url\(["']?([^"')]+)["']?\)/) || [])[1] || "";
  hub.backgroundImage = url && photoLinks(url) ? photoLinks(url).full : "";
  return hub;
}

function readPageFacts() {
  const $body = $(".body-text").first();
  const paragraphs = $body
    .find("p")
    .filter((i, el) => !$(el).closest("table").length)
    .map((i, el) => textWithoutControls($(el)))
    .get();
  const sections = $body
    .find("h2")
    .map((i, el) => cleanHeading(textWithoutControls($(el))))
    .get()
    .filter((text) => text && !/^contents$/i.test(text));
  const counts = {};
  // a surname page says how many profiles it lists: "Search all 652 profiles."
  const listed = clean($("main").first().text()).match(/Search all ([\d,]+) profiles/i);
  if (listed) counts.profiles = parseInt(listed[1].replace(/,/g, ""), 10);
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The chart or tree on screen in a Tree Apps view: its largest SVG or canvas. */
function findChartElement() {
  const area = (el) => {
    const box = el.getBoundingClientRect();
    return box.width * box.height;
  };
  return (
    $("#view-container svg, #view-container canvas")
      .toArray()
      .filter((el) => el.getBoundingClientRect().width >= 200 && el.getBoundingClientRect().height >= 200)
      .sort((a, b) => area(b) - area(a))[0] || null
  );
}

/**
 * Tree Apps draw their chart after the people have loaded, so a picture taken straight away can show empty shapes.
 * Wait (up to a few seconds) while the loader is showing or the drawing is still changing.
 */
async function waitForChart(timeoutMs = 8000) {
  const started = Date.now();
  let last = -1;
  let steady = 0;
  while (Date.now() - started < timeoutMs) {
    const el = findChartElement();
    const loading = $("#view-loader").is(":visible");
    if (!el && !loading) return;
    if (el && el.tagName.toLowerCase() === "canvas" && !loading) return;
    const size = el ? el.innerHTML.length : 0;
    steady = el && !loading && size > 0 && size === last ? steady + 1 : 0;
    if (steady >= 2) return;
    last = size;
    await sleep(400);
  }
}

/** How much is drawn in a picture: the number of pixels that are neither clear nor white. -1 if it cannot be read. */
function inkScore(image) {
  try {
    const w = 320;
    const h = Math.max(
      1,
      Math.round((w * (image.naturalHeight || image.height)) / (image.naturalWidth || image.width))
    );
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    g.drawImage(image, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data;
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8 && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245)) ink++;
    }
    return ink;
  } catch (e) {
    return -1;
  }
}

/**
 * A picture of the chart or tree on screen in a Tree Apps view, as the member sees it. Returns an Image (from the
 * page's SVG) or the canvas itself, or null when the view is plain text and tables.
 */
async function captureAppGraphic() {
  await waitForChart();
  const found = findChartElement();
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
  // HTML inside a foreignObject (names, dates, portraits) is laid out by the page's CSS, which the copy does not have,
  // so it needs its sizes and spacing copied as well.
  const htmlProperties = [
    "color",
    "width",
    "height",
    "max-width",
    "max-height",
    "margin",
    "padding",
    "float",
    "display",
    "text-align",
    "line-height",
    "vertical-align",
    "border",
    "border-radius",
    "object-fit",
    "background-color",
    "overflow",
    "white-space",
  ];
  const XHTML = "http://www.w3.org/1999/xhtml";
  from.forEach((el, i) => {
    const computed = getComputedStyle(el);
    const list = el.namespaceURI === XHTML ? properties.concat(htmlProperties) : properties;
    list.forEach((property) => to[i].style.setProperty(property, computed.getPropertyValue(property)));
  });
  copy.querySelectorAll("img").forEach((img) => {
    ["srcset", "sizes", "loading", "crossorigin"].forEach((name) => img.removeAttribute(name));
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  copy.setAttribute("width", String(Math.round(box.width)));
  copy.setAttribute("height", String(Math.round(box.height)));
  if (!copy.getAttribute("viewBox"))
    copy.setAttribute("viewBox", `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
  const toImage = (svg) =>
    loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)));

  // First the plain drawing (colours and text, but no portraits), which is the safe result. Then the same drawing with
  // the portraits embedded, because an SVG drawn on its own cannot load outside pictures. The second is used only if
  // it came out at least as full as the first.
  // A picture that cannot be embedded would show as a broken-image icon, so it is left out instead.
  const withoutPictures = copy.cloneNode(true);
  withoutPictures.querySelectorAll("image, img").forEach((el) => el.remove());
  const plain = await toImage(withoutPictures);
  await Promise.race([inlinePictures(copy), sleep(6000)]);
  copy.querySelectorAll("image, img").forEach((el) => {
    const href = el.getAttribute("href") || el.getAttributeNS(XLINK, "href") || el.getAttribute("src") || "";
    if (!href.startsWith("data:")) el.remove();
  });
  const withPictures = await toImage(copy);
  const chosen =
    withPictures && plain && inkScore(withPictures) >= inkScore(plain) * 0.9 ? withPictures : plain || withPictures;
  return chosen ? trimMargins(chosen) : null;
}

const XLINK = "http://www.w3.org/1999/xlink";

/** A small PNG of a picture, so embedding a whole chart's portraits does not make the SVG enormous. */
async function shrinkToDataUrl(blob, max = 120) {
  try {
    const bitmap = await window.createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // photos stay JPEG (a PNG of a photo is several times larger); anything else may be transparent, so it stays PNG
    return blob.type === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.8) : canvas.toDataURL("image/png");
  } catch (e) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Fetch a picture. The page can read pictures from its own site. Pictures from another WikiTree site (such as
 * apps.wikitree.com) are blocked for the page, so they are fetched by the extension's background script instead.
 */
async function fetchPictureBlob(href) {
  const url = new URL(href, window.location.href);
  try {
    const response = await fetch(url);
    if (response.ok) return await response.blob();
  } catch (e) {
    // not allowed from the page; ask the background script below
  }
  const reply = await new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) return resolve(null);
    chrome.runtime.sendMessage({ action: "sharePageFetchImage", url: url.toString() }, (response) =>
      resolve(chrome.runtime.lastError ? null : response)
    );
  });
  if (!reply || !reply.success) throw new Error("The picture could not be fetched.");
  const bytes = Uint8Array.from(window.atob(reply.base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: reply.type });
}

/** Replace the address of every picture in an SVG with the picture itself, so it still shows when drawn alone. */
async function inlinePictures(svg) {
  await Promise.all(
    [...svg.querySelectorAll("image, img")].slice(0, 400).map(async (el) => {
      const isHtmlImg = el.tagName.toLowerCase() === "img";
      const href = isHtmlImg ? el.getAttribute("src") : el.getAttribute("href") || el.getAttributeNS(XLINK, "href");
      if (!href || href.startsWith("data:")) return;
      try {
        const blob = await fetchPictureBlob(href);
        const data = await shrinkToDataUrl(blob);
        if (isHtmlImg) {
          el.setAttribute("src", data);
        } else {
          // write only the attribute the chart already uses, so the picture is not stored twice
          const usesXlink = el.hasAttributeNS(XLINK, "href");
          if (el.hasAttribute("href") || !usesXlink) el.setAttribute("href", data);
          if (usesXlink) el.setAttributeNS(XLINK, "xlink:href", data);
        }
      } catch (e) {
        // leave this picture as it is; the rest of the chart is still worth sharing
      }
    })
  );
}

/** Crop away the empty margin around a drawing so the chart gets the room on the card. */
function trimMargins(source) {
  try {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    g.drawImage(source, 0, 0);
    const data = g.getImageData(0, 0, w, h).data;
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return source;
    const pad = 8;
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad);
    y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement("canvas");
    out.width = x1 - x0 + 1;
    out.height = y1 - y0 + 1;
    out.getContext("2d").drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  } catch (e) {
    return source;
  }
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

/** Draw text wrapped to a width, and return the baseline of the last line so the next block can start below it. */
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
        return y;
      }
      g.fillText(line, x, y);
      y += lineHeight;
      line = words[i];
    } else {
      line = test;
    }
  }
  g.fillText(line, x, y);
  return y;
}

function fitLine(g, text, maxWidth) {
  if (g.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && g.measureText(shortened + "…").width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return shortened.trimEnd() + "…";
}

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
  const { photoSrc = "", summary = null, subtitle = "", graphic = null, slot = null } = extras;
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
    // Tree Apps: the app's name, the person and what the view shows on the left, the chart as the member sees it on the right
    g.font = font("700 52px");
    let y = wrapText(g, title, 48, 200, 300, 60, 3);
    if (subtitle) {
      g.fillStyle = BRAND.ink;
      g.font = font("700 24px");
      y = wrapText(g, subtitle, 48, y + 46, 300, 32, 3);
    }
    if (summary && summary.bio) {
      g.fillStyle = BRAND.muted;
      g.font = font("400 22px");
      wrapText(g, summary.bio, 48, y + 54, 300, 30, 7);
    }
    const w = graphic.naturalWidth || graphic.width;
    const h = graphic.naturalHeight || graphic.height;
    const box = { x: 372, y: 96, w: 780, h: 476 };
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
    else if (slot) g.drawImage(slot, 892, 100, 260, 300);
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
      // with fewer than two rows of fields the text starts level with the photo, so it stops short of it
      wrapText(g, summary.bio, 48, layout.y, (photo || slot) && rows < 2 ? 810 : 1104, layout.line, layout.lines);
    }
  } else {
    g.font = font("700 52px");
    wrapText(g, title, 48, 200, photo ? 540 : 1104, 62, 5);
    if (photo) drawPhoto(652, 112, 500, 440);
  }
  return canvas;
}

/** The vitals and family lists shown on a profile, read from the page's own markup. */
function readProfileFacts(safeIds = new Set()) {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  const idOf = (el) => {
    const href = $(el).find('a[href*="/wiki/"]').first().attr("href") || "";
    try {
      return decodeURIComponent((href.match(/\/wiki\/([^/?#]+)/) || [])[1] || "");
    } catch (e) {
      return "";
    }
  };
  // each relative with the WikiTree ID in their link, so the API can say whether they may be named
  const relatives = (selector) => {
    const found = new Map();
    $(selector).each((i, el) => {
      const name = clean($(el).find('[itemprop="name"]').first().text() || $(el).text());
      if (name && !found.has(name)) found.set(name, idOf(el));
    });
    return [...found].map(([name, id]) => ({ name, id }));
  };
  const named = (list) => list.filter((r) => safeIds.has(r.id)).map((r) => r.name);
  const place = (scope, prop) => clean($(`${scope} [itemprop="${prop}"] [itemprop="name"]`).first().text());
  const spouses = $("#Spouses .spouse")
    .map((i, el) => {
      const $spouse = $(el);
      const name = clean($spouse.find('[itemprop="spouse"] [itemprop="name"]').first().text());
      const id = idOf($spouse.find('[itemprop="spouse"]').first());
      const married = (clean($spouse.text()).match(/\bmarried\s+(.*)$/) || [])[1] || "";
      const when = married.replace(/\s+at age \d+.*$/, "");
      const split = when.match(/^(?:(.*?)\s+)?in\s+(.+)$/);
      return { name, id, date: split ? clean(split[1]) : clean(when), place: split ? clean(split[2]) : "" };
    })
    .get()
    .filter((spouse) => spouse.name && safeIds.has(spouse.id))
    .map(({ name, date, place }) => ({ name, date, place }));
  const parents = relatives('#Parents [itemprop="parent"]');
  const children = relatives('#Children [itemprop="children"]');
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
    parents: named(parents),
    spouses,
    children: named(children),
    childCount: children.length,
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
        <div class="wbe-share-crop" hidden>
          <h3>Crop picture</h3>
          <label class="wbe-share-cropfor" hidden>
            <span>Picture</span>
            <select id="wbeShareCropFor"></select>
          </label>
          <div class="wbe-share-cropshapes" role="radiogroup" aria-label="Crop shape"></div>
          <canvas class="wbe-share-cropview" width="360" height="200" aria-label="The part of the picture that will show"></canvas>
          <label class="wbe-share-cropslide">
            <span class="wbe-share-cropfrom">Top</span>
            <input type="range" id="wbeShareCropSlider" min="0" max="100" value="50">
            <span class="wbe-share-cropto">Bottom</span>
          </label>
          <p class="wbe-share-hint wbe-share-crophint"></p>
        </div>
        <div class="wbe-share-summary" hidden>
          <h3><label for="wbeShareSummary">Summary on the card</label></h3>
          <textarea id="wbeShareSummary" rows="4" spellcheck="true"></textarea>
          <p class="wbe-share-hint wbe-share-summary-hint"></p>
        </div>
        <label class="wbe-share-linkchoice" hidden>
          <input type="checkbox" id="wbeShareProfileLink">
          <span>Link to the person's profile instead, so anyone can open it</span>
        </label>
        <div class="wbe-share-cardphoto" hidden>
          <h3>Picture on the card</h3>
          <div class="wbe-share-cardphotos" role="radiogroup" aria-label="Picture on the card"></div>
          <p class="wbe-share-hint">Choose which picture from this page is shown on the share card.</p>
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

function openDialog(kind, options, profile = null, extras = {}) {
  const safeIds = extras.safeIds || new Set();
  const chart = extras.chart || { allowed: false, reason: "" };
  if ($(".wbe-share-overlay").length) return;
  const opener = document.activeElement;
  const app = kind === "treeApp" ? readAppContext(profile) : null;
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
    url: profileUrl || viewUrl, // for a Tree Apps view, the profile link is the default because anyone can open it
    channel: getChannel(options.defaultChannel).id,
    text: "",
    edited: false,
    selected: [images[0].id],
    blobs: {},
  };
  const suggested = () =>
    buildText(kind, title, state.url, getChannel(state.channel), {
      hashtags: options.includeHashtags !== false,
      context: { ...(app || {}), profileLink: !!profileUrl && state.url === profileUrl },
    });
  state.text = suggested();

  const $overlay = $(DIALOG_HTML);
  const $dialog = $overlay.find(".wbe-share-dialog");
  const $text = $overlay.find("#wbeShareText");
  const $status = $overlay.find(".wbe-share-status");
  const say = (message) => $status.text(message);

  // The card is drawn once the chart (Tree Apps) has been captured, and again when the member edits its summary.
  const hubFacts = kind === "genealogy" ? readGenealogyFacts() : null;
  const cardSummary =
    options.cardSummary === false
      ? null
      : kind === "profile"
      ? lifeSummary(readProfileFacts(safeIds))
      : kind === "treeApp"
      ? { fields: [], bio: appSummary(app) }
      : pageSummary(kind, { ...readPageFacts(), title, genealogy: kind === "genealogy" ? hubFacts : null });
  state.bio = cardSummary ? cardSummary.bio : "";
  // What the member can put in the card's picture slot: on a surname hub the drawn score, rank and DNA pictures, the
  // one-name study's coordinator and background, then the photos found on the page.
  const surname = title.replace(/\s+Genealogy.*$/i, "").trim();
  const cardChoices = [];
  if (hubFacts) {
    const drawn = (id, label, canvas) => cardChoices.push({ id, label, canvas, thumb: canvas.toDataURL("image/png") });
    if (hubFacts.score != null) drawn("art-score", "Collaboration score", drawScoreBadge(hubFacts.score));
    if (hubFacts.rank) drawn("art-rank", "Rank", drawRankBadge(hubFacts.rank));
    if (Object.keys(hubFacts.dna).length) drawn("art-dna", "DNA tests", drawDnaPanel(surname, hubFacts.dna));
    if (hubFacts.coordinatorPhoto) {
      cardChoices.push({
        id: "coordinator",
        label: `Coordinator: ${hubFacts.coordinator}`,
        thumb: hubFacts.coordinatorPhoto,
        full: hubFacts.coordinatorPhoto,
      });
    }
    if (hubFacts.backgroundImage) {
      cardChoices.push({
        id: "background",
        label: "One-name study background",
        thumb: hubFacts.backgroundImage,
        full: hubFacts.backgroundImage,
      });
    }
  }
  photos.forEach((photo) => {
    if (!cardChoices.some((choice) => choice.full === photo.full)) cardChoices.push(photo);
  });
  // The card starts with the page's primary photo for a profile or free-space page, and with the collaboration score for
  // a surname hub. On other pages it starts with no picture, because their first one is often a logo or badge.
  state.cardPhoto =
    kind === "genealogy"
      ? (cardChoices.find((c) => c.id === "art-score") || {}).id || ""
      : kind === "profile" || kind === "space" || !cardSummary
      ? (photos[0] && photos[0].id) || ""
      : "";
  const chosenCard = () => cardChoices.find((c) => c.id === state.cardPhoto) || null;
  const cardPhotoSrc = () => (chosenCard() && chosenCard().full) || "";
  const cardSlot = () => (chosenCard() && chosenCard().canvas) || null;
  const graphicPromise =
    kind === "treeApp" && chart.allowed ? captureAppGraphic().catch(() => null) : Promise.resolve(null);
  let cardPromise;
  let cardRun = 0;
  function redrawCard() {
    const run = ++cardRun;
    delete state.blobs.card;
    cardPromise = graphicPromise
      .then((graphic) =>
        drawShareCard(kind, title, {
          photoSrc: graphic ? "" : cardPhotoSrc(),
          slot: graphic ? null : cardSlot(),
          summary: cardSummary ? { fields: cardSummary.fields, bio: state.bio } : null,
          subtitle: app ? app.person : "",
          graphic,
        })
      )
      .then((canvas) => {
        const card = images.find((i) => i.card);
        if (card && run === cardRun) {
          card.thumb = canvas.toDataURL("image/png");
          card.fileName = `wtshare-${fileIdFor(kind, window.location.pathname, window.location.hash)}.png`;
          renderImages();
          renderPost();
        }
        return canvas;
      });
    return cardPromise;
  }

  // ---- cropping: which part of a photo shows ----
  const crops = {}; // picture id -> { shape, fx, fy }
  const fullPictures = {}; // picture id -> the full-size picture, once loaded
  const cropThumbs = {}; // picture id -> small cropped picture for the grid and preview
  let cropAxis = null;
  let cropGeometry = null;
  let cropTimer;
  const cropOf = (image) => (crops[image.id] = crops[image.id] || { shape: "original", fx: 0.5, fy: 0.5 });
  const shapeOf = (image) => CROP_SHAPES.find((c) => c.id === cropOf(image).shape) || CROP_SHAPES[0];
  const isCropped = (image) => !image.card && shapeOf(image).ratio !== null;
  const isPng = (image) => /\.png$/i.test(image.fileName || "");
  const thumbOf = (image) => (isCropped(image) && cropThumbs[image.id]) || image.thumb;
  const fileNameOf = (image) =>
    isCropped(image)
      ? (image.fileName || "wikitree-image").replace(/\.[^.]+$/, "") + (isPng(image) ? "-cropped.png" : "-cropped.jpg")
      : image.fileName || "wikitree-image.jpg";
  const loadFull = (image) => (fullPictures[image.id] = fullPictures[image.id] || loadImage(image.full));

  /** Draw the kept part of a photo on a canvas no wider than maxWidth. Resolves null if the photo cannot be loaded. */
  async function renderCrop(image, maxWidth) {
    const picture = await loadFull(image);
    if (!picture) return null;
    const w = picture.naturalWidth || picture.width;
    const h = picture.naturalHeight || picture.height;
    const crop = cropOf(image);
    const rect = cropRect(w, h, shapeOf(image).ratio, crop.fx, crop.fy);
    const scale = Math.min(1, maxWidth / rect.sw);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.sw * scale));
    canvas.height = Math.max(1, Math.round(rect.sh * scale));
    canvas.getContext("2d").drawImage(picture, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
    return { canvas, rect, width: w, height: h };
  }

  function getBlob(image) {
    if (!state.blobs[image.id]) {
      if (image.card) {
        state.blobs[image.id] = cardPromise.then(
          (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
        );
      } else if (isCropped(image)) {
        state.blobs[image.id] = renderCrop(image, 2400).then((result) =>
          result
            ? new Promise((resolve) => result.canvas.toBlob(resolve, isPng(image) ? "image/png" : "image/jpeg", 0.92))
            : fetch(image.full).then((r) => r.blob())
        );
      } else {
        state.blobs[image.id] = fetch(image.full).then((r) => r.blob());
      }
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

  // ---- the photo on the share card ----
  const hasCard = images.some((i) => i.card);
  function renderCardPhotos() {
    const show = hasCard && kind !== "treeApp" && cardChoices.length > 0;
    $overlay.find(".wbe-share-cardphoto").prop("hidden", !show);
    if (!show) return;
    const $box = $overlay.find(".wbe-share-cardphotos").empty();
    const choose = (id) => () => {
      state.cardPhoto = id;
      renderCardPhotos();
      redrawCard();
    };
    $('<button type="button" role="radio" class="wbe-share-cardphotobtn wbe-share-cardphotonone">None</button>')
      .attr("aria-checked", String(!state.cardPhoto))
      .on("click", choose(""))
      .appendTo($box);
    cardChoices.forEach((photo) => {
      $('<button type="button" role="radio" class="wbe-share-cardphotobtn"></button>')
        .attr("aria-checked", String(photo.id === state.cardPhoto))
        .attr("title", photo.label)
        .append($('<img alt="">').attr("src", photo.thumb))
        .on("click", choose(photo.id))
        .appendTo($box);
    });
  }

  // ---- the crop panel ----
  const photoById = (id) => images.find((i) => i.id === id && !i.card);
  const lastSelectedPhoto = () => {
    const ids = state.selected.filter((id) => photoById(id));
    return ids.length ? ids[ids.length - 1] : null;
  };
  const activeImage = () => (state.active && state.selected.includes(state.active) ? photoById(state.active) : null);

  /** Show the part of the photo that will be kept, and set up the slider for the direction it can move in. */
  async function drawCropPreview(image) {
    const result = await renderCrop(image, 360);
    if (!result || activeImage() !== image) return;
    const view = $overlay.find(".wbe-share-cropview")[0];
    view.width = result.canvas.width;
    view.height = result.canvas.height;
    view.getContext("2d").drawImage(result.canvas, 0, 0);
    cropAxis = result.rect.axis;
    cropGeometry = result;
    const crop = cropOf(image);
    const $slider = $overlay.find("#wbeShareCropSlider");
    $slider.prop("disabled", !cropAxis).val(Math.round((cropAxis === "x" ? crop.fx : crop.fy) * 100));
    $overlay.find(".wbe-share-cropfrom").text(cropAxis === "x" ? "Left" : "Top");
    $overlay.find(".wbe-share-cropto").text(cropAxis === "x" ? "Right" : "Bottom");
    $overlay.find(".wbe-share-cropslide").toggleClass("wbe-share-off", !cropAxis);
    $overlay
      .find(".wbe-share-crophint")
      .text(
        !shapeOf(image).ratio
          ? "The whole picture is used. Choose a shape to crop it."
          : cropAxis
          ? "Drag the picture or use the slider to choose which part shows. The saved picture is cropped to match."
          : "This picture already has that shape, so there is nothing to move."
      );
  }

  function renderCropPanel() {
    const image = activeImage();
    $overlay.find(".wbe-share-crop").prop("hidden", !image);
    if (!image) return;
    loadFull(image);
    const selectedPhotos = state.selected.map(photoById).filter(Boolean);
    $overlay.find(".wbe-share-cropfor").prop("hidden", selectedPhotos.length < 2);
    const $for = $overlay.find("#wbeShareCropFor").empty();
    selectedPhotos.forEach((photo) => $for.append($("<option></option>").val(photo.id).text(photo.label)));
    $for.val(image.id);
    const $shapes = $overlay.find(".wbe-share-cropshapes").empty();
    CROP_SHAPES.forEach((shape) => {
      $('<button type="button" role="radio" class="wbe-share-cropshape"></button>')
        .attr("aria-checked", String(shape.id === cropOf(image).shape))
        .text(shape.label)
        .on("click", () => {
          cropOf(image).shape = shape.id;
          updateCrop(image);
        })
        .appendTo($shapes);
    });
    drawCropPreview(image);
  }

  /** The crop changed: forget the saved copy, redraw the panel now and the small pictures a moment later. */
  function updateCrop(image) {
    delete state.blobs[image.id];
    renderCropPanel();
    clearTimeout(cropTimer);
    cropTimer = setTimeout(async () => {
      if (isCropped(image)) {
        const result = await renderCrop(image, 480);
        if (result) cropThumbs[image.id] = result.canvas.toDataURL("image/jpeg", 0.85);
      } else {
        delete cropThumbs[image.id];
      }
      renderImages();
      renderPost();
    }, 120);
  }

  function moveCrop(image, fraction) {
    const crop = cropOf(image);
    if (cropAxis === "x") crop.fx = Math.min(1, Math.max(0, fraction));
    else if (cropAxis === "y") crop.fy = Math.min(1, Math.max(0, fraction));
    else return;
    updateCrop(image);
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
      if (thumbOf(image)) $b.append($('<img alt="">').attr("src", thumbOf(image)));
      else $b.append('<span class="wbe-share-placeholder">Drawing card…</span>');
      if (index > -1) $b.append($("<span class='wbe-share-badge'></span>").text(index + 1));
      $b.append($("<small></small>").text(image.label + (isCropped(image) ? " · cropped" : "")));
      $b.on("click", () => {
        const at = state.selected.indexOf(image.id);
        if (at > -1) {
          state.selected.splice(at, 1);
          if (state.active === image.id) state.active = lastSelectedPhoto();
        } else {
          state.selected.push(image.id);
          if (!image.card) state.active = image.id;
          getBlob(image).catch(() => {}); // fetch now so a phone's share sheet can open straight from a tap
        }
        renderImages();
        renderCropPanel();
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
      if (thumbOf(image)) $media.append($('<img alt="">').attr("src", thumbOf(image)));
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
    if (kind === "treeApp" && !chart.allowed && chart.reason) notes.push(chart.reason);
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
        a.download = fileNameOf(image);
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
          return new File([blob], fileNameOf(image), { type: blob.type || "image/jpeg" });
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
  $overlay.find("#wbeShareCropFor").on("change", (e) => {
    state.active = e.target.value;
    renderCropPanel();
  });
  $overlay.find("#wbeShareCropSlider").on("input", (e) => {
    const image = activeImage();
    if (image) moveCrop(image, Number(e.target.value) / 100);
  });
  // dragging the preview moves the kept part the other way, as if pulling the picture across the frame
  const $view = $overlay.find(".wbe-share-cropview");
  let drag = null;
  $view.on("pointerdown", (e) => {
    const image = activeImage();
    if (!image || !cropAxis || !cropGeometry) return;
    const crop = cropOf(image);
    drag = { x: e.clientX, y: e.clientY, fx: crop.fx, fy: crop.fy };
    if (e.target.setPointerCapture && e.pointerId !== undefined) e.target.setPointerCapture(e.pointerId);
    $view.addClass("wbe-share-dragging");
  });
  $view.on("pointermove", (e) => {
    const image = activeImage();
    if (!drag || !image || !cropGeometry) return;
    const { rect, width, height } = cropGeometry;
    const box = $view[0].getBoundingClientRect();
    if (cropAxis === "y" && box.height) {
      const slack = height - rect.sh;
      moveCrop(image, drag.fy - ((e.clientY - drag.y) * (rect.sh / box.height)) / slack);
    } else if (cropAxis === "x" && box.width) {
      const slack = width - rect.sw;
      moveCrop(image, drag.fx - ((e.clientX - drag.x) * (rect.sw / box.width)) / slack);
    }
  });
  $view.on("pointerup pointercancel", () => {
    drag = null;
    $view.removeClass("wbe-share-dragging");
  });
  if (profileUrl) {
    const $choice = $overlay.find(".wbe-share-linkchoice").prop("hidden", false);
    $choice.find("input").prop("checked", state.url === profileUrl);
    $choice.find("input").on("change", (e) => {
      const previous = state.url;
      state.url = e.target.checked ? profileUrl : viewUrl;
      // untouched text is rewritten for the new link; edited text only has the address swapped
      state.text = state.edited ? state.text.split(previous).join(state.url) : suggested();
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
    clearTimeout(cropTimer);
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
          : kind === "treeApp"
          ? "Describes what the view is showing now. Edit it to say what you like."
          : "Taken from the top of this page. Check it before you post."
      );
    $summary.val(state.bio).on("input", () => {
      state.bio = $summary.val();
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(redrawCard, 300);
    });
  }
  redrawCard();
  state.active = lastSelectedPhoto();
  $text.val(state.text);
  renderChannels();
  renderImages();
  renderCardPhotos();
  renderCropPanel();
  renderPost();
  getBlob(images.find((i) => i.id === state.selected[0])).catch(() => {});
  $("body").append($overlay);
  $overlay.find(".wbe-share-close").trigger("focus");
}
