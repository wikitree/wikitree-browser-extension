// A tour on screen (tour.js plans and runs it): the caption with Pause, Next and Stop, a pointer that glides
// to what the tour hovers or clicks, and the mouse events themselves. Genie's tours put the caption and pointer
// in the topmost Genie window, never in body: a click on a .wbe-popup raises it over anything body-level
// (common.js), and a full-screen chart shows only itself. A page tour (edit_page_tour.js) puts them in body.

import { createTourClock, runTour, TourStopped, typingDelay } from "./tour";
import "./tour.css";

const WAIT_FOR_CHART_MS = 45000;
const KEY_GAP_MS = 1600;
const KEY_SIGNS = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
// (on a page tour, where the target counts as in view: clear of the pinned bars at the top and the caption)
const IN_VIEW_TOP = 0.22;
const IN_VIEW_BOTTOM = 0.75;
const SCROLL_MS = 700;
// (the windows a page tour's caption stays over, and the caption's own z-index in tour.css)
const WINDOWS = ".wbe-popup, .wbe-gold-standard-overlay";
const BASE_Z = 100000;

let active = null;

export function isTourRunning() {
  return Boolean(active);
}

export function stopTour() {
  active?.stop();
}

/**
 * Plays the steps. host(): what holds the caption and pointer (body); alive(): false once the tour should end
 * (Genie closed); input(): Genie's box; send(prompt, {followUp}): sends what is in the box (as a follow-up, or a
 * new question) and resolves when Genie has answered; lastAnswer(): the text of Genie's latest answer; welcome():
 * shows Genie's welcome buttons again; ended(): called once when the tour ends or is stopped; keep: the
 * localStorage keys that showing things saves (put back at the end, as a tour changes nothing); label: the
 * caption's name for screen readers. A page tour (page: true) scrolls what it shows to the middle of the
 * window and rings it.
 */
