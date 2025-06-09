/**
 * @file collapsibleDescendants.js
 * @description
 * Adds “– / +” buttons to every row of the WikiTree descendants tree *and* an
 * “Expand / Collapse All” control that is placed context-sensitively:
 *
 * • **DNA “treewidget” pages** — one toggle is injected into each heading
 *   (`<h2 id="Y">`, `<h2 id="X">`) and controls only the tree that follows
 *   that heading.
 * • **Profile & Special:Descendants pages** — a single toggle is inserted
 *   immediately above the first `<ol>` and controls the whole tree.
 *
 * The per-row logic and AJAX resilience are unchanged from the previous
 * version; only the global-toggle helper is new.
 */

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isDNADescendants } from "../../core/pageType";

/* ------------------------------------------------------------------ */
/* Debug helper                                                       */
/* ------------------------------------------------------------------ */

const DEBUG = false;
const log = (...m) => DEBUG && console.log("[Collapsible]", ...m);

/* ------------------------------------------------------------------ */
/* Tiny utilities                                                     */
/* ------------------------------------------------------------------ */

const domReady = () =>
  document.readyState === "loading" ? new Promise((r) => addEventListener("DOMContentLoaded", r)) : Promise.resolve();

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

/** Flip inline `display` between "" and "none". */
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

  addButtonsUnder(container); /* row-level buttons        */
  observeNewRows(container); /* watch for future rows    */

  /* -------------------------------------------------------------- */
  /* Insert “Expand / Collapse All” buttons                         */
  /* -------------------------------------------------------------- */
  if (isDNADescendants) {
    /* Y-DNA and X-DNA live in separate <section>s headed by <h2 id> */
    document.querySelectorAll("h2#Y, h2#X").forEach((h2) => createSectionToggle(h2, h2.parentElement));
  } else {
    const firstOl = container.querySelector("ol");
    if (firstOl) insertGlobalToggle(firstOl);
  }

  log("initialised | dna =", isDNADescendants);
})();

/* ------------------------------------------------------------------ */
/* Delegated per-row click handler                                    */
/* ------------------------------------------------------------------ */
$(document).on("click", "button.wikitreeturbo", (e) => {
  const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
  btn.textContent = btn.textContent === "–" ? "+" : "–";

  const li = btn.closest("li");
  if (!li) return;

  /* DNA layout – children in next-sibling <div> */
  if (isDNADescendants && li.nextElementSibling?.tagName === "DIV") {
    toggleDisplay(li.nextElementSibling);
    return;
  }

  /* Classic layout – nested or sibling OL / DIV */
  const target =
    li.querySelector(":scope > ol, :scope > div") ??
    (["OL", "DIV"].includes(li.nextElementSibling?.tagName ?? "") ? li.nextElementSibling : null);

  if (target) toggleDisplay(target);
});

/* ------------------------------------------------------------------ */
/* Helpers – row-level buttons                                        */
/* ------------------------------------------------------------------ */

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

    const qualifies = hasNestedOl || hasNextDiv || hasSiblingOl || hasDescLink;

    if (!qualifies) return;

    li.classList.add("wtt-togglable");
    const btn = document.createElement("button");
    btn.className = "wikitreeturbo wbe";
    btn.textContent = "–";
    li.prepend(btn);
  });
}

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
/* Helpers – section / global toggles                                 */
/* ------------------------------------------------------------------ */

/**
 * Creates a toggle button inside an <h2> (DNA page) that controls only the
 * tree contained in its sibling <ol>/<div> elements.
 *
 * @param {HTMLHeadingElement} heading – <h2 id="Y"> or <h2 id="X">.
 * @param {HTMLElement} section        – parent <section>.
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
 * Inserts a toggle button immediately above the first <ol> on profile/special
 * pages.
 *
 * @param {HTMLElement} firstOl – the first ordered-list of the tree.
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

/**
 * Clicks every individual row-toggle inside `scope` so existing row logic
 * performs the show/hide work.
 *
 * @param {Element} scope         – subtree to search.
 * @param {boolean} toCollapse    – true → collapse, false → expand.
 */
function toggleAll(scope, toCollapse) {
  /** @type {HTMLButtonElement[]} */
  const buttons = Array.from(scope.querySelectorAll("button.wikitreeturbo"));
  buttons.forEach((b) => {
    if (toCollapse && b.textContent === "–") b.click();
    if (!toCollapse && b.textContent === "+") b.click();
  });
}
