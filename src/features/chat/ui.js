import $ from "jquery";
import { formatDate, getRelationColour, getYearColour, familyColours } from "../../core/formatting";
import { escapeHtml } from "../../core/lib/diff_utils";
import { setHighestZIndex } from "../../core/common";
import { PersonName } from "../auto_bio/person_name";

/**
 * Normalize simple text for comparisons.
 * @param {any} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatConnectionPersonName(person) {
  const privateLongName = String(
    person?.LongNamePrivate ||
      person?.Derived?.LongNamePrivate ||
      person?.BirthNamePrivate ||
      person?.Derived?.BirthNamePrivate ||
      ""
  ).trim();
  const isPrivatePlaceholder = Number(person?.Id) < 0 && !String(person?.Name || "").trim();

  try {
    const personName = new PersonName(person || {});
    const pedigreeName = personName.withParts(["PedigreeName"]);
    if (typeof pedigreeName === "string" && pedigreeName.trim() && !pedigreeName.startsWith("Invalid name part")) {
      return pedigreeName.trim();
    }
  } catch (error) {
    // Ignore formatting errors and use a simple fallback
  }

  const fallbackName = `${person?.FirstName || ""} ${person?.LastNameCurrent || person?.LastNameAtBirth || ""}`.trim();
  return (
    fallbackName ||
    person?.RealName ||
    person?.Derived?.ShortName ||
    privateLongName ||
    person?.Name ||
    (isPrivatePlaceholder ? "Private" : "")
  );
}

function renderConnectionPersonLink(person, label) {
  const name = String(label || "").trim();
  const wtId = String(person?.Name || "").trim();
  if (!wtId) {
    return escapeHtml(name);
  }

  return `<a href="https://www.wikitree.com/wiki/${escapeHtml(wtId)}" target="_blank" rel="noopener">${escapeHtml(
    name
  )}</a>`;
}

const CONNECTION_DIAGRAM_MIN_SCALE = 0.35;
const CONNECTION_DIAGRAM_MAX_SCALE = 2.4;
const CONNECTION_DIAGRAM_SCALE_STEP = 0.2;
const CONNECTION_DIAGRAM_PRINT_MIN_SCALE = 0.1;
const CONNECTION_DIAGRAM_PRINT_MAX_SCALE = 4;
const MM_TO_CSS_PX = 96 / 25.4;

function buildConnectionsBranchKeyHtml(usedBranches) {
  if (!usedBranches.length || usedBranches.length <= 1) {
    return "";
  }

  return `<div class="connections-colour-key">
    <span class="connections-colour-key-label">Branch colours:</span>
    ${usedBranches
      .map(
        ({ index, colour }) =>
          `<span class="connections-colour-key-swatch" style="background:${colour};border:2px solid ${colour}">Branch ${
            index + 1
          }</span>`
      )
      .join("")}
  </div>`;
}

function buildConnectionsDiagramLayout(path, stepMeta, options = {}) {
  const layoutMode = options?.layoutMode === "compact" ? "compact" : "tree";
  const isCompact = layoutMode === "compact";
  const CARD_W = isCompact ? 220 : 180;
  const CARD_H = isCompact ? 104 : 112;
  const H_GAP = isCompact ? 20 : 36;
  const V_GAP = isCompact ? 22 : 40;
  const PAD = 20;
  const COL_STEP = CARD_W + H_GAP;
  const ROW_STEP = CARD_H + V_GAP;

  let pos = [];
  let totalW = PAD * 2 + CARD_W;
  let totalH = PAD * 2 + CARD_H;
  let svgPaths = "";
  const gens = [0];
  for (let i = 1; i < path.length; i++) {
    const rel = normalizeText(path[i].pathType || "");
    if (rel.includes("parent") || rel.includes("father") || rel.includes("mother")) {
      gens.push(gens[i - 1] - 1);
    } else if (rel.includes("child") || rel.includes("son") || rel.includes("daughter")) {
      gens.push(gens[i - 1] + 1);
    } else {
      gens.push(gens[i - 1]);
    }
  }

  const uniqueGens = [...new Set(gens)].sort((a, b) => a - b);
  const genToRow = new Map(uniqueGens.map((g, idx) => [g, idx]));
  const maxRow = uniqueGens.length - 1;
  const usedCells = new Set();
  const cols = [];
  let maxCol = 0;

  const buildCompactCandidates = (previousCol, sameRow, currentMaxCol) => {
    const candidates = [];
    if (sameRow) {
      for (let distance = 1; distance <= currentMaxCol + 1; distance++) {
        const leftCol = previousCol - distance;
        const rightCol = previousCol + distance;
        if (leftCol >= 0) {
          candidates.push(leftCol);
        }
        candidates.push(rightCol);
      }
    } else {
      for (let col = 0; col <= currentMaxCol + 1; col++) {
        candidates.push(col);
      }
    }
    return [...new Set(candidates.filter((value) => value >= 0))];
  };

  for (let i = 0; i < path.length; i++) {
    let col;
    if (i === 0) {
      col = 0;
    } else {
      const currentRow = genToRow.get(gens[i]);
      const previousRow = genToRow.get(gens[i - 1]);
      const previousCol = cols[i - 1];
      if (isCompact) {
        const candidateCols = buildCompactCandidates(previousCol, currentRow === previousRow, maxCol);
        col = candidateCols.find((candidate) => !usedCells.has(`${gens[i]},${candidate}`));
        if (!Number.isFinite(col)) {
          col = maxCol + 1;
        }
      } else {
        const rel = normalizeText(path[i].pathType || "");
        const isVertical =
          rel.includes("parent") ||
          rel.includes("father") ||
          rel.includes("mother") ||
          rel.includes("child") ||
          rel.includes("son") ||
          rel.includes("daughter");
        if (isVertical) {
          col = usedCells.has(`${gens[i]},${previousCol}`) ? maxCol + 1 : previousCol;
        } else {
          col = maxCol + 1;
        }
      }
    }
    cols.push(col);
    usedCells.add(`${gens[i]},${col}`);
    if (col > maxCol) {
      maxCol = col;
    }
  }

  totalW = PAD * 2 + (maxCol + 1) * COL_STEP - H_GAP;
  totalH = PAD * 2 + (maxRow + 1) * ROW_STEP - V_GAP;

  pos = path.map((_, i) => {
    const left = PAD + cols[i] * COL_STEP;
    const top = PAD + genToRow.get(gens[i]) * ROW_STEP;
    return {
      left,
      top,
      right: left + CARD_W,
      bottom: top + CARD_H,
      cx: left + CARD_W / 2,
      cy: top + CARD_H / 2,
    };
  });

  for (let i = 1; i < path.length; i++) {
    const a = pos[i - 1];
    const b = pos[i];
    const aRow = genToRow.get(gens[i - 1]);
    const bRow = genToRow.get(gens[i]);
    const sameRow = aRow === bRow;
    let x1, y1, x2, y2, cpx1, cpy1, cpx2, cpy2;
    if (sameRow) {
      const movingRight = b.left >= a.left;
      x1 = movingRight ? a.right : a.left;
      y1 = a.cy;
      x2 = movingRight ? b.left : b.right;
      y2 = b.cy;
      const mx = (x1 + x2) / 2;
      cpx1 = mx;
      cpy1 = y1;
      cpx2 = mx;
      cpy2 = y2;
    } else if (bRow < aRow) {
      x1 = a.cx;
      y1 = a.top;
      x2 = b.cx;
      y2 = b.bottom;
      const my = (y1 + y2) / 2;
      cpx1 = x1;
      cpy1 = my;
      cpx2 = x2;
      cpy2 = my;
    } else {
      x1 = a.cx;
      y1 = a.bottom;
      x2 = b.cx;
      y2 = b.top;
      const my = (y1 + y2) / 2;
      cpx1 = x1;
      cpy1 = my;
      cpx2 = x2;
      cpy2 = my;
    }
    svgPaths += `<path d="M${x1},${y1} C${cpx1},${cpy1} ${cpx2},${cpy2} ${x2},${y2}" stroke="#999" stroke-width="1.5" fill="none" marker-end="url(#conn-arr)"/>`;
  }

  if (pos.length) {
    totalW = Math.max(...pos.map((entry) => entry.right)) + PAD;
    totalH = Math.max(...pos.map((entry) => entry.bottom)) + PAD;
  }

  let cardsHtml = "";
  path.forEach((person, i) => {
    const { branchColour } = stepMeta[i];
    const p = pos[i];
    const name = formatConnectionPersonName(person);
    const initial = String(name[0] || "?").toUpperCase();
    const byRaw = (person.BirthDate || "").split("-")[0];
    const dyRaw = (person.DeathDate || "").split("-")[0];
    const by = byRaw && byRaw !== "0000" ? byRaw : "?";
    const dy = dyRaw && dyRaw !== "0000" ? dyRaw : "?";
    const rel = i === 0 ? "" : person.pathType || "";
    const arrow = i === 0 ? "" : getConnectionDirectionArrow(rel);
    const gender = normalizeText(person.Gender || "");
    const avatarBg = gender === "male" ? "#c8d8f0" : gender === "female" ? "#f5d0d4" : "#c8e6c9";
    const birthLoc = person.BirthLocation ? `Born: ${person.BirthLocation}` : "";
    const deathLoc = person.DeathLocation ? `Died: ${person.DeathLocation}` : "";
    const tooltip = [name, birthLoc, deathLoc].filter(Boolean).join(" · ");
    const avatarCircleStyle = `background:${avatarBg};border:2px solid ${avatarBg};`;
    const avatarPhotoStyle = `border:2px solid ${avatarBg};`;

    const photoUrl =
      person.Photo && person.PhotoData?.url && !person.PhotoData.url.match(".pdf")
        ? `https://wikitree.com${person.PhotoData.url}`
        : null;
    const avatarHtml = photoUrl
      ? `<img class="conn-diag-avatar conn-diag-avatar--photo" style="${avatarPhotoStyle}" src="${escapeHtml(
          photoUrl
        )}" alt="${escapeHtml(
          initial
        )}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="conn-diag-avatar" style="${avatarCircleStyle}display:none">${escapeHtml(initial)}</div>`
      : `<div class="conn-diag-avatar" style="${avatarCircleStyle}">${escapeHtml(initial)}</div>`;

    cardsHtml += `<div class="conn-diag-card" title="${escapeHtml(tooltip)}"
      data-card-index="${i}" data-card-left="${p.left}" data-card-top="${p.top}"
      style="left:${p.left}px;top:${p.top}px;width:${CARD_W}px;min-height:${CARD_H}px;border-color:${branchColour}">
      ${avatarHtml}
      <div class="conn-diag-body">
        <div class="conn-diag-name">${renderConnectionPersonLink(person, name)}</div>
        <div class="conn-diag-years">${escapeHtml(by)} – ${escapeHtml(dy)}</div>
        ${rel ? `<div class="conn-diag-rel">${arrow}${escapeHtml(rel)}</div>` : ""}
      </div>
    </div>`;
  });

  return { totalW, totalH, svgPaths, cardsHtml, layoutMode };
}

function buildConnectionsDiagramHtml(path, stepMeta, options = {}) {
  const standalone = Boolean(options?.standalone);
  const { totalW, totalH, svgPaths, cardsHtml, layoutMode } = buildConnectionsDiagramLayout(path, stepMeta, options);
  const scrollClasses = ["conn-diag-scroll"];
  if (standalone) {
    scrollClasses.push("conn-diag-scroll--standalone");
  }

  return `<div class="${scrollClasses.join(
    " "
  )}" data-base-width="${totalW}" data-base-height="${totalH}" data-layout-mode="${layoutMode}">
    <div class="conn-diag-scale-layer" style="width:${totalW}px;height:${totalH}px;">
      <div class="conn-diag-canvas" style="width:${totalW}px;height:${totalH}px;">
        <svg class="conn-diag-svg" width="${totalW}" height="${totalH}">
          <defs>
            <marker id="conn-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#999"/>
            </marker>
          </defs>
          ${svgPaths}
        </svg>
        ${cardsHtml}
      </div>
    </div>
  </div>`;
}

function getConnectionsDiagramElements(root) {
  const scrollEl = root?.querySelector(".conn-diag-scroll");
  const scaleLayer = root?.querySelector(".conn-diag-scale-layer");
  const canvas = root?.querySelector(".conn-diag-canvas");
  const baseWidth = Number.parseFloat(scrollEl?.dataset.baseWidth || "0");
  const baseHeight = Number.parseFloat(scrollEl?.dataset.baseHeight || "0");
  return { scrollEl, scaleLayer, canvas, baseWidth, baseHeight };
}

function applyConnectionsDiagramScale(root, nextScale, options = {}) {
  const { scrollEl, scaleLayer, canvas, baseWidth, baseHeight } = getConnectionsDiagramElements(root);
  if (!scrollEl || !scaleLayer || !canvas || !baseWidth || !baseHeight) {
    return 1;
  }

  const minScale = Number.isFinite(Number(options?.minScale)) ? Number(options.minScale) : CONNECTION_DIAGRAM_MIN_SCALE;
  const maxScale = Number.isFinite(Number(options?.maxScale)) ? Number(options.maxScale) : CONNECTION_DIAGRAM_MAX_SCALE;
  const safeScale = clamp(nextScale, minScale, maxScale);
  scaleLayer.style.width = `${Math.max(1, Math.round(baseWidth * safeScale))}px`;
  scaleLayer.style.height = `${Math.max(1, Math.round(baseHeight * safeScale))}px`;
  canvas.style.transform = `scale(${safeScale})`;
  canvas.style.transformOrigin = "top left";
  scrollEl.dataset.scale = String(safeScale);
  return safeScale;
}

function focusConnectionsDiagramCard(root, cardIndex = 0, margin = 24) {
  const { scrollEl } = getConnectionsDiagramElements(root);
  const card =
    root?.querySelector(`.conn-diag-card[data-card-index="${cardIndex}"]`) || root?.querySelector(".conn-diag-card");
  if (!scrollEl || !card) {
    return;
  }

  const scale = Number.parseFloat(scrollEl.dataset.scale || "1") || 1;
  const left = Number.parseFloat(card.dataset.cardLeft || "0") || 0;
  const top = Number.parseFloat(card.dataset.cardTop || "0") || 0;
  scrollEl.scrollLeft = Math.max(0, Math.round(left * scale - margin));
  scrollEl.scrollTop = Math.max(0, Math.round(top * scale - margin));
}

function computeConnectionsDiagramFitScale(root) {
  const { scrollEl, baseWidth, baseHeight } = getConnectionsDiagramElements(root);
  if (!scrollEl || !baseWidth || !baseHeight) {
    return 1;
  }

  const availableWidth = Math.max(1, scrollEl.clientWidth - 16);
  const availableHeight = Math.max(1, scrollEl.clientHeight - 16);
  return clamp(
    Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1),
    CONNECTION_DIAGRAM_MIN_SCALE,
    CONNECTION_DIAGRAM_MAX_SCALE
  );
}

function computeConnectionsDiagramPrintScale(root, options = {}) {
  const { baseWidth, baseHeight } = getConnectionsDiagramElements(root);
  if (!baseWidth || !baseHeight) {
    return 1;
  }

  const pageWidthMm = Number.isFinite(Number(options?.pageWidthMm)) ? Number(options.pageWidthMm) : 420;
  const pageHeightMm = Number.isFinite(Number(options?.pageHeightMm)) ? Number(options.pageHeightMm) : 297;
  const marginMm = Number.isFinite(Number(options?.marginMm)) ? Number(options.marginMm) : 8;
  const printableWidth = Math.max(1, (pageWidthMm - marginMm * 2) * MM_TO_CSS_PX);
  const printableHeight = Math.max(1, (pageHeightMm - marginMm * 2) * MM_TO_CSS_PX);

  return clamp(
    Math.min(printableWidth / baseWidth, printableHeight / baseHeight),
    CONNECTION_DIAGRAM_PRINT_MIN_SCALE,
    CONNECTION_DIAGRAM_PRINT_MAX_SCALE
  );
}

function getConnectionsDiagramStandaloneStyles() {
  return `
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1f2937;
      background: #f4f7fb;
    }
    .conn-diag-export-shell {
      width: 100%;
      max-width: none;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .conn-diag-export-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .conn-diag-export-title {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .conn-diag-export-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .conn-diag-export-actions button {
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 7px;
      padding: 0.48rem 0.82rem;
      cursor: pointer;
      font: inherit;
    }
    .conn-diag-export-actions button:hover {
      background: #edf4ff;
    }
    .conn-diag-scroll {
      overflow: auto;
      max-height: calc(100vh - 180px);
      padding: 4px;
    }
    .conn-diag-scroll--standalone {
      width: 100%;
      min-height: calc(100vh - 150px);
      overflow: auto;
      max-height: none;
      padding: 0;
      box-sizing: border-box;
    }
    .conn-diag-scroll--standalone .conn-diag-scale-layer {
      margin: 0 auto;
    }
    .conn-diag-scale-layer {
      position: relative;
    }
    .conn-diag-canvas {
      position: relative;
      transform-origin: top left;
    }
    .conn-diag-svg {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      overflow: visible;
    }
    .conn-diag-card {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 3px solid #ccc;
      background: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      font-size: 0.78em;
      line-height: 1.3;
      box-sizing: border-box;
    }
    .conn-diag-avatar {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1em;
      color: #444;
      align-self: flex-start;
      margin-top: 2px;
      overflow: hidden;
    }
    .conn-diag-avatar--photo {
      display: block;
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: 2px;
    }
    .conn-diag-body {
      min-width: 0;
    }
    .conn-diag-name {
      font-weight: 600;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .conn-diag-name a {
      color: #145799;
      text-decoration: none;
    }
    .conn-diag-name a:hover {
      text-decoration: underline;
    }
    .conn-diag-years {
      color: #555;
      white-space: nowrap;
    }
    .conn-diag-rel {
      color: #777;
      font-style: italic;
      white-space: nowrap;
    }
    .connections-colour-key {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding: 10px 0 0;
      font-size: 0.82em;
    }
    .connections-colour-key-label {
      font-weight: bold;
      margin-right: 2px;
    }
    .connections-colour-key-swatch {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 3px;
      white-space: nowrap;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .conn-diag-export-header {
        display: none;
      }
    }
    @page {
      size: A3 landscape;
      margin: 8mm;
    }
  `;
}

function openConnectionsDiagramDocument({
  title,
  path,
  stepMeta,
  usedBranches,
  layoutMode = "tree",
  printOnLoad = false,
}) {
  const exportWindow = window.open("", "_blank");
  if (!exportWindow) {
    return false;
  }

  const diagramHtml = buildConnectionsDiagramHtml(path, stepMeta, { layoutMode, standalone: true });
  const branchKeyHtml = buildConnectionsBranchKeyHtml(usedBranches);

  const applyPrintFitScale = () => {
    return applyConnectionsDiagramScale(
      exportWindow.document,
      computeConnectionsDiagramPrintScale(exportWindow.document),
      {
        minScale: CONNECTION_DIAGRAM_PRINT_MIN_SCALE,
        maxScale: CONNECTION_DIAGRAM_PRINT_MAX_SCALE,
      }
    );
  };
  const applyViewportFitScale = () => {
    return applyConnectionsDiagramScale(
      exportWindow.document,
      computeConnectionsDiagramFitScale(exportWindow.document)
    );
  };

  const triggerPrint = () => {
    try {
      exportWindow.focus();
    } catch (error) {
      // Ignore focus failures and still attempt to print.
    }
    exportWindow.print();
  };

  exportWindow.document.open();
  exportWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>${getConnectionsDiagramStandaloneStyles()}</style>
      </head>
      <body>
        <div class="conn-diag-export-shell">
          <div class="conn-diag-export-header">
            <div class="conn-diag-export-title">${escapeHtml(title)}</div>
            <div class="conn-diag-export-actions">
              <button type="button" id="conn-diag-print">Print / PDF</button>
            </div>
          </div>
          ${diagramHtml}
          ${branchKeyHtml}
        </div>
      </body>
    </html>`);
  exportWindow.document.close();

  const attachPrintHandlers = () => {
    const printButton = exportWindow.document.getElementById("conn-diag-print");
    if (printButton) {
      printButton.addEventListener("click", () => {
        applyPrintFitScale();
        triggerPrint();
      });
    }
    exportWindow.addEventListener("resize", applyViewportFitScale);
    exportWindow.addEventListener("beforeprint", applyPrintFitScale);
    exportWindow.setTimeout(applyViewportFitScale, 0);
    if (printOnLoad) {
      exportWindow.setTimeout(() => {
        applyPrintFitScale();
        triggerPrint();
      }, 300);
    }
  };

  if (exportWindow.document.readyState === "complete") {
    attachPrintHandlers();
  } else {
    exportWindow.addEventListener("load", attachPrintHandlers, { once: true });
  }
  return true;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Set reasonable min/max size and position for a popup element.
 * @param {HTMLElement} popup
 * @param {number|null} preferredLeft
 * @param {number|null} preferredTop
 * @param {number} margin
 */
