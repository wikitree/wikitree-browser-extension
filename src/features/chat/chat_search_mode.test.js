jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getProfile: jest.fn(),
    searchPerson: jest.fn(),
  },
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));

import { AI_CHAT_CLAIM_RULES, classifyWtPrompt, handleExplicitSearchMode, isBareName } from "./chat_search_mode";
import { ChatIntent, routeChatPrompt } from "./chat_router";

function makeVisibleWtModeDom() {
  document.body.innerHTML = `
    <div id="chat-popup">
      <input id="wbe-chat-input" />
      <div id="wbe-chat-mode-controls">
        <label><input type="radio" name="wbe-chat-mode" value="wt" checked /></label>
      </div>
    </div>
  `;

  const controls = document.getElementById("wbe-chat-mode-controls");
  Object.defineProperty(controls, "offsetWidth", { configurable: true, value: 120 });
  Object.defineProperty(controls, "offsetHeight", { configurable: true, value: 24 });
  controls.getClientRects = () => [{ width: 120, height: 24 }];
}

describe("chat_search_mode explicit routing", () => {
  beforeEach(() => {
    makeVisibleWtModeDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("routes aggregate date filter prompts to WT+ even when WT mode is selected", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Lincolnshire births, post-1850",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledTimes(1);
    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith(
      { chatModeOverride: "wtplus" },
      "Lincolnshire births, post-1850"
    );
    expect(handleChatResult).toHaveBeenCalledWith({ message: "wtplus:Lincolnshire births, post-1850" });
    expect(result).toEqual({ handled: true, prompt: "Lincolnshire births, post-1850" });
  });

  test("routes comma-scoped marriage filter prompts to WT+ even when WT mode is selected", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "more than six children, Cheshire, married after 1899",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledTimes(1);
    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith(
      { chatModeOverride: "wtplus" },
      "more than six children, Cheshire, married after 1899"
    );
    expect(handleChatResult).toHaveBeenCalledWith({
      message: "wtplus:more than six children, Cheshire, married after 1899",
    });
    expect(result).toEqual({ handled: true, prompt: "more than six children, Cheshire, married after 1899" });
  });

  test("continues a WT+ query with a bare date follow-up in the visible Search (wt) mode", async () => {
    // Reproduces the reported bug: after a "too many results" WT+ run (no table),
    // the follow-up arrives in the Search radio (wt) mode, not wtplus.
    const previousQuery = 'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999)"';
    const reRunSavedWtPlusQuery = jest.fn(async (query) => ({ message: `ran:${query}` }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "After 1920?",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt: jest.fn(() => ({ intent: ChatIntent.FALLBACK_AI })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt: jest.fn(async () => null),
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
      continueQueryContext: true,
      // Bare "After 1920?" is resolved by buildContextualDateFollowupQuery, so
      // the generic term translator is not consulted here.
      translateWtPlusRefinementTerms: jest.fn(() => null),
      reRunSavedWtPlusQuery,
      getLastExecutedWtPlusQuery: () => previousQuery,
    });

    expect(result).toEqual({ handled: true, prompt: "After 1920?" });
    expect(reRunSavedWtPlusQuery).toHaveBeenCalledWith(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19209999)"',
      "text"
    );
    const message = handleChatResult.mock.calls[0][0].message;
    expect(message).toContain("Continuing the previous search");
    expect(handleChatResult.mock.calls[0][0].actions).toContainEqual({
      label: "Search for this on its own",
      actionType: "send-prompt",
      prompt: "After 1920?",
      newSearch: true,
    });
  });

  test("does not hijack a fresh name search in Search mode as a continuation", async () => {
    const previousQuery = 'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999)"';
    const reRunSavedWtPlusQuery = jest.fn(async () => ({ message: "should not run" }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "John Smith",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt: jest.fn(() => ({ intent: ChatIntent.PROFILE_SEARCH })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt: jest.fn(async () => null),
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
      continueQueryContext: true,
      // Simulate the parser reading "John Smith" as a person name.
      translateWtPlusRefinementTerms: jest.fn(() => ({ query: "FirstName=John LastNameAtBirth=Smith" })),
      reRunSavedWtPlusQuery,
      getLastExecutedWtPlusQuery: () => previousQuery,
    });

    expect(reRunSavedWtPlusQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false, prompt: "John Smith" });
  });

  // Live, 2026-10-04: "Beacall-10" after a search became "Continuing the previous search with WikiTreeID=Beacall-10".
  test("a WikiTree ID is a new lookup, not a continuation", async () => {
    const reRunSavedWtPlusQuery = jest.fn(async () => ({ message: "should not run" }));
    await handleExplicitSearchMode({
      prompt: "Beacall-10",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt: jest.fn(() => ({ intent: ChatIntent.FALLBACK_AI })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ key: "" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt: jest.fn(async () => null),
      handleChatResult: jest.fn(async () => {}),
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
      continueQueryContext: true,
      translateWtPlusRefinementTerms: jest.fn(() => ({ query: "WikiTreeID=Beacall-10" })),
      reRunSavedWtPlusQuery,
      getLastExecutedWtPlusQuery: () => "AllLastNames=Smith BirthLocation=Yorkshire 1850s",
    });
    expect(reRunSavedWtPlusQuery).not.toHaveBeenCalled();
  });

  test("routes a '<place> <topic>' prompt to WT+ from the Search radio", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Chicago military",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith({ chatModeOverride: "wtplus" }, "Chicago military");
    expect(result).toEqual({ handled: true, prompt: "Chicago military" });
  });

  test("routes a 'surname + DNA token' prompt to WT+ from the Search radio", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Anderson mtDNA",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith({ chatModeOverride: "wtplus" }, "Anderson mtDNA");
    expect(result).toEqual({ handled: true, prompt: "Anderson mtDNA" });
  });

  test("routes a plain-English orphan prompt ('no manager') to WT+ from the Search radio", async () => {
    // Regression: "Denbighshire no manager" fell through to person search and
    // answered "couldn't find profile matches" instead of running an Orphan query.
    for (const prompt of ["Denbighshire no manager", "Kent with no managers", "unmanaged profiles in Devon"]) {
      const tryHandleProfileSearchPrompt = jest.fn(async (options, value) => ({
        message: `${options.chatModeOverride}:${value}`,
      }));

      const result = await handleExplicitSearchMode({
        prompt,
        chatPopupId: "chat-popup",
        hasStructuredResult: false,
        getLastStructuredResult: jest.fn(() => null),
        ChatIntent: {},
        routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
        buildRecentConversationForAi: jest.fn(() => ""),
        buildRecentUserMessagesForAi: jest.fn(() => ""),
        getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
        appendMessage: jest.fn(),
        tryHandleProfileSearchPrompt,
        handleChatResult: jest.fn(async () => {}),
        extractFollowupTableFilterText: jest.fn(() => ""),
        openResultsTable: jest.fn(),
        tryHandleAiPlannedIntent: jest.fn(async () => null),
        setExplicitMode: jest.fn(),
      });

      expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith({ chatModeOverride: "wtplus" }, prompt);
      expect(result).toEqual({ handled: true, prompt });
    }
  });

  test("defers removed cousin prompts to deterministic relation handling in WT mode", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async () => ({
      message: "should not run",
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Alex's first cousins three times removed",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt,
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).not.toHaveBeenCalled();
    expect(handleChatResult).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false, prompt: "Alex's first cousins three times removed" });
  });

  // Live C13/C16, 2026-10-03: in Search mode the name-search parse found a
  // condition it can't hold, and the prompt went to the AI, which asked which
  // cemetery. Such a request is a WT+ search.
  describe("a condition a name search can't hold goes to WT+", () => {
    const run = (wtPlusReply) => {
      const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) =>
        options.chatModeOverride === "wtplus"
          ? wtPlusReply
          : `I couldn't work out a concrete person search from "${prompt}" (it needs buried in this cemetery).`
      );
      const handleChatResult = jest.fn(async () => {});
      const resultPromise = handleExplicitSearchMode({
        prompt: "who else is buried in this cemetery?",
        chatPopupId: "chat-popup",
        hasStructuredResult: false,
        getLastStructuredResult: jest.fn(() => null),
        ChatIntent: {},
        routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
        buildRecentConversationForAi: jest.fn(() => ""),
        buildRecentUserMessagesForAi: jest.fn(() => ""),
        getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
        appendMessage: jest.fn(),
        tryHandleProfileSearchPrompt,
        handleChatResult,
        extractFollowupTableFilterText: jest.fn(() => ""),
        openResultsTable: jest.fn(),
        tryHandleAiPlannedIntent: jest.fn(async () => null),
        setExplicitMode: jest.fn(),
      });
      return { resultPromise, tryHandleProfileSearchPrompt, handleChatResult };
    };

    test("WT+ answers", async () => {
      const { resultPromise, tryHandleProfileSearchPrompt, handleChatResult } = run({ message: "Found 950 profiles" });
      expect(await resultPromise).toEqual({ handled: true, prompt: "who else is buried in this cemetery?" });
      expect(tryHandleProfileSearchPrompt).toHaveBeenLastCalledWith(
        { chatModeOverride: "wtplus" },
        "who else is buried in this cemetery?"
      );
      expect(handleChatResult).toHaveBeenCalledWith({ message: "Found 950 profiles" });
    });

    test("WT+ declines too: the main flow gets it", async () => {
      const { resultPromise, handleChatResult } = run({ message: "I can't run that search: no cemetery" });
      expect(await resultPromise).toEqual({ handled: false, prompt: "who else is buried in this cemetery?" });
      expect(handleChatResult).not.toHaveBeenCalled();
    });
  });
});

