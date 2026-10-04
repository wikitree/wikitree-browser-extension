jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { buildProfileFactAnswer, parseProfileFactPrompt } from "./chat_profile_facts";

describe("profile facts (Q3, Q5, Q6)", () => {
  test.each([
    ["who manages this profile?", { owner: "", fact: "manager" }],
    ["who is the profile manager of Cook-8721?", { owner: "Cook-8721", fact: "manager" }],
    ["is this profile orphaned?", { owner: "", fact: "manager" }],
    ["does she have a photo?", { owner: "", fact: "photo" }],
    ["is there a picture of Burton-13215?", { owner: "Burton-13215", fact: "photo" }],
    ["what templates are on her profile?", { owner: "", fact: "templates" }],
    ["which templates does Cook-8721 use?", { owner: "Cook-8721", fact: "templates" }],
    ["when was this profile last edited?", { owner: "", fact: "touched" }],
    ["when was my profile last updated?", { owner: "me", fact: "touched" }],
    ["what is her privacy level?", { owner: "", fact: "privacy" }],
    ["is this profile public?", { owner: "", fact: "privacy" }],
    ["when was this profile created?", { owner: "", fact: "created" }],
    ["is this profile connected?", { owner: "", fact: "connected" }],
    ["is she connected to the global tree?", { owner: "", fact: "connected" }],
    ["is she marked no more children?", { owner: "", fact: "noChildren" }],
    ["how many contributions does Holyoake-66 have?", { owner: "Holyoake-66", fact: "contributions" }],
    ["who created Cook-8721's profile?", { owner: "Cook-8721", fact: "created" }],
  ])("%s", (prompt, params) => {
    expect(parseProfileFactPrompt(prompt)).toEqual(params);
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.PROFILE_FACT);
    expect(routed.params).toEqual(params);
  });

  test.each(["does she have any children?", "who manages the cemetery?", "what is a template?", "is she buried in Ohio?", "is she connected to me?", "is Ellen connected to Amy Alley?"])(
    "declines %s",
    (prompt) => expect(parseProfileFactPrompt(prompt)).toBeNull()
  );

  test("answers", () => {
    const label = "Ellen Cook (Cook-8721)";
    const profile = {
      Managers: [{ Id: 1, Name: "Beacall-6" }],
      Manager: 1,
      Photo: "Cook-8721.gif",
      Templates: [{ name: "FindAGrave", params: {} }, { name: "FindAGrave" }, { name: "Died Young" }],
      Touched: "20250103123456",
      Privacy: 60,
    };
    expect(buildProfileFactAnswer(profile, "manager", label)).toBe("Ellen Cook (Cook-8721) is managed by Beacall-6.");
    expect(buildProfileFactAnswer({ Manager: 0, Managers: [] }, "manager", label)).toMatch(/orphaned/);
    expect(buildProfileFactAnswer(profile, "photo", label)).toMatch(/^Yes, .*Cook-8721\.gif/);
    expect(buildProfileFactAnswer({}, "photo", label)).toMatch(/no primary photo/);
    expect(buildProfileFactAnswer(profile, "templates", label)).toBe("Ellen Cook (Cook-8721) uses 2 templates: {{FindAGrave}}, {{Died Young}}.");
    expect(buildProfileFactAnswer(profile, "touched", label)).toMatch(/^Ellen Cook \(Cook-8721\) was last changed on 2025-01-03\. That's usually an edit/);
    expect(buildProfileFactAnswer({ Created: "20140413231056", Creator: 6874743 }, "created", label, { creatorLabel: "Nola (Holyoake-66)" })).toBe(
      "Ellen Cook (Cook-8721) was created on 2014-04-13 by Nola (Holyoake-66)."
    );
    expect(buildProfileFactAnswer({ Connected: 1 }, "connected", label)).toMatch(/^Yes/);
    expect(buildProfileFactAnswer({ IsMember: 1, EditCount: 12345 }, "contributions", label)).toBe("Ellen Cook (Cook-8721) has made 12,345 contributions on WikiTree.");
    expect(buildProfileFactAnswer({ IsMember: 0 }, "contributions", label)).toMatch(/isn't a WikiTree member/);
    expect(buildProfileFactAnswer(profile, "privacy", label)).toBe("Ellen Cook (Cook-8721)'s privacy level is Open.");
  });
});
