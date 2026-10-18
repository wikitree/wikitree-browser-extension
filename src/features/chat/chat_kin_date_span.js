// Spans of years after "born" or "died", shared by the kin readers (chat_router) and the relatives filter.
// "between 1800 and 1850", "in the 1850s", "in the 1700s" (the century), "in the 19th century", "in 1850"
// (2026-10-17: "my ancestors born in the 1700s" filtered on a place called "the 1700s"). Read by kinDateSpan
// as "1800-1850", the dateValue of a "between" constraint.
// ("born 1700-1799" too: Genie asks what "the 1700s" means and resends it so)
export const KIN_DATE_SPAN = String.raw`(?:(?:(?:between|from|in)\s+)?(\d{4})\s*(?:and|to|[-–])\s*(\d{4})|in\s+the\s+(\d{3}0)['’]?s|in\s+the\s+(\d{1,2})(?:st|nd|rd|th)\s+century|in\s+(\d{4}))`;
export const KIN_DATE_SPAN_PLACE_RE = /^(?:the\s+)?(?:\d{4}\s*[-–]\s*\d{4}|\d{3}0['’]?s|\d{1,2}(?:st|nd|rd|th)\s+century|\d{4})$/i;
export function kinDateSpan([from, to, decade, century, year]) {
  if (from) return Number(from) <= Number(to) ? `${from}-${to}` : "";
  if (decade) return /00$/.test(decade) ? `${decade}-${Number(decade) + 99}` : `${decade}-${Number(decade) + 9}`;
  const start = (Number(century) - 1) * 100;
  const year4 = (n) => String(n).padStart(4, "0");
  if (century) return Number(century) >= 1 && Number(century) <= 21 ? `${year4(start)}-${year4(start + 99)}` : "";
  return year ? `${year}-${year}` : "";
}
