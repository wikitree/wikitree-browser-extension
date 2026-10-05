// Shared pieces for Genie's d3 charts (fan chart, descendant sunburst): the
// popup styles, export, tooltip escaping, text contrast and profile links.

import $ from "jquery";
import { color as d3color } from "d3-color";
import { mainDomain } from "../../core/pageType";

export function yearOf(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match && match[1] !== "0000" ? Number(match[1]) : null;
}

export function textColourFor(fill) {
  const c = d3color(fill);
  if (!c) return "#222";
  const { r, g, b } = c.rgb();
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1d1d1f" : "#ffffff";
}

/** An absolute URL on the WikiTree site for a site path such as "/photo.php/…". */
export function siteUrl(path) {
  return /^https?:/i.test(path) ? path : `https://${mainDomain}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** "George Hightower": RealName is the first name only, so add the surname at birth unless it's already there. */
export function fullName(person) {
  const name = String(person?.name || "").trim();
  const surname = String(person?.lnab || "").trim();
  if (!name) return surname || person?.wtid || "";
  if (!surname || name.toLowerCase().split(/\s+/).includes(surname.toLowerCase())) return name;
  return `${name} ${surname}`;
}

export function profileUrl(wtid) {
  return `https://${mainDomain}/wiki/${encodeURIComponent(wtid)}`;
}

export function lifeYears(person) {
  const birth = yearOf(person?.birth);
  const death = yearOf(person?.death);
  if (!birth && !death) return "";
  return `${birth || "?"}–${death || ""}`;
}

// core/common's setHighestZIndex needs chrome at import time, which breaks the
// chat tests that import the charts; WBE popups are the only rivals here.
export function raiseAboveOtherPopups(popup) {
  raisePopupNow(popup);
  // A chart opened from a button in Genie: the same click then reaches core's
  // ".wbe-popup" click handler, which lifts Genie back over the new chart (live,
  // 2026-10-04: Lifespans opened hidden behind Genie). Raise it again after that.
  setTimeout(() => {
    if (popup.isConnected) raisePopupNow(popup);
  }, 0);
}

function raisePopupNow(popup) {
  // chat.css gives .wbe-popup "z-index: 99990 !important", so the inline value must be important too.
  // Genie's own popup can sit just under the browser's ceiling; when there's no room above it,
  // renumber the open popups below the ceiling (keeping their order), as core setHighestZIndex does.
  const CEILING = 2147483647;
  const zOf = (el) => Number(getComputedStyle(el).zIndex) || 0;
  const others = [...document.querySelectorAll(".wbe-popup, .chat-popup, #wbe-chat-container")].filter((el) => el !== popup);
  const highest = others.reduce((max, el) => Math.max(max, zOf(el)), 1000);
  if (highest < CEILING) {
    popup.style.setProperty("z-index", String(highest + 1), "important");
    return;
  }
  others
    .sort((a, b) => zOf(a) - zOf(b))
    .forEach((el, index) => el.style.setProperty("z-index", String(CEILING - others.length + index), "important"));
  popup.style.setProperty("z-index", String(CEILING), "important");
}

/**
 * Full screen for a chart popup: it fills the window (which always works), and asks the
 * browser for real full screen too (which some pages and frames refuse). Esc or the
 * button again leaves either.
 */
export function toggleChartFullScreen(popup) {
  const leave = () => {
    popup.classList.remove("wbe-chart-full");
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("fullscreenchange", onChange);
    if (document.fullscreenElement === popup) document.exitFullscreen?.().catch(() => {});
  };
  const onKey = (event) => {
    if (event.key === "Escape") leave();
  };
  const onChange = () => {
    if (document.fullscreenElement !== popup) leave();
  };
  if (popup.classList.contains("wbe-chart-full")) {
    popup._wbeLeaveFullScreen?.();
    return;
  }
  popup.classList.add("wbe-chart-full");
  popup._wbeLeaveFullScreen = leave;
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("fullscreenchange", onChange);
  try {
    popup.requestFullscreen?.()?.catch(() => {});
  } catch (error) {
    // Filling the window is enough.
  }
}

/**
 * Buttons that jump from one chart to another for the same person (options.links:
 * [{label, title, open(key)}]). chartLinkClick runs one: it leaves full screen first,
 * since a full-screen chart would hide the new one.
 */
export function chartLinkButtons(links) {
  return (links || [])
    .map(
      (link, index) =>
        `<button type="button" class="small wbe-chart-link" data-link="${index}" title="${escapeText(link.title || link.label)}">${escapeText(link.label)}</button>`
    )
    .join("");
}