export function startTour({
  steps,
  host = () => document.body,
  alive = () => true,
  input = () => null,
  send = async () => {},
  lastAnswer = () => "",
  welcome = () => {},
  ended = () => {},
  keep = null,
  label = "Genie's tour",
  page = false,
}) {
  stopTour();
  const clock = createTourClock();
  const restoreSettings = keepSettings(keep);
  const caption = captionBox(label);
  const pointer = pointerArrow();
  let lastHovered = null;
  let finished = false;
  let typed = ""; // (what the tour put in the box, cleared when stopped half-way through typing it)
  let ringed = null; // (page tours: what the step is about)
  let opened = null; // (a menu that opens on :hover, held open by the tour)
  let shownStep = -1;

  // A chart that redraws itself (regrouped spellings, a generation more) replaces its window, or its
  // insides when full screen, and the caption and pointer with it: they go back at once, before the page
  // is drawn again (the 400 ms watcher alone showed them blink out).
  let watchedHost = null;
  const keeper = new MutationObserver(() => {
    if (!finished && (!caption.isConnected || !pointer.isConnected)) place();
  });
  const place = () => {
    const holder = host();
    if (!holder) return;
    if (page) lift();
    if (caption.parentNode !== holder) holder.appendChild(caption);
    if (pointer.parentNode !== holder) holder.appendChild(pointer);
    if (watchedHost !== holder) {
      watchedHost = holder;
      keeper.disconnect();
      keeper.observe(document.body, { childList: true });
      if (holder !== document.body) keeper.observe(holder, { childList: true });
    }
  };

  // A page tour's caption and pointer stay over WBE's windows, which put themselves on top of everything.
  const lift = () => {
    let top = 0;
    document.querySelectorAll(WINDOWS).forEach((el) => (top = Math.max(top, parseFloat(getComputedStyle(el).zIndex) || 0)));
    caption.style.zIndex = top >= BASE_Z ? String(top + 1) : "";
    pointer.style.zIndex = top >= BASE_Z ? String(top + 2) : "";
  };

  const ring = (el) => {
    if (ringed === el) return;
    ringed?.classList.remove("wbe-tour-target");
    ringed = page ? el : null;
    ringed?.classList.add("wbe-tour-target");
  };
  // A menu that only opens on :hover (the edit toolbar's) stays open while the tour is in it.
  const holdOpen = (el) => {
    if (opened === el) return;
    opened?.classList.remove("wbe-tour-open");
    opened = el;
    opened?.classList.add("wbe-tour-open");
  };
  // A page tour scrolls what it shows to the middle, clear of the pinned bars and the caption; Genie's
  // windows only scroll it into view.
  const showOnPage = async (el) => {
    if (!page) {
      el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top >= window.innerHeight * IN_VIEW_TOP && rect.bottom <= window.innerHeight * IN_VIEW_BOTTOM) return;
    if (pinned(el) && rect.top >= 0 && rect.bottom <= window.innerHeight) return; // (in the header: scrolling won't move it)
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "center", behavior: still ? "auto" : "smooth" });
    await clock.wait(still ? 60 : SCROLL_MS);
  };

  const teardown = () => {
    if (finished) return;
    finished = true;
    clearInterval(watcher);
    keeper.disconnect();
    window.removeEventListener("keydown", onKey, true);
    caption.remove();
    pointer.remove();
    ring(null);
    holdOpen(null);
    restoreSettings();
    if (active?.clock === clock) active = null;
    ended();
  };
  const stop = () => {
    clock.stop();
    const box = input();
    if (box && typed && box.value === typed) box.value = "";
    teardown();
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    // (Esc would also close the topmost window: common.js)
    event.preventDefault();
    event.stopImmediatePropagation();
    stop();
  };
  window.addEventListener("keydown", onKey, true);
  // A chart window opening or going full screen takes the caption with it; Genie closing ends the tour.
  const watcher = setInterval(() => (alive() ? place() : stop()), 400);

  caption.querySelector('[data-tour="pause"]').addEventListener("click", () => (clock.paused ? clock.resume() : clock.pause()));
  caption.querySelector('[data-tour="next"]').addEventListener("click", () => clock.next());
  caption.querySelector('[data-tour="stop"]').addEventListener("click", stop);
  clock.onChange(({ paused }) => {
    const button = caption.querySelector('[data-tour="pause"]');
    button.textContent = paused ? "Play" : "Pause";
    button.setAttribute("aria-pressed", String(paused));
    caption.classList.toggle("wbe-tour-paused", paused);
  });

  // Glides the pointer to (x, y): a short move is quick, a long one takes up to a second.
  const glide = async ({ x, y }, { wait = true } = {}) => {
    place();
    const from = pointer.classList.contains("wbe-tour-pointer-shown") ? pointer.getBoundingClientRect() : null;
    const ms = from ? Math.round(Math.min(1000, Math.max(350, 300 + Math.hypot(x - from.left, y - from.top) * 0.7))) : 0;
    pointer.style.transitionDuration = `${ms}ms`;
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    pointer.classList.add("wbe-tour-pointer-shown");
    if (wait) await clock.wait(ms + 60);
  };

  const hidePointer = () => {
    pointer.style.transitionDuration = "300ms";
    pointer.classList.remove("wbe-tour-pointer-shown");
  };

  // A key pressed on an element, `times` times, each shown as a keycap on the caption.
  const pressKeys = async ({ key, on, times = 1 }) => {
    const el = pickTarget(on);
    if (!el) return false;
    bringForward(el);
    el.focus?.({ preventScroll: true });
    hidePointer();
    for (let press = 0; press < times; press++) {
      if (press) await clock.wait(KEY_GAP_MS);
      showKey(caption, KEY_SIGNS[key] || key);
      ["keydown", "keyup"].forEach((type) => el.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true, composed: true })));
    }
    return true;
  };

  // Genie's box (or a chart) behind another window comes to the front, as a click on it would.
  const bringForward = (el) => {
    const popup = el?.closest?.(".wbe-popup");
    if (!popup || document.fullscreenElement || popup === topWindow()) return;
    const rect = popup.getBoundingClientRect();
    fire(popup, "click", { x: rect.left + 4, y: rect.top + 4 });
  };

  const hoverAt = (el, at) => {
    if (lastHovered && lastHovered !== el && lastHovered.isConnected) ["pointerout", "mouseout", "pointerleave", "mouseleave"].forEach((type) => fire(lastHovered, type, at));
    if (lastHovered !== el) ["pointerover", "mouseover", "pointerenter", "mouseenter"].forEach((type) => fire(el, type, at));
    ["pointermove", "mousemove"].forEach((type) => fire(el, type, at));
    lastHovered = el;
  };

  const env = {
    clock,
    caption(text, { index, count }) {
      place();
      if (index !== shownStep) {
        shownStep = index;
        ring(null);
        holdOpen(null);
      }
      caption.querySelector(".wbe-tour-text").textContent = text;
      caption.querySelector(".wbe-tour-count").textContent = `${index + 1} of ${count}`;
    },
    typeLetters(text) {
      const box = input();
      if (!box) return;
      if (text.length <= 1) {
        bringForward(box);
        const rect = box.getBoundingClientRect();
        void glide({ x: rect.right - 40, y: rect.top + rect.height / 2 }, { wait: false });
      }
      box.value = text;
      typed = text;
      box.scrollTop = box.scrollHeight;
    },
    // As a person would: the tip goes to Send and presses it, then fades while Genie answers (left
    // where it was, it floats over whatever opens there).
    async send(prompt, options) {
      const button = document.getElementById("wbe-chat-send");
      if (button && !clock.skipping) {
        const rect = button.getBoundingClientRect();
        await glide({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        ripple(pointer);
        await clock.wait(250);
      }
      hidePointer();
      return send(prompt, options);
    },
    // (there, not necessarily shown: the edit menu's items are in a closed menu)
    has: (selector) => Boolean(document.querySelector(selector)),
    welcome,
    async waitFor(selector) {
      const until = Date.now() + WAIT_FOR_CHART_MS;
      while (Date.now() < until) {
        clock.check();
        if (document.querySelector(selector)) return true;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return false;
    },
    lastAnswer,
    // (the box, when what it points at isn't there)
    async point(selector, text) {
      const el = pickTarget(selector, 0, text) || input();
      if (!el) return;
      bringForward(el);
      await showOnPage(el);
      ring(el);
      const rect = el.getBoundingClientRect();
      await glide({ x: rect.left + Math.min(rect.width / 2, 60), y: rect.top + rect.height / 2 });
    },
    async act(action) {
      if (action.key) return pressKeys(action);
      const el = pickTarget(action.hover || action.click, action.pick, action.text, action.has);
      if (!el) return false;
      bringForward(el);
      await showOnPage(el);
      // (ring: what the step is about, if not this; open: the :hover menu this opens, e.g. ".editToolbarDiv")
      ring(action.ring ? pickTarget(action.ring) : el);
      if (action.open) holdOpen(el.closest(action.open));
      const at = pointInside(el);
      await glide(at);
      hoverAt(el, at);
      if (action.click) {
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => fire(el, type, at));
        ripple(pointer);
      }
      // A hover can wander along what it is over ("sweep": fractions of its width), so the tip follows.
      for (const fraction of action.sweep || []) {
        await clock.wait(1400);
        const next = pointInside(el, [fraction]);
        await glide(next);
        hoverAt(el, next);
      }
      return true;
    },
    // The page tour's own doing (Auto Bio writing a biography): what it changes, the tour puts back.
    async run(action) {
      if (action.point) await env.point(action.point);
      return (await action.run({ wait: (ms) => clock.wait(ms) })) !== false;
    },
    // Letters typed into a field, as a person would, so what listens for typing (place suggestions) answers.
    async type(action) {
      const el = pickTarget(action.into);
      const text = typeof action.type === "function" ? action.type() : action.type; // (worked out when it's typed)
      if (!el || !text) return false;
      await showOnPage(el);
      ring(el);
      const rect = el.getBoundingClientRect();
      await glide({ x: rect.left + Math.min(rect.width / 2, 60), y: rect.top + rect.height / 2 });
      el.focus({ preventScroll: true });
      el.value = "";
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
        await clock.wait(2 * typingDelay(char)); // (slower than Genie's box: each letter brings suggestions)
      }
      return true;
    },
    end: teardown,
  };

  active = { clock, stop };
  place();
  pointer.style.left = "-40px";
  return runTour(steps, env).catch((error) => {
    teardown();
    if (!(error instanceof TourStopped)) console.error("wbe: the tour failed", error);
    return "stopped";
  });
}

