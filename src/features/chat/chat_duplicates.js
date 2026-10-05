// C12, "does this person have duplicates?": WikiTree's Special:FindMatches lists
// name-alike candidates, and the Find Matches Scores feature scores them with the
// Duplicate Finder's evidence. The chat fetches that page for the subject and
// reuses the same reader and scorer, so both give the same answer.

import { readResultBlocks } from "../find_matches_scores/find_matches_page";
import { compareScored, fetchProfiles } from "../find_matches_scores/find_matches_core";
import { foldText } from "../find_matches_scores/match_locations";
import { scorePair } from "../find_matches_scores/match_scoring";

const SUBJECT = String.raw`(this\s+(?:person|profile)|the\s+profile\s+person|he|she|they|him|her|them|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const DUPES = String.raw`(?:(?:possible|potential|likely)\s+)?(?:duplicates?|duplicate\s+profiles?|dupes?|matches|matching\s+profiles)`;
const DUPLICATE_PROMPT_RES = [
  new RegExp(String.raw`^(?:does|do|has|have)\s+${SUBJECT}\s+(?:got\s+)?(?:have\s+)?(?:any\s+)?${DUPES}(?:\s+on\s+wikitree)?$`, "i"),
  new RegExp(String.raw`^(?:are\s+there|is\s+there)\s+(?:any\s+|a\s+)?${DUPES}\s+(?:of|for)\s+${SUBJECT}$`, "i"),
  new RegExp(String.raw`^(?:is|could)\s+${SUBJECT}\s+(?:be\s+)?a\s+duplicate(?:\s+profile)?$`, "i"),
  new RegExp(String.raw`^(?:find|search\s+for|look\s+for|check\s+for|show(?:\s+me)?|list)\s+(?:any\s+)?${DUPES}\s+(?:of|for)\s+${SUBJECT}$`, "i"),
  new RegExp(String.raw`^check\s+${SUBJECT}\s+for\s+${DUPES}$`, "i"),
  new RegExp(String.raw`^${DUPES}\s+(?:of|for)\s+${SUBJECT}$`, "i"),
];
const PROFILE_SUBJECT_RE = /^(?:this\s+(?:person|profile)|the\s+profile\s+person|he|she|they|him|her|them)$/i;

/** Returns {target} ("" = the page profile), or null when the prompt isn't a duplicate check. */
export function parseDuplicateCheckPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of DUPLICATE_PROMPT_RES) {
    const match = text.match(re);
    if (match?.[1]) {
      const target = match[1].trim();
      // The patterns are case-insensitive, so check a bare name really is capitalised:
      // "find matches for people born in Kent" is a search, not a duplicate check.
      if (!PROFILE_SUBJECT_RE.test(target) && !/-\d+$/.test(target) && !/^(?:[A-Z][^\s]*\s*)+$/.test(target)) return null;
      return { target: PROFILE_SUBJECT_RE.test(target) ? "" : target };
    }
  }
  if (/^(?:any|are\s+there\s+any)\s+(?:possible\s+)?duplicates$/i.test(text)) return { target: "" };
  return null;
}

/** The Find Matches page for a profile, by its numeric user ID. */
export function findMatchesUrl(userId) {
  return `/index.php?title=Special:FindMatches&action=find&u=${encodeURIComponent(userId)}`;
}

/** Reads the candidate list out of a fetched Special:FindMatches page. */
export function readFindMatchesHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  return readResultBlocks(doc)[0] || null;
}

export function scoreCandidates(anchor, candidates, profilesById) {
  const scored = candidates
    .map((candidate) => {
      const profile = profilesById.get(foldText(candidate.wtId));
      return profile ? { ...candidate, profile, result: scorePair(anchor, profile) } : null;
    })
    .filter(Boolean)
    .sort(compareScored);
  const unscored = candidates.filter((c) => !profilesById.has(foldText(c.wtId))).map((c) => c.wtId);
  return { scored, unscored };
}

function lifeSpan(profile) {
  const year = (value) => (value && !/^0000/.test(value) ? String(value).slice(0, 4) : "");
  const birth = year(profile.BirthDate);
  const death = year(profile.DeathDate);
  return birth || death ? ` (${birth || "?"}–${death})` : "";
}

/** Same cut-off as the Find Matches Scores table's "unlikely match" filter. */
function isWeak(result) {
  return result.rejected || result.score < 65;
}

/** Plain-text answer: likely duplicates with their evidence, and a count of the rest. */
export function buildDuplicateAnswer({ subjectLabel, total, scored, unscored, pageUrl, origin = "https://www.wikitree.com" }) {
  const likely = scored.filter((entry) => !isWeak(entry.result));
  const pageLink = `Find Matches: ${pageUrl}`;
  if (!total) {
    return `WikiTree's Find Matches finds no possible duplicates of ${subjectLabel}.\n${pageLink}`;
  }
  const lines = [];
  if (!likely.length) {
    lines.push(
      `None of the ${total} profile${total === 1 ? "" : "s"} Find Matches lists for ${subjectLabel} look${
        total === 1 ? "s" : ""
      } like a duplicate: all score below 65%.`
    );
  } else {
    lines.push(
      `${likely.length} of the ${total} profile${total === 1 ? "" : "s"} Find Matches lists for ${subjectLabel} ${
        likely.length === 1 ? "looks" : "look"
      } like a possible duplicate:`
    );
    for (const entry of likely) {
      const name = entry.profile.RealName || entry.profile.FirstName || entry.wtId;
      const fullName = [name, entry.profile.LastNameAtBirth].filter(Boolean).join(" ");
      const why = (entry.result.reasons || []).slice(0, 3).join(" ");
      const warn = (entry.result.warnings || []).slice(0, 2).join(" ");
      lines.push(
        `- ${fullName} (${entry.wtId})${lifeSpan(entry.profile)}: ${entry.result.score}%.` +
          (why ? ` ${why}` : "") +
          (warn ? ` Caution: ${warn}` : "") +
          (entry.compareUrl ? ` Compare: ${origin}${entry.compareUrl.replace(/^https?:\/\/[^/]+/, "")}` : "")
      );
    }
  }
  if (unscored.length) {
    lines.push(`${unscored.length} could not be scored (private or merged away): ${unscored.join(", ")}.`);
  }
  lines.push("A score is evidence, not proof: compare the profiles before proposing a merge.");
  lines.push(pageLink);
  return lines.join("\n");
}

