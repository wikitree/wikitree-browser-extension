/*
Created By: Azure Robinson (Robinson-27225)

Pure logic for the Share Page feature: which page the member is on, what the post says,
what each social network can do, and the links that open each network's composer.
Nothing in here touches the DOM, so it can be unit tested.
*/

export const BASE_URL = "https://www.wikitree.com";
export const BRAND_HASHTAGS = "#WhereGenealogistsCollaborate #CollaborativeGenealogy";

// Matches every WikiTree account tag used below, so a tag can be swapped when the channel changes.
// Longest handles first: "@WikiTree" is a prefix of the others.
export const TAG_RE = /@wikitree@genealysis\.social|@wikitree\.bsky\.social|@WikiTreers|@WikiTree\b/gi;

/**
 * mode: "intent" opens the network's composer with the text filled in,
 *       "link" can only be given the page address (the member pastes the text),
 *       "copy" has no web composer (the member posts in the app).
 * max:  how many pictures one post takes. Planning values: confirm before release.
 * urlWeight: the network counts every link as 23 characters.
 * noTags: the network does not use account tags or hashtags (Reddit posts have a title and a link).
 */
export const CHANNELS = [
  {
    id: "facebook",
    name: "Facebook",
    tag: "@WikiTree",
    limit: 63206,
    mode: "link",
    max: 10,
    note: "Facebook builds the picture from the link preview and cannot be given text through the link. To tag the WikiTree page, delete @WikiTree, type @ again and choose the page from the list. To post a different picture, save it and add it yourself.",
  },
  { id: "bluesky", name: "Bluesky", tag: "@wikitree.bsky.social", limit: 300, mode: "intent", max: 4 },
  {
    id: "mastodon",
    name: "Mastodon",
    tag: "@wikitree@genealysis.social",
    limit: 500,
    mode: "intent",
    max: 4,
    urlWeight: true,
    note: "WikiTree is on genealysis.social. The tag works from any server. Set your own server in the WBE options so the composer opens there.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    tag: "@WikiTree",
    limit: 3000,
    mode: "link",
    max: 9,
    note: "To tag WikiTree on LinkedIn, delete the @WikiTree text, type @ again and choose the company from the list. LinkedIn builds the picture from the link preview.",
  },
  { id: "x", name: "X", tag: "@WikiTreers", limit: 280, mode: "intent", max: 4, urlWeight: true },
  { id: "threads", name: "Threads", tag: "@WikiTreers", limit: 500, mode: "intent", max: 20 },
  {
    id: "instagram",
    name: "Instagram",
    tag: "@WikiTreers",
    limit: 2200,
    mode: "copy",
    max: 10,
    note: "Links in Instagram captions are not clickable. Keep the address in the text so people can copy it, and consider adding it to your bio.",
  },
  { id: "tiktok", name: "TikTok", tag: "@WikiTreers", limit: 2200, mode: "copy", max: 35 },
  { id: "youtube", name: "YouTube", tag: "@WikiTreers", limit: 5000, mode: "copy", max: 1 },
  {
    id: "reddit",
    name: "Reddit",
    tag: "r/wikitree",
    limit: 300,
    mode: "intent",
    max: 1,
    noTags: true,
    note: "Reddit posts have a title, not a caption, so the text is the title and the page address travels as the link. Reddit does not use tags or the hashtags. A link post shows the page preview. To post a picture, save it and choose an image post.",
  },
];

export function getChannel(id) {
  return CHANNELS.find((c) => c.id === id) || CHANNELS[0];
}

export const KIND_LABELS = {
  profile: "Profile",
  space: "Free-space page",
  project: "Project page",
  category: "Category page",
  help: "Help page",
  genealogy: "Surname page",
  imagePage: "Image page",
  fullImage: "Full-screen image",
  treeWidget: "Tree widget",
  treeApp: "Tree Apps view",
};

