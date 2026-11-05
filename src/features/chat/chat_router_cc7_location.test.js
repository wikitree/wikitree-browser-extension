jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Maloney-2333", FullName: "Lawrence Maloney" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

// "his CC7 born in Ontario" went to the AI, which only wrote a search (the user, 2026-10-12). Genie loads the CC7
// and filters it; whose CC7 it is comes from the words (resolveCc7SubjectRoot).
describe("CC7 by place", () => {
  test.each([
    ["his CC7 born in Ontario", "list", "Ontario", "BirthLocation", 7],
    ["her cc7 who died in Ontario", "list", "Ontario", "DeathLocation", 7],
    ["their CC3 in County Cork, Ireland.", "list", "County Cork, Ireland", "AnyLocation", 3],
    ["CC7 born in Ontario", "list", "Ontario", "BirthLocation", 7],
    ["my CC7 born in Ontario?", "list", "Ontario", "BirthLocation", 7],
    ["CC7 profiles born in Ontario", "list", "Ontario", "BirthLocation", 7],
    ["Lawrence Maloney's CC7 born in Ontario", "list", "Ontario", "BirthLocation", 7],
    ["Maloney-2333’s cc7 died in Quebec", "list", "Quebec", "DeathLocation", 7],
    ["show me his cc7 in Ontario", "list", "Ontario", "AnyLocation", 7],
    ["which of his CC7 were born in Ontario?", "list", "Ontario", "BirthLocation", 7],
    ["which of my cc7 died in Kent", "list", "Kent", "DeathLocation", 7],
    ["how many of her CC7 were born in Ontario", "count", "Ontario", "BirthLocation", 7],
    ["how many of Lawrence's cc5 lived in Ontario", "count", "Ontario", "AnyLocation", 5],
    // (relatives, family: the CC7; imagined AE4, 2026-10-18)
    ["my relatives born in Wales", "list", "Wales", "BirthLocation", 7],
    ["relatives of mine born in Wales", "list", "Wales", "BirthLocation", 7],
    ["who in my family was born in Ireland", "list", "Ireland", "BirthLocation", 7],
    ["anyone in my family born in Scotland", "list", "Scotland", "BirthLocation", 7],
    ["which of my relatives were born in Wales", "list", "Wales", "BirthLocation", 7],
    ["how many of her relatives died in Kent", "count", "Kent", "DeathLocation", 7],
    ["Maloney-2333's family born in Ontario", "list", "Ontario", "BirthLocation", 7],
    ["my Scottish relatives", "list", "Scotland", "BirthLocation", 7],
  ])("%s", (prompt, mode, location, field, nuclear) => {
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.CC7_LOCATION_FILTER, params: { mode, location, field, nuclear } });
  });

  test.each(["notables in Cook-8721's CC7 in Kent", "show my cc7", "Lawrence's CC7", "my cousins born in Wales", "notables in my family"])("not %s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).not.toBe(ChatIntent.CC7_LOCATION_FILTER);
  });
});
