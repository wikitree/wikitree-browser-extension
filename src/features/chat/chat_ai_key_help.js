// The AI switch with no key: why AI helps Genie, and how to get a key. Adapted from
// Space:WikiTree_Browser_Extension#How_to_Set_an_AI_API_Key.
import { AI_KEY_HELP_URL } from "./chat_answer";

const link = (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url.replace(/^https:\/\//, "")}</a>`;
const PASTE_STEP = "Paste it into <b>AI Assistance</b> in WBE's settings (see below).";
const SAVE_NOTE = "Save it somewhere safe (Notes, a text file…). You may not be able to see it again.";

const PROVIDERS = [
  {
    name: "Google Gemini (AI Studio)",
    note: "Free usage is available, with limits. A good place to start.",
    steps: [
      `Go to ${link("https://aistudio.google.com/")} and sign in with your Google account.`,
      "Click <b>Get API key</b> (top right), then <b>Create API key</b>. If Google asks you to choose or create a project, accept the default.",
      `Copy the key. ${SAVE_NOTE}`,
      PASTE_STEP,
    ],
  },
  {
    name: "OpenAI",
    note: "You need to add a payment method; the cost is usually very small (often pennies). ChatGPT Plus is not required.",
    steps: [
      `Go to ${link("https://platform.openai.com/")} and sign in. If you use ChatGPT, use the same email and password; if not, follow the steps to create an account.`,
      `Open ${link("https://platform.openai.com/api-keys")} and click <b>Create new secret key</b>.`,
      `Copy the key (it starts with <code>sk-</code>). ${SAVE_NOTE}`,
      PASTE_STEP,
    ],
  },
  {
    name: "Claude (Anthropic)",
    steps: [
      `Go to ${link("https://console.anthropic.com/")} and create an account or sign in.`,
      "Open <b>API Keys</b> and click <b>Create key</b>.",
      `Copy the key. ${SAVE_NOTE}`,
      PASTE_STEP,
    ],
  },
  {
    name: "Perplexity AI",
    steps: [
      `Go to ${link("https://www.perplexity.ai/settings/api")} and sign in.`,
      `Create an API group (needed before you can make keys) at ${link("https://www.perplexity.ai/account/api/group")}.`,
      "Add billing or credits if asked, then on the <b>API Keys</b> tab click <b>+ Create key</b>.",
      `Copy the key. ${SAVE_NOTE}`,
      PASTE_STEP,
    ],
  },
  {
    name: "Grok (xAI)",
    note: "xAI may ask you to add credits first. Grok in the app or on X is not the same as the Grok API.",
    steps: [
      `Go to ${link("https://console.x.ai/")} and create an account or sign in.`,
      `Open the API Keys page (${link("https://console.x.ai/team/default/api-keys")}) and click <b>Create API Key</b>, giving it a name if asked.`,
      `Copy the key (it starts with <code>xai-</code>). ${SAVE_NOTE}`,
      PASTE_STEP,
    ],
  },
];

export function aiKeyHelpHtml() {
  const providers = PROVIDERS.map(
    (provider) => `<details>
      <summary>${provider.name}</summary>
      <ol>${provider.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
      ${provider.note ? `<p class="chat-ai-help-note">${provider.note}</p>` : ""}
    </details>`
  ).join("");
  return `<div class="chat-ai-help" role="dialog" aria-labelledby="chat-ai-help-title">
    <button type="button" class="small chat-ai-help-close" aria-label="Close" title="Close">&times;</button>
    <h3 id="chat-ai-help-title">Turn on AI in Genie</h3>
    <p>Genie already does a lot without AI: every chart, searches by name, place and date, family lists, and relationships. An AI key adds:</p>
    <ul>
      <li><b>Questions in your own words.</b> Genie understands requests however you put them, not just the wordings it knows.</li>
      <li><b>Answers from biographies:</b> "What did her husband do for a living?", "Summarise his biography".</li>
      <li><b>Searches with conditions:</b> "Beacalls who emigrated to Australia".</li>
      <li><b>Background:</b> "What was life like in Cornwall in the 1840s?"</li>
    </ul>
    <p>The AI only interprets. The people, dates and charts still come from WikiTree, and answers written by AI are labelled.</p>
    <h4>1. Get a key from one AI company</h4>
    <p>An API key is a long password that lets the AI work for you. Which company and model you use is up to you. You pay the company directly, usually very little.</p>
    ${providers}
    <h4>2. Add it to WBE</h4>
    <p>Open WBE's settings, find <b>Genie</b>, and under <b>AI Assistance</b> choose your provider and paste the key. Auto Bio shares these settings, so one key works for both. Then reopen Genie: the AI switch at the top will be <b>On</b>.</p>
    <h4>Keep your key safe</h4>
    <ul>
      <li>Don't share it with anyone or post it on WikiTree.</li>
      <li>If you think it has leaked, delete it on the company's site and make a new one.</li>
      <li>Your key stays in your browser and goes only to the company you chose, along with your question and the profile details needed to answer it.</li>
    </ul>
    <div class="chat-ai-help-actions">
      <button type="button" class="small chat-ai-help-settings">Open WBE settings</button>
      <button type="button" class="small chat-ai-help-examples">What works without AI</button>
      <a href="${AI_KEY_HELP_URL}" target="_blank" rel="noopener noreferrer">Full instructions on WikiTree</a>
    </div>
  </div>`;
}
