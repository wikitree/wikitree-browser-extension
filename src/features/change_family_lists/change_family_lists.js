/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)

This version builds the family lists with these features:
• Uses the full getAge/isLeapYear implementation for marriage age calculations.
• If dates are not available (or are “unknown”), no date text is shown.
• Parsed records like “[children?]” or “[spouse?]” are rendered as clickable links—
  using their parsed link if available, or a default edit URL using the profile’s ID.
• Each record (parent, sibling, child) is wrapped in a schema.org container using itemprop attributes,
  with date spans placed in grid cells to the right of the name.
• The spouse header is a span.
• Relative ages for siblings/children are calculated and inserted.
• Marriage ages are calculated and appended.
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, displayName } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getUserWtId } from "../../core/common";
import "./change_family_lists.css";
import { initRelationshipDB, RELATIONSHIP_STORE_NAME } from "../distanceAndRelationship/distanceAndRelationship.js";
import { profilePerson } from "../../core/common";

const mainDomain = "dev-2025.wikitree.com";
let options;
const user = getUserWtId();
let familyData;
// Global variable to track the header toggle state.
let useAltHeadings = false;
const treePersonBit = $("#nav-familyContent #familyVitals div.tree--person");

const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,Name,Prefix,RealName,ShortName," +
  "Spouses,Suffix,TrustedList";

// ============================================================
// 1. Data Record Shapes and Parsing Functions
// ============================================================

// --- Helper record functions ---
function newPersonRecord() {
  return {
    Name: "",
    FullName: "",
    BirthDate: "",
    DeathDate: "",
    UnknownText: "",
    Link: "",
    MarriageDetails: "",
    MarriageMapLink: "",
    merge: false, // flag for mergeable records
  };
}

function newFamilyData() {
  return { parents: [], siblings: [], spouses: [], children: [] };
}

// --- Parsing functions ---
function parseItempropElement(el) {
  const record = newPersonRecord();
  const linkEl = el.querySelector("a[itemprop='url'], a[href*='/wiki/']");
  record.relationship = el.getAttribute("id");
  if (linkEl) {
    record.Link = linkEl.getAttribute("href") || "";
    record.FullName = linkEl.textContent.trim();
    const match = record.Link.match(/\/wiki\/([^#]+)/);
    if (match) {
      record.Name = match[1];
    }
  }
  const smallSpan = el.querySelector("span.SMALL");
  if (smallSpan) {
    const dateMatch = smallSpan.textContent.match(/\(([^)]*)\)/);
    if (dateMatch) {
      const [b, d] = dateMatch[1].split(/\s*-\s*/);
      record.BirthDate = b?.trim() || "";
      record.DeathDate = d?.trim() || "";
    }
  }
  const fullText = el.textContent.trim();
  if (!record.FullName) {
    const bracketMatch = fullText.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      record.UnknownText = bracketMatch[0].trim();
      const inner = bracketMatch[1].trim();
      const dateRange = inner.match(/\(([^)]+)\)/);
      if (dateRange) {
        const [b, d] = dateRange[1].split(/\s*-\s*/);
        record.BirthDate = b?.trim() || "";
        record.DeathDate = d?.trim() || "";
      }
      record.Name = inner.replace(/\s*\([^)]*\)/, "").trim();
    } else {
      record.Name = fullText;
    }
  }
  return record;
}

function newPersonFromBracket(bracketText, link = "") {
  const record = newPersonRecord();
  const trimmed = bracketText.trim();
  record.UnknownText = trimmed;
  const dateRangeMatch = trimmed.match(/\(([^)]+)\)/);
  if (dateRangeMatch) {
    const [b, d] = dateRangeMatch[1].split(/\s*-\s*/);
    record.BirthDate = b?.trim() || "";
    record.DeathDate = d?.trim() || "";
    record.Name = trimmed.replace(/\s*\([^)]*\)/, "").trim();
  } else {
    record.Name = trimmed;
  }
  record.Link = link;
  return record;
}

function parseBracketedUnknownInBlock(blockEl) {
  const results = [];
  const anchors = blockEl.querySelectorAll("a");
  anchors.forEach((a) => {
    const text = a.textContent.trim();
    // Skip known placeholders.
    if (
      /^\[half\]$/i.test(text) ||
      /^(edit|add sibling|add\/edit spouses)$/i.test(text) ||
      text === "[date unknown]" ||
      text === "[location unknown]" ||
      text === "[uncertain]"
    ) {
      return;
    }
    results.push(newPersonFromBracket(text, a.getAttribute("href") || ""));
  });
  let raw = blockEl.innerText;
  anchors.forEach((a) => {
    const t = a.textContent.trim();
    if (/^\[half\]$/i.test(t) || /^(edit|add sibling|add\/edit spouses)$/i.test(t)) {
      return;
    }
    raw = raw.replace(t, "");
  });
  const bracketRegex = /\[[^\]]*\]/g;
  const bracketed = raw.match(bracketRegex) || [];
  bracketed.forEach((b) => {
    if (/^\[half\]$/i.test(b) || /^(edit|add sibling)$/i.test(b)) return;
    results.push(newPersonFromBracket(b));
  });
  return results;
}

function parseBlock(blockEl, itempropName) {
  const records = [];
  const itempropEls = blockEl.querySelectorAll(`[itemprop="${itempropName}"]`);
  itempropEls.forEach((el) => {
    const rec = parseItempropElement(el);
    if (rec.Name || rec.FullName || rec.UnknownText) {
      records.push(rec);
    }
  });
  // If no itemprop elements found, use bracketed text.
  if (records.length === 0) {
    const bracketed = parseBracketedUnknownInBlock(blockEl);
    records.push(...bracketed);
  }
  return records;
}

