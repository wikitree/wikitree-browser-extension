/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getFeatureOptions } from "../../core/options/options_storage";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { getRelationJSON } from "../../core/API/wwwWikiTree";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getUserWtId, getUserNumId, getProfilePersonInfo } from "../../core/common";
import { setHighestZIndex } from "../../core/common";
import { routeChatPrompt, ChatIntent } from "./chat_router";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/resizable";
import "./chat.css";
import { formatDate, getRelationColour, getYearColour } from "../../core/formatting";
import { escapeHtml } from "../../core/lib/diff_utils";
import {
  setPopupPositionAndSize,
  positionPopupForOpen,
  clampPopupToViewport,
  positionPopupFixed,
  getPopupResizeLimits as uiGetPopupResizeLimits,
  showChatShaky,
  hideChatShaky,
  showConnectionsPopup,
} from "./ui";
import { buildResultsTableHtml } from "./tables";
import {
  makeProfileLink,
  withDerivedRowFields,
  cloneResultWithRows,
  makeStandardProfileTable,
  makeWatchlistTable,
  makeAncestorAgeTable,
} from "./tables";

// Debug: indicate the chat feature script has been loaded
console.debug("wbe: chat.js loaded");

const CHAT_POPUP_ID = "wbe-chat-popup";
// ID for the floating chat button inserted into the profile actions area
const CHAT_BUTTON_ID = "wbe-chat-button";
const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
const AUTO_BIO_OPTIONS_KEY = "autoBio_options";
const AI_KEY_FIELDS = ["openAIKey", "geminiKey", "claudeKey", "perplexityKey"];
const CHAT_MESSAGES_ID = "wbe-chat-messages";
const CHAT_INPUT_ID = "wbe-chat-input";
const CHAT_SEND_ID = "wbe-chat-send";
const CHAT_CLEAR_ID = "wbe-chat-clear";
const CHAT_SESSION_KEY = `wbe_chat_history_${window.location.pathname}`;
const CHAT_LAST_CONNECTION_KEY = `${CHAT_SESSION_KEY}_lastConnection`;
const CHAT_LAST_STRUCTURED_KEY = `${CHAT_SESSION_KEY}_lastStructured`;
const CHAT_LAST_BIO_KEY = `${CHAT_SESSION_KEY}_lastBio`;
const WBE_CHAT_APP_ID = "chat";
const CC7_CACHE_MS = 5 * 60 * 1000;
const CHAT_RESULTS_POPUP_ID = "wbe-chat-results-popup";
const CHAT_RESULTS_TABLE_ID = "wbe-chat-results-table";
const CHAT_SHOW_MORE_TOKEN_PREFIX = "__WBE_SHOW_MORE__:";
const AUTO_OPEN_TABLE_MIN_ROWS = 8;
const CHAT_AI_HISTORY_MAX_MESSAGES = 12;
const CHAT_AI_MESSAGE_MAX_CHARS = 500;
const CHAT_APPS_LOGIN_HINT = "Log in to the apps server for better results. Use the Apps Login button on this page.";
const RELATION_PERSON_FIELDS =
  "Id,Name,Gender,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation";

let chatHistory = [];
let lastNonRetryUserPrompt = "";
let lastConnectionContext = null;
let pendingDisambiguationContext = null;
let lastConnectionCandidates = [];
let lastConnectionRankedMatches = [];
let cc7Cache = {
  rootKey: null,
  nuclear: 7,
  fetchedAt: 0,
  profiles: [],
};

let lastConnectionPopupResult = null;
let lastStructuredResult = null;
let lastBioPopupId = null;
let lastBioPopupProfile = null;


function toggleConnectionsPopup() {
  const el = document.getElementById("wbe-connections-popup");
  if (el) {
    el.remove();
  } else if (lastConnectionPopupResult) {
    showConnectionsPopup(lastConnectionPopupResult);
  }
}

// Small shaky-tree loader for chat (re-uses wbe-shaky-tree CSS)
// Shaky-tree loader moved to `src/features/chat/ui.js`.
// Centralized popup positioning and resizing helper
// Popup positioning and sizing helpers moved to `src/features/chat/ui.js`.

// Message rendering is handled by `appendMessage`; `renderChatMessage` removed as unused.

// Removed unused helper `renderResultsTable` — `buildResultsTableHtml` is used instead.

// NOTE: `renderResultsTable` is unused; `buildResultsTableHtml` is used instead.

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Popup positioning helpers moved to `src/features/chat/ui.js`.

// Popup viewport clamping moved to `src/features/chat/ui.js`.

// Show a popup with both wiki and HTML bio for a given profile id
async function showBioPopupForId(id, opts = { bioFormat: "both" }) {
  // If a recent relation lookup had partial failures, suppress the first
  // auto-open to avoid popping an unexpected bio when some fetches failed.
  if (window.wbeSuppressAutoBioOpen) {
    try {
      appendMessage("assistant", "Auto-opening of a biography was suppressed due to partial profile fetch failures.", {
        shouldPersist: false,
      });
    } catch (e) {
      /* ignore */
    }
    window.wbeSuppressAutoBioOpen = false;
    return;
  }
  if (!id) return;
  // Defensive: resolve numeric or ambiguous ids to canonical WTID (profile.Name)
  try {
    const resolved = await resolveToWTID(id);
    if (resolved) id = resolved;
  } catch (e) {
    /* ignore resolution failure and proceed with original id */
  }
  try {
    showChatShaky("Loading biography...");
    const [profile, status, page_name] = await WikiTreeAPI.getProfile(
      WBE_CHAT_APP_ID,
      id,
      "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
      {
        bioFormat: opts.bioFormat,
        resolveRedirect: 1,
      }
    );
    console.debug("wbe: showBioPopupForId fetched profile", { id, status, page_name, profile });
    hideChatShaky();
    if (!profile || Object.keys(profile).length === 0) {
      console.info("wbe: showBioPopupForId - no profile data or private", { id, profile });
      appendMessage("assistant", "No profile data returned or profile is private.");
      return;
    }

    const { wikiBio, htmlBio } = extractProfileBios(profile);
    // If there is no wiki text and no HTML bio, do not open an empty popup.
    if (!wikiBio && !htmlBio) {
      console.info("wbe: showBioPopupForId - profile has no biography content", { id, profile });
      appendMessage("assistant", `No biography content found for ${profile?.Name || id}.`);
      return;
    }

    // Remove any existing bio popup and create with jQuery
    $("#wbe-bio-popup").remove();
    const popupWidth = Math.max(520, Math.floor(window.innerWidth * 0.85));
    const $popup = $(
      `<div id="wbe-bio-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
        (window.innerWidth - popupWidth) / 2
      )}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>Biography: ${escapeHtml(profile.Name || id)}</strong>
          <div class="chat-popup-controls">
            <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="chat-popup-body chat-popup-body--columns">
          <div class="bio-column bio-column--wiki">
            <h4>Wiki Text</h4>
            <pre class="bio-wiki-pre">${escapeHtml(wikiBio || "(no wiki text returned)")}</pre>
          </div>
          <div class="bio-column">
            <h4>HTML</h4>
            <div class="bio-html-container">${sanitizeHtmlForPopup(htmlBio) || "<i>(no html returned)</i>"}</div>
          </div>
        </div>
      </div>`
    ).appendTo(document.body);
    setPopupPositionAndSize(
      $popup.get(0),
      Math.round((window.innerWidth - $popup.get(0).getBoundingClientRect().width) / 2),
      110
    );
    $popup.find(".close-popup").on("click", () => $popup.remove());
    setHighestZIndex($popup.get(0));
    $popup.draggable({
      handle: ".chat-popup-header",
      containment: "window",
      scroll: false,
      start: () => {
        $popup.get(0).style.right = "auto";
        $popup.get(0).style.transform = "none";
      },
    });
    $popup.resizable({ handles: "n,e,s,w,se,sw,ne,nw", minWidth: 520, minHeight: 260 });
    // Persist canonical last shown bio id (use WTID Name when available)
    const canonicalId = profile?.Name || (profile?.Id != null ? String(profile.Id) : id);
    lastBioPopupId = canonicalId;
    lastBioPopupProfile = profile;
    try {
      sessionStorage.setItem(CHAT_LAST_BIO_KEY, JSON.stringify({ id: canonicalId }));
    } catch (e) {
      /* ignore */
    }
    addBioButton();
  } catch (err) {
    hideChatShaky();
    hideChatShaky();
    console.error("Error loading profile:", err);
    try {
      const em = String(err?.message || err || "unknown error");
      appendMessage("assistant", `Failed to load biography: ${em}`);
    } catch (e) {
      appendMessage("assistant", "Failed to load biography.");
    }
  }
}

function closeBioPopup() {
  document.getElementById("wbe-bio-popup")?.remove();
}

// Ensure addBioButton exists. Historically this injected a persistent button
// into the page actions; we intentionally do not re-add a persistent UI
// element. This safe no-op cleans up any leftovers and prevents runtime
// errors from callers.
function addBioButton() {
  try {
    $("#wbe-bio-button").remove();
  } catch (e) {
    /* ignore */
  }
}

// Expose helper for quick manual testing from console
window.wbeShowBioPopup = showBioPopupForId;

// List spouses for a given profile id and show quick actions to open their bios
async function listSpousesForId(id) {
  if (!id) return;
  try {
    showChatShaky("Loading spouses...");
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Spouses,Name,RealName,Id", {
      getSpouses: 1,
      resolveRedirect: 1,
    });
    console.debug("wbe: listSpousesForId fetched profile", { id, profile });
    hideChatShaky();
    const spousesObj = profile?.Spouses || {};
    const spouses = Object.values(spousesObj || []).map((s) => ({
      wtid: s.Name,
      displayName: s.RealName || (s.Derived && s.Derived.ShortName) || s.Name,
    }));

    if (!spouses.length) {
      console.info("wbe: listSpousesForId - no spouses", { id, profile });
      appendMessage("assistant", `No spouses found for ${profile?.Name || id}.`);
      return;
    }

    // If single spouse, open their bio immediately
    if (spouses.length === 1) {
      showBioPopupForId(spouses[0].wtid);
      return;
    }

    // Build a small popup with a list of spouses using jQuery
    $("#wbe-spouses-popup").remove();
    const popupWidth = Math.max(360, Math.floor(window.innerWidth * 0.4));
    const $popup = $(
      `<div id="wbe-spouses-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
        (window.innerWidth - popupWidth) / 2
      )}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>Spouses of ${escapeHtml(profile?.Name || id)}</strong>
          <div class="chat-popup-controls">
            <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="chat-popup-body chat-popup-body--compact">
          <ul class="spouse-list">
            ${spouses
              .map(
                (s) =>
                  `<li><span>${escapeHtml(s.displayName)} (${escapeHtml(
                    s.wtid
                  )})</span><button class="open-bio" data-wtid="${escapeHtml(s.wtid)}">Open Bio</button></li>`
              )
              .join("")}
          </ul>
        </div>
      </div>`
    ).appendTo(document.body);
    $popup.find(".close-popup").on("click", () => $popup.remove());
    $popup.find(".open-bio").on("click", async (e) => {
      const raw = $(e.currentTarget).attr("data-wtid");
      if (!raw) return;
      const resolved = await resolveToWTID(raw);
      if (resolved) showBioPopupForId(resolved);
    });
    setHighestZIndex($popup.get(0));
    $popup.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  } catch (err) {
    hideChatShaky();
    hideChatShaky();
    console.error("Error listing spouses:", err);
    try {
      const em = String(err?.message || err || "unknown error");
      appendMessage("assistant", `Failed to list spouses: ${em}`);
    } catch (e) {
      appendMessage("assistant", "Failed to list spouses.");
    }
  }
}

// Expose for console testing
window.wbeListSpouses = listSpousesForId;

// Try to find spouse profile IDs from the current profile page DOM
function findSpouseProfileIdsFromDOM() {
  const ids = new Set();
  // Common profile link selectors on WikiTree profile pages
  const selectors = ['a[href*="/wiki/"]'];
  const spouseSelectors = [".spouse a", '[itemprop="spouse"] a', ".spouse-name a"];
  selectors.push(...spouseSelectors);
  for (const sel of selectors) {
    $(sel).each((i, a) => {
      try {
        const href = $(a).attr("href") || "";
        const m = href.match(/\/wiki\/(.+)$/);
        if (m && m[1]) {
          const candidate = decodeURIComponent(m[1]).trim();
          if (/^[A-Za-z\-0-9_]+$/.test(candidate)) ids.add(candidate);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }
  return Array.from(ids);
}

// Expose DOM helper for console testing
window.wbeFindSpouseLinks = findSpouseProfileIdsFromDOM;

// Try to find children profile IDs from the current profile page DOM
function findChildrenProfileIdsFromDOM() {
  const ids = new Set();
  const selectors = [
    'a[itemprop="children"][href*="/wiki/"]',
    'a[itemprop="child"][href*="/wiki/"]',
    '.children a[href*="/wiki/"]',
    '.child a[href*="/wiki/"]',
    'a[href*="/wiki/"] .child, .child a[href*="/wiki/"]',
  ];
  for (const sel of selectors) {
    $(sel).each((i, a) => {
      try {
        const href = $(a).attr("href") || "";
        const m = href.match(/\/wiki\/(.+)$/);
        if (m && m[1]) {
          const candidate = decodeURIComponent(m[1]).trim();
          if (/^[A-Za-z\-0-9_]+$/.test(candidate)) ids.add(candidate);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }
  return Array.from(ids);
}

// Try to find sibling profile IDs from the current profile page DOM
function findSiblingProfileIdsFromDOM() {
  const ids = new Set();
  const selectors = [
    'a[itemprop="sibling"][href*="/wiki/"]',
    '.siblings a[href*="/wiki/"]',
    '.sibling a[href*="/wiki/"]',
    '#Siblings a[href*="/wiki/"]',
  ];
  for (const sel of selectors) {
    $(sel).each((i, a) => {
      try {
        const href = $(a).attr("href") || "";
        const m = href.match(/\/wiki\/(.+)$/);
        if (m && m[1]) {
          const candidate = decodeURIComponent(m[1]).trim();
          if (/^[A-Za-z\-0-9_]+$/.test(candidate)) ids.add(candidate);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }
  return Array.from(ids);
}

// Expose DOM helpers for console testing
window.wbeFindChildLinks = findChildrenProfileIdsFromDOM;
window.wbeFindSiblingLinks = findSiblingProfileIdsFromDOM;

// Try to find parent profile IDs from the current profile page DOM
function findParentProfileIdsFromDOM() {
  const ids = new Set();
  const selectors = [
    'span[itemprop="parent"] a[href*="/wiki/"]',
    'a[itemprop="parent"][href*="/wiki/"]',
    '#Father a[href*="/wiki/"], #Mother a[href*="/wiki/"]',
    '.parent a[href*="/wiki/"]',
  ];
  for (const sel of selectors) {
    $(sel).each((i, a) => {
      try {
        const href = $(a).attr("href") || "";
        const m = href.match(/\/wiki\/(.+)$/);
        if (m && m[1]) {
          const candidate = decodeURIComponent(m[1]).trim();
          if (/^[A-Za-z\-0-9_]+$/.test(candidate)) ids.add(candidate);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }
  return Array.from(ids);
}

// Expose DOM helper for console testing
window.wbeFindParentLinks = findParentProfileIdsFromDOM;

// Dump raw profile data for debugging (exposed for console)
async function dumpProfileForId(id) {
  if (!id) return;
  try {
    showChatShaky("Fetching profile for debug...");
    const [profile, status, page_name] = await WikiTreeAPI.getProfile(
      WBE_CHAT_APP_ID,
      id,
      "Bio,BioHtml,BioText,Biography,Spouses,Name,RealName,Id",
      {
        bioFormat: "both",
        getSpouses: 1,
        resolveRedirect: 1,
      }
    );
    hideChatShaky();
    console.log("wbe: profile dump", { id, profile, status, page_name });
    const hasProfile = profile && Object.keys(profile).length > 0;
    const privacy = profile?.Privacy ?? null;
    const spouses = profile?.Spouses ? Object.keys(profile.Spouses).length : 0;
    console.info("wbe: dumpProfileForId result", { id, hasProfile, privacy, spouses });
    appendMessage("assistant", `Profile fetched: present=${hasProfile}, privacy=${privacy}, spouses=${spouses}.`, {
      shouldPersist: false,
    });
  } catch (err) {
    hideChatShaky();
    console.error("wbe: dumpProfileForId error", err);
    try {
      const em = String(err?.message || err || "unknown error");
      appendMessage("assistant", `Failed to fetch profile: ${em}`);
    } catch (e) {
      appendMessage("assistant", "Failed to fetch profile.");
    }
  }
}

window.wbeDumpProfile = dumpProfileForId;

// Small popup to list multiple bios with Open buttons
function showBioListPopup(title, entries = []) {
  try {
    $("#wbe-bio-list-popup").remove();
    const popupWidth = Math.max(360, Math.floor(window.innerWidth * 0.4));

    const listItems = (entries || [])
      .map(
        (e) =>
          `<li><span>${escapeHtml(e.displayName || e.wtid || "")} (${escapeHtml(
            e.wtid || ""
          )})</span> <button class="open-bio" data-wtid="${escapeHtml(e.wtid || "")}">Open Bio</button></li>`
      )
      .join("");

    const html = `
      <div id="wbe-bio-list-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
      (window.innerWidth - popupWidth) / 2
    )}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>${escapeHtml(title || "Profiles")}</strong>
          <div class="chat-popup-controls">
            <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="chat-popup-body chat-popup-body--compact">
          <ul class="spouse-list">
            ${listItems}
          </ul>
          <div class="bio-list-actions" style="margin-top:8px;">
            <button class="open-all-tiled small">Open All (Tiled)</button>
          </div>
        </div>
      </div>`;

    const $popup = $(html).appendTo(document.body);
    $popup.find(".close-popup").on("click", () => $popup.remove());
    $popup.find(".open-all-tiled").on("click", () => {
      const ids = entries.map((e) => e.wtid).filter(Boolean);
      if (ids.length) showTiledBioPopups(ids.slice(0, 12));
    });
    $popup.find(".open-bio").on("click", async (e) => {
      const raw = $(e.currentTarget).attr("data-wtid");
      if (!raw) return;
      const resolved = await resolveToWTID(raw);
      if (resolved) showBioPopupForId(resolved);
    });
    setHighestZIndex($popup.get(0));
    $popup.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
    // Do not auto-open the first bio to avoid unexpected popups when profile
    // fetches fail or return empty content. Require the user to click an entry.
  } catch (e) {
    console.error("wbe: showBioListPopup error", e);
  }
}

window.wbeShowBioList = showBioListPopup;

// Open multiple bio popups tiled on screen. Creates individual popups per profile id.
async function showTiledBioPopups(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return;
  const max = Math.min(ids.length, 12);
  const toOpen = ids.slice(0, max);
  const profiles = await fetchProfilesForIds(toOpen, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
    bioFormat: "both",
    resolveRedirect: 1,
  });
  // If all fetched profiles are null/empty, avoid opening empty popups and notify the user.
  const anyValid = Array.isArray(profiles) && profiles.some((p) => p && Object.keys(p).length > 0);
  if (!anyValid) {
    try {
      appendMessage("assistant", "Could not load any biographies (server errors or no data). No popups were opened.", {
        shouldPersist: false,
      });
    } catch (e) {
      /* ignore */
    }
    return;
  }
  // Layout: up to 4 columns depending on count
  const cols = Math.min(3, Math.max(1, Math.floor(Math.sqrt(toOpen.length))));
  const width = Math.floor((window.innerWidth - 40) / cols);
  let left = 10;
  let top = 80;
  let col = 0;
  for (let i = 0; i < toOpen.length; i += 1) {
    const id = toOpen[i];
    const profile = profiles[i] || null;
    if (!profile) continue; // skip failed fetches
    const { wikiBio, htmlBio } = extractProfileBios(profile);
    // Skip profiles that have no biography content to avoid empty popups
    if (!wikiBio && !htmlBio) continue;
    const name = (profile && (profile.RealName || profile.Name)) || id;
    const pid = `wbe-bio-popup-${encodeURIComponent(id)}`;
    $(`#${pid}`).remove();
    const $p = $(
      `<div id="${pid}" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${width}px;left:${left}px;top:${top}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>Biography: ${escapeHtml(name)}</strong>
          <div class="chat-popup-controls"><button type="button" class="small close-popup" title="Close">×</button></div>
        </div>
        <div class="chat-popup-body chat-popup-body--columns" style="height:320px;overflow:auto;">
          <div class="bio-column bio-column--wiki">
            <pre class="bio-wiki-pre">${escapeHtml(wikiBio || "(no wiki text)")}</pre>
          </div>
          <div class="bio-column">
            <div class="bio-html-container">${sanitizeHtmlForPopup(htmlBio) || "<i>(no html)</i>"}</div>
          </div>
        </div>
      </div>`
    ).appendTo(document.body);
    $p.find(".close-popup").on("click", () => $p.remove());
    setHighestZIndex($p.get(0));
    $p.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
    // Advance grid position for next tiled popup
    if (!Number.isFinite(col)) col = 0;
    col += 1;
    if (col >= cols) {
      col = 0;
      left = 10;
      top += 340;
    } else {
      left += width + 10;
    }
  }

  return;
}

// Fetch sibling WTIDs for a profile id, using API then DOM fallback
async function fetchSiblingIdsForId(id) {
  if (!id) return [];
  try {
    showChatShaky("Loading siblings...");
    try {
      const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, "Id,Name,RealName", { getSiblings: 1 });
      const [peopleResult] = relatives || [];
      const profile = peopleResult?.person || {};
      const siblingsObj = profile?.Siblings || {};
      const siblings = Object.values(siblingsObj || []).map((s) => s?.Name || (s?.Id ? String(s.Id) : null)).filter(Boolean);
      if (siblings.length) {
        hideChatShaky();
        return siblings;
      }
    } catch (e) {
      // ignore and fall back to getProfile/DOM
    }
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Siblings,Name,Id", {
      getSiblings: 1,
      resolveRedirect: 1,
    });
    hideChatShaky();
    const siblingsObj = profile?.Siblings || {};
    let siblings = Object.values(siblingsObj || []).map((s) => s.Name).filter(Boolean);
    if (siblings.length) return siblings;
    // DOM fallback
    const domCandidates = findSiblingProfileIdsFromDOM();
    if (!domCandidates.length) return [];
    const profiles = await fetchProfilesForIds(domCandidates, "Name,Id", { resolveRedirect: 1 });
    return profiles.map((p, i) => (p ? domCandidates[i] : null)).filter(Boolean);
  } catch (err) {
    hideChatShaky();
    console.error("wbe: fetchSiblingIdsForId error", err);
    return [];
  }
}

// Fetch children WTIDs for a profile id, using API then DOM fallback
async function fetchChildrenIdsForId(id) {
  if (!id) return [];
  try {
    showChatShaky("Loading children...");
    try {
      const relatives = await WikiTreeAPI.getRelatives(
        WBE_CHAT_APP_ID,
        id,
        "Id,Name,RealName",
        { getChildren: 1 }
      );
      const [peopleResult] = relatives || [];
      const profile = peopleResult?.person || {};
      const childrenObj = profile?.Children || {};
      const children = Object.values(childrenObj || []).map((c) => c?.Name || (c?.Id ? String(c.Id) : null)).filter(Boolean);
      if (children.length) {
        hideChatShaky();
        return children;
      }
    } catch (e) {
      // ignore and fall back to getProfile/DOM
    }
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Children,Name,Id", {
      getChildren: 1,
      resolveRedirect: 1,
    });
    hideChatShaky();
    const childrenObj2 = profile?.Children || {};
    let children2 = Object.values(childrenObj2 || []).map((c) => c.Name).filter(Boolean);
    if (children2.length) return children2;
    // DOM fallback: find WTIDs on page and validate by fetching profile
    const domCandidates = findChildrenProfileIdsFromDOM();
    if (!domCandidates.length) return [];
    const candidateProfiles = await fetchProfilesForIds(domCandidates, "Name,Id", { resolveRedirect: 1 });
    return candidateProfiles.map((p, i) => (p ? domCandidates[i] : null)).filter(Boolean);
  } catch (err) {
    hideChatShaky();
    console.error("wbe: fetchChildrenIdsForId error", err);
    return [];
  }
}

// Batch-fetch profiles for an array of WTIDs, preserving order. Returns array of profile objects or nulls.
async function fetchProfilesForIds(ids = [], fields = "Name,Id", opts = {}) {
  if (!Array.isArray(ids) || !ids.length) return [];
  try {
    showChatShaky("Fetching profiles...");
    const errors = [];
    const results = await Promise.all(
      ids.map(async (id) => {
        if (!id) return null;
        try {
          const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, fields, opts || { resolveRedirect: 1 });
          return profile || null;
        } catch (e) {
          console.debug("wbe: fetchProfilesForIds individual fetch failed", { id, e });
          errors.push({ id, message: String(e?.message || e) });
          return null;
        }
      })
    );
    hideChatShaky();
    if (errors.length) {
      try {
        const summary = errors
          .slice(0, 10)
          .map((er) => `${er.id} (${er.message.replace(/\n/g, " ")})`)
          .join(", ");
        const extra = errors.length > 10 ? ` and ${errors.length - 10} more` : "";
        appendMessage(
          "assistant",
          `Failed to load some profiles: ${summary}${extra}. Partial results are shown where available.`,
          { shouldPersist: false }
        );
      } catch (e) {
        /* ignore */
      }
    }
    return results;
  } catch (err) {
    hideChatShaky();
    console.error("wbe: fetchProfilesForIds error", err);
    return ids.map(() => null);
  }
}

// Expose for console testing
window.wbeFetchProfiles = fetchProfilesForIds;
window.wbeFetchChildren = fetchChildrenIdsForId;
window.wbeFetchSiblings = fetchSiblingIdsForId;
// Paged getPeople helper: accumulates pages into a single people map.
async function fetchPeoplePaged(appId, rootKey, fields, options = {}) {
  const limit = Number(options.limit) || 1000;
  let start = Number(options.start) || 0;
  let fetchMore = true;
  let lastStatus = "";
  let totalCount = null;
  const aggregated = {};

  while (fetchMore) {
    const pageOpts = { ...(options || {}), start, limit };
    const [status, total, people] = await WikiTreeAPI.getPeople(appId, rootKey, fields, pageOpts);
    if (status == null) {
      throw new Error("No status returned from getPeople while paging results.");
    }
    lastStatus = status;
    if (Number.isFinite(Number(total))) totalCount = Number(total);

    const pageProfiles = Object.values(people || {});
    pageProfiles.forEach((profile) => {
      if (!profile) return;
      const key = profile?.Id != null ? String(profile.Id) : profile?.Name || null;
      if (key) aggregated[key] = profile;
    });

    fetchMore = typeof status === "string" && status.startsWith("Maximum number of profiles");
    if (!fetchMore) break;
    // advance to next page
    start += limit;
  }

  return [lastStatus, totalCount, aggregated];
}

// Expose for console testing
window.wbeFetchPeoplePaged = fetchPeoplePaged;

// Resolve an identifier (numeric id or WTID) to a WTID (profile.Name) if possible.
async function resolveToWTID(candidate) {
  if (!candidate) return null;
  const str = String(candidate || "").trim();
  // If it already looks like a WTID (contains a dash), return as-is
  if (/-/.test(str)) return str;
  // Otherwise try to fetch the profile and return the Name field
  try {
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, str, "Id,Name", { resolveRedirect: 1 });
    if (profile && profile.Name) return profile.Name;
  } catch (e) {
    console.debug("wbe: resolveToWTID failed to resolve", { candidate: str, e });
  }
  return str; // fallback to original
}

window.wbeResolveToWTID = resolveToWTID;

// Sanitize profile HTML for insertion into popups to avoid CSP inline-script execution.
function sanitizeHtmlForPopup(html) {
  try {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    // Remove script tags
    doc.querySelectorAll("script").forEach((s) => s.remove());
    // Remove inline event handler attributes (on*) and javascript: src/href
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = String(attr.name || "");
        const val = String(attr.value || "");
        if (/^on/i.test(name)) {
          el.removeAttribute(name);
        }
        if ((name === "src" || name === "href") && /^javascript:/i.test(val)) {
          el.removeAttribute(name);
        }
      });
    });
    return doc.body.innerHTML || "";
  } catch (e) {
    return "";
  }
}

// positionPopupForOpen moved to `src/features/chat/ui.js`.

function formatSubjectLabel(subject) {
  if (!subject) {
    return "";
  }

  const displayName = String(subject.displayName || "").trim();
  const wtId = String(subject.wtId || "").trim();
  const labelCore = displayName && displayName !== wtId ? `${displayName} (${wtId})` : displayName || wtId;

  if (subject.subjectType === "user") {
    return labelCore ? `you (${labelCore})` : "you";
  }

  return labelCore;
}

function getMessageList() {
  return $(`#${CHAT_MESSAGES_ID}`);
}

function saveHistory() {
  sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(chatHistory));
}

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    chatHistory = raw ? JSON.parse(raw) : [];
    refreshLastNonRetryUserPrompt();
  } catch (error) {
    chatHistory = [];
    lastNonRetryUserPrompt = "";
  }
  // Sanitize any legacy inlineMore entries (drop zero counts or non-objects)
  try {
    chatHistory = (chatHistory || []).map((entry) => {
      if (!entry) return entry;
      const im = entry.inlineMore;
      if (!im) return entry;
      // If inlineMore is a plain number (legacy), convert to object without count
      if (typeof im === "number") {
        entry.inlineMore = { text: null };
        return entry;
      }
      if (typeof im === "object") {
        // Remove zero counts
        if (Number.isFinite(Number(im.count)) && Number(Number(im.count)) === 0) {
          delete entry.inlineMore.count;
        }
        // If no useful text or positive count remains, drop inlineMore
        if (!entry.inlineMore.text && !Number.isFinite(Number(entry.inlineMore.count))) {
          delete entry.inlineMore;
        }
      }
      return entry;
    });
  } catch (e) {
    /* ignore sanitize errors */
  }
  // Restore persisted connection/table/state
  try {
    const connRaw = sessionStorage.getItem(CHAT_LAST_CONNECTION_KEY);
    if (connRaw) lastConnectionPopupResult = JSON.parse(connRaw);
  } catch (e) {
    lastConnectionPopupResult = lastConnectionPopupResult || null;
  }

  try {
    const structRaw = sessionStorage.getItem(CHAT_LAST_STRUCTURED_KEY);
    if (structRaw) lastStructuredResult = JSON.parse(structRaw);
  } catch (e) {
    lastStructuredResult = lastStructuredResult || null;
  }

  try {
    const bioRaw = sessionStorage.getItem(CHAT_LAST_BIO_KEY);
    if (bioRaw) {
      const parsed = JSON.parse(bioRaw);
      lastBioPopupId = parsed?.id || lastBioPopupId;
    }
  } catch (e) {
    /* ignore */
  }
  const messages = getMessageList();
  if (messages && messages.length) {
    messages.empty();
  }
  // Remove persistent buttons
  $("#wbe-connections-button").remove();
  $("#wbe-bio-button").remove();
}

function isRetryPrompt(prompt) {
  const value = String(prompt || "").trim();
  if (!value) {
    return false;
  }
  return /^(?:try\s+again[a-z]*|retry|re-try|again|one\s+more\s+time|rerun|re-run)\W*$/i.test(value);
}

function refreshLastNonRetryUserPrompt() {
  lastNonRetryUserPrompt = "";
  for (let i = chatHistory.length - 1; i >= 0; i -= 1) {
    const message = chatHistory[i];
    if (message?.role !== "user") {
      continue;
    }
    if (!isRetryPrompt(message.text)) {
      lastNonRetryUserPrompt = String(message.text || "").trim();
      return;
    }
  }
}

function truncateForAi(text, maxChars = CHAT_AI_MESSAGE_MAX_CHARS) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 1)}...`;
}

function buildRecentConversationForAi(maxMessages = CHAT_AI_HISTORY_MAX_MESSAGES) {
  const recent = chatHistory.slice(-maxMessages);
  if (!recent.length) {
    return "";
  }

  return recent
    .map((message) => {
      const role = message?.role === "user" ? "User" : "Assistant";
      return `${role}: ${truncateForAi(message?.text)}`;
    })
    .join("\n");
}

function softenFailureMessage(text) {
  const original = String(text ?? "");
  if (!/^\s*I could(?: not|n't)\b/i.test(original)) {
    return original;
  }

  let message = original
    .replace(/^\s*I could not\b/i, "I'm sorry, I could not")
    .replace(/^\s*I couldn't\b/i, "I'm sorry, I couldn't")
    .trim();

  if (!/[?]$/.test(message)) {
    const hasAdviceAlready = /\b(try|please|refresh|restate|set it|log in)\b/i.test(message);
    message += hasAdviceAlready
      ? " What would you like to try next?"
      : " Could you try a more specific name or a WikiTree ID?";
  }

  return message;
}

function shouldEscalateLocalFailureToAi(result) {
  const message = typeof result === "string" ? result : result?.message;
  if (!message) {
    return false;
  }

  return /^\s*(?:I'm\s+sorry,\s*)?I\s+could(?:\s+not|n't)\b/i.test(String(message));
}

function appendMessage(role, text, options = {}) {
  const shouldPersist = typeof options === "boolean" ? options : options.shouldPersist !== false;
  const action = typeof options === "object" ? options.action : null;
  const inlineMore = typeof options === "object" ? options.inlineMore : null;
  const $messages = $(`#${CHAT_MESSAGES_ID}`);
  if ($messages.length === 0) return;

  const messageText = role === "assistant" ? softenFailureMessage(text) : text;

  const $item = $("<div>").addClass(`chat-message chat-message-${role}`);
  const $label = $("<div>")
    .addClass("chat-message-label")
    .text(role === "user" ? "You" : "Chat");
  const $body = $("<div>").addClass("chat-message-body").html(formatChatMessageBody(messageText, inlineMore));

  $body.on("click", (event) => {
    const $target = $(event.target || event.currentTarget);
    const $inlineMoreLink = $target.closest(".chat-inline-show-more");
    if (!$inlineMoreLink.length) return;

    event.preventDefault();
    if (inlineMore?.text) {
      const $container = $inlineMoreLink.closest(".chat-inline-more-container");
      if (!$container.length) return;
      const $expanded = $("<span>")
        .addClass("chat-inline-more-expanded")
        .html(`<br>${formatChatMessageBody(inlineMore.text)}`);
      $container.replaceWith($expanded);
      const messagesEl = $messages.get(0);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    if (typeof action?.onClick === "function") {
      action.onClick();
      return;
    }

    if (lastStructuredResult?.rows?.length) {
      openResultsTable(lastStructuredResult);
    }
  });

  $item.append($label, $body);

  if (action?.label && typeof action.onClick === "function") {
    const $actions = $("<div>").addClass("chat-message-actions");
    const $button = $("<button>").attr("type", "button").addClass("chat-message-action").text(action.label);
    $button.on("click", action.onClick);
    $actions.append($button);
    $item.append($actions);
  }

  $messages.append($item);
  const messagesEl = $messages.get(0);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (shouldPersist) {
    const historyEntry = { role, text: role === "assistant" ? messageText : text };
    if (inlineMore?.text) {
      const countValue = Number.isFinite(Number(inlineMore.count)) ? Number(inlineMore.count) : null;
      historyEntry.inlineMore = { text: inlineMore.text };
      if (Number.isFinite(countValue) && countValue > 0) {
        historyEntry.inlineMore.count = countValue;
      }
    }
    if (action?.label) historyEntry.actionLabel = action.label;
    chatHistory.push(historyEntry);
    saveHistory();
  }
}

