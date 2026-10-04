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

/** {query, from, to} with each plural surname made singular, or null. */
export function singularSurnameRetryQuery(query) {
  const pairs = [];
  const rewritten = String(query || "").replace(SURNAME_TERM_RE, (whole, key, quote, value) => {
    const singular = singularSurname(value);
    if (!singular) return whole;
    pairs.push([value, singular]);
    return `${key}=${quote}${singular}${quote}`;
  });
  if (!pairs.length) return null;
  return { query: rewritten, from: pairs.map(([from]) => from), to: pairs.map(([, to]) => to) };
}