export function chartLinkClick(popup, button, links, key) {
  const link = (links || [])[Number(button?.dataset?.link)];
  if (!link || !key) return false;
  popup._wbeLeaveFullScreen?.();
  Promise.resolve()
    .then(() => link.open(key))
    .catch((error) => console.warn(`wbe: ${link.label} failed`, error));
  return true;
}

export function centrePopup(popup) {
  popup.style.position = "fixed";
  const rect = popup.getBoundingClientRect();
  popup.style.left = `${Math.max(8, Math.round((window.innerWidth - rect.width) / 2))}px`;
  popup.style.top = `${Math.max(8, Math.round((window.innerHeight - rect.height) / 2))}px`;
}

export function truncate(text, maxChars) {
  const value = String(text || "");
  if (maxChars < 2) return "";
  return value.length > maxChars ? `${value.slice(0, Math.max(1, maxChars - 1))}…` : value;
}

export function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}


const CHART_CSS = `
  .wbe-kin-dashboard { overflow:auto; padding:16px; }
  .wbe-kin-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  .wbe-kin-controls input[type=number] { width:58px; }
  .wbe-kin-root { background:#25422d; color:white; padding:14px; border-radius:12px; font-size:20px; font-weight:bold; margin:14px 0; }
  .wbe-kin-root small { display:block; font-size:10px; font-weight:normal; }
  .wbe-chart-popup .chat-popup-body.wbe-kin-dashboard { overflow:auto; padding:16px; display:block; }
  .wbe-kin-grid { overflow:auto; margin-top:14px; }
  .wbe-kin-matrix { border-collapse:separate; border-spacing:10px 8px; width:auto; margin:0 auto; }
  .wbe-kin-matrix th { font-size:12px; color:#666666; text-align:center; min-width:90px; max-width:100px; padding:6px; }
  .wbe-kin-matrix tbody th { min-width:85px; width:85px; }
  .wbe-kin-matrix td { vertical-align:middle; min-width:96px; width:96px; max-width:110px; padding:0; border-left:1px solid #dedecb; }
  .wbe-kin-matrix .wbe-kin-card { width:100%; margin:4px 0; }
  .wbe-kin-matrix .wbe-kin-root { margin:4px 0; text-align:center; height:80px; font-size:12px; padding:10px 6px; display:flex; flex-direction:column; justify-content:center; box-sizing:border-box; }
  .wbe-kin-card { display:flex; flex-direction:column; gap:8px; padding:9px 6px; background:var(--kin-background,#e1f0b4); color:#25422d; border:1px solid var(--kin-border,#a5d167); border-radius:12px; cursor:pointer; min-height:80px; font-size:11px; line-height:1.25; }
  .wbe-kin-card strong { font-size:16px; color:#25422d; background:white; border-radius:20px; padding:2px 14px; align-self:center; }
  .wbe-kin-card:focus-visible,.wbe-kin-card[aria-pressed=true] { outline:3px solid #25422d; outline-offset:2px; }
  .wbe-kin-list { position:fixed; z-index:2147483647; box-sizing:border-box; padding:12px; background:#f0f0eb; color:#333333; border:1px solid #dedecb; border-radius:10px; max-height:320px; overflow:auto; box-shadow:0 5px 22px #0003; }
  .wbe-kin-list[hidden] { display:none; }
  .wbe-kin-list h3 { font-size:14px; margin:0 0 8px; }
  .wbe-kin-list ul { padding:0; list-style:none; }
  .wbe-kin-list li { padding:8px; margin:4px 0; border:1px solid #dedecb; border-radius:4px; }
  .wbe-kin-list .wbe-kin-gender-male { background:#f2f1ff; }
  .wbe-kin-list .wbe-kin-gender-female { background:#ffeeee; }
  .wbe-kin-list .wbe-kin-gender-unknown { background:#eeffee; }
  .wbe-kin-list small { display:block; color:#666666; }
  .wbe-kin-note { font-size:12px; color:#666666; }
  .wbe-kin-card[aria-pressed=true] strong { background:#fcb815; }
  .wbe-kin-list a:link { color:#008000; }
  .wbe-kin-list a:visited { color:#800080; }
  .wbe-chart-popup { width: min(920px, 96vw); height: min(780px, 92vh); display: flex; flex-direction: column; }
  .wbe-chart-popup .chat-popup-controls .wbe-chart-link { color: #1d5f8c; border-color: #9cc3de; background: #f2f8fc; }
  .wbe-chart-popup .chat-popup-controls .wbe-chart-link:hover { background: #e2eff8; }
  .wbe-chart-popup:fullscreen, .wbe-chart-popup.wbe-chart-full { left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; background: #fff; }
  .wbe-chart-popup .chat-popup-body { flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden; position: relative; }
  .wbe-chart-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 10px; border-bottom: 1px solid rgba(0,0,0,.08); font-size: 12px; }
  .wbe-chart-toolbar .wbe-chart-mode { border: 1px solid rgba(0,0,0,.15); background: transparent; border-radius: 999px; padding: 3px 10px; cursor: pointer; font-size: 12px; color: inherit; }
  .wbe-chart-toolbar .wbe-chart-mode.active { background: #2f6fb3; border-color: #2f6fb3; color: #fff; }
  .wbe-chart-toolbar .wbe-chart-spacer { flex: 1; }
  .wbe-chart-stage { flex: 1; position: relative; min-height: 0; background: radial-gradient(ellipse at 50% 70%, rgba(47,111,179,.07), transparent 70%); }
  .wbe-chart-stage svg { width: 100%; height: 100%; display: block; cursor: grab; }
  .wbe-chart-stage svg:active { cursor: grabbing; }
  .wbe-chart-tip { position: absolute; pointer-events: none; background: #fffaf0; color: #2b2b2b; border: 1px solid #e3d9c3; padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.4; max-width: 280px; box-shadow: 0 6px 20px rgba(60,45,20,.18); opacity: 0; transition: opacity .12s; z-index: 2; }
  .wbe-chart-tip b { font-size: 13px; }
  .wbe-chart-tip .wbe-chart-tip-rel { color: #1f5f8b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .wbe-chart-tip .wbe-chart-tip-hint { color: #7a7266; font-size: 11px; margin-top: 4px; }
  .wbe-chart-tip b, .wbe-chart-tip strong, .wbe-chart-tip em, .wbe-chart-tip i { color: inherit !important; } /* (a page rule makes b/strong/em dark grey !important) */
  /* Cream, so profile links can be WikiTree's own green (2026-10-03, the user's idea). */
  .wbe-chart-tip a, .wbe-chart-tip a:link, .wbe-chart-tip a:visited { color: #2e6b1f !important; text-decoration: underline; }
  .wbe-chart-tip a:hover, .wbe-chart-tip a:link:hover, .wbe-chart-tip a:visited:hover { color: #174a0c !important; }
  .wbe-chart-tip.wbe-chart-tip-pinned { max-height: 70%; overflow-y: auto; box-shadow: 0 0 0 2px #8fbf5a, 0 6px 20px rgba(60,45,20,.22); }
  .wbe-chart-tip .wbe-chart-tip-repeat { color: #b0185a; margin-top: 4px; }
  .wbe-chart-tip .wbe-chart-tip-dna { color: #6a3bb5; margin-top: 4px; }
  .wbe-chart-tip .wbe-chart-tip-quality { color: #2f6b3a; margin-top: 4px; }
  .wbe-chart-tip .wbe-chart-tip-history { color: #8a5a00; margin-top: 4px; }
  .wbe-chart-stats .wbe-chart-repeats { white-space: normal; font-size: 11px; color: #c2185b; margin-top: 2px; max-width: 220px; }
  .wbe-chart-footer { display: flex; gap: 14px; align-items: flex-start; padding: 6px 10px 8px; border-top: 1px solid rgba(0,0,0,.08); font-size: 12px; }
  .wbe-chart-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; flex: 1; }
  .wbe-chart-legend span { display: inline-flex; align-items: center; gap: 5px; cursor: default; padding: 1px 4px; border-radius: 4px; }
  .wbe-chart-legend span:hover { background: rgba(0,0,0,.06); }
  .wbe-chart-legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .wbe-chart-bars { display: flex; gap: 3px; align-items: flex-end; height: 34px; }
  .wbe-chart-bars div { width: 12px; background: rgba(0,0,0,.08); border-radius: 2px; position: relative; height: 100%; }
  .wbe-chart-bars div b { position: absolute; bottom: 0; left: 0; right: 0; background: #2f6fb3; border-radius: 2px; }
  .wbe-chart-stats { white-space: nowrap; }
  .wbe-chart-stats strong { font-size: 18px; display: block; }
  .wbe-chart-crumbs { padding: 4px 10px 0; font-size: 12px; min-height: 20px; }
  .wbe-chart-crumb { border: none; background: none; color: #2f6fb3; cursor: pointer; padding: 0; font-size: 12px; }
  .wbe-chart-crumb:disabled { color: inherit; font-weight: 600; cursor: default; }
  `;

