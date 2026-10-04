// The life line popup (2026-10-04, the "Wow!" visuals): one person's life as a single
// line from birth to death, marked with years and ages. Family events stand above it
// on stems (labelled when they're milestones, dots for siblings and grandchildren);
// the world events they lived through run below as bars. Hovering the line shows the
// year and age. Data comes from chat_life_line_data.js.

import $ from "jquery";
import { select, pointer } from "d3-selection";
import "d3-transition";
import { scaleLinear } from "d3-scale";
import { area as d3area, curveStepAfter } from "d3-shape";
import { easeCubicOut } from "d3-ease";
import { LIFE_EVENT_KINDS } from "./chat_life_line_data";
import { EVENT_KIND_COLOURS, eventYears } from "./chat_world_events_data";
import { centrePopup, chartLinkButtons, chartLinkClick, escapeText, injectChartStyles, profileUrl, raiseAboveOtherPopups, saveChart, toggleChartFullScreen, truncate } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WIDTH = 980;
const SIDE = 48;
const LANE_H = 22;
const MAX_FAMILY_LANES = 14;
const MAX_HISTORY_LANES = 40; // (the chart grows downwards rather than leave events out)
const PLACE_H = 20;
const HOUSE_H = 70;
const HOUSE_KEYS = [
  { key: "parents", label: "Parents", colour: "#8e6cc2" },
  { key: "spouses", label: "Spouse", colour: "#d0577b" },
  { key: "children", label: "Children", colour: "#e08a2e" },
  { key: "grandchildren", label: "Grandchildren", colour: "#c2a23a" },
];
const PLACE_COLOURS = ["#dbe8f6", "#fbe3d0", "#dcefe3", "#efe0f5", "#f8efc9", "#e3e6ea"];
const KIND_COLOURS = {
  birth: "#2f6fb3",
  marriage: "#d0577b",
  child: "#e08a2e",
  loss: "#3b3f46",
  sibling: "#3f9d8f",
  siblingLoss: "#8a96a3",
  grandchild: "#c2a23a",
  death: "#2f6fb3",
};
const shortTown = (place) => String(place || "").split(",")[0];
const textWidth = (text, size) => String(text || "").length * size * 0.6;

/**
 * Greedy lanes: each item goes in the first lane whose last item ends before it starts.
 * When every lane is taken the item gets lane -1 and isn't drawn with a label: text
 * never overlaps (user, 2026-10-04: "Overlapping text makes it unreadable").
 */
function assignLanes(items, maxLanes) {
  const ends = [];
  items.forEach((item) => {
    let lane = ends.findIndex((end) => end < item.x0);
    if (lane === -1 && ends.length < maxLanes) lane = ends.length;
    if (lane >= 0) ends[lane] = item.x1;
    item.lane = lane;
  });
  return ends.length;
}

