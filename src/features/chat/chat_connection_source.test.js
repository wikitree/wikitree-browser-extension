jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));

import { createConnectionSourceResolver } from "./chat_connection_source";
import { ChatIntent, routeChatPrompt } from "./chat_router";
import { getCurrentPageInfo } from "./chat_page_context";

const profile = { key: "Smith-1", wtId: "Smith-1", displayName: "William Smith", subjectType: "profile" };
const user = { key: "User-2", wtId: "User-2", displayName: "You", subjectType: "user" };

function makeResolver(location, overrides = {}) {
  const deps = {
    promptRefersToUser: (prompt) => /\b(?:my|me|mine)\b/i.test(prompt),
    getLoggedInRootPerson: jest.fn(async () => user),
    getProfileSubjectRoot: jest.fn(() => profile),
    isPersonPage: () => getCurrentPageInfo(document, location).isPersonProfile,
    resolveConnectionTargetPerson: jest.fn(async () => ({ Id: 3, Name: "Other-3", RealName: "Other Person" })),
    ...overrides,
  };
  return { resolve: createConnectionSourceResolver(deps), deps };
}

test.each([
  { pathname: "/wiki/Smith-1", search: "" },
  { pathname: "/index.php", search: "?title=Smith-1&action=edit" },
])("relationship without an owner uses the profile on %j", async (location) => {
  const prompt = "Relationship to Bill Gates";
  const routed = routeChatPrompt(prompt);
  expect(routed).toEqual({ intent: ChatIntent.CONNECTION_LOOKUP, params: { source: "", target: "Bill Gates" } });
  const { resolve, deps } = makeResolver(location);
  expect(await resolve(prompt, "Gates-1183", routed.params.source)).toEqual(profile);
  expect(deps.getLoggedInRootPerson).not.toHaveBeenCalled();
});

test.each(["My relationship to Bill Gates", "My connection to Gates-1183", "Connection from me to Bill Gates"])(
  "explicit user wins: %s",
  async (prompt) => {
    const { resolve } = makeResolver({ pathname: "/wiki/Smith-1" });
    expect(await resolve(prompt, "Gates-1183")).toEqual(user);
  }
);

test.each(["/wiki/Space:Family", "/wiki/Help:Contents", "/wiki/Special:Home"])(
  "other page defaults to user: %s",
  async (pathname) => {
    const { resolve } = makeResolver({ pathname });
    expect(await resolve("Relationship to Bill Gates", "Gates-1183")).toEqual(user);
  }
);

test.each(["Other-3", "Other Person"])("explicit source wins over page: %s", async (source) => {
  const prompt = `Relationship between ${source} and Bill Gates`;
  const routed = routeChatPrompt(prompt);
  expect(routed.params).toEqual({ source, target: "Bill Gates" });
  const { resolve, deps } = makeResolver({ pathname: "/wiki/Smith-1" });
  expect(await resolve(prompt, "Gates-1183", routed.params.source)).toMatchObject({
    wtId: "Other-3",
    subjectType: "named",
  });
  expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith(source, prompt);
});

test("a missing profile identity does not silently switch to the user", async () => {
  const { resolve, deps } = makeResolver({ pathname: "/wiki/Smith-1" }, { getProfileSubjectRoot: () => null });
  expect(await resolve("Relationship to Bill Gates", "Gates-1183")).toBeNull();
  expect(deps.getLoggedInRootPerson).not.toHaveBeenCalled();
});
