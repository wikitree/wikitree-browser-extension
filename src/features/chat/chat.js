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
import { createChatBioHandlers } from "./chat_bio";
import { createChatHistoryHandlers } from "./chat_history";
import { createChatAiPlannerHandlers } from "./chat_planner";
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
import { isPlusDomain } from "../../core/pageType";
import { escapeHtml } from "../../core/lib/diff_utils";
import { buildPlusUrl } from "../wikitree_plus_helper/wikitree_plus_helper_url";
import { buildSuggestionsOptions } from "../wikitree_plus_helper/wikitree_plus_helper_suggestions";
import { buildSelectOptions } from "../wikitree_plus_helper/wikitree_plus_helper_utils";
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
  makeAncestorProfileTable,
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
const CHAT_WTPLUS_SUGGESTION_PICKER_ID = "wbe-chat-wtplus-suggestion-picker";
const CHAT_WTPLUS_SUGGESTION_SELECT_ID = "wbe-chat-wtplus-suggestion-select";
const CHAT_WTPLUS_MAGIC_WORDS_GROUPS = [
  { label: "Status", words: ["Open", "Unsourced", "Unconnected", "Orphan", "Notables"] },
  { label: "Tree", words: ["connected", "unlinked", "PublicTree", "PrivateTree"] },
  { label: "Gender", words: ["male", "female", "NoGender"] },
  {
    label: "Dates",
    words: ["B0", "D0", "pre1500", "B1850 (pattern)", "D1912 (pattern)", "1850s (pattern)", "20Cen (pattern)"],
  },
  { label: "Location", words: ["MissingLocation", "UnknownCountry", "UnknownRegion", "UnofficialLocation"] },
  { label: "Family", words: ["NoFather", "NoMother", "NoParents", "NoSpouses", "NoChildren"] },
  { label: "DNA", words: ["mtDNA", "yDNA", "auDNA", "noGEDMatchID", "noMitoyDNAID"] },
  { label: "Privacy", words: ["Private", "PrivatePB", "PrivatePT", "PrivatePBPT", "Public", "Guest"] },
  {
    label: "Management",
    words: [
      "ProjectManaged",
      "PPP",
      "NeverEdited",
      "ApprovedMerge",
      "PendingMerge",
      "UnmergedMatch",
      "GEDCOMJunk",
      "SourceJunk",
      "IsInWikiData",
    ],
  },
  {
    label: "Relation",
    words: [
      "relation=father",
      "relation=mother",
      "relation=parents",
      "relation=spouses",
      "relation=children",
      "relation=siblings",
      "relation=nuclear",
    ],
  },
  { label: "Stars", words: ["1star", "2stars", "3stars", "4stars", "5stars"] },
  {
    label: "Other",
    words: [
      "age42 (pattern)",
      "LastEdit2020 (pattern)",
      "Tree123 (pattern)",
      "fgcem1234 (pattern)",
      "fgmem1234 (pattern)",
    ],
  },
];
const CHAT_SESSION_KEY = `wbe_chat_history_${window.location.pathname}`;
const CHAT_LAST_CONNECTION_KEY = `${CHAT_SESSION_KEY}_lastConnection`;
const CHAT_LAST_STRUCTURED_KEY = `${CHAT_SESSION_KEY}_lastStructured`;
const CHAT_LAST_BIO_KEY = `${CHAT_SESSION_KEY}_lastBio`;
const CHAT_PERSON_MEMORY_KEY = `${CHAT_SESSION_KEY}_personMemory`;
const CHAT_MODE_STORAGE_KEY = "chat_mode";
const WBE_CHAT_APP_ID = "chat";
const CC7_CACHE_MS = 5 * 60 * 1000;
const CHAT_RESULTS_POPUP_ID = "wbe-chat-results-popup";
const CHAT_RESULTS_TABLE_ID = "wbe-chat-results-table";
let chatResultsCounter = 0;
const CHAT_SHOW_MORE_TOKEN_PREFIX = "__WBE_SHOW_MORE__:";
const AUTO_OPEN_TABLE_MIN_ROWS = 8;
const CHAT_AI_HISTORY_MAX_MESSAGES = 12;
const CHAT_AI_MESSAGE_MAX_CHARS = 500;
const CHAT_PERSISTED_STRUCTURED_ROWS_MAX = 250;
const CHAT_PERSON_MEMORY_MAX_ENTRIES = 100;
const CHAT_PERSON_MEMORY_AI_CONTEXT_MAX = 10;
const CHAT_APPS_LOGIN_HINT = "Log in to the apps server for better results. Use the Apps Login button on this page.";
const RELATION_PERSON_FIELDS =
  "Id,Name,Gender,RealName,Derived.ShortName,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation";
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
let wtPlusSuggestionOptionsHtml = "";
let resolvedPeopleByWtId = {};
let resolvedPersonAliasToWtId = {};
let resolvedPersonOrderCounter = 0;
let resolvedPersonMemoryLoaded = false;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePersonMemoryToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAliasCandidates(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return [];
  }

  const candidates = new Set();
  candidates.add(normalized);
  normalized
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
    .filter((part) => part.length >= 3)
    .forEach((part) => candidates.add(part));

  return Array.from(candidates);
}

