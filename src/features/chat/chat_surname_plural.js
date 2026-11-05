// E9, "Alleys who died in Motueka": the AI sometimes keeps a plural surname
// (AllLastNames=Alleys, 0 found). After a zero-result run, code retries the
// singular. Only a retry: "Jones" and "Adams" are real names ending in s.

const SURNAME_TERM_RE = /\b(AllLastNames|LastName|LastNameAtBirth|LNAB|LastNameCurrent|CurrentLastName)=("?)([A-Za-z][A-Za-z'-]*)\2/g;

export function singularSurname(name) {
  const text = String(name || "");
  if (/(?:ss|us|is)$/i.test(text) || text.length < 4) return "";
  if (/(?:s|x|z|ch|sh)es$/i.test(text)) return text.slice(0, -2);
  if (/s$/i.test(text)) return text.slice(0, -1);
  return "";
}

// "Smiths born in Devon", "the Smiths": the surname Smiths, or the Smith family? The words can't say
// (Jones, Woods and Owens are surnames too), so WikiTree+'s own counts decide (2026-10-12). Profiles
// with each surname, probed that day: Smiths 31 / Smith 466,090; Browns 57 / Brown 246,312; Halls 937 /
// Hall 103,899 (all read as the family). Hills 6,088 / Hill 87,166; Woods 30,247 / Wood 79,340; Owens
// 22,294 / Owen 21,635; Jones / Jone 38 (all real names, kept as typed).
export const PLURAL_SURNAME_RATIO = 50;

/**
 * How to read a surname that could be a plural, from the profile counts for it and its singular:
 * "singular" (the family), "offer" (keep it, but the singular is the commoner name, so offer it),
 * or "typed". Unknown counts keep it as typed (a zero result still retries the singular).
 */
export function pluralSurnameReading(typedCount, singularCount) {
  if (!Number.isFinite(typedCount) || !Number.isFinite(singularCount) || singularCount <= 0) return "typed";
  if (typedCount === 0 || singularCount >= PLURAL_SURNAME_RATIO * typedCount) return "singular";
  return singularCount > typedCount ? "offer" : "typed";
}

/** The surnames in a WT+ query that could be plurals ("Smiths", not "Smith" or "Willis"). */
export function pluralSurnameCandidates(query) {
  const names = [];
  String(query || "").replace(SURNAME_TERM_RE, (whole, key, quote, value) => {
    if (singularSurname(value) && !names.some((name) => name.toLowerCase() === value.toLowerCase())) names.push(value);
    return whole;
  });
  return names;
}

/** The query with just these surnames made singular. */
export function withSingularSurnames(query, names) {
  const swap = new Set((names || []).map((name) => String(name).toLowerCase()));
  return String(query || "").replace(SURNAME_TERM_RE, (whole, key, quote, value) =>
    swap.has(value.toLowerCase()) ? `${key}=${quote}${singularSurname(value)}${quote}` : whole
  );
}

/** {query, from, to} with each plural surname made singular, or null. */
export function singularSurnameRetryQuery(query) {
  const from = pluralSurnameCandidates(query);
  if (!from.length) return null;
  return { query: withSingularSurnames(query, from), from, to: from.map(singularSurname) };
}

/** The text with each [from, to] surname swapped, for a title or a note ("Smiths in Devon" → "Smith in Devon"). */
export function swapSurnames(text, pairs) {
  if (!text || !pairs?.length) return text;
  return pairs.reduce((out, [from, to]) => String(out).split(from).join(to), text);
}
