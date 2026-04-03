import $ from "jquery";
import { escapeHtml } from "../../core/lib/diff_utils";

export function createChatHistoryHandlers({
  chatMessagesId,
  chatSessionKey,
  chatLastConnectionKey,
  chatLastStructuredKey,
  chatLastBioKey,
  chatResultsPopupId,
  chatResultsTableId,
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
  openResultsTable,
  resolveToWTID,
  showBioPopupForId,
  openWtPlusQuery,
  afterActionClick,
  resetTransientState,
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

  function tryFormatWtPlusQueryMessage(text) {
    const normalized = String(text || "").trim();
    const hasWtPlusModePrefix = /^WT\+\s+mode\.\s*/i.test(normalized);
    const normalizedBody = hasWtPlusModePrefix ? normalized.replace(/^WT\+\s+mode\.\s*/i, "").trim() : normalized;
    const interpretedMatch = normalizedBody.match(
      /^AI\s+interpreted\s+this\s+as\s+"(.+?)"\s+and\s+ran\s+WT\+\s+query:\s+(.+?)\.\s+Found\s+(\d+)\s+profile(?:s)?(?:\.\s+Also\s+(.+))?\.?$/i
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
        `<div class="chat-query-row">AI interpreted this as "${escapedInterpreted}" and ran WT+ query:</div>`,
        '<div class="chat-query-box">',
        `<code class="chat-query-code">${escapedQuery}</code>`,
        "</div>",
        `<div class="chat-query-note">Found ${escapedCount} profiles.</div>`,
        escapedNote ? `<div class="chat-query-note">Also ${escapedNote}.</div>` : "",
      ].join("");
    }

    const foundMatch = normalizedBody.match(
      /^Found\s+(\d+)\s+profile(?:s)?\s+for\s+WT\+\s+query:\s+(.+?)(?:\.\s+Also\s+(.+))?\.?$/i
    );
    if (!foundMatch) {
      const noResultsMatch = normalizedBody.match(
        /^I'm\s+sorry,\s+I\s+couldn't\s+find\s+any\s+profiles\s+for\s+WT\+\s+query:\s+(.+?)(?:\s+Could\s+you\s+try\s+a\s+more\s+specific\s+name\s+or\s+a\s+WikiTree\s+ID\?)?$/i
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
        '<div class="chat-query-note">Could you try a more specific name or a WikiTree ID?</div>',
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
      `<div class="chat-query-row">Found ${escapedCount} profiles for WT+ query:</div>`,
      `<div class="chat-query-box">`,
      `<code class="chat-query-code">${escapedQuery}</code>`,
      `</div>`,
      escapedNote ? `<div class="chat-query-note">Also ${escapedNote}.</div>` : "",
    ].join("");
  }

  function formatStandardChatMessageBody(text) {
    const escaped = escapeHtml(text).replace(/\n/g, "<br>");
    const withWikiTreeLinks = escaped.replace(/\b([A-Z][A-Za-z0-9_-]+-\d+)\b/g, (full, wtId) => {
      const href = `https://www.wikitree.com/wiki/${encodeURIComponent(wtId)}`;
      return `<a class="chat-results-link" href="${href}" target="_blank" rel="noopener noreferrer">${wtId}</a>`;
    });

    return withWikiTreeLinks.replace(/__WBE_SHOW_MORE__:(\d+)/g, (full, count) => {
      return `<a href="#" class="chat-results-link chat-inline-show-more">${count} more</a>`;
    });
  }

  function formatChatMessageBody(text, inlineMore = null) {
    const formattedBody = tryFormatWtPlusQueryMessage(text) || formatStandardChatMessageBody(text);

    if (!inlineMore?.text) {
      return formattedBody;
    }

    const count = Number.isFinite(Number(inlineMore.count)) ? Number(inlineMore.count) : null;
    const moreLabel = count == null ? "more" : `${count} more`;
    return `${formattedBody}<span class="chat-inline-more-container"><br>...and <a href="#" class="chat-results-link chat-inline-show-more">${moreLabel}</a>.</span>`;
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

    return null;
  }

  function appendMessage(role, text, options = {}) {
    const shouldPersist = typeof options === "boolean" ? options : options.shouldPersist !== false;
    const actions = normalizeActions(options);
    const primaryAction = actions.find((action) => typeof action?.onClick === "function") || null;
    const inlineMore = typeof options === "object" ? options.inlineMore : null;
    const $messages = getMessageList();
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

      if (typeof primaryAction?.onClick === "function") {
        invokeChatAction(primaryAction);
        return;
      }

      if (getLastStructuredResult?.()?.rows?.length) {
        openResultsTable(getLastStructuredResult());
      }
    });

    $item.append($label, $body);

    if (actions.length) {
      const $actions = $("<div>").addClass("chat-message-actions");
      actions.forEach((action) => {
        if (!action?.label || typeof action.onClick !== "function") {
          return;
        }
        const $button = $("<button>").attr("type", "button").addClass("chat-message-action").text(action.label);
        $button.on("click", () => invokeChatAction(action));
        $actions.append($button);
      });
      $item.append($actions);
    }

    $messages.append($item);
    const messagesEl = $messages.get(0);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (shouldPersist) {
      const history = getHistory();
      const historyEntry = { role, text: role === "assistant" ? messageText : text };
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
      const opts = { shouldPersist: false, inlineMore: message.inlineMore || null };
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
    return getHistory().some((message) => {
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
