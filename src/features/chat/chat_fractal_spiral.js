// The fractal tree popup, spiral layout (the nested one is chat_fractal_tree.js). Drawn on a canvas
// so thousands of people stay smooth: d3-zoom moves the camera, and detail
// appears as you zoom in (names, then years, places and photos). Click a
// person or fork to fly into that part of the family; Shift/⌘/Ctrl-click opens
// the profile. A search box flies to anyone on the tree.

import {
  injectFractalStyles,
  reducedMotion,
  wrapText as wrapName,
  bindFractalSearch,
  saveFractalPng,
  switchFractalWhich,
} from "./chat_fractal_common";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { scaleSequential } from "d3-scale";
import { interpolateSpectral, schemeTableau10 } from "d3-scale-chromatic";
import { easeCubicInOut } from "d3-ease";
import { buildSpiralLayout } from "./chat_fractal_spiral_data";
import { hasFrontier } from "./chat_fractal_tree_data";
import { createChartPopup, mountChartPopup, closeChartPopup, escapeText, fullName, lifeYears as years, photoUrl, profileUrl, siteUrl, toggleChartFullScreen, yearOf } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const BRANCH = "#6e6e6e";
const NODE_FILL = "#7a7a7a";
const NODE_RING = "#9b9b9b";
const JUNCTION_FILL = "#8a8a8a";
const LEAF_PLAIN = "#7cc85a";
const UNKNOWN = "#c9c9c9";
const MODES = [
  { key: "plain", label: "Plain" },
  { key: "century", label: "Birth year" },
  { key: "country", label: "Birth country" },
  { key: "surname", label: "Surname" },
];

/** Thumbnail URL for a person's photo (getPeople PhotoData), about `size` pixels wide. */
function surnameOf(person) {
  return person?.lnab || "";
}

/** {fill(person), legend:[{key,label,colour}], key(person)} for the leaf/ring colours. */
function buildColouring(nodes, mode) {
  const people = nodes.filter((node) => node.person).map((node) => node.person);
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
    const valueOf = mode === "country" ? (person) => person.birthCountry || "" : surnameOf;
    const counts = new Map();
    people.forEach((person) => {
      const value = valueOf(person);
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 9);
    const colourOf = new Map(top.map(([value], index) => [value, schemeTableau10[index]]));
    return {
      fill: (person) => {
        const value = valueOf(person);
        return value ? colourOf.get(value) || "#a0a0a0" : UNKNOWN;
      },
      key: (person) => {
        const value = valueOf(person);
        return value ? (colourOf.has(value) ? value : "Other") : "?";
      },
      legend: [
        ...top.map(([value, count]) => ({ key: value, label: `${value} (${count})`, colour: colourOf.get(value) })),
        { key: "Other", label: "Other", colour: "#a0a0a0" },
        { key: "?", label: mode === "country" ? "No birthplace" : "No surname", colour: UNKNOWN },
      ],
    };
  }
  return {
    fill: () => LEAF_PLAIN,
    key: () => "plain",
    legend: [
      { key: "plain", label: "Line ends here", colour: LEAF_PLAIN },
      { key: "fork", label: "Person with family beyond", colour: NODE_FILL },
    ],
  };
}

/**
 * tree: {person, children, depth}. options: {title, which: "descendants"|"ancestors"}.
 */
