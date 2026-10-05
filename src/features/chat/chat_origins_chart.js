// Ancestral origins streamgraph (2026-10-03, the "Wow!" visuals): ancestors'
// birth countries by generation, oldest on the left, flowing to the parents
// on the right. The stream is revealed left to right "through time"; "Share"
// morphs it into 100% bands; hovering a band (or its legend entry) shows that
// country's count in each generation. Data comes from chat_origins_data.js.

import $ from "jquery";
import { select, pointer } from "d3-selection";
import "d3-transition";
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetWiggle, stackOrderInsideOut } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { easeCubicInOut } from "d3-ease";
import { OTHER_COUNTRIES } from "./chat_origins_data";
import { chartPopupControls, centrePopup, escapeText, injectChartStyles, raiseAboveOtherPopups, saveChart, toggleChartFullScreen, textColourFor } from "./chat_chart_common";

const WIDTH = 900;
const HEIGHT = 470;
const MARGIN = { top: 24, right: 36, bottom: 64, left: 36 };
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const OTHER_COLOUR = "#a5a5a5";
// d3's Tableau 10 without its grey (too like the "rarer" band), then the paler
// Category 20 partners: 15 streams the surname river can tell apart.
const STREAM_COLOURS = [
  "#4e79a7",
  "#f28e2c",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#aec7e8",
  "#ffbb78",
  "#98df8a",
  "#ff9896",
  "#c5b0d5",
  "#c49c94",
];

// y at x on d3's curveMonotoneX through (xs, ys): the same Hermite segments
// (tangents per d3-shape's monotone.js), so a dot sits where its band is drawn.
function monotoneAt(xs, ys, px) {
  const n = xs.length;
  if (n === 1) return ys[0];
  let i = 0;
  while (i < n - 2 && px > xs[i + 1]) i += 1;
  const h = xs[i + 1] - xs[i];
  const u = h ? Math.max(0, Math.min(1, (px - xs[i]) / h)) : 0;
  if (n === 2) return ys[0] + (ys[1] - ys[0]) * u;
  const sign = (v) => (v < 0 ? -1 : 1);
  const slope3 = (k) => {
    const h0 = xs[k] - xs[k - 1];
    const h1 = xs[k + 1] - xs[k];
    const s0 = (ys[k] - ys[k - 1]) / h0;
    const s1 = (ys[k + 1] - ys[k]) / h1;
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  };
  const tangent = (k) => {
    if (k > 0 && k < n - 1) return slope3(k);
    const j = k === 0 ? 1 : n - 2;
    const hk = k === 0 ? xs[1] - xs[0] : xs[n - 1] - xs[n - 2];
    const dy = k === 0 ? ys[1] - ys[0] : ys[n - 1] - ys[n - 2];
    return (3 * (dy / hk) - slope3(j)) / 2;
  };
  const dx = h / 3;
  const c1 = ys[i] + dx * tangent(i);
  const c2 = ys[i + 1] - dx * tangent(i + 1);
  const v = 1 - u;
  return v * v * v * ys[i] + 3 * v * v * u * c1 + 3 * v * u * u * c2 + u * u * u * ys[i + 1];
}

// Past those, golden-angle hues, alternating deeper and paler so neighbours differ.
function streamColour(index) {
  if (index < STREAM_COLOURS.length) return STREAM_COLOURS[index];
  const n = index - STREAM_COLOURS.length;
  const hue = Math.round((n * 137.508 + 20) % 360);
  return n % 2 ? `hsl(${hue}, 45%, 72%)` : `hsl(${hue}, 50%, 52%)`;
}
const MODES = [
  { key: "stream", label: "Stream" },
  { key: "share", label: "Share (100%)" },
];
let chartCounter = 0;

/**
 * series: from buildOriginsSeries (or buildSurnameRiver). options: {title, placeWord: "birth"|"death",
 * kind: "surname" for the surname river}.
 */
