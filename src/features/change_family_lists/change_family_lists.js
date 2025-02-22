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

const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,Name,Prefix,RealName,ShortName," +
  "Spouses,Suffix,TrustedList";

// ============================================================
// 1. Data Record Shapes and Parsing Functions
// ============================================================

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
  };
}

function newFamilyData() {
  return {
    parents: [],
    siblings: [],
    spouses: [],
    children: [],
  };
}

// When processing an element (with a link or small span) use this function.
function parseItempropElement(el) {
  const record = newPersonRecord();
  const linkEl = el.querySelector("a[itemprop='url'], a[href*='/wiki/']");
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
    // If there is bracketed text, try to extract dates.
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
      // Remove any parenthesized date from the name.
      const noDates = inner.replace(/\s*\([^)]*\)/, "").trim();
      record.Name = noDates;
    } else {
      record.Name = fullText;
    }
  }
  return record;
}

// For bracketed text that comes from blocks (e.g. [children?]) we want to try to split off any date range.
function newPersonFromBracket(bracketText, link = "") {
  const record = newPersonRecord();
  const trimmed = bracketText.trim();
  record.UnknownText = trimmed;
  // If the text contains a parenthesized date range, extract it.
  const dateRangeMatch = trimmed.match(/\(([^)]+)\)/);
  if (dateRangeMatch) {
    const [b, d] = dateRangeMatch[1].split(/\s*-\s*/);
    record.BirthDate = b?.trim() || "";
    record.DeathDate = d?.trim() || "";
    // Remove the parenthesized part from the displayed name.
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
    if (/^\[[^]]*\]$/.test(text)) {
      results.push(newPersonFromBracket(text, a.getAttribute("href") || ""));
    }
  });
  let raw = blockEl.innerText;
  anchors.forEach((a) => {
    const t = a.textContent.trim();
    if (/^\[[^]]*\]$/.test(t)) {
      raw = raw.replace(t, "");
    }
  });
  const bracketRegex = /\[[^\]]*\]/g;
  const bracketed = raw.match(bracketRegex) || [];
  bracketed.forEach((b) => results.push(newPersonFromBracket(b)));
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
  const bracketed = parseBracketedUnknownInBlock(blockEl);
  bracketed.forEach((b) => records.push(b));
  return records;
}

function parseSpousesBlock(spousesEl) {
  const html = spousesEl.innerHTML;
  const reSplit = /(?:Husband|Wife|Spouse)\s+of/i;
  const chunks = html.split(reSplit);
  const spouseRecords = [];
  chunks.forEach((chunk, i) => {
    if (i === 0) return;
    const div = document.createElement("div");
    div.innerHTML = chunk;
    const spouseSpan = div.querySelector('[itemprop="spouse"]');
    const rec = newPersonRecord();
    if (spouseSpan) {
      const spouseData = parseItempropElement(spouseSpan);
      Object.assign(rec, spouseData);
    }
    const chunkText = div.innerText;
    const idx = chunkText.toLowerCase().indexOf("— married");
    if (idx >= 0) {
      let details = chunkText.slice(idx).trim();
      details = details.replace(/\s{2,}/g, " ").trim();
      rec.MarriageDetails = details;
    }
    const mapLink = div.querySelector('a[href*="maps.google"]');
    if (mapLink) {
      rec.MarriageMapLink = mapLink.getAttribute("href");
    }
    if (rec.Name) rec.Name = rec.Name.trim();
    if (rec.UnknownText) rec.UnknownText = rec.UnknownText.trim();
    const skipRegex = /^\[(date|location) unknown\]$/i;
    if (skipRegex.test(rec.Name) || skipRegex.test(rec.UnknownText)) {
      spouseRecords.push({ merge: true, text: rec.UnknownText });
      return;
    }
    if (rec.Name || rec.FullName || rec.UnknownText || rec.MarriageDetails) {
      spouseRecords.push(rec);
    }
  });
  return spouseRecords;
}

