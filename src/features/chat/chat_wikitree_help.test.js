// No-AI group 4 (2026-10-14): questions about WikiTree itself, answered from the checked glossary,
// WikiTree's FAQ pages, or its Help page search.
import {
  answerWikiTreeHelpQuestion,
  buildHelpIndex,
  glossaryEntryForPrompt,
  helpSearchKeywords,
  matchHelpQuestion,
  parseFaqPage,
  parseHelpSearchResults,
  namesWikiTree,
  resetHelpIndex,
  withoutOnWikiTree,
} from "./chat_wikitree_help";
import { WIKITREE_GLOSSARY_FOR_AI } from "./chat_wikitree_glossary";

// The questions on the 11 English FAQ pages, live 2026-10-14 (page|question).
const FAQ_QUESTIONS = `
FAQ|I've changed my email. What should I do?
FAQ|How do I close my account?
FAQ|How do I report a bug?
FAQ|How do I suggest a new feature I'd like to see?
FAQ|How do I suggest an improvement to a help page?
FAQ|Why did someone edit my tree?
FAQ|Someone did something I don't like. What should I do?
FAQ|How do I see the shared tree on WikiTree?
FAQ|What does it mean to be "connected" to the tree / X degrees from someone?
FAQ|How do I know if I'm connected to the tree?
FAQ|How can I delete a profile?
FAQ|How can I delete a photo?
FAQ|How do I upload my DNA to WikiTree?
FAQ|How do I add DNA for my living relative?
FAQ|How do I add another spouse?
FAQ|How do I change a last name?
FAQ|Why did the first name change to "Anonymous"?
FAQ|How do I unmerge a profile?
FAQ|Why can't I edit this profile?
FAQ|Why is editing so complicated?
FAQ|I uploaded my GEDCOM. Why can't I see my tree?
FAQ|How do I adopt a private profile?
FAQ|Why is my photo private?
FAQ|What is the GDPR?
FAQ|How do I add a source to a profile?
FAQ|Why did my sources disappear?
FAQ|Why does a profile say it is unsourced even though I added a source?
FAQ|Is there a sticker for X?
FAQ|How often / when do the suggestion reports update?
FAQ|Is WikiTree related to Wikipedia?
FAQ|Is WikiTree non-profit?
FAQ|Is our collaborative tree public domain?
FAQ|Is WikiTree's software open source?
FAQ|What would happen to the tree if WikiTree.com disappeared?
FAQ|How do you contact WikiTree?
Sources_FAQ|What is a source?
Sources_FAQ|Are sources required on WikiTree?
Sources_FAQ|Are inline source citations required?
Sources_FAQ|Why are unreliable sources allowed for post-1700 profiles?
Sources_FAQ|Should you remove unreliable sources from existing profiles?
Sources_FAQ|When should the Unsourced Research Note Box be used?
Sources_FAQ|Who can add the Unsourced Research Note Box to a profile?
Sources_FAQ|Is there a limit to how many profiles a member can create using unreliable sources?
Trusted_List_FAQ|What are Trusted Lists?
Trusted_List_FAQ|Why does every profile have a Trusted List?
Trusted_List_FAQ|If I add you to my Trusted List can you access every profile I can access?
Trusted_List_FAQ|If I'm in your profile's Trusted List are you in my profile's Trusted List?
Trusted_List_FAQ|What is the connection between Trusted Lists and family relationships?
Trusted_List_FAQ|Who can add and remove people from a Trusted List?
Trusted_List_FAQ|Can the people in your profile's Trusted List edit all your information?
Trusted_List_FAQ|Why does a profile of a distant ancestor need a Trusted List?
Trusted_List_FAQ|What are Watchlists?
Matching_and_Merging_FAQ|How do you find possible matches?
Matching_and_Merging_FAQ|What if you find duplicates?
Matching_and_Merging_FAQ|What if the data or parents for the two profiles don't exactly match?
Matching_and_Merging_FAQ|What happens after a merge?
Matching_and_Merging_FAQ|What happens to siblings, spouses, and children in a merge?
Matching_and_Merging_FAQ|What if you don't have permission to complete a merge?
Matching_and_Merging_FAQ|Is it ever OK not to merge duplicates?
Matching_and_Merging_FAQ|Is it ever OK to intentionally create a duplicate?
Matching_and_Merging_FAQ|What can you do if you're waiting for approval from someone else?
Matching_and_Merging_FAQ|Where can you find pending merges that haven't been completed?
Matching_and_Merging_FAQ|When should you remove a pending merge, unmerged match, or rejected match?
Matching_and_Merging_FAQ|Can you edit a profile so that it represents a different person instead of merging it?
Deletion_FAQ|Why is there no "delete" button on profiles?
Deletion_FAQ|If I added it why can't I delete it?
Deletion_FAQ|What if there are duplicate profiles for the same person?
Deletion_FAQ|What if a profile represents a person who never existed?
Deletion_FAQ|What if a profile has the wrong relationships?
Deletion_FAQ|What if a person is living and their information needs to be protected for privacy?
Deletion_FAQ|What if sensitive information was added?
Deletion_FAQ|What if a large number of junk profiles are created in a GEDCOM import?
Deletion_FAQ|What if I'm closing my account?
Deletion_FAQ|Can I change a profile to represent a different person?
Photos_FAQ|How do you add a photo?
Photos_FAQ|How do you remove or delete a photo?
Photos_FAQ|How do you edit photo information?
Photos_FAQ|How do you know if you have permission to upload a photo?
Photos_FAQ|Can anyone see photos?
Photos_FAQ|How do you upload a printed image to WikiTree?
Photos_FAQ|How do you change the order of people identified in a photo?
Photos_FAQ|How do you change the order of photos on a profile?
Photos_FAQ|Why does my portrait/vertical photo display as landscape/horizontal?
Photos_FAQ|How do you display a photo in the text of any page?
Photos_FAQ|Why doesn't my PDF upload have an image thumbnail?
Photos_FAQ|How do you find an existing image?
Photos_FAQ|What's the difference between photos and source images?
Photos_FAQ|What is WikiTree's policy on AI-generated images?
Photos_FAQ|How should disagreements about the visual appearance of profiles be handled?
DNA_FAQ|How can an adoptee use WikiTree's DNA features?
DNA_FAQ|What are the privacy considerations for DNA on WikiTree?
DNA_FAQ|Can you enter a test for someone else?
DNA_FAQ|Why can't you enter a National Geographic or BritainsDNA test?
DNA_FAQ|Why don't your 23andMe-reported haplogroups appear on your direct line maternal and paternal ancestors?
DNA_FAQ|If you haven't taken a test yet, which one should you take?
DNA_FAQ|How can you order or recommend a test and give WikiTree credit for the referral?
DNA_FAQ|Why do you need to cite a source when using "Confirmed with DNA"?
DNA_FAQ|Why is triangulation necessary for confirmation with matches beyond third cousins?
GDPR_FAQ|What is the GDPR?
GDPR_FAQ|Why does it affect non-Europeans?
GDPR_FAQ|What changed on WikiTree?
GDPR_FAQ|What does it mean for profiles to be Unlisted?
GDPR_FAQ|Which profiles became Unlisted?
GDPR_FAQ|What happened to DNA test information?
GDPR_FAQ|How can I invite my relative to WikiTree so they can add back their DNA test information?
GDPR_FAQ|How can I see who I've invited and who has accepted my invitation?
GDPR_FAQ|What if my relative isn't interested in genealogy?
GDPR_FAQ|What if my relative doesn't have a computer or e-mail?
Project_FAQ|Why do we have projects?
Project_FAQ|How do you join or start a project?
Project_FAQ|Can any member join any project?
Project_FAQ|What are the differences between Projects, Sub-Projects, Project Teams, and Free-Space Projects?
Project_FAQ|Are profiles owned by the projects that manage them?
Project_FAQ|Do you have to participate in a project to work on certain profiles?
Project_FAQ|What are Project-Projected Profiles (PPPs)?
Project_FAQ|What are project-covered profiles?
Project_FAQ|Do profiles managed or covered by projects have different styles or standards?
Project_FAQ|Can profiles be managed or covered by multiple projects?
Project_FAQ|Who should have a project badge?
Project_FAQ|Other questions?
Style_FAQ|Why do we need style rules?
Style_FAQ|Where do you find style rules?
Style_FAQ|How are style rules developed?
Style_FAQ|What is the difference between site-wide rules and project rules?
Style_FAQ|Do style rules apply to private profiles?
Style_FAQ|Is it forbidden to break style rules?
Style_FAQ|What happens if you knowingly break style rules?
Style_FAQ|What if there is a problem with a style rule, policy, or help page?
Style_FAQ|What HTML, CSS, and wiki markup tags are allowed?
Widget_FAQ|What is a Widget?
Widget_FAQ|What is a WikiTree Widget?
Widget_FAQ|Will WikiTree Widgets reveal private information?
Widget_FAQ|How do you add a widget to your blog?
Widget_FAQ|What if you don't have a blog or website?
`;
const faqEntries = FAQ_QUESTIONS.trim()
  .split("\n")
  .map((line) => {
    const [page, question] = line.split("|");
    return { page, question, url: `https://www.wikitree.com/wiki/Help:${page}#x`, answer: [], links: [] };
  });