describe("isDefinitionOrHelpQuestion (J8)", () => {
  const { isDefinitionOrHelpQuestion } = require("./chat_search_mode");
  test.each([
    "what does 'Unsourced' mean?",
    "what does Unconnected mean",
    "what is a PPP?",
    "what is the meaning of NoFather?",
    "how do I find unsourced profiles?",
    "define orphaned",
  ])("%s is a help question", (prompt) => {
    expect(isDefinitionOrHelpQuestion(prompt)).toBe(true);
  });
  test.each(["Unsourced Cook born in Ohio", "Anderson mtDNA", "unsourced profiles in Denbighshire", "who is Ellen's husband?"])(
    "%s is not",
    (prompt) => {
      expect(isDefinitionOrHelpQuestion(prompt)).toBe(false);
    }
  );
});

describe("profile-fact questions aren't template searches (Q6 recheck)", () => {
  const { isWtPlusOnlyPrompt } = require("./chat_search_mode");
  test("what templates are on her profile?", () => {
    expect(isWtPlusOnlyPrompt("what templates are on her profile?")).toBe(false);
    expect(isWtPlusOnlyPrompt("template: FindAGrave")).toBe(true);
  });
});

describe("AI chat claim rules", () => {
  test("facts from the profile, history labelled as general", () => {
    expect(AI_CHAT_CLAIM_RULES).toMatch(/only from the WikiTree profile/);
    expect(AI_CHAT_CLAIM_RULES).toMatch(/general background/);
    expect(AI_CHAT_CLAIM_RULES).toMatch(/never invent/);
  });
});

