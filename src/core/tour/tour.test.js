import { createTourClock, readingTime, runTour, speakingTime, TourStopped } from "./tour";

test("readingTime: 3 to 12 seconds, longer for longer answers", () => {
  expect(readingTime("")).toBe(3000);
  expect(readingTime("one two three four five six seven eight nine ten")).toBe(4500);
  expect(readingTime("word ".repeat(200))).toBe(12000);
});

describe("createTourClock", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("a wait counts only while not paused", async () => {
    const clock = createTourClock();
    let done = false;
    clock.wait(1000).then(() => (done = true));
    jest.advanceTimersByTime(400);
    clock.pause();
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(done).toBe(false);
    clock.resume();
    jest.advanceTimersByTime(599);
    await Promise.resolve();
    expect(done).toBe(false);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  test("next ends the wait and the step's later waits, until clearSkip", async () => {
    const clock = createTourClock();
    let done = false;
    clock.wait(10000).then(() => (done = true));
    clock.next();
    await Promise.resolve();
    expect(done).toBe(true);
    await expect(clock.wait(10000)).resolves.toBeUndefined();
    clock.clearSkip();
    let later = false;
    clock.wait(1000).then(() => (later = true));
    await Promise.resolve();
    expect(later).toBe(false);
  });

  test("stop ends the wait with TourStopped, and every wait after", async () => {
    const clock = createTourClock();
    const waiting = clock.wait(10000);
    clock.stop();
    await expect(waiting).rejects.toBeInstanceOf(TourStopped);
    await expect(clock.wait(10)).rejects.toBeInstanceOf(TourStopped);
    expect(() => clock.check()).toThrow(TourStopped);
  });
});

describe("runTour", () => {
  // A clock whose waits end at once, recording what they were.
  function fakeEnv(overrides = {}) {
    const log = [];
    const clock = createTourClock({ setTimer: (fn) => (Promise.resolve().then(fn), 1), clearTimer: () => {} });
    const env = {
      clock,
      log,
      caption: (text, { index, count }) => log.push(`caption ${index + 1}/${count}: ${text}`),
      typeLetters: (text) => (env.typed = text),
      send: async (prompt) => log.push(`send: ${prompt} (typed "${env.typed}")`),
      waitFor: async (selector) => (log.push(`waitFor ${selector}`), true),
      lastAnswer: () => "An answer.",
      has: () => true,
      welcome: () => log.push("welcome"),
      point: async (selector, text) => log.push(`point ${selector}${text ? ` "${text}"` : ""}`),
      act: async (action) => (log.push(`act ${action.key ? `key ${action.key}` : action.hover ? "hover" : `click ${action.click}`}`), true),
      end: ({ stopped }) => log.push(stopped ? "end (stopped)" : "end"),
      ...overrides,
    };
    return env;
  }
  const steps = [
    { caption: "One", prompt: "Who?", hold: "read" },
    { caption: "Two", prompt: "Chart", waitFor: "#chart", settle: 10, hold: 10, actions: [{ caption: "Hover", hover: "path", hold: 10 }, { click: "span", hold: 10 }] },
    { caption: "End", point: "#box", hold: 10, end: true },
  ];

  test("types each question in full, sends it, waits for the chart, then acts", async () => {
    const env = fakeEnv();
    await expect(runTour(steps, env)).resolves.toBe("done");
    expect(env.log).toEqual([
      "caption 1/3: One",
      'send: Who? (typed "Who?")',
      "caption 2/3: Two",
      'send: Chart (typed "Chart")',
      "waitFor #chart",
      "caption 2/3: Hover",
      "act hover",
      "act click span",
      "caption 3/3: End",
      "point #box",
      "end",
    ]);
  });

  test("a follow-up step is sent as a follow-up; the others as new questions", async () => {
    const sent = [];
    const env = fakeEnv({ send: async (prompt, options) => sent.push([prompt, options]) });
    await runTour([{ caption: "One", prompt: "Who?" }, { caption: "Two", prompt: "Which?", followUp: true, end: true }], env);
    expect(sent).toEqual([
      ["Who?", { followUp: false }],
      ["Which?", { followUp: true }],
    ]);
  });

  test("a chart that never appears: no actions, the tour goes on", async () => {
    const env = fakeEnv({ waitFor: async () => false });
    await runTour(steps, env);
    expect(env.log.some((line) => line.startsWith("act"))).toBe(false);
    expect(env.log.at(-1)).toBe("end");
  });

  test("stop during an answer: nothing more happens", async () => {
    const env = fakeEnv();
    env.send = async () => env.clock.stop();
    await expect(runTour(steps, env)).resolves.toBe("stopped");
    expect(env.log).toEqual(["caption 1/3: One", "end (stopped)"]);
  });

  test("next during a step skips its actions, and the next step plays normally", async () => {
    const env = fakeEnv();
    env.waitFor = async () => (env.clock.next(), true);
    await runTour(steps, env);
    expect(env.log.some((line) => line.startsWith("act"))).toBe(false);
    expect(env.log).toContain("point #box");
  });

  test("a step that needs what isn't there is left out, caption and all", async () => {
    const env = fakeEnv({ has: (selector) => selector !== "#fan" });
    const needing = [
      { caption: "Menu", needs: "#menu", actions: [{ click: "#menu", hold: 10 }] },
      { caption: "Full screen", needs: "#fan", actions: [{ click: "#full", hold: 10 }] },
      { caption: "End", hold: 10 },
    ];
    await runTour(needing, env);
    expect(env.log).toEqual(["caption 1/3: Menu", "act click #menu", "caption 3/3: End", "end"]);
  });

  test("an action that needs what isn't there is left out, caption and all", async () => {
    const env = fakeEnv({ has: (selector) => selector !== "#find" });
    const needing = [{ caption: "Toolbar", actions: [{ caption: "Find", needs: "#find", click: "#find" }, { caption: "Expand", needs: "#expand", click: "#expand" }] }];
    await runTour(needing, env);
    expect(env.log).toEqual(["caption 1/1: Toolbar", "caption 1/1: Expand", "act click #expand", "end"]);
  });

  test("an action without its target ends the step's actions, unless it's optional; a caption-only one just holds", async () => {
    const env = fakeEnv({ act: async (action) => (env.log.push(`act ${action.click}`), action.click !== "#gone" && action.click !== "#maybe") });
    const acting = [
      {
        caption: "Explorer",
        actions: [
          { click: "#family", hold: 10 },
          { click: "#maybe", optional: true },
          { caption: "Watch", hold: 10 },
          { click: "#gone", hold: 10 },
          { click: "#never", hold: 10 },
        ],
      },
    ];
    await runTour(acting, env);
    expect(env.log).toEqual(["caption 1/1: Explorer", "act #family", "act #maybe", "caption 1/1: Watch", "act #gone", "end"]);
  });

  test("an action's waitFor: the rest of the step waits for it, and is left out when it never comes", async () => {
    const env = fakeEnv({ waitFor: async (selector) => (env.log.push(`waitFor ${selector}`), selector !== "#never") });
    const waiting = [
      { caption: "Menu", actions: [{ click: "#fan-item", waitFor: "#fan", settle: 10 }, { caption: "Fan", hold: 10 }] },
      { caption: "Again", actions: [{ click: "#fan-item", waitFor: "#never" }, { caption: "Not shown", hold: 10 }] },
    ];
    await runTour(waiting, env);
    expect(env.log).toEqual(["caption 1/2: Menu", "act click #fan-item", "waitFor #fan", "caption 1/2: Fan", "caption 2/2: Again", "act click #fan-item", "waitFor #never", "end"]);
  });

  test("keys are pressed through act; the end shows the welcome buttons, then points at one", async () => {
    const env = fakeEnv();
    const ending = [
      { caption: "3D", actions: [{ key: "ArrowUp", on: ".wbe-3d", times: 2, hold: 10 }] },
      { caption: "Bye", welcome: true, point: ".chips button", pointText: "What can I type?", hold: 10, end: true },
    ];
    await runTour(ending, env);
    expect(env.log).toEqual(["caption 1/2: 3D", "act key ArrowUp", "caption 2/2: Bye", "welcome", 'point .chips button "What can I type?"', "end"]);
  });

  test("a caption stays up until it could be said: the next one, and the end, wait for the rest", async () => {
    let time = 0;
    const env = fakeEnv({ now: () => time });
    const wait = env.clock.wait;
    env.clock.wait = (ms) => {
      env.log.push(`wait ${ms}`);
      time += ms || 0;
      return wait(ms);
    };
    const said = [
      { caption: "One, two.", hold: 1000, actions: [{ caption: "Three", hold: 0 }] },
      { caption: "End", end: true },
    ];
    await runTour(said, env);
    const one = speakingTime("One, two.");
    const three = speakingTime("Three");
    expect(env.log).toEqual([
      "caption 1/2: One, two.",
      "wait 1000",
      `wait ${one - 1000}`,
      "caption 1/2: Three",
      "wait 0",
      `wait ${three}`,
      "caption 2/2: End",
      "wait 0",
      `wait ${speakingTime("End")}`,
      "end",
    ]);
  });

  test("Next while the last step's caption is still up skips that one, and the next step plays in full", async () => {
    let time = 0;
    const env = fakeEnv({ now: () => time });
    const wait = env.clock.wait;
    env.clock.wait = (ms) => {
      env.log.push(`wait ${ms}`);
      // (pressed while step two waits for step one's caption to have been said)
      if (ms === speakingTime("One, two, three.") - 10) env.clock.next();
      time += ms || 0;
      return wait(ms);
    };
    await runTour([{ caption: "One, two, three.", hold: 10 }, { caption: "Two", hold: 10, actions: [{ hover: "#a", hold: 20 }] }, { caption: "End", end: true }], env);
    expect(env.log).toEqual([
      "caption 1/3: One, two, three.",
      "wait 10",
      `wait ${speakingTime("One, two, three.") - 10}`,
      "caption 2/3: Two",
      "wait 10",
      "act hover",
      "wait 20",
      `wait ${speakingTime("Two") - 30}`,
      "caption 3/3: End",
      "wait 0",
      `wait ${speakingTime("End")}`,
      "end",
    ]);
  });

  test("after Next, the next step's caption doesn't wait for the skipped one to be said", async () => {
    const env = fakeEnv({ now: () => 0 });
    const caption = env.caption;
    env.caption = (text, where) => {
      caption(text, where);
      if (text === "Long, long, long caption.") env.clock.next();
    };
    const wait = env.clock.wait;
    env.clock.wait = (ms) => (env.log.push(`wait ${ms}`), wait(ms));
    await runTour([{ caption: "Long, long, long caption.", hold: 10 }, { caption: "Next one", hold: 10, end: true }], env);
    expect(env.log).toEqual(["caption 1/2: Long, long, long caption.", "wait 10", "caption 2/2: Next one", "wait 10", `wait ${speakingTime("Next one")}`, "end"]);
  });
});

test("speakingTime: letters and pauses, a digit or sign as a word", () => {
  expect(speakingTime("Or just how many.")).toBeLessThan(2000);
  expect(speakingTime("Share (100%): each surname's part of its generation.")).toBeGreaterThan(4500);
  expect(speakingTime("A, b")).toBe(300 + 62 * 2 + 450);
});
