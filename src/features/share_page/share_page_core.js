/*
Created By: TODO author name (TODO WikiTree ID)

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
  if (children.length) sentences.push(`${subject} was the ${parent} of ${joinNames(children)}.`);
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
      .replace(/\[(?:\d+|[a-z])\]/gi, "")
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
    const sections = facts.sections || [];
    if (sections.length) {
      const lines = sections.length > 2 ? [sections[0], `${sections[1]} +${sections.length - 2} more`] : sections;
      fields.push({ label: "On this page", lines, names: true });
    }
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
