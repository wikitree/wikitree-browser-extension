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

const ONE_HOUR = 60 * 60 * 1000; // ms
// const browserAPI = typeof browser !== "undefined" ? browser : chrome;
let ewData = [];
let peopleTable;
let spaceTable;

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
  if (extraWatchlist && extraWatchlist.includes("@") && !extraWatchlist.includes(",")) {
    localStorage.setItem("extraWatchlistBackUp", extraWatchlist);
    localStorage.setItem("extraWatchlist", extraWatchlist.replace(/@/g, ","));
  }
  const version = localStorage.getItem("extraWatchlistVersion");
  if (!version) {
    localStorage.setItem("extraWatchlistVersion", Date.now());
  }
};

// ====================================================================
// DATA STORAGE AND RETRIEVAL
// ====================================================================

// Returns [id-list, version, ewData]
function getFullWatchlist() {
  const ids = getWatchlistIds();
  const version = localStorage.getItem("extraWatchlistVersion");
  const ewd = localStorage.getItem("extraWatchlistData");
  ewData = ewd ? JSON.parse(ewd) : [];
  return [ids, version];
}

function getWatchlistIds() {
  const ids = localStorage.getItem("extraWatchlist");
  return ids
    ? ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "")
    : [];
}

function saveWatchList(ids) {
  let idArray = ids;
  if (typeof ids === "string") {
    idArray = ids
      .split(",")
      .map((id) => encodeURIComponent(decodeURIComponent(id.trim())))
      .filter((id) => id !== "");
  }
  const idString = idArray.sort().join(",");

  const dataIds = ewData.map((d) => d.wtId).sort();
  const dataIdsString = dataIds.join(",");
  // console.log(`saveWatchList nrIds=${idArray.length}, nrDataIds=${dataIds.length}`);

  if (idString != dataIdsString) {
    console.log(
      `ewData out of sync: ids=${idArray.length} vs ewData=${ewData.length}, sizes: ${idString.length} va ${dataIdsString.length}, resetting`
    );
    // const [a, b] = arrayDifferences(idArray, dataIds);
    // console.log("In ids and not in ewData", a);
    // console.log("In ewData and not in ids", b);
    ewData = [];
  }
  const jsonData = JSON.stringify(ewData);
  // console.log(`ewData store size=${jsonData.length}`);
  const version = Date.now();
  localStorage.setItem("extraWatchlist", idString);
  localStorage.setItem("extraWatchlistData", jsonData);
  localStorage.setItem("extraWatchlistVersion", version);
  // browserAPI.storage.local.set({ extraWatchlistVersion: version });
}

function watchlistInSync(ids) {
  let inSync = false;
  const dataIds = ewData.map((d) => d.wtId).sort();
  if (ids.length == dataIds.length) {
    const idsString = ids.sort().join(",");
    const dataIdsString = dataIds.join(",");
    if (idsString == dataIdsString) {
      inSync = true;
    }
  }
  // if (!inSync) {
  //   const [a, b] = arrayDifferences(ids, dataIds);
  //   console.log(`saveWatchList nrIds=${ids.length}, nrDataIds=${dataIds.length}`);
  //   console.log("In ids but not in ewData", a);
  //   console.log("In ewData but not in ids", b);
  // }
  return inSync;
}

function arrayDifferences(a, b) {
  // Elements in 'a' not in 'b'
  const aNotInB = a.filter((element) => !b.includes(element));

  // Elements in 'b' not in 'a'
  const bNotInA = b.filter((element) => !a.includes(element));

  return [aNotInB, bNotInA];
}

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

