import { getFeatureData } from "../../core/options/options_registry";

const CHAT_FEATURE_ID = "chat";
const CHAT_BUTTON_ID = "wbe-chat-button";
const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
const AUTO_BIO_OPTIONS_KEY = "autoBio_options";
const CHAT_OPTIONS_KEY = "chat_options";
const AI_KEY_FIELDS = ["openAIKey", "geminiKey", "claudeKey", "perplexityKey"];

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

function hasAnyApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SHARED_AI_OPTIONS_KEY, AUTO_BIO_OPTIONS_KEY, CHAT_OPTIONS_KEY], (items) => {
      const options = {
        ...(items?.[AUTO_BIO_OPTIONS_KEY] || {}),
        ...(items?.[CHAT_OPTIONS_KEY] || {}),
        ...(items?.[SHARED_AI_OPTIONS_KEY] || {}),
      };

      resolve(
        AI_KEY_FIELDS.some((field) => {
          const value = options?.[field];
          return typeof value === "string" && value.trim().length > 0;
        })
      );
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

  const button = document.getElementById(CHAT_BUTTON_ID);
  if (button) {
    button.setAttribute("aria-busy", "true");
    button.setAttribute("title", "Loading Muse");
  }

  try {
    const module = await loadMuseModule();
    module?.openChatPopup?.();
  } catch (error) {
    console.error("wbe: failed to lazy-load Muse", error);
    if (button) {
      button.setAttribute("title", "Muse failed to load; see console");
    }
  } finally {
    if (button) {
      button.removeAttribute("aria-busy");
      if (button.getAttribute("title") === "Loading Muse") {
        button.setAttribute("title", "Open Muse");
      }
    }
  }
}

function ensureChatButton() {
  if (document.getElementById(CHAT_BUTTON_ID)) {
    return;
  }

  const container = ensureButtonContainer();
  if (!container) {
    return;
  }

  const button = document.createElement("a");
  button.id = CHAT_BUTTON_ID;
  button.href = "#";
  button.className = "wbe-button";
  button.setAttribute("data-tooltip", "Muse");
  button.setAttribute("data-bs-title", "Muse");
  button.setAttribute("data-bs-toggle", "tooltip");
  button.setAttribute("title", "Open Muse");
  button.innerHTML = `<span class="icon--chat" style="background-image:url(${chrome.runtime.getURL(
    "images/chat.svg"
  )})"></span>`;
  button.addEventListener("click", openMuse);
  container.appendChild(button);
}

function hideChatButton() {
  document.getElementById(CHAT_BUTTON_ID)?.remove();
}

async function syncChatVisibility() {
  const [enabled, hasKey] = await Promise.all([isChatFeatureEnabled(), hasAnyApiKey()]);
  if (enabled && hasKey) {
    ensureChatButton();
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
