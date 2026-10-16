jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import {
  aiTourSteps,
  pickerTourSteps,
  createTourClock,
  editTourSteps,
  explorerTourSteps,
  firstTourSteps,
  isTourPrompt,
  readingTime,
  riverTourSteps,
  runTour,
  searchTourSteps,
  speakingTime,
  tourFor,
  TOURS,
  tourSubject,
  TourStopped,
} from "./chat_tour";
import { allNoAiExamples } from "./chat_no_ai_examples";
import { isMissingCheckPrompt, parseEditCommand } from "./chat_edit_page";
import { parseNameCloudPrompt } from "./chat_name_cloud_data";
import { routeChatPrompt } from "./chat_router";
import { parseSearchSpecPrompt } from "./chat_spec_parser";
import { CHART_SHORTCUTS } from "./chat_chart_shortcuts";

describe("isTourPrompt", () => {
  test.each(["Show me around", "show me around.", "Please show me around", "give me a tour", "take the tour", "Take me on a tour!", "tour", "demo", "show me a demo"])("%s", (prompt) => {
    expect(isTourPrompt(prompt)).toBe(true);
  });
  test.each(["show me around Kent", "a tour of my tree", "Smith tour guide", "demolition workers in Leeds", ""])("%s is not", (prompt) => {
    expect(isTourPrompt(prompt)).toBe(false);
  });
});

describe("tourFor", () => {
  test.each([
    ["Show me around", "first"],
    ["take the tour", "first"],
    ["Show me around the Surname River", "river"],
    ["give me a tour of the surname river", "river"],
    ["Surname River tour", "river"],
    ["show me around the Family Explorer.", "explorer"],
    ["tour of the family explorer", "explorer"],
    ["Family Explorer demo", "explorer"],
    ["show me around searching", "search"],
    ["search tour", "search"],
    ["give me a tour of no-AI searches", "search"],
    ["Show me around the edit page", "edit"],
    ["edit page tour", "edit"],
    ["Show me around with AI", "ai"],
    ["AI tour", "ai"],
    ["give me a tour of the AI", "ai"],
    ["Show me around the picker", "picker"],
    ["show me around choosing people", "picker"],
    ["About menu tour", "picker"],
  ])("%s: %s", (prompt, name) => {
    expect(tourFor(prompt)).toBe(name);
  });
  test.each(["Show me the Surname River", "surname river", "Smith search", "show me around Kent", "Family Explorer", "edit page", "AI", "show me around AIX"])("%s is not a tour", (prompt) => {
    expect(tourFor(prompt)).toBeNull();
  });
});

