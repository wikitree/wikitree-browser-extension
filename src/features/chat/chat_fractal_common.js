// Shared UI for the nested and spiral canvas trees. Layout geometry and
// colouring remain with each renderer.
import { injectChartStyles } from "./chat_chart_common";

const FRACTAL_CSS = `
  #wbe-fractal-popup { width: min(1320px, 96vw); height: min(900px, 92vh); }
  #wbe-fractal-popup .wbe-chart-stage { background: #ffffff; }
  #wbe-fractal-popup canvas { width: 100%; height: 100%; display: block; cursor: grab; }
  #wbe-fractal-popup canvas:active { cursor: grabbing; }
  #wbe-fractal-popup .wbe-fractal-search { border: 1px solid rgba(0,0,0,.2); border-radius: 999px; padding: 3px 10px; font-size: 12px; width: 170px; }
  #wbe-fractal-popup .wbe-fractal-crumbs { padding: 4px 10px; font-size: 12px; min-height: 18px; border-bottom: 1px solid rgba(0,0,0,.06); }
`;

export function injectFractalStyles() {
  injectChartStyles();
  if (document.getElementById("wbe-fractal-style")) return;
  const style = document.createElement("style");
  style.id = "wbe-fractal-style";
  style.textContent = FRACTAL_CSS;
  document.head.appendChild(style);
}

export function reducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function wrapText(text, width, maxLines = 2) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if (!line) line = word;
    else if ((line + " " + word).length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

/** Enter cycles through matches; each renderer provides its current nodes and timing. */
export function bindFractalSearch(search, { state, getNodes, lineOf, flyTo, requestDraw, flyDuration, pulseDuration }) {
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const query = search.value.trim().toLowerCase();
    if (!query) return;
    if (state.query !== query) {
      state.query = query;
      state.matches = getNodes()
        .filter((node) => `${node.person.name} ${node.person.lnab} ${node.person.wtid}`.toLowerCase().includes(query))
        .map((node) => node.index);
      state.matchIndex = -1;
    }
    if (!state.matches.length) {
      search.title = "No one on the tree matches";
      search.style.borderColor = "#e0533d";
      return;
    }
    search.style.borderColor = "";
    state.matchIndex = (state.matchIndex + 1) % state.matches.length;
    search.title = `${state.matchIndex + 1} of ${state.matches.length} (Enter for the next)`;
    const index = state.matches[state.matchIndex];
    state.pulse = lineOf(index);
    flyTo(index, flyDuration);
    clearTimeout(state.pulseTimer);
    state.pulseTimer = setTimeout(() => {
      state.pulse = null;
      requestDraw();
    }, pulseDuration);
  });
}

/** Save the visible canvas, reporting cross-origin photo failures on the button. */
export function saveFractalPng(canvas, tree, button) {
  try {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `fractal-tree-${(tree?.person?.wtid || "tree").replace(/[^A-Za-z0-9_-]/g, "")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    button.title = "This view can't be saved (a photo came from another site). Zoom away from photos and try again.";
  }
}

/** Keep the switch button state consistent while its data is loading. */
export function switchFractalWhich(button, onSwitch) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Loading…";
  return Promise.resolve(onSwitch())
    .catch((error) => console.warn("wbe: fractal tree switch failed", error))
    .finally(() => {
      button.disabled = false;
      button.textContent = label;
    });
}
