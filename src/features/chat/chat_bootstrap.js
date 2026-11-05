import { createGenieVisibilityController } from "./chat_button_visibility";
import { getFeatureData } from "../../core/options/options_registry";
import { GENIE_ICON_SVG } from "./genie_icon";

const CHAT_FEATURE_ID = "chat";
const CHAT_BUTTON_ID = "wbe-chat-button";
const GENIE_BUTTON_ID = "wbe-genie-button";
const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
const AUTO_BIO_OPTIONS_KEY = "autoBio_options";
const CHAT_OPTIONS_KEY = "chat_options";

let museModulePromise = null;

function isChatFeatureEnabled() {
  const featureData = getFeatureData(CHAT_FEATURE_ID);
  const defaultEnabled = featureData?.defaultValue !== undefined ? Boolean(featureData.defaultValue) : true;

  return new Promise((resolve) => {
    chrome.storage.sync.get(CHAT_FEATURE_ID, (items) => {
      let enabled = items?.[CHAT_FEATURE_ID];
      if (enabled === undefined) {
        enabled = defaultEnabled;
      }

      if (enabled && Array.isArray(featureData?.pages) && featureData.pages.length) {
        enabled = featureData.pages.some(Boolean);
      }

      resolve(Boolean(enabled));
    });
  });
}

function ensureButtonContainer() {
  const existing = document.querySelector(".clipboardContainer");
  if (existing) {
    return existing;
  }

  const profileActions = document.querySelector(".profile--actions.float-end");
  if (profileActions) {
    const container = document.createElement("span");
    container.className = "clipboardContainer";
    const readingMode = profileActions.querySelector("a.action--reading-mode");
    if (readingMode?.parentNode) {
      readingMode.parentNode.insertBefore(container, readingMode);
    } else {
      profileActions.appendChild(container);
    }
    return container;
  }

  const managerBox = document.querySelector("#Manager")?.closest("div");
  if (managerBox) {
    const container = document.createElement("span");
    container.className = "clipboardContainer";
    managerBox.prepend(container);
    return container;
  }

  return null;
}

async function loadMuseModule() {
  if (!museModulePromise) {
    museModulePromise = import(
      /* webpackChunkName: "muse" */
      "./chat"
    ).catch((error) => {
      museModulePromise = null;
      throw error;
    });
  }

  return museModulePromise;
}

async function openMuse(event) {
  event?.preventDefault?.();

  const button = event?.currentTarget?.id ? event.currentTarget : document.getElementById(CHAT_BUTTON_ID);
  if (button) {
    button.setAttribute("aria-busy", "true");
    button.setAttribute("title", "Loading Genie");
  }

  try {
    const module = await loadMuseModule();
    module?.openChatPopup?.();
  } catch (error) {
    console.error("wbe: failed to lazy-load Genie", error);
    if (button) {
      button.setAttribute("title", "Genie failed to load; see console");
    }
  } finally {
    if (button) {
      button.removeAttribute("aria-busy");
      if (button.getAttribute("title") === "Loading Genie") {
        button.setAttribute("title", "Open Genie");
      }
    }
  }
}

function makeToolbarButton(id) {
  const button = document.createElement("a");
  if (id) {
    button.id = id;
  }
  button.href = "#";
  button.className = "wbe-button wbe-genie-bar-button";
  button.setAttribute("data-tooltip", "Genie");
  button.setAttribute("data-bs-title", "Genie");
  button.setAttribute("data-bs-toggle", "tooltip");
  button.setAttribute("aria-label", "Open Genie");
  button.innerHTML = `<span class="icon--chat" style="background-image:url(${chrome.runtime.getURL(
    "images/genie.svg"
  )})"></span>`;
  button.addEventListener("click", openMuse);
  return button;
}

// Joins the WBE buttons wherever they are. On a profile (or a page with a Manager box) the bar
// can be made straight away; elsewhere common.js builds it later, so watch for it for a while.
function placeChatButtons() {
  if (!document.getElementById(CHAT_BUTTON_ID)) {
    const container =
      document.querySelector(".clipboardContainer") ||
      (document.querySelector(".profile--actions.float-end, #Manager") ? ensureButtonContainer() : null);
    container?.appendChild(makeToolbarButton(CHAT_BUTTON_ID));
  }
  // (The second bar on edit pages and G2G holds the Clipboard and Notes buttons.)
  document.querySelectorAll(".wbe-button-container2").forEach((bar) => {
    if (!bar.querySelector(".wbe-genie-bar-button")) {
      bar.appendChild(makeToolbarButton(""));
    }
  });
  genieVisibility.sync();
}

const genieVisibility = createGenieVisibilityController();
let barObserver = null;
function ensureChatButton() {
  placeChatButtons();
  if (barObserver || !document.body) {
    return;
  }
  barObserver = new MutationObserver(() => {
    if (document.querySelector(".clipboardContainer, .wbe-button-container2")) {
      placeChatButtons();
    }
  });
  barObserver.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    barObserver?.disconnect();
    barObserver = null;
  }, 15000);
}

// The Genie in the profile heading, just left of the privacy padlock.
function ensureGenieButton() {
  if (document.getElementById(GENIE_BUTTON_ID)) {
    return;
  }

  // (WikiTree's own markup: the x-heading / x-privacy classes are added by profileClasses, which may not have run yet.)
  const privacy = document.querySelector(".page--title span.privacy")?.closest("div");
  if (!privacy?.parentNode) {
    return;
  }

  const column = document.createElement("div");
  column.className = "col-auto text-end p-0 wbe-genie-column";
  const button = document.createElement("a");
  button.id = GENIE_BUTTON_ID;
  button.href = "#";
  button.setAttribute("data-tooltip", "Genie");
  button.setAttribute("aria-label", "Open Genie");
  button.style.cssText = "display:inline-block;width:44px;height:44px;margin-right:12px;opacity:.85;transition:opacity .15s,transform .15s;";
  // (Its colour is in common.css, so Dark Mode can change it.)
  button.innerHTML = GENIE_ICON_SVG;
  button.querySelector("svg").style.cssText = "display:block;width:100%;height:100%;";
  button.addEventListener("mouseenter", () => {
    button.style.opacity = "1";
    button.style.transform = "translateY(-1px)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.opacity = ".85";
    button.style.transform = "";
  });
  button.addEventListener("click", openMuse);
  column.appendChild(button);
  privacy.parentNode.insertBefore(column, privacy);
  genieVisibility.sync();
}

function hideChatButton() {
  genieVisibility.destroy();
  barObserver?.disconnect();
  barObserver = null;
  document.querySelectorAll(".wbe-genie-bar-button").forEach((button) => button.remove());
  document.getElementById(GENIE_BUTTON_ID)?.closest(".wbe-genie-column")?.remove();
}

async function syncChatVisibility() {
  // (Genie is shown without an AI key too: its charts need none.)
  const enabled = await isChatFeatureEnabled();
  if (enabled) {
    ensureChatButton();
    ensureGenieButton();
    return;
  }

  hideChatButton();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (
    changes?.[CHAT_FEATURE_ID] ||
    changes?.[SHARED_AI_OPTIONS_KEY] ||
    changes?.[AUTO_BIO_OPTIONS_KEY] ||
    changes?.[CHAT_OPTIONS_KEY]
  ) {
    syncChatVisibility();
  }
});

syncChatVisibility();