// --- Spouse-specific parsing ---
function parseSpousesBlock(spousesEl) {
  const records = [];
  // Split the entire innerHTML by the marker.
  // Adjust the regex if you have other labels (e.g. "Wife of", "Spouse of")
  const chunks = spousesEl.innerHTML.split(/(?:Husband|Wife|Spouse)\s+of/i);
  // The first chunk is anything before the first spouse – ignore it.
  chunks.shift();
  chunks.forEach((chunk) => {
    // Create a temporary container to parse this chunk.
    const temp = document.createElement("div");
    temp.innerHTML = chunk;
    // The first spouse element in this chunk should be our target.
    const spouseEl = temp.querySelector('[itemprop="spouse"]');
    if (spouseEl) {
      // Parse the basic spouse record.
      const rec = parseItempropElement(spouseEl);
      // Remove the spouse element so that remaining text represents marriage details.
      spouseEl.remove();
      // Get the remaining text, clean it up, and assign as MarriageDetails.
      let details = temp.textContent || "";
      details = details.replace(/\s{2,}/g, " ").trim();
      // Remove any unwanted substring (e.g., an "add/edit spouses" text if present).
      details = details.replace(/add\/edit spouses/gi, "").trim();
      rec.MarriageDetails = details;
      // (If there is a Google Maps link for the marriage, you might try to extract that too.)
      // Look for a link in the chunk that points to maps.google.
      const mapLinkEl = temp.querySelector('a[href*="maps.google"]');
      if (mapLinkEl) {
        rec.MarriageMapLink = mapLinkEl.getAttribute("href") || "";
      }
      // Do not mark this record for merging—each chunk becomes its own record.
      rec.merge = false;
      // Only push if we have a valid name.
      if (rec.Name && rec.Name.trim()) {
        rec.Name = rec.Name.trim();
        records.push(rec);
      }
    }
  });
  // Also add any bracketed unknown spouse records that aren’t duplicates.
  const bracketed = parseBracketedUnknownInBlock(spousesEl).filter(
    (b) => b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google")
  );
  bracketed.forEach((b) => {
    if (!records.some((m) => m.Link === b.Link || m.Name === b.Name)) {
      records.push(b);
    }
  });
  return records;
}

function parseInitialData() {
  const excludeBrackets = ["[date unknown]", "[location unknown]", "[uncertain]"];
  const container = document.querySelector("#nav-familyContent div.tree--person");
  familyData = newFamilyData();

  // Parents
  const parentsBlock = container.querySelector("#Parents");
  if (parentsBlock) {
    let parsedParents = parseBlock(parentsBlock, "parent").filter((r) => r.Name && !/^(edit)$/i.test(r.Name));
    familyData.parents = parsedParents;
  }

  // Siblings
  const siblingsBlock = container.querySelector("#Siblings");
  if (siblingsBlock) {
    let parsedSiblings = parseBlock(siblingsBlock, "sibling").filter(
      (r) => r.Name && !/^(add sibling)$/i.test(r.Name) && !/^\[half\]$/i.test(r.Name)
    );
    familyData.siblings = parsedSiblings;
  }

  // Spouses
  const spousesBlock = container.querySelector("#Spouses");
  if (spousesBlock) {
    // Get spouse entries (each one should already contain its own MarriageDetails)
    let spouseEntries = parseSpousesBlock(spousesBlock);
    // Filter out entries with no valid name or with the unwanted "[date unknown]" value.
    spouseEntries = spouseEntries.filter(
      (r) => r.Name && r.Name.trim() && excludeBrackets.includes(r.Name.trim().toLowerCase()) == false
    );
    // Also add any bracketed unknown spouse records that aren’t duplicates,
    // but filter out any that have "[date unknown]" as the name.
    const bracketed = parseBracketedUnknownInBlock(spousesBlock).filter((b) => {
      return (
        b.Name &&
        b.Name.trim() &&
        excludeBrackets.includes(b.Name.trim().toLowerCase()) == false &&
        !b.Link.startsWith("https://maps.google")
      );
    });
    bracketed.forEach((b) => {
      if (!spouseEntries.some((m) => m.Link === b.Link || m.Name === b.Name)) {
        spouseEntries.push(b);
      }
    });
    familyData.spouses = spouseEntries;
  }

  // Children
  const childrenBlock = container.querySelector("#Children");
  if (childrenBlock) {
    let parsedChildren = parseBlock(childrenBlock, "children").filter((r) => r.Name && !/^(add child)$/i.test(r.Name));
    familyData.children = parsedChildren;
  }

  console.log("Parsed familyData:", familyData);
  return familyData;
}

// ============================================================
// 2. Build DOM Structure
// ============================================================
function buildFamilyListsFromData(familyData) {
  const container = document.createElement("div");
  container.id = "nVitals";
  container.className = "row";
  const headerDiv = document.createElement("div");
  headerDiv.className = "large sidebar-heading";
  headerDiv.style.marginBottom = "0.5em";
  headerDiv.innerHTML = "<strong>Family Relationships</strong>";
  container.appendChild(headerDiv);

  container.appendChild(buildParentsSection(familyData.parents));
  container.appendChild(buildSiblingsSection(familyData.siblings));
  if (familyData.spouses.length === 0) {
    container.appendChild(buildSpousesUnknown());
  } else {
    container.appendChild(buildSpousesSection(familyData.spouses));
  }
  if (familyData.children.length === 0) {
    container.appendChild(buildChildrenUnknown());
  } else {
    container.appendChild(buildChildrenSection(familyData.children));
  }
  return container;
}

function getDatesFromFamilyData(p) {
  if (p.BirthDate || p.DeathDate) {
    const birthYear = isOK(p.BirthDate) ? (p.BirthDate.includes("s") ? p.BirthDate : p.BirthDate.split("-")[0]) : "";
    const deathYear = isOK(p.DeathDate) ? (p.DeathDate.includes("s") ? p.DeathDate : p.DeathDate.split("-")[0]) : "";
    const dates = ` (${birthYear} - ${deathYear})`;
    return { birthYear, deathYear, dates };
  } else {
    return {};
  }
}

// --- Helper Functions ---

// Create a header element with consistent data attributes.
function createHeader(label, headerId, tooltip) {
  const span = document.createElement("span");
  span.id = headerId;
  span.className = "clickable";
  span.setAttribute("data-replace-text", label);
  span.setAttribute("data-alt-text", label);
  span.setAttribute("data-original-text", label);
  span.setAttribute("data-this-text", label);
  span.title = tooltip;
  span.style.cursor = "pointer";
  span.textContent = label;
  return span;
}

// Create an edit button (a span containing a link)
function createEditButton(href, tooltip, text = "edit") {
  const span = document.createElement("span");
  span.className = "EDIT";
  span.setAttribute("data-bs-toggle", "tooltip");
  span.setAttribute("data-bs-title", tooltip);
  span.innerHTML = `<a href="${href}">${text}</a>`;
  return span;
}

