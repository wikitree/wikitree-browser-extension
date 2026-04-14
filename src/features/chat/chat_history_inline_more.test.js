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
});
