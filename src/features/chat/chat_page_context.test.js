jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import {
  buildCurrentPageContextForAi,
  currentPageChipPrompts,
  extractDnaConnectionsText,
  extractPageText,
  isDnaPrompt,
  getCurrentPageInfo,
  isCurrentPagePrompt,
} from "./chat_page_context";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// Trimmed from the live Space:Test_page-1 HTML (2026-10-05), with the
// extension's own buttons still in it.
const SPACE_PAGE_HTML = `
  <h1 class="x-heading-title" itemprop="name">Test page</h1>
  <aside class="x-audit"><p>Managed by <a href="/wiki/Smith-1">Jo Smith</a></p><p>Created 1 Oct 2026</p></aside>
  <div class="page--content"><div class="x-content">
    <button id="wbe-genie-button">Genie</button>
    <div id="toc"><ul><li>1 History</li></ul></div>
    <p>The Smith family farmed at Ashby from 1820.<span class="scissors">✂</span></p>
    <h2 class="x-section">History<span class="editsection">[edit]</span></h2>
    <ul><li>John Smith built the mill in 1835.</li><li>It closed in 1901.</li></ul>
    <div class="filter-row"><input value="filter"></div>
    <table><tr><th>Name ▲▼</th><th>Born</th></tr><tr><td>John</td><td>1801</td></tr></table>
    <div class="wbe-copy">Copy ID</div>
    <ol class="references x-sources"><li>Ashby parish register.</li></ol>
  </div></div>`;

// The same page logged out: no .x-content; comments, memories and ads share
// the content column, and the manager is in a footnote.
const LOGGED_OUT_HTML = `
  <h1 itemprop="name">Test page</h1>
  <div class="col-lg-8 page--content">
    <div class="mt-3"><p>The Smith family farmed at Ashby from 1820.</p>
      <table><tr><th>Name <img alt=" " src="sort.png"></th></tr><tr><td>John</td></tr></table></div>
    <div id="Collaboration">Login to edit this page.</div>
    <aside class="ad">Sponsored Search by Ancestry.com</aside>
    <section id="Memories">Enter a personal reminiscence or story.</section>
  </div>
  <aside class="footnote">Profile manager: Jo Smith Last modified 14 Sep 2026</aside>`;

const spaceLocation = {
  pathname: "/wiki/Space:Test_page-1",
  search: "",
  href: "https://www.wikitree.com/wiki/Space:Test_page-1",
};

describe("isCurrentPagePrompt", () => {
  test.each([
    "summarize this page",
    "Summarise this page.",
    "can you summarize the page?",
    "give me a short summary of this page",
    "what is this page about?",
    "what does this page say about the mill?",
    "who is mentioned on this page?",
    "list the sources on this page",
    "according to this page, when did the mill close?",
    "summarize this FSP",
    "summarize this free space page",
    "tl;dr",
  ])("%s", (prompt) => {
    expect(isCurrentPagePrompt(prompt)).toBe(true);
  });

  test.each(["add this page to my watchlist", "how am I connected to this page?", "summarize her bio", "Smith-123's ancestors"])(
    "not %s",
    (prompt) => {
      expect(isCurrentPagePrompt(prompt)).toBe(false);
    }
  );
});

describe("page text", () => {
  beforeEach(() => {
    document.body.innerHTML = SPACE_PAGE_HTML;
  });

  test("reads the Space page name and title", () => {
    expect(getCurrentPageInfo(document, spaceLocation)).toEqual({
      pageName: "Space:Test_page-1",
      namespace: "Space",
      title: "Test page",
      isPersonProfile: false,
    });
    expect(getCurrentPageInfo(document, { pathname: "/wiki/Smith-123" }).isPersonProfile).toBe(true);
    // (the edit page isn't the profile: no "Who could test?" there)
    expect(getCurrentPageInfo(document, { pathname: "/index.php", search: "?title=Special:EditPerson&u=51723471" }).isPersonProfile).toBe(false);
    expect(getCurrentPageInfo(document, { pathname: "/wiki/O%27Brien-12" }).isPersonProfile).toBe(true);
  });

  test("keeps the content and drops the extension's clutter", () => {
    const { text, truncated } = extractPageText(document);
    expect(truncated).toBe(false);
    expect(text).toContain("The Smith family farmed at Ashby from 1820.");
    expect(text).toContain("## History");
    expect(text).toContain("- John Smith built the mill in 1835.");
    expect(text).toContain("| Name | Born |");
    expect(text).toContain("| John | 1801 |");
    expect(text).toContain("Ashby parish register.");
    for (const clutter of ["Genie", "✂", "[edit]", "Copy ID", "1 History", "▲"]) {
      expect(text).not.toContain(clutter);
    }
  });

  test("caps long pages and says so", () => {
    const rows = Array.from({ length: 100 }, (_, i) => `<tr><td>Row ${i}</td></tr>`).join("");
    document.querySelector(".x-sources").insertAdjacentHTML("beforebegin", `<table>${rows}</table>`);
    expect(extractPageText(document).text).toContain("60 more rows not shown");
    // Over budget: tables shrink (to 15 rows here) before anything else goes.
    const shrunk = extractPageText(document, { maxChars: 600 });
    expect(shrunk.truncated).toBe(false);
    expect(shrunk.text).toContain("85 more rows not shown");
    // Still over: the middle goes and the sources at the end stay.
    const capped = extractPageText(document, { maxChars: 250 });
    expect(capped.truncated).toBe(true);
    expect(capped.text.length).toBeLessThanOrEqual(250);
    expect(capped.text).toContain("part of the page not shown");
    expect(capped.text).toContain("Ashby parish register.");
  });

  test("the AI block tells the AI it can see the page", () => {
    const block = buildCurrentPageContextForAi(document, spaceLocation);
    expect(block).toContain("never ask them to paste it");
    expect(block).toContain("Page: Space:Test_page-1 (Space page)");
    expect(block).toContain("Managed by Jo Smith");
    expect(block).toContain("John Smith built the mill in 1835.");
  });

  test("logged-out layout: content only, manager from the footnote", () => {
    document.body.innerHTML = LOGGED_OUT_HTML;
    const block = buildCurrentPageContextForAi(document, spaceLocation);
    expect(block).toContain("The Smith family farmed at Ashby from 1820.");
    expect(block).toContain("| Name |");
    expect(block).toContain("Profile manager: Jo Smith");
    for (const clutter of ["Login to edit", "Sponsored", "reminiscence", "[image"]) {
      expect(block).not.toContain(clutter);
    }
  });

  test("person profiles only when asked (getProfile hid the bio)", () => {
    const profile = { pathname: "/wiki/Smith-123", href: "https://www.wikitree.com/wiki/Smith-123" };
    expect(buildCurrentPageContextForAi(document, profile)).toBe("");
    expect(buildCurrentPageContextForAi(document, profile, { includePersonProfile: true })).toContain("Ashby");
  });
});

