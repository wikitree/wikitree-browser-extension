// The bootstrap's use of chrome.storage.sync, on dates either side of the season
jest.mock("../../core/options/lazy_feature", () => ({ loadFeatureWhereEnabled: jest.fn() }));
jest.mock("./christmas_tree_store", () => ({ clearChristmasTreeIfSaved: jest.fn() }));

function bootOn(date, saved) {
  jest.useFakeTimers().setSystemTime(date);
  const sync = { ...saved };
  global.chrome = {
    storage: {
      sync: {
        get: (keys, callback) => callback(Object.fromEntries(keys.filter((k) => k in sync).map((k) => [k, sync[k]]))),
        set: (items) => Object.assign(sync, items),
        remove: (key) => delete sync[key],
      },
    },
  };
  let loaded, cleared;
  jest.isolateModules(() => {
    require("./christmas_tree_bootstrap");
    loaded = require("../../core/options/lazy_feature").loadFeatureWhereEnabled.mock.calls.length > 0;
    cleared = require("./christmas_tree_store").clearChristmasTreeIfSaved.mock.calls.length > 0;
  });
  return { sync, loaded, cleared };
}

afterEach(() => {
  jest.useRealTimers();
  delete global.chrome;
});

test("on in December: it loads and is marked", () => {
  expect(bootOn(new Date(2026, 11, 20), { christmasTree: true })).toEqual({
    sync: { christmasTree: true, christmasTree_onAtChristmas: true },
    loaded: true,
    cleared: false,
  });
});

test("on, Twelfth Night: still loads", () => {
  expect(bootOn(new Date(2027, 0, 6, 20), { christmasTree: true, christmasTree_onAtChristmas: true })).toEqual({
    sync: { christmasTree: true, christmasTree_onAtChristmas: true },
    loaded: true,
    cleared: false,
  });
});

test("on, Orthodox Christmas (7 January): still loads", () => {
  expect(bootOn(new Date(2027, 0, 7, 20), { christmasTree: true, christmasTree_onAtChristmas: true })).toEqual({
    sync: { christmasTree: true, christmasTree_onAtChristmas: true },
    loaded: true,
    cleared: false,
  });
});

test("8 January: switched off, unmarked, and its scans cleared", () => {
  expect(bootOn(new Date(2027, 0, 8, 0, 1), { christmasTree: true, christmasTree_onAtChristmas: true })).toEqual({
    sync: { christmasTree: false },
    loaded: false,
    cleared: true,
  });
});

test("switched back on after that: it loads, and nothing is changed", () => {
  expect(bootOn(new Date(2027, 0, 9), { christmasTree: true })).toEqual({
    sync: { christmasTree: true },
    loaded: true,
    cleared: false,
  });
});

test("off in December: nothing is written or cleared (the scans are kept for the season)", () => {
  expect(bootOn(new Date(2026, 11, 20), {})).toEqual({ sync: {}, loaded: false, cleared: false });
});

test("never switched on, out of season: nothing is written, and any old scans are cleared", () => {
  expect(bootOn(new Date(2026, 10, 20), {})).toEqual({ sync: {}, loaded: false, cleared: true });
});
