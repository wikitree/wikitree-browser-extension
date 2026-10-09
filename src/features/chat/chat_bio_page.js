// The profile page itself, for "Find his family on WikiTree" when the API doesn't have the
// profile yet (a new profile, or one on the staging server: Beacall-491, 2026-10-07). The
// biography is read back from its HTML into the wiki text the readers expect: links as
// [[Name-123|text]], numbered lists as "# …", tables as {| … |}.

const PROFILE_LINK_RE = /\/wiki\/([^/?#:]+-\d+)$/;

function profileIdOf(anchor) {
  const href = String(anchor?.getAttribute?.("href") || "");
  const match = href.replace(/^https?:\/\/[^/]+/, "").match(PROFILE_LINK_RE);
  return match ? decodeURIComponent(match[1]).replace(/ /g, "_") : "";
}

const squeeze = (text) => String(text || "").replace(/\s+/g, " ").trim();

function tableToWiki(table) {
  const rows = [...table.querySelectorAll("tr")]
    .map((row) => [...row.children].filter((cell) => /^(?:TD|TH)$/.test(cell.tagName)).map((cell) => squeeze(nodeToWiki(cell))))
    .filter((cells) => cells.length);
  return `\n{|\n${rows.map((cells) => `|-\n| ${cells.join(" || ")}`).join("\n")}\n|}\n`;
}

function nodeToWiki(node) {
  if (node.nodeType === 3) return node.textContent.replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName;
  if (tag === "SUP" && node.classList.contains("reference")) return "";
  if (node.classList.contains("editsection") || node.classList.contains("toggleOverflowButton") || node.classList.contains("a11y-back-ref")) return "";
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "LABEL") return "";
  if (tag === "TABLE") return tableToWiki(node);
  if (tag === "BR") return "\n";
  const inner = () => [...node.childNodes].map(nodeToWiki).join("");
  if (tag === "A") {
    const id = profileIdOf(node);
    const text = squeeze(inner());
    return id && text ? `[[${id}|${text}]]` : inner();
  }
  if (/^H[1-6]$/.test(tag)) return `\n== ${squeeze(inner())} ==\n`;
  if (tag === "LI") {
    const marker = node.parentElement?.tagName === "OL" ? "#" : "*";
    return `\n${marker} ${inner().replace(/^\s+/, "")}`;
  }
  if (tag === "OL" || tag === "UL") return `${inner()}\n`;
  if (tag === "P" || tag === "DIV" || tag === "HR") return `\n${inner()}\n`;
  return inner();
}

/** The biography and sources as wiki-like text, or "" when the page has none. */
export function readPageBio(doc = document) {
  const body = doc.querySelector(".x-profile .body-text, #main .body-text, .body-text");
  if (!body) return "";
  return nodeToWiki(body)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// WikiTree's own family lines on the tree tab (#ParentsTree …), then the extension's
// family list (#parentList …). Only links to profiles count: "[father?]" is an add link.
const FAMILY_SECTIONS = [
  { role: "parent", selectors: ["#ParentsTree", "#parentList", "#parentDetails"] },
  { role: "sibling", selectors: ["#SiblingsTree", "#siblingList", "#siblingDetails"] },
  { role: "spouse", selectors: ["#SpousesTree", "#spouseList", "#spouseDetails", "#spousesUnknownHeading"] },
  { role: "child", selectors: ["#ChildrenTree", "#childrenList", "#childrenDetails"] },
];

/** The relatives connected on the page, as {role, profile: {Name, FirstName, BirthDate, Gender}}. */
export function readPageAttached(doc = document, subjectName = "") {
  const out = [];
  const seen = new Set([subjectName]);
  for (const { role, selectors } of FAMILY_SECTIONS) {
    const anchors = selectors.flatMap((selector) => [...doc.querySelectorAll(`${selector} a[href]`)]);
    let parentIndex = 0;
    for (const anchor of anchors) {
      const id = profileIdOf(anchor);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const item = anchor.closest("li,[data-gender]");
      const genderAttr = String(item?.getAttribute?.("data-gender") || "").toLowerCase();
      let gender = genderAttr === "male" ? "Male" : genderAttr === "female" ? "Female" : "";
      const name = squeeze(anchor.querySelector("[itemprop='name']")?.textContent || anchor.textContent);
      const year = item?.querySelector?.(".bdDates")?.getAttribute("data-birth-year") || "";
      let entryRole = role;
      if (role === "parent") {
        // WikiTree lists the father first.
        if (!gender) gender = parentIndex === 0 ? "Male" : "Female";
        entryRole = gender === "Female" ? "mother" : "father";
        parentIndex++;
      }
      out.push({ role: entryRole, profile: { Name: id, FirstName: name.split(" ")[0] || "", BirthDate: year ? `${year}-00-00` : "", Gender: gender } });
    }
  }
  return out;
}

/** "Philip Beacall was born in ~1823 in Worcester": the year, when the page's vitals have none. */
export function birthYearFromBio(bio) {
  const match = String(bio || "").match(/\bborn\b[^.\n]{0,40}?\b(1[0-9]\d\d)\b/i);
  return match ? Number(match[1]) : 0;
}

/** "born in ~1823 in Worcester, Worcestershire, England.": the place, when the page's vitals have none. */
export function birthPlaceFromBio(bio) {
  const match = String(bio || "").match(/\bborn\b[^.\n]{0,40}?\bin\s+([A-Z][^.\n(;]*?)\s*(?:[.;(\n]|$)/);
  return match ? match[1].trim() : "";
}
