import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_FILE = path.join(__dirname, "../src/features/auto_bio/ai_models.json");

// Curated list of models based on current (late 2024/early 2025) availability and quality.
const CURATED_MODELS = {
  openai: [
    { value: "gpt-5.2-chat-latest", text: "GPT-5.2 (Latest/Smartest)" },
    { value: "gpt-5-mini", text: "GPT-5 Mini (Fast/Cheap)" },
    { value: "o1", text: "o1-series (High Reasoning)" },
    { value: "o3-mini", text: "o3-mini (Fast Reasoning)" },
    { value: "gpt-4o", text: "GPT-4o (Legacy stable)" },
  ],
  gemini: [
    { value: "gemini-3-flash-preview", text: "Gemini 3 Flash (Fastest/Newest)" },
    { value: "gemini-3-pro-preview", text: "Gemini 3 Pro (Smartest)" },
    { value: "gemini-2.5-pro", text: "Gemini 2.5 Pro (Stable/Deep)" },
    { value: "gemini-2.5-flash", text: "Gemini 2.5 Flash (Balanced)" },
  ],
  claude: [
    { value: "claude-sonnet-4-5", text: "Claude 4.5 Sonnet (Latest Premium)" },
    { value: "claude-sonnet-4-5-20250929", text: "Claude 4.5 Sonnet (2025-09-29)" },
    { value: "claude-haiku-4-5", text: "Claude 4.5 Haiku (Fast/Latest)" },
    { value: "claude-3-5-sonnet-latest", text: "Claude 3.5 Sonnet (Latest)" },
    { value: "claude-3-5-sonnet-20241022", text: "Claude 3.5 Sonnet (Oct 2024)" },
  ],
  perplexity: [
    { value: "sonar", text: "Sonar (Fast/Balanced)" },
    { value: "sonar-pro", text: "Sonar Pro (Deep Research)" },
    { value: "sonar-reasoning", text: "Sonar Reasoning (CoT Reasoning)" },
    { value: "sonar-deep-research", text: "Sonar Deep Research (In-depth)" },
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
