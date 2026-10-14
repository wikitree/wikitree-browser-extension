// WikiTree terms the general AI fallback got wrong (live C34, 2026-10-03: it
// expanded PPP as "Profile Protection Project"). Short, checked facts plus help
// links so "what is …" / "how do I …" answers are right and point somewhere.
// One list for both: the AI gets every line; without AI, "what is a PPP?" is
// looked up by its exact term (chat_wikitree_help.js). Checked against the help
// pages, 2026-10-14 (Help:Last_Name_at_Birth is a 404: the field is on Help:Name_Fields).
// (no "Smith-123" or "Pre-1700" in the text: the chat links anything shaped like a WikiTree ID)
// terms: each written once; the lookup ignores case, hyphens, "a"/"the" and a plural s.
export const WIKITREE_GLOSSARY = [
  {
    terms: ["PPP", "Project-Protected Profile", "project protection", "protected profile"],
    text: "PPP = Project-Protected Profile: a profile a WikiTree project protects (often notable or much-disputed people). Project members watch it, and changes such as merges or relationship edits go through the project.",
    url: "https://www.wikitree.com/wiki/Help:Project_Protection",
  },
  {
    terms: ["Profile Manager", "manager"],
    text: "Profile Manager: the member with primary responsibility for a profile. Each profile also has a Trusted List of members who may view and edit it.",
    url: "https://www.wikitree.com/wiki/Help:Profile_Manager",
  },
  {
    terms: ["Trusted List"],
    text: "Trusted List: every profile has its own list of the people trusted with full access to it, led by its Profile Manager. Being on one profile's Trusted List gives no access to others.",
    url: "https://www.wikitree.com/wiki/Help:Trusted_List",
  },
  {
    terms: ["privacy", "privacy level", "privacy setting"],
    questions: ["Which profiles must be Open?", "Why can't I make this profile private?"],
    text: "Privacy levels control who sees a profile (Open, Public, Private with public biography and/or tree, Private, Unlisted). Profiles of people born over 150 years ago or who died over 100 years ago must be Open.",
    url: "https://www.wikitree.com/wiki/Help:Privacy",
  },
  {
    terms: ["merge", "merging", "merging profiles"],
    questions: ["How do I merge two profiles?", "How do I merge duplicates?"],
    text: "Merging: when two profiles are the same person they must be merged into one. Start the merge at Special:MergePerson. If you're on the Trusted List of both profiles you choose which data to keep and complete it; otherwise it becomes a Pending Merge and the Profile Managers are emailed to approve it. Merges can't be undone.",
    url: "https://www.wikitree.com/wiki/Help:Merging",
  },
  {
    // ("what is a source?" is the FAQ's: WikiTree's own definition)
    terms: ["citation", "inline citation", "ref tag", "references tag"],
    questions: ["How do I add a source?", "How do I cite a source?"],
    text: "Sources: every profile needs at least one source; add inline <ref> citations in the biography and keep them under the == Sources == heading with <references />.",
    url: "https://www.wikitree.com/wiki/Help:Sources",
  },
  {
    terms: ["Unsourced", "unsourced profile", "Unsourced template", "Unsourced box", "Unsourced Research Note Box"],
    text: 'Unsourced: the {{Unsourced}} Research Note Box marks a profile with no source citations, or none that clearly identify the source ("Find-A-Grave" alone isn\'t enough; "Find-A-Grave Memorial #1234" is). To clear it, add a clear source and remove {{Unsourced}} from the biography.',
    url: "https://www.wikitree.com/wiki/Help:Sources_FAQ#When_should_the_Unsourced_Research_Note_Box_be_used.3F",
  },
  {
    terms: ["orphan", "orphaned", "orphan profile", "orphaned profile"],
    text: "Orphan: a profile with no Profile Manager. It needs someone to look after it: see Special:Adoptions.",
    url: "https://www.wikitree.com/wiki/Help:Orphaned_Profiles",
  },
  {
    terms: ["unconnected", "unconnected profile"],
    text: "Unconnected: a profile not yet connected, by blood or marriage, to the main tree that most WikiTree profiles (over 85%) are on. Special:Unconnected lists the ones on your Watchlist.",
    url: "https://www.wikitree.com/wiki/Help:Unconnected",
  },
  {
    terms: ["LNAB", "Last Name at Birth"],
    text: "LNAB = Last Name at Birth (also called the proper last name, surname or maiden name); WikiTree IDs are built from it plus a number.",
    url: "https://www.wikitree.com/wiki/Help:Name_Fields#Last_Name_at_Birth",
  },
  {
    terms: ["pre-1700", "pre-1700 profile", "pre-1500", "pre-1700 certification", "pre-1700 certified"],
    questions: ["Who can edit pre-1700 profiles?"],
    text: "Profiles of people born before 1700 (and before 1500) may only be edited by members who have certified for them.",
    url: "https://www.wikitree.com/wiki/Help:Pre-1700_Profiles",
  },
  {
    terms: ["CC7", "connection count"],
    text: "CC7 = the people within 7 degrees of connection by blood or marriage.",
    url: "https://www.wikitree.com/wiki/Help:Connection_Counts",
  },
  // About WikiTree itself (2026-10-14), from WikiTree's own pages (Wikipedia and Help:FAQ name
  // Interesting.com as the business; Help:About_WikiTree, the newer page, says The WikiTree Company).
  // Chris Whitten as owner, president and director: the user, 2026-10-14.
  // A question naming WikiTree only matches a prompt that names it too (chat_wikitree_help.js).
  {
    terms: ["WikiTree", "Free Family Tree"],
    text: "WikiTree: a free, shared family tree built by its members. Its mission is one accurate tree for the world, free forever: one profile per person (duplicates are merged), with privacy controls that protect living and recent family and open up further back in time.",
    url: "https://www.wikitree.com/wiki/Help:About_WikiTree",
  },
  {
    terms: [],
    questions: ["Who founded WikiTree?", "Who started WikiTree?", "Who created WikiTree?", "When did WikiTree open?"],
    text: "WikiTree was founded by Chris Whitten, who earlier started the question-and-answer site FAQ Farm (later WikiAnswers). He registered the name in 2005, began building WikiTree with programmer Brian Casey in early 2008, and public registration opened in November 2008.",
    url: "https://www.wikitree.com/wiki/Help:WikiTree_History",
  },
  {
    terms: [],
    questions: ["Who owns WikiTree?", "Who runs WikiTree?", "Who is behind WikiTree?", "Who is the president of WikiTree?", "Who is in charge of WikiTree?"],
    text: "WikiTree's founder, Chris Whitten, also owns and runs it: he is the owner, president and director of The WikiTree Company, the small business that hosts it. The members grow the tree; a small team looks after the site and its tools, and almost everything else is done by volunteers.",
    url: "https://www.wikitree.com/wiki/Help:About_WikiTree",
  },
  {
    terms: [],
    questions: ["Is WikiTree free?", "Does WikiTree cost anything?", "Is there a premium membership on WikiTree?", "How is WikiTree paid for?", "How is WikiTree funded?"],
    text: "WikiTree is 100% free: every tool and all the content, for every member who signs the Honor Code. There are no premium memberships, and WikiTree has pledged never to charge for access. Costs are kept low and paid by modest ads on public pages.",
    url: "https://www.wikitree.com/wiki/Help:The_Free_Family_Tree",
  },
  {
    terms: [],
    questions: [
      "What will happen to my research after I'm gone?",
      "What happens to my research when I die?",
      "What happens if WikiTree shuts down?",
      "What happens if WikiTree closes?",
      "Does WikiTree back up its data?",
    ],
    text: "WikiTree plans for the long term: daily back-ups; data dumps of the whole public tree that other sites and developers may redistribute if WikiTree ever stops with no successor; and five months of prepaid read-only hosting, with GEDCOM downloads, for an emergency. The WikiTree Pledge means a successor must keep it free. What you add stays available for descendants and future historians.",
    url: "https://www.wikitree.com/wiki/Help:Protecting_Our_Shared_Tree",
  },
  // Genie and the extension it is part of (2026-10-14; from .chat-lab/genie-help-page.wiki;
  // its section on the WBE page, the user).
  {
    terms: ["Genie"],
    text: 'Genie: a WikiTree Browser Extension (WBE) feature for exploring WikiTree in plain words. Type something like "fan chart", "my 3rd cousins born in England" or "how am I related to Harold?" and it finds the people, draws the chart or works out the answer. Much of it works without an AI key (type "help" to see what); with one it understands more.',
    url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#Genie",
  },
  {
    terms: ["WBE", "WikiTree Browser Extension"],
    text: "WBE = WikiTree Browser Extension: a free, community-made browser extension that adds tools and options to WikiTree pages. Each feature can be switched on or off in its options (click the extension's icon).",
    url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
  },
  // Murray, 2026-10-12: the AI said to move a DNA Confirmation section to the testers' profiles.
  // (advice for the AI, not a term to look up)
  {
    terms: [],
    text: "When advising on a profile: a DNA Confirmation section belongs on the profile whose parent link it confirms. It names the testers and their matches (often living descendants), and it is what lets that parent be marked 'confirmed with DNA', so never suggest moving it. Research Notes sections are fine. Don't suggest moving sourced evidence off the profile it supports.",
    url: "https://www.wikitree.com/wiki/Help:DNA_Confirmation",
  },
];

export const WIKITREE_GLOSSARY_FOR_AI = [
  "WikiTree facts (use these; for a 'what is' or 'how do I' question answer in 2-4 sentences and end with the matching help link):",
  ...WIKITREE_GLOSSARY.map((entry) => `- ${entry.text} ${entry.url}`),
].join("\n");
