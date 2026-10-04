import {
  BRAND_HASHTAGS,
  buildText,
  detectPageKind,
  getChannel,
  appNameFromSlug,
  appSummary,
  intentUrl,
  isShareablePrivacy,
  leadSummary,
  lifeSummary,
  pageSummary,
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
