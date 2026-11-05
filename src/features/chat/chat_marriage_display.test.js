import { isHiddenMarriage, shownSpouses } from "./chat_marriage_display";

test("isHiddenMarriage: do_not_display or DoNotDisplay set", () => {
  expect(isHiddenMarriage({ do_not_display: "1" })).toBe(true);
  expect(isHiddenMarriage({ DoNotDisplay: "1" })).toBe(true);
  expect(isHiddenMarriage({ do_not_display: 1 })).toBe(true);
  expect(isHiddenMarriage({ do_not_display: "0", DoNotDisplay: "0" })).toBe(false);
  expect(isHiddenMarriage({})).toBe(false);
  expect(isHiddenMarriage(null)).toBe(false);
});

test("shownSpouses: getPeople's list or getRelatives' object, without the hidden marriages", () => {
  const shown = { Id: 1, do_not_display: "0" };
  const ex = { Id: 2, do_not_display: "1" };
  expect(shownSpouses([shown, ex, null])).toEqual([shown]);
  expect(shownSpouses({ 1: shown, 2: ex })).toEqual([shown]);
  expect(shownSpouses(undefined)).toEqual([]);
});
