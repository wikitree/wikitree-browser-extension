jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getRelatives: jest.fn() } }));

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { ancestorsWithTwins, parseAncestorCheckPrompt, relativesById, remarriedAncestors } from "./chat_ancestor_family_checks";
import { createChatPeopleHandlers } from "./chat_people";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// (imagined Z1/Z2, 2026-10-18)
describe("remarried and twins among ancestors", () => {
  test.each([
    ["which of my ancestors remarried", "my", "remarried"],
    ["who married twice among my ancestors", "my", "remarried"],
    ["did any of her ancestors remarry?", "her", "remarried"],
    ["Cook-8721's ancestors who married more than once", "Cook-8721's", "remarried"],
    ["are there any twins in my ancestors", "my", "twins"],
    ["twins in my family", "my", "twins"],
    ["which of my ancestors had a twin", "my", "twins"],
  ])("%s", (prompt, owner, check) => {
    expect(parseAncestorCheckPrompt(prompt)).toEqual({ owner, check });
    expect(routeChatPrompt(prompt)).toMatchObject({ intent: ChatIntent.ANCESTOR_LIST, params: { pick: check, relationshipLabel: "ancestors" } });
  });
  test.each(["which of my ancestors married", "twins", "my twins"])("leaves %s alone", (prompt) => {
    expect(parseAncestorCheckPrompt(prompt)).toBeNull();
  });

  const rows = [
    { profileId: "2", wtid: "Dad-1", displayName: "Dad", degrees: 1, birth: "1850-03-04", fatherId: "4", motherId: "5" },
    { profileId: "3", wtid: "Mum-1", displayName: "Mum", degrees: 1, birth: "1852-00-00", fatherId: "6", motherId: "7" },
  ];
  const people = relativesById([
    {
      person: {
        Id: 2,
        Name: "Dad-1",
        Father: 4,
        Mother: 5,
        BirthDate: "1850-03-04",
        Spouses: { 3: { Id: 3 }, 9: { Id: 9 } },
        Siblings: { 8: { Id: 8, Name: "Twin-1", FirstName: "Tom", LastNameAtBirth: "Dad", Father: 4, Mother: 5, BirthDate: "1850-03-04" }, 10: { Id: 10, Name: "Sis-1", Father: 4, Mother: 5, BirthDate: "1853-01-01" } },
      },
    },
    { person: { Id: 3, Name: "Mum-1", Father: 6, Mother: 7, BirthDate: "1852-00-00", Spouses: { 2: { Id: 2 } }, Siblings: { 11: { Id: 11, Father: 6, Mother: 7, BirthDate: "1852-00-00" } } } },
  ]);
  test("more than one marriage", () => {
    expect(remarriedAncestors(rows, people).map((entry) => [entry.row.wtid, entry.spouses])).toEqual([["Dad-1", 2]]);
  });
  test("a twin: same parents and the same full birth date (a year alone isn't enough)", () => {
    expect(ancestorsWithTwins(rows, people).map((entry) => [entry.row.wtid, entry.twins.map((twin) => twin.Name)])).toEqual([["Dad-1", ["Twin-1"]]]);
  });

  const handler = () =>
    createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async () => [
        null,
        null,
        {
          1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3, Meta: { Degrees: 0 } },
          2: { Id: 2, Name: "Dad-1", Father: 0, Mother: 0, BirthDate: "1850-03-04" },
          3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0, BirthDate: "1852-00-00" },
        },
      ],
      mapApiPersonToStandardRow: (profile, extra) => ({ wtid: profile.Name, displayName: profile.Name, birth: profile.BirthDate || "", birthLocation: "", deathLocation: "", ...extra }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: () => null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
  test("the handler fetches spouses and lists those married more than once", async () => {
    WikiTreeAPI.getRelatives.mockResolvedValue([{ person: { Id: 2, Spouses: { 3: { Id: 3 }, 9: { Id: 9 } } } }, { person: { Id: 3, Spouses: { 2: { Id: 2 } } } }]);
    const prompt = "which of my ancestors remarried";
    const result = await handler().tryHandleAncestorListPrompt(routeChatPrompt(prompt).params, prompt);
    expect(WikiTreeAPI.getRelatives).toHaveBeenCalledWith("test", ["2", "3"], "Id,Name", { getSpouses: 1 });
    expect(result.message).toBe("1 of your 2 ancestors within 10 generations married more than once:\n- Dad-1 (Dad-1): 2 marriages");
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Dad-1"]);
  });
  test("no twins says so", async () => {
    WikiTreeAPI.getRelatives.mockResolvedValue([]);
    const prompt = "are there any twins in my ancestors";
    const result = await handler().tryHandleAncestorListPrompt(routeChatPrompt(prompt).params, prompt);
    expect(result).toMatch(/^None of your 2 ancestors within 10 generations has a twin on WikiTree/);
  });
});
