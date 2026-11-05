import { createChatHistoryHandlers } from "./chat_history";

test("chart buttons are saved with their chart and person, and rebuilt on restore", () => {
  let history = [];
  document.body.innerHTML = '<div id="chat-messages"></div>';
  sessionStorage.clear();
  const opened = [];
  const rebuildChartAction = jest.fn((entry) => ({ label: entry.label, onClick: () => opened.push([entry.chart, entry.chartKey, ...entry.chartArgs]) }));
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
    rebuildChartAction,
    openResultsTable: noop,
    resolveToWTID: noop,
    showBioPopupForId: noop,
    openWtPlusQuery: noop,
    tryHandleProfileSearchPrompt: noop,
    reRunSavedWtPlusQuery: noop,
    handleChatResult: noop,
    afterActionClick: noop,
    resetTransientState: noop,
  });

  handlers.appendMessage("assistant", "Here are her ancestors", {
    actions: [{ label: "Brick walls fan chart", onClick: noop, actionType: "chart", chart: "fan", chartKey: "Windsor-1", chartArgs: ["brickwalls", "Brick walls fan chart"] }],
  });
  const saved = history[history.length - 1].actions[0];
  expect(saved).toEqual(expect.objectContaining({ chart: "fan", chartKey: "Windsor-1", chartArgs: ["brickwalls", "Brick walls fan chart"] }));

  handlers.renderHistory();
  const button = [...document.querySelectorAll("#chat-messages button")].find((el) => el.textContent === "Brick walls fan chart");
  expect(button).toBeTruthy();
  button.click();
  expect(opened).toEqual([["fan", "Windsor-1", "brickwalls", "Brick walls fan chart"]]);
});
