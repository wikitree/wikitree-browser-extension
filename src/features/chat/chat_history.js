import $ from "jquery";
import { escapeHtml } from "../../core/lib/diff_utils";
import { renderSearchForm } from "./chat_search_form";
import { isTreeAppAction } from "./chat_tree_apps";

export function createChatHistoryHandlers({
  chatMessagesId,
  chatSessionKey,
  chatLastConnectionKey,
  chatLastStructuredKey,
  chatLastBioKey,
  chatResultsPopupId,
  chatResultsTableId,
  sendClarifiedPrompt,
  getChatHistory,
  setChatHistory,
  getLastNonRetryUserPrompt,
  setLastNonRetryUserPrompt,
  getLastConnectionPopupResult,
  setLastConnectionPopupResult,
  getLastStructuredResult,
  setLastStructuredResult,
  getLastBioPopupId,
  setLastBioPopupState,
  toggleConnectionsPopup,
  rebuildChartAction,
  openResultsTable,
  resolveToWTID,
  showBioPopupForId,
  openWtPlusQuery,
  tryHandleProfileSearchPrompt,
  reRunSavedWtPlusQuery,
  handleChatResult,
  afterActionClick,
  resetTransientState,
  onSearchFormSubmit,
  createAppsLoginButton,
}) {
  let historyQuotaWarningShown = false;
  const MAX_PERSISTED_STRUCTURED_ROWS = 250;

  function shouldPersistStructuredTable(table) {
    return Array.isArray(table?.rows) && table.rows.length > 0 && table.rows.length <= MAX_PERSISTED_STRUCTURED_ROWS;
  }

  function stripHeavyHistoryPayloads(history) {
    return (Array.isArray(history) ? history : []).map((entry) => {
      if (!entry || !entry.structured) return entry;
      const rowCount = Array.isArray(entry.structured?.rows) ? entry.structured.rows.length : 0;
      if (rowCount <= MAX_PERSISTED_STRUCTURED_ROWS) return entry;
      const nextEntry = { ...entry };
      delete nextEntry.structured;
      return nextEntry;
    });
  }

  function pruneHistoryForQuota(history) {
    let nextHistory = stripHeavyHistoryPayloads(history);
    while (nextHistory.length > 20) {
      try {
        sessionStorage.setItem(chatSessionKey, JSON.stringify(nextHistory));
        return true;
      } catch (error) {
        nextHistory = nextHistory.slice(2);
      }
    }

    try {
      sessionStorage.setItem(chatSessionKey, JSON.stringify(nextHistory));
      return true;
    } catch (error) {
      return false;
    }
  }

  function invokeChatAction(action) {
    if (typeof action?.onClick !== "function") {
      return;
    }

    let handledAsync = false;
    try {
      const result = action.onClick();
      if (result && typeof result.then === "function") {
        handledAsync = true;
        result.finally(() => {
          if (typeof afterActionClick === "function") {
            afterActionClick();
          }
        });
        return;
      }
    } finally {
      if (!handledAsync && typeof afterActionClick === "function") {
        afterActionClick();
      }
    }
  }

  function getHistory() {
    const history = getChatHistory?.();
    return Array.isArray(history) ? history : [];
  }

  function getMessageList() {
    return $(`#${chatMessagesId}`);
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(chatSessionKey, JSON.stringify(getHistory()));
      return true;
    } catch (error) {
      const isQuotaError = error?.name === "QuotaExceededError" || /quota/i.test(String(error?.message || error || ""));
      if (isQuotaError) {
        console.info("wbe: chat history sessionStorage quota exceeded", { chatSessionKey, error });
      } else {
        console.info("wbe: chat history sessionStorage save failed", { chatSessionKey, error });
      }
      const pruned = pruneHistoryForQuota(getHistory());
      if (pruned) {
        setChatHistory(stripHeavyHistoryPayloads(getHistory()).slice(-20));
      }
      return pruned;
    }
  }

  function isRetryPrompt(prompt) {
    const value = String(prompt || "").trim();
    if (!value) {
      return false;
    }
    return /^(?:try\s+again[a-z]*|retry|re-try|again|one\s+more\s+time|rerun|re-run)\W*$/i.test(value);
  }

  function refreshLastNonRetryUserPrompt() {
    setLastNonRetryUserPrompt("");
    const history = getHistory();
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const message = history[i];
      if (message?.role !== "user") {
        continue;
      }
      if (!isRetryPrompt(message.text)) {
        setLastNonRetryUserPrompt(String(message.text || "").trim());
        return;
      }
    }
  }

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(chatSessionKey);
      setChatHistory(raw ? JSON.parse(raw) : []);
      refreshLastNonRetryUserPrompt();
    } catch (error) {
      setChatHistory([]);
      setLastNonRetryUserPrompt("");
    }

    try {
      const sanitized = getHistory().map((entry) => {
        if (!entry) return entry;
        const nextEntry = { ...entry };
        const inlineMore = nextEntry.inlineMore;
        if (!inlineMore) return nextEntry;
        if (typeof inlineMore === "number") {
          nextEntry.inlineMore = { text: null };
          return nextEntry;
        }
        if (typeof inlineMore === "object") {
          const nextInlineMore = { ...inlineMore };
          if (Number.isFinite(Number(nextInlineMore.count)) && Number(nextInlineMore.count) === 0) {
            delete nextInlineMore.count;
          }
          if (!nextInlineMore.text && !Number.isFinite(Number(nextInlineMore.count))) {
            delete nextEntry.inlineMore;
          } else {
            nextEntry.inlineMore = nextInlineMore;
          }
        }
        return nextEntry;
      });
      setChatHistory(sanitized);
    } catch (e) {
      /* ignore sanitize errors */
    }

    try {
      const connRaw = sessionStorage.getItem(chatLastConnectionKey);
      if (connRaw) {
        setLastConnectionPopupResult(JSON.parse(connRaw));
      }
    } catch (e) {
      setLastConnectionPopupResult(getLastConnectionPopupResult?.() || null);
    }

    try {
      const structRaw = sessionStorage.getItem(chatLastStructuredKey);
      if (structRaw) {
        setLastStructuredResult(JSON.parse(structRaw));
      }
    } catch (e) {
      setLastStructuredResult(getLastStructuredResult?.() || null);
    }

    try {
      const bioRaw = sessionStorage.getItem(chatLastBioKey);
      if (bioRaw) {
        const parsed = JSON.parse(bioRaw);
        setLastBioPopupState({ id: parsed?.id || getLastBioPopupId?.() || null, profile: null });
      }
    } catch (e) {
      /* ignore */
    }

    const messages = getMessageList();
    if (messages && messages.length) {
      messages.empty();
    }
    $("#wbe-connections-button").remove();
    $("#wbe-bio-button").remove();
  }

  function softenFailureMessage(text) {
    const original = String(text ?? "");
    if (!/^\s*I could(?: not|n't)\b/i.test(original)) {
      return original;
    }

    const isWtPlusZeroResults =
      /\bcould(?:\s+not|n't)\s+find\s+any\s+profiles\s+for\s+WT\+/i.test(original) &&
      /\bWT\+\s+query\s*:/i.test(original);

    let message = original
      .replace(/^\s*I could not\b/i, "I'm sorry, I could not")
      .replace(/^\s*I couldn't\b/i, "I'm sorry, I couldn't")
      .trim();

    if (!/[?]$/.test(message)) {
      if (isWtPlusZeroResults) {
        // A message that already offers alternative readings ends with a colon
        // and its buttons follow; appending a sentence would land between them.
        if (/:\s*$/.test(message)) {
          return message;
        }
        // Keep note lines ("Understood as: …") after the sentence, not before it.
        const [firstLine, ...noteLines] = message.split("\n");
        return [`${firstLine} No results were found for this filter.`, ...noteLines].join("\n");
      }
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

    const normalizedMessage = String(message);
    if (/\bin currently accessible family data yet\b/i.test(normalizedMessage)) {
      return false;
    }

    return /^\s*(?:I'm\s+sorry,\s*)?I\s+could(?:\s+not|n't)\b/i.test(normalizedMessage);
  }

  // AI search notes ("Understood as: …", "Assumed: …") are trailing lines added
  // to any WT+ result; they render as notes under whichever format matches.
  const AI_NOTE_LINE_RE = /^(?:Understood as|Assumed):\s/;

  function tryFormatWtPlusQueryMessage(text) {
    const lines = String(text || "").split("\n");
    const aiNoteLines = lines.filter((line) => AI_NOTE_LINE_RE.test(line.trim())).map((line) => line.trim());
    if (!aiNoteLines.length) {
      return tryFormatWtPlusQueryMessageBody(text);
    }
    const html = tryFormatWtPlusQueryMessageBody(lines.filter((line) => !AI_NOTE_LINE_RE.test(line.trim())).join("\n"));
    return html
      ? html + aiNoteLines.map((line) => `<div class="chat-query-note">${escapeHtml(line)}</div>`).join("")
      : null;
  }

  function tryFormatWtPlusQueryMessageBody(text) {
    const normalized = String(text || "").trim();
    const hasWtPlusModePrefix = /^WT\+\s+mode\.\s*/i.test(normalized);
    const normalizedBody = hasWtPlusModePrefix ? normalized.replace(/^WT\+\s+mode\.\s*/i, "").trim() : normalized;
    // Split on newlines: first line holds the structured query prefix; subsequent
    // lines are secondary notices (truncation, missing profiles, etc.) that should
    // appear below the code box, not inside it.
    const bodyLines = normalizedBody.split("\n");
    const mainLine = bodyLines[0].trim();
    const extraNoteLines = bodyLines
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean);
    const interpretedMatch = mainLine.match(
      /^AI\s+interpreted\s+this\s+as\s+"(.+?)"\s+and\s+ran\s+WT\+\s+query:\s+(.+?)\.\s+Found\s+(\d[\d,]*)\s+profile(?:s)?(?:\.\s+Also\s+(.+))?\.?$/i
    );
    if (interpretedMatch) {
      const interpretedText = String(interpretedMatch[1] || "").trim();
      const queryText = String(interpretedMatch[2] || "").trim();
      const profileCount = String(interpretedMatch[3] || "").trim();
      const optionalNote = String(interpretedMatch[4] || "").trim();
      if (!queryText) {
        return null;
      }

      const escapedInterpreted = escapeHtml(interpretedText);
      const escapedQuery = escapeHtml(queryText);
      const escapedCount = escapeHtml(profileCount);
      const escapedNote = optionalNote ? escapeHtml(optionalNote) : "";
      return [
        hasWtPlusModePrefix ? '<div class="chat-query-note">WT+ mode.</div>' : "",
        `<div class="chat-query-row">AI interpreted this as "${escapedInterpreted}", and I ran this WT+ query:</div>`,
        '<div class="chat-query-box">',
        `<code class="chat-query-code">${escapedQuery}</code>`,
        "</div>",
        `<div class="chat-query-note">Found ${escapedCount} profiles.</div>`,
        escapedNote ? `<div class="chat-query-note">Also ${escapedNote}.</div>` : "",
        ...extraNoteLines.map((l) => `<div class="chat-query-note">${escapeHtml(l)}</div>`),
      ].join("");
    }

    const foundMatch = mainLine.match(
      /^Found\s+(\d[\d,]*)\s+profile(?:s)?\s+for\s+WT\+\s+query:\s+(.+?)(?:\.\s+Also\s+(.+))?\.?$/i
    );
    if (!foundMatch) {
      const noResultsMatch = normalizedBody.match(
        /^I'm\s+sorry,\s+I\s+couldn't\s+find\s+any\s+profiles\s+for\s+WT\+\s+query:\s+(.+?)(?:\.?\s+(Try\s+one\s+of\s+these\s+readings\s+instead:))?(?:\s+No\s+results\s+were\s+found\s+for\s+this\s+filter\.)?(?:\s+Could\s+you\s+try\s+a\s+more\s+specific\s+name\s+or\s+a\s+WikiTree\s+ID\?)?$/i
      );
      if (!noResultsMatch) {
        return null;
      }

      const noResultsQuery = String(noResultsMatch[1] || "").trim();
      if (!noResultsQuery) {
        return null;
      }

      const escapedNoResultsQuery = escapeHtml(noResultsQuery);
      return [
        hasWtPlusModePrefix ? '<div class="chat-query-note">WT+ mode.</div>' : "",
        '<div class="chat-query-row">No profiles found for WT+ query:</div>',
        '<div class="chat-query-box">',
        `<code class="chat-query-code">${escapedNoResultsQuery}</code>`,
        "</div>",
        '<div class="chat-query-note">No results were found for this filter.</div>',
        noResultsMatch[2] ? `<div class="chat-query-note">${escapeHtml(noResultsMatch[2])}</div>` : "",
      ].join("");
    }

    const profileCount = foundMatch[1];
    const queryText = String(foundMatch[2] || "").trim();
    const optionalNote = String(foundMatch[3] || "").trim();
    if (!queryText) {
      return null;
    }

    const escapedQuery = escapeHtml(queryText);
    const escapedCount = escapeHtml(profileCount);
    const escapedNote = optionalNote ? escapeHtml(optionalNote) : "";
    return [
      hasWtPlusModePrefix ? '<div class="chat-query-note">WT+ mode.</div>' : "",
      `<div class="chat-query-row">Found ${escapedCount} profile${profileCount === "1" ? "" : "s"} for WT+ query:</div>`,
      `<div class="chat-query-box">`,
      `<code class="chat-query-code">${escapedQuery}</code>`,
      `</div>`,
      escapedNote ? `<div class="chat-query-note">Also ${escapedNote}.</div>` : "",
      ...extraNoteLines.map((l) => `<div class="chat-query-note">${escapeHtml(l)}</div>`),
    ].join("");
  }

  function formatStandardChatMessageBody(text) {
    // AI answers use **bold** and bare help-page URLs (live C34, 2026-10-03).
    // URLs are parked before the WT ID linker so an ID inside one stays intact.
    const urls = [];
    const escaped = escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(/\*\*([^*<]+)\*\*/g, "<strong>$1</strong>")
      // The text is already escaped, so a query string's & arrives as &amp;.
      .replace(/\bhttps?:\/\/(?:[^\s<>"'&]|&amp;)+?(?=[.,;:!?)]*(?:[\s<"']|&(?!amp;)|$))/g, (url) => {
        urls.push(url);
        return `__WBE_URL_${urls.length - 1}__`;
      });
    const withWikiTreeLinks = escaped
      .replace(/\b([A-Z][A-Za-z0-9_-]+-\d+)\b/g, (full, wtId) => {
        const href = `https://www.wikitree.com/wiki/${encodeURIComponent(wtId)}`;
        return `<a class="chat-results-link" href="${href}" target="_blank" rel="noopener noreferrer">${wtId}</a>`;
      })
      .replace(
        /__WBE_URL_(\d+)__/g,
        (full, index) =>
          `<a class="chat-results-link" href="${urls[index]}" target="_blank" rel="noopener noreferrer">${urls[index]}</a>`
      );

    return withWikiTreeLinks.replace(/__WBE_SHOW_MORE__:(\d+)/g, (full, count) => {
      return `<a href="#" class="chat-results-link chat-inline-show-more">${count} more</a>`;
    });
  }

  function formatChatMessageBody(text, inlineMore = null, trailingText = "") {
    const formattedBody = tryFormatWtPlusQueryMessage(text) || formatStandardChatMessageBody(text);
    const formattedTrailingText = trailingText
      ? `<span class="chat-message-trailing-text"><br>${formatStandardChatMessageBody(trailingText)}</span>`
      : "";

    if (!inlineMore?.text) {
      return `${formattedBody}${formattedTrailingText}`;
    }

    const count = Number.isFinite(Number(inlineMore.count)) ? Number(inlineMore.count) : null;
    const moreLabel = count == null ? "more" : `${count} more`;
    return `${formattedBody}<span class="chat-inline-more-container"><br>...and <a href="#" class="chat-results-link chat-inline-show-more">${moreLabel}</a>.</span>${formattedTrailingText}`;
  }

  function normalizeActions(options) {
    if (!options || typeof options !== "object") {
      return [];
    }

    if (Array.isArray(options.actions)) {
      return options.actions.filter(Boolean);
    }

    if (options.action) {
      return [options.action].filter(Boolean);
    }

    return [];
  }

  function serializeAction(action) {
    if (!action?.label) {
      return null;
    }

    const serialized = { label: action.label };
    if (action.actionType) serialized.actionType = action.actionType;
    if (action.table && shouldPersistStructuredTable(action.table)) {
      serialized.table = action.table;
    }
    if (action.wtPlusQuery) serialized.wtPlusQuery = action.wtPlusQuery;
    if (action.wtPlusSearchType) serialized.wtPlusSearchType = action.wtPlusSearchType;
    if (action.wtPlusSuggestionId) serialized.wtPlusSuggestionId = action.wtPlusSuggestionId;
    if (action.url) serialized.url = action.url;
    if (action.prompt) serialized.prompt = action.prompt;
    if (action.actionType === "search-form" && action.values && typeof action.values === "object") serialized.values = action.values;
    if (action.actionType === "chart" && action.chart && action.chartKey) {
      serialized.chart = action.chart;
      serialized.chartKey = String(action.chartKey);
      serialized.chartArgs = Array.isArray(action.chartArgs) ? action.chartArgs.map(String) : [];
    }
    if (action.newSearch === true) serialized.newSearch = true;
    if (action.wtPlusSuggestionOptions && typeof action.wtPlusSuggestionOptions === "object") {
      const opts = action.wtPlusSuggestionOptions;
      serialized.wtPlusSuggestionOptions = {
        showHidden: !!opts.showHidden,
        hideActive: !!opts.hideActive,
        maxErrors: opts.maxErrors ? String(opts.maxErrors) : "",
      };
    }
    return serialized;
  }

  function hydrateAction(actionEntry, message, msgIndex) {
    if (!actionEntry?.label) {
      return null;
    }

    const actionType = actionEntry.actionType || actionEntry.label;
    if (actionType === "chart") {
      return typeof rebuildChartAction === "function" ? rebuildChartAction(actionEntry) : null;
    }
    if (actionType === "Connections" || actionEntry.label === "Connections") {
      return {
        label: "Connections",
        actionType: "Connections",
        onClick: () => toggleConnectionsPopup(),
      };
    }

    if (actionType === "table" || actionEntry.label === "Table") {
      return {
        label: actionEntry.label || "Table",
        actionType: "table",
        onClick: () => {
          const toOpen = actionEntry.table || message.structured || getLastStructuredResult?.();
          if (!toOpen) {
            console.info("wbe: table action unavailable after restore", {
              messageIndex: msgIndex,
              hasStructuredSnapshot: !!message.structured,
              hasLastStructuredResult: !!getLastStructuredResult?.(),
            });
            appendMessage(
              "assistant",
              "This table is not available after refresh because the full result set was too large to cache. Re-run the query or use Open in WT+.",
              { shouldPersist: false }
            );
            return;
          }
          const popupId = `${chatResultsPopupId}-msg-${msgIndex}`;
          const tableId = `${chatResultsTableId}-msg-${msgIndex}`;
          const existing = document.getElementById(popupId);
          if (existing) {
            try {
              const $table = $(existing).find("table");
              if ($table.length && $.fn.DataTable.isDataTable($table)) {
                $table.DataTable().destroy();
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
    }

    if (actionType === "Show Bio" || actionEntry.label === "Show Bio") {
      return {
        label: "Show Bio",
        actionType: "Show Bio",
        onClick: async () => {
          const lastBioPopupId = getLastBioPopupId?.();
          if (lastBioPopupId) {
            const wtid = await resolveToWTID(lastBioPopupId);
            showBioPopupForId(wtid).catch(() => {});
          } else {
            appendMessage("assistant", "No saved biography available to show.", { shouldPersist: false });
          }
        },
      };
    }

    if (actionType === "search-form") {
      return {
        label: actionEntry.label,
        actionType: "search-form",
        values: actionEntry.values || {},
        onClick: () => appendMessage("assistant", "Change the boxes and search again.", { searchForm: actionEntry.values || {} }),
      };
    }

    if (actionType === "send-prompt") {
      if (!actionEntry.prompt || typeof sendClarifiedPrompt !== "function") {
        return null;
      }

      return {
        label: actionEntry.label,
        actionType: "send-prompt",
        prompt: actionEntry.prompt,
        newSearch: actionEntry.newSearch === true,
        onClick: () => sendClarifiedPrompt(actionEntry.prompt, { newSearch: actionEntry.newSearch === true }),
      };
    }

    if (actionType === "wtplus-open" || actionEntry.label === "Open in WT+") {
      if (!actionEntry.wtPlusQuery) {
        return null;
      }

      return {
        label: actionEntry.label || "Open in WT+",
        actionType: "wtplus-open",
        wtPlusQuery: actionEntry.wtPlusQuery,
        wtPlusSearchType: actionEntry.wtPlusSearchType || "text",
        wtPlusSuggestionId: actionEntry.wtPlusSuggestionId || "",
        wtPlusSuggestionOptions: actionEntry.wtPlusSuggestionOptions || {},
        onClick: () =>
          openWtPlusQuery(
            actionEntry.wtPlusQuery,
            actionEntry.wtPlusSearchType || "text",
            actionEntry.wtPlusSuggestionId || "",
            actionEntry.wtPlusSuggestionOptions || {}
          ),
      };
    }

    if (actionType === "fetch-wtplus-results" || actionEntry.label === "Fetch results again") {
      if (!actionEntry.wtPlusQuery) {
        return null;
      }

      return {
        label: actionEntry.label || "Fetch results again",
        actionType: "fetch-wtplus-results",
        wtPlusQuery: actionEntry.wtPlusQuery,
        wtPlusSearchType: actionEntry.wtPlusSearchType || "text",
        wtPlusSuggestionId: actionEntry.wtPlusSuggestionId || "",
        wtPlusSuggestionOptions: actionEntry.wtPlusSuggestionOptions || {},
        onClick: async () => {
          if (typeof reRunSavedWtPlusQuery === "function") {
            const result = await reRunSavedWtPlusQuery(
              actionEntry.wtPlusQuery,
              actionEntry.wtPlusSearchType || "text",
              actionEntry.wtPlusSuggestionId || "",
              actionEntry.wtPlusSuggestionOptions || {}
            );
            if (typeof handleChatResult === "function") {
              await handleChatResult(typeof result === "string" ? { message: result } : result);
            }
          }
        },
      };
    }

    if (actionType === "external-link" && actionEntry.url) {
      return {
        label: actionEntry.label,
        actionType: "external-link",
        url: actionEntry.url,
        onClick: () => {
          window.open(actionEntry.url, "_blank", "noopener,noreferrer");
        },
      };
    }

    return null;
  }

  function appendMessage(role, text, options = {}) {
    const shouldPersist = typeof options === "boolean" ? options : options.shouldPersist !== false;
    const actions = normalizeActions(options);
    const primaryAction = actions.find((action) => typeof action?.onClick === "function") || null;
    const inlineMore = typeof options === "object" ? options.inlineMore : null;
    const trailingText = typeof options?.trailingText === "string" ? options.trailingText.trim() : "";
    // A small tag after "Genie", e.g. "AI answer", so an answer in words is
    // told apart from what Genie found on WikiTree.
    const badge = role === "assistant" && typeof options?.badge === "string" ? options.badge.trim() : "";
    // A search form in the message (no AI key: the person fills in what the AI would have read).
    const searchForm = role === "assistant" && options?.searchForm && typeof options.searchForm === "object" ? options.searchForm : null;
    const $messages = getMessageList();
    if ($messages.length === 0) return;

    const messageText = role === "assistant" ? softenFailureMessage(text) : text;

    const $item = $("<div>").addClass(`chat-message chat-message-${role} chat-message--new`);
    const $label = $("<div>")
      .addClass("chat-message-label")
      .text(role === "user" ? "You" : "Genie");
    if (badge) {
      $label.append(
        $("<span>")
          .addClass(`chat-message-badge${/couldn/i.test(badge) ? " chat-message-badge--cannot" : ""}`)
          .attr("title", /couldn/i.test(badge) ? "Genie couldn't answer this from WikiTree or general knowledge" : "Written by AI from the profile and general knowledge: check facts against the profile")
          .text(badge)
      );
    }
    const $body = $("<div>")
      .addClass("chat-message-body")
      .html(formatChatMessageBody(messageText, inlineMore, trailingText));

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

      if (typeof primaryAction?.onClick === "function") {
        invokeChatAction(primaryAction);
        return;
      }

      if (getLastStructuredResult?.()?.rows?.length) {
        openResultsTable(getLastStructuredResult());
      }
    });

    $item.append($label, $body);
    // A message that tells people to use the Apps button gets one of its own: the one on the page may be scrolled
    // out of sight, hidden behind the chat, or not on this page at all.
    if (role === "assistant" && createAppsLoginButton && String(messageText).includes("green Apps button")) {
      $item.append($("<div>").addClass("chat-message-apps-login").append(createAppsLoginButton()));
    }
    if (searchForm) {
      $item.append(renderSearchForm(searchForm, (values, built) => onSearchFormSubmit?.(values, built)));
    }

    if (actions.length) {
      // Genie's own charts and WikiTree's Tree Apps (which open in a new tab) as
      // two labelled groups (user, 2026-10-09), so "Fan chart" and the Tree
      // Apps' "Fan Chart" aren't mistaken for each other.
      const usable = actions.filter((action) => action?.label && typeof action.onClick === "function");
      const treeApps = usable.filter(isTreeAppAction);
      const genie = usable.filter((action) => !isTreeAppAction(action));
      const group = (list, label, extraClass = "") => {
        const $actions = $("<div>").addClass(`chat-message-actions${extraClass ? ` ${extraClass}` : ""}`);
        if (label) $actions.append($("<span>").addClass("chat-message-actions-label").text(label));
        list.forEach((action) => {
          const $button = $("<button>").attr("type", "button").addClass("chat-message-action").text(action.label);
          if (isTreeAppAction(action)) $button.addClass("chat-message-action--tree-app").attr("title", "Opens in a new tab");
          $button.on("click", () => invokeChatAction(action));
          $actions.append($button);
        });
        return $actions;
      };
      if (genie.length) $item.append(group(genie, treeApps.length ? "Genie Charts" : ""));
      if (treeApps.length) $item.append(group(treeApps, "Tree Apps", "chat-message-actions--tree-apps"));
    }

    $messages.append($item);
    const messagesEl = $messages.get(0);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (shouldPersist) {
      const history = getHistory();
      const historyEntry = { role, text: role === "assistant" ? messageText : text };
      if (trailingText) {
        historyEntry.trailingText = trailingText;
      }
      if (badge) {
        historyEntry.badge = badge;
      }
      if (searchForm) {
        historyEntry.searchForm = searchForm;
      }
      if (inlineMore?.text) {
        const countValue = Number.isFinite(Number(inlineMore.count)) ? Number(inlineMore.count) : null;
        historyEntry.inlineMore = { text: inlineMore.text };
        if (Number.isFinite(countValue) && countValue > 0) {
          historyEntry.inlineMore.count = countValue;
        }
      }
      const actionWithTable = actions.find((action) => action?.table);
      const canPersistStructuredTable = !!(
        actionWithTable?.table && shouldPersistStructuredTable(actionWithTable.table)
      );
      if (canPersistStructuredTable) {
        try {
          historyEntry.structured = actionWithTable.table;
        } catch (e) {
          /* ignore */
        }
      } else if (actionWithTable?.table) {
        const rowCount = Array.isArray(actionWithTable.table?.rows) ? actionWithTable.table.rows.length : 0;
        console.info("wbe: skipping persisted Table action for oversized result", {
          rowCount,
          maxPersistedRows: MAX_PERSISTED_STRUCTURED_ROWS,
        });
      }

      const serializedActions = actions
        .map(serializeAction)
        .filter(Boolean)
        .filter((action) => !(action.actionType === "table" && !action.table && !canPersistStructuredTable));
      if (serializedActions.length) {
        historyEntry.actions = serializedActions;
        if (serializedActions.length === 1) {
          historyEntry.actionLabel = serializedActions[0].label;
        }
      }

      history.push(historyEntry);
      setChatHistory(history);
      const saved = saveHistory();
      if (!saved && !historyQuotaWarningShown) {
        historyQuotaWarningShown = true;
        appendMessage("assistant", "Chat history is full for this tab. Try a new tab.", { shouldPersist: false });
      }
    }
  }

  function renderHistory() {
    const $messages = getMessageList();
    if (!$messages || $messages.length === 0) return;
    $messages.empty();
    getHistory().forEach((message, msgIndex) => {
      const opts = {
        shouldPersist: false,
        inlineMore: message.inlineMore || null,
        trailingText: typeof message.trailingText === "string" ? message.trailingText : "",
        badge: typeof message.badge === "string" ? message.badge : "",
        searchForm: message.searchForm && typeof message.searchForm === "object" ? message.searchForm : null,
      };
      const actionEntries = Array.isArray(message.actions)
        ? message.actions
        : message.actionLabel
        ? [{ label: message.actionLabel }]
        : [];
      const hydratedActions = actionEntries
        .map((actionEntry) => hydrateAction(actionEntry, message, msgIndex))
        .filter(Boolean);
      if (hydratedActions.length) {
        opts.actions = hydratedActions;
      }
      appendMessage(message.role, message.text, opts);
    });
  }

  function clearHistory() {
    historyQuotaWarningShown = false;
    setChatHistory([]);
    setLastNonRetryUserPrompt("");
    setLastConnectionPopupResult(null);
    setLastStructuredResult(null);
    setLastBioPopupState({ id: null, profile: null });
    if (typeof resetTransientState === "function") {
      resetTransientState();
    }
    try {
      sessionStorage.removeItem(chatSessionKey);
      sessionStorage.removeItem(chatLastConnectionKey);
      sessionStorage.removeItem(chatLastStructuredKey);
      sessionStorage.removeItem(chatLastBioKey);
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

  function hasAppsLoginHintAlready() {
    const recentAssistantMessages = getHistory()
      .filter((message) => message?.role === "assistant")
      .slice(-8);

    return recentAssistantMessages.some((message) => {
      if (message?.role !== "assistant") {
        return false;
      }
      return String(message.text || "").includes("apps server for better results");
    });
  }

  return {
    appendMessage,
    clearHistory,
    hasAppsLoginHintAlready,
    isRetryPrompt,
    loadHistory,
    renderHistory,
    saveHistory,
    shouldEscalateLocalFailureToAi,
  };
}
