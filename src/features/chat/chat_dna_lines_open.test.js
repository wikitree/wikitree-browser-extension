jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("./chat_descendant_chart", () => ({ showDescendantChartPopup: jest.fn() }));
jest.mock("./chat_fan_chart", () => ({ showFanChartPopup: jest.fn() }));
jest.mock("./chat_tree_overview", () => ({ showTreeOverviewPopup: jest.fn() }));

import { createChatPeopleHandlers } from "./chat_people";
import { showDescendantChartPopup } from "./chat_descendant_chart";
import { showFanChartPopup } from "./chat_fan_chart";
import { showTreeOverviewPopup } from "./chat_tree_overview";

beforeEach(() => jest.clearAllMocks());

function handlers() {
  return createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Harris-46781", wtId: "Harris-46781", displayName: "William", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Harris-46781)",
    fetchPeoplePaged: async () => [null, null, { 1: { Id: 1, Name: "Harris-46781", RealName: "William", Gender: "Male", Father: 0, Mother: 0 } }],
  });
}

test("DNA lines shows carriers when no parents are attached, even for the root alone", async () => {
  const result = await handlers().tryHandleFanChartPrompt({ mode: "dnalines", generations: 7, ancestorPrompt: "this profile's ancestors" });
  expect(result.message).toContain("inheritance through children and descendants");
  expect(result.chartOpened).toBe(true);
  expect(showFanChartPopup).not.toHaveBeenCalled();
  expect(showDescendantChartPopup.mock.calls[0][1].mode).toBe("dnacarriers");
  result.actions.find((action) => action.label === "Open DNA carriers chart").onClick();
  expect(showDescendantChartPopup).toHaveBeenCalledTimes(2);
});

test("ordinary fan chart keeps its empty-ancestry behavior", async () => {
  const result = await handlers().tryHandleFanChartPrompt({ generations: 7, ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(false);
  expect(showFanChartPopup).not.toHaveBeenCalled();
});

test("X-DNA opens with inheritance gaps when no parents are recorded", async () => {
  const result = await handlers().tryHandleFanChartPrompt({ dna: true, mode: "xdna", generations: 7, ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(showFanChartPopup).toHaveBeenCalledTimes(1);
  expect(showFanChartPopup.mock.calls[0][1]).toMatchObject({ mode: "xdna" });
  expect(result.message).toContain("only X chromosome");
});

test("Overview opens its completeness dashboard with no recorded parents", async () => {
  const result = await handlers().tryHandleTreeOverviewPrompt({ ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(showTreeOverviewPopup).toHaveBeenCalledTimes(1);
  expect(showTreeOverviewPopup.mock.calls[0][0].stats.found).toBe(0);
  await result.actions.find((action) => action.label === "Open tree overview").onClick();
  expect(showTreeOverviewPopup).toHaveBeenCalledTimes(2);
});

test("DNA lines includes attached children in the carrier chart", async () => {
  const handler = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Root-1)",
    fetchPeoplePaged: async (app, key, fields, options) => [null, null, {
      1: { Id: 1, Name: "Root-1", FirstName: "William", Gender: "Male", Father: 0, Mother: 0 },
      ...(options.descendants ? {
        2: { Id: 2, Name: "Son-1", FirstName: "James", Gender: "Male", Father: 1 },
        3: { Id: 3, Name: "Daughter-1", FirstName: "Mary", Gender: "Female", Father: 1 },
      } : {}),
    }],
  });
  const result = await handler.tryHandleFanChartPrompt({ mode: "dnalines", generations: 7, ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(result).not.toHaveProperty("table");
  const tree = showDescendantChartPopup.mock.calls[0][0];
  expect(tree.children.map((child) => child.person.wtid).sort()).toEqual(["Daughter-1", "Son-1"]);
  expect(showDescendantChartPopup.mock.calls[0][1].mode).toBe("dnacarriers");
});