function formatChatMessageBody(text, inlineMore = null) {
  const escaped = escapeHtml(text).replace(/\n/g, "<br>");
  const withWikiTreeLinks = escaped.replace(/\b([A-Z][A-Za-z0-9_]+-\d+)\b/g, (full, wtId) => {
    const href = `https://www.wikitree.com/wiki/${encodeURIComponent(wtId)}`;
    return `<a class="chat-results-link" href="${href}" target="_blank" rel="noopener noreferrer">${wtId}</a>`;
  });

  const formattedBody = withWikiTreeLinks.replace(/__WBE_SHOW_MORE__:(\d+)/g, (full, count) => {
    return `<a href="#" class="chat-results-link chat-inline-show-more">${count} more</a>`;
  });

  if (!inlineMore?.text) {
    return formattedBody;
  }

  const count = Number.isFinite(Number(inlineMore.count)) ? Number(inlineMore.count) : null;
  const moreLabel = count == null ? "more" : `${count} more`;
  return `${formattedBody}<span class="chat-inline-more-container"><br>...and <a href="#" class="chat-results-link chat-inline-show-more">${moreLabel}</a>.</span>`;
}

// Normalize extraction of wiki and html bio fields from profile objects
function extractProfileBios(profile) {
  if (!profile || typeof profile !== "object") return { wikiBio: "", htmlBio: "" };
  const wikiBio =
    profile.Bio ||
    profile.BioText ||
    profile.BioWiki ||
    profile.Biography ||
    profile.bio ||
    profile.bioText ||
    profile.biography ||
    "";
  const htmlBio =
    profile.BioHtml ||
    profile.BioHTML ||
    profile.Bio_Html ||
    profile.BioHtmlText ||
    profile.bioHTML ||
    profile.bioHtml ||
    profile.bio_html ||
    "";
  return { wikiBio, htmlBio };
}

// Handle short pronoun follow-ups like "their bios?" referring to lastStructuredResult
async function tryHandlePronounFollowup(prompt) {
  if (!prompt || typeof prompt !== "string") return null;
  const normalized = prompt.trim().toLowerCase();
  if (
    !/^(?:their|them|those)\b.*\b(?:bio|bios|biographies|biography)\??$/.test(normalized) &&
    !/^their\s*bio\??$/.test(normalized)
  ) {
    return null;
  }
  if (!lastStructuredResult || !Array.isArray(lastStructuredResult.rows) || !lastStructuredResult.rows.length) {
    return "I don't have a recent result set to pull 'their bios' from. Ask for a list or table first.";
  }

  // Collect WTIDs from lastStructuredResult
  const wtids = Array.from(
    new Set(lastStructuredResult.rows.map((r) => String(r.wtid || r.WTID || "").trim()).filter(Boolean))
  );
  if (!wtids.length) return "I couldn't find profile identifiers in the last result set to fetch bios.";

  // Fetch profiles in batch
  const profiles = await fetchProfilesForIds(wtids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
    bioFormat: "both",
    resolveRedirect: 1,
  });

  const entries = wtids.map((wtid, i) => ({ wtid, displayName: profiles[i]?.RealName || profiles[i]?.Name || wtid }));
  // Show a small popup with buttons and auto-open the first bio
  showBioListPopup(`Bios from last results (${entries.length})`, entries.slice(0, 25));
  return { message: `Opened bio popup for ${entries[0].displayName} and listed others.` };
}

function renderHistory() {
  const $messages = getMessageList();
  if (!$messages || $messages.length === 0) return;
  $messages.empty();
  chatHistory.forEach((message) => {
    const opts = { shouldPersist: false, inlineMore: message.inlineMore || null };
    if (message.actionLabel) {
      // Reconstruct known actions
      if (message.actionLabel === "Connections") {
        opts.action = {
          label: "Connections",
          onClick: () => toggleConnectionsPopup(),
        };
      } else if (message.actionLabel === "Table") {
        opts.action = {
          label: "Table",
          onClick: () => {
            if (lastStructuredResult) openResultsTable(lastStructuredResult);
          },
        };
      } else if (message.actionLabel === "Show Bio") {
        opts.action = {
          label: "Show Bio",
          onClick: async () => {
            if (lastBioPopupId) {
              const w = await resolveToWTID(lastBioPopupId);
              showBioPopupForId(w).catch(() => {});
            } else appendMessage("assistant", "No saved biography available to show.");
          },
        };
      }
    }
    appendMessage(message.role, message.text, opts);
  });
}

function clearHistory() {
  chatHistory = [];
  lastNonRetryUserPrompt = "";
  lastConnectionPopupResult = null;
  lastStructuredResult = null;
  lastBioPopupId = null;
  lastBioPopupProfile = null;
  pendingDisambiguationContext = null;
  lastConnectionCandidates = [];
  lastConnectionRankedMatches = [];
  cc7Cache = { rootKey: null, nuclear: 7, fetchedAt: 0, profiles: [] };
  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
    sessionStorage.removeItem(CHAT_LAST_CONNECTION_KEY);
    sessionStorage.removeItem(CHAT_LAST_STRUCTURED_KEY);
    sessionStorage.removeItem(CHAT_LAST_BIO_KEY);
  } catch (e) {
    /* ignore storage errors */
  }
  loadHistory();
  renderHistory();
  try {
    appendMessage("assistant", "Chat cleared.", { shouldPersist: false });
  } catch (e) {
    /* ignore */
  }
}

function setPendingState(isPending) {
  const $input = $(`#${CHAT_INPUT_ID}`);
  const $sendButton = $(`#${CHAT_SEND_ID}`);
  if ($input.length) $input.prop("disabled", isPending);
  if ($sendButton.length) {
    $sendButton.prop("disabled", isPending);
    $sendButton.text(isPending ? "Sending..." : "Send");
  }
}

// `escapeHtml` imported from `src/core/lib/diff_utils.js`

function closeResultsPopup() {
  const table = $(`#${CHAT_RESULTS_TABLE_ID}`);
  if (table.length && $.fn.DataTable.isDataTable(table)) {
    table.DataTable().destroy();
  }
  $(`#${CHAT_RESULTS_POPUP_ID}`).remove();
}

function openResultsTable(result = lastStructuredResult) {
  if (!result?.rows?.length || !result?.columns?.length) {
    return;
  }

  closeResultsPopup();

  const $popup = $(
    `<div id="${CHAT_RESULTS_POPUP_ID}" class="wbe-popup chat-results-popup">
      <div class="chat-results-header">
        <strong>${escapeHtml(result.title || "Chat Results")}</strong>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">&times;</button>
      </div>
      <div class="chat-results-body">
        ${buildResultsTableHtml(result)}
      </div>
    </div>`
  ).appendTo(document.body);
  positionPopupFixed(
    $popup.get(0),
    Math.round((window.innerWidth - $popup.get(0).getBoundingClientRect().width) / 2),
    110
  );
  $popup.find(".close-popup").on("click", closeResultsPopup);
  setHighestZIndex($popup.get(0));
  $popup.draggable({
    handle: ".chat-results-header",
    containment: "window",
    scroll: false,
    start: () => {
      $popup.get(0).style.right = "auto";
      $popup.get(0).style.transform = "none";
    },
  });

  $popup.resizable({
    handles: "n,e,s,w,se,sw,ne,nw",
    minWidth: 520,
    minHeight: 260,
  });

  $(`#${CHAT_RESULTS_TABLE_ID}`).DataTable({
    paging: true,
    searching: true,
    ordering: true,
    autoWidth: false,
    pageLength: 25,
    order: result.defaultOrder || [],
  });
}

async function getChatOptions() {
  return (await getFeatureOptions("chat")) || {};
}

async function getChatAiConfig() {
  const options = await getChatOptions();
  const provider = options.aiProvider || "openai";
  let key = "";
  let model = options.aiModel || "";

  if (provider === "openai") {
    key = options.openAIKey || "";
    model = model || options.openAIModel || "gpt-5-mini";
  } else if (provider === "gemini") {
    key = options.geminiKey || "";
    model = model || options.geminiModel || "gemini-3-flash-preview";
  } else if (provider === "claude") {
    key = options.claudeKey || "";
    model = model || options.claudeModel || "claude-sonnet-4-5";
  } else if (provider === "perplexity") {
    key = options.perplexityKey || "";
    model = model || options.perplexityModel || "sonar";
  }

  return { provider, key, model };
}

async function handleChatResult(result) {
  if (!result?.message) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(result, "table")) {
    lastStructuredResult = result.table || null;
    try {
      sessionStorage.setItem(CHAT_LAST_STRUCTURED_KEY, JSON.stringify(lastStructuredResult));
    } catch (e) {
      /* ignore */
    }
  }

  const action = result.action
    ? result.action
    : result.table
    ? {
        label: "Table",
        onClick: () => openResultsTable(result.table),
      }
    : null;

  appendMessage("assistant", result.message, { action, inlineMore: result.inlineMore || null });

  if (result.table) {
    const options = await getChatOptions();
    const shouldAutoOpen =
      result.autoOpen || options.showResultsInTable || (result.table?.rows?.length || 0) >= AUTO_OPEN_TABLE_MIN_ROWS;
    if (shouldAutoOpen) {
      openResultsTable(result.table);
    }
  }
}

