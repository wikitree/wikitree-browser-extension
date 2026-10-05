// The completeness heatmap popup, drawn with d3 (2026-10-04, the "Wow!" list). The
// pedigree as a grid: a row per generation (parents at the top), a column per branch
// (16 great-great-grandparents by default; 8 or 32 on the toolbar). Near generations
// are one cell per ancestor; further back each cell is one branch. "Profile
// completeness" (the default when the scores were loaded; the user: completeness means
// the Gold Standard) colours a cell by how complete its profiles are against the Gold
// Standard checklist (chat_profile_quality_data.js); "Ancestors found" by the share of
// ancestors on WikiTree. Cells fill in row by row.
// Data comes from buildCompletenessGrid in chat_completeness_data.js.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { interpolateYlGn } from "d3-scale-chromatic";
import { easeCubicOut } from "d3-ease";
import { buildCompletenessGrid, HEATMAP_BRANCH_GENERATIONS } from "./chat_completeness_data";
import { ancestorWord, generationLabel } from "./chat_kin_labels";
import { researchStatusLabel } from "./chat_profile_quality_data";
import { chartPopupControls, centrePopup, chartLinkButtons, chartLinkClick, escapeText, injectChartStyles, profileUrl, raiseAboveOtherPopups, saveChart, textColourFor, toggleChartFullScreen, truncate } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WIDTH = 960;
const HEIGHT = 560;
const MARGIN = { top: 92, right: 16, bottom: 12, left: 206 };
const EMPTY = "#f3e3e3";
const NO_PROFILE = "#eceef1";
const MEASURES = [
  { key: "profiles", label: "Profile completeness" },
  { key: "found", label: "Ancestors found" },
];

/** The cell colour for a share found (0–1). */
export function heatColour(share) {
  return share > 0 ? interpolateYlGn(0.18 + 0.77 * share) : EMPTY;
}

