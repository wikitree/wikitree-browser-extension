// "Guitarists category 1940s" (imagined R2, 2026-10-18): a category and a bare decade or year, which could mean
// born, died or alive then. Read only that shape, so chat_profile_search can ask which.

const PERIOD = String.raw`(?:in\s+)?(?:the\s+)?(\d{3}0s|\d{4})`;

/** {category, period, decade} or null. A century-like "1800s" is null (chat.js asks century or decade). */
export function parseCategoryPeriod(text) {
  const clean = String(text || "")
    .trim()
    .replace(/[?.!]+$/, "");
  const match =
    clean.match(new RegExp(String.raw`^(?:category\s*[:=]?\s*)?([A-Za-z][^:=]*?)\s+category\s+${PERIOD}$`, "i")) ||
    clean.match(new RegExp(String.raw`^category\s*[:=]\s*([A-Za-z][^:=]*?)\s+${PERIOD}$`, "i"));
  if (!match) return null;
  const period = match[2];
  if (/^\d\d00s$/.test(period)) return null;
  return { category: match[1].trim(), period, decade: /s$/.test(period) };
}
