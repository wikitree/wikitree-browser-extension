// A reply that adds detail to a question Genie couldn't answer (Elaine, 2026-10-11): she asked
// "what's the most closely connected person with the surname bexar or coker?", Genie couldn't
// answer, and she added "from the person's page I'm on, WikiTree member Atkinson-5584. The
// profile is yellow privacy." That went to the profile search on its own, which asked her what
// to search for. The AI reads the two together and says what is being asked; code runs it.

const MAX_CHARS = 600;

// A reply that says Genie got the last question wrong (Heard-171, 2026-10-31): "I asked about Ann
// Heard" after Genie searched for "This profile mentions that Ann Heard", or "Neither of those people
// are married to a Jean Prévost" after it listed two Françoise Lamontagnes. Only a gate: the AI
// decides whether it really corrects the last question, and how.
const CORRECTION_RE =
  /^(?:no|nope|wrong)\b[,.!]?\s+\S|\bI\s+(?:asked|was\s+asking|meant|mean|wanted|was\s+looking)\b|\b(?:not|isn['’]t|wasn['’]t)\s+(?:what|who|the\s+(?:one|person|profile))\s+I\b|\b(?:neither|none)\s+of\s+(?:those|these|them|the\s+\w+)\b|\bthat['’]?s\s+(?:not\s+(?:right|it|correct)|wrong)\b|\b(?:wrong|different)\s+(?:person|people|one|profile|couple)\b|\byou\s+(?:misunderstood|got\s+(?:it|that)\s+wrong)\b|\bmisunderst/i;

/** Whether a message reads as a correction of the last question (worth asking the AI to merge). */
export function looksLikeCorrection(reply) {
  const text = String(reply || "").trim();
  return Boolean(text) && text.length <= MAX_CHARS && CORRECTION_RE.test(text);
}

/**
 * The AI's instructions: one standalone request, or the reply as it is. `answer` is what Genie
 * said last; `profile` is the page's person ({wtId, displayName}), so "Ann Heard" can be read as
 * Ann (Heard) Prévost (Heard-171).
 */
export function buildFollowupMergePrompt(previous, reply, { answer = "", profile = null } = {}) {
  return [
    "You help a genealogy chat assistant (Genie, on WikiTree) follow a conversation.",
    "The user's previous request could not be answered, was misunderstood, or Genie asked them for more detail. Then they sent a new message.",
    'If the new message adds detail to the previous request (who, where, which profile, a correction), reply with one standalone request that combines both, in the user\'s own words as far as possible. Keep WikiTree IDs (like Smith-123) and names exactly. Leave out details that only explain (such as "the profile is yellow privacy") unless they change what is asked.',
    "If Genie misunderstood the previous request, write it so it can't be misunderstood again: name the people it is about plainly, and say what is wanted in one short question or instruction (for example: \"Do Jean Prévost and Françoise Lamontagne have WikiTree profiles?\"). When it is about the profile the user is on, use that person's WikiTree ID.",
    "If the new message is a different request, reply with it unchanged.",
    'Return strict JSON only: {"merged": true, "prompt": "..."} or {"merged": false}',
    ...(profile?.wtId ? [`The user is on the profile of ${profile.displayName || profile.wtId} (${profile.wtId}).`] : []),
    `Previous request: ${String(previous || "").slice(0, MAX_CHARS)}`,
    ...(String(answer || "").trim() ? [`Genie's answer: ${String(answer).replace(/\s+/g, " ").trim().slice(0, 400)}`] : []),
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
export async function mergeFollowupWithUnanswered({ previous, reply, askAi, answer = "", profile = null }) {
  if (!String(previous || "").trim() || !String(reply || "").trim() || typeof askAi !== "function") return "";
  try {
    return readFollowupMerge(await askAi(buildFollowupMergePrompt(previous, reply, { answer, profile })), reply);
  } catch (error) {
    console.debug("wbe: follow-up merge failed", error);
    return "";
  }
}
