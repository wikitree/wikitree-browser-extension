jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721", FirstName: "Ellen", LastNameAtBirth: "Cook" })),
}));

import { findPageContextPersonCandidate } from "./chat_router";

// Live, 2026-10-03: the second "how am I related to Abraham Lincoln?" found
// Lincoln-229, linked in the first answer's connection path.
describe("page context candidates", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("ignores links inside Genie and other WBE popups", () => {
    document.body.innerHTML = `
      <div id="wbe-chat-popup" class="wbe-popup chat-popup">
        <a href="/wiki/Lincoln-229" title="Abraham Lincoln">Abraham Lincoln</a>
      </div>
      <div class="wbe-popup"><a href="/wiki/Lincoln-229">Abraham Lincoln</a></div>`;
    expect(findPageContextPersonCandidate("Abraham Lincoln")).toBeNull();
  });

  test("still finds people linked on the WikiTree page", () => {
    document.body.innerHTML = `<div id="content"><a href="/wiki/Lincoln-103">Abraham Lincoln</a></div>`;
    expect(findPageContextPersonCandidate("Abraham Lincoln")?.wtId).toBe("Lincoln-103");
  });

  describe("the profile person (live F8, 2026-10-03)", () => {
    beforeEach(() => {
      document.title = "Ellen (Cook) Alley (1832-1898) | WikiTree FREE Family Tree";
    });
    test("a shared surname is not the profile person", () => {
      document.body.innerHTML = `<div id="content"><a href="/wiki/Cook-8720">James Cook</a></div>`;
      expect(findPageContextPersonCandidate("Captain James Cook")).toBeNull();
    });
    test.each(["Ellen", "Ellen Cook", "Ellen Alley"])("%s is the profile person", (target) => {
      expect(findPageContextPersonCandidate(target)?.wtId).toBe("Cook-8721");
    });
  });
});
