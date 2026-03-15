import $ from "jquery";
import { formatDate, getRelationColour, getYearColour } from "../../core/formatting";
import { escapeHtml } from "../../core/lib/diff_utils";
import { setHighestZIndex } from "../../core/common";

/**
 * Normalize simple text for comparisons.
 * @param {any} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Set reasonable min/max size and position for a popup element.
 * @param {HTMLElement} popup
 * @param {number|null} preferredLeft
 * @param {number|null} preferredTop
 * @param {number} margin
 */
export function setPopupPositionAndSize(popup, preferredLeft = null, preferredTop = null, margin = 10) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const left =
    preferredLeft !== null ? clamp(preferredLeft, margin, window.innerWidth - updated.width - margin) : updated.left;
  const top =
    preferredTop !== null ? clamp(preferredTop, margin, window.innerHeight - updated.height - margin) : updated.top;
  popup.style.position = "fixed";
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function positionPopupFixed(popup, preferredLeft, preferredTop) {
  const rect = popup.getBoundingClientRect();
  const maxLeft = Math.max(10, window.innerWidth - rect.width - 10);
  const maxTop = Math.max(10, window.innerHeight - rect.height - 10);
  popup.style.position = "fixed";
  popup.style.left = `${clamp(preferredLeft, 10, maxLeft)}px`;
  popup.style.top = `${clamp(preferredTop, 10, maxTop)}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function clampPopupToViewport(popup, margin = 10) {
  if (!popup) return;
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  const minHeight = Math.min(320, maxHeight);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.minHeight = `${minHeight}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  const rect = popup.getBoundingClientRect();
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const nextLeft = clamp(updated.left, margin, Math.max(margin, window.innerWidth - updated.width - margin));
  const nextTop = clamp(updated.top, margin, Math.max(margin, window.innerHeight - updated.height - margin));
  popup.style.left = `${nextLeft}px`;
  popup.style.top = `${nextTop}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function getPopupResizeLimits(margin = 10) {
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  return {
    minWidth: Math.min(400, maxWidth),
    minHeight: Math.min(320, maxHeight),
    maxWidth,
    maxHeight,
  };
}

export function positionPopupForOpen(popup) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  positionPopupFixed(popup, Math.round((window.innerWidth - rect.width) / 2), 10);
  clampPopupToViewport(popup);
}

/**
 * Show a connections popup for a getConnections-style result.
 * This function is UI-only and does not mutate external module state.
 */
export function showConnectionsPopup(connectionsResult) {
  if (!Array.isArray(connectionsResult) || !connectionsResult.length) return;
  const conn = connectionsResult[0];
  const path = conn.path || [];

  // Remove any existing popup before showing a new one
  $("#wbe-connections-popup").remove();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable chat-connections-popup";
  popup.id = "wbe-connections-popup";
  popup.style.display = "block";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong>Connections Path</strong>
      <div class="chat-popup-controls">
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <table class="connections-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Relation</th>
            <th>Birth Date</th>
            <th>Birth Location</th>
            <th>Death Date</th>
            <th>Death Location</th>
          </tr>
        </thead>
        <tbody>
          ${path
            .map((person) => {
              const name = `${person.FirstName || ""} ${person.LastNameCurrent || ""}`.trim();
              const relation = person.pathType || "";
              const birthDate = formatDate(person.BirthDate);
              const birthLoc = person.BirthLocation || "";
              const deathDate = formatDate(person.DeathDate);
              const deathLoc = person.DeathLocation || "";
              const normalizedGender = normalizeText(person.Gender);
              let rowClass = "background--gender-no-gender";
              if (normalizedGender === "male") rowClass = "background--gender-male";
              else if (normalizedGender === "female") rowClass = "background--gender-female";
              return `
                <tr class="${rowClass}">
                  <td><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${escapeHtml(
                name
              )}</a></td>
                  <td style="background:${getRelationColour(relation)}">${escapeHtml(relation)}</td>
                  <td style="background:${getYearColour(person.BirthDate)}">${escapeHtml(birthDate)}</td>
                  <td>${escapeHtml(birthLoc)}</td>
                  <td style="background:${getYearColour(person.DeathDate)}">${escapeHtml(deathDate)}</td>
                  <td>${escapeHtml(deathLoc)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(popup);
  setPopupPositionAndSize(popup, Math.round((window.innerWidth - popup.getBoundingClientRect().width) / 2), 110);
  popup.querySelector(".close-popup")?.addEventListener("click", () => popup.remove());
  setHighestZIndex(popup);
  $(popup).draggable({
    handle: ".chat-popup-header",
    containment: "window",
    scroll: false,
    start: () => {
      popup.style.right = "auto";
      popup.style.transform = "none";
    },
  });
}

/**
 * Small shaky-tree loader UI used in chat operations.
 */
export function showChatShaky(label = "Finding connection...", position = "center") {
  let $existing = $("#wbeShakyTree");
  const treeUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL("images/tree.gif") : "images/tree.gif";
  if ($existing.length === 0) {
    const html = `
      <div id="wbeShakyTree" class="wbe-shaky-tree" style="display:none">
        <div class="wbe-shaky-image"><img src="${treeUrl}" alt="loading" /></div>
        <div class="wbe-shaky-messages">
          <div class="wbe-shaky-label">${label}</div>
        </div>
      </div>
      `;
    $(document.body).append(html);
    $existing = $("#wbeShakyTree");
  } else {
    const $msgs = $existing.find(".wbe-shaky-messages");
    // Replace existing messages with the latest label to avoid duplicates
    $msgs.html(`<div class="wbe-shaky-label">${label}</div>`);
  }
  if (position === "center") $existing.addClass("center");
  else $existing.removeClass("center");
  $existing.stop(true, true).fadeIn(180);
  try {
    setHighestZIndex($existing.get(0));
  } catch (e) {
    /* ignore */
  }
}

export function hideChatShaky() {
  const $el = $("#wbeShakyTree");
  if ($el.length) {
    $el.stop(true, true).fadeOut(150, function () {
      $(this).removeClass("center");
    });
  }
}

// Expose some utilities for console debugging
window.wbeUi = window.wbeUi || {};
window.wbeUi.showChatShaky = showChatShaky;
window.wbeUi.hideChatShaky = hideChatShaky;
window.wbeUi.showConnectionsPopup = showConnectionsPopup;
