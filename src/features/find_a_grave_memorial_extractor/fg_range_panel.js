/*
The panel the Find a Grave Memorial Extractor shows to ask which pages of a long list to read.
*/

import {
  MAX_LIST_PAGE,
  MAX_MEMORIALS_PER_RUN,
  MAX_PAGES_PER_RUN,
  ROWS_PER_PAGE,
  formatNumber,
  lastReadablePage,
  validatePageRange,
} from "./fg_pages";

export const RANGE_PANEL_ID = "wbe-fg-range-panel";

function makeElement(tag, props = {}) {
  return Object.assign(document.createElement(tag), props);
}

// Asks which pages to read. The panel goes in just after the button's container; suggested is { from, to }.
// Resolves with { from, to }, or null if the user cancels.
export function askForPageRange({ anchor, recordCount, totalPages, suggested }) {
  return new Promise((resolve) => {
    document.getElementById(RANGE_PANEL_ID)?.remove();

    const last = lastReadablePage(totalPages);
    const panel = makeElement("div", { id: RANGE_PANEL_ID, className: "wbe-fg-range-panel" });

    const intro = makeElement("p", {
      textContent:
        `This list has ${formatNumber(recordCount)} memorials on ${formatNumber(totalPages)} pages. ` +
        `One run can read up to ${MAX_PAGES_PER_RUN} pages (${formatNumber(MAX_MEMORIALS_PER_RUN)} memorials).` +
        (totalPages > MAX_LIST_PAGE
          ? ` Find a Grave only lists the first ${MAX_LIST_PAGE} pages (${formatNumber(
              MAX_LIST_PAGE * ROWS_PER_PAGE
            )} ` +
            `memorials) of any sort order. Use "Refine search" to narrow the list, or change "Order by" to Name (Z-A) to ` +
            `read from the other end.`
          : ""),
    });

    const makeInput = (value) =>
      makeElement("input", {
        type: "number",
        min: "1",
        max: String(last),
        value: String(value),
        className: "form-control form-control-sm wbe-fg-range-input",
      });
    const fromInput = makeInput(suggested.from);
    const toInput = makeInput(suggested.to);
    const startButton = makeElement("button", {
      type: "button",
      className: "btn btn-sm btn-primary",
      textContent: "Extract these pages",
    });
    const cancelButton = makeElement("button", {
      type: "button",
      className: "btn btn-sm btn-secondary",
      textContent: "Cancel",
    });
    const error = makeElement("div", { className: "wbe-fg-range-error" });
    error.setAttribute("role", "alert");

    const controls = makeElement("div", { className: "wbe-fg-range-controls" });
    controls.append(
      makeElement("span", { textContent: "Pages" }),
      fromInput,
      makeElement("span", { textContent: "to" }),
      toInput,
      makeElement("span", { textContent: `(up to ${formatNumber(last)})` }),
      startButton,
      cancelButton
    );
    panel.append(intro, controls, error);

    const finish = (value) => {
      panel.remove();
      resolve(value);
    };
    const submit = () => {
      const result = validatePageRange(fromInput.value, toInput.value, totalPages);
      if (result.ok) finish({ from: result.from, to: result.to });
      else error.textContent = result.error;
    };
    startButton.addEventListener("click", submit);
    cancelButton.addEventListener("click", () => finish(null));
    panel.addEventListener("keydown", (event) => {
      // Enter in a page box submits; on a button it does what that button does
      if (event.key === "Enter" && event.target.tagName === "INPUT") {
        event.preventDefault();
        submit();
      } else if (event.key === "Escape") {
        finish(null);
      }
    });

    anchor.parentNode.insertAdjacentElement("afterend", panel);
    fromInput.focus();
    fromInput.select();
  });
}
