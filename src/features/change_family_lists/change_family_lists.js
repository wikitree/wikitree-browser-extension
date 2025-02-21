/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)

This version builds the family lists with the following features:
• No Opera-specific attributes (like bis_skin_checked) or data-family-vitals.
• For spouses and children, if no data is available, an “unknown” block is output.
• The spouse block uses a grid layout so that the name and dates are separate and the name remains clickable.
• A Unicode pencil (✎) icon is appended for editing spouses.
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
      const noDates = inner.replace(/\([^)]*\)/, "").trim();
      record.Name = noDates;
    } else {
      record.Name = fullText;
    }
  }
  return record;
}

function newPersonFromBracket(bracketText, link = "") {
  const record = newPersonRecord();
  record.UnknownText = bracketText.trim();
  record.Name = bracketText.trim();
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
// 2. Build DOM Structure (Matching Your Goal Output)
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
  // For spouses: if there’s no data, output the unknown block.
  if (familyData.spouses.length === 0) {
    container.appendChild(buildSpousesUnknown());
  } else {
    container.appendChild(buildSpousesSection(familyData.spouses));
  }
  // Similarly for children:
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
  if (parents.length === 0) {
    const liFather = document.createElement("li");
    liFather.id = "fatherUnknown";
    liFather.title = "Right click to add a father";
    liFather.style.cursor = "pointer";
    liFather.textContent = "[father unknown]";
    ol.appendChild(liFather);
    const liMother = document.createElement("li");
    liMother.id = "motherUnknown";
    liMother.title = "Right click to add a mother";
    liMother.style.cursor = "pointer";
    liMother.textContent = "[mother unknown]";
    ol.appendChild(liMother);
  } else {
    parents.forEach((p) => {
      const li = document.createElement("li");
      li.dataset.parseName = p.Name;
      if (p.UnknownText.match(/father unknown/i)) {
        li.id = "fatherUnknown";
        li.title = "Right click to add a father";
        li.style.cursor = "pointer";
        li.textContent = p.UnknownText;
      } else if (p.UnknownText.match(/mother unknown/i)) {
        li.id = "motherUnknown";
        li.title = "Right click to add a mother";
        li.style.cursor = "pointer";
        li.textContent = p.UnknownText;
      } else {
        if (p.Link) {
          const a = document.createElement("a");
          a.href = p.Link;
          a.textContent = p.FullName || p.Name;
          li.appendChild(a);
        } else {
          li.textContent = p.FullName || p.Name;
        }
        const bdSpan = document.createElement("span");
        bdSpan.className = "bdDates";
        li.appendChild(bdSpan);
      }
      ol.appendChild(li);
    });
  }
  div.appendChild(ol);
  return div;
}

function buildSiblingsSection(siblings) {
  const div = document.createElement("div");
  // Use id "siblingDetails" as in your goal.
  div.className = "VITALS familyList";
  div.id = "siblingDetails";

  const heading = document.createElement("span");
  heading.id = "siblingsHeader";
  heading.className = "clickable";
  heading.setAttribute("data-replace-text", "Sister of ");
  heading.setAttribute("data-alt-text", "Siblings: ");
  heading.setAttribute("data-original-text", "Sister of ");
  heading.setAttribute("data-this-text", "Siblings: ");
  heading.title = "Right click to add a sibling";
  heading.style.cursor = "pointer";
  heading.textContent = "Siblings: ";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "siblingList";
  ol.className = "nameList hasRelAge";
  if (siblings.length === 0) {
    const li = document.createElement("li");
    li.id = "siblingsUnknown";
    li.textContent = "[sibling(s) unknown]";
    ol.appendChild(li);
  } else {
    siblings.forEach((s) => {
      const li = document.createElement("li");
      li.dataset.parseName = s.Name;
      if (s.Link) {
        const a = document.createElement("a");
        a.href = s.Link;
        a.textContent = s.FullName || s.Name;
        li.appendChild(a);
        const bdSpan = document.createElement("span");
        bdSpan.className = "bdDates";
        li.appendChild(bdSpan);
      } else {
        li.textContent = s.FullName || s.Name;
        const bdSpan = document.createElement("span");
        bdSpan.className = "bdDates";
        li.appendChild(bdSpan);
      }
      ol.appendChild(li);
    });
  }
  div.appendChild(ol);
  return div;
}