describe("one box: searches and questions", () => {
  const { classifyWtPrompt, looksLikeQuestion, withAskAsQuestionAction } = require("./chat_search_mode");
  const deps = (reply) => ({
    getChatAiConfig: async () => ({ provider: "openai", key: "k", model: "m" }),
    buildRecentUserMessagesForAi: () => "",
    reply,
  });
  beforeEach(() => {
    global.chrome = { runtime: { sendMessage: jest.fn() } };
  });
  afterEach(() => {
    delete global.chrome;
  });

  test("question-shaped prompts", () => {
    expect(looksLikeQuestion("What was Liverpool like then?")).toBe(true);
    expect(looksLikeQuestion("Tell me about the Irish famine")).toBe(true);
    expect(looksLikeQuestion("John Smith 1850 Liverpool")).toBe(false);
  });

  test("the AI's 'answer' sends a question on; a named search skips the AI", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ success: true, response: '{"targetMode":"answer","confidence":0.9}' });
    expect(await classifyWtPrompt({ ...deps(), prompt: "What was Liverpool like then?" })).toBe("answer");
    expect(await classifyWtPrompt({ ...deps(), prompt: "Smith-123 born 1850" })).toBe("wt");
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  test("unsure or no key: no decision", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ success: true, response: '{"targetMode":"answer","confidence":0.3}' });
    expect(await classifyWtPrompt({ ...deps(), prompt: "Why might he have emigrated?" })).toBeNull();
    expect(await classifyWtPrompt({ prompt: "Why might he have emigrated?", getChatAiConfig: async () => ({}) })).toBe("needsAi");
  });

  test("a named person stays a person search even if the AI says wtplus", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ success: true, response: '{"targetMode":"wtplus","confidence":0.9}' });
    expect(await classifyWtPrompt({ ...deps(), prompt: "Who were my ancestors in Wales?" })).toBe("wt");
  });

  test("ask: always answers", async () => {
    const result = await handleExplicitSearchMode({ prompt: "ask: what was Liverpool like?", chatPopupId: "chat-popup" });
    expect(result).toEqual({ handled: false, prompt: "what was Liverpool like?", answer: true });
  });

  test("a search from a question gets an 'Answer as a question' button", () => {
    const result = withAskAsQuestionAction({ message: "Found 3", actions: [{ label: "Table" }] }, "What was Liverpool like then?");
    expect(result.actions.map((action) => action.label)).toEqual(["Table", "Answer as a question"]);
    expect(result.actions[1].prompt).toBe("ask: What was Liverpool like then?");
    expect(withAskAsQuestionAction("Found 3", "Beacalls in Shropshire")).toBe("Found 3");
  });
});

