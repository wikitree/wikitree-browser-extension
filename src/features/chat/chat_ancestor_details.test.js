jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { routeChatPrompt } from "./chat_router";
import { parseTreeOverviewPrompt } from "./chat_tree_overview_data";
import { isTreeAppAction, buildTreeAppRecommendations } from "./chat_tree_apps";

// User, 2026-10-09: details of a person's ancestors go past 8 generations, so
// they belong in the 25-generation table, not an 8-generation chart.
describe("details of the ancestors", () => {
  test.each([
    "give me details of his ancestors",
    "details of his ancestors",
    "information about my ancestors",
    "what can you tell me about his ancestors?",
    "show me all the details of Weatherall-111's ancestors",
  ])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe("ancestorList");
    expect(routed.params).toMatchObject({ pick: "summary", generation: 25 });
  });

  test("the overview is explicit only when asked for by name", () => {
    expect(parseTreeOverviewPrompt("tell me about his ancestors").explicit).toBeUndefined();
    expect(parseTreeOverviewPrompt("his tree overview").explicit).toBe(true);
    expect(parseTreeOverviewPrompt("statistics for my tree").explicit).toBe(true);
  });
});

describe("Tree Apps told apart from Genie's charts", () => {
  test("Tree App links are recognised", () => {
    const apps = buildTreeAppRecommendations("ancestors", "Weatherall-111").map((app) => ({ ...app, actionType: "external-link" }));
    expect(apps.length).toBeGreaterThan(3);
    expect(apps.every(isTreeAppAction)).toBe(true);
  });
  test("other buttons are not", () => {
    expect(isTreeAppAction({ label: "Fan chart", onClick: () => {} })).toBe(false);
    expect(isTreeAppAction({ label: "How to get a key", actionType: "external-link", url: "https://example.com/help" })).toBe(false);
  });
});
