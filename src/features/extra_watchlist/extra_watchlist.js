/*
  Created By: Ian Beacall (Beacall-6)
  Extra Watchlist Feature – Two Tabs (Profiles & Spaces) with Sortable Columns
*/

import $ from "jquery";
import Cookies from "js-cookie";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/tabs"; // Ensure tabs widget is loaded
import "../../thirdparty/date.format.js";
import "./extra_watchlist.css";
import { isOK, htmlEntities, getUserWtId, getUserNumId, profilePerson } from "../../core/common";
import { mainDomain } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// ====================================================================
// INITIALIZATION
// ====================================================================
shouldInitializeFeature("extraWatchlist").then((result) => {
  if (result && $("body.edit-family,body.edit-person").length === 0) {
    normalizeLocalStorage();
    extraWatchlist();
    setPlusButton();
  }
});

// Normalize localStorage: replace "@" with commas and back up if needed.
const normalizeLocalStorage = () => {
  const extraWatchlist = localStorage.getItem("extraWatchlist");
  if (extraWatchlist) {
    if (!extraWatchlist.includes(",") && !localStorage.getItem("extraWatchlistBackUp")) {
      localStorage.setItem("extraWatchlistBackUp", extraWatchlist);
    }
    localStorage.setItem("extraWatchlist", extraWatchlist.replace(/@/g, ","));
  }
};

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

// Returns the current ID from the URL (if a space) or from the profile.
const getThisID = () => window.location.href.match(/Space:.*$/)?.[0] || profilePerson?.Name;

// Returns a formatted date string "YYYY-MM-DD_HHMM".
const strDate = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

// Creates a text file blob URL (used for export).
window.textFile = null;
const makeTextFile = (text) => {
  const data = new Blob([text], { type: "text/plain" });
  if (window.textFile !== null) {
    window.URL.revokeObjectURL(window.textFile);
  }
  window.textFile = window.URL.createObjectURL(data);
  return window.textFile;
};

// ====================================================================
// SORTING FUNCTIONS
// ====================================================================