// Double-clicking a chart's title bar toggles full screen, as a window's does (user,
// 2026-10-03). It presses the popup's own Full screen button, so each chart re-fits as usual.
let headerDoubleClickInstalled = false;
export function installHeaderDoubleClick() {
  if (headerDoubleClickInstalled) return;
  headerDoubleClickInstalled = true;
  document.addEventListener("dblclick", (event) => {
    const header = event.target?.closest?.(".chat-popup-header");
    if (!header || event.target.closest("button, a, input, select, textarea")) return;
    const button = header.closest(".chat-popup")?.querySelector('[data-act="full"], #wbe-conn-full');
    if (!button) return;
    window.getSelection?.()?.removeAllRanges(); // (the double-click selected a word of the title)
    button.click();
  });
}

export function injectChartStyles() {
  installHeaderDoubleClick();
  if (document.getElementById("wbe-chart-style")) return;
  const style = document.createElement("style");
  style.id = "wbe-chart-style";
  style.textContent = CHART_CSS;
  document.head.appendChild(style);
}

function svgMarkup(svgNode) {
  const node = svgNode.cloneNode(true);
  node.querySelector("g")?.removeAttribute("transform");
  node.setAttribute("style", "background:#ffffff");
  return new XMLSerializer().serializeToString(node);
}

