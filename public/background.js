if (chrome.runtime) {
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
      // The monthly backup reminder counts from this, so a new user isn't told on their
      // first page load that it's been a while since a backup they never made.
      chrome.storage?.local?.set({ wbeInstallDate: Date.now() });
      chrome.tabs.create({
        url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
        active: true,
      });
      chrome.runtime.openOptionsPage();
    } else if (details.reason == "update") {
      (chrome ?? browser).storage?.sync?.get("wbeSettings_disableUpdateNotification", function (result) {
        if (!result?.wbeSettings_disableUpdateNotification) {
          // Use this to open the extension update page on update. Comment it out the rest of the time.
          /*
          chrome.tabs.create({
            //            url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update",
            url: "https://www.wikitree.com/g2g/1896249/wikitree-browser-extension-update-2-3",
            active: true,
          });
          */
        }
      });
    }
  });
}

// Context menu items.
// contextMenus is not implemented on Firefox for Android, so everything
// below is skipped there rather than throwing and killing this script.
//
// Which items are shown is worked out here rather than left to documentUrlPatterns, because
// Safari does not behave like Chrome on either count:
//   * It matches documentUrlPatterns against the path alone, so a pattern with a query string in
//     it (index.php?title=Special:EditPerson*) never matches and the item never appears at all.
//   * It shows every item in the menu you get by right-clicking the toolbar icon, whatever the
//     item's patterns say, so items for the page you are on are offered on pages they cannot work.
// Only creating the items the active tab can use means the same thing in every browser, and covers
// the toolbar menu as well as the page menu.
if (chrome.contextMenus) {
  // Safari matches documentUrlPatterns against the path alone (see the note above), so any pattern
  // of the usual scheme://host/path form never matches and the item disappears from every menu.
  // documentUrlPatterns is therefore only usable on Chromium/Firefox; on Safari we leave it off and
  // keep the old always-shown behaviour. The extension's own URL scheme is the reliable tell -
  // safari-web-extension:// on Safari, chrome-extension:// / moz-extension:// elsewhere - with no
  // user-agent sniffing (Chrome's UA also says "Safari").
  const isSafari = chrome.runtime.getURL("").startsWith("safari-web-extension:");

  // The URL tests mirror src/core/pageType.js, which is what decides whether the features
  // themselves run. featureId/featureDefault mirror the feature's registration, so an item is
  // not offered for a feature the user has switched off (the click would do nothing).
  const contextMenuItems = [
    {
      id: "myContextMenu",
      title: "Wikitable Wizard",
      featureId: "wikitableWizard",
      featureDefault: true,
      isUsefulOn: (url) => isWikiEditUrl(url),
    },
    {
      id: "clipboardContextMenu",
      title: "Clipboard",
      featureId: "clipboardAndNotes",
      featureDefault: false,
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "notesContextMenu",
      title: "Notes",
      featureId: "clipboardAndNotes",
      featureDefault: false,
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      // No featureId: the simulator is a checking tool, useful to anyone reviewing a page whether
      // or not they have Color-Blind Support switched on for themselves, so it is offered either
      // way. The content script starts the simulation without turning the rest of the feature on.
      //
      // A submenu: the first entry opens on the reader's saved default condition, and its label
      // shows which; the rest open a specific one directly. The chosen mode travels to the content
      // script on the message. A parent that has children is not itself clickable, which is why the
      // default lives in its own "Open" entry rather than on the parent.
      id: "colorBlindSimulatorContextMenu",
      title: "Color-Blind Simulator",
      isUsefulOn: (url) => isMainDomainUrl(url),
      submenu: [
        { id: "colorBlindSimulatorOpen" }, // label built from the saved default at build time
        { id: "colorBlindSimulatorSeparator", type: "separator" },
        { id: "colorBlindSimulatorDeuteranopia", title: "Deuteranopia", mode: "deuteranopia" },
        { id: "colorBlindSimulatorProtanopia", title: "Protanopia", mode: "protanopia" },
        { id: "colorBlindSimulatorTritanopia", title: "Tritanopia", mode: "tritanopia" },
        { id: "colorBlindSimulatorAchromatopsia", title: "Achromatopsia", mode: "achromatopsia" },
      ],
    },
    {
      // Both halves of a backup need the content script: the feature data is read from the page,
      // and on Safari the page is also the only thing that can save a file with a name on it. So
      // these are offered on WikiTree pages only, whatever the browser.
      id: "backupAllContextMenu",
      title: "Backup",
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "restoreAllContextMenu",
      title: "Restore",
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      // The settings page is otherwise buried, so this one is offered everywhere, including in
      // Safari's toolbar icon menu when the tab has nothing to do with WikiTree. "action" puts it
      // in the icon menu in Chrome too, where items for the page do not appear there.
      //
      // documentUrlPatterns keeps the page-context copy off pages we should not decorate - chiefly
      // OTHER extensions' popups, which are chrome-extension:// documents that "all" would otherwise
      // match, so WBE's "Settings" turned up when you right-clicked inside, say, the Sourcer popup.
      // The "*" scheme matches only http/https, so the extension scheme is excluded while every real
      // web page (and file:// page) still gets it. It does not touch the "action" (toolbar) copy -
      // that context has no document to match. Applied only off Safari (see isSafari above), where
      // these patterns would match nothing and remove the item everywhere.
      id: "optionsContextMenu",
      title: "Settings",
      contexts: ["all", "action"],
      documentUrlPatterns: ["*://*/*", "file:///*"],
      isUsefulOn: () => true,
    },
  ];

  // Which simulator condition each submenu entry launches, derived from the definition above so
  // the two cannot drift. The "Open" entry maps to undefined: no mode, the content script uses the
  // reader's saved default.
  const simulatorMenuModes = Object.fromEntries(
    (contextMenuItems.find((item) => item.id === "colorBlindSimulatorContextMenu")?.submenu ?? [])
      .filter((child) => child.type !== "separator")
      .map((child) => [child.id, child.mode])
  );

  function wikiTreePageUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null; // no URL at all: a tab we have no permission for, or a new tab page
    }
    if (parsed.protocol !== "https:" || !/(^|\.)wikitree\.com$/.test(parsed.hostname)) return null;
    // apps, api and plus are separate sites; these features only run on the main one.
    if (/^(apps|api|plus)\./.test(parsed.hostname)) return null;
    return parsed;
  }

  function isMainDomainUrl(url) {
    return Boolean(wikiTreePageUrl(url));
  }

  // Profile edit pages, and Space/Category/Template/Help/Project edit pages: anywhere there is
  // wiki text to put a table into. The same set as the Wikitable Wizard's own isWikiEdit check.
  // Titles can arrive with the colon encoded, hence the (:|%3A|%3a) in each pattern.
  function isWikiEditUrl(url) {
    const parsed = wikiTreePageUrl(url);
    if (!parsed) return false;
    const uri = parsed.href;
    return (
      /\/(index\.php\?title=|wiki\/)Special(:|%3A|%3a)EditPerson/.test(uri) ||
      /\/index\.php\?title=[^&]+(:|%3A|%3a)[^&]*&action=(edit|submit)/.test(uri)
    );
  }

  function activeTabUrl() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        // Without host permission for the tab's site, url is empty, which is the same answer as
        // "nothing here for us": without that permission the content script isn't running either.
        resolve((!chrome.runtime.lastError && tabs?.[0]?.url) || "");
      });
    });
  }

  function featureSettings() {
    const keys = [...new Set(contextMenuItems.map((item) => item.featureId).filter(Boolean))];
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (items) => resolve((!chrome.runtime.lastError && items) || {}));
    });
  }

  // An item with no featureId belongs to no feature and is always on.
  function isFeatureEnabled(item, settings) {
    return !item.featureId || (settings[item.featureId] ?? item.featureDefault);
  }

  // Human names for the simulator conditions, used to label the "Open" entry with the reader's
  // saved default. Keyed by the mode the content script understands.
  const SIMULATOR_MODE_LABELS = {
    deuteranopia: "Deuteranopia",
    protanopia: "Protanopia",
    tritanopia: "Tritanopia",
    achromatopsia: "Achromatopsia",
  };

  // The condition the menu's "Open" entry starts with, read from Color-Blind Support's options.
  // Guarded so a missing or unknown value falls back to deuteranopia, the same first look the
  // content script uses.
  function simulatorLaunchMode() {
    return new Promise((resolve) => {
      chrome.storage.sync.get("colorBlindSupport_options", (items) => {
        const saved = !chrome.runtime.lastError && items && items.colorBlindSupport_options;
        const mode = saved && saved.menuLaunchMode;
        resolve(SIMULATOR_MODE_LABELS[mode] ? mode : "deuteranopia");
      });
    });
  }

  // Safari has not always supported the "action" context. Rather than lose the item if it rejects
  // one, a create that fails is retried with the contexts every browser has.
  function createMenu(props) {
    const contexts = props.contexts ?? ["all"];
    chrome.contextMenus.create({ ...props, contexts }, () => {
      if (chrome.runtime.lastError && contexts.length > 1) {
        chrome.contextMenus.create({ ...props, contexts: ["all"] }, () => chrome.runtime.lastError);
      }
    });
  }

  function createContextMenuItem(item, launchMode) {
    const contexts = item.contexts ?? ["all"];
    createMenu({
      id: item.id,
      title: item.title,
      contexts,
      // Only some items restrict which documents they attach to; the rest attach to all of them.
      // Skipped on Safari, which matches these patterns against the path alone and so would drop the
      // item from every menu rather than just the ones we mean to exclude.
      ...(item.documentUrlPatterns && !isSafari ? { documentUrlPatterns: item.documentUrlPatterns } : {}),
    });
    // A submenu hangs its children off the parent. The "Open" entry's label is built from the
    // saved default so the reader can see what a plain open will do; the rest are static.
    (item.submenu ?? []).forEach((child) => {
      const title =
        child.id === "colorBlindSimulatorOpen"
          ? `Open (${SIMULATOR_MODE_LABELS[launchMode]})`
          : child.title;
      createMenu({ id: child.id, parentId: item.id, type: child.type, title, contexts });
    });
  }

  // The items that should be there are created and the rest are removed, rather than created once
  // and hidden with `visible`, because create and remove behave the same everywhere.
  let shownIds = null; // what the menu holds; null until this copy of the script has built it
  let pending = Promise.resolve(); // rebuilds are queued, so two of them cannot interleave

  function refreshContextMenus() {
    pending = pending.then(rebuildContextMenus).catch(() => {});
    return pending;
  }

  async function rebuildContextMenus() {
    const [url, settings, launchMode] = await Promise.all([
      activeTabUrl(),
      featureSettings(),
      simulatorLaunchMode(),
    ]);
    const wanted = contextMenuItems.filter((item) => isFeatureEnabled(item, settings) && item.isUsefulOn(url));
    // The launch mode is part of the signature: it changes the "Open" entry's label without
    // changing any id, so a rebuild has to be allowed when only it has moved.
    const wantedIds = wanted.map((item) => item.id).join() + "|" + launchMode;
    if (shownIds === wantedIds) return;
    await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));
    wanted.forEach((item) => createContextMenuItem(item, launchMode));
    shownIds = wantedIds;
  }

  // Built every time the background script starts, not only on install: onInstalled fires when the
  // version changes, so in Safari a rebuilt extension can otherwise go on serving the menu it was
  // installed with and never show a newly added item.
  refreshContextMenus();

  chrome.runtime.onStartup?.addListener(() => refreshContextMenus());
  chrome.tabs.onActivated.addListener(() => refreshContextMenus());
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === "complete") refreshContextMenus();
  });
  chrome.windows?.onFocusChanged.addListener(() => refreshContextMenus());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    // A feature being switched on or off changes which items belong; the simulator's own options
    // change the "Open" entry's label. Both need a rebuild.
    if (
      contextMenuItems.some((item) => item.featureId && item.featureId in changes) ||
      "colorBlindSupport_options" in changes
    ) {
      refreshContextMenus();
    }
  });

  // Listen for the context menu item click
  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === "myContextMenu") {
      // Execute script in the content script
      chrome.tabs.sendMessage(tab.id, { action: "launchWikitableWizard" });
    }
    if (info.menuItemId === "clipboardContextMenu") {
      // Execute script in the content script
      chrome.tabs.sendMessage(tab.id, { action: "showClipboard" });
    }
    if (info.menuItemId in simulatorMenuModes) {
      // "Open" carries no mode (the content script uses the saved default); each condition entry
      // carries its own. The parent itself is never clicked - it has children.
      chrome.tabs.sendMessage(tab.id, {
        action: "showColorBlindSimulator",
        mode: simulatorMenuModes[info.menuItemId],
      });
    }
    if (info.menuItemId === "backupAllContextMenu") {
      chrome.tabs.sendMessage(tab.id, { action: "backupEverything" });
    }
    if (info.menuItemId === "restoreAllContextMenu") {
      chrome.tabs.sendMessage(tab.id, { action: "restoreEverything" });
    }
    if (info.menuItemId === "notesContextMenu") {
      // Execute script in the content script
      chrome.tabs.sendMessage(tab.id, { action: "showNotes" });
    }
    if (info.menuItemId === "optionsContextMenu") {
      // openOptionsPage is the one that reuses an already open settings tab, so it is worth
      // trying first, but it is not in every browser this runs in.
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage(() => {
          if (chrome.runtime.lastError) chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
        });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
      }
    }
  });
}