describe("no AI key: searches still run", () => {
  const noKey = async () => ({ key: "" });
  const isUnclaimed = (text) => [ChatIntent.FALLBACK_AI, ChatIntent.PROFILE_SEARCH].includes(routeChatPrompt(text, { hasStructuredResult: false })?.intent);

  test("a place-and-decade search goes to WT+", async () => {
    expect(await classifyWtPrompt({ prompt: "Yorkshire 1850s", getChatAiConfig: noKey, isUnclaimed })).toBe("wtplus");
  });

  test("a question doesn't (it gets the needs-a-key message)", async () => {
    expect(await classifyWtPrompt({ prompt: "Why did people leave Yorkshire in the 1850s?", getChatAiConfig: noKey, isUnclaimed })).toBe("needsAi");
  });

  test("a chart prompt stays with its chart", async () => {
    expect(await classifyWtPrompt({ prompt: "My fan chart", getChatAiConfig: noKey, isUnclaimed })).not.toBe("wtplus");
  });

  // Live, 2026-10-04: "Martha Teece" became LastNameAtBirth=Martha Location=Teece.
  test("a bare name stays a person search, not WT+", async () => {
    for (const prompt of ["Martha Teece", "Mary Ann Jones", "Jean-Luc O'Brien", "Zoë Müller"]) {
      expect(await classifyWtPrompt({ prompt, getChatAiConfig: noKey, isUnclaimed })).toBeNull();
    }
    expect(await classifyWtPrompt({ prompt: "Beacall-10", getChatAiConfig: noKey, isUnclaimed })).toBe("wt");
  });

  test("words that make it a filter search aren't a bare name", async () => {
    expect(isBareName("Martha Teece")).toBe(true);
    for (const prompt of ["Smiths in Yorkshire", "unconnected profiles", "Yorkshire 1850s", "Smith", "women born Cheshire"]) {
      expect(isBareName(prompt)).toBe(false);
    }
  });
});

describe("questions about the profile person", () => {
  test("no key: a question says it needs the AI instead of searching", async () => {
    expect(await classifyWtPrompt({ prompt: "Where did Philip live?", getChatAiConfig: async () => ({ key: "" }) })).toBe("needsAi");
  });

  test("no key: handleExplicitSearchMode hands it on to the needs-a-key message, without searching", async () => {
    document.body.innerHTML = '<div id="chat-popup"><textarea id="wbe-chat-input"></textarea></div>';
    const tryHandleProfileSearchPrompt = jest.fn();
    const result = await handleExplicitSearchMode({
      prompt: "Where did Philip live?",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: () => null,
      ChatIntent,
      routeChatPrompt,
      buildRecentConversationForAi: () => "",
      buildRecentUserMessagesForAi: () => "",
      getChatAiConfig: async () => ({ key: "" }),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult: jest.fn(),
    });
    expect(result).toMatchObject({ handled: false, answer: true });
    expect(tryHandleProfileSearchPrompt).not.toHaveBeenCalled();
  });
});
