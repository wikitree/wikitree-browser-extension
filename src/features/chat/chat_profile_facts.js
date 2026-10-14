// Q3/Q5/Q6 (live, 2026-10-03): "who manages this profile?", "does she have a
// photo?" (the AI said no; she has one), "what templates are on her profile?"
// (WT+ declined). getProfile has these fields; this reads them.

import { linesWithMore } from "./chat_more_text";
import { cleanSourceText } from "./chat_sources";

const OWNER = String.raw`(this\s+profile|this\s+person|the\s+profile|her(?:\s+profile)?|his(?:\s+profile)?|their(?:\s+profile)?|she|he|they|it|my\s+profile|me|[A-Z][A-Za-z'_ -]*?-\d+(?:['’]s(?:\s+profile)?)?)`;

const PATTERNS = [
  { fact: "manager", re: new RegExp(String.raw`^who\s+(?:manages|is\s+managing)\s+${OWNER}$`, "i") },
  { fact: "manager", re: new RegExp(String.raw`^who\s+(?:is|are)\s+(?:the\s+)?(?:profile\s+)?managers?\s+(?:of|for)\s+${OWNER}$`, "i") },
  { fact: "manager", re: new RegExp(String.raw`^(?:who\s+is|what\s+is)\s+${OWNER}\s+(?:profile\s+)?managers?$`, "i") },
  { fact: "manager", re: new RegExp(String.raw`^(?:is|does)\s+${OWNER}\s+(?:orphaned|an\s+orphan|have\s+a\s+(?:profile\s+)?manager)$`, "i") },
  { fact: "photo", re: new RegExp(String.raw`^(?:does|do)\s+${OWNER}\s+have\s+(?:a|any)\s+(?:photos?|pictures?|images?|portraits?)$`, "i") },
  { fact: "photo", re: new RegExp(String.raw`^is\s+there\s+(?:a|any)\s+(?:photos?|pictures?|images?|portraits?)\s+(?:of|on|for)\s+${OWNER}$`, "i") },
  { fact: "templates", re: new RegExp(String.raw`^(?:what|which)\s+templates\s+(?:are|is)\s+(?:on|in|used\s+(?:on|in))\s+${OWNER}$`, "i") },
  { fact: "templates", re: new RegExp(String.raw`^(?:what|which)\s+templates\s+(?:does|do)\s+${OWNER}\s+(?:have|use)$`, "i") },
  { fact: "touched", re: new RegExp(String.raw`^when\s+was\s+${OWNER}\s+last\s+(?:edited|modified|updated|changed|touched)$`, "i") },
  { fact: "touched", re: new RegExp(String.raw`^when\s+was\s+the\s+last\s+(?:edit|change|update)\s+(?:to|on|of)\s+${OWNER}$`, "i") },
  // Connected: on the global tree. "is Ellen connected to me?" is a connection lookup, so only
  // a bare "connected" or "connected to the (global|main|big) tree" is this fact.
  { fact: "connected", re: new RegExp(String.raw`^is\s+${OWNER}\s+connected(?:\s+to\s+the\s+(?:global|main|big|world)\s+(?:family\s+)?tree)?$`, "i") },
  { fact: "noChildren", re: new RegExp(String.raw`^(?:is|does)\s+${OWNER}\s+(?:marked|have)\s+(?:as\s+)?(?:having\s+)?(?:the\s+)?["“]?no\s+more\s+children["”]?(?:\s+(?:box|checkbox|flag|set|checked|ticked))?$`, "i") },
  // EditCount is the member's contribution count, not edits to the profile.
  { fact: "contributions", re: new RegExp(String.raw`^how\s+many\s+(?:contributions|edits)\s+(?:does|has|did)\s+${OWNER}\s+(?:have|made|make)$`, "i") },
  // "when was this profile created?" (Created, live Q4) / "who created this profile?" (Creator).
  { fact: "created", re: new RegExp(String.raw`^when\s+was\s+${OWNER}\s+(?:created|made|started|added(?:\s+to\s+wikitree)?)$`, "i") },
  { fact: "created", re: new RegExp(String.raw`^who\s+(?:created|made|started|added)\s+${OWNER}$`, "i") },
  { fact: "created", re: new RegExp(String.raw`^who\s+is\s+(?:the\s+)?creator\s+of\s+${OWNER}$`, "i") },
  { fact: "privacy", re: new RegExp(String.raw`^what\s+is\s+${OWNER}\s+privacy(?:\s+(?:level|setting))?$`, "i") },
  { fact: "privacy", re: new RegExp(String.raw`^what(?:\s+privacy\s+level|['’]s\s+the\s+privacy(?:\s+level)?)\s+(?:is|of|on)\s+${OWNER}$`, "i") },
  { fact: "privacy", re: new RegExp(String.raw`^is\s+${OWNER}\s+(?:public|private|open)$`, "i") },
  // Q2/Q8 (2026-10-14: needed the AI): "what categories is she in?", "does she have research notes?"
  { fact: "categories", re: new RegExp(String.raw`^(?:what|which)\s+categor(?:y|ies)\s+(?:is|are|was|were)\s+${OWNER}\s+in$`, "i") },
  { fact: "categories", re: new RegExp(String.raw`^(?:what|which)\s+categor(?:y|ies)\s+(?:is|are)\s+(?:on|in)\s+${OWNER}$`, "i") },
  { fact: "categories", re: new RegExp(String.raw`^(?:what|which)\s+categor(?:y|ies)\s+(?:does|do)\s+${OWNER}\s+(?:have|belong\s+to)$`, "i") },
  { fact: "categories", re: new RegExp(String.raw`^(?:is|does)\s+${OWNER}\s+(?:in|have)\s+any\s+categor(?:y|ies)$`, "i") },
  { fact: "categories", re: new RegExp(String.raw`^(?:what\s+are|list|show(?:\s+me)?)\s+${OWNER}\s+categories$`, "i") },
  { fact: "researchNotes", re: new RegExp(String.raw`^(?:does|do)\s+${OWNER}\s+have\s+(?:any\s+)?research\s+notes?$`, "i") },
  { fact: "researchNotes", re: new RegExp(String.raw`^(?:are|is)\s+there\s+(?:any\s+)?research\s+notes?\s+(?:on|in|for)\s+${OWNER}$`, "i") },
  { fact: "researchNotes", re: new RegExp(String.raw`^(?:what\s+(?:do|does)\s+|show(?:\s+me)?\s+|what\s+are\s+)?${OWNER}\s+research\s+notes?(?:\s+says?)?$`, "i") },
];