async function sendChatPrompt() {
  const $input = $(`#${CHAT_INPUT_ID}`);
  if ($input.length === 0) return;

  const rawPrompt = String($input.val() || "").trim();
  if (!rawPrompt) {
    return;
  }

  let prompt = rawPrompt;
  const retryRequested = isRetryPrompt(rawPrompt);

  if (retryRequested) {
    if (!lastNonRetryUserPrompt) {
      appendMessage("assistant", "No earlier request to retry yet. Ask a question first.");
      $input.val("");
      return;
    }
    prompt = lastNonRetryUserPrompt;
    appendMessage("assistant", `Retrying your previous request: ${prompt}`, { shouldPersist: false });
  }

  appendMessage("user", rawPrompt);
  if (!retryRequested) {
    lastNonRetryUserPrompt = rawPrompt;
  }
  $input.val("");
  setPendingState(true);
  // Show global chat loader while processing
  try {
    showChatShaky("Working...", "center");
  } catch (e) {
    /* ignore if shaky helper unavailable */
  }

  try {
    // Handle pending disambiguation: user is replying to a "which one did you mean?" prompt
    if (pendingDisambiguationContext) {
      const ctx = pendingDisambiguationContext;
      const chosen = resolveDisambiguationReply(prompt, ctx.candidates);
      if (chosen) {
        pendingDisambiguationContext = null;
        const resolvedParams = {
          ...ctx.params,
          target: chosen.Name || String(chosen.Id || ""),
          _resolvedPerson: chosen,
        };
        const result = await executeRoutedIntent({ intent: ctx.intent, params: resolvedParams }, ctx.prompt);
        if (result) {
          await handleChatResult(typeof result === "string" ? { message: result } : result);
          return;
        }
      } else {
        // Not a disambiguation reply — clear context and fall through to normal routing
        pendingDisambiguationContext = null;
      }
    }

    const correctionResponse = await tryHandleConnectionCorrectionPrompt(prompt);
    if (correctionResponse) {
      await handleChatResult(
        typeof correctionResponse === "string" ? { message: correctionResponse } : correctionResponse
      );
      return;
    }

    // Intercept spouse-bio style prompts early so short follow-ups (e.g., "Dona's bio?")
    // can be resolved against recent structured results or DOM before normal routing.
    try {
      // Early pronoun follow-up handler (e.g., "Their bios?") that uses lastStructuredResult
      try {
        const pronounEarly = await tryHandlePronounFollowup(prompt);
        if (pronounEarly) {
          if (typeof pronounEarly === "string") {
            await handleChatResult({ message: pronounEarly });
          } else {
            await handleChatResult(pronounEarly);
          }
          return;
        }
      } catch (e) {
        /* ignore pronoun handler errors */
      }

      const spouseEarly = await tryHandlePersonBioPrompt(prompt);
      if (spouseEarly) {
        if (typeof spouseEarly === "string") {
          await handleChatResult({ message: spouseEarly });
        } else {
          await handleChatResult(spouseEarly);
        }
        return;
      }
    } catch (e) {
      /* ignore early spouse handler errors */
    }

    const chatOptions = await getChatOptions();
    const routed = routeChatPrompt(prompt);
    if (chatOptions.allowAiFallback) {
      const plannedToolResponse = await tryHandleAiPlannedIntent(prompt);
      if (plannedToolResponse) {
        if (typeof plannedToolResponse === "string") {
          await handleChatResult({ message: plannedToolResponse });
        } else {
          await handleChatResult(plannedToolResponse);
        }
        return;
      }
    }

    let directToolResponse = await executeRoutedIntent(routed, prompt);
    let localFailureForAi = "";

    if (directToolResponse) {
      if (typeof directToolResponse === "string") {
        directToolResponse = { message: directToolResponse };
      }

      if (!chatOptions.allowAiFallback || !shouldEscalateLocalFailureToAi(directToolResponse)) {
        await handleChatResult(directToolResponse);
        return;
      }

      localFailureForAi = String(directToolResponse.message || "");
    }

    if (!chatOptions.allowAiFallback) {
      appendMessage(
        "assistant",
        "I could not match that to a local chat tool, and AI fallback is disabled in Chat options."
      );
      return;
    }

    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      if (localFailureForAi) {
        appendMessage(
          "assistant",
          `${localFailureForAi} AI fallback is unavailable because no API key is configured for the selected provider.`
        );
      } else {
        appendMessage(
          "assistant",
          "No API key found for the selected provider. Set it in Options under Auto Bio or Chat."
        );
      }
      return;
    }

    const conversationContext = buildRecentConversationForAi();

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: [
        "You are assisting inside the WikiTree Browser Extension chat.",
        conversationContext ? `Recent conversation:\n${conversationContext}` : "",
        localFailureForAi ? `Local tool attempt failed with: ${localFailureForAi}` : "",
        `Current user request: ${prompt}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      provider,
      key,
      model,
      includeApiDocContext: true,
      apiDocUserQuery: prompt,
      apiDocMaxChars: 4500,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (response?.success) {
      appendMessage("assistant", response.response || "No response text returned.");
    } else {
      appendMessage("assistant", localFailureForAi || `Error: ${response?.error || "AI request failed."}`);
    }
  } catch (error) {
    appendMessage("assistant", `Error: ${error?.message || "AI request failed."}`);
  } finally {
    setPendingState(false);
    try {
      hideChatShaky();
    } catch (e) {
      /* ignore */
    }
    $input.focus();
  }
}

async function executeRoutedIntent(routed, prompt) {
  if (!routed?.intent) {
    return null;
  }

  if (routed.intent === ChatIntent.WATCHLIST) {
    return await tryHandleWatchlistPrompt(routed.params);
  }
  if (routed.intent === ChatIntent.CC7_LOCATION_FILTER) {
    return await tryHandleCc7LocationPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.CC_SUMMARY) {
    return await tryHandleCcSummaryPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.RELATION_COUNT) {
    return await tryHandleRelationCountPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.CONNECTION_LOOKUP) {
    // Intercept person/relation-bio style prompts ("Ivy's parents bios", "Their bios", "Dona's bio", etc.)
    const spouseBioAttempt = await tryHandlePersonBioPrompt(prompt);
    if (spouseBioAttempt) {
      console.info("wbe: executeRoutedIntent spouseBioAttempt resolved", { prompt, spouseBioAttempt });
      return spouseBioAttempt;
    }

    return await tryHandleConnectionPrompt(prompt, routed.params?.target);
  }
  if (routed.intent === ChatIntent.PROFILE_FAMILY_CONNECTION) {
    return await tryHandleProfileFamilyConnectionPrompt(routed.params);
  }
  if (routed.intent === ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH) {
    return await tryHandleAncestorAverageAgePrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PERSON_AGE_AT_DEATH) {
    return await tryHandlePersonAgeAtDeathPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.ANCESTOR_LIST) {
    return await tryHandleAncestorListPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.DESCENDANT_LIST) {
    return await tryHandleDescendantListPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.SPOUSE_LIST) {
    return await tryHandleSpouseListPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.SPOUSE_BIO) {
    return await tryHandleSpouseBioIntent(routed.params || {}, prompt);
  }
  if (routed.intent === ChatIntent.PROFILE_SEARCH) {
    return await tryHandleProfileSearchPrompt(routed.params);
  }
  if (routed.intent === ChatIntent.LAST_RESULT_OPERATION) {
    return await tryHandleLastResultOperation(routed.params);
  }

  return null;
}

function parsePlannerJson(rawText) {
  if (!rawText) {
    return null;
  }

  const text = String(rawText).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ? fenced[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    return null;
  }
}

async function tryHandleAiPlannedIntent(prompt) {
  const { provider, key, model } = await getChatAiConfig();
  if (!key) {
    return null;
  }

  const conversationContext = buildRecentConversationForAi();

  const plannerPrompt = [
    "You are a planning layer for a WikiTree browser extension.",
    "Map the user's prompt to one local intent and parameters.",
    'Return JSON only (no markdown): {"intent":"...","params":{...}}',
    "Allowed intents:",
    `- ${ChatIntent.CC7_LOCATION_FILTER} with params {\"mode\":\"list|count\",\"location\":\"...\",\"field\":\"BirthLocation|DeathLocation|AnyLocation\"}`,
    `- ${ChatIntent.CC_SUMMARY} with params {\"mode\":\"summary\",\"nuclear\":7}`,
    `- ${ChatIntent.WATCHLIST} with params {\"mode\":\"list\",\"limit\":100}`,
    `- ${ChatIntent.RELATION_COUNT} with params {"mode":"count|list", "relationRaw":"siblings|parents|children|spouses|aunts|uncles|grandparents|granduncles|grandaunts", "subjectMode":"user|named", "subjectName":"optional when named"}`,
    `- ${ChatIntent.CONNECTION_LOOKUP} with params {\"target\":\"person name or WikiTree ID\"}`,
    `- ${ChatIntent.PROFILE_FAMILY_CONNECTION} with params {\"familyName\":\"...\",\"root\":\"profile\"}`,
    `- ${ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH} with params {\"generation\":5,\"relationshipLabel\":\"3x great-grandparents\"}`,
    `- ${ChatIntent.ANCESTOR_LIST} with params {\"generation\":5,\"relationshipLabel\":\"3rd great-grandparents\",\"location\":\"optional place\",\"locationField\":\"BirthLocation|DeathLocation|AnyLocation\"}`,
    `- ${ChatIntent.DESCENDANT_LIST} with params {\"generation\":5,\"relationshipLabel\":\"5 generations of descendants\",\"includeUpTo\":true}`,
    `- ${ChatIntent.PROFILE_SEARCH} with params {\"query\":\"...\"}`,
    `- ${ChatIntent.LAST_RESULT_OPERATION} with params for table/count/countBy/sort/filter`,
    `- ${ChatIntent.FALLBACK_AI} with params {}`,
    "If unsure, return fallbackAi.",
    conversationContext ? `Recent conversation:\n${conversationContext}` : "",
    `User prompt: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Include spouse-bio planner hint
  // Example: {"intent":"spouseBio","params":{"target":"Jacob Daniels","bioFormat":"both","allowLookup":true}}

  const response = await chrome.runtime.sendMessage({
    action: "chatWithAI",
    prompt: plannerPrompt,
    provider,
    key,
    model,
    includeApiDocContext: true,
    apiDocUserQuery: prompt,
    apiDocMaxChars: 5000,
    pageContext: {
      url: window.location.href,
      title: document.title,
    },
  });

  if (!response?.success || !response.response) {
    return null;
  }

  const planned = parsePlannerJson(response.response);
  if (!planned?.intent || planned.intent === ChatIntent.FALLBACK_AI) {
    return null;
  }

  return await executeRoutedIntent(
    {
      intent: planned.intent,
      params: planned.params || {},
    },
    prompt
  );
}

// Handle planner-invoked spouseBio intent parameters
async function tryHandleSpouseBioIntent(params = {}, prompt = "") {
  const target = String(params?.target || "").trim();
  const bioFormat = String(params?.bioFormat || "both").toLowerCase();
  const allowLookup = params?.allowLookup !== undefined ? Boolean(params.allowLookup) : true;

  if (!target) {
    if (!allowLookup) {
      const reply = `I don't have the wife's name or bio from the single page context you gave (${
        getProfilePersonInfo()?.Name || "unknown"
      }). I can't invent or assume her profile.\n\nTell me one of these and I'll fetch and return her bio:\n- The wife's WikiTree profile ID or URL (for example: Surname-1234), or\n- Her full name as shown on ${
        getProfilePersonInfo()?.Name || "the profile"
      }, or\n- Permission to look up ${
        getProfilePersonInfo()?.Name || "the profile owner"
      } and fetch their spouse's bio.`;
      console.debug("wbe: tryHandleSpouseBioPrompt no targetRaw - asking user for clarification", {
        profileContext: getProfilePersonInfo()?.Name,
        reply,
      });
      return reply;
    }
    // Use profileRoot Name as target
    params.target = profileRoot.Name;
  }

  // Reuse existing flow: resolve target and fetch spouse(s)
  const resolved = await resolveConnectionTargetPerson(params.target || target, prompt);
  if (!resolved?.Name && !resolved?.Id) {
    return `I couldn't identify which profile you meant by "${params.target || target}".`;
  }

  const personKey = resolved.Id || resolved.Name;
  try {
    showChatShaky("Looking up spouse(s)...");
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, personKey, "", {
      getSpouses: 1,
      resolveRedirect: 1,
    });
    hideChatShaky();
    const spousesObj = profile?.Spouses || {};
    const spouses = Object.values(spousesObj || []);
    if (!spouses.length) {
      // Try DOM fallback: scan the profile page for spouse links
      try {
        const domIds = findSpouseProfileIdsFromDOM();
        console.debug("wbe: tryHandleSpouseBioPrompt DOM fallback ids", { domIds });
        if (domIds && domIds.length) {
          // If multiple, show list; if one, fetch directly
          if (domIds.length === 1) {
            const spouseId = domIds[0];
            try {
              showChatShaky("Loading spouse bio from page link...");
              const [spProfile] = await WikiTreeAPI.getProfile(
                WBE_CHAT_APP_ID,
                spouseId,
                "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
                { bioFormat: "both", resolveRedirect: 1 }
              );
              hideChatShaky();
              console.debug("wbe: spouse profile fetched via DOM fallback", { spouseId, spProfile });
              const { wikiBio: domWiki } = extractProfileBios(spProfile);
              return {
                message: `Biography for ${spProfile?.Name || spouseId}:`,
                action: {
                  label: "Show Bio",
                  onClick: async () => {
                    const wtid = await resolveToWTID(spouseId);
                    showBioPopupForId(wtid).catch(() => {});
                  },
                },
                inlineMore: { text: domWiki },
              };
            } catch (err) {
              hideChatShaky();
              console.error("wbe: error fetching spouse profile via DOM fallback", err);
              return `Failed to fetch spouse profile found on the page (${spouseId}).`;
            }
          }
          // multiple
          return {
            message: `Found spouse links on the page for ${resolved.RealName || resolved.Name}. Click to open one.`,
            action: {
              label: "Spouses",
              onClick: () => {
                // show a list using the existing helper
                listSpousesForId(resolved.Name);
              },
            },
          };
        }
      } catch (e) {
        console.error("wbe: DOM fallback error", e);
      }

      return `No spouse information found for ${resolved.RealName || resolved.Name} (${resolved.Name}).`;
    }
    if (spouses.length === 1) {
      const spouseId = spouses[0].Name;
      showChatShaky("Loading spouse bio...");
      const [spProfile] = await WikiTreeAPI.getProfile(
        WBE_CHAT_APP_ID,
        spouseId,
        "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
        { bioFormat, resolveRedirect: 1 }
      );
      hideChatShaky();
      const wikiBio = spProfile?.Bio || spProfile?.BioText || spProfile?.Biography || "";
      const htmlBio = spProfile?.BioHtml || spProfile?.BioHTML || "";
      return {
        message: `Biography for ${spProfile?.Name || spouseId}:`,
        action: { label: "Show Bio", onClick: async () => { const wtid = await resolveToWTID(spouseId); showBioPopupForId(wtid).catch(()=>{}); } },
        inlineMore: { text: wikiBio },
      };
    }
    const preview = spouses.map((s) => `- ${s.RealName || s.Name} (${s.Name})`).join("\n");
    return {
      message: `Multiple spouses found for ${resolved.RealName || resolved.Name}:\n${preview}`,
      action: { label: "Spouses", onClick: () => listSpousesForId(personKey) },
    };
  } catch (err) {
    hideChatShaky();
    console.error("wbe: tryHandleSpouseBioIntent error", err);
    return `Failed to lookup spouse information for ${resolved.RealName || resolved.Name}.`;
  }
}

function extractConnectionTarget(prompt) {
  const fromMeMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+me\s+to\s+(.+?)\??$/i
  );
  if (fromMeMatch?.[1]) {
    return fromMeMatch[1].trim();
  }

  const betweenMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+me\s+and\s+(.+?)\??$/i
  );
  if (betweenMatch?.[1]) {
    return betweenMatch[1].trim();
  }

  const toMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:my\s+)?(?:connection(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+(.+?)\??$/i
  );
  if (!toMatch?.[1]) {
    return "";
  }
  return toMatch[1].trim();
}

