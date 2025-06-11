/**
 * @file        collapsibleDescendants.js
 * @description Adds per-row collapse / expand buttons to WikiTree
 *              descendants trees and context-sensitive “Collapse / Expand All”
 *              controls.
 * @requires    jQuery
 * @module      collapsibleDescendants
 */

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isDNADescendants } from "../../core/pageType";

/* ------------------------------------------------------------------ */
/* Configuration / diagnostics                                        */
/* ------------------------------------------------------------------ */

const DEBUG = false;
const log = (...m) => DEBUG && console.log("[Collapsible]", ...m);

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

/**
 * Resolves when DOMContentLoaded has fired.
 * @returns {Promise<void>}
 */
const domReady = () =>
  document.readyState === "loading" ? new Promise((r) => addEventListener("DOMContentLoaded", r)) : Promise.resolve();

/**
 * Waits until the selector matches at least once inside `root`.
 * @param   {string}    sel   CSS selector
 * @param   {Element}   root  Root element to observe
 * @returns {Promise<void>}
 */
const waitFor = (sel, root) =>
  new Promise((res) => {
    if (root.querySelector(sel)) return res();
    new MutationObserver((_, mo) => {
      if (root.querySelector(sel)) {
        mo.disconnect();
        res();
      }
    }).observe(root, { childList: true, subtree: true });
  });

/**
 * Toggles an element’s inline `display` between "" and "none".
 * @param {HTMLElement} el
 */
const toggleDisplay = (el) => (el.style.display = el.style.display === "none" ? "" : "none");

/* ------------------------------------------------------------------ */
/* Bootstrap                                                          */
/* ------------------------------------------------------------------ */

(async () => {
  if (!(await shouldInitializeFeature("collapsibleDescendants"))) return;

  await domReady();
  await import("./collapsible_descendants.css");

  const container = document.querySelector("#descendantsContainer") ?? document.body;
  await waitFor("ol", container);

  addButtonsUnder(container);
  observeNewRows(container);

  if (isDNADescendants) {
    document.querySelectorAll("h2#Y, h2#X").forEach((h2) => createSectionToggle(h2, h2.parentElement));
  } else {
    const firstOl = container.querySelector("ol");
    if (firstOl) insertGlobalToggle(firstOl);
  }

  log("initialised | dna =", isDNADescendants);
})();

/* ------------------------------------------------------------------ */
/* Per-row click handler (delegated)                                  */
/* ------------------------------------------------------------------ */

$(document).on("click", "button.wikitreeturbo", (e) => {
  const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
  btn.textContent = btn.textContent === "–" ? "+" : "–";

  const li = btn.closest("li");
  if (!li) return;

  if (isDNADescendants && li.nextElementSibling?.tagName === "DIV") {
    toggleDisplay(li.nextElementSibling);
    return;
  }

  const target =
    li.querySelector(":scope > ol, :scope > div") ??
    (["OL", "DIV"].includes(li.nextElementSibling?.tagName ?? "") ? li.nextElementSibling : null);

  if (target) toggleDisplay(target);
});

/* ------------------------------------------------------------------ */
/* Row-level helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Prepends a ± button to every descendant row that qualifies.
 * @param {Element} root
 */
function addButtonsUnder(root) {
  /** @type {HTMLLIElement[]} */
  const lis = [];
  if (root.nodeType === 1 && root.tagName === "LI") lis.push(root);
  lis.push(...root.querySelectorAll("li"));

  lis.forEach((li) => {
    if (li.classList.contains("wtt-togglable")) return;

    const hasNestedOl = li.querySelector(":scope > ol");
    const hasNextDiv = li.nextElementSibling?.tagName === "DIV";
    const hasSiblingOl = li.nextElementSibling?.tagName === "OL";
    const hasDescLink = li.querySelector('a[href$="/890"]');

    if (!(hasNestedOl || hasNextDiv || hasSiblingOl || hasDescLink)) return;

    li.classList.add("wtt-togglable");

    const btn = document.createElement("button");
    btn.className = "wikitreeturbo wbe";
    btn.textContent = "–";
    li.prepend(btn);
  });
}

/**
 * Observes `root` for added LI/OL/DIV nodes and augments them on the fly.
 * @param {Element} root
 */
function observeNewRows(root) {
  new MutationObserver((muts) =>
    muts.forEach(({ addedNodes }) =>
      addedNodes.forEach((n) => {
        if (n.nodeType === 1 && /^(LI|OL|DIV)$/i.test(n.tagName)) {
          addButtonsUnder(/** @type {Element} */ (n));
        }
      })
    )
  ).observe(root, { childList: true, subtree: true });
}

/* ------------------------------------------------------------------ */
/* Section- and page-wide toggles                                     */
/* ------------------------------------------------------------------ */

/**
 * Creates a toggle button inside an H2 that controls only its section.
 * @param {HTMLHeadingElement} heading
 * @param {HTMLElement}        section
 */
function createSectionToggle(heading, section) {
  const btn = document.createElement("button");
  btn.className = "btn btn-sm btn-secondary ms-2 wbe";
  btn.textContent = "Collapse All";
  heading.append(" ", btn);

  let collapsed = false;
  btn.addEventListener("click", () => {
    toggleAll(section, !collapsed);
    collapsed = !collapsed;
    btn.textContent = collapsed ? "Expand All" : "Collapse All";
  });
}

/**
 * Inserts a page-wide toggle button above the first OL.
 * @param {HTMLElement} firstOl
 */
function insertGlobalToggle(firstOl) {
  const wrapper = document.createElement("div");
  const btn = document.createElement("button");
  btn.className = "btn btn-secondary mb-2 wbe";
  btn.textContent = "Collapse All";
  wrapper.append(btn);
  firstOl.parentElement.insertBefore(wrapper, firstOl);

  let collapsed = false;
  btn.addEventListener("click", () => {
    toggleAll(firstOl.closest("#descendantsContainer") ?? document.body, !collapsed);
    collapsed = !collapsed;
    btn.textContent = collapsed ? "Expand All" : "Collapse All";
  });
}

/* ------------------------------------------------------------------ */
/* Fast global collapse / expand                                      */
/* ------------------------------------------------------------------ */

/**
 * Collapses or expands all togglable rows inside `scope`.
 * @param {Element} scope
 * @param {boolean} collapse
 */
function toggleAll(scope, collapse) {
  scope.querySelectorAll("li.wtt-togglable").forEach((li) => setRowState(li, collapse));
}

/**
 * Ensures a single row is in the desired state.
 * @param {HTMLLIElement} li
 * @param {boolean}       collapse
 */
function setRowState(li, collapse) {
  const btn = li.querySelector(":scope > button.wikitreeturbo");
  if (!btn) return;

  const target = findDescendantBlock(li);
  if (!target) return;

  if (collapse && btn.textContent === "+") return;
  if (!collapse && btn.textContent === "–") return;

  btn.textContent = collapse ? "+" : "–";
  target.style.display = collapse ? "none" : "";
}

/**
 * Locates the element that must be shown/hidden for a row.
 * @param   {HTMLLIElement} li
 * @returns {HTMLElement|null}
 */
function findDescendantBlock(li) {
  if (isDNADescendants && li.nextElementSibling?.tagName === "DIV") {
    return li.nextElementSibling;
  }
  return (
    li.querySelector(":scope > ol, :scope > div") ??
    (["OL", "DIV"].includes(li.nextElementSibling?.tagName ?? "") ? li.nextElementSibling : null)
  );
}
