/*
The MIT License (MIT)

Copyright (c) 2022 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/**
* Rules for identifying sources in a biography that are not valid
* Intended to be a singleton and immutable
* and look like what could be read from database tables
*/

class SourceRules {

  // all sorts of rules to parse biography and check sources
  #biographyHeadings = [
    "biography",
    "biographie",
    "biografia",
    "biografie",
    "biografi",
    "elämäntarina",
    "Æviskrá",
    "bographie",
    "biografijo",
    "biografía",
  ];
  #researchNotesHeadings = [
    "research notes",
    "notes de recherche",
    "onderzoeksnotities",
    "opmerkingen",
    "bemerkungen zur nachforschung",
    "forschungsnotizen",
    "notas de investigación",
    "note di ricerca",
    "forskningsanteckningar",
    "forskningsnotater",
    "notas de pesquisa",
    "forskningsnotater",
    "tutkimustiedot",
    "notatki badawcze",
    "raziskovalne opombe",
    "viittaukset",
    "rannsóknarnótur",
  ];
  #sourcesHeadings = [
    "sources",
    "quellen",
    "bronnen",
    "fuentes",
    "lähteet",
    "fonti",
    "kallor",
    "heimildir",
    "källor",
    "fontes",
    "kilder",
    "źródła",
    "izvor",
  ];
  #acknowledgmentsHeadings = [
    "acknowledgements",
    "acknowledgments",
    "acknowledgement",
    "acknowledgment",
    "remerciements",
    "dankbetuiging",
    "anerkennung",
    "danksagungen",
    "agradecimientos",
    "ringraziamenti",
    "dankwoord",
    "erkännanden",
    "reconhecimentos",
    "riconoscimenti",
    "anerkendelser",
    "anerkjennelser",
    "bekräftelser",
    "tunnustukset",
    "podziękowanie",
    "priznanja",
  ];

  // strings that identify a census source
  // when used by itself or with nothing other than
  // date are not a valid source
  #censusStrings = [
    "census",
    "recensement",
    "bevolkingsregister",
    "volkszählung",
    "censo",
    "censimento",
    "volkstelling",
    "folketælling",
    "telling",
    "folkräkning",
    "väestönlaskenta",
    "spis",
    "ludności",
    "popis",
    "väestönlaskenta",
    "manntal",
    "folketelling",
    "folkräkning",
    "us federal census",
    "united states federal census",
    "united states census",
    "us census",
    "u.s. census",
    "us census returns",
    "federal census",
    "swedish census",
    "canada census",
    "census of canada",
    "canadian census",
    "england census",
    "irish census",
    "ireland census",
    "census information",
    "new york state census",
    "iowa state census",
    "scotland census",
  ];

  /* order by length then alpha, but for efficiency
   * since most profiles are English, that is first
   * Note: logic checks for at least 15 characters so
   * shorter are commented out, but kept in case 
   * this is too aggressive
   * invalidSourceList are strings on a line by themselves
   */
  #invalidSourceList = [
  /*
    ".",
    "*",
    "bmd",
    "---",
    "ibid",
    "----",
    "bible",
    "census",
    "family",
    "freebmd",
    "hinshaw",
    "ancestry",
    "footnote",
    "geneanet",
    "research",
    "see also",
    "footnotes",
    "see also:",
    "we relate",
    "findagrave",
    "footnotes:",
    "myheritage",
    "ancestrycom",
    "ancestry.uk",
    "ancestry.ca",
    "bdm records",
    "my heritage",
    "my research",
    "will follow",
    "ancestry.com",
    "familysearch",
    "family bible",
    "family trees",
    "find a grave",
    "find-a-grave",
    "find my past",
    "source list:",
    "ancestry.com:",
    "billiongraves",
    "family member",
    "family papers",
    "family search",
    "needs sources",
    ":source list:",
    "source needed",
    "we relate web",
    "ancestry.co.uk",
    "ancestrydotcom",
    "billion graves",
    "census records",
    "church records",
    "family history",
    "family records",
    "findagrave.com",
    "freebmd.org.uk",
    "internet files",
    "my family tree",
    "myheritage.com",
    "parish records",
    "passenger list",
    "'''see also'''",
    */
    "ancestry source",
    "census records.",
    "familysearchorg",
    "family accounts",
    "familie dossier",
    "family research",
    "online research",
    "own family tree",
    "title: marriage",
    "'''see also:'''",
    "www.ancestry.ca",
    "www.bms2000.org",
    "familysearch.org",
    "family documents",
    "family knowledge",
    "findmypast.co.uk",
    "'''footnotes:'''",
    "internet records",
    "personal records",
    "research records",
    "www.ancestry.com",
    "acknowledgements:",
    "ancestry research",
    "familysearch tree",
    "family collection",
    "family tree files",
    "fellow researcher",
    "my family records",
    "scotland's people",
    "wiki, family tree",
    ":'''footnotes:'''",
    "personal research",
    "private genealogy",
    "'''source list'''",
    ":'''source list'''",
    "'''source list:'''",
    "cemetery headstone",
    "citing this record",
    "family information",
    "newspaper obituary",
    "source information",
    "title: death index",
    "wwwfamilysearchorg",
    "www.ancestry.co.uk",
    "www.gencircles.com",
    "www.myheritage.com",
    "{{citation needed}}",
    "citing this record:",
    "familysearch search",
    "from family records",
    "my heritage records",
    "my tree on ancestry",
    ":'''source list:'''",
    "real estate records",
    "ancestry family site",
    "ancestry family tree",
    "family bible records",
    "personal family tree",
    "personal information",
    "research on ancestry",
    "uk census; bmd index", 
    "www.familysearch.org",
    "ancestry family trees",
    "family search records",
    "mormon church records",
    "replace this citation",
    "ancestry and documents",
    "scotlandspeople.gov.uk",
    "ancestry tree & sources",
    "family tree on ancestry",
    "personal family records",
    "no sources at this time",
    "family search family tree",
    "scotland's people website",
    "us census, public records",
    "ancestry and family search",
    "new york census, 1790-1890",
    "www.scotlandspeople.gov.uk",
    "family tree on familysearch",
    "social security death index",
    "torrey's marriages database",
    "sources are on my family tree",
    "familysearch.org ancestry.com",
    "ancestry.com familysearch.org",
    "online trees. will add sources",
    "'''footnotes and citations:'''",
    ":'''footnotes and citations:'''",
    "family search files on internet",
    "victorian death index 1921-1985",
    "iowa, select marriages, 1809-1992",
    "research on ancestry and wikiTree",
    "personal knowledge , census reports",
    "a source is still needed for this data",
    "social security applications and claims",
    "a source for this information is needed",
    "family records, census, and death records",
    "research on ancestry and burial card info",
    "research on ancestry and marriage records",
    "marriage records and ancestry.com research",
    "passenger and immigration lists index, 1500s-1900s",
    "replace this citation if there is another source",
    "research on ancestry and a variety of other places",
    "search at https://www.freereg.org.uk with appropriate parameters",
    "personal recollection, as told to me by their relative. notes and sources in their possession.",
    "michael lechner,",
    "virginia hanks",
    "teresa a. theodore",
    "michael eneriis",
    "personal knowledge, newspaper and bible records",

    /*
    "spis",
    "censo",
    "popis",
    "badania",
    "ricerca",
    "se aven",
    "se även",
    "se også",
    "sukupuu",
    "telling",
    "zie ook",
    "ættartré",
    "ludności",
    "pesquisa",
    "se också",
    "stamboom",
    "tutkimus",
    "forschung",
    "forskning",
    "onderzoek",
    "recherche",
    "slægtstræ",
    "slektstre",
    "släktträd",
    "volgt nog",
    "bron nodig",
    "censimento",
    "familietre",
    "katso myös",
    "katso myös",
    "rannsóknir",
    "sjá einnig",
    "siehe auch",
    "voir aussi",
    "zobacz też",
    "familie træ",
    "folkräkning",
    "poglej tudi",
    "recensement",
    "veja também",
    "ver tambien",
    "familiebibel",
    "folketælling",
    "guarda anche",
    "källa behövs",
    "potreben vir",
    "raziskovanje",
    "volkszählung",
    "volkstelling",
    "bronnen nodig",
    "familienbibel",
    "familie bibel",
    "investigación",
    "nachforschung",
    "perheraamattu",
    "source requise",
    "voir également",
    "družinsko drevo",
    "drzewo rodzinne",
    "familiestamboom",
    "kilde nødvendig",
    "lähde tarvitaan",
    "tarvitaan lähde",
    "quelle benötigt",
    "väestönlaskenta",
    */
    "árbol de familia",
    "bible de famille",
    "fjölskyldubiblía",
    "fonte necessária",
    "fuente necesaria",
    "potrzebne źródło",
    "quelle notwendig",
    "familienstammbaum",
    "heimildar er þörf",
    "korvaa tämä viite",
    "source nécessaire",
    "albero genealogico",
    "arbre généalogique",
    "bevolkingsregister",
    "ersätt detta citat",
    "heimild nauðsynleg",
    "kilde er nødvendig",
    "nadomesti ta citat",
    "skiptið út heimild",
    "zastąpić ten cytat",
    "erstat henvisningen",
    "korvaa tämä lainaus",
    "udskift dette citat",
    "ersetze dieses zitat",
    "reemplazar esta cita",
    "vervang deze citatie",
    "erstatt dette sitatet",
    "substitua esta citação",
    "ersätt denna hänvisning",
    "remplacez cette citation",
    "erstatt denne henvisningen",
    "sostituire questa citazione",
  ];

  // anywhere in a line not a valid source
  #invalidPartialSourceList = [
    "through the import of",
    "add sources here",
    "add [[sources]] here",
    "family tree maker",
    ".ftw",
    "replace this citation if there is another source",
    "replace this citation",
  ];

  // anywhere on a line is a valid source
  #validPartialSourceList = [
    "sources are hidden to protect",
    "sources hidden to protect",
    "source hidden to protect"
  ];

  // on the start of a line not a valid source
  #invalidStartPartialSourceList = [
    "entered by",
    "no sources.",
    "no repo record found",
    "source will be added by",
    "no sour record found",
    "no note record found",
  ];

  // on a line by itself
  // not a valid source for
  // profile born > 150 or died > 100
  #tooOldToRememberSourceList = [
    "personal recollection of events witnessed by",
    "personal recollection of",
    "personal knowledge",
    "first hand knowledge",
    "firsthand knowledge",
    "førstehånds kendskab",
    "ensi käden tieto",
    "af fyrstu hendi",
    "førstehåndskjennskap",
    "förstahandskälla",
    "förstahands kännedom",
    "as remembered by",
    "selon la mémoire de",
    "zoals herinnerd door",
    "eigen kennis",
    "wie erinnert von",
    "wissen aus erster hand",
    "como lo recuerda",
    "como lembrado por",
    "come ricordato da",
    "wie erinnert",
    "comme rappelé par",
    "som husket av",
    "som minns av",
    "kuten muistaa",
    "jak zapamiętał",
    "kot se spominja",
    "som husket af",
    "kuten nn muistaa",
    "nnn mukaan",
    "samkvæmt minni",
    "husket av",
    "ihågkommet av",
  ];

  // anywhere in a line
  // not a valid source for
  // profile born > 150 or died > 100
  #invalidPartialSourceListTooOld = [
    "first hand knowledge",
    "firsthand knowledge",
    "personal recollection",
    "as remembered by",
    "selon la mémoire de",
    "zoals herinnerd door",
    "eigen kennis",
    "wie erinnert von",
    "wissen aus erster hand",
    "como lo recuerda",
    "como lembrado por",
    "come ricordato da",
    "wie erinnert",
    "comme rappelé par",
    "som husket av",
    "som minns av",
    "kuten muistaa",
    "jak zapamiętał",
    "kot se spominja",
    "som husket af",
    "kuten nn muistaa",
    "nnn mukaan",
    "samkvæmt minni",
    "husket av",
    "first-hand information",
    "eigen kennis",
    "unsourced family tree handed down",
  ];

  // line by itself
  // not a valid source for Pre1700
  #invalidSourceListPre1700 = [
    "birth certificate",
    "birth record",
    "marriage certificate",
    "marriage record",
    "death certificate",
    "death record",
    "igi",
    "family data",
    "certificat de naissance",
    "registre de naissance",
    "certificat de décès",
    "registre de décès",
    "registre de mariage",
    "geboorteakte",
    "geboorte akte",
    "overlijdensakte",
    "overlijdens acte",
    "overlijdens akte",
    "trouwakte",
    "trouwacte",
    "trouw oorkonde",
    "geburtsurkunde",
    "sterbeurkunde",
    "heiratsurkunde",
    "acta de nacimiento",
    "acte de naissance",
    "akt urodzenia",
    "certidão de nascimento",
    "certificado de nacimiento",
    "certificato di nascita",
    "födelsebevis",
    "födelsedokument",
    "fødselsattest",
    "fødselsrekord",
    "registro de nascimento",
    "rojstni list",
    "rojstni zapis",
    "syntymätiedot akt urodzenia",
    "syntymätodistus",
    "certidão de óbito",
    "certificado de defunción",
    "certificato di morte",
    "certyfikat śmierci",
    "døds sertifikat",
    "dødsattest",
    "dödscertifikat",
    "kuolintodistus",
    "mrliški list",
    "acta de defunción",
    "acte de décès",
    "akt zgonu",
    "dödsrekord",
    "kuolemantiedot",
    "registro de morte",
    "registro degli atti di morte",
    "smrtni zapis",
    "akt małżeństwa",
    "certidão de casamento",
    "certificado de matrimonio",
    "certificat de mariage",
    "certificato di matrimonio",
    "eheurkunde trauschein",
    "huwelijksakte",
    "poročni list",
    "vielsesattest",
    "vigselbevis",
    "vigselsattest",
    "vihkitodistus",
    "acte de mariage",
    "ægteskabsoptegnelse",
    "äktenskap rekord",
    "avioliitto ennätys",
    "ekteskapsrekord",
    "poročni zapis",
    "record di matrimonio",
    "registro de casamento",
    "registro de matrimonio",
    "dåbsattest",
    "dánarskrá",
    "dánarvottorð",
    "dödsattest",
    "dödsfallsintyg",
    "dödsnotis",
    "dødsregistrering",
    "dødsregistrering",
    "fæðingarskrá",
    "fæðingarvottorð",
    "födelsenotis",
    "fødselsregistrering",
    "hjúskaparskrá",
    "hjúskaparvottorð",
    "kuolinkirjaus",
    "kuolinmerkintä",
    "navneattest",
    "syntymäkirjaus",
    "syntymämerkintä",
    "vielselsattest el. vigselsattest",
    "vielseregistrering",
    "vigselnotis",
    "vihkimismerkintä",
  ];

  // anywhere on a line
  // not a valid source for Pre1700
  #invalidPartialSourceListPre1700 = [
    "ancestry tree",
    "public member tree",
    "family tree",
    "arbre généalogique",
    "familienstammbaum",
    "stamboom",
    "árbol de familia",
    "družinsko drevo",
    "albero genealogico",
    "familiestamboom",
    "familie træ",
    "familietre",
    "släktträd",
    "sukupuu",
    "drzewo rodzinne",
    "family-tree",
    "familysearch.org/tree",
    "trees.ancestry.com",
    "geni tree",
    "ancestral file",
    "burke's peerage",
    "burke’s dormant and extinct peerages",
    "burke’s extinct and dormant baronetcies",
    "burke’s peerage and baronetage",
    "capedia",
    "dictionnaire universel de la noblesse de france",
    "fabpedigree.com",
    "family data collection",
    "genealogie.quebec",
    "genealogieonline",
    "genealogy of the wives of the american presidents",
    "geneanet tree",
    "historiske efterretninger om verfortiente danske adelsmaend",
    "https://kindred.stanford.edu",
    "international genealogical index",
    "jean-baptiste-pierre jullien de courcelles",
    "kindred britain",
    "millennium file",
    "myheritage tree",
    "nicolas viton de saint-allais",
    "nobiliaire universel de france",
    "nosorigines",
    "nos origines",
    "nos origines.",
    "our common ancestors",
    "our royal, titled, noble, and commoner ancestors",
    "our-royal-titled-noble-and-commoner-ancestors.com",
    "pedigree resource file",
    "roglo",
    "rootsweb tree",
    "stirnet.com",
    "the peerage",
    "thepeerage.com",
    "tudor place",
    "u.s. and international marriage records, 1560-1900",
    "us and international marriages Index",
    "vore fælles ahner",
    "www.genealogieonline.nl",
    "www.tudorplace.com.ar",
    "ancestry.com-oneworld tree",
    "one world tree",
    "family group sheet",
    "added by confirming a smart match",
    "world family tree",
    "derbund wft",
    "www.gencircles.com",
  ];

  // make this a singleton
  constructor() {
    if (!SourceRules.theSourceRules) {
      SourceRules.theSourceRules = this;
    }
    return SourceRules.theSourceRules;
  }

  /** 
   * Determine if a line is a valid biography heading
   * @param line to test
   * @return true if bio heading else false
   */
  isBiographyHeading(line) {
    return this.#biographyHeadings.includes(line);
  }
  /** 
   * Determine if a line is a valid research notes heading
   * @param line to test
   * @return true if research notes heading else false
   */
  isResearchNotesHeading(line) {
    return this.#researchNotesHeadings.includes(line);
  }
  /** 
   * Determine if a line is a valid sources heading
   * @param line to test
   * @return true if sources heading else false
   */
  isSourcesHeading(line) {
    return this.#sourcesHeadings.includes(line);
  }
  /** 
   * Determine if a line is a valid acknowledgements heading
   * @param line to test
   * @return true if acknowledgements heading else false
   */
  isAckHeading(line) {
    return this.#acknowledgmentsHeadings.includes(line);
  }
  /** 
   * Determine if a line is a census line
   * @param line to test
   * @return true if census line else false
   */
  isCensus(line) {
    return this.#censusStrings.includes(line);
  }
  /**
   * Determine if a line contains a census string
   * @param line the line
   * @return census string if line contains census string
   */
  hasCensusString(line) {
    return this.lineContainsListEntry(line, this.#censusStrings);
  }
  /**
   * Determine if line by itself is an invalid source
   * @param line input source string
   * @return true if invalid source else false
   */
  isInvalidSource(line) {
    return this.#invalidSourceList.includes(line);
  }

  /*
   * Does string include the text for any of the string in array
   * @param the line to test
   * @param the array of string to test
   * @return true if the line includes text from the list of strings else false
   */
  lineContainsListEntry(line, stringList) {
    let hasText = false;
    stringList.find(element => {
      if (line.includes(element)) {
        hasText = true;
      }
    });
    return hasText;
  }
  /*
   * Does line contain a phrase on the valid partial source list
   * This is a test case for strings that if found mean the profile is sourced
   * (thanks to David S for the test case)
   * @param line string to evaluate
   * @return true if line found, else false
   */
  containsValidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#validPartialSourceList);
  }
  /**
   * Determine if found on partial source list
   * @param line input source string
   * @return true if found on partial source list, else false
   */
  isInvalidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceList);
  }
  /**
   * Determine if found on partial source list too old to remember
   * @param line input source string
   * @return true if found on too old partial source list, else false
   */
  isInvalidPartialSourceTooOld(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListTooOld);
  }
  /**
   * Determine if found on partial source list for pre1700
   * @param line input source string
   * @return true if found on pre1700 partial source list, else false
   */
  isInvalidPartialSourcePre1700(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListPre1700);
  }
  /**
   * Determine if starts with something on the invalid partial source list
   * @param line input source string
   * @return true if starts with invalid source, else false
   */
  isInvalidStartPartialSource(line) {
    let isFound = false;
    this.#invalidStartPartialSourceList.find(element => {
      if (line.startsWith(element)) {
        isFound = true;
      }
    });
    return isFound;
  }
  /**
   * Determine if line by itself is an invalid source for profile too old to
   * remember
   * @param line input source string
   * @return true if invalid source else false
   */
  isInvalidSourceTooOld(line) {
    return this.#tooOldToRememberSourceList.includes(line);
  }
  /**
   * Determine if line by itself is an invalid source for Pre1700
   * @param line input source string
   * @return true if invalid source else false
   */
  isInvalidSourcePre1700(line) {
    return this.#invalidSourceListPre1700.includes(line);
  }
}

const theSourceRules = new SourceRules();
Object.freeze(theSourceRules);
export { theSourceRules };

