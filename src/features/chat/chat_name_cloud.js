// The name cloud popup: ancestors' first names or surnames, sized by how many
// carried them, coloured by when they were born (or by men/women), laid out on a
// spiral from the middle. Hover a name for who; click it to list them with links.
// Data comes from chat_name_cloud_data.js.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { scaleSqrt, scaleSequential } from "d3-scale";
import { interpolateSpectral } from "d3-scale-chromatic";
import { easeBackOut } from "d3-ease";
import { hsl } from "d3-color";
import {
  centrePopup,
  chartLinkButtons,
  chartLinkClick,
  escapeText,
  injectChartStyles,
  profileUrl,
  raiseAboveOtherPopups,
  saveChart,
  toggleChartFullScreen,
} from "./chat_chart_common";

const FONT = "Georgia, 'Times New Roman', serif";
const WIDTH = 960;
const HEIGHT = 560;
const MAX_WORDS = 90;
const KINDS = [
  { key: "first", label: "First names" },
  { key: "surname", label: "Surnames" },
];
const COLOURINGS = [
  { key: "era", label: "When born" },
  { key: "gender", label: "Men / women" },
];
const GENDER_COLOURS = { Male: "#2f6fb3", Female: "#c2185b", "": "#7a8590" };

let measureContext = null;
function textWidth(text, size) {
  if (measureContext === null) {
    // (tried once: false when there's no canvas, and the estimate below is used)
    try {
      measureContext = document.createElement("canvas").getContext("2d") || false;
    } catch (error) {
      measureContext = false;
    }
  }
  if (measureContext) {
    measureContext.font = `700 ${size}px ${FONT}`;
    const width = measureContext.measureText(text).width;
    if (width) return width;
  }
  return text.length * size * 0.58;
}

/** Places words (largest first) along a spiral from the centre; words that don't fit are left out. */
export function layoutCloud(words, sizeOf, width = WIDTH, height = HEIGHT) {
  const placed = [];
  const overlaps = (box) => placed.some((other) => box.x0 < other.box.x1 && box.x1 > other.box.x0 && box.y0 < other.box.y1 && box.y1 > other.box.y0);
  words.forEach((word, index) => {
    const size = sizeOf(word);
    const w = textWidth(word.text, size) + 6;
    const h = size * 0.92 + 4;
    // Alternate the start angle so the cloud fills out evenly.
    for (let t = index % 2 ? Math.PI : 0, step = 0; step < 2400; step += 1, t += 0.07) {
      const r = 3.2 * t;
      const cx = width / 2 + r * Math.cos(t) * 1.55;
      const cy = height / 2 + r * Math.sin(t) * 0.92;
      const box = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
      if (box.x0 < 4 || box.x1 > width - 4 || box.y0 < 4 || box.y1 > height - 4) continue;
      if (overlaps(box)) continue;
      placed.push({ word, size, x: cx, y: cy, box });
      break;
    }
  });
  return placed;
}

