/*
The MIT License (MIT)

Copyright (c) 2023 Kathryn J Knight

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
 * Rules for identifying sources in a biography that are not valid.
 * This class is intended to be a singleton and immutable.
 * Access this class using theSourceRules.
 * The SourceRules are used to check a biography. The methods do not need to
 * be explictly used, but are available to test strings against the rules if desired.
 * They could be used, for example, to test for various headings in multiple languages.
 * All tests assume that the string to test has been converted to lowercase.
 */

class SourceRules {
  #isInit = false;

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
    // note if you want to give them a break you could
    // include research  notes (extra space) and research note (no s)
    "notes de recherche",
    "onderzoeksnotities",
    "onderzoeknotities",
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
    "navorsingsnotas",
  ];
  #sourcesHeadings = [
    "sources",
    "quellen",
    "bronnen",
    "bronne",
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
    "erkennings",
  ];
  #advanceDirectiveHeadings = [
    "advance directive",
    "directive préalable",
    "diretiva antecipada",
    "diretriz antecipada",
    "directiva anticipada",
    "digitaal testament",
    "wilsverklaring",
    "predhodna direktiva",
  ];

  // loads from templates, each is name and status
  #rnb = [];
  // loads from templates, each is name and status
  #navBox = [];
  // loads from templates
  #projectBox = [];
  // loads from templates
  #sticker = [];

  // recommended HTML tags
  #recommendedTagsStart = [
    "<!--",
    "<blockquote",
    "</blockquote",
    "<br",
    "<center",
    "</center",
    "<includeonly",
    "</includeonly",
    "<noinclude",
    "</noinclude",
    "<nowiki",
    "</nowiki",
    "<onlyinclude",
    "</onlyinclude",
    "<ref",
    "</ref",
    "<sub",
    "</sub",
    "<sup",
    "</sup",
    "<span",
    "</span",
  ];
  // strings that identify a census source
  // when used by itself or with nothing other than
  // date are not a valid source
  // sequence to be able to remove these from source line
  #censusStrings = [
    "united states federal census",
    "england and wales census",
    "new york state census",
    "united states census",
    "us federal censuses",
    "census information",
    "federal census for",
    "us census returns",
    "us federal census",
    "iowa state census",
    "census of canada",
    "michigan census",
    "mo state census",
    "scotland census",
    "canadian census",
    "federal census",
    "ny 1892 census",
    "swedish census",
    "england census",
    "ireland census",
    "canada census",
    "census canada",
    "irish census",
    "wales census",
    "u.s. census",
    "us census",
    "census",
    "bevolkingsregister",
    "väestönlaskenta",
    "väestönlaskenta",
    "volkszählung",
    "volkstelling",
    "folketælling",
    "folketelling",
    "folkräkning",
    "folkräkning",
    "recensement",
    "censimento",
    "ludności",
    "telling",
    "manntal",
    "censo",
    "popis",
    "spis",
  ];

  /* order by length then alpha, but for efficiency
   * since most profiles are English, that is first
   * Note: logic checks for at least 15 characters 
   * invalidSourceList are strings on a line by themselves
   */
  #invalidSourceList = [
