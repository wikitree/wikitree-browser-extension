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
