// Shared UI for the nested and spiral canvas trees. Layout geometry and
// colouring remain with each renderer.
import { addStyleOnce, injectChartStyles } from "./chat_chart_common";

const FRACTAL_CSS = `
  /* (the size comes from .wbe-chart-popup, so the size button works here too) */
  #wbe-fractal-popup .wbe-chart-stage { background: radial-gradient(ellipse at 50% 40%, #fffdf7 0%, #f6f3ea 55%, #ece7da 100%); }
  #wbe-fractal-popup .wbe-fractal-up { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2; max-width: calc(100% - 32px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 6px 16px; border: 1px solid #a3c48c; border-radius: 999px; background: rgba(255,255,255,.94); color: #22303a; font: 600 13.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
  #wbe-fractal-popup .wbe-fractal-up:hover, #wbe-fractal-popup .wbe-fractal-up:focus-visible { background: #e1f0b4; outline: none; }
  body.darkMode #wbe-fractal-popup .wbe-fractal-up:not(#none) { background: rgba(255,255,255,.94) !important; color: #22303a !important; border-color: #a3c48c !important; }
  #wbe-fractal-popup .wbe-fractal-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 7px 16px; border-radius: 999px; background: rgba(34,48,58,.86); color: #fff; font-size: 13.5px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 10px rgba(0,0,0,.15); transition: opacity .45s ease; }
  #wbe-fractal-popup .wbe-fractal-hint-gone { opacity: 0; }
  body.darkMode #wbe-fractal-popup .wbe-fractal-hint:not(#none) { background: rgba(34,48,58,.92) !important; color: #fff !important; }
  #wbe-fractal-popup canvas { width: 100%; height: 100%; display: block; cursor: grab; }
  #wbe-fractal-popup canvas:active { cursor: grabbing; }
  #wbe-fractal-popup .wbe-fractal-search { border: 1px solid rgba(0,0,0,.2); border-radius: 999px; padding: 3px 10px; font-size: 12px; width: 170px; }
  #wbe-fractal-popup .wbe-explorer-views { display: inline-flex; flex: none; margin-right: 12px; border: 1px solid #d2c193; border-radius: 999px; overflow: hidden; background: #fff; }
  #wbe-fractal-popup .wbe-explorer-views button { border: 0; margin: 0; background: transparent; padding: 4px 15px; font: 600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #5b4a2a; cursor: pointer; }
  #wbe-fractal-popup .wbe-explorer-views button + button { border-left: 1px solid #e6dbbd; }
  #wbe-fractal-popup .wbe-explorer-views button:hover { background: #fff6dc; }
  #wbe-fractal-popup .wbe-explorer-views button[aria-pressed="true"] { background: #f0b400; color: #241c0b; }
  body.darkMode #wbe-fractal-popup .wbe-explorer-views button:not(#none) { background: #fff !important; color: #5b4a2a !important; }
  body.darkMode #wbe-fractal-popup .wbe-explorer-views button[aria-pressed="true"]:not(#none) { background: #f0b400 !important; color: #241c0b !important; }
  #wbe-fractal-popup .wbe-explorer-host { position: absolute; inset: 0; z-index: 1; }
  /* (in the Family and Galaxy views, the tree's own controls go) */
  #wbe-fractal-popup.wbe-explorer-alt canvas:not(.wbe-galaxy-canvas):not(.wbe-3d-canvas), #wbe-fractal-popup.wbe-explorer-alt .wbe-fractal-up, #wbe-fractal-popup.wbe-explorer-alt .wbe-fractal-hint,
  #wbe-fractal-popup.wbe-explorer-alt .wbe-fractal-crumbs, #wbe-fractal-popup.wbe-explorer-alt .wbe-chart-mode, #wbe-fractal-popup.wbe-explorer-alt .wbe-chart-legend,
  #wbe-fractal-popup.wbe-explorer-alt:not(.wbe-explorer-galaxy):not(.wbe-explorer-3d):not(.wbe-explorer-family) [data-act="png"] { display: none !important; }
  /* (SVG only for the Family view, which saves itself as one; the others are drawn on a canvas) */
  #wbe-fractal-popup:not(.wbe-explorer-family) [data-act="svg"] { display: none !important; }
  #wbe-fractal-popup .wbe-explorer-bio { display: inline-flex; align-items: center; gap: 5px; flex: none; margin-right: 12px; font-size: 12.5px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  #wbe-fractal-popup .wbe-explorer-bio[hidden] { display: none; }
  #wbe-fractal-popup .wbe-explorer-bio input { margin: 0; }
  #wbe-fractal-popup .wbe-fractal-crumbs { padding: 4px 10px; font-size: 12px; min-height: 18px; border-bottom: 1px solid rgba(0,0,0,.06); }
`;

export function injectFractalStyles() {
  injectChartStyles();
  addStyleOnce("wbe-fractal-style", FRACTAL_CSS);
}

/** A viewer's setting from localStorage (fallback when there is none, or storage is blocked). */
export const remembered = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    return fallback;
  }
};
export const remember = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    // (storage blocked: the default next time)
  }
};

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