// Create a default link for an unknown entry in a section.
function createDefaultLink(section, defaultText) {
  const a = document.createElement("a");
  a.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=${section}`;
  a.className = "BLANK";
  a.textContent = defaultText;
  return a;
}

// Create an ordered list element.
function createListElement(id, className = "nameList", listStyle = "none") {
  const ol = document.createElement("ol");
  ol.id = id;
  ol.className = className;
  ol.style.listStyle = listStyle;
  return ol;
}

// --- Section Builders ---

// Parents Section
function buildParentsSection(parents) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "parentDetails";

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Parents: ", "parentsHeader", "Right click to add a father"));
  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditPerson&u=${profilePerson.Id}#first-name`,
      "Edit Names"
    )
  );
  container.appendChild(headerDiv);

  const meta = document.createElement("meta");
  meta.setAttribute("itemprop", "gender");
  meta.content = "male";
  container.appendChild(meta);

  const ol = createListElement("parentList");
  if (parents.length === 0) {
    ol.appendChild(createDefaultLink("father", "[father?]"));
    ol.appendChild(createDefaultLink("mother", "[mother?]"));
  } else {
    parents.forEach((p) => {
      const li = document.createElement("li");
      li.dataset.parseName = p.Name;
      if (/^\[.*\?\]$/.test(p.Name)) {
        li.innerHTML = `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=parent" class="BLANK">${p.Name}</a>`;
      } else {
        const dates = getDatesFromFamilyData(p);
        li.innerHTML = `<span itemprop="${p.relationship || "parent"}" itemscope itemtype="https://schema.org/Person">
          <a href="${p.Link}" itemprop="url" title="" aria-label="Parent">
            <span itemprop="name">${p.FullName || p.Name}</span>
          </a>
          <span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${dates.deathYear || ""}">${
          dates.dates || ""
        }</span>
          <span class="relAge"></span>
          </span>`;
      }
      ol.appendChild(li);
    });
  }
  container.appendChild(ol);
  return container;
}

// Siblings Section
function buildSiblingsSection(siblings) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "siblingDetails";

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Siblings: ", "siblingsHeader", "Right click to add a sibling"));
  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditPerson&u=${profilePerson.Id}#Family`,
      "Edit Parents"
    )
  );
  container.appendChild(headerDiv);

  const ol = createListElement("siblingList", "nameList hasRelAge");
  if (siblings.length === 0) {
    ol.appendChild(createDefaultLink("sibling", "[siblings?]"));
  } else {
    siblings.forEach((s) => {
      const li = document.createElement("li");
      li.dataset.parseName = s.Name;
      if (/^\[.*\?\]$/.test(s.Name)) {
        li.innerHTML = `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=sibling" class="BLANK">${s.Name}</a>`;
      } else {
        const dates = getDatesFromFamilyData(s);
        li.innerHTML = `<span itemprop="sibling" itemscope itemtype="https://schema.org/Person">
          <a href="${s.Link}" itemprop="url" title="" aria-label="Sibling">
            <span itemprop="name">${s.FullName || s.Name}</span>
          </a>
          <span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${dates.deathYear || ""}">${
          dates.dates || ""
        }</span>
          <span class="relAge"></span>
          </span>`;
        li.setAttribute("data-gender", s.Gender || "male");
        if (s.Father) li.setAttribute("data-father", s.Father);
        if (s.Mother) li.setAttribute("data-mother", s.Mother);
      }
      ol.appendChild(li);
    });
  }
  container.appendChild(ol);
  return container;
}

// Spouses Section

