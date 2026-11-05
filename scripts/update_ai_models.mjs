import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_FILE = path.join(__dirname, "../src/features/auto_bio/ai_models.json");

// Curated list of models based on current (Jul 2026) availability and quality.
const CURATED_MODELS = {
  openai: [
    { value: "gpt-5.5", text: "GPT-5.5 (Latest/Smartest)" },
    { value: "gpt-5.4", text: "GPT-5.4 (Balanced)" },
    { value: "gpt-5.4-mini", text: "GPT-5.4 Mini (Fast/Cheap)" },
    { value: "gpt-5.4-nano", text: "GPT-5.4 Nano (Ultra Fast/Cheap)" },
  ],
  gemini: [
    { value: "gemini-3.5-flash", text: "Gemini 3.5 Flash (Latest Stable)" },
    { value: "gemini-3.1-pro-preview", text: "Gemini 3.1 Pro (Preview/Smartest)" },
    { value: "gemini-3-flash-preview", text: "Gemini 3 Flash (Preview)" },
    { value: "gemini-2.5-pro", text: "Gemini 2.5 Pro (Stable/Deep)" },
    { value: "gemini-2.5-flash", text: "Gemini 2.5 Flash (Balanced)" },
    { value: "gemini-2.5-flash-lite", text: "Gemini 2.5 Flash Lite (Low Cost)" },
  ],
  claude: [
    { value: "claude-fable-5", text: "Claude Fable 5 (Latest/Most Capable)" },
    { value: "claude-opus-4-8", text: "Claude Opus 4.8 (Strong Coding)" },
    { value: "claude-sonnet-5", text: "Claude Sonnet 5 (Fast + Smart)" },
    { value: "claude-haiku-4-5", text: "Claude Haiku 4.5 (Fastest)" },
    { value: "claude-opus-4-7", text: "Claude Opus 4.7 (Legacy Stable)" },
    { value: "claude-sonnet-4-6", text: "Claude Sonnet 4.6 (Legacy Stable)" },
  ],
  perplexity: [
    { value: "sonar", text: "Sonar (Fast/Balanced)" },
    { value: "sonar-pro", text: "Sonar Pro (Deep Research)" },
    { value: "sonar-reasoning-pro", text: "Sonar Reasoning Pro (High Reasoning)" },
    { value: "sonar-deep-research", text: "Sonar Deep Research (In-depth)" },
  ],
  xai: [
    { value: "grok-4.3", text: "SuperGrok (Grok 4.3)" },
    { value: "grok-4.20-0309-reasoning", text: "Grok 4.20 Reasoning" },
    { value: "grok-4.20-0309-non-reasoning", text: "Grok 4.20 Non-Reasoning" },
    { value: "grok-4.20-multi-agent-0309", text: "Grok 4.20 Multi-Agent" },
  ],
};

async function updateModels() {
  console.log("Updating AI models list...");

  // NOTE: This script can be expanded to fetch from APIs if API keys are provided.
  // For now, it ensures the JSON is aligned with our curated selection.

  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(CURATED_MODELS, null, 2));
    console.log(`Successfully updated ${MODELS_FILE}`);
  } catch (error) {
    console.error("Error writing models file:", error);
    process.exit(1);
  }
}

updateModels();
