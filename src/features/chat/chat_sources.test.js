jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildSourcesAnswer, extractBioSources, parseProfileSourcesPrompt } from "./chat_sources";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// Trimmed from Cook-8721 (live, 2026-10-03): 8 inline refs, one bullet under == Sources ==.
const BIO = `[[Category: Motueka Cemetery, Motueka, Tasman]]
== Biography ==
Ellen was born in 1832, daughter of [[Cook-8720|James Cook]].<ref>Possible?? Fathers name is wrong
:England, Births and Christenings, 1538-1975
:Name	Helen Cook</ref>
She married twice.<ref>NZ marriage registration 1850/11 Ellen Cook William Henry Burton</ref><ref name="m2">NZ marriage registration 1860/2088 Ellen Burton Charles Alley</ref>
Again.<ref name="m2" />
== Sources ==
<references />
*[https://www.bdmhistoricalrecords.dia.govt.nz/ NZ BDM Historical Records]
`;

describe("parseProfileSourcesPrompt", () => {
  test.each([
    ["what sources does this profile have?", { target: "", countOnly: false }],
    ["how many sources does Cook-8721 have", { target: "Cook-8721", countOnly: true }],
    ["what are the sources for her profile?", { target: "", countOnly: false }],
    ["list the citations on this page", { target: "", countOnly: false }],
    ["show me Cook-8721's sources", { target: "Cook-8721", countOnly: false }],
    ["what sources are on her profile", { target: "", countOnly: false }],
  ])("%s", (prompt, expected) => {
    expect(parseProfileSourcesPrompt(prompt)).toEqual(expected);
  });

  test("searches for unsourced profiles are not this", () => {
    expect(parseProfileSourcesPrompt("profiles in Cheshire with no sources")).toBeNull();
    expect(parseProfileSourcesPrompt("how many have no sources?")).toBeNull();
  });

  test("routes to PROFILE_SOURCES", () => {
    expect(routeChatPrompt("what sources does this profile have?").intent).toBe(ChatIntent.PROFILE_SOURCES);
  });
});

test("extractBioSources: refs (not <references />, not repeated named refs) and the Sources list", () => {
  expect(extractBioSources(BIO)).toEqual([
    "Possible?? Fathers name is wrong England, Births and Christenings, 1538-1975 Name Helen Cook",
    "NZ marriage registration 1850/11 Ellen Cook William Henry Burton",
    "NZ marriage registration 1860/2088 Ellen Burton Charles Alley",
    "NZ BDM Historical Records (https://www.bdmhistoricalrecords.dia.govt.nz/)",
  ]);
});

describe("buildSourcesAnswer", () => {
  test("lists them numbered", () => {
    const answer = buildSourcesAnswer({ label: "Ellen (Cook-8721)", bio: BIO });
    expect(answer).toMatch(/^Ellen \(Cook-8721\) has 4 sources in the biography:\n1\. Possible/);
    expect(answer).toContain("\n4. NZ BDM Historical Records");
  });

  test("count only, and none", () => {
    expect(buildSourcesAnswer({ label: "Ellen", bio: BIO, countOnly: true })).toBe("Ellen has 4 sources in the biography.");
    expect(buildSourcesAnswer({ label: "X", bio: "== Biography ==\nText." })).toMatch(/has no sources/);
  });
});