function buildSpousesSection(spouses) {
  // If there's only a placeholder, use the unknown builder.
  if (spouses.length === 1 && spouses[0].Name === "[spouse?]") {
    return buildSpousesUnknown();
  }
  // Create a container with one header for all spouses.
  const container = document.createElement("div");
  container.className = "VITALS spouseDetails familyList";
  const headerDiv = document.createElement("div");

  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=spouse`,
      "Add/Edit Spouses",
      "add/edit spouses"
    )
  );
  headerDiv.appendChild(createHeader("Spouses: ", "spousesHeader", "Right click to add a spouse"));
  container.appendChild(headerDiv);
  // For each spouse, create its own sub‑div.
  spouses.forEach((spouse) => {
    const spouseDiv = document.createElement("div");
    spouseDiv.className = "aSpouse";
    spouseDiv.dataset.parseName = spouse.Name;
    spouseDiv.setAttribute("data-id", spouse.Id);
    spouseDiv.setAttribute("data-gender", spouse.Gender || "Female");

    // Create a grid for the spouse entry and dates.
    const grid = document.createElement("div");
    grid.className = "spouseGrid";
    const entry = document.createElement("span");
    entry.className = "spouseEntry";
    entry.setAttribute("itemprop", "spouse");
    entry.setAttribute("itemscope", "");
    entry.setAttribute("itemtype", "https://schema.org/Person");
    entry.setAttribute("data-gender", spouse.Gender || "Female");
    if (spouse.Link) {
      entry.innerHTML = `<a href="${spouse.Link}" itemprop="url" title="" class="spouseLink">
        <span itemprop="name"><strong>${spouse.FullName || spouse.Name}</strong></span>
        </a>`;
    } else {
      entry.textContent = spouse.FullName || spouse.Name;
    }
    grid.appendChild(entry);
    const dates = document.createElement("span");
    dates.className = "spouseDates bdDates";
    if (spouse.Name) {
      const idName = (spouse.Name || "").replace(/\s/g, "-");
      dates.id = idName + "-bdDates";
    }
    grid.appendChild(dates);
    spouseDiv.appendChild(grid);

    // Add the marriage details.
    const details = document.createElement("span");
    details.className = "marriageDetails";
    let detailsText = spouse.MarriageDetails || "";
    // Remove any trailing unwanted text.
    detailsText = detailsText.replace(/add\/edit spouses/gi, "").trim();
    details.textContent = detailsText;
    spouseDiv.appendChild(details);

    container.appendChild(spouseDiv);
  });
  return container;
}

function buildSpousesUnknown() {
  const container = document.createElement("div");
  container.className = "VITALS spouseUnknown";
  container.id = "spousesUnknownHeading";
  container.title = "Right click to add a spouse";
  container.style.cursor = "pointer";

  container.appendChild(createHeader("Spouses: ", "spousesHeader", "Right click to add a spouse"));
  container.appendChild(document.createElement("br"));
  container.appendChild(createDefaultLink("spouse", "[spouse?]"));
  return container;
}

// Children Section
function buildChildrenSection(children) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "childrenDetails";

  container.appendChild(createHeader("Children:", "childrenHeader", "Right click to add a child"));

  const ol = createListElement("childrenList", "nameList hasRelAge");
  children.forEach((c) => {
    const dates = getDatesFromFamilyData(c);
    const li = document.createElement("li");
    li.dataset.parseName = c.Name;
    if (/^\[.*\?\]$/.test(c.Name)) {
      const link = c.Link || `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=child`;
      li.innerHTML = `<a href="${link}" class="BLANK">${c.Name}</a>`;
      ol.style.listStyle = "none";
    } else if (c.Link) {
      li.innerHTML = `<span itemprop="children" itemscope itemtype="https://schema.org/Person">

            <a href="${
              c.Link.startsWith("http") ? c.Link : `https://${mainDomain}` + c.Link
            }" itemprop="url" title="" aria-label="Child" class="childLink">
              <span itemprop="name">${c.FullName || c.Name}</span>
            </a>
            <span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
        dates.deathYear || ""
      }">${dates.dates || ""}</span>

          <span class="relAge"></span>
          </span>`;
    } else {
      li.textContent = c.FullName || c.Name;
      const bdSpan = document.createElement("span");
      bdSpan.className = "bdDates";
      li.appendChild(bdSpan);
    }
    if (!/^\[.*\?\]$/.test(c.Name)) {
      li.setAttribute("data-gender", c.Gender || "male");
    }
    if (c.Father) li.setAttribute("data-father", c.Father);
    if (c.Mother) li.setAttribute("data-mother", c.Mother);
    ol.appendChild(li);
  });
  container.appendChild(ol);
  return container;
}

function buildChildrenUnknown() {
  const container = document.createElement("div");
  container.className = "VITALS";
  container.id = "childrenUnknownHeading";
  container.title = "Right click to add a child";
  container.style.cursor = "pointer";
  container.appendChild(createDefaultLink("child", "[children?]"));
  return container;
}

// ============================================================
// 3. API Data and Utility Functions
// ============================================================
async function getWindowPeople() {
  const result = await $.ajax({
    url: "https://api.wikitree.com/api.php",
    type: "POST",
    dataType: "json",
    xhrFields: { withCredentials: true },
    data: {
      action: "getPeople",
      appId: "WBE_changeFamilyLists",
      keys: profilePerson.Id,
      fields: getPeopleFields,
      nuclear: 1,
    },
  });
  const people = result[0].people;
  window.people = new Map(Object.entries(people));
  const arr = Object.values(people);
  window.peopleByWtID = new Map(arr.map((p) => [p.Name, p]));
}

function getPerson(id) {
  return window.people?.get(String(id));
}

function getPersonByWtID(wtId) {
  return window.peopleByWtID?.get(wtId);
}

function fillBirthDeathDates($el, p) {
  let bYear = "";
  let dYear = "";
  if (isOK(p.BirthDate)) {
    bYear = p.BirthDate.split("-")[0];
  } else if (p.BirthDateDecade) {
    bYear = p.BirthDateDecade;
  }
  if (isOK(p.DeathDate)) {
    dYear = p.DeathDate.split("-")[0];
  } else if (p.DeathDateDecade) {
    dYear = "~" + p.DeathDateDecade;
  }
  if (bYear.trim().toLowerCase() === "unknown" || bYear.trim().toLowerCase() === "~unknown") {
    bYear = "";
  }
  if (dYear.trim().toLowerCase() === "unknown" || dYear.trim().toLowerCase() === "~unknown") {
    dYear = "";
  }
  const finalText = bYear || dYear ? ` (${bYear} - ${dYear})` : "";
  $el.find(".bdDates, .spouseDates").each(function () {
    $(this).text(finalText);
    $(this).attr("data-birth-year", bYear);
    $(this).attr("data-death-year", dYear);
  });
}

function attachApiData() {
  $("#nVitals li, #nVitals div.aSpouse").each(function () {
    const parseName = $(this).data("parseName");
    if (!parseName) return;
    const p = getPersonByWtID(parseName);
    //console.log(p);
    if (!p) return;
    $(this).attr("data-id", p.Id);
    if (p.Gender) {
      $(this).attr("data-gender", p.Gender);
    }
    if (p.Father) {
      $(this).attr("data-father", p.Father);
    }
    if (p.Mother) {
      $(this).attr("data-mother", p.Mother);
    }
    fillBirthDeathDates($(this), p);
  });
}

// ============================================================
// Marriage Age Functions (Consolidated)
// ============================================================
export function getAge(start, end = false) {
  let start_day, start_month, start_year, end_day, end_month, end_year;
  if (typeof start === "object") {
    start_day = parseInt(start.start.date);
    start_month = parseInt(start.start.month);
    start_year = parseInt(start.start.year);
    end_day = parseInt(start.end.date);
    end_month = parseInt(start.end.month);
    end_year = parseInt(start.end.year);
  } else {
    const startSplit = start.split("-");
    start_day = parseInt(startSplit[2]);
    start_month = parseInt(startSplit[1]);
    start_year = parseInt(startSplit[0]);
    const endSplit = end.split("-");
    end_day = parseInt(endSplit[2]);
    end_month = parseInt(endSplit[1]);
    end_year = parseInt(endSplit[0]);
  }
  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (isLeapYear(start_year)) {
    month[1] = 29;
  }
  const firstMonthDays = month[start_month - 1] - start_day;
  let restOfYearDays = 0;
  for (let i = start_month; i < 12; i++) {
    restOfYearDays += month[i];
  }
  const firstYearDays = firstMonthDays + restOfYearDays;
  let fullYears = end_year - (start_year + 1);
  let lastYearMonthDays = 0;
  if (isLeapYear(end_year)) {
    month[1] = 29;
  } else {
    month[1] = 28;
  }
  for (let i = 0; i < end_month - 1; i++) {
    lastYearMonthDays += month[i];
  }
  let lastYearDaysTotal = end_day + lastYearMonthDays;
  let totalExtraDays = lastYearDaysTotal + firstYearDays;
  let andDays;
  if (totalExtraDays > 364) {
    fullYears++;
    let yearDays = 365;
    if (isLeapYear(start_year) && start_month < 3) {
      yearDays++;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      yearDays++;
    }
    andDays = totalExtraDays - yearDays;
  } else {
    andDays = totalExtraDays;
    if (isLeapYear(start_year) && start_month < 3) {
      totalExtraDays--;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      totalExtraDays--;
    }
  }
  const totalDays = Math.round(fullYears * 365.25) + andDays;
  return [fullYears, andDays, totalDays];
}

function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}

function getMarriageAge(d1, d2, mPerson) {
  const bDate = getApproxDate(d1);
  const mDate = getApproxDate(d2);
  let approx = "";
  if (
    bDate.Approx === true ||
    mDate.Approx === true ||
    (mPerson?.DataStatus?.BirthDate !== "certain" && mPerson?.DataStatus?.BirthDate !== "")
  ) {
    approx = "~";
  }
  const dt1 = bDate.Date;
  const dt2 = mDate.Date;
  const ageAtMarriage = getAge(dt1, dt2);
  return approx + ageAtMarriage[0];
}

function getApproxDate(theDate) {
  let approx = false;
  let aDate;
  if (typeof theDate === "object") return theDate;
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    const bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null || !bits[1]) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      aDate = bits[0] + "-" + bits[1] + "-16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

function amaTimer() {
  window.runningAMA++;
  const pagePerson = getPerson(profilePerson.Id);
  if (pagePerson?.Spouses != undefined) {
    window.doneMarriageAges = true;
    // Get the API spouses as an array; we assume the order here matches your parsed spouse records.
    const apiSpouses = Object.entries(pagePerson.Spouses);
    apiSpouses.forEach((spouseEntry, idx) => {
      const marData = spouseEntry[1];
      // Find the corresponding spouse div in the DOM by index.
      const marriageDiv = $(".aSpouse").eq(idx);
      if (!marriageDiv.length) return;

      // Only process if we have a valid marriage date.
      if (isOK(marData.MarriageDate)) {
        // Calculate marriage ages.
        let profileMarriageAge = "";
        if (!window.excludeValues.includes(pagePerson.BirthDate)) {
          profileMarriageAge = getMarriageAge(pagePerson.BirthDate, marData.MarriageDate, pagePerson);
        }
        const spouseFromApi = getPerson(marData.Id);
        const spouseMarriageAge =
          spouseFromApi && isOK(spouseFromApi.BirthDate)
            ? getMarriageAge(spouseFromApi.BirthDate, marData.MarriageDate, spouseFromApi)
            : "";
        let profileAgeText = profileMarriageAge ? pagePerson.FirstName + " (" + profileMarriageAge + ")" : "";
        let spouseAgeText = spouseMarriageAge ? spouseFromApi.FirstName + " (" + spouseMarriageAge + ")" : "";
        if (profileAgeText && spouseAgeText) {
          spouseAgeText = "; " + spouseAgeText;
        }

        // Find (or create) a dedicated container for marriage ages in this spouse div.
        let marriageAgesSpan = marriageDiv.find(".marriageAges");
        if (!marriageAgesSpan.length) {
          marriageAgesSpan = $("<span class='marriageAges'></span>");
          marriageDiv.append(marriageAgesSpan);
        }
        marriageAgesSpan.text(profileAgeText + spouseAgeText);

        // Now update this spouse div’s marriage details.
        let marriageDetailsSpan = marriageDiv.find(".marriageDetails");
        if (marriageDetailsSpan.length) {
          // Replace any "— married" text with an edit link.
          let html = marriageDetailsSpan.html();
          html = html.replace(
            /—\s*married\s*/i,
            `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=editspouse&s=${idx}" target="_blank" title="Right click to edit marriage" class="clickable">married</a> `
          );
          marriageDetailsSpan.html(html);
          // Wrap the contents in an inline container.
          marriageDetailsSpan.contents().wrapAll('<div style="display:inline-block"></div>');
        }
      }
    });
  }
  if (window.runningAMA > 10 || window.doneMarriageAges === true) {
    clearInterval(window.ama);
  }
}

