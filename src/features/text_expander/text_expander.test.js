jest.mock("../../core/pageType", () => ({ isMainDomain: false }));
jest.mock("../../core/options/options_storage.js", () => ({ shouldInitializeFeature: () => Promise.resolve(false) }));
jest.mock("perfect-scrollbar", () => jest.fn());

import { applyPlaceholder } from "./text_expander";

describe("applyPlaceholder", () => {
  test("no placeholder: unchanged, cursor at end", () => {
    expect(applyPlaceholder("WikiTree", undefined)).toEqual({ text: "WikiTree", cursorOffset: 8, hasPlaceholder: false });
    expect(applyPlaceholder("WikiTree", "")).toEqual({ text: "WikiTree", cursorOffset: 8, hasPlaceholder: false });
  });

  test("placeholder not in expansion: unchanged, cursor at end", () => {
    expect(applyPlaceholder("WikiTree", "|")).toEqual({ text: "WikiTree", cursorOffset: 8, hasPlaceholder: false });
  });

  test("placeholder removed and cursor placed there", () => {
    expect(applyPlaceholder("[[|]]", "|")).toEqual({ text: "[[]]", cursorOffset: 2, hasPlaceholder: true });
    expect(applyPlaceholder("^== Sources ==\n<references />", "^")).toEqual({
      text: "== Sources ==\n<references />",
      cursorOffset: 0,
      hasPlaceholder: true,
    });
  });

  test("only the first occurrence is used", () => {
    expect(applyPlaceholder("a#b#c", "#")).toEqual({ text: "ab#c", cursorOffset: 1, hasPlaceholder: true });
  });
});