export function showOriginsPopup(series, options = {}) {
  if (!series?.generations?.length) return null;
  chartCounter += 1;
  const uid = `wbe-origins-${chartCounter}`;
  const popupId = options.kind === "surname" ? "wbe-surname-river-popup" : "wbe-origins-popup";
  // Redrawn with more or fewer generations: open where the old one was.
  const previous = document.getElementById(popupId);
  const previousPlace = previous ? { left: previous.style.left, top: previous.style.top, width: previous.style.width, height: previous.style.height } : null;
  $(`#${popupId}`).remove();
  injectChartStyles();

  const placeWord = options.placeWord === "death" ? "death" : "birth";
  // kind "surname": the surname river (keys are surnames at birth, not countries).
  const surnames = options.kind === "surname";
  const OTHER = series.otherKey || OTHER_COUNTRIES;
  const withWord = surnames ? "with a surname recorded" : `with a ${placeWord}place`;
  const withoutWord = surnames ? "have no surname recorded" : `have no ${placeWord}place`;
  const state = { mode: "stream", highlight: null };
  // Oldest generation on the left, so the stream flows towards the present.
  const generations = [...series.generations].sort((a, b) => b.generation - a.generation);
  const keys = series.keys;
  const colourOf = new Map(keys.map((key, index) => [key, key === OTHER ? OTHER_COLOUR : streamColour(index)]));

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = popupId;
  popup.style.display = "flex";
  popup.style.height = "min(640px, 92vh)";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Play the reveal again">Replay</button>
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        ${
          options.onGenerations
            ? `<span class="wbe-river-generations" style="display:inline-flex;align-items:center;gap:4px;margin-left:10px">
          <button type="button" class="small" data-act="fewer" title="One generation fewer"${options.generations <= (options.minGenerations || 2) ? " disabled" : ""}>−</button>
          <span class="wbe-river-generations-text">${options.generations} generations</span>
          <button type="button" class="small" data-act="more" title="Go back one more generation"${options.generations >= (options.maxGenerations || 10) ? " disabled" : ""}>+</button>
        </span>`
            : ""
        }
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Oldest generation on the left · hover a band for its numbers</span>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  if (previousPlace?.left) Object.assign(popup.style, previousPlace);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Ancestral origins";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("cursor", "default");
  const root = svg.append("g");
  const clipRect = svg
    .append("defs")
    .append("clipPath")
    .attr("id", `${uid}-clip`)
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", HEIGHT)
    .attr("width", WIDTH);
  const bandsLayer = root.append("g").attr("clip-path", `url(#${uid}-clip)`);
  // A dot for each ancestor, in their band at their generation (the surname river).
  const dotsLayer = root.append("g");
  const labelsLayer = root.append("g").attr("pointer-events", "none");
  const axisLayer = root.append("g");
  const guide = root
    .append("line")
    .attr("stroke", "#222")
    .attr("stroke-opacity", 0.35)
    .attr("stroke-dasharray", "3 3")
    .attr("y1", MARGIN.top)
    .attr("y2", HEIGHT - MARGIN.bottom + 6)
    .attr("opacity", 0);

  const x = scalePoint()
    .domain(generations.map((gen) => gen.generation))
    .range([MARGIN.left, WIDTH - MARGIN.right]);
  const tableRows = generations.map((gen) => ({ generation: gen.generation, ...gen.counts }));

  function layout() {
    const stacker = stack()
      .keys(keys)
      .order(stackOrderInsideOut)
      .offset(state.mode === "share" ? stackOffsetExpand : stackOffsetWiggle);
    const layers = stacker(tableRows);
    const low = Math.min(...layers.flatMap((layer) => layer.map((point) => point[0])));
    const high = Math.max(...layers.flatMap((layer) => layer.map((point) => point[1])));
    const y = scaleLinear()
      .domain([low, high === low ? low + 1 : high])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
    const shape = area()
      // (Monotone, not basis: a basis curve misses the points, so a thin generation
      // was drawn as wide as its neighbours.)
      .curve(curveMonotoneX)
      .x((point) => x(point.data.generation))
      .y0((point) => y(point[0]))
      .y1((point) => y(point[1]));
    return { layers, y, shape };
  }

  function nearestGeneration(px) {
    let best = generations[0];
    generations.forEach((gen) => {
      if (Math.abs(x(gen.generation) - px) < Math.abs(x(best.generation) - px)) best = gen;
    });
    return best;
  }

  // The people behind a band (the surname river knows them): hover lists this
  // generation's; a click pins the tip with every generation's, as links.
  let pinned = false;
  const personLink = (person) => {
    const label = `${person.name}${person.year ? ` (b. ${person.year})` : ""}`;
    return person.wtid
      ? `<a href="/wiki/${encodeURIComponent(person.wtid)}" target="_blank" rel="noopener" title="Open ${escapeText(person.wtid)} in a new tab">${escapeText(label)}</a>`
      : escapeText(label);
  };
  function peopleHtml(gen, key, all) {
    if (!all) {
      const people = gen.people?.[key] || [];
      if (!people.length) return "";
      const shown = people.slice(0, 6);
      return `<div style="margin-top:4px">${shown.map((person) => `<div>${personLink(person)}</div>`).join("")}</div>
        ${people.length > shown.length ? `<div class="wbe-chart-tip-hint">…and ${people.length - shown.length} more</div>` : ""}
        <div class="wbe-chart-tip-hint">Click to list everyone with this name</div>`;
    }
    const groups = generations
      .filter((g) => g.people?.[key]?.length)
      .map((g) => `<div class="wbe-chart-tip-rel" style="margin-top:6px">${escapeText(g.name)}</div>${g.people[key].map((person) => `<div>${personLink(person)}</div>`).join("")}`);
    return groups.join("");
  }

  function pinTip(event, key) {
    const gen = nearestGeneration(pointer(event, svg.node())[0]);
    if (!gen.people?.[key] && !generations.some((g) => g.people?.[key]?.length)) return;
    const overall = series.totals.find(([name]) => name === key)?.[1] || 0;
    pinned = true;
    tip.classList.add("wbe-chart-tip-pinned");
    tip.style.pointerEvents = "auto";
    tip.innerHTML = `<b>${escapeText(key)}</b><div>${overall} ${overall === 1 ? "ancestor" : "ancestors"}</div>${peopleHtml(gen, key, true)}
      <div class="wbe-chart-tip-hint">Click a name to open the profile · click the chart to close</div>`;
    const rect = stage.getBoundingClientRect();
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.max(4, Math.min(event.clientY - rect.top + 14, rect.height * 0.3))}px`;
    tip.style.opacity = 1;
  }

  function unpinTip() {
    if (!pinned) return;
    pinned = false;
    tip.classList.remove("wbe-chart-tip-pinned");
    tip.style.pointerEvents = "";
    hideTip();
  }

  function showTip(event, key) {
    if (pinned) return;
    const [px] = pointer(event, svg.node());
    const gen = nearestGeneration(px);
    const count = gen.counts[key] || 0;
    const percent = gen.total ? Math.round((count / gen.total) * 100) : 0;
    const overall = series.totals.find(([country]) => country === key)?.[1];
    const overallCount = key === OTHER ? series.totals.slice(keys.length - 1).reduce((sum, [, n]) => sum + n, 0) : overall || 0;
    tip.innerHTML = `<div class="wbe-chart-tip-rel">${escapeText(gen.name)}${gen.meanYear ? ` · born about ${gen.meanYear}` : ""}</div>
      <b>${escapeText(key)}</b>
      <div>${count} of ${gen.total} ${withWord} (${percent}%)</div>
      ${gen.unknown ? `<div style="opacity:.75">${gen.unknown} more ${withoutWord}</div>` : ""}
      ${key === OTHER && gen.otherNames?.length ? `<div style="margin-top:4px">${gen.otherNames.slice(0, 14).map(([name, n]) => escapeText(n > 1 ? `${name} (${n})` : name)).join(", ")}${gen.otherNames.length > 14 ? `, +${gen.otherNames.length - 14} more` : ""}</div>` : ""}
      ${peopleHtml(gen, key, false)}
      <div class="wbe-chart-tip-hint">All generations: ${overallCount}</div>`;
    const rect = stage.getBoundingClientRect();
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = 1;
    guide.attr("x1", x(gen.generation)).attr("x2", x(gen.generation)).attr("opacity", 1);
  }

  function hideTip() {
    if (pinned) return;
    tip.style.opacity = 0;
    guide.attr("opacity", 0);
  }

  function applyHighlight() {
    bandsLayer
      .selectAll("path")
      .transition("hl")
      .duration(150)
      .attr("fill-opacity", (layer) => (!state.highlight || state.highlight === layer.key ? 0.92 : 0.18));
    dotsLayer
      .selectAll("circle")
      .transition("hl")
      .duration(150)
      .attr("opacity", (d) => (!state.highlight || state.highlight === d.key ? 1 : 0.25));
    labelsLayer
      .selectAll("text")
      .transition("hl")
      .duration(150)
      .attr("opacity", (d) => (!state.highlight || state.highlight === d.key ? 1 : 0.15));
  }

  function drawLabels(layers, y, delay) {
    // Each country's name sits where its band is thickest, if it fits.
    const labelData = layers
      .map((layer) => {
        let best = null;
        layer.forEach((point) => {
          const thickness = y(point[0]) - y(point[1]);
          if (!best || thickness > best.thickness) best = { thickness, point };
        });
        const minimum = surnames ? 10 : 15;
        if (!best || best.thickness < minimum) return null;
        const mid = (point) => (y(point[0]) + y(point[1])) / 2;
        const size = (thickness) => Math.min(15, Math.min(thickness - 1, 9 + thickness / 10));
        const label = { key: layer.key, x: x(best.point.data.generation), y: mid(best.point), size: size(best.thickness) };
        if (!surnames) return label;
        // The generation columns hold the dots, so a surname's name goes halfway to
        // its thicker neighbour; a one-generation band gets it beside the dots.
        const index = layer.indexOf(best.point);
        const neighbour = [layer[index - 1], layer[index + 1]]
          .filter(Boolean)
          .map((point) => ({ point, thickness: y(point[0]) - y(point[1]) }))
          .sort((a, b) => b.thickness - a.thickness)[0];
        if (neighbour && neighbour.thickness >= minimum) {
          return {
            ...label,
            x: (label.x + x(neighbour.point.data.generation)) / 2,
            y: (label.y + mid(neighbour.point)) / 2,
            size: size(Math.min(best.thickness, neighbour.thickness)),
            between: true,
          };
        }
        return { ...label, beside: true };
      })
      .filter(Boolean)
      .map((d) => {
        if (d.between) return { ...d, anchor: "middle" };
        if (d.beside) return d.x >= WIDTH - MARGIN.right - 1 ? { ...d, anchor: "end", x: d.x - 8 } : { ...d, anchor: "start", x: d.x + 8 };
        // Keep the end labels inside the chart.
        return {
          ...d,
          anchor: d.x <= MARGIN.left + 1 ? "start" : d.x >= WIDTH - MARGIN.right - 1 ? "end" : "middle",
          x: d.x <= MARGIN.left + 1 ? d.x + 6 : d.x >= WIDTH - MARGIN.right - 1 ? d.x - 6 : d.x,
        };
      });
    labelsLayer.selectAll("text").remove();
    labelsLayer
      .selectAll("text")
      .data(labelData)
      .join("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => d.anchor)
      .attr("font-size", (d) => d.size)
      .attr("font-weight", 600)
      .attr("fill", (d) => textColourFor(colourOf.get(d.key)))
      .text((d) => d.key)
      .attr("opacity", 0)
      .transition()
      .delay(delay)
      .duration(400)
      .attr("opacity", 1);
  }

  // Birth year → x: straight between the generations' average years. A dot stays
  // within half a column of its own generation, where its band is drawn.
  const columnX = generations.map((gen) => x(gen.generation));
  function yearX(year, genIndex) {
    const own = columnX[genIndex];
    const half = generations.length > 1 ? (columnX[1] - columnX[0]) * 0.45 : 0;
    const meanYear = generations[genIndex].meanYear;
    if (!year || !meanYear) return own;
    const neighbourIndex = year < meanYear ? genIndex - 1 : genIndex + 1;
    const neighbour = generations[neighbourIndex];
    if (!neighbour?.meanYear || neighbour.meanYear === meanYear) return own;
    const fraction = Math.max(0, Math.min(1, (year - meanYear) / (neighbour.meanYear - meanYear)));
    const px = own + (columnX[neighbourIndex] - own) * fraction;
    return Math.max(own - half, Math.min(own + half, px));
  }

  function drawDots(layers, y, delay, morph) {
    if (!surnames) return;
    const dots = [];
    layers.forEach((layer) => {
      const lows = layer.map((point) => y(point[0]));
      const highs = layer.map((point) => y(point[1]));
      layer.forEach((point, genIndex) => {
        const gen = generations[genIndex];
        const people = gen?.people?.[layer.key] || [];
        people.forEach((person, index) => {
          const cx = yearX(person.year, genIndex);
          const bottom = monotoneAt(columnX, lows, cx);
          const top = monotoneAt(columnX, highs, cx);
          const step = (bottom - top) / Math.max(1, people.length);
          dots.push({
            id: `${gen.generation}:${person.wtid || person.name}`,
            key: layer.key,
            gen,
            person,
            cx,
            cy: top + step * (index + 0.5),
            r: Math.max(1.8, Math.min(4.2, step * 0.32)),
          });
        });
      });
    });
    const circles = dotsLayer
      .selectAll("circle")
      .data(dots, (d) => d.id)
      .join("circle")
      .attr("fill", "#fff")
      .attr("stroke", (d) => colourOf.get(d.key))
      .attr("stroke-width", 1.4)
      .style("cursor", (d) => (d.person.wtid ? "pointer" : "default"))
      .on("mouseenter", (event, d) => {
        if (pinned) return;
        state.highlight = d.key;
        applyHighlight();
        tip.innerHTML = `<div class="wbe-chart-tip-rel">${escapeText(d.gen.name)}</div>
          <b>${escapeText(d.person.name)}</b>
          ${d.person.year ? `<div>Born ${d.person.year}</div>` : ""}
          <div class="wbe-chart-tip-hint">${escapeText(d.key)} at birth${d.person.wtid ? " · click to open the profile" : ""}</div>`;
        const rect = stage.getBoundingClientRect();
        tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
        tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
        tip.style.opacity = 1;
      })
      .on("mouseleave", () => {
        if (pinned) return;
        state.highlight = null;
        applyHighlight();
        hideTip();
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.person.wtid) window.open(`/wiki/${encodeURIComponent(d.person.wtid)}`, "_blank", "noopener");
      });
    if (morph) {
      circles.transition().duration(750).ease(easeCubicInOut).attr("cx", (d) => d.cx).attr("cy", (d) => d.cy).attr("r", (d) => d.r);
    } else {
      circles
        .attr("cx", (d) => d.cx)
        .attr("cy", (d) => d.cy)
        .attr("r", 0)
        .transition()
        .delay((d) => delay + (d.cx / WIDTH) * 500)
        .duration(300)
        .attr("r", (d) => d.r);
    }
  }

  function drawAxis() {
    axisLayer.selectAll("*").remove();
    const ticks = axisLayer
      .selectAll("g")
      .data(generations)
      .join("g")
      .attr("transform", (gen) => `translate(${x(gen.generation)},${HEIGHT - MARGIN.bottom + 18})`);
    ticks
      .append("text")
      .attr("text-anchor", (gen, index) => (index === 0 ? "start" : index === generations.length - 1 ? "end" : "middle"))
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "#333")
      .text((gen) => (gen.meanYear ? `~${gen.meanYear}` : "—"));
    ticks
      .append("text")
      .attr("text-anchor", (gen, index) => (index === 0 ? "start" : index === generations.length - 1 ? "end" : "middle"))
      .attr("dy", 15)
      .attr("font-size", 10)
      .attr("fill", "#666")
      .text((gen) => (gen.generation <= 3 ? gen.name : `Gen ${gen.generation}`));
    axisLayer
      .append("text")
      .attr("x", WIDTH / 2)
      .attr("y", HEIGHT - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "#888")
      .text("Average birth year of each generation (oldest on the left)");
  }

  function render({ reveal = true } = {}) {
    const { layers, y, shape } = layout();
    const paths = bandsLayer
      .selectAll("path")
      .data(layers, (layer) => layer.key)
      .join("path")
      .attr("fill", (layer) => colourOf.get(layer.key))
      .attr("fill-opacity", 0.92)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6)
      .on("mousemove", function (event, layer) {
        if (pinned) return;
        state.highlight = layer.key;
        applyHighlight();
        showTip(event, layer.key);
      })
      .on("mouseleave", () => {
        if (pinned) return;
        state.highlight = null;
        applyHighlight();
        hideTip();
      })
      .on("click", (event, layer) => {
        event.stopPropagation();
        pinned = false;
        state.highlight = layer.key;
        applyHighlight();
        pinTip(event, layer.key);
      });
    if (reveal) {
      paths.attr("d", shape);
      clipRect.interrupt().attr("width", 0).transition().duration(1700).ease(easeCubicInOut).attr("width", WIDTH);
      drawLabels(layers, y, 1300);
      drawDots(layers, y, 900, false);
    } else {
      // Morph between Stream and Share: same points, so the paths interpolate.
      paths.transition().duration(750).ease(easeCubicInOut).attr("d", shape);
      drawLabels(layers, y, 650);
      drawDots(layers, y, 0, true);
    }
    popup.querySelectorAll(".wbe-chart-mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  }

  function drawFooter() {
    const stats = popup.querySelector(".wbe-chart-stats");
    stats.innerHTML = `<strong>${series.totals.length}</strong>${surnames ? (series.totals.length === 1 ? "surname" : "surnames") : series.totals.length === 1 ? "country" : "countries"} · ${series.known.toLocaleString()} ancestors${
      series.unknown ? `<br><span style="opacity:.7">${series.unknown.toLocaleString()} ${withoutWord.replace(/^have /, "with ")}</span>` : ""
    }`;
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    // (A surname for every band can mean dozens of entries: scroll rather than squeeze the chart.)
    legend.style.maxHeight = "92px";
    legend.style.overflowY = "auto";
    keys.forEach((key) => {
      const count =
        key === OTHER
          ? series.totals.slice(keys.length - 1).reduce((sum, [, n]) => sum + n, 0)
          : series.totals.find(([country]) => country === key)?.[1] || 0;
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${colourOf.get(key)}"></i>`;
      span.appendChild(document.createTextNode(`${key} (${count})`));
      span.addEventListener("mouseenter", () => {
        state.highlight = key;
        applyHighlight();
      });
      span.addEventListener("mouseleave", () => {
        state.highlight = null;
        applyHighlight();
      });
      legend.appendChild(span);
    });
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.mode && button.dataset.mode !== state.mode) {
      state.mode = button.dataset.mode;
      render({ reveal: false });
    } else if (button.dataset.act === "replay") render({ reveal: true });
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if ((button.dataset.act === "more" || button.dataset.act === "fewer") && options.onGenerations) {
      const wanted = options.generations + (button.dataset.act === "more" ? 1 : -1);
      popup.querySelectorAll(".wbe-river-generations button").forEach((b) => (b.disabled = true));
      popup.querySelector(".wbe-river-generations-text").textContent = `Loading ${wanted} generations…`;
      Promise.resolve(options.onGenerations(wanted)).catch((error) => {
        popup.querySelector(".wbe-river-generations-text").textContent = `Couldn't load (${error?.message || error})`;
      });
    }
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      clipRect.interrupt().attr("width", WIDTH);
      saveChart(svg.node(), options.fileBase || "ancestral-origins", button.dataset.act);
    }
  });

  svg.on("click.unpin", () => {
    if (!pinned) return;
    unpinTip();
    state.highlight = null;
    applyHighlight();
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  drawAxis();
  drawFooter();
  render({ reveal: true });
  return popup;
}