export function setPopupPositionAndSize(popup, preferredLeft = null, preferredTop = null, margin = 10) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const left =
    preferredLeft !== null ? clamp(preferredLeft, margin, window.innerWidth - updated.width - margin) : updated.left;
  const top =
    preferredTop !== null ? clamp(preferredTop, margin, window.innerHeight - updated.height - margin) : updated.top;
  popup.style.position = "fixed";
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function positionPopupFixed(popup, preferredLeft, preferredTop) {
  const rect = popup.getBoundingClientRect();
  const maxLeft = Math.max(10, window.innerWidth - rect.width - 10);
  const maxTop = Math.max(10, window.innerHeight - rect.height - 10);
  popup.style.position = "fixed";
  popup.style.left = `${clamp(preferredLeft, 10, maxLeft)}px`;
  popup.style.top = `${clamp(preferredTop, 10, maxTop)}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function clampPopupToViewport(popup, margin = 10) {
  if (!popup) return;
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  const minHeight = Math.min(320, maxHeight);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.minHeight = `${minHeight}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  const rect = popup.getBoundingClientRect();
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const nextLeft = clamp(updated.left, margin, Math.max(margin, window.innerWidth - updated.width - margin));
  const nextTop = clamp(updated.top, margin, Math.max(margin, window.innerHeight - updated.height - margin));
  popup.style.left = `${nextLeft}px`;
  popup.style.top = `${nextTop}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function getPopupResizeLimits(margin = 10) {
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  return {
    minWidth: Math.min(400, maxWidth),
    minHeight: Math.min(320, maxHeight),
    maxWidth,
    maxHeight,
  };
}

export function positionPopupForOpen(popup) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  positionPopupFixed(popup, Math.round((window.innerWidth - rect.width) / 2), 10);
  clampPopupToViewport(popup);
}

/**
 * Return a directional arrow prefix for a pathType string.
 * Used by both the table and diagram views.
 */
function getConnectionDirectionArrow(pathType) {
  const rel = String(pathType || "")
    .trim()
    .toLowerCase();
  if (rel.includes("parent") || rel.includes("father") || rel.includes("mother")) return "↑ ";
  if (rel.includes("child") || rel.includes("son") || rel.includes("daughter")) return "↓ ";
  if (
    rel.includes("sibling") ||
    rel.includes("brother") ||
    rel.includes("sister") ||
    rel.includes("spouse") ||
    rel.includes("husband") ||
    rel.includes("wife")
  )
    return "↔ ";
  return "";
}

/**
 * Build the HTML for the card-based diagram view of a connection path.
 *
 * Layout: Y-axis = generation level (parents above, children below, same row
 * for spouses/siblings). X-axis = column within each generation level, assigned
 * in order of first appearance. Each step has a unique (col, genRow) cell so
 * cards never overlap. Bezier SVG connectors link consecutive steps.
 *
 * @param {Array}  path      – the path array from the connections result
 * @param {Array}  stepMeta  – parallel array of { step, branchIndex, branchColour }
 */
/**
 * Show a connections popup for a getConnections-style result.
 * This function is UI-only and does not mutate external module state.
 */
export function showConnectionsPopup(connectionsResult) {
  if (!Array.isArray(connectionsResult) || !connectionsResult.length) return;
  const conn = connectionsResult[0];
  const path = conn.path || [];

  // Pre-compute branch index and colour for every step.
  // A new branch starts each time a spouse step is encountered.
  let branchIndex = 0;
  const stepMeta = path.map((person, i) => {
    if (i > 0) {
      const rel = normalizeText(person.pathType || "");
      if (rel === "spouse") {
        branchIndex = (branchIndex + 1) % familyColours.length;
      }
    }
    return { step: i, branchIndex, branchColour: familyColours[branchIndex] };
  });

  // Collect unique branches actually used (in order of first appearance).
  const usedBranches = [];
  stepMeta.forEach(({ branchIndex: bi, branchColour }) => {
    if (!usedBranches.some((b) => b.index === bi)) {
      usedBranches.push({ index: bi, colour: branchColour });
    }
  });

  function getDirectionArrow(pathType) {
    return getConnectionDirectionArrow(pathType);
  }

  // Remove any existing popup before showing a new one
  $("#wbe-connections-popup").remove();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable chat-connections-popup";
  popup.id = "wbe-connections-popup";
  popup.style.display = "block";

  const rowsHtml = path
    .map((person, i) => {
      const { step, branchColour } = stepMeta[i];
      const name = formatConnectionPersonName(person);
      const relation = person.pathType || "";
      const arrow = getDirectionArrow(relation);
      const birthDate = formatDate(person.BirthDate);
      const birthLoc = person.BirthLocation || "";
      const deathDate = formatDate(person.DeathDate);
      const deathLoc = person.DeathLocation || "";
      const normalizedGender = normalizeText(person.Gender);
      let rowClass = "background--gender-no-gender";
      if (normalizedGender === "male") rowClass = "background--gender-male";
      else if (normalizedGender === "female") rowClass = "background--gender-female";
      const stepCell =
        step === 0
          ? `<td class="connections-step-cell"></td>`
          : `<td class="connections-step-cell" style="background:${branchColour}">${step}</td>`;
      return `
        <tr class="${rowClass}">
          ${stepCell}
          <td class="name-cell">${renderConnectionPersonLink(person, name)}</td>
          <td style="background:${getRelationColour(relation)}">${arrow}${escapeHtml(relation)}</td>
          <td style="background:${getYearColour(person.BirthDate)}">${escapeHtml(birthDate)}</td>
          <td class="birth-location-cell">${escapeHtml(birthLoc)}</td>
          <td style="background:${getYearColour(person.DeathDate)}">${escapeHtml(deathDate)}</td>
          <td class="death-location-cell">${escapeHtml(deathLoc)}</td>
        </tr>`;
    })
    .join("");

  const keyHtml = buildConnectionsBranchKeyHtml(usedBranches);

  // Year colour key — 50-year buckets starting 1800 (matches getYearColour).
  const yearKeyRanges = [
    { label: "Before 1850", colour: getYearColour("1800-01-01") },
    { label: "1850–1899", colour: getYearColour("1850-01-01") },
    { label: "1900–1949", colour: getYearColour("1900-01-01") },
    { label: "1950–1999", colour: getYearColour("1950-01-01") },
    { label: "2000+", colour: getYearColour("2000-01-01") },
  ];
  const yearKeyHtml = `<div class="connections-colour-key">
    <span class="connections-colour-key-label">Date colours (50-year groups):</span>
    ${yearKeyRanges
      .map(
        ({ label, colour }) =>
          `<span class="connections-colour-key-swatch" style="background:${colour}">${label}</span>`
      )
      .join("")}
  </div>`;

  const popupTitle = (() => {
    const sourceName = formatConnectionPersonName(path[0] || {}) || "Start";
    const targetName = formatConnectionPersonName(path[path.length - 1] || {}) || "Target";
    return `${sourceName} to ${targetName}`;
  })();

  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong>Connections Path</strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" id="wbe-conn-view-toggle" title="Switch to diagram view">Diagram</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-layout-toggle" title="Switch to compact layout" hidden>Compact</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-zoom-out" aria-label="Zoom out" title="Zoom out" hidden>-</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-zoom-in" aria-label="Zoom in" title="Zoom in" hidden>+</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-fit" title="Fit diagram to popup" hidden>Fit</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-open" title="Open the full diagram in a new tab" hidden>Open</button>
        <button type="button" class="small wbe-conn-diagram-action" id="wbe-conn-pdf" title="Open print dialog for PDF export" hidden>PDF</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div id="wbe-conn-table-view">
        <table class="connections-table">
          <thead>
            <tr>
              <th class="connections-step-cell">#</th>
              <th>Name</th>
              <th>Relation</th>
              <th>Birth Date</th>
              <th>Birth Location</th>
              <th>Death Date</th>
              <th>Death Location</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${keyHtml}
        ${yearKeyHtml}
      </div>
      <div id="wbe-conn-diagram-view" style="display:none"></div>
    </div>
  `;

  document.body.appendChild(popup);
  setPopupPositionAndSize(popup, Math.round((window.innerWidth - popup.getBoundingClientRect().width) / 2), 110);
  const tableView = popup.querySelector("#wbe-conn-table-view");
  const diagramView = popup.querySelector("#wbe-conn-diagram-view");
  const viewToggleBtn = popup.querySelector("#wbe-conn-view-toggle");
  const layoutToggleBtn = popup.querySelector("#wbe-conn-layout-toggle");
  const zoomOutBtn = popup.querySelector("#wbe-conn-zoom-out");
  const zoomInBtn = popup.querySelector("#wbe-conn-zoom-in");
  const fitBtn = popup.querySelector("#wbe-conn-fit");
  const openBtn = popup.querySelector("#wbe-conn-open");
  const pdfBtn = popup.querySelector("#wbe-conn-pdf");
  const diagramButtons = popup.querySelectorAll(".wbe-conn-diagram-action");
  const diagramState = {
    layoutMode: "tree",
    scale: 1,
    rendered: false,
    scaleMode: "default",
  };

  function syncDiagramToolbar(isDiagramVisible) {
    diagramButtons.forEach((button) => {
      button.hidden = !isDiagramVisible;
    });
    layoutToggleBtn.textContent = diagramState.layoutMode === "tree" ? "Compact" : "Tree";
    layoutToggleBtn.title =
      diagramState.layoutMode === "tree" ? "Switch to compact packed layout" : "Switch to tree layout";
    viewToggleBtn.textContent = isDiagramVisible ? "Table" : "Diagram";
    viewToggleBtn.title = isDiagramVisible ? "Switch to table view" : "Switch to diagram view";
  }

  function renderDiagram({ fitToViewport = false, preserveScale = true, focusFirstPerson = false } = {}) {
    diagramView.innerHTML = `${buildConnectionsDiagramHtml(path, stepMeta, {
      layoutMode: diagramState.layoutMode,
    })}${keyHtml}`;
    diagramState.rendered = true;
    const nextScale = fitToViewport
      ? computeConnectionsDiagramFitScale(diagramView)
      : preserveScale
      ? diagramState.scale
      : 1;
    diagramState.scale = applyConnectionsDiagramScale(diagramView, nextScale);
    if (fitToViewport) {
      diagramState.scaleMode = "fit";
    } else if (!preserveScale) {
      diagramState.scaleMode = "default";
    }
    if (focusFirstPerson) {
      focusConnectionsDiagramCard(diagramView, 0);
    }
  }

  popup.querySelector(".close-popup")?.addEventListener("click", () => popup.remove());
  viewToggleBtn?.addEventListener("click", () => {
    const isDiagramVisible = diagramView.style.display !== "none";
    tableView.style.display = isDiagramVisible ? "" : "none";
    diagramView.style.display = isDiagramVisible ? "none" : "";
    if (!isDiagramVisible) {
      renderDiagram({
        fitToViewport: false,
        preserveScale: diagramState.rendered,
        focusFirstPerson: !diagramState.rendered,
      });
    }
    syncDiagramToolbar(!isDiagramVisible);
  });
  layoutToggleBtn?.addEventListener("click", () => {
    if (diagramView.style.display === "none") {
      return;
    }
    diagramState.layoutMode = diagramState.layoutMode === "tree" ? "compact" : "tree";
    const shouldRefit = diagramState.scaleMode === "fit";
    renderDiagram({
      fitToViewport: shouldRefit,
      preserveScale: !shouldRefit,
      focusFirstPerson: !shouldRefit,
    });
    syncDiagramToolbar(true);
  });
  zoomOutBtn?.addEventListener("click", () => {
    if (diagramView.style.display === "none") {
      return;
    }
    diagramState.scale = applyConnectionsDiagramScale(diagramView, diagramState.scale - CONNECTION_DIAGRAM_SCALE_STEP);
    diagramState.scaleMode = "manual";
  });
  zoomInBtn?.addEventListener("click", () => {
    if (diagramView.style.display === "none") {
      return;
    }
    diagramState.scale = applyConnectionsDiagramScale(diagramView, diagramState.scale + CONNECTION_DIAGRAM_SCALE_STEP);
    diagramState.scaleMode = "manual";
  });
  fitBtn?.addEventListener("click", () => {
    if (diagramView.style.display === "none") {
      return;
    }
    diagramState.scale = applyConnectionsDiagramScale(diagramView, computeConnectionsDiagramFitScale(diagramView));
    diagramState.scaleMode = "fit";
  });
  openBtn?.addEventListener("click", () => {
    openConnectionsDiagramDocument({
      title: popupTitle,
      path,
      stepMeta,
      usedBranches,
      layoutMode: diagramState.layoutMode,
      printOnLoad: false,
    });
  });
  pdfBtn?.addEventListener("click", () => {
    openConnectionsDiagramDocument({
      title: popupTitle,
      path,
      stepMeta,
      usedBranches,
      layoutMode: diagramState.layoutMode,
      printOnLoad: true,
    });
  });
  syncDiagramToolbar(false);
  setHighestZIndex(popup);
  $(popup).draggable({
    handle: ".chat-popup-header",
    containment: "window",
    scroll: false,
    start: () => {
      popup.style.right = "auto";
      popup.style.transform = "none";
    },
  });
}

