/*
Pure parsing helpers for the Find a Grave Memorial Extractor. They take DOM nodes (from the live page or from
a DOMParser document) and return plain objects, so they can be tested against saved HTML.
*/

// Suffixes are left out of the name columns. A bare "V" is not treated as one: it is far more often an initial.
const SUFFIX_REGEX = /^(jr|sr|ii|iii|iv)\.?,?$/i;
// Words that belong to the surname that follows them: "Maria De La Cruz" is Maria, surname De La Cruz
const SURNAME_PARTICLES = new Set([
  "de",
  "del",
  "della",
  "der",
  "den",
  "da",
  "dos",
  "das",
  "di",
  "du",
  "la",
  "le",
  "van",
  "von",
  "ter",
  "ten",
  "st",
  "st.",
  "saint",
]);
const NICKNAME_REGEX = /[“"]([^”"]*)[”"]/g;

function cleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

// "24 Apr 1979 (aged 51)" -> "24 Apr 1979"; "unknown" -> ""
export function cleanDate(text) {
  const date = cleanText(text)
    .replace(/\s*\(.*$/, "")
    .trim();
  return /^unknown$/i.test(date) ? "" : date;
}

function stripSuffix(tokens) {
  const result = [...tokens];
  while (result.length > 1 && SUFFIX_REGEX.test(result[result.length - 1])) {
    result.pop();
  }
  return result;
}

function tokenize(text) {
  return cleanText(text)
    .split(" ")
    .filter((token) => token);
}

/*
  Splits the name Find a Grave shows in a list row (`.name-grave > i`) or on a memorial page (`#bio-name`).
  Both use the same inline markup:  Amalia “Mollie” <i>Gonzales</i> Casados
  The italic text is the maiden (birth) surname, “quoted” text is a nickname, span.prefix is a title (Dr.).
*/
export function parseName(nameEl) {
  const empty = { givenNames: "", maidenName: "", surname: "" };
  if (!nameEl) return empty;

  let before = "";
  let after = "";
  let maidenName = "";
  let seenMaiden = false;

  nameEl.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      if (seenMaiden) after += node.textContent;
      else before += node.textContent;
    } else if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === "i" && !seenMaiden) {
        maidenName = cleanText(node.textContent);
        seenMaiden = true;
      }
      // anything else (span.prefix, veteran or flower icons) is not part of the name
    }
  });

  // a nickname is not part of the given names
  before = before.replace(NICKNAME_REGEX, " ");
  after = after.replace(NICKNAME_REGEX, " ");

  if (seenMaiden) {
    const givenNames = tokenize(before).join(" ");
    const surnameTokens = stripSuffix(tokenize(after));
    // "Mary <i>Smith</i>": only the birth surname is known, so it is also the surname
    const surname = surnameTokens.length ? surnameTokens.join(" ") : maidenName;
    return { givenNames, maidenName, surname };
  }

  const tokens = stripSuffix(tokenize(before + " " + after));
  if (tokens.length === 0) return empty;
  // the surname is the last word plus any particles before it, but the first word is always a given name
  let surnameStart = tokens.length - 1;
  while (surnameStart > 1 && SURNAME_PARTICLES.has(tokens[surnameStart - 1].toLowerCase())) surnameStart--;
  return {
    givenNames: tokens.slice(0, surnameStart).join(" "),
    maidenName: "",
    surname: tokens.slice(surnameStart).join(" "),
  };
}

// The name as the extractor has always written it: title first, the birth surname in (brackets), and the nickname and
// suffix left as Find a Grave shows them, e.g. Dr. Amalia “Mollie” (Gonzales) Casados Jr.
export function formatDisplayName(nameEl) {
  if (!nameEl) return "";
  const prefix = cleanText(nameEl.querySelector(".prefix")?.textContent);
  let text = "";
  nameEl.childNodes.forEach((node) => {
    if (node.nodeType === 3) text += node.textContent;
    else if (node.nodeType === 1 && node.tagName.toLowerCase() === "i") text += `(${cleanText(node.textContent)})`;
  });
  return cleanText(`${prefix} ${text}`);
}

// The "Show Map" link looks like http://maps.google.com/maps?q=36.9050917,-104.4237222&spn=...
// Memorials with no coordinates link to /memorial/<id>/edit#gps-location ("Add to Map") instead.
export function parseCoordinates(href) {
  if (!href || href.includes("edit#")) return { latitude: "", longitude: "" };
  const match = href.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  return match ? { latitude: match[1], longitude: match[2] } : { latitude: "", longitude: "" };
}

// Details from a full memorial page (a Document from DOMParser, or the live document)
export function parseMemorialDocument(doc) {
  const text = (selector) => cleanText(doc.querySelector(selector)?.textContent);
  const gpsHref = doc.querySelector("#gpsValue")?.getAttribute("href") || "";
  return {
    ...parseName(doc.querySelector("#bio-name")),
    birthDate: cleanDate(text("#birthDateLabel")),
    deathDate: cleanDate(text("#deathDateLabel")),
    plot: text("#plotValueLabel"),
    ...parseCoordinates(gpsHref),
  };
}

// "31 Jan 1893 – 22 Oct 1938", "unknown – 15 Oct 1956" or just "unknown"
export function parseBirthDeathDates(text) {
  const parts = cleanText(text).split("–");
  if (parts.length < 2) return { birthDate: "", deathDate: "" };
  return { birthDate: cleanDate(parts[0]), deathDate: cleanDate(parts[1]) };
}

// Details from one `.memorial-item` row on a cemetery memorial-search list
export function parseListRow(item) {
  const link = item.querySelector("a[href^='/memorial/']");
  const picture = item.querySelector(".memorial-item-pic");
  return {
    memorialId: (item.getAttribute("id") || "").replace(/^sr-/, ""),
    ...parseName(item.querySelector(".name-grave > i")),
    displayName: formatDisplayName(item.querySelector(".name-grave > i")),
    ...parseBirthDeathDates(item.querySelector(".birthDeathDates")?.textContent),
    plot: cleanText(item.querySelector(".addr-cemet strong")?.textContent),
    latitude: "",
    longitude: "",
    hasPhoto: picture?.querySelector("img") ? "Y" : "N",
    hasGravePhoto: picture && !/no grave photo/i.test(picture.innerHTML) ? "Y" : "N",
    memorialLink: link ? link.href : "",
  };
}

// The list header reads "47 matching records found" (or "1,234 matching records found"); null if it isn't there
export function parseRecordCount(text) {
  const match = cleanText(text).match(/([\d,]+)\s+matching records? found/i);
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : null;
}
