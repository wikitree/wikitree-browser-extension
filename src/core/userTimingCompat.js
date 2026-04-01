function ensureUserTimingMethod(perf, methodName) {
  if (!perf || typeof perf[methodName] === "function") {
    return;
  }

  const noop = function () {};

  try {
    perf[methodName] = noop;
  } catch (e) {
    // Some environments expose non-writable performance properties.
  }

  if (typeof perf[methodName] === "function") {
    return;
  }

  try {
    Object.defineProperty(perf, methodName, {
      value: noop,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch (e) {
    // Keep failing safe if defineProperty is not allowed.
  }
}

export function ensureUserTimingCompat() {
  const perf = globalThis?.performance;
  if (!perf) {
    return;
  }

  ensureUserTimingMethod(perf, "clearMarks");
  ensureUserTimingMethod(perf, "clearMeasures");
  ensureUserTimingMethod(perf, "mark");
  ensureUserTimingMethod(perf, "measure");
}

ensureUserTimingCompat();
