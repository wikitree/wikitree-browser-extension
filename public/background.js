// The AI requests (handleAIRequest, handleChatWithAIRequest) are in ai_requests.js, which the app build shares.
// Chrome and Safari load it here; Firefox's manifest lists it before this file.
if (typeof importScripts === "function") importScripts("ai_requests.js");

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
  const WIKI_LINK_MENU_IDS = new Set([
    "copyWikiLinkContextMenu",
    "copyWikiLinkWithDatesContextMenu",
    "copyWikiSectionLinkContextMenu",
    "copyWikiLinkFromHeadingContextMenu",
    "copyWikiLinkFromHeadingSectionOnlyContextMenu",
  ]);

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
      id: "copyWikiLinkContextMenu",
      title: "Copy Wiki Link",
      contexts: ["link"],
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "copyWikiLinkWithDatesContextMenu",
      title: "Copy Wiki Link with dates",
      contexts: ["link"],
      // Person profile links end in -<digits> (e.g. /wiki/Name-123). Match patterns are globs with
      // "*" as their only wildcard - "[0-9]" is matched literally, so a single digit-class pattern
      // matches nothing - hence one pattern per leading digit. A non-person link that happens to
      // contain "-<digit>" can still show the item; the click then copies it without dates.
      targetUrlPatterns: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].flatMap((digit) => [
        `*://*.wikitree.com/wiki/*-${digit}*`,
        `*://*.wikitree.com/index.php?title=*-${digit}*`,
      ]),
      // Safari's stand-in for targetUrlPatterns: see hoveredLink below.
      fitsLink: (url) => isLikelyPersonTargetBase(wikiLinkTargetBaseFromUrl(url)),
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "copyWikiSectionLinkContextMenu",
      title: "Copy Wiki Link (section only)",
      contexts: ["link"],
      // Section-only link targets are mainly for documentation-like pages with anchors.
      // Keep this off plain profile links so profile menus stay concise.
      targetUrlPatterns: [
        "*://*.wikitree.com/wiki/Space:*",
        "*://*.wikitree.com/wiki/Help:*",
        "*://*.wikitree.com/wiki/Category:*",
        "*://*.wikitree.com/wiki/Template:*",
        "*://*.wikitree.com/wiki/Project:*",
        "*://*.wikitree.com/index.php?title=Space:*",
        "*://*.wikitree.com/index.php?title=Help:*",
        "*://*.wikitree.com/index.php?title=Category:*",
        "*://*.wikitree.com/index.php?title=Template:*",
        "*://*.wikitree.com/index.php?title=Project:*"
      ],
      fitsLink: (url) => /^(Space|Help|Category|Template|Project):/i.test(wikiLinkTargetBaseFromUrl(url) || ""),
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "copyWikiLinkFromHeadingContextMenu",
      title: "Copy Wiki Link from heading",
      // "selection" too: on a Mac, right-clicking a word selects it, so a right-click on heading
      // text opens the selection menu rather than the page one. Offered only while the pointer is
      // on a heading (see hoveredHeading).
      contexts: ["page", "selection"],
      needsHeading: true,
      isUsefulOn: (url) => isMainDomainUrl(url),
    },
    {
      id: "copyWikiLinkFromHeadingSectionOnlyContextMenu",
      title: "Copy Wiki Link from heading (section only)",
      contexts: ["page", "selection"],
      needsHeading: true,
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

  function activeTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        // Without host permission for the tab's site, url is empty, which is the same answer as
        // "nothing here for us": without that permission the content script isn't running either.
        const tab = !chrome.runtime.lastError && tabs?.[0];
        resolve({ id: tab?.id, url: tab?.url || "" });
      });
    });
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

  // A WikiTree URL turned into the wiki-link target text (without [[...]]):
  // Space:Page Title#Section Heading
  function wikiLinkTargetFromUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (!isMainDomainUrl(parsed.href)) return null;

    let title = "";
    if (parsed.pathname.startsWith("/wiki/")) {
      title = parsed.pathname.replace(/^\/wiki\//, "");
    } else if (parsed.pathname === "/index.php") {
      title = parsed.searchParams.get("title") || "";
    }
    if (!title) return null;

    const uriDecode = (text) => {
      try {
        return decodeURIComponent(text);
      } catch {
        return text;
      }
    };
    const clean = (text) => text.replace(/_/g, " ").trim();
    const base = clean(uriDecode(title));
    if (!base) return null;

    // Percent-decoding first: a legacy ".25" decodes to a literal "%", which must not be decoded again.
    const hash = parsed.hash ? clean(decodeLegacyAnchor(uriDecode(parsed.hash.slice(1)))) : "";
    return hash ? `${base}#${hash}` : base;
  }

  function wikiLinkTargetBaseFromUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    parsed.hash = "";
    const full = wikiLinkTargetFromUrl(parsed.href);
    if (!full) return null;
    return splitWikiLinkTarget(full).base;
  }

  function splitWikiLinkTarget(target) {
    const hashAt = target.indexOf("#");
    if (hashAt === -1) return { base: target, section: "" };
    return { base: target.slice(0, hashAt), section: target.slice(hashAt + 1) };
  }

  function wikiApiKeyFromTargetBase(base) {
    return base.replace(/ /g, "_");
  }

  function isLikelyPersonTargetBase(base) {
    return /-\d+$/.test(String(base || "").trim());
  }

  function escapeWikiLinkText(text) {
    return String(text || "")
      .replace(/\|/g, "&#124;")
      .replace(/\]/g, "&#93;")
      .trim();
  }

  function firstWord(text) {
    return String(text || "").trim().split(/\s+/)[0] || "";
  }

  // Person-style label: "Jane (Smith) Jones" when surname changed, else "John Davis".
  function formatPersonLabel(profile) {
    const preferred = firstWord(profile?.RealName) || firstWord(profile?.FirstName);
    const lnab = String(profile?.LastNameAtBirth || "").trim();
    const lnc = String(profile?.LastNameCurrent || "").trim();
    const currentOrBirth = lnc || lnab;

    if (!preferred) return "";
    if (lnab && lnc && lnab !== lnc) return escapeWikiLinkText(`${preferred} (${lnab}) ${lnc}`);
    if (currentOrBirth) return escapeWikiLinkText(`${preferred} ${currentOrBirth}`);
    return escapeWikiLinkText(preferred);
  }

  function yearFromDate(dateText) {
    const match = String(dateText || "").match(/^(\d{4})/);
    return match ? match[1] : "";
  }

  async function fetchWikiLinkInfo(targetBase) {
    const key = wikiApiKeyFromTargetBase(targetBase);
    if (!key) return { label: "", isPerson: false, birthYear: "", deathYear: "" };

    const payload = new URLSearchParams({
      action: "getProfile",
      appId: "WBE-Context-Menu",
      key,
      fields: "Name,Derived.ShortName,RealName,FirstName,BirthName,LastNameAtBirth,LastNameCurrent,Title,IsSpace,BirthDate,DeathDate",
    });

    const response = await fetch("https://api.wikitree.com/api.php", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: payload.toString(),
    });

    if (!response.ok) return { label: "", isPerson: false, birthYear: "", deathYear: "" };

    const body = await response.json();
    const first = Array.isArray(body) ? body[0] : null;
    const profile = first?.profile;
    if (!profile) return { label: "", isPerson: false, birthYear: "", deathYear: "" };

    const isPerson = !profile?.IsSpace && Boolean(profile?.Name);
    const birthYear = yearFromDate(profile?.BirthDate);
    const deathYear = yearFromDate(profile?.DeathDate);

    if (isPerson) {
      const personLabel = formatPersonLabel(profile);
      if (personLabel) return { label: personLabel, isPerson, birthYear, deathYear };
    }

    // Space/Category/etc. titles come here (e.g. "WikiTree Browser Extension").
    const titleText = profile?.Title?.Text;
    if (titleText) {
      return { label: escapeWikiLinkText(titleText), isPerson, birthYear, deathYear };
    }

    // People: prefer a display-ready short name where available.
    const shortName = profile?.Derived?.ShortName;
    if (shortName) {
      return { label: escapeWikiLinkText(shortName), isPerson, birthYear, deathYear };
    }

    const birthName = profile?.BirthName;
    if (birthName) {
      return { label: escapeWikiLinkText(birthName), isPerson, birthYear, deathYear };
    }

    const realName = profile?.RealName;
    if (realName) {
      return { label: escapeWikiLinkText(realName), isPerson, birthYear, deathYear };
    }

    return { label: "", isPerson, birthYear, deathYear };
  }

  async function buildWikiLinkWithLabel(target, { withDates = false, sectionOnly = false } = {}) {
    const { base, section } = splitWikiLinkTarget(target);

    if (sectionOnly && section) {
      const sectionLabel = escapeWikiLinkText(section);
      return `[[${base}#${section}|${sectionLabel}]]`;
    }

    const info = await fetchWikiLinkInfo(base);
    let label = info.label;
    if (withDates && isLikelyPersonTargetBase(base) && info.isPerson && label) {
      const years = info.birthYear || info.deathYear ? ` (${info.birthYear || "?"}-${info.deathYear || "?"})` : "";
      label = `${label}${years}`;
    }
    if (section && label) {
      label = `${label}: ${escapeWikiLinkText(section)}`;
    }
    const targetText = section ? `${base}#${section}` : base;
    if (!label) return `[[${targetText}]]`;
    return `[[${targetText}|${label}]]`;
  }

  // The page does the copying (src/core/context_target_tracker.js): Chrome's and Safari's
  // background service workers have no clipboard, and in Safari only the page can finish the
  // clipboard write it started on the right-click. If it cannot copy, it offers the text with a
  // Copy button. The background's own clipboard is the fallback for a tab the page script is not
  // running in.
  async function copyTextForTab(tab, text) {
    if (tab?.id) {
      const resp = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "copyFromContextMenu_inPage", text }, (reply) => {
          resolve(chrome.runtime.lastError ? null : reply);
        });
      });
      if (resp?.success) return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error("No clipboard API available");
  }

  function getLastContextHeadingForTab(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: "getLastContextHeading" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response?.heading || null);
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
      // Safari's pattern matching is quirky; avoid dropping items there.
      ...(item.targetUrlPatterns && !isSafari ? { targetUrlPatterns: item.targetUrlPatterns } : {}),
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

  // Safari only: the link the pointer last moved onto, reported by src/core/context_target_tracker.js.
  // Safari's targetUrlPatterns cannot be used (see isSafari), so the link items that have a
  // fitsLink test are offered only when it passes for this link. Until a link has been reported on
  // the active tab - or after the background has restarted - they are all offered, as before.
  let hoveredLink = null; // { tabId, url }

  function hoveredLinkUrlFor(tabId) {
    return isSafari && hoveredLink && hoveredLink.tabId === tabId ? hoveredLink.url : null;
  }

  function fitsHoveredLink(item, linkUrl) {
    return !linkUrl || !item.fitsLink || item.fitsLink(linkUrl);
  }

  // Every browser: whether the pointer is on a linkable heading, reported by the same page script.
  // The heading items are offered only then; until the page has said so, they are left out.
  let hoveredHeading = null; // { tabId, onHeading }

  function isOnHeading(tabId) {
    return Boolean(hoveredHeading && hoveredHeading.tabId === tabId && hoveredHeading.onHeading);
  }

  function refreshContextMenus() {
    pending = pending.then(rebuildContextMenus).catch(() => {});
    return pending;
  }

  async function rebuildContextMenus() {
    const [tab, settings, launchMode] = await Promise.all([activeTab(), featureSettings(), simulatorLaunchMode()]);
    const url = tab.url;
    const linkUrl = hoveredLinkUrlFor(tab.id);
    const wanted = contextMenuItems.filter(
      (item) =>
        isFeatureEnabled(item, settings) &&
        item.isUsefulOn(url) &&
        fitsHoveredLink(item, linkUrl) &&
        (!item.needsHeading || isOnHeading(tab.id))
    );
    // The launch mode is part of the signature: it changes the "Open" entry's label without
    // changing any id, so a rebuild has to be allowed when only it has moved. The ids already
    // reflect the hovered link, so hovering from one person link to another rebuilds nothing.
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
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (!sender.tab?.id) return;
    if (message?.action === "contextHeadingHovered") {
      hoveredHeading = { tabId: sender.tab.id, onHeading: Boolean(message.onHeading) };
      refreshContextMenus();
    } else if (message?.action === "contextLinkHovered" && isSafari) {
      hoveredLink = { tabId: sender.tab.id, url: String(message.url || "") };
      refreshContextMenus();
    }
  });
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
    if (
      info.menuItemId === "copyWikiLinkContextMenu" ||
      info.menuItemId === "copyWikiLinkWithDatesContextMenu" ||
      info.menuItemId === "copyWikiSectionLinkContextMenu"
    ) {
      const resolved = info.linkUrl ? new URL(info.linkUrl, info.pageUrl || tab?.url || undefined).href : "";
      const target = wikiLinkTargetFromUrl(resolved);
      if (!target) {
        console.warn("[WBE] Could not build a wiki link target from:", resolved);
        return;
      }
      const withDates = info.menuItemId === "copyWikiLinkWithDatesContextMenu";
      const sectionOnly = info.menuItemId === "copyWikiSectionLinkContextMenu";
      buildWikiLinkWithLabel(target, { withDates, sectionOnly })
        .then((wikilink) => copyTextForTab(tab, wikilink))
        .catch((error) => {
          console.warn("[WBE] Copy Wiki Link failed:", error?.message || error);
        });
    }
    if (
      info.menuItemId === "copyWikiLinkFromHeadingContextMenu" ||
      info.menuItemId === "copyWikiLinkFromHeadingSectionOnlyContextMenu"
    ) {
      if (!tab?.id) return;
      const sectionOnly = info.menuItemId === "copyWikiLinkFromHeadingSectionOnlyContextMenu";
      const base = wikiLinkTargetBaseFromUrl(tab.url || info.pageUrl || "");
      if (!base && !sectionOnly) {
        console.warn("[WBE] Could not build page title from URL:", tab?.url || info.pageUrl);
        return;
      }

      getLastContextHeadingForTab(tab.id)
        .then(async (heading) => {
          if (!heading?.fragment) {
            console.warn("[WBE] No heading was right-clicked on this tab");
            return;
          }
          const fragment = escapeWikiLinkText(heading.fragment);
          const sectionLabel = escapeWikiLinkText(heading.label || heading.fragment);

          let wikilink;
          if (sectionOnly) {
            wikilink = `[[${base}#${fragment}|${sectionLabel}]]`;
          } else {
            const info = await fetchWikiLinkInfo(base);
            const pageLabel = info?.label || escapeWikiLinkText(base);
            wikilink = `[[${base}#${fragment}|${pageLabel}: ${sectionLabel}]]`;
          }

          return copyTextForTab(tab, wikilink);
        })
        .catch((error) => {
          console.warn("[WBE] Copy heading link failed:", error?.message || error);
        });
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

// Genie's "Open WBE settings" (content scripts can't open the options page).
chrome.runtime.onMessage.addListener((message) => {
  if (message?.action !== "openWbeOptions") return;
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    });
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }
});

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
    handleAIRequest(message, sendResponse, sender);
    return true; // Keep channel open for async response
  }

  if (message.action === "chatWithAI") {
    handleChatWithAIRequest(message, sendResponse, sender);
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

  if (message.action === "sharePageFetchImage") {
    handleSharePageFetchImage(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "goldStandardInspector") {
    handleGoldStandardInspector(message, sendResponse);
    return true;
  }
});