function persistResolvedPersonMemory() {
  try {
    const payload = {
      peopleByWtId: resolvedPeopleByWtId,
      aliasToWtId: resolvedPersonAliasToWtId,
      orderCounter: resolvedPersonOrderCounter,
    };
    sessionStorage.setItem(CHAT_PERSON_MEMORY_KEY, JSON.stringify(payload));
  } catch (error) {
    console.debug("wbe: failed to persist chat person memory", { error });
  }
}

function loadResolvedPersonMemory() {
  resolvedPeopleByWtId = {};
  resolvedPersonAliasToWtId = {};
  resolvedPersonOrderCounter = 0;

  try {
    const raw = sessionStorage.getItem(CHAT_PERSON_MEMORY_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    const peopleByWtId = parsed?.peopleByWtId;
    const aliasToWtId = parsed?.aliasToWtId;
    const orderCounter = Number(parsed?.orderCounter);

    if (peopleByWtId && typeof peopleByWtId === "object") {
      resolvedPeopleByWtId = peopleByWtId;
    }
    if (aliasToWtId && typeof aliasToWtId === "object") {
      resolvedPersonAliasToWtId = aliasToWtId;
    }
    if (Number.isFinite(orderCounter) && orderCounter >= 0) {
      resolvedPersonOrderCounter = orderCounter;
    }
  } catch (error) {
    console.debug("wbe: failed to load chat person memory", { error });
  }
}

function ensureResolvedPersonMemoryLoaded() {
  if (resolvedPersonMemoryLoaded) {
    return;
  }
  loadResolvedPersonMemory();
  resolvedPersonMemoryLoaded = true;
}

function clearResolvedPersonMemory() {
  resolvedPeopleByWtId = {};
  resolvedPersonAliasToWtId = {};
  resolvedPersonOrderCounter = 0;
  try {
    sessionStorage.removeItem(CHAT_PERSON_MEMORY_KEY);
  } catch (error) {
    /* ignore */
  }
}

function rememberResolvedPerson({ wtId, displayName, aliases = [] }) {
  ensureResolvedPersonMemoryLoaded();

  const normalizedWtId = String(wtId || "").trim();
  if (!normalizedWtId || !/-\d+$/i.test(normalizedWtId)) {
    return;
  }

  const existing = resolvedPeopleByWtId[normalizedWtId] || {
    wtId: normalizedWtId,
    displayName: "",
    aliases: [],
    seenOrder: 0,
  };

  const cleanedDisplay = String(displayName || "").trim();
  if (cleanedDisplay && (!existing.displayName || existing.displayName.length < cleanedDisplay.length)) {
    existing.displayName = cleanedDisplay;
  }
  if (!existing.displayName) {
    existing.displayName = normalizedWtId;
  }

  const mergedAliases = new Set(Array.isArray(existing.aliases) ? existing.aliases : []);
  extractAliasCandidates(existing.displayName).forEach((alias) => mergedAliases.add(alias));
  extractAliasCandidates(normalizedWtId).forEach((alias) => mergedAliases.add(alias));
  (Array.isArray(aliases) ? aliases : []).forEach((alias) => {
    extractAliasCandidates(alias).forEach((candidate) => mergedAliases.add(candidate));
  });

  existing.aliases = Array.from(mergedAliases).slice(0, 25);
  existing.seenOrder = ++resolvedPersonOrderCounter;
  resolvedPeopleByWtId[normalizedWtId] = existing;

  existing.aliases.forEach((alias) => {
    const normalizedAlias = normalizePersonMemoryToken(alias);
    if (!normalizedAlias || normalizedAlias.length < 3) {
      return;
    }
    resolvedPersonAliasToWtId[normalizedAlias] = normalizedWtId;
  });

  const entries = Object.values(resolvedPeopleByWtId).sort((a, b) => Number(b?.seenOrder || 0) - Number(a?.seenOrder || 0));
  if (entries.length > CHAT_PERSON_MEMORY_MAX_ENTRIES) {
    const keep = new Set(entries.slice(0, CHAT_PERSON_MEMORY_MAX_ENTRIES).map((entry) => entry.wtId));
    resolvedPeopleByWtId = entries
      .filter((entry) => keep.has(entry.wtId))
      .reduce((acc, entry) => {
        acc[entry.wtId] = entry;
        return acc;
      }, {});
    resolvedPersonAliasToWtId = Object.entries(resolvedPersonAliasToWtId).reduce((acc, [alias, mappedWtId]) => {
      if (keep.has(mappedWtId)) {
        acc[alias] = mappedWtId;
      }
      return acc;
    }, {});
  }

  persistResolvedPersonMemory();
}

function rememberResolvedPersonFromMatch(person, aliases = []) {
  const wtId = String(person?.Name || person?.wtId || "").trim();
  const displayName =
    person?.RealName || person?.displayName || person?.Derived?.ShortName || person?.FirstName || person?.Name || "";
  if (!wtId) {
    return;
  }

  rememberResolvedPerson({
    wtId,
    displayName,
    aliases,
  });
}

function rememberResolvedPeopleFromMessage(text) {
  const sourceText = String(text || "");
  if (!sourceText) {
    return;
  }

  const pattern = /([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{1,60}?)\s*\(([A-Za-z][A-Za-z0-9_-]+-\d{1,7})\)/g;
  let match;
  while ((match = pattern.exec(sourceText)) !== null) {
    const displayName = String(match[1] || "").trim();
    const wtId = String(match[2] || "").trim();
    if (!wtId) {
      continue;
    }
    rememberResolvedPerson({ wtId, displayName, aliases: [displayName] });
  }
}

function rememberResolvedPeopleFromTable(table) {
  if (!Array.isArray(table?.rows)) {
    return;
  }

  table.rows.slice(0, 25).forEach((row) => {
    const wtId = String(row?.wtid || row?.WTID || row?.Name || "").trim();
    const displayName = String(row?.displayName || row?.name || "").trim();
    if (!wtId || !/-\d+$/i.test(wtId)) {
      return;
    }
    rememberResolvedPerson({ wtId, displayName, aliases: [displayName] });
  });
}

function resolvePromptAlias(prompt) {
  ensureResolvedPersonMemoryLoaded();

  const normalizedPrompt = ` ${normalizePersonMemoryToken(prompt)} `;
  if (!normalizedPrompt.trim()) {
    return null;
  }

  let bestAlias = "";
  let bestWtId = "";
  Object.entries(resolvedPersonAliasToWtId).forEach(([aliasKey, wtId]) => {
    if (!aliasKey || aliasKey.length < 3 || !wtId) {
      return;
    }
    if (!normalizedPrompt.includes(` ${aliasKey} `)) {
      return;
    }
    if (aliasKey.length > bestAlias.length) {
      bestAlias = aliasKey;
      bestWtId = wtId;
    }
  });

  if (!bestWtId) {
    return null;
  }

  const person = resolvedPeopleByWtId[bestWtId];
  if (!person) {
    return null;
  }

  return {
    aliasKey: bestAlias,
    person,
  };
}

function applyResolvedPersonAliasesToPrompt(prompt) {
  const aliasResolution = resolvePromptAlias(prompt);
  if (!aliasResolution?.person) {
    return { prompt, changed: false, matchedAlias: "", person: null };
  }

  const person = aliasResolution.person;
  const wtId = String(person.wtId || "").trim();
  const replacement = String(person.displayName || "").trim();
  if (!wtId || !replacement) {
    return { prompt, changed: false, matchedAlias: "", person: null };
  }

  const sourcePrompt = String(prompt || "");
  if (!sourcePrompt.trim()) {
    return { prompt: sourcePrompt, changed: false, matchedAlias: "", person: null };
  }

  if (new RegExp(`\\b${escapeRegExp(wtId)}\\b`, "i").test(sourcePrompt)) {
    return { prompt: sourcePrompt, changed: false, matchedAlias: "", person };
  }

  const aliasVariants = Array.isArray(person.aliases) ? person.aliases.slice() : [];
  aliasVariants.sort((left, right) => String(right || "").length - String(left || "").length);

  for (const alias of aliasVariants) {
    const cleanedAlias = String(alias || "").trim();
    if (!cleanedAlias || cleanedAlias.length < 3) {
      continue;
    }
    const aliasRegex = new RegExp(`\\b${escapeRegExp(cleanedAlias)}\\b`, "i");
    if (!aliasRegex.test(sourcePrompt)) {
      continue;
    }
    const nextPrompt = sourcePrompt.replace(aliasRegex, replacement);
    if (nextPrompt !== sourcePrompt) {
      return { prompt: nextPrompt, changed: true, matchedAlias: cleanedAlias, person };
    }
  }

  return { prompt: sourcePrompt, changed: false, matchedAlias: "", person };
}

function buildResolvedPeopleContextForAi() {
  ensureResolvedPersonMemoryLoaded();

  const entries = Object.values(resolvedPeopleByWtId)
    .sort((a, b) => Number(b?.seenOrder || 0) - Number(a?.seenOrder || 0))
    .slice(0, CHAT_PERSON_MEMORY_AI_CONTEXT_MAX);
  if (!entries.length) {
    return "";
  }

  const lines = entries.map((entry) => {
    const displayName = String(entry?.displayName || entry?.wtId || "").trim();
    const wtId = String(entry?.wtId || "").trim();
    const aliases = (Array.isArray(entry?.aliases) ? entry.aliases : [])
      .filter((alias) => alias && normalizePersonMemoryToken(alias) !== normalizePersonMemoryToken(displayName))
      .slice(0, 4)
      .join(", ");
    return aliases
      ? `- ${displayName} (${wtId}); aliases: ${aliases}`
      : `- ${displayName} (${wtId})`;
  });

  return `Known people from this chat:\n${lines.join("\n")}`;
}

function maybeCoerceFollowupConnectionPrompt(prompt) {
  const raw = String(prompt || "").trim();
  if (!raw) {
    return { prompt: raw, changed: false, reason: "" };
  }

  if (/\b(connection|distance|related|relationship|cousin|ancestor|descendant|spouse|siblings?)\b/i.test(raw)) {
    return { prompt: raw, changed: false, reason: "" };
  }

  const andMatch = raw.match(/^\s*(.+?)\s+and\s+(.+?)\s*\??\s*$/i);
  if (!andMatch?.[1] || !andMatch?.[2]) {
    return { prompt: raw, changed: false, reason: "" };
  }

  const left = andMatch[1].trim();
  const right = andMatch[2].trim();
  if (!left || !right) {
    return { prompt: raw, changed: false, reason: "" };
  }

  const leftAlias = resolvePromptAlias(left);
  const rightAlias = resolvePromptAlias(right);
  const leftResolved = applyResolvedPersonAliasesToPrompt(left);
  const rightResolved = applyResolvedPersonAliasesToPrompt(right);
  const leftSource = String(leftAlias?.person?.wtId || leftResolved.prompt || left).trim();
  const rightTarget = String(rightAlias?.person?.wtId || rightResolved.prompt || right).trim();

  const hasRememberedSide = Boolean(leftAlias?.person?.wtId || rightAlias?.person?.wtId);
  if (!hasRememberedSide && !leftResolved.changed && !rightResolved.changed) {
    return { prompt: raw, changed: false, reason: "" };
  }

  return {
    prompt: `connection from ${leftSource} to ${rightTarget}`,
    changed: true,
    reason: hasRememberedSide ? "followup_and_pair_with_memory" : "followup_and_pair",
  };
}

function getWtPlusSuggestionOptionsHtml() {
  if (wtPlusSuggestionOptionsHtml) {
    return wtPlusSuggestionOptionsHtml;
  }

  try {
    wtPlusSuggestionOptionsHtml = buildSelectOptions(buildSuggestionsOptions(), "", true);
  } catch (error) {
    console.info("wbe: unable to build WT+ suggestion options", { error });
    wtPlusSuggestionOptionsHtml = '<option value=""></option>';
  }

  return wtPlusSuggestionOptionsHtml;
}

function isWtPlusSuggestionPrompt(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return false;
  }

  return /(?:^|\s)(?:suggestions?|sug\w*|dbe\w*)\b/i.test(normalized);
}

function parseSuggestionNumberFromPrompt(prompt) {
  const original = String(prompt || "");
  if (!original.trim()) {
    return original;
  }

  // Match patterns like "dbe803", "sug803", "suggestion803", "suggestions803"
  // with optional "=" like "dbe=803", "sug=803"
  const compactMatch = /(?:^|\s)(suggestions?|sug\w*|dbe)(?:\s*=?\s*)(\d+)\b/i.exec(original);
  if (compactMatch) {
    const [fullMatch, keyword, number] = compactMatch;
    // Replace the matched pattern with normalized format
    return original.replace(fullMatch, (match) => {
      // If match starts with whitespace, preserve the leading space
      if (fullMatch[0] === " " || /\s/.test(fullMatch[0])) {
        return ` Suggestions=${number}`;
      }
      return `Suggestions=${number}`;
    });
  }

  return original;
}

function upsertSuggestionInPrompt(prompt, suggestionNumber) {
  const nextSuggestionTerm = `Suggestions=${suggestionNumber}`;
  const original = String(prompt || "");

  if (!original.trim()) {
    return nextSuggestionTerm;
  }

  // Replace existing Suggestions=NNN format
  if (/\bSuggestions\s*=\s*\d+\b/i.test(original)) {
    return original.replace(/\bSuggestions\s*=\s*\d+\b/i, nextSuggestionTerm);
  }

  // Replace trigger keywords: "suggestion(s)", "sug*", or "dbe*"
  const triggerPattern = /(?:^|\s)(?:suggestions?|sug\w*|dbe\w*)\b/i;
  if (triggerPattern.test(original)) {
    return original.replace(triggerPattern, (match) => {
      // If match starts with whitespace (not at start of string), preserve the space
      if (match[0] === " " || /\s/.test(match[0])) {
        return " " + nextSuggestionTerm;
      }
      return nextSuggestionTerm;
    });
  }

  return `${original.trim()} ${nextSuggestionTerm}`.trim();
}

function updateWtPlusSuggestionPickerState($popup) {
  const $picker = $popup.find(`#${CHAT_WTPLUS_SUGGESTION_PICKER_ID}`);
  if (!$picker.length) {
    return;
  }

  const currentMode = getCurrentChatMode();
  const inputValue = String($popup.find(`#${CHAT_INPUT_ID}`).val() || "");
  const shouldShow = currentMode === "wtplus" && isWtPlusSuggestionPrompt(inputValue);
  $picker.toggle(shouldShow);
}

function bindWtPlusSuggestionPicker($popup) {
  const $input = $popup.find(`#${CHAT_INPUT_ID}`);
  const $picker = $popup.find(`#${CHAT_WTPLUS_SUGGESTION_PICKER_ID}`);
  const $select = $popup.find(`#${CHAT_WTPLUS_SUGGESTION_SELECT_ID}`);
  if (!$input.length || !$picker.length || !$select.length) {
    return;
  }

  $select.html(getWtPlusSuggestionOptionsHtml());

  $input.on("input", () => {
    updateWtPlusSuggestionPickerState($popup);
  });

  $popup.find('input[name="wbe-chat-mode"]').on("change", () => {
    updateWtPlusSuggestionPickerState($popup);
  });

  $select.on("change", () => {
    const selectedValue = String($select.val() || "").trim();
    const suggestionNumberMatch = selectedValue.match(/(\d+)/);
    const suggestionNumber = suggestionNumberMatch?.[1] || "";
    if (!suggestionNumber) {
      return;
    }

    const currentPrompt = String($input.val() || "");
    const nextPrompt = upsertSuggestionInPrompt(currentPrompt, suggestionNumber);
    $input.val(nextPrompt);
    updateWtPlusSuggestionPickerState($popup);
    $input.trigger("focus");
  });

  updateWtPlusSuggestionPickerState($popup);
}

function refreshWtPlusSuggestionPickerForCurrentPopup() {
  const $popup = $(`#${CHAT_POPUP_ID}`);
  if (!$popup.length) {
    return;
  }

  updateWtPlusSuggestionPickerState($popup);
}

function getCurrentChatMode() {
  const checked = document.querySelector('input[name="wbe-chat-mode"]:checked');
  return String(checked?.value || "wt")
    .trim()
    .toLowerCase();
}

function normalizeChatMode(mode) {
  const normalized = String(mode || "")
    .trim()
    .toLowerCase();
  return ["wt", "wtplus", "ai"].includes(normalized) ? normalized : "wt";
}

function applyChatModeToPopup($popup, mode) {
  const normalizedMode = normalizeChatMode(mode);
  const selector = `input[name="wbe-chat-mode"][value="${normalizedMode}"]`;
  const radio = $popup.find(selector).get(0);
  if (radio) {
    radio.checked = true;
  }
}

function getStoredChatModeFromLocalStorage() {
  try {
    return normalizeChatMode(window.localStorage.getItem(CHAT_MODE_STORAGE_KEY) || "wt");
  } catch (error) {
    return "wt";
  }
}

function persistChatMode(mode) {
  const normalizedMode = normalizeChatMode(mode);

  try {
    window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, normalizedMode);
  } catch (error) {
    console.info("wbe: unable to persist chat mode to localStorage", { error });
  }

  try {
    chrome.storage.local.set({ [CHAT_MODE_STORAGE_KEY]: normalizedMode });
  } catch (error) {
    console.info("wbe: unable to persist chat mode", { error });
  }
}

