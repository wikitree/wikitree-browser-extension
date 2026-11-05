jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { familySurnames, findNameInProfiles, hasFamilySurname, preferBracketedIds } from "./chat_family_circle_lookup";
import { embeddedWikiTreeId, normalizeConnectionTargetForSearch, routeChatPrompt, tidyKinFollowUp } from "./chat_router";

describe("preferBracketedIds", () => {
  test.each([
    ["show John Theodore Weatherall's (Weatherall-113) bio", "show Weatherall-113's bio"],
    ["Show John Weatherall (Weatherall-113)'s sources", "Show Weatherall-113's sources"],
    ["my connection to Annie (Nan) Weatherall (Weatherall-5)", "my connection to Weatherall-5"],
    ["how is Jan van der Berg (Berg-12) related to me", "how is Berg-12 related to me"],
    ["Tell me about Mary O'Neil (O'Neil-4)", "Tell me about O'Neil-4"],
    ["show Weatherall-113's bio", "show Weatherall-113's bio"],
  ])("%s", (input, expected) => expect(preferBracketedIds(input)).toBe(expected));
});

describe("bio targets", () => {
  test("a command word before an ID still finds the ID", () => {
    expect(embeddedWikiTreeId("show Weatherall-113")).toBe("Weatherall-113");
    expect(embeddedWikiTreeId("John Weatherall (Weatherall-113)")).toBe("Weatherall-113");
    expect(embeddedWikiTreeId("show John Weatherall")).toBe("");
  });
  test("command words are not part of a name", () => {
    expect(normalizeConnectionTargetForSearch("show John Theodore Weatherall")).toBe("John Theodore Weatherall");
    expect(normalizeConnectionTargetForSearch("please show me the John Weatherall")).toBe("John Weatherall");
  });
});

describe("kin follow-ups", () => {
  test.each([
    ["How about his agrandparents?", "his grandparents?"],
    ["what about her parents", "her parents"],
    ["and his siblings?", "his siblings?"],
    ["How about his grandparnets?", "his grandparents?"],
    ["what about his life?", "what about his life?"],
    ["his pieces", "his pieces"],
  ])("%s", (input, expected) => expect(tidyKinFollowUp(input)).toBe(expected));

  test("routes to the relatives list", () => {
    const routed = routeChatPrompt("How about his agrandparents?", {});
    expect(routed.intent).toBe("relationCount");
    expect(routed.params.relationRaw).toBe("grandparents");
  });
});

describe("family circle", () => {
  const surnames = familySurnames({ profileWtId: "Weatherall-111", profileLastName: "Weatherall", userWtId: "Beacall-6" });
  const cc7 = [
    { Name: "Weatherall-111", FirstName: "Cyrus", MiddleName: "Theodore", LastNameAtBirth: "Weatherall" },
    { Name: "Weatherall-113", FirstName: "John", MiddleName: "Theodore", LastNameAtBirth: "Weatherall" },
    { Name: "Weatherall-90", FirstName: "John", MiddleName: "Henry", LastNameAtBirth: "Weatherall" },
    { Name: "Thomason-7", FirstName: "Annie", MiddleName: "Caroline", LastNameAtBirth: "Thomason", LastNameCurrent: "Weatherall" },
  ];

  test("surnames come from the profile person and the user", () => {
    expect(hasFamilySurname("John Theodore Weatherall", surnames)).toBe(true);
    expect(hasFamilySurname("Mary Beacall", surnames)).toBe(true);
    expect(hasFamilySurname("John Smith", surnames)).toBe(false);
  });
  test("the middle name picks between namesakes", () => {
    expect(findNameInProfiles("John Theodore Weatherall", cc7)?.Name).toBe("Weatherall-113");
    expect(findNameInProfiles("John Henry Weatherall", cc7)?.Name).toBe("Weatherall-90");
  });
  test("two equal matches are no match", () => {
    expect(findNameInProfiles("John Weatherall", cc7)).toBeNull();
  });
  test("a married surname counts", () => {
    expect(findNameInProfiles("Annie Weatherall", cc7)?.Name).toBe("Thomason-7");
    expect(findNameInProfiles("Annie Thomason Weatherall", cc7)?.Name).toBe("Thomason-7");
  });
});

import { isPersonBioRequest } from "./chat_search_mode";
describe("bio requests skip the name search", () => {
  test.each([
    ["show John Theodore Weatherall's bio", true],
    ["Weatherall-113's biography?", true],
    ["bio of John Weatherall", true],
    ["John Weatherall", false],
    ["Weatherall born in Texas", false],
  ])("%s", (input, expected) => expect(isPersonBioRequest(input)).toBe(expected));
});
