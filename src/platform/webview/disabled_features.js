/*
What the WikiTree Tree Apps mobile app build leaves out, because it needs background.js, which the app doesn't have.
The list itself is disabled_features.json, which webpack/webpack.webview.js also writes into webview.json.

Every caller checks WBE_WEBVIEW first (`typeof WBE_WEBVIEW !== "undefined" && WBE_WEBVIEW && ...`), so in the
extension builds webpack drops the call and this module with it, and in Jest (where WBE_WEBVIEW isn't defined) the
check is simply false.
*/
import disabled from "./disabled_features.json";
import { SHARED_AI_KEY_IDS } from "../../core/options/shared_ai_options";

const DISABLED_IDS = new Set(disabled.features.map((feature) => feature.id));

/** Whether the app build leaves out this feature (it is hidden in the options and never initialised). */
export function isDisabledInWebview(featureId) {
  return DISABLED_IDS.has(featureId);
}

/**
 * A shared-AI feature's options with no way to reach an AI: every key blank, and Ollama set to the cloud (Ollama on
 * this computer needs no key, so aiConfigFor would otherwise still offer it). Auto Bio's Improve with AI, the AI
 * Change Explanation and Find and Replace's Ask Genie all check for a key, so they don't appear.
 */
export function withoutAiAccess(options) {
  const result = { ...options, ollamaWhere: "cloud" };
  for (const keyId of SHARED_AI_KEY_IDS) result[keyId] = "";
  return result;
}
