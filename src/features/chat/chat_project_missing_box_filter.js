function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’`\s\[]+|["“”'‘’`\s\]]+$/g, "")
    .trim();
}

function normalizeProjectName(rawValue) {
  const cleaned = stripSurroundingQuotes(rawValue)
    .replace(/\s{2,}/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .trim();

  if (!cleaned) {
    return { projectName: "", templateHint: "" };
  }

  const hasProjectSuffix = /\bproject$/i.test(cleaned);
  const projectName = hasProjectSuffix ? cleaned.replace(/\s+project$/i, " Project") : `${cleaned} Project`;
  const templateHint = projectName.replace(/\s+project$/i, "").trim() || projectName;

  return { projectName, templateHint };
}

const PROJECT_NAME_STOP_WORDS = new Set([
  "profiles", "profile", "people", "in", "by", "of", "for", "the", "managed", "with", "and", "but", "all",
  "which", "what", "who", "are", "is", "that",
]);

// Other wordings of the same request (variant testing, 2026-10-02): "England
// project profiles without a project box", "England Project managed profiles
// missing the project box", "profiles managed by the England project with no
// project box". Needs a missing/no word before "project box" and a
// "<name> project" elsewhere.
function findProjectNameNearMissingBox(text) {
  if (!/\b(?:no|missing|without|lacking)\b(?:\s+\w+){0,2}\s+project\s*box\b/i.test(text)) {
    return "";
  }
  const withoutBox = text.replace(/\bproject\s*box(?:es)?\b/gi, " ");
  const match = withoutBox.match(/^(.*?)\bproject\b/i);
  if (!match) {
    return "";
  }
  const words = match[1].trim().split(/\s+/).filter(Boolean);
  const nameWords = [];
  for (let index = words.length - 1; index >= 0 && nameWords.length < 4; index -= 1) {
    const word = words[index].replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!word || PROJECT_NAME_STOP_WORDS.has(word.toLowerCase())) break;
    nameWords.unshift(word);
  }
  return nameWords.join(" ");
}

export function parseProjectMissingBoxPrompt(queryText) {
  const text = stripSurroundingQuotes(
    String(queryText || "")
      .trim()
      .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
      .replace(/^\s*(?:me\s+)?/i, "")
      .replace(/[.!?]+$/g, "")
      .trim()
  );
  if (!text) {
    return null;
  }

  const patterns = [
    /^(?:profiles?|people)\s+in\s+(.+?)\s+(?:but|and)\s+(?:(?:with\s+)?(?:no|missing)|without)\s+(?:the\s+)?project\s+box(?:\s+in\s+bio(?:graphy)?)?$/i,
    /^(?:profiles?|people)\s+managed\s+by\s+(.+?)\s+(?:but|and)\s+(?:(?:with\s+)?(?:no|missing)|without)\s+(?:the\s+)?project\s+box(?:\s+in\s+bio(?:graphy)?)?$/i,
  ];

  let projectText = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      projectText = match[1];
      break;
    }
  }

  if (!projectText) {
    projectText = findProjectNameNearMissingBox(text);
  }
  if (!projectText) {
    return null;
  }

  const { projectName, templateHint } = normalizeProjectName(projectText);
  if (!projectName || !templateHint) {
    return null;
  }

  return {
    projectName,
    templateHint,
    understood: `profiles in ${projectName} but missing the project box in the bio`,
  };
}

export function isLikelyProjectMissingBoxPrompt(queryText) {
  return parseProjectMissingBoxPrompt(queryText) !== null;
}