function normalizePersonText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitPersonName(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[?.!]+$/, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function normalizeConnectionTargetForSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/\b(?:the\s+)?(?:actor|actress|singer|musician|writer|poet|politician|comedian|mp|sir|dame)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isConnectionCorrectionPrompt(prompt) {
  return /^(?:he\s*'?s\s+not|she\s*'?s\s+not|that\s*'?s\s+not|not\s+him|not\s+her|wrong\s+person|not\s+the\s+right\s+person)/i.test(
    String(prompt || "").trim()
  );
}

function extractCorrectionTarget(prompt) {
  const normalized = String(prompt || "").trim();
  const match = normalized.match(/(?:not|wrong\s+person\s*[:,]?)(?:\s+the\s+)?\s+(.+?)\??$/i);
  if (!match?.[1]) {
    return "";
  }
  return normalizeConnectionTargetForSearch(match[1]);
}

function extractYearFromDate(value) {
  const match = String(value || "").match(/^(\d{4})/);
  if (!match || match[1] === "0000") {
    return null;
  }
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function isWikiTreeId(value) {
  return /^[A-Za-z][A-Za-z0-9_]+-\d+$/i.test(String(value || "").trim());
}

function extractWikiTreeIdFromHref(href) {
  const value = String(href || "").trim();
  if (!value) {
    return "";
  }

  try {
    const resolved = new URL(value, window.location.origin);
    const match = resolved.pathname.match(/\/wiki\/([^/?#]+)/i);
    const wikiId = decodeURIComponent(match?.[1] || "").trim();
    return isWikiTreeId(wikiId) ? wikiId : "";
  } catch (error) {
    return "";
  }
}

function scorePageContextCandidate(target, targetParts, candidate) {
  const normalizedTarget = normalizePersonText(target);
  if (!normalizedTarget) {
    return 0;
  }

  const targetFirst = normalizePersonText(targetParts.firstName);
  const targetLast = normalizePersonText(targetParts.lastName);
  const name = normalizePersonText(candidate.displayName);
  const title = normalizePersonText(candidate.title);
  const wtId = normalizePersonText(candidate.wtId);
  const haystacks = [name, title, wtId].filter(Boolean);
  let score = 0;

  haystacks.forEach((haystack) => {
    if (haystack === normalizedTarget) {
      score = Math.max(score, 500);
    } else if (haystack.startsWith(`${normalizedTarget} `) || haystack.endsWith(` ${normalizedTarget}`)) {
      score = Math.max(score, 360);
    } else if (haystack.includes(normalizedTarget)) {
      score = Math.max(score, 240);
    }
  });

  if (targetFirst && targetLast) {
    const firstMatches = haystacks.some(
      (haystack) => haystack.startsWith(`${targetFirst} `) || haystack.includes(` ${targetFirst} `)
    );
    const lastMatches = haystacks.some(
      (haystack) =>
        haystack.endsWith(` ${targetLast}`) || haystack.includes(` ${targetLast} `) || haystack === targetLast
    );
    if (firstMatches) {
      score += 80;
    }
    if (lastMatches) {
      score += 140;
    }
  }

  return score;
}

function findPageContextPersonCandidate(target) {
  const cleanedTarget = normalizeConnectionTargetForSearch(target);
  const normalizedTarget = normalizePersonText(cleanedTarget);
  if (!normalizedTarget) {
    return null;
  }

  const targetParts = splitPersonName(cleanedTarget);
  const deduped = new Map();

  const profilePerson = getProfilePersonInfo();
  if (profilePerson?.Name) {
    const profileCandidate = {
      wtId: profilePerson.Name,
      displayName:
        profilePerson.FullName || `${profilePerson.FirstName || ""} ${profilePerson.LastNameAtBirth || ""}`.trim(),
      title: document.title || "",
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, profileCandidate);
    if (score > 0) {
      deduped.set(profileCandidate.wtId, { ...profileCandidate, score });
    }
  }

  document.querySelectorAll('a[href*="/wiki/"]').forEach((anchor) => {
    const wtId = extractWikiTreeIdFromHref(anchor.getAttribute("href") || anchor.href || "");
    if (!wtId) {
      return;
    }

    const candidate = {
      wtId,
      displayName: String(anchor.textContent || "").trim(),
      title: String(anchor.getAttribute("title") || "").trim(),
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, candidate);
    if (score < 320) {
      return;
    }

    const existing = deduped.get(wtId);
    if (!existing || score > existing.score) {
      deduped.set(wtId, { ...candidate, score });
    }
  });

  const ranked = Array.from(deduped.values()).sort((left, right) => right.score - left.score);
  return ranked[0] || null;
}

function rankConnectionMatches(target, matches, targetParts = {}) {
  if (!Array.isArray(matches) || !matches.length) {
    return [];
  }

  const normalizedTarget = normalizePersonText(target);
  const normalizedFirst = normalizePersonText(targetParts.firstName);
  const normalizedLast = normalizePersonText(targetParts.lastName);
  const ranked = matches.map((match) => {
    const name = match?.Name || "";
    const realName = match?.RealName || match?.Derived?.ShortName || "";
    const lastCurrent = match?.LastNameCurrent || "";
    const lastBirth = match?.LastNameAtBirth || "";
    const profileFirst = match?.FirstName || "";
    let score = 0;

    if (normalizePersonText(name) === normalizedTarget) {
      score += 100;
    }
    if (normalizePersonText(realName) === normalizedTarget) {
      score += 120;
    }
    if (
      normalizePersonText(realName).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizePersonText(realName))
    ) {
      score += 35;
    }

    if (normalizedLast) {
      if (normalizePersonText(lastCurrent) === normalizedLast || normalizePersonText(lastBirth) === normalizedLast) {
        score += 140;
      } else {
        score -= 120;
      }
    }

    if (normalizedFirst) {
      if (normalizePersonText(profileFirst) === normalizedFirst) {
        score += 80;
      } else if (normalizePersonText(realName).startsWith(`${normalizedFirst} `)) {
        score += 40;
      }
    }

    if (name) {
      score += 5;
    }

    // lower index means higher relevance from searchPerson.
    const idx = Number(match?.index);
    if (Number.isFinite(idx)) {
      score += Math.max(0, 25 - idx);
    }

    return { match, score };
  });

  ranked.sort((left, right) => right.score - left.score);
  return ranked;
}

function shouldUseAiForConnectionDisambiguation(targetParts, rankedMatches) {
  if (!rankedMatches.length) {
    return false;
  }

  if (rankedMatches.length === 1) {
    return false;
  }

  const top = rankedMatches[0];
  const second = rankedMatches[1];
  if (!top?.match || !second?.match) {
    return false;
  }

  const closeScore = Math.abs((top.score || 0) - (second.score || 0)) < 45;

  const topBirthYear = extractYearFromDate(top.match.BirthDate);
  const secondBirthYear = extractYearFromDate(second.match.BirthDate);
  const highlyDifferentEra =
    Number.isFinite(topBirthYear) && Number.isFinite(secondBirthYear) && Math.abs(topBirthYear - secondBirthYear) > 80;

  const hasFullNameTarget = Boolean(targetParts.firstName && targetParts.lastName);
  return hasFullNameTarget && (closeScore || highlyDifferentEra);
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryAiExpandConnectionTarget(target, prompt = "") {
  const chatOptions = await getChatOptions();
  if (!chatOptions.allowAiFallback) {
    return null;
  }

  const { provider, key, model } = await getChatAiConfig();
  if (!key) {
    return null;
  }

  const aiPrompt = [
    "You map a likely real-world person name or alias to better WikiTree search hints.",
    'Return strict JSON only: {"searchName":"...","birthYear":1933,"reason":"..."}.',
    "If no better hint exists, return {}.",
    "Common aliases to know: QE2='Queen Elizabeth II'='Elizabeth Windsor', JFK='John F Kennedy', MLK='Martin Luther King Jr', etc.",
    `Original target: ${target}`,
    prompt ? `User prompt: ${prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await chrome.runtime.sendMessage({
    action: "chatWithAI",
    prompt: aiPrompt,
    provider,
    key,
    model,
    pageContext: {
      url: window.location.href,
      title: document.title,
    },
  });

  if (!response?.success || !response.response) {
    return null;
  }

  const parsed = parsePlannerJson(response.response);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const searchName = String(parsed.searchName || "").trim();
  const birthYear = Number(parsed.birthYear);

  return {
    searchName: searchName || "",
    birthYear: Number.isFinite(birthYear) ? birthYear : null,
  };
}

function getCommonAliasExpansion(target) {
  const normalized = String(target || "")
    .trim()
    .toLowerCase();

  const aliases = {
    qe2: { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth ii": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth 2": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    jfk: { searchName: "John F Kennedy", birthYear: 1917 },
    "john f. kennedy": { searchName: "John Fitzgerald Kennedy", birthYear: 1917 },
    mlk: { searchName: "Martin Luther King Jr", birthYear: 1929 },
    "martin luther king": { searchName: "Martin Luther King Jr", birthYear: 1929 },
  };

  return aliases[normalized] || null;
}

function mergeConnectionMatches(matchLists) {
  const merged = new Map();
  (matchLists || []).forEach((list) => {
    (list || []).forEach((match) => {
      const key = String(match?.Name || match?.Id || "").trim();
      if (!key) {
        return;
      }
      if (!merged.has(key)) {
        merged.set(key, match);
      }
    });
  });
  return Array.from(merged.values());
}

async function tryAiDisambiguateConnectionTarget(target, rankedMatches) {
  const chatOptions = await getChatOptions();
  if (!chatOptions.allowAiFallback || !rankedMatches?.length) {
    return null;
  }

  const { provider, key, model } = await getChatAiConfig();
  if (!key) {
    return null;
  }

  const candidates = rankedMatches.slice(0, 8).map((entry, index) => ({
    rank: index + 1,
    score: entry.score,
    Id: entry.match?.Id,
    Name: entry.match?.Name,
    RealName: entry.match?.RealName || entry.match?.Derived?.ShortName || "",
    BirthDate: entry.match?.BirthDate || "",
    DeathDate: entry.match?.DeathDate || "",
    LastNameAtBirth: entry.match?.LastNameAtBirth || "",
    LastNameCurrent: entry.match?.LastNameCurrent || "",
  }));

  const prompt = [
    "You disambiguate intended people for a genealogy extension.",
    "Given a user target and candidate WikiTree profiles, choose the best person.",
    "If none look right, suggest an alternate search name (e.g. stage-name/legal-name mapping).",
    "Return strict JSON only:",
    '{"action":"chooseCandidate","wtId":"Name-123"} OR {"action":"searchName","searchName":"..."} OR {"action":"none"}',
    `Target: ${target}`,
    `Candidates: ${JSON.stringify(candidates)}`,
  ].join("\n");

  const response = await chrome.runtime.sendMessage({
    action: "chatWithAI",
    prompt,
    provider,
    key,
    model,
    pageContext: {
      url: window.location.href,
      title: document.title,
    },
  });

  if (!response?.success || !response.response) {
    return null;
  }

  const planned = parsePlannerJson(response.response);
  if (!planned?.action) {
    return null;
  }

  if (planned.action === "chooseCandidate") {
    const wtId = String(planned.wtId || "").trim();
    if (!wtId) {
      return null;
    }
    const chosen = rankedMatches.find((entry) => entry.match?.Name === wtId);
    return chosen?.match || null;
  }

  if (planned.action === "searchName") {
    const searchName = String(planned.searchName || "").trim();
    if (!searchName) {
      return null;
    }
    return { _alternateSearchName: searchName };
  }

  return null;
}

async function resolveConnectionTargetPerson(target, prompt = "", options = {}) {
  const cleanedTarget = normalizeConnectionTargetForSearch(target);
  if (!cleanedTarget) {
    return null;
  }

  const excludedWtIds = new Set(
    (options?.excludeWtIds || []).map((value) => String(value || "").trim()).filter(Boolean)
  );

  const pageContextCandidate = findPageContextPersonCandidate(cleanedTarget);
  if (pageContextCandidate?.wtId && !excludedWtIds.has(pageContextCandidate.wtId)) {
    const contextMatch = await WikiTreeAPI.getPerson(
      "Chat",
      pageContextCandidate.wtId,
      "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate"
    );
    if (contextMatch?.Name || contextMatch?.Id) {
      return contextMatch;
    }
    return {
      Name: pageContextCandidate.wtId,
      RealName: pageContextCandidate.displayName,
      Derived: { ShortName: pageContextCandidate.displayName },
    };
  }

  if (isWikiTreeId(cleanedTarget)) {
    const directMatch = await WikiTreeAPI.getPerson(
      "Chat",
      cleanedTarget,
      "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender"
    );
    return directMatch;
  }

  const { firstName, lastName } = splitPersonName(cleanedTarget);
  const fields =
    "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender";
  let aiExpansion = await tryAiExpandConnectionTarget(cleanedTarget, prompt);

  // Fallback: if AI didn't provide a searchName, try common alias mapping
  if (!aiExpansion?.searchName) {
    const commonAlias = getCommonAliasExpansion(cleanedTarget);
    if (commonAlias) {
      aiExpansion = commonAlias;
    }
  }

  const expandedParts = splitPersonName(aiExpansion?.searchName || "");

  let strictMatches = [];
  if (firstName && lastName) {
    const [, searchMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        FirstName: firstName,
        LastName: lastName,
        skipVariants: 1,
        lastNameMatch: "strict",
        limit: 15,
        sort: "birth",
      },
      fields
    );
    strictMatches = searchMatches || [];
  }

  let relaxedMatches = [];
  if (firstName && lastName) {
    const [, searchMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        FirstName: firstName,
        LastName: lastName,
        limit: 15,
        sort: "birth",
      },
      fields
    );
    relaxedMatches = searchMatches || [];
  }

  let realNameMatches = [];
  {
    const [, searchMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        RealName: cleanedTarget,
        limit: 15,
      },
      fields
    );
    realNameMatches = searchMatches || [];
  }

  let expandedNameMatches = [];
  if (aiExpansion?.searchName && normalizePersonText(aiExpansion.searchName) !== normalizePersonText(cleanedTarget)) {
    const [, expandedMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        RealName: aiExpansion.searchName,
        limit: 20,
      },
      fields
    );
    expandedNameMatches = expandedMatches || [];
  }

  let expandedStrictMatches = [];
  if (expandedParts.firstName && expandedParts.lastName) {
    const [, searchMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        FirstName: expandedParts.firstName,
        LastName: expandedParts.lastName,
        skipVariants: 1,
        lastNameMatch: "strict",
        limit: 20,
      },
      fields
    );
    expandedStrictMatches = searchMatches || [];
  }

  const matches = mergeConnectionMatches([
    expandedStrictMatches,
    strictMatches,
    expandedNameMatches,
    relaxedMatches,
    realNameMatches,
  ]);

  let rankedMatches = rankConnectionMatches(cleanedTarget, matches, { firstName, lastName });

  if (expandedParts.lastName && rankedMatches.length) {
    const normalizedExpandedLast = normalizePersonText(expandedParts.lastName);
    rankedMatches = rankedMatches
      .map((entry) => {
        const lnab = normalizePersonText(entry.match?.LastNameAtBirth);
        const lnc = normalizePersonText(entry.match?.LastNameCurrent);
        let score = entry.score;
        if (lnab === normalizedExpandedLast) {
          score += 160;
        } else if (lnc === normalizedExpandedLast) {
          score += 60;
        }
        return { ...entry, score };
      })
      .sort((left, right) => right.score - left.score);
  }

  if (aiExpansion?.birthYear && rankedMatches.length) {
    rankedMatches = rankedMatches
      .map((entry) => {
        const candidateBirthYear = extractYearFromDate(entry.match?.BirthDate);
        let score = entry.score;
        if (Number.isFinite(candidateBirthYear)) {
          const gap = Math.abs(candidateBirthYear - aiExpansion.birthYear);
          if (gap <= 2) {
            score += 70;
          } else if (gap <= 8) {
            score += 35;
          } else if (gap >= 35) {
            score -= 25;
          }
        }
        return { ...entry, score };
      })
      .sort((left, right) => right.score - left.score);
  }

  if (excludedWtIds.size) {
    rankedMatches = rankedMatches.filter((entry) => !excludedWtIds.has(String(entry?.match?.Name || "")));
  }

  lastConnectionCandidates = rankedMatches.map((entry) => entry.match).filter(Boolean);
  lastConnectionRankedMatches = rankedMatches;

  if (options?.allowDisambiguation && shouldOfferDisambiguation(rankedMatches)) {
    return {
      _disambiguationNeeded: true,
      _candidates: lastConnectionCandidates.slice(0, 8),
    };
  }

  if (shouldUseAiForConnectionDisambiguation({ firstName, lastName }, rankedMatches)) {
    const aiChoice = await tryAiDisambiguateConnectionTarget(prompt || cleanedTarget, rankedMatches);
    if (aiChoice?._alternateSearchName) {
      const [, refinedMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          RealName: aiChoice._alternateSearchName,
          limit: 15,
        },
        fields
      );
      if (refinedMatches?.length) {
        rankedMatches = rankConnectionMatches(
          aiChoice._alternateSearchName,
          refinedMatches,
          splitPersonName(aiChoice._alternateSearchName)
        );
      }
    } else if (aiChoice?.Name) {
      return aiChoice;
    }
  }

  let bestMatch = rankedMatches[0]?.match || null;

  if (!bestMatch?.Name) {
    const lookup = await wtAPIProfileSearch("Chat", encodeURIComponent(cleanedTarget), { maxProfiles: 25 });
    const profiles = lookup?.response?.profiles || [];
    if (!profiles.length) {
      return null;
    }
    const profileWtId = profiles.find((wtId) => !excludedWtIds.has(String(wtId || "")));
    if (!profileWtId) {
      return null;
    }
    bestMatch = await WikiTreeAPI.getPerson("Chat", profileWtId, "Id,Name,RealName,LastNameAtBirth,LastNameCurrent");
  }

  if (!bestMatch?.Name && bestMatch?.Id) {
    return await WikiTreeAPI.getPerson("Chat", bestMatch.Id, "Id,Name,RealName,LastNameAtBirth,LastNameCurrent");
  }

  return bestMatch;
}

async function getConnectionDataWithFallback(sourceKey, targetWtId) {
  const attempts = [0, 11, 1];
  let lastData = null;

  for (const relationCode of attempts) {
    console.debug("wbe: getConnectionDataWithFallback trying relation", { sourceKey, targetWtId, relationCode });
    const data = await WikiTreeAPI.getConnections(
      "Chat",
      [sourceKey, targetWtId],
      "Id,Name,Gender,RealName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,BirthLocation,DeathDate,DeathLocation,pathType",
      {
        relation: relationCode,
      }
    );
    lastData = data;
    console.debug("wbe: getConnectionDataWithFallback result", { relationCode, data });
    const pathLength = Number(data?.pathLength);
    const hasPath =
      (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);
    if (hasPath) {
      return { data, relationCode };
    }
  }

  return { data: lastData, relationCode: null };
}

async function tryHandleConnectionCorrectionPrompt(prompt) {
  if (!isConnectionCorrectionPrompt(prompt)) {
    return null;
  }

  if (!lastConnectionContext?.sourceKey) {
    return "I don't have a previous connection lookup to correct yet. Ask a connection question first.";
  }

  const correctionTarget = extractCorrectionTarget(prompt);
  const baseTarget = correctionTarget || lastConnectionContext.targetRaw || "";
  if (!baseTarget) {
    return "I couldn't determine which person to re-check. Please restate the target name.";
  }

  const excludeWtIds = Array.from(
    new Set(
      [...(lastConnectionContext.excludeWtIds || []), String(lastConnectionContext.targetWtId || "").trim()].filter(
        Boolean
      )
    )
  );

  const matchedPerson = await resolveConnectionTargetPerson(baseTarget, prompt, { excludeWtIds });
  if (!matchedPerson?.Name) {
    return `I couldn't find another match for "${baseTarget}" after excluding prior candidates.`;
  }

  const targetWtId = matchedPerson.Name;
  const { data } = await getConnectionDataWithFallback(lastConnectionContext.sourceKey, targetWtId);
  const pathLength = Number(data?.pathLength);
  const hasPath =
    (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);
  const displayName = matchedPerson?.RealName || targetWtId;

  lastConnectionContext = {
    ...lastConnectionContext,
    targetRaw: baseTarget,
    targetWtId,
    excludeWtIds,
    candidates: lastConnectionCandidates.map((candidate) => candidate?.Name).filter(Boolean),
  };

  if (!hasPath) {
    return `I retried with ${displayName} (${targetWtId}), but no connection path was returned.`;
  }

  const distance =
    Number.isFinite(pathLength) && pathLength > 0 ? pathLength - 1 : Math.max((data?.path || []).length - 1, 0);
  let relationshipText = String(data?.relationship || "").trim();
  if (/^\d+$/.test(relationshipText)) {
    relationshipText = "";
  }
  const relationshipSuffix = relationshipText ? ` Relationship: ${relationshipText}.` : "";
  return `Trying another match: ${displayName} (${targetWtId}) is ${distance} step${
    distance === 1 ? "" : "s"
  } away from ${lastConnectionContext.sourceLabel}.${relationshipSuffix}`;
}

function parseLegacyRelationshipLabel(legacy) {
  const html = String(legacy?.html || "");
  if (!html) {
    return "";
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const h2Text = doc.querySelector("h2")?.textContent?.trim() || "";
  if (/^No Relationship Found$/i.test(h2Text)) {
    return "No relationship found";
  }

  const h3Text =
    doc
      .querySelector("h3")
      ?.textContent?.replace(/[\t\n]+/g, " ")
      .trim() || "";
  if (h3Text) {
    return h3Text;
  }

  return "";
}

function normalizeCcNuclear(value, fallback = 7) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.min(10, Math.trunc(numeric)));
}

async function fetchCcProfilesFromApi(userNumId, nuclear = 7) {
  const allProfiles = [];
  const limit = 1000;
  let start = 0;
  let getMore = true;
  const normalizedNuclear = normalizeCcNuclear(nuclear, 7);

  while (getMore) {
    const options = { nuclear: normalizedNuclear, start, limit };
    const [status, , people] = await WikiTreeAPI.getPeople(
      WBE_CHAT_APP_ID,
      userNumId,
      "Id,Name,FirstName,BirthLocation,DeathLocation,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Gender,Meta",
      options
    );

    if (status == null) {
      throw new Error(`No status returned from getPeople while fetching CC${normalizedNuclear}.`);
    }

    getMore = status.startsWith("Maximum number of profiles");
    if (!getMore && status !== "") {
      throw new Error(`Unexpected getPeople status: ${status}`);
    }

    const pageProfiles = Object.values(people || {}).map((entry) => {
      const profile = { ...entry };
      profile.Degrees = entry?.Meta?.Degrees;
      delete profile.Meta;
      return profile;
    });

    allProfiles.push(...pageProfiles);

    if (!people || pageProfiles.length === 0) {
      getMore = false;
    } else {
      start += limit;
    }
  }

  return allProfiles;
}

async function getCcProfilesForUser(userNumId, nuclear = 7) {
  const normalizedNuclear = normalizeCcNuclear(nuclear, 7);
  const now = Date.now();
  if (
    cc7Cache.rootKey === userNumId &&
    cc7Cache.nuclear === normalizedNuclear &&
    now - cc7Cache.fetchedAt < CC7_CACHE_MS &&
    cc7Cache.profiles.length
  ) {
    return cc7Cache.profiles;
  }

  const profiles = await fetchCcProfilesFromApi(userNumId, normalizedNuclear);
  cc7Cache = {
    rootKey: userNumId,
    nuclear: normalizedNuclear,
    fetchedAt: now,
    profiles,
  };
  return profiles;
}

async function getCc7ProfilesForUser(userNumId) {
  return await getCcProfilesForUser(userNumId, 7);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeDateForSort(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "9999-99-99";
  }
  return normalized;
}

function parseDateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  if (!Number.isFinite(year) || year <= 0) {
    return null;
  }

  let estimated = false;
  if (month === 0) {
    // Year only — use middle of year (July 2)
    month = 7;
    day = 2;
    estimated = true;
  } else if (day === 0) {
    // Year + month only — use middle of month (15th)
    day = 15;
    estimated = true;
  }

  return { year, month, day, estimated };
}

function isPartialDate(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return !!m && (Number(m[2]) === 0 || Number(m[3]) === 0);
}

function computeAgeAtDeathYears(birthDate, deathDate) {
  const birth = parseDateParts(birthDate);
  const death = parseDateParts(deathDate);
  if (!birth || !death || death.year < birth.year) {
    return null;
  }

  // parseDateParts fills in fallback month/day, so we can always do a proper birthday comparison
  let years = death.year - birth.year;
  const diedBeforeBirthday = death.month < birth.month || (death.month === birth.month && death.day < birth.day);
  if (diedBeforeBirthday) {
    years -= 1;
  }

  return years >= 0 ? years : null;
}

function normalizeNumberForSort(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function normalizeKnownDate(value) {
  return value && value !== "0000-00-00" ? value : "";
}

function mapApiPersonToStandardRow(person = {}, options = {}) {
  const wtId = String(options.wtId ?? person.Name ?? "").trim();
  const lnab = person.LastNameAtBirth || "";
  const lastNameCurrent = person.LastNameCurrent || "";
  const surnamePreference = options.surnamePreference === "currentFirst" ? "currentFirst" : "birthFirst";
  const surname = surnamePreference === "currentFirst" ? lastNameCurrent || lnab || "" : lnab || lastNameCurrent || "";

  return {
    displayName: options.displayName || person.RealName || person?.Derived?.ShortName || wtId,
    wtid: wtId,
    firstName: person.FirstName || "",
    lnab,
    lastNameCurrent,
    degrees: options.degrees ?? "",
    gender: person.Gender || "",
    birth: normalizeKnownDate(person.BirthDate),
    death: normalizeKnownDate(person.DeathDate),
    birthLocation: person.BirthLocation || "",
    deathLocation: person.DeathLocation || "",
    surname,
  };
}

function filterCachedKinRows({
  intent,
  rootKey,
  generation,
  includeUpTo,
  locationField = "AnyLocation",
  normalizedLocation = "",
}) {
  if (!lastStructuredResult?.rows?.length) {
    return null;
  }

  const meta = lastStructuredResult._chatMeta;
  if (!meta || meta.intent !== intent) {
    return null;
  }

  if (String(meta.rootKey || "") !== String(rootKey || "")) {
    return null;
  }

  const cachedGeneration = Number(meta.generation);
  if (!Number.isFinite(cachedGeneration) || cachedGeneration < generation) {
    return null;
  }

  const cachedIncludeUpTo = Boolean(meta.includeUpTo);
  if (includeUpTo && !cachedIncludeUpTo) {
    return null;
  }

  // Only trust cache-reuse as a superset when the cached query wasn't location-filtered.
  if (normalizeText(meta.location || "")) {
    return null;
  }

  const totalCandidates = lastStructuredResult.rows.filter((row) => {
    const degree = Number(row?.degrees);
    if (!Number.isFinite(degree)) {
      return true;
    }
    if (includeUpTo) {
      return degree >= 1 && degree <= generation;
    }
    return degree === generation;
  });

  const filteredRows = totalCandidates.filter((row) => {
    if (!normalizedLocation) {
      return true;
    }

    const birthLocation = normalizeText(row?.birthLocation);
    const deathLocation = normalizeText(row?.deathLocation);
    if (locationField === "BirthLocation") {
      return birthLocation.includes(normalizedLocation);
    }
    if (locationField === "DeathLocation") {
      return deathLocation.includes(normalizedLocation);
    }
    return birthLocation.includes(normalizedLocation) || deathLocation.includes(normalizedLocation);
  });

  return {
    rows: filteredRows.map((row) => withDerivedRowFields(row)),
    totalCandidates: totalCandidates.length,
    missingLocationCount: normalizedLocation
      ? totalCandidates.filter((row) => {
          const hasBirth = !!normalizeText(row?.birthLocation);
          const hasDeath = !!normalizeText(row?.deathLocation);
          if (locationField === "BirthLocation") {
            return !hasBirth;
          }
          if (locationField === "DeathLocation") {
            return !hasDeath;
          }
          return !hasBirth && !hasDeath;
        }).length
      : 0,
  };
}

function sortKinRows(rows, includeUpTo) {
  return rows.slice().sort((left, right) => {
    if (includeUpTo) {
      const degreeDelta = normalizeNumberForSort(left.degrees) - normalizeNumberForSort(right.degrees);
      if (degreeDelta !== 0) {
        return degreeDelta;
      }
    }
    return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName));
  });
}

function buildPersonPreviewLine(person) {
  return `- ${person.displayName} (${person.wtid})${person.birth ? ` [b. ${person.birth}]` : ""}${
    person.death ? ` [d. ${person.death}]` : ""
  }`;
}

function buildPeoplePreviewAndInlineMore(rows, previewLimit = 12) {
  const previewRows = rows.slice(0, previewLimit);
  const remainingRows = rows.slice(previewLimit);
  return {
    preview: previewRows.map((person) => buildPersonPreviewLine(person)).join("\n"),
    inlineMore: remainingRows.length
      ? {
          count: remainingRows.length,
          text: remainingRows.map((person) => buildPersonPreviewLine(person)).join("\n"),
        }
      : null,
  };
}

function buildKinListResult({ rows, displayRelationshipLabel, subjectLabel, rootDisplayName, includeUpTo, chatMeta }) {
  const { preview, inlineMore } = buildPeoplePreviewAndInlineMore(rows);
  const table = makeStandardProfileTable(
    `${displayRelationshipLabel} for ${rootDisplayName}`,
    rows,
    includeUpTo ? [[4, "asc"]] : [[1, "asc"]]
  );

  if (chatMeta) {
    table._chatMeta = chatMeta;
  }

  return {
    message: `Here are ${displayRelationshipLabel} for ${subjectLabel} (${rows.length} found):\n${preview}`,
    inlineMore,
    table,
  };
}

function getLocationFieldLabel(locationField) {
  if (locationField === "BirthLocation") {
    return "birth location";
  }
  if (locationField === "DeathLocation") {
    return "death location";
  }
  return "birth or death location";
}

function getRowCountry(row) {
  return (
    row.country || extractCountryFromLocation(row.birthLocation) || extractCountryFromLocation(row.deathLocation) || ""
  );
}

function summarizeStructuredRows(rows, maxToShow = 12) {
  const shown = rows.slice(0, maxToShow).map((row) => {
    const bits = [`${row.displayName || row.wtid || "Unknown"} (${row.wtid || "no-id"})`];
    if (row.degrees !== "" && row.degrees !== undefined) {
      bits.push(`degree ${row.degrees}`);
    }
    if (row.birth) {
      bits.push(`born ${row.birth}`);
    }
    if (row.surname) {
      bits.push(`surname ${row.surname}`);
    }
    if (row.gender) {
      bits.push(row.gender);
    }
    return `- ${bits.join(" | ")}`;
  });
  const extra = rows.length > maxToShow ? `\n...and ${rows.length - maxToShow} more.` : "";
  return `${shown.join("\n")}${extra}`;
}

function compareResultRows(left, right, field, direction) {
  let leftValue;
  let rightValue;

  if (field === "birth" || field === "death") {
    leftValue = normalizeDateForSort(left[field]);
    rightValue = normalizeDateForSort(right[field]);
  } else if (field === "degrees") {
    leftValue = normalizeNumberForSort(left[field]);
    rightValue = normalizeNumberForSort(right[field]);
  } else if (field === "country") {
    leftValue = normalizeText(getRowCountry(left));
    rightValue = normalizeText(getRowCountry(right));
  } else {
    leftValue = normalizeText(left[field]);
    rightValue = normalizeText(right[field]);
  }

  if (leftValue < rightValue) {
    return direction === "desc" ? 1 : -1;
  }
  if (leftValue > rightValue) {
    return direction === "desc" ? -1 : 1;
  }
  return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName));
}

async function tryHandleLastResultOperation(params) {
  if (!params?.action) {
    return null;
  }

  if (!lastStructuredResult?.rows?.length) {
    return "There is no structured result yet. Ask for a search or list first, then refine it.";
  }

  const baseResult = cloneResultWithRows(
    lastStructuredResult,
    lastStructuredResult.title || "Chat Results",
    lastStructuredResult.rows
  );

  if (params.action === "table") {
    openResultsTable(baseResult);
    return {
      message: `Opened the last result set in a table (${baseResult.rows.length} row${
        baseResult.rows.length === 1 ? "" : "s"
      }).`,
    };
  }

  if (params.action === "count") {
    return {
      message: `The current result set has ${baseResult.rows.length} row${baseResult.rows.length === 1 ? "" : "s"}.`,
    };
  }

  if (params.action === "countBy") {
    const buckets = new Map();
    baseResult.rows.forEach((row) => {
      let bucketValue = "Unknown";
      if (params.field === "country") {
        bucketValue = getRowCountry(row) || "Unknown";
      } else {
        bucketValue = row[params.field] || "Unknown";
      }
      buckets.set(bucketValue, (buckets.get(bucketValue) || 0) + 1);
    });

    const groupedRows = Array.from(buckets.entries())
      .map(([value, count]) => ({
        label: value,
        count,
      }))
      .sort(
        (left, right) => right.count - left.count || normalizeText(left.label).localeCompare(normalizeText(right.label))
      );

    const summary = groupedRows
      .slice(0, 12)
      .map((row) => `- ${row.label}: ${row.count}`)
      .join("\n");

    return {
      message: `Grouped the current results by ${params.field}:\n${summary}${
        groupedRows.length > 12 ? `\n...and ${groupedRows.length - 12} more.` : ""
      }`,
      table: {
        title: `${baseResult.title} by ${params.field}`,
        defaultOrder: [[1, "desc"]],
        columns: [
          { title: params.field === "country" ? "Country" : "Value", key: "label" },
          { title: "Count", key: "count" },
        ],
        rows: groupedRows,
      },
    };
  }

  if (params.action === "sort") {
    const sortedRows = [...baseResult.rows].sort((left, right) =>
      compareResultRows(left, right, params.field, params.direction)
    );
    const sortedResult = cloneResultWithRows(baseResult, `${baseResult.title} sorted by ${params.field}`, sortedRows);
    return {
      message: `Sorted the current results by ${params.field} (${params.direction}).\n${summarizeStructuredRows(
        sortedRows
      )}`,
      table: sortedResult,
    };
  }

  if (params.action === "filter") {
    const filteredRows = baseResult.rows.filter((row) => {
      const value = normalizeText(params.filter?.value);
      if (!value) {
        return true;
      }

      if (params.filter.kind === "gender") {
        return normalizeText(row.gender) === normalizeText(params.filter.value);
      }
      if (params.filter.kind === "surname") {
        return normalizeSurname(row.surname) === normalizeSurname(params.filter.value);
      }
      if (params.filter.kind === "birthLocation") {
        return normalizeText(row.birthLocation).includes(value);
      }
      if (params.filter.kind === "deathLocation") {
        return normalizeText(row.deathLocation).includes(value);
      }
      if (params.filter.kind === "country") {
        return normalizeText(getRowCountry(row)).includes(value);
      }

      const haystack = [
        row.displayName,
        row.wtid,
        row.surname,
        row.birthLocation,
        row.deathLocation,
        row.gender,
        getRowCountry(row),
      ]
        .map((part) => normalizeText(part))
        .join(" ");
      return haystack.includes(value);
    });

    if (!filteredRows.length) {
      return `No rows matched that filter in the current result set.`;
    }

    const filteredResult = cloneResultWithRows(baseResult, `${baseResult.title} filtered`, filteredRows);
    return {
      message: `Filtered the current result set down to ${filteredRows.length} row${
        filteredRows.length === 1 ? "" : "s"
      }.\n${summarizeStructuredRows(filteredRows)}`,
      table: filteredResult,
    };
  }

  return null;
}

function getCc7RowsFromPage() {
  return $("table tr[data-wtid]").toArray();
}

function getPersonNameFromRow(row, fallbackWtId) {
  const $row = $(row);
  const $firstProfileLink = $row.find('a[href*="/wiki/"]').first();
  if ($firstProfileLink.length && $firstProfileLink.text().trim()) {
    return $firstProfileLink.text().trim();
  }
  return fallbackWtId;
}

function getBirthLocationFromRow(row) {
  const $row = $(row);
  const $birthCell = $row.find("td.birthLocation").first();
  if ($birthCell.length && $birthCell.text()) {
    return $birthCell.text().trim();
  }

  const dataAttr = $row.attr("data-birth-location-small2big");
  return dataAttr ? dataAttr.trim() : "";
}

