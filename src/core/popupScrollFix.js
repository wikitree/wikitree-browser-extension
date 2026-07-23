import { navigatorDetect } from "./navigatorDetect";

// Safari's extension popup scrolls (trackpad/wheel) but the scrollbar is invisible
// (macOS overlay scrollbars only draw while actively scrolling), and Safari only
// honors custom ::-webkit-scrollbar styling on an element scroller, not the root
// viewport. Making body an element scroller requires an explicit height, but any
// viewport-relative CSS height (100vh) feeds back into Safari's own popover sizing
// pass and collapses the popup, while a guessed fixed height leaves blank space
// below a popover that is really taller. So the height is measured in JS after
// Safari has settled, applied in px, and clamped so a pathological reading taken
// mid-settle (collapsed popover, or a viewport reported as tall as the content)
// can never collapse or blow up the popup.
const SCROLL_CLASS = "wbe-safari-scroll";
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 1000;

function measureAndApply() {
  const body = document.body;
  const html = document.documentElement;
  const scrollTop = body.scrollTop;

  // Reset to natural size before measuring, so a previously applied height doesn't
  // skew this pass. html's overflow goes back to visible at the same time: while
  // body owns a constrained height, html:hidden stops body's overflow being
  // propagated to the (unstylable) viewport scroller, but with no constrained
  // height it would just clip the content with no way to scroll it.
  if (body.classList.contains(SCROLL_CLASS)) {
    body.classList.remove(SCROLL_CLASS);
    body.style.height = "";
    html.style.overflow = "";
  }

  const popupHeight = window.innerHeight;
  const contentHeight = html.scrollHeight;
  const targetHeight = Math.min(Math.max(popupHeight, MIN_HEIGHT), MAX_HEIGHT);
  const needsScroll = contentHeight > targetHeight;
  console.log(
    `[WBE popup-scroll v2] innerHeight: ${popupHeight}, content: ${contentHeight},`,
    needsScroll ? `applying ${targetHeight}px scroll container` : "content fits, leaving natural"
  );

  if (needsScroll) {
    html.style.overflow = "hidden";
    body.style.height = `${targetHeight}px`;
    body.classList.add(SCROLL_CLASS);
    body.scrollTop = scrollTop;
  }
}

export function initSafariPopupScrollFix() {
  if (navigatorDetect.browser.Blink || navigatorDetect.browser.Gecko) return;

  // Safari settles the popover size late and unpredictably; a few staggered passes
  // plus mutation/resize listeners cover both slow settling and content changes
  // (e.g. the search box filtering the feature list).
  [250, 1000, 2500].forEach((delay) => setTimeout(measureAndApply, delay));

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
