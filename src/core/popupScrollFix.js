import { navigatorDetect } from "./navigatorDetect";

// Safari's extension popup scrolls (trackpad/wheel) but the scrollbar is invisible
// (macOS overlay scrollbars only draw while actively scrolling), and Safari only
// honors custom ::-webkit-scrollbar styling on an element scroller, not the root
// viewport. Making body an element scroller requires giving it an explicit height,
// but Safari decides the real popover height itself from the page's unconstrained
// content, so a guessed CSS height either leaves blank space below a shorter guess
// or - as `height: 100vh` did - feeds back into that sizing pass and collapses the
// popup. Measuring the real height in JS after Safari has already settled on it
// avoids both failure modes.
const SCROLL_CLASS = "wbe-safari-scroll";

function measureAndApply() {
  const body = document.body;
  const wasApplied = body.classList.contains(SCROLL_CLASS);
  // Reset to natural size before measuring, so a previous constrained height
  // doesn't make content look like it fits when it no longer does (or vice versa).
  // html's overflow must go back to visible at the same time: while body owns the
  // constrained height, html:hidden stops body's own overflow being propagated up
  // to the (unstylable) viewport scroller - but with no constrained height, that
  // same html:hidden would just clip content with no way to scroll it at all.
  if (wasApplied) {
    body.classList.remove(SCROLL_CLASS);
    body.style.height = "";
    document.documentElement.style.overflow = "";
  }

  const popupHeight = window.innerHeight;
  const contentHeight = document.documentElement.scrollHeight;
  console.log(`[WBE popup-scroll] popup height: ${popupHeight}, content height: ${contentHeight}`);

  if (contentHeight > popupHeight) {
    document.documentElement.style.overflow = "hidden";
    body.style.height = `${popupHeight}px`;
    body.classList.add(SCROLL_CLASS);
  }
}

export function initSafariPopupScrollFix() {
  if (navigatorDetect.browser.Blink || navigatorDetect.browser.Gecko) return;

  // Let Safari finish sizing the popover to the page's natural content before measuring.
  setTimeout(measureAndApply, 300);

  const debouncedRemeasure = debounce(measureAndApply, 200);
  new MutationObserver(debouncedRemeasure).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", debouncedRemeasure);
}

function debounce(fn, wait) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}
