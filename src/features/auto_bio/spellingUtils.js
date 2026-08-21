/**
 * Converts American English spelling to British English spelling for the profile being written.
 *
 * Which English to use follows the profile's own country (an English profile reads "baptised",
 * a profile in the United States reads "baptized"), falling back to the editor's browser locale
 * when the profile gives nothing to go on.
 *
 * @param {string} text - The text to be converted from American to British spelling.
 * @returns {string} The text with American spellings converted to British spellings where applicable.
 *                   For an American-English profile the original text is returned unchanged.
 *
 * The function splits the input text into words, checks each word against a dictionary of
 * American-to-British spellings, and replaces them if a match is found. The `matchCase` function
 * is used to preserve the original word's capitalization style.
 */

/* Which English a biography is written in follows the profile, not the editor: an English
profile reads "baptised" whoever is running Auto Bio, and a profile in the United States
reads "baptized" for an editor in Manchester. The editor's browser is only the fallback,
for a profile with no country to go on. */
const britishSpellingPlaces =
  /\bEngland\b|\bScotland\b|\bWales\b|\bIreland\b|\bUnited Kingdom\b|\bGreat Britain\b|\bAustralia\b|\bNew Zealand\b|\bSouth Africa\b|\bIndia\b|\bSingapore\b|\bMalta\b|\bJamaica\b|\bBarbados\b/i;
/* New England is in the United States. Taken out before the test above rather than excluded
with a lookbehind, which Safari before 16.4 cannot parse at all. */
const newEngland = /\bNew England\b/gi;
const americanSpellingPlaces = /\bUnited States\b|\bU\.?S\.?A\.?\b|\bColony of Virginia\b|\bProvince of [A-Z]/i;
const britishSpellingLocales = ["en-GB", "en-AU", "en-NZ", "en-ZA", "en-IE", "en-IN", "en-SG", "en-MT"];

/**
 * @param {string[]} places - places in the order they should be trusted, birth first
 * @param {string} userLanguage - the editor's browser language, used only if no place says
 */
export function useBritishSpelling(places = [], userLanguage = "") {
  for (const place of places) {
    if (!place) {
      continue;
    }
    const placeWithoutNewEngland = place.replace(newEngland, " ");
    if (britishSpellingPlaces.test(placeWithoutNewEngland)) {
      return true;
    }
    if (americanSpellingPlaces.test(place) || placeWithoutNewEngland !== place) {
      return false;
    }
  }
  return britishSpellingLocales.includes(userLanguage);
}

function spellingPlaces() {
  const person = typeof window !== "undefined" ? window.profilePerson : null;
  return [person?.BirthLocation, person?.DeathLocation, person?.BirthLocationEdited, person?.DeathLocationEdited];
}

