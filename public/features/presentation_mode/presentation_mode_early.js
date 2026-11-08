/*
Created By: Ian Beacall (Beacall-6)

Presentation Mode, part 1 of 2. Runs at document_start, before WikiTree draws anything, and keeps the page hidden
while Presentation Mode is on. src/features/presentation_mode/presentation_mode.js shows it again once it has
marked everything private (it runs later, at document_idle, with the rest of the extension).

A blank page looks broken, so if the page is still hidden after a moment, a short note says what's happening.

Plain JavaScript, copied as it is (not bundled), so it loads straight away.
*/
(function () {
  const host = window.location.hostname;
  // Presentation Mode doesn't run on WikiTree+ or on the API server, so it mustn't hide them.
  if (/^(plus|api)\./.test(host) || document.documentElement.hasAttribute("data-wbe-pm-early")) return;
  // In a frame (the profile's tree widget, for example), the page around it does the checking and shows the frame
  // again. That works only when the page around it is on the same site; otherwise leave the frame alone (the
  // page around it blurs the whole frame if it is a WikiTree page).
  const inFrame = window !== window.top;
  if (inFrame) {
    try {
      if (window.top.location.origin !== window.location.origin) return;
    } catch (error) {
      return;
    }
  }
  document.documentElement.setAttribute("data-wbe-pm-early", "1");

  const NOTE_AFTER_MS = 800;
  // If nothing has shown the page again by then (and the main script isn't working on it), something went wrong.
  const GIVE_UP_MS = 20000;

  chrome.storage.sync.get("presentationMode", (items) => {
    const root = document.documentElement;
    // Already checked and shown (a frame can be checked before this answer arrives).
    if (items?.presentationMode !== true || root.hasAttribute("data-wbe-pm-shown")) return;
    root.classList.add("wbe-pm-pending");
    const style = document.createElement("style");
    style.id = "wbe-pm-early-style";
    style.textContent =
      "html.wbe-pm-pending body > :not(#wbe-pm-overlay):not(#wbe-pm-early-notice) { visibility: hidden !important; }" +
      "html.wbe-pm-pending body { background-image: none !important; }";
    root.appendChild(style);

    const stillHidden = () => root.classList.contains("wbe-pm-pending") && !document.getElementById("wbe-pm-overlay");
    // A frame is too small for notes; the page around it has its own.
    if (inFrame) return;
    setTimeout(
      () => stillHidden() && showNote("Presentation Mode is checking this page for private details…"),
      NOTE_AFTER_MS
    );
    setTimeout(() => {
      if (!stillHidden() || root.hasAttribute("data-wbe-pm-working")) return;
      showNote(
        "Presentation Mode is hiding this page, but its checks didn't start. Reload the page, or show it without " +
          "hiding anything.",
        true
      );
    }, GIVE_UP_MS);

    function showNote(text, withButton) {
      let notice = document.getElementById("wbe-pm-early-notice");
      if (!notice) {
        notice = document.createElement("div");
        notice.id = "wbe-pm-early-notice";
        notice.setAttribute("role", "status");
        notice.style.cssText =
          "position:fixed;top:40%;left:0;right:0;margin:0 auto;max-width:420px;padding:14px 18px;border-radius:10px;" +
          "background:#fff;border:1px solid #cfe0cf;box-shadow:0 2px 10px rgba(0,0,0,.12);font:15px/1.45 system-ui," +
          "-apple-system,sans-serif;color:#2f6b2f;text-align:center;z-index:2147483001;visibility:visible";
        (document.body || root).appendChild(notice);
      }
      notice.textContent = text;
      if (withButton) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Show this page";
        button.style.cssText =
          "display:block;margin:10px auto 0;font:inherit;font-size:14px;padding:4px 12px;cursor:pointer";
        button.addEventListener("click", () => {
          root.classList.remove("wbe-pm-pending");
          style.remove();
          notice.remove();
          document.querySelectorAll("iframe").forEach((iframe) => {
            try {
              iframe.contentDocument?.documentElement.classList.remove("wbe-pm-pending");
            } catch (error) {
              // another site's frame: never hidden
            }
          });
        });
        notice.appendChild(button);
      }
    }
  });
})();
