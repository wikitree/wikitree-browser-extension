/*
Created By: Ian Beacall (Beacall-6)

The matching rules for Find and Replace, kept apart from the page so they can be tested on their own.

There are three ways to search:
- text: finds exactly what was typed.
- wildcards: ? is any one character, # is any one digit, and * is any characters on one line. A * at the
  start or end of the search only runs to the end of the word, so Smith* finds Smithson. In the
  replacement, the same symbols put back what the matching wildcards found, in order: find 18## and
  replace with 19## to turn 1852 into 1952. A backslash makes the next character an ordinary one.
- regex: a JavaScript regular expression. The replacement takes $1, $<name>, $& and $$ as usual, and
  also \1, \n (a new line) and \t (a tab), as many editors do.
*/

export const MODES = ["text", "wildcards", "regex"];
export const MAX_MATCHES = 10000;

// A letter, mark or digit in any script, or an underscore: what counts as part of a word.
const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}_]";
const NOT_BEFORE_WORD = `(?!${WORD_CHAR})`;
const WORD_CHAR_TEST = new RegExp(`^${WORD_CHAR}$`, "u");
const isWordChar = (ch) => Boolean(ch) && WORD_CHAR_TEST.test(ch);

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escapes the wildcard symbols in some text, so a wildcard search finds the text as it is. */
export function escapeWildcards(text) {
  return text.replace(/[*?#\\]/g, "\\$&");
}

/** Splits wildcard text into literal characters and wildcards ({ literal } or { wildcard }). */
export function tokenizeWildcards(text) {
  const chars = Array.from(text);
  const tokens = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "\\" && i + 1 < chars.length) {
      tokens.push({ literal: chars[++i] });
    } else if (ch === "*" || ch === "?" || ch === "#") {
      tokens.push({ wildcard: ch });
    } else {
      tokens.push({ literal: ch });
    }
  }
  return tokens;
}

function wildcardSource(tokens) {
  return tokens
    .map((token, index) => {
      if (token.literal !== undefined) return escapeRegExp(token.literal);
      if (token.wildcard === "?") return "([^\\n])";
      if (token.wildcard === "#") return "(\\d)";
      const atEnd = index === 0 || index === tokens.length - 1;
      return atEnd ? `(${WORD_CHAR}*)` : "([^\\n]*?)";
    })
    .join("");
}

/*
Whole words: only where the search starts or ends with part of a word, so "[[Smith" still finds
"x[[Smith-1]]". The end is a lookahead in the pattern. The start is checked by findMatches (wordStart),
since a lookbehind would stop the extension loading on Safari before 16.4.
*/
function requireWholeWords(search, startsWithWord, endsWithWord) {
  if (endsWithWord) search.regex = new RegExp(search.regex.source + NOT_BEFORE_WORD, search.regex.flags);
  search.wordStart = startsWithWord;
  return search;
}

function errorText(error) {
  // "Invalid regular expression: /(/: Unterminated group" → "Unterminated group"
  return String(error?.message || error).replace(/^Invalid regular expression: \/.*\/[a-z]*: /, "");
}

/**
 * Turns what the user typed into a search: { mode, regex, wildcards } or { mode, error }, or null when
 * there is nothing to find. regex always has the g and m flags, so ^ and $ match at each line.
 */
export function compileSearch({ find, mode = "text", matchCase = false, wholeWord = false }) {
  if (!find) return null;
  const flags = "gm" + (matchCase ? "" : "i");

  if (mode === "regex") {
    // With the u flag first, so \p{L} works; without it if the pattern needs the older rules (\' or \-).
    for (const unicode of [true, false]) {
      try {
        new RegExp(find, flags + (unicode ? "u" : ""));
      } catch (error) {
        if (unicode) continue;
        return { mode, error: errorText(error) };
      }
      if (!wholeWord) return { mode, regex: new RegExp(find, flags + (unicode ? "u" : "")) };
      if (!unicode) return { mode, regex: new RegExp(`\\b(?:${find})\\b`, flags) };
      return requireWholeWords({ mode, regex: new RegExp(`(?:${find})`, flags + "u") }, true, true);
    }
  }

  if (mode === "wildcards") {
    const tokens = tokenizeWildcards(find);
    const search = { mode, regex: new RegExp(wildcardSource(tokens), flags + "u"), wildcards: tokens.filter((t) => t.wildcard) };
    if (!wholeWord) return search;
    const edge = (token) => token.wildcard !== undefined || isWordChar(token.literal);
    return requireWholeWords(search, edge(tokens[0]), edge(tokens[tokens.length - 1]));
  }

  const search = { mode: "text", regex: new RegExp(escapeRegExp(find), flags + "u") };
  if (!wholeWord) return search;
  const chars = Array.from(find);
  return requireWholeWords(search, isWordChar(chars[0]), isWordChar(chars[chars.length - 1]));
}

