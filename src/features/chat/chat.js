import { createConnectionSourceResolver } from "./chat_connection_source";
import { REQUESTED_COLUMNS, addRequestedColumns, parseColumnRequest, requestedColumnFields } from "./chat_requested_columns";
/*
Created By: Ian Beacall (Beacall-6)
*/

import {
  getResultWtPlusQuery,
  isLocallyFilteredResult,
  narrowWtPlusQuery,
  parseWtPlusNarrowPrompt,
  restrictNarrowResultToRows,
} from "./chat_wtplus_narrow";
import { rewriteOfRelationChain } from "./chat_relation_chain_text";
import { groupKinListResult } from "./chat_group_rows";
import { WIKITREE_GLOSSARY_FOR_AI } from "./chat_wikitree_glossary";
import "../../core/userTimingCompat";
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getFeatureOptions } from "../../core/options/options_storage";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { buildConnectedTestsAnswer, buildHaplogroupAnswer, dnaTypesFromTestSlugs } from "./chat_dna";
import { getUserWtId, getUserNumId, getProfilePersonInfo } from "../../core/common";
import { vetSuggestions } from "./chat_suggestions";
import { SHARED_AI_KEY_IDS } from "../../core/options/shared_ai_options";
import { setHighestZIndex } from "../../core/common";
import { routeChatPrompt, ChatIntent, pause, parseExportResultPrompt, tidyKinFollowUp } from "./chat_router";
import { familySurnames, findNameInProfiles, hasFamilySurname, preferBracketedIds } from "./chat_family_circle_lookup";
import { CHART_BAR_KEYS, CHART_SHORTCUTS, chartButtonPrompt, chartShortcutCanonicalPrompt } from "./chat_chart_shortcuts";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import * as XLSX from "xlsx";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/resizable";
import "./chat.css";
import { watchForWikiTreeButtons } from "./chat_chart_common";
import { installChatDebugConsole } from "./chat_debug_console";
import { findAmbiguousCenturyDecade, rewriteExplicitCenturyDecadeWording } from "./chat_century_decade";
import { createChatConnectionHandlers } from "./chat_connections";
import { AI_CHAT_CLAIM_RULES, handleExplicitSearchMode, looksLikeQuestion } from "./chat_search_mode";
import {
  AI_ANSWER_FORMAT_RULES,
  clearUnanswered,
  loadUnanswered,
  needsAiKeyMessage,
  parseAiAnswer,
  parseUnansweredPrompt,
  promptNameCandidates,
  recordUnanswered,
  suggestionActions,
  unansweredMessage,
} from "./chat_answer";
import { prefillSearchForm } from "./chat_search_form";
import { createProfileSearchHandler } from "./chat_profile_search";
import { createChatAiHelpers, isAiPaused, setAiPaused } from "./chat_ai";
import { aiKeyHelpHtml } from "./chat_ai_key_help";
import { dnaReferenceForAi } from "./chat_relationship_data";
import { isHelpPrompt, noAiExamplesHtml } from "./chat_no_ai_examples";
import { createChatCcHandlers } from "./chat_cc";
import { createLastResultOperationHandler } from "./chat_last_result";
import { createChatRelationHandlers } from "./chat_relations";
import { createChatPeopleHandlers } from "./chat_people";
import { createChatBioHandlers } from "./chat_bio";
import { createChatHistoryHandlers } from "./chat_history";
import { createAppsLoginButton } from "../../core/loginButton";
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
  resetChatShakyCancel,
  isChatShakyCancelled,
  showConnectionsPopup,
  sanitizeHtmlForPopup,
  extractProfileBios,
  showBioListPopup,
  showTiledBioPopups,
  closeBioPopup,
  addBioButton,
} from "./ui";
import { buildResultsTableHtml } from "./tables";
import { relationSelector } from "./chat_relative_fact";
import { buildCurrentPageContextForAi, currentPageChipPrompts, extractDnaConnectionsText, getCurrentPageInfo, isCurrentPagePrompt, isDnaPrompt } from "./chat_page_context";
import {
  makeProfileLink,
  extractCountryFromLocation,
  withDerivedRowFields,
  cloneResultWithRows,
  makeCousinProfileTable,
  makeStandardProfileTable,
  makeAncestorProfileTable,
  makeWatchlistTable,
  makeAncestorAgeTable,
} from "./tables";
import {
  extractAliasCandidates,
  extractResolvedPeopleFromMessage,
  normalizePersonMemoryToken,
  pickAnswerSubject,
  nextAnswerSubject,
  rewritePromptWithRememberedPerson,
  rewritePronounToSubject,
  sanitizeResolvedPersonDisplayName,
} from "./chat_person_memory";

import { WT_PLUS_BIO_CHECK_WORDS, WT_PLUS_RESEARCH_STATUS_WORDS } from "./wt_plus_query_grammar";

// Debug: indicate the chat feature script has been loaded
console.debug("wbe: chat.js loaded");

const CHAT_POPUP_ID = "wbe-chat-popup";
const CHAT_BUTTON_ID = "wbe-chat-button";
const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
const AUTO_BIO_OPTIONS_KEY = "autoBio_options";
const CHAT_MESSAGES_ID = "wbe-chat-messages";
const CHAT_INPUT_ID = "wbe-chat-input";
const CHAT_SEND_ID = "wbe-chat-send";
const CHAT_CLEAR_ID = "wbe-chat-clear";
const CHAT_WTPLUS_SUGGESTION_PICKER_ID = "wbe-chat-wtplus-suggestion-picker";
const CHAT_WTPLUS_SUGGESTION_SELECT_ID = "wbe-chat-wtplus-suggestion-select";
const CHAT_CONTEXT_CONTROLS_ID = "wbe-chat-context-controls";
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
  { label: "Research Status", words: WT_PLUS_RESEARCH_STATUS_WORDS },
  { label: "Bio Check", words: WT_PLUS_BIO_CHECK_WORDS },
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
const CHAT_APPS_LOGIN_BUTTON_APP_ID = "WBE_api_login_button";
let chatResultsCounter = 0;
let chatModeNoticeTimer = null;
const tableColumnFilterState = new Map();

function parseFlexibleDateValue(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2] || "0");
  const day = Number(match[3] || "0");
  if (!Number.isFinite(year)) {
    return null;
  }

  return year * 10000 + month * 100 + day;
}

function parseColumnFilterExpression(rawInput) {
  let expression = String(rawInput || "").trim();
  if (!expression) {
    return { empty: true };
  }

  let negate = false;
  if (expression.startsWith("!")) {
    negate = true;
    expression = expression.slice(1).trim();
  }

  // Year range: "1847-1849" or "1847–1849" (en-dash) — only for date columns
  const rangeMatch = expression.match(/^(\d{4})\s*[-\u2013]\s*(\d{4})$/);
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    return {
      empty: false,
      negate,
      operator: "range",
      from: rangeMatch[1].trim(),
      to: rangeMatch[2].trim(),
    };
  }

  const opMatch = expression.match(/^([<>])\s*(.+)$/);
  if (opMatch?.[1] && opMatch?.[2]) {
    return {
      empty: false,
      negate,
      operator: opMatch[1],
      value: opMatch[2].trim(),
    };
  }

  return {
    empty: false,
    negate,
    operator: "contains",
    value: expression,
  };
}

if (!$.fn.dataTable.ext.search.some((fn) => fn.__wbeColumnFilter === true)) {
  const predicate = function (settings, rowData) {
    const tableId = settings?.nTable?.id || "";
    const state = tableColumnFilterState.get(tableId);
    if (!state || !Array.isArray(state.filters) || !state.filters.some((entry) => !entry?.empty)) {
      return true;
    }

    for (let colIndex = 0; colIndex < state.filters.length; colIndex += 1) {
      const filter = state.filters[colIndex];
      if (!filter || filter.empty) {
        continue;
      }

      const cellText = String(rowData?.[colIndex] || "").trim();
      const normalizedCell = cellText.toLowerCase();
      const normalizedFilterValue = String(filter.value || "").toLowerCase();
      let matches = false;

      if (filter.operator === "<" || filter.operator === ">") {
        if (state.dateColumnIndexes.has(colIndex)) {
          const compareDate = parseFlexibleDateValue(filter.value);
          if (compareDate == null) {
            // Incomplete date expression — don't filter until we have at least a year
            continue;
          }
          const rowDate = parseFlexibleDateValue(cellText);
          matches = rowDate != null && (filter.operator === "<" ? rowDate < compareDate : rowDate > compareDate);
        } else {
          matches = normalizedCell.includes(normalizedFilterValue);
        }
      } else if (filter.operator === "range" && state.dateColumnIndexes.has(colIndex)) {
        const fromDate = parseFlexibleDateValue(filter.from);
        const toDate = parseFlexibleDateValue(filter.to + "-12-31");
        if (fromDate == null || toDate == null) {
          continue;
        }
        const rowDate = parseFlexibleDateValue(cellText);
        matches = rowDate != null && rowDate >= fromDate && rowDate <= toDate;
      } else {
        matches = normalizedCell.includes(normalizedFilterValue);
      }

      if (filter.negate) {
        matches = !matches;
      }

      if (!matches) {
        return false;
      }
    }

    return true;
  };

  predicate.__wbeColumnFilter = true;
  $.fn.dataTable.ext.search.push(predicate);
}
// (one row is a sentence, not a table)
const AUTO_OPEN_TABLE_MIN_ROWS = 2;
const CHAT_AI_HISTORY_MAX_MESSAGES = 12;
const CHAT_AI_MESSAGE_MAX_CHARS = 500;
const CHAT_PERSISTED_STRUCTURED_ROWS_MAX = 250;
const CHAT_PERSON_MEMORY_MAX_ENTRIES = 100;
const CHAT_PERSON_MEMORY_AI_CONTEXT_MAX = 10;
const CHAT_APPS_LOGIN_HINT = "Log in to the apps server for better results. Use the green Apps button below.";
const CHAT_JSON_BATCH_TRIGGER = /^\s*(?:search\s+)?person(?:s)?\s+from\s+json\s*:?\s*/i;
const CHAT_JSON_BATCH_MAX_CHOICES = 6;
const CHAT_JSON_BATCH_ENTRY_PAUSE_MS = 80;
const CHAT_JSON_BATCH_MAX_BIRTH_YEAR = 1800;
const RELATION_PERSON_FIELDS =
  "Id,Name,Gender,RealName,Derived.ShortName,LongNamePrivate,BirthNamePrivate,Derived.LongNamePrivate,Derived.BirthNamePrivate,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation";
let chatHistory = [];
let lastNonRetryUserPrompt = "";
let lastConnectionContext = null;
let pendingDisambiguationContext = null;
// When an answer offers a concrete follow-up ("...would you like to try an
// ancestor search instead?"), we stash the prompt that a plain "Sure."/"Yes"
// should run. Without this a bare affirmative falls through to profile search
// and returns nonsense name matches for "Sure.".
let pendingFollowupOffer = null;
let lastConnectionCandidates = [];
let lastConnectionRankedMatches = [];
let lastConnectionPopupResult = null;
let lastStructuredResult = null;
// Columns asked for with the current prompt ("my cousins with a privacy column"),
// added to the table the prompt produces.
let pendingRequestedColumns = null;
let lastBioPopupId = null;
let lastBioPopupProfile = null;
let wtPlusSuggestionOptionsHtml = "";
let resolvedPeopleByWtId = {};
let resolvedPersonAliasToWtId = {};
let resolvedPersonOrderCounter = 0;
let resolvedPersonMemoryLoaded = false;

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
    const orderCounter = Number(parsed?.orderCounter);

    if (peopleByWtId && typeof peopleByWtId === "object") {
      resolvedPeopleByWtId = Object.entries(peopleByWtId).reduce((acc, [wtId, entry]) => {
        const normalizedWtId = String(entry?.wtId || wtId || "").trim();
        if (!normalizedWtId || !/-\d+$/i.test(normalizedWtId)) {
          return acc;
        }

        const sanitizedAliases = new Set();
        extractAliasCandidates(entry?.displayName || "").forEach((alias) => sanitizedAliases.add(alias));
        extractAliasCandidates(normalizedWtId).forEach((alias) => sanitizedAliases.add(alias));
        (Array.isArray(entry?.aliases) ? entry.aliases : []).forEach((alias) => {
          extractAliasCandidates(alias).forEach((candidate) => sanitizedAliases.add(candidate));
        });

        const nextEntry = {
          wtId: normalizedWtId,
          displayName: sanitizeResolvedPersonDisplayName(entry?.displayName || "", normalizedWtId) || normalizedWtId,
          aliases: Array.from(sanitizedAliases).slice(0, 25),
          seenOrder: Number.isFinite(Number(entry?.seenOrder)) ? Number(entry.seenOrder) : 0,
        };

        nextEntry.aliases.forEach((alias) => {
          const normalizedAlias = normalizePersonMemoryToken(alias);
          if (!normalizedAlias || normalizedAlias.length < 3) {
            return;
          }
          resolvedPersonAliasToWtId[normalizedAlias] = normalizedWtId;
        });

        acc[normalizedWtId] = nextEntry;
        return acc;
      }, {});
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

// incidental: someone merely named in an answer (a connection path lists both
// Abraham Lincolns). It must not take an alias already held by someone the
// user asked about, or the next "Abraham Lincoln" finds the grandfather.
function rememberResolvedPerson({ wtId, displayName, aliases = [], incidental = false }) {
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

  const currentDisplay = sanitizeResolvedPersonDisplayName(existing.displayName || "", "");
  existing.displayName = currentDisplay;

  const cleanedDisplay = sanitizeResolvedPersonDisplayName(displayName || "", "");
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
    const holder = resolvedPersonAliasToWtId[normalizedAlias];
    if (incidental && holder && holder !== normalizedWtId && resolvedPeopleByWtId[holder]) {
      return;
    }
    resolvedPersonAliasToWtId[normalizedAlias] = normalizedWtId;
  });

  const entries = Object.values(resolvedPeopleByWtId).sort(
    (a, b) => Number(b?.seenOrder || 0) - Number(a?.seenOrder || 0)
  );
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

// The person "his"/"her" means in a follow-up: the profile person (null) until the user names
// someone (nextAnswerSubject). lastSubjectPrompt is what the user typed for the current answer.
let lastAnswerSubject = null;
let lastSubjectPrompt = "";

async function getSubjectGender(subject) {
  if (subject.gender !== undefined) return subject.gender;
  try {
    const person = await WikiTreeAPI.getPerson(WBE_CHAT_APP_ID, subject.wtId, "Id,Name,Gender");
    subject.gender = String((person?._data || person)?.Gender || "");
  } catch (error) {
    subject.gender = "";
  }
  return subject.gender;
}

