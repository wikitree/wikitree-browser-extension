/*
Tracks what the pointer is over and what was last right-clicked in this tab, so the background's
context menu can offer, and build, wiki links for headings (which are not themselves links) and,
on Safari, for the link under the pointer.
*/

let lastHeadingContext = null;

function normalizedHeadingText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

// Older MediaWiki anchors (still on Help pages) write every character other than a letter, digit,
// "-", "_" or ":" as "." plus its UTF-8 bytes in hex: "How_do_I_report_a_bug.3F" for "...bug?",
// ".C3.A9" for "é". A literal "." is itself written ".2E", so in such an id every ".XX" is an
// escape. Decoded so the link reads, and targets, the heading as written - as WikiTree's own Link
// button does. Anything that does not decode cleanly is left alone.
function decodeLegacyAnchor(text) {
  if (!/\.[0-9A-F]{2}/.test(text)) return text;
  try {
    return decodeURIComponent(text.replace(/\.([0-9A-F]{2})/g, "%$1"));
  } catch {
    return text;
  }
}

// A heading that can be linked to: one with an anchor id, which MediaWiki puts on the inner
// .mw-headline and WikiTree's profile pages put on the heading itself:
//   <h2 id="Biography" class="... section-biography"><span class="mw-headline">Biography</span>
//   <span class="editsection">[<a ...>edit</a>]</span></h2>
// A heading with no id (the profile's name, page furniture) has no section to link to.
function headingFromEventTarget(target) {
  if (!(target instanceof Element)) return null;

  const heading = target.closest("h1, h2, h3, h4, h5, h6");
  const headline = target.closest(".mw-headline") || heading?.querySelector(".mw-headline");
  if (!heading && !headline) return null;

  const id = headline?.id || heading?.id || "";
  if (!id) return null;

  let label;
  if (headline) {
    label = normalizedHeadingText(headline.textContent);
  } else {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll(".editsection, .mw-editsection").forEach((node) => node.remove());
    label = normalizedHeadingText(copy.textContent);
  }
  const fragment = normalizedHeadingText(decodeLegacyAnchor(id).replace(/_/g, " "));
  return { label: label || fragment, fragment };
}

document.addEventListener(
  "contextmenu",
  (event) => {
    const heading = headingFromEventTarget(event.target);
    lastHeadingContext = heading ? { ...heading, url: location.href, at: Date.now() } : null;
  },
  true
);

const isSafari = chrome.runtime.getURL("").startsWith("safari-web-extension:");

function tellBackground(message) {
  try {
    chrome.runtime.sendMessage(message, () => chrome.runtime.lastError);
  } catch {
    // Extension reloaded under the page; nothing to tell.
  }
}

// No browser lets a menu item say "only on headings", so the page reports when the pointer moves
// onto or off a linkable heading and the background offers the heading items only while it is on
// one. The menu is rebuilt then, before the right-click arrives.
//
// Safari also ignores targetUrlPatterns in a way that makes them unusable (see background.js), so
// it cannot tell which link items fit the link being right-clicked either. There the page also
// reports each link the pointer moves onto. Chrome and Firefox filter links by pattern.
let lastOnHeading = false;
let lastHoveredHref = "";
document.addEventListener(
  "mouseover",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const onHeading = Boolean(target && headingFromEventTarget(target));
    if (onHeading !== lastOnHeading) {
      lastOnHeading = onHeading;
      tellBackground({ action: "contextHeadingHovered", onHeading });
    }
    if (!isSafari) return;
    const link = target?.closest("a[href]");
    if (!link || !link.href || link.href === lastHoveredHref) return;
    lastHoveredHref = link.href;
    tellBackground({ action: "contextLinkHovered", url: link.href });
  },
  { capture: true, passive: true }
);