/** slots: from buildFanSlots. options: {title, links, rootKey, onOpenBranch(wtid)}. */
export function showCompletenessHeatmapPopup(slots, options = {}) {
  $("#wbe-heatmap-popup").remove();
  injectChartStyles();
  const hasQuality = slots.some((person) => person?.quality);
  const state = { branchGeneration: 4, measure: hasQuality ? "profiles" : "found" };

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-heatmap-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Fill it in again">Replay</button>
        ${chartLinkButtons(options.links)}
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${
          hasQuality
            ? `${MEASURES.map((m) => `<button type="button" class="wbe-chart-mode" data-measure="${m.key}">${m.label}</button>`).join("")}<span style="width:12px"></span>`
            : ""
        }
        ${HEATMAP_BRANCH_GENERATIONS.map((level) => `<button type="button" class="wbe-chart-mode" data-level="${level}">${2 ** level} branches</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span class="wbe-heatmap-hint" style="opacity:.65"></span>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-stats"></div><div class="wbe-chart-legend"></div></div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Completeness heatmap";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");
  svg.append("rect").attr("width", WIDTH).attr("height", HEIGHT).attr("fill", "#ffffff");
  const g = svg.append("g");

  const nameOf = (person) => person?.name || person?.wtid || "";
  const named = (value) => value && !/^unknown$/i.test(value);
  const surnameOf = (person) => (named(person?.lnab) ? person.lnab : named(person?.name) ? person.name : "Unnamed");

  const profiles = () => state.measure === "profiles";
  /** The cell's value 0–1, or null when there's nothing to score. */
  const valueOf = (cell) => (profiles() ? cell.quality ?? null : cell.found / cell.possible);
  const fillOf = (cell) => {
    const value = valueOf(cell);
    return value === null ? NO_PROFILE : heatColour(value);
  };
  const percentText = (value) => `${Math.round(100 * value)}%`;

  function qualityLines(person) {
    const quality = person?.quality;
    if (!quality) return "";
    const status = researchStatusLabel(quality.researchStatus);
    const missing = quality.missing.slice(0, 6);
    return `<div>Profile completeness: <b>${percentText(quality.score)}</b>${status ? ` · ${escapeText(status)}` : ""}</div>
      ${missing.length ? `<div style="opacity:.8">Missing: ${escapeText(missing.join(", "))}${quality.missing.length > 6 ? "…" : ""}</div>` : `<div style="opacity:.8">Meets the whole checklist</div>`}`;
  }

  function tipHtml(grid, row, cell) {
    const heading = `<div class="wbe-chart-tip-rel">${escapeText(generationLabel(row.generation))} · generation ${row.generation}</div>`;
    if (cell.possible === 1) {
      if (cell.person) {
        return `${heading}<b>${escapeText(nameOf(cell.person))}</b> <span style="opacity:.7">(${escapeText(cell.person.wtid || "")})</span>
          ${qualityLines(cell.person)}
          <div class="wbe-chart-tip-hint">Click to open the profile</div>`;
      }
      const child = slots[Math.floor(cell.slot / 2)];
      const which = cell.slot % 2 === 0 ? "father" : "mother";
      return `${heading}<b>Not on WikiTree yet</b><div>${child ? `${escapeText(nameOf(child))}'s ${which}` : `An unknown ${ancestorWord(row.generation, which === "father" ? "Male" : "Female").toLowerCase()}`}</div>`;
    }
    const branch = grid.branches[cell.col];
    const percent = Math.round((100 * cell.found) / cell.possible);
    return `${heading}<b>${branch.person ? `${escapeText(nameOf(branch.person))}'s branch` : "An unknown ancestor's branch"}</b>
      <div>${cell.found} of ${cell.possible} found (${percent}%)</div>
      ${cell.quality !== null && cell.quality !== undefined ? `<div>Their profiles average <b>${percentText(cell.quality)}</b> complete</div>` : ""}
      ${branch.person?.wtid ? `<div class="wbe-chart-tip-hint">Click to open this branch's fan chart</div>` : ""}`;
  }

  function showTip(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 110)}px`;
    tip.style.opacity = "1";
  }

  function openCell(grid, cell) {
    if (cell.possible === 1) {
      if (cell.person?.wtid) window.open(profileUrl(cell.person.wtid), "_blank");
      return;
    }
    const branch = grid.branches[cell.col];
    if (!branch.person?.wtid) return;
    if (options.onOpenBranch) {
      popup._wbeLeaveFullScreen?.(); // (a full-screen chart would hide the new one)
      options.onOpenBranch(branch.person.wtid);
    } else window.open(profileUrl(branch.person.wtid), "_blank");
  }

  function draw({ animate = true } = {}) {
    g.selectAll("*").remove();
    tip.style.opacity = "0";
    const grid = buildCompletenessGrid(slots, state.branchGeneration);
    popup.querySelectorAll(".wbe-chart-mode[data-measure]").forEach((b) => b.classList.toggle("active", b.dataset.measure === state.measure));
    popup.querySelector(".wbe-heatmap-hint").textContent = profiles()
      ? "Greener = closer to the Gold Standard · hover for what's missing"
      : "Greener = more ancestors found · click a branch to open its fan chart";
    popup.querySelectorAll(".wbe-chart-mode[data-level]").forEach((b) => {
      const level = Number(b.dataset.level);
      b.classList.toggle("active", level === grid.branchGeneration);
      b.disabled = level > grid.generations;
    });
    const cellW = (WIDTH - MARGIN.left - MARGIN.right) / grid.columns;
    const cellH = Math.min(52, (HEIGHT - MARGIN.top - MARGIN.bottom) / grid.generations);
    const x = (col) => MARGIN.left + col * cellW;
    const y = (generation) => MARGIN.top + (generation - 1) * cellH;

    // Branch names along the top, slanted so 32 fit.
    grid.branches.forEach((branch, col) => {
      const label = branch.person ? surnameOf(branch.person) : "?";
      g.append("text")
        .attr("transform", `translate(${x(col) + cellW / 2 + 3},${MARGIN.top - 8}) rotate(-40)`)
        .attr("font-size", grid.columns > 16 ? 10 : 12)
        .attr("fill", branch.person ? "#333" : "#aaa")
        .text(truncate(label, 14))
        .append("title")
        .text(branch.person ? `${nameOf(branch.person)} (${branch.person.wtid})` : "Not on WikiTree yet");
    });

    grid.rows.forEach((row) => {
      const rowValue = profiles() ? row.quality : row.found / row.possible;
      const percent = rowValue === null ? null : Math.round(100 * rowValue);
      g.append("text")
        .attr("x", 8)
        .attr("y", y(row.generation) + cellH / 2)
        .attr("dy", "0.35em")
        .attr("font-size", 12.5)
        .attr("fill", "#333")
        .text(generationLabel(row.generation));
      g.append("text")
        .attr("x", MARGIN.left - 10)
        .attr("y", y(row.generation) + cellH / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("fill", percent === 100 ? "#2a7a3b" : percent ? "#555" : "#b55")
        .text(percent === null ? "–" : `${percent}%`);

      const cells = g
        .append("g")
        .selectAll("g")
        .data(row.cells)
        .join("g")
        .attr("transform", (cell) => `translate(${x(cell.col)},${y(row.generation)})`)
        .style("cursor", (cell) => ((cell.possible === 1 ? cell.person : grid.branches[cell.col].person) ? "pointer" : "default"))
        .attr("opacity", animate ? 0 : 1)
        .on("mousemove", (event, cell) => showTip(event, tipHtml(grid, row, cell)))
        .on("mouseleave", () => {
          tip.style.opacity = "0";
        })
        .on("click", (event, cell) => openCell(grid, cell));
      cells
        .append("rect")
        .attr("x", 1)
        .attr("y", 1)
        .attr("rx", 3)
        .attr("width", (cell) => cell.span * cellW - 2)
        .attr("height", cellH - 2)
        .attr("fill", fillOf);
      cells
        .append("text")
        .attr("x", (cell) => (cell.span * cellW) / 2)
        .attr("y", cellH / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", (cell) => (cell.span * cellW < 40 ? 9.5 : 11.5))
        .attr("pointer-events", "none")
        .attr("fill", (cell) => textColourFor(fillOf(cell)))
        .text((cell) => {
          const width = cell.span * cellW;
          const value = valueOf(cell);
          if (cell.possible > 1) return width >= 26 ? (value === null ? "–" : percentText(value)) : "";
          if (!cell.person) return width >= 26 ? "?" : "";
          if (profiles() && value !== null) {
            if (width >= 110) return `${truncate(nameOf(cell.person), Math.floor(width / 7) - 5)} ${percentText(value)}`;
            return width >= 26 ? percentText(value) : "";
          }
          return width >= 60 ? truncate(nameOf(cell.person), Math.floor(width / 7)) : width >= 26 ? "✓" : "";
        });
      if (animate) {
        cells
          .transition()
          .delay((cell) => row.generation * 110 + cell.col * 6)
          .duration(380)
          .ease(easeCubicOut)
          .attr("opacity", 1);
      }
    });
    drawFooter(grid);
  }

  function drawFooter(grid) {
    const found = grid.rows.reduce((sum, row) => sum + row.found, 0);
    const possible = grid.rows.reduce((sum, row) => sum + row.possible, 0);
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const swatch = (colour, label) => `<span><i style="background:${colour};border:1px solid #ddd"></i>${label}</span>`;
    if (profiles()) {
      const scored = grid.rows.reduce((sum, row) => sum + row.scored, 0);
      const total = grid.rows.reduce((sum, row) => sum + (row.quality || 0) * row.scored, 0);
      popup.querySelector(".wbe-chart-stats").innerHTML = `<strong>${scored ? percentText(total / scored) : "–"}</strong>average profile completeness · ${scored.toLocaleString()} profiles (Gold Standard checklist)`;
      popup.querySelector(".wbe-chart-legend").innerHTML = [swatch(NO_PROFILE, "No profile"), ...steps.map((share) => swatch(heatColour(share), percentText(share)))].join("");
      return;
    }
    popup.querySelector(".wbe-chart-stats").innerHTML = `<strong>${possible ? Math.round((100 * found) / possible) : 0}%</strong>${found.toLocaleString()} of ${possible.toLocaleString()} ancestors in ${grid.generations} generations`;
    popup.querySelector(".wbe-chart-legend").innerHTML = steps.map((share) => swatch(heatColour(share), share ? percentText(share) : "None found")).join("");
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, slots[1]?.wtid || options.rootKey);
    else if (button.dataset.measure) {
      state.measure = button.dataset.measure;
      draw();
    } else if (button.dataset.level) {
      state.branchGeneration = Number(button.dataset.level);
      draw();
    } else if (button.dataset.act === "replay") draw();
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      saveChart(svg.node(), `completeness-heatmap-${String(slots[1]?.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });

  draw();
  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  return popup;
}
