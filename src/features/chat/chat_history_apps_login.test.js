import $ from "jquery";
import { createChatHistoryHandlers } from "./chat_history";

function createTestHandlers() {
  let history = [];
  document.body.innerHTML = '<div id="chat-messages"></div>';
  sessionStorage.clear();
  const createAppsLoginButton = jest.fn(() => $('<button class="wbe-app-login">Apps</button>'));

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
    createAppsLoginButton,
  });

  return { handlers, createAppsLoginButton };
}

describe("chat_history Apps Login button", () => {
  test("a Genie message that says to use the Apps button gets one under it", () => {
    const { handlers } = createTestHandlers();
    handlers.appendMessage(
      "assistant",
      "Log in to the apps server for better results. Use the green Apps button below.",
      { shouldPersist: false }
    );
    const $pill = $(".chat-message .chat-message-apps-login .wbe-app-login");
    expect($pill.length).toBe(1);
    // under the words, not inside them
    expect($(".chat-message-body .wbe-app-login").length).toBe(0);
  });

  test("other messages, and the member's own, get no button", () => {
    const { handlers, createAppsLoginButton } = createTestHandlers();
    handlers.appendMessage("assistant", "Firman Joseph Robinson was born in 1901.", { shouldPersist: false });
    handlers.appendMessage("user", "where is the green Apps button?", { shouldPersist: false });
    expect($(".chat-message-apps-login").length).toBe(0);
    expect(createAppsLoginButton).not.toHaveBeenCalled();
  });
});
