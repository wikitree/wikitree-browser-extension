/**
 * Reusing what the old biography already said about a census.
 *
 * When a census citation has no household table, Auto Bio can only rearrange the words of the
 * citation, which reads like a citation rather than a sentence and repeats whatever name and
 * birthplace the record happens to give. An existing biography written by hand usually says it
 * better ("In 1841 William lived with his children on Sash Street in Stafford and worked as a
 * painter"), so prefer that sentence when there is one.
 */

/** Citations are attached separately, so a reused sentence must not bring its own. */
export function stripRefs(text = "") {
  return text
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/ +/g, " ");
}

/** Everything before the Sources heading: the part of the old bio that holds prose. */
export function biographyPartOfBio(bioText = "") {
  return bioText.split(/^==\s*Sources\s*==/im)[0] || "";
}

/**
 * Put an existing sentence into the form Auto Bio uses for a census: "In [year], ...".
 * Handles Sourcer's "In the [year] census[,]" and the "At the time of the [year] census"
 * that people write, and adds the comma to a bare "In [year] he ...".
 */
export function censusNarrativeFromBioSentence(sentence = "", year) {
  const yearPattern = year ? String(year) : "\\d{4}";
  return sentence
    .replace(
      new RegExp(`^At the time of the\\s+(?:''')?(${yearPattern})(?:''')?\\s+census\\b\\s*,?\\s*`, "i"),
      "In $1, "
    )
    .replace(new RegExp(`^In the\\s+(?:''')?(${yearPattern})(?:''')?\\s+census\\b\\s*,?\\s*`, "i"), "In $1, ")
    .replace(
      new RegExp(`^(In|By|During)\\s+(?:the year\\s+)?(?:''')?(${yearPattern})(?:''')?\\s+(?=[^,])`, "i"),
      "$1 $2, "
    )
    .trim();
}

/* Countries at the end of a residence are noise: the citation has already said where the
person lived by naming the district. */
const trailingCountry =
  /\s+in\s+(United States|United Kingdom|England|Scotland|Wales|Ireland|Canada|Australia|New Zealand)\.?\s*$/i;

/**
 * A residence pulled out of a citation can run past the end of its sentence into the
 * birthplace that follows ("Barnsley registration district in England. Born in Wombwell,
 * Yorkshire"), which then reads as "was living in England. Born with his wife". Keep the
 * first sentence, and drop a country that only repeats what the district already says.
 */
export function tidyCensusResidence(residence = "") {
  if (!residence) {
    return residence;
  }
  return residence
    .split(/\.\s/)[0]
    .replace(/\s*\bBorn\b.*$/, "")
    .replace(trailingCountry, "")
    .replace(/[\s,]+$/, "")
    .trim();
}

/* Name variants can contain a full stop ("William J."), which would otherwise be a wildcard. */
function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Split on the space after a full stop, when what follows starts a new sentence. Written as a
replace with a lookahead rather than a split with a lookbehind, because Safari before 16.4 fails
to parse a lookbehind at all and we still target iOS 15. */
const sentenceBreak = "\u0000";
function splitIntoSentences(line = "") {
  return line.replace(/([.!?])\s+(?=[A-Z"'[])/g, `$1${sentenceBreak}`).split(sentenceBreak);
}

/* Lines that are not prose: list items, tables, headings, and the like. */
const notProsePattern = /^\s*([*#:;|!=]|\{\||\}|<)/;
/**
 * The sentence in the old biography that describes a census, if there is one.
 *
 * Only asked when there is no household to describe, so any sentence the old bio has — including
 * Sourcer's "In the [year] census, ..." — beats rearranging the words of the citation.
 *
 * @param {string} bioText - the old biography
 * @param {{year: (string|number), names: string[]}} about - the census year and the names the
 *   person goes by in the bio
 * @returns {string} the sentence, or "" when nothing in the bio is clearly about that census
 */
export function findCensusSentenceInBio(bioText = "", about = {}) {
  const year = about.year ? String(about.year) : "";
  const names = (about.names || []).filter((name) => name && String(name).trim());
  if (!bioText || !year || names.length === 0) {
    return "";
  }

  /* The sentence has to start by placing itself in the census year, so that "He was said to
  be a joiner later in 1841, when his daughter married" is not read as a census sentence. */
  const opensWithTheYear = new RegExp(`^(In|By|During|At the time of)\\b.{0,40}?\\b(?:''')?${year}(?:''')?\\b`, "i");
  const namePattern = new RegExp(`\\b(${names.map((name) => escapeForRegExp(String(name).trim())).join("|")})\\b`);

  const lines = stripRefs(biographyPartOfBio(bioText)).split("\n");

  for (const line of lines) {
    if (!line.trim() || notProsePattern.test(line)) {
      continue;
    }
    const sentences = splitIntoSentences(line);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed || trimmed.length > 400) {
        continue;
      }
      if (opensWithTheYear.test(trimmed) && namePattern.test(trimmed)) {
        return trimmed;
      }
    }
  }

  return "";
}
