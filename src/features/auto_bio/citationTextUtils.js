/**
 * Tidying for citation text: undoing the HTML round-trip that reading refs out of the
 * bio puts them through, and making a citation safe to put in a bullet list.
 */

/* "&lt;" is deliberately absent. The round-trip cannot tell an escaped "&lt;ref&gt;" that the
author wanted shown literally from a real "<" the parser decoded, and turning the first back
into a "<" would make live markup out of text. It renders as "<" either way, so leaving it
escaped changes nothing the reader sees; ">" is safe to put back and is common in citations
("Star Directory > Find A Star"). */
const namedEntities = {
  "&nbsp;": " ",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#x27;": "'",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
};

/**
 * Refs are read out of the bio with jQuery's .html(), which re-escapes anything the HTML
 * parser decoded: a literal ">" in a citation comes back as "&gt;", and a real non-breaking
 * space comes back as "&nbsp;". Put the characters back.
 * "&amp;" is decoded last so that "&amp;lt;" survives as "&lt;" rather than becoming "<".
 */
export function decodeHtmlEntities(text = "") {
  if (!text) {
    return text;
  }

  let decoded = text;
  for (const [entity, character] of Object.entries(namedEntities)) {
    decoded = decoded.replaceAll(entity, character);
  }

  /* Same reasoning as "&lt;" above: never produce a "<" or an "&" that could change how the
  wikitext is read. */
  const unsafeToDecode = [0x3c, 0x26];
  const decodeNumeric = (match, number) =>
    Number.isFinite(number) && !unsafeToDecode.includes(number) ? String.fromCodePoint(number) : match;

  decoded = decoded.replace(/&#(\d+);/g, (match, code) => decodeNumeric(match, parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, code) => decodeNumeric(match, parseInt(code, 16)));

  // Real non-breaking spaces read as spaces in wikitext but confuse later pattern matching.
  decoded = decoded.replace(/ /g, " ");

  return decoded.replaceAll("&amp;", "&");
}

/**
 * Wiki list items end at the first newline, so a citation split over several lines (the
 * style Sourcer produces) only puts its first line in the bullet and leaves the rest as
 * loose paragraphs. Join it onto one line. Tables and nested lists need their line breaks,
 * so they are left alone.
 */
export function collapseCitationWhitespace(text = "") {
  if (!text || !text.includes("\n")) {
    return text;
  }

  const lines = text.split("\n");
  const needsItsLineBreaks = text.includes("{|") || lines.some((line) => /^\s*[*#:;]/.test(line));
  if (needsItsLineBreaks) {
    return text;
  }

  return lines
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ")
    .replace(/ +/g, " ")
    .trim();
}

/**
 * Key for spotting the same citation twice. Whitespace and the bullet marker vary between
 * copies of what is otherwise identical text.
 */
export function citationDedupeKey(text = "") {
  return text
    .replace(/^\s*\*+\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