function rememberResolvedPeopleFromMessage(text) {
  extractResolvedPeopleFromMessage(text).forEach(({ displayName, wtId }) => {
    rememberResolvedPerson({ wtId, displayName, aliases: [displayName], incidental: true });
  });
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
    rememberResolvedPerson({ wtId, displayName, aliases: [displayName], incidental: true });
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
  return rewritePromptWithRememberedPerson(prompt, aliasResolution.person);
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
    return aliases ? `- ${displayName} (${wtId}); aliases: ${aliases}` : `- ${displayName} (${wtId})`;
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

// Strip list/bullet decorations that ride along when a prompt is pasted from a
// bulleted document (e.g. "•\tLancashire ..." or "- Lancashire ..."). Without
// this the marker leaks into the search, e.g. BirthLocation="• Lancashire".
// Only a single leading marker is removed; tabs/non-breaking spaces anywhere
// are folded to regular spaces so downstream tokenizing behaves normally.
function stripPromptListDecorations(prompt) {
  // Fold tabs and non-breaking / thin spaces to regular spaces first.
  let text = String(prompt || "").replace(/[\t\u00a0\u2000-\u200a\u202f\u205f\u3000]+/g, " ");
  // Remove a single leading bullet glyph, dash, or "1." / "1)" ordinal marker
  // when it is followed by whitespace, so we never eat a real word or a
  // hyphenated place like "Stratford-upon-Avon".
  text = text.replace(/^\s*(?:[\u2022\u00b7\u2023\u25aa\u25e6\u2219*+\u2013\u2014\u2043-]|\d{1,3}[.)])\s+/, "");
  return text.replace(/\s{2,}/g, " ").trim();
}

// Bare conversational replies to an offered follow-up. Kept deliberately tight
// (whole-prompt matches only) so a real search like "yes Smith" is untouched.
function normalizeReplyText(prompt) {
  return String(prompt || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAffirmativeReply(prompt) {
  return /^(?:sure|yes|yeah|yep|yup|ok|okay|please|go ahead|go on|do it|sounds good|why not|alright|absolutely)(?: please| thanks| thank you)?$/.test(
    normalizeReplyText(prompt)
  );
}

function isNegativeReply(prompt) {
  return /^(?:no|nope|nah|no thanks|no thank you|not now|maybe later)$/.test(normalizeReplyText(prompt));
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

function sanitizeRetriedPrompt(prompt) {
  const text = String(prompt || "").trim();
  return text;
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

  const inputValue = String($popup.find(`#${CHAT_INPUT_ID}`).val() || "");
  const shouldShow = isWtPlusSuggestionPrompt(inputValue);
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

function clearChatModeNotice($popup) {
  if (!$popup?.length) {
    return;
  }

  if (chatModeNoticeTimer) {
    clearTimeout(chatModeNoticeTimer);
    chatModeNoticeTimer = null;
  }

  const $notice = $popup.find("#wbe-chat-mode-notice");
  $notice.removeClass("is-visible").text("");
}

function showChatModeNotice($popup, text) {
  if (!$popup?.length) {
    return;
  }

  clearChatModeNotice($popup);

  const label = String(text || "").trim();
  if (!label) {
    return;
  }

  const $notice = $popup.find("#wbe-chat-mode-notice");
  $notice.text(label).addClass("is-visible");
  chatModeNoticeTimer = setTimeout(() => {
    $notice.removeClass("is-visible").text("");
    chatModeNoticeTimer = null;
  }, 5500);
}

function setCurrentChatMode(mode, options = {}) {
  const $popup = $(`#${CHAT_POPUP_ID}`);
  if (!$popup.length) {
    return;
  }

  applyChatModeToPopup($popup, mode);
  persistChatMode(mode);
  updateWtPlusSuggestionPickerState($popup);

  if (options?.notice) {
    showChatModeNotice($popup, options.notice);
  } else if (!options?.preserveNotice) {
    clearChatModeNotice($popup);
  }
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
  // "wtplus" stored from the old three-mode UI maps to "wt" (Search mode).
  if (normalized === "wtplus") return "wt";
  return ["wt", "ai"].includes(normalized) ? normalized : "wt";
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

      // If there is an explicit stored mode, apply it directly.
      if (stored?.[CHAT_MODE_STORAGE_KEY]) {
        const restoredMode = normalizeChatMode(stored[CHAT_MODE_STORAGE_KEY]);
        applyChatModeToPopup($popup, restoredMode);
        try {
          window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, restoredMode);
        } catch (error) {
          console.info("wbe: unable to mirror restored chat mode to localStorage", { error });
        }
        return;
      }

      // No stored session choice — fall back to the defaultMode option setting.
      getChatOptions()
        .then((options) => {
          const popupEl2 = $popup?.get?.(0);
          if (!popupEl2 || !document.body.contains(popupEl2)) {
            return;
          }
          const defaultMode = normalizeChatMode(options?.defaultMode || "wt");
          applyChatModeToPopup($popup, defaultMode);
          try {
            window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, defaultMode);
          } catch (error) {
            console.info("wbe: unable to mirror default chat mode to localStorage", { error });
          }
        })
        .catch(() => {});
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
    // (last, so a chart a button just opened stays over the Connections popup: live 2026-10-04)
    ".wbe-chart-popup",
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
  sendClarifiedPrompt: (prompt) => sendClarifiedPrompt(prompt),
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
    setPersistedLastStructuredResult(value);
  },
  getLastBioPopupId: () => lastBioPopupId,
  setLastBioPopupState: ({ id, profile }) => {
    lastBioPopupId = id;
    lastBioPopupProfile = profile;
  },
  toggleConnectionsPopup: () => toggleConnectionsPopup(),
  // People handlers are created below; resolve lazily.
  rebuildChartAction: (entry) => rebuildChartAction(entry),
  openResultsTable: (result, opts) => openResultsTable(result, opts),
  resolveToWTID: (candidate) => resolveToWTID(candidate),
  showBioPopupForId: (wtid) => showBioPopupForId(wtid),
  openWtPlusQuery,
  tryHandleProfileSearchPrompt: (...args) => tryHandleProfileSearchPrompt?.(...args),
  reRunSavedWtPlusQuery: (...args) => reRunSavedWtPlusQuery?.(...args),
  handleChatResult: (result) => handleChatResult(result),
  afterActionClick: () => raiseChatActionPopupsAboveChat(),
  onSearchFormSubmit: (values, built) => runSearchForm(values, built),
  createAppsLoginButton: () =>
    createAppsLoginButton(CHAT_APPS_LOGIN_BUTTON_APP_ID, "Log in to the apps server for a better WBE experience"),
  resetTransientState: () => {
    pendingDisambiguationContext = null;
    lastConnectionCandidates = [];
    lastConnectionRankedMatches = [];
    clearResolvedPersonMemory();
  },
});

const { buildRecentConversationForAi, buildRecentUserMessagesForAi, getChatAiConfig, hasAnyApiKey } =
  createChatAiHelpers({
    getChatOptions,
    getChatHistory: () => chatHistory,
    chatAiMessageMaxChars: CHAT_AI_MESSAGE_MAX_CHARS,
    chatAiHistoryMaxMessages: CHAT_AI_HISTORY_MAX_MESSAGES,
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
  buildRecentUserMessagesForAi,
  ChatIntent,
  executeRoutedIntent: (routed, prompt) => executeRoutedIntent(routed, prompt),
  getLastStructuredResult: () => lastStructuredResult,
});

const resolveConnectionSourceRoot = createConnectionSourceResolver({
  promptRefersToUser,
  getLoggedInRootPerson,
  getProfileSubjectRoot,
  isPersonPage: () => getCurrentPageInfo().isPersonProfile,
  resolveConnectionTargetPerson: (...args) => resolveConnectionTargetPerson(...args),
});

const { resolveConnectionTargetPerson, tryHandleConnectionCorrectionPrompt, tryHandleConnectionPrompt } =
  createChatConnectionHandlers({
    WBE_CHAT_APP_ID,
    CHAT_LAST_CONNECTION_KEY,
    toggleConnectionsPopup: () => toggleConnectionsPopup(),
    // People handlers are created below; resolve lazily.
    personVisuals: (key) => personVisualActions(key),
    tryAiDisambiguateConnectionTarget,
    tryAiExpandConnectionTarget,
    shouldOfferDisambiguation,
    resolveConnectionSourceRoot,
    // Memory hit only counts when the alias covers the whole name, so a
    // remembered "Stephen Brown" never answers for "Stephen Fry".
    // Relation handlers are created below; resolve lazily.
    resolveRelativeTarget: (targetText, prompt) => resolveRelativeTargetPeople(targetText, prompt),
    findInFamilyCircle: (name) => findPersonInFamilyCircle(name),
    resolveAliasToRememberedPerson: (name) => {
      const resolution = resolvePromptAlias(name);
      if (!resolution?.person?.wtId) {
        return null;
      }
      if (resolution.aliasKey !== normalizePersonMemoryToken(name)) {
        return null;
      }
      return resolution.person;
    },
    setPendingDisambiguationContext: (value) => {
      pendingDisambiguationContext = value;
    },
    buildDisambiguationMessage,
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

const profileSearchHandlers = createProfileSearchHandler({
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
  resetChatShakyCancel,
  isChatShakyCancelled,
});

const tryHandleProfileSearchPrompt = profileSearchHandlers.tryHandleProfileSearchPrompt;
const reRunSavedWtPlusQuery = profileSearchHandlers.reRunSavedWtPlusQuery;
const translateWtPlusRefinementTerms = profileSearchHandlers.translateWtPlusRefinementTerms;
const getLastExecutedWtPlusQuery = profileSearchHandlers.getLastExecutedWtPlusQuery;

const { getCcProfilesForUser, getCc7ProfilesForUser, tryHandleCc7LocationPrompt, tryHandleCcSummaryPrompt, tryHandleWatchlistPrompt } =
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
    getUserNumId,
    showChatShaky,
    hideChatShaky,
  });

