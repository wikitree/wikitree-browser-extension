// The fractal tree popup (OneZoom-style, "but for families"). Each person is a
// circle holding a small tree of their children; zooming into anyone opens up
// their family, generation after generation. Drawn on a canvas in screen space
// (positions are computed in doubles and never passed through a canvas
// transform), so ten generations deep still draws sharp. d3-zoom moves the
// camera; click a circle to fly into it, Shift/⌘/Ctrl-click opens the profile.

import {
  injectFractalStyles,
  reducedMotion,
  wrapText,
  bindFractalSearch,
  saveFractalPng,
  switchFractalWhich,
} from "./chat_fractal_common";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { scaleSequential } from "d3-scale";
import { interpolateSpectral, schemeTableau10 } from "d3-scale-chromatic";
import { interpolateRgb } from "d3-interpolate";
import { easeCubicInOut } from "d3-ease";
import { buildFractalLayout, graftBranch, hasFrontier, NESTED_GEOMETRY } from "./chat_fractal_tree_data";
import { createChartPopup, mountChartPopup, closeChartPopup, chartLinkButtons, chartLinkClick, escapeText, fullName, lifeYears as years, photoUrl, profileUrl, siteUrl, toggleChartFullScreen, yearOf } from "./chat_chart_common";
import { showSpiralTreePopup } from "./chat_fractal_spiral";

export { photoUrl };

const LAYOUT_KEY = "wbe-fractal-layout";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const DISC = interpolateRgb("#5f6062", "#c4c6c9");
const LEAF_PLAIN = "#7cc85a";
const FOCUS_RING = "#f5c518";
const UNKNOWN = "#c9c9c9";
const HIGHLIGHT = "#e0533d";
const MIN_DRAW = 1.2; // screen radius below which a circle isn't drawn
const MIN_INSIDE = 9; // screen radius a circle needs before its family is drawn inside it
const EXPAND_AT = 110; // screen radius at which someone at the edge of what's loaded loads their next generations
const MAX_LOADING = 2; // branches fetched at once
const EXPAND_RETRY_MS = 4000; // wait before fetching a branch again after it failed
const EXPAND_TRIES = 3; // then leave it
const MODES = [
  { key: "plain", label: "Plain" },
  { key: "century", label: "Birth year" },
  { key: "country", label: "Birth country" },
  { key: "surname", label: "Surname" },
];

/** {fill(person), key(person), legend:[{key,label,colour}]} for rings and leaves. */
function buildColouring(nodes, mode, palette = {}) {
  const people = nodes.map((node) => node.person);
  if (mode === "century") {
    const found = people.map((person) => yearOf(person.birth)).filter(Boolean);
    const min = found.length ? Math.min(...found) : 1800;
    const max = found.length ? Math.max(...found) : 1950;
    const scale = scaleSequential(interpolateSpectral).domain([min, Math.max(max, min + 1)]);
    const buckets = [];
    for (let start = Math.floor(min / 25) * 25; start <= max; start += 25) buckets.push(start);
    return {
      fill: (person) => (yearOf(person.birth) ? scale(yearOf(person.birth)) : UNKNOWN),
      key: (person) => (yearOf(person.birth) ? String(Math.floor(yearOf(person.birth) / 25) * 25) : "?"),
      legend: [
        ...buckets.map((start) => ({ key: String(start), label: `${start}–${start + 24}`, colour: scale(Math.min(Math.max(start + 12, min), max)) })),
        { key: "?", label: "No birth year", colour: UNKNOWN },
      ],
    };
  }
  if (mode === "country" || mode === "surname") {
    // Every surname (or country) keeps its own colour for as long as the popup is open: the most
    // common ones get the clearest colours, and any others golden-angle hues as they appear.
    const valueOf = mode === "country" ? (person) => person.birthCountry || "" : (person) => person.lnab || "";
    const colours = palette[mode] || (palette[mode] = new Map());
    const colourOf = (value) => {
      if (!colours.has(value)) {
        const i = colours.size;
        colours.set(value, i < 10 ? schemeTableau10[i] : `hsl(${Math.round((i * 137.508) % 360)}, 55%, 52%)`);
      }
      return colours.get(value);
    };
    const counts = new Map();
    people.forEach((person) => {
      const value = valueOf(person);
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([value]) => colourOf(value));
    return {
      fill: (person) => {
        const value = valueOf(person);
        return value ? colourOf(value) : UNKNOWN;
      },
      key: (person) => valueOf(person) || "?",
      // The key lists what's in view (the circles drawn last), commonest first.
      legendFor: (shown) => {
        const inView = new Map();
        let unknown = 0;
        shown.forEach((node) => {
          const value = valueOf(node.person);
          if (value) inView.set(value, (inView.get(value) || 0) + 1);
          else unknown += 1;
        });
        const ranked = [...inView.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const listed = ranked.slice(0, 9);
        const listedKeys = new Set(listed.map(([value]) => value));
        const rest = ranked.length - listed.length;
        return [
          ...listed.map(([value, count]) => ({ key: value, label: `${value} (${count})`, colour: colourOf(value) })),
          ...(rest ? [{ key: "Other", label: `${rest} more`, colour: "#a0a0a0", match: (person) => valueOf(person) && !listedKeys.has(valueOf(person)) }] : []),
          ...(unknown ? [{ key: "?", label: mode === "country" ? "No birthplace" : "No surname", colour: UNKNOWN }] : []),
        ];
      },
    };
  }
  return {
    fill: () => LEAF_PLAIN,
    key: () => "plain",
    legend: [{ key: "plain", label: "No children recorded (a leaf)", colour: LEAF_PLAIN }],
  };
}

function savedLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "spiral" ? "spiral" : "nested";
  } catch (error) {
    return "nested";
  }
}