export function showSpiralTreePopup(tree, options = {}) {
  injectFractalStyles();
  const which = options.which === "ancestors" ? "ancestors" : "descendants";
  const layout = buildSpiralLayout(tree);
  const { nodes, branches } = layout;
  const people = nodes.filter((node) => node.kind === "person");
  const state = {
    mode: people.some((node) => yearOf(node.person.birth)) ? "century" : "plain",
    transform: zoomIdentity,
    hover: null,
    focus: 0,
    pulse: null,
    reveal: reducedMotion() ? Infinity : 0,
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
        <button type="button" class="small" data-act="out" title="Back out to the previous level">Out</button>
        <button type="button" class="small" data-act="reset" title="Show the whole tree">Whole tree</button>
        ${options.onSwitchWhich ? `<button type="button" class="small" data-act="which" title="Turn the tree round: this person's ${which === "ancestors" ? "descendants" : "ancestors"}">${which === "ancestors" ? "Descendants" : "Ancestors"}</button>` : ""}
        <button type="button" class="small" data-act="layout" title="Switch to the nested layout: each person's family inside their circle">Nested</button>
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
  let colouring = buildColouring(nodes, state.mode);
  let width = 0;
  let height = 0;
  let frame = 0;
  let revealFrame = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function requestDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  function fitTransform(bbox, padding = 0.08) {
    const w = bbox.maxX - bbox.minX || 1;
    const h = bbox.maxY - bbox.minY || 1;
    const k = Math.min((width * (1 - padding * 2)) / w, (height * (1 - padding * 2)) / h);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    return zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k);
  }

  function photoFor(person) {
    const url = photoUrl(person);
    if (!url) return null;
    let entry = photos.get(url);
    if (!entry) {
      const image = new Image();
      entry = { image, ready: false, failed: false };
      image.onload = () => {
        entry.ready = true;
        requestDraw();
      };
      image.onerror = () => {
        // The sized thumbnail may not exist for small originals; fall back to the API's 75px one.
        const fallback = person.photoData?.url ? siteUrl(person.photoData.url) : "";
        if (fallback && image.src !== fallback) image.src = fallback;
        else entry.failed = true;
      };
      image.src = url;
      photos.set(url, entry);
    }
    return entry.ready ? entry.image : null;
  }

  function leafPath(node, r) {
    // A round leaf with its point towards the stem, like OneZoom's.
    const back = node.heading + Math.PI;
    const tipX = node.x + Math.sin(back) * r * 1.5;
    const tipY = node.y - Math.cos(back) * r * 1.5;
    const tipAngle = Math.atan2(tipY - node.y, tipX - node.x);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.arc(node.x, node.y, r, tipAngle + 0.62, tipAngle - 0.62 + Math.PI * 2);
    ctx.closePath();
  }

  function visible(bbox, k, t) {
    const x0 = bbox.minX * k + t.x;
    const x1 = bbox.maxX * k + t.x;
    const y0 = bbox.minY * k + t.y;
    const y1 = bbox.maxY * k + t.y;
    return x1 >= -20 && x0 <= width + 20 && y1 >= -20 && y0 <= height + 20;
  }

  function nodeLit(node) {
    const pulse = state.pulse;
    return !pulse || pulse.has(node.index);
  }

  function draw() {
    const t = state.transform;
    const k = t.k;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(t.x, t.y);
    ctx.scale(k, k);
    ctx.lineCap = "round";

    // Branches.
    branches.forEach((branch) => {
      if (branch.depth > state.reveal) return;
      if (branch.width * k < 0.25) return;
      const minX = Math.min(branch.x0, branch.x1, branch.cx);
      const maxX = Math.max(branch.x0, branch.x1, branch.cx);
      const minY = Math.min(branch.y0, branch.y1, branch.cy);
      const maxY = Math.max(branch.y0, branch.y1, branch.cy);
      if (!visible({ minX, maxX, minY, maxY }, k, t)) return;
      const to = nodes[branch.to];
      ctx.globalAlpha = nodeLit(to) ? 1 : 0.25;
      ctx.strokeStyle = state.hover !== null && state.hoverLine?.has(branch.to) ? "#d98a1f" : BRANCH;
      ctx.lineWidth = branch.width;
      ctx.beginPath();
      ctx.moveTo(branch.x0, branch.y0);
      ctx.quadraticCurveTo(branch.cx, branch.cy, branch.x1, branch.y1);
      ctx.stroke();
    });

    // Forks, people and leaves.
    nodes.forEach((node) => {
      if (node.depth > state.reveal) return;
      const screenR = node.r * k;
      if (screenR < 0.7) return;
      if (!visible({ minX: node.x - node.r * 1.6, maxX: node.x + node.r * 1.6, minY: node.y - node.r * 1.6, maxY: node.y + node.r * 1.6 }, k, t)) return;
      ctx.globalAlpha = nodeLit(node) ? 1 : 0.25;
      if (node.kind === "junction") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = JUNCTION_FILL;
        ctx.fill();
        ctx.lineWidth = node.r * 0.12;
        ctx.strokeStyle = NODE_RING;
        ctx.stroke();
        if (screenR > 16) drawText([node.label], node.x, node.y, node.r * 0.3, "#ffffff", 400);
        return;
      }
      const person = node.person;
      const colour = colouring.fill(person);
      const hovered = state.hover === node.index;
      if (node.leaf) {
        leafPath(node, node.r);
        ctx.fillStyle = state.mode === "plain" ? LEAF_PLAIN : colour;
        ctx.fill();
        ctx.lineWidth = node.r * 0.1;
        ctx.strokeStyle = hovered ? "#d98a1f" : "rgba(0,0,0,.28)";
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = NODE_FILL;
        ctx.fill();
        ctx.lineWidth = node.r * 0.14;
        ctx.strokeStyle = hovered ? "#d98a1f" : state.mode === "plain" ? NODE_RING : colour;
        ctx.stroke();
      }
      // A photo fills the circle once it is big enough to see.
      let textY = node.y;
      if (screenR > 22 && person.photoData) {
        const image = photoFor(person);
        if (image) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r * 0.86, 0, Math.PI * 2);
          ctx.clip();
          const aspect = image.naturalHeight / Math.max(image.naturalWidth, 1);
          const w = node.r * 1.72;
          const h = Math.max(w * aspect, w);
          ctx.drawImage(image, node.x - w / 2, node.y - node.r * 0.86, w, h);
          ctx.restore();
          textY = node.y + node.r * 1.25;
        }
      }
      if (screenR > 13) {
        const onPhoto = textY !== node.y;
        const name = fullName(person);
        const lines = wrapName(name, screenR > 40 ? 16 : 12, screenR > 30 ? 2 : 1);
        if (screenR > 28) {
          const life = years(person);
          if (life) lines.push(life);
        }
        if (screenR > 60 && person.birthLocation) lines.push(...wrapName(person.birthLocation, 22, 2));
        if (screenR > 60 && !node.leaf) lines.push(`${node.weight - 1} ${which === "ancestors" ? "ancestors" : "descendants"}`);
        drawText(lines, node.x, textY, node.r * (onPhoto ? 0.24 : 0.27), onPhoto ? "#2b2b2b" : node.leaf ? "#1d1d1f" : "#ffffff", 600, onPhoto);
      }
    });
    ctx.restore();
  }

  function drawText(lines, x, y, size, colour, weight, halo = false) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      const lineSize = index === 0 ? size : size * 0.82;
      ctx.font = `${index === 0 ? weight : 400} ${lineSize}px ${FONT}`;
      const offset = (index - (lines.length - 1) / 2) * size * 1.18;
      if (halo) {
        ctx.lineWidth = size * 0.25;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.strokeText(line, x, y + offset);
      }
      ctx.fillStyle = colour;
      ctx.fillText(line, x, y + offset);
    });
  }

  // Hit testing: the smallest visible node under the pointer.
  function nodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const [x, y] = state.transform.invert([clientX - rect.left, clientY - rect.top]);
    let best = null;
    nodes.forEach((node) => {
      if (node.depth > state.reveal || node.r * state.transform.k < 2) return;
      const dx = x - node.x;
      const dy = y - node.y;
      const reach = node.leaf ? node.r * 1.25 : node.r;
      if (dx * dx + dy * dy <= reach * reach && (!best || node.r < best.r)) best = node;
    });
    return best;
  }

  function lineOf(index) {
    const set = new Set();
    for (let i = index; i >= 0; i = nodes[i].parent) set.add(i);
    return set;
  }

  function showTip(event, node) {
    const rect = stage.getBoundingClientRect();
    let html;
    if (node.kind === "junction") {
      html = `<b>${escapeText(node.label)}</b><div class="wbe-chart-tip-hint">Click to zoom in</div>`;
    } else {
      const person = node.person;
      const born = [person.birth, person.birthLocation].filter(Boolean).join(", ");
      const died = person.death || "";
      const extra = node.leaf
        ? which === "ancestors"
          ? "No parents recorded yet."
          : "No children recorded."
        : `${node.weight - 1} ${which === "ancestors" ? "ancestors" : "descendants"} on this branch.`;
      html = `<div class="wbe-chart-tip-rel">Generation ${node.depth}</div>
        <b>${escapeText(fullName(person))}</b> <span style="opacity:.7">(${escapeText(person.wtid)})</span>
        ${born ? `<div>Born: ${escapeText(born)}</div>` : ""}${died ? `<div>Died: ${escapeText(died)}</div>` : ""}
        <div>${escapeText(extra)}</div>
        <div class="wbe-chart-tip-hint">Click to zoom in · Shift-click to open the profile</div>`;
    }
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function updateCrumbs(index) {
    const trail = [...lineOf(index)].reverse().filter((i) => nodes[i].kind === "person");
    crumbs.innerHTML = "";
    trail.forEach((i, position) => {
      if (position) crumbs.appendChild(document.createTextNode(which === "ancestors" ? " ← " : " → "));
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
    .scaleExtent([0.02, 4000])
    .on("zoom", (event) => {
      state.transform = event.transform;
      tip.style.opacity = "0";
      requestDraw();
    });
  const canvasSelection = select(canvas);
  canvasSelection.call(zoomer).on("dblclick.zoom", null);

  function flyTo(index, duration = 1100) {
    const node = nodes[index];
    if (!node) return;
    state.focus = index;
    updateCrumbs(index);
    const target = fitTransform(node.bbox, node.leaf ? 0.3 : 0.06);
    canvasSelection.transition("fly").duration(reducedMotion() ? 0 : duration).ease(easeCubicInOut).call(zoomer.transform, target);
  }

  canvas.addEventListener("mousemove", (event) => {
    const node = nodeAt(event.clientX, event.clientY);
    const index = node ? node.index : null;
    if (index !== state.hover) {
      state.hover = index;
      state.hoverLine = index === null ? null : lineOf(index);
      canvas.style.cursor = node ? "pointer" : "grab";
      requestDraw();
    }
    if (node) showTip(event, node);
    else tip.style.opacity = "0";
  });
  canvas.addEventListener("mouseleave", () => {
    state.hover = null;
    state.hoverLine = null;
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
    flyTo(node.index);
  });

  const search = popup.querySelector(".wbe-fractal-search");
  bindFractalSearch(search, {
    state,
    getNodes: () => people,
    lineOf,
    flyTo,
    requestDraw,
    flyDuration: 1400,
    pulseDuration: 2600,
  });

  function drawFooter() {
    const leaves = people.filter((node) => node.leaf).length;
    const deepest = people.reduce((max, node) => Math.max(max, node.depth), 0);
    // The spiral doesn't load more; when some lines go further, say so rather than count leaves.
    popup.querySelector(".wbe-chart-stats").innerHTML = hasFrontier(tree)
      ? `<strong>${(people.length - 1).toLocaleString()}+</strong>${which} loaded · ${deepest} generations so far · Nested loads more`
      : `<strong>${(people.length - 1).toLocaleString()}</strong>${which} · ${deepest} generations · ${leaves} leaves`;
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    colouring.legend.forEach((item) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${item.colour}"></i>`;
      span.appendChild(document.createTextNode(item.label));
      span.addEventListener("mouseenter", () => {
        state.pulse = new Set(
          people
            .filter((node) => (item.key === "fork" ? !node.leaf : item.key === "plain" ? node.leaf : colouring.key(node.person) === item.key))
            .map((node) => node.index)
        );
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
    } else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      colouring = buildColouring(nodes, state.mode);
      drawFooter();
      requestDraw();
    } else if (act === "layout") options.onSwitchLayout?.();
    else if (act === "which") {
      switchFractalWhich(button, () => options.onSwitchWhich?.());
    }
    else if (act === "reset") flyTo(0, 900);
    else if (act === "out") {
      let parent = nodes[state.focus]?.parent ?? -1;
      while (parent > 0 && nodes[parent].kind !== "person") parent = nodes[parent].parent;
      flyTo(parent >= 0 ? parent : 0, 900);
    } else if (act === "full") {
      toggleChartFullScreen(popup);
    } else if (act === "png") {
      saveFractalPng(canvas, tree, button);
    }
  });

  mountChartPopup(popup, () => {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(revealFrame);
    clearTimeout(state.pulseTimer);
    canvasSelection.interrupt("fly");
    canvasSelection.on(".zoom", null);
  }, { stage, resize });
  resize();
  drawFooter();
  updateCrumbs(0);
  canvasSelection.call(zoomer.transform, fitTransform(nodes[0]?.bbox || layout.bounds));

  // Grow in: one generation every 220ms.
  if (state.reveal !== Infinity) {
    const deepest = people.reduce((max, node) => Math.max(max, node.depth), 0);
    const start = performance.now();
    const step = (now) => {
      state.reveal = (now - start) / 220;
      draw();
      if (state.reveal <= deepest) revealFrame = requestAnimationFrame(step);
      else state.reveal = Infinity;
    };
    revealFrame = requestAnimationFrame(step);
  }
  return popup;
}
