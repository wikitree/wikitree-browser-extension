// The family size popup (2026-10-04, the "Wow!" visuals): a row per generation, the
// oldest at the top; in each row a column per ancestral couple with a dot per child
// (blue sons, pink daughters, a hollow dot for a child who died before 5, a gold ring
// for the child on the line). A thin link drops from that child to the family they
// went on to have in the row below. Data comes from chat_family_size_data.js.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { easeBackOut } from "d3-ease";
import { DIED_YOUNG_AGE } from "./chat_family_size_data";
import { centrePopup, chartLinkButtons, chartLinkClick, escapeText, injectChartStyles, profileUrl, raiseAboveOtherPopups, saveChart, toggleChartFullScreen, truncate } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WIDTH = 1000;
const LEFT = 150;
const RIGHT = 130;
const TOP = 16;
const ROW_GAP = 34;
const GENDER_COLOURS = { Male: "#4f86d0", Female: "#e0709b", "": "#9aa3ad" };
const LINE_RING = "#f2b01e";

// The parents' names under each family: flat when the column is wide, turned on their side
// when it's narrow (two names from 22px, the father's surname alone below that).
const NAME_FONT = 9.5;
const ROTATED_CHARS = 18;
const nameLayout = (colWidth) => (colWidth >= 64 ? "flat" : colWidth >= 22 ? "rotated" : colWidth >= 11 ? "surname" : "none");
const labelSpace = (layout) => ({ flat: 54, rotated: 30 + ROTATED_CHARS * 5.4, surname: 30 + 14 * 5.4, none: 24 }[layout]);
const shortName = (person) => {
  if (!person) return "";
  const first = String(person.name || "").trim().split(/\s+/)[0] || "";
  const last = person.lnab || "";
  return first && last && first !== last ? `${first} ${last}` : person.name || person.wtid || "";
};

// The children stack from the top, eldest first (the same order as the tip).
const dotY = (band, couple, index) => band.base - (couple.children.length - 1 - index) * band.step;

const years = (child) => (child.birthYear ? `${child.birthYear}–${child.deathYear || ""}` : child.deathYear ? `d. ${child.deathYear}` : "");

