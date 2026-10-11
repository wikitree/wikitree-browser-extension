// A reply that adds detail to a question Genie couldn't answer (Elaine, 2026-10-11): she asked
// "what's the most closely connected person with the surname bexar or coker?", Genie couldn't
// answer, and she added "from the person's page I'm on, WikiTree member Atkinson-5584. The
// profile is yellow privacy." That went to the profile search on its own, which asked her what
// to search for. The AI reads the two together and says what is being asked; code runs it.

const MAX_CHARS = 600;

/** The AI's instructions: one standalone request, or the reply as it is. */
export function buildFollowupMergePrompt(previous, reply) {
  return [
    "You help a genealogy chat assistant (Genie, on WikiTree) follow a conversation.",
    "The user's previous request could not be answered, or Genie asked them for more detail. Then they sent a new message.",
    'If the new message adds detail to the previous request (who, where, which profile, a correction), reply with one standalone request that combines both, in the user\'s own words as far as possible. Keep WikiTree IDs (like Smith-123) and names exactly. Leave out details that only explain (such as "the profile is yellow privacy") unless they change what is asked.',
    "If the new message is a different request, reply with it unchanged.",
    'Return strict JSON only: {"merged": true, "prompt": "..."} or {"merged": false}',
    `Previous request: ${String(previous || "").slice(0, MAX_CHARS)}`,
    `New message: ${String(reply || "").slice(0, MAX_CHARS)}`,
  ].join("\n");
}

/** The AI's reply → the combined request, or "" (a new request, or an unusable reply). */
export function readFollowupMerge(rawText, reply = "") {
  const text = String(rawText || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let parsed = null;
  try {
    parsed = JSON.parse(fenced?.[1] ? fenced[1].trim() : text);
  } catch (error) {
    return "";
  }
  if (parsed?.merged !== true) return "";
  const prompt = String(parsed.prompt || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!prompt || prompt.length > MAX_CHARS * 2) return "";
  if (prompt.toLowerCase() === String(reply || "").trim().toLowerCase()) return "";
  return prompt;
}

/**
 * askAi(prompt) → the model's text (or null). Returns the combined request, or "" to keep the
 * new message as it is (also when the AI can't be reached).
 */
export async function mergeFollowupWithUnanswered({ previous, reply, askAi }) {
  if (!String(previous || "").trim() || !String(reply || "").trim() || typeof askAi !== "function") return "";
  try {
    return readFollowupMerge(await askAi(buildFollowupMergePrompt(previous, reply)), reply);
  } catch (error) {
    console.debug("wbe: follow-up merge failed", error);
    return "";
  }
}