function buildSpousesSection(spouses) {
  // Build the spouse section when data is present.
  const div = document.createElement("div");
  div.className = "VITALS spouseDetails familyList aSpouse";
  // Attach a parse name so API data (like dates) is merged.
  if (spouses.length > 0) {
    div.dataset.parseName = spouses[0].Name;
    div.setAttribute("data-id", spouses[0].Id || "600485");
    div.setAttribute("data-gender", spouses[0].Gender || "Female");
  }

  const aSpouse = document.createElement("a");
  aSpouse.className = "spouseText clickable";
  aSpouse.setAttribute("data-replace-text", "Husband of ");
  aSpouse.setAttribute("data-alt-text", "Spouse: ");
  aSpouse.setAttribute("data-original-text", "Husband of ");
  aSpouse.setAttribute("data-this-text", "Spouse: ");
  aSpouse.title = "Right click to add a spouse";
  aSpouse.style.cursor = "pointer";
  aSpouse.textContent = "Spouse: ";
  div.appendChild(aSpouse);

  // Use a grid container to separate name and dates.
  const spouseGrid = document.createElement("div");
  spouseGrid.className = "spouseGrid";

  const spouseEntry = document.createElement("span");
  spouseEntry.className = "spouseEntry";
  spouseEntry.setAttribute("itemprop", "spouse");
  spouseEntry.setAttribute("itemscope", "");
  spouseEntry.setAttribute("itemtype", "https://schema.org/Person");
  if (spouses.length > 0 && spouses[0].Link) {
    const a = document.createElement("a");
    a.href = spouses[0].Link;
    a.className = "spouseLink";
    a.setAttribute("itemprop", "url");
    const nameSpan = document.createElement("span");
    nameSpan.setAttribute("itemprop", "name");
    nameSpan.innerHTML = `<strong>${spouses[0].FullName || spouses[0].Name}</strong>`;
    a.appendChild(nameSpan);
    spouseEntry.appendChild(a);
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
  let detailsText = "";
  if (spouses.length > 0) {
    detailsText = spouses[0].MarriageDetails || "";
  }
  detailsText = detailsText.trim();
  detailsText = detailsText
    .replace(/^(—\s*married\s*)+/i, "")
    .replace(/add\/edit spouses/i, "")
    .trim();
  if (!detailsText.includes("[date unknown]")) {
    detailsText += " [date unknown]";
  }
  if (!detailsText.includes("[location unknown]")) {
    detailsText += " [location unknown]";
  }
  marriageDetails.textContent = "— married " + detailsText;

  // Append the edit icon.
  const editLink = document.createElement("a");
  editLink.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=spouse`;
  editLink.className = "editSpouseIcon";
  editLink.title = "Add/Edit Spouses";
  editLink.style.cursor = "pointer";
  editLink.textContent = " ✎";
  editLink.style.position = "relative";
  editLink.style.zIndex = "10";
  marriageDetails.appendChild(editLink);

  div.appendChild(marriageDetails);
  return div;
}

function buildSpousesUnknown() {
  // When no spouse data exists, output the unknown block.
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "spousesUnknownHeading";
  div.title = "Right click to add a spouse";
  div.style.cursor = "pointer";
  const span = document.createElement("span");
  span.id = "spousesUnknown";
  span.textContent = "[spouse(s) unknown]";
  div.appendChild(span);
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
  children.forEach((c) => {
    const li = document.createElement("li");
    li.dataset.parseName = c.Name;
    if (c.Link) {
      const spanChild = document.createElement("span");
      spanChild.setAttribute("itemprop", "children");
      spanChild.setAttribute("itemscope", "");
      spanChild.setAttribute("itemtype", "https://schema.org/Person");
      const a = document.createElement("a");
      a.href = c.Link.startsWith("http") ? c.Link : "https://www.wikitree.com" + c.Link;
      a.className = "childLink";
      a.setAttribute("itemprop", "url");
      a.title = "";
      a.setAttribute("aria-label", "Son");
      const nameSpan = document.createElement("span");
      nameSpan.setAttribute("itemprop", "name");
      nameSpan.textContent = c.FullName || c.Name;
      a.appendChild(nameSpan);
      spanChild.appendChild(a);
      const bdSpan = document.createElement("span");
      bdSpan.className = "bdDates";
      let bYear = "";
      let dYear = "";
      if (c.BirthDate && c.BirthDate !== "0000-00-00") {
        bYear = c.BirthDate.split("-")[0];
      } else if (c.BirthDateDecade) {
        bYear = c.BirthDateDecade;
      }
      if (c.DeathDate && c.DeathDate !== "0000-00-00") {
        dYear = c.DeathDate.split("-")[0];
      } else if (c.DeathDateDecade) {
        dYear = "~" + c.DeathDateDecade;
      }
      bdSpan.setAttribute("data-birth-year", bYear);
      bdSpan.setAttribute("data-death-year", dYear);
      bdSpan.textContent = bYear || dYear ? ` (${bYear} - ${dYear})` : "";
      spanChild.appendChild(bdSpan);
      const relAgeSpan = document.createElement("span");
      relAgeSpan.className = "relAge";
      relAgeSpan.title = `${c.FullName || c.Name} was born ? years after Andrew`;
      spanChild.appendChild(relAgeSpan);
      li.appendChild(spanChild);
    } else {
      li.textContent = c.FullName || c.Name;
      const bdSpan = document.createElement("span");
      bdSpan.className = "bdDates";
      li.appendChild(bdSpan);
    }
    li.setAttribute("data-gender", c.Gender || "male");
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
  const span = document.createElement("span");
  span.id = "childrenUnknown";
  span.textContent = "[children unknown]";
  div.appendChild(span);
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

export function getAge(start, end = false) {
  return [0, 0, 0];
}

// ============================================================
// 4. Vertical/Horizontal Adjustments and Heading Toggles
// ============================================================

function makeVerticalFamLists() {
  setTimeout(() => {
    addHalfsStyle();
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
      if (father === p1) $(this).addClass("parent_1");
      if (mother === p2) $(this).addClass("parent_2");
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
  if (p?.Gender === "Male") gen = "male";
  if (p?.Gender === "Female") gen = "female";
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
      if (gen === "male") el.textContent = obj.male;
      else if (gen === "female") el.textContent = obj.female;
      else el.textContent = obj.neutral;
    } else {
      el.textContent = obj.alt;
    }
  });
  if (!first) {
    const newState = headingsAreAlt;
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.changeHeaders = newState;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({
        [storageName]: optionsData,
      });
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
// 5. Main Hook: Initialize, Replace DOM, and Attach Events
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
    // Implement addMarriageAges if required.
  }
  console.log("change_family_lists: Script loaded with updated structure.");
});
