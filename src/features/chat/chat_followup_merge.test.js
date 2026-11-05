import { buildFollowupMergePrompt, looksLikeCorrection, mergeFollowupWithUnanswered, readFollowupMerge } from "./chat_followup_merge";

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

describe("looksLikeCorrection (Heard-171, 2026-10-31)", () => {
  test.each([
    "I asked about Ann Heard",
    "I meant the adoptive parents",
    "Neither of those people are married to a Jean Prévost.",
    "None of them is right",
    "No, I want her adoptive parents",
    "That's not what I asked",
    "That's not who I meant",
    "wrong person",
    "You misunderstood me",
  ])("%s", (text) => expect(looksLikeCorrection(text)).toBe(true));
  test.each(["No", "Who are Ann Heard's parents?", "her children", "Smith-123", "Show me a fan chart"])("not: %s", (text) =>
    expect(looksLikeCorrection(text)).toBe(false)
  );
});

describe("a correction after a misunderstood question", () => {
  test("the prompt gives the profile person and Genie's answer", () => {
    const prompt = buildFollowupMergePrompt(
      "This profile mentions that Ann Heard's new adoptive parents were Jean Prévost and Françoise Lamontagne. Do those people have WikiTree profiles?",
      "I asked about Ann Heard",
      { answer: 'I found 27 people named "This profile mentions that Ann Heard". Which one did you mean?', profile: { wtId: "Heard-171", displayName: "Ann (Heard) Prévost" } }
    );
    expect(prompt).toContain("The user is on the profile of Ann (Heard) Prévost (Heard-171).");
    expect(prompt).toContain("Genie's answer: I found 27 people named");
    expect(prompt).toMatch(/misunderstood/);
  });
  test("no profile or answer → those lines are left out", () => {
    const prompt = buildFollowupMergePrompt("q", "r");
    expect(prompt).not.toMatch(/The user is on the profile/);
    expect(prompt).not.toMatch(/Genie's answer/);
  });
  test("passes the answer and profile on to the AI", async () => {
    let sent = "";
    await mergeFollowupWithUnanswered({
      previous: "q",
      reply: "I meant Smith-1",
      answer: "Couldn't find that",
      profile: { wtId: "Smith-1", displayName: "John Smith" },
      askAi: async (text) => {
        sent = text;
        return '{"merged": false}';
      },
    });
    expect(sent).toContain("Genie's answer: Couldn't find that");
    expect(sent).toContain("(Smith-1)");
  });
});
