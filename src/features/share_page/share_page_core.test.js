import {
  BRAND_HASHTAGS,
  buildText,
  emailSubject,
  mailtoUrl,
  webmailUrl,
  WEBMAIL,
  cleanHeading,
  cropRect,
  detectPageKind,
  getChannel,
  CROP_SHAPES,
  appNameFromSlug,
  appSummary,
  fileIdFor,
  intentUrl,
  isNameSafe,
  safeRelativeIds,
  isShareablePrivacy,
  leadSummary,
  lifeSummary,
  ordinal,
  pageSummary,
  parseGenealogyText,
  usefulSections,
  profileKeyFor,
  viewSlug,
  measure,
  photoLinks,
  shareUrlFor,
  shortPlace,
  swapTag,
} from "./share_page_core";

describe("detectPageKind", () => {
  test.each([
    ["/wiki/Robinson-27274", "profile"],
    ["/wiki/Space:Example_Page", "space"],
    ["/wiki/Space%3AExample_Page", "space"],
    ["/wiki/Project:Mayflower", "project"],
    ["/wiki/Category:Mayflower_Passengers", "category"],
    ["/wiki/Help:Sources", "help"],
    ["/photo/jpg/Robinson-27274", "imagePage"],
    ["/photo.php/4/49/Robinson-27274.jpg", "fullImage"],
    ["/treewidget/Robinson-27274/6", "treeWidget"],
    ["/apps/Robinson-27274", "treeApp"],
    ["/genealogy/PEASLEY", "genealogy"],
    ["/genealogy/Peasley", "genealogy"],
    ["/wiki/Template:Example", "other"],
    ["/g2g/", "other"],
  ])("%s is %s", (path, kind) => {
    expect(detectPageKind(path)).toBe(kind);
  });
});

describe("shareUrlFor", () => {
  test("profile keeps its address and drops any section hash", () => {
    expect(shareUrlFor("profile", "https://www.wikitree.com/wiki/Robinson-27274#Sources")).toBe(
      "https://www.wikitree.com/wiki/Robinson-27274"
    );
  });
  test("a staging address is shared as the main site", () => {
    expect(shareUrlFor("profile", "https://staging.wikitree.com/wiki/Robinson-27274")).toBe(
      "https://www.wikitree.com/wiki/Robinson-27274"
    );
  });
  test("tree app views keep the hash that holds the view", () => {
    const url = "https://www.wikitree.com/apps/Robinson-27274#name=Robinson-27274&view=printer-friendly";
    expect(shareUrlFor("treeApp", url)).toBe(url);
  });
  test("full-screen image links to its image page", () => {
    expect(shareUrlFor("fullImage", "https://www.wikitree.com/photo.php/4/49/Robinson-27274.jpg")).toBe(
      "https://www.wikitree.com/photo/jpg/Robinson-27274"
    );
  });
});

describe("photoLinks", () => {
  test("reads a thumbnail", () => {
    expect(
      photoLinks("https://www.wikitree.com/photo.php/thumb/d/d3/Robinson-27274-1.jpg/300px-Robinson-27274-1.jpg")
    ).toEqual({
      full: "https://www.wikitree.com/photo.php/d/d3/Robinson-27274-1.jpg",
      pageUrl: "https://www.wikitree.com/photo/jpg/Robinson-27274-1",
      fileName: "Robinson-27274-1.jpg",
      thumbWidth: 300,
    });
  });
  test("reads a full-size address", () => {
    const links = photoLinks("/photo.php/4/49/Robinson-27274.jpg");
    expect(links.full).toBe("https://www.wikitree.com/photo.php/4/49/Robinson-27274.jpg");
    expect(links.pageUrl).toBe("https://www.wikitree.com/photo/jpg/Robinson-27274");
    expect(links.thumbWidth).toBeNull();
  });
  test("ignores other images", () => {
    expect(photoLinks("https://www.wikitree.com/images/og-image.png")).toBeNull();
  });
});

