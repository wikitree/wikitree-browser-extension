jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("chat_router cousin prompts", () => {
  test("routes bare my-third-cousins prompt to relation count intent", () => {
    expect(routeChatPrompt("my third cousins born in England")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "user",
        cousinDegree: 3,
        location: "England",
        locationField: "BirthLocation",
      },
    });
  });

  test("routes bare numeric-ordinal cousin prompts", () => {
    expect(routeChatPrompt("my 3rd cousins")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "user",
        cousinDegree: 3,
        location: "",
        locationField: "",
      },
    });
  });

  test("routes plain my-cousins prompts to all-cousins relation handling", () => {
    expect(routeChatPrompt("my cousins born in England")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "user",
        allCousins: true,
        maxAncestorGeneration: 5,
        location: "England",
        locationField: "BirthLocation",
      },
    });
  });

  test("routes explicit upper-bound cousin prompts to all-cousins relation handling", () => {
    expect(routeChatPrompt("my cousins up to 6th cousins")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "user",
        allCousins: true,
        maxAncestorGeneration: 7,
        location: "",
        locationField: "",
      },
    });

    expect(routeChatPrompt("cousins through sixth cousins born in England")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "contextual",
        allCousins: true,
        maxAncestorGeneration: 7,
        location: "England",
        locationField: "BirthLocation",
      },
    });
  });

  test("routes bare possessive named cousin prompts", () => {
    expect(routeChatPrompt("Thomas's fifth cousins")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "5th cousins",
        subjectMode: "named",
        subjectName: "Thomas",
        cousinDegree: 5,
        location: "",
        locationField: "",
      },
    });
  });

  test("routes removed cousin prompts and shorthand", () => {
    expect(routeChatPrompt("Alex's first cousins three times removed")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "1st cousins 3 times removed",
        subjectMode: "named",
        subjectName: "Alex",
        cousinDegree: 1,
        removed: 3,
        location: "",
        locationField: "",
      },
    });

    expect(routeChatPrompt("1C 3R")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "1st cousins 3 times removed",
        subjectMode: "contextual",
        cousinDegree: 1,
        removed: 3,
        location: "",
        locationField: "",
      },
    });
  });

  test("routes bare cousin prompts to contextual profile-first relation handling", () => {
    expect(routeChatPrompt("third cousins")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "contextual",
        cousinDegree: 3,
        location: "",
        locationField: "",
      },
    });
  });

  test("routes bare generic relation prompts to contextual profile-first relation handling", () => {
    expect(routeChatPrompt("siblings")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "siblings",
        subjectMode: "contextual",
      },
    });
  });

  test("routes bare plain cousin prompts to contextual profile-first relation handling", () => {
    expect(routeChatPrompt("cousins born in England")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "contextual",
        allCousins: true,
        maxAncestorGeneration: 5,
        location: "England",
        locationField: "BirthLocation",
      },
    });
  });

  test("routes counted cousin prompts with cousin metadata", () => {
    expect(routeChatPrompt("how many 2nd cousins do I have?")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "count",
        relationRaw: "2nd cousins",
        subjectMode: "user",
        cousinDegree: 2,
        location: "",
        locationField: "",
      },
    });
  });
});
