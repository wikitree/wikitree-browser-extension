import { aiKeyHelpHtml } from "./chat_ai_key_help";

test("the key help lists each provider as a collapsed section", () => {
  document.body.innerHTML = aiKeyHelpHtml();
  const summaries = [...document.querySelectorAll(".chat-ai-help details > summary")].map((s) => s.textContent);
  expect(summaries).toEqual(["Google Gemini (AI Studio)", "OpenAI", "Claude (Anthropic)", "Perplexity AI", "Grok (xAI)"]);
  expect(document.querySelectorAll(".chat-ai-help details[open]")).toHaveLength(0);
  expect(document.querySelector(".chat-ai-help-settings")).not.toBeNull();
});