/**
 * tree: {person, children, depth}. options: {title, which: "descendants"|"ancestors",
 * layout: "nested" (the default: families inside circles) | "spiral"}. The header
 * button switches layouts, and the choice is remembered for next time.
 */
export function showFractalTreePopup(tree, options = {}) {
  const layout = options.layout || savedLayout();
  const onSwitchLayout = () => {
    const next = layout === "spiral" ? "nested" : "spiral";
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch (error) {
      // Storage may be blocked; the switch still works for this popup.
    }
    showFractalTreePopup(tree, { ...options, layout: next });
  };
  if (layout === "spiral") return showSpiralTreePopup(tree, { ...options, onSwitchLayout });
  return showNestedTreePopup(tree, { ...options, onSwitchLayout });
}

/**
 * The family world (the fractal tree's CC7-style version); see chat_family_world_data.js. world: {build() → {nodes},
 * expand(request) → Promise, stats() → html, climb(fromCouple) → {status, root, back, ids}, reroot(root, anchorUid, nodes, how) → bool,
 * normalise() → {scale, x, y}, home()}.
 * options: {title}.
 */
export function showFamilyWorldPopup(world, options = {}) {
  return showNestedTreePopup(null, { ...options, which: "descendants", world });
}

function showNestedTreePopup(tree, options = {}) {
  injectFractalStyles();
  const which = options.which === "ancestors" ? "ancestors" : "descendants";
  const childWord = which === "ancestors" ? "parents" : "children";
  // options.world: the family world, whose root moves as you zoom (see showFamilyWorldPopup).
  const world = options.world || null;
  const buildLayout = () => (world ? world.build() : { nodes: buildFractalLayout(tree).nodes });
  let { nodes } = buildLayout();
  let roots = nodes.filter((node) => node.parent === -1);
  const state = {
    mode: nodes.some((node) => yearOf(node.person.birth)) ? "century" : "plain",
    transform: zoomIdentity,
    hover: -1,
    focus: 0,
    fitted: 0,
    loading: 0,
    loadingKeys: new Set(),
    doneKeys: new Set(),
    failedKeys: new Map(), // key → {count, at}
    fittedFill: 0.92,
    pulse: null,
    matches: [],
    matchIndex: -1,
  };
  const photos = new Map();

  const popup = createChartPopup({
    id: "wbe-fractal-popup",
    html: `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="out" title="${world ? "Zoom out a generation" : "Zoom out to the parent's circle"}">Out</button>
        <button type="button" class="small" data-act="reset" title="${world ? "Back to the start" : "Back to the whole tree"}">${world ? "Home" : "Whole tree"}</button>
        ${options.onSwitchWhich ? `<button type="button" class="small" data-act="which" title="Turn the tree round: this person's ${which === "ancestors" ? "descendants" : "ancestors"}">${which === "ancestors" ? "Descendants" : "Ancestors"}</button>` : ""}
        ${options.onSwitchLayout ? `<button type="button" class="small" data-act="layout" title="Switch to the spiral layout: siblings bud off curling stems">Spiral</button>` : ""}
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="png" title="Save the current view as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <input type="search" class="wbe-fractal-search" placeholder="Find someone on the tree…" aria-label="Find someone on the tree">
      </div>
      <div class="wbe-fractal-crumbs"></div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`,
  });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Fractal tree";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const crumbs = popup.querySelector(".wbe-fractal-crumbs");
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const palette = {};
  let colouring = buildColouring(nodes, state.mode, palette);
  let width = 0;
  let height = 0;
  let frame = 0;
  const retryTimers = new Set();

  function resize() {
    const rect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const sized = Math.round(rect.width) !== Math.round(width) || Math.round(rect.height) !== Math.round(height);
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // The popup can settle its size after opening; keep the circle we flew to filling the view.
    if (sized && state.fitted >= 0 && nodes[state.fitted]) {
      canvasSelection.interrupt("fly");
      canvasSelection.call(zoomer.transform, fitNode(nodes[state.fitted], state.fittedFill));
    }
    draw();
  }

  function requestDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  /** A zoom transform that fits a node's circle in the view. */
  function fitNode(node, fill = 0.92) {
    const k = (Math.min(width, height) * fill) / (node.r * 2);
    return zoomIdentity.translate(width / 2 - node.x * k, height / 2 - node.y * k).scale(k);
  }

  function screenOf(node) {
    const t = state.transform;
    return { x: t.x + node.x * t.k, y: t.y + node.y * t.k, r: node.r * t.k };
  }

  function photoFor(person) {
    const url = photoUrl(person);
    if (!url) return null;
    let entry = photos.get(url);
    if (!entry) {
      const image = new Image();
      entry = { image, ready: false };
      image.onload = () => {
        entry.ready = true;
        requestDraw();
      };
      image.onerror = () => {
        // The sized thumbnail may not exist for small originals; fall back to the API's 75px one.
        const fallback = person.photoData?.url ? siteUrl(person.photoData.url) : "";
        if (fallback && image.src !== fallback) image.src = fallback;
      };
      image.src = url;
      photos.set(url, entry);
    }
    return entry.ready ? entry.image : null;
  }

  function onScreen(s) {
    return s.x + s.r >= 0 && s.x - s.r <= width && s.y + s.r >= 0 && s.y - s.r <= height;
  }

  function lit(node) {
    return !state.pulse || state.pulse.has(node.index);
  }

  function drawText(lines, x, y, size, colour, weight = 600) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      const lineSize = index === 0 ? size : size * 0.8;
      ctx.font = `${index === 0 ? weight : 400} ${lineSize}px ${FONT}`;
      ctx.fillStyle = colour;
      ctx.fillText(line, x, y + (index - (lines.length - 1) / 2) * size * 1.2);
    });
  }

  function drawLeaf(node, s) {
    // A round leaf pointing back down towards the fork, like OneZoom's.
    const point = Math.PI / 2 + node.angle; // the fork lies below and towards the centre
    const tipX = s.x + Math.cos(point) * s.r * 1.35;
    const tipY = s.y + Math.sin(point) * s.r * 1.35;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.arc(s.x, s.y, s.r, point + 0.7, point - 0.7 + Math.PI * 2);
    ctx.closePath();
    ctx.globalAlpha = lit(node) ? 1 : 0.25;
    ctx.fillStyle = state.mode === "plain" ? LEAF_PLAIN : colouring.fill(node.person);
    ctx.fill();
    ctx.lineWidth = Math.max(0.5, s.r * 0.08);
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : "rgba(0,0,0,.3)";
    ctx.stroke();
    if (s.r > 14) {
      const lines = wrapText(fullName(node.person), s.r > 45 ? 16 : 11, s.r > 30 ? 2 : 1);
      if (s.r > 34) {
        const life = years(node.person);
        if (life) lines.push(life);
      }
      if (s.r > 80 && node.person.birthLocation) lines.push(...wrapText(node.person.birthLocation, 22, 2));
      drawText(lines, s.x, s.y, s.r * 0.24, "#1d1d1f");
    }
  }

  /** Draws a person's circle and, once it is big enough, their family inside it. */
  function drawNode(node, s) {
    if (s.r < MIN_DRAW || !onScreen(s)) return;
    if (s.r >= 6) state.drawn?.push(node);
    if (node.kind === "ghost" && !node.children.length) return drawGhost(node, s);
    if (node.leaf) {
      drawLeaf(node, s);
      if (node.focus) drawFocusRing(s);
      return;
    }
    const g = NESTED_GEOMETRY;
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = DISC(Math.min((node.depth % 5) / 4, 1) * 0.65);
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, s.r * 0.045);
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : state.mode === "plain" ? "rgba(255,255,255,.35)" : colouring.fill(node.person);
    // (a placeholder holding their other families: dashed, like the empty ones)
    if (node.kind === "ghost") ctx.setLineDash([Math.max(3, s.r * 0.05), Math.max(3, s.r * 0.04)]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (node.focus) drawFocusRing(s);

    const inside = s.r >= MIN_INSIDE;
    if (inside) {
      // Trunk and branches to each child.
      const forkX = s.x;
      const forkY = s.y + g.fork * s.r;
      const kids = node.children.map((i) => nodes[i]);
      const total = node.weight - 1 || 1;
      ctx.strokeStyle = "rgba(40,40,40,.55)";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.6, s.r * 0.03);
      if (kids.length || node.more) {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + g.trunkBase * s.r);
        ctx.lineTo(forkX, forkY);
        ctx.stroke();
      }
      kids.forEach((kid) => {
        const k = screenOf(kid);
        // Branches end at the foot of the child's circle (or the stalk of a leaf).
        const dx = forkX - k.x;
        const dy = forkY - k.y;
        const length = Math.hypot(dx, dy) || 1;
        const endX = k.x + (dx / length) * k.r;
        const endY = k.y + (dy / length) * k.r;
        ctx.lineWidth = Math.max(0.5, s.r * 0.025 * Math.sqrt(kid.weight / total) + s.r * 0.006);
        ctx.beginPath();
        ctx.moveTo(forkX, forkY);
        ctx.quadraticCurveTo(forkX + (endX - forkX) * 0.15, forkY - Math.abs(endY - forkY) * 0.6, endX, endY);
        ctx.stroke();
      });
      kids.forEach((kid) => drawNode(kid, screenOf(kid)));
      if (node.more && !node.children.length) drawMore(node, s, forkX, forkY);
      else if (world && node.expand && s.r >= EXPAND_AT) expandBranch(node);
    }

    // The person's name in the lower band (or centred while the circle is small).
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    if (s.r > 12) {
      const person = node.person;
      const textY = inside ? s.y + s.r * 0.62 : s.y;
      // Inside a circle the name is small beside the family above it, but never below about 10px.
      let size = inside ? Math.max(s.r * 0.085, Math.min(10.5, s.r * 0.15)) : s.r * 0.26;
      // Wrap to the width of the circle low down, where the text sits (about a radius across), so it stays inside.
      const fit = Math.max(8, Math.floor((s.r * (inside ? 1.0 : 1.5)) / (size * 0.55)));
      // A couple's names break at the "&"; a family shows when they married.
      const lines =
        node.kind === "band"
          ? ["The parents of", ...person.couple.split(" & ").flatMap((part, i) => wrapText(i ? `& ${part}` : part, inside ? Math.min(fit, 30) : 14, 1))]
          : node.kind === "family"
          ? fullName(person)
              .split(" & ")
              .flatMap((part, i) => wrapText(i ? `& ${part}` : part, inside ? Math.min(fit, 30) : 14, 1))
          : wrapText(fullName(person), inside ? Math.min(fit, 30) : 12, 2);
      const life = node.kind === "family" ? (yearOf(person.married) ? `m. ${yearOf(person.married)}` : "") : years(person);
      if (life && (inside ? s.r > 70 : s.r > 24)) lines.push(life);
      const spouse = node.kind === "ghost" && s.r > 40 ? ghostSpouse(node) : null;
      if (spouse) lines.push(...wrapText(`married ${fullName(spouse)} →`, inside ? Math.min(fit, 30) : 14, 2));
      if (inside && s.r > 260) {
        if (person.birthLocation) lines.push(...wrapText(person.birthLocation, Math.min(fit, 40), 1));
        const partial = hasFrontier(node.source);
        if (node.kind !== "band" && (node.children.length || !partial)) {
          lines.push(...wrapText(`${node.children.length} ${childWord} · ${partial ? "at least " : ""}${node.weight - 1} ${which}${partial ? " so far" : " in all"}`, fit, 2));
        }
      }
      // Keep the whole block in the band between the family above and the circle's foot.
      // (but no smaller than 9px: small circles have few lines anyway)
      if (inside) size = Math.max(Math.min(size, (s.r * 0.44) / (lines.length * 1.2)), Math.min(size, 9));
      // Portraits: a couple shows both of them (user, 2026-10-03: one photo for both "seems
      // wrong"), side by side, with initials for whoever has no photo; nothing when neither has one.
      const sitters = inside && s.r > 200 ? (node.kind === "family" && person.couple?.[1] ? person.couple : [person]) : [];
      const photo = sitters.some((sitter) => sitter?.photoData);
      if (photo) {
        const pr = s.r * 0.1;
        const py = s.y + s.r * 0.34;
        sitters.forEach((sitter, i) => {
          const px = sitters.length === 2 ? s.x + (i ? 1 : -1) * pr * 0.92 : s.x;
          drawPortrait(sitter, px, py, pr);
        });
      }
      drawText(lines, s.x, photo ? textY + s.r * 0.08 : textY, size, "#ffffff");
    }
  }

  /** One round portrait: their photo, or their initials on a plain disc. */
  function drawPortrait(sitter, px, py, pr) {
    const image = sitter?.photoData ? photoFor(sitter) : null;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = "#6c6f75";
    ctx.fill();
    if (image) {
      ctx.clip();
      const aspect = image.naturalHeight / Math.max(image.naturalWidth, 1);
      ctx.drawImage(image, px - pr, py - pr, pr * 2, Math.max(pr * 2 * aspect, pr * 2));
    } else if (!sitter?.photoData) {
      const initials = [sitter?.name, sitter?.lnab]
        .map((part) => String(part || "").trim().charAt(0))
        .join("")
        .toUpperCase();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = `600 ${Math.round(pr * 0.7)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials || "?", px, py + pr * 0.04);
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1, pr * 0.08);
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Someone whose family isn't loaded yet: a dashed bud above the fork, and a fetch once it's big enough. */
  function drawMore(node, s, forkX, forkY) {
    const budY = forkY - s.r * 0.42;
    const budR = s.r * 0.26;
    ctx.save();
    ctx.setLineDash([Math.max(2, budR * 0.12), Math.max(2, budR * 0.1)]);
    ctx.lineWidth = Math.max(0.6, s.r * 0.012);
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.beginPath();
    ctx.arc(forkX, budY, budR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(forkX, forkY);
    ctx.lineTo(forkX, budY + budR);
    ctx.stroke();
    ctx.restore();
    if (budR > 14) {
      const text = state.loadingKeys.has(expandKey(node)) ? "Loading…" : which === "ancestors" ? "More ancestors" : "More family?";
      drawText([text], forkX, budY, Math.min(14, budR * 0.24), "rgba(255,255,255,.75)", 500);
    }
    if (s.r >= EXPAND_AT) expandBranch(node);
  }

  function expandKey(node) {
    return node.expand ? `${node.expand.mode}:${node.expand.id}` : node.source;
  }

  /** Fetches what lies beyond `node` (the next generations, or in the family world everyone near them) and grows it in place. */
  function expandBranch(node, urgent = false) {
    const key = expandKey(node);
    // (zooming out waits on its loads, so they go ahead of the others)
    if (state.loadingKeys.has(key) || state.doneKeys.has(key) || state.loading >= MAX_LOADING + (urgent ? 4 : 0)) return;
    const failed = state.failedKeys.get(key);
    if (failed && (failed.count >= EXPAND_TRIES || Date.now() - failed.at < EXPAND_RETRY_MS)) return;
    let job;
    if (world) {
      if (!node.expand) return;
      job = world.expand(node.expand);
    } else {
      const source = node.source;
      if (!options.onExpand || !source.more) return;
      job = Promise.resolve(options.onExpand(source.person))
        .then((branch) => graftBranch(source, branch))
        .catch((error) => {
          source.more = false;
          throw error;
        });
    }
    state.loadingKeys.add(key);
    state.loading += 1;
    // A failed fetch (WikiTree's bot check, a dropped connection) isn't the end: it's tried again a little later.
    let ok = true;
    Promise.resolve(job)
      .catch((error) => {
        ok = false;
        const before = state.failedKeys.get(key);
        state.failedKeys.set(key, { count: (before?.count || 0) + 1, at: Date.now() });
        console.warn("wbe: fractal tree branch failed", error);
      })
      .finally(() => {
        state.loadingKeys.delete(key);
        if (ok) state.doneKeys.add(key);
        state.loading -= 1;
        if (!popup.isConnected) return;
        relayout();
        if (!ok) {
          const timer = setTimeout(() => {
            retryTimers.delete(timer);
            if (popup.isConnected) draw();
          }, EXPAND_RETRY_MS + 50);
          retryTimers.add(timer);
        }
      });
  }

  /** Lays the tree out again after a branch grew. Existing circles keep their places, so the view doesn't move. */
  function relayout() {
    const keyOf = (node) => (node ? node.uid ?? node.source : null);
    const fittedSource = keyOf(nodes[state.fitted]);
    const focusSource = keyOf(nodes[state.focus]);
    ({ nodes } = buildLayout());
    roots = nodes.filter((node) => node.parent === -1);
    const indexOf = (key) => (key ? nodes.findIndex((node) => keyOf(node) === key) : -1);
    state.fitted = indexOf(fittedSource);
    state.focus = Math.max(0, indexOf(focusSource));
    state.hover = -1;
    state.query = null;
    state.matches = [];
    state.crumbIndex = null;
    colouring = buildColouring(nodes, state.mode, palette);
    drawFooter();
    state.legendStale = true; // again once the new layout is drawn
    state.climbHints = null;
    updateCrumbs(focusedNode().index);
    requestDraw();
    // More may have loaded at the edge, or a fast zoom may have gone past more than one generation.
    if (world && !state.settling && (state.rerootDepth || 0) < 30) {
      state.rerootDepth = (state.rerootDepth || 0) + 1;
      checkReroot();
      state.rerootDepth -= 1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    if (!nodes.length) return;
    ctx.globalAlpha = 1;
    state.drawn = [];
    roots.forEach((root) => drawNode(root, screenOf(root)));
    ctx.globalAlpha = 1;
    if (state.legendStale) {
      state.legendStale = false;
      drawFooter();
    }
    if (world) {
      drawGhostLinks();
      drawClimbHints();
    }
  }

  /** The person the family world is about: a gold ring, so they can be found again. */
  function drawFocusRing(s) {
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.5, s.r * 0.06);
    ctx.strokeStyle = FOCUS_RING;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** While the family world's root circle is small: under it, what zooming out will show. */
  function drawClimbHints() {
    const root = nodes[0];
    const s = screenOf(root);
    if (!root || s.r > Math.min(width, height) * 0.42 || s.r < 20 || s.y + s.r + 28 > height) return;
    if (!state.climbHints) {
      const step = root.kind === "band" ? null : world.climb();
      state.climbHints = !step
        ? "Zoom out of either family for its parents"
        : step.status === "none"
        ? "No parents recorded above this family"
        : step.back
        ? "Zoom out to go back up"
        : "Zoom out for both sets of parents";
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `400 12px ${FONT}`;
    ctx.fillStyle = "#777";
    ctx.fillText(state.climbHints, s.x, s.y + s.r + 10);
  }

  /** The circle a placeholder stands in for (someone shown in their spouse's family), by index. */
  function ghostTarget(node) {
    if (node._target === undefined) node._target = nodes.findIndex((other) => other.uid === node.ghostOf);
    return node._target;
  }

  /** Who a placeholder married: the other half of the couple's circle it stands for. */
  function ghostSpouse(node) {
    const target = nodes[ghostTarget(node)];
    return (target?.person.couple || []).find((person) => person && person.id !== node.person.id) || null;
  }

  /** Someone who married into another family in view: a dashed circle in their own family. */
  function drawGhost(node, s) {
    ctx.save();
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fill();
    ctx.setLineDash([Math.max(3, s.r * 0.14), Math.max(3, s.r * 0.1)]);
    ctx.lineWidth = Math.max(1, s.r * 0.05);
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : state.mode === "plain" ? "rgba(255,255,255,.55)" : colouring.fill(node.person);
    ctx.stroke();
    ctx.restore();
    if (s.r > 10) {
      const lines = wrapText(fullName(node.person), s.r > 45 ? 16 : 11, s.r > 30 ? 2 : 1);
      const life = years(node.person);
      if (s.r > 30 && life) lines.push(life);
      const spouse = s.r > 24 ? ghostSpouse(node) : null;
      if (spouse) lines.push(...wrapText(`married ${fullName(spouse)} →`, s.r > 45 ? 18 : 13, 2));
      drawText(lines, s.x, s.y, s.r * 0.2, "rgba(255,255,255,.92)");
    }
  }

  /** Dotted lines from each placeholder to the couple's circle it stands for. */
  function drawGhostLinks() {
    (state.drawn || []).forEach((node) => {
      if (node.kind !== "ghost") return;
      const target = nodes[ghostTarget(node)];
      if (!target) return;
      const a = screenOf(node);
      const b = screenOf(target);
      if (b.r < 2) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const startX = a.x + (dx / d) * a.r;
      const startY = a.y + (dy / d) * a.r;
      const endX = b.x - (dx / d) * b.r;
      const endY = b.y - (dy / d) * b.r;
      ctx.save();
      ctx.globalAlpha = lit(node) || lit(target) ? 0.9 : 0.3;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = FOCUS_RING;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo((startX + endX) / 2, Math.min(startY, endY) - d * 0.2, endX, endY);
      ctx.stroke();
      ctx.restore();
    });
  }

  /** The smallest drawn circle under the pointer. */
  function nodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let found = null;
    const visit = (node) => {
      const s = screenOf(node);
      if (s.r < Math.max(MIN_DRAW, 3)) return;
      const dx = px - s.x;
      const dy = py - s.y;
      const reach = node.leaf ? s.r * 1.2 : s.r;
      if (dx * dx + dy * dy > reach * reach) return;
      found = node;
      if (!node.leaf && s.r >= MIN_INSIDE) node.children.forEach((i) => visit(nodes[i]));
    };
    roots.forEach(visit);
    return found;
  }

  function lineOf(index) {
    const set = new Set();
    for (let i = index; i >= 0; i = nodes[i].parent) set.add(i);
    return set;
  }

  /** The deepest circle that holds the middle of the view and fills most of it. */
  function focusedNode() {
    let found = nodes[0];
    const visit = (node) => {
      const s = screenOf(node);
      const dx = width / 2 - s.x;
      const dy = height / 2 - s.y;
      if (dx * dx + dy * dy > s.r * s.r || s.r < Math.min(width, height) * 0.3) return;
      found = node;
      node.children.forEach((i) => visit(nodes[i]));
    };
    roots.forEach(visit);
    return found;
  }

  /** The person in the middle of the view (or the nearest one around them), for the chart links. */
  function focusedPersonKey() {
    let node = focusedNode();
    while (node && !node.person?.wtid) node = nodes[node.parent];
    return node?.person?.wtid || options.linkKey || "";
  }

  function showTip(event, node) {
    const rect = stage.getBoundingClientRect();
    const person = node.person;
    const born = [person.birth, person.birthLocation].filter(Boolean).join(", ");
    const died = person.death || "";
    const count = node.children.length;
    const target = node.kind === "ghost" ? nodes[ghostTarget(node)] : null;
    const family = world
      ? target
        ? `Married into another family here: the dotted line leads to ${fullName(target.person)}. Click to go there.`
        : node.kind === "band"
        ? `${count} families, side by side.`
        : node.more && !count
        ? "Their family isn't loaded yet: zoom in to load it."
        : node.families
        ? `${count} families: one circle for each partner.`
        : count
        ? `${count} ${count === 1 ? "child" : "children"}.`
        : "No children recorded."
      : node.more
      ? `More ${which} beyond this point: zoom in to load them.`
      : node.leaf
      ? which === "ancestors"
        ? "No parents recorded yet."
        : "No children recorded."
      : `${node.children.length} ${childWord}; ${node.weight - 1} ${which} in all.`;
    const heading = node.kind === "family" ? "Family" : node.kind === "band" ? "Families" : world ? "" : `Generation ${node.depth}`;
    tip.innerHTML = `${heading ? `<div class="wbe-chart-tip-rel">${heading}</div>` : ""}
      <b>${escapeText(fullName(person))}</b>${person.wtid ? ` <span style="opacity:.7">(${escapeText(person.wtid)})</span>` : ""}
      ${born ? `<div>Born: ${escapeText(born)}</div>` : ""}${died ? `<div>Died: ${escapeText(died)}</div>` : ""}
      <div>${escapeText(family)}</div>
      <div class="wbe-chart-tip-hint">${node.leaf ? "" : "Click to zoom in · "}${node.kind === "band" ? "" : "Shift-click to open the profile"}</div>`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function updateCrumbs(index) {
    if (index === state.crumbIndex) return;
    state.crumbIndex = index;
    const trail = [...lineOf(index)].reverse();
    crumbs.innerHTML = "";
    trail.forEach((i, position) => {
      if (position) crumbs.appendChild(document.createTextNode(" › "));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wbe-chart-crumb";
      button.textContent = fullName(nodes[i].person);
      button.disabled = i === index;
      button.addEventListener("click", () => flyTo(i));
      crumbs.appendChild(button);
    });
  }

  const zoomer = d3zoom()
    // The family world's units shrink and grow as its root moves (they're reset when a gesture ends).
    .scaleExtent(world ? [1e-12, 1e15] : [0.05, 1e9])
    .on("zoom", (event) => {
      // Which way the view is going: the family world's root climbs only going out and comes down only going in
      // (right after a climb, the family holding the old root can already fill the view).
      const change = event.transform.k / state.transform.k;
      if (!state.settling && Math.abs(change - 1) > 1e-3) state.zoomDir = change < 1 ? -1 : 1;
      state.transform = event.transform;
      const source = event.sourceEvent;
      if (source) state.fitted = -1; // the user has moved the view themselves
      if (source && Number.isFinite(source.clientX)) {
        const rect = canvas.getBoundingClientRect();
        state.pointer = { x: source.clientX - rect.left, y: source.clientY - rect.top };
      } else if (!source) state.pointer = null;
      tip.style.opacity = "0";
      if (world) checkReroot();
      requestDraw();
    })
    .on("start", () => (state.climbedUp = false))
    .on("end", () => {
      if (world) settleWorld();
      if (colouring.legendFor) {
        state.legendStale = true;
        requestDraw();
      }
      state.focus = focusedNode().index;
      updateCrumbs(state.focus);
    });
  const canvasSelection = select(canvas);
  canvasSelection.call(zoomer).on("dblclick.zoom", null);

  /**
   * The family world moves its root as you zoom: out past a small root circle, back
   * the way you came or up to both sets of parents of its couple (of the family
   * you're zooming out of, when it holds two), loading them first if need be;
   * in, to a couple's circle that fills the view. The circle you were looking at
   * keeps its place, so the view doesn't jump.
   */
  function checkReroot() {
    if (state.holdReroot || !nodes.length) return;
    const half = Math.min(width, height) / 2;
    const root = nodes[0];
    const s = screenOf(root);
    if (s.r < half * 0.5) {
      if (state.zoomDir > 0) return;
      // One generation up per gesture: a fast zoom would otherwise chain climbs (and pick each side blind).
      if (state.climbedUp) return;
      const choice = root.kind === "band" ? familyOutOf(root) : null;
      let from = choice?.family || null;
      let step = world.climb(from?.couple);
      // Not pointing at either: when his family has no parents on record, go up hers.
      if (step.status === "none" && choice && !choice.under && choice.other) {
        from = choice.other;
        step = world.climb(from.couple);
      }
      if (step.status === "ready" && !step.back) state.climbedUp = true;
      if (step.status === "ready") return reroot(step.root, from && !step.back ? from.uid : root.uid, step.back ? "back" : "up");
      if (step.status === "load") step.ids.forEach((id) => expandBranch({ expand: { mode: "ancestors", id } }, true));
      return;
    }
    if (state.zoomDir < 0) return;
    let target = null;
    const visit = (node) => {
      const t = screenOf(node);
      const dx = width / 2 - t.x;
      const dy = height / 2 - t.y;
      if (t.r < half * 0.9 || dx * dx + dy * dy > t.r * t.r) return;
      // (the families either side of a couple stay in their band: you look into them without the view changing)
      if (node !== root && node.couple && !node.side) target = node;
      node.children.forEach((i) => visit(nodes[i]));
    };
    visit(root);
    if (target) reroot(target.couple, target.uid, "down");
  }

  /**
   * Of the two families side by side in `band` (his, hers), the one being zoomed out of ({family, under, other}):
   * the one under the pointer, or else his (after a climb the pointer sits on the couple in the middle, so the surname line
   * carries on rather than a near guess between the two).
   */
  function familyOutOf(band) {
    const families = band.children.map((i) => nodes[i]).filter((node) => node.side);
    const point = state.pointer || { x: width / 2, y: height / 2 };
    const under = families.find((node) => {
      const t = screenOf(node);
      return Math.hypot(point.x - t.x, point.y - t.y) <= t.r;
    });
    const family = under || families[0];
    return family ? { family, under: Boolean(under), other: families.find((node) => node !== family) || null } : null;
  }

  function reroot(root, anchorUid, how) {
    if (world.reroot(root, anchorUid, nodes, how)) relayout();
  }

  /** After a gesture: back to plain units (the root circle radius 1), with the zoom changed to match. */
  function settleWorld() {
    if (state.settling) return;
    const { scale, x, y } = world.normalise();
    if (scale === 1 && !x && !y) return;
    const t = state.transform;
    state.settling = true;
    relayout();
    canvasSelection.call(zoomer.transform, zoomIdentity.translate(t.x + x * t.k, t.y + y * t.k).scale(t.k * scale));
    state.settling = false;
  }

  /** The family world's start: the person among their brothers and sisters, in their parents' circle. */
  function flyHome(duration = 1000) {
    canvasSelection.interrupt("fly");
    world.home();
    relayout();
    state.holdReroot = true;
    canvasSelection.call(zoomer.transform, fitNode(nodes[0], 0.15));
    flyTo(0, duration)
      ?.on("end.hold", () => (state.holdReroot = false))
      .on("interrupt.hold", () => (state.holdReroot = false));
  }

  function flyTo(index, duration = 1200) {
    const node = nodes[index];
    if (!node) return;
    // A leaf has nothing inside, so show it with its siblings around it.
    state.fitted = index;
    state.fittedFill = node.leaf && node.parent >= 0 ? 0.45 : 0.92;
    const target = fitNode(node, state.fittedFill);
    return canvasSelection.transition("fly").duration(reducedMotion() ? 0 : duration).ease(easeCubicInOut).call(zoomer.transform, target);
  }

  canvas.addEventListener("mousemove", (event) => {
    const node = nodeAt(event.clientX, event.clientY);
    const index = node ? node.index : -1;
    if (index !== state.hover) {
      state.hover = index;
      canvas.style.cursor = node ? "pointer" : "grab";
      requestDraw();
    }
    if (node) showTip(event, node);
    else tip.style.opacity = "0";
  });
  canvas.addEventListener("mouseleave", () => {
    state.hover = -1;
    tip.style.opacity = "0";
    requestDraw();
  });
  canvas.addEventListener("click", (event) => {
    const node = nodeAt(event.clientX, event.clientY);
    if (!node) return;
    if ((event.shiftKey || event.metaKey || event.ctrlKey) && node.person?.wtid) {
      window.open(profileUrl(node.person.wtid), "_blank", "noopener,noreferrer");
      return;
    }
    if (node.kind === "ghost" && ghostTarget(node) >= 0) return flyTo(ghostTarget(node));
    flyTo(node.index);
  });

  const search = popup.querySelector(".wbe-fractal-search");
  bindFractalSearch(search, {
    state,
    getNodes: () => nodes,
    lineOf,
    flyTo,
    requestDraw,
    flyDuration: 1600,
    pulseDuration: 3000,
  });

  function drawFooter() {
    const leaves = nodes.filter((node) => node.leaf).length;
    const deepest = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
    const partial = world || hasFrontier(tree);
    // While lines go beyond what's loaded there's no grand total (ancestors can run to millions).
    popup.querySelector(".wbe-chart-stats").innerHTML = world
      ? world.stats()
      : partial
      ? `<strong>${(nodes.length - 1).toLocaleString()}+</strong>${which} loaded · ${deepest} generations so far · zoom in for more`
      : `<strong>${(nodes.length - 1).toLocaleString()}</strong>${which} · ${deepest} generations · ${leaves} leaves`;
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    const items = colouring.legendFor ? colouring.legendFor(state.drawn || nodes) : colouring.legend;
    legend.title = colouring.legendFor ? "In view now (the key changes as you zoom)" : "";
    items.forEach((item) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${item.colour}"></i>`;
      span.appendChild(document.createTextNode(item.label));
      span.addEventListener("mouseenter", () => {
        const matches = nodes.filter((node) =>
          item.key === "plain" ? node.leaf : item.match ? item.match(node.person) : colouring.key(node.person) === item.key
        );
        // Keep the circles that lead to a match lit too, so the matches can be seen inside them.
        state.pulse = new Set();
        matches.forEach((node) => lineOf(node.index).forEach((i) => state.pulse.add(i)));
        requestDraw();
      });
      span.addEventListener("mouseleave", () => {
        state.pulse = null;
        requestDraw();
      });
      legend.appendChild(span);
    });
    popup.querySelectorAll(".wbe-chart-mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.classList.contains("wbe-chart-crumb")) return;
    const act = button.dataset.act;
    if (button.classList.contains("close-popup")) {
      closeChartPopup(popup);
    } else if (button.dataset.link) {
      chartLinkClick(popup, button, options.links, focusedPersonKey());
    } else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      colouring = buildColouring(nodes, state.mode, palette);
      drawFooter();
      requestDraw();
    } else if (act === "layout") options.onSwitchLayout?.();
    else if (act === "which") {
      switchFractalWhich(button, () => options.onSwitchWhich?.());
    }
    else if (act === "reset") (world ? flyHome(1000) : flyTo(0, 1000));
    else if (act === "out" && world) {
      // Step back about a generation around the middle of the view (the root moves up on the way).
      const t = state.transform;
      state.fitted = -1;
      state.pointer = null;
      const k = t.k / 2.5;
      const cx = (width / 2 - t.x) / t.k;
      const cy = (height / 2 - t.y) / t.k;
      const target = zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k);
      canvasSelection.transition("fly").duration(reducedMotion() ? 0 : 800).ease(easeCubicInOut).call(zoomer.transform, target);
    } else if (act === "out") {
      const parent = nodes[focusedNode().index]?.parent ?? -1;
      flyTo(parent >= 0 ? parent : 0, 900);
    } else if (act === "full") {
      toggleChartFullScreen(popup);
    } else if (act === "png") {
      saveFractalPng(canvas, tree, button);
    }
  });

  mountChartPopup(popup, () => {
    cancelAnimationFrame(frame);
    retryTimers.forEach(clearTimeout);
    retryTimers.clear();
    clearTimeout(state.pulseTimer);
    canvasSelection.interrupt("fly");
    canvasSelection.on(".zoom", null);
  }, { stage, resize });
  resize();
  drawFooter();
  updateCrumbs(0);
  if (world) flyHome(reducedMotion() ? 0 : 1000);
  else if (nodes.length && !reducedMotion()) {
    // Open from a distance and glide in to the whole tree.
    canvasSelection.call(zoomer.transform, fitNode(nodes[0], 0.15));
    flyTo(0, 1000);
  }
  return popup;
}