//   12345678901234
    "ancestry source",
    "census records.",
    "familysearchorg",
    "family accounts",
    "family document",
    "familie dossier",
    "family research",
    "gro death index",
    "online research",
    "own family tree",
    "source required",
    "title: marriage",
    "'''see also:'''",
    "www.ancestry.ca",
    "www.bms2000.org",
    "confirmed by dna",
    "familysearch.org",
    "family documents",
    "family knowledge",
    "findmypast.co.uk",
    "'''footnotes:'''",
    "internet records",
    "iowa death index",
    "personal records",
    "research records",
    "various archives",
    "www.ancestry.com",
    "acknowledgements:",
    "familysearch.com",
    "ancestry research",
    "drouin collection",
    "familysearch data",
    "familysearch tree",
    "family collection",
    "family tree files",
    "family search lds",
    "fellow researcher",
    "my family records",
    "on going research",
    "scotland's people",
    "verified ancestor",
    "wiki, family tree",
    ":'''footnotes:'''",
    "personal research",
    "private genealogy",
    "'''source list'''",
    ":'''source list'''",
    "'''source list:'''",
    "cemetery headstone",
    "citing this record",
    "father matches dna",
    "family information",
    "mother matches dna",
    "newspaper obituary",
    "personal documents",
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
    "family search website",
    "freereg baptism entry",
    "mormon church records",
    "replace this citation",
    "ancestry and documents",
    "confirmed by dna match",
    "freereg marriage entry",
    "own family information",
    "scotlandspeople.gov.uk",
    "family tree on ancestry",
    "personal family records",
    "thanks to family search",
    "no sources at this time",
    "geneanet community trees",
    "https://familysearch.org",
    "ohio marriages 1800-1958",
    "scotlandspeople database",
    "ancestry tree and sources",
    "family search family tree",
    "scotland's people website",
    "us census, public records",
    "ancestry and family search",
    "family bible, certificates",
    "michigan deaths, 1867-1996",
    "new york census, 1790-1890",
    "texas marriages, 1966-2010",
    "www.scotlandspeople.gov.uk",
    "family tree on familysearch",
    "library and archives canada",
    "social security death index",
    "torrey's marriages database",
    "sources are on my family tree",
    "familysearch.org ancestry.com",
    "ancestry.com familysearch.org",
    "online trees. will add sources",
    "geneanet community trees index",
    "'''footnotes and citations:'''",
    ":'''footnotes and citations:'''",
    "family search files on internet",
    "other vital statistic documents",
    "victorian death index 1921-1985",
    "california birth index, 1905-1995",
    "california death index, 1940-1997",
    "iowa, select marriages, 1809-1992",
    "research on ancestry and wikitree",
    "minnesota birth certificates index",
    "personal knowledge , census reports",
    "new zealand, birth index, 1840-1950",
    "canada births and baptisms, 1661-1959",
    "queensland births, deaths & marriages",
    "a source is still needed for this data",
    "maryland births and christenings index",
    "social security applications and claims",
    "a source for this information is needed",
    "new zealand, electoral rolls, 1853-1981",
    "california, u.s., death index, 1940-1997",
    "scotland, births and baptisms, 1564-1950",
    "a source for this information is required",
    "a source for this information is required",
    "family records, census, and death records",
    "iowa, u.s., state census collection, 1915",
    "research on ancestry and burial card info",
    "research on ancestry and marriage records",
    "u.s., new england marriages prior to 1700",
    "geneanet community trees index on ancestry",
    "marriage records and ancestry.com research",
    "north carolina, marriage records, 1741-2011",
    "illinois statewide marriage index, 1763–1900",
    "maternal relationship confirmed by dna match",
    "north carolina marriage collection 1741-2004",
    "paternal relationship confirmed by dna match",
    "parental relationship confirmed by dna match",
    "vital statistics of nova scotia 1800-present",
    "u.s., social security death index, 1935-2014",
    "wales, select births and baptisms, 1541-1907",
    "social security applications and claims index",
    "us & international marriage records 1560-1900", 
    "virginia, u.s., compiled marriages, 1740-1850",
    "from behind the ancestry.com subscription wall:",
    "personal knowledge, newspaper and bible records",
    "us and international marriage records 1560-1900", 
    "massachusetts, town and vital records, 1620-1988",
    "replace this citation if there is another source",
    "england and wales, freebmd birth index, 1837-1915",
    "england and wales, freebmd death index, 1837-1915",
    "u.s., world war ii draft registration cards, 1942",
    "passenger and immigration lists index, 1500s-1900s",
    "research on ancestry and a variety of other places",
    "u.s. and international marriage records, 1560-1900",
    "england and wales, civil registration marriage index",
    "england and wales death registration index 1837-2007",
    "england and wales, freebmd marriage index, 1837-1915",
    "virginia land marriage and probate records 1639-1850",
    "us federal census mortality schedules index 1850-1880",
    "u.s., world war i draft registration cards, 1917-1918",
    "u.s., civil war draft registrations records, 1863-1865",
    "u.s., new england marriages prior to 1700 (ancestry.com)",
    "u.s., social security applications and claims index, 1936-2007",
    "philadelphia, pennsylvania, death certificates index, 1803-1915",
    "massachusetts, town and vital records, 1620-1988 (ancestry.com)",
    "search at https://www.freereg.org.uk with appropriate parameters",
    "u.s. and international marriage records, 1560-1900 (ancestry.com)",
    "u.s., civil war pension index: general index to pension files, 1861-1934",
    "u.s., revolutionary war pension and bounty-land warrant application files, 1800-1900",
    "personal recollection, as told to me by their relative. notes and sources in their possession.",
    "michael lechner,",
    "virginia hanks",
    "teresa a. theodore",
    "michael eneriis",

