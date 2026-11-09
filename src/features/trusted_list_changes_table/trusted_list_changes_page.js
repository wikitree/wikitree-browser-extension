/*
Created By: Ian Beacall (Beacall-6)

Runs in the PAGE context, not the extension's isolated world (2026-11-09).

On Special:TrustedListChanges, WikiTree's "select all descendants / ancestors" links call checkDescendants or
checkAncestorsAndSiblings, which walk the page's `p` object (user id → { P: page id, F: father, M: mother }).
Neither is reachable from the extension, and Chrome won't run a javascript: link that extension code clicks.
trusted_list_changes_table.js injects this with data-op ("desc" or "anc") and data-id (the person's user id).
It runs WikiTree's own function, so the selection is exactly WikiTree's, and puts the page ids of the whole branch
(ticked before or not) in data-ids, comma-separated. It then dispatches "wbe-tlc-done" on the script element, with
data-state "ok", "none" (WikiTree's functions aren't on this page) or "error".
*/
(() => {
  const script = document.currentScript;
  if (!script) return;
  const done = (state, ids) => {
    if (ids) script.setAttribute("data-ids", ids.join(","));
    script.setAttribute("data-state", state);
    script.dispatchEvent(new Event("wbe-tlc-done"));
  };
  const op = script.getAttribute("data-op");
  const id = Number(script.getAttribute("data-id"));
  const select = op === "desc" ? window.checkDescendants : op === "anc" ? window.checkAncestorsAndSiblings : null;
  const list = op === "desc" ? window.getDescendants : op === "anc" ? window.getAncestorsAndSiblings : null;
  if (typeof select !== "function" || !id || !document.editform) {
    done("none");
    return;
  }
  try {
    const ids = [];
    if (typeof list === "function" && window.p) {
      const people = (op === "desc" ? list(id, 0) : list(id)) || {};
      for (const userId in people) {
        const pageId = window.p[userId] ? window.p[userId]["P"] : null;
        if (pageId) ids.push(String(pageId));
      }
    }
    select(document.editform["idlist[]"], id);
    done("ok", ids);
  } catch (error) {
    console.error("WBE Trusted List Changes Table:", error);
    done("error");
  }
})();
