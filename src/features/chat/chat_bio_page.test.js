import { readPageBio, readPageAttached, birthYearFromBio } from "./chat_bio_page";
import { readRelativesFromBio } from "./chat_bio_relatives";

// Trimmed from Beacall-491 on the staging server (2026-10-07): a new profile the API didn't have.
const PAGE = `<main id="main" class="x-profile x-profile-person">
<p id="ParentsTree" class="VITALS">Son of
<a href="https://staging.wikitree.com/index.php?title=Special:EditFamily&amp;u=51277082&amp;who=father">[father?]</a> and
<a href="https://staging.wikitree.com/index.php?title=Special:EditFamily&amp;u=51277082&amp;who=mother">[mother?]</a></p>
<p id="SpousesTree" class="VITALS"><a href="https://staging.wikitree.com/index.php?title=Special:EditFamily&amp;who=spouse">[spouse?]</a></p>
<div class="body-text clearfix x-content">
<h2 id="Biography"> <span class="mw-headline"> Biography </span><span class="editsection x-edit">[<a href="#">edit</a>]</span></h2>
<p>Philip Beacall was born in ~1823 in Worcester, Worcestershire, England. His parents were John Carr (&lt;1807 - &gt;1823) and Elizabeth Beacall (&lt;1798 - &gt;1823). Philip worked for Laird, Son &amp; Co, shipbuilders in Birkenhead.
</p><p>His sister was Hannah Beacall (1819 - ).
</p><p>Philip married Martha Teece (~1835 - ~1909) on September 3, 1855 in Wallasey, Cheshire.<sup class="reference x-citation"><a href="#_note-0">[1]</a></sup>
</p><p>Their children were...
</p>
<ol><li><a href="/wiki/Beacall-20" title="" target="_blank">John Fabian (Beacall) Lacon</a> (~1856 - &gt;1939)<sup class="reference"><a href="#_note-1">[2]</a></sup>
</li><li>Elizabeth (Beacall) Nugent (~1859 - &gt;1912)
</li><li>Philip Beacall (1859 - 1915)
</li><li>Thomas Henry Beacall (1869 - &gt;1936)
</li><li>Ellen May (Beacall) Bywater (1873 - &gt;1909)
</li></ol>
<p>In 1861 (aged ~38), Philip was living in Birkenhead with his wife, Martha Beacall (26); his son, John Beacall (4); his daughter, Elizabeth Beacall (2); and Ellen Teece (14).</p>
<h2 id="Sources"> <span class="mw-headline"> Sources </span></h2>
<ol class="references"><li id="_note-12"><a href="#_ref-12" class="a11y-back-ref">↑</a> *1881 England Census: Class: RG11
1881 England Census:
<div class="table-wrapper"><table border="1"><tbody>
<tr><th>Household Members</th></tr>
<tr><th>Name</th><th>Age</th><th>Role</th><th>Sex</th><th>Birthplace</th></tr>
<tr><td>Philip Beacall</td><td>57</td><td>Head</td><td>Male</td><td>Worcester, Worcestershire, England</td></tr>
<tr><td>Martha Beacall</td><td>47</td><td>Wife</td><td>Female</td><td>Shropshire, England</td></tr>
<tr><td>Thomas H Beacall</td><td>11</td><td>Son</td><td>Male</td><td>Birkenhead, Cheshire, England</td></tr>
<tr><td>Ellen M Beacall</td><td>7</td><td>Daughter</td><td>Female</td><td>Birkenhead, Cheshire, England</td></tr>
<tr><td>Robert Beacall</td><td>0</td><td>Son</td><td>Male</td><td>Birkenhead, Cheshire, England</td></tr>
</tbody></table></div></li></ol>
</div>
<div id="nVitals"><ol id="childrenList"><li data-gender="male"><a href="/wiki/Beacall-77"><span itemprop="name">Robert Beacall</span></a><span class="bdDates" data-birth-year="1880"></span></li></ol></div>
</main>`;

const PHILIP = { Id: 51277082, Name: "Beacall-491", FirstName: "Philip", LastNameAtBirth: "Beacall", Gender: "Male", BirthDate: "" };

describe("reading the profile page when the API doesn't have it (Beacall-491)", () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
  });

  test("the biography comes back as wiki-like text", () => {
    const bio = readPageBio(document);
    expect(bio).toContain("His parents were John Carr (<1807 - >1823) and Elizabeth Beacall");
    expect(bio).toContain("# [[Beacall-20|John Fabian (Beacall) Lacon]] (~1856 - >1939)");
    expect(bio).not.toContain("[1]");
    expect(bio).toContain("| Name || Age || Role || Sex || Birthplace");
    expect(birthYearFromBio(bio)).toBe(1823);
  });

  test("its relatives: parents, sister, wife, the children's list and the census", () => {
    const relatives = readRelativesFromBio(readPageBio(document), { ...PHILIP, BirthDate: "1823" });
    const summary = relatives.map((r) => `${r.role} ${r.given.join(" ")} ${r.surnames.join("/")} ${r.birthYear || ""}`.trim());
    expect(summary).toEqual(
      expect.arrayContaining([
        "father John Carr",
        "mother Elizabeth Beacall",
        "sibling Hannah Beacall 1819",
        "spouse Martha Teece/Beacall 1835",
        expect.stringMatching(/^child John Fabian Beacall\/Lacon 185[67]$/),
        expect.stringMatching(/^child Elizabeth Beacall\/Nugent 1859$/),
        "child Philip Beacall 1859",
        expect.stringMatching(/^child Thomas Henry Beacall 18(69|70)$/),
        expect.stringMatching(/^child Ellen May Beacall\/Bywater 187[34]$/),
        expect.stringMatching(/^child Robert Beacall 18(80|81)$/),
      ])
    );
    expect(relatives.find((r) => r.given[0] === "John" && r.role === "child").linkedId).toBe("Beacall-20");
    // Ellen Teece (14) in 1861 is no relation the text names; Philip himself isn't his own child.
    expect(summary.some((line) => /Teece/.test(line) && !/^spouse/.test(line))).toBe(false);
    expect(relatives.filter((r) => r.role === "spouse")).toHaveLength(1);
  });

  test("the family already connected on the page: links only, not the [father?] add links", () => {
    expect(readPageAttached(document, "Beacall-491")).toEqual([
      { role: "child", profile: { Name: "Beacall-77", FirstName: "Robert", BirthDate: "1880-00-00", Gender: "Male" } },
    ]);
  });
});