const index = buildHelpIndex(faqEntries);

describe("the glossary, by the exact term", () => {
  test.each([
    ["what is a PPP?", "PPP = Project-Protected Profile"],
    ["What are PPPs", "PPP = Project-Protected Profile"],
    ["what does 'Unsourced' mean?", "Unsourced: the {{Unsourced}} Research Note Box"],
    ["What does “Unsourced” mean?", "Unsourced:"],
    ["what is an orphan?", "Orphan: a profile with no Profile Manager"],
    ["what is an unconnected profile?", "Unconnected:"],
    ["what does LNAB stand for?", "LNAB = Last Name at Birth"],
    ["what's CC7?", "CC7 ="],
    ["what is pre-1700?", "born before 1700"],
    ["what is WikiTree?", "WikiTree: a free, shared family tree"],
    ["what is the Free Family Tree?", "WikiTree: a free, shared family tree"],
    ["What is Genie?", "Genie: a WikiTree Browser Extension (WBE) feature"],
    ["what's WBE?", "WBE = WikiTree Browser Extension"],
    ["what is the WikiTree Browser Extension?", "WBE = WikiTree Browser Extension"],
  ])("%s", (prompt, start) => {
    expect(glossaryEntryForPrompt(prompt)?.text).toContain(start);
  });

  test("anything else isn't looked up", () => {
    expect(glossaryEntryForPrompt("what is her birth date?")).toBeNull();
    expect(glossaryEntryForPrompt("what is a PPP worth to me")).toBeNull();
    expect(glossaryEntryForPrompt("who is the PPP")).toBeNull();
  });

  test("the AI gets the same lines, with the help link that works", () => {
    expect(WIKITREE_GLOSSARY_FOR_AI).toContain("- PPP = Project-Protected Profile");
    expect(WIKITREE_GLOSSARY_FOR_AI).toContain("https://www.wikitree.com/wiki/Help:Name_Fields#Last_Name_at_Birth");
    expect(WIKITREE_GLOSSARY_FOR_AI).not.toContain("Help:Last_Name_at_Birth");
  });
});

