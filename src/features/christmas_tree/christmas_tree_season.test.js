import { christmasSwitch, isChristmasSeason } from "./christmas_tree_season";

// Months are 0-based: 10 is November, 11 December, 0 January
describe("isChristmasSeason", () => {
  test("1 December to 6 January, every year, in the member's local time", () => {
    expect(isChristmasSeason(new Date(2026, 10, 30, 23, 59))).toBe(false);
    expect(isChristmasSeason(new Date(2026, 11, 1))).toBe(true);
    expect(isChristmasSeason(new Date(2026, 11, 31, 23, 59))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 6, 23, 59))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 7, 0, 0))).toBe(false);
    expect(isChristmasSeason(new Date(2027, 6, 15))).toBe(false);
    expect(isChristmasSeason(new Date(2027, 11, 20))).toBe(true);
  });
});

describe("christmasSwitch", () => {
  const DECEMBER = new Date(2026, 11, 10);
  const TWELFTH_NIGHT = new Date(2027, 0, 6, 22, 0);
  const JUST_AFTER = new Date(2027, 0, 7, 0, 1);
  const LATER = new Date(2027, 1, 9);

  test("on in the season: it loads, and is marked once, on either side of New Year", () => {
    expect(christmasSwitch({ enabled: true, marked: false }, DECEMBER)).toEqual({ on: true, markIt: true });
    expect(christmasSwitch({ enabled: true, marked: true }, DECEMBER)).toEqual({ on: true, markIt: false });
    expect(christmasSwitch({ enabled: true, marked: true }, TWELFTH_NIGHT)).toEqual({ on: true, markIt: false });
  });

  test("switched on in November: on, but not marked until December", () => {
    expect(christmasSwitch({ enabled: true, marked: false }, new Date(2026, 10, 28))).toEqual({ on: true });
  });

  test("the first page from 7 January switches it off, however late they visit", () => {
    expect(christmasSwitch({ enabled: true, marked: true }, JUST_AFTER)).toEqual({ on: false, switchOff: true });
    expect(christmasSwitch({ enabled: true, marked: true }, LATER)).toEqual({ on: false, switchOff: true });
  });

  test("switched back on (the mark is gone), it stays on", () => {
    expect(christmasSwitch({ enabled: true, marked: false }, LATER)).toEqual({ on: true });
  });

  test("next December it's marked again", () => {
    expect(christmasSwitch({ enabled: true, marked: false }, new Date(2027, 11, 1))).toEqual({
      on: true,
      markIt: true,
    });
  });
});
