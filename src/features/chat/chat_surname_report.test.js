jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(), getUserWtId: jest.fn(() => "") }));
import { parseSurnameReportPrompt, surnameReportAnswer, surnameReportUrl } from "./chat_surname_report";
import { routeChatPrompt, ChatIntent } from "./chat_router";

describe("WT+ surname improvements report", () => {
  test("reads the ways of asking", () => {
    expect(parseSurnameReportPrompt("surname improvements for Whitten")).toEqual({ surname: "Whitten" });
    expect(parseSurnameReportPrompt("Show me the surname report for the Whitten surname")).toEqual({ surname: "Whitten" });
    expect(parseSurnameReportPrompt("Whitten surname report")).toEqual({ surname: "Whitten" });
    expect(parseSurnameReportPrompt("How can I improve the van der Heyden surname?")).toEqual({ surname: "van der Heyden" });
    expect(parseSurnameReportPrompt("Whitten births in Kent")).toBeNull();
    expect(parseSurnameReportPrompt("most common surnames in Kent")).toBeNull();
  });
  test("links to the report", () => {
    expect(surnameReportUrl("van der Heyden")).toBe("https://plus.wikitree.com/function/wtSurname/Surname.htm?query=van%20der%20Heyden");
    expect(surnameReportAnswer("Whitten").actions[0]).toMatchObject({ actionType: "external-link", label: "Whitten surname report" });
  });
  test("is routed", () => {
    expect(routeChatPrompt("surname improvements for Whitten")).toMatchObject({ intent: ChatIntent.SURNAME_REPORT, params: { surname: "Whitten" } });
    expect(routeChatPrompt("surname improvements for Müller")?.params?.surname).toBe("Müller");
  });
});
