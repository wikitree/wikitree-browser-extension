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
import {
  routeChatPrompt,
  ChatIntent,
  normalizePersonText,
  splitPersonName,
  normalizeConnectionTargetForSearch,
  isConnectionCorrectionPrompt,
  extractCorrectionTarget,
  extractWikiTreeIdFromHref,
  scorePageContextCandidate,
  findPageContextPersonCandidate,
  mergeConnectionMatches,
  rankConnectionMatches,
  shouldUseAiForConnectionDisambiguation,
  pause,
  getCommonAliasExpansion,
  extractConnectionTarget,
} from "./chat_router";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/resizable";
import "./chat.css";
import { createChatConnectionHandlers } from "./chat_connections";
import { handleExplicitSearchMode } from "./chat_search_mode";
import { createProfileSearchHandler } from "./chat_profile_search";
import { createChatAiHelpers } from "./chat_ai";
import { createChatCcHandlers } from "./chat_cc";
import { createLastResultOperationHandler } from "./chat_last_result";
import { createChatRelationHandlers } from "./chat_relations";
import { createChatPeopleHandlers } from "./chat_people";
import {
  shouldOfferDisambiguation,
  buildDisambiguationMessage,
  resolveDisambiguationReply,
} from "./chat_disambiguation";
import {
  findSpouseProfileIdsFromDOM,
  findChildrenProfileIdsFromDOM,
  findSiblingProfileIdsFromDOM,
  findParentProfileIdsFromDOM,
} from "./chat_dom_lookup";
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
  sanitizeHtmlForPopup,
  extractProfileBios,
  showBioListPopup,
  showTiledBioPopups,
  closeBioPopup,
  addBioButton,
} from "./ui";
import { buildResultsTableHtml } from "./tables";
import {
  makeProfileLink,
  extractCountryFromLocation,
  withDerivedRowFields,
  cloneResultWithRows,
  makeStandardProfileTable,
  makeWatchlistTable,
  makeAncestorAgeTable,
} from "./tables";

// Debug: indicate the chat feature script has been loaded
console.debug("wbe: chat.js loaded");

const CHAT_POPUP_ID = "wbe-chat-popup";
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
let chatResultsCounter = 0;
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
let lastConnectionPopupResult = null;
let lastStructuredResult = null;
let lastBioPopupId = null;
let lastBioPopupProfile = null;

const { resolveConnectionTargetPerson, tryHandleConnectionCorrectionPrompt, tryHandleConnectionPrompt } =
  createChatConnectionHandlers({
    WBE_CHAT_APP_ID,
    CHAT_LAST_CONNECTION_KEY,
    toggleConnectionsPopup: () => toggleConnectionsPopup(),
    tryAiDisambiguateConnectionTarget,
    tryAiExpandConnectionTarget,
    shouldOfferDisambiguation,
    resolveConnectionSourceRoot,
    promptRefersToUser,
    getLastConnectionContext: () => lastConnectionContext,
    setLastConnectionContext: (value) => {
      lastConnectionContext = value;
    },
    getLastConnectionCandidates: () => lastConnectionCandidates,
    setLastConnectionCandidates: (value) => {
      lastConnectionCandidates = value;
    },
    setLastConnectionRankedMatches: (value) => {
      lastConnectionRankedMatches = value;
    },
    setLastConnectionPopupResult: (value) => {
      lastConnectionPopupResult = value;
    },
  });

const { buildRecentConversationForAi, getChatAiConfig, hasAnyApiKey } = createChatAiHelpers({
  getChatOptions,
  getChatHistory: () => chatHistory,
  chatAiMessageMaxChars: CHAT_AI_MESSAGE_MAX_CHARS,
  chatAiHistoryMaxMessages: CHAT_AI_HISTORY_MAX_MESSAGES,
  sharedAiOptionsKey: SHARED_AI_OPTIONS_KEY,
  autoBioOptionsKey: AUTO_BIO_OPTIONS_KEY,
  aiKeyFields: AI_KEY_FIELDS,
});

const tryHandleProfileSearchPrompt = createProfileSearchHandler({
  WBE_CHAT_APP_ID,
  hasAnyApiKey,
  getChatOptions,
  getChatAiConfig,
  fetchSearchPersonPaged,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  normalizeText,
  normalizeKnownDate,
  showChatShaky,
  hideChatShaky,
});

const { getCc7ProfilesForUser, tryHandleCc7LocationPrompt, tryHandleCcSummaryPrompt, tryHandleWatchlistPrompt } =
  createChatCcHandlers({
    WikiTreeAPI,
    WBE_CHAT_APP_ID,
    CC7_CACHE_MS,
    formatSubjectLabel,
    resolveCc7SubjectRoot,
    mapApiPersonToStandardRow,
    makeStandardProfileTable,
    makeWatchlistTable,
    normalizeText,
  });