function captionBox(label) {
  const box = document.createElement("div");
  box.className = "wbe-tour-caption";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", label);
  box.innerHTML = `
    <div class="wbe-tour-text" aria-live="polite"></div>
    <div class="wbe-tour-controls">
      <span class="wbe-tour-count"></span>
      <button type="button" data-tour="pause" aria-pressed="false" title="Pause the tour here">Pause</button>
      <button type="button" data-tour="next" title="Go on to the next step now">Next</button>
      <button type="button" data-tour="stop" title="End the tour (Esc)">Stop</button>
    </div>`;
  return box;
}

function pointerArrow() {
  const pointer = document.createElement("div");
  pointer.className = "wbe-tour-pointer";
  pointer.setAttribute("aria-hidden", "true");
  pointer.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2.5 L4 20 L8.6 15.6 L12 22.6 L15 21.2 L11.7 14.4 L18 14.4 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return pointer;
}

function ripple(pointer) {
  pointer.classList.remove("wbe-tour-click");
  void pointer.offsetWidth; // (restarts the animation)
  pointer.classList.add("wbe-tour-click");
}

/** The full-screen window, else the visible one of these windows drawn on top (the later one wins a tie). */
export function topWindow(selector = ".wbe-popup") {
  const full = document.fullscreenElement;
  if (full?.classList?.contains("wbe-popup")) return full;
  let top = null;
  let topZ = -Infinity;
  document.querySelectorAll(selector).forEach((popup) => {
    if (!popup.getClientRects().length || getComputedStyle(popup).visibility === "hidden") return;
    const z = parseFloat(getComputedStyle(popup).zIndex) || 0;
    if (z >= topZ) {
      top = popup;
      topZ = z;
    }
  });
  return top;
}