describe("routing", () => {
  test.each(["summarize this page", "what does this page say about the mill?", "who is mentioned on this page?"])(
    "%s goes to the AI with the page",
    (prompt) => {
      expect(routeChatPrompt(prompt)?.intent).toBe(ChatIntent.FALLBACK_AI);
    }
  );
});

describe("page buttons", () => {
  const info = (pathname, search = "") => getCurrentPageInfo(document, { pathname, search });

  test("on content pages, each a page question that goes to the AI", () => {
    const chips = currentPageChipPrompts(info("/wiki/Space:Test_page-1"));
    expect(chips).toEqual(["Summarize this page", "Who is mentioned on this page?", "Make a timeline of this page"]);
    for (const chip of chips) {
      expect(isCurrentPagePrompt(chip)).toBe(true);
      expect(routeChatPrompt(chip)?.intent).toBe(ChatIntent.FALLBACK_AI);
    }
    expect(currentPageChipPrompts(info("/wiki/Help:Privacy"))).not.toContain("Make a timeline of this page");
  });

  test("not on profiles, edit pages, or without AI", () => {
    expect(currentPageChipPrompts(info("/wiki/Smith-123"))).toEqual([]);
    expect(currentPageChipPrompts(info("/index.php", "?title=Special:EditPerson&u=51723471"))).toEqual([]);
    expect(currentPageChipPrompts(info("/wiki/Space:Test_page-1"), { ai: false })).toEqual([]);
  });
});

// Trimmed from www Chicoine_dit_Henley-1 (2026-10-05).
const DNA_HTML = `
  <section id="DNA-Connections" class="x-sidebar-section x-dna-connections">
    <h2><a href="/wiki/Help:DNA_Connections">DNA Connections: 15 <span class="icon--help"></span></a></h2>
    It may be possible to <a>confirm</a> family relationships. It is likely that these <a>autosomal DNA</a> test-takers will share <a>some percentage</a> of DNA with Isabelle Elisabeth:
    <ul class="unstyled dna dna-au">
      <li><span>~3.12%</span> <a href="/wiki/Maloney-2332">Murray Maloney</a> <a href="/index.php?title=Special:Relationship"><span class="icon--relationship"></span></a> : <a>AncestryDNA</a>, GEDmatch <a>EG854149C1</a> <span class="dtcAddTest icon--compare"></span></li>
      <li><span>~1.56%</span> <a href="/wiki/Knight-5555">Janice Knight</a> : <a>AncestryDNA</a></li>
    </ul>
  </section>`;

describe("DNA connections", () => {
  test("reads the testers, their share and IDs", () => {
    document.body.innerHTML = DNA_HTML;
    const text = extractDnaConnectionsText(document);
    expect(text).toMatch(/^DNA Connections: 15/);
    expect(text).toContain("Autosomal test-takers:");
    expect(text).toContain("- ~3.12% Murray Maloney: AncestryDNA, GEDmatch EG854149C1 [Maloney-2332]");
    expect(text).toContain("- ~1.56% Janice Knight: AncestryDNA [Knight-5555]");
  });
  test("nothing without the box", () => {
    document.body.innerHTML = SPACE_PAGE_HTML;
    expect(extractDnaConnectionsText(document)).toBe("");
  });
  test.each(["Who could test?", "Who are her DNA connections?", "has anyone tested for her"])("%s is a DNA question", (prompt) => {
    expect(isDnaPrompt(prompt)).toBe(true);
  });
  test("summarize this page is not", () => {
    expect(isDnaPrompt("summarize this page")).toBe(false);
  });
});
