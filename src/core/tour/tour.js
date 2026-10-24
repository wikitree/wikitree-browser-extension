// A guided tour's plan runner and clock, shared by Genie's "Show me around" (features/chat/chat_tour.js) and
// the page tours (edit_page_tour.js). tour_ui.js draws the caption and pointer and does the hovers and clicks.
// A step: {caption, needs?, welcome?, point?, pointText?, prompt?, followUp?, waitFor?, settle?, hold?, actions?}; an
// action can have needs too.

/** Time to read an answer of this many words: 2.5 s plus a fifth of a second a word, 3 to 12 s. */
export function readingTime(text) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.min(12000, Math.max(3000, 2500 + words * 200));
}

/**
 * About how long a caption takes to say aloud (ms), for a narrated video (macOS's Daniel at its usual rate,
 * measured 2026-10-16: within 0.4 s, mostly over): its letters (a digit or sign is a word of its own), and a
 * pause at each comma, colon or bracket and each full stop. A caption stays up at least this long.
 */
export function speakingTime(text) {
  const t = String(text || "");
  const letters = (t.match(/[A-Za-z]/g) || []).length + 3 * (t.match(/[0-9%↑↓←→▾+−]/g) || []).length;
  const pauses = (t.match(/[,:;(]|[-–—] /g) || []).length;
  const stops = (t.match(/[.!?…](?=\s|$)/g) || []).length;
  return Math.round(300 + 62 * letters + 450 * pauses + 450 * stops);
}

/** ms before each letter: a little longer after a space or punctuation, so it reads as typing. */
export function typingDelay(char) {
  if (/[.,?!:;]/.test(char)) return 140;
  if (char === " ") return 90;
  return 48;
}

export class TourStopped extends Error {
  constructor() {
    super("The tour was stopped");
    this.name = "TourStopped";
  }
}

/**
 * The tour's clock: wait(ms) counts only while not paused; next() skips the rest of the step (its
 * waits end at once until skipping is cleared at the next step); stop() ends every wait with TourStopped.
 */
export function createTourClock({ setTimer = setTimeout, clearTimer = clearTimeout, now = () => Date.now() } = {}) {
  let paused = false;
  let stopped = false;
  let skipping = false;
  let current = null; // {remaining, started, timer, resolve, reject}
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener({ paused, stopped, skipping }));
  const settle = () => {
    const waiting = current;
    current = null;
    if (waiting?.timer) clearTimer(waiting.timer);
    waiting?.resolve();
  };
  const arm = () => {
    current.started = now();
    current.timer = setTimer(settle, current.remaining);
  };
  return {
    get paused() {
      return paused;
    },
    get stopped() {
      return stopped;
    },
    get skipping() {
      return skipping;
    },
    wait(ms) {
      if (stopped) return Promise.reject(new TourStopped());
      if (skipping || !(ms > 0)) return Promise.resolve();
      settle(); // (one wait at a time)
      return new Promise((resolve, reject) => {
        current = { remaining: ms, started: 0, timer: null, resolve, reject };
        if (!paused) arm();
      });
    },
    pause() {
      if (paused || stopped) return;
      paused = true;
      if (current?.timer) {
        clearTimer(current.timer);
        current.timer = null;
        current.remaining = Math.max(0, current.remaining - (now() - current.started));
      }
      notify();
    },
    resume() {
      if (!paused || stopped) return;
      paused = false;
      if (current && !current.timer) arm();
      notify();
    },
    next() {
      if (stopped) return;
      skipping = true;
      settle();
      notify();
    },
    clearSkip() {
      skipping = false;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const waiting = current;
      current = null;
      if (waiting?.timer) clearTimer(waiting.timer);
      waiting?.reject(new TourStopped());
      notify();
    },
    /** Throws TourStopped once stopped (between awaits that aren't clock waits). */
    check() {
      if (stopped) throw new TourStopped();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Runs the steps. env: {clock, caption(text, {index, count}), has(selector), welcome(), typeLetters(text)
 * (shows a prefix), send(prompt, {followUp}) (resolves when Genie has answered), waitFor(selector) (resolves true
 * when it appears, false after a while), lastAnswer() (text), point(selector, text), act(action) (glides
 * the pointer there and does it; false when nothing matched), run(action) (shows action.point and awaits
 * action.run(); false when it did nothing), type(action) (types action.type into action.into, letter by letter),
 * end({stopped}), now()? (ms; Date.now)}. An action's when() false leaves it out, like needs. Each
 * caption stays up for at least its speakingTime, so a narration of it ends before the next one starts.
 * Resolves "done" or "stopped".
 */
export async function runTour(steps, env) {
  const { clock } = env;
  const now = env.now || (() => Date.now());
  let spokenBy = 0; // (when the caption on screen has had time to be said)
  // A step's own caption first waits for the one on screen, from the step before: Next pressed then skips
  // that one, not the step about to start.
  const showCaption = async (text, index, { stepStart = false } = {}) => {
    if (spokenBy > now()) {
      await clock.wait(spokenBy - now());
      if (stepStart) clock.clearSkip();
    }
    env.caption(text, { index, count: steps.length });
    spokenBy = now() + speakingTime(text);
  };
  try {
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      if (clock.skipping) spokenBy = 0; // (Next moves on at once)
      clock.clearSkip();
      clock.check();
      if (step.needs && !env.has(step.needs)) continue;
      await showCaption(step.caption, index, { stepStart: true });
      if (step.welcome) env.welcome();
      if (step.point) await env.point(step.point, step.pointText);
      let drawn = true;
      if (step.prompt) {
        await typeInto(step.prompt, env);
        clock.check();
        await env.send(step.prompt, { followUp: Boolean(step.followUp) });
        clock.check();
        if (step.waitFor) drawn = await env.waitFor(step.waitFor);
        clock.check();
        if (drawn && step.settle) await clock.wait(step.settle);
      }
      await clock.wait(step.hold === "read" ? readingTime(env.lastAnswer()) : step.hold || 0);
      for (const action of drawn ? step.actions || [] : []) {
        if (clock.skipping) break;
        if (action.needs && !env.has(action.needs)) continue; // (caption and all)
        if (action.when && !action.when()) continue;
        if (action.caption) await showCaption(action.caption, index);
        if (action.run || action.type) {
          // (run: the page tour's own doing, e.g. Auto Bio writing a biography; type: letters into a field)
          if (!(await (action.run ? env.run(action) : env.type(action)))) {
            if (action.optional) continue;
            break;
          }
          clock.check();
        }
        if (action.hover || action.click || action.key) {
          if (!(await env.act(action))) {
            if (action.optional) continue;
            break;
          }
          if (action.waitFor) {
            if (!(await env.waitFor(action.waitFor))) break;
            clock.check();
            if (action.settle) await clock.wait(action.settle);
          }
        }
        await clock.wait(action.hold || 0);
      }
    }
    if (spokenBy > now()) await clock.wait(spokenBy - now());
    env.end({ stopped: false });
    return "done";
  } catch (error) {
    if (!(error instanceof TourStopped)) throw error;
    env.end({ stopped: true });
    return "stopped";
  }
}

async function typeInto(text, env) {
  for (let shown = 1; shown <= text.length; shown++) {
    if (env.clock.skipping) break;
    env.typeLetters(text.slice(0, shown));
    await env.clock.wait(typingDelay(text[shown - 1]));
  }
  env.typeLetters(text);
}
