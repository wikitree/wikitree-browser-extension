// Genie's tooltips (the user, 2026-10-18: like WBE's yellow ones, "and make it appear more quickly than title
// text does"). Any element in the popup with a title gets one: on the first hover its title moves to
// data-wbe-tip (so the browser's slow one doesn't show as well), and a box shows above it after SHOW_MS.
// WBE's CSS-only [data-tooltip] stays on one line and is clipped by the scrolling message list, so this
// is one box, a child of the popup (a body-level one goes under it: see .wbe-popup), placed by script.

const SHOW_MS = 150;
const GAP = 9; // between the element and the box, room for the arrow

/** Turns on the quick tooltips inside root (once). */
export function enableQuickTips(root) {
  if (!root || root.dataset.wbeQuickTips) return;
  root.dataset.wbeQuickTips = "1";
  const tip = document.createElement("div");
  tip.className = "wbe-quick-tip";
  tip.id = `${root.id || "wbe"}-quick-tip`;
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  root.appendChild(tip);
  let timer = 0;
  let target = null;

  const hide = () => {
    clearTimeout(timer);
    timer = 0;
    target?.removeAttribute("aria-describedby");
    target = null;
    tip.hidden = true;
  };

  const show = (element) => {
    const text = element.getAttribute("data-wbe-tip");
    if (!text || !element.isConnected || element !== target) return;
    tip.textContent = text;
    tip.hidden = false;
    placeTip(root, tip, element);
    element.setAttribute("aria-describedby", tip.id);
  };

  const start = (element) => {
    if (element === target) return;
    hide();
    if (!element) return;
    const title = element.getAttribute("title");
    if (title !== null) {
      element.removeAttribute("title");
      if (title) element.setAttribute("data-wbe-tip", title);
      // (an icon button named only by its title keeps the name)
      if (title && !element.getAttribute("aria-label") && !element.textContent.trim()) element.setAttribute("aria-label", title);
    }
    if (!element.getAttribute("data-wbe-tip")) return;
    target = element;
    timer = setTimeout(() => show(element), SHOW_MS);
  };

  const tipped = (node) => {
    const element = node?.closest?.("[title], [data-wbe-tip]");
    return element && element !== root && root.contains(element) ? element : null;
  };

  root.addEventListener("mouseover", (event) => start(tipped(event.target)));
  root.addEventListener("mouseout", (event) => {
    if (target && !target.contains(event.relatedTarget)) hide();
  });
  root.addEventListener("focusin", (event) => start(tipped(event.target)));
  root.addEventListener("focusout", hide);
  root.addEventListener("click", hide, true);
  root.addEventListener("scroll", hide, true);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !tip.hidden) hide();
  });
}

/** Above the element, centred on it, inside the popup; below it when there's no room above. */
function placeTip(root, tip, element) {
  const box = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  const centre = rect.left + rect.width / 2 - box.left;
  const left = Math.max(4, Math.min(box.width - width - 4, centre - width / 2));
  const above = rect.top - box.top - height - GAP >= 2;
  const top = above ? rect.top - box.top - height - GAP : rect.bottom - box.top + GAP;
  tip.classList.toggle("wbe-quick-tip--below", !above);
  tip.style.left = `${left + root.scrollLeft}px`;
  tip.style.top = `${top + root.scrollTop}px`;
  tip.style.setProperty("--wbe-tip-arrow", `${Math.max(8, Math.min(width - 8, centre - left))}px`);
}