const tryHandleLastResultOperation = createLastResultOperationHandler({
  getLastStructuredResult: () => lastStructuredResult,
  openResultsTable,
  cloneResultWithRows,
  normalizeText,
  normalizeDateForSort,
  normalizeNumberForSort,
  normalizeSurname,
  extractCountryFromLocation,
});

const { tryHandleRelationCountPrompt } = createChatRelationHandlers({
  WikiTreeAPI,
  WBE_CHAT_APP_ID,
  RELATION_PERSON_FIELDS,
  getChatAiConfig,
  parsePlannerJson,
  normalizeText,
  promptRefersToUser,
  resolveConnectionTargetPerson,
  getUserWtId,
  getUserNumId,
  getLoggedInRootPerson,
  makeStandardProfileTable,
  showBioListPopup,
  handleOpenFromBioList,
  fetchPeoplePaged,
  fetchProfilesForIds,
  fetchChildrenIdsForId,
  fetchSiblingIdsForId,
  findParentProfileIdsFromDOM,
  isAppsLoginButtonPresent,
});

const {
  tryHandleSpouseListPrompt,
  tryHandlePersonAgeAtDeathPrompt,
  tryHandleAncestorAverageAgePrompt,
  tryHandleAncestorListPrompt,
  tryHandleDescendantListPrompt,
  tryHandleProfileFamilyConnectionPrompt,
} = createChatPeopleHandlers({
  ChatIntent,
  WBE_CHAT_APP_ID,
  WikiTreeAPI,
  resolveConnectionTargetPerson,
  getLoggedInRootPerson,
  getProfileSubjectRoot,
  getProfileRootPerson,
  promptRefersToUser,
  formatSubjectLabel,
  buildDisambiguationMessage,
  setPendingDisambiguationContext: (value) => {
    pendingDisambiguationContext = value;
  },
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  makeAncestorAgeTable,
  withDerivedRowFields,
  normalizeText,
  normalizeNumberForSort,
  normalizeSurname,
  computeAgeAtDeathYears,
  isPartialDate,
  getCc7ProfilesForUser,
  getLastStructuredResult: () => lastStructuredResult,
});

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
      appendMessage("assistant", "Could not load some biographies. Partial results may be shown.", {
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

// `closeBioPopup` and `addBioButton` are provided by `ui.js`.

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

// Expose DOM helper for console testing
window.wbeFindSpouseLinks = findSpouseProfileIdsFromDOM;

// Expose DOM helpers for console testing
window.wbeFindChildLinks = findChildrenProfileIdsFromDOM;
window.wbeFindSiblingLinks = findSiblingProfileIdsFromDOM;

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

// Bio list / tiled popup UI functions live in `ui.js`; use the exported
// implementations. Expose the UI function on the window for console testing.
window.wbeShowBioList = showBioListPopup;

// Tiled bio UI uses the implementation in `ui.js`. Provide a small helper
// that delegates to the UI function and supplies our API fetch helper.
async function showTiledViaApi(ids = []) {
  return showTiledBioPopups(ids, (toOpen) =>
    fetchProfilesForIds(toOpen, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
      bioFormat: "both",
      resolveRedirect: 1,
    })
  );
}
window.wbeShowTiled = showTiledViaApi;

// Handle 'Open' requests from the bio list UI. Accepts an array of raw ids
// (could be numeric Id or WTID). Single-item arrays open a single bio;
// multiple ids open tiled popups (limited to a reasonable max).
async function handleOpenFromBioList(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return;
  const toOpen = ids.slice(0, 12);
  try {
    if (toOpen.length === 1) {
      const raw = toOpen[0];
      const wtid = await resolveToWTID(raw);
      if (wtid) await showBioPopupForId(wtid).catch(() => {});
      return;
    }
    // Resolve each id to a WTID where possible, skipping failures.
    const resolved = [];
    for (const raw of toOpen) {
      try {
        const w = await resolveToWTID(raw);
        if (w) resolved.push(w);
      } catch (e) {
        console.warn("wbe: handleOpenFromBioList resolve failed", raw, e);
      }
    }
    if (resolved.length) {
      await showTiledViaApi(resolved);
    }
  } catch (e) {
    console.error("wbe: handleOpenFromBioList error", e);
  }
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
      const siblings = Object.values(siblingsObj || [])
        .map((s) => s?.Name || (s?.Id ? String(s.Id) : null))
        .filter(Boolean);
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
    let siblings = Object.values(siblingsObj || [])
      .map((s) => s.Name)
      .filter(Boolean);
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
      const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, "Id,Name,RealName", { getChildren: 1 });
      const [peopleResult] = relatives || [];
      const profile = peopleResult?.person || {};
      const childrenObj = profile?.Children || {};
      const children = Object.values(childrenObj || [])
        .map((c) => c?.Name || (c?.Id ? String(c.Id) : null))
        .filter(Boolean);
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
    let children2 = Object.values(childrenObj2 || [])
      .map((c) => c.Name)
      .filter(Boolean);
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
  const aggregated = {};
  let lastStatus = "";
  let totalCount = null;

  // If rootKey is a list of specific IDs (array or comma-separated string),
  // call getPeople in chunks of `limit` keys rather than using start/limit
  // paging (which can behave oddly when explicit keys are provided).
  const keysArray = Array.isArray(rootKey)
    ? rootKey.slice()
    : typeof rootKey === "string" && rootKey.includes(",")
    ? String(rootKey)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  if (keysArray && keysArray.length) {
    totalCount = keysArray.length;
    for (let i = 0; i < keysArray.length; i += limit) {
      const chunk = keysArray.slice(i, i + limit);
      try {
        // Do not pass start/limit when requesting a specific set of keys.
        const chunkOpts = { ...(options || {}) };
        delete chunkOpts.start;
        delete chunkOpts.limit;
        console.debug("wbe: fetchPeoplePaged requesting chunk", { chunkSize: chunk.length });
        const [status, resultByKey, people] = await WikiTreeAPI.getPeople(appId, chunk, fields, chunkOpts);
        lastStatus = status || lastStatus;
        const pageProfiles = Object.values(people || {});
        console.debug("wbe: fetchPeoplePaged chunk result", { chunkSize: chunk.length, returned: pageProfiles.length });
        pageProfiles.forEach((profile) => {
          if (!profile) return;
          const key = profile?.Id != null ? String(profile.Id) : profile?.Name || null;
          if (key) aggregated[key] = profile;
        });
      } catch (e) {
        console.debug("wbe: fetchPeoplePaged chunk getPeople failed", { e, chunkSize: chunk.length });
        // continue on error for resilience
      }
    }

    return [lastStatus, totalCount, aggregated];
  }

  // Fallback: use start/limit paging when no explicit keys array is provided.
  let start = Number(options.start) || 0;
  let fetchMore = true;

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

// Paged searchPerson helper: accumulates matches across pages into a single array of match objects.
async function fetchSearchPersonPaged(appId, searchParams, fields, options = {}) {
  const pageLimit = Number(options.limit) || 100;
  const maxToFetch = Number(options.max) || 2000;
  let start = Number(options.start) || 0;
  let allMatches = [];
  let lastStatus = null;

  while (true) {
    const [status, matches, total] = await WikiTreeAPI.searchPerson(appId, searchParams, fields, {
      limit: pageLimit,
      start,
    });
    lastStatus = status;
    if (!Array.isArray(matches) || !matches.length) break;
    allMatches.push(...matches);
    // stop when we've collected all reported results
    if (Number.isFinite(Number(total)) && allMatches.length >= Number(total)) break;
    // stop if we've reached our safe cap
    if (allMatches.length >= maxToFetch) break;
    // stop if this page was smaller than requested
    if (matches.length < pageLimit) break;
    start += pageLimit;
  }

  return [lastStatus, allMatches, allMatches.length];
}

window.wbeFetchSearchPersonPaged = fetchSearchPersonPaged;

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
// moved to ui.js

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

  const $item = $("<div>").addClass(`chat-message chat-message-${role} chat-message--new`);
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
    // Persist per-message structured table if present so past messages' Table
    // buttons open the correct snapshot instead of the most-recent table.
    if (action?.table) {
      try {
        historyEntry.structured = action.table;
      } catch (e) {
        /* ignore */
      }
    }
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
// moved to ui.js

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
  // Show a small popup with buttons and allow the UI to call back to open
  showBioListPopup(`Bios from last results (${entries.length})`, entries.slice(0, 25), handleOpenFromBioList);
  return { message: `Opened bio popup for ${entries[0].displayName} and listed others.` };
}