describe("buildText", () => {
  const url = "https://www.wikitree.com/wiki/Robinson-27274";
  test("includes the link, the channel's tag and both brand hashtags", () => {
    const text = buildText("profile", "Firman Joseph Robinson (1901-1991)", url, getChannel("x"));
    expect(text).toContain(url);
    expect(text).toContain("@WikiTreers");
    expect(text).toContain(BRAND_HASHTAGS);
  });
  test("hashtags can be switched off", () => {
    const text = buildText("profile", "Name", url, getChannel("x"), { hashtags: false });
    expect(text).not.toContain("#WhereGenealogistsCollaborate");
    expect(text).toContain("@WikiTreers");
  });
  test("Reddit gets a title with no tag, link or hashtags", () => {
    const text = buildText("profile", "Name", url, getChannel("reddit"));
    expect(text).not.toContain("@");
    expect(text).not.toContain("#");
    expect(text).not.toContain("http");
  });
});

describe("email", () => {
  const url = "https://www.wikitree.com/wiki/Robinson-27274";
  test("the message has the link and no account tag or hashtags", () => {
    const text = buildText("profile", "Name", url, getChannel("email"));
    expect(text).toContain(url);
    expect(text).not.toContain("@");
    expect(text).not.toContain("#");
  });
  test("the suggested subject names the page", () => {
    expect(emailSubject("Robinson-27274")).toBe("Robinson-27274 on WikiTree");
  });
  test("a mailto link has no address and encodes the subject and body, with CRLF line breaks", () => {
    expect(mailtoUrl("Hi & bye", "one\ntwo")).toBe("mailto:?subject=Hi%20%26%20bye&body=one%0D%0Atwo");
    expect(intentUrl(getChannel("email"), "a b", url, "", "S")).toBe("mailto:?subject=S&body=a%20b");
  });
  test("the address in the text survives encoding", () => {
    const link = mailtoUrl("s", `see ${url}?a=1&b=2`);
    expect(decodeURIComponent(link.split("body=")[1])).toBe(`see ${url}?a=1&b=2`);
  });
  test("webmail links are https, carry the subject and body, and reject unknown providers", () => {
    WEBMAIL.forEach((w) => {
      const link = webmailUrl(w.id, "A & B", "line one\nline two");
      expect(link.startsWith("https://")).toBe(true);
      expect(link).toContain("A%20%26%20B");
      expect(link).toContain("line%20one%0Aline%20two");
      expect(link).not.toContain("{");
    });
    expect(webmailUrl("nope", "s", "b")).toBe("");
  });
});

describe("swapTag", () => {
  test("replaces whichever WikiTree tag is in the text", () => {
    expect(swapTag("Hello @WikiTreers #x", getChannel("mastodon"))).toBe("Hello @wikitree@genealysis.social #x");
    expect(swapTag("Hello @wikitree@genealysis.social #x", getChannel("x"))).toBe("Hello @WikiTreers #x");
    expect(swapTag("Hello @wikitree.bsky.social", getChannel("facebook"))).toBe("Hello @WikiTree");
  });
});

describe("measure", () => {
  test("links count as 23 on X and Mastodon only", () => {
    const text = "hi https://www.wikitree.com/wiki/Robinson-27274";
    expect(measure(text, getChannel("x"))).toBe(3 + 23);
    expect(measure(text, getChannel("bluesky"))).toBe(text.length);
  });
});

describe("intentUrl", () => {
  const url = "https://www.wikitree.com/wiki/Robinson-27274";
  test("X and Bluesky carry the whole post", () => {
    expect(intentUrl(getChannel("x"), "a b", url)).toBe("https://x.com/intent/post?text=a%20b");
    expect(intentUrl(getChannel("bluesky"), "a b", url)).toBe("https://bsky.app/intent/compose?text=a%20b");
  });
  test("Facebook only carries the link", () => {
    expect(intentUrl(getChannel("facebook"), "text", url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)
    );
  });
  test("Mastodon opens the member's own server, and falls back when the server name is invalid", () => {
    expect(intentUrl(getChannel("mastodon"), "t", url, "https://example.social/")).toBe(
      "https://example.social/share?text=t"
    );
    expect(intentUrl(getChannel("mastodon"), "t", url, "bad host<script>")).toBe(
      "https://mastodon.social/share?text=t"
    );
  });
  test("Reddit sends a title and a link to r/wikitree", () => {
    expect(intentUrl(getChannel("reddit"), "A  title", url)).toContain(
      "/r/wikitree/submit?type=LINK&title=A%20title&url="
    );
  });
  test("networks without a composer return nothing", () => {
    expect(intentUrl(getChannel("instagram"), "t", url)).toBe("");
  });
});

