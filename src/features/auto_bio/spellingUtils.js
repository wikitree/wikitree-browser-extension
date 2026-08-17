/**
 * Converts American English spelling to British English spelling based on the user's locale.
 * This function checks if the user's browser locale is set to a form of English that typically
 * uses British spelling (like UK or Australia). If so, it converts American English words
 * to their British equivalents based on a predefined dictionary of spellings.
 *
 * @param {string} text - The text to be converted from American to British spelling.
 * @returns {string} The text with American spellings converted to British spellings where applicable.
 *                   If the user's locale is not set to use British English, the original text is returned unchanged.
 *
 * The conversion only occurs if the user's locale is set to British English variants (en-GB, en-AU, etc.).
 * The function splits the input text into words, checks each word against a dictionary of American-to-British
 * spellings, and replaces them if a match is found. The `matchCase` function is used to preserve the original
 * word's capitalization style.
 */

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

  const userLanguage = navigator.language || navigator.userLanguage;
  const useBritishEnglish = ["en-GB", "en-AU", "en-NZ", "en-ZA", "en-IE", "en-IN", "en-SG", "en-MT"].includes(
    userLanguage
  );

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
