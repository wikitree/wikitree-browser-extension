/*
Created By: Jamie Nelson (Nelson-3486)
Contributors: Jonathan Duke (Duke-5773)
Contains modified code from Steven's WikiTree Toolkit
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { ensureProfileClasses } from "../../core/profileClasses";

shouldInitializeFeature("printerFriendly").then((result) => {
  if (result) {
    import("./printerfriendly.css");
    initPrinterFriendly();
  }
});

async function initPrinterFriendly() {
  ensureProfileClasses();
  const options = await getFeatureOptions("printerFriendly");

  if (options.fontSize) {
    $(`<style id="printerFriendly_fontSize">
      :root {
        --x-print-font-size: ${options.fontSize}pt;
      }
    </style>`).appendTo("head");
  }

  if (!!options.onBrowserPrint) {
    // this will force the browser to always print only the biography content, whether the menu link is used or not
    $("html").addClass("print-content-only");
  }

  if (options.addMenuItem !== false) {
    $(
      "nav a.dropdown-item[href*='Special:TrustedList']:contains('Privacy & Trusted List'), nav a.dropdown-item[href*='Help:Projects']:contains('Projects')"
    ).each(function () {
      const menuItem = $(
        "<li><a href='#n' class='dropdown-item wte-tm-printer-friendly' title='Changes the format to a printer-friendly one'>Printer Friendly Bio</a></li>"
      );
      $(this).closest("li").before(menuItem);
    });

    $(`.wte-tm-printer-friendly`).on("click", (e) => {
      e.preventDefault();
      if (!options.onBrowserPrint) {
        $("html").addClass("print-content-only");
      }
      window.print();
      if (!options.onBrowserPrint) {
        $("html").removeClass("print-content-only");
      }
    });
  }

  if (!!options.excludeVitals) {
    // the original feature removed them, but this seems like something most people would want at the top of the bio
    $("html").addClass("no-print-vitals");
  }

  if (!!options.excludeDNA) {
    // the original feature did not hide any sections, but this was a special request
    $("html").addClass("no-print-dna");
  }

  if (!!options.excludeResearchNotes) {
    $("html").addClass("no-print-research-notes");
  }

  if (!!options.excludeSources) {
    $("html").addClass("no-print-sources");
  }
}