describe("lifeSummary", () => {
  const firman = {
    firstName: "Firman Joseph",
    gender: "male",
    birth: { date: "2 Aug 1901", place: "Caledonia, Washington, Missouri, United States" },
    death: { date: "1 Oct 1991", place: "Seattle, King, Washington, United States", age: "90" },
    parents: ["William Thomas Robinson", "Lucy Jane (Boushon) Gant"],
    spouses: [
      { name: "Leona Catherine (Budd) Robinson", date: "7 Apr 1928", place: "Oskaloosa, Mahaska, Iowa, United States" },
      { name: "Erma Faye (Showalter) Robinson", date: "5 Oct 1968", place: "" },
    ],
    children: ["Naomi Lucy (Robinson) Anderson", "Carl William Robinson Sr"],
  };

  test("summarises the data fields and writes a short biography", () => {
    const summary = lifeSummary(firman, 2026);
    expect(summary.fields.map((f) => f.label)).toEqual(["Born", "Died", "Parents", "Spouse"]);
    expect(summary.fields.map((f) => f.names)).toEqual([false, false, true, true]); // names are all shown bold
    expect(summary.fields[0].lines).toEqual(["2 Aug 1901", "Caledonia, Washington, Missouri, United States"]);
    expect(summary.bio).toBe(
      "Firman was born in Caledonia, Missouri in 1901, the son of William Thomas Robinson and Lucy Jane (Boushon) Gant. " +
        "He married Leona Catherine (Budd) Robinson in 1928, and later Erma Faye (Showalter) Robinson in 1968. " +
        "He was the father of Naomi Lucy (Robinson) Anderson and Carl William Robinson Sr. " +
        "He died in Seattle, Washington in 1991, aged 90."
    );
  });

  test("uses the person's first name instead of a pronoun when gender is not recorded", () => {
    const summary = lifeSummary({ ...firman, gender: "" }, 2026);
    expect(summary.bio).toContain("the child of");
    expect(summary.bio).toContain("Firman married");
    expect(summary.bio).toContain("Firman was the parent of");
    expect(summary.bio).not.toMatch(/\b(He|She)\b/);
  });

  test("says nothing about someone who could still be living", () => {
    const living = { firstName: "Alex", birth: { date: "12 May 1960", place: "Leeds, England" } };
    expect(lifeSummary(living, 2026)).toBeNull();
  });

  test("allows a birth with no death when the person would be over 110", () => {
    const old = { firstName: "Ada", gender: "female", birth: { date: "about 1850", place: "" } };
    expect(lifeSummary(old, 2026).bio).toBe("Ada was born about 1850.");
  });

  test("returns nothing when there are no dates at all", () => {
    expect(lifeSummary({ firstName: "Sam", parents: ["A B"] }, 2026)).toBeNull();
  });

  test("shortens places to the town and the state or region", () => {
    expect(shortPlace("Seattle, King, Washington, United States")).toBe("Seattle, Washington");
    expect(shortPlace("Paris, France")).toBe("Paris, France");
    expect(shortPlace("")).toBe("");
  });
});