const BODIES = {
  profile: (t) =>
    `Meet ${t} on WikiTree. Explore their profile, sources and family connections, and help improve the shared tree.`,
  space: (t) =>
    `Read ${t} on WikiTree, a free-space page written and kept up to date by our community of genealogists.`,
  project: (t) => `Volunteers are collaborating on ${t} at WikiTree. Take a look and see how you can join in.`,
  category: (t) => `Browse ${t} on WikiTree to find connected profiles and pages, and add what you know.`,
  help: (t) => `Learning to build your family tree? ${t} on WikiTree walks you through it step by step.`,
  genealogy: (t) =>
    `Explore ${t} on WikiTree: ancestors, cousins and community members, and how their family trees connect.`,
  imagePage: (t) => `A photo shared on WikiTree: ${t}. Every image helps tell a family’s story.`,
  fullImage: (t) => `A photo shared on WikiTree: ${t}. Every image helps tell a family’s story.`,
  treeWidget: (t) => `Explore this family tree view for ${t} on WikiTree, built by volunteers working together.`,
  // ctx.appName is the view's own name (for example "Fan Chart"), ctx.person the person shown
  // ctx.profileLink: the post links to the person's profile, which anyone can open, instead of the view itself
  treeApp: (t, ctx = {}) =>
    ctx.profileLink
      ? `${ctx.appName || "A tree view"}${
          ctx.person ? ` for ${ctx.person}` : ""
        } on WikiTree. Explore their profile and family connections.`
      : `Explore ${ctx.appName || "this view"} in WikiTree’s Tree Apps${ctx.person ? ` for ${ctx.person}` : ""}.`,
};

/**
 * Work out which kind of WikiTree page an address is.
 * @param {string} pathname - location.pathname
 * @returns {string} A key of KIND_LABELS, or "other" for pages the feature does not cover.
 */