// Returns the current ID from the URL (if a space) or from the profile.
const getThisID = () =>
  encodeURIComponent(
    decodeURIComponent(window.location.href.split(/[?#]/)[0].match(/Space(:|%3A).*$/)?.[0] || profilePerson?.Name)
  );

// Returns a formatted date string "YYYY-MM-DD_HHMM".
const strDate = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

// ====================================================================
// API CALL FUNCTIONS
// ====================================================================

const FIELDS =
  "BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,Derived.LongName,Derived.LongNamePrivate,Derived.ShortName," +
  "FirstName,Id,IsLiving,IsSpace,LastNameAtBirth,Name,PageId,RealName,Title,Touched";

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
        fields: FIELDS,
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

function extractPerson(data) {
  let bYear = data?.BirthDate?.substr(0, 4) || "";
  if (!isOK(bYear)) {
    bYear = data?.BirthDateDecade;
    if (bYear === "unknown") bYear = "";
  }

  let dYear = data?.DeathDate?.substr(0, 4) || "";
  if (!isOK(dYear)) dYear = person?.DeathDateDecade || "";
  if ((dYear === "unknown" || dYear == "") && data.IsLiving === 1) dYear = "living";

  return {
    type: "p",
    bYear: bYear,
    dYear: dYear,
    lName: isOK(data.LongNamePrivate) ? data.LongNamePrivate : isOK(data.ShortName) ? data.ShortName : "Private",
    wtId: data.Name ? encodeURIComponent(decodeURIComponent(data.Name.replaceAll(" ", "_"))) : "",
    numId: data.Id,
    touched: data.Touched,
  };
}

function extractFSP(data) {
  return {
    type: "s",
    lName: data.Title.Text,
    wtId: encodeURIComponent(decodeURIComponent(data.Title.PrefixedURL)),
    numId: data.PageId,
    touched: data.Touched,
  };
}

// ====================================================================
// WATCHLIST MANAGEMENT
// ====================================================================

const doExtraWatchlist = () => {
  const userWtId = getUserWtId();
  if (userWtId) {
    window.userName = userWtId;
    window.userID = getUserNumId();
    const [ids, version] = getFullWatchlist();
    setEmptyMessages();
    if (ids.length > 0) {
      if (ewData.length && Date.now() - version < ONE_HOUR && watchlistInSync(ids)) {
        redrawPeopleTable();
        redrawSpaceTable();
      } else {
        const spacePages = ids.filter((x) => x.match("^Space%3A"));
        const personPages = ids.filter((x) => !x.match("^Space%3A")).map((id) => decodeURIComponent(id));
        ewData = [];
        const errors = [];

        // Function to handle person pages in chunks of 1000
        const handlePersonPages = () => {
          const personPromises = [];
          while (personPages.length) {
            const splicedArray = personPages.splice(0, 1000);
            const keys = splicedArray.join(",");
            personPromises.push(
              getPeople(keys, 0, 0, 0, 0, 0, 0, FIELDS).then((data) => {
                const status = data[0]?.status;
                if (status !== "") errors.push(status);
                const people = data[0].people;
                const extractedData = Object.keys(people).map((aKey) => extractPerson(people[aKey]));
                ewData.push(...extractedData);
                redrawPeopleTable();
              })
            );
          }
          return Promise.all(personPromises);
        };

        // Function to handle space pages
        const handleSpacePages = () => {
          const spacePromises = spacePages.map((aKey) => {
            return get_Profile(decodeURIComponent(aKey)).then((fsp) => {
              const status = fsp[0]?.status;
              if (status != 0) errors.push(status);
              const fspData = extractFSP(fsp[0].profile);
              ewData.push(fspData);
            });
          });
          return Promise.all(spacePromises);
        };

        // Execute both sets of promises and then call updateWatchList
        Promise.all([handlePersonPages(), handleSpacePages()])
          .then(() => {
            redrawSpaceTable();
            let newIds = ids;
            if (errors.length > 0) {
              console.error("Errors while fetching extra watchlist profiles", errors);
            } else {
              newIds = ewData.map((d) => d.wtId);
            }
            saveWatchList(newIds);
          })
          .catch((err) => {
            console.error("Error retrieving extra watchlist items:", err);
          });
      }
    }
  }
  if (Cookies.get("wikidb_wtb__session")) {
    $("#mloginForm").hide();
  }
};

function setEmptyMessages() {
  peopleTable.settings()[0].oLanguage.sEmptyTable = "You have no people profiles in your Extra Watchlist.";
  spaceTable.settings()[0].oLanguage.sEmptyTable = "You have no space pages in your Extra Watchlist.";
}

function formDate(input) {
  const pt = isOK(input) ? input : input !== "" ? input : false;
  let ptOut = "";
  if (pt) {
    const ptY = pt.substr(0, 4);
    const ptm = pt.substr(4, 2);
    const ptd = pt.substr(6, 2);
    const ptH = pt.substr(8, 2);
    const pti = pt.substr(10, 2);
    const pts = pt.substr(12, 2);
    const tDate = new Date(`${ptY}-${ptm}-${ptd} ${ptH}:${pti}:${pts}`);
    ptOut = "" + tDate.format("Y-m-d");
  }
  return ptOut;
}

// ====================================================================
// POPUP & INTERACTION
// ====================================================================

const extraWatchlist = async () => {
  setPlusButton();
  const $plusButton = $("#addToExtraWatchlistButton");

  $("#extraWatchlistButton").on("click", (e) => {
    e.preventDefault();
    const $popup = $("#extraWatchlistWindow");
    if ($popup.length === 0) {
      createWatchlistPopup(e.pageY);
    } else {
      closeWatchlistPopup($popup);
    }
  });

  // Toggle the current profile in the watchlist.
  $plusButton.on("click", (e) => {
    e.preventDefault();
    const currentID = getThisID();
    let list = getWatchlistIds();
    if (list.includes(currentID)) {
      // The profile is already on the watchlist, remove it.
      list = list.filter((id) => id !== currentID);
      ewData = ewData.filter((d) => d.wtId != currentID);
      if ($("#extraWatchlistWindow").is(":visible")) {
        let row = peopleTable.row($(`#touchedListPersons tbody tr[data-id="${htmlEntities(currentID)}"]`));
        if (row.length == 0) {
          row = spaceTable.row($(`#touchedListSpaces tbody tr[data-id="${htmlEntities(currentID)}"]`));
        }
        row.remove().draw();
      }
      saveWatchList(list);
      setPlusButton();
    } else {
      // The profile is not on the watchlist, add it.
      list.push(currentID);
      if ($("#extraWatchlistWindow").is(":visible")) {
        // Added: Fetch and add the profile.
        get_Profile(decodeURIComponent(currentID)).then((response) => {
          if (response[0].profile?.IsSpace) {
            const record = extractFSP(response[0].profile);
            ewData.push(record);
            spaceTable.row.add(record).draw(false);
          } else {
            const record = extractPerson(response[0].profile);
            ewData.push(record);
            peopleTable.row.add(record).draw(false);
          }
          saveWatchList(list);
          setPlusButton();
        });
      } else {
        saveWatchList(list);
        setPlusButton();
      }
    }
  });
};

// Creates the popup with two tabs: Profiles (default) and Spaces.
const createWatchlistPopup = async (mouseY) => {
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

  const $tabs = $(`
    <div id="extraWatchlistTabs">
      <ul>
        <li><a href="#tabs-persons">Profiles</a></li>
        <li><a href="#tabs-spaces">Spaces</a></li>
      </ul>
      <div id="tabs-persons">
        <table id="touchedListPersons" class="all">
          <thead></thead>
          <tbody></tbody>
          <tfoot>
          </tfoot>
        </table>
      </div>
      <div id="tabs-spaces">
        <table id="touchedListSpaces" class="all">
          <thead></thead>
          <tbody></tbody>
          <tfoot>
          </tfoot>
        </table>
      </div>
    </div>
  `);

  $popup.append($tabs);

  // Initialize the tabs widget (by default the first tab is the active one).
  $tabs.tabs({
    activate: (event, ui) => {
      const dTable = ui.newPanel.find("#touchedListSpaces").length ? spaceTable : peopleTable;
      dTable.columns.adjust().draw();
    },
  });

  const options = await getFeatureOptions("extraWatchlist");
  let personSortOrder = [];
  let spaceSortOrder = [];
  switch (options.sortBy) {
    case "ID":
      personSortOrder = [0, "asc"];
      spaceSortOrder = [0, "asc"];
      break;

    case "Name":
      personSortOrder = [1, "asc"];
      spaceSortOrder = [0, "asc"];
      break;

    case "Changed":
      personSortOrder = [4, "desc"];
      spaceSortOrder = [1, "desc"];
      break;

    default:
      break;
  }

  peopleTable = $("#touchedListPersons").DataTable({
    data: ewData.filter((d) => d.type == "p"),
    columns: [
      { title: "ID", data: "wtId", render: (data, type, row) => decodeURIComponent(data), width: "20%" },
      {
        title: "Name",
        data: "lName",
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/wiki/${htmlEntities(row.numId)}">${data}</a>`;
          }
          return data;
        },
        width: "50%",
      },
      { title: "Birth", data: "bYear", width: "5%" },
      { title: "Death", data: "dYear", width: "5%" },
      {
        title: "Changed",
        data: "touched",
        render: (data, type, row) => {
          if (type === "display" || type === "filter") {
            return formDate(data);
          }
          return data;
        },
        width: "9%",
      },
      {
        title: "",
        data: "numId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/index.php?title=Special:NetworkFeed&who=${data}" title='See recent changes'>Changes</a>`;
          }
          return data;
        },
        width: "8%",
      },
      {
        title: "",
        data: "wtId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<span class='removeFromExtraWatchlist' data-id="${htmlEntities(data)}">&times;</span>`;
          }
          return data;
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).attr("title", "Remove from your Extra Watchlist");
        },
        width: "3%",
        className: "dt-center",
      },
    ],
    createdRow: function (row, data, dataIndex) {
      const $row = $(row);
      $row.attr("data-id", htmlEntities(data.wtId));
      $row
        .find("span.removeFromExtraWatchlist")
        .off("click")
        .on("click", function () {
          const rowId = htmlEntities(data.wtId);

          // Remove from ewData
          ewData = ewData.filter((d) => htmlEntities(d.wtId) !== rowId);
          const ids = ewData.map((d) => d.wtId);

          // Remove the row from the DataTable
          peopleTable
            .row($row) // Reference the row
            .remove() // Remove it
            .draw(); // Redraw the table

          saveWatchList(ids);
          setPlusButton();
        });
    },
    language: {
      emptyTable: "No records found. Please wait while we fetch the data...",
    },
    order: personSortOrder,
    scrollY: 500,
    scrollCollapse: true, // Allow the table to reduce in height if the data is smaller
    deferRender: true,
    scroller: true,
    paging: false,
    searching: true, // Enable the search box
    searchDelay: 400, // Debounce user input - only start search/filter after 400ms of no typing
    autoWidth: false,
  });

  spaceTable = $("#touchedListSpaces").DataTable({
    data: ewData.filter((d) => d.type == "s"),
    columns: [
      {
        title: "Name",
        data: "lName",
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/wiki/${htmlEntities(row.wtId)}">${data}</a>`;
          }
          return data;
        },
        width: "80%",
      },
      {
        title: "Changed",
        data: "touched",
        render: (data, type, row) => {
          if (type === "display" || type === "filter") {
            return formDate(data);
          }
          return data;
        },
        width: "9%",
      },
      {
        title: "",
        data: "numId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/index.php?title=Special:NetworkFeed&space=${data}" title='See recent changes'>Changes</a>`;
          }
          return data;
        },
        width: "8%",
      },
      {
        title: "",
        data: "wtId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<span class='removeFromExtraWatchlist' data-id="${htmlEntities(data)}">&times;</span>`;
          }
          return data;
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).attr("title", "Remove from your Extra Watchlist");
        },
        width: "3%",
        className: "dt-center",
      },
    ],
    createdRow: function (row, data, dataIndex) {
      const $row = $(row);
      $row.attr("data-id", htmlEntities(data.wtId));
      $row
        .find("span.removeFromExtraWatchlist")
        .off("click")
        .on("click", function () {
          const rowId = htmlEntities(data.wtId);

          // Remove from ewData
          ewData = ewData.filter((d) => htmlEntities(d.wtId) !== rowId);
          const ids = ewData.map((d) => d.wtId);

          // Remove the row from the DataTable
          spaceTable
            .row($row) // Reference the row
            .remove() // Remove it
            .draw(); // Redraw the table

          saveWatchList(ids);
          setPlusButton();
        });
    },
    order: spaceSortOrder,
    scrollY: 500,
    scrollCollapse: true, // Allow the table to reduce in height if the data is smaller
    deferRender: true,
    scroller: true,
    paging: false,
    searching: true, // Enable the search box
    searchDelay: 400, // Debounce user input - only start search/filter after 400ms of no typing
    autoWidth: false,
  });

  // $popup.append('<p id="ewlEmpty">Empty?</p>');

  $("#closeWatchlistWindow").on("click", () => closeWatchlistPopup($popup));

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
          saveWatchList(textData);
          $popup.remove();
          $("#extraWatchlistButton").trigger("click");
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

  $popup.on("dblclick", () => closeWatchlistPopup($popup));

  doExtraWatchlist();
};