describe("matching the FAQ questions", () => {
  // [asked, the FAQ question quoted (confident) or listed first (not), confident]
  test.each([
    ["how do I merge two profiles?", "How do I merge two profiles?", true],
    ["how do I add a source?", "How do I add a source?", true],
    ["can I delete a profile?", "How can I delete a profile?", true],
    ["how do I delete a profile I made by mistake?", "How can I delete a profile?", true],
    ["why can't I edit my grandfather's profile?", "Why can't I edit this profile?", true],
    ["how do I unmerge?", "How do I unmerge a profile?", true],
    ["how do I change my email address?", "I've changed my email. What should I do?", true],
    ["why did my references vanish?", "Why did my sources disappear?", true],
    ["how do I add a second wife?", "How do I add another spouse?", true],
    ["how do I change someone's surname?", "How do I change a last name?", true],
    ["how do I upload a photo?", "How do you add a photo?", true],
    ["how do I remove someone from my trusted list?", "Who can add and remove people from a Trusted List?", true],
    ["am I connected to the tree?", "How do I know if I'm connected to the tree?", true],
    ["what is a source?", "What is a source?", true],
    ["can I edit pre-1700 profiles?", "Who can edit pre-1700 profiles?", true],
    ["how do I join a project?", "How do you join or start a project?", false],
    ["what is the best DNA test?", "What happened to DNA test information?", false],
  ])("%s", (prompt, question, confident) => {
    const match = matchHelpQuestion(prompt, index);
    expect(match?.entry.question).toBe(question);
    expect(match.confident).toBe(confident);
  });

  // About WikiTree itself: Genie's checked facts (the glossary's questions)
  // About WikiTree itself: Genie's checked facts (the glossary's questions), by the page they link
  test.each([
    ["who founded WikiTree?", "Help:WikiTree_History"],
    ["who is the founder of WikiTree?", "Help:WikiTree_History"],
    ["when was WikiTree created?", "Help:WikiTree_History"],
    ["when did WikiTree start?", "Help:WikiTree_History"],
    ["who owns WikiTree?", "Help:About_WikiTree"],
    ["who runs wikitree", "Help:About_WikiTree"],
    ["who is the president of WikiTree?", "Help:About_WikiTree"],
    ["who's in charge of WikiTree?", "Help:About_WikiTree"],
    ["is WikiTree free?", "Help:The_Free_Family_Tree"],
    ["does WikiTree cost anything?", "Help:The_Free_Family_Tree"],
    ["what happens to my research when I die?", "Help:Protecting_Our_Shared_Tree"],
    ["what happens if WikiTree shuts down?", "Help:Protecting_Our_Shared_Tree"],
    ["which profiles must be Open?", "Help:Privacy"],
    ["why can't I make my great-grandfather's profile private?", "Help:Privacy"],
  ])("about WikiTree: %s", (prompt, page) => {
    const match = matchHelpQuestion(prompt, index);
    expect(match?.entry.glossary?.url).toBe(`https://www.wikitree.com/wiki/${page}`);
    expect(match.confident).toBe(true);
  });

  test.each([
    ["Owner of WikiTree", "Help:About_WikiTree"],
    ["WT founder", "Help:WikiTree_History"],
    ["who owns WT?", "Help:About_WikiTree"],
    ["is WT free?", "Help:The_Free_Family_Tree"],
  ])("WT is WikiTree, and short forms work: %s", (prompt, page) => {
    expect(matchHelpQuestion(prompt, index)?.entry.glossary?.url).toBe(`https://www.wikitree.com/wiki/${page}`);
  });

  test("names WikiTree: WT counts, WT+ and a closing 'on WikiTree' don't", () => {
    expect(namesWikiTree("Owner of WikiTree")).toBe(true);
    expect(namesWikiTree("is WT free?")).toBe(true);
    expect(namesWikiTree("WT+ Smith Kent")).toBe(false);
    expect(namesWikiTree("WikiTree+ search")).toBe(false);
    expect(namesWikiTree(withoutOnWikiTree("Garver profiles on WikiTree"))).toBe(false);
    expect(glossaryEntryForPrompt("what is WT?")?.url).toBe("https://www.wikitree.com/wiki/Help:About_WikiTree");
  });

  test("a question about WikiTree itself must name it", () => {
    expect(matchHelpQuestion("who founded it?", index)).toBeNull();
    expect(matchHelpQuestion("who created this profile?", index)).toBeNull();
    expect(matchHelpQuestion("who owns it?", index)).toBeNull();
    expect(matchHelpQuestion("is it free?", index)).toBeNull();
  });

  test.each([
    "who can see my profile?",
    "why did my grandfather emigrate?",
    "what was the weather like in 1850?",
    "how many children did she have?",
    "who was her father?",
    "how do I find my ancestors?",
    "how do I add a biography?",
  ])("no FAQ match: %s", (prompt) => {
    expect(matchHelpQuestion(prompt, index)).toBeNull();
  });
});

