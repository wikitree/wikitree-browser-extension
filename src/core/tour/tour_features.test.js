import { afterLoad, switchBack, switchOnAndReload, switchedOnForTour } from "./tour_features";

// chrome.storage's sync and local areas, kept in memory.
function area(items = {}) {
  return {
    items,
    get: (keys, done) => {
      const wanted = typeof keys === "string" ? [keys] : keys;
      done(Object.fromEntries(wanted.filter((key) => key in items).map((key) => [key, items[key]])));
    },
    set: (values, done) => {
      Object.assign(items, values);
      done?.();
    },
    remove: (keys, done) => {
      (typeof keys === "string" ? [keys] : keys).forEach((key) => delete items[key]);
      done?.();
    },
  };
}

let reload;
beforeEach(() => {
  global.chrome = { storage: { sync: area({ autoBio: false, goldStandard: true }), local: area() } };
  sessionStorage.clear();
  reload = jest.fn();
});

const sync = () => chrome.storage.sync.items;
const record = () => chrome.storage.local.items.wbeTourSwitchedOn;

test("switches on only the features that are off, notes what they were, and reloads", async () => {
  const enabled = { autoBio: false, goldStandard: true, chat: false }; // (chat: off by default, never set)
  expect(await switchOnAndReload(["autoBio", "goldStandard", "chat"], enabled, reload)).toBe(true);
  expect(sync()).toEqual({ autoBio: true, goldStandard: true, chat: true });
  expect(record().features).toEqual({ autoBio: false, chat: null });
  expect(reload).toHaveBeenCalled();
});

test("sets other settings too, and puts them back", async () => {
  chrome.storage.sync.items.locationsHelper_options = { newLocations: "no", allDates: true };
  const settings = { locationsHelper_options: { newLocations: "augment", allDates: true } };
  expect(await switchOnAndReload([], {}, reload, settings)).toBe(true);
  expect(sync().locationsHelper_options.newLocations).toBe("augment");
  await switchBack();
  expect(sync().locationsHelper_options).toEqual({ newLocations: "no", allDates: true });
});

test("does nothing when they're all on", async () => {
  expect(await switchOnAndReload(["goldStandard"], { goldStandard: true }, reload)).toBe(false);
  expect(record()).toBeUndefined();
  expect(reload).not.toHaveBeenCalled();
});

test("switching back puts them as they were stored, and forgets the note", async () => {
  await switchOnAndReload(["autoBio", "chat"], { autoBio: false, chat: false }, reload);
  await switchBack();
  expect(sync()).toEqual({ autoBio: false, goldStandard: true });
  expect(record()).toBeUndefined();
});

test("the reload resumes the tour once, in the tab that switched them on", async () => {
  await switchOnAndReload(["autoBio"], { autoBio: false }, reload);
  expect(await afterLoad()).toBe("resume");
  const forTour = await switchedOnForTour();
  expect(forTour.ids).toEqual(["autoBio"]);
  forTour.stop();
  expect(sync().autoBio).toBe(true);
});

test("a tour cut short in this tab is switched back on its next page load", async () => {
  await switchOnAndReload(["autoBio"], { autoBio: false }, reload);
  await afterLoad(); // (resumed, then the tab was reloaded half-way through)
  expect(await afterLoad()).toBe(null);
  expect(sync().autoBio).toBe(false);
  expect(record()).toBeUndefined();
});

test("another tab leaves a running tour's features alone, but switches back a stale one", async () => {
  await switchOnAndReload(["autoBio"], { autoBio: false }, reload);
  sessionStorage.clear(); // (another tab)
  expect(await afterLoad()).toBe(null);
  expect(sync().autoBio).toBe(true);
  record().stamp = Date.now() - 10 * 60 * 1000;
  await afterLoad();
  expect(sync().autoBio).toBe(false);
});

test("another tab's note isn't this tab's tour", async () => {
  await switchOnAndReload(["autoBio"], { autoBio: false }, reload);
  sessionStorage.clear();
  expect((await switchedOnForTour()).ids).toEqual([]);
});
