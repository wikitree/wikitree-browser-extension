/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("pendingMergesFilters").then((result) => {
  if (result) {
    init();
    import("./pending_merges_filters.css");
  }
});

const activeFilters = new Set();

async function init() {
  const savedFilters = JSON.parse(localStorage.getItem("pendingMergesFilters")) || [];
  savedFilters.forEach((filter) => activeFilters.add(filter));

  const filters = ["Pre-1500", "Pre-1700", "Not Open"];
  const filterButtons = filters.map((filter) => {
    const isActive = activeFilters.has(filter.replace(/ /g, "_")) ? "filtered" : "";
    return `<button class="small ${isActive}" id="filter-${filter.replace(/ /g, "_")}">${filter}</button>`;
  });
  const filterContainer = `<div id="pendingMergesFilterButtons" class="d-flex flex-wrap"><span>Hide: </span>${filterButtons.join(
    ""
  )}</div>`;
  const theForm = $("input[type='submit'][value='go']").closest("form");
  theForm.after(filterContainer);
  const buttons = $("#pendingMergesFilterButtons").find("button");
  buttons.on("click", function (e) {
    e.preventDefault();
    $(this).toggleClass("filtered");
    const type = $(this).text().replace(/ /g, "_");
    if (activeFilters.has(type)) {
      activeFilters.delete(type);
    } else {
      activeFilters.add(type);
    }
    saveFilters();
    applyFilters();
  });

  applyFilters();
}

function saveFilters() {
  localStorage.setItem("pendingMergesFilters", JSON.stringify(Array.from(activeFilters)));
}

function applyFilters() {
  const listItems = $("#content ol li");
  listItems.show(); // Start by showing all items

  if (activeFilters.size === 0) {
    return; // No filters are active, so show all items
  }

  listItems.each(function () {
    const item = $(this);
    let hideItem = false;

    if (activeFilters.has("Pre-1500") && item.find("span.HIGHLIGHT:contains('Pre-1500')").length > 0) {
      hideItem = true;
    }

    if (activeFilters.has("Pre-1700") && item.find("span.HIGHLIGHT:contains('Pre-1700')").length > 0) {
      hideItem = true;
    }

    if (activeFilters.has("Not_Open") && item.find(`img[alt="Privacy Level 60"]`).length !== 2) {
      hideItem = true;
    }

    if (hideItem) {
      item.hide();
    }
  });
}