export function detectPageKind(pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch (e) {
    path = pathname;
  }
  if (/^\/genealogy\/[^/]+/.test(path)) return "genealogy";
  if (/^\/treewidget\/[^/]+/.test(path)) return "treeWidget";
  if (/^\/apps\/[^/]+-\d+/.test(path)) return "treeApp";
  if (/^\/photo\.php\//.test(path)) return "fullImage";
  if (/^\/photo\/[^/]+\/[^/]+/.test(path)) return "imagePage";
  const wiki = path.match(/^\/wiki\/(.+)$/);
  if (!wiki) return "other";
  const id = wiki[1];
  if (/^Space:/i.test(id)) return "space";
  if (/^Project:/i.test(id)) return "project";
  if (/^Category:/i.test(id)) return "category";
  if (/^Help:/i.test(id)) return "help";
  if (/^[^:/]+-\d+$/.test(id)) return "profile";
  return "other";
}

/**
 * The address to put in the post. Always on the main site, never a staging copy.
 * Tree Apps views keep their #hash because it holds the view. A full-screen image links to its
 * image page, which previews far better than a bare .jpg.
 */
export function shareUrlFor(kind, url) {
  const u = new URL(url, BASE_URL);
  const hash = kind === "treeApp" ? u.hash : "";
  let path = u.pathname;
  if (kind === "fullImage") {
    const m = path.match(/\/([^/]+)\.([A-Za-z0-9]+)$/);
    if (m) path = `/photo/${m[2].toLowerCase()}/${m[1]}`;
  }
  return BASE_URL + path + (kind === "treeApp" ? u.search : "") + hash;
}

/**
 * Turn a photo address from the page (thumbnail or full size) into the full-size address and the
 * image page that shows it. Returns null for anything that is not a WikiTree photo.
 *   /photo.php/thumb/4/49/Robinson-27274.jpg/300px-Robinson-27274.jpg
 *   /photo.php/4/49/Robinson-27274.jpg
 */
export function photoLinks(src) {
  let u;
  try {
    u = new URL(src, BASE_URL);
  } catch (e) {
    return null;
  }
  const m = u.pathname.match(/^\/photo\.php\/(?:thumb\/)?([0-9a-f]\/[0-9a-f]{2}\/([^/]+)\.([A-Za-z0-9]+))/i);
  if (!m) return null;
  const thumbWidth = u.pathname.match(/\/(\d+)px-[^/]+$/);
  return {
    full: `${BASE_URL}/photo.php/${m[1]}`,
    pageUrl: `${BASE_URL}/photo/${m[3].toLowerCase()}/${m[2]}`,
    fileName: `${m[2]}.${m[3]}`,
    thumbWidth: thumbWidth ? parseInt(thumbWidth[1], 10) : null,
  };
}

/** The suggested post for a page and channel. */
export function buildText(kind, title, url, channel, options = {}) {
  const body = (BODIES[kind] || BODIES.profile)(title, options.context || {});
  if (channel.noTags) return body;
  const hashtags = options.hashtags === false ? "" : ` ${BRAND_HASHTAGS}`;
  return `${body}\n\n${url}\n\n${channel.tag}${hashtags}`;
}

/** Swap the account tag in text the member has already edited. */
export function swapTag(text, channel) {
  return text.replace(TAG_RE, channel.tag);
}

/** Length as the network counts it. */
export function measure(text, channel) {
  const t = channel.urlWeight ? text.replace(/https?:\/\/\S+/g, "x".repeat(23)) : text;
  return Array.from(t).length;
}

function cleanHost(instance) {
  const host = (instance || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) ? host : "mastodon.social";
}

/**
 * The link that opens a network's composer, or "" when the network has none.
 * Facebook and LinkedIn only take the page address; the member pastes the text.
 */
export function intentUrl(channel, text, url, instance) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  switch (channel.id) {
    case "x":
      return `https://x.com/intent/post?text=${t}`;
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${t}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${t}`;
    case "mastodon":
      return `https://${cleanHost(instance)}/share?text=${t}`;
    case "reddit":
      return `https://www.reddit.com/r/wikitree/submit?type=LINK&title=${encodeURIComponent(
        text.replace(/\s+/g, " ").trim()
      )}&url=${u}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------------------------
// Life summary for the share card (built from the profile's own data fields, no AI)
// ---------------------------------------------------------------------------------------------

const QUALIFIERS = [
  [/^(about|abt|circa|c\.?)\b/i, "about"],
  [/^(before|bef\.?)\b/i, "before"],
  [/^(after|aft\.?)\b/i, "after"],
];

function yearOf(date) {
  const m = (date || "").match(/\b(\d{3,4})\b/);
  return m ? m[1] : "";
}

/** " in 1901", " about 1901", or "" when there is no usable year. */
function yearPhrase(date) {
  const year = yearOf(date);
  if (!year) return "";
  const q = QUALIFIERS.find(([re]) => re.test((date || "").trim()));
  return ` ${q ? q[1] : "in"} ${year}`;
}

/** "Caledonia, Washington, Missouri, United States" becomes "Caledonia, Missouri". */
export function shortPlace(place) {
  const parts = (place || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return parts.join(", ");
  return `${parts[0]}, ${parts[parts.length - 2]}`;
}

function joinNames(names, max = 3) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  if (extra > 0) shown.push(`${extra} more`);
  if (shown.length < 2) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/**
 * The facts and a short biography for a profile's share card.
 *
 * facts: { firstName, gender: "male" | "female" | "", birth: {date, place}, death: {date, place, age},
 *          parents: [name], spouses: [{name, date, place}], children: [name] }
 *
 * Returns null when there is nothing to say, or when the person could still be living (no death
 * year, and born less than 110 years ago): the card must not reveal facts about living people.
 */
export function lifeSummary(facts, thisYear = new Date().getFullYear()) {
  const birth = facts.birth || {};
  const death = facts.death || {};
  const parents = facts.parents || [];
  const spouses = facts.spouses || [];
  const children = facts.children || [];
  // children may be named only when known to be deceased; the rest are still counted
  const childTotal = Math.max(facts.childCount || 0, children.length);
  const birthYear = parseInt(yearOf(birth.date), 10);
  const deathYear = parseInt(yearOf(death.date), 10);
  if (!birthYear && !deathYear) return null;
  if (!deathYear && thisYear - birthYear < 110) return null;

  const first = (facts.firstName || "").trim().split(/\s+/)[0] || "This person";
  const subject = facts.gender === "male" ? "He" : facts.gender === "female" ? "She" : first;
  const child = facts.gender === "male" ? "son" : facts.gender === "female" ? "daughter" : "child";
  const parent = facts.gender === "male" ? "father" : facts.gender === "female" ? "mother" : "parent";

  const fields = [];
  // names: every line is a person's name, so the card shows them all in bold
  const field = (label, lines, names = false) => {
    const kept = lines.filter(Boolean);
    if (kept.length) fields.push({ label, lines: kept, names });
  };
  field("Born", [birth.date, birth.place]);
  field("Died", [death.date, death.place]);
  field("Parents", parents.slice(0, 2), true);
  field(
    "Spouse",
    spouses.length > 2
      ? [spouses[0].name, `${spouses[1].name} +${spouses.length - 2} more`]
      : spouses.map((s) => s.name).slice(0, 2),
    true
  );

  const sentences = [];
  if (birthYear) {
    const where = birth.place ? ` in ${shortPlace(birth.place)}` : "";
    const who = parents.length ? `, the ${child} of ${joinNames(parents, 2)}` : "";
    sentences.push(`${first} was born${where}${yearPhrase(birth.date)}${who}.`);
  }
  if (spouses.length) {
    const marriage = (s) => `${s.name}${yearPhrase(s.date)}`;
    let text = `${subject} married ${marriage(spouses[0])}`;
    if (spouses[1]) text += `, and later ${marriage(spouses[1])}`;
    if (spouses.length > 2) text += `, and ${spouses.length - 2} other spouse${spouses.length > 3 ? "s" : ""}`;
    sentences.push(`${text}.`);
  }
  if (childTotal) {
    const shown = children.slice(0, 3);
    if (shown.length) {
      const parts = childTotal > shown.length ? [...shown, `${childTotal - shown.length} more`] : shown;
      sentences.push(`${subject} was the ${parent} of ${joinNames(parts, parts.length)}.`);
    } else {
      sentences.push(`${subject} was the ${parent} of ${childTotal} ${childTotal === 1 ? "child" : "children"}.`);
    }
  }
  if (deathYear) {
    const where = death.place ? ` in ${shortPlace(death.place)}` : "";
    const age = death.age ? `, aged ${death.age}` : "";
    sentences.push(`${subject} died${where}${yearPhrase(death.date)}${age}.`);
  }
  return { fields, bio: sentences.join(" ") };
}

// ---------------------------------------------------------------------------------------------
// Who the page is about, and whether it may be shared
// ---------------------------------------------------------------------------------------------

/**
 * The WikiTree ID or page name whose privacy decides whether this page can be shared, or "" when the
 * page has none (categories, projects, help, and images that do not belong to a profile).
 */
export function profileKeyFor(kind, pathname, hash = "") {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch (e) {
    path = pathname;
  }
  const segment = (re) => (path.match(re) || [])[1] || "";
  if (kind === "profile" || kind === "space") return segment(/^\/wiki\/(.+)$/);
  if (kind === "treeWidget") return segment(/^\/treewidget\/([^/]+)/);
  if (kind === "treeApp") {
    const name = new URLSearchParams((hash || "").replace(/^#/, "")).get("name");
    return name || segment(/^\/apps\/([^/]+)/);
  }
  if (kind === "imagePage" || kind === "fullImage") {
    const file = path
      .split("/")
      .pop()
      .replace(/\.[A-Za-z0-9]+$/, "");
    return (file.match(/^([A-Za-z][^/]*?-\d+)(?:-\d+)?$/) || [])[1] || "";
  }
  return "";
}

/** Public (50) and Open (60) profiles only, and never anyone marked as living. */
export function isShareablePrivacy(profile) {
  return !!profile && Number(profile.IsLiving) !== 1 && Number(profile.Privacy) >= 50;
}

// ---------------------------------------------------------------------------------------------
// Tree Apps views
// ---------------------------------------------------------------------------------------------

const APP_NAMES = { fanchart: "Fan Chart", familygroup: "Family Group", cc7: "CC7" };

/** The view named in a Tree Apps address, from `#name=…&view=fanchart`. */
export function viewSlug(hash) {
  return new URLSearchParams((hash || "").replace(/^#/, "")).get("view") || "";
}

/** A readable name for a view when the page itself does not give one: "printer-friendly" becomes "Printer Friendly". */
export function appNameFromSlug(slug) {
  if (!slug) return "";
  if (APP_NAMES[slug]) return APP_NAMES[slug];
  return slug
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------------------------
// Summaries for pages that are not profiles
// ---------------------------------------------------------------------------------------------

/**
 * A section heading as plain text. WikiTree's own "[edit]" link and the Link and URL copy buttons that Scissors adds sit
 * inside the heading, so "Andersonia[edit] Link URL" becomes "Andersonia".
 */
export function cleanHeading(text) {
  return (text || "")
    .replace(/\[\s*edit\s*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?:\s+ID)?(?:\s+Link)?\s+URL$/i, "")
    .trim();
}

function cutAtWord(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/**
 * The opening of a page's text, as whole sentences up to a character budget. Footnote markers like [1] are
 * removed and short fragments (headings, captions) are skipped.
 */
export function leadSummary(paragraphs, maxChars = 330) {
  const sentences = [];
  for (const raw of paragraphs) {
    const text = raw
      .replace(/\[(?:\d+|[a-z]|edit)\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 40) continue;
    const parts = (text.match(/[^.!?]+[.!?]+["')\]]*(?=\s|$)|[^.!?]+$/g) || [text])
      .map((x) => x.trim())
      .filter(Boolean);
    for (const sentence of parts) {
      if ([...sentences, sentence].join(" ").length > maxChars) {
        return sentences.length ? sentences.join(" ") : cutAtWord(sentence, maxChars);
      }
      sentences.push(sentence);
    }
  }
  return sentences.join(" ");
}

/**
 * The facts and short text for the share card of a help, project, free-space or category page.
 *
 * facts: { paragraphs: [text], sections: [heading], counts: { subcategories, pages, profiles } }
 * Returns null for other kinds, or when there is nothing to show.
 */
/** 8840 becomes "8,840th", 1 "1st", 22 "22nd". */
export function ordinal(n) {
  const v = Math.abs(n) % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th";
  return `${n.toLocaleString("en-US")}${suffix}`;
}

/**
 * The numbers on a surname's genealogy hub, read from its text: how many profiles it lists, the surname collaboration
 * score, its rank, how many profiles are Open, and the DNA tests members have taken.
 */
export function parseGenealogyText(text = "") {
  const flat = text.replace(/\s+/g, " ");
  const int = (value) => parseInt(String(value).replace(/,/g, ""), 10);
  const first = (re) => (flat.match(re) || [])[1];
  const result = { profiles: 0, score: null, rank: 0, openProfiles: 0, dna: {} };
  if (first(/Search all ([\d,]+) profiles/i)) result.profiles = int(first(/Search all ([\d,]+) profiles/i));
  if (first(/Surname Collaboration Score:\s*([\d.]+)\s*%/i)) {
    result.score = parseFloat(first(/Surname Collaboration Score:\s*([\d.]+)\s*%/i));
  }
  if (first(/Rank:\s*([\d,]+)\s*(?:st|nd|rd|th)\s+most popular/i)) {
    result.rank = int(first(/Rank:\s*([\d,]+)\s*(?:st|nd|rd|th)\s+most popular/i));
  }
  if (first(/with\s+([\d,]+)\s+Open profiles/i)) result.openProfiles = int(first(/with\s+([\d,]+)\s+Open profiles/i));
  [
    ["y", "Y-Chromosome"],
    ["mt", "mitochondrial"],
    ["au", "autosomal"],
  ].forEach(([key, name]) => {
    const m = flat.match(
      new RegExp(
        `(\\d[\\d,]*)\\s+members?\\s+with the surname.{0,60}?${name} DNA tests?,\\s*connecting\\s+(\\d[\\d,]*)\\s+profiles`,
        "i"
      )
    );
    if (m) result.dna[key] = { members: int(m[1]), profiles: int(m[2]) };
  });
  return result;
}

const BOILERPLATE_SECTIONS =
  /^(sources?|references?|footnotes?|notes?|citations?|bibliography|see also|external links?|further reading|acknowledge?ments?|research notes?|contents)$/i;

const plain = (text) =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The section names worth listing on a card. Standard sections every page has (Sources, References, ...) tell the reader
 * nothing, and neither does a heading that only repeats the page's own title ("Andersonia" on "Andersonia, California One
 * Place Study").
 */
export function usefulSections(sections = [], title = "") {
  const pageTitle = plain(title.replace(/^(Space|Project|Help|Category):/i, ""));
  return sections.map(cleanHeading).filter((heading) => {
    if (!heading || BOILERPLATE_SECTIONS.test(heading)) return false;
    // only a heading that is just part of the title goes: "Andersonia" in "Andersonia, California One Place Study".
    // One that adds to the title ("Topical Projects" on "Help:Projects") stays.
    const name = plain(heading);
    return !(name.length >= 3 && ` ${pageTitle} `.includes(` ${name} `));
  });
}

export function pageSummary(kind, facts = {}) {
  const fields = [];
  let bio = "";
  if (kind === "category") {
    const counts = facts.counts || {};
    const add = (label, n) => {
      if (n) fields.push({ label, lines: [String(n)], names: false });
    };
    add("Subcategories", counts.subcategories);
    add("Pages", counts.pages);
    add("Person profiles", counts.profiles);
    bio =
      "Explore the subcategories, pages and profiles in this category. Check your connections to the ancestors listed here.";
  } else if (kind === "help" || kind === "project" || kind === "space") {
    bio = leadSummary(facts.paragraphs || []);
    const sections = usefulSections(facts.sections || [], facts.title || "");
    if (sections.length) {
      const lines = sections.length > 2 ? [sections[0], `${sections[1]} +${sections.length - 2} more`] : sections;
      fields.push({ label: "On this page", lines, names: true });
    }
  } else if (kind === "genealogy") {
    // a surname hub: "Peasley Genealogy", with the numbers the page shows
    const hub = facts.genealogy || {};
    const surname = (facts.title || "").replace(/\s+Genealogy.*$/i, "").trim();
    const profiles = hub.profiles || (facts.counts || {}).profiles;
    const add = (label, lines, names = false) => fields.push({ label, lines, names });
    if (profiles) add("Profiles", [profiles.toLocaleString("en-US")]);
    if (hub.openProfiles) add("Open profiles", [hub.openProfiles.toLocaleString("en-US")]);
    if (hub.rank) add("Rank", [ordinal(hub.rank), "most popular surname"]);
    if (hub.coordinator) add("Coordinator", [hub.coordinator], true);
    bio =
      profiles && surname
        ? `Explore the ${profiles.toLocaleString(
            "en-US"
          )} ${surname} profiles on WikiTree: ancestors, cousins and community members, and how they connect.`
        : `Explore ${
            surname || "this surname"
          } ancestors, cousins and community members on WikiTree, and how they connect.`;
    if (hub.score != null) bio += ` The surname collaboration score is ${Math.round(hub.score)}%.`;
  } else {
    return null;
  }
  return fields.length || bio ? { fields, bio } : null;
}

const IMPERATIVE = /^(click|double|use|drag|select|hover|scroll|press|tap|choose|enter)\b/i;

/**
 * A short description of what a Tree Apps view is showing right now, for the share card.
 *
 * ctx: { appName, person, slug, generations, description } as read from the page. Views describe themselves with
 * instructions ("Click on the tree and use your mouse wheel to zoom"), so those sentences are dropped and a known
 * view gets a sentence built from what is on screen, such as the number of generations.
 */
export function appSummary(ctx = {}) {
  const { appName = "", person = "", slug = "", generations = "", description = "" } = ctx;
  const owner = person ? `${person}'s` : "a person's";
  const count = parseInt(generations, 10);
  if (slug === "fanchart" || /^fan chart$/i.test(appName)) {
    const over = count ? ` over ${count} generations` : "";
    return `A fan chart of ${owner} ancestors${over}. Each ring is one generation further back.`;
  }
  const flat = description.replace(/\s+/g, " ").trim();
  const about = (flat.match(/[^.!?]+[.!?]+["')\]]*(?=\s|$)|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !IMPERATIVE.test(sentence));
  const text = about.join(" ");
  if (text) return text.length > 220 ? cutAtWord(text, 220) : text;
  if (appName && person) return `${appName} for ${person}, one of the connected tree views in WikiTree’s Tree Apps.`;
  if (appName) return `${appName}, one of the connected tree views in WikiTree’s Tree Apps.`;
  return "";
}

// ---------------------------------------------------------------------------------------------
// Cropping a picture
// ---------------------------------------------------------------------------------------------

/** The shapes a picture can be cropped to. `ratio` is width divided by height; null keeps the whole picture. */
export const CROP_SHAPES = [
  { id: "original", label: "Original", ratio: null },
  { id: "wide", label: "Wide 1.91:1", ratio: 1.91 },
  { id: "square", label: "Square 1:1", ratio: 1 },
  { id: "tall", label: "Tall 4:5", ratio: 0.8 },
];

/**
 * The part of a picture to keep, in the picture's own pixels.
 *
 * @param {number} width - picture width
 * @param {number} height - picture height
 * @param {number|null} ratio - wanted width / height, or null for the whole picture
 * @param {number} fx - 0 to 1, how far along the width the kept part sits (only matters when the picture is wider)
 * @param {number} fy - 0 to 1, how far down the height the kept part sits (only matters when the picture is taller)
 * @returns {{sx: number, sy: number, sw: number, sh: number, axis: "x"|"y"|null}} axis is the direction the kept part
 *          can slide in, or null when there is nothing to choose
 */
export function cropRect(width, height, ratio, fx = 0.5, fy = 0.5) {
  const clamp = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));
  if (!ratio || !width || !height) return { sx: 0, sy: 0, sw: width, sh: height, axis: null };
  if (width / height > ratio) {
    const sw = Math.round(height * ratio);
    return { sx: Math.round((width - sw) * clamp(fx)), sy: 0, sw, sh: height, axis: width - sw > 0 ? "x" : null };
  }
  const sh = Math.round(width / ratio);
  return { sx: 0, sy: Math.round((height - sh) * clamp(fy)), sw: width, sh, axis: height - sh > 0 ? "y" : null };
}

// ---------------------------------------------------------------------------------------------
// Living people stay off the card
// ---------------------------------------------------------------------------------------------

/**
 * Whether a relative's name may appear on a share card: the API says they are not living, and their profile is not
 * Private (level 10). Anything the API did not report is treated as unsafe.
 */
export function isNameSafe(person) {
  return !!person && Number(person.IsLiving) === 0 && Number(person.Privacy) >= 20;
}

/**
 * The WikiTree IDs of a person's parents, spouses and children whose names may be shown, from the API's getRelatives
 * answer for that person.
 */
export function safeRelativeIds(person) {
  const safe = new Set();
  ["Parents", "Spouses", "Children"].forEach((group) => {
    Object.values((person && person[group]) || {}).forEach((relative) => {
      if (isNameSafe(relative) && relative.Name) safe.add(relative.Name);
    });
  });
  return safe;
}

// ---------------------------------------------------------------------------------------------
// Saved file names
// ---------------------------------------------------------------------------------------------

/**
 * What to call a page in a saved file's name: "Robinson-27274", "Andersonia,_California_One_Place_Study" (the Space:,
 * Project:, Category: or Help: prefix is dropped), "PEASLEY", or for a Tree Apps view the person and the view,
 * "Robinson-27274-fanchart".
 */
export function fileIdFor(kind, pathname, hash = "") {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch (e) {
    path = pathname;
  }
  const part = (re) => (path.match(re) || [])[1] || "";
  let id = "";
  if (["profile", "space", "project", "category", "help"].includes(kind)) {
    id = part(/^\/wiki\/(.+)$/).replace(/^(Space|Project|Category|Help):/i, "");
  } else if (kind === "genealogy") {
    id = part(/^\/genealogy\/([^/]+)/);
  } else if (kind === "treeWidget") {
    id = part(/^\/treewidget\/([^/]+)/);
  } else if (kind === "treeApp") {
    const view = viewSlug(hash);
    id = [profileKeyFor(kind, pathname, hash), view].filter(Boolean).join("-");
  } else if (kind === "imagePage" || kind === "fullImage") {
    id = path
      .split("/")
      .pop()
      .replace(/\.[A-Za-z0-9]+$/, "");
  }
  return id.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "page";
}