/**
 * Small shaky-tree loader UI used in chat operations.
 */
export function showChatShaky(label = "Finding connection...", position = "center") {
  let $existing = $("#wbeShakyTree");
  const treeUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL("images/tree.gif") : "images/tree.gif";
  if ($existing.length === 0) {
    const html = `
      <div id="wbeShakyTree" class="wbe-shaky-tree" style="display:none">
        <div class="wbe-shaky-image"><img src="${treeUrl}" alt="loading" /></div>
        <div class="wbe-shaky-messages">
          <div class="wbe-shaky-label">${label}</div>
        </div>
      </div>
      `;
    $(document.body).append(html);
    $existing = $("#wbeShakyTree");
  } else {
    const $msgs = $existing.find(".wbe-shaky-messages");
    // Replace existing messages with the latest label to avoid duplicates
    $msgs.html(`<div class="wbe-shaky-label">${label}</div>`);
  }
  if (position === "center") $existing.addClass("center");
  else $existing.removeClass("center");
  $existing.stop(true, true).fadeIn(180);
  try {
    setTimeout(() => {
      setHighestZIndex($existing.get(0));
    }, 10);
  } catch (e) {
    /* ignore */
  }
}

export function hideChatShaky() {
  const $el = $("#wbeShakyTree");
  if ($el.length) {
    $el.stop(true, true).fadeOut(150, function () {
      $(this).removeClass("center");
    });
  }
}

