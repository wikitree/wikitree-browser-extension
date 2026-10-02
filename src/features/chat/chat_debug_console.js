// Opt-in debugging aid: when localStorage "wbeChatDebugJson" is "1", "wbe:" console
// lines also carry their object arguments as JSON text. Content-script objects show up
// as an opaque "Object" in tools that read the console as text, which hides the
// parsed queries and routing decisions we need when diagnosing a prompt.
// Enable on the page with: localStorage.wbeChatDebugJson = "1"

const MAX_JSON_LENGTH = 4000;

function isEnabled() {
  try {
    return window.localStorage?.getItem("wbeChatDebugJson") === "1";
  } catch {
    return false;
  }
}

function toJsonText(value) {
  try {
    const text = JSON.stringify(value);
    return text.length > MAX_JSON_LENGTH ? `${text.slice(0, MAX_JSON_LENGTH)}…` : text;
  } catch {
    return String(value);
  }
}

export function installChatDebugConsole() {
  if (!isEnabled() || console.__wbeChatDebugJson) return;
  console.__wbeChatDebugJson = true;
  ["log", "info", "debug", "warn", "error"].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      if (typeof args[0] !== "string" || !args[0].startsWith("wbe:")) {
        original(...args);
        return;
      }
      original(
        ...args.map((arg) => (arg && typeof arg === "object" && !(arg instanceof Error) ? toJsonText(arg) : arg))
      );
    };
  });
}
