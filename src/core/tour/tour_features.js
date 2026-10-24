// The features the edit page tour shows, switched on just for the tour (2026-10-24). Features read their
// switch when the page loads, so the tour turns on the ones that are off, reloads the page once and starts
// again from there. When it ends, or is stopped, they go back off. A note in local storage says which were
// switched on, and the running tour stamps it every few seconds: if the tour never got to switch them back
// (the tab was closed or reloaded half-way), the next WikiTree page to load does it (common.js).

const RECORD = "wbeTourSwitchedOn"; // chrome.storage.local: {features: {id: stored value or null}, tab, stamp}
const RESUME = "wbeTourResume"; // sessionStorage: start the tour again once the page has reloaded
const TAB = "wbeTourTab"; // sessionStorage: which tab switched them on
const STAMP_MS = 15000;
const STALE_MS = 3 * 60 * 1000; // (background tabs only run timers once a minute)

const local = {
  get: () => new Promise((resolve) => chrome.storage.local.get(RECORD, (items) => resolve(items?.[RECORD] || null))),
  set: (record) => new Promise((resolve) => chrome.storage.local.set({ [RECORD]: record }, resolve)),
  remove: () => new Promise((resolve) => chrome.storage.local.remove(RECORD, resolve)),
};

function session(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    return null;
  }
}

/** Puts the features back as they were stored before the tour, and forgets the note. */
export async function switchBack() {
  const record = await local.get();
  if (!record) return;
  const features = record.features || {};
  const unset = Object.keys(features).filter((id) => features[id] === null);
  const set = Object.fromEntries(
    Object.keys(features)
      .filter((id) => features[id] !== null)
      .map((id) => [id, features[id]])
  );
  await Promise.all([
    unset.length && new Promise((resolve) => chrome.storage.sync.remove(unset, resolve)),
    Object.keys(set).length && new Promise((resolve) => chrome.storage.sync.set(set, resolve)),
  ]);
  await local.remove();
}

/**
 * Switches on the features that are off (ids, with enabled from getEnabledStateForAllFeatures), and sets the
 * other settings given ({storage key: value}, e.g. a feature's options), notes what they were and reloads the
 * page (reload). Resolves false, doing nothing, when there's nothing to change.
 */
export async function switchOnAndReload(ids, enabled, reload = () => location.reload(), settings = {}) {
  const changes = {
    ...Object.fromEntries(ids.filter((id) => enabled[id] === false).map((id) => [id, true])),
    ...settings,
  };
  const keys = Object.keys(changes);
  if (!keys.length) return false;
  const stored = await new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
  const tab = session(TAB) || String(Math.random()).slice(2);
  session(TAB, tab);
  await local.set({
    features: Object.fromEntries(keys.map((key) => [key, stored?.[key] ?? null])),
    tab,
    stamp: Date.now(),
  });
  await new Promise((resolve) => chrome.storage.sync.set(changes, resolve));
  session(RESUME, "1");
  reload();
  return true;
}

/**
 * While the tour runs, keeps the note fresh so other pages don't switch the features back under it. Returns
 * the ids (storage keys) it changed (empty when none) and a stop function.
 */
export async function switchedOnForTour() {
  const record = await local.get();
  if (!record || record.tab !== session(TAB)) return { ids: [], stop: () => {} };
  const stamp = () => local.get().then((now) => now && local.set({ ...now, stamp: Date.now() }));
  stamp();
  const timer = setInterval(stamp, STAMP_MS);
  return { ids: Object.keys(record.features || {}), stop: () => clearInterval(timer) };
}

/**
 * On a page load: "resume" when this tab is reloading for the tour (the caller starts it again); otherwise
 * switches the features back if the tour that switched them on was cut short: in this tab, or anywhere a
 * while ago.
 */
export async function afterLoad() {
  const record = await local.get();
  if (!record) return null;
  const mine = record.tab === session(TAB);
  if (mine && session(RESUME)) {
    session(RESUME, null);
    return "resume";
  }
  if (mine || Date.now() - (record.stamp || 0) > STALE_MS) await switchBack();
  return null;
}
