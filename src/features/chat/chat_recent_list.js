// The Recent list (the clock button beside Send, or Ctrl+R in the box): your earlier questions,
// newest first, with a search field. Choosing one puts it in the box to edit or send.
// "Most used" lists them by how often they were asked, and ☆ pins a favourite to the top of both
// (the user, 2026-10-18).

import { escapeText } from "./chat_text_utils";
import { filterPromptHistory, pinnedFirst } from "./chat_prompt_history";

const MAX_SHOWN = 100;
const times = (count) => (count === 1 ? "once" : count === 2 ? "twice" : `${count} times`);

/**
 * Builds the panel inside `container` (inside the popup: body-level overlays get buried, see the
 * popup z-index note) and returns {open, close, toggle, isOpen}.
 */
export function mountRecentList({ container, store, onChoose, onClose }) {
  const panel = document.createElement("div");
  panel.className = "chat-recent";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Recent questions");
  panel.innerHTML = `
    <div class="chat-recent-views" role="tablist" aria-label="Order">
      <button type="button" class="chat-recent-view" role="tab" data-view="recent" aria-selected="true">Recent</button>
      <button type="button" class="chat-recent-view" role="tab" data-view="most" aria-selected="false">Most used</button>
    </div>
    <input type="text" class="chat-recent-filter" placeholder="Search your earlier questions" aria-label="Search your earlier questions" autocomplete="off" />
    <div class="chat-recent-list" role="listbox"></div>
    <div class="chat-recent-footer">
      <span class="chat-recent-hint">↑ and ↓ in the box step through these too.</span>
      <button type="button" class="chat-recent-clear">Clear history</button>
    </div>`;
  container.appendChild(panel);

  const filter = panel.querySelector(".chat-recent-filter");
  const listEl = panel.querySelector(".chat-recent-list");
  const clearButton = panel.querySelector(".chat-recent-clear");
  let shown = [];
  let selected = 0;
  let clearArmed = false;
  let view = "recent";
  const pins = () => store.pinned?.() || [];
  const isPinned = (text) => (store.isPinned ? store.isPinned(text) : false);

  function render() {
    const all = pinnedFirst(view === "most" && store.mostUsed ? store.mostUsed() : store.list(), pins());
    panel.querySelectorAll(".chat-recent-view").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.view === view)));
    shown = filterPromptHistory(all, filter.value).slice(0, MAX_SHOWN);
    if (selected >= shown.length) selected = Math.max(0, shown.length - 1);
    if (!all.length) {
      listEl.innerHTML = `<div class="chat-recent-empty">Nothing yet. Questions you send are kept here, on this computer.</div>`;
    } else if (!shown.length) {
      listEl.innerHTML = `<div class="chat-recent-empty">None of your questions match.</div>`;
    } else {
      listEl.innerHTML = shown
        .map(
          (text, index) =>
            `<div class="chat-recent-item${isPinned(text) ? " chat-recent-pinned" : ""}" role="option" data-index="${index}" aria-selected="${index === selected}">${pinButton(text, index)}<span class="chat-recent-text">${escapeText(text)}</span>${
              view === "most" && store.uses ? `<span class="chat-recent-uses" title="Asked ${times(store.uses(text))}">${store.uses(text)}×</span>` : ""
            }<button type="button" class="chat-recent-remove" data-index="${index}" aria-label="Remove from history" title="Remove from history">×</button></div>`
        )
        .join("");
    }
    clearButton.hidden = !store.list().length;
  }

  function pinButton(text, index) {
    const on = isPinned(text);
    const label = on ? "Unpin" : "Pin to the top";
    return `<button type="button" class="chat-recent-pin" data-index="${index}" aria-pressed="${on}" aria-label="${label}" title="${label}">${on ? "★" : "☆"}</button>`;
  }

  function showSelected() {
    listEl.querySelectorAll(".chat-recent-item").forEach((item) => {
      const on = Number(item.dataset.index) === selected;
      item.setAttribute("aria-selected", String(on));
      if (on) item.scrollIntoView?.({ block: "nearest" });
    });
  }

  function choose(index) {
    const text = shown[index];
    if (text == null) return;
    close();
    onChoose(text);
  }

  function onOutside(event) {
    if (!panel.contains(event.target) && !event.target.closest?.(".chat-recent-button")) close();
  }

  async function open() {
    filter.value = "";
    selected = 0;
    clearArmed = false;
    clearButton.textContent = "Clear history";
    panel.hidden = false;
    render();
    filter.focus();
    document.addEventListener("mousedown", onOutside, true);
    await store.load();
    if (!panel.hidden) render();
  }

  function close({ refocus = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    document.removeEventListener("mousedown", onOutside, true);
    onClose?.({ refocus });
  }

  filter.addEventListener("input", () => {
    selected = 0;
    render();
  });
  filter.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!shown.length) return;
      selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
      showSelected();
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(selected);
    } else if (event.key === "Escape") {
      // (only the list: Escape in the box closes Genie)
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  panel.querySelector(".chat-recent-views").addEventListener("click", (event) => {
    const button = event.target.closest(".chat-recent-view");
    if (!button || button.dataset.view === view) return;
    view = button.dataset.view;
    selected = 0;
    render();
    filter.focus();
  });
  listEl.addEventListener("click", (event) => {
    const pin = event.target.closest(".chat-recent-pin");
    if (pin) {
      store.togglePin?.(shown[Number(pin.dataset.index)]);
      render();
      filter.focus();
      return;
    }
    const remove = event.target.closest(".chat-recent-remove");
    if (remove) {
      store.remove(shown[Number(remove.dataset.index)]);
      render();
      filter.focus();
      return;
    }
    const item = event.target.closest(".chat-recent-item");
    if (item) choose(Number(item.dataset.index));
  });
  clearButton.addEventListener("click", () => {
    if (!clearArmed) {
      clearArmed = true;
      clearButton.textContent = `Clear all ${store.list().length}${pins().length ? " (pinned ones stay)" : ""}? Click again`;
      return;
    }
    store.clear();
    clearArmed = false;
    clearButton.textContent = "Clear history";
    render();
    filter.focus();
  });

  return {
    open,
    close,
    toggle: () => (panel.hidden ? open() : close()),
    isOpen: () => !panel.hidden,
  };
}