async function addMarriageAges() {
  window.runningAMA = 0;
  if (window.doneMarriageAges === undefined) {
    window.ama = setInterval(amaTimer, 2000);
    window.doneMarriageAges = false;
  }
}

// ============================================================
// Relative Ages Function (for siblings and children)
// ============================================================
function addRelativeAges() {
  const profileBirth = getPerson(profilePerson.Id)?.BirthDate;
  if (!profileBirth || profileBirth === "0000-00-00") return;
  const container = $("#nVitals");
  container.addClass("hasRelAge");
  container
    .find(
      "#siblingList li span[itemprop='sibling'], #childrenList li span[itemprop='children'], #parentList li span[itemprop]"
    )
    .each(function () {
      const $container = $(this);
      const nameAnchor = $container.find("a");
      if (!nameAnchor.length) return;
      const personHref = nameAnchor.attr("href");
      if (!personHref) return;
      const wtId = personHref.split("/").pop();
      const personData = getPersonByWtID(wtId);
      if (!personData || !personData.BirthDate || personData.BirthDate === "0000-00-00") return;
      const diff = getAge(profileBirth, personData.BirthDate);
      const relText = diff[0] !== 0 ? (diff[0] > 0 ? "(+" + diff[0] + ")" : "(" + diff[0] + ")") : "";
      $container.find(".relAge").text(relText);
    });
}

// ============================================================
// Vertical/Horizontal Adjustments and Heading Toggles
// ============================================================
function makeVerticalFamLists() {
  setTimeout(() => {
    addHalfsStyle();
    addRelativeAges();
    assignSpouseAndChildClasses();
  }, 1000);
}

function assignSpouseAndChildClasses() {
  // Only proceed if there are children.
  if ($("#childrenList li").length === 0) return;

  // Determine which parent's data field to check.
  // Default is "mother"; if the first spouse is male then we use "father".
  let checkParent = "mother";
  if ($(".aSpouse").length > 0) {
    const firstSpouseGender = $(".aSpouse").first().data("gender");
    if (firstSpouseGender === "male") {
      checkParent = "father";
    }
  }

  // Gather unique parent IDs from the children.
  let uniqueParentIDs = [];
  $("#childrenList li").each(function () {
    const pid = $(this).data(checkParent);
    if (pid && uniqueParentIDs.indexOf(pid) === -1) {
      uniqueParentIDs.push(pid);
    }
  });

  // Only run the assignment if there is more than one spouse
  // or if the children come from more than one parent.
  if ($(".aSpouse").length > 1 || uniqueParentIDs.length > 1) {
    $(".aSpouse").each(function (index) {
      const className = "spouse_" + (index + 1);
      // Add the class to the spouse element.
      $(this).addClass(className);

      // Get the spouse's ID.
      const spouseID = $(this).data("id");

      // For each child, if its mother or father matches this spouse's ID, add the class.
      $("#childrenList li").each(function () {
        const childMother = $(this).data("mother");
        const childFather = $(this).data("father");
        if (childMother == spouseID || childFather == spouseID) {
          $(this).addClass(className);
        }
      });
    });
  }
}

/*
function addHalfsStyle() {
  const pList = $("#parentList li");
  if (pList.length >= 2) {
    const p1 = pList.eq(0).attr("data-id");
    const p2 = pList.eq(1).attr("data-id");
    pList.eq(0).addClass("parent_1");
    pList.eq(1).addClass("parent_2");
    $("#siblingList li").each(function () {
      const father = $(this).attr("data-father");
      const mother = $(this).attr("data-mother");
      if (father === p1) {
        $(this).addClass("parent_1");
      }
      if (mother === p2) {
        $(this).addClass("parent_2");
      }
    });
  }
}
  */