async function handleGoldStandardInspector(message, sendResponse) {
  const profile = typeof message?.profile === "string" ? message.profile.trim() : "";
  if (!profile || profile.length > 200 || !/^[^\s/?#&=]+-\d+$/.test(profile)) {
    sendResponse({ success: false, error: "The profile ID is missing or invalid." });
    return;
  }

  const url = new URL("https://apps.wikitree.com/apps/harris5439/gold-standard/api/inspector.php");
  url.searchParams.set("profile", profile);
  url.searchParams.set("appId", "WBEGoldStandard");

  try {
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`The inspector service returned HTTP ${response.status}.`);
    }
    const body = await response.text();
    if (!body.trim()) {
      throw new Error("The inspector service returned an empty response instead of JSON.");
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("The inspector service returned invalid JSON.");
    }
    sendResponse({ success: true, data });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Share Page: fetch a picture from one of WikiTree's own sites for the content script, which the page itself is
// not allowed to read (for example portraits served from apps.wikitree.com). This ignores the browser's cross-origin
// rules, so it only ever fetches https pictures on wikitree.com, never anything else.
const SHARE_PAGE_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SHARE_PAGE_APP_ID = "WBE_sharePage";

function isWikiTreeHost(hostname) {
  return /(^|\.)wikitree\.com$/i.test(hostname || "");
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function handleSharePageFetchImage(message, sendResponse) {
  try {
    let url;
    try {
      url = new URL(String(message?.url || ""));
    } catch (e) {
      sendResponse({ success: false, error: "Not an address." });
      return;
    }
    if (url.protocol !== "https:" || !isWikiTreeHost(url.hostname)) {
      sendResponse({
        success: false,
        error: "Only pictures on wikitree.com can be fetched.",
      });
      return;
    }
    // apps.wikitree.com answers requests with no appId with an empty page (see the note on the duplicates calls)
    if (url.hostname.toLowerCase() === "apps.wikitree.com")
      url.searchParams.set("appId", SHARE_PAGE_APP_ID);

    const response = await fetch(url.toString(), { redirect: "follow" });
    const type = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    let finalHost = "";
    try {
      finalHost = new URL(response.url || url.toString()).hostname;
    } catch (e) {
      finalHost = "";
    }
    if (!response.ok || !/^image\//.test(type) || !isWikiTreeHost(finalHost)) {
      sendResponse({
        success: false,
        error: "That address is not a WikiTree picture.",
      });
      return;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > SHARE_PAGE_MAX_IMAGE_BYTES) {
      sendResponse({ success: false, error: "The picture is too large." });
      return;
    }
    sendResponse({ success: true, type, base64: bufferToBase64(buffer) });
  } catch (error) {
    sendResponse({
      success: false,
      error: error?.message || "Picture request failed.",
    });
  }
}

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