function redrawPeopleTable() {
  peopleTable.clear(); // Clear existing data
  peopleTable.rows.add(ewData.filter((d) => d.type == "p")); // Add new/updated data
  peopleTable.draw();
  setTimeout(() => {
    peopleTable.columns.adjust().draw();
  }, 1000);
}

function redrawSpaceTable() {
  spaceTable.clear(); // Clear existing data
  spaceTable.rows.add(ewData.filter((d) => d.type == "s")); // Add new/updated data
  spaceTable.draw();
  setTimeout(() => {
    spaceTable.columns.adjust().draw();
  }, 1000);
}

function closeWatchlistPopup($popup) {
  $popup.slideUp("swing");
  $popup.remove();
}

// ====================================================================
// BUTTON STATE UPDATE
// ====================================================================
const setPlusButton = () => {
  const id = getThisID();
  if (!id) return;
  const thisID = id.toString();
  const ids = getWatchlistIds();
  if (ids.includes(thisID)) {
    const title = "On your Extra Watchlist (click to remove)";
    $("#addToExtraWatchlistButton")
      .addClass("onList") //.attr("title", "On your Extra Watchlist (click to remove)");
      .attr("data-bs-title", title)
      .attr(`data-tooltip`, title);
  } else {
    const title = "Add to your Extra Watchlist";
    $("#addToExtraWatchlistButton")
      .removeClass("onList") //.attr("title", "Add to your Extra Watchlist");
      .attr("data-bs-title", title)
      .attr(`data-tooltip`, title);
  }
};

// Make every link in the popup open in a new tab

$(document).on("click", "#extraWatchlistWindow a[href*='wiki']", function (e) {
  e.preventDefault();
  const href = $(this).attr("href");
  window.open(href, "_blank");
});
