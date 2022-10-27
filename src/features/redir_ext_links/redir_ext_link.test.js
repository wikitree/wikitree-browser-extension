import { fail } from "assert";
import { updateLink } from "./redir_ext_link";

// To run just this test suite use the command:
//  npm test -- redir_ext_link.test.js
//
// To run an individual test use a command like this:
//  npm test -- -t "Ancestry_ancestry.com_ancestry.co.uk"

const testCases = [
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
];

function testLink(testCase) {
  let newLink = updateLink(testCase.input, testCase.options);

  expect(newLink).toBe(testCase.output);
}

describe("redirExtLinks", () => {
  for (const testCase of testCases) {
    const profileName = testCase.name;

    test(`Profile ${testCase.name} passes tests`, () => {
      testLink(testCase);
    });
  }
});
