// C12, "does this person have duplicates?": WikiTree's Special:FindMatches lists
// name-alike candidates, and the Find Matches Scores feature scores them with the
// Duplicate Finder's evidence. The chat fetches that page for the subject and
// reuses the same reader and scorer, so both give the same answer.

import { readResultBlocks } from "../find_matches_scores/find_matches_page";
import { compareScored, fetchProfiles } from "../find_matches_scores/find_matches_core";
import { buildProfiles } from "../find_matches_scores/find_matches_profiles";
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

/** One likely duplicate as plain parts: {wtId, name, span ("1823–1889"), score, why, warn}. */
export function describeDuplicate(entry) {
  const name = entry.profile.RealName || entry.profile.FirstName || entry.wtId;
  return {
    wtId: entry.wtId,
    name: [name, entry.profile.LastNameAtBirth].filter(Boolean).join(" "),
    span: lifeSpan(entry.profile).replace(/^ \((.*)\)$/, "$1"),
    score: entry.result.score,
    why: (entry.result.reasons || []).slice(0, 3).join(" "),
    warn: (entry.result.warnings || []).slice(0, 2).join(" "),
  };
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
export async function runDuplicateCheck(appId, person, fetchText, { readFinder = readDuplicateFinder } = {}) {
  // The Duplicate Finder's scored pairs first, when it has looked at this profile (the user,
  // 2026-10-07); Find Matches otherwise, or when the Finder lists none.
  const finder = await readFinder(person.Name);
  const subjectLabel = `${person.RealName || person.Name} (${person.Name})`;
  if (finder?.lookupAvailable && finder.likely.length) return buildFinderAnswer(subjectLabel, finder, findMatchesUrl(person.Id));
  const found = await findDuplicates(appId, person, fetchText);
  if (finder?.lookupAvailable && !found.loginNeeded) {
    return `The Duplicate Finder lists no possible duplicates of ${subjectLabel}.\n${found.noAnchor ? `Find Matches lists ${found.total} candidates.\n${found.pageUrl}` : buildDuplicateAnswer(found)}`;
  }
  if (found.loginNeeded) return `Find Matches needs you to be logged in to WikiTree.\n${found.pageUrl}`;
  if (found.noAnchor) {
    return `I couldn't load ${found.subjectLabel} to compare against. Find Matches lists ${found.total} candidates.\n${found.pageUrl}`;
  }
  return buildDuplicateAnswer(found);
}

/**
 * The check as data: {subjectLabel, total, scored, unscored, likely, pageUrl, origin}, or with
 * loginNeeded / noAnchor set. `pagePerson` (API-shaped: Id, Name, FirstName, BirthDate …) stands
 * in for the subject when the API doesn't have it yet (Beacall-491 on staging, 2026-10-07).
 */
export async function findDuplicates(appId, person, fetchText, { pagePerson = null } = {}) {
  const relativeUrl = findMatchesUrl(person.Id);
  const origin = typeof location !== "undefined" && /^https?:/.test(location.origin) ? location.origin : "https://www.wikitree.com";
  const pageUrl = `${origin}${relativeUrl}`;
  const subjectLabel = `${person.RealName || person.Name} (${person.Name})`;
  const base = { subjectLabel, total: 0, scored: [], unscored: [], likely: [], pageUrl, origin };
  const html = await fetchText(relativeUrl);
  const block = readFindMatchesHtml(html);
  if (!block) {
    if (!/section[^>]+id="Results"/i.test(String(html || "")) && /log\s*in/i.test(String(html || ""))) return { ...base, loginNeeded: true };
    return base;
  }
  const candidates = block.candidates.filter((c) => foldText(c.wtId) !== foldText(person.Name));
  const profilesById = await fetchProfiles(appId, [person.Name, ...candidates.map((c) => c.wtId)]);
  let anchor = profilesById.get(foldText(person.Name));
  if (!anchor && pagePerson) anchor = buildProfiles(new Map([[String(pagePerson.Id), pagePerson]]), [pagePerson.Name]).get(foldText(pagePerson.Name));
  if (!anchor) return { ...base, total: candidates.length, noAnchor: true };
  const { scored, unscored } = scoreCandidates(anchor, candidates, profilesById);
  return { ...base, total: candidates.length, scored, unscored, likely: scored.filter((entry) => !isWeak(entry.result)) };
}

// The Duplicate Finder app (the Duplicates feature's data, via the background's duplicatesRead):
// already scored pairs for profiles it has scanned. A new profile isn't there yet, so the
// relatives search falls back to Find Matches (the user, 2026-10-07).
const finderId = (profile) => String(profile?.wikitree_id || profile?.profile_id || profile?.sort_id || "");
const finderDate = (value) => (value && !/^0000/.test(value) && value !== "0" ? String(value).slice(0, 4) : "");

/** The Finder's pairs that include `wtId`, as {source, lookupAvailable, total, likely: [{wtId, name, span, score, why, warn}]}. */
export function duplicatesFromFinder(wtId, payload) {
  const want = String(wtId).toLowerCase();
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const group = groups.find((g) => String(g?.requested_wikitree_id || "").toLowerCase() === want) || groups[0] || {};
  const profiles = [...(Array.isArray(group.visible_profiles) ? group.visible_profiles : []), group.current_profile, group.anchor_profile].filter(Boolean);
  const byId = new Map(profiles.map((profile) => [finderId(profile).toLowerCase(), profile]));
  const pairs = (Array.isArray(group.visible_pairs) ? group.visible_pairs : []).filter((pair) =>
    [pair?.person1, pair?.person2].some((id) => String(id || "").toLowerCase() === want)
  );
  const likely = pairs
    .map((pair) => {
      const other = String(pair.person1 || "").toLowerCase() === want ? pair.person2 : pair.person1;
      const profile = byId.get(String(other || "").toLowerCase()) || {};
      const first = [profile.first_name || profile.FirstName, profile.middle_name || profile.MiddleName].filter(Boolean).join(" ");
      const last = profile.last_name_at_birth || profile.LastNameAtBirth || "";
      const birth = finderDate(profile.birth_date_display || profile.BirthDate);
      const death = finderDate(profile.death_date_display || profile.DeathDate);
      const warnings = (Array.isArray(pair.warnings) ? pair.warnings : []).filter(Boolean).map(String);
      return {
        wtId: String(other || ""),
        name: [first, last].filter(Boolean).join(" "),
        span: birth || death ? `${birth || "?"}–${death}` : "",
        score: Number(pair.score) || 0,
        percent: false,
        why: `Duplicate Finder score ${pair.score ?? "?"}${pair.level ? ` (${pair.level})` : ""}`,
        warn: warnings.slice(0, 2).join(" "),
      };
    })
    .filter((entry) => entry.wtId)
    .sort((a, b) => b.score - a.score);
  return { source: "finder", lookupAvailable: payload?.lookup_available !== false && Boolean(groups.length), total: likely.length, likely };
}

/** "Does X have duplicates?" from the Duplicate Finder's pairs. */
export function buildFinderAnswer(subjectLabel, finder, findMatchesPath = "") {
  const count = finder.likely.length;
  const lines = [`The Duplicate Finder lists ${count} possible duplicate${count === 1 ? "" : "s"} of ${subjectLabel}:`];
  for (const entry of finder.likely) {
    lines.push(`- ${entry.name || entry.wtId} (${entry.wtId})${entry.span ? ` ${entry.span}` : ""}: ${entry.why}.` + (entry.warn ? ` Caution: ${entry.warn}` : ""));
  }
  if (findMatchesPath) {
    const origin = typeof location !== "undefined" && /^https?:/.test(location.origin) ? location.origin : "https://www.wikitree.com";
    lines.push(`Find Matches: ${origin}${findMatchesPath}`);
  }
  return lines.join("\n");
}

/** Asks the background for the Duplicate Finder's data; null when it can't be read. */
export async function readDuplicateFinder(wtId) {
  try {
    const response = await chrome.runtime.sendMessage({ action: "duplicatesRead", requestedWikiTreeId: wtId, includeResolved: false });
    return response?.success ? duplicatesFromFinder(wtId, response.data) : null;
  } catch (error) {
    console.warn("wbe: Duplicate Finder read failed", error);
    return null;
  }
}