async function tryHandleCc7LocationPrompt(parsed, prompt = "") {
  if (!parsed?.location) {
    return null;
  }

  const nuclear = normalizeCcNuclear(parsed?.nuclear, 7);
  const ccLabel = `CC${nuclear}`;

  const subjectRoot = await resolveCc7SubjectRoot(prompt);
  if (subjectRoot?.unresolvedName) {
    return `I couldn't identify which profile you meant by "${subjectRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }
  if (!subjectRoot?.key) {
    return "I could not detect a profile person or your logged-in profile to use as the CC7 starting point.";
  }

  const subjectLabel = formatSubjectLabel(subjectRoot);

  let matches = [];
  let dataSource = "API";

  try {
    const cc7Profiles = await getCcProfilesForUser(subjectRoot.key, nuclear);
    const needle = parsed.location.toLowerCase();
    matches = cc7Profiles
      .filter((profile) => {
        const birth = (profile.BirthLocation || "").toLowerCase();
        const death = (profile.DeathLocation || "").toLowerCase();
        if (parsed.field === "BirthLocation") {
          return birth.includes(needle);
        }
        if (parsed.field === "DeathLocation") {
          return death.includes(needle);
        }
        return birth.includes(needle) || death.includes(needle);
      })
      .map((profile) => ({
        wtid: profile.Name,
        name: profile.RealName || profile?.Derived?.ShortName || profile.Name,
        firstName: profile.FirstName || "",
        lnab: profile.LastNameAtBirth || "",
        lastNameCurrent: profile.LastNameCurrent || "",
        birthLocation: profile.BirthLocation || "",
        deathLocation: profile.DeathLocation || "",
        degrees: profile.Degrees,
        gender: profile.Gender || "",
        surname: profile.LastNameCurrent || profile.LastNameAtBirth || "",
        birth: profile.BirthDate || "",
        death: profile.DeathDate || "",
      }));
  } catch (error) {
    if (nuclear !== 7) {
      return `I could not fetch ${ccLabel} from the API for ${subjectLabel}. Error: ${
        error?.message || "unknown error"
      }`;
    }

    const rows = getCc7RowsFromPage();
    if (!rows.length) {
      return `I could not fetch ${ccLabel} from the API, and no CC7 table is available on this page. Error: ${
        error?.message || "unknown error"
      }`;
    }

    dataSource = "current table view";
    const needle = parsed.location.toLowerCase();
    rows.forEach((row) => {
      const wtid = (row.getAttribute("data-wtid") || "").trim();
      const birthLocation = getBirthLocationFromRow(row);
      if (!birthLocation || !birthLocation.toLowerCase().includes(needle)) {
        if (parsed.field === "BirthLocation") {
          return;
        }

        const deathCell = row.querySelector("td.deathLocation");
        const deathLocation = deathCell?.textContent?.trim() || "";
        if (!deathLocation.toLowerCase().includes(needle)) {
          return;
        }
      }

      matches.push({
        wtid,
        name: getPersonNameFromRow(row, wtid),
        firstName: "",
        lnab: "",
        lastNameCurrent: "",
        birthLocation,
        deathLocation: row.querySelector("td.deathLocation")?.textContent?.trim() || "",
        degrees: "",
        gender: "",
        surname: "",
        birth: "",
        death: "",
      });
    });
  }

  if (parsed.mode === "count") {
    const countFieldLabel =
      parsed.field === "DeathLocation" ? "died in" : parsed.field === "BirthLocation" ? "born in" : "in";
    return {
      message: `I found ${matches.length} ${ccLabel} profile${matches.length === 1 ? "" : "s"} ${countFieldLabel} ${
        parsed.location
      } for ${subjectLabel} (from ${dataSource}).`,
      table: matches.length
        ? makeStandardProfileTable(
            `${ccLabel} profiles in ${parsed.location} for ${subjectRoot.displayName}`,
            matches.map((person) => ({
              displayName: person.name,
              wtid: person.wtid,
              firstName: person.firstName || "",
              lnab: person.lnab || "",
              lastNameCurrent: person.lastNameCurrent || "",
              degrees: person.degrees ?? "",
              gender: person.gender || "",
              birth: person.birth || "",
              death: person.death || "",
              birthLocation: person.birthLocation,
              deathLocation: person.deathLocation,
              surname: person.surname || "",
            }))
          )
        : null,
    };
  }

  if (!matches.length) {
    return `I found no ${ccLabel} profiles in ${parsed.location} for ${subjectLabel} (from ${dataSource}).`;
  }

  const maxToShow = 25;
  const shown = matches.slice(0, maxToShow);
  const lines = shown.map(
    (person) =>
      `- ${person.name} (${person.wtid})${
        person.degrees !== undefined && person.degrees !== "" ? `, degree ${person.degrees}` : ""
      } - ${person.birthLocation}${person.deathLocation ? ` | died: ${person.deathLocation}` : ""}`
  );
  const extra = matches.length > maxToShow ? `\n...and ${matches.length - maxToShow} more.` : "";
  const fieldLabel = parsed.field === "DeathLocation" ? "died in" : parsed.field === "BirthLocation" ? "born in" : "in";

  return {
    message: `Here are the ${ccLabel} profiles ${fieldLabel} ${
      parsed.location
    } for ${subjectLabel} (from ${dataSource}):\n${lines.join("\n")}${extra}`,
    table: makeStandardProfileTable(
      `${ccLabel} profiles ${fieldLabel} ${parsed.location} for ${subjectRoot.displayName}`,
      matches.map((person) => ({
        displayName: person.name,
        wtid: person.wtid,
        firstName: person.firstName || "",
        lnab: person.lnab || "",
        lastNameCurrent: person.lastNameCurrent || "",
        degrees: person.degrees ?? "",
        gender: person.gender || "",
        birth: person.birth || "",
        death: person.death || "",
        birthLocation: person.birthLocation,
        deathLocation: person.deathLocation,
        surname: person.surname || "",
      }))
    ),
  };
}

async function tryHandleCcSummaryPrompt(params, prompt = "") {
  const nuclear = normalizeCcNuclear(params?.nuclear, 7);
  const ccLabel = `CC${nuclear}`;

  const subjectRoot = await resolveCc7SubjectRoot(prompt);
  if (subjectRoot?.unresolvedName) {
    return `I couldn't identify which profile you meant by "${subjectRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }
  if (!subjectRoot?.key) {
    return "I could not detect a profile person or your logged-in profile to use as the CC starting point.";
  }

  const subjectLabel = formatSubjectLabel(subjectRoot);

  try {
    const profiles = await getCcProfilesForUser(subjectRoot.key, nuclear);
    if (!profiles.length) {
      return `I found no profiles in ${ccLabel} for ${subjectLabel}.`;
    }

    const rows = profiles
      .map((profile) =>
        mapApiPersonToStandardRow(profile, {
          degrees: Number(profile.Degrees ?? Number.MAX_SAFE_INTEGER),
          surnamePreference: "currentFirst",
        })
      )
      .sort(
        (left, right) =>
          left.degrees - right.degrees ||
          normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
      );

    const preview = rows
      .slice(0, 15)
      .map((person) => `- ${person.displayName} (${person.wtid}), degree ${person.degrees}`)
      .join("\n");
    const extra = rows.length > 15 ? `\n...and ${rows.length - 15} more.` : "";

    return {
      message: `${subjectLabel === "you" ? "Your" : `${subjectLabel}'s`} ${ccLabel} includes ${rows.length} profile${
        rows.length === 1 ? "" : "s"
      }.\n${preview}${extra}`,
      table: makeStandardProfileTable(`${ccLabel} for ${subjectRoot.displayName}`, rows, [[4, "asc"]]),
    };
  } catch (error) {
    return `I couldn't fetch ${ccLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
  }
}

async function tryHandleProfileSearchPrompt(params) {
  const query = params?.query?.trim();
  if (!query) {
    return null;
  }

  try {
    const lookup = await wtAPIProfileSearch("Chat", encodeURIComponent(query), { maxProfiles: 40 });
    const profileIds = (lookup?.response?.profiles || []).slice(0, 20);
    if (!profileIds.length) {
      return `I couldn't find profile matches for \"${query}\".`;
    }

    const [, , people] = await fetchPeoplePaged(
      WBE_CHAT_APP_ID,
      profileIds,
      "Id,Name,FirstName,RealName,Derived.ShortName,BirthDate,DeathDate,BirthLocation,DeathLocation,LastNameAtBirth,LastNameCurrent,Gender",
      {}
    );

    const matchedPeople = Object.values(people || {});
    const mappedRows = matchedPeople.map((person) =>
      mapApiPersonToStandardRow(person, {
        surnamePreference: "birthFirst",
      })
    );
    const rows = mappedRows.slice(0, 10).map((person) => {
      const birth = person.birth || "?";
      const death = person.death || "?";
      return `- ${person.displayName} (${person.wtid}) [${birth} - ${death}]`;
    });

    const extra = profileIds.length > 10 ? `\n...and ${profileIds.length - 10} more.` : "";
    return {
      message: `Here are profile matches for \"${query}\":\n${rows.join("\n")}${extra}`,
      table: makeStandardProfileTable(`Profile search: ${query}`, mappedRows, [[0, "asc"]]),
    };
  } catch (error) {
    return `I couldn't complete that search for \"${query}\". Error: ${error?.message || "unknown error"}`;
  }
}

async function tryHandleWatchlistPrompt(params = {}) {
  const hasExplicitLimit =
    params && params.limit !== undefined && params.limit !== null && String(params.limit).trim() !== "";
  const requestedLimitRaw = hasExplicitLimit ? Number(params.limit) : NaN;
  const requestedLimit =
    hasExplicitLimit && Number.isFinite(requestedLimitRaw)
      ? Math.max(1, Math.min(50000, Math.trunc(requestedLimitRaw)))
      : null;
  const pageSize = 1000;
  const maxRowsToFetch = requestedLimit ?? 50000;

  try {
    const allEntries = [];
    let offset = 0;
    let watchlistCount = null;

    while (allEntries.length < maxRowsToFetch) {
      const pageLimit = Math.min(pageSize, maxRowsToFetch - allEntries.length);
      const [watchlist, totalCount, status] = await WikiTreeAPI.getWatchlist(
        WBE_CHAT_APP_ID,
        "Id,Name,FirstName,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
        {
          limit: pageLimit,
          offset,
          getPerson: 1,
          getSpace: 0,
          order: "page_touched",
        }
      );

      if (status && status !== 0 && status !== "") {
        return `I couldn't load your watchlist. API status: ${status}`;
      }

      const pageEntries = Array.isArray(watchlist) ? watchlist : [];
      if (watchlistCount == null && Number.isFinite(Number(totalCount))) {
        watchlistCount = Number(totalCount);
      }

      if (!pageEntries.length) {
        break;
      }

      allEntries.push(...pageEntries);
      offset += pageEntries.length;

      if (watchlistCount != null && offset >= watchlistCount) {
        break;
      }
      if (pageEntries.length < pageLimit) {
        break;
      }
    }

    const entries = allEntries;
    if (!entries.length) {
      return "I couldn't find any person profiles on your watchlist. If you're not logged in, please sign in and try again.";
    }

    const rows = entries
      .map((entry) => {
        const profile = entry?.profile || entry?.person || entry || {};
        const wtId = String(profile.Name || profile.name || "").trim();
        if (!wtId) {
          return null;
        }

        return mapApiPersonToStandardRow(profile, {
          wtid: wtId,
          displayName: profile.RealName || profile?.Derived?.ShortName || wtId,
          surnamePreference: "currentFirst",
        });
      })
      .filter(Boolean);

    if (!rows.length) {
      return "I found watchlist entries, but none had usable profile identifiers to display.";
    }

    const knownTotal = Number.isFinite(Number(watchlistCount)) ? Number(watchlistCount) : rows.length;
    const previewRows = rows.slice(0, 12);
    const remainingRows = rows.slice(12);
    const preview = previewRows.map((person) => `- ${person.displayName} (${person.wtid})`).join("\n");
    const inlineMore = remainingRows.length
      ? {
          count: remainingRows.length,
          text: remainingRows.map((person) => `- ${person.displayName} (${person.wtid})`).join("\n"),
        }
      : null;

    const limitNote =
      requestedLimit != null && rows.length < knownTotal
        ? ` Showing first ${rows.length} as requested.`
        : requestedLimit == null && rows.length < knownTotal
        ? ` Loaded ${rows.length} of ${knownTotal}.`
        : "";

    return {
      message: `Here ${rows.length === 1 ? "is" : "are"} ${rows.length} profile${
        rows.length === 1 ? "" : "s"
      } from your watchlist (${knownTotal} total).${limitNote}\n${preview}`,
      inlineMore,
      table: makeWatchlistTable("Your watchlist", rows, [[0, "asc"]]),
    };
  } catch (error) {
    return `I couldn't load your watchlist. Error: ${error?.message || "unknown error"}`;
  }
}

function normalizeSurname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+family$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProfileRootPerson() {
  const person = getProfilePersonInfo();
  if (!person?.Name) {
    return null;
  }

  return {
    key: person.Id || person.Name,
    wtId: person.Name,
    displayName: person.FullName || person.Name,
  };
}

function promptRefersToUser(prompt) {
  return /\b(my|me|mine|myself)\b/i.test(String(prompt || ""));
}

function extractNamedSubjectForCc7Prompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized || promptRefersToUser(normalized)) {
    return "";
  }

  const possessiveMatch = normalized.match(/(.+?)'s\s+cc7\b/i);
  if (possessiveMatch?.[1]) {
    return possessiveMatch[1].trim();
  }

  const forMatch = normalized.match(/\bcc7\s+(?:for|of)\s+(.+?)(?:\s+(?:were|was|are|is|born|died|in|count)|\??$)/i);
  if (forMatch?.[1]) {
    const candidate = forMatch[1]
      .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\b/i, "")
      .trim();
    return candidate;
  }

  return "";
}

function extractConnectionSourceName(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized || promptRefersToUser(normalized)) {
    return "";
  }

  const fromMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+(.+?)\s+to\s+.+?\??$/i
  );
  if (fromMatch?.[1]) {
    const source = fromMatch[1]
      .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\b/i, "")
      .trim();
    return source;
  }

  const betweenMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+(.+?)\s+and\s+.+?\??$/i
  );
  if (betweenMatch?.[1]) {
    const source = betweenMatch[1]
      .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\b/i, "")
      .trim();
    return source;
  }

  return "";
}

async function getLoggedInRootPerson() {
  const userWtId = getUserWtId();
  const userNumId = getUserNumId();
  if (!userWtId && !userNumId) {
    return null;
  }

  let me = null;
  try {
    me = await WikiTreeAPI.getPerson("Chat", userWtId || userNumId, "Id,Name,RealName,Derived.ShortName");
  } catch (error) {
    me = null;
  }

  if (!me?.Name && userNumId) {
    try {
      me = await WikiTreeAPI.getPerson("Chat", userNumId, "Id,Name,RealName,Derived.ShortName");
    } catch (error) {
      me = null;
    }
  }

  if (!me?.Name && !userWtId) {
    return null;
  }

  return {
    key: me?.Id || me?.Name || userWtId || userNumId,
    wtId: me?.Name || userWtId || "",
    displayName: me?.RealName || me?.Derived?.ShortName || me?.Name || userWtId || String(userNumId || ""),
    subjectType: "user",
  };
}

function getProfileSubjectRoot() {
  const profileRoot = getProfileRootPerson();
  if (!profileRoot) {
    return null;
  }

  return {
    ...profileRoot,
    subjectType: "profile",
  };
}

async function resolveCc7SubjectRoot(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (promptRefersToUser(normalizedPrompt)) {
    let root = await getLoggedInRootPerson();
    if (!root) {
      await pause(150);
      root = await getLoggedInRootPerson();
    }
    return root;
  }

  const named = extractNamedSubjectForCc7Prompt(normalizedPrompt);
  if (named) {
    const resolved = await resolveConnectionTargetPerson(named, normalizedPrompt);
    if (!resolved?.Name && !resolved?.Id) {
      return { unresolvedName: named };
    }

    return {
      key: resolved.Id || resolved.Name,
      wtId: resolved.Name,
      displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
      subjectType: "named",
    };
  }

  return getProfileSubjectRoot() || (await getLoggedInRootPerson());
}

async function resolveConnectionSourceRoot(prompt, targetWtId = "") {
  const normalizedPrompt = String(prompt || "").trim();
  if (promptRefersToUser(normalizedPrompt)) {
    let root = await getLoggedInRootPerson();
    if (!root) {
      await pause(150);
      root = await getLoggedInRootPerson();
    }
    return root || getProfileSubjectRoot();
  }

  const namedSource = extractConnectionSourceName(normalizedPrompt);
  if (namedSource) {
    const resolved = await resolveConnectionTargetPerson(namedSource, normalizedPrompt);
    if (!resolved?.Name && !resolved?.Id) {
      return { unresolvedName: namedSource };
    }

    const sourceWtId = resolved.Name || "";
    if (sourceWtId && targetWtId && sourceWtId === targetWtId) {
      return { unresolvedName: namedSource };
    }

    return {
      key: resolved.Id || resolved.Name,
      wtId: sourceWtId,
      displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
      subjectType: "named",
    };
  }

  return getProfileSubjectRoot() || (await getLoggedInRootPerson());
}

function extractNamedSubjectForAncestorPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return "";
  }

  const relationPattern =
    "(?:\\d+(?:st|nd|rd|th)?\\s+(?:g(?:reat)?\\s*)?g(?:rand)?\\s*-?\\s*parents?|\\d+\\s*x\\s*(?:g(?:reat)?\\s*)?g(?:rand)?\\s*-?\\s*parents?|\\d+\\s*x\\s*great\\s*-?\\s*grand\\s*-?\\s*parents?|\\d+\\s+generations?\\s+(?:of\\s+)?ancestors?|great\\s*-?\\s*grand\\s*-?\\s*parents?|grand\\s*-?\\s*parents?|ancestors?)";

  // Try "for X pattern" first: "list my grandparents for Queen Elizabeth II"
  const forMatch = normalized.match(new RegExp(`\\bfor\\s+(.+?)\\s+${relationPattern}\\??$`, "i"));
  if (forMatch?.[1]) {
    return String(forMatch[1] || "")
      .trim()
      .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
      .replace(/'s$/i, "")
      .trim();
  }

  // Try possessive pattern: "Queen Elizabeth II's 4th great grandparents?" or "QE2's 4th great grandparents?"
  const possessiveMatch = normalized.match(new RegExp(`^\\s*(.+?)'s\\s+${relationPattern}\\??$`, "i"));
  if (possessiveMatch?.[1]) {
    return String(possessiveMatch[1] || "")
      .trim()
      .replace(/^\d+\s+generations?\s+of\s+/i, "")
      .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
      .trim();
  }

  const genericOfMatch = normalized.match(
    /^(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?ancestors?\s+(?:of|for)\s+(.+?)\??$/i
  );
  if (genericOfMatch?.[1]) {
    return String(genericOfMatch[1] || "")
      .trim()
      .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\s*/i, "")
      .replace(/'s$/i, "")
      .trim();
  }

  return "";
}

function extractNamedSubjectForDescendantPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return "";
  }

  const relationPattern =
    "(?:\\d+\\s+generations?\\s+(?:of\\s+)?descendants?|\\d+(?:st|nd|rd|th)?\\s+great\\s*-?\\s*grand\\s*-?\\s*children?|\\d+\\s*x\\s*great\\s*-?\\s*grand\\s*-?\\s*children?|great\\s*-?\\s*grand\\s*-?\\s*children?|grand\\s*-?\\s*children?|children?|descendants?)";

  const forMatch = normalized.match(new RegExp(`\\bfor\\s+(.+?)\\s+${relationPattern}\\??$`, "i"));
  if (forMatch?.[1]) {
    return String(forMatch[1] || "")
      .trim()
      .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
      .replace(/'s$/i, "")
      .trim();
  }

  const possessiveMatch = normalized.match(new RegExp(`^\\s*(.+?)'s\\s+${relationPattern}\\??$`, "i"));
  if (possessiveMatch?.[1]) {
    return String(possessiveMatch[1] || "")
      .trim()
      .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
      .trim();
  }

  const genericOfMatch = normalized.match(
    /^(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:descendants?|children?|grand\s*-?\s*children?|great\s*-?\s*grand\s*-?\s*children?)\s+(?:of|for)\s+(.+?)\??$/i
  );
  if (genericOfMatch?.[1]) {
    return String(genericOfMatch[1] || "")
      .trim()
      .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\s*/i, "")
      .replace(/'s$/i, "")
      .trim();
  }

  return "";
}

async function resolveAncestorSubjectRoot(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  const asksForUser = /\b(my|me|mine|myself)\b/i.test(normalizedPrompt);
  const asksForProfile = /\b(profile\s+person|current\s+profile|this\s+profile)\b/i.test(normalizedPrompt);

  if (asksForUser) {
    const userRoot = await getLoggedInRootPerson();
    if (!userRoot) {
      return null;
    }
    return userRoot;
  }

  const namedSubject = extractNamedSubjectForAncestorPrompt(normalizedPrompt);
  if (namedSubject) {
    const resolved = await resolveConnectionTargetPerson(namedSubject, normalizedPrompt);
    if (!resolved?.Name && !resolved?.Id) {
      return {
        unresolvedName: namedSubject,
      };
    }

    return {
      key: resolved.Id || resolved.Name,
      wtId: resolved.Name,
      displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
      subjectType: "named",
    };
  }

  if (asksForProfile) {
    const profileRoot = getProfileSubjectRoot();
    if (profileRoot) {
      return profileRoot;
    }
  }

  const profileRoot = getProfileSubjectRoot();
  if (profileRoot) {
    return profileRoot;
  }

  const userRoot = await getLoggedInRootPerson();
  if (!userRoot) {
    return null;
  }

  return userRoot;
}

async function resolveDescendantSubjectRoot(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  const asksForUser = /\b(my|me|mine|myself)\b/i.test(normalizedPrompt);
  const asksForProfile = /\b(profile\s+person|current\s+profile|this\s+profile)\b/i.test(normalizedPrompt);

  if (asksForUser) {
    const userRoot = await getLoggedInRootPerson();
    if (!userRoot) {
      return null;
    }
    return userRoot;
  }

  const namedSubject = extractNamedSubjectForDescendantPrompt(normalizedPrompt);
  if (namedSubject) {
    const resolved = await resolveConnectionTargetPerson(namedSubject, normalizedPrompt);
    if (!resolved?.Name && !resolved?.Id) {
      return {
        unresolvedName: namedSubject,
      };
    }

    return {
      key: resolved.Id || resolved.Name,
      wtId: resolved.Name,
      displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
      subjectType: "named",
    };
  }

  if (asksForProfile) {
    const profileRoot = getProfileSubjectRoot();
    if (profileRoot) {
      return profileRoot;
    }
  }

  const profileRoot = getProfileSubjectRoot();
  if (profileRoot) {
    return profileRoot;
  }

  const userRoot = await getLoggedInRootPerson();
  if (!userRoot) {
    return null;
  }

  return userRoot;
}

async function tryHandleSpouseListPrompt(params, prompt = "") {
  const genderFilter = params?.gender || null;
  const relationshipLabel = String(params?.relationshipLabel || "spouses").trim();
  const targetName = String(params?.target || "").trim();

  if (!targetName) {
    return null;
  }

  const rootPerson = await resolveConnectionTargetPerson(targetName, prompt);
  if (!rootPerson?.Name && !rootPerson?.Id) {
    return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }

  const personKey = rootPerson.Id || rootPerson.Name;
  const personLabel = `${rootPerson.RealName || rootPerson?.Derived?.ShortName || rootPerson.Name} (${
    rootPerson.Name
  })`;

  try {
    // Use getRelatives to get actual spouse relationships
    const result = await WikiTreeAPI.getRelatives(
      WBE_CHAT_APP_ID,
      personKey,
      "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
      { getSpouses: 1 }
    );
    const [peopleResult] = result;
    console.debug("wbe: tryHandleSpouseListPrompt getRelatives result", { personKey, peopleResult });

    if (!peopleResult?.person) {
      return `No spouse data available for ${personLabel}.`;
    }

    const rootProfile = peopleResult.person;
    console.debug("wbe: tryHandleSpouseListPrompt rootProfile keys", Object.keys(rootProfile || {}));
    const spousesData = Object.values(rootProfile.Spouses || {});
    console.debug("wbe: tryHandleSpouseListPrompt spousesData length", spousesData.length);

    if (!spousesData.length) {
      return `No spouses found for ${personLabel}.`;
    }

    let spouses = spousesData
      .map((spouse) => ({
        displayName: spouse.RealName || spouse?.Derived?.ShortName || spouse.Name,
        wtid: spouse.Name,
        firstName: spouse.FirstName || "",
        lnab: spouse.LastNameAtBirth || "",
        lastNameCurrent: spouse.LastNameCurrent || "",
        gender: spouse.Gender || "",
        birth: spouse.BirthDate && spouse.BirthDate !== "0000-00-00" ? spouse.BirthDate : "",
        death: spouse.DeathDate && spouse.DeathDate !== "0000-00-00" ? spouse.DeathDate : "",
        birthLocation: spouse.BirthLocation || "",
        deathLocation: spouse.DeathLocation || "",
        surname: spouse.LastNameAtBirth || spouse.LastNameCurrent || "",
      }))
      .sort((left, right) => normalizeText(left.displayName).localeCompare(normalizeText(right.displayName)));

    // Apply gender filter if specified
    if (genderFilter) {
      spouses = spouses.filter((s) => {
        const gender = String(s.gender || "")
          .trim()
          .toLowerCase();
        if (genderFilter === "Female") {
          return gender === "female" || gender === "f" || gender === "woman";
        } else if (genderFilter === "Male") {
          return gender === "male" || gender === "m" || gender === "man";
        }
        return true;
      });
    }

    if (!spouses.length) {
      return `No ${relationshipLabel} found for ${personLabel}.`;
    }

    const preview = spouses
      .slice(0, 12)
      .map(
        (person) =>
          `- ${person.displayName} (${person.wtid})${person.birth ? ` [b. ${person.birth}]` : ""}${
            person.death ? ` [d. ${person.death}]` : ""
          }`
      )
      .join("\n");
    const extra = spouses.length > 12 ? `\n...and ${spouses.length - 12} more.` : "";

    return {
      message: `Here are ${relationshipLabel} for ${personLabel} (${spouses.length} found):\n${preview}${extra}`,
      table: makeStandardProfileTable(`${relationshipLabel} for ${rootProfile.Name}`, spouses, [[1, "asc"]]),
    };
  } catch (error) {
    return `I couldn't list ${relationshipLabel} for ${personLabel}. Error: ${error?.message || "unknown error"}`;
  }
}