function parseInitialData() {
  const container = document.querySelector("div.tree--person") || document.body;
  const familyData = newFamilyData();
  const parentsBlock = container.querySelector("#Parents");
  if (parentsBlock) {
    familyData.parents = parseBlock(parentsBlock, "parent");
  }
  const siblingsBlock = container.querySelector("#Siblings");
  if (siblingsBlock) {
    familyData.siblings = parseBlock(siblingsBlock, "sibling");
  }
  const spousesBlock = container.querySelector("#Spouses");
  if (spousesBlock) {
    const spouseEntries = parseSpousesBlock(spousesBlock);
    let mergedRecords = [];
    spouseEntries.forEach((entry) => {
      if (entry.merge && mergedRecords.length > 0) {
        let last = mergedRecords[mergedRecords.length - 1];
        if (last.MarriageDetails && !last.MarriageDetails.includes(entry.text)) {
          last.MarriageDetails += " " + entry.text;
        } else if (!last.MarriageDetails) {
          last.MarriageDetails = entry.text;
        }
      } else {
        mergedRecords.push(entry);
      }
    });
    familyData.spouses = mergedRecords;
    const bracketed = parseBracketedUnknownInBlock(spousesBlock);
    familyData.spouses.push(...bracketed);
  }
  const childrenBlock = container.querySelector("#Children");
  if (childrenBlock) {
    familyData.children = parseBlock(childrenBlock, "children");
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
  container.className = "row vertical";
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

function buildParentsSection(parents) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "parentDetails";

  const heading = document.createElement("span");
  heading.id = "parentsHeader";
  heading.className = "clickable";
  heading.setAttribute("data-replace-text", "Son of ");
  heading.setAttribute("data-alt-text", "Parents: ");
  heading.setAttribute("data-original-text", "Son of ");
  heading.setAttribute("data-this-text", "Parents: ");
  heading.title = "Right click to add a father";
  heading.style.cursor = "pointer";
  heading.textContent = "Parents: ";
  div.appendChild(heading);

  const meta = document.createElement("meta");
  meta.setAttribute("itemprop", "gender");
  meta.content = "male";
  div.appendChild(meta);

  const ol = document.createElement("ol");
  ol.id = "parentList";
  ol.className = "nameList";
  ol.style.listStyle = "none";
  if (parents.length === 0) {
    ol.innerHTML = `
      <li id="fatherUnknown" title="Right click to add a father" style="cursor:pointer;">
        <a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=father" class="BLANK">[father?]</a>
      </li>
      <li id="motherUnknown" title="Right click to add a mother" style="cursor:pointer;">
        <a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=mother" class="BLANK">[mother?]</a>
      </li>
    `;
  } else {
    parents.forEach((p) => {
      const li = document.createElement("li");
      li.dataset.parseName = p.Name;
      if (/^\[.*\?\]$/.test(p.Name)) {
        li.innerHTML = `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=parent" class="BLANK">${p.Name}</a>`;
      } else {
        li.innerHTML = `<span itemprop="parent" itemscope itemtype="https://schema.org/Person">
          <a href="${p.Link}" itemprop="url" title="" aria-label="Parent">
            <span itemprop="name">${p.FullName || p.Name}</span>
          </a>
          <span class="bdDates" data-birth-year="" data-death-year=""></span>
          <span class="relAge"></span>
          </span>`;
      }
      ol.appendChild(li);
    });
  }
  div.appendChild(ol);
  return div;
}

function buildSiblingsSection(siblings) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "siblingDetails";

  const heading = document.createElement("span");
  heading.id = "siblingsHeader";
  heading.className = "clickable";
  heading.setAttribute("data-replace-text", "Siblings: ");
  heading.setAttribute("data-alt-text", "Siblings: ");
  heading.setAttribute("data-original-text", "Siblings: ");
  heading.setAttribute("data-this-text", "Siblings: ");
  heading.title = "Right click to add a sibling";
  heading.style.cursor = "pointer";
  heading.textContent = "Siblings: ";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "siblingList";
  ol.className = "nameList hasRelAge";
  ol.style.listStyle = "none";
  if (siblings.length === 0) {
    ol.innerHTML = `<li id="siblingsUnknown">
      <a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=sibling" class="BLANK">[siblings?]</a>
      </li>`;
  } else {
    siblings.forEach((s) => {
      const li = document.createElement("li");
      li.dataset.parseName = s.Name;
      if (/^\[.*\?\]$/.test(s.Name)) {
        li.innerHTML = `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=sibling" class="BLANK">${s.Name}</a>`;
      } else {
        li.innerHTML = `<span itemprop="sibling" itemscope itemtype="https://schema.org/Person">
          <a href="${s.Link}" itemprop="url" title="" aria-label="Sibling">
            <span itemprop="name">${s.FullName || s.Name}</span>
          </a>
          <span class="bdDates" data-birth-year="" data-death-year=""></span>
          <span class="relAge"></span>
          </span>`;
        li.setAttribute("data-gender", s.Gender || "male");
        if (s.Father) li.setAttribute("data-father", s.Father);
        if (s.Mother) li.setAttribute("data-mother", s.Mother);
      }
      ol.appendChild(li);
    });
  }
  div.appendChild(ol);
  return div;
}