// Expose some utilities for console debugging
window.wbeUi = window.wbeUi || {};
window.wbeUi.showChatShaky = showChatShaky;
window.wbeUi.hideChatShaky = hideChatShaky;
window.wbeUi.showConnectionsPopup = showConnectionsPopup;

// Sanitize profile HTML for insertion into popups to avoid CSP inline-script execution.
export function sanitizeHtmlForPopup(html) {
  try {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    // Remove script tags
    doc.querySelectorAll("script").forEach((s) => s.remove());
    // Remove inline event handler attributes (on*) and javascript: src/href
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = String(attr.name || "");
        const val = String(attr.value || "");
        if (/^on/i.test(name)) {
          el.removeAttribute(name);
        }
        if ((name === "src" || name === "href") && /^javascript:/i.test(val)) {
          el.removeAttribute(name);
        }
      });
    });
    return doc.body.innerHTML || "";
  } catch (e) {
    return "";
  }
}

// Normalize extraction of wiki and html bio fields from profile objects
export function extractProfileBios(profile) {
  if (!profile || typeof profile !== "object") return { wikiBio: "", htmlBio: "" };
  const wikiBio =
    profile.Bio ||
    profile.BioText ||
    profile.BioWiki ||
    profile.Biography ||
    profile.bio ||
    profile.bioText ||
    profile.biography ||
    "";
  const htmlBio =
    profile.BioHtml ||
    profile.BioHTML ||
    profile.Bio_Html ||
    profile.BioHtmlText ||
    profile.bioHTML ||
    profile.bioHtml ||
    profile.bio_html ||
    "";
  return { wikiBio, htmlBio };
}

