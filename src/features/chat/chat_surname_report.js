// WikiTree+'s surname improvements report (WT+ news, 2026-08-30, for WikiTree's coming surname
// pages): a surname's open profiles that are unsourced, unconnected or unmerged, have a low
// Content Rank (1-3) or have suggestions; improving them raises the surname's Collaboration Score
// (plus.wikitree.com/function/wtSurname/Surname.htm?query=Whitten, live, 2026-10-16).
//   "surname improvements for Whitten", "Whitten surname report",
//   "how can I improve the Whitten surname?"

const NAME = "([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*(?:\\s+[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*){0,2}?)";
const LEAD = "(?:(?:show|give|open|find|get)\\s+(?:me\\s+)?)?(?:the\\s+|a\\s+)?";
const REPORT = "(?:surname\\s+improvements?(?:\\s+report)?|surname\\s+report|surname\\s+collaboration\\s+score)";
const PATTERNS = [
  new RegExp(`^${LEAD}${REPORT}\\s+(?:for|on|of)\\s+(?:the\\s+)?${NAME}(?:\\s+(?:surname|name|family))?$`, "i"),
  new RegExp(`^${LEAD}${NAME}\\s+${REPORT}$`, "i"),
  new RegExp(`^how\\s+(?:can|do|could|should)\\s+(?:I|we)\\s+improve\\s+(?:the\\s+)?${NAME}\\s+(?:surname|name)(?:\\s+profiles)?$`, "i"),
];

export function parseSurnameReportPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[?!.\s]+$/, "");
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) return { surname: match[1].trim() };
  }
  return null;
}

export function surnameReportUrl(surname) {
  return `https://plus.wikitree.com/function/wtSurname/Surname.htm?query=${encodeURIComponent(String(surname || "").trim())}`;
}

export function surnameReportAnswer(surname) {
  const name = String(surname || "").trim();
  return {
    message:
      `WikiTree+ has a surname improvements report for ${name}. It lists the ${name} open profiles that are unsourced, ` +
      "unconnected or unmerged, have a low Content Rank (1 to 3) or have suggestions. " +
      `Improving them raises the ${name} surname's Collaboration Score.`,
    actions: [{ label: `${name} surname report`, actionType: "external-link", url: surnameReportUrl(name) }],
  };
}
