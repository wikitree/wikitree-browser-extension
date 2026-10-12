import { buildFollowupMergePrompt, mergeFollowupWithUnanswered, readFollowupMerge } from "./chat_followup_merge";

const ELAINE_Q = "what's the most closely connected person with the surname bexar or coker?";
const ELAINE_REPLY = "from the person's page I'm on, WikiTree member Atkinson-5584. The profile is yellow privacy.";

describe("readFollowupMerge", () => {
  test("a merged request", () => {
    expect(
      readFollowupMerge('{"merged": true, "prompt": "most closely connected person to Atkinson-5584 with the surname Bexar or Coker"}')
    ).toBe("most closely connected person to Atkinson-5584 with the surname Bexar or Coker");
  });
  test("fenced JSON", () => {
    expect(readFollowupMerge('```json\n{"merged": true, "prompt": "Smith-1\'s parents"}\n```')).toBe("Smith-1's parents");
  });
  test("a new request, junk, or the reply unchanged → keep the reply", () => {
    expect(readFollowupMerge('{"merged": false}')).toBe("");
    expect(readFollowupMerge("Sure! Here you go")).toBe("");
    expect(readFollowupMerge('{"merged": true, "prompt": ""}')).toBe("");
    expect(readFollowupMerge('{"merged": true, "prompt": "my fan chart"}', "My fan chart")).toBe("");
  });
});

describe("mergeFollowupWithUnanswered", () => {
  test("asks the AI with both messages and returns its request", async () => {
    let sent = "";
    const merged = await mergeFollowupWithUnanswered({
      previous: ELAINE_Q,
      reply: ELAINE_REPLY,
      askAi: async (prompt) => {
        sent = prompt;
        return '{"merged": true, "prompt": "most closely connected person to Atkinson-5584 with the surname Bexar or Coker"}';
      },
    });
    expect(sent).toContain(`Previous request: ${ELAINE_Q}`);
    expect(sent).toContain(`New message: ${ELAINE_REPLY}`);
    expect(merged).toBe("most closely connected person to Atkinson-5584 with the surname Bexar or Coker");
  });
  test("nothing to merge, no AI, or the AI fails → keep the reply", async () => {
    expect(await mergeFollowupWithUnanswered({ previous: "", reply: "x", askAi: async () => "{}" })).toBe("");
    expect(await mergeFollowupWithUnanswered({ previous: "a", reply: "b" })).toBe("");
    expect(
      await mergeFollowupWithUnanswered({
        previous: "a",
        reply: "b",
        askAi: async () => {
          throw new Error("offline");
        },
      })
    ).toBe("");
  });
  test("the prompt keeps WikiTree IDs and asks for JSON", () => {
    const prompt = buildFollowupMergePrompt("q", "r");
    expect(prompt).toMatch(/WikiTree IDs/);
    expect(prompt).toMatch(/strict JSON/);
  });
});
