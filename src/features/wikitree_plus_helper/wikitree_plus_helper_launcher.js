/*
Created By: Ian Beacall (Beacall-6)

Adds the WT+ Query Builder's launchers (Find menu item, plus.wikitree.com button, fallback button) on page load.
The Query Builder itself (wikitree_plus_helper.js, with its suggestions list and styles) loads the first time
it's opened.
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { addDataMenuAttributes } from "../my_menu/my_menu";
import { isMainDomain, isPlusDomain } from "../../core/pageType";
import "./wikitree_plus_helper_launcher.css";

const FEATURE_ID = "wikitreePlusHelper";

let queryBuilderPromise = null;

function loadQueryBuilder() {
  if (!queryBuilderPromise) {
    queryBuilderPromise = import(
      /* webpackChunkName: "wtplus-query-builder" */
      "./wikitree_plus_helper"
    ).catch((error) => {
      queryBuilderPromise = null;
      throw error;
    });
  }
  return queryBuilderPromise;
}

function openModal() {
  loadQueryBuilder()
    .then((module) => module.openModal())
    .catch((error) => console.error("wbe: failed to load the WT+ Query Builder", error));
}

function addLauncher() {
  if (isMainDomain) {
    addDataMenuAttributes();
    const $findMenu = $('div[data-menu="Find"] ul.dropdown-menu');
    if ($findMenu.length && !$findMenu.find("#wbe-wtplus-orqb-link").length) {
      $findMenu.append(`
        <li><a href="#" id="wbe-wtplus-orqb-link" class="dropdown-item wbe-feature" title="Build WikiTree+ queries visually">WT+ Query Builder</a></li>
      `);
      $findMenu.on("click", "#wbe-wtplus-orqb-link", function (e) {
        e.preventDefault();
        openModal();
      });
      return;
    }
  }

  // On plus.wikitree.com, add button after "Show result in new tab" checkbox
  if (isPlusDomain) {
    const $newTabCheckbox = $("#NewTab").closest(".checkbox");
    if ($newTabCheckbox.length && !$("#wbe-wtplus-orqb-plus-button").length) {
      $newTabCheckbox.after(`
        <div style="padding: 0px 15px; margin-top: 10px;">
          <button id="wbe-wtplus-orqb-plus-button" type="button" class="btn btn-primary" title="Build WikiTree+ queries visually">Query Builder (WBE)</button>
        </div>
      `);
      $("#wbe-wtplus-orqb-plus-button").on("click", openModal);
      return;
    }
  }

  // Fallback button (if plus domain button wasn't added)
  if (!$("#wbe-wtplus-orqb-fab").length) {
    $("body").append(`<button id="wbe-wtplus-orqb-fab" type="button" title="WT+ Query Builder">WT+</button>`);
    $("#wbe-wtplus-orqb-fab").on("click", openModal);
  }
}

/* --------------------------
   Init
--------------------------- */

shouldInitializeFeature(FEATURE_ID).then((enabled) => {
  if (!enabled) return;
  if (!(isMainDomain || isPlusDomain)) return;

  addLauncher();

  // Auto-submit handler for suggestions search from query builder
  if (isPlusDomain) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("wbe") === "1" && urlParams.get("report") === "err6") {
      // Wait for the page to be ready, then submit the form
      setTimeout(() => {
        const $form = $("#formSuggestionsAll");
        if ($form.length) {
          const $submitBtn = $form.find("button[type='submit']");
          if ($submitBtn.length) {
            $submitBtn.click();
          }
        }
      }, 500);
    }
  }
});
