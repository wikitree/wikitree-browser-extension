import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("goldStandard").then((enabled) => {
  if (enabled && (document.body.classList.contains("profile") || document.body.classList.contains("edit-person"))) {
    init();
  }
});

async function init() {
  const profileId = document.querySelector("#pageData")?.getAttribute("data-mnamedb")?.trim();
  if (!profileId) return;

  // Wait for the styles so the button never appears unstyled.
  await import("./gold_standard.css");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wbe-gold-standard-button";
  button.title = "Gold Standard Inspector";
  button.setAttribute("aria-label", "Gold Standard Inspector");
  button.setAttribute("aria-haspopup", "dialog");
  button.textContent = "GSI";
  button.addEventListener("click", () => {
    openInspector(profileId);
  });

  const researchStatus = document.querySelector('[data-cy="research-status"]');
  const jumpNav = document.querySelector("#jump-nav");
  (researchStatus || jumpNav)?.appendChild(button);
}

function openInspector(profileId) {
  document.querySelector(".wbe-gold-standard-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "wbe-gold-standard-overlay";
  overlay.innerHTML = `
    <section class="wbe-gold-standard-dialog" role="dialog" aria-modal="true" aria-labelledby="wbeGoldStandardTitle">
      <header class="wbe-gold-standard-header">
        <h2 id="wbeGoldStandardTitle">Gold Standard Inspector</h2>
        <button type="button" class="wbe-gold-standard-close" aria-label="Close inspector">&times;</button>
      </header>
      <div class="wbe-gold-standard-content" aria-live="polite">
        <p role="status">Checking this profile…</p>
      </div>
    </section>
  `;
  const content = overlay.querySelector(".wbe-gold-standard-content");
  const closeButton = overlay.querySelector(".wbe-gold-standard-close");

  function close() {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") close();
  }

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);
  document.body.appendChild(overlay);
  closeButton.focus();

  loadResults(profileId, content);
}

async function loadResults(profileId, content) {
  try {
    const response = await requestInspector(profileId);
    if (!response?.success) {
      throw new Error(response?.error || "The inspector request failed.");
    }

    const result = response.data;
    if (
      !result ||
      result.ok !== true ||
      !Array.isArray(result.items) ||
      !result.items.every((item) => typeof item === "string")
    ) {
      throw new Error(result?.error || "The inspector returned an invalid response.");
    }

    content.replaceChildren();
    if (result.items.length === 0) {
      const passed = document.createElement("p");
      passed.className = "wbe-gold-standard-passed";
      passed.textContent = "Passed Gold Standard Inspector checks. Ready for a full peer review!";
      content.appendChild(passed);
      return;
    }

    const list = document.createElement("ul");
    list.className = "wbe-gold-standard-results";
    result.items.forEach((item) => {
      const entry = document.createElement("li");
      appendSafeMarkup(entry, item);
      list.appendChild(entry);
    });
    content.appendChild(list);
  } catch (error) {
    content.replaceChildren();
    const message = document.createElement("p");
    message.className = "wbe-gold-standard-error";
    message.setAttribute("role", "alert");
    message.textContent = `Could not inspect this profile: ${error instanceof Error ? error.message : String(error)}`;
    content.appendChild(message);
  }
}

function requestInspector(profileId) {
  return new Promise((resolve, reject) => {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      reject(new Error("The extension background service is unavailable."));
      return;
    }

    chrome.runtime.sendMessage({ action: "goldStandardInspector", profile: profileId }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message || "The inspector request could not be sent."));
      } else {
        resolve(response);
      }
    });
  });
}

function appendSafeMarkup(container, markup) {
  const parsed = new DOMParser().parseFromString(markup, "text/html");

  function copyNodes(source, target) {
    source.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        target.appendChild(document.createTextNode(node.nodeValue || ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tagName = node.tagName.toLowerCase();
      if (tagName === "strong") {
        const strong = document.createElement("strong");
        copyNodes(node, strong);
        target.appendChild(strong);
      } else if (tagName === "a") {
        const href = safeWikiTreeUrl(node.getAttribute("href"));
        if (!href) {
          copyNodes(node, target);
          return;
        }
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        copyNodes(node, anchor);
        target.appendChild(anchor);
      } else {
        copyNodes(node, target);
      }
    });
  }

  copyNodes(parsed.body, container);
}

function safeWikiTreeUrl(href) {
  if (!href) return null;
  try {
    const url = new URL(href, "https://www.wikitree.com");
    return url.protocol === "https:" && /(^|\.)wikitree\.com$/i.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