export function spell(text) {
  const americanToBritishSpelling = {
    // A
    acknowledgment: "acknowledgement",
    acknowledgments: "acknowledgements",
    aging: "ageing",
    analog: "analogue",
    analyze: "analyse",
    analyzed: "analysed",
    analyzes: "analyses",
    analyzing: "analysing",
    anglicize: "anglicise",
    anglicized: "anglicised",
    anglicizes: "anglicises",
    anglicizing: "anglicising",
    anonymize: "anonymise",
    anonymized: "anonymised",
    anonymizes: "anonymises",
    anonymizing: "anonymising",
    apologize: "apologise",
    apologized: "apologised",
    apologizes: "apologises",
    apologizing: "apologising",
    arbor: "arbour",
    arbors: "arbours",
    ax: "axe",

    // B
    baptize: "baptise",
    baptized: "baptised",
    baptizes: "baptises",
    baptizing: "baptising",
    behavior: "behaviour",
    behaviors: "behaviours",

    // C
    catalog: "catalogue",
    catalogs: "catalogues",
    center: "centre",
    centers: "centres",
    color: "colour",
    colored: "coloured",
    colorful: "colourful",
    colorfully: "colourfully",
    coloring: "colouring",
    colors: "colours",

    // D
    dialog: "dialogue",
    dialogs: "dialogues",
    draft: "draught",
    drafts: "draughts",
    defense: "defence",
    defenses: "defences",

    // E
    enroll: "enrol",
    enrolled: "enrolled",
    enrolling: "enrolling",
    enrollment: "enrolment",
    enrollments: "enrolments",
    encyclopedia: "encyclopaedia",
    encyclopedias: "encyclopaedias",
    esophagus: "oesophagus",
    esthetic: "aesthetic",

    // F
    favor: "favour",
    favored: "favoured",
    favoring: "favouring",
    favors: "favours",
    fiber: "fibre",
    fibers: "fibres",
    fulfill: "fulfil",
    fulfilled: "fulfilled",
    fulfilling: "fulfilling",
    fulfillment: "fulfilment",
    fulfillments: "fulfilments",

    // G
    gray: "grey",
    grays: "greys",

    // H
    honor: "honour",
    honored: "honoured",
    honoring: "honouring",
    honors: "honours",
    humor: "humour",
    humored: "humoured",
    humoring: "humouring",
    humors: "humours",

    // I-J
    inquiry: "enquiry",
    inquiries: "enquiries",
    jewelry: "jewellery",
    judgment: "judgement",
    judgments: "judgements",

    // L
    labor: "labour",
    labors: "labours",
    license: "licence",
    licenses: "licences",
    liter: "litre",
    liters: "litres",
    luster: "lustre",

    // M
    marveled: "marvelled",
    marveling: "marvelling",
    meager: "meagre",
    modeled: "modelled",
    modeling: "modelling",
    models: "models",
    mold: "mould",
    molds: "moulds",
    mom: "mum",
    moms: "mums",

    // N
    neighbor: "neighbour",
    neighboring: "neighbouring",
    neighbors: "neighbours",

    // O
    organization: "organisation",
    organizations: "organisations",
    organize: "organise",
    organized: "organised",
    organizes: "organises",
    organizing: "organising",

    // P
    personalize: "personalise",
    personalized: "personalised",
    personalizes: "personalises",
    personalizing: "personalising",
    plow: "plough",
    plows: "ploughs",
    practicing: "practising",
    privatize: "privatise",
    privatized: "privatised",
    privatizes: "privatises",
    privatizing: "privatising",

    // R
    realization: "realisation",
    realizations: "realisations",
    realize: "realise",
    realized: "realised",
    realizes: "realises",
    realizing: "realising",
    recognize: "recognise",
    recognized: "recognised",
    recognizes: "recognises",
    recognizing: "recognising",
    rumor: "rumour",
    rumors: "rumours",

    // S
    saber: "sabre",
    sabers: "sabres",
    skillful: "skilful",
    skillfully: "skilfully",
    somber: "sombre",
    sulfur: "sulphur",

    // T
    theater: "theatre",
    theaters: "theatres",

    // Traveling
    traveled: "travelled",
    traveler: "traveller",
    travelers: "travellers",
    traveling: "travelling",

    // V
    valor: "valour",
    vapor: "vapour",
    vapors: "vapours",

    // W
    willful: "wilful",
    willfully: "wilfully",

    // Add more as needed
  };

  const useBritishEnglish = useBritishSpelling(spellingPlaces(), navigator.language || navigator.userLanguage);

  function matchCase(original, transformed) {
    if (original === original.toUpperCase()) {
      return transformed.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return transformed[0].toUpperCase() + transformed.slice(1);
    }
    return transformed;
  }

  return text
    .split(/\b/)
    .map((word) => {
      const lowerCaseWord = word.toLowerCase();

      if (americanToBritishSpelling.hasOwnProperty(lowerCaseWord)) {
        const converted = americanToBritishSpelling[lowerCaseWord];
        return useBritishEnglish ? matchCase(word, converted) : word;
      }

      return word;
    })
    .join("");
}