describe("profileKeyFor", () => {
  test.each([
    ["profile", "/wiki/Robinson-27274", "", "Robinson-27274"],
    ["space", "/wiki/Space:Andersonia,_California_One_Place_Study", "", "Space:Andersonia,_California_One_Place_Study"],
    ["treeWidget", "/treewidget/Robinson-27274/6", "", "Robinson-27274"],
    ["treeApp", "/apps/Robinson-27274", "", "Robinson-27274"],
    ["treeApp", "/apps/Robinson-27274", "#name=Smith-1&view=fanchart", "Smith-1"],
    ["imagePage", "/photo/jpg/Robinson-27274", "", "Robinson-27274"],
    ["imagePage", "/photo/jpg/Robinson-27274-1", "", "Robinson-27274"],
    ["fullImage", "/photo.php/d/d3/Robinson-27274-1.jpg", "", "Robinson-27274"],
    ["imagePage", "/photo/png/Not_A_Person", "", ""], // no number, so it cannot be a profile
    ["category", "/wiki/Category:Andersonia,_California", "", ""],
    ["genealogy", "/genealogy/PEASLEY", "", ""],
    ["help", "/wiki/Help:Projects", "", ""],
  ])("%s %s %s gives %j", (kind, path, hash, key) => {
    expect(profileKeyFor(kind, path, hash)).toBe(key);
  });
});

describe("isShareablePrivacy", () => {
  test("Public (50) and Open (60) can be shared", () => {
    expect(isShareablePrivacy({ Privacy: 50, IsLiving: 0 })).toBe(true);
    expect(isShareablePrivacy({ Privacy: 60, IsLiving: 0 })).toBe(true);
  });
  test("anything below Public cannot", () => {
    [10, 20, 30, 40].forEach((level) => expect(isShareablePrivacy({ Privacy: level, IsLiving: 0 })).toBe(false));
  });
  test("a living person cannot, whatever the level", () => {
    expect(isShareablePrivacy({ Privacy: 60, IsLiving: 1 })).toBe(false);
  });
  test("a missing profile cannot", () => {
    expect(isShareablePrivacy(undefined)).toBe(false);
  });
});

describe("Tree Apps names", () => {
  test("reads the view from the hash", () => {
    expect(viewSlug("#name=Robinson-27274&view=fanchart")).toBe("fanchart");
    expect(viewSlug("")).toBe("");
  });
  test("makes a readable name from a view id", () => {
    expect(appNameFromSlug("fanchart")).toBe("Fan Chart");
    expect(appNameFromSlug("printer-friendly")).toBe("Printer Friendly");
    expect(appNameFromSlug("slippyTree")).toBe("Slippy Tree");
    expect(appNameFromSlug("")).toBe("");
  });
  test("the post names the app and the person, and reads differently when it links to the profile", () => {
    const context = { appName: "Fan Chart", person: "Firman Joseph Robinson", profileLink: true };
    const text = buildText("treeApp", "Fan Chart", "https://www.wikitree.com/wiki/Robinson-27274", getChannel("x"), {
      context,
    });
    expect(text).toContain(
      "Fan Chart for Firman Joseph Robinson on WikiTree. Explore their profile and family connections."
    );
    expect(text).not.toContain("Tree Apps");
  });
  test("the post names the app and the person", () => {
    const text = buildText("treeApp", "Fan Chart", "https://www.wikitree.com/apps/Robinson-27274", getChannel("x"), {
      context: { appName: "Fan Chart", person: "Firman Joseph Robinson" },
    });
    expect(text).toContain("Explore Fan Chart in WikiTree’s Tree Apps for Firman Joseph Robinson.");
  });
});

describe("leadSummary", () => {
  test("keeps whole sentences within the budget and drops footnote markers", () => {
    const paragraphs = [
      "",
      "Short.",
      "Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson.[1]",
      "40 acres in all, 12 miles from the coast, 17 miles from Garberville.[3]",
      "After losing his wife in 1902, Henry Neff Anderson purchased 10,000 acres of redwood forest in northern California. He built not only a lumber mill but a small community to house the almost 200 employees he recruited from Grays Harbor County in Washington State.[3][4]",
    ];
    expect(leadSummary(paragraphs, 330)).toBe(
      "Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson. " +
        "40 acres in all, 12 miles from the coast, 17 miles from Garberville. " +
        "After losing his wife in 1902, Henry Neff Anderson purchased 10,000 acres of redwood forest in northern California."
    );
  });
  test("cuts a single very long sentence at a word", () => {
    const long = "word ".repeat(100).trim() + ".";
    const out = leadSummary([long], 60);
    expect(out.length).toBeLessThanOrEqual(61);
    expect(out.endsWith("…")).toBe(true);
  });
  test("returns nothing when there is no real text", () => {
    expect(leadSummary(["", "Hi"])).toBe("");
  });
});

