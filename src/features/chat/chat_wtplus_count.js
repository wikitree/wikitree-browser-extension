// How many profiles a WikiTree+ query finds, without loading them: WT+ says so in its searchLog. "How many
// ancestors does he have?" fetched every ancestor and showed them all in a table; the number is in WT+'s reply
// (the user, 2026-10-18).

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";

/**
 * The profile counts in a WT+ searchLog ("Result: 12", "Cached: 12", "Too many profiles!!! 466090"), NaN where
 * absent. count is the one to believe: Result, else Cached, else the too-many total.
 */
export function wtPlusLogCounts(searchLog) {
  const text = String(searchLog || "");
  const number = (re) => {
    const match = text.match(re);
    return match?.[1] ? Number.parseInt(match[1], 10) : NaN;
  };
  const result = number(/\bResult:\s*(\d+)\b/i);
  const cached = number(/\bCached:\s*(\d+)\b/i);
  const tooMany = number(/Too many profiles!!!\s*(\d+)/i);
  const count = [result, cached, tooMany].find(Number.isFinite);
  return { result, cached, tooMany, hasTooMany: /Too many profiles!!!/i.test(text), count: count ?? NaN };
}

/** The number of profiles a WT+ query finds (NaN when it fails). */
export async function countWtPlusProfiles(query, { search = wtAPIProfileSearch } = {}) {
  try {
    const response = await search("ChatWTPlus", encodeURIComponent(query), { maxProfiles: 1 });
    return wtPlusLogCounts(response?.response?.searchLog || response?.searchLog).count;
  } catch (error) {
    console.info("wbe: WT+ count failed", { query, error });
    return NaN;
  }
}
