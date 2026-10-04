import { createChatHistoryHandlers } from "./chat_history";

function createTestHandlers(initialHistory = []) {
  let history = [...initialHistory];
  document.body.innerHTML = '<div id="chat-messages"></div>';
  sessionStorage.clear();

  const handlers = createChatHistoryHandlers({
    chatMessagesId: "chat-messages",
    chatSessionKey: "chat-session-test",
    chatLastConnectionKey: "chat-last-connection-test",
    chatLastStructuredKey: "chat-last-structured-test",
    chatLastBioKey: "chat-last-bio-test",
    chatResultsPopupId: "chat-results-popup",
    chatResultsTableId: "chat-results-table",
    getChatHistory: () => history,
    setChatHistory: (nextHistory) => {
      history = nextHistory;
    },
    getLastNonRetryUserPrompt: () => "",
    setLastNonRetryUserPrompt: jest.fn(),
    getLastConnectionPopupResult: () => null,
    setLastConnectionPopupResult: jest.fn(),
    getLastStructuredResult: () => null,
    setLastStructuredResult: jest.fn(),
    getLastBioPopupId: () => null,
    setLastBioPopupState: jest.fn(),
    toggleConnectionsPopup: jest.fn(),
    openResultsTable: jest.fn(),
    resolveToWTID: jest.fn(),
    showBioPopupForId: jest.fn(),
    openWtPlusQuery: jest.fn(),
    tryHandleProfileSearchPrompt: jest.fn(),
    reRunSavedWtPlusQuery: jest.fn(),
    handleChatResult: jest.fn(),
    afterActionClick: jest.fn(),
    resetTransientState: jest.fn(),
  });

  return {
    handlers,
    getHistory: () => history,
  };
}

function getMessageBodyHtml() {
  return document.querySelector(".chat-message-body")?.innerHTML || "";
}

describe("chat_history inline more trailing text", () => {
  test("renders trailing text after the inline more link", () => {
    const { handlers, getHistory } = createTestHandlers();

    handlers.appendMessage("assistant", "Here are ancestors for Schlack-45 (58 found):\n- Arthur (Schlack-43)", {
      inlineMore: { count: 46, text: "- More Person" },
      trailingText: "Recommended Tree Apps are available below.",
    });

    const bodyHtml = getMessageBodyHtml();
    expect(bodyHtml.indexOf("chat-inline-more-container")).toBeGreaterThan(-1);
    expect(bodyHtml.indexOf("chat-message-trailing-text")).toBeGreaterThan(-1);
    expect(bodyHtml.indexOf("chat-inline-more-container")).toBeLessThan(bodyHtml.indexOf("chat-message-trailing-text"));
    expect(getHistory()[0].trailingText).toBe("Recommended Tree Apps are available below.");
  });

  test("replays trailing text after the inline more link from history", () => {
    const { handlers } = createTestHandlers([
      {
        role: "assistant",
        text: "Here are ancestors for Schlack-45 (58 found):\n- Arthur (Schlack-43)",
        inlineMore: { count: 46, text: "- More Person" },
        trailingText: "Recommended Tree Apps are available below.",
      },
    ]);

    handlers.renderHistory();

    const bodyHtml = getMessageBodyHtml();
    expect(bodyHtml.indexOf("chat-inline-more-container")).toBeGreaterThan(-1);
    expect(bodyHtml.indexOf("chat-message-trailing-text")).toBeGreaterThan(-1);
    expect(bodyHtml.indexOf("chat-inline-more-container")).toBeLessThan(bodyHtml.indexOf("chat-message-trailing-text"));
  });

  test("does not escalate deterministic family no-result messages to AI", () => {
    const { handlers } = createTestHandlers();

    expect(
      handlers.shouldEscalateLocalFailureToAi({
        message:
          "I couldn't find any 1st cousins 3 times removed for Alex Example (Example-123) in currently accessible family data yet.",
      })
    ).toBe(false);
  });

  test("still escalates unresolved profile-search failures to AI", () => {
    const { handlers } = createTestHandlers();

    expect(
      handlers.shouldEscalateLocalFailureToAi({
        message: "I couldn't find profile matches for \"Alex's first cousins three times removed\".",
      })
    ).toBe(true);
  });
});

describe("chat_history WT+ zero-result message with alternative readings", () => {
  test("keeps the query clean and says 'no results' once", () => {
    createTestHandlers().handlers.appendMessage(
      "assistant",
      "I couldn't find any profiles for WT+ query: Location=Cheshire Suggestions=802. Try one of these readings instead:"
    );

    const bodyHtml = getMessageBodyHtml();
    const bodyText = document.querySelector(".chat-message-body")?.textContent || "";
    expect(document.querySelector(".chat-query-code")?.textContent).toBe("Location=Cheshire Suggestions=802");
    expect(bodyText.match(/No results were found for this filter/g)).toHaveLength(1);
    expect(bodyHtml).toContain("Try one of these readings instead:");
  });

  test("keeps 'Understood as' notes whole when the message has no alternatives", () => {
    createTestHandlers().handlers.appendMessage(
      "assistant",
      "I couldn't find any profiles for WT+ query: AllLastNames=Cheshire Suggestions=802\nAssumed: Cheshire read as a surname"
    );

    const notes = Array.from(document.querySelectorAll(".chat-query-note")).map((note) => note.textContent);
    expect(notes).toEqual(["No results were found for this filter.", "Assumed: Cheshire read as a surname"]);
  });
});

// Live C34, 2026-10-03: AI help answers showed literal ** and dead URLs.
describe("chat_history markdown-ish formatting", () => {
  test("renders **bold** and links bare URLs without mangling WT IDs inside them", () => {
    const { handlers } = createTestHandlers();
    handlers.appendMessage(
      "assistant",
      'A **PPP** is a Project-Protected Profile. See https://www.wikitree.com/wiki/Help:Project_Protection. Ellen is Cook-8721; "https://www.wikitree.com/wiki/Cook-8721".'
    );
    const html = getMessageBodyHtml();
    expect(html).toContain("<strong>PPP</strong>");
    expect(html).toContain('href="https://www.wikitree.com/wiki/Help:Project_Protection"');
    expect(html).toContain('rel="noopener noreferrer">https://www.wikitree.com/wiki/Cook-8721</a>');
    expect(html).toContain('href="https://www.wikitree.com/wiki/Cook-8721" target="_blank" rel="noopener noreferrer">Cook-8721</a>');
  });

  test("keeps a query string's & in a linked URL (C12 Find Matches links)", () => {
    const { handlers } = createTestHandlers();
    handlers.appendMessage(
      "assistant",
      "Find Matches: https://staging.wikitree.com/index.php?title=Special:FindMatches&action=find&u=123.\nNext line"
    );
    const html = getMessageBodyHtml();
    expect(html).toContain(
      'href="https://staging.wikitree.com/index.php?title=Special:FindMatches&amp;action=find&amp;u=123"'
    );
  });
});