function addHalfsStyle() {
  const siblings = $("#siblingList li");
  // Get all the parents from the siblings i.e. data-father and data-mother
  // Find if any of the siblings have a different father or a different mother
  // If they don't, return.
  const fathers = siblings
    .map(function () {
      return $(this).attr("data-father");
    })
    .get();
  const mothers = siblings
    .map(function () {
      return $(this).attr("data-mother");
    })
    .get();
  const uniqueFathers = [...new Set(fathers)];
  const uniqueMothers = [...new Set(mothers)];
  if (uniqueFathers.length < 2 && uniqueMothers.length < 2) {
    return;
  }

  const pList = $("#parentList li");
  if (pList.length >= 2) {
    // Get the parent's IDs (which should have been set by attachApiData)
    const p1 = pList.eq(0).attr("data-id");
    const p2 = pList.eq(1).attr("data-id");
    // Only assign classes if the two parent IDs differ (i.e. half‑siblings situation)
    if (p1 && p2 && p1 !== p2) {
      pList.eq(0).addClass("parent_1");
      pList.eq(1).addClass("parent_2");

      // For each sibling, if its data-father equals p1, add class "parent_1".
      // Similarly, if its data-mother equals p2, add class "parent_2".
      $("#siblingList li").each(function () {
        const father = String($(this).attr("data-father") || "");
        const mother = String($(this).attr("data-mother") || "");
        if (father === p1) {
          $(this).addClass("parent_1");
        }
        if (mother === p2) {
          $(this).addClass("parent_2");
        }
      });

      // Also, if there is more than one spouse, add a class to each so that children
      // can later be linked to the corresponding spouse.
      if ($(".aSpouse").length > 1) {
        $(".aSpouse").each(function (index) {
          $(this).addClass("spouse_" + (index + 1));
        });
      }
    }
  }
}

function moveFamilyLists() {
  const $nVitals = $("#nVitals");
  const sidebarHeading = $nVitals.find(".sidebar-heading");
  if (window.innerWidth < 992) {
    sidebarHeading.hide();
    $nVitals.removeClass("row").prependTo(treePersonBit);
  } else if (options.moveToRight) {
    if (options.showSidebarHeading) {
      sidebarHeading.show();
    }

    $nVitals.addClass("row");
    let $before;
    if (options.familyListPosition === "beforeManager") {
      $before = $("#Profile-Data");
    } else if (options.familyListPosition === "beforePhotos") {
      $before = $("#Photos");
    }
    if (!$before?.length) {
      $before = $("#geneticfamily");
      if (!$before.length) {
        $before = $("#DNA");
        if (!$before.length) {
          $before = $("#Research");
        }
      }
    }
    if ($before.length) {
      $nVitals.insertBefore($before);
    } else {
      $nVitals.insertAfter("#Profile-Data");
    }
  }
}

/*
export function changeFamilyHeaders(first = false) {
  const headings = [
    { sel: "#parentsHeader", alt: "Parents: ", male: "Son of: ", female: "Daughter of: ", neutral: "Child of: " },
    { sel: "#siblingsHeader", alt: "Siblings: ", male: "Brother of: ", female: "Sister of: ", neutral: "Sibling of: " },
    { sel: "#spousesHeader", alt: "Spouses: ", male: "Husband of: ", female: "Wife of: ", neutral: "Spouse of: " },
    { sel: "#childrenHeader", alt: "Children: ", male: "Father of: ", female: "Mother of: ", neutral: "Parent of: " },
  ];
  const p = getPerson(profilePerson.Id);
  let gen = "neutral";
  if (p?.Gender === "Male") {
    gen = "male";
  }
  if (p?.Gender === "Female") {
    gen = "female";
  }
  const parentsEl = document.querySelector("#parentsHeader");
  if (!parentsEl) return;
  let headingsAreAlt = false;
  if (parentsEl.textContent.trim() === "Parents:") {
    headingsAreAlt = true;
  }
  headings.forEach((obj) => {
    const el = document.querySelector(obj.sel);
    if (!el) return;
    if (headingsAreAlt) {
      if (gen === "male") {
        el.textContent = obj.male;
      } else if (gen === "female") {
        el.textContent = obj.female;
      } else {
        el.textContent = obj.neutral;
      }
    } else {
      el.textContent = obj.alt;
    }
  });
  if (!first) {
    const newState = headingsAreAlt;
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.changeHeaders = newState;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({ [storageName]: optionsData });
    });
  }
}

function attachHeadingEvents() {
  const headingIds = ["parentsHeader", "siblingsHeader", "spousesHeader", "childrenHeader"];
  headingIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      changeFamilyHeaders(false);
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      let who = "";
      switch (id) {
        case "parentsHeader":
          who = "father";
          break;
        case "siblingsHeader":
          who = "sibling";
          break;
        case "spousesHeader":
          who = "spouse";
          break;
        case "childrenHeader":
          who = "child";
          break;
      }
      const url = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=${who}`;
      window.open(url, "_blank");
    });
  });
}
  */

export function changeFamilyHeaders() {
  // Toggle the state.
  useAltHeadings = !useAltHeadings;

  // Define what each header should show in both states.
  const headings = [
    {
      sel: "#parentsHeader",
      alt: "Parents: ",
      male: "Son of: ",
      female: "Daughter of: ",
      neutral: "Child of: ",
    },
    {
      sel: "#siblingsHeader",
      alt: "Siblings: ",
      male: "Brother of: ",
      female: "Sister of: ",
      neutral: "Sibling of: ",
    },
    {
      sel: "#spousesHeader",
      alt: "Spouses: ",
      male: "Husband of: ",
      female: "Wife of: ",
      neutral: "Spouse of: ",
    },
    {
      sel: "#childrenHeader",
      alt: "Children: ",
      male: "Father of: ",
      female: "Mother of: ",
      neutral: "Parent of: ",
    },
  ];

  // Get the profile person's gender.
  const p = getPerson(profilePerson.Id);
  let gen = "neutral";
  if (p?.Gender === "Male") {
    gen = "male";
  } else if (p?.Gender === "Female") {
    gen = "female";
  }

  // Update each header based on the current toggle state.
  headings.forEach((obj) => {
    const el = document.querySelector(obj.sel);
    if (!el) return;
    if (useAltHeadings) {
      el.textContent = gen === "male" ? obj.male : gen === "female" ? obj.female : obj.neutral;
    } else {
      el.textContent = obj.alt;
    }
  });

  // Optionally, save the new state to storage.
  getFeatureOptions("changeFamilyLists").then((optionsData) => {
    optionsData.changeHeaders = useAltHeadings;
    chrome.storage.sync.set({ changeFamilyLists_options: optionsData });
  });
}