/** line: from buildLifeLine. options: {title, links, fileBase}. */
export function showLifeLinePopup(line, options = {}) {
  $("#wbe-life-line-popup").remove();
  injectChartStyles();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-life-line-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="history" title="Show or hide the world events">History</button>
        <button type="button" class="small" data-act="minor" title="Show or hide siblings and grandchildren">Siblings & grandchildren</button>
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        <span style="opacity:.65">Move along the line for the year and age · click a family event to open the profile</span>
      </div>
      <div class="wbe-chart-stage" style="overflow-y:auto"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`;
  document.body.appendChild(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Life line";
  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const state = { history: true, minor: true };

  function showTip(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + stage.scrollTop + 14, stage.scrollTop + rect.height - 120)}px`;
    tip.style.opacity = "1";
  }
  const hideTip = () => (tip.style.opacity = "0");

  let svg = null;
  function render() {
    stage.querySelector("svg")?.remove();
    hideTip();
    const first = Math.min(line.start, ...line.family.map((e) => e.year));
    const x = scaleLinear().domain([first - 2, line.end + 2]).range([SIDE, WIDTH - SIDE]);

    // Family events above the line: milestones with labels in lanes, the rest as dots on it.
    const family = line.family.filter((e) => LIFE_EVENT_KINDS[e.kind]?.major || state.minor);
    const labelled = family
      .filter((e) => LIFE_EVENT_KINDS[e.kind]?.major)
      .map((e) => {
        const text = `${e.year} · ${truncate(e.text, 44)}`;
        const x0 = x(e.year) - 5;
        return { ...e, label: text, x0, x1: x0 + textWidth(text, 11) + 16 };
      });
    // (labels that would run off the right edge hang to the left of their stem instead)
    labelled.forEach((e) => {
      if (e.x1 > WIDTH - 6) {
        const width = e.x1 - e.x0;
        e.left = true;
        e.x1 = x(e.year) + 5;
        e.x0 = e.x1 - width;
      }
    });
    const familyLanes = Math.max(1, assignLanes(labelled, MAX_FAMILY_LANES));
    // (a milestone with no room for its label becomes a dot on the line, with its tip)
    const unlabelled = labelled.filter((e) => e.lane < 0);
    labelled.splice(0, labelled.length, ...labelled.filter((e) => e.lane >= 0));
    const axisY = 40 + familyLanes * LANE_H + 18;

    // World events below: bars clipped to the life, in lanes.
    const history = state.history
      ? line.history.map(({ event, age }) => {
          const from = Math.max(event.start, line.start);
          const to = Math.min(event.end, line.end);
          const x0 = x(from);
          const barEnd = Math.max(x0 + 4, x(to + (event.start === event.end ? 0 : 1)));
          const text = truncate(event.label, 46);
          return { event, age, x0, barEnd, label: text, x1: Math.max(barEnd, x0 + textWidth(text, 10) + 10) };
        })
      : [];
    const historyLanes = assignLanes(history, MAX_HISTORY_LANES);
    history.splice(0, history.length, ...history.filter((item) => item.lane >= 0)); // (the chat text lists them all)
    // Below the line: where the family was, who was alive around them, then the world.
    const places = line.places || [];
    const household = (line.household || []).filter((h) => h.parents + h.spouses + h.children + h.grandchildren > 0);
    const placeTop = axisY + 50;
    const houseTop = placeTop + (places.length ? PLACE_H + 40 : 0);
    const historyTop = houseTop + (household.length ? HOUSE_H + 44 : 0) + 4;
    const height = historyTop + historyLanes * LANE_H + (historyLanes ? 16 : 0);

    svg = select(stage)
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("font-family", FONT)
      .attr("viewBox", `0 0 ${WIDTH} ${height}`)
      .style("height", "auto");
    const root = svg.append("g");

    // Decade grid and year labels.
    const ticks = x.ticks(Math.min(14, Math.round((line.end - first) / 8) || 2));
    ticks.forEach((year) => {
      root.append("line").attr("x1", x(year)).attr("x2", x(year)).attr("y1", 26).attr("y2", height - 6).attr("stroke", "#000").attr("stroke-opacity", 0.06);
      root.append("text").attr("x", x(year)).attr("y", 18).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#6b7785").text(year);
    });

    // The line itself, drawn left to right; dashed where the end isn't known.
    const solidEnd = line.endKnown || line.living ? line.end : Math.max(line.start, ...line.family.map((e) => e.year));
    const drawn = root
      .append("line")
      .attr("x1", x(line.start))
      .attr("x2", x(line.start))
      .attr("y1", axisY)
      .attr("y2", axisY)
      .attr("stroke", "#2f6fb3")
      .attr("stroke-width", 6)
      .attr("stroke-linecap", "round");
    drawn.transition().duration(900).ease(easeCubicOut).attr("x2", x(solidEnd));
    if (solidEnd < line.end) {
      root
        .append("line")
        .attr("x1", x(solidEnd))
        .attr("x2", x(line.end))
        .attr("y1", axisY)
        .attr("y2", axisY)
        .attr("stroke", "#2f6fb3")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "4 5")
        .attr("opacity", 0)
        .transition()
        .delay(900)
        .attr("opacity", 0.6);
    }

    // Ages under the line, every ten years.
    for (let age = 10; line.start + age <= line.end; age += 10) {
      const ax = x(line.start + age);
      root.append("line").attr("x1", ax).attr("x2", ax).attr("y1", axisY - 5).attr("y2", axisY + 5).attr("stroke", "#fff").attr("stroke-width", 1.5);
      root.append("text").attr("x", ax).attr("y", axisY + 20).attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#2f6fb3").text(`age ${age}`);
    }

    const delayFor = (year) => 300 + Math.max(0, (x(year) - x(line.start)) / (x(line.end) - x(line.start) || 1)) * 900;
    const openProfile = (event, d) => d.wtid && window.open(profileUrl(d.wtid), "_blank", "noopener,noreferrer");
    const familyTip = (event, d) =>
      showTip(
        event,
        `<b>${d.year}</b>${d.before ? "" : ` · aged ${d.age}`}<div>${escapeText(d.text)}</div>${d.wtid ? `<div class="wbe-chart-tip-hint">Click to open ${escapeText(d.wtid)}</div>` : ""}`
      );

    // Milestones: a stem up from the line, a dot, the label.
    const milestone = root
      .append("g")
      .selectAll("g")
      .data(labelled)
      .join("g")
      .style("cursor", (d) => (d.wtid ? "pointer" : "default"))
      .attr("opacity", 0)
      .on("mousemove", familyTip)
      .on("mouseleave", hideTip)
      .on("click", openProfile);
    milestone.each(function (d) {
      const g = select(this);
      const y = axisY - 26 - d.lane * LANE_H;
      const cx = x(d.year);
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", axisY - 4).attr("y2", y).attr("stroke", KIND_COLOURS[d.kind]).attr("stroke-width", 1.2).attr("stroke-opacity", 0.7);
      g.append("circle").attr("cx", cx).attr("cy", y).attr("r", 4.5).attr("fill", KIND_COLOURS[d.kind]).attr("stroke", "#fff").attr("stroke-width", 1.5);
      g.append("text")
        .attr("x", d.left ? cx - 8 : cx + 8)
        .attr("y", y)
        .attr("dy", "0.35em")
        .attr("text-anchor", d.left ? "end" : "start")
        .attr("font-size", 11)
        .attr("font-weight", d.kind === "birth" || d.kind === "death" ? 700 : 500)
        .attr("fill", d.kind === "siblingLoss" ? "#5b6670" : "#2b2f36")
        .text(d.label);
    });
    milestone.transition().delay((d) => delayFor(d.year)).duration(350).attr("opacity", 1);

    // The minor events: dots on the line.
    root
      .append("g")
      .selectAll("circle")
      .data([...family.filter((e) => !LIFE_EVENT_KINDS[e.kind]?.major), ...unlabelled])
      .join("circle")
      .attr("cx", (d) => x(d.year))
      .attr("cy", axisY)
      .attr("r", 4)
      .attr("fill", "#fff")
      .attr("stroke", (d) => KIND_COLOURS[d.kind])
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .attr("opacity", 0)
      .on("mousemove", familyTip)
      .on("mouseleave", hideTip)
      .on("click", openProfile)
      .transition()
      .delay((d) => delayFor(d.year))
      .duration(300)
      .attr("opacity", 1);

    const heading = (y, text) => root.append("text").attr("x", SIDE).attr("y", y).attr("font-size", 9.5).attr("font-weight", 700).attr("letter-spacing", "0.06em").attr("fill", "#6b7785").text(text);

    // Where: a stretch per place in turn, its name inside when it fits.
    if (places.length) {
      heading(placeTop - 10, "WHERE THE FAMILY RECORDS PUT THEM");
      const placeG = root
        .append("g")
        .selectAll("g")
        .data(places)
        .join("g")
        .style("cursor", "help")
        .attr("opacity", 0)
        .on("mousemove", (event, d) => showTip(event, `<b>${escapeText(d.full)}</b><div>${d.reasons.map(escapeText).join("<br>")}</div>`))
        .on("mouseleave", hideTip);
      const colourOf = new Map();
      places.forEach((p) => colourOf.has(p.place.toLowerCase()) || colourOf.set(p.place.toLowerCase(), PLACE_COLOURS[colourOf.size % PLACE_COLOURS.length]));
      placeG
        .append("rect")
        .attr("x", (d) => x(d.from))
        .attr("y", placeTop)
        .attr("width", (d) => Math.max(3, x(d.to) - x(d.from)))
        .attr("height", PLACE_H)
        .attr("fill", (d) => colourOf.get(d.place.toLowerCase()))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      // (a name that doesn't fit goes under the strip, staggered, or into the tip)
      let nextFree = -Infinity;
      placeG.each(function (d, i) {
        const width = x(d.to) - x(d.from);
        const inside = textWidth(d.place, 10.5) + 10 <= width;
        const g = select(this);
        if (inside) {
          g.append("text").attr("x", x(d.from) + 5).attr("y", placeTop + PLACE_H / 2).attr("dy", "0.35em").attr("font-size", 10.5).attr("fill", "#2b2f36").text(d.place);
        } else if (x(d.from) > nextFree) {
          const short = truncate(d.place, 24);
          g.append("text").attr("x", x(d.from)).attr("y", placeTop + PLACE_H + 12 + (i % 2) * 11).attr("font-size", 9.5).attr("fill", "#5b6670").text(short);
          nextFree = x(d.from) + textWidth(short, 9.5) + 6;
        }
      });
      placeG.transition().delay((d) => delayFor(d.from)).duration(300).attr("opacity", 1);
    }

    // Who was alive around them: a stacked step area.
    if (household.length) {
      heading(houseTop - 10, "THE FAMILY ALIVE AROUND THEM");
      const most = Math.max(...household.map((h) => h.parents + h.spouses + h.children + h.grandchildren));
      const yH = scaleLinear().domain([0, most]).range([houseTop + HOUSE_H, houseTop]);
      let below = household.map(() => 0);
      HOUSE_KEYS.forEach(({ key, colour }) => {
        const base = below;
        const top = household.map((h, i) => base[i] + h[key]);
        if (!household.some((h) => h[key])) return;
        root
          .append("path")
          .datum(household.map((h, i) => ({ year: h.year, y0: base[i], y1: top[i] })))
          .attr("d", d3area().x((d) => x(d.year)).y0((d) => yH(d.y0)).y1((d) => yH(d.y1)).curve(curveStepAfter))
          .attr("fill", colour)
          .attr("fill-opacity", 0.75)
          .attr("opacity", 0)
          .transition()
          .delay(700)
          .duration(500)
          .attr("opacity", 1);
        below = top;
      });
      root.append("text").attr("x", SIDE - 6).attr("y", yH(most)).attr("dy", "0.35em").attr("text-anchor", "end").attr("font-size", 9.5).attr("fill", "#6b7785").text(most);
      root.append("line").attr("x1", x(line.start)).attr("x2", x(line.end)).attr("y1", houseTop + HOUSE_H).attr("y2", houseTop + HOUSE_H).attr("stroke", "#c9ccd1");
      const keys = HOUSE_KEYS.filter(({ key }) => household.some((h) => h[key]));
      let kx = x(line.start);
      keys.forEach(({ label, colour }) => {
        root.append("rect").attr("x", kx).attr("y", houseTop + HOUSE_H + 8).attr("width", 9).attr("height", 9).attr("rx", 2).attr("fill", colour);
        root.append("text").attr("x", kx + 13).attr("y", houseTop + HOUSE_H + 16).attr("font-size", 10).attr("fill", "#5b6670").text(label);
        kx += textWidth(label, 10) + 32;
      });
    }

    // World events.
    if (history.length) {
      heading(historyTop - 12, "THE WORLD AROUND THEM");
      const bars = root
        .append("g")
        .selectAll("g")
        .data(history)
        .join("g")
        .attr("transform", (d) => `translate(0,${historyTop + d.lane * LANE_H})`)
        .attr("opacity", 0)
        .style("cursor", "help")
        .on("mousemove", (event, d) =>
          showTip(event, `<b>${escapeText(eventYears(d.event))}</b> · ${d.age ? `aged ${d.age}` : "born during it"}<div>${escapeText(d.event.label)}</div>`)
        )
        .on("mouseleave", hideTip);
      bars
        .append("rect")
        .attr("x", (d) => d.x0)
        .attr("y", 0)
        .attr("width", (d) => d.barEnd - d.x0)
        .attr("height", 6)
        .attr("rx", 3)
        .attr("fill", (d) => EVENT_KIND_COLOURS[d.event.kind] || "#7f8c9a");
      bars
        .append("text")
        .attr("x", (d) => d.x0)
        .attr("y", 16)
        .attr("font-size", 10)
        .attr("fill", (d) => EVENT_KIND_COLOURS[d.event.kind] || "#5b6670")
        .text((d) => d.label);
      bars.transition().delay((d) => delayFor(Math.max(d.event.start, line.start)) + 200).duration(300).attr("opacity", 1);
    }

    // The scrubber: year and age wherever the pointer is.
    const scrub = root.append("g").attr("pointer-events", "none").attr("opacity", 0);
    const scrubLine = scrub.append("line").attr("y1", 26).attr("y2", height - 6).attr("stroke", "#2f6fb3").attr("stroke-width", 1).attr("stroke-dasharray", "3 3");
    const scrubPill = scrub.append("rect").attr("y", 4).attr("height", 19).attr("rx", 9).attr("fill", "#2f6fb3");
    const scrubText = scrub.append("text").attr("y", 17.5).attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", 700).attr("fill", "#fff");
    svg
      .on("mousemove.scrub", (event) => {
        const [px] = pointer(event, svg.node());
        const year = Math.round(x.invert(px));
        if (year < line.start || year > line.end) {
          scrub.attr("opacity", 0);
          return;
        }
        const h = (line.household || []).find((item) => item.year === year);
        const around = h ? HOUSE_KEYS.filter(({ key }) => h[key]).map(({ key, label }) => `${h[key]} ${key === "spouses" ? "spouse" : label.toLowerCase()}`) : [];
        const place = (line.places || []).find((p) => p.from <= year && year < p.to) || (line.places || []).slice(-1).find((p) => p.from <= year);
        const text = [`${year} · aged ${year - line.start}`, place ? shortTown(place.place) : "", ...around].filter(Boolean).join(" · ");
        const w = textWidth(text, 11) + 16;
        scrubLine.attr("x1", x(year)).attr("x2", x(year));
        const cx = Math.min(WIDTH - 4 - w / 2, Math.max(4 + w / 2, x(year))); // (kept inside the chart)
        scrubPill.attr("x", cx - w / 2).attr("width", w);
        scrubText.attr("x", cx).text(text);
        scrub.attr("opacity", 1);
      })
      .on("mouseleave.scrub", () => scrub.attr("opacity", 0));

    // Legend.
    const legend = popup.querySelector(".wbe-chart-legend");
    const kinds = [...new Set(family.map((e) => e.kind))].filter((kind) => kind !== "death");
    legend.innerHTML = kinds
      .map((kind) => `<span class="wbe-chart-legend-item"><i style="background:${KIND_COLOURS[kind]}"></i>${escapeText(LIFE_EVENT_KINDS[kind].label)}</span>`)
      .join("");
  }

  render();
  centrePopup(popup);
  raiseAboveOtherPopups(popup);
  if ($.fn.draggable) $(popup).draggable({ handle: ".chat-popup-header" });
  popup.querySelector(".chat-popup-header").addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleChartFullScreen(popup);
  });

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, line.self.wtid);
    else if (button.dataset.act === "history" || button.dataset.act === "minor") {
      state[button.dataset.act] = !state[button.dataset.act];
      button.classList.toggle("active", !state[button.dataset.act]);
      render();
    } else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") saveChart(svg.node(), options.fileBase || `life-line-${String(line.self.wtid || "").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
  });
  return popup;
}