describe("the short tours", () => {
  const profile = tourSubject({ wtId: "Benadie-76", name: "Johannes Benadie" }, { onPageProfile: true });
  test("every tour has its steps and ends with an end step; the person tours need a person", () => {
    Object.entries(TOURS).forEach(([name, tour]) => {
      const steps = tour.steps(profile);
      expect(steps.length).toBeGreaterThan(2);
      expect(steps.at(-1).end).toBe(true);
      expect(steps.slice(0, -1).some((step) => step.end)).toBe(false);
      expect(Boolean(tour.person)).toBe(["first", "river", "explorer", "ai", "picker"].includes(name));
      expect(Boolean(tour.ai)).toBe(name === "ai");
    });
    expect(TOURS.edit.editPage).toBe(true);
  });
  test("the Surname River tour asks for the river; its later steps need the river", () => {
    const [river, ...rest] = riverTourSteps(profile);
    expect(parseNameCloudPrompt(river.prompt)).toMatchObject({ owner: "", river: true });
    rest.slice(0, -1).forEach((step) => expect(step.needs).toMatch(/^#wbe-surname-river-popup /));
    // (whose: "my family's" for you)
    expect(riverTourSteps(tourSubject({ wtId: "Beacall-6", isMe: true }))[0].prompt).toBe("How did my family's surnames change over the generations?");
  });
  test("the Family Explorer tour opens it for the page's profile; its later views need it", () => {
    const [open, ...rest] = explorerTourSteps(profile);
    expect(routeChatPrompt(open.prompt)).toMatchObject({ intent: "familyWorld", params: { owner: "" } });
    rest.slice(0, -1).forEach((step) => expect(step.needs).toBe(open.waitFor));
    expect(routeChatPrompt(explorerTourSteps(tourSubject({ wtId: "Smit-641", name: "Pieter Smit" }))[0].prompt)).toMatchObject({ params: { owner: "Smit-641" } });
  });
  test("the search tour's searches are among the checked no-AI examples, and it ends on What can I type?", () => {
    const steps = searchTourSteps();
    const examples = new Set(allNoAiExamples().map((item) => item.example));
    steps.filter((step) => step.prompt).forEach((step) => expect(examples.has(step.prompt)).toBe(true));
    expect(steps.at(-1)).toMatchObject({ welcome: true, actions: [{ text: "What can I type?" }] });
  });
  test("the AI tour: a life-and-times question, a follow-up to it, a famous person, a long search, then the AI switch", () => {
    const steps = aiTourSteps(profile);
    expect(steps.map((step) => step.prompt)).toEqual([
      "What was daily life like where Johannes lived?",
      "What big events would the family have lived through?",
      "How is Johannes related to Charles Darwin?",
      "Anyone named Pretorius who was born at the Cape before 1800",
      undefined,
    ]);
    expect(steps.map((step) => Boolean(step.followUp))).toEqual([false, true, false, false, false]);
    expect(steps.at(-1)).toMatchObject({ point: "#wbe-genie-ai-toggle", end: true });
    const mine = aiTourSteps(tourSubject({ wtId: "Beacall-6", isMe: true }));
    expect(mine[0].prompt).toBe("What was daily life like where my ancestors lived?");
    expect(mine[2].prompt).toBe("How am I related to Charles Darwin?");
    expect(aiTourSteps(tourSubject({ wtId: "Smit-641", name: "Pieter Smit" }))[2].prompt).toBe("How is Smit-641 related to Charles Darwin?");
  });
  test("the picker tour: people on the page, this profile again, then questions about you (never your fan chart or watchlist)", () => {
    const steps = pickerTourSteps(profile);
    expect(steps[0].caption).toContain("Johannes's father");
    expect(steps[0].actions.at(-1)).toMatchObject({ has: "· father" });
    expect(steps[2].caption).toContain("Johannes's mother");
    expect(steps[2].actions.at(-1)).toMatchObject({ has: "· mother" });
    expect(steps.filter((step) => step.prompt).map((step) => step.prompt)).toEqual(["Who were his parents?", "Where was she born?", "My connection to Tom Cruise", "My relationship to Beacall-123"]);
    expect(JSON.stringify(steps)).not.toMatch(/watchlist|"You"|Fan/);
    expect(steps[4].actions.at(-1)).toMatchObject({ has: "this profile" });
    expect(steps.at(-1).end).toBe(true);
    expect(pickerTourSteps(tourSubject({ wtId: "Beacall-6", isMe: true }))[0].caption).toContain("your father");
  });
  test("the edit page tour's questions are the edit page's own", () => {
    const [missing, birth, siblings, end] = editTourSteps();
    expect(isMissingCheckPrompt(missing.prompt, { onEditPage: true })).toBe(true);
    expect(parseEditCommand(birth.prompt, { onEditPage: true })).toMatchObject({ list: "birthAndParents" });
    expect(birth.needs).toContain('data-id="Birth and Parent Details"');
    expect(parseEditCommand(siblings.prompt, { onEditPage: true })).toMatchObject({ list: "siblingList" });
    expect(siblings.needs).toContain('data-id="Sibling List"');
    expect(end).toMatchObject({ welcome: true, pointText: "Change explanation", end: true });
  });
});

describe("tourSubject and the first tour's questions", () => {
  test("the page's profile is asked about by first name; the river uses 'the surnames' (this profile)", () => {
    const subject = tourSubject({ wtId: "Benadie-76", name: "Johannes Benadie" }, { onPageProfile: true });
    expect(subject).toEqual({ kind: "profile", wtId: "Benadie-76", first: "Johannes" });
    const [question, explorer, river] = firstTourSteps(subject);
    expect(question.prompt).toBe("Who were Johannes's grandparents?");
    expect(explorer.prompt).toBe("Show the Family Explorer");
    expect(river.prompt).toBe("How did the surnames change over the generations?");
    expect(parseNameCloudPrompt(river.prompt)).toMatchObject({ owner: "", river: true });
  });
  test("someone picked in Genie is asked about by WikiTree ID", () => {
    const subject = tourSubject({ wtId: "Smit-641", name: "Pieter Smit" });
    const [question, explorer, river] = firstTourSteps(subject);
    expect(routeChatPrompt(explorer.prompt)).toMatchObject({ intent: "familyWorld", params: { owner: "Smit-641" } });
    expect(question.prompt).toBe("Who were Smit-641's grandparents?");
    expect(parseNameCloudPrompt(river.prompt)).toMatchObject({ owner: "Smit-641", river: true });
    expect(question.caption).toMatch(/Pieter's grandparents/);
  });
  test("you, off a profile", () => {
    const subject = tourSubject({ wtId: "Beacall-6", name: "You", isMe: true });
    const [question, explorer, river] = firstTourSteps(subject);
    expect(routeChatPrompt(explorer.prompt)).toMatchObject({ intent: "familyWorld", params: { owner: "my" } });
    expect(question.prompt).toBe("Who were my grandparents?");
    expect(parseNameCloudPrompt(river.prompt)).toMatchObject({ owner: "my", river: true });
    expect(question.caption).toMatch(/your grandparents/);
  });
  test("each question routes where the tour expects, without AI", () => {
    const steps = firstTourSteps(tourSubject({ wtId: "Benadie-76", name: "Johannes Benadie" }, { onPageProfile: true }));
    const [, explorer, river, menu, , search, end] = steps;
    expect(steps).toHaveLength(7);
    // (no owner: the page's profile)
    expect(routeChatPrompt(explorer.prompt)).toMatchObject({ intent: "familyWorld", params: { owner: "" } });
    expect(routeChatPrompt(river.prompt).params).toMatchObject({ river: true });
    expect(parseSearchSpecPrompt(search.prompt)?.spec).toMatchObject({ names: { anyLastName: "Smiths" }, places: [{ text: "Devon" }], dates: [{ from: 1850, to: 1859 }] });
    // (the Charts menu's item is the fan chart's label)
    expect(menu.actions.find((action) => action.text).text).toBe(CHART_SHORTCUTS.find((chart) => chart.key === "fan").label);
    expect(end).toMatchObject({ welcome: true, pointText: "What can I type?", end: true });
  });
  test("no person, no tour", () => {
    expect(tourSubject(null)).toBeNull();
  });
});

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