function renderHistory() {
  const $messages = getMessageList();
  if (!$messages || $messages.length === 0) return;
  $messages.empty();
  chatHistory.forEach((message, msgIndex) => {
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
            const toOpen = message.structured || lastStructuredResult;
            if (!toOpen) return;
            const popupId = `${CHAT_RESULTS_POPUP_ID}-msg-${msgIndex}`;
            const tableId = `${CHAT_RESULTS_TABLE_ID}-msg-${msgIndex}`;
            const existing = document.getElementById(popupId);
            if (existing) {
              try {
                const $t = $(existing).find("table");
                if ($t.length && $.fn.DataTable.isDataTable($t)) {
                  $t.DataTable().destroy();
                }
              } catch (e) {
                /* ignore */
              }
              existing.remove();
              return;
            }
            openResultsTable(toOpen, { popupId, tableId });
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

function openResultsTable(result = lastStructuredResult, opts = {}) {
  if (!result?.rows?.length || !result?.columns?.length) {
    return;
  }

  // Allow caller to request specific popup/table ids (used for toggling a
  // per-history-message table). Otherwise generate a unique id.
  let popupId, tableId;
  if (opts && opts.popupId && opts.tableId) {
    popupId = opts.popupId;
    tableId = opts.tableId;
  } else {
    chatResultsCounter += 1;
    const uid = String(chatResultsCounter);
    popupId = `${CHAT_RESULTS_POPUP_ID}-${uid}`;
    tableId = `${CHAT_RESULTS_TABLE_ID}-${uid}`;
  }

  // Build the popup HTML; ensure the inner table uses the unique id.
  const popupHtml = `
    <div id="${popupId}" class="wbe-popup chat-results-popup">
      <div class="chat-results-header">
        <strong>${escapeHtml(result.title || "Chat Results")}</strong>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">&times;</button>
      </div>
      <div class="chat-results-body">
        ${buildResultsTableHtml(result, { tableId })}
      </div>
    </div>`;

  const $popup = $(popupHtml).appendTo(document.body);
  positionPopupFixed(
    $popup.get(0),
    Math.round((window.innerWidth - $popup.get(0).getBoundingClientRect().width) / 2),
    110
  );
  // Per-popup close handler: destroy the DataTable for this popup and remove.
  $popup.find(".close-popup").on("click", () => {
    try {
      const $t = $popup.find("table");
      if ($t.length && $.fn.DataTable.isDataTable($t)) {
        $t.DataTable().destroy();
      }
    } catch (e) {
      /* ignore */
    }
    $popup.remove();
  });

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

  // Some page or widget code (or jQuery UI) may change z-index after
  // initialization. Schedule a short delayed re-raise so the results popup
  // reliably ends up above other WBE popups when opened.
  try {
    setTimeout(() => {
      try {
        console.debug("wbe: re-raising results popup after init");
        setHighestZIndex($popup.get(0));
      } catch (e) {
        /* ignore */
      }
    }, 50);
  } catch (e) {
    /* ignore */
  }

  $(`#${tableId}`).DataTable({
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

  // If the result includes a table, capture a snapshot of the table on the
  // action object so it can be persisted with the chat history. This avoids
  // later Table buttons all referencing the global `lastStructuredResult`.
  const action = result.action
    ? result.action
    : result.table
    ? {
        label: "Table",
        table: result.table,
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
    // If user selected AI mode explicitly when starting with 'Search', short-circuit to AI chat
    try {
      const modeResult = await handleExplicitSearchMode({
        prompt,
        chatPopupId: CHAT_POPUP_ID,
        buildRecentConversationForAi,
        getChatAiConfig,
        appendMessage,
        tryHandleProfileSearchPrompt,
        handleChatResult,
      });
      prompt = modeResult.prompt;
      if (modeResult.handled) {
        return;
      }
    } catch (modeErr) {
      console.debug("wbe: chat mode handling failed", modeErr);
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

    // Begin detailed logging for form submission and AI mode
    console.log("wbe: chat form submitted", { prompt });
    const chatMode = document.getElementById("wbe-chat-mode")?.value || "ai";
    console.log("wbe: detected chat mode", { chatMode });
    const conversationContext = buildRecentConversationForAi();
    let profileContextText = null;
    try {
      const textPrompt = String(prompt || "");
      // Extract capitalized name candidates
      const nameCandidates = textPrompt.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g) || [];
      console.log("wbe: extracted name candidates from prompt", { nameCandidates, prompt: textPrompt });
      // 1) Direct profile key like Beacall-156
      let profileKeyMatch = textPrompt.match(/\b([A-Za-z][A-Za-z0-9_\-]+-\d{1,6})\b/);
      let profileKey = profileKeyMatch?.[1];
      console.log("wbe: direct profile key match", { profileKey });
      // 2) Last structured result contains match
      if (!profileKey && lastStructuredResult && Array.isArray(lastStructuredResult.rows)) {
        const candidate = nameCandidates.find((t) => t && t.length > 2);
        const found = (lastStructuredResult.rows || []).find((r) =>
          String(r.displayName || "")
            .toLowerCase()
            .includes(String(candidate).toLowerCase())
        );
        if (found) {
          profileKey = found.wtid || found.Name || null;
          console.log("wbe: resolved profileKey from lastStructuredResult", { candidate, profileKey });
        }
      }
      // 3) Quick search by RealName
      if (!profileKey && nameCandidates.length) {
        let nameCandidate = nameCandidates.sort((a, b) => b.split(" ").length - a.split(" ").length)[0];
        if (nameCandidate) {
          try {
            console.log("wbe: attempting searchPerson for nameCandidate", { nameCandidate });
            const [status, matches, total] = await WikiTreeAPI.searchPerson(
              WBE_CHAT_APP_ID,
              { RealName: nameCandidate },
              "Id,Name",
              { limit: 5 }
            );
            console.log("wbe: searchPerson result", { status, matches, total });
            if (Array.isArray(matches) && matches.length === 1) {
              profileKey = matches[0].Name || matches[0].user_name || null;
              console.log("wbe: searchPerson resolved single match for", { nameCandidate, profileKey });
            } else {
              console.log("wbe: searchPerson returned multiple or no matches", { nameCandidate, total });
            }
          } catch (sErr) {
            console.log("wbe: searchPerson error", sErr);
          }
        }
      }
      // 4) Fallback: check getProfilePersonInfo for name match
      if (!profileKey && nameCandidates.length) {
        try {
          const { getProfilePersonInfo } = await import("../../core/common");
          const personInfo = getProfilePersonInfo && getProfilePersonInfo();
          let nameCandidate = nameCandidates.sort((a, b) => b.split(" ").length - a.split(" ").length)[0];
          console.log("wbe: fallback DOM profile match attempt", {
            nameCandidate,
            personInfo,
            fullName: personInfo && personInfo.FullName,
            prompt: textPrompt,
          });
          if (
            personInfo &&
            personInfo.FullName &&
            nameCandidate &&
            personInfo.FullName.toLowerCase().includes(nameCandidate.toLowerCase())
          ) {
            profileKey = personInfo.Name;
            console.log("wbe: fallback DOM profile match found", { nameCandidate, personInfo });
          }
        } catch (domErr) {
          console.log("wbe: DOM profile context detection error", domErr);
        }
      }
      // Fetch profile data if profileKey found
      if (profileKey) {
        try {
          const fields = "Bio,Sources,Notes,Categories";
          console.log("wbe: fetching profile for AI context", { profileKey });
          const [profile, status, page_name] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, profileKey, fields, {
            bioFormat: "wiki",
            resolveRedirect: 1,
          });
          console.log("wbe: fetched profile for AI context", { profile, status, page_name });
          const bio = profile?.Bio || "";
          const sources = (profile?.Sources && Array.isArray(profile.Sources) ? profile.Sources : [])
            .map((s) => (typeof s === "string" ? s : JSON.stringify(s)))
            .join("\n");
          const notes = (profile?.Notes && Array.isArray(profile.Notes) ? profile.Notes : [])
            .map((n) => (typeof n === "string" ? n : JSON.stringify(n)))
            .join("\n");
          const categories = profile?.Categories ? String(profile.Categories) : "";
          profileContextText = [
            `Profile ${profileKey} (page: ${page_name || "unknown"}):`,
            "BIO:",
            bio,
            "SOURCES:",
            sources,
            "NOTES:",
            notes,
            "CATEGORIES:",
            categories,
          ]
            .filter(Boolean)
            .join("\n\n");
          console.log("wbe: included profile context for AI", { profileKey, page_name });
        } catch (pErr) {
          console.log("wbe: getProfile failed for AI context", pErr);
          profileContextText = `Note: failed to fetch profile ${profileKey} for additional context (not logged in or API error).`;
        }
      }
    } catch (ctxErr) {
      console.log("wbe: profile context detection error", ctxErr);
    }
    // ...existing code...

    const aiPromptParts = [
      "You are assisting inside the WikiTree Browser Extension chat.",
      conversationContext ? `Recent conversation:\n${conversationContext}` : "",
      localFailureForAi ? `Local tool attempt failed with: ${localFailureForAi}` : "",
    ];
    if (profileContextText) aiPromptParts.push(profileContextText);
    aiPromptParts.push(`Current user request: ${prompt}`);

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: aiPromptParts.filter(Boolean).join("\n\n"),
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
    return await tryHandleProfileSearchPrompt(routed.params, prompt);
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
        action: {
          label: "Show Bio",
          onClick: async () => {
            const wtid = await resolveToWTID(spouseId);
            showBioPopupForId(wtid).catch(() => {});
          },
        },
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

async function tryAiParseCategoryName(detectedCategory, originalPrompt) {
  const options = await getChatOptions();
  if (!options?.allowAiFallback) return null;

  const { provider, key, model } = await getChatAiConfig();
  if (!key) return null;

  const prompt = [
    "You are a helper that extracts a canonical WikiTree+ category query value from a user's chat prompt.",
    "Given an example user prompt and a detected fragment, return a JSON object with two keys:",
    '{"category":"<cleaned category name>", "categoryFullQuery":"CategoryFull=<value>"}',
    "Only return valid JSON (no markdown).",
    `Original prompt: ${originalPrompt}`,
    `Detected fragment: ${detectedCategory}`,
    "Rules:",
    "- Remove leading command words like 'search', 'find', 'look up'.",
    "- Prefer underscores for separators and encode commas/spaces as underscores (e.g. 'Wem, Shropshire' -> 'Wem__Shropshire').",
    "- Return the cleaned category name (no surrounding quotes) as `category` and the exact Query Builder string as `categoryFullQuery`.",
  ].join("\n");

  const response = await chrome.runtime.sendMessage({
    action: "chatWithAI",
    prompt,
    provider,
    key,
    model,
    pageContext: { url: window.location.href, title: document.title },
  });

  if (!response?.success || !response.response) return null;
  const parsed = parsePlannerJson(response.response) || null;
  return parsed;
}

async function tryAiExpandConnectionTarget(target, prompt) {
  const options = await getChatOptions();
  if (!options?.allowAiFallback) return null;

  const { provider, key, model } = await getChatAiConfig();
  if (!key) return null;

  const aiPrompt = [
    "You are a helper for a genealogy extension.",
    "Given a user-provided target (name fragment) and the full user prompt, return a JSON object with one of these shapes:",
    '{"searchName":"<alternate search name>"} OR {"wtId":"Name-123"} OR {"none":true}',
    "Only return valid JSON (no markdown).",
    `Target: ${target}`,
    `Prompt: ${prompt}`,
  ].join("\n\n");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: aiPrompt,
      provider,
      key,
      model,
      pageContext: { url: window.location.href, title: document.title },
    });

    if (!response?.success || !response.response) return null;
    const parsed = parsePlannerJson(response.response) || null;
    return parsed;
  } catch (err) {
    console.debug("wbe: tryAiExpandConnectionTarget error", err);
    return null;
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  // Build a compact spouse display if spouse data is present
  let spouse = "";
  let spouseList = [];
  try {
    if (person.Spouses && Array.isArray(person.Spouses) && person.Spouses.length) {
      spouseList = person.Spouses.map((s) => {
        const first = String(s?.FirstName || s?.RealName || "").trim();
        const lnab = String(s?.LastNameAtBirth || s?.LastNameCurrent || s?.LastNameOther || "").trim();
        return {
          wtid: s?.Name || "",
          firstName: first,
          lnab,
          display: first || String(s?.RealName || s?.Name || "").trim(),
        };
      });
      const parts = spouseList.map((p) => [p.firstName, p.lnab].filter(Boolean).join(" ")).filter(Boolean);
      spouse = parts.join(", ");
    }
  } catch (e) {
    spouse = "";
  }

  return {
    displayName: options.displayName || person.RealName || person?.Derived?.ShortName || wtId,
    wtid: wtId,
    firstName: person.FirstName || "",
    middleName: person.MiddleName || "",
    lnab,
    lastNameCurrent,
    spouse,
    spouseList,
    degrees: options.degrees ?? "",
    gender: person.Gender || "",
    birth: normalizeKnownDate(person.BirthDate),
    death: normalizeKnownDate(person.DeathDate),
    birthLocation: person.BirthLocation || "",
    deathLocation: person.DeathLocation || "",
    surname,
  };
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

// Try to detect prompts asking for a spouse's bio and fetch it directly
async function tryHandlePersonBioPrompt(prompt) {
  console.info("wbe: tryHandlePersonBioPrompt called", { prompt });

  // Early intercept: catch prompts like "Search \"Wem, Shropshire\" category" or "Category:Wem, Shropshire"
  try {
    const detectCategoryEarly = (s) => {
      if (!s) return null;
      const str0 = String(s).trim();
      // quoted phrase before 'category'
      let m = str0.match(/['"“”'‘’]([^'"“”'‘’]+)['"“”'‘’]\s+category/i);
      if (m) return m[1].trim();
      // starts with 'search' ... 'category'
      m = str0.match(/^\s*search\s+['"“”'‘’]?(.*?)['"“”'‘’]?\s+category\??$/i);
      if (m) return m[1].trim();
      // Category:Name or category: Name
      m = str0.match(/\bcategory\s*[:\-]?\s*(.+)$/i);
      if (m) return m[1].trim();
      return null;
    };

    console.debug("wbe: early category detection start", { prompt });
    const earlyCategory = detectCategoryEarly(prompt);
    console.debug("wbe: early category detection result", { earlyCategory });
    if (earlyCategory) {
      // Deterministic CategoryFull construction: comma+space -> __, spaces -> _
      showChatShaky(`Looking up category "${earlyCategory}" via WT+...`);
      try {
        let chosenCategory = earlyCategory.replace(/^\s*Search\s+[:\-]?\s*/i, "").trim();
        let catVal = chosenCategory.replace(/,\s+/g, "__");
        catVal = catVal.replace(/\s+/g, "_");
        const qb = `CategoryFull=${catVal}`;
        const encodedQ = encodeURIComponent(qb);
        console.debug("wbe: WT+ early CategoryFull", { earlyCategory, catVal, qb, encodedQ });

        console.debug("wbe: wtAPIProfileSearch calling", { qb, encodedQ });
        let resp;
        try {
          resp = await wtAPIProfileSearch("ChatCategory", encodedQ, { maxProfiles: 500 });
        } catch (apiErr) {
          console.debug("wbe: wtAPIProfileSearch threw", { qb, apiErr });
          hideChatShaky();
          return `WT+ profile search failed for Category:${chosenCategory}. Error: ${apiErr?.message || apiErr}`;
        }
        const profiles = resp?.response?.profiles || [];
        console.debug("wbe: wtAPIProfileSearch response", {
          found: resp?.response?.found,
          profilesLength: profiles.length,
        });
        if (!profiles.length) {
          console.debug("wbe: wtAPIProfileSearch returned no profiles for early category", { qb, resp });
          hideChatShaky();
          return `I couldn't find any profiles for Category:${chosenCategory} via WT+.`;
        }

        const uniqueIds = [...new Set(profiles.map((p) => String(p)))].slice(0, 200);
        showChatShaky(`Fetching ${uniqueIds.length} profiles...`);
        const fields =
          "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Id,Name";
        const [, resultByKey, peopleData] = await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, uniqueIds, fields, {
          resolveRedirect: 1,
        });

        const people = uniqueIds.map((k) => WikiTreeAPI.lookupProfile(k, resultByKey, peopleData)).filter(Boolean);
        const rows = people.map((p) => mapApiPersonToStandardRow(p, { wtId: p?.Name }));

        const table = makeStandardProfileTable(`Category: ${chosenCategory}`, rows, [[0, "asc"]]);
        table.columns = (table.columns || []).filter((c) => !["degrees", "spouse", "spouseList"].includes(c.key));
        hideChatShaky();
        return {
          message: `Found ${rows.length} profiles in Category:${chosenCategory}`,
          table,
        };
      } catch (e) {
        hideChatShaky();
        console.debug("wbe: early category search failed", e);
        return `I couldn't complete the category lookup for "${earlyCategory}". Error: ${e?.message || e}`;
      }
    }
  } catch (err) {
    console.debug("wbe: early category detection error", err);
  }
  // Detect possessive relation patterns and handle nested possessives robustly.
  // Examples: "Ivy's parents", "Dona's bio", "bio of X", "Bethia's parents' bios".
  const str = String(prompt || "").trim();
  let targetRaw = null;
  let relationRaw = null;

  // First try: "bio(s) of X" or "profile of X"
  let m = str.match(/^\s*bio(?:graphy|s)?\s+of\s+(.+?)\??$/i) || str.match(/^\s*profile(?:s)?\s+of\s+(.+?)\??$/i);
  if (m) {
    targetRaw = (m[1] || "").trim();
    relationRaw = "self";
  }

  // Next: possessive forms like "X's Y" including nested possessives
  if (!targetRaw) {
    m = str.match(/^\s*([^']+?)'s\s+(.+?)\??$/i);
    if (m) {
      targetRaw = (m[1] || "").trim();
      // relation part may include nested possessives, e.g. "parents' bios"
      let relPart = (m[2] || "").trim();
      // remove any trailing possessive markers ("'" or "'s") and surrounding punctuation
      relPart = relPart
        .replace(/\b's\b/g, "")
        .replace(/\b'\b/g, "")
        .replace(/[\?\.!,;:]*/g, "")
        .trim();
      // relation is typically the first word (parents, spouse, bio, etc.)
      const relMatch = relPart.match(/^([a-zA-Z]+s?)\b/i);
      if (relMatch) {
        relationRaw = (relMatch[1] || "").trim().toLowerCase();
      }
      // special-case "X's bio(s)"
      if (!relationRaw && /\bbio(?:graphy|s)?\b/i.test(str)) {
        relationRaw = "self";
      }
    }
  }

  // Fallback: "X's bio(s)" simple pattern
  if (!targetRaw) {
    m = str.match(/^\s*(.+?)'s\s+bio(?:graphy|s)?\??$/i);
    if (m) {
      targetRaw = (m[1] || "").trim();
      relationRaw = "self";
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
      try {
        const popup = document.getElementById("wbe-shaky-tree-popup");
        if (popup) setHighestZIndex(popup);
      } catch (e) {
        /* ignore */
      }
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
        action: {
          label: "Show Bio",
          onClick: async () => {
            const w = await resolveToWTID(profile?.Name || personKey);
            showBioPopupForId(w).catch(() => {});
          },
        },
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
          entries.slice(0, 50),
          handleOpenFromBioList
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
                entries.slice(0, 50),
                handleOpenFromBioList
              ),
          },
        };
      }
      try {
        const resolvedWtid = await resolveToWTID(singleId);
        showBioPopupForId(resolvedWtid).catch(() => {});
        return {
          message: `Opened bio for ${entries[0].displayName || resolvedWtid}.`,
          action: {
            label: "Show Bio",
            onClick: async () => {
              const w = await resolveToWTID(singleId);
              showBioPopupForId(w).catch(() => {});
            },
          },
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
          entries.slice(0, 50),
          handleOpenFromBioList
        );
        await showTiledViaApi(ids.slice(0, 9)); // limit to 9 tiled popups by default
        return {
          message: `Opened ${Math.min(ids.length, 9)} bios for ${resolved?.RealName || resolved?.Name || personKey}.`,
          action: {
            label: "Open List",
            onClick: () =>
              showBioListPopup(
                `${relationType} bios for ${resolved?.RealName || resolved?.Name || personKey}`,
                entries.slice(0, 50),
                handleOpenFromBioList
              ),
          },
        };
      } catch (e) {
        console.error("wbe: tryHandlePersonBioPrompt failed to open tiled bios", e);
      }
    }

    // Default: show bio list popup and return a message/action
    showBioListPopup(
      `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
      entries.slice(0, 50),
      handleOpenFromBioList
    );
    return {
      message: `Found ${entries.length} ${relationType} for ${resolved?.RealName || resolved?.Name || personKey}.`,
      action: {
        label: "Open List",
        onClick: () =>
          showBioListPopup(
            `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
            entries.slice(0, 50),
            handleOpenFromBioList
          ),
      },
    };
  } catch (err) {
    hideChatShaky();
    console.error("wbe: tryHandlePersonBioPrompt error", err);
    return `Failed to lookup information for ${resolved?.RealName || resolved?.Name || targetRaw}.`;
  }
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
          <div class="chat-input-row" style="display:flex;align-items:flex-start;gap:8px;">
            <textarea id="${CHAT_INPUT_ID}" rows="2" placeholder="Ask something" style="flex:1;min-height:48px"></textarea>
            <div id="wbe-chat-mode-controls" style="display:none;margin-left:6px;font-size:12px;line-height:1">
              <label style="display:block;margin-bottom:6px;font-size:12px"><input type="radio" name="wbe-chat-mode" value="wt" style="width:14px;height:14px;margin-right:6px;vertical-align:middle" />WT</label>
              <label style="display:block;margin-bottom:6px;font-size:12px"><input type="radio" name="wbe-chat-mode" value="wtplus" checked style="width:14px;height:14px;margin-right:6px;vertical-align:middle" />WT+</label>
              <label style="display:block;margin-bottom:0;font-size:12px"><input type="radio" name="wbe-chat-mode" value="ai" style="width:14px;height:14px;margin-right:6px;vertical-align:middle" />AI</label>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start">
              <button id="${CHAT_SEND_ID}" type="button" class="small">Send</button>
            </div>
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
    // Show mode controls when user types a query starting with 'Search'
    $popup.find(`#${CHAT_INPUT_ID}`).on("input", (ev) => {
      try {
        const v = String($popup.find(`#${CHAT_INPUT_ID}`).val() || "").trimStart();
        const $m = $popup.find("#wbe-chat-mode-controls");
        if (/^search\b/i.test(v)) {
          $m.show();
        } else {
          $m.hide();
        }
      } catch (e) {
        /* ignore */
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
    // Rely on the global `.wbe-popup` click handler in `common.js` to
    // raise popups; avoid adding per-popup listeners here to prevent
    // duplicate invocations of `setHighestZIndex`.
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

  // Note: chat popup mousedown/click handlers are registered when the popup
  // is opened; avoid a delegated document-level handler to prevent duplicate
  // invocations of `setHighestZIndex`.

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