function restoreChatMode($popup) {
  applyChatModeToPopup($popup, getStoredChatModeFromLocalStorage());

  try {
    chrome.storage.local.get([CHAT_MODE_STORAGE_KEY], (stored) => {
      if (chrome.runtime?.lastError) {
        return;
      }
      const popupEl = $popup?.get?.(0);
      if (!popupEl || !document.body.contains(popupEl)) {
        return;
      }
      const restoredMode = normalizeChatMode(stored?.[CHAT_MODE_STORAGE_KEY] || getStoredChatModeFromLocalStorage());
      applyChatModeToPopup($popup, restoredMode);
      try {
        window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, restoredMode);
      } catch (error) {
        console.info("wbe: unable to mirror restored chat mode to localStorage", { error });
      }
    });
  } catch (error) {
    console.info("wbe: unable to restore chat mode", { error });
  }
}

function raiseChatActionPopupsAboveChat() {
  const popupSelectors = [
    "#wbe-connections-popup",
    "#wbe-bio-popup",
    "#wbe-bio-list-popup",
    "#wbe-spouses-popup",
    '[id^="wbe-bio-popup-"]',
    ".chat-results-popup",
  ];

  const raiseOpenPopups = () => {
    popupSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        try {
          setHighestZIndex(element);
        } catch (error) {
          /* ignore */
        }
      });
    });
  };

  window.setTimeout(raiseOpenPopups, 40);
  window.setTimeout(raiseOpenPopups, 120);
}