// Clipboard functions from content script for browsers that don't support navigator.clipboard (i.e. Firefox)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "copyToClipboard") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      (async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "copyToClipboard_inPage", text: message.text }, (resp) =>
        sendResponse(resp)
      );
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }

  if (message.action === "readFromClipboard") {
    if (navigator.clipboard && navigator.clipboard.readText) {
      (async () => {
        try {
          const text = await navigator.clipboard.readText();
          sendResponse({ success: true, text });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "readFromClipboard_inPage" }, (resp) => sendResponse(resp));
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }

  if (message.action === "improveBioWithAI") {
    handleAIRequest(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "duplicatesRead") {
    handleDuplicatesRead(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "duplicatesSetStatus") {
    handleDuplicatesSetStatus(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "duplicatesCompareProfiles") {
    handleDuplicatesCompareProfiles(message, sendResponse);
    return true; // Keep channel open for async response
  }
});

const DUPLICATES_READ_ENDPOINTS = [
  "https://apps.wikitree.com/apps/beacall6/duplicates/api.php",
  "https://apps.wikitree.com/beacall6/duplicates/api.php",
];
const DUPLICATES_AUTH_SESSION_ENDPOINTS = [
  "https://apps.wikitree.com/apps/beacall6/duplicates/api/auth_session.php",
  "https://apps.wikitree.com/beacall6/duplicates/api/auth_session.php",
];
const DUPLICATES_RESOLVE_ENDPOINTS = [
  "https://apps.wikitree.com/apps/beacall6/duplicates/api/resolve.php",
  "https://apps.wikitree.com/beacall6/duplicates/api/resolve.php",
];
const UNAUTHORIZED_STATUS_MESSAGE =
  "Not authorized for Arborists status updates. Please confirm you are logged into WikiTree.";
// The apps.wikitree.com hosts sit behind an AWS WAF challenge rule that answers unidentified
// clients with 202 and an empty body. Requests carrying an appId query parameter are allowed
// through, so every duplicates request must include one.
const DUPLICATES_APP_ID = "WBEDuplicates";

function withAppId(url) {
  const withParam = new URL(url);
  withParam.searchParams.set("appId", DUPLICATES_APP_ID);
  return withParam.toString();
}

let arboristsSessionToken = "";
let arboristsSessionTokenExpiresAt = 0;

function clearArboristsSessionToken() {
  arboristsSessionToken = "";
  arboristsSessionTokenExpiresAt = 0;
}

function isTokenStillValid() {
  if (!arboristsSessionToken || !arboristsSessionTokenExpiresAt) {
    return false;
  }
  const refreshBufferMs = 15 * 1000;
  return Date.now() + refreshBufferMs < arboristsSessionTokenExpiresAt;
}

function getTokenFromResponse(data) {
  if (!data || typeof data !== "object") {
    return "";
  }
  return data.token || data.access_token || data.jwt || data.session_token || "";
}

function getTokenExpiryMs(data) {
  if (!data || typeof data !== "object") {
    return Date.now() + 5 * 60 * 1000;
  }

  const expiresIn = Number(data.expires_in || data.expiresIn || 0);
  if (Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }

  const expiresAtRaw = data.expires_at || data.expiresAt;
  if (typeof expiresAtRaw === "number" && Number.isFinite(expiresAtRaw)) {
    return expiresAtRaw > 1e12 ? expiresAtRaw : expiresAtRaw * 1000;
  }
  if (typeof expiresAtRaw === "string") {
    const parsed = Date.parse(expiresAtRaw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now() + 5 * 60 * 1000;
}

function normalizeApiResponse(parsedBody, rawBody) {
  return parsedBody.ok ? parsedBody.data : { raw: rawBody };
}

function createHttpError(status, message, data) {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
}

async function fetchDuplicatesApiWithFallback(urls, fetchOptions = {}) {
  const candidates = Array.isArray(urls) ? urls : [urls];
  let lastResult = null;

  for (const url of candidates) {
    try {
      const response = await fetch(withAppId(url), fetchOptions);
      const rawBody = await response.text();
      const parsedBody = tryParseJsonOrJsonl(rawBody);
      const responseData = normalizeApiResponse(parsedBody, rawBody);
      const looksHtml = !parsedBody.ok && /<(html|!doctype)/i.test(rawBody || "");

      lastResult = {
        response,
        responseData,
        parsedOk: parsedBody.ok,
        looksHtml,
      };

      const shouldTryNext = !response.ok && response.status === 404;
      const shouldTryNextForHtml = looksHtml && !parsedBody.ok;
      if (shouldTryNext || shouldTryNextForHtml) {
        continue;
      }

      return lastResult;
    } catch (error) {
      lastResult = { error };
      continue;
    }
  }

  if (lastResult?.error) {
    throw lastResult.error;
  }
  return lastResult;
}

async function getArboristsSessionToken(forceRefresh = false) {
  if (!forceRefresh && isTokenStillValid()) {
    return arboristsSessionToken;
  }

  const { response, responseData, parsedOk, looksHtml } = await fetchDuplicatesApiWithFallback(
    DUPLICATES_AUTH_SESSION_ENDPOINTS,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
      redirect: "follow",
    }
  );

  if (!response.ok) {
    throw createHttpError(
      response.status,
      responseData?.error || "Failed to start Arborists auth session.",
      responseData
    );
  }

  if (!parsedOk || looksHtml) {
    const raw = String(responseData?.raw || "").toLowerCase();
    const looksLikeLoginPage = /\blog\s*in\b|\blogin\b|special:userlogin|signin/.test(raw);
    if (looksLikeLoginPage) {
      throw createHttpError(401, UNAUTHORIZED_STATUS_MESSAGE, responseData);
    }
    throw createHttpError(503, "Arborists auth session did not return valid JSON.", responseData);
  }

  const token = getTokenFromResponse(responseData);
  if (!token) {
    throw createHttpError(503, "Arborists auth session returned no token.", responseData);
  }

  arboristsSessionToken = token;
  arboristsSessionTokenExpiresAt = getTokenExpiryMs(responseData);
  return arboristsSessionToken;
}

async function postDuplicatesResolve(payload, token) {
  return fetchDuplicatesApiWithFallback(DUPLICATES_RESOLVE_ENDPOINTS, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

async function handleDuplicatesRead(message, sendResponse) {
  try {
    const wtId = (message?.requestedWikiTreeId || "").trim();
    if (!wtId) {
      sendResponse({ success: false, error: "Missing requested WikiTree ID." });
      return;
    }

    const readUrls = DUPLICATES_READ_ENDPOINTS.map((baseUrl) => {
      const url = new URL(baseUrl);
      url.searchParams.set("id", wtId);
      if (message?.includeResolved) {
        url.searchParams.set("include_resolved", "1");
      }
      return url.toString();
    });

    const { response, responseData, parsedOk } = await fetchDuplicatesApiWithFallback(readUrls, {
      method: "GET",
      redirect: "follow",
    });

    if (!parsedOk) {
      sendResponse({
        success: false,
        error: "Duplicates API did not return JSON.",
        status: response.status,
        data: { raw: String(responseData?.raw || "").slice(0, 300) },
      });
      return;
    }

    if (!response.ok) {
      sendResponse({
        success: false,
        error: responseData?.error || `Read request failed with status ${response.status}`,
        status: response.status,
        data: responseData,
      });
      return;
    }

    sendResponse({ success: true, data: responseData });
  } catch (error) {
    sendResponse({ success: false, error: error?.message || "Duplicates read request failed." });
  }
}

async function handleDuplicatesSetStatus(message, sendResponse) {
  try {
    const payload = {
      match_id: message?.matchId || message?.pairId || "",
      status: message?.status || message?.reviewStatus || "",
      client_wt_id: message?.clientWtId || "",
      note: message?.note || "",
      notes: message?.note || "",
    };

    if (!payload.match_id) {
      sendResponse({ success: false, error: "Missing match_id for status update." });
      return;
    }
    if (!payload.status) {
      sendResponse({ success: false, error: "Missing status for status update." });
      return;
    }

    let token = await getArboristsSessionToken(false);
    let { response, responseData } = await postDuplicatesResolve(payload, token);

    if (response.status === 401 || response.status === 403) {
      clearArboristsSessionToken();
      token = await getArboristsSessionToken(true);
      ({ response, responseData } = await postDuplicatesResolve(payload, token));
    }

    if (response.status === 401 || response.status === 403) {
      clearArboristsSessionToken();
      sendResponse({
        success: false,
        error: UNAUTHORIZED_STATUS_MESSAGE,
        status: response.status,
        data: responseData,
      });
      return;
    }

    if (!response.ok) {
      sendResponse({
        success: false,
        error: responseData?.error || `Set Status failed with status ${response.status}`,
        status: response.status,
        data: responseData,
      });
      return;
    }

    sendResponse({ success: true, data: responseData });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      clearArboristsSessionToken();
      sendResponse({ success: false, error: UNAUTHORIZED_STATUS_MESSAGE, status });
      return;
    }

    if (status >= 500 || !status) {
      const serverMessage = String(error?.message || "").trim();
      sendResponse({
        success: false,
        error: serverMessage
          ? `${serverMessage} The duplicates panel remains in read-only mode.`
          : "Arborists status updates are temporarily unavailable. The duplicates panel remains in read-only mode.",
        status: status || undefined,
        data: error?.data || undefined,
      });
      return;
    }

    sendResponse({ success: false, error: error?.message || "Set Status request failed." });
  }
}

async function handleDuplicatesCompareProfiles(message, sendResponse) {
  try {
    const ids = Array.isArray(message?.ids) ? message.ids.map((id) => String(id || "").trim()).filter(Boolean) : [];

    if (ids.length < 2) {
      sendResponse({ success: false, error: "Compare requires two WikiTree IDs." });
      return;
    }

    const fields = [
      "Id",
      "Name",
      "FirstName",
      "MiddleName",
      "RealName",
      "Prefix",
      "Suffix",
      "LastNameAtBirth",
      "LastNameCurrent",
      "Gender",
      "BirthDate",
      "DeathDate",
      "BirthLocation",
      "DeathLocation",
      "Father",
      "Mother",
      "Children",
      "Siblings",
      "Spouses",
      "Managers",
      "Created",
      "Touched",
      "Connected",
      "Privacy",
      "DataStatus",
      "Bio",
      "bioHTML",
    ];

    const params = new URLSearchParams();
    params.set("appId", "WBE_duplicates");
    params.set("action", "getPeople");
    params.set("keys", ids.join(","));
    params.set("fields", fields.join(","));
    params.set("nuclear", "1");
    params.set("bioFormat", "html");

    const response = await fetch("https://api.wikitree.com/api.php", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const rawBody = await response.text();
    const parsedBody = tryParseJsonOrJsonl(rawBody);
    if (!parsedBody.ok) {
      sendResponse({
        success: false,
        error: "WikiTree API did not return valid JSON.",
        status: response.status,
      });
      return;
    }

    const root = Array.isArray(parsedBody.data) ? parsedBody.data[0] : null;
    const people = root?.people || {};
    const resultByKey = root?.resultByKey || {};

    const profiles = {};
    ids.forEach((requestedId) => {
      const lookup = resultByKey?.[requestedId] || resultByKey?.[requestedId.replace(/_/g, " ")];
      const personId = lookup?.Id;
      let profile = personId ? people?.[personId] : null;

      if (!profile) {
        const normalizedRequested = requestedId.replace(/\s+/g, "_").toLowerCase();
        profile = Object.values(people).find(
          (person) =>
            String(person?.Name || "")
              .replace(/\s+/g, "_")
              .toLowerCase() === normalizedRequested
        );
      }

      profiles[requestedId] = profile || null;
    });

    if (!response.ok) {
      sendResponse({
        success: false,
        error: root?.status || `Compare request failed with status ${response.status}`,
        status: response.status,
        data: { profiles, root },
      });
      return;
    }

    sendResponse({ success: true, data: { profiles, people, root } });
  } catch (error) {
    sendResponse({ success: false, error: error?.message || "Compare request failed." });
  }
}

function tryParseJsonOrJsonl(rawBody) {
  try {
    return { ok: true, data: rawBody ? JSON.parse(rawBody) : null };
  } catch (error) {
    const lines = String(rawBody || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        return { ok: true, data: JSON.parse(line) };
      } catch (lineError) {
        continue;
      }
    }

    return { ok: false, data: null };
  }
}

// For Auto Bio: Handle AI requests
async function handleAIRequest(request, sendResponse) {
  const {
    oldBio,
    newBio,
    provider,
    key,
    model,
    diedWord,
    deathPosition,
    inlineCitations,
    dateFormat,
    dateStatusFormat,
    yearsDateStatusFormat,
    customInstructions,
  } = request;

  const systemRole = "You are a Fact Merger for WikiTree. You are NOT a creative writer.";

  const dateFormats = {
    MDY: "Use 'Month DD, YYYY' (e.g., November 24, 1859).",
    DMY: "Use 'DD Month YYYY' (e.g., 24 November 1859).",
    sMDY: "Use 'AbbrMonth DD, YYYY' (e.g., Nov 24, 1859).",
    DsMY: "Use 'DD AbbrMonth YYYY' (e.g., 24 Nov 1859).",
  };
  const dateStatusFormats = {
    words: "Use words 'before', 'after', 'about' for uncertain dates.",
    abbreviations: "Use abbreviations 'bef.', 'aft.', 'abt.' for uncertain dates.",
    symbols: "Use symbols '<', '>', '~' for uncertain dates.",
  };
  const yearsStatusFormats = {
    words: "Use words 'before', 'after', 'about' for uncertain years in ranges.",
    abbreviations: "Use abbreviations 'bef.', 'aft.', 'abt.' for uncertain years in ranges.",
    symbols: "Use symbols '<', '>', '~' for uncertain years in ranges.",
  };

  const dateInstructions = `   - **DATE FORMAT**: ${dateFormats[dateFormat] || dateFormats.MDY}
   - **DATE STATUS**: ${dateStatusFormats[dateStatusFormat] || dateStatusFormats.abbreviations}
   - **YEAR RANGE STATUS**: ${yearsStatusFormats[yearsDateStatusFormat] || yearsStatusFormats.symbols}`;

  let citationInstructions = "";
  if (inlineCitations) {
    citationInstructions = `CITATIONS:
- Use inline <ref> tags for citations in the body text.
- Do NOT put <ref> tags under the == Sources == heading.
- If a source is cited inline, you may remove an exact duplicate of the same source from == Sources == or See also:, but ONLY if the source still appears at least once in the final output.
- If a source cannot be inline cited, keep it under See also: as a plain line (NOT a header: do not use "== See also ==").
- SMART DEDUPLICATION: remove only exact duplicates (same URL/record/template/citation text).`;
  } else {
    citationInstructions = `CITATIONS:
- **NO INLINE CITATIONS**: Do NOT use <ref> tags in the body text.
- Ensure ALL sources appear as bullet points under == Sources == or under See also: (plain line, NOT a header).
- Remove only exact duplicates (same URL/record/template/citation text).`;
  }

  const deathPlacementInstruction = deathPosition
    ? "- **DEATH SENTENCE POSITION**: Keep the death sentence immediately after the birth details and before marriages/census narratives as in <generated_bio>. Do not move it later.\n"
    : "- **DEATH SENTENCE POSITION**: Keep the death sentence after the marriages/census narratives as in <generated_bio>. Do not move it earlier.\n";

  const userInstructions = `You are performing a "Smart Fact Addition" for WikiTree.

INPUTS:
1. <generated_bio>: Structured draft biography (BASE TEXT).
2. <original_bio>: Old, unstructured biography (source of missing details).

OUTPUT:
- Return ONLY the final biography text in MediaWiki markup.
- Do NOT mention <generated_bio>, <original_bio>, “generated bio”, “old bio”, or any comparison between them.

PRIMARY GOAL:
- Use <generated_bio> as the base and improve it by INSERTING missing factual details from <original_bio> in chronological order.
- Preserve good content already in <generated_bio>. Do not remove it.

BASE TEXT RULE (PRESERVE + SURGICAL REPAIR):
- Preserve the structure, headings, tables, templates, wikiLinks, ref tags, and line breaks from <generated_bio>.
- You MAY make minimal repairs ONLY when text is clearly broken/mangled, e.g.:
  - sentence fragments ("John lived with.")
  - garbled phrases ("lived in Ancestry Census...")
  - duplicated/concatenated text, broken punctuation
- Repairs must be the smallest change needed to make the sentence grammatical and factual.
- If a broken passage cannot be repaired without guessing, leave it as-is and add a brief factual note in == Research Notes ==.

EXTRACTION TARGETS (from <original_bio>):
- Occupations/roles
- Cause of death (specific medical terms if stated)
- Burial details (cemetery + location)
- Religious/social affiliations
- Military service details (branch, rank, unit, wars/conflicts)
- Missing exact dates/locations explicitly stated
- Other concrete facts suitable for a WikiTree biography

PRIVACY / LIVING PEOPLE:
- Do NOT add names of likely living people (e.g., “survived by” lists, grandchildren, great-grandchildren).
- If <original_bio> contains such lists, omit them silently (no commentary).

${citationInstructions}

STRICT CONSTRAINTS:
${deathPlacementInstruction}
1. NO HALLUCINATIONS / NO FLUFF:
   - Do NOT invent details or infer facts not stated in the inputs.
   - Do NOT add subjective or sentimental statements ("loved by all", "dedicated", etc.).
2. CATEGORIES & STICKERS:
   - Do NOT create new categories.
   - Do not add, remove, or reorder existing Categories or Profile Stickers.
   - You may add a sticker ONLY if <original_bio> explicitly supports it AND a sticker section already exists in <generated_bio>.
3. FAMILY LISTS (LOCKED):
   - Preserve any lists of children/spouses/siblings already in <generated_bio>.
   - Do NOT create new family/survivor lists from <original_bio>.
4. LISTS OF NAMES (CONTROLLED):
   - Preserve named lists already present in <generated_bio> (census households, etc.).
   - Copy additional named lists from <original_bio> ONLY if they are clearly historical AND do not appear to include living people.
   - Never add meta text like “plus many others” or “still living”.
5. PHRASING:
   - Use "${diedWord || "died"}" consistently for death events.
6. NO DATE INFERENCE:
   - Do NOT infer exact dates from quarters/years/indexes.
   - Keep the granularity already in <generated_bio> (month/year/quarter) unless an exact date is explicitly stated in the inputs with a supporting source.
7. PRESERVE PARENTHETICALS:
   - Do NOT remove or shorten parenthetical details already in <generated_bio> (e.g., spouse parents, birthplaces, ages).
8. STYLE & FORMATTING:
   - MediaWiki markup only: *, #, '', ''', == Heading ==, tables, templates, wikiLinks.
   - NO HTML except <ref> and <br>.
   - Fix definite spelling/punctuation mistakes.
9. REQUIRED SECTIONS:
   - The final output MUST contain: == Biography ==, == Sources ==, and <references />.
   - Preserve the existing heading structure from <generated_bio>.
10. SOURCE RETENTION GUARANTEE (NON-NEGOTIABLE):
   - Do NOT delete sources. Every source in either input must appear somewhere in the final output, either:
     - inline as <ref>…</ref>, or
     - as a bullet under == Sources ==, or
     - as a bullet under See also: (plain line, NOT a header).
   - You may remove only exact duplicates (same URL/record/template/citation text), but at least one copy must remain.

JUNK SOURCE HANDLING (GEDCOM-STYLE BLOBS):
- Treat entries like the following as “junk formatting” (do NOT delete them):
  - Lines starting with "Source: S-" and/or containing "Repository: #R-", "Certainty:", "CRE", repeated concatenated fields (e.g., multiple "Birth date:" fragments).
- Move these junk blobs (verbatim) to the end under See also: as bullet points.
- Do NOT invent or guess missing URLs or citation details. If a clean citation already exists elsewhere in the inputs, keep that clean citation in == Sources == and keep the junk blob under See also:.

DATE STYLE:
${dateInstructions}

${
  customInstructions
    ? `\nCUSTOM USER INSTRUCTIONS (take priority over previous instructions if they conflict):\n${customInstructions}`
    : ""
}`;

  const dataPayload = `<original_bio>
${oldBio}
</original_bio>

<generated_bio>
${newBio}
</generated_bio>`;

  const prompt = `${userInstructions}

${dataPayload}`;

  try {
    let resultBio = "";
    if (provider === "openai") {
      resultBio = await callOpenAI(key, model || "gpt-5.6-terra", systemRole, prompt);
    } else if (provider === "gemini") {
      resultBio = await callGemini(key, model || "gemini-3.5-flash", systemRole, prompt);
    } else if (provider === "claude") {
      resultBio = await callClaude(key, model || "claude-sonnet-5", systemRole, prompt);
    } else if (provider === "perplexity") {
      resultBio = await callPerplexity(key, model || "sonar", systemRole, prompt);
    } else if (provider === "xai") {
      resultBio = await callXAI(key, model || "grok-4.3", systemRole, prompt);
    } else {
      throw new Error("Unknown provider: " + provider);
    }

    // --- PROGRAMMATIC CLEANING : CATEGORIES ---
    // The AI sometimes ignores instructions and adds categories like [[Category: 1917 Births]].
    // We strictly enforce that ONLY categories present in the input (newBio) are allowed.

    // Helper to normalize category names for comparison (ignore whitespace/case)
    const normalizeCat = (cat) =>
      cat
        .replace(/^\[\[Category:\s*/i, "")
        .replace(/\s*\]\]$/, "")
        .trim()
        .toLowerCase();

    // 1. Extract allowed categories from newBio (Draft)
    const allowedCategories = new Set((newBio.match(/\[\[Category:[^\]]+\]\]/g) || []).map(normalizeCat));

    // 2. Filter the result
    /*
      We find all categories in the result.
      If a category is NOT in allowedCategories (normalized), we verify if it is in oldBio? 
      Actually, the user said "It's making up categories". 
      The safest rule is: If it wasn't in the Auto Bio draft, it shouldn't be in the final result.
    */
    if (resultBio) {
      resultBio = resultBio.replace(/\[\[Category:[^\]]+\]\]/g, (match) => {
        const normalized = normalizeCat(match);
        if (allowedCategories.has(normalized)) {
          return match;
        } else {
          // It's a hallucinated or unwanted category. Remove it.
          return "";
        }
      });

      // Clean up empty lines left by removed categories (optional but nice)
      // replace /^\s*[\r\n]/gm was too aggressive and removed valid blank lines between paragraphs
      // Instead, we just collapse 3+ newlines into 2 (standard paragraph break)
      resultBio = resultBio.replace(/[\r\n]{3,}/g, "\n\n");
    }

    sendResponse({ success: true, bio: resultBio });
  } catch (error) {
    console.error("AI Request Failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function callOpenAI(apiKey, model, system, userPrompt) {
  // Reasoning models (gpt-5 family, o-series) only accept the default temperature,
  // and some reject the parameter outright, so omit it for them.
  const isReasoningModel = model.includes("gpt-5") || model.startsWith("o1") || model.startsWith("o3");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      ...(isReasoningModel ? {} : { temperature: 0.2 }),
      // max_tokens removed to allow full model output
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("OpenAI API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(apiKey, model, system, userPrompt) {
  // Gemini mostly uses 'user' role, 'system' can be simulated or passed as system_instruction in beta
  const modelId = model || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  // Google strongly recommends leaving temperature at the default 1.0 for Gemini 3
  // models: lowering it can cause looping or degraded output.
  const isGemini3 = modelId.startsWith("gemini-3");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: system + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: {
        ...(isGemini3 ? {} : { temperature: 0.2 }),
        // maxOutputTokens removed to allow full model output
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Gemini API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function callClaude(apiKey, model, system, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      system: system,
      messages: [{ role: "user", content: userPrompt }],
      // max_tokens covers thinking + reply on models that think by default,
      // so leave headroom. Above ~16000 the request should be streamed.
      max_tokens: 16000,
      // No temperature: current Claude models reject sampling parameters.
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Claude API Error: " + response.status + " " + err);
  }

  const data = await response.json();

  if (data.stop_reason === "refusal") {
    throw new Error(
      "Claude declined this request" + (data.stop_details?.explanation ? ": " + data.stop_details.explanation : ".")
    );
  }

  // Responses can start with a thinking block, so take the first text block
  // rather than content[0].
  const text = data.content?.find((block) => block.type === "text")?.text || "";

  if (data.stop_reason === "max_tokens" && !text) {
    throw new Error("Claude hit the output limit before writing a bio. Try a shorter profile or a different model.");
  }

  return text;
}

async function callPerplexity(apiKey, model, system, userPrompt) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Perplexity API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callXAI(apiKey, model, system, userPrompt) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("xAI API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
