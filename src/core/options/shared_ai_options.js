/*
The AI settings Auto Bio and Genie share (2026-10-04). Both features show this same
group on the options page and read and write the same stored values
(sharedAI_options), so a key added or removed in one is added or removed in the
other. Defined once here so the two can't drift apart again (Auto Bio had gained
xAI and newer default models that Genie never got).
*/

import { OptionType } from "./options_registry";
import aiModels from "../../features/auto_bio/ai_models.json";

export const SHARED_AI_OPTIONS_KEY = "sharedAI_options";
export const SHARED_AI_FEATURES = ["autoBio", "chat"];

export const SHARED_AI_DEFAULT_MODELS = {
  openai: "gpt-5.6-terra",
  gemini: "gemini-3.5-flash",
  claude: "claude-sonnet-5",
  perplexity: "sonar",
  xai: "grok-4.3",
};

const PROVIDERS = [
  { value: "openai", text: "OpenAI", keyId: "openAIKey", keyLabel: "OpenAI API Key", modelId: "openAIModel", modelLabel: "OpenAI Model" },
  { value: "gemini", text: "Google Gemini", keyId: "geminiKey", keyLabel: "Gemini API Key", modelId: "geminiModel", modelLabel: "Gemini Model" },
  { value: "claude", text: "Anthropic Claude", keyId: "claudeKey", keyLabel: "Claude API Key", modelId: "claudeModel", modelLabel: "Claude Model" },
  { value: "perplexity", text: "Perplexity AI", keyId: "perplexityKey", keyLabel: "Perplexity API Key", modelId: "perplexityModel", modelLabel: "Perplexity Model" },
  { value: "xai", text: "xAI (Grok)", keyId: "xaiKey", keyLabel: "xAI API Key", modelId: "xaiModel", modelLabel: "xAI Model" },
];

export const SHARED_AI_KEY_IDS = PROVIDERS.map((provider) => provider.keyId);

const keyOf = (options, provider) => String(options?.[provider.keyId] || "").trim();

/**
 * The provider to use: the selected one when it has a key; otherwise, when only one provider
 * has a key, that one (the user, 2026-10-07: "AI Provider" said OpenAI but the member had only
 * a Claude key, so nothing worked). Unknown or no keys leave the selection as it is.
 */
export function effectiveAiProvider(options = {}) {
  const selected = PROVIDERS.find((provider) => provider.value === options?.aiProvider) || PROVIDERS[0];
  if (keyOf(options, selected)) return selected.value;
  const withKeys = PROVIDERS.filter((provider) => keyOf(options, provider));
  return withKeys.length === 1 ? withKeys[0].value : selected.value;
}

export const SHARED_AI_OPTION_IDS = [
  "aiProvider",
  ...PROVIDERS.flatMap((provider) => [provider.keyId, provider.modelId]),
  "aiModel",
];

/** The "AI Assistance" group, for the feature whose sharing partner is `otherFeatureName`. */
export function sharedAiOptionGroup(otherFeatureName) {
  return {
    id: "aiGroup",
    type: OptionType.GROUP,
    label: "AI Assistance",
    options: [
      {
        type: OptionType.TEXT_LINE,
        comment: `These AI settings are shared with ${otherFeatureName}. Changing them here changes them there too.`,
      },
      {
        id: "aiProvider",
        type: OptionType.SELECT,
        label: "AI Provider",
        values: PROVIDERS.map((provider) => ({ value: provider.value, text: provider.text })),
        defaultValue: "openai",
      },
      ...PROVIDERS.flatMap((provider) => [
        { id: provider.keyId, type: OptionType.TEXT, label: provider.keyLabel, defaultValue: "" },
        {
          id: provider.modelId,
          type: OptionType.SELECT,
          label: provider.modelLabel,
          values: aiModels[provider.value],
          defaultValue: SHARED_AI_DEFAULT_MODELS[provider.value],
        },
      ]),
      {
        id: "aiModel",
        type: OptionType.TEXT,
        label: "Custom Model Override (Advanced)",
        defaultValue: "",
        comment: "If provided, this will override the selection above.",
      },
    ],
  };
}
