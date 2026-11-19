/*
What the WikiTree Tree Apps mobile app build leaves out, because it needs background.js, which the app doesn't have.
The list itself is disabled_features.json, which webpack/webpack.webview.js also writes into webview.json.

Every caller checks WBE_WEBVIEW first (`typeof WBE_WEBVIEW !== "undefined" && WBE_WEBVIEW && ...`), so in the
extension builds webpack drops the call and this module with it, and in Jest (where WBE_WEBVIEW isn't defined) the
check is simply false.
*/
import disabled from "./disabled_features.json";

const DISABLED_IDS = new Set(disabled.features.map((feature) => feature.id));

/** Whether the app build leaves out this feature (it is hidden in the options and never initialised). */
export function isDisabledInWebview(featureId) {
  return DISABLED_IDS.has(featureId);
}

/**
 * A shared-AI feature's options as the app uses them. The AI requests go through the app (ai_requests.js, shim.js),
 * but a phone has no Ollama of its own, so Ollama is always Ollama Cloud (with a blank key aiConfigFor would
 * otherwise offer "Ollama on this computer").
 */
export function withAppAi(options) {
  return { ...options, ollamaWhere: "cloud" };
}
