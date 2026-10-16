/**
 * @jest-environment jsdom
 */
// Auto Bio and Genie share one AI settings group (2026-10-04). These check that the
// switch keeps everyone's saved settings: nothing already stored is changed, a key
// kept only in an old per-feature copy (like xAI, which only Auto Bio had) is carried
// over rather than lost, and a key someone cleared stays cleared.

import { features } from "./options_registry";
import { getFeatureOptions } from "./options_storage";
import { SHARED_AI_OPTION_IDS, SHARED_AI_OPTIONS_KEY } from "./shared_ai_options";
import "../../features/chat/chat_options";
import "../../features/auto_bio/auto_bio_options";

let store;
beforeEach(() => {
  store = {};
  global.chrome = {
    storage: {
      sync: {
        get: (keys, callback) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const result = {};
          list.forEach((key) => {
            if (store[key] !== undefined) result[key] = JSON.parse(JSON.stringify(store[key]));
          });
          callback(result);
        },
        set: (items, callback) => {
          Object.assign(store, JSON.parse(JSON.stringify(items)));
          callback?.();
        },
      },
    },
  };
});

const aiGroupOf = (featureId) => features.find((feature) => feature.id === featureId).options.find((option) => option.id === "aiGroup");

describe("shared AI settings", () => {
  test("Auto Bio and Genie show the same AI settings", () => {
    const ids = (group) => group.options.map((option) => option.id).filter(Boolean);
    const autoBio = aiGroupOf("autoBio");
    const chat = aiGroupOf("chat");
    expect(ids(chat)).toEqual(ids(autoBio));
    expect(ids(chat)).toEqual(SHARED_AI_OPTION_IDS);
    expect(chat.options.map((option) => option.defaultValue)).toEqual(autoBio.options.map((option) => option.defaultValue));
    expect(chat.options[0].comment).toMatch(/shared with Auto Bio/);
    expect(autoBio.options[0].comment).toMatch(/shared with Genie/);
  });

  test("settings already saved are read unchanged by both features and not rewritten", async () => {
    store[SHARED_AI_OPTIONS_KEY] = { aiProvider: "claude", claudeKey: "k-claude", claudeModel: "claude-opus-4-8", openAIKey: "" };
    store.chat_options = { showResultsInTable: true };
    const before = JSON.stringify(store);
    const chat = await getFeatureOptions("chat");
    const autoBio = await getFeatureOptions("autoBio");
    for (const options of [chat, autoBio]) {
      expect(options.aiProvider).toBe("claude");
      expect(options.claudeKey).toBe("k-claude");
      expect(options.claudeModel).toBe("claude-opus-4-8");
    }
    expect(chat.showResultsInTable).toBe(true);
    expect(JSON.stringify(store)).toBe(before);
  });

  test("an xAI key saved only in Auto Bio's old settings is carried over, not lost", async () => {
    store[SHARED_AI_OPTIONS_KEY] = { aiProvider: "xai", openAIKey: "k-openai" };
    store.autoBio_options = { xaiKey: "k-xai", xaiModel: "grok-4.5", otherSetting: 1 };
    const chat = await getFeatureOptions("chat");
    expect(chat.xaiKey).toBe("k-xai");
    expect(chat.xaiModel).toBe("grok-4.5");
    expect(store[SHARED_AI_OPTIONS_KEY]).toEqual({ aiProvider: "xai", openAIKey: "k-openai", xaiKey: "k-xai", xaiModel: "grok-4.5" });
    expect(store.autoBio_options).toEqual({ xaiKey: "k-xai", xaiModel: "grok-4.5", otherSetting: 1 });
  });

  test("a key someone cleared stays cleared even with an old copy elsewhere", async () => {
    store[SHARED_AI_OPTIONS_KEY] = { openAIKey: "" };
    store.chat_options = { openAIKey: "k-old" };
    const chat = await getFeatureOptions("chat");
    const autoBio = await getFeatureOptions("autoBio");
    expect(chat.openAIKey).toBe("");
    expect(autoBio.openAIKey).toBe("");
    expect(store[SHARED_AI_OPTIONS_KEY].openAIKey).toBe("");
  });
});

describe("effectiveAiProvider (2026-10-07: OpenAI selected, only a Claude key)", () => {
  const { effectiveAiProvider } = require("./shared_ai_options");
  test("the only key's provider when the selected one has none", () => {
    expect(effectiveAiProvider({ aiProvider: "openai", claudeKey: "sk-ant-x" })).toBe("claude");
    expect(effectiveAiProvider({ claudeKey: "sk-ant-x" })).toBe("claude");
  });
  test("the selected provider when it has a key", () => {
    expect(effectiveAiProvider({ aiProvider: "openai", openAIKey: "sk-x", claudeKey: "sk-ant-x" })).toBe("openai");
  });
  test("several other keys, or none: the selection stands", () => {
    expect(effectiveAiProvider({ aiProvider: "openai", claudeKey: "a", geminiKey: "b" })).toBe("openai");
    expect(effectiveAiProvider({ aiProvider: "gemini" })).toBe("gemini");
    expect(effectiveAiProvider({ aiProvider: "openai", claudeKey: "   " })).toBe("openai");
  });
});

