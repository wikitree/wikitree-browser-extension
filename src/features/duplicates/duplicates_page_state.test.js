import { collectExcludedMatchIds, filterExcludedDuplicatePairs } from "./duplicates_page_state.js";

describe("collectExcludedMatchIds", () => {
  test("collects WT IDs from pending, unmerged, and rejected lists only", () => {
    document.body.innerHTML = `
      <div class="row mt-4">
        <div class="col-lg-4">
          <h3>Pending Merges <a href="/wiki/Help:Merging">Help</a></h3>
          <ul class="STYLED">
            <li><a href="/wiki/Kruger-111">Pending One</a></li>
          </ul>
          <p><a href="/index.php?title=Special:MergePerson&amp;user1_name=Kruger-2041">Initiate a Merge</a></p>
        </div>
        <div class="col-lg-4">
          <h3>Unmerged Matches <a href="/wiki/Help:Merging">Help</a></h3>
          <ul class="STYLED">
            <li><a href="https://www.wikitree.com/wiki/Kruger-222">Unmerged One</a></li>
          </ul>
        </div>
        <div class="col-lg-4">
          <h3>Rejected Matches <a href="/wiki/Help:Merging">Help</a></h3>
          <ul class="STYLED">
            <li><a href="/wiki/Kruger-333">Rejected One</a></li>
          </ul>
          <p><a href="/index.php?title=Special:MergePerson&amp;user1_name=Kruger-2041&amp;user2_name=Kruger-333&amp;action=compare">compare</a></p>
        </div>
        <div class="col-lg-4">
          <h3>Other Section</h3>
          <ul class="STYLED">
            <li><a href="/wiki/Kruger-999">Should not be collected</a></li>
          </ul>
        </div>
      </div>
    `;

    expect(Array.from(collectExcludedMatchIds())).toEqual(["Kruger-111", "Kruger-222", "Kruger-333"]);
  });
});

describe("filterExcludedDuplicatePairs", () => {
  test("removes pairs that include an ID already listed on the profile page", () => {
    const pairs = [
      { person1: "Kruger-2041", person2: "Kruger-111" },
      { person1: "Kruger-2041", person2: "Kruger-444" },
      { person1: "Kruger-222", person2: "Kruger-2041" },
    ];

    expect(filterExcludedDuplicatePairs(pairs, new Set(["Kruger-111", "Kruger-222"]))).toEqual([
      { person1: "Kruger-2041", person2: "Kruger-444" },
    ]);
  });
});
