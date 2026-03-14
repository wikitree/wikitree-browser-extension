/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";
import aiModels from "../auto_bio/ai_models.json";

registerFeature({
  name: "Chat",
  id: "chat",
  description: "AI-assisted chat for WikiTree and WikiTree+ queries.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    {
      id: "aiGroup",
      type: OptionType.GROUP,
      label: "AI Assistance",
      options: [
        {
          id: "aiProvider",
          type: OptionType.SELECT,
          label: "AI Provider",
          values: [
            { value: "openai", text: "OpenAI" },
            { value: "gemini", text: "Google Gemini" },
            { value: "claude", text: "Anthropic Claude" },
            { value: "perplexity", text: "Perplexity AI" },
          ],
          defaultValue: "openai",
        },
        {
          id: "openAIKey",
          type: OptionType.TEXT,
          label: "OpenAI API Key",
          defaultValue: "",
        },
        {
          id: "openAIModel",
          type: OptionType.SELECT,
          label: "OpenAI Model",
          values: aiModels.openai,
          defaultValue: "gpt-5-mini",
        },
        {
          id: "geminiKey",
          type: OptionType.TEXT,
          label: "Gemini API Key",
          defaultValue: "",
        },
        {
          id: "geminiModel",
          type: OptionType.SELECT,
          label: "Gemini Model",
          values: aiModels.gemini,
          defaultValue: "gemini-3-flash-preview",
        },
        {
          id: "claudeKey",
          type: OptionType.TEXT,
          label: "Claude API Key",
          defaultValue: "",
        },
        {
          id: "claudeModel",
          type: OptionType.SELECT,
          label: "Claude Model",
          values: aiModels.claude,
          defaultValue: "claude-sonnet-4-5",
        },
        {
          id: "perplexityKey",
          type: OptionType.TEXT,
          label: "Perplexity API Key",
          defaultValue: "",
        },
        {
          id: "perplexityModel",
          type: OptionType.SELECT,
          label: "Perplexity Model",
          values: aiModels.perplexity,
          defaultValue: "sonar",
        },
        {
          id: "aiModel",
          type: OptionType.TEXT,
          label: "Custom Model Override (Advanced)",
          defaultValue: "",
          comment: "If provided, this will override the selection above.",
        },
      ],
    },
    {
      id: "showResultsInTable",
      type: OptionType.CHECKBOX,
      label: "Open structured results in a DataTable",
      defaultValue: false,
      comment: "When available, Chat will show result sets in a searchable, sortable table.",
    },
    {
      id: "allowAiFallback",
      type: OptionType.CHECKBOX,
      label: "Allow AI fallback for unmatched prompts",
      defaultValue: true,
      comment: "If disabled, prompts that don't match local tools stay local and are not sent to an AI provider.",
    },
  ],
});