function ownerKey(text) {
  const raw = String(text || "")
    .trim()
    .replace(/['’]s(?:\s+profile)?$/i, "")
    .replace(/\s+profile$/i, "");
  if (/^(?:my|me)$/i.test(raw)) return "me";
  if (/-\d+$/.test(raw)) return raw;
  return "";
}

/** {owner, fact} or null; owner "" is the page profile, "me" the user, else a WikiTree ID. */
export function parseProfileFactPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { fact, re } of PATTERNS) {
    const match = text.match(re);
    if (match) return { owner: ownerKey(match[1]), fact };
  }
  return null;
}

const MAX_NOTES_CHARS = 700;

/** The text under a Research Notes heading, as plain text; null when there's no such heading. */
export function researchNotesText(bio) {
  const section = String(bio || "").match(/^==+\s*Research\s+Notes?\s*==+[ \t]*$([\s\S]*?)(?=^==[^=]|(?![\s\S]))/im);
  if (!section) return null;
  return section[1]
    .split("\n")
    .map(cleanSourceText)
    .filter(Boolean)
    .join("\n");
}

export const PRIVACY_LEVELS = {
  10: "Unlisted",
  20: "Private",
  30: "Private with public biography",
  35: "Private with public family tree",
  40: "Private with public biography and family tree",
  50: "Public",
  60: "Open",
};