function attachHeadingEvents() {
  const headingIds = ["parentsHeader", "siblingsHeader", "spousesHeader", "childrenHeader"];
  headingIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // On click, simply call our toggle function.
    el.addEventListener("click", () => {
      changeFamilyHeaders();
    });
    // Right‑click opens the edit URL.
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      let who = "";
      switch (id) {
        case "parentsHeader":
          who = "father";
          break;
        case "siblingsHeader":
          who = "sibling";
          break;
        case "spousesHeader":
          who = "spouse";
          break;
        case "childrenHeader":
          who = "child";
          break;
      }
      const url = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=${who}`;
      window.open(url, "_blank");
    });
  });
}

function insertInSibList() {
  // Wait 3 seconds to allow both API data and rendered DOM to be ready.
  setTimeout(() => {
    if (!window.people) {
      console.log("No API people data available.");
      return;
    }
    // Use API data if available; if missing Name, fall back to page data.
    let pPerson = getPerson(profilePerson.Id) || profilePerson;
    if (!pPerson) {
      console.log("Profile person data is missing.");
      return;
    }
    console.log("Profile person for insertion:", pPerson);

    // Helper: extract a numeric birth year.
    // If BirthDate is available:
    //   - if it ends with "s" (e.g. "1960s"), return mid-decade (e.g. 1960 + 5 = 1965)
    //   - otherwise, extract the year.
    // Else, try to extract from UnknownText, or use BirthDateDecade.
    const getBirthYear = (person) => {
      if (person.BirthDate && person.BirthDate !== "0000-00-00") {
        if (person.BirthDate.match(/s$/)) {
          const yr = parseInt(person.BirthDate);
          return isNaN(yr) ? null : yr + 5;
        } else {
          return parseInt(person.BirthDate.split("-")[0]);
        }
      } else if (person.UnknownText) {
        const match = person.UnknownText.match(/\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(/\s*-\s*/);
          if (parts.length > 0) {
            let b = parts[0].trim();
            if (b.match(/s$/)) {
              const yr = parseInt(b);
              return isNaN(yr) ? null : yr + 5;
            } else {
              return parseInt(b);
            }
          }
        }
      } else if (person.BirthDateDecade) {
        const yr = parseInt(person.BirthDateDecade);
        return isNaN(yr) ? null : yr + 5;
      }
      return null;
    };

    const profileBirthYear = getBirthYear(pPerson);
    // console.log("Profile person birth year:", profileBirthYear);
    const birthYear = profileBirthYear;
    const deathYear =
      pPerson.DeathDate && pPerson.DeathDate !== "0000-00-00"
        ? pPerson.DeathDate.match(/s$/)
          ? parseInt(pPerson.DeathDate) + 5
          : parseInt(pPerson.DeathDate.split("-")[0])
        : pPerson.DeathDateDecade
        ? parseInt(pPerson.DeathDateDecade) + 5
        : null;

    // Create the profile person element.
    let inserter = $(`
      <span itemprop="sibling" itemtype="http://schema.org/Person" data-private="0">
        <a href="#n" class="activeProfile" data-wtid="${pPerson.Name}">${displayName(pPerson)[0]}</a>
        <span class="bdDates" data-birth-year="${birthYear || ""}" data-death-year="${deathYear || ""}">
          ${displayDates(pPerson)}
        </span>
      </span>
    `);

    // Wrap in a <li> if vertical layout is enabled.
    const profilePersonLi = $("<li id='profilePerson'></li>");
    let elToFind = "#Siblings li";
    let closestEl = "li";
    if (options && options.verticalLists) {
      profilePersonLi.append(inserter);
      inserter = profilePersonLi;
    } else {
      elToFind = "#Siblings span[itemprop='sibling']";
      closestEl = "span[itemprop='sibling']";
    }

    // Build sibling list from API data.
    let apiSiblings = [...window.people.values()]
      .filter((p) => p.Id !== pPerson.Id)
      .map((p) => {
        if (!p.Name && p.UnknownText) {
          p.Name = p.UnknownText;
        }
        const sibBirthYear = getBirthYear(p);
        //    console.log(`API sibling '${p.Name}' (ID: ${p.Id}) birth year:`, sibBirthYear);
        return {
          element: $(`${elToFind} a[href$="${p.Name}"]`).closest(closestEl),
          birthYear: sibBirthYear,
          id: p.Id,
        };
      })
      .filter((s) => s.element.length && s.birthYear !== null);

    // Build fallback sibling list from the DOM.
    let domSiblings = [];
    $("#siblingList li").each(function () {
      let $li = $(this);
      let bdYear = $li.find(".bdDates").attr("data-birth-year");
      let sibBirthYear = null;
      if (bdYear) {
        if (bdYear.match(/s$/)) {
          let yr = parseInt(bdYear);
          sibBirthYear = isNaN(yr) ? null : yr + 5;
        } else {
          sibBirthYear = parseInt(bdYear.split("-")[0]);
        }
      }
      if (sibBirthYear !== null) {
        domSiblings.push({ element: $li, birthYear: sibBirthYear, id: $li.data("parseName") });
        //    console.log("DOM sibling", $li.data("parseName"), "birth year:", sibBirthYear);
      }
    });

    // Combine both sources, preferring API data if available.
    let siblingList = apiSiblings.length > 0 ? apiSiblings : domSiblings;
    siblingList.sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

    /*
    console.log(
      "Final sorted sibling list:",
      siblingList.map((s) => ({ id: s.id, birthYear: s.birthYear }))
    );
    */

    // Insert the profile person element before the first sibling with a later birth year.
    let inserted = false;
    for (let i = 0; i < siblingList.length; i++) {
      if (birthYear !== null && siblingList[i].birthYear !== null) {
        /*
        console.log(
          `Comparing profile birth year ${birthYear} with sibling ${siblingList[i].id} birth year ${siblingList[i].birthYear}`
        );
        */
        if (birthYear < siblingList[i].birthYear) {
          console.log(`Inserting profile person before sibling ${siblingList[i].id}`);
          inserter.insertBefore(siblingList[i].element);
          inserted = true;
          break;
        }
      }
    }
    if (!inserted) {
      // console.log("Appending profile person at the end of the sibling list.");
      $("#siblingList").append(inserter);
    }

    // Propagate parent classes if present.
    if ($(".parent_1").length) {
      $("#profilePerson span[itemprop='sibling']").addClass("parent_1");
    }
    if ($(".parent_2").length) {
      $("#profilePerson").addClass("parent_2");
    }

    // Set gender attributes.
    if (pPerson?.Gender) {
      const genderLabel = pPerson.Gender === "Male" ? "male" : pPerson.Gender === "Female" ? "female" : "";
      const ariaLabel = genderLabel ? `profile person (${genderLabel})` : "profile person";
      $("#profilePerson").attr("data-gender", genderLabel).attr("aria-label", ariaLabel);
    }

    // Move the "Add Sibling" link to the end.
    $("#addSibling").appendTo($("#addSibling").parent());
  }, 5000);
}

function addAncestorLabels(element) {
  element.addClass("ancestor");
  element.attr("title", "Ancestor");
}

async function getAncestorsOnPage() {
  const storeName = RELATIONSHIP_STORE_NAME;
  const dbPromise = new Promise((resolve, reject) => {
    initRelationshipDB((event) => resolve(event.target.result));
  });

  const db = await dbPromise;

  // Get ancestor IDs based on the relationship filter
  const ancestorsPromise = new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const allItemsRequest = store.getAll();

    allItemsRequest.onsuccess = () => {
      const items = allItemsRequest.result;
      const ancestorKeys = items
        .filter((item) => {
          // console.log(item);
          const relationship = item?.relationship?.toLowerCase();
          //console.log(relationship);
          if (!relationship) return false;
          return relationship.match(/father|mother/i) != null && item.userId === user;
        })
        .map((item) => item.id); // Extract only ancestor IDs
      resolve(ancestorKeys);
    };

    allItemsRequest.onerror = (event) => reject(event.target.error);
  });

  const ancestorKeys = await ancestorsPromise;

  console.log("Ancestor keys:", ancestorKeys);

  const familyLinks = $(".VITALS a[href*='/wiki/']");
  // Make array of wtids
  const peopleOnPage = familyLinks
    .map(function () {
      const link = $(this);
      const href = link.attr("href");
      if (href) {
        const wtid = href.split("/").pop();
        return wtid;
      }
    })
    .get();
  // Add the profile person
  peopleOnPage.push(profilePerson.Name);

  console.log("People on page:", peopleOnPage);

  const ancestorsOnPage = peopleOnPage.filter((person) => {
    const personWithUnderscores = person.replace(/ /g, "_");
    const personWithSpaces = person.replace(/_/g, " ");
    return ancestorKeys.includes(personWithUnderscores) || ancestorKeys.includes(personWithSpaces);
  });

  // Highlight ancestors on the page
  ancestorsOnPage.forEach((ancestor) => {
    const element = $(
      `#nVitals .VITALS a[href$="/wiki/${ancestor.replace(/ /g, "_")}"],
       #nVitals .VITALS a[data-wtid="${ancestor.replace(/ /g, "_")}"],
       #nVitals .VITALS a[href$="/wiki/${ancestor.replace(/_/g, " ")}"],
       #nVitals .VITALS a[data-wtid="${ancestor.replace(/_/g, " ")}"]`
    );
    if (element.length && element.data("status") != 5) {
      console.log("Adding ancestor label to", ancestor, element);
      addAncestorLabels(element);
    }
  });

  if (
    ancestorsOnPage.includes(profilePerson.Name) ||
    $("#yourRelationshipText")
      .text()
      ?.match(/father|mother/)
  ) {
    // Add ancestor labels for the parents of the profile person
    // a[arial-label="Father"], a[aria-label="Mother"]
    const fatherElement = $(`#nVitals .VITALS span[itemprop="Father"] a[aria-label="Parent"]`);
    const motherElement = $(`#nVitals .VITALS span[itemprop="Mother"] a[aria-label="Parent"]`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
    if ($("#childrenList").length && $("#childrenList").find("a.ancestor").length == 0) {
      // Call WT+ API to get the children of the ancestor of the user
      // https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${profilePersonName}&WikiTreeID2=${user}&relatives=1
      // Fetch this, then find the a in the 2nd td of the third tr of the table (of the results)
      // This will be an ancestor of the user.

      const connectionName = await getAncestorConnection(profilePerson.Name, user);

      if (connectionName) {
        const connectionElement = $(
          `#nVitals .VITALS a[href$="/wiki/${connectionName.replace(/ /g, "_")}"],
           #nVitals .VITALS a[data-wtid="${connectionName.replace(/ /g, "_")}"],
           #nVitals .VITALS a[href$="/wiki/${connectionName.replace(/_/g, " ")}"],
           #nVitals .VITALS a[data-wtid="${connectionName.replace(/_/g, " ")}"]`
        );
        if (connectionElement.length) {
          addAncestorLabels(connectionElement);
        }
      }
    }

    // Highlight the ancestor child's parent (the right spouse of the profilePerson).
    if ($("#childrenList a.ancestor").length && $(".spouseDetails a.ancestor").length == 0) {
      const connectionElement = $("#childrenList a.ancestor");
      // Get spouse_x class of closest li
      const thisClass = connectionElement.closest("li").attr("class");
      // Find the spouse of the profile person with the same class
      // There may be more than one class. We need to find the one that starts with "spouse_" (if there is one).
      const spouseClass = thisClass?.split(" ").find((c) => c.startsWith("spouse_"));
      if (spouseClass) {
        const spouseA = $(`.spouseDetails.${spouseClass} span a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      } else {
        // If there is no spouse class, find the first spouse link
        const spouseA = $(`a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      }
    }
  } else if ($("#siblingList a.ancestor").length) {
    const closestLi = $("#siblingList a.ancestor").closest("li");
    const fatherId = closestLi.data("father");
    const motherId = closestLi.data("mother");
    const fatherElement = $(`#nVitals .VITALS li[data-id="${fatherId}"] a`);
    const motherElement = $(`#nVitals .VITALS li[data-id="${motherId}"] a`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
  }

  return ancestorsOnPage.map((a) => a.Name); // Return the array of ancestor WT IDs
}

async function getAncestorConnection(ancestor, user) {
  const url = `https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${ancestor}&WikiTreeID2=${user}&relatives=1`;
  return fetch(url)
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      const rows = table.querySelectorAll("tr");
      const ancestorLink = rows[2].querySelector("td:nth-child(2) a");
      if (ancestorLink) {
        return ancestorLink.href.split("/").pop();
      }
    });
}

