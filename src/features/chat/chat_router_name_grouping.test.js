jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("routeChatPrompt: your own name groupings", () => {
  test("count Smith as Smit", () => {
    expect(routeChatPrompt("count Smith as Smit")).toEqual({ intent: ChatIntent.NAME_CLOUD, params: { grouping: { action: "merge", kind: "surname", names: ["Smith", "Smit"], main: "Smit" } } });
  });
  test("accented names come back with their accents", () => {
    expect(routeChatPrompt("treat Loúbser and Loubser as the same surname").params.grouping.names).toEqual(["Loúbser", "Loubser"]);
  });
  test("the name cloud and river still route as before", () => {
    expect(routeChatPrompt("surname river").params).toMatchObject({ river: true });
    expect(routeChatPrompt("group my ancestors by decade").params?.grouping).toBeUndefined();
  });
});
