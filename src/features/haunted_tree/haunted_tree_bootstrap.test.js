// The bootstrap's use of chrome.storage.sync, on dates either side of Halloween
jest.mock("../../core/options/lazy_feature", () => ({ loadFeatureWhereEnabled: jest.fn() }));
jest.mock("./haunted_tree_store", () => ({ clearHauntedTreeIfSaved: jest.fn() }));

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
    require("./haunted_tree_bootstrap");
    loaded = require("../../core/options/lazy_feature").loadFeatureWhereEnabled.mock.calls.length > 0;
    cleared = require("./haunted_tree_store").clearHauntedTreeIfSaved.mock.calls.length > 0;
  });
  return { sync, loaded, cleared };
}

afterEach(() => {
  jest.useRealTimers();
  delete global.chrome;
});

test("on in October: it loads and is marked", () => {
  expect(bootOn(new Date(2026, 9, 20), { hauntedTree: true })).toEqual({
    sync: { hauntedTree: true, hauntedTree_onAtHalloween: true },
    loaded: true,
    cleared: false,
  });
});

test("1 November: switched off, unmarked, and its scans cleared", () => {
  expect(bootOn(new Date(2026, 10, 1, 0, 1), { hauntedTree: true, hauntedTree_onAtHalloween: true })).toEqual({
    sync: { hauntedTree: false },
    loaded: false,
    cleared: true,
  });
});

test("switched back on after that: it loads, and nothing is changed", () => {
  expect(bootOn(new Date(2026, 10, 2), { hauntedTree: true })).toEqual({
    sync: { hauntedTree: true },
    loaded: true,
    cleared: false,
  });
});

test("never switched on: nothing is written", () => {
  expect(bootOn(new Date(2026, 9, 20), {})).toEqual({ sync: {}, loaded: false, cleared: false });
});