function buildSpousesSection(spouses) {
  const div = document.createElement("div");
  div.className = "VITALS spouseDetails familyList aSpouse";
  if (spouses.length > 0) {
    div.dataset.parseName = spouses[0].Name;
    div.setAttribute("data-id", spouses[0].Id || "600485");
    div.setAttribute("data-gender", spouses[0].Gender || "Female");
  }
  const headerSpan = document.createElement("span");
  headerSpan.id = "spousesHeader";
  headerSpan.className = "clickable";
  headerSpan.setAttribute("data-replace-text", "Spouses: ");
  headerSpan.setAttribute("data-alt-text", "Spouses: ");
  headerSpan.setAttribute("data-original-text", "Spouses: ");
  headerSpan.setAttribute("data-this-text", "Spouses: ");
  headerSpan.title = "Right click to add a spouse";
  headerSpan.style.cursor = "pointer";
  headerSpan.textContent = "Spouses: ";
  div.appendChild(headerSpan);

  const spouseGrid = document.createElement("div");
  spouseGrid.className = "spouseGrid";
  const spouseEntry = document.createElement("span");
  spouseEntry.className = "spouseEntry";
  spouseEntry.setAttribute("itemprop", "spouse");
  spouseEntry.setAttribute("itemscope", "");
  spouseEntry.setAttribute("itemtype", "https://schema.org/Person");
  spouseEntry.setAttribute("data-gender", spouses[0].Gender || "Female");
  if (spouses.length > 0 && spouses[0].Link) {
    spouseEntry.innerHTML = `<a href="${spouses[0].Link}" itemprop="url" title="" class="spouseLink">
      <span itemprop="name"><strong>${spouses[0].FullName || spouses[0].Name}</strong></span>
      </a>`;
  } else {
    spouseEntry.textContent = spouses.length > 0 ? spouses[0].FullName || spouses[0].Name : "";
  }
  spouseGrid.appendChild(spouseEntry);

  const spouseDates = document.createElement("span");
  spouseDates.className = "spouseDates bdDates";
  if (spouses.length > 0) {
    const idName = (spouses[0].Name || "").replace(/\s/g, "-");
    spouseDates.id = idName + "-bdDates";
  }
  spouseGrid.appendChild(spouseDates);
  div.appendChild(spouseGrid);

  const marriageDetails = document.createElement("span");
  marriageDetails.className = "marriageDetails";
  let detailsText = spouses.length > 0 ? spouses[0].MarriageDetails || "" : "";
  // If there are no details, do not output any "- married" text.
  marriageDetails.textContent = detailsText !== "" ? "— married " + detailsText : "";
  // Only add the edit link if there is a spouse (and if details exist or you want the icon regardless)
  if (spouses.length > 0) {
    const editLink = document.createElement("a");
    editLink.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=spouse`;
    editLink.className = "editSpouseIcon";
    editLink.title = "Add/Edit Spouses";
    editLink.style.cursor = "pointer";
    editLink.textContent = " ✎";
    editLink.style.position = "relative";
    editLink.style.zIndex = "10";
    marriageDetails.appendChild(editLink);
  }
  div.appendChild(marriageDetails);
  return div;
}

function buildSpousesUnknown() {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "spousesUnknownHeading";
  div.title = "Right click to add a spouse";
  div.style.cursor = "pointer";
  const a = document.createElement("a");
  a.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=spouse`;
  a.className = "BLANK";
  a.textContent = "[spouse?]";
  div.appendChild(a);
  return div;
}

function buildChildrenSection(children) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "childrenDetails";

  const heading = document.createElement("span");
  heading.id = "childrenHeader";
  heading.className = "clickable";
  heading.setAttribute("data-replace-text", "Father of\n");
  heading.setAttribute("data-alt-text", "Child:\n");
  heading.setAttribute("data-original-text", "Father of\n");
  heading.setAttribute("data-this-text", "Child:\n");
  heading.title = "Right click to add a child";
  heading.style.cursor = "pointer";
  heading.textContent = "Child:";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "childrenList";
  ol.className = "nameList hasRelAge";
  ol.style.listStyle = "none";
  children.forEach((c) => {
    const li = document.createElement("li");
    li.dataset.parseName = c.Name;
    if (/^\[.*\?\]$/.test(c.Name)) {
      const link = c.Link || `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=child`;
      li.innerHTML = `<a href="${link}" class="BLANK">${c.Name}</a>`;
    } else if (c.Link) {
      li.innerHTML = `<span itemprop="children" itemscope itemtype="https://schema.org/Person">
        <div class="childGrid">
          <a href="${
            c.Link.startsWith("http") ? c.Link : "https://www.wikitree.com" + c.Link
          }" itemprop="url" title="" aria-label="Son" class="childLink">
            <span itemprop="name">${c.FullName || c.Name}</span>
          </a>
          <span class="bdDates" data-birth-year="" data-death-year=""></span>
        </div>
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
  div.appendChild(ol);
  return div;
}

function buildChildrenUnknown() {
  const div = document.createElement("div");
  div.className = "VITALS";
  div.id = "childrenUnknownHeading";
  div.title = "Right click to add a child";
  div.style.cursor = "pointer";
  const a = document.createElement("a");
  a.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=child`;
  a.className = "BLANK";
  a.textContent = "[children?]";
  div.appendChild(a);
  return div;
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
  if (p.BirthDate && p.BirthDate !== "0000-00-00") {
    bYear = p.BirthDate.split("-")[0];
  } else if (p.BirthDateDecade) {
    bYear = p.BirthDateDecade;
  }
  if (p.DeathDate && p.DeathDate !== "0000-00-00") {
    dYear = p.DeathDate.split("-")[0];
  } else if (p.DeathDateDecade) {
    dYear = "~" + p.DeathDateDecade;
  }
  if (bYear.trim().toLowerCase() === "unknown" || bYear.trim().toLowerCase() === "~unknown") bYear = "";
  if (dYear.trim().toLowerCase() === "unknown" || dYear.trim().toLowerCase() === "~unknown") dYear = "";
  const finalText = bYear || dYear ? ` (${bYear} - ${dYear})` : "";
  $el.find(".bdDates, .spouseDates").each(function () {
    $(this).text(finalText);
  });
}

function attachApiData() {
  $("#nVitals li, #nVitals div.aSpouse").each(function () {
    const parseName = $(this).data("parseName");
    if (!parseName) return;
    const p = getPersonByWtID(parseName);
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

async function highlightAncestorsOnPage() {
  const dbPromise = new Promise((resolve) => {
    initRelationshipDB((e) => resolve(e.target.result));
  });
  const db = await dbPromise;
  const store = db.transaction(RELATIONSHIP_STORE_NAME, "readonly").objectStore(RELATIONSHIP_STORE_NAME);
  const allItemsRequest = store.getAll();
  const items = await new Promise((resolve) => {
    allItemsRequest.onsuccess = () => resolve(allItemsRequest.result);
  });
  const ancestorKeys = items
    .filter((x) => x.userId === user && x.relationship?.toLowerCase().match(/father|mother/))
    .map((x) => x.id);
  const familyLinks = $("#nVitals .VITALS a[href*='/wiki/']");
  const peopleOnPage = familyLinks
    .map(function () {
      const href = $(this).attr("href");
      return href ? href.split("/").pop() : null;
    })
    .get();
  peopleOnPage.push(profilePerson.Name);
  const ancestorsOnPage = peopleOnPage.filter((p) => {
    const underscored = p.replace(/ /g, "_");
    const spaced = p.replace(/_/g, " ");
    return ancestorKeys.includes(underscored) || ancestorKeys.includes(spaced);
  });
  ancestorsOnPage.forEach((ancestor) => {
    const sel = `.VITALS a[href$="/wiki/${ancestor.replace(/ /g, "_")}"], .VITALS a[href$="/wiki/${ancestor.replace(
      /_/g,
      " "
    )}"]`;
    const $elem = $(sel);
    if ($elem.length && $elem.data("status") != 5) {
      addAncestorLabels($elem);
    }
  });
}

function addAncestorLabels(element) {
  element.addClass("ancestor");
  element.attr("title", "Ancestor");
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
    const oSpouses = Object.entries(pagePerson.Spouses);
    oSpouses.forEach(function (spouseEntry) {
      const marData = spouseEntry[1];
      const spouse = getPerson(marData.Id);
      if (isOK(marData.MarriageDate)) {
        let profileMarriageAge;
        if (!window.excludeValues.includes(pagePerson.BirthDate)) {
          profileMarriageAge = getMarriageAge(pagePerson.BirthDate, marData.MarriageDate, pagePerson);
        }
        const spouseMarriageAge = getMarriageAge(spouse?.BirthDate, marData.MarriageDate, spouse);
        let profileAgeText = "";
        let spouseAgeText = "";
        if (profileMarriageAge) {
          profileAgeText = pagePerson.FirstName + " (" + profileMarriageAge + ")";
        }
        if (isOK(spouse?.BirthDate)) {
          spouseAgeText = spouse.FirstName + " (" + spouseMarriageAge + ")";
          if (profileMarriageAge) {
            spouseAgeText = "; " + spouseAgeText;
          }
        }
        const marriageDiv = $(`.spouseDetails a.spouseLink`).closest(".aSpouse");
        marriageDiv.append($("<span class='marriageAges'>" + profileAgeText + spouseAgeText + "</span>"));
        const marriageId = "marriage_" + spouseEntry[0];
        const marriageDetails = marriageDiv.find(".marriageDetails");
        marriageDetails.html(function (index, html) {
          return html.replace(
            "married",
            `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=editspouse&s=${spouseEntry[0]}" target="_blank" title="Right click to edit marriage" class="clickable" id="${marriageId}">married</a>`
          );
        });
        marriageDetails.contents().wrapAll('<div style="display:inline-block"></div>');
        clearInterval(window.ama);
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
  $("#siblingList li span[itemprop='sibling'], #childrenList li span[itemprop='children']").each(function () {
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
// 4. Vertical/Horizontal Adjustments and Heading Toggles
// ============================================================
function makeVerticalFamLists() {
  setTimeout(() => {
    addHalfsStyle();
    addRelativeAges();
  }, 1000);
}

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

function moveFamilyLists() {
  if (window.innerWidth < 992) {
    $("#nVitals").removeClass("row").insertAfter($("#birthDetails, #profileName").last());
  } else if (options.moveToRight) {
    $("#nVitals").addClass("row");
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
      $("#nVitals").insertBefore($before);
    } else {
      $("#nVitals").insertAfter("#Profile-Data");
    }
  }
}

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

// ============================================================
// Main Hook: Initialize, Replace DOM, and Attach Events
// ============================================================
shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (!result) return;
  const familyData = parseInitialData();
  $("#familyVitals").remove();
  await getWindowPeople();
  const newVitals = buildFamilyListsFromData(familyData);
  $("#Profile-Data").after(newVitals);
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
  }
  attachHeadingEvents();
  if (options.highlightAncestors) {
    highlightAncestorsOnPage().catch(console.error);
  }
  if (options.agesAtMarriages) {
    addMarriageAges();
  }
  console.log("change_family_lists: Script loaded with updated structure.");
});