function download(name, href) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Saves the chart as "svg" or "png" (2400px wide, white background). The first <g> is the zoom layer and is reset. */
export function saveChart(svgNode, fileBase, format) {
  const markup = svgMarkup(svgNode);
  if (format === "svg") {
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    download(`${fileBase}.svg`, url);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const [, , w, h] = String(svgNode.getAttribute("viewBox") || "0 0 800 800").split(" ").map(Number);
  const scale = 2400 / w;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    download(`${fileBase}.png`, canvas.toDataURL("image/png"));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Thumbnail URL for a person's photo (getPeople PhotoData), about `size` pixels wide. */
export function photoUrl(person, size = 150) {
  const data = person?.photoData;
  if (!data) return "";
  if (data.dir && person.photo) return siteUrl(`${data.dir}/${person.photo}/${size}px-${person.photo}`);
  return data.url ? siteUrl(data.url) : "";
}

/** Standard controls; action names are shared by each chart's event handlers. */
export function chartPopupControls() {
  return `
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>`;
}

/** Handle the shared controls; return false for a chart's own controls. */
export function handleChartPopupButton(popup, button, { svg, fileBase }) {
  if (button.classList.contains("close-popup")) {
    closeChartPopup(popup);
    return true;
  }
  const action = button.dataset.act;
  if (action === "full") {
    toggleChartFullScreen(popup);
    return true;
  }
  if (action === "svg" || action === "png") {
    saveChart(svg, fileBase, action);
    return true;
  }
  return false;
}

/** Close and replacement share cleanup, including document fullscreen listeners. */
export function closeChartPopup(popup) {
  if (popup._wbeCloseChart) popup._wbeCloseChart();
  else {
    popup._wbeLeaveFullScreen?.();
    popup.remove();
  }
}

/** Create one chart of this kind, releasing the previous instance first. */
export function createChartPopup({ id, html }) {
  const previous = document.getElementById(id);
  if (previous) closeChartPopup(previous);
  injectChartStyles();
  const popup = document.createElement("div");
  popup.id = id;
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.style.display = "flex";
  popup.innerHTML = html;
  let closed = false;
  popup._wbeCloseChart = () => {
    if (closed) return;
    closed = true;
    popup._wbeLeaveFullScreen?.();
    try {
      popup._wbeChartCleanup?.();
    } finally {
      popup.remove();
    }
  };
  document.body.appendChild(popup);
  centrePopup(popup);
  return popup;
}

/** Finish setup after drawing, and register renderer cleanup for close/replacement. */
export function mountChartPopup(popup, cleanup, { stage, resize } = {}) {
  const observer = stage && resize && typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(stage);
  popup._wbeChartCleanup = () => {
    try {
      cleanup?.();
    } finally {
      observer?.disconnect();
      if ($.fn.draggable && $(popup).data("ui-draggable")) $(popup).draggable("destroy");
    }
  };
  raiseAboveOtherPopups(popup);
  if ($.fn.draggable) $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
}
