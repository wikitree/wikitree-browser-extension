jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { chipTitle } from "./chat_chip_titles";
import { EDIT_COMMANDS } from "./chat_edit_page";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// (the user, 2026-10-18: "Can you also add tooltips to the buttons?") Mirrors chat.js's welcome, page and edit chips.
const CHIPS = [
  "How am I related to Ellen?", "My connection to Ellen", "Who were Ellen's grandparents?", "Show my fan chart", "Smiths born in Devon in the 1850s",
  "How am I related to Charles Darwin?", "On this day in this family", "On this day in my family", "Tell me about my tree", "What surnames are in my tree?",
  "Show my Family Explorer", "Map my ancestors", "How complete is my tree?", "How long did my ancestors live?", "What history did my ancestors live through?",
  "Who could I have inherited X-DNA from?", "Show my descendant chart", "Show my family timeline", "Search by name, place or date", "What can I type?",
  "Check for profiles", "Summarize this page", "Who is mentioned on this page?", "Make a timeline of this page",
  "What's missing?", "Suggest categories", "Change explanation", ...EDIT_COMMANDS.map((command) => command.chip),
];

test.each(CHIPS)("%s has a tooltip", (chip) => {
  expect(chipTitle(chip)).not.toBe("");
});

test("Check for profiles looks for the biography's people", () => {
  expect(routeChatPrompt("Check for profiles").intent).toBe(ChatIntent.FIND_BIO_RELATIVES);
});