function openWtPlusQuery(query, searchType = "text", suggestionId = "", suggestionOptions = {}) {
  const url = buildPlusUrl(query, searchType, true, suggestionId, suggestionOptions || {});
  if (isPlusDomain) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

const {
  appendMessage,
  clearHistory,
  hasAppsLoginHintAlready,
  isRetryPrompt,
  loadHistory,
  renderHistory,
  shouldEscalateLocalFailureToAi,
} = createChatHistoryHandlers({
  chatMessagesId: CHAT_MESSAGES_ID,
  chatSessionKey: CHAT_SESSION_KEY,
  chatLastConnectionKey: CHAT_LAST_CONNECTION_KEY,
  chatLastStructuredKey: CHAT_LAST_STRUCTURED_KEY,
  chatLastBioKey: CHAT_LAST_BIO_KEY,
  chatResultsPopupId: CHAT_RESULTS_POPUP_ID,
  chatResultsTableId: CHAT_RESULTS_TABLE_ID,
  getChatHistory: () => chatHistory,
  setChatHistory: (value) => {
    chatHistory = value;
  },
  getLastNonRetryUserPrompt: () => lastNonRetryUserPrompt,
  setLastNonRetryUserPrompt: (value) => {
    lastNonRetryUserPrompt = value;
  },
  getLastConnectionPopupResult: () => lastConnectionPopupResult,
  setLastConnectionPopupResult: (value) => {
    lastConnectionPopupResult = value;
  },
  getLastStructuredResult: () => lastStructuredResult,
  setLastStructuredResult: (value) => {
    lastStructuredResult = value;
  },
  getLastBioPopupId: () => lastBioPopupId,
  setLastBioPopupState: ({ id, profile }) => {
    lastBioPopupId = id;
    lastBioPopupProfile = profile;
  },
  toggleConnectionsPopup: () => toggleConnectionsPopup(),
  openResultsTable: (result, opts) => openResultsTable(result, opts),
  resolveToWTID: (candidate) => resolveToWTID(candidate),
  showBioPopupForId: (wtid) => showBioPopupForId(wtid),
  openWtPlusQuery,
  afterActionClick: () => raiseChatActionPopupsAboveChat(),
  resetTransientState: () => {
    pendingDisambiguationContext = null;
    lastConnectionCandidates = [];
    lastConnectionRankedMatches = [];
    clearResolvedPersonMemory();
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

const {
  parsePlannerJson,
  tryHandleAiPlannedIntent,
  tryAiDisambiguateConnectionTarget,
  tryAiParseCategoryName,
  tryAiExpandConnectionTarget,
} = createChatAiPlannerHandlers({
  getChatAiConfig,
  getChatOptions,
  buildRecentConversationForAi,
  ChatIntent,
  executeRoutedIntent: (routed, prompt) => executeRoutedIntent(routed, prompt),
});

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
    onResolvedPerson: (person, aliases = []) => {
      rememberResolvedPersonFromMatch(person, aliases);
    },
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
  makeAncestorProfileTable,
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

const {
  showBioPopupForId,
  listSpousesForId,
  dumpProfileForId,
  showTiledViaApi,
  handleOpenFromBioList,
  fetchSiblingIdsForId,
  fetchChildrenIdsForId,
  fetchParentIds,
  tryHandleSpouseBioIntent,
  tryHandlePersonBioPrompt,
} = createChatBioHandlers({
  WBE_CHAT_APP_ID,
  CHAT_LAST_BIO_KEY,
  wtAPIProfileSearch,
  WikiTreeAPI,
  getProfilePersonInfo,
  getProfileRootPerson,
  setHighestZIndex,
  escapeHtml,
  setPopupPositionAndSize,
  showChatShaky,
  hideChatShaky,
  sanitizeHtmlForPopup,
  extractProfileBios,
  showBioListPopup,
  showTiledBioPopups,
  addBioButton,
  appendMessage,
  resolveToWTID,
  fetchProfilesForIds,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  resolveConnectionTargetPerson,
  hasAnyApiKey,
  buildRecentConversationForAi,
  getLastStructuredResult: () => lastStructuredResult,
  getLastConnectionCandidates: () => lastConnectionCandidates,
  findSpouseProfileIdsFromDOM,
  findChildrenProfileIdsFromDOM,
  findSiblingProfileIdsFromDOM,
  findParentProfileIdsFromDOM,
  setLastBioPopupState: ({ id, profile }) => {
    lastBioPopupId = id;
    lastBioPopupProfile = profile;
  },
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
  fetchParentIds,
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
  makeAncestorProfileTable,
  makeAncestorAgeTable,
  withDerivedRowFields,
  normalizeText,
  normalizeNumberForSort,
  normalizeSurname,
  computeAgeAtDeathYears,
  isPartialDate,
  getCc7ProfilesForUser,
  getLastStructuredResult: () => lastStructuredResult,
  getCurrentChatMode,
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

// Bio workflow handlers now live in `chat_bio.js`.

// `closeBioPopup` and `addBioButton` are provided by `ui.js`.

window.wbeShowBioPopup = showBioPopupForId;
window.wbeListSpouses = listSpousesForId;
window.wbeFindSpouseLinks = findSpouseProfileIdsFromDOM;
window.wbeFindChildLinks = findChildrenProfileIdsFromDOM;
window.wbeFindSiblingLinks = findSiblingProfileIdsFromDOM;
window.wbeFindParentLinks = findParentProfileIdsFromDOM;
window.wbeDumpProfile = dumpProfileForId;
window.wbeShowBioList = showBioListPopup;
window.wbeShowTiled = showTiledViaApi;

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

  rememberResolvedPeopleFromMessage(result.message);

  if (Object.prototype.hasOwnProperty.call(result, "table")) {
    lastStructuredResult = result.table || null;
    rememberResolvedPeopleFromTable(result.table);
    try {
      const rowCount = Array.isArray(lastStructuredResult?.rows) ? lastStructuredResult.rows.length : 0;
      if (rowCount > 0 && rowCount <= CHAT_PERSISTED_STRUCTURED_ROWS_MAX) {
        sessionStorage.setItem(CHAT_LAST_STRUCTURED_KEY, JSON.stringify(lastStructuredResult));
      } else {
        sessionStorage.removeItem(CHAT_LAST_STRUCTURED_KEY);
      }
    } catch (e) {
      /* ignore */
    }
  }

  // If the result includes a table, capture a snapshot of the table on the
  // action object so it can be persisted with the chat history. This avoids
  // later Table buttons all referencing the global `lastStructuredResult`.
  const explicitActions = (Array.isArray(result.actions) ? result.actions : result.action ? [result.action] : [])
    .filter(Boolean)
    .map((action) => {
      if (typeof action?.onClick === "function") {
        return action;
      }

      if ((action?.actionType === "wtplus-open" || action?.label === "Open in WT+") && action?.wtPlusQuery) {
        return {
          ...action,
          onClick: () =>
            openWtPlusQuery(
              action.wtPlusQuery,
              action.wtPlusSearchType || "text",
              action.wtPlusSuggestionId || "",
              action.wtPlusSuggestionOptions || {}
            ),
        };
      }

      return action;
    });
  const hasTableAction = explicitActions.some(
    (action) => action?.actionType === "table" || action?.label === "Table" || action?.table
  );
  const actions = [
    ...(result.table && !hasTableAction
      ? [
          {
            label: "Table",
            actionType: "table",
            table: result.table,
            onClick: () => openResultsTable(result.table),
          },
        ]
      : []),
    ...explicitActions,
  ];

  appendMessage("assistant", result.message, { actions, inlineMore: result.inlineMore || null });

  if (result.showMagicWordsRef) {
    const $messages = $(`#${CHAT_MESSAGES_ID}`);
    const $lastMsg = $messages.find(".chat-message").last();
    if ($lastMsg.length) {
      const optgroupsHtml = CHAT_WTPLUS_MAGIC_WORDS_GROUPS.map(
        ({ label, words }) =>
          `<optgroup label="${label}">${words.map((w) => `<option value="${w}">${w}</option>`).join("")}</optgroup>`
      ).join("");
      const $widget = $(`<div class="chat-wtplus-magic-ref">
          <label class="chat-wtplus-magic-ref-label">Magic Words reference</label>
          <select class="chat-wtplus-magic-ref-select">
            <option value="" disabled selected>— browse magic words —</option>
            ${optgroupsHtml}
          </select>
        </div>`);
      $widget.find("select").on("change", function () {
        const raw = String($(this).val() || "");
        const word = raw.replace(/\s*\(pattern\)\s*$/i, "");
        if (!word) return;
        const $input = $(`#${CHAT_INPUT_ID}`);
        const current = String($input.val() || "").trimEnd();
        $input.val(current ? `${current} ${word}` : word);
        $input.trigger("input").focus();
        $(this).val("").prop("selectedIndex", 0);
      });
      $lastMsg.append($widget);
    }
  }

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

  // Normalize compact suggestion formats like "dbe803" to "Suggestions=803"
  const normalizedPrompt = parseSuggestionNumberFromPrompt(rawPrompt);

  let prompt = normalizedPrompt;
  const retryRequested = isRetryPrompt(rawPrompt);

  if (retryRequested) {
    if (!lastNonRetryUserPrompt) {
      appendMessage("assistant", "No earlier request to retry yet. Ask a question first.");
      $input.val("");
      refreshWtPlusSuggestionPickerForCurrentPopup();
      return;
    }
    prompt = lastNonRetryUserPrompt;
    appendMessage("assistant", `Retrying your previous request: ${prompt}`, { shouldPersist: false });
  }

  ensureResolvedPersonMemoryLoaded();
  const aliasRewrite = applyResolvedPersonAliasesToPrompt(prompt);
  if (aliasRewrite.changed) {
    prompt = aliasRewrite.prompt;
    console.debug("wbe: resolved prompt alias from chat memory", {
      originalPrompt: normalizedPrompt,
      rewrittenPrompt: prompt,
      matchedAlias: aliasRewrite.matchedAlias,
      resolvedWtId: aliasRewrite.person?.wtId || "",
    });
  }
  const coercedConnectionPrompt = maybeCoerceFollowupConnectionPrompt(prompt);
  if (coercedConnectionPrompt.changed) {
    prompt = coercedConnectionPrompt.prompt;
    console.debug("wbe: coerced follow-up prompt to connection lookup", {
      originalPrompt: normalizedPrompt,
      rewrittenPrompt: prompt,
      reason: coercedConnectionPrompt.reason,
    });
  }

  appendMessage("user", normalizedPrompt);
  if (!retryRequested) {
    lastNonRetryUserPrompt = rawPrompt;
  }
  $input.val("");
  refreshWtPlusSuggestionPickerForCurrentPopup();
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
        ChatIntent,
        routeChatPrompt,
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
    const deterministicIntentSet = new Set([
      ChatIntent.CC7_LOCATION_FILTER,
      ChatIntent.CC_SUMMARY,
      ChatIntent.RELATION_COUNT,
      ChatIntent.CONNECTION_LOOKUP,
      ChatIntent.PROFILE_FAMILY_CONNECTION,
      ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH,
      ChatIntent.PERSON_AGE_AT_DEATH,
      ChatIntent.ANCESTOR_LIST,
      ChatIntent.DESCENDANT_LIST,
      ChatIntent.SPOUSE_LIST,
      ChatIntent.SPOUSE_BIO,
      ChatIntent.LAST_RESULT_OPERATION,
    ]);
    const shouldPreferDeterministicRoute = deterministicIntentSet.has(routed?.intent);
    if (chatOptions.allowAiFallback && !shouldPreferDeterministicRoute) {
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
    const resolvedPeopleContext = buildResolvedPeopleContextForAi();
    let profileContextText = null;
    try {
      const textPrompt = String(prompt || "");
      const rememberedPromptPerson = resolvePromptAlias(textPrompt)?.person || null;
      // Extract capitalized name candidates
      const nameCandidates = textPrompt.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g) || [];
      console.log("wbe: extracted name candidates from prompt", { nameCandidates, prompt: textPrompt });
      // 1) Direct profile key like Beacall-156
      let profileKeyMatch = textPrompt.match(/\b([A-Za-z][A-Za-z0-9_\-]+-\d{1,6})\b/);
      let profileKey = profileKeyMatch?.[1];
      console.log("wbe: direct profile key match", { profileKey });
      if (!profileKey && rememberedPromptPerson?.wtId) {
        profileKey = rememberedPromptPerson.wtId;
      }
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
              rememberResolvedPersonFromMatch(matches[0], [nameCandidate]);
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
          const rawProfileJson = profile ? JSON.stringify(profile, null, 2) : "";
          rememberResolvedPersonFromMatch(profile || { Name: profileKey }, [profileKey]);
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
            rawProfileJson ? "GETPROFILE_JSON:" : "",
            rawProfileJson,
          ]
            .filter(Boolean)
            .join("\n\n");
          console.log("wbe: included profile context for AI", {
            profileKey,
            page_name,
            bioLength: bio.length,
            rawProfileLength: rawProfileJson.length,
          });
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
      resolvedPeopleContext,
      localFailureForAi ? `Local tool attempt failed with: ${localFailureForAi}` : "",
    ];
    if (profileContextText) aiPromptParts.push(profileContextText);
    aiPromptParts.push(`Current user request: ${prompt}`);

    const aiPrompt = aiPromptParts.filter(Boolean).join("\n\n");
    console.debug("wbe: general AI fallback outbound prompt", {
      prompt,
      aiPrompt,
      hasProfileBio: aiPrompt.includes("BIO:"),
      hasProfileContext: Boolean(profileContextText),
      promptLength: aiPrompt.length,
    });

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: aiPrompt,
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
      rememberResolvedPeopleFromMessage(response.response || "");
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

function normalizeKnownDecade(value) {
  return value && value !== "unknown" ? String(value) : "";
}

function mapApiPersonToStandardRow(person = {}, options = {}) {
  const wtId = String(options.wtId ?? person.Name ?? "").trim();
  const privateLongName =
    person.LongNamePrivate ||
    person?.Derived?.LongNamePrivate ||
    person?.Derived?.BirthNamePrivate ||
    person.BirthNamePrivate ||
    "";
  const isPrivatePlaceholder = Number(person?.Id) < 0 && !wtId;
  const lnab = person.LastNameAtBirth || "";
  const lastNameCurrent = person.LastNameCurrent || "";
  const surnamePreference = options.surnamePreference === "currentFirst" ? "currentFirst" : "birthFirst";
  const surname = surnamePreference === "currentFirst" ? lastNameCurrent || lnab || "" : lnab || lastNameCurrent || "";
  const birthValue = normalizeKnownDate(person.BirthDate) || normalizeKnownDecade(person.BirthDateDecade);
  const deathValue = normalizeKnownDate(person.DeathDate) || normalizeKnownDecade(person.DeathDateDecade);
  const displayName = isPrivatePlaceholder
    ? "Private"
    : options.displayName || person.RealName || person?.Derived?.ShortName || privateLongName || wtId;
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
    displayName,
    wtid: wtId,
    firstName: person.FirstName || (isPrivatePlaceholder ? displayName : ""),
    middleName: person.MiddleName || "",
    lnab,
    lastNameCurrent,
    spouse,
    spouseList,
    degrees: options.degrees ?? "",
    gender: person.Gender || "",
    birth: birthValue,
    death: deathValue,
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

function isNonPersonPageName(value) {
  const name = String(value || "").trim();
  return !name || name.includes(":");
}

function getProfileRootPerson() {
  const person = getProfilePersonInfo();
  if (!person?.Name || isNonPersonPageName(person.Name)) {
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

function bindOutsideClickToCloseChat() {
  const chatPopupSurfaceSelector = ".chat-popup, .chat-results-popup, #wbeShakyTree, #wbe-shaky-tree-popup";

  $(document)
    .off("mousedown.wbeChatOutsideClose")
    .on("mousedown.wbeChatOutsideClose", (event) => {
      const popup = document.getElementById(CHAT_POPUP_ID);
      if (!popup) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (popup.contains(target)) {
        return;
      }

      const targetElement = target instanceof Element ? target : target.parentElement;
      if (targetElement?.closest(chatPopupSurfaceSelector)) {
        return;
      }

      const chatButton = document.getElementById(CHAT_BUTTON_ID);
      if (chatButton && chatButton.contains(target)) {
        return;
      }

      closePopup();
    });
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
            <textarea id="${CHAT_INPUT_ID}" rows="2" placeholder="Ask something" style="flex:1;min-height:48px"></textarea>
            <div id="${CHAT_WTPLUS_SUGGESTION_PICKER_ID}" class="chat-wtplus-suggestion-picker" style="display:none">
              <label for="${CHAT_WTPLUS_SUGGESTION_SELECT_ID}">WT+ suggestion</label>
              <select id="${CHAT_WTPLUS_SUGGESTION_SELECT_ID}"></select>
            </div>
            <div class="chat-input-actions">
              <div id="wbe-chat-mode-controls" class="chat-mode-controls" aria-label="Chat mode">
                <div class="chat-mode-controls-title">Mode</div>
                <label class="chat-mode-option"><input type="radio" name="wbe-chat-mode" value="wt" checked /><span>WT</span></label>
                <label class="chat-mode-option"><input type="radio" name="wbe-chat-mode" value="wtplus" /><span>WT+</span></label>
                <label class="chat-mode-option"><input type="radio" name="wbe-chat-mode" value="ai" /><span>AI</span></label>
              </div>
              <div class="chat-send-column">
                <button id="${CHAT_SEND_ID}" type="button" class="small">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
    ).appendTo(document.body);

    positionPopupForOpen($popup.get(0));
    $popup.find(".close-popup").on("click", closePopup);
    $popup.find(`#${CHAT_CLEAR_ID}`).on("click", clearHistory);
    $popup.find(`#${CHAT_SEND_ID}`).on("click", sendChatPrompt);
    $popup.find('input[name="wbe-chat-mode"]').on("change", (event) => {
      persistChatMode(event?.target?.value || getCurrentChatMode());
    });
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
    ensureResolvedPersonMemoryLoaded();
    renderHistory();
    bindWtPlusSuggestionPicker($popup);
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
  restoreChatMode($popup);
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
  bindOutsideClickToCloseChat();

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