function formatTouched(value) {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

/**
 * profile: getProfile's profile object; label: "Ellen (Cook-8721)"; creatorLabel: the Creator's name, if looked up;
 * categories: getCategories' titles (null if it failed). researchNotes needs the profile's wikitext Bio.
 */
export function buildProfileFactAnswer(profile, fact, label, { creatorLabel = "", categories = null } = {}) {
  if (fact === "categories") {
    if (!Array.isArray(categories)) return `I couldn't read the categories for ${label}.`;
    if (!categories.length) return `${label} isn't in any categories.`;
    const names = categories.map((name) => `- ${String(name).replace(/_/g, " ")}`);
    return `${label} is in ${names.length} categor${names.length === 1 ? "y" : "ies"}:\n${linesWithMore(names, 20, { after: "" })}`;
  }
  if (fact === "researchNotes") {
    const bio = profile?.Bio ?? profile?.bio; // the API returns "bio"
    if (typeof bio !== "string") return `I couldn't read ${label}'s biography, so I can't tell. (It may be private.)`;
    const notes = researchNotesText(bio);
    if (notes === null) return `No, ${label}'s biography has no Research Notes section.`;
    if (!notes) return `${label}'s biography has a Research Notes heading, but nothing under it.`;
    const shown = notes.length > MAX_NOTES_CHARS ? `${notes.slice(0, MAX_NOTES_CHARS - 1)}… (the rest is on the profile)` : notes;
    return `Yes, ${label} has research notes:\n${shown}`;
  }
  if (fact === "connected") {
    if (profile?.Connected === undefined || profile?.Connected === null) return `WikiTree didn't say whether ${label} is connected.`;
    return Number(profile.Connected) === 1
      ? `Yes, ${label} is connected to WikiTree's global family tree.`
      : `No, ${label} is not connected to WikiTree's global family tree yet.`;
  }
  if (fact === "noChildren") {
    return Number(profile?.NoChildren) === 1
      ? `Yes, ${label} is marked "no more children".`
      : `No, ${label} isn't marked "no more children".`;
  }
  if (fact === "contributions") {
    if (Number(profile?.IsMember) !== 1) return `${label} isn't a WikiTree member, so there's no contribution count.`;
    return `${label} has made ${Number(profile?.EditCount || 0).toLocaleString()} contributions on WikiTree.`;
  }
  if (fact === "created") {
    const date = formatTouched(profile?.Created);
    const by = creatorLabel ? ` by ${creatorLabel}` : Number(profile?.Creator) > 0 ? ` by user Id ${profile.Creator}` : "";
    return date ? `${label} was created on ${date}${by}.` : `WikiTree didn't give a creation date for ${label}${by ? ` (created${by})` : ""}.`;
  }
  if (fact === "manager") {
    const managers = (Array.isArray(profile?.Managers) ? profile.Managers : []).map((m) => m?.Name).filter(Boolean);
    if (managers.length) return `${label} is managed by ${managers.join(", ")}.`;
    if (Number(profile?.Manager) > 0) return `${label} has a manager (user Id ${profile.Manager}), but WikiTree didn't give the name.`;
    return `${label} has no profile manager, so it's an orphaned profile. Any WikiTree member can adopt it.`;
  }
  if (fact === "photo") {
    return profile?.Photo
      ? `Yes, ${label} has a primary photo (${profile.Photo}).`
      : `${label} has no primary photo. (Other images may still be attached to the profile.)`;
  }
  if (fact === "templates") {
    const templates = (Array.isArray(profile?.Templates) ? profile.Templates : []).map((t) => t?.name).filter(Boolean);
    if (!templates.length) return `${label} has no templates.`;
    const unique = [...new Set(templates)];
    return `${label} uses ${unique.length} template${unique.length === 1 ? "" : "s"}: ${unique.map((name) => `{{${name}}}`).join(", ")}.`;
  }
  if (fact === "touched") {
    const date = formatTouched(profile?.Touched);
    // Touched is usually the last edit, but other changes (e.g. a template's output) also set it.
    return date
      ? `${label} was last changed on ${date}. That's usually an edit, but other changes, such as an update to a template the profile uses, can also set this date.`
      : `WikiTree didn't give a last-changed date for ${label}.`;
  }
  if (fact === "privacy") {
    const level = PRIVACY_LEVELS[Number(profile?.Privacy)];
    return level ? `${label}'s privacy level is ${level}.` : `WikiTree didn't give the privacy level for ${label}.`;
  }
  return null;
}

export const PROFILE_FACT_FIELDS = "Id,Name,RealName,Manager,Managers,Touched,Created,Creator,Photo,Templates,Privacy,Connected,NoChildren,IsMember,EditCount";
