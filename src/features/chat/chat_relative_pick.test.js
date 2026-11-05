jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildRelativePickAnswer, parseRelativePickPrompt } from "./chat_relative_pick";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseRelativePickPrompt", () => {
  test.each([
    ["which of her siblings died first?", { owner: "", relationRaw: "siblings", pick: "diedFirst" }],
    ["who of Cook-8721's children lived longest", { owner: "Cook-8721", relationRaw: "children", pick: "longest" }],
    ["which of my brothers was the oldest", { owner: "me", relationRaw: "brothers", pick: "bornFirst" }],
    ["which of her husbands died last", { owner: "", relationRaw: "husbands", pick: "diedLast" }],
    ["which of Ellen Cook's kids died youngest", { owner: "Ellen Cook", relationRaw: "children", pick: "shortest" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativePickPrompt(prompt)).toEqual(expected);
  });
  test.each(["which of her siblings moved to Kent", "which of the old man's sons died first"])("declines %s", (prompt) => {
    expect(parseRelativePickPrompt(prompt)).toBeNull();
  });
  test("routes", () => {
    const routed = routeChatPrompt("which of her siblings died first?");
    expect(routed.intent).toBe(ChatIntent.RELATIVE_FACT);
    expect(routed.params).toMatchObject({ owner: "", relationRaw: "siblings", pick: "diedFirst" });
  });
});

describe("buildRelativePickAnswer", () => {
  const labelOf = (person) => person.Name;
  const people = [
    { Name: "A-1", BirthDate: "1830-01-01", DeathDate: "1900-00-00" },
    { Name: "B-2", BirthDate: "1835-05-05", DeathDate: "1850-02-02" },
    { Name: "C-3", BirthDate: "1840-00-00", DeathDate: "0000-00-00" },
  ];
  test("died first", () => {
    expect(buildRelativePickAnswer({ ownerLabel: "Ellen", relationRaw: "siblings", people, pick: "diedFirst", labelOf })).toBe(
      "Of Ellen's siblings, B-2 died first (b. 1835-05-05, d. 1850-02-02). 1 of the 3 has no death date, so isn't counted."
    );
  });
  test("lived longest", () => {
    expect(buildRelativePickAnswer({ ownerLabel: "Ellen", relationRaw: "siblings", people, pick: "longest", labelOf })).toMatch(
      /^Of Ellen's siblings, A-1 lived longest \(.*aged about 70\)\./
    );
  });
  test("born last", () => {
    expect(buildRelativePickAnswer({ ownerLabel: "Ellen", relationRaw: "siblings", people, pick: "bornLast", labelOf })).toMatch(
      /^Of Ellen's siblings, C-3 was born last/
    );
  });
});

// I10 (live, 2026-10-03): "which of her grandchildren lived longest?" listed all 10.
describe("grandchild picks walk two steps", () => {
  test("routes", () => {
    expect(routeChatPrompt("which of her grandchildren lived longest?").params).toMatchObject({
      relationRaw: "grandchildren",
      pick: "longest",
    });
  });

  test("handler reads the children's children", async () => {
    jest.resetModules();
    jest.doMock("../../core/API/WikiTreeAPI", () => ({
      WikiTreeAPI: {
        getRelatives: jest.fn(async (_app, keys) =>
          Array.isArray(keys)
            ? [
                { person: { Id: 2, Children: { 4: { Id: 4, Name: "Long-4", BirthDate: "1870-01-01", DeathDate: "1960-01-01" } } } },
                { person: { Id: 3, Children: { 5: { Id: 5, Name: "Short-5", BirthDate: "1880-01-01", DeathDate: "1890-01-01" } } } },
              ]
            : [{ person: { Id: 1, Name: "Cook-8721", Children: { 2: { Id: 2 }, 3: { Id: 3 } } } }]
        ),
      },
    }));
    const { createChatPeopleHandlers } = require("./chat_people");
    const { ChatIntent: Intents } = require("./chat_router");
    const handlers = createChatPeopleHandlers({
      ChatIntent: Intents,
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => ({ key: "Cook-8721", wtId: "Cook-8721" }),
      getLoggedInRootPerson: async () => null,
    });
    const answer = await handlers.tryHandleRelativeFactPrompt(
      { owner: "", relationRaw: "grandchildren", pick: "longest", fact: "pick" },
      "which of her grandchildren lived longest?"
    );
    expect(answer).toMatch(/Long-4/);
    expect(answer).not.toMatch(/Short-5 lived/);
  });
});
