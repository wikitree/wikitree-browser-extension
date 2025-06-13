// This script runs in the page context to dispatch events
const script = document.currentScript;
const expansionsData = script.getAttribute("data-expansions");
if (expansionsData) {
  const data = JSON.parse(expansionsData);
  const event = new CustomEvent("wbeTextExpanderSet", {
    detail: { expansions: data.expansions },
  });
  document.dispatchEvent(event);
}