// ============================================================
// Main Hook: Initialize, Replace DOM, and Attach Events
// ============================================================
shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (!result) return;
  const familyData = parseInitialData();
  $("div.tree--person").empty();
  await getWindowPeople();
  const newVitals = buildFamilyListsFromData(familyData);
  treePersonBit.append(newVitals);
  attachApiData();
  options = await getFeatureOptions("changeFamilyLists");
  window.excludeValues = ["", null, "null", "0000-00-00", "unknown", "undefined", undefined, NaN, "NaN"];
  if (options.changeHeaders) {
    changeFamilyHeaders(true);
  }
  if (options.moveToRight) {
    moveFamilyLists();
  }
  if (options.verticalLists) {
    $("#nVitals").addClass("vertical");
    makeVerticalFamLists();
  } else {
    $("#nVitals").addClass("vanilla");
  }
  attachHeadingEvents();

  if (options.agesAtMarriages) {
    addMarriageAges();
  }

  const pagePerson = getPerson(profilePerson.Id);
  let isPrivate = false;
  if (!pagePerson?.Name) {
    isPrivate = true;
  }
  if (
    !isPrivate &&
    $("li#profilePerson").length == 0 &&
    familyData.siblings.length &&
    familyData.siblings[0].FullName
  ) {
    insertInSibList();
  }
  console.log("change_family_lists: Script loaded with updated structure.");

  // Re-run moveToRight on window resize.
  if (options.moveToRight) {
    window.addEventListener("resize", moveFamilyLists);
  }

  if (options.highlightAncestors) {
    setTimeout(function () {
      getAncestorsOnPage().catch(console.error);
    }, 5000);
  }
});