// Small popup to list multiple bios with Open buttons
export function showBioListPopup(title, entries = [], onOpenTiled) {
  try {
    $("#wbe-bio-list-popup").remove();
    const popupWidth = Math.max(360, Math.floor(window.innerWidth * 0.4));

    const listItems = (entries || [])
      .map(
        (e) =>
          `<li><span>${escapeHtml(e.displayName || e.wtid || "")} (${escapeHtml(
            e.wtid || ""
          )})</span> <button class="open-bio" data-wtid="${escapeHtml(e.wtid || "")}">Open Bio</button></li>`
      )
      .join("");

    const html = `
      <div id="wbe-bio-list-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
      (window.innerWidth - popupWidth) / 2
    )}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>${escapeHtml(title || "Profiles")}</strong>
          <div class="chat-popup-controls">
            <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="chat-popup-body chat-popup-body--compact">
          <ul class="spouse-list">
            ${listItems}
          </ul>
          <div class="bio-list-actions" style="margin-top:8px;">
            <button class="open-all-tiled small">Open All (Tiled)</button>
          </div>
        </div>
      </div>`;

    const $popup = $(html).appendTo(document.body);
    $popup.find(".close-popup").on("click", () => $popup.remove());
    $popup.find(".open-all-tiled").on("click", () => {
      const ids = entries.map((e) => e.wtid).filter(Boolean);
      if (ids.length && typeof onOpenTiled === "function") onOpenTiled(ids.slice(0, 12));
    });
    $popup.find(".open-bio").on("click", async (e) => {
      const raw = $(e.currentTarget).attr("data-wtid");
      if (!raw) return;
      // callers should resolve WTID before opening; provide raw back via attribute
      $popup.remove();
      if (typeof onOpenTiled === "function") onOpenTiled([raw]);
    });
    setHighestZIndex($popup.get(0));
    $popup.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
    // Do not auto-open the first bio to avoid unexpected popups when profile
    // fetches fail or return empty content. Require the user to click an entry.
  } catch (e) {
    console.error("wbe: showBioListPopup error", e);
  }
}