function nextIndex(text, index, unicode) {
  if (unicode && index < text.length) {
    const code = text.codePointAt(index);
    if (code > 0xffff) return index + 2;
  }
  return index + 1;
}

/**
 * Every match of the search in the text, up to limit: [{ start, end, match }], where match is the
 * RegExp result. Empty matches only count in regex mode (where ^ can put something at each line start).
 */
export function findMatches(text, search, limit = MAX_MATCHES) {
  const matches = [];
  if (!search?.regex) return matches;
  const regex = new RegExp(search.regex.source, search.regex.flags);
  let m;
  while (matches.length < limit && (m = regex.exec(text))) {
    if (search.wordStart && isWordChar(Array.from(text.slice(Math.max(0, m.index - 2), m.index)).pop())) {
      // Starts inside a word: look again from the next character
      regex.lastIndex = nextIndex(text, m.index, regex.unicode);
      continue;
    }
    if (m[0] === "") {
      regex.lastIndex = nextIndex(text, regex.lastIndex, regex.unicode);
      if (search.mode !== "regex") continue;
    }
    matches.push({ start: m.index, end: m.index + m[0].length, match: m });
  }
  return matches;
}

function expandWildcards(template, search, m) {
  // Which capture group each wildcard symbol in the search filled, in order, by symbol.
  const groups = { "*": [], "?": [], "#": [] };
  search.wildcards.forEach((token, index) => groups[token.wildcard].push(index + 1));
  const used = { "*": 0, "?": 0, "#": 0 };
  return tokenizeWildcards(template)
    .map((token) => {
      if (token.literal !== undefined) return token.literal;
      const group = groups[token.wildcard][used[token.wildcard]++];
      return group ? m[group] ?? "" : token.wildcard;
    })
    .join("");
}

function expandRegex(template, m, text) {
  const groupCount = m.length - 1;
  const group = (n) => (n >= 1 && n <= groupCount ? m[n] ?? "" : null);
  let out = "";
  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    const next = template[i + 1];
    if (ch === "\\" && next !== undefined) {
      if (next === "n") out += "\n";
      else if (next === "t") out += "\t";
      else if (next === "\\") out += "\\";
      else if (next === "0") out += m[0];
      else if (/\d/.test(next) && group(Number(next)) !== null) out += group(Number(next));
      else out += ch + next;
      i++;
      continue;
    }
    if (ch === "$" && next !== undefined) {
      if (next === "$" || next === "&" || next === "`" || next === "'") {
        out += next === "$" ? "$" : next === "&" ? m[0] : next === "`" ? text.slice(0, m.index) : text.slice(m.index + m[0].length);
        i++;
        continue;
      }
      if (next === "<" && m.groups) {
        const close = template.indexOf(">", i + 2);
        if (close > -1) {
          out += m.groups[template.slice(i + 2, close)] ?? "";
          i = close;
          continue;
        }
      }
      // Two digits when there is a group with that number, as String.prototype.replace does
      const two = template.slice(i + 1, i + 3);
      if (/^\d\d$/.test(two) && group(Number(two)) !== null) {
        out += group(Number(two));
        i += 2;
        continue;
      }
      if (/\d/.test(next) && group(Number(next)) !== null) {
        out += group(Number(next));
        i++;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/** The text that replaces one match ({ match } from findMatches) in the given text. */
export function replacementFor(template, search, found, text) {
  if (search.mode === "regex") return expandRegex(template, found.match, text);
  if (search.mode === "wildcards") return expandWildcards(template, search, found.match);
  return template;
}

/** Replaces the given matches: { text, edits }, where edits are [{ from, to, text }] in the old text. */
export function replaceMatches(text, matches, template, search) {
  const edits = matches.map((found) => ({ from: found.start, to: found.end, text: replacementFor(template, search, found, text) }));
  let out = "";
  let last = 0;
  edits.forEach((edit) => {
    out += text.slice(last, edit.from) + edit.text;
    last = edit.to;
  });
  return { text: out + text.slice(last), edits };
}