describe("pageSummary", () => {
  test("a category shows its counts and an invitation to explore", () => {
    const summary = pageSummary("category", { counts: { subcategories: 1, pages: 2, profiles: 140 } });
    expect(summary.fields.map((f) => [f.label, f.lines[0]])).toEqual([
      ["Subcategories", "1"],
      ["Pages", "2"],
      ["Person profiles", "140"],
    ]);
    expect(summary.bio).toContain("Explore the subcategories, pages and profiles in this category.");
    expect(summary.bio).toContain("Check your connections to the ancestors listed here.");
  });
  test("a help, project or free-space page shows its opening text and sections", () => {
    const summary = pageSummary("project", {
      paragraphs: ["WikiTree Ambassadors are volunteers who have taken on the mission of spreading the WikiTree Love."],
      sections: ["Who are Ambassadors?", "Why does WikiTree need Ambassadors?", "How can I help?"],
    });
    expect(summary.bio).toContain("WikiTree Ambassadors are volunteers");
    expect(summary.fields[0].label).toBe("On this page");
    expect(summary.fields[0].lines).toEqual(["Who are Ambassadors?", "Why does WikiTree need Ambassadors? +1 more"]);
  });
  test("other kinds have no summary", () => {
    expect(pageSummary("treeApp", {})).toBeNull();
    expect(pageSummary("imagePage", {})).toBeNull();
  });
});

describe("appSummary", () => {
  test("a fan chart is described from what is on screen", () => {
    expect(
      appSummary({ slug: "fanchart", appName: "Fan Chart", person: "Firman Joseph Robinson", generations: "5" })
    ).toBe(
      "A fan chart of Firman Joseph Robinson's ancestors over 5 generations. Each ring is one generation further back."
    );
  });
  test("the number of generations follows the member's setting", () => {
    expect(appSummary({ slug: "fanchart", person: "A B", generations: "8" })).toContain("over 8 generations");
    expect(appSummary({ slug: "fanchart", person: "A B" })).not.toContain("over");
  });
  test("other views use their description and drop the instructions", () => {
    expect(
      appSummary({
        appName: "Family Timeline",
        person: "A B",
        description: "Shows a family chronology. Click on a person to create a new timeline. Use the wheel to zoom.",
      })
    ).toBe("Shows a family chronology.");
  });
  test("a view with no description gets a plain sentence", () => {
    expect(appSummary({ appName: "Webs", person: "A B" })).toBe(
      "Webs for A B, one of the connected tree views in WikiTree’s Tree Apps."
    );
    expect(appSummary({})).toBe("");
  });
});

describe("cropRect", () => {
  test("no ratio keeps the whole picture", () => {
    expect(cropRect(400, 1000, null)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 1000, axis: null });
  });
  test("a tall picture cropped wide slides up and down", () => {
    // 400 wide at 1.91:1 is 209 tall, out of 1000
    expect(cropRect(400, 1000, 1.91, 0.5, 0)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 209, axis: "y" });
    expect(cropRect(400, 1000, 1.91, 0.5, 1)).toEqual({ sx: 0, sy: 791, sw: 400, sh: 209, axis: "y" });
    expect(cropRect(400, 1000, 1.91, 0.5, 0.5).sy).toBe(396);
  });
  test("a wide picture cropped square slides left and right", () => {
    expect(cropRect(1000, 400, 1, 0, 0.5)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 400, axis: "x" });
    expect(cropRect(1000, 400, 1, 1, 0.5)).toEqual({ sx: 600, sy: 0, sw: 400, sh: 400, axis: "x" });
  });
  test("a picture that already has the shape has nothing to choose", () => {
    expect(cropRect(400, 400, 1, 0.2, 0.8)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 400, axis: null });
  });
  test("positions outside 0 to 1 are held to the edges", () => {
    expect(cropRect(400, 1000, 1.91, 0.5, 5).sy).toBe(791);
    expect(cropRect(400, 1000, 1.91, 0.5, -3).sy).toBe(0);
  });
  test("the shapes offered", () => {
    expect(CROP_SHAPES.map((c) => c.id)).toEqual(["original", "wide", "square", "tall"]);
  });
});

