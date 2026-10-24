jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import {
  aiTourSteps,
  pickerTourSteps,
  editTourSteps,
  explorerTourSteps,
  firstTourSteps,
  isTourPrompt,
  riverTourSteps,
  searchTourSteps,
  tourFor,
  TOURS,
  tourSubject,
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
