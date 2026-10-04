// The descendant sunburst popup, drawn with d3. Each person's arc is as wide as
// their share of the family (themselves plus their descendants). Click a branch
// to zoom into it (the centre zooms back out); a breadcrumb shows the line.
// Data comes from chat_descendant_chart_data.js.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { arc as d3arc } from "d3-shape";
import { hierarchy, partition } from "d3-hierarchy";
import { interpolate } from "d3-interpolate";
import { scaleSequential } from "d3-scale";
import { interpolateSpectral, interpolateRainbow, schemeTableau10 } from "d3-scale-chromatic";
import { easeCubicInOut, easeBackOut } from "d3-ease";
import { hsl } from "d3-color";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { descendantTreeStats } from "./chat_descendant_chart_data";
import { dnaCarrierKind } from "./chat_dna_data";
import {
  centrePopup,
  escapeText,
  injectChartStyles,
  lifeYears,
  profileUrl,
  raiseAboveOtherPopups,
  saveChart,
  toggleChartFullScreen,
  chartLinkButtons,
  chartLinkClick,
  textColourFor,
  truncate,
  yearOf,
} from "./chat_chart_common";

const UNKNOWN_FILL = "#d9d9d9";
const MODES = [
  { key: "branch", label: "Family branch" },
  { key: "century", label: "Birth year" },
  { key: "surname", label: "Surname" },
  { key: "country", label: "Birth country" },
  { key: "dnacarriers", label: "DNA carriers" },
];
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function generationWord(depth) {
  if (depth === 1) return "Child";
  if (depth === 2) return "Grandchild";
  if (depth === 3) return "Great-grandchild";
  return `${depth - 2}x great-grandchild`;
}

/** "y", "mt" or "": whether node carries the Y or mtDNA of the person at the centre (focus). */
export function carrierKindOf(node, focus) {
  const path = node.ancestors();
  const index = path.indexOf(focus);
  if (index < 1) return "";
  return dnaCarrierKind(path.slice(0, index + 1).reverse().map((n) => n.data.person));
}

const CARRIER_COLOURS = { y: "#2f6fb0", mt: "#b0185a", living: "#f2a516", none: "#e3e5e9" };