/** data: from buildFamilySizes. options: {title, links, rootKey}. */
export function showFamilySizePopup(data, options = {}) {
  $("#wbe-family-size-popup").remove();
  injectChartStyles();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-family-size-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="sort" title="Order each row by family size, or by family tree position">Sort by size</button>
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        <span style="opacity:.65">One dot per child · hover a family for the names · click a dot to open the profile</span>
      </div>
      <div class="wbe-chart-stage" style="overflow-y:auto"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`;
  popup.insertAdjacentHTML(
    "afterbegin",
    `<style>
      #wbe-family-size-popup text.wbe-fs-hot { fill: #0b5cad; font-weight: 700; text-decoration: underline; }
      #wbe-family-size-popup circle.wbe-fs-hot { stroke: #0b5cad; stroke-width: 3px; }
    </style>`
  );
  document.body.appendChild(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Family size";
  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const state = { sortBySize: false };
  let svg = null;

  function showTip(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 300)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + stage.scrollTop + 14, stage.scrollTop + rect.height - 160)}px`;
    tip.style.opacity = "1";
  }
  const hideTip = () => (tip.style.opacity = "0");

  function coupleTip(couple) {
    const names = [couple.father?.name, couple.mother?.name].filter(Boolean).map(escapeText).join(" &amp; ") || "Unnamed couple";
    const span = couple.firstYear ? ` · ${couple.firstYear === couple.lastYear ? couple.firstYear : `${couple.firstYear}–${couple.lastYear}`}` : "";
    const list = couple.children
      .map(
        (child) =>
          `<div${child.onLine ? ' style="font-weight:700"' : ""}>${escapeText(child.name)}${years(child) ? ` <span style="opacity:.7">(${escapeText(years(child))})</span>` : ""}${
            child.diedYoung ? ` <span style="color:#a33">died young</span>` : ""
          }</div>`
      )
      .join("");
    return `<b>${names}</b><div style="opacity:.75">${couple.children.length} ${couple.children.length === 1 ? "child" : "children"} recorded${span}</div>${list}`;
  }

  function render() {
    stage.querySelector("svg")?.remove();
    hideTip();
    const rows = [...data.rows].reverse(); // oldest at the top
    const plotWidth = WIDTH - LEFT - RIGHT;
    // Each row: the families that are on WikiTree, spread evenly in family tree order (a
    // father's side on the left), so a sparse tree doesn't leave them bunched in the middle.
    let y = TOP;
    const laid = rows.map((row) => {
      const order = state.sortBySize ? [...row.couples].sort((a, b) => b.children.length - a.children.length || a.slot - b.slot) : [...row.couples].sort((a, b) => a.slot - b.slot);
      const colWidth = Math.min(110, plotWidth / order.length);
      const left = LEFT + (plotWidth - colWidth * order.length) / 2;
      const r = Math.max(2.5, Math.min(7, colWidth / 2 - 2));
      const step = r * 2 + 1.5;
      const most = Math.max(...row.couples.map((couple) => couple.children.length));
      const names = nameLayout(colWidth);
      const top = y;
      const base = top + most * step + 4;
      const height = base - top + labelSpace(names);
      y += height + ROW_GAP;
      const childNames = colWidth >= 64;
      const columns = order.map((couple, index) => {
        const cx = left + colWidth * (index + 0.5);
        return { couple, cx, dx: childNames ? cx - colWidth / 2 + r + 6 : cx };
      });
      return { row, top, height, base, bottom: top + height, names, childNames, r, step, colWidth, columns };
    });
    const totalHeight = y + 4;

    svg = select(stage)
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("font-family", FONT)
      .attr("viewBox", `0 0 ${WIDTH} ${totalHeight}`)
      .style("height", "auto");
    const root = svg.append("g");
    const columnOf = new Map(); // child slot → {cx, top of its column}
    laid.forEach((band) => band.columns.forEach((column) => columnOf.set(column.couple.slot, { cx: column.cx, dx: column.dx, band, couple: column.couple })));

    // Links: from the child on the line down to the family they went on to have.
    const links = root.append("g").attr("fill", "none").attr("stroke", LINE_RING).attr("stroke-opacity", 0.55).attr("stroke-width", 1.3);
    laid.forEach((band) =>
      band.columns.forEach((column) => {
        const index = column.couple.children.findIndex((child) => child.onLine);
        const below = columnOf.get(Math.floor(column.couple.slot / 2));
        if (index < 0 || !below || column.couple.slot < 2) return;
        const x1 = column.dx;
        const y1 = dotY(band, column.couple, index);
        const x2 = below.dx;
        const y2 = dotY(below.band, below.couple, 0) - below.band.r - 3;
        const mid = (band.bottom + y2) / 2;
        links.append("path").attr("d", `M${x1},${y1 + band.r}L${x1},${band.bottom}C${x1},${mid} ${x2},${mid} ${x2},${y2}`);
      })
    );

    laid.forEach((band, bandIndex) => {
      const { row } = band;
      // Row label and the average as a bar on the right.
      root.append("text").attr("x", 10).attr("y", band.base - 16).attr("font-size", 12.5).attr("font-weight", 700).attr("fill", "#2b2f36").text(row.label);
      root
        .append("text")
        .attr("x", 10)
        .attr("y", band.base)
        .attr("font-size", 10.5)
        .attr("fill", "#6b7785")
        .text(`${row.couples.length} ${row.couples.length === 1 ? "family" : "families"}${row.decade ? ` · ${row.decade}s` : ""}`);
      const most = Math.max(...data.rows.map((r) => r.average || 0), 1);
      const barX = WIDTH - RIGHT + 16;
      root.append("rect").attr("x", barX).attr("y", band.base - 9).attr("height", 10).attr("rx", 3).attr("fill", "#e08a2e").attr("fill-opacity", 0.8).attr("width", 0)
        .attr("data-w", ((RIGHT - 60) * (row.average || 0)) / most)
        .transition().delay(300 + bandIndex * 120).duration(500).attr("width", ((RIGHT - 60) * (row.average || 0)) / most);
      root.append("text").attr("x", barX).attr("y", band.base - 14).attr("font-size", 10).attr("fill", "#6b7785").text("average");
      root.append("text").attr("x", barX + ((RIGHT - 60) * (row.average || 0)) / most + 5).attr("y", band.base).attr("font-size", 11.5).attr("font-weight", 700).attr("fill", "#2b2f36").text(row.average);
      root.append("line").attr("x1", LEFT).attr("x2", WIDTH - RIGHT).attr("y1", band.base + 6).attr("y2", band.base + 6).attr("stroke", "#000").attr("stroke-opacity", 0.08);

      const column = root
        .append("g")
        .selectAll("g")
        .data(band.columns)
        .join("g")
        .on("mousemove", (event, d) => showTip(event, coupleTip(d.couple)))
        .on("mouseleave", hideTip);
      // (an invisible hit area, so a family is easy to hover)
      column
        .append("rect")
        .attr("x", (d) => d.cx - band.colWidth / 2)
        .attr("y", band.top)
        .attr("width", band.colWidth)
        .attr("height", band.base - band.top + band.r + 4)
        .attr("fill", "transparent");
      // The count under each family, when the column is wide enough.
      if (band.colWidth >= 14) {
        column
          .append("text")
          .attr("x", (d) => d.cx)
          .attr("y", band.base + 18)
          .attr("text-anchor", "middle")
          .attr("font-size", band.colWidth >= 24 ? 10 : 8.5)
          .attr("fill", "#6b7785")
          .text((d) => d.couple.children.length);
      }
      // The parents' names, each a link to the profile (a white halo keeps them clear of the links).
      if (band.names !== "none") {
        column.each(function (d) {
          const people = band.names === "surname" ? [d.couple.father || d.couple.mother] : [d.couple.father, d.couple.mother];
          people.forEach((person, index) => {
            if (!person) return;
            const label = band.names === "surname" ? person.lnab || shortName(person) : shortName(person);
            const flat = band.names === "flat";
            const x = flat ? d.cx : d.cx + (people.length === 2 ? (index ? 5.5 : -5.5) : 0);
            const y = flat ? band.base + 32 + index * 12 : band.base + 26;
            const text = select(this)
              .append("text")
              .attr("x", x)
              .attr("y", y)
              .attr("font-size", NAME_FONT)
              .attr("fill", person.gender === "Female" ? "#a8426b" : person.gender === "Male" ? "#2f5f9e" : "#2b2f36")
              .attr("stroke", "#fff")
              .attr("stroke-width", 3)
              .attr("paint-order", "stroke")
              .attr("text-anchor", flat ? "middle" : "end")
              .attr("dominant-baseline", flat ? "auto" : "middle")
              .attr("transform", flat ? null : `rotate(-90 ${x} ${y})`)
              .style("cursor", person.wtid ? "pointer" : "default")
              .text(truncate(label, flat ? Math.floor(band.colWidth / 5.2) : band.names === "surname" ? 14 : ROTATED_CHARS));
            text.attr("data-person", person.id).classed("wbe-fs-link", !!person.wtid);
            text.append("title").text(`${person.name || person.wtid}${person.wtid ? ` (${person.wtid})` : ""}: open the profile`);
            if (person.wtid) text.on("click", () => window.open(profileUrl(person.wtid), "_blank", "noopener,noreferrer"));
          });
        });
      }
      column.each(function (d) {
        select(this)
          .selectAll("circle")
          .data(d.couple.children)
          .join("circle")
          .attr("cx", d.dx)
          .attr("cy", (child, i) => dotY(band, d.couple, i))
          .attr("r", 0)
          .attr("fill", (child) => (child.diedYoung ? "#fff" : GENDER_COLOURS[child.gender] || GENDER_COLOURS[""]))
          .attr("stroke", (child) => (child.onLine ? LINE_RING : child.diedYoung ? GENDER_COLOURS[child.gender] || "#5b6670" : "#fff"))
          .attr("stroke-width", (child) => (child.onLine ? 2.4 : child.diedYoung ? 1.6 : 0.8))
          .style("cursor", (child) => (child.wtid ? "pointer" : "default"))
          .on("click", (event, child) => child.wtid && window.open(profileUrl(child.wtid), "_blank", "noopener,noreferrer"))
          .attr("data-r", band.r)
          .attr("data-person", (child) => child.id)
          .classed("wbe-fs-link", (child) => !!child.wtid)
          .transition()
          .delay((child, i) => 150 + bandIndex * 160 + i * 35)
          .duration(380)
          .ease(easeBackOut)
          .attr("r", band.r);
        // Each child's first name beside their dot, when the column is wide enough.
        if (!band.childNames) return;
        const room = Math.floor((band.colWidth - 2 * band.r - 14) / 5.3);
        select(this)
          .selectAll("text.child")
          .data(d.couple.children)
          .join("text")
          .attr("class", (child) => `child${child.wtid ? " wbe-fs-link" : ""}`)
          .attr("data-person", (child) => child.id)
          .attr("x", d.dx + band.r + 4)
          .attr("y", (child, i) => dotY(band, d.couple, i))
          .attr("dominant-baseline", "middle")
          .attr("font-size", NAME_FONT)
          .attr("font-weight", (child) => (child.onLine ? 700 : 400))
          .attr("font-style", (child) => (child.diedYoung ? "italic" : null))
          .attr("fill", (child) => (child.diedYoung ? "#7d8a96" : "#2b2f36"))
          .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .attr("paint-order", "stroke")
          .style("cursor", (child) => (child.wtid ? "pointer" : "default"))
          .text((child) => truncate(String(child.name || "").trim().split(/\s+/)[0] || "?", room))
          .on("click", (event, child) => child.wtid && window.open(profileUrl(child.wtid), "_blank", "noopener,noreferrer"));
      });
    });

    // (a hidden tab pauses the grow-in, so draw the end state straight away)
    if (document.hidden) finishAnimations();

    // Legend.
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = [
      ["Son", GENDER_COLOURS.Male, ""],
      ["Daughter", GENDER_COLOURS.Female, ""],
      [`Died before ${DIED_YOUNG_AGE}`, "#fff", "box-shadow:inset 0 0 0 2px #7d8a96"],
      ["On the line (links to their own family)", "#fff", `box-shadow:inset 0 0 0 2.5px ${LINE_RING}`],
    ]
      .map(([label, colour, extra]) => `<span class="wbe-chart-legend-item"><i style="background:${colour};border-radius:50%;${extra}"></i>${escapeText(label)}</span>`)
      .join("");
  }

  // Jumps every grow-in to its end, so a save mid-animation isn't left with half-drawn dots.
  function finishAnimations() {
    if (!svg) return;
    svg.selectAll("[data-r]").interrupt().attr("r", function () {
      return this.getAttribute("data-r");
    });
    svg.selectAll("[data-w]").interrupt().attr("width", function () {
      return this.getAttribute("data-w");
    });
  }

  // Hover a dot or a name: it and the same person's other mark light up.
  function highlight(event, on) {
    const id = event.target.closest?.("[data-person]")?.getAttribute("data-person");
    if (!id || !svg) return;
    svg.selectAll(`[data-person="${CSS.escape(id)}"]`).classed("wbe-fs-hot", on);
  }
  stage.addEventListener("mouseover", (event) => highlight(event, true));
  stage.addEventListener("mouseout", (event) => highlight(event, false));

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
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, options.rootKey);
    else if (button.dataset.act === "sort") {
      state.sortBySize = !state.sortBySize;
      button.textContent = state.sortBySize ? "Family tree order" : "Sort by size";
      render();
    } else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      finishAnimations();
      saveChart(svg.node(), `family-size-${String(options.rootKey || "").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });
  return popup;
}