describe("WikiTree's Help page search", () => {
  test("the key words of a question about WikiTree", () => {
    expect(helpSearchKeywords("how do I add a biography?")).toBe("add biography");
    expect(helpSearchKeywords("is there a sticker for veterans?")).toBe("sticker veterans");
    expect(helpSearchKeywords("how do I add a child?")).toBe("add child");
  });
  test("not for a question about a person, or one only about 'profile'", () => {
    expect(helpSearchKeywords("how many children did she have?")).toBe("");
    expect(helpSearchKeywords("why did my grandfather emigrate?")).toBe("");
    expect(helpSearchKeywords("who can see my profile?")).toBe("");
  });
  test("the English results", () => {
    const html = `<div class="row"><p>2 results</p><h3 id="lang_En">English Results</h3><ul>
      <li class="mb-3"><span class="large"><a href="/wiki/Help:Merging">Merging</a></span><br> Here is how to merge profiles.</li>
      <li class="mb-3"><span class="large"><a href="/wiki/Help:Merge_Problems">Merge Problems</a></span><br> Problems related to merging.</li>
      </ul><h3 id="lang_De">Deutsch</h3><ul><li><a href="/wiki/Help:De:Zusammenf%C3%BChren">Zusammenführen</a></li></ul></div>`;
    expect(parseHelpSearchResults(html)).toEqual([
      { title: "Merging", url: "https://www.wikitree.com/wiki/Help:Merging", summary: "Here is how to merge profiles." },
      { title: "Merge Problems", url: "https://www.wikitree.com/wiki/Help:Merge_Problems", summary: "Problems related to merging." },
    ]);
    expect(parseHelpSearchResults("<p>No results</p>")).toEqual([]);
  });
});

