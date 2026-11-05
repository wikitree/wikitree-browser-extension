import { profileLinkHtml } from "./chat_profile_link";

describe("profileLinkHtml", () => {
  test("links a WikiTree ID to its profile, escaping the label", () => {
    expect(profileLinkHtml("Susanna <Dicken>", "Dicken-253")).toBe(
      '<a href="/wiki/Dicken-253" target="_blank" rel="noopener">Susanna &lt;Dicken&gt;</a>'
    );
  });

  test("numeric Ids and blanks stay plain text", () => {
    expect(profileLinkHtml("Murray", "25090970")).toBe("Murray");
    expect(profileLinkHtml("Someone", "")).toBe("Someone");
  });
});