describe("cleanHeading", () => {
  test.each([
    ["Andersonia[edit] Link URL", "Andersonia"],
    ["Sources[edit] Link URL", "Sources"],
    ["Biography [edit] ID Link URL", "Biography"],
    ["Topical Projects [edit]", "Topical Projects"],
    ["Who are Ambassadors?", "Who are Ambassadors?"],
    ["A Useful Link", "A Useful Link"],
    ["  Spaced   out  ", "Spaced out"],
    ["", ""],
  ])("%j becomes %j", (input, output) => {
    expect(cleanHeading(input)).toBe(output);
  });
});

describe("page summaries stay clean", () => {
  test("section names lose the edit link and the copy buttons", () => {
    const summary = pageSummary("help", {
      title: "Help:Projects",
      paragraphs: ["A project is a group of members organized around a topic or volunteer activity."],
      sections: ["Topical Projects[edit] Link URL", "Functional Projects[edit] Link URL"],
    });
    expect(summary.fields[0].lines).toEqual(["Topical Projects", "Functional Projects"]);
  });
  test("a page whose only sections repeat its title or are standard ones lists none", () => {
    const summary = pageSummary("space", {
      title: "Andersonia, California One Place Study",
      paragraphs: ["Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson."],
      sections: ["Andersonia[edit] Link URL", "Sources[edit] Link URL"],
    });
    expect(summary.fields).toEqual([]);
    expect(summary.bio).toContain("Andersonia was named for the President");
  });
  test("the opening text loses stray [edit] markers", () => {
    expect(leadSummary(["The Ambassadors Project[edit] helps spread the word about WikiTree every single day."])).toBe(
      "The Ambassadors Project helps spread the word about WikiTree every single day."
    );
  });
});

describe("usefulSections", () => {
  test("drops standard sections and headings that repeat the page title", () => {
    expect(
      usefulSections(
        ["Andersonia", "History", "Sources", "References", "Footnotes", "See also", "Acknowledgments", "Contents"],
        "Andersonia, California One Place Study"
      )
    ).toEqual(["History"]);
  });
  test("ignores the Space:, Project:, Help: and Category: prefix when comparing with the title", () => {
    expect(usefulSections(["Projects", "Topical Projects"], "Help:Projects")).toEqual(["Topical Projects"]);
  });
  test("keeps real sections, cleaned", () => {
    expect(usefulSections(["Who are Ambassadors?[edit] Link URL", "Teams"], "Ambassadors Project")).toEqual([
      "Who are Ambassadors?",
      "Teams",
    ]);
  });
  test("without a title only the standard sections go", () => {
    expect(usefulSections(["Andersonia", "Sources"])).toEqual(["Andersonia"]);
  });
});

describe("surname pages", () => {
  test("the address is shared as it is", () => {
    expect(shareUrlFor("genealogy", "https://www.wikitree.com/genealogy/PEASLEY")).toBe(
      "https://www.wikitree.com/genealogy/PEASLEY"
    );
  });
  test("the card says how many profiles the surname has", () => {
    const summary = pageSummary("genealogy", { title: "Peasley Genealogy", counts: { profiles: 652 } });
    expect(summary.fields).toEqual([{ label: "Profiles", lines: ["652"], names: false }]);
    expect(summary.bio).toBe(
      "Explore the 652 Peasley profiles on WikiTree: ancestors, cousins and community members, and how they connect."
    );
  });
  test("without a count it still gives a sentence", () => {
    const summary = pageSummary("genealogy", { title: "Peasley Genealogy" });
    expect(summary.fields).toEqual([]);
    expect(summary.bio).toContain("Explore Peasley ancestors, cousins and community members");
  });
  test("the post names the surname page", () => {
    const text = buildText(
      "genealogy",
      "Peasley Genealogy",
      "https://www.wikitree.com/genealogy/PEASLEY",
      getChannel("x")
    );
    expect(text).toContain("Explore Peasley Genealogy on WikiTree");
    expect(text).toContain("@WikiTreers");
  });
});