//   12345678901234
    "družinsko drevo",
    "drzewo rodzinne",
    "familiestamboom",
    "kilde nødvendig",
    "lähde tarvitaan",
    "tarvitaan lähde",
    "quelle benötigt",
    "väestönlaskenta",
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
    "added by",
    "entered by",
    "no sources.",
    "no repo record found",
    "source will be added by",
    "no sour record found",
    "no note record found",
    "biography written by",
    "click the changes tab",
    "no more info is currently available for",
    "this biography is a rough draft. it was auto-generated",
  ];

  // on a line by itself
  // not a valid source for
  // profile born > 150 or died > 100
  #tooOldToRememberSourceList = [
//   12345678901234
    "personal knowledge",
    "firsthand knowledge",
    "first hand knowledge",
    "direct knowledge",
    "af fyrstu hendi",
    "kot se spominja",
    "wie erinnert von",
    "como lo recuerda",
    "kuten nn muistaa",
    "as remembered by",
    "förstahandskälla",
    "ensi käden tieto",
    "como lembrado por",
    "come ricordato da",
    "comme rappelé par",
    "selon la mémoire de",
    "førstehånds kendskab",
    "förstahands kännedom",
    "førstehåndskjennskap",
    "zoals herinnerd door",
    "wissen aus erster hand",
    "personal recollection of",
    "personal recollection of events witnessed by",
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
  ];

  // line by itself
  // not a valid source for Pre1700
  #invalidSourceListPre1700 = [
//   12345678901234
    "marriage record",
    "birth certificate",
    "marriage certificate",
    "death certificate",
