// WikiTree dates may have unknown months or days (00). Keep ages approximate
// until both birthdays are known; missing years produce no result.

export function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || match[1] === "0000") return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function ageBetween(from, to) {
  const a = dateParts(from);
  const b = dateParts(to);
  if (!a || !b) return null;
  if (!a.month || !b.month) return { age: b.year - a.year, approx: true };
  let age = b.year - a.year;
  if (b.month < a.month || (b.month === a.month && a.day && b.day && b.day < a.day)) age -= 1;
  return { age, approx: !(a.day && b.day) };
}

/** Sortable partial date: unknown month/day remain 00; an unknown year has no key. */
export function partialDateSortKey(value) {
  const match = String(value || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return "";
  return `${match[1]}-${match[2] || "00"}-${match[3] || "00"}`;
}