const HUB_TEXT = `Peasley Collaboration
  Surname Collaboration Score: 95.30% No change from last week. Improve this by fixing reported errors (93.16% done).
  Rank: 8,840th most popular surname on WikiTree, with 585 Open profiles. 9 places up from last week!
  Here are the 300 most-recently added or edited Peasley ancestors, cousins, and community members. Search all 652 profiles.
  Peasley DNA Peasley DNA Study FamilyTreeDNA Group Project
  1 members with the surname Peasley have taken Y-Chromosome DNA tests, connecting 222 profiles. Y connections
  1 members with the surname Peasley have taken mitochondrial DNA tests, connecting 25 profiles. mt connections
  5 members with the surname Peasley have taken autosomal DNA tests, connecting 342 profiles. au connections`;

describe("parseGenealogyText", () => {
  test("reads the numbers on a surname hub", () => {
    expect(parseGenealogyText(HUB_TEXT)).toEqual({
      profiles: 652,
      score: 95.3,
      rank: 8840,
      openProfiles: 585,
      dna: {
        y: { members: 1, profiles: 222 },
        mt: { members: 1, profiles: 25 },
        au: { members: 5, profiles: 342 },
      },
    });
  });
  test("a hub with no score or DNA tests gives zeros and an empty DNA list", () => {
    expect(parseGenealogyText("Search all 12 profiles.")).toEqual({
      profiles: 12,
      score: null,
      rank: 0,
      openProfiles: 0,
      dna: {},
    });
    expect(parseGenealogyText("")).toEqual({ profiles: 0, score: null, rank: 0, openProfiles: 0, dna: {} });
  });
});

describe("ordinal", () => {
  test.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [101, "101st"],
    [8840, "8,840th"],
  ])("%i is %s", (n, text) => {
    expect(ordinal(n)).toBe(text);
  });
});

describe("a surname hub's card", () => {
  const hub = { ...parseGenealogyText(HUB_TEXT), coordinator: "Azure Robinson" };
  test("shows the profile count, open profiles, rank and coordinator", () => {
    const summary = pageSummary("genealogy", { title: "Peasley Genealogy", genealogy: hub });
    expect(summary.fields).toEqual([
      { label: "Profiles", lines: ["652"], names: false },
      { label: "Open profiles", lines: ["585"], names: false },
      { label: "Rank", lines: ["8,840th", "most popular surname"], names: false },
      { label: "Coordinator", lines: ["Azure Robinson"], names: true },
    ]);
  });
  test("the text mentions the collaboration score, rounded", () => {
    const summary = pageSummary("genealogy", { title: "Peasley Genealogy", genealogy: hub });
    expect(summary.bio).toBe(
      "Explore the 652 Peasley profiles on WikiTree: ancestors, cousins and community members, and how they connect. The surname collaboration score is 95%."
    );
  });
  test("a hub with no one-name study leaves out the coordinator", () => {
    const summary = pageSummary("genealogy", {
      title: "Peasley Genealogy",
      genealogy: { ...hub, coordinator: "" },
    });
    expect(summary.fields.map((f) => f.label)).toEqual(["Profiles", "Open profiles", "Rank"]);
  });
});