const tryHandleLastResultOperation = createLastResultOperationHandler({
  getLastStructuredResult: () => lastStructuredResult,
  setLastStructuredResult: (value) => setPersistedLastStructuredResult(value),
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

const { resolveRelativeTargetPeople, tryHandleRelationCountPrompt } = createChatRelationHandlers({
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
  getProfileSubjectRoot,
  makeStandardProfileTable,
  makeCousinProfileTable,
  showBioListPopup,
  handleOpenFromBioList,
  fetchPeoplePaged,
  fetchProfilesForIds,
  fetchChildrenIdsForId,
  fetchSiblingIdsForId,
  fetchParentIds,
  isLoggedOutOfAppsServer: () => isLoggedOutOfAppsServer(),
  // familyVisualActions comes from createChatPeopleHandlers below; called only at answer time.
  familyVisuals: (key) => familyVisualActions(key),
});

const {
  tryHandleSpouseListPrompt,
  tryHandlePersonAgeAtDeathPrompt,
  tryHandlePersonAgeAtChildBirthPrompt,
  tryHandleProfileDuplicatesPrompt,
  tryHandlePersonBurialPrompt,
  tryHandleFindBioRelativesPrompt,
  tryHandleProfileFactPrompt,
  tryHandleDnaPrompt,
  tryHandleFanChartPrompt,
  tryHandleFractalTreePrompt,
  tryHandleFamilyWorldPrompt,
  tryHandleDescendantChartPrompt,
  tryHandleFamilyTimelinePrompt,
  tryHandleMigrationMapPrompt,
  tryHandleLifespansPrompt,
  tryHandleNameCloudPrompt,
  tryHandleFamilyCalendarPrompt,
  tryHandleAgesPrompt,
  tryHandleTreeOverviewPrompt,
  tryHandleFamilyMatrixPrompt,
  tryHandleProfileSourcesPrompt,
  tryHandlePersonMarriagePrompt,
  tryHandleRelativeFactPrompt,
  tryHandleTwinsPrompt,
  tryHandleChildrenWithChildrenPrompt,
  tryHandleOutlivedPrompt,
  tryHandleAncestorAverageAgePrompt,
  tryHandleAncestorListPrompt,
  tryHandleDescendantListPrompt,
  tryHandleProfileFamilyConnectionPrompt,
  familyVisualActions,
  personVisualActions,
  rebuildChartAction,
} = createChatPeopleHandlers({
  getProfilePersonInfo,
  // ("his daughter Carol's lifespans": the chart's person is a relative of the page person)
  resolveRelativeTarget: (targetText, prompt) => resolveRelativeTargetPeople(targetText, prompt),
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
  getUserNumId,
  notify: (text) => appendMessage("assistant", text, { shouldPersist: false }),
  getChatAiConfig,
  parsePlannerJson,
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

  // Optional page-progress callback; never forwarded to the API.
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  // Optional cancellation predicate, polled between chunks/pages; never
  // forwarded to the API. Returning true stops paging and returns what has been
  // aggregated so far.
  const shouldCancel = typeof options.shouldCancel === "function" ? options.shouldCancel : null;

  if (keysArray && keysArray.length) {
    totalCount = keysArray.length;
    for (let i = 0; i < keysArray.length; i += limit) {
      if (shouldCancel && shouldCancel()) break;
      const chunk = keysArray.slice(i, i + limit);
      try {
        // Do not pass start/limit when requesting a specific set of keys.
        const chunkOpts = { ...(options || {}) };
        delete chunkOpts.start;
        delete chunkOpts.limit;
        delete chunkOpts.onProgress;
        delete chunkOpts.shouldCancel;
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
        // Retry once for transient failures (for example ERR_CONNECTION_RESET).
        try {
          const retryOpts = { ...(options || {}) };
          delete retryOpts.start;
          delete retryOpts.limit;
          delete retryOpts.onProgress;
          delete retryOpts.shouldCancel;
          console.debug("wbe: fetchPeoplePaged retrying failed chunk", { chunkSize: chunk.length });
          const [retryStatus, , retryPeople] = await WikiTreeAPI.getPeople(appId, chunk, fields, retryOpts);
          lastStatus = retryStatus || lastStatus;
          const retryProfiles = Object.values(retryPeople || {});
          console.debug("wbe: fetchPeoplePaged retry chunk result", {
            chunkSize: chunk.length,
            returned: retryProfiles.length,
          });
          retryProfiles.forEach((profile) => {
            if (!profile) return;
            const key = profile?.Id != null ? String(profile.Id) : profile?.Name || null;
            if (key) aggregated[key] = profile;
          });
        } catch (retryError) {
          console.debug("wbe: fetchPeoplePaged retry chunk failed", {
            retryError,
            chunkSize: chunk.length,
          });
          // continue on error for resilience
        }
      }

      if (onProgress) {
        try {
          onProgress(Math.min(i + limit, keysArray.length), keysArray.length);
        } catch (progressError) {
          /* progress reporting must never break the fetch */
        }
      }
    }

    return [lastStatus, totalCount, aggregated];
  }

  // Fallback: use start/limit paging when no explicit keys array is provided.
  let start = Number(options.start) || 0;
  let fetchMore = true;

  while (fetchMore) {
    if (shouldCancel && shouldCancel()) break;
    const pageOpts = { ...(options || {}), start, limit };
    delete pageOpts.onProgress;
    delete pageOpts.shouldCancel;
    let status, total, people;
    try {
      [status, total, people] = await WikiTreeAPI.getPeople(appId, rootKey, fields, pageOpts);
    } catch (pageError) {
      // Once more for transient failures, as the chunked path does.
      console.debug("wbe: fetchPeoplePaged page failed; retrying", { start, pageError });
      [status, total, people] = await WikiTreeAPI.getPeople(appId, rootKey, fields, pageOpts);
    }
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
  // A number is a person Id. getProfile reads a number as a page Id, a
  // different profile (7708765 = Hutton-734 as a person, Cook-8312 as a page;
  // live, 2026-10-03), so ask getPerson, which returns a wrapper with ._data.
  try {
    const person = await WikiTreeAPI.getPerson(WBE_CHAT_APP_ID, str, "Id,Name");
    const row = person?._data && typeof person._data === "object" ? person._data : person;
    if (row && row.Name) return row.Name;
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

function updateContextPickerVisibility() {
  const hasResult = Boolean(lastStructuredResult?.rows?.length);
  $(`#${CHAT_CONTEXT_CONTROLS_ID}`).toggle(hasResult);
  if (!hasResult) {
    const $radio = document.querySelector('input[name="wbe-chat-context"][value="followup"]');
    if ($radio) $radio.checked = true;
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
  if (table.length) {
    tableColumnFilterState.delete(String(table.attr("id") || ""));
  }
  $(`#${CHAT_RESULTS_POPUP_ID}`).remove();
}

function setPersistedLastStructuredResult(value) {
  lastStructuredResult = value || null;
  updateContextPickerVisibility();

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

function extractFollowupTableFilterText(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return "";
  }

  const patterns = [
    /^(?:only\s+)?(?:those|them|people)?\s*(?:who\s+are\s+|who\s+were\s+|that\s+are\s+|that\s+were\s+)?from\s+(.+?)\??$/i,
    /^(?:only\s+)?(?:those|them|people)?\s*born\s+in\s+(.+?)\??$/i,
    /^(?:only\s+)?(?:those|them|people)?\s*died\s+in\s+(.+?)\??$/i,
    /^(?:only\s+)?(?:those|them|people)?\s*in\s+(.+?)\??$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return String(match[1])
        .replace(/^['"\s]+|['"\s]+$/g, "")
        .trim();
    }
  }

  return "";
}

function toExportCell(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toExportCell(entry)).join("; ");
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

function getExportMatrix(result) {
  const headers = (result?.columns || []).map((column) => String(column?.title || column?.key || "").trim());
  const keys = (result?.columns || []).map((column) => String(column?.key || "").trim());
  const rows = (result?.rows || []).map((row) => keys.map((key) => toExportCell(row?.[key])));
  return { headers, rows };
}

function sanitizeExportFileBaseName(title) {
  return (
    String(title || "chat-results")
      .toLowerCase()
      .replace(/[^a-z0-9\-\s_]+/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "chat-results"
  );
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function exportResultAsCsv(result) {
  const { headers, rows } = getExportMatrix(result);
  const csvEscape = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
  const lines = [headers.map(csvEscape).join(",")].concat(rows.map((row) => row.map(csvEscape).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(`${sanitizeExportFileBaseName(result?.title)}.csv`, blob);
}

function exportResultAsJson(result) {
  const columnKeys = (result?.columns || []).map((c) => String(c?.key || "").trim()).filter(Boolean);
  const rows = (result?.rows || []).map((row) => {
    const obj = {};
    for (const key of columnKeys) {
      const val = row?.[key];
      if (Array.isArray(val)) {
        if (val.length) obj[key] = val;
      } else if (val !== "" && val != null) {
        obj[key] = val;
      }
    }
    // Supplement with lastNameOther if non-empty (not a visible column but useful in JSON export)
    if (!obj.lastNameOther && row?.lastNameOther) {
      obj.lastNameOther = row.lastNameOther;
    }
    return obj;
  });
  const payload = {
    title: result?.title || "Genie Results",
    columns: (result?.columns || []).map((column) => ({
      title: String(column?.title || ""),
      key: String(column?.key || ""),
    })),
    rows,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(`${sanitizeExportFileBaseName(result?.title)}.json`, blob);
}

function exportResultAsXlsx(result) {
  const { headers, rows } = getExportMatrix(result);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  XLSX.writeFile(workbook, `${sanitizeExportFileBaseName(result?.title)}.xlsx`);
}

function exportResultAsWikitable(result) {
  const { headers, rows } = getExportMatrix(result);

  const convertUrlsToWikilinks = (value) => {
    const text = String(value || "");

    return text.replace(/https?:\/\/[^\s\]|<>"]+/g, (match, offset, fullText) => {
      // Avoid re-wrapping URLs that are already inside external wikilinks.
      if (offset > 0 && fullText[offset - 1] === "[") {
        return match;
      }

      let url = match;
      let trailing = "";
      while (/[),.;!?]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }

      try {
        const parsed = new URL(url);
        const hostname = String(parsed.hostname || "").toLowerCase();

        if (/(^|\.)wikipedia\.org$/.test(hostname) && /^\/wiki\//.test(parsed.pathname)) {
          const pageName = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ""))
            .replace(/_/g, " ")
            .trim();
          if (pageName) {
            return `[[Wikipedia:${pageName}]]${trailing}`;
          }
        }

        const label = hostname.replace(/^www\./, "") || "link";
        return `[${url} ${label}]${trailing}`;
      } catch (e) {
        return `${url}${trailing}`;
      }
    });
  };

  const wikiEscape = (value) => {
    const text = String(value || "")
      .replace(/\|/g, "{{!}}")
      .replace(/\n/g, "<br />");
    return convertUrlsToWikilinks(text);
  };

  // Find the WT ID column index
  const wtIdColumnIndex = (result?.columns || []).findIndex(
    (col) =>
      String(col?.key || "")
        .trim()
        .toLowerCase() === "wtid"
  );

  const lines = [
    '{| class="wikitable sortable" border=1',
    "|-",
    `! ${headers.map((header) => wikiEscape(header)).join(" !! ")}`,
  ];

  rows.forEach((row) => {
    lines.push("|-");
    const cells = row.map((cell, cellIndex) => {
      // If this is the WT ID column, wrap in wikilink
      if (cellIndex === wtIdColumnIndex && cell) {
        return `[[${cell}]]`;
      }
      return wikiEscape(cell);
    });
    lines.push(`| ${cells.join(" || ")}`);
  });
  lines.push("|}");

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  downloadBlob(`${sanitizeExportFileBaseName(result?.title)}.wikitable.txt`, blob);
}

function stripJsonCodeFence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const fencedMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return String(fencedMatch[1] || "").trim();
  }

  return raw;
}

function extractJsonBatchPayload(prompt) {
  const source = String(prompt || "");
  if (!CHAT_JSON_BATCH_TRIGGER.test(source)) {
    return null;
  }

  const withoutTrigger = source.replace(CHAT_JSON_BATCH_TRIGGER, "").trim();
  const cleaned = stripJsonCodeFence(withoutTrigger);
  if (cleaned) {
    return cleaned;
  }

  return "";
}

function parseFlexibleYear(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{4})/);
  return match?.[1] || "";
}

function normalizeBirthDateForSearch(value) {
  const text = String(value || "").trim();
  if (!text) {
    return { birthDate: "", dateSpread: null, precision: "unknown" };
  }

  const full = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) {
    const year = full[1];
    const month = full[2];
    const day = full[3];
    if (month === "00") {
      return { birthDate: `${year}-01-01`, dateSpread: 370, precision: "year" };
    }
    if (day === "00") {
      return { birthDate: `${year}-${month}-15`, dateSpread: 20, precision: "month" };
    }
    return { birthDate: text, dateSpread: 0, precision: "day" };
  }

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) {
    return { birthDate: `${yearOnly[1]}-01-01`, dateSpread: 370, precision: "year" };
  }

  return { birthDate: "", dateSpread: null, precision: "unknown" };
}

function candidatePassesJsonBirthYearCutoff(candidate, cutoffYear = CHAT_JSON_BATCH_MAX_BIRTH_YEAR) {
  const birthDate = String(candidate?.BirthDate || "").trim();
  const birthYear = Number(parseFlexibleYear(birthDate));

  if (!Number.isFinite(birthYear) || birthYear <= 0) {
    return true;
  }

  return birthYear <= Number(cutoffYear);
}

function parseIndexNameParts(indexName) {
  const text = String(indexName || "").trim();
  if (!text) return { firstName: "", lastName: "" };

  const commaMatch = text.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch?.[1] && commaMatch?.[2]) {
    const lastName = String(commaMatch[1] || "").trim();
    const firstSegment = String(commaMatch[2] || "")
      .replace(
        /\b(Captain|Capt\.?|Rev\.?|Dr\.?|Sir|Lady|Lord|Col\.?|Major|Lt\.?|Lieutenant|Mrs\.?|Ms\.?|Mr\.?)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();
    const firstName = firstSegment.split(/\s+/).filter(Boolean)[0] || "";
    return { firstName, lastName };
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
  }

  return { firstName: parts[0] || "", lastName: "" };
}

function deriveJsonBatchNameHints(entry) {
  const wtGuess = entry?.wtGuess || {};
  const fromIndex = parseIndexNameParts(entry?.indexName || "");

  const firstName = String(wtGuess?.FirstName || fromIndex.firstName || "").trim();
  const lastName = String(wtGuess?.LastNameAtBirth || wtGuess?.CurrentLastName || fromIndex.lastName || "").trim();
  const birthRaw = String(entry?.canonical?.birth || "").trim();
  const birthSearch = normalizeBirthDateForSearch(birthRaw);

  return {
    firstName,
    lastName,
    birthRaw,
    birthDate: birthSearch.birthDate,
    dateSpread: birthSearch.dateSpread,
    birthPrecision: birthSearch.precision,
  };
}

function scoreJsonBatchCandidate(candidate, hints) {
  const firstName = String(hints?.firstName || "")
    .trim()
    .toLowerCase();
  const lastName = String(hints?.lastName || "")
    .trim()
    .toLowerCase();
  const birthYear = parseFlexibleYear(hints?.birthRaw || hints?.birthDate || "");

  const cFirst = String(candidate?.FirstName || "")
    .trim()
    .toLowerCase();
  const cLastBirth = String(candidate?.LastNameAtBirth || "")
    .trim()
    .toLowerCase();
  const cLastCurrent = String(candidate?.LastNameCurrent || "")
    .trim()
    .toLowerCase();
  const cBirth = String(candidate?.BirthDate || "").trim();
  const cBirthYear = parseFlexibleYear(cBirth);

  let score = 0;
  if (firstName && cFirst === firstName) score += 40;
  if (lastName && (cLastBirth === lastName || cLastCurrent === lastName)) score += 40;
  if (birthYear && cBirthYear === birthYear) score += 25;
  if (hints?.birthRaw && cBirth === hints.birthRaw) score += 15;

  return score;
}

async function runJsonBatchEntrySearch(entry) {
  const hints = deriveJsonBatchNameHints(entry);
  const fields = "Id,Name,RealName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate";
  const attempts = [];

  const { firstName, lastName, birthDate, dateSpread } = hints;
  if (firstName && lastName && birthDate) {
    attempts.push({
      label: "strict-name-plus-birth",
      params: {
        FirstName: firstName,
        LastName: lastName,
        BirthDate: birthDate,
        dateSpread: Number.isFinite(Number(dateSpread)) ? Number(dateSpread) : 0,
        skipVariants: 1,
        lastNameMatch: "strict",
        limit: 20,
        sort: "birth",
      },
    });
  }

  if (firstName && lastName) {
    attempts.push({
      label: "strict-name",
      params: {
        FirstName: firstName,
        LastName: lastName,
        skipVariants: 1,
        lastNameMatch: "strict",
        limit: 20,
        sort: "birth",
      },
    });
  }

  if (firstName && lastName) {
    attempts.push({
      label: "relaxed-name",
      params: {
        FirstName: firstName,
        LastName: lastName,
        limit: 20,
        sort: "birth",
      },
    });
  }

  if (firstName && lastName && birthDate) {
    attempts.push({
      label: "relaxed-name-plus-birth",
      params: {
        FirstName: firstName,
        LastName: lastName,
        BirthDate: birthDate,
        dateSpread: Number.isFinite(Number(dateSpread)) ? Number(dateSpread) : 0,
        limit: 20,
        sort: "birth",
      },
    });
  }

  const realNameQuery = [firstName, lastName].filter(Boolean).join(" ").trim() || String(entry?.indexName || "").trim();
  if (realNameQuery) {
    attempts.push({
      label: "realname-fallback",
      params: {
        RealName: realNameQuery,
        limit: 20,
      },
    });
  }

  const seen = new Set();
  const combinedMatches = [];

  for (const attempt of attempts) {
    try {
      const [, matches] = await WikiTreeAPI.searchPerson(WBE_CHAT_APP_ID, attempt.params, fields);
      (Array.isArray(matches) ? matches : []).forEach((candidate) => {
        if (!candidatePassesJsonBirthYearCutoff(candidate)) {
          return;
        }

        const wtId = String(candidate?.Name || "").trim();
        if (!wtId || seen.has(wtId)) {
          return;
        }
        seen.add(wtId);
        combinedMatches.push({
          candidate,
          sourceAttempt: attempt.label,
          score: scoreJsonBatchCandidate(candidate, hints),
        });
      });
    } catch (error) {
      console.debug("wbe: json batch search attempt failed", {
        attempt: attempt.label,
        entryName: entry?.indexName,
        error,
      });
    }
  }

  combinedMatches.sort((left, right) => {
    const scoreDelta = Number(right.score || 0) - Number(left.score || 0);
    if (scoreDelta !== 0) return scoreDelta;
    const leftDate = String(left?.candidate?.BirthDate || "");
    const rightDate = String(right?.candidate?.BirthDate || "");
    return leftDate.localeCompare(rightDate);
  });

  const choices = combinedMatches.slice(0, CHAT_JSON_BATCH_MAX_CHOICES).map((item) => ({
    wtId: String(item?.candidate?.Name || "").trim() || null,
    displayName: String(item?.candidate?.RealName || item?.candidate?.Name || "").trim() || null,
    birth: String(item?.candidate?.BirthDate || "").trim() || null,
    death: String(item?.candidate?.DeathDate || "").trim() || null,
    score: Number(item?.score || 0),
    sourceAttempt: item?.sourceAttempt || null,
  }));

  const selectedWtId = choices.length === 1 ? choices[0].wtId : null;
  const status = !choices.length ? "no-match" : selectedWtId ? "single" : "multiple";

  return {
    hints,
    status,
    selectedWtId,
    choices,
  };
}

async function tryHandleJsonPeopleBatchPrompt(prompt) {
  const payload = extractJsonBatchPayload(prompt);
  if (payload == null) {
    return null;
  }

  if (!payload) {
    return {
      message:
        "I detected the JSON batch command, but no JSON payload was found. Paste JSON after 'Search people from JSON:' and try again.",
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    return {
      message: `I couldn't parse that JSON payload: ${error?.message || "Invalid JSON"}`,
    };
  }

  const entries = Array.isArray(parsed?.entries) ? parsed.entries : null;
  if (!entries) {
    return {
      message: "JSON payload parsed, but it does not contain an entries array at the top level.",
    };
  }

  const updated = {
    ...parsed,
    entries: [...entries],
    processing: {
      ...(parsed?.processing || {}),
      updatedAt: new Date().toISOString(),
      mode: "chat-search-people-json",
      maxChoicesPerEntry: CHAT_JSON_BATCH_MAX_CHOICES,
      maxBirthYear: CHAT_JSON_BATCH_MAX_BIRTH_YEAR,
      notes: [
        "searchPerson used FirstName + LastName + BirthDate when available, then fallback attempts.",
        `Candidates with known birth year after ${CHAT_JSON_BATCH_MAX_BIRTH_YEAR} were ignored.`,
        "choices contains possible WT matches for manual review when results are ambiguous.",
      ],
    },
  };

  let countSingle = 0;
  let countMultiple = 0;
  let countNoMatch = 0;

  for (let index = 0; index < updated.entries.length; index += 1) {
    const entry = updated.entries[index];
    const searchResult = await runJsonBatchEntrySearch(entry);

    const nextCanonical = {
      ...(entry?.canonical || {}),
      wtId: searchResult.selectedWtId || entry?.canonical?.wtId || null,
    };
    if (searchResult.selectedWtId && searchResult.choices[0]) {
      nextCanonical.displayName = nextCanonical.displayName || searchResult.choices[0].displayName || null;
      nextCanonical.birth = nextCanonical.birth || searchResult.choices[0].birth || null;
      nextCanonical.death = nextCanonical.death || searchResult.choices[0].death || null;
    }

    updated.entries[index] = {
      ...entry,
      canonical: nextCanonical,
      wtSearch: {
        input: {
          FirstName: searchResult.hints.firstName || null,
          LastName: searchResult.hints.lastName || null,
          BirthDate: searchResult.hints.birthRaw || null,
        },
        normalizedInput: {
          BirthDateForSearch: searchResult.hints.birthDate || null,
          DateSpread: Number.isFinite(Number(searchResult.hints.dateSpread))
            ? Number(searchResult.hints.dateSpread)
            : null,
          BirthPrecision: searchResult.hints.birthPrecision || null,
        },
        status: searchResult.status,
        selectedWtId: searchResult.selectedWtId,
        choices: searchResult.choices,
      },
      needsReview: searchResult.status !== "single" || Boolean(entry?.needsReview),
    };

    if (searchResult.status === "single") countSingle += 1;
    else if (searchResult.status === "multiple") countMultiple += 1;
    else countNoMatch += 1;

    if (CHAT_JSON_BATCH_ENTRY_PAUSE_MS > 0) {
      await pause(CHAT_JSON_BATCH_ENTRY_PAUSE_MS);
    }
  }

  const ambiguousExamples = updated.entries
    .filter((entry) => String(entry?.wtSearch?.status || "") === "multiple")
    .slice(0, 8)
    .map((entry) => {
      const name = String(entry?.indexName || entry?.wtGuess?.FirstName || "Unknown entry").trim();
      const top = (entry?.wtSearch?.choices || [])
        .slice(0, 3)
        .map((choice) => `${choice.displayName || choice.wtId || "Unknown"} (${choice.wtId || "no-id"})`)
        .join("; ");
      return `- ${name}: ${top || "no choices recorded"}`;
    });

  const titleBase =
    String(parsed?.book?.title || "people-search")
      .trim()
      .slice(0, 80) || "people-search";
  const fileBaseName = sanitizeExportFileBaseName(`${titleBase}-matched`);
  const updatedJsonText = JSON.stringify(updated, null, 2);

  window.wbeLastJsonPeopleSearchResult = updated;

  return {
    message:
      `Processed ${updated.entries.length} entries. ` +
      `Single match: ${countSingle}. Multiple possible matches: ${countMultiple}. No match: ${countNoMatch}.` +
      (ambiguousExamples.length ? `\n\nExamples with multiple possible results:\n${ambiguousExamples.join("\n")}` : ""),
    actions: [
      {
        label: "Download updated JSON",
        onClick: () => {
          const blob = new Blob([updatedJsonText], { type: "application/json;charset=utf-8" });
          downloadBlob(`${fileBaseName}.json`, blob);
        },
      },
    ],
  };
}

function injectResultsExportButtons($popup, tableId, result) {
  const $wrapper = $popup.find(`#${tableId}_wrapper`);
  if (!$wrapper.length) return;
  if ($wrapper.find(".wbe-chat-export-controls").length) return;

  const $length = $wrapper.find(".dataTables_length").first();
  const $filter = $wrapper.find(".dataTables_filter").first();
  if (!$length.length || !$filter.length) return;

  const $controls = $(
    '<div class="wbe-chat-export-controls" style="display:inline-flex;align-items:center;gap:6px;margin:0 12px;vertical-align:middle;">' +
      '<span style="font-size:12px;color:#555;">Export:</span>' +
      '<button type="button" class="small wbe-chat-export-btn" data-format="csv">CSV</button>' +
      '<button type="button" class="small wbe-chat-export-btn" data-format="xlsx">XLSX</button>' +
      '<button type="button" class="small wbe-chat-export-btn" data-format="json">JSON</button>' +
      '<button type="button" class="small wbe-chat-export-btn" data-format="wikitable">Wikitable</button>' +
      "</div>"
  );

  $controls.insertAfter($length);
  $controls.on("click", ".wbe-chat-export-btn", function () {
    const format = String($(this).attr("data-format") || "").toLowerCase();
    try {
      if (format === "csv") exportResultAsCsv(result);
      else if (format === "xlsx") exportResultAsXlsx(result);
      else if (format === "json") exportResultAsJson(result);
      else if (format === "wikitable") exportResultAsWikitable(result);
    } catch (error) {
      console.info("wbe: export failed", { format, error });
    }
  });
}

function openResultsTable(result = lastStructuredResult, opts = {}) {
  if (!result?.rows?.length || !result?.columns?.length) {
    return;
  }

  const formatResultsPopupTitle = (rawTitle, rowCount) => {
    const titleText = String(rawTitle || "Genie Results").trim() || "Genie Results";
    const count = Number.isFinite(Number(rowCount)) ? Number(rowCount) : 0;
    if (count <= 0) {
      return titleText;
    }

    if (/\(\s*\d+\s+results?\s*\)$/i.test(titleText)) {
      return titleText;
    }

    return `${titleText} (${count.toLocaleString()} ${count === 1 ? "result" : "results"})`;
  };

  const popupTitle = formatResultsPopupTitle(result.title, Array.isArray(result.rows) ? result.rows.length : 0);

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
        <strong>${escapeHtml(popupTitle)}</strong>
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
      if ($t.length) {
        tableColumnFilterState.delete(String($t.attr("id") || ""));
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

  const dataTable = $(`#${tableId}`).DataTable({
    paging: true,
    searching: true,
    ordering: true,
    orderCellsTop: true,
    autoWidth: false,
    pageLength: 25,
    order: result.defaultOrder || [],
  });

  injectResultsExportButtons($popup, tableId, result);

  const dateColumnIndexes = new Set();
  (result.columns || []).forEach((column, index) => {
    const key = String(column?.key || "").toLowerCase();
    if (key === "birth" || key === "death" || key.endsWith("date")) {
      dateColumnIndexes.add(index);
    }
  });

  tableColumnFilterState.set(tableId, {
    filters: (result.columns || []).map(() => ({ empty: true })),
    dateColumnIndexes,
  });

  $popup.find(".chat-col-filter-input").on("input change", function () {
    const colIndex = Number($(this).attr("data-col-index"));
    if (!Number.isFinite(colIndex)) {
      return;
    }

    const state = tableColumnFilterState.get(tableId);
    if (!state || !Array.isArray(state.filters)) {
      return;
    }

    state.filters[colIndex] = parseColumnFilterExpression($(this).val());
    tableColumnFilterState.set(tableId, state);
    dataTable.draw();
  });

  const initialColumnFilters = Array.isArray(opts?.initialColumnFilters)
    ? opts.initialColumnFilters
    : Array.isArray(result?.columnFilterContext?.filters)
    ? result.columnFilterContext.filters
    : [];
  initialColumnFilters.forEach((filter) => {
    const key = String(filter?.key || "").trim();
    const value = String(filter?.value || "").trim();
    if (!key || !value) {
      return;
    }

    const $input = $popup
      .find(".chat-col-filter-input")
      .filter((_, element) => String($(element).attr("data-col-key") || "").trim() === key)
      .first();
    if ($input.length) {
      $input.val(value).trigger("input");
    }
  });

  const initialSearch = String(opts?.initialSearch || "").trim();
  if (initialSearch) {
    dataTable.search(initialSearch).draw();
  }
}

async function getChatOptions() {
  try {
    return (await getFeatureOptions("chat")) || {};
  } catch (error) {
    console.info("wbe: getChatOptions failed; using defaults", {
      error: String(error?.message || error),
    });
    return {};
  }
}

// Fetches the requested columns' fields for a table's profiles and adds them.
async function withFetchedColumns(table, keys) {
  const wtIds = [...new Set((table?.rows || []).map((row) => row?.wtid).filter(Boolean))];
  if (!wtIds.length) return table;
  showChatShaky(`Fetching ${keys.length === 1 ? "a column" : "columns"} for ${wtIds.length} profiles...`);
  try {
    const [, , people] = await fetchPeoplePaged(WBE_CHAT_APP_ID, wtIds, requestedColumnFields(keys), { limit: 1000 });
    return addRequestedColumns(table, keys, people);
  } catch (error) {
    console.info("wbe: fetching requested columns failed", { keys, error });
    return table;
  }
}

// "add a privacy column": to the table already showing.
async function addColumnsToResult(table, keys) {
  const titles = keys.map((key) => REQUESTED_COLUMNS[key].title);
  const titleText = titles.length > 1 ? `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}` : titles[0];
  if (!table?.rows?.some((row) => row?.wtid)) {
    return {
      message: `There's no list of profiles to add the ${titleText} column${titles.length > 1 ? "s" : ""} to yet. Ask for one first, for example "my cousins with a privacy column".`,
    };
  }
  const withColumns = await withFetchedColumns(table, keys);
  if (withColumns === table) return { message: `I couldn't fetch the ${titleText} details just now. Please try again.` };
  return { message: `Added ${titleText} to the table.`, table: withColumns, autoOpen: true };
}

async function handleChatResult(result) {
  // (a handler's plain-text reply; dropping it showed nothing at all for "Beacall-10", 2026-10-04)
  if (typeof result === "string") result = { message: result };
  if (!result?.message) {
    return;
  }

  // A parser that declined only an AI could read: without a key, say so plainly.
  if (result.needsAi && !(await getChatAiConfig())?.key) {
    showNeedsAiKey(lastNonRetryUserPrompt);
    return;
  }

  // No AI (no key, or the switch is off) and a sentence the person search couldn't use: say what
  // Genie reads and show the form, not "couldn't find profile matches" for words that were never a name.
  if (
    /^\s*(?:I'm\s+sorry,\s*)?I\s+couldn't\s+(?:find\s+profile\s+matches|work\s+out\s+a\s+concrete\s+person\s+search)\b/i.test(
      String(result.message)
    ) &&
    String(lastNonRetryUserPrompt || "").trim().split(/\s+/).length >= 4 &&
    (isAiPaused() || !(await getChatAiConfig())?.key)
  ) {
    recordUnanswered(lastNonRetryUserPrompt, "no AI key");
    showNeedsAiKey(lastNonRetryUserPrompt);
    return;
  }

  if (pendingRequestedColumns && result.table?.rows?.length) {
    const keys = pendingRequestedColumns;
    pendingRequestedColumns = null;
    result = { ...result, table: await withFetchedColumns(result.table, keys) };
  }

  const messageText =
    result?.switchToMode === "wtplus" && result?.switchModeChatMessage
      ? `${String(result.switchModeChatMessage).trim()}\n${String(result.message || "").trim()}`.trim()
      : result.message;

  rememberResolvedPeopleFromMessage(messageText);
  lastAnswerSubject = nextAnswerSubject(lastAnswerSubject, pickAnswerSubject(messageText, result.table), lastSubjectPrompt);

  // A handler can offer a concrete follow-up; a bare "Sure."/"Yes" on the next
  // turn runs offer.prompt instead of being treated as a search term.
  if (result?.offer?.prompt) {
    pendingFollowupOffer = { prompt: String(result.offer.prompt) };
  }

  if (Object.prototype.hasOwnProperty.call(result, "table")) {
    setPersistedLastStructuredResult(result.table || null);
    rememberResolvedPeopleFromTable(result.table);
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

      if (action?.table) {
        return {
          ...action,
          actionType: action.actionType || "table",
          onClick: () => openResultsTable(action.table),
        };
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

      if (action?.actionType === "search-form") {
        return { ...action, onClick: () => showSearchFormAgain(action.values) };
      }

      // Send a clarified prompt as if the user had typed it.
      if (action?.actionType === "send-prompt" && action?.prompt) {
        return {
          ...action,
          onClick: () => sendClarifiedPrompt(action.prompt, { newSearch: action.newSearch === true }),
        };
      }

      // Re-run a saved WT+ query in chat (disambiguation scope buttons, "Fetch
      // results again"). The live path needs an onClick attached here — only
      // hydrateAction wires these up on history restore, so without this the
      // render loop in appendMessage silently drops the buttons.
      if (
        (action?.actionType === "fetch-wtplus-results" || action?.label === "Fetch results again") &&
        action?.wtPlusQuery
      ) {
        return {
          ...action,
          onClick: async () => {
            if (typeof reRunSavedWtPlusQuery !== "function") return;
            const result = await reRunSavedWtPlusQuery(
              action.wtPlusQuery,
              action.wtPlusSearchType || "text",
              action.wtPlusSuggestionId || "",
              action.wtPlusSuggestionOptions || {}
            );
            await handleChatResult(typeof result === "string" ? { message: result } : result);
          },
        };
      }

      return action;
    });
  const hasTableAction = explicitActions.some(
    (action) => action?.actionType === "table" || action?.label === "Table" || action?.table
  );

  // If table has too many rows to persist and came from WT+, add a "Fetch results again" button
  const rowCount = Array.isArray(result.table?.rows) ? result.table.rows.length : 0;
  const isLargeWtPlusResult = result.table && result.table.wtPlusQuery && rowCount > CHAT_PERSISTED_STRUCTURED_ROWS_MAX;

  // Without an AI key, "Answer as a question" can't work, and a search was
  // read by Genie's simpler code, so say once how to get smarter searches.
  if (aiAvailable === false) {
    for (let index = explicitActions.length - 1; index >= 0; index -= 1) {
      if (/^ask\s*:/i.test(String(explicitActions[index]?.prompt || ""))) explicitActions.splice(index, 1);
    }
  }
  let trailingText = result.trailingText || "";
  if (aiAvailable === false && result.table && !noKeyTipShown) {
    noKeyTipShown = true;
    trailingText = [trailingText, "Tip: add an AI key in the extension's Options for smarter searches and to ask questions."].filter(Boolean).join("\n");
    // (the same how-to link as the "needs AI" message)
    needsAiKeyMessage().actions.forEach((action) =>
      explicitActions.push({ ...action, onClick: () => window.open(action.url, "_blank", "noopener,noreferrer") })
    );
  }
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
    ...(isLargeWtPlusResult
      ? [
          {
            label: "Fetch results again",
            actionType: "fetch-wtplus-results",
            wtPlusQuery: result.table.wtPlusQuery,
            wtPlusSearchType: result.table.wtPlusSearchType || "text",
            wtPlusSuggestionId: result.table.wtPlusSuggestionId || "",
            wtPlusSuggestionOptions: result.table.wtPlusSuggestionOptions || {},
          },
        ]
      : []),
    ...explicitActions,
  ];

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
    const rowCount = result.table?.rows?.length || 0;
    // The table opens by itself unless a chart opened instead (then the Table
    // button shows it). User, 2026-10-04: "If there's no chart we should see
    // the table of results … automatically."
    const shouldAutoOpen =
      !result.chartOpened &&
      (result.autoOpen ||
        options.showResultsInTable ||
        rowCount >= AUTO_OPEN_TABLE_MIN_ROWS ||
        Boolean(result.table?.wtPlusQuery));
    if (shouldAutoOpen) {
      openResultsTable(result.table);
    }
  }
  appendMessage("assistant", messageText, {
    actions,
    inlineMore: result.inlineMore || null,
    trailingText,
  });
}

// No AI key: say so, link to how to get one, and offer the search form filled
// with what can't be misread in their prompt (a decade or year range).
function showNeedsAiKey(prompt) {
  // (a question gets just the message and the link; something more like a search gets the form too)
  const withForm = !looksLikeQuestion(prompt);
  const needsKey = needsAiKeyMessage({ withForm });
  const text = isAiPaused() ? `${needsKey.text}\n(AI is switched off with the AI switch at the top.)` : needsKey.text;
  appendMessage("assistant", text, {
    actions: [
      { label: WHAT_CAN_I_TYPE, onClick: () => showNoAiExamples() },
      ...needsKey.actions.map((action) => ({ ...action, onClick: () => window.open(action.url, "_blank", "noopener,noreferrer") })),
    ],
    searchForm: withForm ? prefillSearchForm(prompt) : null,
  });
}

// The search form's Search button: the same WT+ run the AI's searches use.
async function runSearchForm(values, built) {
  appendMessage("user", `Search: ${built.description}`);
  showChatShaky?.("Searching WikiTree+...");
  let result;
  try {
    result = await reRunSavedWtPlusQuery(built.query);
  } finally {
    hideChatShaky?.();
  }
  const shown = typeof result === "string" ? { message: result } : result || { message: "That search didn't run." };
  shown.actions = [...(shown.actions || []), { label: "Edit search", actionType: "search-form", values }];
  await handleChatResult(shown);
}

function showSearchFormAgain(values) {
  appendMessage("assistant", "Change the boxes and search again.", { searchForm: values || {} });
}

// When Genie can't answer: the things it can do, as one-click prompts.
function buildCantAnswerActions() {
  const root = getProfileSubjectRoot?.();
  const key = root?.wtId || root?.key || "";
  const prompts = key
    ? [`${key}'s fan chart`, `${key}'s family lifespans`, `Family Explorer for ${key}`]
    : ["My fan chart", "My ancestors' lifespans", "My Family Explorer"];
  return prompts.map((prompt) => ({
    label: prompt,
    actionType: "send-prompt",
    prompt,
    newSearch: true,
    onClick: () => sendClarifiedPrompt(prompt, { newSearch: true }),
  }));
}

// newSearch: run the prompt on its own, not as a Continue follow-up.
function sendClarifiedPrompt(prompt, { newSearch = false } = {}) {
  const $input = $(`#${CHAT_INPUT_ID}`);
  if ($input.length === 0) return;
  if (newSearch) {
    $('input[name="wbe-chat-context"][value="new"]').prop("checked", true);
  }
  $input.val(prompt);
  sendChatPrompt();
}

// "John Theodore Weatherall" on Weatherall-111's page (live, 2026-10-08): a
// name with the profile person's or the user's surname is looked for in
// their CC7 (getPeople, nuclear 7) before a search of all WikiTree.
async function findPersonInFamilyCircle(name) {
  const profile = getProfilePersonInfo() || {};
  const userWtId = getUserWtId() || "";
  const surnames = familySurnames({
    profileWtId: profile.Name,
    profileLastName: profile.LastNameAtBirth,
    profileFullName: profile.FullName,
    userWtId,
  });
  if (!hasFamilySurname(name, surnames)) return null;
  const roots = [];
  const profileSurnames = familySurnames({ profileWtId: profile.Name, profileLastName: profile.LastNameAtBirth, profileFullName: profile.FullName });
  if (profile.Id && hasFamilySurname(name, profileSurnames)) roots.push(profile.Id);
  const userNumId = getUserNumId();
  if (userNumId && hasFamilySurname(name, familySurnames({ userWtId })) && !roots.includes(userNumId)) roots.push(userNumId);
  for (const root of roots) {
    const match = findNameInProfiles(name, await getCcProfilesForUser(root, 7));
    if (match) return match;
  }
  return null;
}

async function sendChatPrompt() {
  const $input = $(`#${CHAT_INPUT_ID}`);
  if ($input.length === 0) return;

  const rawPrompt = stripPromptListDecorations(String($input.val() || ""));
  if (!rawPrompt) {
    return;
  }
  // "help", "what can I type?": the examples panel.
  if (isHelpPrompt(rawPrompt)) {
    $input.val("");
    showNoAiExamples();
    return;
  }

  // Normalize compact suggestion formats like "dbe803" to "Suggestions=803"
  // "John Theodore Weatherall's (Weatherall-113) bio" → "Weatherall-113's bio";
  // "How about his agrandparents?" → "his grandparents?" (live, 2026-10-08).
  const normalizedPrompt = tidyKinFollowUp(preferBracketedIds(parseSuggestionNumberFromPrompt(rawPrompt)));

  // "siblings of the wife of Sarah's father" -> "Sarah's father's wife's siblings",
  // the form the relation and bio handlers parse.
  let prompt = rewriteOfRelationChain(normalizedPrompt) || normalizedPrompt;
  const retryRequested = isRetryPrompt(rawPrompt);

  if (retryRequested) {
    if (!lastNonRetryUserPrompt) {
      appendMessage("assistant", "No earlier request to retry yet. Ask a question first.");
      $input.val("");
      refreshWtPlusSuggestionPickerForCurrentPopup();
      return;
    }
    // A retry should replay the previous request verbatim, not answer a stale disambiguation prompt.
    pendingDisambiguationContext = null;
    pendingFollowupOffer = null;
    prompt = sanitizeRetriedPrompt(lastNonRetryUserPrompt);
    appendMessage("assistant", `Retrying your previous request: ${prompt}`, { shouldPersist: false });
  }

  // Answer to an offered follow-up ("...would you like to try X instead?").
  // Consume it before any routing so a bare "Sure." never reaches the
  // profile-name search. The offer is single-use either way.
  let followupOfferNote = "";
  if (pendingFollowupOffer && !retryRequested) {
    const offer = pendingFollowupOffer;
    pendingFollowupOffer = null;
    if (isNegativeReply(prompt)) {
      appendMessage("user", normalizedPrompt);
      appendMessage("assistant", "No problem — ask me anything else when you're ready.");
      $input.val("");
      refreshWtPlusSuggestionPickerForCurrentPopup();
      return;
    }
    if (isAffirmativeReply(prompt)) {
      prompt = offer.prompt;
      followupOfferNote = `Running: ${prompt}`;
    }
  } else if (!retryRequested) {
    // Any unrelated prompt cancels a stale offer.
    pendingFollowupOffer = null;
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
  // "his wife" as a follow-up to an answer about one person means that
  // person's wife, if the pronoun fits; otherwise the profile person.
  const isFollowupContext =
    document.querySelector('input[name="wbe-chat-context"]:checked')?.value !== "new";
  lastSubjectPrompt = normalizedPrompt;
  // ("New search" starts again from the profile person)
  if (!isFollowupContext) lastAnswerSubject = null;
  if (isFollowupContext && lastAnswerSubject && /\b(?:his|her|their)\s+[A-Za-z]/i.test(prompt)) {
    const pronounRewrite = rewritePronounToSubject(prompt, lastAnswerSubject, await getSubjectGender(lastAnswerSubject));
    console.debug("wbe: pronoun follow-up", {
      prompt,
      subject: lastAnswerSubject.wtId,
      gender: lastAnswerSubject.gender,
      rewrittenPrompt: pronounRewrite.changed ? pronounRewrite.prompt : "",
    });
    if (pronounRewrite.changed) prompt = pronounRewrite.prompt;
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

  const previousStructuredResult = lastStructuredResult;
  // If the user chose "New search", discard previous result context before routing
  const newQueryContext = document.querySelector('input[name="wbe-chat-context"]:checked')?.value === "new";
  if (newQueryContext) {
    setPersistedLastStructuredResult(null);
  }

  appendMessage("user", normalizedPrompt);
  if (followupOfferNote) {
    appendMessage("assistant", followupOfferNote, { shouldPersist: false });
  }
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
    const jsonBatchPayload = extractJsonBatchPayload(prompt);
    if (jsonBatchPayload !== null) {
      appendMessage("assistant", "Detected JSON batch mode. Processing people from the pasted JSON...", {
        shouldPersist: false,
      });
    }

    const jsonBatchResponseEarly = await tryHandleJsonPeopleBatchPrompt(prompt);
    if (jsonBatchResponseEarly) {
      await handleChatResult(jsonBatchResponseEarly);
      return;
    }

    // "1800s" may mean the 19th century or the decade 1800-1809: ask, and let the
    // buttons resend the prompt with an explicit year range.
    prompt = rewriteExplicitCenturyDecadeWording(prompt);
    const centuryDecadeChoice = jsonBatchPayload === null ? findAmbiguousCenturyDecade(prompt) : null;
    if (centuryDecadeChoice) {
      await handleChatResult({
        message: centuryDecadeChoice.question,
        actions: centuryDecadeChoice.choices.map((choice) => ({
          label: choice.label,
          actionType: "send-prompt",
          prompt: choice.prompt,
        })),
      });
      return;
    }

    // Extra columns: "add a privacy column" goes on the last result; "my cousins
    // with a gender column" runs "my cousins", then adds it (Discord, 2026-10-06).
    pendingRequestedColumns = null;
    const columnRequest = jsonBatchPayload === null ? parseColumnRequest(prompt) : null;
    if (columnRequest && !columnRequest.rest) {
      await handleChatResult(await addColumnsToResult(previousStructuredResult, columnRequest.keys));
      return;
    }
    if (columnRequest) {
      console.debug("wbe: columns requested", columnRequest);
      pendingRequestedColumns = columnRequest.keys;
      prompt = columnRequest.rest;
    }

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
    const exportFormat = lastStructuredResult?.rows?.length ? parseExportResultPrompt(prompt) : null;
    if (exportFormat) {
      const exporters = {
        csv: exportResultAsCsv,
        xlsx: exportResultAsXlsx,
        json: exportResultAsJson,
        wikitable: exportResultAsWikitable,
      };
      try {
        exporters[exportFormat](lastStructuredResult);
        const count = lastStructuredResult.rows.length.toLocaleString();
        await handleChatResult({
          message: `Exported the current ${count} rows ("${lastStructuredResult.title || "Genie Results"}") as ${exportFormat.toUpperCase()}. The table's Export buttons offer CSV, XLSX, JSON and Wikitable.`,
        });
      } catch (error) {
        console.info("wbe: export failed", { exportFormat, error });
        await handleChatResult({ message: "Sorry, the export failed. Try the Export buttons above the results table." });
      }
      return;
    }
    // C33: "how many have no sources?" narrows the WT+ search behind the current result.
    const narrowBaseQuery = getResultWtPlusQuery(lastStructuredResult);
    const narrow = narrowBaseQuery ? parseWtPlusNarrowPrompt(prompt) : null;
    if (narrow) {
      const narrowedQuery = narrowWtPlusQuery(narrowBaseQuery, narrow.flag);
      console.info("wbe: narrowing the last WT+ search", { narrowBaseQuery, narrowedQuery });
      let narrowResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, narrowedQuery);
      if (narrowResult && typeof narrowResult === "object" && isLocallyFilteredResult(lastStructuredResult)) {
        narrowResult = restrictNarrowResultToRows(narrowResult, lastStructuredResult.rows, narrow.label, narrowedQuery);
      }
      if (narrowResult) {
        await handleChatResult(typeof narrowResult === "string" ? { message: narrowResult } : narrowResult);
        return;
      }
    }
    // "questions you couldn't answer": the list kept in this browser (chat_answer.js).
    if (parseUnansweredPrompt(prompt)) {
      const list = await loadUnanswered();
      const listText = unansweredMessage(list);
      appendMessage("assistant", listText, {
        shouldPersist: false,
        actions: list.length
          ? [
              { label: "Copy", onClick: () => navigator.clipboard?.writeText(listText).catch(() => {}) },
              { label: "Clear the list", onClick: () => { clearUnanswered(); appendMessage("assistant", "Cleared.", { shouldPersist: false }); } },
            ]
          : [],
      });
      return;
    }
    // A question to answer in words (the AI said so, or "ask: …"): skip the
    // search planner and go to the AI answer below.
    let answerWithAi = false;
    try {
      const modeResult = await handleExplicitSearchMode({
        prompt,
        chatPopupId: CHAT_POPUP_ID,
        hasStructuredResult: Boolean(lastStructuredResult?.rows?.length),
        getLastStructuredResult: () => lastStructuredResult,
        ChatIntent,
        routeChatPrompt,
        buildRecentConversationForAi,
        buildRecentUserMessagesForAi,
        getChatAiConfig,
        appendMessage,
        tryHandleProfileSearchPrompt,
        handleChatResult,
        extractFollowupTableFilterText,
        openResultsTable,
        tryHandleAiPlannedIntent,
        setExplicitMode: setCurrentChatMode,
        continueQueryContext: !newQueryContext,
        translateWtPlusRefinementTerms,
        reRunSavedWtPlusQuery,
        getLastExecutedWtPlusQuery,
      });
      prompt = modeResult.prompt;
      answerWithAi = Boolean(modeResult.answer);
      console.debug("wbe: explicit mode result", {
        handled: Boolean(modeResult?.handled),
        prompt: String(prompt || "").substring(0, 60),
      });
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

    // The AI planner restated the prompt in a canonical form; run it once
    // through the local handlers. Null means nothing local took it.
    async function runRewrittenPrompt(rewrittenPrompt) {
      try {
        const bioResult = await tryHandlePersonBioPrompt(rewrittenPrompt);
        if (bioResult) return bioResult;
      } catch (e) {
        /* fall through to the router */
      }
      const rewrittenRoute = routeChatPrompt(rewrittenPrompt, {
        hasStructuredResult: Boolean(lastStructuredResult?.rows?.length),
      });
      if (!rewrittenRoute?.intent || rewrittenRoute.intent === ChatIntent.FALLBACK_AI) return null;
      return await executeRoutedIntent(rewrittenRoute, rewrittenPrompt);
    }

    const chatOptions = await getChatOptions();
    const routed = routeChatPrompt(prompt, {
      hasStructuredResult: Boolean(lastStructuredResult?.rows?.length),
    });
    const deterministicIntentSet = new Set([
      ChatIntent.CC7_LOCATION_FILTER,
      ChatIntent.CC_SUMMARY,
      ChatIntent.RELATION_COUNT,
      ChatIntent.CONNECTION_LOOKUP,
      ChatIntent.PROFILE_FAMILY_CONNECTION,
      ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH,
      ChatIntent.PERSON_AGE_AT_DEATH,
      ChatIntent.PERSON_AGE_AT_CHILD_BIRTH,
      ChatIntent.PROFILE_DUPLICATES,
      ChatIntent.PERSON_BURIAL,
      ChatIntent.FIND_BIO_RELATIVES,
      ChatIntent.PROFILE_FACT,
      ChatIntent.DNA,
      ChatIntent.FAN_CHART,
      ChatIntent.FRACTAL_TREE,
      ChatIntent.FAMILY_WORLD,
      ChatIntent.CHART_SHORTCUT,
      ChatIntent.DESCENDANT_CHART,
      ChatIntent.FAMILY_TIMELINE,
      ChatIntent.MIGRATION_MAP,
      ChatIntent.LIFESPANS,
      ChatIntent.NAME_CLOUD,
      ChatIntent.FAMILY_CALENDAR,
      ChatIntent.AGES_CHART,
      ChatIntent.TREE_OVERVIEW,
      ChatIntent.FAMILY_MATRIX,
      ChatIntent.PROFILE_SOURCES,
      ChatIntent.PERSON_MARRIAGE,
      ChatIntent.RELATIVE_FACT,
      ChatIntent.CHILD_TWINS,
      ChatIntent.CHILDREN_WITH_CHILDREN,
      ChatIntent.CHILDREN_OUTLIVED,
      ChatIntent.WATCHLIST,
      ChatIntent.ANCESTOR_LIST,
      ChatIntent.DESCENDANT_LIST,
      ChatIntent.SPOUSE_LIST,
      ChatIntent.SPOUSE_BIO,
      ChatIntent.LAST_RESULT_OPERATION,
    ]);
    const shouldPreferDeterministicRoute = deterministicIntentSet.has(routed?.intent);
    if (chatOptions.allowAiFallback && !answerWithAi && !shouldPreferDeterministicRoute && !routed?.params?.profileNarrative) {
      let plannedToolResponse = await tryHandleAiPlannedIntent(prompt);
      if (plannedToolResponse?.rewrittenPrompt) {
        plannedToolResponse = await runRewrittenPrompt(plannedToolResponse.rewrittenPrompt);
      }
      // A search the planner tried and couldn't form ("I couldn't work out a concrete person
      // search…") isn't an answer: go on, so the question still gets one (2026-10-04).
      if (plannedToolResponse && shouldEscalateLocalFailureToAi(plannedToolResponse)) {
        console.debug("wbe: planner's tool couldn't answer; going on", { prompt: String(prompt).slice(0, 60) });
        plannedToolResponse = null;
      }
      if (plannedToolResponse) {
        if (typeof plannedToolResponse === "string") {
          await handleChatResult({ message: plannedToolResponse });
        } else {
          await handleChatResult(plannedToolResponse);
        }
        return;
      }
    }

    let directToolResponse = answerWithAi && routed?.intent === ChatIntent.FALLBACK_AI ? null : await executeRoutedIntent(routed, prompt);
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

    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      recordUnanswered(prompt, "no AI key");
      showNeedsAiKey(prompt);
      return;
    }

    if (!chatOptions.allowAiFallback) {
      recordUnanswered(prompt, "AI answers are turned off");
      appendMessage(
        "assistant",
        "I couldn't answer that with Genie's own tools. Questions like that need AI answers, which are turned off in Genie's options.",
        { actions: buildCantAnswerActions() }
      );
      return;
    }

    // Begin detailed logging for form submission and AI mode
    console.log("wbe: chat form submitted", { prompt });
    const chatMode = document.getElementById("wbe-chat-mode")?.value || "ai";
    console.log("wbe: detected chat mode", { chatMode });
    const conversationContext = buildRecentConversationForAi();
    const recentUserMessages = buildRecentUserMessagesForAi(4);
    const resolvedPeopleContext = buildResolvedPeopleContextForAi();
    let profileContextText = null;
    let pronounHintText = "";
    let contextProfileKey = "";
    // getProfile left the bio out (privacy) or failed: the page shows it.
    let profileBioMissing = false;
    try {
      const textPrompt = String(prompt || "");
      const rememberedPromptPerson = resolvePromptAlias(textPrompt)?.person || null;
      // Extract capitalized name candidates
      const nameCandidates = promptNameCandidates(textPrompt);
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
        let nameCandidate = nameCandidates[0];
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
          const fullName = String(personInfo?.FullName || "").toLowerCase();
          let nameCandidate = nameCandidates.find((candidate) => fullName.includes(candidate.toLowerCase()));
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
      // 5) "where was she born?" names no one: a pronoun means the page's
      // profile person unless the recent conversation names someone it fits
      // (live F1, 2026-10-03: the AI asked which woman "she" was).
      // "what's wrong with this profile?" names the page too (live C11).
      if (
        !profileKey &&
        (/\b(?:he|she|him|his|her|hers|they|them|their)\b/i.test(textPrompt) ||
          /\b(?:this|the\s+current)\s+(?:profile|person|page|man|woman)\b|\bprofile\s+person\b/i.test(textPrompt))
      ) {
        const pageRoot = getProfileSubjectRoot();
        profileKey = pageRoot?.wtId || pageRoot?.key || null;
        if (profileKey) {
          pronounHintText = `Pronouns: "he", "she", "his", "her", "they" or "their", and "this profile/person/page", in the current request, when it names no one, mean the profile person ${profileKey} (shown below) unless the recent conversation names someone the pronoun fits. Don't ask which person is meant.`;
        }
      }
      contextProfileKey = profileKey || "";
      // Fetch profile data if profileKey found
      if (profileKey) {
        try {
          // Dates and places too: a timeline needs them even when the bio is thin.
          const fields =
            "Name,RealName,Gender,BirthDate,BirthLocation,DeathDate,DeathLocation,Bio,Sources,Notes,Categories";
          console.log("wbe: fetching profile for AI context", { profileKey });
          const [profile, status, page_name] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, profileKey, fields, {
            bioFormat: "wiki",
            resolveRedirect: 1,
          });
          console.log("wbe: fetched profile for AI context", { profile, status, page_name });
          const bio = profile?.Bio || profile?.bio || ""; // the API returns "bio"
          profileBioMissing = !bio;
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
          profileBioMissing = true;
          profileContextText = `Note: failed to fetch profile ${profileKey} for additional context (not logged in or API error).`;
        }
      }
    } catch (ctxErr) {
      console.log("wbe: profile context detection error", ctxErr);
    }
    // ...existing code...

    const aiPromptParts = [
      "You are assisting inside the WikiTree Browser Extension chat.",
      WIKITREE_GLOSSARY_FOR_AI,
      AI_CHAT_CLAIM_RULES,
      AI_ANSWER_FORMAT_RULES,
      recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
      conversationContext ? `Recent conversation:\n${conversationContext}` : "",
      resolvedPeopleContext,
      localFailureForAi ? `Local tool attempt failed with: ${localFailureForAi}` : "",
    ];
    if (profileContextText) aiPromptParts.push(profileContextText);
    const dnaContextText = await buildDnaContextForPrompt(prompt, contextProfileKey, conversationContext);
    if (dnaContextText) aiPromptParts.push(dnaContextText);
    const pageContextText = buildPageContextForPrompt(prompt, contextProfileKey, profileBioMissing);
    if (pageContextText) aiPromptParts.push(pageContextText);
    if (pronounHintText) aiPromptParts.push(pronounHintText);
    // "Compare Philip with his son Philip" names the page person, so "his son" is
    // theirs too; the AI said the son's details weren't given (live, 2026-10-04).
    const pageRootForRelatives = getProfileSubjectRoot();
    const relativesRoot =
      pronounHintText || (pageRootForRelatives?.wtId && contextProfileKey === pageRootForRelatives.wtId) ? pageRootForRelatives : null;
    const relativesContextText = await buildRelativeBiosContextForAi(prompt, relativesRoot);
    if (relativesContextText) aiPromptParts.push(relativesContextText);
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
      const answer = parseAiAnswer(response.response || "");
      rememberResolvedPeopleFromMessage(answer.text);
      lastAnswerSubject = nextAnswerSubject(lastAnswerSubject, pickAnswerSubject(answer.text), lastSubjectPrompt);
      if (answer.cannot) recordUnanswered(prompt, answer.text.split("\n")[0].slice(0, 160));
      appendMessage("assistant", answer.text || "No response text returned.", {
        badge: answer.cannot ? "Couldn't answer" : "AI answer",
        // Only follow-ups Genie's own code runs; when the AI couldn't answer,
        // fill up with requests on the same topic for the person asked about.
        actions: suggestionActions(
          vetSuggestions(answer.suggestions, {
            question: prompt,
            id: lastAnswerSubject?.wtId || getProfileRootPerson()?.wtId || "",
            want: answer.cannot ? 3 : Math.min(2, answer.suggestions.length),
          })
        ).map((action) => ({
          ...action,
          onClick: () => sendClarifiedPrompt(action.prompt, { newSearch: true }),
        })),
      });
    } else {
      appendMessage("assistant", localFailureForAi || `Error: ${response?.error || "AI request failed."}`);
    }
  } catch (error) {
    appendMessage("assistant", `Error: ${error?.message || "AI request failed."}`);
  } finally {
    pendingRequestedColumns = null;
    setPendingState(false);
    try {
      hideChatShaky();
    } catch (e) {
      /* ignore */
    }
    // Reset context picker to "Continue" after each send
    const $contextFollowup = document.querySelector('input[name="wbe-chat-context"][value="followup"]');
    if ($contextFollowup) $contextFollowup.checked = true;
    updateContextPickerVisibility();
    $input.focus();
  }
}

// "Beacall-9 fractal", "Jefferson descendants": find the person, then run the
// chart's own prompt for their WikiTree ID (chat_chart_shortcuts.js).
async function runChartShortcut({ chart, owner }, prompt) {
  let key = "";
  if (/-\d+$/.test(owner)) {
    key = owner.charAt(0).toUpperCase() + owner.slice(1); // ("beacall-9")
  } else {
    const found = await resolveConnectionTargetPerson(owner, prompt);
    key = found?.Name || "";
  }
  if (!key) return `I couldn't find who "${owner}" is on WikiTree. Try their WikiTree ID, like Smith-123.`;
  const canonical = chartShortcutCanonicalPrompt(chart, key);
  const routed = routeChatPrompt(canonical);
  if (!routed?.intent || routed.intent === ChatIntent.CHART_SHORTCUT || routed.intent === ChatIntent.FALLBACK_AI) return null;
  return await executeRoutedIntent(routed, canonical);
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

    return await tryHandleConnectionPrompt(prompt, routed.params?.target, {
      sourceOverride: routed.params?.source || "",
    });
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
  if (routed.intent === ChatIntent.CHILDREN_OUTLIVED) {
    return await tryHandleOutlivedPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.CHILDREN_WITH_CHILDREN) {
    return await tryHandleChildrenWithChildrenPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.CHILD_TWINS) {
    return await tryHandleTwinsPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.RELATIVE_FACT) {
    return await tryHandleRelativeFactPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PERSON_MARRIAGE) {
    return await tryHandlePersonMarriagePrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PROFILE_SOURCES) {
    return await tryHandleProfileSourcesPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.MIGRATION_MAP) {
    return await tryHandleMigrationMapPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FAMILY_MATRIX) return await tryHandleFamilyMatrixPrompt(routed.params, prompt);
  if (routed.intent === ChatIntent.TREE_OVERVIEW) {
    return await tryHandleTreeOverviewPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.AGES_CHART) {
    return await tryHandleAgesPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FAMILY_CALENDAR) {
    return await tryHandleFamilyCalendarPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.NAME_CLOUD) {
    return await tryHandleNameCloudPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.LIFESPANS) {
    return await tryHandleLifespansPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FAMILY_TIMELINE) {
    return await tryHandleFamilyTimelinePrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.DESCENDANT_CHART) {
    return await tryHandleDescendantChartPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FAMILY_WORLD) {
    return await tryHandleFamilyWorldPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.CHART_SHORTCUT) {
    return await runChartShortcut(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FRACTAL_TREE) {
    return await tryHandleFractalTreePrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FAN_CHART) {
    return await tryHandleFanChartPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.DNA) {
    return await tryHandleDnaPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PROFILE_FACT) {
    return await tryHandleProfileFactPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PERSON_BURIAL) {
    return await tryHandlePersonBurialPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.FIND_BIO_RELATIVES) {
    return await tryHandleFindBioRelativesPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PROFILE_DUPLICATES) {
    return await tryHandleProfileDuplicatesPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.PERSON_AGE_AT_CHILD_BIRTH) {
    return await tryHandlePersonAgeAtChildBirthPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.ANCESTOR_LIST) {
    return groupKinListResult(await tryHandleAncestorListPrompt(routed.params, prompt), routed.params?.groupBy);
  }
  if (routed.intent === ChatIntent.DESCENDANT_LIST) {
    return groupKinListResult(await tryHandleDescendantListPrompt(routed.params, prompt), routed.params?.groupBy);
  }
  if (routed.intent === ChatIntent.SPOUSE_LIST) {
    return await tryHandleSpouseListPrompt(routed.params, prompt);
  }
  if (routed.intent === ChatIntent.SPOUSE_BIO) {
    return await tryHandleSpouseBioIntent(routed.params || {}, prompt);
  }
  if (routed.intent === ChatIntent.PROFILE_SEARCH) {
    console.debug("wbe: executeRoutedIntent PROFILE_SEARCH", { prompt: String(prompt).substring(0, 60) });
    const profileSearchResult = await tryHandleProfileSearchPrompt(routed.params, prompt);
    console.debug("wbe: PROFILE_SEARCH result from main flow", {
      hasResult: Boolean(profileSearchResult),
      switchToMode: profileSearchResult?.switchToMode,
    });
    const followupFilterText = extractFollowupTableFilterText(prompt);
    const hasStructuredRows = Boolean(lastStructuredResult?.rows?.length);
    const isNoProfileMatchMessage =
      typeof profileSearchResult === "string" && /couldn't\s+find\s+profile\s+matches/i.test(profileSearchResult);

    if (isNoProfileMatchMessage && hasStructuredRows && followupFilterText) {
      openResultsTable(lastStructuredResult, { initialSearch: followupFilterText });
      return {
        message: `I treated that as a follow-up on the current result set and opened the table filtered for \"${followupFilterText}\".`,
      };
    }

    return profileSearchResult;
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
  const lastNameOther = person.LastNameOther || "";
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
  let marriageDate = "";
  let marriageLocation = "";
  try {
    const rawSpouses = person?.Spouses;
    const spouseEntries = Array.isArray(rawSpouses)
      ? rawSpouses
      : rawSpouses && typeof rawSpouses === "object"
      ? Object.values(rawSpouses)
      : [];

    if (spouseEntries.length) {
      spouseList = spouseEntries.map((s) => {
        const first = String(s?.FirstName || s?.RealName || "").trim();
        const lnab = String(s?.LastNameAtBirth || s?.LastNameCurrent || s?.LastNameOther || "").trim();
        const spouseMarriageDate =
          normalizeKnownDate(s?.MarriageDate) ||
          normalizeKnownDate(s?.marriage_date) ||
          normalizeKnownDate(s?.marriageDate) ||
          "";
        const spouseMarriageLocation = String(
          s?.MarriageLocation || s?.marriage_location || s?.marriageLocation || ""
        ).trim();
        return {
          wtid: s?.Name || "",
          firstName: first,
          lnab,
          display: first || String(s?.RealName || s?.Name || "").trim(),
          marriageDate: spouseMarriageDate,
          marriageLocation: spouseMarriageLocation,
        };
      });
      const parts = spouseList.map((p) => [p.firstName, p.lnab].filter(Boolean).join(" ")).filter(Boolean);
      spouse = parts.join(", ");

      const uniqueMarriageDates = [...new Set(spouseList.map((p) => p.marriageDate).filter(Boolean))];
      const uniqueMarriageLocations = [...new Set(spouseList.map((p) => p.marriageLocation).filter(Boolean))];
      marriageDate = uniqueMarriageDates.join("; ");
      marriageLocation = uniqueMarriageLocations.join("; ");
    }
  } catch (e) {
    spouse = "";
    marriageDate = "";
    marriageLocation = "";
  }

  return {
    displayName,
    wtid: wtId,
    firstName: person.FirstName || person.RealName || (isPrivatePlaceholder ? displayName : ""),
    middleName: person.MiddleName || "",
    lnab,
    lastNameCurrent,
    lastNameOther,
    spouse,
    spouseList,
    marriageDate,
    marriageLocation,
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
    // The h1 now keeps the name in a span, which getProfilePersonInfo strips (2026-10-03).
    displayName: person.FullName || $("h1 [data-cy='person-name']").first().text().trim() || [person.FirstName, person.LastNameAtBirth].filter(Boolean).join(" ") || person.Name,
  };
}

// "how many siblings do I have" counted the page person's (live C4, 2026-10-03).
// "I" only after an auxiliary or at the start, so "Henry I" stays a name.
function promptRefersToUser(prompt) {
  const text = String(prompt || "");
  return /\b(my|me|mine|myself)\b/i.test(text) || /\b(?:do|am|have|did|was|can)\s+i\b|^\s*i\s/i.test(text);
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

// Connection source precedence lives in chat_connection_source.js; explicit
// user references and named endpoints are resolved before the page default.

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

// The text of the page the user is on, for the general AI fallback
// (chat_page_context.js). Space, Help, Project and other pages have no bio in
// getProfile, so their page text goes whenever the question is about the page
// or names no profile. A person profile's goes only when getProfile gave no
// bio for that profile (privacy).
// A DNA question about a profile: its connected DNA tests from the API (getConnectedDNATestsByProfile),
// so the AI doesn't say there are none (Murray, Chicoine_dit_Henley-1, 2026-10-05). On the
// profile page, its DNA Connections box adds what the API doesn't give: each taker's likely share.
// Shared-DNA figures go with any DNA or cM question, and with "what's your source?" after
// a reply that gave cM: a user asked for a citation and got none (De_Figuery-1, 2026-10-06).
async function buildDnaContextForPrompt(prompt, contextProfileKey, conversationContext = "") {
  const asksForSource = /\b(?:cite|citations?|sources?|references?|evidence)\b|where\s+(?:did|does|do)\s+.*\b(?:from|get)\b/i.test(prompt) && /\bcM\b/.test(conversationContext);
  const wantsReference = isDnaPrompt(prompt) || /\bcM\b|centimorgans?/i.test(prompt) || asksForSource;
  if (!wantsReference) return "";
  const reference = dnaReferenceForAi();
  if (!isDnaPrompt(prompt)) return reference;
  return [reference, await buildDnaTestsContextForPrompt(prompt, contextProfileKey)].filter(Boolean).join("\n\n");
}

async function buildDnaTestsContextForPrompt(prompt, contextProfileKey) {
  try {
    const pageRoot = getProfileSubjectRoot();
    // ("who could test?" names no one: on a profile page, the page person)
    if (!contextProfileKey && pageRoot && getCurrentPageInfo().isPersonProfile) contextProfileKey = pageRoot.wtId || String(pageRoot.key);
    if (!contextProfileKey) return "";
    const [result] = (await WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, action: "getConnectedDNATestsByProfile", key: contextProfileKey })) || [];
    const tests = result?.dnaTests || [];
    const fromApi = tests.length
      ? `DNA TESTS CONNECTED to ${contextProfileKey} (from WikiTree's API):\n${buildConnectedTestsAnswer(tests, contextProfileKey)}\nHaplogroups reported by these tests (each is the test-taker's own line; it is ${contextProfileKey}'s only for a Y-DNA or mtDNA test on that line): ${buildHaplogroupAnswer(tests, contextProfileKey)}`
      : `DNA TESTS CONNECTED: WikiTree shows none connected to ${contextProfileKey}.`;
    const onPage = pageRoot && [pageRoot.wtId, String(pageRoot.key)].includes(contextProfileKey);
    const shares = onPage && tests.length ? extractDnaConnectionsText() : "";
    return shares ? `${fromApi}\n\nLikely shared DNA, from the profile page's DNA Connections box:\n${shares}` : fromApi;
  } catch (e) {
    console.debug("wbe: DNA context for AI failed", e);
    return "";
  }
}

function buildPageContextForPrompt(prompt, contextProfileKey, profileBioMissing) {
  try {
    const pageInfo = getCurrentPageInfo();
    if (!pageInfo.isPersonProfile) {
      if (contextProfileKey && !isCurrentPagePrompt(prompt)) return "";
      return buildCurrentPageContextForAi();
    }
    const pageRoot = getProfileSubjectRoot();
    const aboutPagePerson =
      contextProfileKey && pageRoot && [pageRoot.wtId, String(pageRoot.key)].includes(contextProfileKey);
    if (!aboutPagePerson && !(isCurrentPagePrompt(prompt) && !contextProfileKey)) return "";
    if (contextProfileKey && !profileBioMissing) return "";
    return buildCurrentPageContextForAi(document, window.location, { includePersonProfile: true });
  } catch (e) {
    console.debug("wbe: page context for AI failed", e);
    return "";
  }
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

// F4, "what did her husband do for a living?": the answer is in the relative's
// bio, so the AI gets those bios too (a few, trimmed).
const RELATIVE_BIO_LIMIT = 4;
const RELATIVE_BIO_CHARS = 6000;
async function buildRelativeBiosContextForAi(prompt, pageRoot) {
  const match = String(prompt || "").match(
    /\b(?:his|her|their)\s+(mother|father|parents?|husbands?|wife|wives|spouses?|sons?|daughters?|children|brothers?|sisters?|siblings?)\b/i
  );
  if (!match || !pageRoot?.wtId) return "";
  const { list, gender } = relationSelector(match[1]);
  try {
    const [entry] = (await WikiTreeAPI.getRelatives(
      WBE_CHAT_APP_ID,
      pageRoot.wtId,
      "Id,Name,RealName,Gender,BirthDate,BirthLocation,DeathDate,DeathLocation,Bio",
      { [`get${list}`]: 1, bioFormat: "wiki" }
    )) || [];
    const people = Object.values(entry?.person?.[list] || {})
      .filter((person) => !gender || person?.Gender === gender)
      .slice(0, RELATIVE_BIO_LIMIT);
    if (!people.length) return "";
    const blocks = people.map((person) => {
      const bio = String(person?.Bio || person?.bio || "").slice(0, RELATIVE_BIO_CHARS); // the API returns "bio"
      const facts = [
        person.BirthDate ? `born ${person.BirthDate}${person.BirthLocation ? ` in ${person.BirthLocation}` : ""}` : "",
        person.DeathDate ? `died ${person.DeathDate}${person.DeathLocation ? ` in ${person.DeathLocation}` : ""}` : "",
      ]
        .filter(Boolean)
        .join("; ");
      return `${match[1]} of ${pageRoot.wtId}: ${person.RealName || person.Name} (${person.Name})${facts ? ` — ${facts}` : ""}\nBIO:\n${bio || "(empty)"}`;
    });
    return `Relatives named in the request, with their biographies:\n\n${blocks.join("\n\n")}`;
  } catch (error) {
    console.log("wbe: relative bios for AI context failed", error);
    return "";
  }
}


/**
 * True when the member is signed in to WikiTree but the API doesn't know it (the separate Apps Login), so answers miss
 * the private profiles they could otherwise see. Asked of the API rather than read from the page's Apps button, which
 * isn't on every page. If it can't be told, false: better no hint than a wrong one. The API keeps the answer per page.
 */
async function isLoggedOutOfAppsServer() {
  const userNumId = getUserNumId();
  if (!userNumId) return false;
  try {
    return !(await WikiTreeAPI.isLoggedIntoAPI(userNumId, CHAT_APPS_LOGIN_BUTTON_APP_ID));
  } catch (error) {
    console.debug("wbe: apps login check failed", error);
    return false;
  }
}

// On any page, when the API says the member isn't logged in to it: the hint carries its own Apps button, so it no
// longer depends on the one on the page. Turning that button off in Usability Tweaks ("none") turns this off too.
async function shouldOfferAppsLoginHint() {
  if (hasAppsLoginHintAlready()) {
    return false;
  }

  let usabilityOptions = {};
  try {
    usabilityOptions = (await getFeatureOptions("usabilityTweaks")) || {};
  } catch (error) {
    console.debug("wbe: usability options unavailable for apps login hint; using defaults", {
      error: String(error?.message || error),
    });
  }
  if ((usabilityOptions.addApiLoginButton || "all") === "none") {
    return false;
  }

  return isLoggedOutOfAppsServer();
}

async function maybeAppendAppsLoginHint() {
  if (await shouldOfferAppsLoginHint()) {
    appendMessage("assistant", CHAT_APPS_LOGIN_HINT, { shouldPersist: false });
    const $chips = $(`#${CHAT_MESSAGES_ID} .chat-welcome-chips`); // (keep the chips last)
    $chips.parent().append($chips);
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

// Chart buttons along the top of Genie (2026-10-03): one click opens a chart
// for the profile person (or for you, off a profile). Each sends the typed
// shortcut ("Beacall-9 fan chart"), so people see they can type it for anyone.
// Chart-bar buttons that only make sense when the profile has a DNA test of that type,
// taken or connected (the user, 2026-10-04: "if the profile person didn't take a test… useless").
const DNA_BAR_BUTTON_TYPES = { ydnamap: "yDNA" };
const profileDnaTypesCache = new Map();
// "Who could test?" needs a profile the API can read. For an ancestor it lists their line's
// carriers; for a living person, the people who share their lines (from each line's furthest ancestor).
const profileIsReadableCache = new Map();

/** The test types in this page's "DNA tested" box (empty when there's no box). */
function pageDnaTestTypes() {
  const $box = $("h4")
    .filter((index, heading) => /^\s*DNA tested\b/i.test($(heading).text()))
    .first()
    .parent();
  const slugs = $box
    .find("a[href*='Special:DNATests']")
    .map((index, link) => (String($(link).attr("href") || "").match(/[?&]t=([A-Za-z0-9_]+)/) || [])[1] || "")
    .get();
  return dnaTypesFromTestSlugs(slugs);
}

function profileIsReadable(wtid) {
  if (!profileIsReadableCache.has(wtid)) {
    const lookup = WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, action: "getProfile", key: wtid, fields: "Id,IsLiving" })
      .then(([result] = []) => (result?.profile?.Id ? { living: Number(result.profile.IsLiving) === 1 } : null))
      .catch(() => null);
    profileIsReadableCache.set(wtid, lookup);
  }
  return profileIsReadableCache.get(wtid);
}

/** The DNA test types connected to a profile (a taker's own tests are connected too), remembered per profile. */
function profileDnaTypes(wtid) {
  if (!profileDnaTypesCache.has(wtid)) {
    const lookup = WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, action: "getConnectedDNATestsByProfile", key: wtid })
      .then(([result] = []) => new Set((result?.dnaTests || []).map((test) => test.dna_type).filter(Boolean)))
      .catch(() => new Set());
    profileDnaTypesCache.set(wtid, lookup);
  }
  return profileDnaTypesCache.get(wtid);
}

function renderChartBar($popup) {
  const $bar = $popup.find(".chat-chart-bar").empty();
  const profile = getProfileRootPerson();
  const wtid = profile?.wtId || getUserWtId() || "";
  if (!wtid) return;
  const who = profile ? String(profile.displayName || wtid).trim().split(/\s+/)[0] : "you";
  $("<span>").addClass("chat-chart-bar-label").text(`Charts for ${who}:`).attr("title", `Or type a name or ID and a chart, like "${wtid} fan chart" or "Jefferson descendants"`).appendTo($bar);
  const onPersonProfilePage = Boolean(profile) && getCurrentPageInfo().isPersonProfile;
  CHART_BAR_KEYS.forEach((key) => {
    const chart = CHART_SHORTCUTS.find((item) => item.key === key);
    const $button = $("<button>")
      .attr({ type: "button", title: chart.title })
      .addClass("chat-chart-bar-button")
      .text(chart.label)
      .on("click", () => {
        $(`#${CHAT_INPUT_ID}`).val(chartButtonPrompt(key, wtid));
        void sendChatPrompt();
      })
      .appendTo($bar);
    // (the page's "DNA tested" box answers at once for the person on the page; the user, 2026-10-04)
    const pageTypes = profile ? pageDnaTestTypes() : new Set();
    const dnaType = DNA_BAR_BUTTON_TYPES[key];
    if (dnaType && !pageTypes.has(dnaType)) {
      $button.prop("hidden", true);
      profileDnaTypes(wtid).then((types) => $button.prop("hidden", !types.has(dnaType)));
    }
    // Only on a person's profile page (the user, 2026-10-05): not for you off a profile, nor on
    // Special:EditPerson, where Paddy asked it about a profile the API didn't have yet.
    if (key === "dnatesters" && !onPersonProfilePage) {
      $button.remove();
      return;
    }
    if (key === "dnatesters" && !pageTypes.size) {
      // An ancestor: who carries their lines. A living person who hasn't tested: hidden.
      $button.prop("hidden", true);
      profileIsReadable(wtid).then((info) => $button.prop("hidden", !info || info.living));
    }
  });
  $bar.prop("hidden", false);
}

// Example prompts under the welcome message (2026-10-03), so people find the
// charts without knowing what to type. Clicking one sends it.
const WELCOME_CHIPS_SHOWN = 6;

// Whether an AI key is set: null until known (syncChatVisibilityToKeys).
let aiAvailable = null;
// The no-key tip on search results shows once per page.
let noKeyTipShown = false;

// ai: false when there's no AI key ("How am I related to…?" needs the AI
// planner; "My connection to…" is handled by Genie's own code).
// Without an AI key, a chip opens the search form instead of sending a prompt.
export const SEARCH_FORM_CHIP = "Search by name, place or date";
// Without an AI key, a chip opens the tested list of what works without AI.
export const WHAT_CAN_I_TYPE = "What can I type?";

export function welcomeChipPrompts(profileFirstName, { ai = true } = {}) {
  const prompts = profileFirstName
    ? [ai ? `How am I related to ${profileFirstName}?` : `My connection to ${profileFirstName}`, "Tree overview", "Fan chart", "Family Explorer", "Map this person's ancestors", "On this day in this family", "Lifespans", "Ancestors in history", "Surnames", "Name cloud", "X-DNA chart", "Descendant chart", "Family timeline"]
    : ["Tell me about my tree", "Show my fan chart", "Show my Family Explorer", "Map my ancestors", "How complete is my tree?", "How long did my ancestors live?", "What history did my ancestors live through?", "What surnames are in my tree?", "Who could I have inherited X-DNA from?", "On this day in my family", "Show my descendant chart", "Show my family timeline"];
  return ai ? prompts : [prompts[0], SEARCH_FORM_CHIP, WHAT_CAN_I_TYPE, ...prompts.slice(1)];
}

function appendWelcomeChips() {
  const $messages = $(`#${CHAT_MESSAGES_ID}`);
  if (!$messages.length) return;
  $messages.find(".chat-welcome-chips").remove();
  const $chips = $("<div>").addClass("chat-message-actions chat-welcome-chips").attr("aria-label", "Try these");
  const profile = getProfileRootPerson();
  const profileFirstName = profile ? String(profile.displayName || profile.wtId).trim().split(/\s+/)[0] || profile.wtId : "";
  // The first few show; "More…" opens the rest (there are a dozen charts now).
  // On a Space, Help, Project or Category page, questions about the page come first.
  const pageChips = profile ? [] : currentPageChipPrompts(getCurrentPageInfo(), { ai: aiAvailable !== false });
  const prompts = [...pageChips, ...welcomeChipPrompts(profileFirstName, { ai: aiAvailable !== false })];
  prompts.forEach((prompt, index) => {
    $("<button>")
      .attr("type", "button")
      .addClass("chat-message-action")
      .toggle(index < WELCOME_CHIPS_SHOWN)
      .text(prompt)
      .on("click", () => {
        if (prompt === WHAT_CAN_I_TYPE) {
          showNoAiExamples(); // (the chips stay for when the panel closes)
          return;
        }
        $chips.remove();
        if (prompt === SEARCH_FORM_CHIP) {
          appendMessage("assistant", "Fill in what you know, then press Search.", { searchForm: {} });
          return;
        }
        $(`#${CHAT_INPUT_ID}`).val(prompt);
        void sendChatPrompt();
      })
      .appendTo($chips);
  });
  if (prompts.length > WELCOME_CHIPS_SHOWN) {
    $("<button>")
      .attr("type", "button")
      .addClass("chat-message-action chat-welcome-more")
      .text("More…")
      .on("click", function () {
        $chips.children().show();
        $(this).remove();
      })
      .appendTo($chips);
  }
  $messages.append($chips);
}

function openPopup() {
  let $popup = $(`#${CHAT_POPUP_ID}`);
  if ($popup.length === 0) {
    $popup = $(
      `<div id="${CHAT_POPUP_ID}" class="wbe-popup chat-popup">
        <div class="chat-popup-header">
          <strong>Genie <button type="button" class="chat-help-button" aria-label="Genie Help" title="Help: what can I type?">?</button></strong>
          <div class="chat-popup-controls">
            <button id="wbe-genie-ai-toggle" type="button" role="switch" aria-checked="false" hidden><span class="chat-ai-label">AI</span><span class="chat-ai-state chat-ai-state-off">Off</span><span class="chat-ai-switch"><span class="chat-ai-knob"></span></span><span class="chat-ai-state chat-ai-state-on">On</span></button>
            <button id="${CHAT_CLEAR_ID}" type="button" class="small" title="Clear chat">Clear</button>
            <button type="button" class="small close-popup" aria-label="Close" title="Close">&times;</button>
          </div>
        </div>
        <div class="chat-chart-bar" aria-label="Charts" hidden></div>
        <div class="chat-popup-body">
          <div id="${CHAT_MESSAGES_ID}" class="chat-messages"></div>
          <div class="chat-input-row">
            <textarea id="${CHAT_INPUT_ID}" rows="2" placeholder="Search WikiTree, or ask a question" style="flex:1;min-height:48px"></textarea>
            <div id="${CHAT_WTPLUS_SUGGESTION_PICKER_ID}" class="chat-wtplus-suggestion-picker" style="display:none">
              <label for="${CHAT_WTPLUS_SUGGESTION_SELECT_ID}">WT+ suggestion</label>
              <select id="${CHAT_WTPLUS_SUGGESTION_SELECT_ID}"></select>
            </div>
            <div class="chat-input-actions">
              <span id="wbe-chat-mode-notice" class="chat-mode-notice" aria-live="polite"></span>
              <div id="${CHAT_CONTEXT_CONTROLS_ID}" class="chat-mode-controls chat-context-controls" aria-label="Next query context" style="display:none">
                <div class="chat-mode-controls-title">Next</div>
                <label class="chat-mode-option"><input type="radio" name="wbe-chat-context" value="followup" checked /><span>Continue</span></label>
                <label class="chat-mode-option"><input type="radio" name="wbe-chat-context" value="new" /><span>New</span></label>
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
    $popup.find("#wbe-genie-ai-toggle").on("click", toggleAiPaused);
    $popup.find(".chat-help-button").on("click", () => showNoAiExamples());
    $popup.find(`#${CHAT_CLEAR_ID}`).on("click", () => {
      clearHistory();
      // ("profiles I manage with no sources" after Clear was added onto the cleared Devon search; live, 2026-10-10)
      profileSearchHandlers.resetLastExecutedWtPlusQuery?.();
      appendWelcomeChips();
    });
    $popup.find(`#${CHAT_SEND_ID}`).on("click", sendChatPrompt);
    $popup.find('input[name="wbe-chat-mode"]').on("change", (event) => {
      persistChatMode(event?.target?.value || getCurrentChatMode());
      clearChatModeNotice($popup);
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
    renderChartBar($popup);
    loadHistory();
    ensureResolvedPersonMemoryLoaded();
    renderHistory();
    bindWtPlusSuggestionPicker($popup);
    // Until something has been asked, greet and offer the chips. (The greeting used to be
    // saved, so a tab that had opened Genie once never showed the chips again.)
    if (!chatHistory.some((entry) => entry?.role === "user")) {
      if (!chatHistory.length) appendMessage("assistant", "Genie is ready. Ask a question to begin.", { shouldPersist: false });
      appendWelcomeChips();
    }
    void maybeAppendAppsLoginHint();

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
  applyAiAvailability();
  hasAnyApiKey().then((hasKey) => {
    aiAvailable = hasKey;
    applyAiAvailability();
  });
  restoreChatMode($popup);
  positionPopupForOpen($popup.get(0));
  setHighestZIndex($popup.get(0));
  $popup.find(`#${CHAT_INPUT_ID}`).focus();
}

export function openChatPopup() {
  installChatDebugConsole();
  watchForWikiTreeButtons();
  openPopup();
}

function ensureChatButton() {
  if (document.getElementById(CHAT_BUTTON_ID)) return;
  const container = ensureButtonContainer();
  if (!container) return;
  const iconUrl = chrome.runtime.getURL("images/genie.svg");
  const $button = $(
    `<a id="${CHAT_BUTTON_ID}" href="#" class="wbe-button" data-tooltip="Genie" data-bs-title="Genie" data-bs-toggle="tooltip" title="Open Genie"><span class="icon--chat" style="background-image:url(${iconUrl})"></span></a>`
  );
  $button.on("click", (e) => {
    e.preventDefault();
    openPopup();
  });
  $(container).append($button);
}

// Genie is for everyone (2026-10-04): the charts and the prompts Genie's own code
// understands need no AI. Without a key, only questions that need AI are
// turned away (with chart buttons instead), and the hint says so.
async function syncChatVisibilityToKeys() {
  ensureChatButton();
  aiAvailable = await hasAnyApiKey();
  applyAiAvailability();
}

// The "AI On / Off" switch: with a key, switch AI off to see Genie as someone without
// one does. Without a key, it stays off and explains why a key is worth having.
async function toggleAiPaused() {
  // After the extension is reloaded or updated, a page that was already open
  // can't read the settings any more, so the saved key looks missing.
  if (!extensionContextAlive()) {
    appendMessage("assistant", "The extension was updated or reloaded since this page opened, so Genie can't read your settings here. Reload this page and switch AI on again.", {
      shouldPersist: false,
    });
    return;
  }
  const config = await getChatAiConfig({ ignorePause: true });
  const hasRealKey = Boolean(config?.key);
  if (!hasRealKey) {
    // Which AI settings Genie could see (never the keys themselves).
    try {
      const options = (await getChatOptions()) || {};
      console.info("wbe: AI switch found no key", {
        provider: config?.provider,
        selected: options.aiProvider,
        keysSaved: SHARED_AI_KEY_IDS.filter((keyId) => String(options[keyId] || "").trim()),
      });
    } catch (error) {
      /* diagnostics only */
    }
    showAiKeyHelp();
    return;
  }
  const paused = !isAiPaused();
  setAiPaused(paused);
  aiAvailable = await hasAnyApiKey();
  applyAiAvailability();
  appendMessage(
    "assistant",
    paused
      ? "AI is off. Genie now works as it does for someone without an AI key (your key is still saved). Use the AI switch at the top to turn it back on."
      : "AI is on.",
    { shouldPersist: false }
  );
}

function extensionContextAlive() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch (error) {
    return false;
  }
}

// Inside the popup: a body-level overlay ends up under it (see .wbe-popup z-index).
function showAiKeyHelp() {
  const $popup = $(`#${CHAT_POPUP_ID}`);
  if (!$popup.length) return;
  $popup.find(".chat-ai-help").remove();
  const $help = $(aiKeyHelpHtml()).appendTo($popup);
  $help.find(".chat-ai-help-close").on("click", () => $help.remove());
  $help.find(".chat-ai-help-examples").on("click", () => showNoAiExamples());
  $help.find(".chat-ai-help-settings").on("click", () => {
    try {
      chrome.runtime.sendMessage({ action: "openWbeOptions" });
    } catch (error) {
      console.info("wbe: couldn't open the settings page", error);
    }
  });
  $help.find(".chat-ai-help-close").trigger("focus");
}

// "What can I type?": the tested examples that work without AI. An example
// runs when clicked; one that needs a result first just goes in the box.
function showNoAiExamples() {
  const $popup = $(`#${CHAT_POPUP_ID}`);
  if (!$popup.length) return;
  $popup.find(".chat-ai-help").remove();
  const $help = $(noAiExamplesHtml()).appendTo($popup);
  $help.find(".chat-ai-help-close").on("click", () => $help.remove());
  $help.find(".chat-help-ai-key").on("click", () => showAiKeyHelp());
  $help.find(".chat-example").on("click", function () {
    const prompt = String($(this).data("prompt") || "");
    const waitForResult = $(this).data("needs-result") && !lastStructuredResult?.rows?.length;
    $help.remove();
    $(`#${CHAT_INPUT_ID}`).val(prompt).trigger("focus");
    if (!waitForResult) void sendChatPrompt();
  });
  $help.find(".chat-ai-help-close").trigger("focus");
}

async function refreshAiToggle($popup) {
  const $toggle = $popup.find("#wbe-genie-ai-toggle");
  const hasRealKey = Boolean((await getChatAiConfig({ ignorePause: true }))?.key);
  const paused = isAiPaused();
  const on = hasRealKey && !paused;
  $toggle
    .prop("hidden", false)
    .toggleClass("chat-ai-on", on)
    .toggleClass("chat-ai-off", hasRealKey && paused)
    .toggleClass("chat-ai-nokey", !hasRealKey)
    .attr("aria-checked", String(on))
    .attr(
      "title",
      !hasRealKey
        ? "AI is off: no AI key yet. Click to see what AI adds and how to get a key."
        : paused
        ? "AI is off: Genie answers as it would without a key. Click to turn it back on."
        : "AI is on. Click to turn it off and try Genie as someone without an AI key (your key stays saved)."
    );
}

// The box hint, and the welcome chips' wording, follow whether an AI key is set.
function applyAiAvailability() {
  const $popup = $(`#${CHAT_POPUP_ID}`);
  if (!$popup.length) return;
  refreshAiToggle($popup);
  $popup
    .find(`#${CHAT_INPUT_ID}`)
    .attr(
      "placeholder",
      aiAvailable === false
        ? isAiPaused()
          ? "Search WikiTree, or pick a chart (AI is off)"
          : "Search WikiTree, or pick a chart (add an AI key in Options to ask questions)"
        : "Search WikiTree, or ask a question"
    );
  if ($popup.find(".chat-welcome-chips").length) appendWelcomeChips();
}

function init() {
  syncChatVisibilityToKeys();
  bindOutsideClickToCloseChat();

  // Restore persisted chat state (history, last structured/table, last bio)
  try {
    loadHistory();
    if (document.getElementById(CHAT_POPUP_ID)) {
      renderHistory();
    }
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