// Sorts the rows within a given table body selector based on the given order.
// tableSelector should be like "#touchedListPersons tbody" or "#touchedListSpaces tbody".
const sortTouched = (order = "touched", tableSelector) => {
  const $tbody = $(tableSelector);
  const rows = $tbody.find("tr");
  let sortedRows;

  if (order === "touched") {
    sortedRows = rows.sort((a, b) => +$(b).data("touched") - +$(a).data("touched"));
  } else if (order === "id") {
    sortedRows = rows.sort((a, b) =>
      $(a).data("id").localeCompare($(b).data("id"), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  } else if (order === "name") {
    sortedRows = rows.sort((a, b) => $(a).data("lnab").localeCompare($(b).data("lnab")));
  }
  $tbody.append(sortedRows);
  // Optionally, you could call secondarySort here.
};

// ====================================================================
// UI RENDERING FUNCTIONS
// ====================================================================

// Renders a watchlist row and appends it to the correct table (<tbody>).
// If person.Type === "Space", the row goes to the Spaces table; otherwise to Profiles.
const renderWatchlistRow = (person) => {
  $("#ewlEmpty").hide();
  let pt = isOK(person.Touched) ? person.Touched : person.Touched !== "" ? person.Touched : false;
  let ptOut = "";
  if (pt) {
    const ptY = pt.substr(0, 4);
    const ptm = pt.substr(4, 2);
    const ptd = pt.substr(6, 2);
    const ptH = pt.substr(8, 2);
    const pti = pt.substr(10, 2);
    const pts = pt.substr(12, 2);
    const tDate = new Date(`${ptY}-${ptm}-${ptd} ${ptH}:${pti}:${pts}`);
    ptOut = " " + tDate.format("Y-m-d");
  }

  const userID = getUserNumId();
  const dClass = person.Manager !== userID ? 'class="notManager"' : 'class="isManager"';

  let bYear = person?.BirthDate?.substr(0, 4) || "";
  if (bYear === "0000") bYear = " ";
  let dYear = person?.DeathDate?.substr(0, 4) || "";
  if (dYear === "0000") dYear = " ";

  const myDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  window.dLastWeek = myDate.format("YmdHis");

  let bdDates = "";
  let changesLink = "";

  if (person.Type === "Space") {
    // For space pages, use Title properties.
    person.Name = person.Title.PrefixedURL;
    person.LastNameAtBirth = person.Title.PrefixedURL;
    person.FirstName = person.Title.Text;
    person.Id = person.PageId;
    person.LongName = person.Title.Text;
    changesLink = `https://${mainDomain}/index.php?title=Special:NetworkFeed&space=${htmlEntities(person.PageId)}`;
  } else {
    // For person profiles.
    if (!person.Name) person.Name = "";
    person.Name = person.Name.replace(" ", "_");
    bdDates = `(${bYear} - ${dYear})`;
    changesLink = `https://${mainDomain}/index.php?title=Special:NetworkFeed&who=${htmlEntities(person.Id)}`;
  }
  if (!isOK(bYear)) {
    bYear = person?.BirthDateDecade;
    if (bYear === "unknown") bYear = "";
    if (person.IsLiving === 1) dYear = "living";
    bdDates = `(${bYear} - ${dYear})`;
  }
  if (!isOK(dYear)) dYear = person?.DeathDateDecade;
  if (!isOK(person.FirstName)) person.FirstName = person?.RealName;
  if (!isOK(person.LongName)) person.LongName = isOK(person.ShortName) ? person.ShortName : "Private";
  if (bYear === undefined && dYear === undefined) bdDates = "";

  // Determine link target based on type.
  const linkTarget = person.Type === "Space" ? htmlEntities(person.Name) : htmlEntities(person.Id);

  const rowHTML = `
    <tr ${dClass} data-lnab='${htmlEntities(person.LastNameAtBirth)}'
        data-birthdate='${bYear}' data-firstname='${person.FirstName}'
        data-id="${htmlEntities(person.Name)}" data-idnum="${person.Id}"
        data-touched="${pt}">
      <td class='wtIDcol'>${person.Name}</td>
      <td class='personCol'>
        <a href="https://${mainDomain}/wiki/${linkTarget}">
          ${person.LongName} ${bdDates}
        </a>
      </td>
      <td class='touchedCol' title='Most recent change'><span>${ptOut}</span></td>
      <td class='changesCol'>
        <a href='${changesLink}' title='See recent changes'>Changes</a>
      </td>
      <td class='xCol' title='Remove from your Extra Watchlist'>
        <span class='removeFromExtraWatchlist' data-id='${htmlEntities(person.Name)}'>&times;</span>
      </td>
    </tr>
  `;
  const $row = $(rowHTML);

  // Append to appropriate table body.
  if (person.Type === "Space") {
    const $tbody = $("#touchedListSpaces tbody");
    if ($tbody.find(`tr[data-id="${htmlEntities(person.Name)}"]`).length < 1) {
      $tbody.append($row);
    } else {
      $tbody.find(`tr[data-id="${htmlEntities(person.Name)}"]`).show();
    }
  } else {
    const $tbody = $("#touchedListPersons tbody");
    if ($tbody.find(`tr[data-id="${htmlEntities(person.Name)}"]`).length < 1) {
      $tbody.append($row);
    } else {
      $tbody.find(`tr[data-id="${htmlEntities(person.Name)}"]`).show();
    }
  }

  // Attach remove handler.
  $row.find("span.removeFromExtraWatchlist").on("click", function () {
    $row.hide();
    const updatedList = localStorage
      .getItem("extraWatchlist")
      .split(",")
      .filter((id) => id !== $(this).attr("data-id"))
      .join(",");
    localStorage.setItem("extraWatchlist", updatedList);
    setPlusButton();
  });
};

// ====================================================================
// API CALL FUNCTIONS
// ====================================================================

const get_Profile = async (id) => {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getProfile",
        key: id,
        fields: "*",
        appId: "WBE_extra_watchlist",
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
};

const getPeople = async (
  keys,
  siblings,
  ancestorGenerations,
  descendantGenerations,
  nuclear,
  minGeneration,
  bioFormat,
  fields
) => {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getPeople",
        keys,
        siblings,
        ancestors: ancestorGenerations,
        descendants: descendantGenerations,
        nuclear,
        minGeneration,
        bioFormat,
        fields,
        resolveRedirect: 1,
        appId: "WBE_extra_watchlist",
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
};

// ====================================================================
// WATCHLIST MANAGEMENT
// ====================================================================

const sortExtraWatchlist = async () => {
  const options = await getFeatureOptions("extraWatchlist");
  // Call sortTouched on each table's tbody.
  if (options.sortBy === "Changed") {
    sortTouched("touched", "#touchedListPersons tbody");
    sortTouched("touched", "#touchedListSpaces tbody");
  } else if (options.sortBy === "ID") {
    sortTouched("id", "#touchedListPersons tbody");
    sortTouched("id", "#touchedListSpaces tbody");
  } else if (options.sortBy === "Name") {
    sortTouched("name", "#touchedListPersons tbody");
    sortTouched("name", "#touchedListSpaces tbody");
  }
};

const addToExtraWatchlist = (person) => {
  if (person.page_name && person.page_name.match(/^Space:/)) {
    person = person.profile;
    person.Type = "Space";
    person.Id = person.PageId;
  } else {
    person.Type = "Person";
  }
  window.extraWatchlistTouched.push(person.Id);
  renderWatchlistRow(person);
  setPlusButton();
};

window.extraWatchlistTouched = [];
window.addedToExtraWatchlist = [];
const doExtraWatchlist = () => {
  const userWtId = getUserWtId();
  if (userWtId) {
    window.userName = userWtId;
    window.userID = getUserNumId();
    const extraList = localStorage.getItem("extraWatchlist");
    if (extraList) {
      let bits = extraList
        .split(/[@,]/)
        .map((id) => id.trim())
        .filter((id) => id !== "");

      const spacePages = bits.filter((x) => x.match("Space:"));
      const personPages = bits.filter((x) => !x.match("Space:"));
      if (personPages.length > 0) {
        while (personPages.length) {
          const splicedArray = personPages.splice(0, 1000);
          const keys = splicedArray.join(",");
          window.addedToExtraWatchlist = window.addedToExtraWatchlist.concat(splicedArray);
          getPeople(keys, 0, 0, 0, 0, 0, 0, "*").then((data) => {
            const people = data[0].people;
            Object.keys(people).forEach((aKey) => {
              addToExtraWatchlist(people[aKey]);
            });
            sortExtraWatchlist();
          });
        }
      }
      spacePages.forEach((aKey) => {
        if (aKey.match("Space:")) {
          get_Profile(decodeURIComponent(aKey)).then((person) => {
            addToExtraWatchlist(person[0]);
          });
        }
      });
    }
  }
  if (Cookies.get("wikidb_wtb__session")) {
    $("#mloginForm").hide();
  }
};

// ====================================================================
// POPUP & INTERACTION
// ====================================================================

const extraWatchlist = async () => {
  const thisID = getThisID();
  const extraList = localStorage.getItem("extraWatchlist");
  const ids = extraList ? extraList.split(",") : [];
  const onExtraWatchlist = ids.includes(thisID);
  const $plusButton = $("#addToExtraWatchlistButton");
  if (onExtraWatchlist) {
    $plusButton.attr("title", "Remove from your Extra Watchlist").addClass("onList");
  }

  $("#extraWatchlistButton").on("click", (e) => {
    e.preventDefault();
    if ($("#extraWatchlistWindow").length === 0) {
      createWatchlistPopup(e.pageY);
    } else {
      $("#extraWatchlistWindow").slideToggle();
    }
    if (!extraList || extraList === "") {
      $("#ewlEmpty").show();
    }
  });

  if (!localStorage.getItem("extraWatchlist")) {
    localStorage.setItem("extraWatchlist", "");
  }

  if (ids.includes(thisID)) {
    $plusButton.addClass("onList").attr("title", "On your Extra Watchlist (click to remove)");
  }

  // Toggle the current profile in the watchlist.
  // Toggle the current profile in the watchlist.
  $plusButton.on("click", (e) => {
    e.preventDefault();
    const currentID = getThisID();
    let list = localStorage.getItem("extraWatchlist") ? localStorage.getItem("extraWatchlist").split(",") : [];
    if (list.includes(currentID)) {
      // If the profile is already on the watchlist, remove it.
      list = list.filter((id) => id !== currentID);
    } else {
      // Otherwise, add it.
      list.push(currentID);
    }
    localStorage.setItem("extraWatchlist", list.join(","));
    setPlusButton();
    if ($("#extraWatchlistWindow").is(":visible")) {
      if (!list.includes(currentID)) {
        // Removed: Remove the table rows completely.
        $("#touchedListSpaces tbody tr[data-id='" + currentID + "']").remove();
        $("#touchedListPersons tbody tr[data-id='" + currentID + "']").remove();
      } else {
        // Added: Fetch and add the profile.
        get_Profile(currentID).then((response) => {
          addToExtraWatchlist(response[0].profile);
        });
      }
    }
  });
};

// Creates the popup with two tabs: Profiles (default) and Spaces.
const createWatchlistPopup = (mouseY) => {
  const $popup = $("<div id='extraWatchlistWindow' class='ui-widget-content'></div>");
  $popup.insertAfter($(".tabs--wrapper")).css({
    position: "absolute",
    top: mouseY,
  });
  if ($("body.profile").length === 0) {
    $popup.insertAfter($("#header,.qa-header"));
  }
  // Sticky header for controls.
  const $header = $("<div id='extraWatchlistHeader'></div>").css({
    position: "sticky",
    top: "0",
    background: "#fff",
    zIndex: 1000,
    padding: "10px",
    borderBottom: "1px solid #ccc",
  });
  $header.append("<button id='closeWatchlistWindow' class='small'>&times;</button>");
  $header.append(
    `<div id="importExportButtons">
       <a id='importExtraWatchlist' class='importExport btn-pill-sm small button'>import</a>
       <a id='exportExtraWatchlist' class='importExport btn-pill-sm small button'>export</a>
     </div>`
  );
  $popup.prepend($header);

  // Create jQuery UI tabs. Note: Profiles tab comes first.
  const $tabs = $(`
    <div id="extraWatchlistTabs">
      <ul>
        <li><a href="#tabs-persons">Profiles</a></li>
        <li><a href="#tabs-spaces">Spaces</a></li>
      </ul>
      <div id="tabs-persons">
        <table id="touchedListPersons" class="all">
          <thead>
            <tr>
              <th class="wtIDcol" data-sort="id">ID</th>
              <th data-sort="name">Name</th>
              <th data-sort="touched">Changed</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="tabs-spaces">
        <table id="touchedListSpaces" class="all">
          <thead>
            <tr>
              <th class="wtIDcol" data-sort="id">ID</th>
              <th data-sort="name">Name</th>
              <th data-sort="touched">Changed</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `);
  $popup.append($tabs);
  // Initialize the tabs widget.
  $tabs.tabs({ active: 0 }); // Set Profiles as the default (first tab)

  // Bind click events on header cells for sorting.
  $("#touchedListPersons thead th[data-sort]").on("click", function () {
    const order = $(this).data("sort");
    sortTouched(order, "#touchedListPersons tbody");
  });
  $("#touchedListSpaces thead th[data-sort]").on("click", function () {
    const order = $(this).data("sort");
    sortTouched(order, "#touchedListSpaces tbody");
  });

  $popup.append('<p id="ewlEmpty">Empty?</p>');

  $("#closeWatchlistWindow").on("click", () => $popup.slideUp("swing"));

  // Setup export functionality.
  $("#exportExtraWatchlist")
    .off()
    .on("click", function (e) {
      e.preventDefault();

      const ewText = localStorage.getItem("extraWatchlist")?.replace(/@/g, ",") || "";
      const dStr = strDate();
      const blob = new Blob([ewText], { type: "text/plain" });

      // For Safari: use FileReader to create a data URI
      if (
        typeof window.navigator !== "undefined" &&
        window.navigator.userAgent.includes("Safari") &&
        !window.navigator.userAgent.includes("Chrome")
      ) {
        const reader = new FileReader();
        reader.onloadend = function () {
          const tempLink = document.createElement("a");
          tempLink.href = reader.result;
          tempLink.download = `extraWatchlist_${dStr}.txt`;
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        };
        reader.readAsDataURL(blob);
      } else {
        // Other browsers: use Blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = `extraWatchlist_${dStr}.txt`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        window.URL.revokeObjectURL(blobUrl); // cleanup
      }
    });

  // Setup import functionality.
  $("#importExtraWatchlist")
    .off()
    .on("click", (e) => {
      e.preventDefault();
      const fileChooser = document.createElement("input");
      fileChooser.type = "file";
      fileChooser.addEventListener("change", () => {
        const file = fileChooser.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          let textData = ev.target.result.replace(/@/g, ",");
          textData = textData.replace(/,+\s*$/, "");
          localStorage.setItem("extraWatchlist", textData);
          $popup.remove();
          $("#viewExtraWatchlist").trigger("click");
        };
        reader.onerror = (err) => console.error("Error reading file:", err);
        reader.readAsText(file);
      });
      fileChooser.click();
    });

  setTimeout(() => {
    $popup.slideDown();
  }, 1000);

  $popup.draggable({
    containment: "document",
    cursor: "move",
  });

  $popup.on("dblclick", () => $popup.slideUp("swing"));

  doExtraWatchlist();
};

// ====================================================================
// BUTTON STATE UPDATE
// ====================================================================
const setPlusButton = () => {
  const id = getThisID();
  if (!id) return;
  const thisID = id.toString();
  const extraList = localStorage.getItem("extraWatchlist");
  if (extraList) {
    const ids = extraList.split(",");
    if (ids.includes(thisID)) {
      $("#addToExtraWatchlistButton").addClass("onList").attr("title", "On your Extra Watchlist (click to remove)");
    } else {
      $("#addToExtraWatchlistButton").removeClass("onList").attr("title", "Add to your Extra Watchlist");
    }
  } else {
    $("#addToExtraWatchlistButton").removeClass("onList").attr("title", "Add to your Extra Watchlist");
  }
};

// ====================================================================
// SECONDARY SORT (if needed)
// ====================================================================
export function secondarySort(rows, dataThing1, dataThing2, isText = 0) {
  let lastOne = "Me";
  let tempArr = [lastOne];
  rows.each(function (index) {
    if ($(this).data(dataThing1) == lastOne) {
      tempArr.push($(this));
    } else {
      tempArr.sort((a, b) =>
        isText == 1
          ? $(a)
              .data(dataThing2)
              .localeCompare($(b).data(dataThing2), undefined, { numeric: true, sensitivity: "base" })
          : $(a).data(dataThing2) - $(b).data(dataThing2)
      );
      tempArr.forEach((item) => {
        if (lastOne != "Me") item.insertBefore(rows.eq(index));
      });
      tempArr = [$(this)];
    }
    lastOne = $(this).data(dataThing1);
  });
}
// Make every link in the popup open in a new tab

$(document).on("click", "#extraWatchlistWindow a[href*='wiki']", function (e) {
  e.preventDefault();
  const href = $(this).attr("href");
  window.open(href, "_blank");
});
