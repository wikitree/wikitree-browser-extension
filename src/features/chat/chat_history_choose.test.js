import { createChatHistoryHandlers } from "./chat_history";
import { buildDisambiguationMessage } from "./chat_disambiguation";

jest.mock("./chat_router", () => ({
  extractYearFromDate: (date) => Number(String(date || "").slice(0, 4)) || NaN,
  isWikiTreeId: (text) => /^\p{L}[\p{L}' _-]*-\d+$/u.test(String(text || "")),
}));

test("each line of 'Which one did you mean?' has a Choose button that sends that person (the user, 2026-10-15)", () => {
  let history = [];
  document.body.innerHTML = '<div id="chat-messages"></div>';
  sessionStorage.clear();
  const noop = jest.fn();
  let waiting = true;
  const chosen = [];
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
    chooseDisambiguation: (reply) => {
      if (!waiting) return false;
      chosen.push(reply);
      waiting = false;
      return true;
    },
  });

  const lukers = [
    { Name: "Luker-273", RealName: "William Luker", BirthDate: "1801-01-01" },
    { Name: "Luker-1179", RealName: "William Luker", BirthDate: "1802-01-01" },
  ];
  handlers.appendMessage("assistant", buildDisambiguationMessage(lukers, "William Luker"));
  const body = document.querySelector("#chat-messages .chat-message-body:last-of-type") || document.querySelector("#chat-messages");
  const buttons = [...document.querySelectorAll("#chat-messages .wbe-chat-choose")];
  expect(buttons.map((el) => el.dataset.choice)).toEqual(["Luker-273", "Luker-1179"]);
  // the IDs on the lines are still links; the button's isn't one
  expect([...body.querySelectorAll("a")].map((el) => el.textContent)).toEqual(["Luker-273", "Luker-1179"]);
  expect(body.textContent).not.toMatch(/[]/);

  buttons[1].click();
  expect(chosen).toEqual(["Luker-1179"]);
  expect(buttons.every((el) => el.disabled)).toBe(true);
  expect(buttons[1].textContent).toBe("Chosen");

  // restored later, when the question is no longer waiting: nothing is sent
  handlers.renderHistory();
  document.querySelector("#chat-messages .wbe-chat-choose").click();
  expect(chosen).toEqual(["Luker-1179"]);
});