describe("living people stay off the card", () => {
  test("a name is safe only when the API says not living and not Private", () => {
    expect(isNameSafe({ IsLiving: 0, Privacy: 60 })).toBe(true);
    expect(isNameSafe({ IsLiving: 0, Privacy: 20 })).toBe(true);
    expect(isNameSafe({ IsLiving: 1, Privacy: 60 })).toBe(false);
    expect(isNameSafe({ IsLiving: 0, Privacy: 10 })).toBe(false);
    expect(isNameSafe({ Privacy: 60 })).toBe(false); // living status not reported
    expect(isNameSafe({ IsLiving: 0 })).toBe(false); // privacy not reported
    expect(isNameSafe(undefined)).toBe(false);
  });

  test("safeRelativeIds keeps only the relatives whose names are safe", () => {
    const person = {
      Parents: { 1: { Name: "Robinson-27274", IsLiving: 0, Privacy: 60 } },
      Spouses: { 2: { Name: "Budd-1260", IsLiving: 1, Privacy: 60 } },
      Children: {
        3: { Name: "Robinson-27360", IsLiving: 0, Privacy: 60 },
        4: { Name: "Robinson-99999", IsLiving: 1, Privacy: 60 },
        5: { Name: "Robinson-88888", IsLiving: 0, Privacy: 10 },
      },
    };
    expect([...safeRelativeIds(person)].sort()).toEqual(["Robinson-27274", "Robinson-27360"]);
    expect(safeRelativeIds(undefined).size).toBe(0);
    expect(safeRelativeIds({}).size).toBe(0);
  });

  const father = {
    firstName: "Carl William",
    gender: "male",
    birth: { date: "13 Nov 1933", place: "Burlington, Des Moines, Iowa, United States" },
    death: { date: "25 Apr 2003", place: "Longview, Cowlitz, Washington, United States", age: "69" },
    parents: ["Firman Joseph Robinson", "Leona Catherine (Budd) Robinson"],
    spouses: [],
  };
  test("children who are not named are still counted", () => {
    const summary = lifeSummary({ ...father, children: [], childCount: 5 }, 2026);
    expect(summary.bio).toContain("He was the father of 5 children.");
    expect(summary.bio).not.toContain("Danny");
  });
  test("a single unnamed child is a child, not children", () => {
    expect(lifeSummary({ ...father, children: [], childCount: 1 }, 2026).bio).toContain("the father of 1 child.");
  });
  test("some named and the rest counted", () => {
    const summary = lifeSummary(
      { ...father, children: ["Naomi Lucy (Robinson) Anderson", "Carl Jr"], childCount: 5 },
      2026
    );
    expect(summary.bio).toContain("He was the father of Naomi Lucy (Robinson) Anderson, Carl Jr and 3 more.");
  });
  test("all named when all are safe", () => {
    const summary = lifeSummary({ ...father, children: ["A B", "C D"], childCount: 2 }, 2026);
    expect(summary.bio).toContain("He was the father of A B and C D.");
  });
  test("no children at all says nothing about children", () => {
    expect(lifeSummary({ ...father, children: [], childCount: 0 }, 2026).bio).not.toContain("father of");
  });
});

describe("fileIdFor", () => {
  test.each([
    ["profile", "/wiki/Robinson-27265", "", "Robinson-27265"],
    ["space", "/wiki/Space:Andersonia,_California_One_Place_Study", "", "Andersonia,_California_One_Place_Study"],
    ["space", "/wiki/Space%3AAndersonia,_California_One_Place_Study", "", "Andersonia,_California_One_Place_Study"],
    ["project", "/wiki/Project:Ambassadors", "", "Ambassadors"],
    ["category", "/wiki/Category:Andersonia,_California", "", "Andersonia,_California"],
    ["help", "/wiki/Help:Projects", "", "Projects"],
    ["genealogy", "/genealogy/PEASLEY", "", "PEASLEY"],
    ["treeWidget", "/treewidget/Robinson-27274/6", "", "Robinson-27274"],
    ["treeApp", "/apps/Robinson-27274", "#name=Robinson-27274&view=fanchart", "Robinson-27274-fanchart"],
    ["treeApp", "/apps/Robinson-27274", "", "Robinson-27274"],
    ["imagePage", "/photo/jpg/Anderson-45659-4", "", "Anderson-45659-4"],
    ["other", "/g2g/", "", "page"],
  ])("%s %s gives %s", (kind, path, hash, id) => {
    expect(fileIdFor(kind, path, hash)).toBe(id);
  });
  test("characters a file name cannot hold become underscores", () => {
    expect(fileIdFor("space", '/wiki/Space:A:B*C?D"E<F>G|H I')).toBe("A_B_C_D_E_F_G_H_I");
  });
});