// The localStorage settings `keep` (a RegExp) names as they are now; the function returned puts them back.
function keepSettings(keep) {
  if (!keep) return () => {};
  const saved = new Map();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (keep.test(key)) saved.set(key, localStorage.getItem(key));
    }
  } catch (error) {
    return () => {};
  }
  return () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (keep.test(key) && !saved.has(key)) localStorage.removeItem(key);
      }
      saved.forEach((value, key) => localStorage.setItem(key, value));
    } catch (error) {
      // (storage blocked: nothing was saved either)
    }
  };
}

// Whether the element is in something fixed or sticky (a header).
function pinned(el) {
  for (let at = el; at && at !== document.body; at = at.parentElement) {
    if (/^(?:fixed|sticky)$/.test(getComputedStyle(at).position)) return true;
  }
  return false;
}

function showKey(caption, sign) {
  caption.querySelector(".wbe-tour-key")?.remove();
  const cap = document.createElement("kbd");
  cap.className = "wbe-tour-key";
  cap.textContent = sign;
  caption.appendChild(cap);
  setTimeout(() => cap.remove(), 1200);
}

function pickTarget(selector, pick, text, has) {
  const shown = [...document.querySelectorAll(selector)].filter((el) => el.getClientRects().length);
  // (text: exactly that; has: containing it, e.g. a picker item's "· father")
  const found = shown.filter((el) => (!text || el.textContent.trim() === text) && (!has || el.textContent.includes(has)));
  if (!found.length) return null;
  if (pick === "largest") {
    const areas = new Map(found.map((el) => [el, filledArea(el)]));
    return found.reduce((best, el) => (areas.get(el) > areas.get(best) ? el : best));
  }
  return found[Math.min(Number.isInteger(pick) ? pick : 0, found.length - 1)];
}

// How much of the page an element covers: for an SVG shape, the part of its box it fills (a thin
// diagonal stream band has a big box), sampled on a grid; else its box.
function filledArea(el) {
  const rect = el.getBoundingClientRect();
  if (typeof el.isPointInFill !== "function" || typeof el.getBBox !== "function") return rect.width * rect.height;
  try {
    const box = el.getBBox();
    const steps = 24;
    let inside = 0;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        if (el.isPointInFill({ x: box.x + (box.width * (i + 0.5)) / steps, y: box.y + (box.height * (j + 0.5)) / steps })) inside++;
      }
    }
    return (inside / steps ** 2) * rect.width * rect.height;
  } catch (error) {
    return rect.width * rect.height;
  }
}

/**
 * A point really on the element (a stream band is wavy, so its box's centre may be another band): down
 * a line at each fraction of its width, the middle of the stretch where the element is what's there.
 */
function pointInside(el, fractions = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
  const rect = el.getBoundingClientRect();
  const on = (x, y) => {
    const at = document.elementFromPoint(x, y);
    return Boolean(at) && (at === el || el.contains(at));
  };
  for (const fraction of fractions) {
    const x = rect.left + rect.width * fraction;
    let first = null;
    let last = null;
    for (let y = Math.max(0, rect.top + 1); y < Math.min(window.innerHeight, rect.bottom); y += 2) {
      if (on(x, y)) {
        if (first === null) first = y;
        last = y;
      } else if (first !== null) break;
    }
    if (first !== null) return { x, y: (first + last) / 2 };
  }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function fire(el, type, { x, y }) {
  const Event = type.startsWith("pointer") && typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  const bubbles = !/enter|leave/.test(type);
  el.dispatchEvent(
    new Event(type, {
      bubbles,
      cancelable: bubbles,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: /down/.test(type) ? 1 : 0,
      pointerType: "mouse",
      isPrimary: true,
    })
  );
}
