import {
  BRAND_HASHTAGS,
  buildText,
  detectPageKind,
  getChannel,
  intentUrl,
  lifeSummary,
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