function shouldOfferDisambiguation(rankedMatches) {
  if (!Array.isArray(rankedMatches) || rankedMatches.length < 2) return false;
  const top = rankedMatches[0];
  const second = rankedMatches[1];
  if (!top?.match || !second?.match) return false;
  const topScore = top.score || 0;
  const secondScore = second.score || 0;
  // Offer disambiguation when second candidate is plausible and gap is small
  return secondScore >= 60 && topScore - secondScore < 80;
}

function buildDisambiguationMessage(candidates, targetName) {
  const lines = candidates.slice(0, 8).map((c, i) => {
    const wtId = c.Name || "";
    const displayName = c.RealName || c?.Derived?.ShortName || wtId;
    const birthYear = extractYearFromDate(c.BirthDate);
    const deathYear = extractYearFromDate(c.DeathDate);
    const loc = c.BirthLocation ? ` in ${c.BirthLocation}` : "";
    const dateParts = [
      Number.isFinite(birthYear) ? `b. ${birthYear}${loc}` : loc ? `b. ?${loc}` : "",
      Number.isFinite(deathYear) ? `d. ${deathYear}` : "",
    ].filter(Boolean);
    const dates = dateParts.length ? ` (${dateParts.join(", ")})` : "";
    const label = displayName !== wtId ? `${wtId} — ${displayName}` : wtId;
    return `  ${i + 1}. ${label}${dates}`;
  });
  return [
    `I found several people named "${targetName}". Which one did you mean?\n`,
    ...lines,
    `\nReply with a number (1, 2, 3…) or paste a WikiTree ID.`,
  ].join("\n");
}

function resolveDisambiguationReply(rawPrompt, candidates) {
  const text = String(rawPrompt || "").trim();
  // Plain number: "2"
  const numMatch = text.match(/^(\d+)(?:st|nd|rd|th)?\s*(?:one)?$/i);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < candidates.length) return candidates[idx];
  }
  // Ordinal words: "the second one", "first"
  const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
  for (let i = 0; i < ordinals.length; i++) {
    if (new RegExp(`\\b${ordinals[i]}\\b`, "i").test(text)) {
      return candidates[i] || null;
    }
  }
  // Explicit WikiTree ID: "Beacall-389"
  if (isWikiTreeId(text)) {
    const exact = candidates.find((c) => c.Name === text);
    return exact || { Name: text };
  }
  return null;
}

async function tryHandlePersonAgeAtDeathPrompt(params, prompt = "") {
  const targetName = String(params?.target || "").trim();
  if (!targetName) {
    return null;
  }

  let person = params?._resolvedPerson || null;
  if (!person) {
    person = await resolveConnectionTargetPerson(targetName, prompt, { allowDisambiguation: true });
  }
  if (person?._disambiguationNeeded) {
    pendingDisambiguationContext = {
      intent: ChatIntent.PERSON_AGE_AT_DEATH,
      params,
      prompt,
      candidates: person._candidates,
    };
    return buildDisambiguationMessage(person._candidates, targetName);
  }
  if (!person?.Name && !person?.Id) {
    return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }

  const displayName = person.RealName || person?.Derived?.ShortName || person.Name;
  const wtId = person.Name || "";
  const birthDate = person.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate : "";
  const deathDate = person.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate : "";

  if (!birthDate || !deathDate) {
    return `I found ${displayName} (${wtId}), but I need both birth and death dates to calculate age at death.`;
  }

  const ageAtDeath = computeAgeAtDeathYears(birthDate, deathDate);
  if (!Number.isFinite(ageAtDeath)) {
    return `I found ${displayName} (${wtId}), but the available dates are not precise enough to calculate age at death.`;
  }

  const approximate = isPartialDate(birthDate) || isPartialDate(deathDate);
  const pronoun = person.Gender === "Female" ? "she" : person.Gender === "Male" ? "he" : "they";
  const ageStr = approximate ? `approximately ${ageAtDeath}` : String(ageAtDeath);
  return `${displayName} (${wtId}) was ${ageStr} years old when ${pronoun} died.`;
}

async function tryHandleAncestorAverageAgePrompt(params, prompt = "") {
  const generation = Number(params?.generation);
  if (!Number.isFinite(generation) || generation < 1) {
    return null;
  }

  const relationshipLabel = String(params?.relationshipLabel || `${generation} generations back`).trim();
  const rootPerson = await resolveAncestorSubjectRoot(prompt);
  if (rootPerson?.unresolvedName) {
    return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }
  if (!rootPerson) {
    return "I could not detect a profile person or your logged-in profile to use as the starting point.";
  }

  const subjectLabel = formatSubjectLabel(rootPerson);

  try {
    const [, , people] = await fetchPeoplePaged(
      WBE_CHAT_APP_ID,
      rootPerson.key,
      "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,BirthDate,DeathDate,Meta",
      { ancestors: generation, minGeneration: generation, limit: 1000 }
    );

    const candidates = Object.values(people || {})
      .filter((profile) => {
        const degree = Number(profile?.Meta?.Degrees);
        return !Number.isFinite(degree) || degree === generation;
      })
      .map((profile) => {
        const birth = profile.BirthDate && profile.BirthDate !== "0000-00-00" ? profile.BirthDate : "";
        const death = profile.DeathDate && profile.DeathDate !== "0000-00-00" ? profile.DeathDate : "";
        return {
          displayName: profile.RealName || profile?.Derived?.ShortName || profile.Name,
          wtid: profile.Name,
          lnab: profile.LastNameAtBirth || "",
          birth,
          death,
          ageAtDeath: computeAgeAtDeathYears(birth, death),
        };
      });

    if (!candidates.length) {
      return `I found no ancestors for ${relationshipLabel} from ${subjectLabel}.`;
    }

    const withAges = candidates.filter((row) => Number.isFinite(row.ageAtDeath));
    if (!withAges.length) {
      return `I found ${candidates.length} ${relationshipLabel} profile${
        candidates.length === 1 ? "" : "s"
      } from ${subjectLabel}, but none had both usable birth and death dates.`;
    }

    const totalAge = withAges.reduce((sum, row) => sum + row.ageAtDeath, 0);
    const averageAge = totalAge / withAges.length;
    const roundedAverage = Math.round(averageAge * 10) / 10;

    const tableRows = withAges
      .slice()
      .sort(
        (left, right) =>
          right.ageAtDeath - left.ageAtDeath ||
          normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
      );

    return {
      message: `Average age at death for ${relationshipLabel} of ${subjectLabel} is ${roundedAverage} years (from ${withAges.length} of ${candidates.length} profiles with complete dates).`,
      table: makeAncestorAgeTable(`${relationshipLabel} age at death`, tableRows),
    };
  } catch (error) {
    return `I couldn't calculate average age at death for ${relationshipLabel}. Error: ${
      error?.message || "unknown error"
    }`;
  }
}

async function tryHandleAncestorListPrompt(params, prompt = "") {
  const generation = Number(params?.generation);
  if (!Number.isFinite(generation) || generation < 1) {
    return null;
  }

  const normalizedPrompt = String(prompt || "").toLowerCase();
  const location = String(params?.location || "").trim();
  const locationField = String(params?.locationField || "").trim() || "AnyLocation";
  const normalizedLocation = normalizeText(location);
  const usedDefaultGeneration = Boolean(params?.defaultGeneration);
  const includeUpTo = Boolean(params?.includeUpTo) || /\b\d+\s+generations?\b.*\bancestors?\b/i.test(normalizedPrompt);
  const relationshipLabel = usedDefaultGeneration
    ? "ancestors"
    : includeUpTo
    ? `${generation} generations of ancestors`
    : String(params?.relationshipLabel || `${generation} generations back`).trim();
  const baseDisplayRelationshipLabel = usedDefaultGeneration
    ? `ancestors within ${generation} generations`
    : relationshipLabel;
  const locationPhrase = location
    ? locationField === "BirthLocation"
      ? `born in ${location}`
      : locationField === "DeathLocation"
      ? `died in ${location}`
      : `in ${location}`
    : "";
  const displayRelationshipLabel = locationPhrase
    ? `${baseDisplayRelationshipLabel} ${locationPhrase}`
    : baseDisplayRelationshipLabel;
  const rootPerson = await resolveAncestorSubjectRoot(prompt);
  if (rootPerson?.unresolvedName) {
    return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }
  if (!rootPerson) {
    return "I could not detect a profile person or your logged-in profile to use as the starting point.";
  }

  const subjectLabel = formatSubjectLabel(rootPerson);

  const cachedAncestorRows = filterCachedKinRows({
    intent: ChatIntent.ANCESTOR_LIST,
    rootKey: rootPerson.key,
    generation,
    includeUpTo,
    locationField,
    normalizedLocation,
  });

  if (cachedAncestorRows) {
    const ancestors = sortKinRows(cachedAncestorRows.rows, includeUpTo);

    if (!ancestors.length) {
      if (normalizedLocation && cachedAncestorRows.totalCandidates) {
        return `I searched ${
          cachedAncestorRows.totalCandidates
        } ${baseDisplayRelationshipLabel} for ${subjectLabel} from previously loaded data, but none matched ${locationPhrase}. ${
          cachedAncestorRows.missingLocationCount
        } had no ${getLocationFieldLabel(locationField)} in that data.`;
      }
      return `I found no ${displayRelationshipLabel} for ${subjectLabel} in previously loaded data.`;
    }

    return buildKinListResult({
      rows: ancestors,
      displayRelationshipLabel,
      subjectLabel,
      rootDisplayName: rootPerson.displayName,
      includeUpTo,
      chatMeta: {
        intent: ChatIntent.ANCESTOR_LIST,
        rootKey: String(rootPerson.key || ""),
        generation,
        includeUpTo,
        location: location || "",
        locationField,
      },
    });
  }

  try {
    const collectedPeople = {};
    const [, , peopleMap] = await fetchPeoplePaged(
      WBE_CHAT_APP_ID,
      rootPerson.key,
      "Id,Name,FirstName,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,Meta",
      { ancestors: generation, minGeneration: includeUpTo ? 1 : generation, limit: 1000 }
    );

    Object.values(peopleMap || {}).forEach((profile) => {
      if (profile?.Id != null) collectedPeople[String(profile.Id)] = profile;
    });

    const allAncestors = Object.values(collectedPeople)
      .filter((profile) => {
        const degree = Number(profile?.Meta?.Degrees);
        if (!Number.isFinite(degree)) {
          return true;
        }
        if (includeUpTo) {
          return degree >= 1 && degree <= generation;
        }
        return degree === generation;
      })
      .map((profile) =>
        mapApiPersonToStandardRow(profile, {
          degrees: Number.isFinite(Number(profile?.Meta?.Degrees)) ? Number(profile.Meta.Degrees) : "",
          surnamePreference: "birthFirst",
        })
      );

    const ancestors = allAncestors.filter((profile) => {
      if (!normalizedLocation) {
        return true;
      }

      const birthLocation = normalizeText(profile.birthLocation);
      const deathLocation = normalizeText(profile.deathLocation);
      if (locationField === "BirthLocation") {
        return birthLocation.includes(normalizedLocation);
      }
      if (locationField === "DeathLocation") {
        return deathLocation.includes(normalizedLocation);
      }
      return birthLocation.includes(normalizedLocation) || deathLocation.includes(normalizedLocation);
    });
    const sortedAncestors = sortKinRows(ancestors, includeUpTo);

    if (!sortedAncestors.length) {
      if (normalizedLocation && allAncestors.length) {
        const missingBirthLocationCount = allAncestors.filter((person) => !normalizeText(person.birthLocation)).length;
        const missingDeathLocationCount = allAncestors.filter((person) => !normalizeText(person.deathLocation)).length;
        const missingLocationCount =
          locationField === "BirthLocation"
            ? missingBirthLocationCount
            : locationField === "DeathLocation"
            ? missingDeathLocationCount
            : allAncestors.filter(
                (person) => !normalizeText(person.birthLocation) && !normalizeText(person.deathLocation)
              ).length;

        return `I searched ${
          allAncestors.length
        } ${baseDisplayRelationshipLabel} for ${subjectLabel}, but none matched ${locationPhrase}. ${missingLocationCount} had no ${getLocationFieldLabel(
          locationField
        )} in accessible API data.`;
      }

      return `I found no ${displayRelationshipLabel} for ${subjectLabel} in accessible API data.`;
    }

    return buildKinListResult({
      rows: sortedAncestors,
      displayRelationshipLabel,
      subjectLabel,
      rootDisplayName: rootPerson.displayName,
      includeUpTo,
      chatMeta: {
        intent: ChatIntent.ANCESTOR_LIST,
        rootKey: String(rootPerson.key || ""),
        generation,
        includeUpTo,
        location: location || "",
        locationField,
      },
    });
  } catch (error) {
    return `I couldn't list ${relationshipLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
  }
}

async function tryHandleDescendantListPrompt(params, prompt = "") {
  const generation = Number(params?.generation);
  if (!Number.isFinite(generation) || generation < 1) {
    return null;
  }

  const normalizedPrompt = String(prompt || "").toLowerCase();
  const usedDefaultGeneration = Boolean(params?.defaultGeneration);
  const includeUpTo =
    Boolean(params?.includeUpTo) || /\b\d+\s+generations?\b.*\bdescendants?\b/i.test(normalizedPrompt);
  const relationshipLabel = usedDefaultGeneration
    ? "descendants"
    : includeUpTo
    ? `${generation} generations of descendants`
    : String(params?.relationshipLabel || `${generation} generations down`).trim();
  const displayRelationshipLabel = usedDefaultGeneration
    ? `descendants within ${generation} generations`
    : relationshipLabel;
  const rootPerson = await resolveDescendantSubjectRoot(prompt);
  if (rootPerson?.unresolvedName) {
    return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
  }
  if (!rootPerson) {
    return "I could not detect a profile person or your logged-in profile to use as the starting point.";
  }

  const subjectLabel = formatSubjectLabel(rootPerson);

  const cachedDescendantRows = filterCachedKinRows({
    intent: ChatIntent.DESCENDANT_LIST,
    rootKey: rootPerson.key,
    generation,
    includeUpTo,
  });

  if (cachedDescendantRows) {
    const descendants = sortKinRows(cachedDescendantRows.rows, includeUpTo);
    if (!descendants.length) {
      return `I found no ${displayRelationshipLabel} for ${subjectLabel} in previously loaded data.`;
    }

    return buildKinListResult({
      rows: descendants,
      displayRelationshipLabel,
      subjectLabel,
      rootDisplayName: rootPerson.displayName,
      includeUpTo,
      chatMeta: {
        intent: ChatIntent.DESCENDANT_LIST,
        rootKey: String(rootPerson.key || ""),
        generation,
        includeUpTo,
        location: "",
        locationField: "AnyLocation",
      },
    });
  }

  try {
    const collectedPeople = {};
    const [, , peopleMap] = await fetchPeoplePaged(
      WBE_CHAT_APP_ID,
      rootPerson.key,
      "Id,Name,FirstName,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,Meta",
      { descendants: generation, minGeneration: includeUpTo ? 1 : generation, limit: 1000 }
    );

    Object.values(peopleMap || {}).forEach((profile) => {
      const profileId = String(profile?.Id ?? "");
      const profileWtId = String(profile?.Name || "");
      if (
        profile?.Id != null &&
        profileId !== String(rootPerson.key) &&
        profileWtId !== String(rootPerson.wtId || "")
      ) {
        collectedPeople[profileId] = profile;
      }
    });

    const descendants = Object.values(collectedPeople)
      .filter((profile) => {
        const degree = Number(profile?.Meta?.Degrees);
        if (!Number.isFinite(degree)) {
          return true;
        }
        if (includeUpTo) {
          return degree >= 1 && degree <= generation;
        }
        return degree === generation;
      })
      .map((profile) =>
        mapApiPersonToStandardRow(profile, {
          degrees: Number.isFinite(Number(profile?.Meta?.Degrees)) ? Number(profile.Meta.Degrees) : "",
          surnamePreference: "birthFirst",
        })
      );
    const sortedDescendants = sortKinRows(descendants, includeUpTo);

    if (!sortedDescendants.length) {
      return `I found no ${displayRelationshipLabel} for ${subjectLabel} in accessible API data.`;
    }

    return buildKinListResult({
      rows: sortedDescendants,
      displayRelationshipLabel,
      subjectLabel,
      rootDisplayName: rootPerson.displayName,
      includeUpTo,
      chatMeta: {
        intent: ChatIntent.DESCENDANT_LIST,
        rootKey: String(rootPerson.key || ""),
        generation,
        includeUpTo,
        location: "",
        locationField: "AnyLocation",
      },
    });
  } catch (error) {
    return `I couldn't list ${relationshipLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
  }
}

async function tryHandleProfileFamilyConnectionPrompt(params) {
  const familyName = params?.familyName?.trim();
  if (!familyName) {
    return null;
  }

  const rootProfile = getProfileRootPerson();
  if (!rootProfile) {
    return "This query needs an open profile page so I can use the current profile person as the starting point.";
  }

  try {
    const cc7Profiles = await getCc7ProfilesForUser(rootProfile.key);
    const familyNeedle = normalizeSurname(familyName);
    const matches = cc7Profiles
      .filter((profile) => {
        const lastNameAtBirth = normalizeSurname(profile.LastNameAtBirth);
        const lastNameCurrent = normalizeSurname(profile.LastNameCurrent);
        return lastNameAtBirth === familyNeedle || lastNameCurrent === familyNeedle;
      })
      .map((profile) =>
        mapApiPersonToStandardRow(profile, {
          degrees: Number(profile.Degrees ?? Number.MAX_SAFE_INTEGER),
          surnamePreference: "currentFirst",
        })
      )
      .sort((left, right) => left.degrees - right.degrees || left.displayName.localeCompare(right.displayName));

    if (!matches.length) {
      return `I found no CC7 matches for the ${familyName} family from ${rootProfile.displayName} (${rootProfile.wtId}).`;
    }

    const closestDegree = matches[0].degrees;
    const closestMatches = matches.filter((person) => person.degrees === closestDegree);
    const preview = closestMatches
      .slice(0, 6)
      .map((person) => `${person.displayName} (${person.wtid})`)
      .join(", ");
    const extra = closestMatches.length > 6 ? `, and ${closestMatches.length - 6} more` : "";

    return {
      message: `The closest ${familyName} connection from ${rootProfile.displayName} (${
        rootProfile.wtId
      }) is degree ${closestDegree}. Closest match${
        closestMatches.length === 1 ? "" : "es"
      }: ${preview}${extra}. I found ${matches.length} total ${familyName} match${
        matches.length === 1 ? "" : "es"
      } in accessible CC7 data.`,
      table: makeStandardProfileTable(`${familyName} family matches from ${rootProfile.displayName}`, matches),
    };
  } catch (error) {
    return `I couldn't search CC7 for the ${familyName} family from ${rootProfile.displayName}. Error: ${
      error?.message || "unknown error"
    }`;
  }
}

function parseRelationType(rawRelation) {
  const value = normalizeText(rawRelation)
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const specs = [
    {
      pattern: /grand\s*aunts?/,
      key: "grandaunts",
      singular: "grandaunt",
      plural: "grandaunts",
      group: "grandparentSiblings",
      gender: "Female",
    },
    {
      pattern: /grand\s*uncles?/,
      key: "granduncles",
      singular: "granduncle",
      plural: "granduncles",
      group: "grandparentSiblings",
      gender: "Male",
    },
    {
      pattern: /grand\s*mothers?/,
      key: "grandmothers",
      singular: "grandmother",
      plural: "grandmothers",
      group: "grandparents",
      gender: "Female",
    },
    {
      pattern: /grand\s*fathers?/,
      key: "grandfathers",
      singular: "grandfather",
      plural: "grandfathers",
      group: "grandparents",
      gender: "Male",
    },
    {
      pattern: /grand\s*parents?/,
      key: "grandparents",
      singular: "grandparent",
      plural: "grandparents",
      group: "grandparents",
      gender: null,
    },
    { pattern: /aunts?/, key: "aunts", singular: "aunt", plural: "aunts", group: "parentSiblings", gender: "Female" },
    { pattern: /uncles?/, key: "uncles", singular: "uncle", plural: "uncles", group: "parentSiblings", gender: "Male" },
    {
      pattern: /mothers?|moms?/,
      key: "mothers",
      singular: "mother",
      plural: "mothers",
      group: "parents",
      gender: "Female",
    },
    {
      pattern: /fathers?|dads?/,
      key: "fathers",
      singular: "father",
      plural: "fathers",
      group: "parents",
      gender: "Male",
    },
    { pattern: /parents?/, key: "parents", singular: "parent", plural: "parents", group: "parents", gender: null },
    {
      pattern: /daughters?/,
      key: "daughters",
      singular: "daughter",
      plural: "daughters",
      group: "children",
      gender: "Female",
    },
    { pattern: /sons?/, key: "sons", singular: "son", plural: "sons", group: "children", gender: "Male" },
    {
      pattern: /children|kids?/,
      key: "children",
      singular: "child",
      plural: "children",
      group: "children",
      gender: null,
    },
    { pattern: /wives|wife/, key: "wives", singular: "wife", plural: "wives", group: "spouses", gender: "Female" },
    {
      pattern: /husbands?|husband/,
      key: "husbands",
      singular: "husband",
      plural: "husbands",
      group: "spouses",
      gender: "Male",
    },
    {
      pattern: /spouses?|partners?/,
      key: "spouses",
      singular: "spouse",
      plural: "spouses",
      group: "spouses",
      gender: null,
    },
    { pattern: /sisters?/, key: "sisters", singular: "sister", plural: "sisters", group: "siblings", gender: "Female" },
    {
      pattern: /brothers?/,
      key: "brothers",
      singular: "brother",
      plural: "brothers",
      group: "siblings",
      gender: "Male",
    },
    {
      pattern: /siblings?|sibs?/,
      key: "siblings",
      singular: "sibling",
      plural: "siblings",
      group: "siblings",
      gender: null,
    },
  ];

  return specs.find((spec) => spec.pattern.test(value)) || null;
}

