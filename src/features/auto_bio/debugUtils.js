export function wbeLog(level, ...args) {
  try {
    if (window && window.autoBioOptions && window.autoBioOptions.debug) {
      const fn = console[level] || console.log;
      fn.apply(console, ["[auto_bio]", ...args]);
    }
  } catch (error) {
    // ignore logging errors
  }
}

export function logMerge(aRef, res, label) {
  if (!res) return aRef;
  if (res === aRef) return aRef;
  try {
    const before = new Set(Object.keys(aRef || {}));
    Object.assign(aRef, res);
    const added = Object.keys(aRef).filter((key) => !before.has(key) && key !== "Text");
    if (added.length) {
      wbeLog("debug", `[auto_bio][merge:${label}] added keys:`, added);
    }
  } catch (error) {
    // merging failed — silently continue
  }
  return aRef;
}