//   12345678901234
    "akt małżeństwa",
    "dödscertifikat",
    "dödsfallsintyg",
    "geburtsurkunde",
    "heiratsurkunde",
    "kuolemantiedot",
    "kuolinmerkintä",
    "kuolintodistus",
    "syntymäkirjaus",
    "trouw oorkonde",
    "acte de mariage",
    "døds sertifikat",
    "ekteskapsrekord",
    "födelsedokument",
    "fæðingarvottorð",
    "overlijdensakte",
    "syntymätodistus",
    "syntymämerkintä",
    "vihkimismerkintä",
    "äktenskap rekord",
    "äktenskap rekord",
    "dødsregistrering",
    "dødsregistrering",
    "hjúskaparvottorð",
    "overlijdens acte",
    "overlijdens akte",
    "acta de defunción",
    "certidão de óbito",
    "genealogie.quebec",
    "registre de décès",
    "registro de morte",
    "acte de naissance",
    "acta de nacimiento",
    "avioliitto ennätys",
    "certyfikat śmierci",
    "family group sheet",
    "vielseregistrering",
    "fødselsregistrering",
    "ægteskabsoptegnelse",
    "certificat de décès",
    "registre de mariage",
    "record di matrimonio",
    "certificato di morte",
    "certidão de casamento",
    "certificat de mariage",
    "eheurkunde trauschein",
    "registro de casamento",
    "registre de naissance",
    "certificato di nascita",
    "registro de matrimonio",
    "registro de nascimento",
    "certidão de nascimento",
    "certificat de naissance",
    "certificado de defunción",
    "certificado de matrimonio",
    "certificato di matrimonio",
    "certificado de nacimiento",
    "syntymätiedot akt urodzenia",
    "registro degli atti di morte",
    "north america, family histories",
    "vielselsattest el. vigselsattest",
    "north america, family histories, 1500-2000",
  ];

  // anywhere on a line is a valid source
  // Do NOT combine with the non pre1700 because you want to check each source
  #validPartialSourceListPre1700 = [
    "cokayne, the complete peerage",
    "the scots peerage",
    "the peerage of ireland",
    "the complete peerage of england, scotland, ireland, great britain",
    "the peerage of england, scotland, and ireland",
    "www.medievalgenealogy.org.uk/sources/peerages",
  ]

  // anywhere on a line
  // not a valid source for Pre1700
  #invalidPartialSourceListPre1700 = [
    // family trees
    "added by confirming a smart match",
    "ancestry tree",
    "ancestry.com-oneworld tree",
    "árbol de familia",
    "arbre généalogique",
    "družinsko drevo",
    "drzewo rodzinne",
    "familie træ",
    "familienstammbaum",
    "familiestamboom",
    "familietre",
    "family tree",
    "family  tree",
    "family-tree",
    "familysearch.org/tree",
    "gedbas",
    "gencircles.com",
    //"genealogie.quebec",
    "genealogieonline",
    "geneanet tree",
    "genealogical registry and database of mennonite ancestry",
    "geni tree",
    "myheritage tree",
    "nos origines",
    "nos origines.",
    "nosorigines",
    "one world tree",
    "public member tree",
    "roglo",
    "rootsweb tree",
    "släktträd",
    "stamboom",
    "stirnet.com",
    "sukupuu",
    "thepeerage.com",
    "trees.ancestry.com",
    "unsourced family tree handed down",
    "world family tree",
    "www.geni.com/people",
    // compilations (typically from family trees)
    "ancestral file",
    "derbund wft",
    "family data collection",
    "family group sheet",
    "international genealogical index",
    "millennium file",
    "pedigree resource file",
    "u.s. and international marriage records",
    "us and international marriages",
    // other items
    "burkes peerage",
    "burkes dormant and extinct peerages",
    "burkes extinct and dormant baronetcies",
    "capedia",
    "cracofts peerage",
    "cracroftspeerage.co.uk",
    "daughters of the american revolution",
    "dictionnaire universel de la noblesse de france",
    "dictionary of the peerages of england, ireland, and scotland",
    "fabpedigree.com",
    "family group sheet",
    "famouskin.com",
    "genealogics.org",
    "généalogie acadienne",
    "genealogie-acadienne.net",
    "genealogy of the wives of the american presidents",
    "historiske efterretninger om verfortiente danske adelsmaend",
    "kindred.stanford.edu",
    "jean-baptiste-pierre jullien de courcelles",
    "kindred britain",
    "lanctôt, léopold, familles acadiennes",
    "manfred hiebl genealogie mittelalter",
    "manfred-hiebl.de/genealogie-mittelalter",
    "nicolas viton de saint-allais",
    "nobiliaire universel de france",
    "our common ancestors",
    "our royal, titled, noble, and commoner ancestors",
    "our-royal-titled-noble-and-commoner-ancestors.com",
    "shawnee heritage",
    "society for colonials wars",
    "some old norse families",
    "sons of the american revolution",
    "tudor place",
    "vore fælles ahner",
    "tudorplace.com",

  ];

  // List of short strings that are not by themselves a valid source
  // to use for pulling apart a "source" that is a combination of these
  // list of sources not valid by themselves that are < 15 characterse
  // but you want to find these in reverse order to remove from the source
  #invalidSourceListShort = [
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
    "public records",
    "'''see also'''",
    "ancestry.com:",
    "billiongraves",
    "family member",
    "family papers",
    "family search",
    "needs sources",
    ":source list:",
    "source needed",
    "we relate web",
    "ancestry.com",
    "familysearch",
    "family bible",
    "family trees",
    "find a grave",
    "find-a-grave",
    "find my past",
    "source list:",
    "ancestrycom",
    "ancestry.uk",
    "ancestry.ca",
    "bdm records",
    "my heritage",
    "my research",
    "will follow",
    "findagrave",
    "footnotes:",
    "myheritage",
    "footnotes",
    "see also:",
    "we relate",
    "ancestry",
    "footnote",
    "geneanet",
    "research",
    "see also",
    "freebmd",
    "hinshaw",
    "family",
    "census",
    "bible",
    "ibid",
    "----",
    "bmd",
    "---",
