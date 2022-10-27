import "./redir_ext_links_options";
import { getDefaultOptionValuesForFeature } from "../../core/options/options_registry";
import { updateLink } from "./redir_ext_link";

// To run just this test suite use the command:
//  npm test -- redir_ext_link.test.js
//
// To run an individual test use a command like this:
//  npm test -- -t "Ancestry_ancestry.com_ancestry.co.uk"

const testCases = [
  ////////////////////////////////////////////////////////////////////////////////
  // Tests for ancestry domains
  ////////////////////////////////////////////////////////////////////////////////
  {
    name: "Ancestry_ancestry.com_none",
    options: { ancestryDomain: "none" },
    input: "https://www.ancestry.com/discoveryui-content/view/4576313:7619",
    output: undefined, // if no change output will be undefined
  },
  {
    name: "Ancestry_ancestry.com_ancestry.com",
    options: { ancestryDomain: "ancestry.com" },
    input: "https://www.ancestry.com/discoveryui-content/view/4576313:7619",
    output: undefined, // if no change output will be undefined
  },
  {
    name: "Ancestry_ancestry.com_ancestry.co.uk",
    options: { ancestryDomain: "ancestry.co.uk" },
    input: "https://www.ancestry.com/discoveryui-content/view/4576313:7619",
    output: "https://www.ancestry.co.uk/discoveryui-content/view/4576313:7619",
  },

  ////////////////////////////////////////////////////////////////////////////////
  // Tests for old ancestry links
  ////////////////////////////////////////////////////////////////////////////////
  {
    name: "Ancestry_old_record_us_disabled",
    options: { ancestryOldLinks: false },
    input: "http://trees.ancestry.com/rd?f=sse&db=1910uscenindex&h=7252779&ti=0&indiv=try&gss=pt",
    output: undefined,
  },
  {
    name: "Ancestry_old_record_us",
    options: { ancestryOldLinks: true },
    input: "http://trees.ancestry.com/rd?f=sse&db=1910uscenindex&h=7252779&ti=0&indiv=try&gss=pt",
    output: "http://search.ancestry.com/cgi-bin/sse.dll?db=1910uscenindex&h=7252779&ti=0&indiv=try&gss=pt",
  },
  {
    name: "Ancestry_old_record_uk",
    options: { ancestryOldLinks: true },
    input: "http://trees.ancestry.co.uk/rd?f=sse&db=1910uscenindex&h=7252779&ti=0&indiv=try&gss=pt",
    output: "http://search.ancestry.co.uk/cgi-bin/sse.dll?db=1910uscenindex&h=7252779&ti=0&indiv=try&gss=pt",
  },
  {
    name: "Ancestry_old_tree_us_trees_personMatch",
    options: { ancestryOldLinks: true },
    input: "http://trees.ancestry.com/pt/PersonMatch.aspx?tid=4170228&pid=-1091056570&src=m",
    output: "https://www.ancestry.com/family-tree/person/tree/4170228/person/-1091056570/facts&src=m",
  },
  {
    name: "Ancestry_old_tree_us_trees_AMTCitationRedir",
    options: { ancestryOldLinks: true },
    input: "http://trees.ancestry.com/pt/AMTCitationRedir.aspx?tid=24279608&pid=1680425965",
    output: "https://www.ancestry.com/family-tree/person/tree/24279608/person/1680425965/facts",
  },
  {
    name: "Ancestry_old_tree_ul_trees_AMTCitationRedir",
    options: { ancestryOldLinks: true },
    input: "http://trees.ancestry.co.uk/pt/AMTCitationRedir.aspx?tid=24279608&pid=1680425965",
    output: "https://www.ancestry.co.uk/family-tree/person/tree/24279608/person/1680425965/facts",
  },

  ////////////////////////////////////////////////////////////////////////////////
  // Tests for FMP domains
  ////////////////////////////////////////////////////////////////////////////////
  {
    name: "findmypast.co.uk_none",
    options: { fmpDomain: "none" },
    input: "https://www.findmypast.co.uk/transcript?id=R_106287059681",
    output: undefined, // if no change output will be undefined
  },
  {
    name: "findmypast.co.uk_findmypast.com",
    options: { fmpDomain: "findmypast.com" },
    input: "https://www.findmypast.co.uk/transcript?id=R_106287059681",
    output: "https://www.findmypast.com/transcript?id=R_106287059681",
  },
  {
    name: "findmypast.co.uk_findmypast.co.uk",
    options: { fmpDomain: "findmypast.co.uk" },
    input: "https://www.findmypast.co.uk/transcript?id=R_106287059681",
    output: undefined, // if no change output will be undefined
  },
];

function testLink(testCase, defaultOptions) {
  // use the spread operator to combine the specified options and the default ones
  const options = { ...defaultOptions, ...testCase.options };

  let newLink = updateLink(testCase.input, options);

  expect(newLink).toBe(testCase.output);
}

describe("redirExtLinks", () => {
  const defaultOptions = getDefaultOptionValuesForFeature("redirExtLinks");

  for (const testCase of testCases) {
    test(`Profile ${testCase.name} passes tests`, () => {
      testLink(testCase, defaultOptions);
    });
  }
});