// Open multiple bio popups tiled on screen. Creates individual popups per profile id.
export function showTiledBioPopups(ids = [], fetchProfilesFn) {
  if (!Array.isArray(ids) || !ids.length) return;
  const max = Math.min(ids.length, 12);
  const toOpen = ids.slice(0, max);
  // fetchProfilesFn should be provided by caller (chat module) to perform API fetch
  if (typeof fetchProfilesFn !== "function") {
    console.error("showTiledBioPopups requires a fetchProfilesFn callback");
    return;
  }
  return (async () => {
    const profiles = await fetchProfilesFn(toOpen);
    const anyValid = Array.isArray(profiles) && profiles.some((p) => p && Object.keys(p).length > 0);
    if (!anyValid) {
      try {
        // fallback: let caller append a message
        return { opened: 0, error: true };
      } catch (e) {
        return { opened: 0, error: true };
      }
    }
    // Layout: up to 4 columns depending on count
    const cols = Math.min(3, Math.max(1, Math.floor(Math.sqrt(toOpen.length))));
    const width = Math.floor((window.innerWidth - 40) / cols);
    let left = 10;
    let top = 80;
    let col = 0;
    let opened = 0;
    for (let i = 0; i < toOpen.length; i += 1) {
      const id = toOpen[i];
      const profile = profiles[i] || null;
      if (!profile) continue; // skip failed fetches
      const { wikiBio, htmlBio } = extractProfileBios(profile);
      // Skip profiles that have no biography content to avoid empty popups
      if (!wikiBio && !htmlBio) continue;
      const name = (profile && (profile.RealName || profile.Name)) || id;
      const pid = `wbe-bio-popup-${encodeURIComponent(id)}`;
      $(`#${pid}`).remove();
      const $p = $(
        `<div id="${pid}" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${width}px;left:${left}px;top:${top}px">
          <div class="chat-popup-header ui-draggable-handle">
            <strong>Biography: ${escapeHtml(name)}</strong>
            <div class="chat-popup-controls"><button type="button" class="small close-popup" title="Close">×</button></div>
          </div>
          <div class="chat-popup-body chat-popup-body--columns" style="height:320px;overflow:auto;">
            <div class="bio-column bio-column--wiki">
              <pre class="bio-wiki-pre">${escapeHtml(wikiBio || "(no wiki text)")}</pre>
            </div>
            <div class="bio-column">
              <div class="bio-html-container">${sanitizeHtmlForPopup(htmlBio) || "<i>(no html)</i>"}</div>
            </div>
          </div>
        </div>`
      ).appendTo(document.body);
      $p.find(".close-popup").on("click", () => $p.remove());
      setHighestZIndex($p.get(0));
      $p.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
      // advance grid position for next tiled popup
      if (!Number.isFinite(col)) col = 0;
      col += 1;
      if (col >= cols) {
        col = 0;
        left = 10;
        top += 340;
      } else {
        left += width + 10;
      }
      opened += 1;
    }
    return { opened, error: false };
  })();
}

export function closeBioPopup() {
  document.getElementById("wbe-bio-popup")?.remove();
}

// Safe no-op to satisfy callers; removes any leftover persistent button if present.
export function addBioButton() {
  try {
    $("#wbe-bio-button").remove();
  } catch (e) {
    /* ignore */
  }
}