function buildColouring(root, mode, focus = root) {
  const nodes = root.descendants().slice(1);
  if (mode === "dnacarriers") {
    // Who carries the centre person's Y-DNA (a man) or mtDNA (a woman); gold = living, could test.
    const keyOf = (node) => {
      const kind = carrierKindOf(node, focus);
      if (!kind) return "none";
      return node.data.person.living ? "living" : kind;
    };
    const counts = new Map();
    nodes.forEach((node) => counts.set(keyOf(node), (counts.get(keyOf(node)) || 0) + 1));
    const centre = focus.data.person;
    const kind = centre.gender === "Male" ? "y" : centre.gender === "Female" ? "mt" : "";
    const dnaWord = kind === "y" ? "Y-DNA" : "mtDNA";
    return {
      fill: (node) => CARRIER_COLOURS[keyOf(node)],
      key: keyOf,
      legend: kind
        ? [
            { key: kind, label: `Carries ${centre.name || centre.wtid}'s ${dnaWord} (${counts.get(kind) || 0})`, colour: CARRIER_COLOURS[kind] },
            { key: "living", label: `Living carrier: could take a ${dnaWord} test (${counts.get("living") || 0})`, colour: CARRIER_COLOURS.living },
            { key: "none", label: `Doesn't carry it (${counts.get("none") || 0})`, colour: CARRIER_COLOURS.none },
          ]
        : [{ key: "none", label: "No gender recorded for the person at the centre", colour: CARRIER_COLOURS.none }],
    };
  }
  if (mode === "century") {
    const years = nodes.map((node) => yearOf(node.data.person.birth)).filter(Boolean);
    const min = years.length ? Math.min(...years) : 1800;
    const max = years.length ? Math.max(...years) : 1950;
    const scale = scaleSequential(interpolateSpectral).domain([min, Math.max(max, min + 1)]);
    const buckets = [];
    for (let start = Math.floor(min / 50) * 50; start <= max; start += 50) buckets.push(start);
    return {
      fill: (node) => (yearOf(node.data.person.birth) ? scale(yearOf(node.data.person.birth)) : UNKNOWN_FILL),
      key: (node) => (yearOf(node.data.person.birth) ? `${Math.floor(yearOf(node.data.person.birth) / 50) * 50}` : "Unknown"),
      legend: [
        ...buckets.map((start) => ({ key: `${start}`, label: `${start}–${start + 49}`, colour: scale(Math.min(Math.max(start + 25, min), max)) })),
        { key: "Unknown", label: "No birth year", colour: UNKNOWN_FILL },
      ],
    };
  }
  if (mode === "surname" || mode === "country") {
    const field = mode === "surname" ? "lnab" : "birthCountry";
    const counts = new Map();
    nodes.forEach((node) => {
      const value = node.data.person[field];
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const colourOf = new Map(sorted.slice(0, 9).map(([value], index) => [value, schemeTableau10[index]]));
    const others = sorted.slice(9).reduce((sum, [, count]) => sum + count, 0);
    const valueOf = (node) => node.data.person[field];
    return {
      fill: (node) => (valueOf(node) ? colourOf.get(valueOf(node)) || "#9c9c9c" : UNKNOWN_FILL),
      key: (node) => (valueOf(node) ? (colourOf.has(valueOf(node)) ? valueOf(node) : "Other") : "Unknown"),
      legend: [
        ...sorted.slice(0, 9).map(([value, count]) => ({ key: value, label: `${value} (${count})`, colour: colourOf.get(value) })),
        ...(others ? [{ key: "Other", label: `Other (${others})`, colour: "#9c9c9c" }] : []),
        { key: "Unknown", label: mode === "surname" ? "No surname" : "No birthplace", colour: UNKNOWN_FILL },
      ],
    };
  }
  // Branch: each child of the focus gets a hue; descendants lighten outwards.
  const branches = focus.children || [];
  const hueOf = new Map(branches.map((child, index) => [child, hsl(interpolateRainbow(index / Math.max(branches.length, 1))).h]));
  const branchOf = (node) => node.ancestors().find((a) => a.parent === focus);
  return {
    fill: (node) => {
      const hue = hueOf.get(branchOf(node));
      if (!Number.isFinite(hue)) return "#c9ccd1";
      return hsl(hue, 0.58, Math.min(0.4 + (node.depth - focus.depth) * 0.07, 0.85)).formatHex();
    },
    key: (node) => String(branches.indexOf(branchOf(node))),
    legend: branches.map((child, index) => ({
      key: String(index),
      label: `${child.data.person.name || child.data.person.wtid}${yearOf(child.data.person.birth) ? ` b. ${yearOf(child.data.person.birth)}` : ""} (${child.value - 1})`,
      colour: hsl(hueOf.get(child), 0.58, 0.5).formatHex(),
    })),
  };
}

/**
 * tree: from buildDescendantTree. options: {title, generations}.
 */
export function showDescendantChartPopup(tree, options = {}) {
  $("#wbe-descendant-chart-popup").remove();
  injectChartStyles();

  const root = hierarchy(tree, (d) => d.children).sum(() => 1);
  partition().size([2 * Math.PI, root.height + 1])(root);
  root.each((d) => {
    d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
  });

  const state = {
    mode: MODES.some((m) => m.key === options.mode) ? options.mode : (root.children || []).length > 1 ? "branch" : "century",
    focus: root,
    highlight: null,
  };

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-descendant-chart-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Scroll to zoom, drag to move · click a branch to open it out · centre to go back · Ctrl/⌘-click to open</span>
        <button type="button" class="wbe-chart-mode" data-act="zoomin" title="Zoom in (or scroll / pinch)">+</button>
        <button type="button" class="wbe-chart-mode" data-act="zoomout" title="Zoom out">−</button>
        <button type="button" class="wbe-chart-mode" data-act="reset" title="Back to the whole chart">Reset</button>
      </div>
      <div class="wbe-chart-crumbs"></div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-bars" title="Descendants in each generation"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Descendants";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const VISIBLE_RINGS = Math.min(Math.max(root.height, 1), 5);
  const size = 900;
  const radius = size / 2 / (VISIBLE_RINGS + 1);
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `${-size / 2} ${-size / 2} ${size} ${size}`);
  // Wheel/pinch zoom and drag (user, 2026-10-03: the names were "way too small and there's no
  // obvious way to zoom in"). The outer group takes the zoom; saving leaves it out.
  const viewport = svg.append("g");
  const g = viewport.append("g");
  const zoomer = d3zoom()
    .scaleExtent([0.6, 10])
    .on("zoom", (event) => viewport.attr("transform", event.transform));
  svg.call(zoomer).on("dblclick.zoom", null);
  const resetZoom = (duration = 400) => svg.transition("zoom").duration(duration).call(zoomer.transform, zoomIdentity);

  const arcGen = d3arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.004))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1.5))
    .cornerRadius(2);

  const arcVisible = (d) => d.y1 <= VISIBLE_RINGS + 1 && d.y0 >= 1 && d.x1 > d.x0;
  const labelVisible = (d) => d.y1 <= VISIBLE_RINGS + 1 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.045;
  const labelTransform = (d) => {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  const nodes = root.descendants().slice(1);
  const path = g
    .append("g")
    .selectAll("path")
    .data(nodes)
    .join("path")
    .attr("class", "wbe-chart-arc")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.8)
    .style("cursor", "pointer");

  const label = g
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("dy", "0.35em")
    .attr("font-size", 12);

  const centre = g.append("g").style("cursor", "pointer");
  const centreCircle = centre.append("circle").attr("r", 0).attr("fill", "#2f6fb3").attr("stroke", "#fff").attr("stroke-width", 3);
  const centreName = centre.append("text").attr("text-anchor", "middle").attr("dy", "-0.25em").attr("fill", "#fff").attr("font-size", 15).attr("font-weight", 700);
  const centreSub = centre.append("text").attr("text-anchor", "middle").attr("dy", "1.15em").attr("fill", "#dce9ff").attr("font-size", 11.5);
  centreCircle.transition().duration(650).ease(easeBackOut.overshoot(2)).attr("r", radius - 4);

  function colour() {
    const colouring = buildColouring(root, state.mode, state.focus);
    nodes.forEach((node) => {
      node.fill = colouring.fill(node);
      node.key = colouring.key(node);
    });
    return colouring;
  }

  function paintLabels() {
    label
      .attr("fill", (d) => textColourFor(d.fill))
      .attr("font-style", (d) => (d.data.person.hidden ? "italic" : null))
      .text((d) => {
        const ringPx = radius - 10;
        const name = d.data.person.name || d.data.person.wtid;
        return truncate(name, Math.floor(ringPx / 7));
      });
  }

  function updateCentre() {
    const person = state.focus.data.person;
    centreName.text(truncate(person.name || person.wtid, 14));
    const count = state.focus.value - 1;
    centreSub.text(state.focus === root ? `${count.toLocaleString()} descendants` : `${count.toLocaleString()} · tap to go up`);
  }

  function updateCrumbs() {
    const crumbs = popup.querySelector(".wbe-chart-crumbs");
    crumbs.innerHTML = "";
    state.focus
      .ancestors()
      .reverse()
      .forEach((node, index, all) => {
        const span = document.createElement("button");
        span.type = "button";
        span.className = "wbe-chart-crumb";
        span.textContent = `${node.data.person.name || node.data.person.wtid}${node.depth ? ` (${generationWord(node.depth).toLowerCase()})` : ""}`;
        span.disabled = index === all.length - 1;
        span.addEventListener("click", () => zoomTo(node));
        crumbs.appendChild(span);
        if (index < all.length - 1) crumbs.appendChild(document.createTextNode(" › "));
      });
  }

  function lit(d) {
    const { highlight } = state;
    if (!highlight) return true;
    if (highlight.type === "line") return highlight.nodes.has(d);
    return d.key === highlight.key;
  }

  function applyHighlight() {
    path
      .transition("hl")
      .duration(150)
      .attr("fill-opacity", (d) => (arcVisible(d.current) ? (lit(d) ? 1 : 0.2) : 0));
    // Dimmed arcs are nearly white, so their names turn dark grey rather than fading
    // (user, 2026-10-04: the names vanished while hovering; "the readable labels are important").
    label
      .transition("hl")
      .duration(150)
      .attr("fill", (d) => (lit(d) ? textColourFor(d.fill) : "#4a5059"))
      .attr("fill-opacity", (d) => (labelVisible(d.current) ? (lit(d) ? 1 : 0.7) : 0));
  }

  function carrierNote(node) {
    if (state.mode !== "dnacarriers") return "";
    const kind = carrierKindOf(node, state.focus);
    const centre = state.focus.data.person.name || state.focus.data.person.wtid;
    const dnaWord = kind === "y" ? "Y-DNA" : "mtDNA";
    if (!kind) return `<div class="wbe-chart-tip-dna">Doesn't carry ${escapeText(centre)}'s ${state.focus.data.person.gender === "Female" ? "mtDNA" : "Y-DNA"}</div>`;
    return `<div class="wbe-chart-tip-dna">Carries ${escapeText(centre)}'s ${dnaWord}${node.data.person.living ? `: living, so could take a ${dnaWord} test` : ""}</div>`;
  }

  function showTip(event, node) {
    const person = node.data.person;
    const rect = stage.getBoundingClientRect();
    const born = [person.birth, person.birthLocation].filter(Boolean).join(", ");
    const kids = (node.children || []).length;
    const descendants = node.value - 1;
    tip.innerHTML = `<div class="wbe-chart-tip-rel">${escapeText(generationWord(node.depth))}</div>
      <b>${escapeText(person.name || person.wtid)}${person.lnab && !String(person.name).includes(person.lnab) ? ` ${escapeText(person.lnab)}` : ""}</b>
      ${person.wtid ? `<span style="opacity:.7">(${escapeText(person.wtid)})</span>` : ""}
      ${person.hidden ? `<div style="opacity:.75">WikiTree doesn't show you this profile (private or unlisted)</div>` : ""}
      ${born ? `<div>Born: ${escapeText(born)}</div>` : ""}${person.death ? `<div>Died: ${escapeText(person.death)}</div>` : ""}
      <div>${kids} child${kids === 1 ? "" : "ren"} · ${descendants.toLocaleString()} descendant${descendants === 1 ? "" : "s"} in the chart</div>
      ${carrierNote(node)}
      <div class="wbe-chart-tip-hint">${kids ? "Click to zoom in" : person.wtid ? "Click to open" : ""}${person.wtid ? `${kids ? " · " : ""}Ctrl/⌘-click to open the profile` : ""}</div>`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function zoomTo(p) {
    state.focus = p;
    resetZoom(300); // (a branch opens out to fill the chart: start it from the whole view)
    tip.style.opacity = "0";
    root.each((d) => {
      d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth),
      };
    });
    const colouring = colour();
    const t = svg.transition().duration(750).ease(easeCubicInOut);
    // Hidden arcs take their new colour at once; visible ones fade to it in the zoom.
    path.filter(function () {
      return !Number(this.getAttribute("fill-opacity"));
    }).attr("fill", (d) => d.fill);
    paintLabels();
    drawFooter(colouring);
    path
      .transition(t)
      .tween("data", (d) => {
        const i = interpolate(d.current, d.target);
        return (time) => {
          d.current = i(time);
        };
      })
      .filter(function (d) {
        return Number(this.getAttribute("fill-opacity")) || arcVisible(d.target);
      })
      .attr("fill", (d) => d.fill)
      .attr("fill-opacity", (d) => (arcVisible(d.target) ? 1 : 0))
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arcGen(d.current));
    label
      .filter(function (d) {
        return Number(this.getAttribute("fill-opacity")) || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
    updateCentre();
    updateCrumbs();
  }

  path
    .on("mousemove", (event, d) => showTip(event, d))
    .on("mouseenter", (event, d) => {
      state.highlight = { type: "line", nodes: new Set(d.ancestors()) };
      applyHighlight();
    })
    .on("mouseleave", () => {
      tip.style.opacity = "0";
      state.highlight = null;
      applyHighlight();
    })
    .on("click", (event, d) => {
      if (event.ctrlKey || event.metaKey || !d.children) {
        if (d.data.person.wtid) window.open(profileUrl(d.data.person.wtid), "_blank", "noopener,noreferrer");
        return;
      }
      zoomTo(d);
    });
  centre.on("click", (event) => {
    if (event.ctrlKey || event.metaKey) {
      const wtid = state.focus.data.person.wtid;
      if (wtid) window.open(profileUrl(wtid), "_blank", "noopener,noreferrer");
      return;
    }
    if (state.focus.parent) zoomTo(state.focus.parent);
  });

  function drawFooter(colouring) {
    const stats = descendantTreeStats(tree);
    popup.querySelector(".wbe-chart-stats").innerHTML = `<strong>${stats.total.toLocaleString()}</strong>descendants · ${stats.byGeneration.length} generations`;
    const max = Math.max(1, ...stats.byGeneration.map((row) => row.count));
    popup.querySelector(".wbe-chart-bars").innerHTML = stats.byGeneration
      .map((row) => `<div title="${generationWord(row.generation)}ren: ${row.count}"><b style="height:${Math.round((row.count / max) * 100)}%"></b></div>`)
      .join("");
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    colouring.legend.slice(0, 14).forEach((item) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${item.colour}"></i>`;
      span.appendChild(document.createTextNode(item.label));
      span.addEventListener("mouseenter", () => {
        state.highlight = { type: "key", key: item.key };
        applyHighlight();
      });
      span.addEventListener("mouseleave", () => {
        state.highlight = null;
        applyHighlight();
      });
      legend.appendChild(span);
    });
  }

  function render({ animate }) {
    const colouring = colour();
    popup.querySelectorAll(".wbe-chart-mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    path.attr("fill", (d) => d.fill);
    paintLabels();
    drawFooter(colouring);
    if (!animate) return;
    // Entrance: rings unfold outwards, then the labels fade in.
    path
      .attr("fill-opacity", 0)
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
      .attr("d", (d) => arcGen({ ...d.current, x1: d.current.x0 }))
      .transition()
      .delay((d) => 150 + d.depth * 160)
      .duration(700)
      .ease(easeCubicInOut)
      .attr("fill-opacity", (d) => (arcVisible(d.current) ? 1 : 0))
      .attrTween("d", (d) => {
        const i = interpolate({ ...d.current, x1: d.current.x0 }, d.current);
        return (time) => arcGen(i(time));
      });
    label
      .attr("transform", (d) => labelTransform(d.current))
      .attr("fill-opacity", 0)
      .transition()
      .delay(150 + VISIBLE_RINGS * 160 + 500)
      .duration(400)
      .attr("fill-opacity", (d) => +labelVisible(d.current));
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.classList.contains("wbe-chart-crumb")) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) {
      chartLinkClick(popup, button, options.links, state.focus.data.person?.wtid); // (whoever is at the centre)
    } else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      render({ animate: false });
      path.attr("fill-opacity", (d) => (arcVisible(d.current) ? 0.4 : 0)).transition().duration(350).attr("fill-opacity", (d) => (arcVisible(d.current) ? 1 : 0));
    } else if (button.dataset.act === "zoomin" || button.dataset.act === "zoomout") {
      svg.transition("zoom").duration(300).call(zoomer.scaleBy, button.dataset.act === "zoomin" ? 1.6 : 1 / 1.6);
    } else if (button.dataset.act === "reset") {
      resetZoom();
    } else if (button.dataset.act === "full") {
      toggleChartFullScreen(popup);
    } else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      saveChart(svg.node(), `descendants-${(tree.person.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  updateCentre();
  updateCrumbs();
  render({ animate: true });
  return popup;
}
