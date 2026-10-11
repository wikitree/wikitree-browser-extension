// The Family Explorer's "Family" view: photo cards round one person (see chat_family_navigator_data.js
// for who goes where). Clicking anyone glides every card to its new place round them: cards that
// stay move and change size, new ones grow out of the relative they hang from, the rest fade.
// Cards are HTML (sharp text, real photos); the lines are SVG under them; one animation frame moves
// both, so they never part. d3-zoom pans and zooms the whole scene.

import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { easeCubicInOut } from "d3-ease";
import { familyAround, familyLoaded, navigatorLayout, layoutBounds, NAV_SIZES, stepWord } from "./chat_family_navigator_data";

export { stepWord };
import { escapeText, fullName, lifeYears, photoUrl, profileUrl, siteUrl, yearOf } from "./chat_chart_common";
import { reducedMotion } from "./chat_fractal_common";

const GLIDE_MS = 850;
const NAV_PHOTO_PX = 240; // (one size for every card: a card that grows or shrinks keeps its photo, already loaded)
const TRAIL_MAX = 8;
const STYLE_ID = "wbe-nav-style";

const NAV_CSS = `
  .wbe-nav { position: absolute; inset: 0; overflow: hidden; outline: none; cursor: grab; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(ellipse at 50% 40%, #fffdf7 0%, #f6f3ea 55%, #ece7da 100%); }
  .wbe-nav:active { cursor: grabbing; }
  .wbe-nav-scene { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
  .wbe-nav-links { position: absolute; left: -6000px; top: -6000px; width: 12000px !important; height: 12000px !important; max-width: none !important; overflow: visible; pointer-events: none; }
  .wbe-nav-links path { fill: none; stroke: #b9a487; stroke-width: 2; stroke-linecap: round; }
  .wbe-nav-links path.wbe-nav-line { stroke: #d9b45a; stroke-width: 3.2; }
  .wbe-nav-links path.wbe-nav-bar { stroke: #d9b45a; stroke-width: 2; }
  .wbe-nav-links path.wbe-nav-tick { stroke: #cdbda6; stroke-width: 1.6; }
  .wbe-nav-ring circle { fill: #fffdf7; stroke: #c9a227; stroke-width: 1.6; }
  .wbe-nav-ring circle.wbe-nav-band { fill: none; stroke-width: 1.7; }
  .wbe-nav-ring text { font: 600 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; fill: #8a7444; text-anchor: middle; }
  .wbe-nav-card { position: absolute; left: 0; top: 0; box-sizing: border-box; display: flex; align-items: center; gap: .75em; padding: .55em .9em .55em .55em;
    background: #fff; color: #1f2b33; border: 1px solid rgba(60,50,30,.10); border-radius: 14px; overflow: hidden; cursor: pointer; user-select: none;
    box-shadow: 0 1px 2px rgba(40,30,10,.06), 0 6px 18px rgba(60,50,20,.10); transition: box-shadow .2s ease, border-color .2s ease; will-change: transform; }
  .wbe-nav-card:hover { border-color: #d9b45a; box-shadow: 0 2px 4px rgba(40,30,10,.08), 0 10px 26px rgba(60,50,20,.18); }
  .wbe-nav-card:focus-visible { outline: 3px solid #f0b400; outline-offset: 2px; }
  .wbe-nav-photo { flex: none; width: var(--photo); height: var(--photo); border-radius: 50%; overflow: hidden; display: grid; place-items: center;
    background: linear-gradient(145deg, #d8e4cf, #b9cbb0); color: #fff; font-weight: 600; font-size: calc(var(--photo) * .36); letter-spacing: .02em;
    box-shadow: 0 0 0 3px var(--ring, #c9c2b2), 0 2px 6px rgba(0,0,0,.18); }
  .wbe-nav-photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; display: block; }
  .wbe-nav-male { --ring: #7ea6d8; }
  .wbe-nav-male .wbe-nav-photo { background: linear-gradient(145deg, #a9c3e3, #7ea6d8); }
  .wbe-nav-female { --ring: #df98b1; }
  .wbe-nav-female .wbe-nav-photo { background: linear-gradient(145deg, #f0bfd0, #df98b1); }
  .wbe-nav-text { min-width: 0; display: flex; flex-direction: column; gap: .12em; }
  .wbe-nav-role { font-size: .7em; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #9a8558; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wbe-nav-name { font-size: 1.12em; font-weight: 650; line-height: 1.18; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .wbe-nav-life { font-size: .9em; color: #5d6a72; white-space: nowrap; }
  .wbe-nav-place { font-size: .84em; color: #6f7a80; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* (#none: WikiTree's own link colours won, the name came out magenta) */
  .wbe-nav a.wbe-nav-profile:not(#none), .wbe-nav a.wbe-nav-profile:not(#none):visited { color: #1f2b33 !important; text-decoration: none; cursor: pointer; }
  .wbe-nav a.wbe-nav-profile:not(#none):hover { color: #2b6cb0 !important; text-decoration: underline; text-underline-offset: 3px; }
  .wbe-nav-centre { border: 2px solid #f0b400; --ring: #f0b400; cursor: default; padding-right: 1.2em;
    box-shadow: 0 0 0 7px rgba(240,180,0,.14), 0 14px 36px rgba(60,50,20,.20); }
  .wbe-nav-centre:hover { border-color: #f0b400; }
  .wbe-nav-centre .wbe-nav-name { font-size: 1.42em; }
  .wbe-nav-half { border-style: dashed; }
  .wbe-nav-stub .wbe-nav-name, .wbe-nav-hidden .wbe-nav-name { color: #7b858b; font-style: italic; }
  .wbe-nav-hidden { cursor: default; }
  .wbe-nav-chip { padding: .3em .7em .3em .3em; gap: .5em; border-radius: 999px; }
  .wbe-nav-chip .wbe-nav-name { font-size: 1em; font-weight: 600; -webkit-line-clamp: 1; }
  .wbe-nav-chip .wbe-nav-photo { box-shadow: 0 0 0 2px var(--ring, #c9c2b2); }
  .wbe-nav-more { justify-content: center; color: #6f5c33; font-weight: 600; background: #fbf6e8; }
  .wbe-nav-trail { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; z-index: 2; pointer-events: none; font-size: 12.5px; color: #8a7a5a; }
  .wbe-nav-trail button { pointer-events: auto; border: 1px solid rgba(60,50,30,.14); background: rgba(255,255,255,.85); color: #3c4a52; border-radius: 999px; padding: 2px 10px; font: 500 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; cursor: pointer; }
  .wbe-nav-trail button:hover { border-color: #d9b45a; background: #fff8e1; }
  .wbe-nav-trail button { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wbe-nav-trail button small { font-size: 11px; color: #8a7a5a; font-weight: 500; }
  .wbe-nav-step { font-size: 11.5px; font-style: italic; color: #9a8558; white-space: nowrap; }
  .wbe-nav-trail button[aria-current] { border-color: #f0b400; background: #fff3c4; font-weight: 650; cursor: default; }
  .wbe-nav-status { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 3; padding: 6px 16px 6px 34px; border-radius: 999px; background: rgba(34,48,58,.88); color: #fff; font-size: 13px; white-space: nowrap; pointer-events: none; }
  .wbe-nav-status::before { content: ""; position: absolute; left: 13px; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #f0b400; animation: wbe-nav-spin .8s linear infinite; }
  .wbe-nav-status.wbe-nav-status-error::before { display: none; }
  .wbe-nav-status.wbe-nav-status-error { padding-left: 16px; background: rgba(150,50,30,.9); }
  @keyframes wbe-nav-spin { to { transform: rotate(360deg); } }
  .wbe-nav-keys { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 5px 14px; border-radius: 999px; background: rgba(255,255,255,.82); color: #5d6a72; font-size: 12px; white-space: nowrap; pointer-events: none; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .wbe-nav-keys kbd { font: 600 11px system-ui, sans-serif; padding: 0 5px; border: 1px solid #cfc6b3; border-radius: 4px; background: #fff; color: #3c4a52; }
  body.darkMode .wbe-nav-card:not(#none) { background: #fff !important; color: #1f2b33 !important; }
  body.darkMode .wbe-nav-card a.wbe-nav-profile:not(#none):not(:hover) { color: #1f2b33 !important; }
  body.darkMode .wbe-nav-trail button:not(#none) { background: rgba(255,255,255,.88) !important; color: #3c4a52 !important; }
`;

function injectNavStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = NAV_CSS;
  document.head.appendChild(style);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

function initials(person) {
  const words = fullName(person).split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() || "?";
}

/** "Born 1898 in Vernon, Texas · died aged 99" for the person in the middle. */
function storyLine(person) {
  const born = yearOf(person.birth);
  const died = yearOf(person.death);
  const parts = [];
  if (person.birthLocation) parts.push(`${born ? `Born ${born} in ` : "Born in "}${person.birthLocation}`);
  // (an age on WikiTree is the age they died at)
  if (born && died) parts.push(`died aged ${died - born}`);
  return parts.join(" · ");
}

/**
 * Mounts the view in `host` (it fills it). options: {world: the family world (people, parentsKnown,
 * childrenKnown, tried, focusId), load(id) → Promise (fetches the family round someone), startId,
 * onCentre(person)}. Returns {centre(id), up(), home(), resize(), destroy(), currentId()}.
 */
export function mountFamilyNavigator(host, options) {
  injectNavStyles();
  const world = options.world;
  const people = world.people;
  const root = document.createElement("div");
  root.className = "wbe-nav";
  root.tabIndex = 0;
  root.setAttribute("aria-label", "Family view: arrow keys move to parents, children, brothers and sisters; Shift with left or right to a husband or wife");
  // (the lines' SVG is a big fixed box offset by half: a 1px one with overflow showing came out 0×0 on WikiTree, with no lines drawn)
  root.innerHTML = `
    <div class="wbe-nav-scene">
      <svg class="wbe-nav-links" width="12000" height="12000"><g transform="translate(6000 6000)"><g class="wbe-nav-paths"></g><g class="wbe-nav-rings"></g></g></svg>
    </div>
    <div class="wbe-nav-trail"></div>
    <div class="wbe-nav-status" hidden></div>
    <div class="wbe-nav-keys">Click anyone to move to them · <kbd>↑</kbd> parents · <kbd>↓</kbd> children · <kbd>←</kbd> <kbd>→</kbd> brothers and sisters · <kbd>Shift</kbd>+<kbd>←</kbd> <kbd>→</kbd> husband or wife</div>`;
  host.appendChild(root);
  const scene = root.querySelector(".wbe-nav-scene");
  const pathLayer = root.querySelector(".wbe-nav-paths");
  const ringLayer = root.querySelector(".wbe-nav-rings");
  const trailEl = root.querySelector(".wbe-nav-trail");
  const statusEl = root.querySelector(".wbe-nav-status");
  const SVG = "http://www.w3.org/2000/svg";

  let width = 0;
  let height = 0;
  let current = 0;
  let layout = { cards: [], links: [], rings: [] };
  let frame = 0;
  let loadToken = 0;
  let destroyed = false;
  const trail = [];
  const cards = new Map(); // key → {el, card, geo, from, to, exiting}
  const paths = new Map(); // key → {el, link, geo, from, to, exiting, opacity}
  const rings = new Map();

  let view = zoomIdentity;
  const zoomer = d3zoom()
    .scaleExtent([0.25, 2.2])
    .filter((event) => (!event.ctrlKey || event.type === "wheel") && !event.button)
    .on("zoom", (event) => {
      view = event.transform;
      scene.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    });
  const rootSelection = select(root).call(zoomer).on("dblclick.zoom", null);

  function measure() {
    const rect = root.getBoundingClientRect();
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
  }

  /** The camera that shows everything laid out, or (when that would be too small to read) the middle of it. */
  function fitView(target) {
    const box = layoutBounds(target);
    if (!Number.isFinite(box.x0)) return zoomIdentity.translate(width / 2, height / 2);
    const pad = 28;
    const top = 44; // (the trail)
    const bottom = 40; // (the keys)
    const boxW = box.x1 - box.x0 + pad * 2;
    const boxH = box.y1 - box.y0 + pad * 2;
    const k = Math.max(0.6, Math.min(1.12, width / boxW, (height - top - bottom) / boxH));
    const halfW = width / (2 * k);
    const halfH = (height - top - bottom) / (2 * k);
    const clampTo = (value, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, value)));
    // (centred on the person when it doesn't all fit, with nothing past the edges that needn't be)
    const cx = boxW * k <= width ? (box.x0 + box.x1) / 2 : clampTo(0, box.x0 - pad + halfW, box.x1 + pad - halfW);
    const cy = boxH * k <= height - top - bottom ? (box.y0 + box.y1) / 2 : clampTo(0, box.y0 - pad + halfH, box.y1 + pad - halfH);
    return zoomIdentity.translate(width / 2 - cx * k, top + (height - top - bottom) / 2 - cy * k).scale(k);
  }

  function geometryOf(card) {
    const box = NAV_SIZES[card.size];
    return { x: card.x, y: card.y, w: card.w, h: card.h, font: box.font, photo: box.photo, scale: 1 };
  }

  function cardHtml(card) {
    if (card.more) return `<span class="wbe-nav-name">+${card.more} more</span>`;
    const person = card.person;
    const url = person.hidden || person.stub ? "" : photoUrl(person, NAV_PHOTO_PX);
    // (a sized thumbnail doesn't exist for a small original: the API's own small one is tried next, then the initials)
    const fallback = person.photoData?.url ? siteUrl(person.photoData.url) : "";
    const image = url ? `<img src="${escapeText(url)}" data-fallback="${escapeText(fallback)}" data-initials="${escapeText(initials(person))}" alt="" loading="lazy" draggable="false">` : "";
    const photo = `<span class="wbe-nav-photo">${image || escapeText(person.hidden ? "?" : initials(person))}</span>`;
    const name = person.hidden ? "Private" : fullName(person) || person.wtid;
    if (card.size === "chip") return `${photo}<span class="wbe-nav-text"><span class="wbe-nav-name">${escapeText(name)}</span></span>`;
    const married = card.married && yearOf(card.married) ? ` · m. ${yearOf(card.married)}` : "";
    const lines = [
      card.role ? `<span class="wbe-nav-role">${escapeText(card.role + married)}</span>` : "",
      // (the person's own name is the link to their profile; user: "rather than an extra link thing")
      card.size === "xl" && person.wtid && !person.hidden && !person.stub
        ? `<a class="wbe-nav-name wbe-nav-profile" href="${escapeText(profileUrl(person.wtid))}" target="_blank" rel="noopener" title="Open ${escapeText(name)}'s WikiTree profile">${escapeText(name)}</a>`
        : `<span class="wbe-nav-name">${escapeText(name)}</span>`,
      lifeYears(person) ? `<span class="wbe-nav-life">${escapeText(lifeYears(person))}</span>` : "",
    ];
    if (card.size === "xl") {
      const story = storyLine(person);
      if (story) lines.push(`<span class="wbe-nav-place" title="${escapeText(story)}">${escapeText(story)}</span>`);
    } else if (card.size === "l" && person.birthLocation) {
      lines.push(`<span class="wbe-nav-place">${escapeText(person.birthLocation)}</span>`);
    }
    return `${photo}<span class="wbe-nav-text">${lines.join("")}</span>`;
  }

  function dressCard(entry) {
    const { el, card } = entry;
    const person = card.person || {};
    const gender = String(person.gender || "").toLowerCase();
    el.className = [
      "wbe-nav-card",
      card.size === "chip" ? "wbe-nav-chip" : "",
      card.more ? "wbe-nav-more" : "",
      card.centre ? "wbe-nav-centre" : "",
      card.half ? "wbe-nav-half" : "",
      person.stub ? "wbe-nav-stub" : "",
      person.hidden ? "wbe-nav-hidden" : "",
      gender === "male" ? "wbe-nav-male" : gender === "female" ? "wbe-nav-female" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const signature = `${card.size}|${card.role}|${card.more || ""}|${person.id}|${person.stub ? 1 : 0}|${card.married || ""}`;
    if (entry.signature !== signature) {
      entry.signature = signature;
      el.innerHTML = cardHtml(card);
    }
    const name = card.more ? `${card.more} more of ${fullName(card.moreOf)}'s children` : person.hidden ? "Private" : fullName(person);
    el.title = card.centre ? "" : card.more ? `Move to ${fullName(card.moreOf)} to see them all` : `${card.role ? `${card.role}: ` : ""}${name}${lifeYears(person) ? ` (${lifeYears(person)})` : ""}`;
    el.setAttribute("aria-label", el.title || name);
  }

  function paint(entry, geo, opacity) {
    entry.geo = geo;
    const style = entry.el.style;
    style.transform = `translate(${geo.x - geo.w / 2}px, ${geo.y - geo.h / 2}px)${geo.scale !== 1 ? ` scale(${geo.scale})` : ""}`;
    style.width = `${geo.w}px`;
    style.height = `${geo.h}px`;
    style.fontSize = `${geo.font}px`;
    style.setProperty("--photo", `${geo.photo}px`);
    style.opacity = String(opacity);
  }

  const mix = (a, b, t) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    font: lerp(a.font, b.font, t),
    photo: lerp(a.photo, b.photo, t),
    scale: lerp(a.scale ?? 1, b.scale ?? 1, t),
  });

  function pathD(link) {
    if (link.kind === "line") return `M${link.x1},${link.y1} L${link.x2},${link.y2}`;
    const mid = (link.y1 + link.y2) / 2;
    return `M${link.x1},${link.y1} C${link.x1},${mid} ${link.x2},${mid} ${link.x2},${link.y2}`;
  }
  const mixLink = (a, b, t) => ({ ...b, x1: lerp(a.x1, b.x1, t), y1: lerp(a.y1, b.y1, t), x2: lerp(a.x2, b.x2, t), y2: lerp(a.y2, b.y2, t) });

  /** Moves everything to `next` (a navigatorLayout), animated unless `instant`. */
  function render(next, { instant = false } = {}) {
    layout = next;
    const centreId = next.cards.find((card) => card.centre)?.person?.id;
    const centrePerson = people.get(centreId) || {};
    const lineKeys = new Set([`d-p${centreId}`, `d-p${centrePerson.fatherId}`, `d-p${centrePerson.motherId}`]);
    const seen = new Set();
    next.cards.forEach((card) => {
      seen.add(card.key);
      let entry = cards.get(card.key);
      if (!entry || entry.exiting) {
        if (entry) entry.el.remove();
        const el = document.createElement("div");
        el.setAttribute("role", "button");
        el.dataset.key = card.key;
        scene.appendChild(el);
        entry = { el, entering: true };
        cards.set(card.key, entry);
      } else entry.entering = false;
      entry.card = card;
      entry.exiting = false;
      entry.from = entry.geo || null;
      entry.to = geometryOf(card);
      entry.fromOpacity = entry.entering ? 0 : Number(entry.el.style.opacity || 1);
      dressCard(entry);
    });
    cards.forEach((entry, key) => {
      if (seen.has(key)) return;
      entry.exiting = true;
      entry.from = entry.geo;
      entry.to = { ...entry.geo, scale: 0.85 };
      entry.fromOpacity = Number(entry.el.style.opacity || 1);
    });

    const keyed = (store, items, layer, make) => {
      const live = new Set();
      items.forEach((item) => {
        live.add(item.key);
        let entry = store.get(item.key);
        if (!entry) {
          entry = { el: make(item), entering: true, item };
          layer.appendChild(entry.el);
          store.set(item.key, entry);
        } else entry.entering = false;
        entry.exiting = false;
        entry.from = entry.geo || item;
        entry.to = item;
        entry.fromOpacity = entry.entering ? 0 : entry.opacity ?? 1;
        entry.item = item;
      });
      store.forEach((entry, key) => {
        if (live.has(key)) return;
        entry.exiting = true;
        entry.from = entry.geo;
        entry.to = entry.geo;
        entry.fromOpacity = entry.opacity ?? 1;
      });
    };
    keyed(paths, next.links, pathLayer, (link) => {
      const el = document.createElementNS(SVG, "path");
      if (link.kind === "line" && /-bar$/.test(link.key)) el.setAttribute("class", "wbe-nav-bar");
      else if (/^tick-|^spine-/.test(link.key)) el.setAttribute("class", "wbe-nav-tick");
      return el;
    });
    paths.forEach((entry, key) => {
      if (!entry.exiting && entry.el.getAttribute("class") !== "wbe-nav-bar" && entry.el.getAttribute("class") !== "wbe-nav-tick") {
        entry.el.setAttribute("class", lineKeys.has(key) ? "wbe-nav-line" : "");
      }
    });
    keyed(rings, next.rings, ringLayer, (ring) => {
      const g = document.createElementNS(SVG, "g");
      g.setAttribute("class", "wbe-nav-ring");
      g.innerHTML = `<circle r="12"></circle><circle class="wbe-nav-band" cx="-2.8" r="4.3"></circle><circle class="wbe-nav-band" cx="2.8" r="4.3"></circle><text y="27"></text>`;
      return g;
    });
    rings.forEach((entry) => {
      if (!entry.exiting) entry.el.querySelector("text").textContent = entry.item.year ? `m. ${entry.item.year}` : "";
    });

    const camFrom = view;
    const camTo = fitView(next);
    const duration = instant || reducedMotion() ? 0 : GLIDE_MS;
    const started = performance.now();
    cancelAnimationFrame(frame);
    const step = (now) => {
      if (destroyed) return;
      const raw = duration ? clamp01((now - started) / duration) : 1;
      const t = easeCubicInOut(raw);
      // Cards that stay first, so new ones can grow out of where their relative is now.
      const order = [...cards.values()].sort((a, b) => Number(a.entering) - Number(b.entering));
      order.forEach((entry) => {
        if (entry.exiting) {
          const fade = clamp01(raw * 2.2);
          paint(entry, mix(entry.from, entry.to, t), entry.fromOpacity * (1 - fade));
          return;
        }
        if (entry.entering) {
          const anchor = cards.get(entry.card.anchor);
          const base = anchor?.geo && !anchor.entering ? anchor.geo : entry.to;
          const from = { ...entry.to, x: base.x, y: base.y, scale: 0.35 };
          const grow = clamp01((raw - 0.18) / 0.82);
          paint(entry, mix(from, entry.to, easeCubicInOut(grow)), clamp01(grow * 1.6));
          return;
        }
        paint(entry, entry.from ? mix(entry.from, entry.to, t) : entry.to, lerp(entry.fromOpacity, 1, t));
      });
      const linkStep = (store, draw) =>
        store.forEach((entry) => {
          const geo = entry.exiting ? entry.from : entry.entering ? entry.to : mixLink(entry.from, entry.to, t);
          const opacity = entry.exiting ? entry.fromOpacity * (1 - clamp01(raw * 2.5)) : entry.entering ? clamp01((raw - 0.45) / 0.55) : lerp(entry.fromOpacity, 1, t);
          entry.geo = geo;
          entry.opacity = opacity;
          draw(entry, geo, opacity);
        });
      linkStep(paths, (entry, geo, opacity) => {
        entry.el.setAttribute("d", pathD(geo));
        entry.el.style.opacity = String(opacity);
      });
      linkStep(rings, (entry, geo, opacity) => {
        entry.el.setAttribute("transform", `translate(${geo.x},${geo.y})`);
        entry.el.style.opacity = String(opacity);
      });
      const camera = zoomIdentity.translate(lerp(camFrom.x, camTo.x, t), lerp(camFrom.y, camTo.y, t)).scale(lerp(camFrom.k, camTo.k, t));
      rootSelection.call(zoomer.transform, camera);
      if (raw < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      frame = 0;
      [cards, paths, rings].forEach((store) =>
        store.forEach((entry, key) => {
          if (entry.exiting) {
            entry.el.remove();
            store.delete(key);
          } else {
            entry.entering = false;
            entry.fromOpacity = 1;
          }
        })
      );
    };
    if (duration) frame = requestAnimationFrame(step);
    else step(performance.now());
  }

  // Full names with birth years and how each step is related to the one before (user, on a trail of first
  // names "Marshall › John › John › William …": "First names are not enough here").
  function renderTrail() {
    trailEl.innerHTML = "";
    trail.forEach((id, i) => {
      const person = people.get(id);
      if (i) {
        const step = document.createElement("span");
        step.className = "wbe-nav-step";
        const relation = stepWord(people.get(trail[i - 1]), person, people);
        step.textContent = relation ? `${relation} ›` : "›";
        trailEl.appendChild(step);
      }
      const button = document.createElement("button");
      button.type = "button";
      const born = yearOf(person?.birth);
      button.innerHTML = person ? `${escapeText(fullName(person) || person.wtid)}${born ? ` <small>${born}</small>` : ""}` : escapeText(String(id));
      button.title = person ? `${fullName(person)}${lifeYears(person) ? ` (${lifeYears(person)})` : ""}` : "";
      if (id === current) button.setAttribute("aria-current", "true");
      else button.addEventListener("click", () => centre(id));
      trailEl.appendChild(button);
    });
  }

  function setStatus(text, error = false) {
    statusEl.hidden = !text;
    statusEl.textContent = text || "";
    statusEl.classList.toggle("wbe-nav-status-error", Boolean(error));
  }

  /** Moves to `id`, then fetches their family if it isn't all here, and moves again as it arrives. */
  async function centre(id, { instant = false } = {}) {
    const person = people.get(id);
    if (!person || person.hidden || destroyed) return;
    current = id;
    const at = trail.indexOf(id);
    if (at >= 0) trail.splice(at, 1);
    trail.push(id);
    if (trail.length > TRAIL_MAX) trail.shift();
    renderTrail();
    render(navigatorLayout(familyAround(people, id)), { instant });
    options.onCentre?.(person);
    if (familyLoaded(world, id)) {
      setStatus("");
      return;
    }
    const token = ++loadToken;
    setStatus(`Finding ${String(person.name || "").trim() || fullName(person)}'s family…`);
    try {
      await options.load(id);
    } catch (error) {
      if (token === loadToken) setStatus("WikiTree didn't answer. Click them again to retry.", true);
      return;
    }
    if (token !== loadToken || current !== id || destroyed) return;
    setStatus("");
    render(navigatorLayout(familyAround(people, id)));
    options.onCentre?.(person);
  }

  /** Who the arrow keys go to: parents, the middle child, the next brother or sister along. */
  function neighbour(direction) {
    const person = people.get(current);
    if (!person) return 0;
    if (direction === "up") return [person.fatherId, person.motherId].find((parentId) => people.has(parentId) && !people.get(parentId).hidden) || 0;
    const visible = layout.cards.filter((card) => card.person && !card.person.hidden && !card.person.stub);
    if (direction === "down") {
      const kids = visible.filter((card) => card.size === "m" && card.y > 0 && card.role && /Son|Daughter|Child/.test(card.role));
      return kids.length ? kids[Math.floor((kids.length - 1) / 2)].person.id : 0;
    }
    if (direction === "spouse-left" || direction === "spouse-right") {
      // (Shift+←/→, user: "arrow buttons to also go to the wife": the one on that side, else the one there is)
      const spouses = visible.filter((card) => card.size === "l" && Math.abs(card.y) < 1);
      const onSide = spouses.find((card) => (direction === "spouse-left" ? card.x < 0 : card.x > 0));
      return (onSide || spouses[0])?.person.id || 0;
    }
    // Brothers and sisters in age order (in two rows when there are many: cards come oldest first on
    // the left, nearest first on the right).
    const siblings = visible.filter((card) => !card.centre && Math.abs(card.y) < 60 && /Brother|Sister|Sibling/.test(card.role));
    const next = direction === "left" ? siblings.filter((card) => card.x < 0).pop() : siblings.find((card) => card.x > 0);
    return next ? next.person.id : 0;
  }

  root.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.closest(".wbe-nav-photo")) return;
      const fallback = image.dataset.fallback;
      if (fallback && image.src !== fallback) {
        image.src = fallback;
        return;
      }
      image.parentElement.textContent = image.dataset.initials || "?";
    },
    true
  );

  root.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const el = event.target.closest(".wbe-nav-card");
    if (!el) return;
    const entry = cards.get(el.dataset.key);
    const card = entry?.card;
    if (!card || entry.exiting) return;
    if (card.more) return centre(card.moreOf.id);
    const person = card.person;
    if (!person || person.hidden) return;
    if ((event.shiftKey || event.metaKey || event.ctrlKey) && person.wtid) {
      window.open(profileUrl(person.wtid), "_blank", "noopener,noreferrer");
      return;
    }
    if (card.centre) return;
    // (someone known only by ID: their family fetch brings them)
    if (person.stub) {
      if (!people.has(person.id)) {
        setStatus(`Finding ${person.wtid || "them"}…`);
        Promise.resolve(options.load(current))
          .then(() => {
            setStatus("");
            if (people.has(person.id)) centre(person.id);
          })
          .catch(() => setStatus("WikiTree didn't answer. Try again.", true));
        return;
      }
    }
    centre(person.id);
  });

  root.addEventListener("keydown", (event) => {
    const direction = event.shiftKey
      ? { ArrowLeft: "spouse-left", ArrowRight: "spouse-right" }[event.key]
      : { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[event.key];
    if (!direction || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const id = neighbour(direction);
    if (id) centre(id);
  });

  function resize() {
    measure();
    if (!frame) render(layout, { instant: true });
  }

  measure();
  centre(options.startId && people.has(options.startId) ? options.startId : world.focusId, { instant: true });
  // (opens from a little further out, then settles: it reads as arriving)
  if (!reducedMotion()) {
    const settled = view;
    rootSelection.call(zoomer.transform, zoomIdentity.translate(width / 2 - (width / 2 - settled.x) * 0.85, height / 2 - (height / 2 - settled.y) * 0.85).scale(settled.k * 0.85));
    render(layout);
  }
  root.focus({ preventScroll: true });

  return {
    centre: (id) => centre(id),
    up: () => {
      const id = neighbour("up");
      if (id) centre(id);
      else setStatus("No parents recorded on WikiTree.", true);
    },
    home: () => centre(world.focusId),
    resize,
    currentId: () => current,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      rootSelection.on(".zoom", null);
      root.remove();
    },
  };
}