describe("Ollama (2026-10-16)", () => {
  const { effectiveAiProvider, aiKeyFor, OLLAMA_LOCAL_KEY } = require("./shared_ai_options");
  test("chosen, it needs no key (Ollama on this computer)", () => {
    expect(effectiveAiProvider({ aiProvider: "ollama" })).toBe("ollama");
    expect(aiKeyFor({ aiProvider: "ollama" }, "ollama")).toBe(OLLAMA_LOCAL_KEY);
    // (a saved key alone doesn't send it to the cloud: "Run Ollama on" decides)
    expect(aiKeyFor({ aiProvider: "ollama", ollamaKey: " ok-1 " }, "ollama")).toBe(OLLAMA_LOCAL_KEY);
    expect(aiKeyFor({ aiProvider: "ollama", ollamaWhere: "cloud", ollamaKey: " ok-1 " }, "ollama")).toBe("ok-1");
    expect(aiKeyFor({ aiProvider: "ollama", ollamaWhere: "cloud" }, "ollama")).toBe("");
  });
  test("not chosen, it doesn't count as a key", () => {
    expect(effectiveAiProvider({ aiProvider: "openai" })).toBe("openai");
    expect(effectiveAiProvider({ aiProvider: "openai", ollamaKey: "ok-1" })).toBe("ollama");
    expect(aiKeyFor({}, "openai")).toBe("");
  });
  test("Run Ollama on: this computer's models, or the key and the cloud models", () => {
    const { sharedAiOptionGroup } = require("./shared_ai_options");
    const options = sharedAiOptionGroup("Auto Bio").options;
    const byId = (id) => options.find((option) => option.id === id);
    expect(byId("ollamaWhere").defaultValue).toBe("local");
    expect(byId("ollamaModel").values.map((entry) => entry.value)).toContain("gemma4:e4b");
    expect(byId("ollamaModel").dependsOn).toEqual({ option: "ollamaWhere", value: "local", hide: true });
    expect(byId("ollamaKey").dependsOn).toEqual({ option: "ollamaWhere", value: "cloud", hide: true });
    expect(byId("ollamaCloudModel").values.map((entry) => entry.value)).toContain("gpt-oss:120b");
  });
});

describe("aiConfigFor: what Genie and Auto Bio call (2026-10-16)", () => {
  const { aiConfigFor, SHARED_AI_MODEL_CONFIG, OLLAMA_LOCAL_KEY } = require("./shared_ai_options");
  test("the chosen model, else the shared default; the override beats both", () => {
    expect(aiConfigFor({ aiProvider: "claude", claudeKey: " k1 \n" })).toEqual({ provider: "claude", key: "k1", model: "claude-sonnet-5" });
    expect(aiConfigFor({ aiProvider: "xai", xaiKey: "k", xaiModel: "grok-4.5" }).model).toBe("grok-4.5");
    expect(aiConfigFor({ aiProvider: "xai", xaiKey: "k", xaiModel: "grok-4.5", aiModel: " custom-1 " }).model).toBe("custom-1");
  });
  test("Ollama with no key runs on this computer", () => {
    expect(aiConfigFor({ aiProvider: "ollama", ollamaKey: "ok-1", ollamaModel: "gemma4:12b", ollamaCloudModel: "glm-5.3" })).toEqual({
      provider: "ollama",
      key: OLLAMA_LOCAL_KEY,
      model: "gemma4:12b",
    });
    expect(aiConfigFor({ aiProvider: "ollama" }).model).toBe("gemma4:e4b");
  });
  test("Ollama Cloud: the key and the cloud model", () => {
    expect(aiConfigFor({ aiProvider: "ollama", ollamaWhere: "cloud", ollamaKey: "ok-1", ollamaModel: "gemma4:12b" })).toEqual({
      provider: "ollama",
      key: "ok-1",
      model: "gpt-oss:120b",
    });
  });
  test("every provider has a model table for Auto Bio's check, with its default in the list", () => {
    for (const config of Object.values(SHARED_AI_MODEL_CONFIG)) {
      expect(config.models.map((model) => model.value)).toContain(config.defaultModel);
    }
    expect(SHARED_AI_MODEL_CONFIG.ollama.optionId).toBe("ollamaModel");
    expect(SHARED_AI_MODEL_CONFIG.ollamaCloud.optionId).toBe("ollamaCloudModel");
  });
});
