// "Still working" when an AI reply is slow (2026-10-16: Auto Bio with Ollama on the member's own
// computer took minutes, and it looked broken). background.js's callAiProvider sends wbeAiSlow after
// a while and wbeAiDone when the reply comes; each feature shows the note by its own spinner.

export function slowAiNoticeText(local) {
  return local
    ? "Still working. Ollama on your computer can take a few minutes, especially the first time. For faster answers, choose Ollama Cloud or another AI provider in WBE's settings."
    : "Still working: the AI is taking longer than usual.";
}

/**
 * show(text) when a reply is slow, hide() when it comes. Each feature checks its own spinner is
 * showing, since every listener in the tab hears every message.
 */
export function listenForSlowAi({ show, hide }) {
  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.action === "wbeAiSlow") show(slowAiNoticeText(Boolean(message.local)));
      else if (message?.action === "wbeAiDone") hide();
    });
  } catch (error) {
    console.warn("wbe: slow AI notice unavailable", error);
  }
}
