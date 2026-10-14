import { createChatHistoryHandlers } from "./chat_history";

test("Insert and Copy for biography text are saved with the text and rebuilt on restore", () => {
  let history = [];
  document.body.innerHTML = '<div id="chat-messages"></div>';
  sessionStorage.clear();
  const used = [];
  const rebuildEditTextActions = jest.fn((text) => [
    { label: "Insert at cursor", actionType: "edit-text", editText: text, onClick: () => used.push(["insert", text]) },
    { label: "Copy", actionType: "edit-text", editText: text, onClick: () => used.push(["copy", text]) },
  ]);
  const noop = jest.fn();
  const handlers = createChatHistoryHandlers({
    chatMessagesId: "chat-messages",
    chatSessionKey: "chat-session-test",
    chatLastConnectionKey: "k1",
    chatLastStructuredKey: "k2",
    chatLastBioKey: "k3",
    chatResultsPopupId: "p",
    chatResultsTableId: "t",
    getChatHistory: () => history,
    setChatHistory: (next) => {
      history = next;
    },
    getLastNonRetryUserPrompt: () => "",
    setLastNonRetryUserPrompt: noop,
    getLastConnectionPopupResult: () => null,
    setLastConnectionPopupResult: noop,
    getLastStructuredResult: () => null,
    setLastStructuredResult: noop,
    getLastBioPopupId: () => null,
    setLastBioPopupState: noop,
    toggleConnectionsPopup: noop,
    openResultsTable: noop,
    resolveToWTID: noop,
    showBioPopupForId: noop,
    openWtPlusQuery: noop,
    tryHandleProfileSearchPrompt: noop,
    reRunSavedWtPlusQuery: noop,
    handleChatResult: noop,
    afterActionClick: noop,
    resetTransientState: noop,
    rebuildEditTextActions,
    rebuildEditCategoryAction: (category) => ({
      label: `Add Category: ${category}`,
      actionType: "edit-category",
      editCategory: category,
      onClick: () => used.push(["category", category]),
    }),
  });

  handlers.appendMessage("assistant", "Birth and Parent Details, ready to add:\n\nBorn 1850.\n\nPress Enter to insert it at the cursor.", { actions: rebuildEditTextActions("Born 1850.") });
  expect(history[history.length - 1].actions).toEqual([
    { label: "Insert at cursor", actionType: "edit-text", editText: "Born 1850." },
    { label: "Copy", actionType: "edit-text", editText: "Born 1850." },
  ]);

  handlers.renderHistory();
  // (the Enter hint is for straight after "add birth" only)
  expect(document.querySelector("#chat-messages").textContent).toContain("Born 1850.");
  expect(document.querySelector("#chat-messages").textContent).not.toContain("Press Enter");
  const buttons = [...document.querySelectorAll("#chat-messages button")];
  expect(buttons.map((el) => el.textContent)).toEqual(["Insert at cursor", "Copy"]);
  buttons[0].click();
  buttons[1].click();
  expect(used).toEqual([
    ["insert", "Born 1850."],
    ["copy", "Born 1850."],
  ]);

  // "Add Category: X" from the category suggestions
  handlers.appendMessage("assistant", "Categories that may fit", {
    actions: [{ label: "Add Category: Farmers", actionType: "edit-category", editCategory: "Farmers", onClick: () => {} }],
  });
  expect(history[history.length - 1].actions).toEqual([{ label: "Add Category: Farmers", actionType: "edit-category", editCategory: "Farmers" }]);
  handlers.renderHistory();
  [...document.querySelectorAll("#chat-messages button")].find((el) => el.textContent === "Add Category: Farmers").click();
  expect(used[used.length - 1]).toEqual(["category", "Farmers"]);
});
