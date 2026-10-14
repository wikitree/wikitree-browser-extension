import { extractYearFromDate, isWikiTreeId } from "./chat_router";
import { choiceButton, linesWithMore } from "./chat_more_text";

// Shown before "…and N more" opens the rest (every number still works as a reply).
const SHOWN_CANDIDATES = 20;

export function shouldOfferDisambiguation(rankedMatches) {
  if (!Array.isArray(rankedMatches) || rankedMatches.length < 2) return false;
  const top = rankedMatches[0];
  const second = rankedMatches[1];
  if (!top?.match || !second?.match) return false;
  const topScore = top.score || 0;
  const secondScore = second.score || 0;
  // Offer disambiguation when second candidate is plausible and gap is small.
  return secondScore >= 60 && topScore - secondScore < 80;
}

export function buildDisambiguationMessage(candidates, targetName, options = {}) {
  const lines = candidates.map((c, i) => {
    const wtId = c.Name || "";
    const displayName = c.RealName || c?.Derived?.ShortName || wtId;
    const birthYear = extractYearFromDate(c.BirthDate);
    const deathYear = extractYearFromDate(c.DeathDate);
    // Living people usually expose only a decade; show it (plus a "living"
    // marker) so the candidate is recognizable in the list.
    const birthDecade = /^\d{4}s$/.test(String(c.BirthDateDecade || "")) ? String(c.BirthDateDecade) : "";
    const loc = c.BirthLocation ? ` in ${c.BirthLocation}` : "";
    const birthPart = Number.isFinite(birthYear)
      ? `b. ${birthYear}${loc}`
      : birthDecade
      ? `b. ${birthDecade}${loc}`
      : loc
      ? `b. ?${loc}`
      : "";
    const deathPart = Number.isFinite(deathYear) ? `d. ${deathYear}` : Number(c.IsLiving) === 1 ? "living" : "";
    const dateParts = [birthPart, deathPart].filter(Boolean);
    const dates = dateParts.length ? ` (${dateParts.join(", ")})` : "";
    const label = displayName !== wtId ? `${wtId} - ${displayName}` : wtId;
    return `  ${choiceButton(wtId || i + 1)}${i + 1}. ${label}${dates}`;
  });
  return [
    `${options.heading || `I found ${lines.length > 8 ? `${lines.length} people` : "several people"} named "${targetName}". Which one did you mean?`}\n`,
    linesWithMore(lines, SHOWN_CANDIDATES),
    `\nClick Choose, or reply with a number (1, 2, 3...) or a WikiTree ID.${lines.length > 8 ? " Adding a birth year or place to the name narrows it down." : ""}`,
  ].join("\n");
}

export function resolveDisambiguationReply(rawPrompt, candidates) {
  const text = String(rawPrompt || "").trim();
  const numMatch = text.match(/^(\d+)(?:st|nd|rd|th)?\s*(?:one)?$/i);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < candidates.length) return candidates[idx];
  }

  const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
  for (let i = 0; i < ordinals.length; i++) {
    if (new RegExp(`\\b${ordinals[i]}\\b`, "i").test(text)) {
      return candidates[i] || null;
    }
  }

  if (isWikiTreeId(text)) {
    const exact = candidates.find((c) => c.Name === text);
    return exact || { Name: text };
  }

  return null;
}