/**
 * Runs the whole check. `person` needs Id and Name. `fetchText(url)` returns the page HTML
 * (injected so tests needn't touch the network).
 */
export async function runDuplicateCheck(appId, person, fetchText) {
  const relativeUrl = findMatchesUrl(person.Id);
  const origin = typeof location !== "undefined" && /^https?:/.test(location.origin) ? location.origin : "https://www.wikitree.com";
  const pageUrl = `${origin}${relativeUrl}`;
  const html = await fetchText(relativeUrl);
  const block = readFindMatchesHtml(html);
  const subjectLabel = `${person.RealName || person.Name} (${person.Name})`;
  if (!block) {
    if (!/section[^>]+id="Results"/i.test(String(html || "")) && /log\s*in/i.test(String(html || ""))) {
      return `Find Matches needs you to be logged in to WikiTree.\n${pageUrl}`;
    }
    return buildDuplicateAnswer({ subjectLabel, total: 0, scored: [], unscored: [], pageUrl });
  }
  const profilesById = await fetchProfiles(appId, [person.Name, ...block.candidates.map((c) => c.wtId)]);
  const anchor = profilesById.get(foldText(person.Name));
  if (!anchor) {
    return `I couldn't load ${subjectLabel} to compare against. Find Matches lists ${block.candidates.length} candidates.\n${pageUrl}`;
  }
  const { scored, unscored } = scoreCandidates(anchor, block.candidates, profilesById);
  return buildDuplicateAnswer({ subjectLabel, total: block.candidates.length, scored, unscored, pageUrl, origin });
}
