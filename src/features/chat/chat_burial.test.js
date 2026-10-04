jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildBurialAnswer, findGraveLinks, parseBurialPrompt } from "./chat_burial";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseBurialPrompt", () => {
  test.each([
    ["where is she buried?", ""],
    ["Where was this person buried", ""],
    ["where is her grave?", ""],
    ["where was Cook-8721 buried?", "Cook-8721"],
    ["where is Ellen Cook's grave?", "Ellen Cook"],
    ["burial place of Cook-8721", "Cook-8721"],
    ["which cemetery is she buried in?", ""],
  ])("%s", (prompt, target) => {
    expect(parseBurialPrompt(prompt)).toEqual({ target });
  });

  test("a lowercase non-name is not a person", () => {
    expect(parseBurialPrompt("where was the treasure buried")).toBeNull();
    expect(parseBurialPrompt("Cheshire burials")).toBeNull();
  });

  test("routes to PERSON_BURIAL", () => {
    expect(routeChatPrompt("where is she buried?").intent).toBe(ChatIntent.PERSON_BURIAL);
  });
});

test("findGraveLinks reads templates and URLs once each", () => {
  const links = findGraveLinks(
    "{{FindAGrave|12345}} see https://www.findagrave.com/memorial/12345/x and {{BillionGraves|987}}"
  );
  expect(links).toEqual([
    "Find a Grave memorial 12345: https://www.findagrave.com/memorial/12345",
    "BillionGraves record 987: https://billiongraves.com/grave/987",
  ]);
});

describe("buildBurialAnswer", () => {
  const ellen = {
    Name: "Cook-8721",
    RealName: "Ellen",
    Gender: "Female",
    DeathDate: "1898-00-00",
    DeathLocation: "Motueka, Tasman, New Zealand",
    Categories: ["Lloyds,_sailed_11_September_1841", "Motueka_Cemetery,_Motueka,_Tasman"],
    // Live, the API returns the biography as lowercase "bio".
    bio: "[[Category: Motueka Cemetery, Motueka, Tasman]]\n{{FindAGrave|555}}",
  };

  test("names the cemetery category, grave link and death place", () => {
    const answer = buildBurialAnswer(ellen);
    expect(answer).toContain('"Motueka Cemetery, Motueka, Tasman"');
    expect(answer).not.toContain("Lloyds");
    expect(answer).toContain("she is buried");
    expect(answer).toContain("https://www.findagrave.com/memorial/555");
    expect(answer).toContain("She died in Motueka, Tasman, New Zealand (1898).");
  });

  test("says when nothing is recorded, with the death place as a clue", () => {
    const answer = buildBurialAnswer({ ...ellen, Categories: [], bio: "" });
    expect(answer).toContain("WikiTree doesn't record where Ellen (Cook-8721) is buried");
    expect(answer).toContain("That is the nearest clue.");
  });
});
