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
  ollama: "gemma4:e4b",
  ollamaCloud: "gpt-oss:120b",
};

// Ollama (2026-10-16) runs where the member says (ollamaWhere): on their own computer, which needs no
// key, or Ollama Cloud (ollama.com) with their key. A saved key doesn't decide it (the user: keep the
// key but use the desktop one). On this computer OLLAMA_LOCAL_KEY stands in for the key, so "is
// there AI?" works as for the others; background.js sends it to localhost:11434 and never as a key.
export const OLLAMA_LOCAL_KEY = "ollama-local";
export const OLLAMA_ORIGINS = ["https://ollama.com/*", "http://localhost/*", "http://127.0.0.1/*"];

const PROVIDERS = [
  { value: "openai", text: "OpenAI", keyId: "openAIKey", keyLabel: "OpenAI API Key", modelId: "openAIModel", modelLabel: "OpenAI Model" },
  { value: "gemini", text: "Google Gemini", keyId: "geminiKey", keyLabel: "Gemini API Key", modelId: "geminiModel", modelLabel: "Gemini Model" },
  { value: "claude", text: "Anthropic Claude", keyId: "claudeKey", keyLabel: "Claude API Key", modelId: "claudeModel", modelLabel: "Claude Model" },
  { value: "perplexity", text: "Perplexity AI", keyId: "perplexityKey", keyLabel: "Perplexity API Key", modelId: "perplexityModel", modelLabel: "Perplexity Model" },
  { value: "xai", text: "xAI (Grok)", keyId: "xaiKey", keyLabel: "xAI API Key", modelId: "xaiModel", modelLabel: "xAI Model" },
  {
    value: "ollama",
    text: "Ollama (on this computer, or Ollama Cloud)",
    whereId: "ollamaWhere",
    keyId: "ollamaKey",
    keyLabel: "Ollama API Key (for Ollama Cloud)",
    modelId: "ollamaModel",
    modelLabel: "Ollama Model (this computer)",
    // (local names from ollama.com/library, cloud ones from ollama.com/api/tags, 2026-10-16; any
    // other name goes in the Custom Model Override)
    modelComment: "Download it first, for example: ollama pull gemma4:e4b. For another model, type its name in the Custom Model Override below.",
    cloudModelId: "ollamaCloudModel",
    cloudModelLabel: "Ollama Cloud Model",
  },
];

export const SHARED_AI_KEY_IDS = PROVIDERS.map((provider) => provider.keyId);

const keyOf = (options, provider) => String(options?.[provider.keyId] || "").trim();
const inCloud = (options, provider) => Boolean(provider.whereId) && options?.[provider.whereId] === "cloud";
// (Ollama on this computer needs no key; in the cloud, its own)
const usableKey = (options, provider) => (provider.whereId && !inCloud(options, provider) ? OLLAMA_LOCAL_KEY : keyOf(options, provider));
// Where the provider's model is chosen, and which list and default go with it
const modelSlot = (options, provider) =>
  inCloud(options, provider) ? { optionId: provider.cloudModelId, list: `${provider.value}Cloud` } : { optionId: provider.modelId, list: provider.value };

/**
 * The provider to use: the selected one when it has a key; otherwise, when only one provider
 * has a key, that one (the user, 2026-10-07: "AI Provider" said OpenAI but the member had only
 * a Claude key, so nothing worked). Unknown or no keys leave the selection as it is.
 */
export function effectiveAiProvider(options = {}) {
  const selected = PROVIDERS.find((provider) => provider.value === options?.aiProvider) || PROVIDERS[0];
  if (usableKey(options, selected)) return selected.value;
  const withKeys = PROVIDERS.filter((provider) => keyOf(options, provider));
  return withKeys.length === 1 ? withKeys[0].value : selected.value;
}

/** The key to send for a provider: its own, or (Ollama on this computer) OLLAMA_LOCAL_KEY. */
export function aiKeyFor(options = {}, providerValue) {
  const provider = PROVIDERS.find((entry) => entry.value === providerValue);
  return provider ? usableKey(options, provider) : "";
}

/**
 * What to call: the provider (effectiveAiProvider), its key (aiKeyFor) and the model (the Custom
 * Model Override, else the provider's chosen model, else the shared default). Genie and Auto Bio
 * each had their own copy of this (2026-10-16).
 */
export function aiConfigFor(options = {}) {
  const provider = effectiveAiProvider(options);
  const entry = PROVIDERS.find((candidate) => candidate.value === provider);
  const key = String(aiKeyFor(options, provider) || "").trim(); // a pasted key can carry a space or line break
  const slot = entry ? modelSlot(options, entry) : {};
  const model = String(options?.aiModel || "").trim() || options?.[slot.optionId] || SHARED_AI_DEFAULT_MODELS[slot.list] || "";
  return { provider, key, model };
}

/** Each provider's model option, default and list (Auto Bio's check of saved models). */
export const SHARED_AI_MODEL_CONFIG = Object.fromEntries(
  PROVIDERS.flatMap((provider) =>
    [
      [provider.value, provider.modelId],
      [`${provider.value}Cloud`, provider.cloudModelId],
    ]
      .filter(([, optionId]) => optionId)
      .map(([list, optionId]) => [list, { optionId, defaultModel: SHARED_AI_DEFAULT_MODELS[list], models: aiModels[list] }])
  )
);

export const SHARED_AI_OPTION_IDS = [
  "aiProvider",
  ...PROVIDERS.flatMap((provider) => (provider.whereId ? [provider.whereId, provider.modelId, provider.keyId, provider.cloudModelId] : [provider.keyId, provider.modelId])),
  "aiModel",
];

const keyOption = (provider, extra = {}) => ({ id: provider.keyId, type: OptionType.TEXT, label: provider.keyLabel, defaultValue: "", ...extra });
const modelOption = (provider, id, label, list, extra = {}) => ({
  id,
  type: OptionType.SELECT,
  label,
  values: aiModels[list],
  defaultValue: SHARED_AI_DEFAULT_MODELS[list],
  ...extra,
});

// Where Ollama runs, then only the boxes for there: the key and cloud models, or this computer's models.
function ollamaOptions(provider) {
  const when = (value) => ({ dependsOn: { option: provider.whereId, value, hide: true } });
  return [
    {
      id: provider.whereId,
      type: OptionType.SELECT,
      label: "Run Ollama on",
      values: [
        { value: "local", text: "This computer" },
        { value: "cloud", text: "Ollama Cloud (needs an API key)" },
      ],
      defaultValue: "local",
    },
    modelOption(provider, provider.modelId, provider.modelLabel, provider.value, { comment: provider.modelComment, ...when("local") }),
    keyOption(provider, when("cloud")),
    modelOption(provider, provider.cloudModelId, provider.cloudModelLabel, `${provider.value}Cloud`, {
      comment: "For another model, type its name in the Custom Model Override below.",
      ...when("cloud"),
    }),
  ];
}

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
      ...PROVIDERS.flatMap((provider) => (provider.whereId ? ollamaOptions(provider) : [keyOption(provider), modelOption(provider, provider.modelId, provider.modelLabel, provider.value)])),
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