/** clouds: {first, surname} from buildNameCloud. options: {title, links, rootKey, onRiver}. */
export function showNameCloudPopup(clouds, options = {}) {
  $("#wbe-name-cloud-popup").remove();
  injectChartStyles();
  const state = { kind: clouds.first?.length ? "first" : "surname", colouring: "era", selected: null };

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-name-cloud-popup";
  popup.style.display = "flex";
  popup.style.height = "min(720px, 92vh)";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Play it again">Replay</button>
        ${options.onRiver ? `<button type="button" class="small" data-act="river" title="Surnames by generation, as a streamgraph">Surname river</button>` : ""}
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${KINDS.map((k) => `<button type="button" class="wbe-chart-mode" data-kind="${k.key}">${k.label}</button>`).join("")}
        <span style="width:12px"></span>
        ${COLOURINGS.map((c) => `<button type="button" class="wbe-chart-mode" data-colouring="${c.key}">${c.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Bigger = more ancestors · click a name for who</span>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Name cloud";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const legend = popup.querySelector(".wbe-chart-legend");
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("cursor", "default");
  const g = svg.append("g");

  function words() {
    return (clouds[state.kind] || []).slice(0, MAX_WORDS);
  }

  function eraScale(list) {
    const years = list.map((word) => word.meanYear).filter(Boolean);
    const min = years.length ? Math.min(...years) : 1700;
    const max = years.length ? Math.max(...years) : 1900;
    const scale = scaleSequential(interpolateSpectral).domain([min, max > min ? max : min + 1]); // (oldest red, newest blue)
    // Darkened, so the pale middle of the scale still reads on white.
    return (year) => {
      const colour = hsl(scale(year));
      colour.l = Math.min(colour.l, 0.42);
      return colour.formatHex();
    };
  }

  function colourFor(word, era) {
    if (state.colouring === "gender" && state.kind === "first") return GENDER_COLOURS[word.gender || ""];
    return word.meanYear ? era(word.meanYear) : "#7a8590";
  }

  function showTip(event, word) {
    const rect = stage.getBoundingClientRect();
    const years = word.people.map((person) => person.birthYear).filter(Boolean);
    const range = years.length ? `${Math.min(...years)}${Math.max(...years) !== Math.min(...years) ? `–${Math.max(...years)}` : ""}` : "";
    const names = word.people
      .slice(0, 8)
      .map((person) => `<div>${escapeText(person.name)}${state.kind === "first" && person.lnab && !person.name.includes(person.lnab) ? ` ${escapeText(person.lnab)}` : ""}${person.birthYear ? ` <span style="opacity:.6">b. ${person.birthYear}</span>` : ""}</div>`)
      .join("");
    tip.innerHTML = `<div class="wbe-chart-tip-rel">${word.count} ancestor${word.count === 1 ? "" : "s"}${range ? ` · born ${range}` : ""}</div><b>${escapeText(word.text)}</b>${names}${
      word.people.length > 8 ? `<div>…and ${word.people.length - 8} more</div>` : ""
    }<div class="wbe-chart-tip-hint">Click to list them</div>`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 160)}px`;
    tip.style.opacity = "1";
  }

  function drawLegend(list, era) {
    legend.innerHTML = "";
    legend.style.maxHeight = "96px";
    legend.style.overflowY = "auto";
    const add = (colour, label) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${colour}"></i>`;
      span.appendChild(document.createTextNode(label));
      legend.appendChild(span);
    };
    if (state.selected) {
      const word = state.selected;
      const head = document.createElement("span");
      head.innerHTML = `<b>${escapeText(word.text)}</b>&nbsp;(${word.count}):`;
      legend.appendChild(head);
      word.people.forEach((person) => {
        const link = document.createElement("a");
        link.href = profileUrl(person.wtid);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${person.name}${state.kind === "first" && person.lnab && !person.name.includes(person.lnab) ? ` ${person.lnab}` : ""}${person.birthYear ? ` (${person.birthYear})` : ""}`;
        legend.appendChild(link);
      });
      return;
    }
    if (state.colouring === "gender" && state.kind === "first") {
      add(GENDER_COLOURS.Male, "mostly men");
      add(GENDER_COLOURS.Female, "mostly women");
    } else {
      const years = list.map((word) => word.meanYear).filter(Boolean);
      if (years.length) {
        const min = Math.min(...years);
        const max = Math.max(...years);
        [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
          const year = Math.round(min + (max - min) * f);
          add(era(year), `${year}`);
        });
        const note = document.createElement("span");
        note.style.opacity = "0.7";
        note.textContent = "average birth year of those named";
        legend.appendChild(note);
      }
    }
    const total = clouds[state.kind]?.length || 0;
    if (total > MAX_WORDS) {
      const more = document.createElement("span");
      more.style.opacity = "0.7";
      more.textContent = `top ${MAX_WORDS} of ${total}`;
      legend.appendChild(more);
    }
  }

  function render() {
    const list = words();
    const era = eraScale(list);
    const maxCount = Math.max(1, ...list.map((word) => word.count));
    const size = scaleSqrt().domain([1, maxCount]).range([13, list.length > 50 ? 62 : 74]);
    const placed = layoutCloud(list, (word) => size(word.count));
    g.selectAll("*").remove();
    const text = g
      .selectAll("text")
      .data(placed)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", FONT)
      .attr("font-weight", 700)
      .attr("font-size", (d) => d.size)
      .attr("fill", (d) => colourFor(d.word, era))
      .attr("transform", `translate(${WIDTH / 2},${HEIGHT / 2}) scale(0.1)`)
      .attr("opacity", 0)
      .style("cursor", "pointer")
      .text((d) => d.word.text)
      .on("mousemove", (event, d) => showTip(event, d.word))
      .on("mouseleave", () => (tip.style.opacity = "0"))
      .on("click", (event, d) => {
        state.selected = state.selected === d.word ? null : d.word;
        text.attr("opacity", (other) => (!state.selected || other.word === state.selected ? 1 : 0.25));
        drawLegend(list, era);
      });
    text
      .transition()
      .delay((d, i) => 80 + i * 22)
      .duration(650)
      .ease(easeBackOut)
      .attr("transform", (d) => `translate(${d.x},${d.y}) scale(1)`)
      .attr("opacity", 1);
    popup.querySelectorAll("[data-kind]").forEach((button) => button.classList.toggle("active", button.dataset.kind === state.kind));
    popup.querySelectorAll("[data-colouring]").forEach((button) => {
      button.classList.toggle("active", button.dataset.colouring === state.colouring);
      button.hidden = state.kind !== "first";
    });
    drawLegend(list, era);
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, options.rootKey);
    else if (button.dataset.kind) {
      state.kind = button.dataset.kind;
      state.selected = null;
      render();
    } else if (button.dataset.colouring) {
      state.colouring = button.dataset.colouring;
      const era = eraScale(words());
      g.selectAll("text").transition("colour").duration(400).attr("fill", (d) => colourFor(d.word, era));
      popup.querySelectorAll("[data-colouring]").forEach((other) => other.classList.toggle("active", other === button));
      drawLegend(words(), era);
    } else if (button.dataset.act === "replay") {
      state.selected = null;
      render();
    } else if (button.dataset.act === "river") {
      popup._wbeLeaveFullScreen?.(); // (a full-screen chart would hide the new one)
      options.onRiver();
    } else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      saveChart(svg.node(), `name-cloud-${state.kind}-${String(options.rootKey || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  render();
  return popup;
}