function normalizeRelationChainText(rawRelation) {
  return String(rawRelation || "")
    .replace(/[’`]/g, "'")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRelationChainSegments(rawRelation) {
  const normalized = normalizeRelationChainText(rawRelation);
  if (!normalized) {
    return [];
  }

  const possessiveSegments = normalized
    .split(/\s*'s\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (possessiveSegments.length > 1) {
    return possessiveSegments;
  }

  const ofSegments = normalized
    .split(/\s+of\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (ofSegments.length > 1) {
    return ofSegments.reverse();
  }

  return [normalized];
}

function parseRelationChainLocally(rawRelation) {
  const segments = splitRelationChainSegments(rawRelation);
  if (!segments.length) {
    return [];
  }

  const steps = [];
  for (const segment of segments) {
    const spec = parseRelationType(segment);
    if (!spec) {
      return [];
    }
    steps.push(spec);
  }

  return steps;
}

async function tryAiParseRelationChain(rawRelation) {
  const normalized = normalizeRelationChainText(rawRelation);
  if (!normalized || (!normalized.includes("'") && !/\bof\b/i.test(normalized))) {
    return [];
  }

  const { provider, key, model } = await getChatAiConfig();
  if (!key) {
    return [];
  }

  const prompt = [
    "You parse family relation chains for a genealogy tool.",
    'Return JSON only: {"steps":["mother","sister","husband"]}.',
    "Allowed step words: mother, father, parent, sister, brother, sibling, daughter, son, child, wife, husband, spouse,",
    "aunt, uncle, grandaunt, granduncle, grandmother, grandfather, grandparent.",
    "Do not include any words other than allowed step words.",
    `Relation text: ${normalized}`,
  ].join("\n");

  const response = await chrome.runtime.sendMessage({
    action: "chatWithAI",
    prompt,
    provider,
    key,
    model,
    pageContext: {
      url: window.location.href,
      title: document.title,
    },
  });

  if (!response?.success || !response.response) {
    return [];
  }

  const parsed = parsePlannerJson(response.response);
  const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  if (!rawSteps.length) {
    return [];
  }

  const steps = [];
  for (const rawStep of rawSteps) {
    const spec = parseRelationType(rawStep);
    if (!spec) {
      return [];
    }
    steps.push(spec);
  }

  return steps;
}

async function resolveRelationChain(rawRelation) {
  const localSteps = parseRelationChainLocally(rawRelation);
  if (localSteps.length) {
    return localSteps;
  }

  const aiSteps = await tryAiParseRelationChain(rawRelation);
  if (aiSteps.length) {
    return aiSteps;
  }

  const single = parseRelationType(rawRelation);
  return single ? [single] : [];
}

function relationMatchesGender(person, expectedGender) {
  if (!expectedGender) {
    return true;
  }
  return normalizeText(person?.Gender) === normalizeText(expectedGender);
}

function uniquePeopleById(people) {
  const deduped = new Map();
  (people || []).forEach((person) => {
    const key = String(person?.Name || person?.Id || "").trim();
    if (!key) {
      return;
    }
    if (!deduped.has(key)) {
      deduped.set(key, person);
    }
  });
  return Array.from(deduped.values());
}

function toDisplayName(person) {
  const fallbackSurname = String(person?.LastNameCurrent || person?.LastNameAtBirth || "").trim();
  let preferred = String(person?.RealName || person?.Derived?.ShortName || "").trim();
  if (preferred) {
    if (!/\s/.test(preferred) && fallbackSurname) {
      preferred = `${preferred} ${fallbackSurname}`;
    }
    return preferred;
  }

  const composed = String([person?.FirstName || "", fallbackSurname].filter(Boolean).join(" ")).trim();
  return composed || person?.Name || `ID ${person?.Id || "unknown"}`;
}

function formatRelationPreviewLine(person) {
  const details = [];
  if (person?.BirthDate && person.BirthDate !== "0000-00-00") {
    details.push(`b. ${person.BirthDate}`);
  }
  if (person?.DeathDate && person.DeathDate !== "0000-00-00") {
    details.push(`d. ${person.DeathDate}`);
  }

  const detailSuffix = details.length ? ` - ${details.join(", ")}` : "";
  return `- ${toDisplayName(person)} (${person?.Name || person?.Id || "unknown"})${detailSuffix}`;
}

function toRelationTableRows(people = []) {
  return people.map((person) => ({
    displayName: toDisplayName(person),
    wtid: person?.Name || "",
    firstName: person?.FirstName || "",
    lnab: person?.LastNameAtBirth || "",
    lastNameCurrent: person?.LastNameCurrent || "",
    degrees: "",
    gender: person?.Gender || "",
    birth: person?.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate : "",
    death: person?.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate : "",
    birthLocation: person?.BirthLocation || "",
    deathLocation: person?.DeathLocation || "",
    surname: person?.LastNameAtBirth || person?.LastNameCurrent || "",
  }));
}

function isAppsLoginButtonPresent() {
  return $("#wbeAppLoginBtn").length > 0;
}

function hasAppsLoginHintAlready() {
  return chatHistory.some((message) => {
    if (message?.role !== "assistant") {
      return false;
    }
    return String(message.text || "").includes("apps server for better results");
  });
}

async function fetchParentIds(personKey) {
  // Prefer getRelatives to obtain Parent objects that include Name (WTID)
  try {
    const relatives = await WikiTreeAPI.getRelatives(
      WBE_CHAT_APP_ID,
      personKey,
      "Id,Name,RealName",
      { getParents: 1 }
    );
    const [peopleResult] = relatives || [];
    const profile = peopleResult?.person || {};
    const parentsObj = profile?.Parents || {};
    const parentNames = Object.values(parentsObj || [])
      .map((p) => p?.Name || (p?.Id ? String(p.Id) : null))
      .filter(Boolean);
    if (parentNames.length) return parentNames;
  } catch (e) {
    /* ignore getRelatives errors and fall back */
  }

  // Fallback: use getPerson to read numeric Father/Mother ids
  try {
    const person = await WikiTreeAPI.getPerson("Chat", personKey, "Id,Name,Father,Mother");
    const parents = [person?.Father, person?.Mother].filter((id) => Number(id) > 0);
    if (parents.length) return parents;
  } catch (e) {
    /* ignore */
  }

  // DOM fallback: try to read parent links from profile HTML and validate
  try {
    const domParents = findParentProfileIdsFromDOM();
    if (domParents && domParents.length) {
      const numericIds = [];
      for (const wtid of domParents) {
        try {
          const [p] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, wtid, "Id,Name", { resolveRedirect: 1 });
          if (p && Number(p.Id) > 0) numericIds.push(Number(p.Id));
        } catch (e) {
          /* ignore individual failures */
        }
      }
      if (numericIds.length) return numericIds;
      return domParents; // return raw WTIDs if numeric ids unavailable
    }
  } catch (e) {
    /* ignore DOM fallback errors */
  }
  return [];
}

async function fetchGrandparentIds(personKey) {
  const parentIds = await fetchParentIds(personKey);
  if (!parentIds.length) {
    return [];
  }

  const [, , parentPeople] = await fetchPeoplePaged("Chat", parentIds, "Id,Father,Mother", {});
  const grandparentIds = new Set();
  Object.values(parentPeople || {}).forEach((parent) => {
    if (Number(parent?.Father) > 0) {
      grandparentIds.add(Number(parent.Father));
    }
    if (Number(parent?.Mother) > 0) {
      grandparentIds.add(Number(parent.Mother));
    }
  });
  return Array.from(grandparentIds);
}

async function fetchAncestorIdsForGeneration(personKey, generation) {
  const targetGeneration = Number(generation);
  if (!personKey || !Number.isFinite(targetGeneration) || targetGeneration < 1) {
    return [];
  }

  try {
    const [, , peopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, personKey, "Id,Meta", {
      ancestors: targetGeneration,
      minGeneration: targetGeneration,
      limit: 64,
    });

    const ids = Object.values(peopleMap || {})
      .map((profile) => Number(profile?.Id))
      .filter((id) => Number.isFinite(id) && id > 0);
    return Array.from(new Set(ids));
  } catch (error) {
    return [];
  }
}

async function fetchSiblingsForIds(personIds = []) {
  const relatives = [];
  const uniqueIds = Array.from(new Set((personIds || []).map((id) => Number(id)).filter((id) => id > 0)));

  for (const id of uniqueIds) {
    const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, `${RELATION_PERSON_FIELDS},Siblings`, {
      getSiblings: 1,
    });

    const person = entry?.person;
    Object.values(person?.Siblings || {}).forEach((sibling) => {
      if (!sibling || Number(sibling.Id) === Number(person?.Id || id)) {
        return;
      }
      relatives.push(sibling);
    });
  }

  return relatives;
}

async function collectUserAncestorSiblingRelations(relationSpec, userKey = "") {
  const resolvedUserKey = userKey || getUserWtId() || getUserNumId();
  if (!resolvedUserKey) {
    return [];
  }

  if (relationSpec.group === "parentSiblings") {
    let parentIds = await fetchParentIds(resolvedUserKey);
    if (!parentIds.length) {
      parentIds = await fetchAncestorIdsForGeneration(resolvedUserKey, 1);
    }
    if (!parentIds.length) {
      return [];
    }
    return await fetchSiblingsForIds(parentIds);
  }

  if (relationSpec.group === "grandparentSiblings") {
    let grandparentIds = await fetchGrandparentIds(resolvedUserKey);
    if (!grandparentIds.length) {
      grandparentIds = await fetchAncestorIdsForGeneration(resolvedUserKey, 2);
    }
    if (!grandparentIds.length) {
      return [];
    }
    return await fetchSiblingsForIds(grandparentIds);
  }

  return [];
}

async function collectAncestorSiblingRelationsForPerson(personKey, relationSpec) {
  if (relationSpec.group === "parentSiblings") {
    const parentIds = await fetchParentIds(personKey);
    if (!parentIds.length) {
      return [];
    }
    return await fetchSiblingsForIds(parentIds);
  }

  if (relationSpec.group === "grandparentSiblings") {
    const grandparentIds = await fetchGrandparentIds(personKey);
    if (!grandparentIds.length) {
      return [];
    }
    return await fetchSiblingsForIds(grandparentIds);
  }

  return [];
}

async function collectRelationPeople(personKey, relationSpec) {
  if (relationSpec.group === "siblings") {
    const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Siblings`, {
      getSiblings: 1,
    });
    const siblings = Object.values(entry?.person?.Siblings || {});
    if (siblings && siblings.length) return siblings;
    // Fallback: try DOM-based sibling WTIDs and batch-fetch profiles
    try {
      const domIds = await fetchSiblingIdsForId(personKey);
      if (domIds && domIds.length) {
        const profiles = await fetchProfilesForIds(domIds, RELATION_PERSON_FIELDS, { resolveRedirect: 1 });
        return profiles.filter(Boolean);
      }
    } catch (e) {
      /* ignore fallback errors */
    }
    return [];
  }

  if (relationSpec.group === "children") {
    const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Children`, {
      getChildren: 1,
    });
    const children = Object.values(entry?.person?.Children || {});
    if (children && children.length) return children;
    // Fallback: try DOM-based children WTIDs and batch-fetch profiles
    try {
      const domIds = await fetchChildrenIdsForId(personKey);
      if (domIds && domIds.length) {
        const profiles = await fetchProfilesForIds(domIds, RELATION_PERSON_FIELDS, { resolveRedirect: 1 });
        return profiles.filter(Boolean);
      }
    } catch (e) {
      /* ignore fallback errors */
    }
    return [];
  }

  if (relationSpec.group === "spouses") {
    const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Spouses`, {
      getSpouses: 1,
    });
    return Object.values(entry?.person?.Spouses || {});
  }

  if (relationSpec.group === "parents") {
    const parentIds = await fetchParentIds(personKey);
    if (!parentIds.length) {
      return [];
    }
    const [, , peopleMap] = await fetchPeoplePaged("Chat", parentIds, RELATION_PERSON_FIELDS, {});
    return Object.values(peopleMap || {});
  }

  if (relationSpec.group === "grandparents") {
    const grandparentIds = await fetchGrandparentIds(personKey);
    if (!grandparentIds.length) {
      return [];
    }
    const [, , peopleMap] = await fetchPeoplePaged("Chat", grandparentIds, RELATION_PERSON_FIELDS, {});
    return Object.values(peopleMap || {});
  }

  if (relationSpec.group === "parentSiblings" || relationSpec.group === "grandparentSiblings") {
    return await collectAncestorSiblingRelationsForPerson(personKey, relationSpec);
  }

  return [];
}

async function collectRelationChainPeople(subjectKey, relationSteps = []) {
  const steps = Array.isArray(relationSteps) ? relationSteps : [];
  if (!subjectKey || !steps.length) {
    return [];
  }

  let currentKeys = [subjectKey];
  let currentPeople = [];

  for (const step of steps) {
    const nextPeople = [];

    for (const key of currentKeys) {
      const relatives = await collectRelationPeople(key, step);
      const filtered = uniquePeopleById(relatives).filter((person) => relationMatchesGender(person, step.gender));
      nextPeople.push(...filtered);
    }

    currentPeople = uniquePeopleById(nextPeople);
    currentKeys = currentPeople
      .map((person) => person?.Name || person?.Id)
      .filter((key) => String(key || "").trim().length > 0);

    if (!currentKeys.length) {
      break;
    }
  }

  return currentPeople;
}

async function tryHandleRelationCountPrompt(params, prompt = "") {
  const relationRaw = String(params?.relationRaw || "").trim();
  if (!relationRaw) {
    return null;
  }
  const mode = params?.mode === "list" ? "list" : "count";
  const forceUserSubject = promptRefersToUser(prompt);

  const relationSteps = await resolveRelationChain(relationRaw);
  if (!relationSteps.length) {
    return `I couldn't match "${relationRaw}" to a supported relation type yet. Try siblings, parents, children, spouses, aunts, uncles, grandparents, granduncles, or grandaunts.`;
  }
  const relationSpec = relationSteps[relationSteps.length - 1];

  let subject = null;
  if (!forceUserSubject && params?.subjectMode === "named") {
    const subjectName = String(params?.subjectName || "").trim();
    if (!subjectName) {
      return "I couldn't tell which person you meant. Could you include a name or WikiTree ID?";
    }
    const resolved = await resolveConnectionTargetPerson(subjectName, prompt);
    if (!resolved?.Name && !resolved?.Id) {
      return `I couldn't identify which profile you meant by "${subjectName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    subject = {
      key: resolved.Id || resolved.Name,
      label: `${resolved.RealName || resolved?.Derived?.ShortName || resolved.Name} (${resolved.Name || resolved.Id})`,
      isUser: false,
    };
  } else {
    const directUserWtId = String(getUserWtId() || "").trim();
    const directUserNumId = getUserNumId();
    const directUserKey = directUserWtId || directUserNumId;

    if (!directUserKey) {
      return "I could not detect your logged-in WikiTree ID. Please make sure you are logged in on WikiTree.";
    }

    const me = await getLoggedInRootPerson();
    const userKeys = Array.from(
      new Set(
        [directUserNumId, directUserWtId, me?.key, me?.wtId, me?.Id, me?.Name]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
    subject = {
      key: directUserKey,
      label: "you",
      isUser: true,
      wtId: directUserWtId || String(me?.wtId || ""),
      userKeys,
    };
  }

  try {
    let relatives = [];
    const isSingleStep = relationSteps.length === 1;

    if (subject.isUser && isSingleStep && ["parentSiblings", "grandparentSiblings"].includes(relationSpec.group)) {
      // For "my aunts/uncles/grandaunts/granduncles", prefer a direct ancestor+sibling fetch from the user root.
      const candidateKeys =
        Array.isArray(subject.userKeys) && subject.userKeys.length ? subject.userKeys : [subject.key];
      for (const candidateKey of candidateKeys) {
        relatives = await collectUserAncestorSiblingRelations(relationSpec, candidateKey);
        if (relatives.length) {
          break;
        }
      }
    }

    if (!relatives.length && isSingleStep) {
      relatives = await collectRelationPeople(subject.key, relationSpec);
    }

    if (!relatives.length && !isSingleStep) {
      relatives = await collectRelationChainPeople(subject.key, relationSteps);
    }

    relatives = uniquePeopleById(relatives).filter((person) => relationMatchesGender(person, relationSpec.gender));

    const count = relatives.length;
    const noun = count === 1 ? relationSpec.singular : relationSpec.plural;
    if (!count) {
      const appsLoginHint =
        subject.isUser && isAppsLoginButtonPresent()
          ? " If you see the Apps Login button, click it and try again so Chat can use full app-server access."
          : "";

      if (mode === "list") {
        return subject.isUser
          ? `I couldn't find any ${noun} in currently accessible family data yet. Try asking about a specific person (for example: "Who are the granduncles of Name-123?").${appsLoginHint}`
          : `I couldn't find any ${noun} for ${subject.label} in currently accessible family data yet.${appsLoginHint}`;
      }
      return subject.isUser
        ? `I found 0 ${noun} in currently accessible family data.${appsLoginHint}`
        : `I found 0 ${noun} for ${subject.label} in currently accessible family data.${appsLoginHint}`;
    }

    if (mode === "list") {
      const wantsBio = /\bbio(?:s|graphy|graphies)?\b/i.test(prompt || relationRaw);
      const lines = relatives
        .slice(0, 20)
        .map((person) => formatRelationPreviewLine(person))
        .join("\n");
      const extra = relatives.length > 20 ? `\n...and ${relatives.length - 20} more.` : "";
      if (wantsBio) {
        // Build entries and show bio list popup (auto-open first)
        const entries = relatives.map((person) => ({
          wtid: person?.Name || person?.Id || "",
          displayName: toDisplayName(person),
        }));
        showBioListPopup(
          subject.isUser ? `Your ${noun} bios` : `${noun} bios for ${subject.label}`,
          entries.slice(0, 50)
        );
        return {
          message: subject.isUser ? `Opened bios for your ${noun}.` : `Opened bios for ${noun} of ${subject.label}.`,
        };
      }

      return {
        message: subject.isUser
          ? `Here are your ${noun} (${count} found):\n${lines}${extra}`
          : `Here are ${noun} for ${subject.label} (${count} found):\n${lines}${extra}`,
        table: makeStandardProfileTable(
          subject.isUser ? `Your ${noun}` : `${noun} for ${subject.label}`,
          toRelationTableRows(relatives),
          [[1, "asc"]]
        ),
      };
    }

    const sample = relatives
      .slice(0, 6)
      .map((person) => toDisplayName(person))
      .join(", ");
    const suffix = count > 6 ? ", ..." : "";
    return {
      message: subject.isUser
        ? `You have ${count} ${noun} in currently accessible data. ${sample}${suffix}`
        : `${subject.label} has ${count} ${noun} in currently accessible data. ${sample}${suffix}`,
      table: makeStandardProfileTable(
        subject.isUser ? `Your ${noun}` : `${noun} for ${subject.label}`,
        toRelationTableRows(relatives),
        [[1, "asc"]]
      ),
    };
  } catch (error) {
    return `I could not calculate ${relationSpec.plural}. Error: ${error?.message || "unknown error"}`;
  }
}