// Copying from a context-menu click.
//
// Safari's background is a service worker with no clipboard, and the page may only write to the
// clipboard while handling something the user did to the page. Choosing an extension's menu item
// is not that, so a plain writeText from here is refused. What Safari does allow is starting a
// write during a user action and supplying the data later: a ClipboardItem built from a promise.
// So on Safari every right-click on a link or heading starts such a write, and the copy request
// that follows our menu item fills it in. If the reader picks anything else, the write is abandoned
// (rejected) at the next right-click or after a minute, and a rejected write leaves the clipboard
// as it was.
//
// If that still fails - or in any browser where writeText is refused - the link is offered in a
// small box with a Copy button, whose click is a user action every browser accepts.
const PENDING_COPY_LIFETIME_MS = 60 * 1000;
let pendingCopy = null; // { resolve, reject, written, startedAt, timer }

function abandonPendingCopy() {
  if (!pendingCopy) return;
  clearTimeout(pendingCopy.timer);
  pendingCopy.reject(new Error("Not used"));
  pendingCopy = null;
}

function startPendingCopy() {
  abandonPendingCopy();
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return;
  let resolve;
  let reject;
  const text = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  text.catch(() => {}); // abandoned writes are expected, not errors
  let written;
  try {
    written = navigator.clipboard.write([
      new ClipboardItem({ "text/plain": text.then((value) => new Blob([value], { type: "text/plain" })) }),
    ]);
  } catch {
    return;
  }
  written.catch(() => {});
  const entry = { resolve, reject, written, startedAt: Date.now() };
  entry.timer = setTimeout(() => {
    if (pendingCopy === entry) abandonPendingCopy();
  }, PENDING_COPY_LIFETIME_MS);
  pendingCopy = entry;
}

if (isSafari) {
  document.addEventListener(
    "contextmenu",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && (target.closest("a[href]") || headingFromEventTarget(target))) startPendingCopy();
      else abandonPendingCopy();
    },
    true
  );
}

function showCopyBox(text) {
  document.getElementById("wbe-context-copy-box")?.remove();
  const box = document.createElement("div");
  box.id = "wbe-context-copy-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Copy wiki link");
  box.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "max-width:min(520px, calc(100vw - 32px))",
    "padding:10px 12px",
    "background:#fff",
    "color:#222",
    "border:1px solid #888",
    "border-radius:6px",
    "box-shadow:0 4px 16px rgba(0,0,0,.25)",
    "font:14px/1.4 sans-serif",
    "display:flex",
    "gap:8px",
    "align-items:center",
  ].join(";");

  const code = document.createElement("code");
  code.textContent = text;
  code.style.cssText = "flex:1;min-width:0;overflow-wrap:anywhere;user-select:all;font-size:13px";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");

  copy.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(
      () => {
        copy.textContent = "Copied";
        setTimeout(() => box.remove(), 800);
      },
      () => {
        // Last resort: leave the text selected for Cmd/Ctrl+C.
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = "Press ⌘C / Ctrl+C";
      }
    );
  });
  close.addEventListener("click", () => box.remove());
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") box.remove();
  });

  box.append(code, copy, close);
  document.body.append(box);
  copy.focus();
}

async function copyFromContextMenu(text) {
  if (pendingCopy && Date.now() - pendingCopy.startedAt < PENDING_COPY_LIFETIME_MS) {
    const entry = pendingCopy;
    pendingCopy = null;
    clearTimeout(entry.timer);
    entry.resolve(text);
    try {
      await entry.written;
      return "copied";
    } catch {
      // Fall through to the other ways.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    showCopyBox(text);
    return "offered";
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "getLastContextHeading") {
    sendResponse({ heading: lastHeadingContext });
    return;
  }
  if (message?.action === "copyFromContextMenu_inPage") {
    copyFromContextMenu(String(message.text || "")).then(
      (outcome) => sendResponse({ success: true, outcome }),
      (error) => sendResponse({ success: false, error: String(error?.message || error) })
    );
    return true; // async
  }
});
