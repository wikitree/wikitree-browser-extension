/**
 * @jest-environment jsdom
 */
import { deriveRelationshipFromLegacyDoc } from "./legacyRelationshipParser";

function parseDoc(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe("deriveRelationshipFromLegacyDoc", () => {
  test("direct ancestor path where the user's father shares the user's first name (Combs case)", () => {
    // Viewer "Major"; his father and grandfather are also named Major.
    // Zachariah is the viewer's 4th great grandfather. The ancestor_1 line
    // ("Major is the son of Major Jones Combs Jr.") must not be mistaken for
    // a statement that the profile is the viewer's son.
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>Fourth great grandson</h3>
      <p>
        <span class="ancestor_1">1. Major is the son of <a href="/wiki/Combs-9001">Major Jones Combs Jr. (1940-2013)</a></span><br>
        <span class="ancestor_2">2. Major is the son of <a href="/wiki/Combs-9002">Major Jones Combs Sr. (1913-1981)</a></span><br>
        <span class="ancestor_3">3. Major is the son of <a href="/wiki/Combs-9003">John Weathers Combs Sr. (1882-1957)</a></span><br>
        <span class="ancestor_4">4. John is the son of <a href="/wiki/Combs-9004">William R Combs (abt.1849-1918)</a></span><br>
        <span class="ancestor_5">5. William is the son of <a href="/wiki/Combs-9005">John T Combs (abt.1818-1889)</a></span><br>
        <span class="ancestor_6">6. John is the son of <a href="/wiki/Combs-9006">Zachariah Combs (1797-1831)</a></span>
      </p>
      <p>This makes Zachariah the fourth great grandfather of Major.</p>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: {
        FirstName: "Zachariah",
        LastNameAtBirth: "Combs",
        LastNameCurrent: "Combs",
        Name: "Combs-9006",
        Gender: "Male",
      },
      profileID: "Combs-9006",
      userWtIdRaw: "Combs-9000",
      userColloquialNameRaw: "Major",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("fourth great grandfather");
  });

  test("private profile: ancestor_1 line links to the logged-in user (single step)", () => {
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>Daughter</h3>
      <p><span class="ancestor_1">1. [Private] is the daughter of <a href="/wiki/Beacall-6">Ian Beacall</a></span></p>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "", Name: "Doe-123", Gender: "Female" },
      profileID: "Doe-123",
      userWtIdRaw: "Beacall-6",
      userColloquialNameRaw: "Ian",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("daughter");
  });

  test("explicit headline with the user as object keeps the relation", () => {
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>Jane Doe is the daughter of Ian Beacall</h3>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "Jane", LastNameCurrent: "Doe", Name: "Doe-1", Gender: "Female" },
      profileID: "Doe-1",
      userWtIdRaw: "Beacall-6",
      userColloquialNameRaw: "Ian",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("daughter");
  });

  test("explicit headline with the user as subject inverts to the profile's perspective", () => {
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>Ian Beacall is the grandson of John Smith</h3>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "John", LastNameCurrent: "Smith", Name: "Smith-1", Gender: "Male" },
      profileID: "Smith-1",
      userWtIdRaw: "Beacall-6",
      userColloquialNameRaw: "Ian",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("grandfather");
  });

  test("sibling headline is preserved", () => {
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>John Smith and Ian Beacall are siblings</h3>
      <p><span class="ancestor_1">1. Ian Beacall is the son of <a href="/wiki/Beacall-2">Robert Beacall</a></span></p>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "John", LastNameCurrent: "Smith", Name: "Smith-1", Gender: "Male" },
      profileID: "Smith-1",
      userWtIdRaw: "Beacall-6",
      userColloquialNameRaw: "Ian",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("sibling");
  });

  test("generic h3 with 'This makes' sentence orients to the profile", () => {
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3>Granddaughter</h3>
      <p><span class="ancestor_1">1. Ian is the son of <a href="/wiki/Jones-5">Alice Jones (1930-2001)</a></span></p>
      <p><span class="ancestor_2">2. Alice is the daughter of <a href="/wiki/Jones-4">Mary Jones (1900-1980)</a></span></p>
      <p>This makes Mary the grandmother of Ian.</p>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "Mary", LastNameCurrent: "Jones", Name: "Jones-4", Gender: "Female" },
      profileID: "Jones-4",
      userWtIdRaw: "Beacall-6",
      userColloquialNameRaw: "Ian",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("grandmother");
  });

  // Real Special:Relationship markup (2026): the h3 carries the path's certainty and is the
  // descendant's label whichever way round the two people are; "This makes" names the ancestor.
  const confidentGrandparentTrail = (topWtId, topName) => `
    <h2>Direct Relationship Found</h2>
    <div id="imageContainer">
      <h3 class="mt-0"> Grandson (Confident) </h3>
      <p>
        <span class="ancestor_1">1. [Private] is the son of <a href="/wiki/Doe-20">Rosemary (Smith) Doe (1960-)</a> <a href="/wiki/Help:Confident"><span class="icon--confident"></span></a> </span><br>
        <span class="ancestor_2">2. Rosemary is the daughter of <a href="/wiki/${topWtId}">${topName}</a> <a href="/wiki/Help:Confident"><span class="icon--confident"></span></a> </span><br>
        This makes Shirley the <b>grandmother</b> of David.
      </p>
    </div>
  `;

  test("grandmother viewing her private grandson with a (Confident) h3 sees grandson", () => {
    const result = deriveRelationshipFromLegacyDoc(parseDoc(confidentGrandparentTrail("Smith-10", "Shirley Smith (1940-)")), {
      profilePerson: { FirstName: "David", LastNameCurrent: "Doe", Name: "Doe-21", Gender: "Male" },
      profileID: "Doe-21",
      userWtIdRaw: "Smith-10",
      userColloquialNameRaw: "Shirley",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("grandson");
  });

  test("(Confident) h3: the user's WT ID decides even when names don't match", () => {
    // Profile name hidden and the user's colloquial name differs from the trail's first name.
    const result = deriveRelationshipFromLegacyDoc(parseDoc(confidentGrandparentTrail("Smith-10", "Shirley Smith (1940-)")), {
      profilePerson: { FirstName: "", Name: "Doe-21", Gender: "Male" },
      profileID: "Doe-21",
      userWtIdRaw: "Smith-10",
      userColloquialNameRaw: "Shirl",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("grandson");
  });

  test("grandson viewing his grandmother with a (Confident) h3 sees grandmother", () => {
    const result = deriveRelationshipFromLegacyDoc(parseDoc(confidentGrandparentTrail("Smith-10", "Shirley Smith (1940-)")), {
      profilePerson: { FirstName: "Shirley", LastNameCurrent: "Smith", Name: "Smith-10", Gender: "Female" },
      profileID: "Smith-10",
      userWtIdRaw: "Doe-21",
      userColloquialNameRaw: "David",
      legacyCommonAncestors: [],
    });
    expect(result).toBe("grandmother");
  });

  test("(Confident) h3 where the grandson shares the grandparent's first name", () => {
    // "This makes John the grandfather of John": only the WT ID can say who is who.
    const html = `
      <h2>Direct Relationship Found</h2>
      <h3> Grandson (DNA Confirmed) </h3>
      <p>
        <span class="ancestor_1">1. John is the son of <a href="/wiki/Roe-2">Peter Roe (1950-)</a></span><br>
        <span class="ancestor_2">2. Peter is the son of <a href="/wiki/Roe-1">John Roe (1920-1990)</a></span><br>
        This makes John the <b>grandfather</b> of John.
      </p>
    `;
    const asGrandfather = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "John", LastNameCurrent: "Roe", Name: "Roe-3", Gender: "Male" },
      profileID: "Roe-3",
      userWtIdRaw: "Roe-1",
      userColloquialNameRaw: "John",
      legacyCommonAncestors: [],
    });
    expect(asGrandfather).toBe("grandson");
    const asGrandson = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "John", LastNameCurrent: "Roe", Name: "Roe-1", Gender: "Male" },
      profileID: "Roe-1",
      userWtIdRaw: "Roe-3",
      userColloquialNameRaw: "John",
      legacyCommonAncestors: [],
    });
    expect(asGrandson).toBe("grandfather");
  });

  test("sibling headline with a certainty suffix gives plain sibling", () => {
    const html = `
      <h2>Relationship Found</h2>
      <h3 class="mt-0"> Winston and John are siblings (Confident) </h3>
    `;
    const result = deriveRelationshipFromLegacyDoc(parseDoc(html), {
      profilePerson: { FirstName: "John", LastNameCurrent: "Churchill", Name: "Churchill-5", Gender: "Male" },
      profileID: "Churchill-5",
      userWtIdRaw: "Churchill-4",
      userColloquialNameRaw: "Winston",
      legacyCommonAncestors: [{ ancestor_id: 1, path1Length: 2, path2Length: 2 }],
    });
    expect(result).toBe("sibling");
  });
});