async function tryHandleConnectionPrompt(prompt, targetOverride = "") {
  const target = targetOverride || extractConnectionTarget(prompt);
  console.debug("wbe: tryHandleConnectionPrompt start", { prompt, targetOverride, target });
  if (!target) {
    return null;
  }

  try {
    const matchedPerson = await resolveConnectionTargetPerson(target, prompt, { excludeWtIds: [] });
    console.debug("wbe: tryHandleConnectionPrompt resolved matchedPerson", { matchedPerson });
    if (!matchedPerson) {
      return `I could not find a WikiTree profile match for \"${target}\".`;
    }

    const targetWtId = matchedPerson?.Name;
    if (!targetWtId) {
      return `I found candidate matches for \"${target}\", but could not resolve a WikiTree ID.`;
    }

    const sourceRoot = await resolveConnectionSourceRoot(prompt, targetWtId);
    console.debug("wbe: tryHandleConnectionPrompt sourceRoot", { sourceRoot });
    if (sourceRoot?.unresolvedName) {
      return `I couldn't identify which source profile you meant by "${sourceRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!sourceRoot?.wtId && !sourceRoot?.key) {
      if (promptRefersToUser(prompt)) {
        return "I could not determine your logged-in WikiTree identity for a 'from me' lookup. Please refresh while logged in, then try again.";
      }
      return "I could not detect a source profile for this connection lookup.";
    }

    const sourceKey = sourceRoot.wtId || String(sourceRoot.key || "");
    if (!sourceKey) {
      return "I could not detect a source profile for this connection lookup.";
    }

    const { data, relationCode } = await getConnectionDataWithFallback(sourceKey, targetWtId);
    console.debug("wbe: tryHandleConnectionPrompt getConnections result", {
      sourceKey,
      targetWtId,
      relationCode,
      data,
    });
    const pathLength = Number(data?.pathLength);
    const hasPath =
      (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);

    const displayName = matchedPerson?.RealName || targetWtId;
    if (!hasPath) {
      let legacyRelationship = "";
      if (sourceRoot.wtId && targetWtId) {
        try {
          const legacy = await getRelationJSON("Chat", sourceRoot.wtId, targetWtId);
          legacyRelationship = parseLegacyRelationshipLabel(legacy);
        } catch (error) {
          legacyRelationship = "";
        }
      }

      console.debug("wbe: tryHandleConnectionPrompt noPath legacyRelationship", { legacyRelationship });
      if (legacyRelationship) {
        return `I found ${displayName} (${targetWtId}), but no connection path was returned from ${sourceRoot.displayName} (${sourceRoot.wtId}). Legacy relationship fallback: ${legacyRelationship}.`;
      }

      return `I found ${displayName} (${targetWtId}), but no connection path was returned from ${sourceRoot.displayName} (${sourceRoot.wtId}), even after fallback path attempts.`;
    }

    const distance =
      Number.isFinite(pathLength) && pathLength > 0 ? pathLength - 1 : Math.max((data?.path || []).length - 1, 0);
    let relationshipText = String(data?.relationship || "").trim();
    if (!relationshipText && sourceRoot.wtId && targetWtId) {
      try {
        const legacy = await getRelationJSON("Chat", sourceRoot.wtId, targetWtId);
        relationshipText = parseLegacyRelationshipLabel(legacy);
      } catch (error) {
        relationshipText = "";
      }
    }
    if (/^\d+$/.test(relationshipText)) {
      relationshipText = "";
    }
    const relationshipSuffix = relationshipText ? ` Relationship: ${relationshipText}.` : "";

    lastConnectionContext = {
      sourceKey,
      sourceWtId: sourceRoot.wtId || "",
      sourceLabel: sourceRoot.subjectType === "user" ? "you" : `${sourceRoot.displayName} (${sourceRoot.wtId})`,
      targetRaw: target,
      targetWtId,
      excludeWtIds: [],
      candidates: lastConnectionCandidates.map((candidate) => candidate?.Name).filter(Boolean),
    };
    // Keep the connection data handy for popup rendering when user clicks the action button
    // Keep the data for popup/table rendering
    lastConnectionPopupResult = [data];
    try {
      sessionStorage.setItem(CHAT_LAST_CONNECTION_KEY, JSON.stringify(lastConnectionPopupResult));
    } catch (e) {
      /* ignore */
    }

    // Map getConnections path to rows expected by makeStandardProfileTable
    const rows = (data.path || []).map((p) => ({
      wtid: p.Name || "",
      firstName: p.FirstName || "",
      lnab: p.LastNameAtBirth || "",
      lastNameCurrent: p.LastNameCurrent || "",
      degrees: "",
      birth: formatDate(p.BirthDate),
      death: formatDate(p.DeathDate),
      birthLocation: p.BirthLocation || "",
      deathLocation: p.DeathLocation || "",
      gender: p.Gender || "",
      displayName: `${p.FirstName || ""} ${p.LastNameCurrent || ""}`.trim(),
    }));

    // We keep the constructed rows available if needed, but do not show the DataTable.
    const table = makeStandardProfileTable(`Connections: ${displayName}`, rows, [[1, "asc"]]);

    const messageText =
      sourceRoot.subjectType === "user"
        ? `Connection found: ${displayName} (${targetWtId}) is ${distance} step${
            distance === 1 ? "" : "s"
          } away from you.${relationshipSuffix}`
        : `Connection found: ${displayName} (${targetWtId}) is ${distance} step${distance === 1 ? "" : "s"} away from ${
            sourceRoot.displayName
          } (${sourceRoot.wtId}).${relationshipSuffix}`;

    // Show the connections popup (the human-readable 'connection between X and Y' table)
    try {
      showConnectionsPopup(lastConnectionPopupResult);
    } catch (e) {
      /* ignore */
    }

    return {
      message: messageText,
      action: {
        label: "Connections",
        onClick: () => toggleConnectionsPopup(),
      },
    };
  } catch (error) {
    return `I could not complete the connection lookup for \"${target}\". Error: ${error?.message || "unknown error"}`;
  } finally {
    hideChatShaky();
  }
}

// Try to detect prompts asking for a spouse's bio and fetch it directly
async function tryHandlePersonBioPrompt(prompt) {
  console.info("wbe: tryHandlePersonBioPrompt called", { prompt });

  // Detect possessive relation patterns: "Ivy's parents", "Dona's bio", "bio of X's wife", etc.
  const str = String(prompt || "").trim();
  let targetRaw = null;
  let relationRaw = null;

  let m = str.match(/^\s*(.+?)'s\s+([a-zA-Z]+s?)\??$/i);
  if (m) {
    targetRaw = (m[1] || "").trim();
    relationRaw = (m[2] || "").trim().toLowerCase();
  } else {
    // "bio(s) of X", "profile of X"
    m = str.match(/^\s*bio(?:graphy|s)?\s+of\s+(.+?)\??$/i) || str.match(/^\s*profile(?:s)?\s+of\s+(.+?)\??$/i);
    if (m) {
      targetRaw = (m[1] || "").trim();
      relationRaw = "self";
    }
    // "X's bio(s)"
    if (!targetRaw) {
      m = str.match(/^\s*(.+?)'s\s+bio(?:graphy|s)?\??$/i);
      if (m) {
        targetRaw = (m[1] || "").trim();
        relationRaw = "self";
      }
    }
  }

  // If nothing matched and the prompt doesn't ask for a bio, ignore
  if (!targetRaw && !/\b(bio|biography|profile|bios)\b/i.test(str)) {
    console.info("wbe: tryHandlePersonBioPrompt - pattern did not match and no bio keyword, ignoring", { prompt });
    return null;
  }

  console.info("wbe: tryHandlePersonBioPrompt parsed", { prompt, targetRaw, relationRaw });

  // If the relation explicitly mentions ancestors or descendants, don't intercept here;
  // let the main router handle those multi-step relation queries so tables/results are returned.
  if (relationRaw && /(ancest|descend)/i.test(String(relationRaw))) {
    console.info("wbe: tryHandlePersonBioPrompt - ancestor/descendant relation detected, deferring to main router", {
      relationRaw,
    });
    return null;
  }

  // Map relation words to relation groups used elsewhere
  const relMap = {
    wife: "spouses",
    husband: "spouses",
    spouse: "spouses",
    spouses: "spouses",
    parent: "parents",
    parents: "parents",
    mother: "parents",
    father: "parents",
    child: "children",
    children: "children",
    son: "children",
    daughter: "children",
    sibling: "siblings",
    siblings: "siblings",
    brother: "siblings",
    sister: "siblings",
    self: "self",
  };

  const wantsBioPlural = /\bbios?\b/i.test(str) || /\bprofiles?\b/i.test(str);

  // Resolve the target person; attempt fallbacks if direct resolution fails
  let resolved = null;
  if (targetRaw) resolved = await resolveConnectionTargetPerson(targetRaw, prompt);
  console.info("wbe: tryHandlePersonBioPrompt resolved target", { resolved });
  // If resolution produced the page/profile context (or a generic result), prefer
  // any strong match from the last structured result (previous table) when the
  // user asked a short follow-up name (e.g., "Dona"). This helps follow-ups
  // refer to recently shown rows instead of defaulting to the page person.
  try {
    const needle = String(targetRaw || "")
      .trim()
      .toLowerCase();
    if (needle && lastStructuredResult?.rows?.length) {
      const normNeedle = needle;
      const tokenMatch = (text) => {
        if (!text) return false;
        const low = String(text).toLowerCase();
        if (low === normNeedle) return true;
        if (low.startsWith(normNeedle + " ") || low.startsWith(normNeedle)) return true;
        // tokenized match: any space-separated token equals needle
        const parts = low.split(/\s+/).filter(Boolean);
        if (parts.includes(normNeedle)) return true;
        return false;
      };

      const pagePerson = getProfilePersonInfo();
      for (const row of lastStructuredResult.rows) {
        // Prefer rows that are not the current page person to avoid resolving to the page itself
        const candidateId = String(row.wtid || row.wtId || row.id || "").trim();
        if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
          continue; // skip the page person
        }
        const display = String(row.displayName || row.wtid || row.wtId || "").trim();
        const firstName = String(row.firstName || display.split(/\s+/)[0] || "").trim();
        if (
          tokenMatch(firstName) ||
          tokenMatch(display) ||
          tokenMatch(row.wtid) ||
          tokenMatch(row.wtId) ||
          tokenMatch(row.id)
        ) {
          resolved = { Name: candidateId || null, RealName: row.displayName || row.wtid };
          console.info("wbe: tryHandlePersonBioPrompt overridden by lastStructuredResult match", { resolved, needle });
          break;
        }
      }
    }
  } catch (e) {
    /* ignore */
  }

  if (!resolved?.Name && !resolved?.Id) {
    // Try to find a matching row in lastStructuredResult (e.g., from a previous spouse table)
    try {
      const needle = String(targetRaw || "")
        .trim()
        .toLowerCase();
      if (lastStructuredResult?.rows?.length) {
        const pagePerson = getProfilePersonInfo();
        for (const row of lastStructuredResult.rows) {
          const candidateId = String(row.wtid || row.wtId || row.id || "").trim();
          if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
            continue;
          }
          const name = String(row.displayName || row.wtid || "").toLowerCase();
          if (name.startsWith(needle) || name === needle) {
            resolved = { Name: candidateId || null, RealName: row.displayName || row.wtid };
            console.info("wbe: tryHandlePersonBioPrompt resolved from lastStructuredResult", { resolved, needle });
            break;
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  // If still unresolved, try matching against recent connection candidates (if any)
  if (!resolved?.Name && !resolved?.Id) {
    try {
      const needle = String(targetRaw || "")
        .trim()
        .toLowerCase();
      if (needle && lastConnectionCandidates?.length) {
        const pagePerson = getProfilePersonInfo();
        for (const c of lastConnectionCandidates) {
          const candidateId = String(c?.Name || c?.wtid || c?.id || "").trim();
          if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
            continue;
          }
          const name = String(c?.RealName || c?.Derived?.ShortName || c?.Name || c?.displayName || "").toLowerCase();
          const first = String(c?.FirstName || name.split(/\s+/)[0] || "").toLowerCase();
          if (!name) continue;
          if (name === needle || name.startsWith(needle) || first === needle) {
            resolved = { Name: candidateId || null, RealName: c.RealName || c.displayName || c.Name };
            console.info("wbe: tryHandlePersonBioPrompt resolved from lastConnectionCandidates", { resolved, needle });
            break;
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  if (!resolved?.Name && !resolved?.Id) {
    // DOM fallback: search for spouse entries matching the name
    try {
      const needle = String(targetRaw || "")
        .trim()
        .toLowerCase();
      const domSpouseEls = Array.from(
        document.querySelectorAll(
          "a.spouseLink[href*='/wiki/'], a[itemprop=\"spouse\"][href*='/wiki/'], .spouseEntry a[href*='/wiki/']"
        )
      );
      const pagePerson = getProfilePersonInfo();
      for (const el of domSpouseEls) {
        const nameText = (el.textContent || "").trim();
        const realName = nameText || (el.querySelector(".spouse-name")?.textContent || "").trim();
        if (realName && realName.toLowerCase().startsWith(needle)) {
          const href = el.getAttribute("href") || "";
          const m = href.match(/\/wiki\/([^#?\/]+)/);
          const id = m ? decodeURIComponent(m[1]) : null;
          if (id) {
            // Skip the current page person if it appears in relation links
            if (pagePerson && (id === pagePerson.Name || id === pagePerson.Id)) {
              continue;
            }
            resolved = { Name: id, RealName: realName };
            console.info("wbe: tryHandlePersonBioPrompt resolved from DOM by name", { resolved, needle });
            break;
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  if (!resolved?.Name && !resolved?.Id) {
    // Attempt AI-assisted disambiguation using conversation context, structured results and DOM candidates
    try {
      const hasKey = await hasAnyApiKey();
      if (hasKey) {
        showChatShaky("Asking AI to resolve the name...");
        const conversationContext = buildRecentConversationForAi();
        const candidates = [];
        if (lastStructuredResult?.rows?.length) {
          for (const row of lastStructuredResult.rows.slice(0, 50)) {
            candidates.push(`${row.displayName || row.wtid || ""} (ID: ${row.wtid || row.wtId || row.id || ""})`);
          }
        }
        if (lastConnectionCandidates?.length) {
          for (const c of lastConnectionCandidates.slice(0, 50)) {
            candidates.push(`${c.displayName || c.Name || c.name || ""} (ID: ${c.Name || c.wtid || c.id || ""})`);
          }
        }
        const domEls = Array.from(
          document.querySelectorAll("a.spouseLink[href*='/wiki/'], .spouseEntry a[href*='/wiki/']")
        );
        for (const el of domEls.slice(0, 50)) {
          const href = el.getAttribute("href") || "";
          const m = href.match(/\/wiki\/([^#?\/]+)/);
          const id = m ? decodeURIComponent(m[1]) : null;
          const label = (el.textContent || "").trim();
          if (id && label) candidates.push(`${label} (ID: ${id})`);
        }

        const aiPrompt = [
          `You are given a short person name to match to a list of candidate WikiTree profiles.`,
          candidates.length ? `Candidates:\n${candidates.join("\n")}` : "No explicit candidates available.",
          conversationContext ? `Recent conversation:\n${conversationContext}` : "",
          `Which candidate best matches the name \"${targetRaw}\"? Reply ONLY with the WikiTree ID (e.g. Name-123) or NO_ID if none match.`,
        ]
          .filter(Boolean)
          .join("\n\n");

        // Try to call a generic AI helper if available; otherwise skip AI step
        try {
          let aiResult = null;
          if (typeof window.callAiModel === "function") {
            aiResult = await window.callAiModel(aiPrompt);
          }
          if (aiResult) {
            const match = String(aiResult || "").trim();
            if (match && match !== "NO_ID") {
              resolved = { Name: match, RealName: targetRaw };
              console.info("wbe: tryHandlePersonBioPrompt resolved by AI", { resolved, aiText: aiResult });
            } else {
              console.info("wbe: tryHandlePersonBioPrompt AI returned NO_ID", { aiText: aiResult });
            }
          }
        } catch (e) {
          console.info("wbe: tryHandlePersonBioPrompt AI fallback failed", { e });
        }
        hideChatShaky();
      }
    } catch (e) {
      hideChatShaky();
    }
  }

  const personKey = resolved?.Id || resolved?.Name;
  // Track any profile fetch failures for the relation lookup so we can avoid
  // auto-opening a single bio when some fetches failed.
  let relationFetchFailedIds = [];
  try {
    if (!personKey) {
      return `I couldn't identify which profile you meant by "${targetRaw}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }

    // If relationRaw maps to "self" or no explicit relation, show the person's own bio
    const mapped = relationRaw ? relMap[relationRaw.toLowerCase()] : null;
    const relationType = mapped || null;

    if (!relationType || relationType === "self") {
      // Fetch and show the subject's own bio
      showChatShaky("Loading biography...");
      console.info("wbe: tryHandlePersonBioPrompt fetching profile for self", { personKey });
      const [profile] = await WikiTreeAPI.getProfile(
        WBE_CHAT_APP_ID,
        personKey,
        "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
        {
          bioFormat: "both",
          resolveRedirect: 1,
        }
      );
      hideChatShaky();
      if (!profile) return `No profile data found for ${personKey}.`;
      const inlineMore = { text: profile?.Bio || profile?.BioText || null };
      const result = {
        message: `Biography for ${profile?.Name || personKey}:`,
        action: { label: "Show Bio", onClick: async () => { const w = await resolveToWTID(profile?.Name || personKey); showBioPopupForId(w).catch(()=>{}); } },
        inlineMore,
      };
      showBioPopupForId(profile?.Name || personKey).catch(() => {});
      return result;
    }

    // For relatives, attempt API-first and DOM fallbacks per relation
    let entries = [];
    if (relationType === "spouses") {
      showChatShaky("Looking up spouse(s)...");
      console.info("wbe: tryHandlePersonBioPrompt calling getRelatives for spouses", { personKey });
      const relativesResult = await WikiTreeAPI.getRelatives(
        WBE_CHAT_APP_ID,
        personKey,
        "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
        { getSpouses: 1 }
      );
      hideChatShaky();
      const [peopleResult] = relativesResult;
      const profile = peopleResult?.person || {};
      entries = Object.values(profile?.Spouses || {}).map((s) => ({ wtid: s.Name, displayName: s.RealName || s.Name }));
      if (!entries.length) {
        try {
          const domSpouseEls = Array.from(
            document.querySelectorAll(
              "a.spouseLink[href*='/wiki/'], a[itemprop=\"spouse\"][href*='/wiki/'], .spouseEntry a[href*='/wiki/']"
            )
          );
          const pagePerson = getProfilePersonInfo();
          const domSpouses = domSpouseEls
            .map((el) => {
              const href = el.getAttribute("href") || "";
              const m = href.match(/\/wiki\/([^#?\/]+)/);
              const id = m ? decodeURIComponent(m[1]) : null;
              const nameText = (el.textContent || "").trim();
              return id ? { wtid: id, displayName: nameText || id } : null;
            })
            .filter(Boolean)
            .filter((s) => {
              if (!s || !s.wtid) return false;
              if (pagePerson && (s.wtid === pagePerson.Name || s.wtid === pagePerson.Id)) return false;
              return true;
            });
          if (domSpouses.length) entries = domSpouses;
        } catch (e) {
          console.info("wbe: tryHandlePersonBioPrompt spouse DOM fallback failed", { e });
        }
      }
    } else if (relationType === "children") {
      const ids = await fetchChildrenIdsForId(personKey);
      if (ids && ids.length) {
        const failed = [];
        entries = [];
        const allNumeric = ids.every((x) => Number.isFinite(Number(x)) && Number(x) > 0);
        // For small numeric lists (typical parent lists of 1-2), prefer per-id getProfile
        // so we map numeric Id -> WikiTree Name reliably. Use fetchPeoplePaged for
        // larger batches for efficiency.
        if (allNumeric && ids.length > 4) {
          const [, , peopleMap] = await fetchPeoplePaged(
            "Chat",
            ids,
            "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
            {}
          );
          for (const id of ids) {
            const key = String(id);
            const p = peopleMap[key];
            if (p && Object.keys(p).length)
              entries.push({ wtid: p.Name || id, displayName: p.RealName || p.Name || id });
            else failed.push(id);
          }
        } else {
          const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
            bioFormat: "both",
            resolveRedirect: 1,
          });
          for (let i = 0; i < ids.length; i += 1) {
            const p = profiles[i];
            if (p && Object.keys(p).length)
              entries.push({ wtid: p.Name || ids[i], displayName: p.RealName || p.Name || ids[i] });
            else failed.push(ids[i]);
          }
        }
        relationFetchFailedIds = failed.slice();
        if (!entries.length && failed.length) {
          return `Failed to load child profiles: ${failed.join(
            ", "
          )} — server errors or no data. No popups were opened.`;
        }
        if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
      }
    } else if (relationType === "siblings") {
      const ids = await fetchSiblingIdsForId(personKey);
      if (ids && ids.length) {
        const failed = [];
        entries = [];
        const allNumeric = ids.every((x) => Number.isFinite(Number(x)) && Number(x) > 0);
        if (allNumeric) {
          const [, , peopleMap] = await fetchPeoplePaged(
            "Chat",
            ids,
            "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
            {}
          );
          for (const id of ids) {
            const key = String(id);
            const p = peopleMap[key];
            if (p && Object.keys(p).length) entries.push({ wtid: id, displayName: p.RealName || p.Name || id });
            else failed.push(id);
          }
        } else {
          const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
            bioFormat: "both",
            resolveRedirect: 1,
          });
          for (let i = 0; i < ids.length; i += 1) {
            const p = profiles[i];
            if (p && Object.keys(p).length) entries.push({ wtid: ids[i], displayName: p.RealName || p.Name || ids[i] });
            else failed.push(ids[i]);
          }
        }
        relationFetchFailedIds = failed.slice();
        if (!entries.length && failed.length) {
          return `Failed to load sibling profiles: ${failed.join(
            ", "
          )} — server errors or no data. No popups were opened.`;
        }
        if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
      }
    } else if (relationType === "parents") {
      const ids = await fetchParentIds(personKey);
      if (ids && ids.length) {
        const failed = [];
        entries = [];
        const allNumeric = ids.every((x) => Number.isFinite(Number(x)) && Number(x) > 0);
        if (allNumeric) {
          const [, , peopleMap] = await fetchPeoplePaged(
            "Chat",
            ids,
            "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
            {}
          );
          for (const id of ids) {
            const key = String(id);
            const p = peopleMap[key];
            if (p && Object.keys(p).length) entries.push({ wtid: id, displayName: p.RealName || p.Name || id });
            else failed.push(id);
          }
        } else {
          const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
            bioFormat: "both",
            resolveRedirect: 1,
          });
          for (let i = 0; i < ids.length; i += 1) {
            const p = profiles[i];
            if (p && Object.keys(p).length) entries.push({ wtid: ids[i], displayName: p.RealName || p.Name || ids[i] });
            else failed.push(ids[i]);
          }
        }
        relationFetchFailedIds = failed.slice();
        if (!entries.length && failed.length) {
          return `Failed to load parent profiles: ${failed.join(
            ", "
          )} — server errors or no data. No popups were opened.`;
        }
        if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
      }
    }

    if (!entries.length) {
      return `No ${relationType} information found for ${resolved?.RealName || resolved?.Name || personKey}.`;
    }

    // If single entry, auto-open only when there were no profile-fetch failures
    if (entries.length === 1) {
      const singleId = entries[0].wtid;
      if (Array.isArray(relationFetchFailedIds) && relationFetchFailedIds.length) {
        // Some fetches failed; avoid auto-opening the single bio to prevent
        // popping an incomplete view. Show the list and inform the user.
        showBioListPopup(
          `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
          entries.slice(0, 50)
        );
        return {
          message: `Found ${entries.length} ${relationType} for ${
            resolved?.RealName || resolved?.Name || personKey
          }, but some profiles failed to load (${relationFetchFailedIds.join(
            ", "
          )}). Open the list to view available entries.`,
          action: {
            label: "Open List",
            onClick: () =>
              showBioListPopup(
                `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
                entries.slice(0, 50)
              ),
          },
        };
      }
      try {
        const resolvedWtid = await resolveToWTID(singleId);
        showBioPopupForId(resolvedWtid).catch(() => {});
        return {
          message: `Opened bio for ${entries[0].displayName || resolvedWtid}.`,
          action: { label: "Show Bio", onClick: async () => { const w = await resolveToWTID(singleId); showBioPopupForId(w).catch(()=>{}); } },
        };
      } catch (err) {
        return `Failed to open bio for ${entries[0].displayName || singleId}.`;
      }
    }

    // Multiple entries — if user explicitly asked for bios (plural), open tiled popups and show list
    if (wantsBioPlural) {
      const ids = entries.map((e) => e.wtid).filter(Boolean);
      try {
        showBioListPopup(
          `${relationType} bios for ${resolved?.RealName || resolved?.Name || personKey}`,
          entries.slice(0, 50)
        );
        showTiledBioPopups(ids.slice(0, 9)); // limit to 9 tiled popups by default
        return {
          message: `Opened ${Math.min(ids.length, 9)} bios for ${resolved?.RealName || resolved?.Name || personKey}.`,
        };
      } catch (e) {
        console.error("wbe: tryHandlePersonBioPrompt failed to open tiled bios", e);
      }
    }

    // Default: show bio list popup and return a message/action
    showBioListPopup(`${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`, entries.slice(0, 50));
    return {
      message: `Found ${entries.length} ${relationType} for ${resolved?.RealName || resolved?.Name || personKey}.`,
      action: {
        label: "Open List",
        onClick: () =>
          showBioListPopup(
            `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
            entries.slice(0, 50)
          ),
      },
    };
  } catch (err) {
    hideChatShaky();
    console.error("wbe: tryHandlePersonBioPrompt error", err);
    return `Failed to lookup information for ${resolved?.RealName || resolved?.Name || targetRaw}.`;
  }
}

async function hasAnyApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SHARED_AI_OPTIONS_KEY, AUTO_BIO_OPTIONS_KEY, "chat_options"], (items) => {
      const options = {
        ...(items?.[AUTO_BIO_OPTIONS_KEY] || {}),
        ...(items?.chat_options || {}),
        ...(items?.[SHARED_AI_OPTIONS_KEY] || {}),
      };
      const hasKey = AI_KEY_FIELDS.some((field) => {
        const value = options?.[field];
        return typeof value === "string" && value.trim().length > 0;
      });
      resolve(hasKey);
    });
  });
}

function ensureButtonContainer() {
  const $existing = $(".clipboardContainer");
  if ($existing.length) return $existing.get(0);

  const $profileActions = $(".profile--actions.float-end");
  if ($profileActions.length) {
    const $container = $("<span>").addClass("clipboardContainer");
    const $readingMode = $profileActions.find("a.action--reading-mode");
    if ($readingMode.length) {
      $readingMode.first().before($container);
    } else {
      $profileActions.append($container);
    }
    return $container.get(0);
  }

  const $managerBox = $("#Manager").closest("div");
  if ($managerBox.length) {
    const $container = $("<span>").addClass("clipboardContainer");
    $managerBox.prepend($container);
    return $container.get(0);
  }

  return null;
}

function closePopup() {
  $(`#${CHAT_POPUP_ID}`).remove();
}

function openPopup() {
  let $popup = $(`#${CHAT_POPUP_ID}`);
  if ($popup.length === 0) {
    $popup = $(
      `<div id="${CHAT_POPUP_ID}" class="wbe-popup chat-popup">
        <div class="chat-popup-header">
          <strong>Chat</strong>
          <div class="chat-popup-controls">
            <button id="${CHAT_CLEAR_ID}" type="button" class="small" title="Clear chat">Clear</button>
            <button type="button" class="small close-popup" aria-label="Close" title="Close">&times;</button>
          </div>
        </div>
        <div class="chat-popup-body">
          <div id="${CHAT_MESSAGES_ID}" class="chat-messages"></div>
          <div class="chat-input-row">
            <textarea id="${CHAT_INPUT_ID}" rows="2" placeholder="Ask something"></textarea>
            <button id="${CHAT_SEND_ID}" type="button" class="small">Send</button>
          </div>
        </div>
      </div>`
    ).appendTo(document.body);

    positionPopupForOpen($popup.get(0));
    $popup.find(".close-popup").on("click", closePopup);
    $popup.find(`#${CHAT_CLEAR_ID}`).on("click", clearHistory);
    $popup.find(`#${CHAT_SEND_ID}`).on("click", sendChatPrompt);
    $popup.find(`#${CHAT_INPUT_ID}`).on("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChatPrompt();
      }
    });
    loadHistory();
    renderHistory();
    if (!chatHistory.length) {
      appendMessage("assistant", "Chat is ready. Ask a question to begin.");
    }
    if (isAppsLoginButtonPresent() && !hasAppsLoginHintAlready()) {
      appendMessage("assistant", CHAT_APPS_LOGIN_HINT);
    }

    $popup.draggable({
      handle: ".chat-popup-header",
      containment: "window",
      scroll: false,
      start: () => {
        $popup.get(0).style.right = "auto";
        $popup.get(0).style.transform = "none";
      },
      drag: () => {
        clampPopupToViewport($popup.get(0));
      },
      stop: () => {
        clampPopupToViewport($popup.get(0));
      },
    });
    // Bring popup to front when clicked or focused
    $popup.on("mousedown focusin", () => {
      try {
        setHighestZIndex($popup.get(0));
      } catch (e) {
        /* ignore */
      }
    });
  }

  $popup.show();
  positionPopupForOpen($popup.get(0));
  setHighestZIndex($popup.get(0));
  $popup.find(`#${CHAT_INPUT_ID}`).focus();
}

function ensureChatButton() {
  if (document.getElementById(CHAT_BUTTON_ID)) return;
  const container = ensureButtonContainer();
  if (!container) return;
  const iconUrl = chrome.runtime.getURL("images/chat.svg");
  const $button = $(
    `<a id="${CHAT_BUTTON_ID}" href="#" class="wbe-button" data-tooltip="Chat" data-bs-title="Chat" data-bs-toggle="tooltip" title="Open Chat"><span class="icon--chat" style="background-image:url(${iconUrl})"></span></a>`
  );
  $button.on("click", (e) => {
    e.preventDefault();
    openPopup();
  });
  $(container).append($button);
}
 

function hideChatButtonAndPopup() {
  document.getElementById(CHAT_BUTTON_ID)?.remove();
  closePopup();
}

async function syncChatVisibilityToKeys() {
  if (await hasAnyApiKey()) {
    ensureChatButton();
  } else {
    hideChatButtonAndPopup();
  }
}

function init() {
  syncChatVisibilityToKeys();

  // Restore persisted chat state (history, last structured/table, last bio)
  try {
    loadHistory();
  } catch (e) {
    /* ignore load errors */
  }

  window.addEventListener("resize", () => {
    const popup = document.getElementById(CHAT_POPUP_ID);
    if (!popup) {
      return;
    }

    try {
      if ($(popup).hasClass("ui-resizable")) {
        $(popup).resizable("option", uiGetPopupResizeLimits());
      }
    } catch (error) {
      // Ignore if resizable has not been initialized yet.
    }

    clampPopupToViewport(popup);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && (changes[SHARED_AI_OPTIONS_KEY] || changes[AUTO_BIO_OPTIONS_KEY])) {
      syncChatVisibilityToKeys();
    }
  });
}

shouldInitializeFeature("chat").then((result) => {
  if (result) {
    init();
  }
});