// The shape of the live FAQ pages: questions in h2 (Sources FAQ) or h3 under h2 groups (FAQ),
// with copy buttons inside the heading.
const FAQ_HTML = `<div class="body-text clearfix">
<h2 id="Account_Help"><span class="mw-headline"> Account Help </span><ul class="copy--buttons"><li><button>Link</button></li></ul></h2>
<h3 id="I.27ve_changed_my_email._What_should_I_do.3F"><span class="mw-headline"> I've changed my email. What should I do? </span><span class="editsection">[<a href="/index.php?title=Help:FAQ&action=edit">edit</a>]</span></h3>
<p>See <a href="/wiki/Help:Email_Addresses" title="Help:Email Addresses">Help:Email_Addresses</a>.
</p>
<h3 id="Why_can.27t_I_edit_this_profile.3F"><span class="mw-headline"> Why can't I edit this profile? </span></h3>
<p>There are a few reasons you may not be able to edit a profile:
</p>
<ol><li> You haven't signed the <a href="/wiki/Special:Honor_Code">Honor Code</a>. See <a href="/wiki/Help:Membership">Help:Membership</a>.
</li><li> You aren't on the <a href="/wiki/Help:Trusted_List">Trusted List</a>.
</li></ol>
<h2 id="Sources"><span class="mw-headline"> Sources </span></h2>
</div>`;

