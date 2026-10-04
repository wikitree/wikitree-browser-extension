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
