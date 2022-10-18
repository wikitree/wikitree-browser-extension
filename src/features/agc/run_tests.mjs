/*
MIT License

Copyright (c) 2020 Robert M Pavey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const defaultUserOptions = {
  spelling: 'en_uk',
  include_age: 'none',
  dataFields_moveNamesFromFirstToMiddle: 'someCountries',
  narrative_includeCountry: 'always',
  narrative_standardizeCountry: false,
  narrative_addAtUnknownLocation: true,
  narrative_useResidenceData: true,
  narrative_useFullCensusDate: true,
  include_externalMedia: true,
  include_mapLinks: true,
  removeGedcomVerbiage: true,

  references_named: 'never',
  references_accessedDate: 'today',
  references_addNewlineBeforeFirst: false,
  references_addNewline: true,
  references_addNewlineWithin: false,
  references_meaningfulNames: true,
  sources_addFreeLinksForSubscriptionSources : true,
  sources_supressChildBaptisms: false,
  sources_supressChildMarriages: false,

  researchNotes_alternateNames: true,
  researchNotes_includeIssuesToBeChecked: true,
  researchNotes_issueForClnToLastHusband: true,
  researchNotes_issueForBirthToBeforeBaptism: true,
  researchNotes_issueForDeathToBeforeBurial: true,

  otherFields_useBaptismForBirthDate: true,
  otherFields_useBurialForDeathDate: true,
  otherFields_useLastHusbandNameForCurrentLastName: true,
};

const testProfiles = [
  {
    // Reported as a bug where extension does nothing. Has no real data in it
    'profileName': "Adams-1513",
    'inBirthDate': "Nov 1844",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Nathan G.",
    'currentLastName' : "Adams",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Nov 1844",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Adams",
  },
  {
    'profileName': "Adams-1513",
    'profileVariant': "a",
    'inBirthDate': "Nov 1844",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Nathan G.",
    'currentLastName' : "Adams",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Nov 1844",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Adams",

    'options': {
      narrative_addAtUnknownLocation: false,
    },
  },
  {
    // Reported as a bug where extension does nothing. Has no real data in it
    'profileName': "Agee-117",
    'inBirthDate': "1665",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1709",
    'inDeathDateIsBefore': false,
    'inPrefName': "Judith",
    'currentLastName' : "Benin",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1665",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1709",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Benin",
  },
{
    // Reported as a bug where extension does nothing. Has no real data in it
    'profileName': "Arseneau-156",
    'inBirthDate': "20 Jul 1813",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 Feb 1890",
    'inDeathDateIsBefore': false,
    'inPrefName': "Marguerite-Eugénie",
    'currentLastName' : "Arseneau",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "20 Jul 1813",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 Feb 1890",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Arseneau",
  },
  {
    // Reported as a bug where extension does nothing. Has no real data in it
    'profileName': "Arseneau-156",
    'profileVariant': "a",
    'inBirthDate': "20 Jul 1813",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 Feb 1890",
    'inDeathDateIsBefore': false,
    'inPrefName': "Marguerite-Eugénie",
    'currentLastName' : "Arseneau",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "20 Jul 1813",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 Feb 1890",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Arseneau",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Caused issues, see G2G post:
    // https://www.wikitree.com/g2g/1147239/why-are-people-destroying-profiles-with-wikitreeagc
    'profileName': "Ballard-630",
    'inBirthDate': "16 Nov 1870",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Nov 1939",
    'inDeathDateIsBefore': false,
    'inPrefName': "Edward",
    'currentLastName' : "Ballard",
    'inPersonGender': "Male",

    'refSucceeded' : false,
    'refErrorMessage' : "Found line ': Event:' within a 'Marriage' section. Lines like this are only expected within the 'Event' section.",
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Barnes-151",
    'inBirthDate': "6 Sep 1708",
    'inBirthDateIsBefore': false,
    'inDeathDate': "27 May 1785",
    'inDeathDateIsBefore': false,
    'inPrefName': "Hannah",
    'currentLastName' : "Brooks",
    'inPersonGender': "Female",

    'refSucceeded' : false,
    'refErrorMessage' : "Found line '* Source: <span id='S-2105530061'>S-2105530061</span> Repository: [[#R-2144424333]] Title:  Connecticut Town Birth Records, pre-1870 (Barbour Collection) Author:  Ancestry.com Publication:  Online publication - Provo, UT, USA: Ancestry.com Operations Inc, 2006.Original data - White, Lorraine Cook, ed. The Barbour Collection of Connecticut Town Vital Records. Baltimore, MD, USA: Genealogical Publishing Co., 1994-2002.Original data: White, Lorr Note:   APID:  1,1034::0  ' within a 'Marriage' section. This is not consistent with the normal format for an early GEDCOM import. Profile may have been merged or edited.",
  },
  {
    // From Linda - loses a NOTE reference
    'profileName': "Barr-256",
    'inBirthDate': "25 Mar 1802",
    'inBirthDateIsBefore': false,
    'inDeathDate': "14 Feb 1860",
    'inDeathDateIsBefore': false,
    'inPrefName': "James",
    'currentLastName' : "Barr",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "25 Mar 1802",
    'refBirthDateIsBefore': false,
    'refDeathDate': "14 Feb 1860",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Barr",
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Barral-5",
    'inBirthDate': "Jul 1873",
    'inBirthDateIsBefore': false,
    'inDeathDate': "19 Mar 1945",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charlotte",
    'currentLastName' : "Barral",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1873",
    'refBirthDateIsBefore': false,
    'refDeathDate': "19 Mar 1945",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Barral-5",
    'profileVariant': "a",
    'inBirthDate': "Jul 1873",
    'inBirthDateIsBefore': false,
    'inDeathDate': "19 Mar 1945",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charlotte",
    'currentLastName' : "Barral",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1873",
    'refBirthDateIsBefore': false,
    'refDeathDate': "19 Mar 1945",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Barral",

    'options': {
      narrative_includeCountry: 'never',
      otherFields_useLastHusbandNameForCurrentLastName: false,
    },
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Barral-5",
    'profileVariant': "b",
    'inBirthDate': "Jul 1873",
    'inBirthDateIsBefore': false,
    'inDeathDate': "19 Mar 1945",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charlotte",
    'currentLastName' : "Barral",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1873",
    'refBirthDateIsBefore': false,
    'refDeathDate': "19 Mar 1945",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      narrative_includeCountry: 'first',
      sources_addFreeLinksForSubscriptionSources: false,
    },
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Bayley-507",
    'inBirthDate': "23 Mar 1901",
    'inBirthDateIsBefore': false,
    'inDeathDate': "14 Nov 1981",
    'inDeathDateIsBefore': false,
    'inPrefName': "Clara",
    'currentLastName' : "Miskin",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "23 Mar 1901",
    'refBirthDateIsBefore': false,
    'refDeathDate': "14 Nov 1981",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Miskin",
  },
  {
    // Has no Name section, has multiple birth facts
    'profileName': "Belding-505",
    'inBirthDate': "1 Jul 1720",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Jul 1813",
    'inDeathDateIsBefore': false,
    'inPrefName': "Stephen",
    'currentLastName' : "Belding",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1 Jul 1720",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Jul 1813",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Belding",
  },
  {
    // Has no actual facts
    'profileName': "Biddick-9",
    'inBirthDate': "29 Apr 1825",
    'inBirthDateIsBefore': false,
    'inDeathDate': "10 Jan 1901",
    'inDeathDateIsBefore': false,
    'inPrefName': "Kezia",
    'currentLastName' : "Biddick",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "29 Apr 1825",
    'refBirthDateIsBefore': false,
    'refDeathDate': "10 Jan 1901",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Biddick",
  },
  {
    // Bug reported on 3/29/2021. Latest format had 3 issues:
    // - FSFTID is not getting detected for latest format
    // - It is added empty refs with </ref>.</ref> on the end
    //   It is because the source.citation is “</ref>.”
    //   This is because there is already a /n before <ref name =“ref_?”> but not after it.
    // - For the Birth the “Note:” is being used as the location.
    'profileName': "Bodie-155",
    'inBirthDate': "4 Aug 1893",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Mar 1959",
    'inDeathDateIsBefore': false,
    'inPrefName': "Robert",
    'currentLastName' : "Bodie",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "4 Aug 1893",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Mar 1959",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Bodie",
  },
  {
    // Died young - has only baptism, death and burial. Only source for death is burial.
    'profileName': "Booker-1622",
    'inBirthDate': "1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1807",
    'inDeathDateIsBefore': false,
    'inPrefName': "Anna",
    'currentLastName' : "Booker",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "15 August 1807",
    'refBirthDateIsBefore': true,
    'refDeathDate': "6 December 1807",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Booker",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // From my tree. Has birth Abt. 1815 and baptism in 1814.
    'profileName': "Booker-1623",
    'inBirthDate': "1815",
    'inBirthDateIsBefore': false,
    'inDeathDate': "14 Oct 1888",
    'inDeathDateIsBefore': false,
    'inPrefName': "Edward",
    'currentLastName' : "Booker",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "27 December 1814",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 Oct 1888",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Booker",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // From GEDCOM cleanup list. It is a slight variation of the 2020 format.
    // No '''Name''' instead '''Sophia'''
    'profileName': "Bowler-883",
    'inBirthDate': "25 Apr 1837",
    'inBirthDateIsBefore': false,
    'inDeathDate': "26 Dec 1909",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sophia",
    'currentLastName' : "Bowler",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "25 Apr 1837",
    'refBirthDateIsBefore': false,
    'refDeathDate': "26 Dec 1909",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Plumbtree",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // From Kay Knight, May 2021.
    // No Biography section. Was losing part of immigration
    'profileName': "Boyle-121",
    'inBirthDate': "28 Nov 1855",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Jun 1944",
    'inDeathDateIsBefore': false,
    'inPrefName': "Hugh E",
    'currentLastName' : "Boyle",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 Nov 1855",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Jun 1944",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Boyle",
  },
  {
    // Example from Christina Mckeithan : Gray-19545. Has a burial with a place but no location.
    'profileName': "Brender-30",
    'inBirthDate': "2 Oct 1830",
    'inBirthDateIsBefore': false,
    'inDeathDate': "20 Sep 1897",
    'inDeathDateIsBefore': false,
    'inFirstName': "John Leonard",
    'inMiddleName': "",
    'inPrefName': "John Leonard",
    'currentLastName' : "Brender",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "2 Oct 1830",
    'refBirthDateIsBefore': false,
    'refDeathDate': "20 Sep 1897",
    'refDeathDateIsBefore': false,
    'refFirstName': "John",
    'refMiddleName': "Leonard",
    'refPrefName': "John",
    'refCurrentLastName' : "Brender",
  },
  {
    'profileName': "Brender-30",
    'profileVariant': "a",
    'inBirthDate': "2 Oct 1830",
    'inBirthDateIsBefore': false,
    'inDeathDate': "20 Sep 1897",
    'inDeathDateIsBefore': false,
    'inFirstName': "John Leonard",
    'inMiddleName': "",
    'inPrefName': "John Leonard",
    'currentLastName' : "Brender",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "2 Oct 1830",
    'refBirthDateIsBefore': false,
    'refDeathDate': "20 Sep 1897",
    'refDeathDateIsBefore': false,
    'refFirstName': "John Leonard",
    'refMiddleName': "",
    'refPrefName': "John Leonard",
    'refCurrentLastName' : "Brender",
    'options': {
      dataFields_moveNamesFromFirstToMiddle: 'never',
    },
  },
  {
    // Example from Christina Mckeithan : Gray-19545. Has a burial with a place but no location.
    'profileName': "Brockenhuus-1",
    'inBirthDate': "31 Oct 1587",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Mar 1656",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sophie",
    'currentLastName' : "Brockenhuus",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "31 Oct 1587",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Mar 1656",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Brockenhuus",
  },
  {
    // Example from Christina Mckeithan : Gray-19545. Has a burial with a place but no location.
    'profileName': "Brodie-85",
    'inBirthDate': "1771",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Brodie",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1771",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Brodie",
  },
  {
    // Example from Christina Mckeithan : Gray-19545. Has a burial with a place but no location.
    'profileName': "Brooke-2425",
    'inBirthDate': "1824",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Nancy",
    'currentLastName' : "Brooke",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1824",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Brooke",
  },
  {
    // Example from 2021 clean-a-thon
    'profileName': "Browning-501",
    'inBirthDate': "1588",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1635",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Browning",
    'inPersonGender': "Male",

    'refSucceeded' : false,
    'refErrorMessage' : "Found line 'The Browning family were residents in the Gloucester (England) region before 1335 and had been major businessmen, land owners, sheriffs, members of parliament and hosts to various noblemen over the years.  The name may be spelled as Bruning, Brunyn, Brounyng as well as Browning.' within a 'Ancestry in England' section. This is not consistent with the normal format for an early GEDCOM import. Profile may have been merged or edited.",
  },
  {
    // From Hilary. Has APID and Date changed
    'profileName': "Bumstead-11",
    'inBirthDate': "Sep 1874",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Emily",
    'currentLastName' : "Bumstead",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Sep 1874",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Bumstead",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // From Hilary. Has APID and Date changed
    'profileName': "Bumstead-11",
    'profileVariant': "a",
    'inBirthDate': "Sep 1874",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Emily",
    'currentLastName' : "Bumstead",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Sep 1874",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Bumstead",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_accessedDate: 'before',
    },
  },
  {
    // Found in Somerset GEDCOM Junk 28-Apr-2021. It was combining two facts and losing refs
    'profileName': "Burt-1803",
    'inBirthDate': "1761",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1846",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Burt",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1761",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1846",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Burt",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Example of a profile with an Ancestry "Note" with a link in it.
    'profileName': "Carlsdotter-1116",
    'inBirthDate': "7 Sep 1855",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1915",
    'inDeathDateIsBefore': false,
    'inPrefName': "Hedda",
    'currentLastName' : "Carlsdotter",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "7 Sep 1855",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1915",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Carlsdotter",
  },
  {
    // Example from Linda Petersen causing an empty ref
    // It was caused by a duplicate (superset) ref on the same fact (Name fact)
    'profileName': "Chafin-11",
    'inBirthDate': "10 Jan 1832",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Aug 1868",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sarah",
    'currentLastName' : "Almand",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "10 Jan 1832",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Aug 1868",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Almand",
  },
  {
    // Example from Linda Petersen causing an empty ref
    'profileName': "Chafin-11",
    'profileVariant': "a",
    'inBirthDate': "10 Jan 1832",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Aug 1868",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sarah",
    'currentLastName' : "Almand",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "10 Jan 1832",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Aug 1868",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Almand",

    'options': {
      references_named: 'selective',
    },
  },
  {
    // Example from Linda Petersen causing an empty ref
    'profileName': "Chafin-11",
    'profileVariant': "b",
    'inBirthDate': "10 Jan 1832",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Aug 1868",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sarah",
    'currentLastName' : "Almand",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "10 Jan 1832",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Aug 1868",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Almand",

    'options': {
      references_named: 'all',
    },
  },
  {
    // Example of a profile with an Ancestry "Note" with a link in it.
    'profileName': "Chaplin-1739",
    'inBirthDate': "Oct 1865",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Albert",
    'currentLastName' : "Chaplin",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Oct 1865",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Chaplin",
  },
  {
    // Found during 2021 clean-a-thon (2015 import, looses some marriage detail)
    'profileName': "Chown-104",
    'inBirthDate': "1806",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Daw",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "8 October 1806",
    'refBirthDateIsBefore': true,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Daw",
  },
  {
    // Found by Kay Knight. The gedcom name contains ..ged
    'profileName': "Cobb-543",
    'inBirthDate': "14 May 1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "18 Feb 1875",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Cobb",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "14 May 1807",
    'refBirthDateIsBefore': false,
    'refDeathDate': "18 Feb 1875",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Cobb",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Example from Sarah Grimaldi
    'profileName': "Cobbledick-32",
    'inBirthDate': "1696",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1735",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Cobbledick",
    'inPersonGender': "Male",

    'refSucceeded' : false,
    'refErrorMessage' : "Found line 'John was born around 1696 to Elizabeth and Abraham Cobbledick.' within a 'Birth' section. This is not consistent with the normal format for an early GEDCOM import. Profile may have been merged or edited.",
  },
  {
    // 2020 format. Has been edited - had a category on first line
    'profileName': "Collins-26113",
    'inBirthDate': "1819",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Dec 1879",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ann",
    'currentLastName' : "Collins",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1819",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Dec 1879",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Collins",
  },
  {
    // Found during 2021 clean-a-thon (sometimes there is census data under marriage section)
    'profileName': "Coombe-146",
    'inBirthDate': "Jan 1823",
    'inBirthDateIsBefore': false,
    'inDeathDate': "2 Feb 1907",
    'inDeathDateIsBefore': false,
    'inPrefName': "George",
    'currentLastName' : "Coombe",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Jan 1823",
    'refBirthDateIsBefore': false,
    'refDeathDate': "2 Feb 1907",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Coombe",
  },
  {
    // From Hilary. 2011 format. Has parents marriage.
    'profileName': "Cullington-48",
    'inBirthDate': "1826",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1907",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ephraim",
    'currentLastName' : "Cullington",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "5 March 1826",
    'refBirthDateIsBefore': true,
    'refDeathDate': "1907",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Cullington",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    'profileName': "Davey-2738",
    'inBirthDate': "1849",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charles",
    'currentLastName' : "Davey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1849",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Davey",
  },
  {
    'profileName': "Davis-93069",
    'inBirthDate': "28 Jun 1891",
    'inBirthDateIsBefore': false,
    'inDeathDate': "20 Dec 1969",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sadie",
    'currentLastName' : "Davis",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "28 Jun 1891",
    'refBirthDateIsBefore': false,
    'refDeathDate': "20 Dec 1969",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Davis",
  },
  {
    'profileName': "Denman-1",
    'inBirthDate': "1591",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1624",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Denman",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1591",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1624",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Denman",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Example from Jan Terink : Has "Could not interpret date in Birth Date (20 MAY 19??)" which causes issues
    // See Jan's comment on WikiTree AGC
    'profileName': "DeROO-85",
    'inBirthDate': "1900",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Edward",
    'currentLastName': "DeROO",
    'inPersonGender': "Male",

    'refSucceeded' : false,
    'refErrorMessage' : "The profile contains ''Could not interpret date in Birth Date (20 MAY 19??).<br>''. Ignoring this message can result in bad dates in the profile data fields. Please check the dates and remove this message before running WikiTree AGC.",
  },
  {
    // An example from the Barron GEDCOM
    'profileName': "Di_Rocco-2",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Eugene",
    'currentLastName' : "Albano",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Albano",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      removeGedcomVerbiage: false,
    },
  },
  {
    'profileName': "Downie-177",
    'inBirthDate': "1 Jun 1661",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 May 1756",
    'inDeathDateIsBefore': false,
    'inPrefName': "Margaret",
    'currentLastName' : "Tester",   // arbitrary name to test alert - she has no marriage facts
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1 Jun 1661",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 May 1756",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Tester",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  { // MyHeritage example
    'profileName': "Duck-691",
    'inBirthDate': "22 Apr 1847",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1919",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charles",
    'currentLastName' : "Duck",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "22 Apr 1847",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1919",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Duck",
  },
  {
    // Reported by Sarah Grimaldi (28-Apr-2021). Was loosing baptism data
    'profileName': "Dunstone-173",
    'inBirthDate': "27 Dec 1688",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1693",
    'inDeathDateIsBefore': false,
    'inPrefName': "Thomas",
    'currentLastName' : "Dunstone",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "27 Dec 1688",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1693",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Dunstone",
  },
  {
    // Reported by Sarah Grimaldi (28-Apr-2021). Was loosing baptism data
    'profileName': "Dunstone-173",
    'profileVariant': "a",
    'inBirthDate': "27 Dec 1688",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1693",
    'inDeathDateIsBefore': false,
    'inPrefName': "Thomas",
    'currentLastName' : "Dunstone",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "27 Dec 1688",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1693",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Dunstone",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    'profileName': "Ellacott-59",
    'inBirthDate': "1808",
    'inBirthDateIsBefore': false,
    'inDeathDate': "2 Sep 1885",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Pavey",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "8 January 1808",
    'refBirthDateIsBefore': true,
    'refDeathDate': "2 Sep 1885",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
  },
  {
    'profileName': "Ellacott-59",
    'profileVariant': "a",
    'inBirthDate': "1808",
    'inBirthDateIsBefore': false,
    'inDeathDate': "2 Sep 1885",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Pavey",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "8 January 1808",
    'refBirthDateIsBefore': true,
    'refDeathDate': "2 Sep 1885",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      include_age: 'most',
      include_externalMedia: false,
    },
  },
  {
    'profileName': "Ellacott-59",
    'profileVariant': "b",
    'inBirthDate': "1808",
    'inBirthDateIsBefore': false,
    'inDeathDate': "2 Sep 1885",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Ellacott",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "8 January 1808",
    'refBirthDateIsBefore': true,
    'refDeathDate': "2 Sep 1885",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Ellacott",

    'options': {
      references_named: 'minimal',
    },
  },
  {
    // A bug reported by Linda Petersen (27/2/2021). She added a section in bold that incorrectly gets 
    // treated as a section heading.
    'profileName': "Fallows-36",
    'inBirthDate': "21 Jan 1888",
    'inBirthDateIsBefore': false,
    'inDeathDate': "18 Dec 1954",
    'inDeathDateIsBefore': false,
    'inPrefName': "Emma",
    'currentLastName' : "Godshall",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "21 Jan 1888",
    'refBirthDateIsBefore': false,
    'refDeathDate': "18 Dec 1954",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Godshall",

    'options': {
      references_named: 'all',
    },
  },
  {
    'profileName': "Fallows-36",
    'profileVariant': "a",
    'inBirthDate': "21 Jan 1888",
    'inBirthDateIsBefore': false,
    'inDeathDate': "18 Dec 1954",
    'inDeathDateIsBefore': false,
    'inPrefName': "Emma",
    'currentLastName' : "Godshall",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "21 Jan 1888",
    'refBirthDateIsBefore': false,
    'refDeathDate': "18 Dec 1954",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Godshall",

    'options': {
      references_named: 'all',
      narrative_addAtUnknownLocation: false,
    },
  },
  {
    // A bug reported by Julie (Fiscus-32) (27/2/2021). This is similar to the O'Keefe issue.
    // In this 2010 version it doesn't use inline citations at all. So we could try to convert to 
    'profileName': "Freer-26",
    'inBirthDate': "8 Oct 1804",
    'inBirthDateIsBefore': false,
    'inDeathDate': "24 Mar 1893",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ann",
    'currentLastName' : "McEntee",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "8 Oct 1804",
    'refBirthDateIsBefore': false,
    'refDeathDate': "24 Mar 1893",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "McEntee",

    'options': {
      references_named: 'all',
    },
  },
  {
    // A bug reported by Debi Hoag, it loses the only source
    'profileName': "Fulton-2236",
    'inBirthDate': "1879",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Thomas",
    'currentLastName' : "Fulton",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1879",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Fulton",

    'options': {
      references_named: 'all',
    },
  },
  {
    // Found by Kay Knight - just a one-liner with gedcom name. Gedcom name has .aspx.ged on end
    'profileName': "Garr-5",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Abraham",
    'currentLastName' : "Garr",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Garr",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Found cleaning junk in Somerset 28 April 2021. Has diff format User ID, Record ID Number
    'profileName': "Gaylard-197",
    'inBirthDate': "31 Jul 1824",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Oct 1918",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Gaylard",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "31 Jul 1824",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Oct 1918",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Gaylard",

    'options': {
      references_named: 'all',
    },
  },
  {
    // Found cleaning junk in Somerset 28 April 2021. Has diff format User ID, Record ID Number
    'profileName': "Gaylard-197",
    'profileVariant': "a",
    'inBirthDate': "31 Jul 1824",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Oct 1918",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Gaylard",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "31 Jul 1824",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Oct 1918",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Gaylard",

    'options': {
      references_named: 'all',
      removeGedcomVerbiage: false,
    },
  },
  {
    // Found cleaning junk in Somerset 28 April 2021. Has diff format User ID, Record ID Number
    'profileName': "Geiger-169",
    'inBirthDate': "11 Nov 1841",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 Dec 1908",
    'inDeathDateIsBefore': false,
    'inPrefName': "Susanna",
    'currentLastName' : "Hartmann",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "11 Nov 1841",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 Dec 1908",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Hartmann",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Found cleaning junk in Somerset 28 April 2021. Has diff format User ID, Record ID Number
    'profileName': "Gill-1995",
    'inBirthDate': "1871",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1953",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Gill",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1871",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1953",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Gill",

    'options': {
      references_named: 'all',
    },
  },
  {
    // James Wesley Harbour. I potted this one failed when testing on website.
    'profileName': "Harbour-271",
    'inBirthDate': "28 Apr 1855",
    'inBirthDateIsBefore': false,
    'inDeathDate': "15 Dec 1935",
    'inDeathDateIsBefore': false,
    'inFirstName': "James Wesley",
    'inPrefName': "James Wesley",
    'inMiddleName': "",
    'currentLastName' : "Harbour",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 Apr 1855",
    'refBirthDateIsBefore': false,
    'refDeathDate': "15 Dec 1935",
    'refDeathDateIsBefore': false,
    'refFirstName': "James",
    'refPrefName': "James",
    'refMiddleName': "Wesley",
    'refCurrentLastName' : "Harbour",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Another example of a profile with a burial fact with no date. Also a naturalization that shares ref with arrival. Also no sources starting with S-
    'profileName': "Harper-11813",
    'inBirthDate': "1876",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Dec 1952",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jessie",
    'currentLastName' : "Harper",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1876",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Dec 1952",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Dyer",
  },
  {
    // Another example of a profile with a burial fact with no date. Also a naturalization that shares ref with arrival. Also no sources starting with S-
    'profileName': "Harper-11813",
    'profileVariant': "a",
    'inBirthDate': "1876",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Dec 1952",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jessie",
    'currentLastName' : "Dyer",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1876",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Dec 1952",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Dyer",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Example that Rick Pierpont compalined lost information
    'profileName': "Harrison-3584",
    'inBirthDate': "4 Jul 1764",
    'inBirthDateIsBefore': false,
    'inDeathDate': "10 Apr 1808",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Beach",
    'inPersonGender': "Female",

    'refSucceeded' : false,
    'refErrorMessage' : "Unrecognized line in sources:\n* <span id='Payne'></span>Payne, Charles Thomas. ''[[Space:Litchfield and Morris Inscriptions|Litchfield and Morris Inscriptions]]'' (D.C. Kilbourn, Litchfield, Conn., 1905) [https://archive.org/stream/litchfieldmorris00payn#page/15/mode/1up Page 15]\nThis profile looks like it may have been edited. If you want to proceed anyway try removing those lines first.",
  },
  {
    // Example from Marcie of Data Doctors, has User ID etc
    'profileName': "Harwell-265",
    'inBirthDate': "2 May 1897",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 May 1960",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jess B",
    'currentLastName' : "Harwell",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "2 May 1897",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 May 1960",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Harwell",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Example from Marcie of Data Doctors, has User ID etc
    'profileName': "Harkom-2",
    'inBirthDate': "1825",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Dec 1871",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Harkom",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1825",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Dec 1871",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Harkom",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Example from Kay Knight - almost empty
    'profileName': "Hied-2",
    'inBirthDate': "10 Jan 1908",
    'inBirthDateIsBefore': false,
    'inDeathDate': "16 Nov 1988",
    'inDeathDateIsBefore': false,
    'inPrefName': "Bertha M",
    'currentLastName' : "Hied",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "10 Jan 1908",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Nov 1988",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Hied",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      removeGedcomVerbiage: false,
     },
  },
  {
    // Bug report from Geoff, has External Files section
    'profileName': "Horner-3289",
    'inBirthDate': "1845",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Nov 1892",
    'inDeathDateIsBefore': false,
    'inPrefName': "Margaret",
    'currentLastName' : "Sunter",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "19 July 1846",
    'refBirthDateIsBefore': true,
    'refDeathDate': "Nov 1892",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Sunter",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Bug report from Geoff, has External Files section
    'profileName': "Horner-4364",
    'inBirthDate': "1838",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1873",
    'inDeathDateIsBefore': false,
    'inPrefName': "George",
    'currentLastName' : "Horner",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1838",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1873",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Horner",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Bug report from Linda Petersen
    'profileName': "Howell-887",
    'inBirthDate': "12 Mar 1935",
    'inBirthDateIsBefore': false,
    'inDeathDate': "12 Jan 2011",
    'inDeathDateIsBefore': false,
    'inPrefName': "Norbert",
    'currentLastName' : "Howell",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "12 Mar 1935",
    'refBirthDateIsBefore': false,
    'refDeathDate': "12 Jan 2011",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Howell",

    'options': {
      include_age: 'most',
      references_named: 'all',
    },
  },
  {
    // Bug report from Linda Petersen
    'profileName': "Howell-887",
    'profileVariant': "a",
    'inBirthDate': "12 Mar 1935",
    'inBirthDateIsBefore': false,
    'inDeathDate': "12 Jan 2011",
    'inDeathDateIsBefore': false,
    'inPrefName': "Norbert",
    'currentLastName' : "Howell",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "12 Mar 1935",
    'refBirthDateIsBefore': false,
    'refDeathDate': "12 Jan 2011",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Howell",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      removeGedcomVerbiage: false,
    },
  },
  {
    // Example from Christina Mckeithan : Gray-19545. This example is 2020 formst but has a Census: section
    // It also has both refs left on name fact and external media links which showed up an issue.
    // Also has some redundant Census facts with no sources that could be removed.
    'profileName': "Huffman-3325",
    'inBirthDate': "27 Jan 1862",
    'inBirthDateIsBefore': false,
    'inDeathDate': "11 Aug 1930",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Huffman",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "27 Jan 1862",
    'refBirthDateIsBefore': false,
    'refDeathDate': "11 Aug 1930",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Huffman",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Found by Kay Knight - has both === Source === and === Sources ===
    'profileName': "Jenkins-778",
    'inBirthDate': "1869",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1941",
    'inDeathDateIsBefore': false,
    'inPrefName': "Annie May",
    'currentLastName' : "Jenkins",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1869",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1941",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Jenkins",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Joan Jenner. Really old, imported Jan 2011
    'profileName': "Jenner-10",
    'inBirthDate': "1539",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Jun 1593",
    'inDeathDateIsBefore': false,
    'inPrefName': "Joan",
    'currentLastName' : "Jenner",
    'inPersonGender': "Female",

    'refSucceeded' : false,
    'refErrorMessage' : "Found line ': Date: 06/1593'. There should always be at least two colons before the word 'Date'. It appears that this profile has been edited and cannot be parsed.",
  },
  {
    // Sarah Sophia Katenbeck. Has two marriage bond sources that confuse things. One has no date.
    'profileName': "Katenbeck-1",
    'inBirthDate': "1792",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Apr 1854",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sarah",
    'currentLastName' : "Pavey",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "21 October 1792",
    'refBirthDateIsBefore': true,
    'refDeathDate': "Apr 1854",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // August Katenbeck. Had year-only death and exact burial, burial was getting put before death.
    'profileName': "Katenbeck-2",
    'inBirthDate': "1763",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1803",
    'inDeathDateIsBefore': false,
    'inPrefName': "August",
    'currentLastName' : "Katenbeck",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1763",
    'refBirthDateIsBefore': false,
    'refDeathDate': "10 November 1803",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Katenbeck",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Betty Kelly. Has no Name or Born section. Has multiple death facts.
    'profileName': "Kelly-20948",
    'inBirthDate': "1766",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1854",
    'inDeathDateIsBefore': false,
    'inPrefName': "Betty",
    'currentLastName' : "Kelly",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1766",
    'refBirthDateIsBefore': false,
    'refDeathDate': "9 April 1854",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Bole",

    'options': {
      include_age: 'most',
    },
  },
  {
    // James Talbert Key. Issue raised by Linda Petersen. Has ancestry tree links that don't get converted.
    'profileName': "Key-2394",
    'inBirthDate': "1842",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1861",
    'inDeathDateIsBefore': false,
    'inFirstName': "James Talbert",
    'inPrefName': "James Talbert",
    'inMiddleName': "",
    'currentLastName' : "Key",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1842",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1861",
    'refDeathDateIsBefore': false,
    'refFirstName': "James Talbert",
    'refPrefName': "James Talbert",
    'refMiddleName': "",
    'refCurrentLastName' : "Key",

    'options': {
      include_age: 'most',
    },
  },
  {
    // New format for GEDCOMs uploades on 1 Aug 2021 or later
    // The span is are removed
    'profileName': "King-9222",
    'inBirthDate': "4 Aug 1860",
    'inBirthDateIsBefore': false,
    'inDeathDate': "22 Nov 1934",
    'inDeathDateIsBefore': false,
    'inFirstName': "Sarah",
    'inPrefName': "Sarah",
    'inMiddleName': "Elizabeth",
    'currentLastName' : "Wressell",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "4 Aug 1860",
    'refBirthDateIsBefore': false,
    'refDeathDate': "22 Nov 1934",
    'refDeathDateIsBefore': false,
    'refFirstName': "Sarah",
    'refPrefName': "Sarah",
    'refMiddleName': "Elizabeth",
    'refCurrentLastName' : "Wressell",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Ray Kordeliski. Example of a profile with no == Biography == and no meaningful data (edge case)
    'profileName': "Kordeliski-1",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ray",
    'currentLastName' : "Kordeliski",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Kordeliski",
  },
  {
    // Example of with a different spelling: Acknowledgements vs Acknowledgments
    'profileName': "Langford-139",
    'inBirthDate': "12 Dec 1850",
    'inBirthDateIsBefore': false,
    'inDeathDate': "9 Mar 1923",
    'inDeathDateIsBefore': false,
    'inPrefName': "Judson",
    'currentLastName' : "Langford",
    'inPersonGender': "Male",
    'refSucceeded' : true,
    'refBirthDate': "12 Dec 1850",
    'refBirthDateIsBefore': false,
    'refDeathDate': "9 Mar 1923",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Langford",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // Example of format2020 with double import (duplicated facts and notes)
    'profileName': "Law-4926",
    'inBirthDate': "1873",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1873",
    'inDeathDateIsBefore': false,
    'inPrefName': "Alice",
    'currentLastName' : "Law",
    'inPersonGender': "Female",

    'inParents': {
      'father': { 'name': "Robert Law", 'wikiId': "Law-4916" },
      'mother': { 'name': "Jane (Taylor) Law", 'wikiId': "Taylor-75464" }
    },

    'refSucceeded' : true,
    'refBirthDate': "1873",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1873",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Law",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    // Example of LDS Sealing Child
    'profileName': "Leaker-4",
    'inBirthDate': "5 Aug 1879",
    'inBirthDateIsBefore': false,
    'inDeathDate': "4 Dec 1943",
    'inDeathDateIsBefore': false,
    'inPrefName': "Charles Joseph",
    'currentLastName' : "Leaker",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "5 Aug 1879",
    'refBirthDateIsBefore': false,
    'refDeathDate': "4 Dec 1943",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Leaker",
  },
  {
    // Example of format2020 with double import (duplicated facts and notes)
    'profileName': "Lester-3173",
    'inBirthDate': "1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Feb 1877",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Lester",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "25 January 1807",
    'refBirthDateIsBefore': true,
    'refDeathDate': "8 Feb 1877",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Lester",
  },
  {
    // Test of supressing child baptisms
    'profileName': "Lester-3173",
    'profileVariant': "a",
    'inBirthDate': "1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Feb 1877",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Lester",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "25 January 1807",
    'refBirthDateIsBefore': true,
    'refDeathDate': "8 Feb 1877",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Lester",

    'options': {
      sources_supressChildBaptisms: true,
    },
  },
  {
    // Test of supressing child marriages
    'profileName': "Lester-3173",
    'profileVariant': "b",
    'inBirthDate': "1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Feb 1877",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Lester",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "25 January 1807",
    'refBirthDateIsBefore': true,
    'refDeathDate': "8 Feb 1877",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Lester",

    'options': {
      sources_supressChildMarriages: true,
    },
  },
  {
    // Test of supressing child baptisms and marriages
    'profileName': "Lester-3173",
    'profileVariant': "c",
    'inBirthDate': "1807",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Feb 1877",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Lester",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "25 January 1807",
    'refBirthDateIsBefore': true,
    'refDeathDate': "8 Feb 1877",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Lester",

    'options': {
      sources_supressChildBaptisms: true,
      sources_supressChildMarriages: true,
    },
  },
  {
    // Found when fixing GEDCOM junk in Somerset (28-Apr-2021). Was losing occupation
    'profileName': "Linington-6",
    'inBirthDate': "1892",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1967",
    'inDeathDateIsBefore': false,
    'inPrefName': "Victor",
    'currentLastName' : "Linington",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1892",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1967",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Linington",
  },
  {
    'profileName': "Martin-2896",
    'inBirthDate': "14 Dec 1680",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 Mar 1721",
    'inDeathDateIsBefore': false,
    'inFirstName': "James",
    'inPrefName': "James",
    'inMiddleName': "",
    'currentLastName' : "Martin",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "14 Dec 1680",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 Mar 1721",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Martin",
  },
  {
    'profileName': "Martin-6043",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inFirstName': "Andrew",
    'inPrefName': "Andrew",
    'inMiddleName': "",
    'currentLastName' : "Martin",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Martin",

    'options': {
      references_named: 'all',
    },
  },
  {
    // Profile from Linda Petersen
    'profileName': "Mayeux-38",
    'inBirthDate': "20 Jan 1790",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Sep 1841",
    'inDeathDateIsBefore': false,
    'inPrefName': "Adelaide",
    'currentLastName' : "Mayeux",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "20 Jan 1790",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Sep 1841",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Rabalais",
  },
  {
    // Profile from Loralee
    'profileName': "McLean-7766",
    'inBirthDate': "16 Aug 1846",
    'inBirthDateIsBefore': false,
    'inDeathDate': "16 Oct 1933",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "McLean",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "16 Aug 1846",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Oct 1933",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "McLean",
  },
  {
    // Profile from Kay. Very early and has duplicate Source Sections
    'profileName': "Meggit-1",
    'inBirthDate': "18 Apr 1649",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Meggit",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "18 Apr 1649",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Meggit",
  },
  {
    // Example from Linda
    'profileName': "Morrison-2230",
    'inBirthDate': "8 Jan 1794",
    'inBirthDateIsBefore': false,
    'inDeathDate': "30 Sep 1863",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Morrison",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "8 Jan 1794",
    'refBirthDateIsBefore': false,
    'refDeathDate': "30 Sep 1863",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Morrison",
  },
  {
    // Example from G2G Christina. Has a notes section within sources
    'profileName': "Morrison-2820",
    'inBirthDate': "24 May 1866",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Nov 1937",
    'inDeathDateIsBefore': false,
    'inPrefName': "Andrew Smart",
    'currentLastName' : "Morrison",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 May 1866",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Nov 1937",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Morrison",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    // Modified version of Zaborskas-53 to test moving names from first to middle
    'profileName': "Morrison-2820",
    'profileVariant': "a",
    'inBirthDate': "24 May 1866",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Nov 1937",
    'inDeathDateIsBefore': false,
    'inPrefName': "Andrew Smart",
    'currentLastName' : "Morrison",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 May 1866",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Nov 1937",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Morrison",

    'options': {
      include_age: 'most',
      removeGedcomVerbiage: false,
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    // Modified version of Zaborskas-53 to test moving names from first to middle
    'profileName': "Morrison-2820",
    'profileVariant': "b",
    'inBirthDate': "24 May 1866",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Nov 1937",
    'inDeathDateIsBefore': false,
    'inFirstName': "Andrew Bill Chris David",
    'inPrefName': "Andrew Erik Francis",
    'inMiddleName': "Greg Henry",
    'currentLastName' : "Morrison",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 May 1866",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Nov 1937",
    'refDeathDateIsBefore': false,
    'refFirstName' : "Andrew",
    'refPrefName' : "Andrew Erik Francis",
    'refMiddleName' : "Bill Chris David Greg Henry",
    'refCurrentLastName' : "Morrison",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    // Modified version of Zaborskas-53 to test moving names from first to middle
    'profileName': "Morrison-2820",
    'profileVariant': "c",
    'inBirthDate': "24 May 1866",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Nov 1937",
    'inDeathDateIsBefore': false,
    'inFirstName': "Andrew Bill Chris David",
    'inPrefName': "Andrew Bill Chris David",
    'inMiddleName': "David Erik Francis",
    'currentLastName' : "Morrison",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 May 1866",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Nov 1937",
    'refDeathDateIsBefore': false,
    'refFirstName' : "Andrew",
    'refPrefName' : "Andrew",
    'refMiddleName' : "Bill Chris David Erik Francis",
    'refCurrentLastName' : "Morrison",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Neville-1671",
    'inBirthDate': "1685",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1754",
    'inDeathDateIsBefore': false,
    'inPrefName': "Littlebury",
    'currentLastName' : "Holcombe",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1685",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1754",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Holcombe",

    'options': {
      references_named: 'all',
      removeGedcomVerbiage: false,
    },
  },
  {
    'profileName': "Nordal-1",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inFirstName': "Torgeir T Tveit",
    'inPrefName': "Torgeir T Tveit",
    'inMiddleName': "",
    'currentLastName' : "Nordal",
    'inPersonGender': "Male",

    'refSucceeded' : false,
    'refErrorMessage' : "There is more than one '== Biography ==' line in text.",

    'options': {
      references_named: 'all',
    },
  },
  {
    // I was emailed about this profile. It had a missing end ref after AGC was run on it.
    // My conclusion was that it was user error since it was significantly edited after AGC was run.
    'profileName': "Odgers-185",
    'inBirthDate': "16 Mar 1896",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Dec 1968",
    'inDeathDateIsBefore': false,
    'inFirstName': "Henry",
    'inPrefName': "Henry",
    'inMiddleName': "Berris",
    'currentLastName' : "Odgers",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "16 Mar 1896",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Dec 1968",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Odgers",

    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "OKeefe-42",
    'inBirthDate': "30 Sep 1862",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Nov 1946",
    'inDeathDateIsBefore': false,
    'inFirstName': "Catherine",
    'inPrefName': "Catherine",
    'inMiddleName': "M.",
    'currentLastName' : "O'Keefe",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "30 Sep 1862",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Nov 1946",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "O'Keefe",

    'options': {
      references_named: 'all',
    },
  },
  {
    'profileName': "Page-3163",
    'inBirthDate': "23 Sep 1863",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 Jul 1915",
    'inDeathDateIsBefore': false,
    'inPrefName': "James Robert",
    'currentLastName' : "Page",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "23 Sep 1863",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 Jul 1915",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Page",

    'options': {
      references_named: 'all',
    },
  },
  {
    'profileName': "Paull-830",
    'inBirthDate': "Jul 1849",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Apr 1937",
    'inDeathDateIsBefore': false,
    'inPrefName': "Clara",
    'currentLastName' : "Paull",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1849",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Apr 1937",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    'profileName': "Pavey-88",
    'inBirthDate': "Jul 1860",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Jul 1948",
    'inDeathDateIsBefore': false,
    'inPrefName': "James Gill",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1860",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Jul 1948",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-88",
    'profileVariant': "a",
    'inBirthDate': "Jul 1860",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Jul 1948",
    'inDeathDateIsBefore': false,
    'inPrefName': "James Gill",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1860",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Jul 1948",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      narrative_includeCountry: 'first',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-88",
    'profileVariant': "b",
    'inBirthDate': "Jul 1860",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Jul 1948",
    'inDeathDateIsBefore': false,
    'inPrefName': "James Gill",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1860",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Jul 1948",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      narrative_includeCountry: 'first',
      narrative_standardizeCountry: true,
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-88",
    'profileVariant': "c",
    'inBirthDate': "Jul 1860",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Jul 1948",
    'inDeathDateIsBefore': false,
    'inPrefName': "James Gill",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "Jul 1860",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Jul 1948",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      narrative_standardizeCountry: true,
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-89",
    'inBirthDate': "1837",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "James",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1837",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-99",
    'inBirthDate': "1833",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Robert",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1833",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
    
    'options': {
      include_age: 'most',
      references_named: 'selective',
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    'profileName': "Pavey-459",
    'inBirthDate': "9 Jul 1891",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Sep 1958",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ralph",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "9 Jul 1891",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Sep 1958",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
  },
  {
    'profileName': "Pavey-459",
    'profileVariant': "a",
    'inBirthDate': "9 Jul 1891",
    'inBirthDateIsBefore': false,
    'inDeathDate': "8 Sep 1958",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ralph",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "9 Jul 1891",
    'refBirthDateIsBefore': false,
    'refDeathDate': "8 Sep 1958",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_named: 'selective',
      include_externalMedia: false,
    },
  },
  {
    'profileName': "Pavey-460",
    'inBirthDate': "1700",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1783",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "23 June 1700",
    'refBirthDateIsBefore': true,
    'refDeathDate': "30 September 1783",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",
  },
  {
    // Joseph Deane Pavey
    'profileName': "Pavey-462",
    'inBirthDate': "1779",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1828",
    'inDeathDateIsBefore': false,
    'inPrefName': "Joseph",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 January 1779",
    'refBirthDateIsBefore': true,
    'refDeathDate': "1828",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
  },
  {
    // Joseph Deane Pavey, with non-default options
    'profileName': "Pavey-462",
    'profileVariant': "a",
    'inBirthDate': "1779",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1828",
    'inDeathDateIsBefore': false,
    'inPrefName': "Joseph",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "24 January 1779",
    'refBirthDateIsBefore': true,
    'refDeathDate': "1828",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      spelling: 'en_us',
      researchNotes_alternateNames: false,
    },
  },
  {
    // Leonard Pavey of Taunton
    'profileName': "Pavey-464",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1831",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 January 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 January 1831",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",
  },
  {
    // Leonard Pavey of Taunton
    'profileName': "Pavey-464",
    'profileVariant': "a",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1831",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 January 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 January 1831",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_named: 'minimal',
    },
  },
  {
    // Leonard Pavey of Taunton
    'profileName': "Pavey-464",
    'profileVariant': "b",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1831",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 January 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 January 1831",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_named: 'selective',
    },
  },
  {
    // Leonard Pavey of Taunton
    'profileName': "Pavey-464",
    'profileVariant': "c",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1831",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 January 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 January 1831",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_named: 'multiple_use',
    },
  },
  {
    // Leonard Pavey of Taunton
    'profileName': "Pavey-464",
    'profileVariant': "d",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1831",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 January 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "14 January 1831",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_named: 'all',
    },
  },
  {
    'profileName': "Pavey-467",
    'inBirthDate': "28 Sep 1863",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Dec 1944",
    'inDeathDateIsBefore': false,
    'inPrefName': "Leonard",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "28 Sep 1863",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Dec 1944",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      references_addNewlineBeforeFirst: true,
      references_addNewline: true,
      references_addNewlineWithin: true,
    },
  },
  {
    // Example of a profile with an Ancestry "Note". Also has multiple birth facts
    'profileName': "Pavey-486",
    'inBirthDate': "1876",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Jan 1905",
    'inDeathDateIsBefore': false,
    'inPrefName': "Kate",
    'currentLastName' : "Pavey",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1876",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Jan 1905",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",
  },
  {
    // Example of a person that migrated from UK to US. Also has residence facts with multiple references
    'profileName': "Pavey-506",
    'inBirthDate': "13 Dec 1828",
    'inBirthDateIsBefore': false,
    'inDeathDate': "19 Aug 1881",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'inParents': {
      'father': { 'name': "Charles Pavey", 'wikiId': "Pavey-505" },
      'mother': { 'name': "Amelia (Holmes) Pavey", 'wikiId': "Holmes-15500" }
    },

    'refSucceeded' : true,
    'refBirthDate': "13 Dec 1828",
    'refBirthDateIsBefore': false,
    'refDeathDate': "19 Aug 1881",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      spelling: 'en_us',
      include_age: 'most',
      researchNotes_alternateNames: false,
    },
  },
  {
    // Example of a person with two voting registers the same year
    'profileName': "Pavey-512",
    'inBirthDate': "Dec 1840",
    'inBirthDateIsBefore': false,
    'inDeathDate': "16 Jan 1869",
    'inDeathDateIsBefore': false,
    'inPrefName': "George",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'inParents': {
      'father': { 'name': "Charles Pavey", 'wikiId': "Pavey-505" },
      'mother': { 'name': "Amelia (Holmes) Pavey", 'wikiId': "Holmes-15500" }
    },

    'refSucceeded' : true,
    'refBirthDate': "Dec 1840",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Jan 1869",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      spelling: 'en_us',
      include_age: 'death_marriage',
      researchNotes_alternateNames: false,
    },
  },
  {
    // USA profile, testing removing country name
    'profileName': "Pavey-512",
    'profileVariant': "a",
    'inBirthDate': "Dec 1840",
    'inBirthDateIsBefore': false,
    'inDeathDate': "16 Jan 1869",
    'inDeathDateIsBefore': false,
    'inPrefName': "George",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'inParents': {
      'father': { 'name': "Charles Pavey", 'wikiId': "Pavey-505" },
      'mother': { 'name': "Amelia (Holmes) Pavey", 'wikiId': "Holmes-15500" }
    },

    'refSucceeded' : true,
    'refBirthDate': "Dec 1840",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Jan 1869",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      narrative_includeCountry: 'first',
    },
  },
  {
    // USA profile, testing removing/standardizing country name
    'profileName': "Pavey-512",
    'profileVariant': "b",
    'inBirthDate': "Dec 1840",
    'inBirthDateIsBefore': false,
    'inDeathDate': "16 Jan 1869",
    'inDeathDateIsBefore': false,
    'inPrefName': "George",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'inParents': {
      'father': { 'name': "Charles Pavey", 'wikiId': "Pavey-505" },
      'mother': { 'name': "Amelia (Holmes) Pavey", 'wikiId': "Holmes-15500" }
    },

    'refSucceeded' : true,
    'refBirthDate': "Dec 1840",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Jan 1869",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      narrative_includeCountry: 'first',
      narrative_standardizeCountry: 'first',
    },
  },
  {
    // James Pavey. Linen draper of London. Example of residences with odd embedded "Source:", also a residence with no date or location
    // Also has an incorrect residence in 1894 - Reading age 12.
    'profileName': "Pavey-518",
    'inBirthDate': "1781",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 Aug 1860",
    'inDeathDateIsBefore': false,
    'inPrefName': "James",
    'currentLastName' : "Pavey",
    'inPersonGender': "Male",

    'inParents': {
      'father': { 'name': "William Pavey", 'wikiId': "Pavey-449" },
      'mother': { 'name': "Sarah (Bragg) Pavey", 'wikiId': "Bragg-2452" }
    },

    'refSucceeded' : true,
    'refBirthDate': "20 December 1781",
    'refBirthDateIsBefore': true,
    'refDeathDate': "21 Aug 1860",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Pavey",

    'options': {
      spelling: 'en_uk',
      include_age: 'most',
      references_named: 'minimal',
    },
  },
  {
    // Adele Pavey. Example of a residence with no date that shares a ref with birth. But it is a marriage record
    'profileName': "Pavey-537",
    'inBirthDate': "Jan 1864",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1 Sep 1929",
    'inDeathDateIsBefore': false,
    'inPrefName': "Adèle",
    'currentLastName' : "Pavey",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Jan 1864",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1 Sep 1929",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Harbour",

    'options': {
      include_age: 'most',
      references_named: 'selective',
    },
  },
  {
    // Example of a profile with a burial fact with no date. Also an immigration date as an Arrival fact.
    'profileName': "Philips-1457",
    'inBirthDate': "1883",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Dec 1946",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Philips",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1883",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Dec 1946",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Philips",
  },
  {
    // Another example of a profile with a burial fact with no date. Also a naturalization that shares ref with arrival. Also no sources starting with S-
    'profileName': "Philips-1466",
    'inBirthDate': "2 Aug 1915",
    'inBirthDateIsBefore': false,
    'inDeathDate': "18 Sep 1974",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Philips",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "2 Aug 1915",
    'refBirthDateIsBefore': false,
    'refDeathDate': "18 Sep 1974",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Philips",
  },
  {
    // Another example of a profile with a burial fact with no date. Also a naturalization that shares ref with arrival. Also no sources starting with S-
    'profileName': "Philips-1466",
    'profileVariant': "a",
    'inBirthDate': "2 Aug 1915",
    'inBirthDateIsBefore': false,
    'inDeathDate': "18 Sep 1974",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Philips",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "2 Aug 1915",
    'refBirthDateIsBefore': false,
    'refDeathDate': "18 Sep 1974",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Philips",

    'options': {
      references_named: 'minimal',
    },
  },
  {
    // An example of a profile with a death date and other facts (residence) in same year
    'profileName': "Priestley-791",
    'inBirthDate': "1765",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1824",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ann",
    'currentLastName' : "Katenback",  // deliberatley mispelled to get alert
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "11 May 1765",
    'refBirthDateIsBefore': true,
    'refDeathDate': "1824",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Katenback",

    'options': {
      references_named: 'selective',
   },
  },
  {
    // Example from Hilary. Has census entries inside marriage section
    'profileName': "Reader-241",
    'inBirthDate': "1799",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Elizabeth",
    'currentLastName' : "Smith",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1799",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Smith",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Example from Kay Knight
    'profileName': "Roach-286",
    'inBirthDate': "1881",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Maude A.",
    'currentLastName' : "Roach",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1881",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Roach",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Example of a 2001 format GEDCOM output
    'profileName': "Robins-302",
    'inBirthDate': "1806",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Sep 1877",
    'inDeathDateIsBefore': false,
    'inPrefName': "William",
    'currentLastName' : "Robins",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1806",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Sep 1877",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Robins",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Example of a 2001 format GEDCOM output
    'profileName': "Robinson-8669",
    'inBirthDate': "1598",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "John",
    'currentLastName' : "Robinson",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1598",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Robinson",

    'options': {
      include_age: 'most',
    },
  },
  {
    // Example of a child that died young
    // There are two birth facts but one gets removed in removeDuplicateFacts
    'profileName': "Shirley-1037",
    'inBirthDate': "23 Nov 1855",
    'inBirthDateIsBefore': false,
    'inBirthLocation' : "Marietta, Washington, Ohio, United States",
    'inDeathDate': "16 Apr 1935",
    'inDeathDateIsBefore': false,
    'inDeathLocation' : "",
    'inFirstName': "Samantha Elizabeth",
    'inPrefName': "Samantha Elizabeth",
    'inMiddleName': "",
    'currentLastName' : "Gooseman",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "23 Nov 1855",
    'refBirthDateIsBefore': false,
    'refDeathDate': "16 Apr 1935",
    'refDeathDateIsBefore': false,
    'refFirstName': "Samantha",
    'refPrefName': "Samantha",
    'refMiddleName': "Elizabeth",
    'refCurrentLastName' : "Gooseman",

    'options': {
      spelling: 'en_us',
      include_age: 'most',
    },
  },
  { // MyHeritage example
    'profileName': "Skewes-262",
    'inBirthDate': "1831",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Jul 1911",
    'inDeathDateIsBefore': false,
    'inPrefName': "Cordelia",
    'currentLastName' : "Dennis",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1831",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Jul 1911",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Dennis",
  },
  { // Example from Kay Knight - simple - has French characters
    'profileName': "Solé-666",
    'inBirthDate': "1763",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Marie Angèle",
    'currentLastName' : "Solé",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1763",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Solé",
  },
  {
    // Example of a child that died young
    'profileName': "Stanley-10159",
    'inBirthDate': "22 Jan 1903",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Feb 1903",
    'inDeathDateIsBefore': false,
    'inPrefName': "Josephine",
    'currentLastName' : "Stanley",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "22 Jan 1903",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Feb 1903",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Stanley",

    'options': {
      spelling: 'en_us',
      include_age: 'most',
    },
  },
  {
    // Example that tests getting the "accessed before" date from GEDCOM import date
    'profileName': "Stockley-36",
    'inBirthDate': "1660",
    'inBirthDateIsBefore': false,
    'inDeathDate': "3 May 1737",
    'inDeathDateIsBefore': true,
    'inPrefName': "Joseph",
    'currentLastName' : "Stockley",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1660",
    'refBirthDateIsBefore': false,
    'refDeathDate': "3 May 1737",
    'refDeathDateIsBefore': true,
    'refCurrentLastName' : "Stockley",

    'options': {
      spelling: 'en_us',
      include_age: 'most',
      references_accessedDate: 'before',
      removeGedcomVerbiage: false,
    },
  },
  {
    // Example from Christina Mckeithan (Gray-19545). Has a section name with spaces and parens. 
    'profileName': "Stoddard-1992",
    'inBirthDate': "23 Feb 1911",
    'inBirthDateIsBefore': false,
    'inDeathDate': "21 May 1987",
    'inDeathDateIsBefore': false,
    'inPrefName': "Deana",
    'currentLastName' : "Thompson",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "23 Feb 1911",
    'refBirthDateIsBefore': false,
    'refDeathDate': "21 May 1987",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Thompson",

    'options': {
      spelling: 'en_us',
      include_age: 'most',
    },
  },
  {
    // Found during 2021 clean-a-thon (sometimes there is census data under marriage section)
    'profileName': "Streeter-87",
    'inBirthDate': "1831",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Mary",
    'currentLastName' : "Piddlesden",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1831",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Piddlesden",
  },
  {
    // Found by Kay Knight
    'profileName': "Strong-217",
    'inBirthDate': "1758",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1848",
    'inDeathDateIsBefore': false,
    'inPrefName': "Ruby",
    'currentLastName' : "Sanford",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1758",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1848",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Sanford",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // From Kay Knight. Example with "Couldn't find any valid last name at birth."
    'profileName': "UNKNOWN-138116",
    'inBirthDate': "",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jan",
    'currentLastName' : "Karr",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Karr",
  },
  {
    // From https://www.wikitree.com/wiki/Space:Current_Gedcom_Under_Review
    'profileName': "Van_Urk-3",
    'inBirthDate': "8 Jan 1789",
    'inBirthDateIsBefore': false,
    'inDeathDate': "15 Dec 1832",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jan",
    'currentLastName' : "Van Urk",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "8 Jan 1789",
    'refBirthDateIsBefore': false,
    'refDeathDate': "15 Dec 1832",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Van Urk",
  },
  {
    // From https://www.wikitree.com/wiki/Space:Current_Gedcom_Under_Review
    'profileName': "Van_Urk-3",
    'profileVariant': "a",
    'inBirthDate': "8 Jan 1789",
    'inBirthDateIsBefore': false,
    'inDeathDate': "15 Dec 1832",
    'inDeathDateIsBefore': false,
    'inPrefName': "Jan",
    'currentLastName' : "Van Urk",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "8 Jan 1789",
    'refBirthDateIsBefore': false,
    'refDeathDate': "15 Dec 1832",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Van Urk",

    'options': {
      removeGedcomVerbiage: false,
    },
  },
  {
    // From Jo. Gets missing sources
    'profileName': "Vanham-17",
    'inBirthDate': "1864",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1930",
    'inDeathDateIsBefore': false,
    'inPrefName': "Virginia",
    'currentLastName' : "Vanham",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1864",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1930",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Leurquin",
  },
  {
    // From Loralee. Has custom Ancestry events with "File" lines
    'profileName': "Ward-30350",
    'inBirthDate': "Sep 1843",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Mary",
    'currentLastName' : "Ward",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "Sep 1843",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Ward",
  },
  { // MyHeritage example, imported from GEDCOM June 2020
    'profileName': "Webb-18841",
    'inBirthDate': "9 Feb 1903",
    'inBirthDateIsBefore': false,
    'inDeathDate': "Mar 1987",
    'inDeathDateIsBefore': false,
    'inFirstName': "Lillias",
    'inPrefName': "Jill",
    'inMiddleName': "Ivy",
    'currentLastName' : "Webb",
    'inPersonGender': "Female",

    'inParents': {
      'mother': { 'name': "Mary Ann (Stocker) Webb", 'wikiId': "Stocker-931" }
    },
    'refSucceeded' : true,
    'refBirthDate': "9 Feb 1903",
    'refBirthDateIsBefore': false,
    'refDeathDate': "Mar 1987",
    'refDeathDateIsBefore': false,
    'refFirstName' : "Lillias",
    'refPrefName' : "Jill",
    'refMiddleName' : "Ivy",
    'refCurrentLastName' : "Webb",
  },
  {
    // Found in Somerset GEDCOM junk list on 28 Apr 2021. I was checking it was OK to remove a source on name.
    // It turned out it was correct because it was a duplicate unnamed ref.
    'profileName': "Welchman-46",
    'inBirthDate': "1700",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Samuel",
    'currentLastName' : "Welchman",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1700",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Welchman",
  },
  {
    // From Raewyn. 2011 format. Has marriage before birth. Has multiple notes. Has links to ancestry.au.
    'profileName': "West-1618",
    'inBirthDate': "29 Dec 1895",
    'inBirthDateIsBefore': false,
    'inDeathDate': "26 Apr 1986",
    'inDeathDateIsBefore': false,
    'inPrefName': "Anne",
    'currentLastName' : "West",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "29 Dec 1895",
    'refBirthDateIsBefore': false,
    'refDeathDate': "26 Apr 1986",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "West",
  },
  {
    // From Kathleen. 
    'profileName': "Whatley-111",
    'inBirthDate': "1801",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Sarah",
    'currentLastName' : "Whatley",
    'inPersonGender': "Female",

    'refSucceeded' : true,
    'refBirthDate': "1801",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Whatley",

    'options': {
      include_age: 'most',
    },
  },
  {
    // From https://www.wikitree.com/wiki/Space:Current_Gedcom_Under_Review
    'profileName': "Wheatley-921",
    'inBirthDate': "1812",
    'inBirthDateIsBefore': false,
    'inDeathDate': "1896",
    'inDeathDateIsBefore': false,
    'inPrefName': "Thomas",
    'currentLastName' : "Wheatley",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1812",
    'refBirthDateIsBefore': false,
    'refDeathDate': "1896",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Wheatley",
  },
  {
    // Enhancement request from Gullison-3
    'profileName': "Zaborskas-53",
    'inBirthDate': "17 Dec 1843",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Sep 1845",
    'inDeathDateIsBefore': false,
    'inPrefName': "Karolis",
    'currentLastName' : "Zaborskas",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "17 Dec 1843",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Sep 1845",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Zaborskas",
  },
  {
    // Modified version of Zaborskas-53 to test moving names from first to middle (now disabled because of country)
    'profileName': "Zaborskas-53",
    'profileVariant': "a",
    'inBirthDate': "17 Dec 1843",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Sep 1845",
    'inDeathDateIsBefore': false,
    'inFirstName': "Karolis Fred Jim",
    'inPrefName': "Karolis Fred Jim",
    'inMiddleName': "Harry",
    'currentLastName' : "Zaborskas",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "17 Dec 1843",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Sep 1845",
    'refDeathDateIsBefore': false,
    'refFirstName' : "Karolis Fred Jim",
    'refPrefName' : "Karolis Fred Jim",
    'refMiddleName' : "Harry",
    'refCurrentLastName' : "Zaborskas",
  },
  {
    // Modified version of Zaborskas-53 to test moving names from firt to middle (now disabled because of country)
    'profileName': "Zaborskas-53",
    'profileVariant': "b",
    'inBirthDate': "17 Dec 1843",
    'inBirthDateIsBefore': false,
    'inDeathDate': "6 Sep 1845",
    'inDeathDateIsBefore': false,
    'inFirstName': "Karolis Fred J",
    'inPrefName': "Karolis Fred",
    'inMiddleName': "Harry Jim F",
    'currentLastName' : "Zaborskas",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "17 Dec 1843",
    'refBirthDateIsBefore': false,
    'refDeathDate': "6 Sep 1845",
    'refDeathDateIsBefore': false,
    'refFirstName' : "Karolis Fred J",
    'refPrefName' : "Karolis Fred",
    'refMiddleName' : "Harry Jim F",
    'refCurrentLastName' : "Zaborskas",
  },
  {
    // Issue reported by Kay Knight, not recognizing the junk Data Changed section
    'profileName': "Zancher-1",
    'inBirthDate': "1645",
    'inBirthDateIsBefore': false,
    'inDeathDate': "",
    'inDeathDateIsBefore': false,
    'inPrefName': "Beati",
    'currentLastName' : "Zancher",
    'inPersonGender': "Male",

    'refSucceeded' : true,
    'refBirthDate': "1645",
    'refBirthDateIsBefore': false,
    'refDeathDate': "",
    'refDeathDateIsBefore': false,
    'refCurrentLastName' : "Zancher",
  },
];

// We are using ES6 import/export everywhere rather than require because the module we are using (editbio.mjs) is used in a context script
// as well as from this node.js test harness
import fs from 'fs'

function getUserOptions(testData) {
  const specifiedOptions = testData.options;

  // use the spread operator to combine the specified options and the default ones
  return { ...defaultUserOptions, ...specifiedOptions }; 
}

function doEditBio(editBioModule, testData) {

  let inputBioText = "";
  let referenceOutputBioText = "";

  const profileName = testData.profileName.toLowerCase();
  const profileVariant = (testData.profileVariant != undefined) ? "_v_" + testData.profileVariant : "";
  const regressionDataPath = "./src/features/agc/regression_data/" + profileName + "/";
  const inBioFile = regressionDataPath + profileName + "_input.txt";
  const refBioFile = regressionDataPath + profileName + profileVariant + "_refout.txt";
  const outBioFile = regressionDataPath + profileName + profileVariant + "_testout.txt";

  console.log(" === doEditBio on " + profileName + profileVariant + " ===");

  try {
    inputBioText = fs.readFileSync(inBioFile, 'utf8');
  } catch (e) {
    console.log('Error:', e.stack);
    testData.causeOfFailure = "Failed to read input file";
    return false;
  }

  try {
    referenceOutputBioText = fs.readFileSync(refBioFile, 'utf8');
  } catch (e) {
    console.log('Error:', e.stack);
    testData.causeOfFailure = "Failed to read reference file";
    return false;
  }

  if (inputBioText != "" && referenceOutputBioText != "") {

    // Get Date object for fixed date (has to be fixed so comparisons with ref output work)
    const runDateObject = new Date("16 July 2020");
    
    const editBioInput = {
      'wikiId' : testData.profileName,
      'birthDate': testData.inBirthDate,
      'birthDateIsBefore': testData.inBirthDateIsBefore,
      'birthLocation': testData.inBirthLocation,
      'deathDate': testData.inDeathDate,
      'deathDateIsBefore': testData.inDeathDateIsBefore,
      'deathLocation': testData.inDeathLocation,
      'personGender': testData.inPersonGender,
      'firstName': (testData.inFirstName == undefined) ? testData.inPrefName : testData.inFirstName,
      'prefName': testData.inPrefName,
      'middleName': (testData.inMiddleName == undefined) ? "" : testData.inMiddleName,
      'currentLastName': testData.currentLastName,
      'parents': testData.inParents,
      'bioText': inputBioText,
      'runDate' : runDateObject,
      'options' : getUserOptions(testData),
    };


    const editBioOutput = editBioModule.editBio(editBioInput);

    if (editBioOutput.succeeded != testData.refSucceeded) {
      console.log("ERROR: Bio succeeded differs. Ref is " + testData.refSucceeded + ", actual is " + editBioOutput.succeeded);
      console.log("Error message = " + editBioOutput.errorMessage);
      testData.causeOfFailure = "editBio return value differs from expected";
      return false;
    }

    if (editBioOutput.succeeded) {

      if (editBioOutput.bioText != referenceOutputBioText) {

        console.log("ERROR: Bios differ. Length of ref is " + referenceOutputBioText.length + ", length of output is " + editBioOutput.bioText.length);
        testData.causeOfFailure = "Output bio differs from reference";

        // Write the output out to a file so we can diff it
        try {
          fs.writeFileSync(outBioFile, editBioOutput.bioText, { mode: 0o755 });
        } catch(err) {
          // An error occurred
          console.error(err);
        }

        return false;
      }

      if (editBioOutput.birthDate != testData.refBirthDate) {
        console.log("ERROR: Birth dates differ. Ref is " + testData.refBirthDate + ", actual is " + editBioOutput.birthDate);
        testData.causeOfFailure = "Birth dates differ";
        return false;
      }
      if (editBioOutput.birthDateIsBefore != testData.refBirthDateIsBefore) {
        console.log("ERROR: Birth is before differs. Ref is " + testData.refBirthDateIsBefore + ", actual is " + editBioOutput.birthDateIsBefore);
        testData.causeOfFailure = "Birth is before differs";
        return false;
      }
  
      if (editBioOutput.deathDate != testData.refDeathDate) {
        console.log("ERROR: Death dates differ. Ref is " + testData.refDeathDate + ", actual is " + editBioOutput.deathDate);
        testData.causeOfFailure = "Death dates differ";
        return false;
      }
      if (editBioOutput.deathDateIsBefore != testData.refDeathDateIsBefore) {
        console.log("ERROR: Death is before differs. Ref is " + testData.refDeathDateIsBefore + ", actual is " + editBioOutput.deathDateIsBefore);
        testData.causeOfFailure = "Death is before differs";
        return false;
      }

      if (testData.refFirstName != undefined && editBioOutput.firstName != testData.refFirstName) {
        console.log("ERROR: First names differ. Ref is " + testData.refFirstName + ", actual is " + editBioOutput.firstName);
        testData.causeOfFailure = "First names differ";
        return false;
      }

      if (testData.refPrefName != undefined && editBioOutput.prefName != testData.refPrefName) {
        console.log("ERROR: Prefered names differ. Ref is " + testData.refPrefName + ", actual is " + editBioOutput.prefName);
        testData.causeOfFailure = "Preferred names differ";
        return false;
      }

      if (testData.refMiddleName != undefined && editBioOutput.middleName != testData.refMiddleName) {
        console.log("ERROR: Middle names differ. Ref is " + testData.refMiddleName + ", actual is " + editBioOutput.middleName);
        testData.causeOfFailure = "Middle names differ";
        return false;
      }

      if (editBioOutput.currentLastName != testData.refCurrentLastName) {
        console.log("ERROR: Current last names differ. Ref is " + testData.refCurrentLastName + ", actual is " + editBioOutput.currentLastName);
        testData.causeOfFailure = "Current last names differ";
        return false;
      }
    }
    else {
      // suceeded was false, check that the error message is the expected one
      if (editBioOutput.errorMessage != testData.refErrorMessage) {
        console.log("ERROR: Error messages differ. Ref is:\n" + testData.refErrorMessage + "\nactual is:\n" + editBioOutput.errorMessage);
        testData.causeOfFailure = "Error messages differ";
        return false;
      }
    }
  }

  return true;
}

function runTests(editBioModule) {

  let testsFailed = [];

  if (process.argv.length > 2) {
    const testName = process.argv[2];
    const profileVariant = process.argv[3];

    for (const testProfile of testProfiles) {

      if (testName == testProfile.profileName && profileVariant == testProfile.profileVariant) {
        if (!doEditBio(editBioModule, testProfile)) {
          console.log("ERROR: Profile failed");
          testsFailed.push(testProfile)
        }
      }
    }
  }
  else {
    for (const testProfile of testProfiles) {

      if (!doEditBio(editBioModule, testProfile)) {
        console.log("ERROR: Profile failed");
        testsFailed.push(testProfile);
      }
    }
  }

  if (testsFailed.length > 0) {
    for (const testProfile of testsFailed) {
      let optionsDesc = "default options";
      if (testProfile.options != undefined && testProfile.options != defaultUserOptions) {
        optionsDesc = "custom options"
      }
      let profileName = testProfile.profileName;
      if (testProfile.profileVariant != undefined) {
        profileName += "_" + testProfile.profileVariant;
      }
      console.log("ERROR: Profile failed : " + profileName + " (" + optionsDesc + "). Cause: "+ testProfile.causeOfFailure);
    }
    return false;
  }

  console.log("SUCCESS: All tests passed");
  return true;
}

function asyncLoadScriptAndCallEditBio() {
  // This asyncronously loads the editbio.mjs module and, once it loads it calls runtests
  (async () => {
    const src = "./library/editbio.mjs";
    const editBioModule = await import(src);
    const success = runTests(editBioModule);
    process.exit(success ? 0 : 1);
  })();
}

asyncLoadScriptAndCallEditBio();