test("parseFaqPage: each question, its answer and links", () => {
  const entries = parseFaqPage(FAQ_HTML, "FAQ");
  expect(entries.map((entry) => entry.question)).toEqual(["I've changed my email. What should I do?", "Why can't I edit this profile?"]);
  expect(entries[0]).toMatchObject({
    url: "https://www.wikitree.com/wiki/Help:FAQ#I.27ve_changed_my_email._What_should_I_do.3F",
    answer: ["See Help:Email_Addresses."],
    links: [{ title: "Help:Email_Addresses", url: "https://www.wikitree.com/wiki/Help:Email_Addresses" }],
  });
  expect(entries[1].answer).toEqual([
    "There are a few reasons you may not be able to edit a profile:",
    "• You haven't signed the Honor Code. See Help:Membership.",
    "• You aren't on the Trusted List.",
  ]);
});

describe("answerWikiTreeHelpQuestion", () => {
  const SEARCH_HTML = `<h3 id="lang_En">English Results</h3><ul><li><span class="large"><a href="/wiki/Help:Biographies">Biographies</a></span><br> How to write a biography.</li></ul>`;
  const makeFetch = () =>
    jest.fn(async (path) => {
      if (path === "/wiki/Help:FAQ") return FAQ_HTML;
      if (path === "/index.php") return SEARCH_HTML;
      return "";
    });
  beforeEach(() => resetHelpIndex());

  test("a glossary term: no fetching", async () => {
    const fetchPage = makeFetch();
    const reply = await answerWikiTreeHelpQuestion("what is a PPP?", { fetchPage });
    expect(reply.source).toBe("glossary");
    expect(reply.text).toBe(
      "PPP = Project-Protected Profile: a profile a WikiTree project protects (often notable or much-disputed people). Project members watch it, and changes such as merges or relationship edits go through the project.\nhttps://www.wikitree.com/wiki/Help:Project_Protection"
    );
    expect(fetchPage).not.toHaveBeenCalled();
  });

  test("an FAQ question: WikiTree's answer, quoted, with its link", async () => {
    const fetchPage = makeFetch();
    const reply = await answerWikiTreeHelpQuestion("why can't I edit this profile?", { fetchPage });
    expect(reply.source).toBe("faq");
    expect(reply.text).toBe(
      [
        "WikiTree's FAQ: **Why can't I edit this profile?**",
        "There are a few reasons you may not be able to edit a profile:\n• You haven't signed the Honor Code. See Help:Membership.\n• You aren't on the Trusted List.",
        "https://www.wikitree.com/wiki/Special:Honor_Code",
        "https://www.wikitree.com/wiki/Help:Membership",
        "https://www.wikitree.com/wiki/Help:FAQ#Why_can.27t_I_edit_this_profile.3F",
      ].join("\n")
    );
    expect(fetchPage).toHaveBeenCalledWith("/wiki/Help:Sources_FAQ", "");
  });

  test("glossary questions answer even when the FAQ pages don't come back", async () => {
    const reply = await answerWikiTreeHelpQuestion("how do I merge two profiles?", { fetchPage: jest.fn(async () => Promise.reject(new Error("offline"))) });
    expect(reply.text).toMatch(/^Merging: when two profiles are the same person/);
  });

  test("nothing in the FAQ: the Help search with the key words", async () => {
    const fetchPage = makeFetch();
    const reply = await answerWikiTreeHelpQuestion("how do I write a biography?", { fetchPage });
    expect(fetchPage).toHaveBeenCalledWith("/index.php", "title=Special%3ASearchPages&keywords=write%20biography&pageSearch=");
    expect(reply).toEqual({
      source: "search",
      text: 'WikiTree\'s Help pages for "write biography":\n• **Biographies**: How to write a biography.\nhttps://www.wikitree.com/wiki/Help:Biographies',
    });
  });

  test("not about WikiTree, or asking for a count: null", async () => {
    expect(await answerWikiTreeHelpQuestion("why did my grandfather emigrate?", { fetchPage: makeFetch() })).toBeNull();
    expect(await answerWikiTreeHelpQuestion("how many have no sources?", { fetchPage: makeFetch() })).toBeNull();
  });
});