//   1234567890
  ];

    // list of sources not valid Pre1700 that are < 15 characterse
  #invalidSourceListPre1700Short = [
//   12345678901234
    "birth record",
    "death record",
    "igi",
    "family data",
    "geboorteakte",
    "geboorte akte",
    "trouwakte",
    "trouwacte",
    "trouw oorkonde",
    "geburtsurkunde",
    "sterbeurkunde",
    "heiratsurkunde",
    "akt urodzenia",
    "födelsebevis",
    "fødselsattest",
    "fødselsrekord",
    "rojstni list",
    "rojstni zapis",
    "dødsattest",
    "dödscertifikat",
    "kuolintodistus",
    "mrliški list",
    "acte de décès",
    "akt zgonu",
    "dödsrekord",
    "kuolemantiedot",
    "smrtni zapis",
    "akt małżeństwa",
    "huwelijksakte",
    "poročni list",
    "vielsesattest",
    "vigselbevis",
    "vigselsattest",
    "vihkitodistus",
    "poročni zapis",
    "dåbsattest",
    "dánarskrá",
    "dánarvottorð",
    "dödsattest",
    "dödsnotis",
    "fæðingarskrá",
    "födelsenotis",
    "hjúskaparskrá",
    "kuolinkirjaus",
    "kuolinmerkintä",
    "navneattest",
    "vigselnotis",
  ];

  // make this a singleton
  constructor() {
    if (!SourceRules.theSourceRules) {
      SourceRules.theSourceRules = this;
    }
    return SourceRules.theSourceRules;
  }

  /* 
   * Load template rules from JSON data
   */
  loadTemplates(templates) {
    if (!this.#isInit) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].type.toLowerCase().trim() === 'profile box') {
          if (templates[i].group.toLowerCase().trim() === 'research note box') {
            let researchNote = {
              name: "",
              status: "",
            };
            researchNote.name = templates[i].name.toLowerCase().trim();
            researchNote.status = templates[i].status.toLowerCase().trim();
            this.#rnb.push(researchNote);
          }
        }
        if ((templates[i].type.toLowerCase().trim() === 'navigation box') ||
            (templates[i].type.toLowerCase().trim() === 'navigation profile box')) {
          let navBox = {
            name: "",
            status: "",
          };
          navBox.name = templates[i].name.toLowerCase().trim();
          navBox.status = templates[i].status.toLowerCase().trim();
          this.#navBox.push(navBox);
        }
        //if (templates[i].type.toLowerCase().trim() === 'navigation profile box') {
          //this.#navBox.push(templates[i].name.toLowerCase().trim());
        //}
        if (templates[i].type.toLowerCase().trim() === 'project box') {
          this.#projectBox.push(templates[i].name.toLowerCase().trim());
        }
        if (templates[i].type.toLowerCase().trim() === 'sticker') {
          this.#sticker.push(templates[i].name.toLowerCase().trim());
        }
      }
      this.#isInit = true;
    }
  }

  /**
   * Determine if a line is a valid biography heading
   * @param {String} line to test
   * @returns {Boolean} true if bio heading else false
   */
  isBiographyHeading(line) {
    return this.#biographyHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid research notes heading
   * @param {String} line to test
   * @returns {Boolean} true if research notes heading else false
   */
  isResearchNotesHeading(line) {
    return this.#researchNotesHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid sources heading
   * @param {String} line to test
   * @returns {Boolean} true if sources heading else false
   */
  isSourcesHeading(line) {
    return this.#sourcesHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid acknowledgements heading
   * @param {String} line to test
   * @returns {Boolean} true if acknowledgements heading else false
   */
  isAckHeading(line) {
    return this.#acknowledgmentsHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid advance directive heading
   * @param {String} line to test
   * @returns {Boolean} true if advance directive heading else false
   */
  isAdvanceDirective(line) {
    return this.#advanceDirectiveHeadings.includes(line);
  }

  /**
   * Determine if a line is a valid Research Note Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if research notes box else false
   */
  isResearchNoteBox(line) {
    let isFound = false;
    this.#rnb.find((element) => {
      if (element.name === line) {
        isFound = true;
      }
    });
    return isFound;
  }

  /**
   * Return status value for Research Note Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {String} status value or blank if not a research notes box
   */
  getResearchNoteBoxStatus(line) {
    let stat = "";
    let isFound = false;
    this.#rnb.find((element) => {
      if (element.name === line) {
        stat = element.status;
      }
    });
    return stat;
  }

  getNavBoxStatus(line) {
    let stat = "";
    let isFound = false;
    this.#navBox.find((element) => {
      if (element.name === line) {
        stat = element.status;
      }
    });
    return stat;
  }

  /**
   * Determine if a line is a valid Project Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if research notes box else false
   */
  isProjectBox(line) {
    return this.#projectBox.includes(line);
  }

  /**
   * Determine if a line is a valid Nav Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if nav box else false
   */
  isNavBox(line) {
    //return this.#navBox.includes(line);
    let isFound = false;
    this.#navBox.find((element) => {
      if (element.name === line) {
        isFound = true;
      }
    });
    return isFound;
  }

  /**
   * Determine if a line is a valid Sticker
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if sticker else false
   */
  isSticker(line) {
    return this.lineStartsWithListEntry(line, this.#sticker);
  }

  /** 
   * Determine if a line starts with an HTML tag
   * that is recommended for use on WikiTree. 
   * Typically used for a line that starts with <
   * @param {String} line to test
   * @returns {Boolean} true if recommended else false
   */
  isRecommendedTag(line) {
    return this.lineStartsWithListEntry(line, this.#recommendedTagsStart);
  }

  /**
   * Determine if a line is a census line
   * @param {String} line to test
   * @returns {Boolean} true if census line else false
   */
  isCensus(line) {
    return this.#censusStrings.includes(line);
  }
  /**
   * Determine if a line contains a census string
   * @param {String} line the line
   * @returns census string if line contains census string
   */
  hasCensusString(line) {
    return this.lineContainsListEntry(line, this.#censusStrings);
  }
  /**
   * Determine if line by itself is an invalid source
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSource(line) {
    return this.#invalidSourceList.includes(line);
  }

  /** 
   * Remove a string that by itself on a line is not a valid source
   * @param {String} line the line to check
   * @returns {String} line with any invalid sources removed
   */
  removeInvalidSourcePart(line) {
    let linePart = this.removeSourcePart(line, this.#invalidSourceList);
    return this.removeSourcePart(linePart, this.#invalidSourceListShort);
  }
  /** 
   * Remove a string that by itself on a line is not a valid source
   * for too old to remember
   * @param {String} line the line to check
   * @returns {String} line with any invalid sources removed
   */
  removeInvalidSourcePartTooOld(line) {
    return this.removeSourcePart(line, this.#tooOldToRememberSourceList);
  }
  /** 
   * Remove a string that by itself on a line is not a valid source Pre1700
   * @param {String} line the line to check
   * @returns {String} line with any invalid sources removed
   */
  removeInvalidSourcePartPre1700(line) {
    let linePart = this.removeSourcePart(line, this.#invalidSourceListPre1700);
    return this.removeSourcePart(linePart, this.#invalidSourceListPre1700Short);
  }

  /*
   * Does string start with the text for any of the string in array
   * @param {String} the line to test
   * @param {Array} the array of string to test
   * @returns {Boolean} true if the line includes text from the list of strings else false
   */
  lineStartsWithListEntry(line, stringList) {
    let isFound = false;
    stringList.find((element) => {
      if (line.startsWith(element)) {
        isFound = true;
      }
    });
    return isFound;
  }

  /*
   * Does string include the text for any of the string in array
   * @param {String} the line to test
   * @param {Array} the array of string to test
   * @returns {Boolean} true if the line includes text from the list of strings else false
   */
  lineContainsListEntry(line, stringList) {
    let hasText = false;
    stringList.find((element) => {
      if (line.includes(element)) {
        hasText = true;
      }
    });
    return hasText;
  }
  /*
   * Remove invalid source found on list from line
   * return the line with the source string removed
   */
  removeSourcePart(linePart, sourceStringList) {
    if (linePart.length > 0) {
      let sourceCount = sourceStringList.length;
      let i = 0;
      while ((linePart.length > 0) && (i < sourceCount)) {
        linePart = linePart.replace(sourceStringList[i], '');
        i++;;
      }
    }
    return linePart.trim();
  }
  /*
   * Does line contain a phrase on the valid partial source list
   * This is a test case for strings that if found mean the profile is sourced
   * (thanks to David S for the test case)
   * @param {String} line string to evaluate
   * @returns {Boolean} true if line found, else false
   */
  containsValidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#validPartialSourceList);
  }
  /**
   * Determine if line is an invalid source when found anywhere on a line
   * @param {String} line input source string
   * @returns {Boolean} true if found on invalid partial source list, else false
   */
  isInvalidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceList);
  }
  /**
   * Determine if line is an invalid source when found anywhere on a line
   * when the person is too old to remember
   * @param {String} line input source string
   * @returns {Boolean} true if found on too old partial source list, else false
   */
  isInvalidPartialSourceTooOld(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListTooOld);
  }
  /**
   * Determine if line is an invalid source when found anywhere on a line
   * and the person is Pre1700
   * @param {String} line input source string
   * @returns {Boolean} true if found on pre1700 partial source list, else false
   */
  isInvalidPartialSourcePre1700(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListPre1700);
  }
  /**
   * Determine if line is a valid source if found anywhere on a line 
   * and the person is Pre1700
   * @param {String} line input source string
   * @returns {Boolean} true if found on pre1700 valid partial source list, else false
   */
  isValidPartialSourcePre1700(line) {
    return this.lineContainsListEntry(line, this.#validPartialSourceListPre1700);
  }
  /**
   * Determine if line starts with something on the invalid partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if starts with invalid source, else false
   */
  isInvalidStartPartialSource(line) {
    let isFound = false;
    this.#invalidStartPartialSourceList.find((element) => {
      if (line.startsWith(element)) {
        isFound = true;
      }
    });
    return isFound;
  }
  /**
   * Determine if line by itself is an invalid source for profile too old to
   * remember
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSourceTooOld(line) {
    return this.#tooOldToRememberSourceList.includes(line);
  }
  /**
   * Determine if line by itself is an invalid source for Pre1700
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSourcePre1700(line) {
    return this.#invalidSourceListPre1700.includes(line);
  }
}

const theSourceRules = new SourceRules();
Object.freeze(theSourceRules);
export { theSourceRules };
