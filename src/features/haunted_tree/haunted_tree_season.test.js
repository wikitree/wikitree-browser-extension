import { halloweenSwitch, isHauntedSeason } from "./haunted_tree_season";

// Months are 0-based: 9 is October, 10 November
describe("isHauntedSeason", () => {
  test("October, every year, in the member's local time", () => {
    expect(isHauntedSeason(new Date(2026, 8, 30, 23, 59))).toBe(false);
    expect(isHauntedSeason(new Date(2026, 9, 1))).toBe(true);
    expect(isHauntedSeason(new Date(2026, 9, 31, 23, 59))).toBe(true);
    expect(isHauntedSeason(new Date(2026, 10, 1, 0, 0))).toBe(false);
    expect(isHauntedSeason(new Date(2027, 9, 15))).toBe(true);
  });
});

describe("halloweenSwitch", () => {
  const OCTOBER = new Date(2026, 9, 20);
  const JUST_AFTER_MIDNIGHT = new Date(2026, 10, 1, 0, 1);
  const LATER = new Date(2026, 10, 9);

  test("on in October: it loads, and is marked once", () => {
    expect(halloweenSwitch({ enabled: true, marked: false }, OCTOBER)).toEqual({ on: true, markIt: true });
    expect(halloweenSwitch({ enabled: true, marked: true }, OCTOBER)).toEqual({ on: true, markIt: false });
  });

  test("off in October: nothing happens", () => {
    expect(halloweenSwitch({ enabled: false, marked: false }, OCTOBER)).toEqual({ on: false, markIt: false });
  });

  test("the first page after midnight on 31 October switches it off", () => {
    expect(halloweenSwitch({ enabled: true, marked: true }, JUST_AFTER_MIDNIGHT)).toEqual({
      on: false,
      switchOff: true,
    });
  });

  test("a member who doesn't visit until later is switched off then", () => {
    expect(halloweenSwitch({ enabled: true, marked: true }, LATER)).toEqual({ on: false, switchOff: true });
  });

  test("switched back on (the mark is gone), it stays on", () => {
    expect(halloweenSwitch({ enabled: true, marked: false }, LATER)).toEqual({ on: true });
    expect(halloweenSwitch({ enabled: true, marked: false }, new Date(2027, 2, 1))).toEqual({ on: true });
  });

  test("first switched on after Halloween, it isn't switched off", () => {
    expect(halloweenSwitch({ enabled: true, marked: false }, LATER)).toEqual({ on: true });
  });

  test("already switched off by hand: the mark is just removed", () => {
    expect(halloweenSwitch({ enabled: false, marked: true }, LATER)).toEqual({ on: false, switchOff: true });
  });

  test("next October it's marked again, so it's switched off after that Halloween too", () => {
    expect(halloweenSwitch({ enabled: true, marked: false }, new Date(2027, 9, 5))).toEqual({
      on: true,
      markIt: true,
    });
    expect(halloweenSwitch({ enabled: true, marked: true }, new Date(2027, 10, 1))).toEqual({
      on: false,
      switchOff: true,
    });
  });
});
