jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: jest.fn(() => Promise.resolve(false)),
  getFeatureOptions: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../core/clipboard.js", () => ({
  copyToClipboard: jest.fn(() => Promise.resolve()),
}));

jest.mock("../access_keys/access_keys.js", () => ({
  showCopyMessage: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  profilePerson: { Name: "Test-1" },
}));

jest.mock("../../core/pageType", () => ({
  isMediaWikiPage: false,
  isProfileHistoryDetail: false,
  isProfilePage: false,
  isProfileEdit: false,
  isSpaceEdit: false,
  isSpacePage: false,
  isCategoryPage: false,
  isImagePage: false,
  isTemplatePage: false,
  isProjectPage: false,
  isNetworkFeed: false,
  isCategoryEdit: false,
  isHelpPage: false,
  isWikiPage: false,
}));

import $ from "jquery";
import { addItems } from "./scissors.js";

describe("addItems", () => {
  test("wraps a copy list in a li when appending into a ul", () => {
    document.body.innerHTML = '<ul id="jump-nav"></ul>';

    addItems([{ label: "Link", text: "[[Test]]" }], $("#jump-nav"));

    const $jumpNav = $("#jump-nav");
    expect($jumpNav.children().length).toBe(1);
    expect($jumpNav.children().first().is("li")).toBe(true);
    expect($jumpNav.children().first().hasClass("wbe-copy-list-item")).toBe(true);
    expect($jumpNav.find("> li > ul.copy--buttons").length).toBe(1);
  });
});
