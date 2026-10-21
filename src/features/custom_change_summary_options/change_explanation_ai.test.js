import {
  aiChangeExplanation,
  changeExplanationPrompt,
  cleanAiAnswer,
  pageSubject,
  suggestChangeExplanation,
  textDiffForAi,
} from "./change_explanation_ai";

describe("textDiffForAi", () => {
  test("only the changed stretches, with the words that changed", () => {
    const before = "== Biography ==\nDennis was born in 1844.\n\nHe married.\n\n== Sources ==\n<references />";
    const after = "== Biography ==\nDennis was born in 1844.\n\nHe married Mary Smith in 1870.<ref>Marriage record</ref>\n\n== Sources ==\n<references />";
    const diff = textDiffForAi(before, after);
    expect(diff).toBe("He married{+ Mary Smith in 1870+}.{+<ref>Marriage record</ref>+}");
    expect(diff).not.toContain("Dennis was born");
  });

  test("added and removed lines, each stretch apart", () => {
    const diff = textDiffForAi("A.\nB.\nC.\nD.", "A.\nC.\nD.\n[[Category:Leeds, Yorkshire]]");
    // (The last line gains a line break, so it shows too.)
    expect(diff).toBe("[-B.-]\n…\nD.{+\n[[Category:Leeds, Yorkshire]]+}");
  });

  test("nothing changed, nothing to show", () => {
    expect(textDiffForAi("A.\nB.", "A.\nB.")).toBe("");
  });

  test("cut when long", () => {
    const diff = textDiffForAi("", "x".repeat(500), 100);
    expect(diff).toBe(`{+${"x".repeat(98)}\n(more changes not shown)`);
  });
});

describe("pageSubject", () => {
  test.each([
    ["Edit Profile of William A. Von Sossan (1851-1913) - WikiTree", "William A. Von Sossan (1851-1913)"],
    ["Editing Category:Leeds, Yorkshire - WikiTree FREE Family Tree", "Category:Leeds, Yorkshire"],
    ["Editing Space:Smith Family Letters", "Space:Smith Family Letters"],
  ])("%s", (title, subject) => {
    document.title = title;
    expect(pageSubject()).toBe(subject);
  });
});

describe("the prompt", () => {
  test("says what the page is, the rules, and the changes", () => {
    const prompt = changeExplanationPrompt({
      page: "profile",
      name: "William A. Von Sossan (1851-1913)",
      formChanges: ['birth date: "1851" → "24 May 1852"'],
      textDiff: "{+<ref>1881 census</ref>+}",
      plain: "Added 1 source citation; updated birth date.",
      max: 150,
    });
    expect(prompt).toContain("the WikiTree profile of William A. Von Sossan (1851-1913)");
    expect(prompt).toContain("at most 150 characters");
    expect(prompt).toContain('- birth date: "1851" → "24 May 1852"');
    expect(prompt).toContain("{+<ref>1881 census</ref>+}");
    expect(prompt).toContain("Added 1 source citation; updated birth date.");
  });

  test("a category page, no form", () => {
    const prompt = changeExplanationPrompt({ page: "category", name: "Category:Leeds, Yorkshire", textDiff: "{+x+}", max: 200 });
    expect(prompt).toContain('the WikiTree category page "Category:Leeds, Yorkshire"');
    expect(prompt).toContain("at most 200 characters");
    expect(prompt).not.toContain("Changed in the form");
  });
});

describe("cleanAiAnswer", () => {
  test.each([
    ["Added 1881 census for Leeds; corrected birth year to 1852.", "Added 1881 census for Leeds; corrected birth year to 1852."],
    ['"Added 1881 census."', "Added 1881 census."],
    ["Change explanation: Added 1881 census.", "Added 1881 census."],
    ["```\nAdded **1881** census.\n```", "Added 1881 census."],
    ["\n\nAdded 1881 census.\nI hope this helps!", "Added 1881 census."],
    ["   ", ""],
  ])("%j", (answer, clean) => {
    expect(cleanAiAnswer(answer)).toBe(clean);
  });

  test("cut to fit", () => {
    expect(cleanAiAnswer("Added the 1881 census for Leeds and corrected the birth year", 30)).toBe("Added the 1881 census for…");
  });
});

describe("asking the AI", () => {
  const config = { provider: "openai", key: "test-key", model: "test-model" };

  test("sends the prompt with the shared settings", async () => {
    const send = jest.fn(async () => ({ success: true, response: '"Added 1881 census."' }));
    expect(await aiChangeExplanation(config, "the prompt", { send })).toBe("Added 1881 census.");
    expect(send).toHaveBeenCalledWith({ action: "chatWithAI", provider: "openai", key: "test-key", model: "test-model", prompt: "the prompt" });
  });

  test("an error or an empty answer is an error", async () => {
    await expect(aiChangeExplanation(config, "p", { send: async () => ({ success: false, error: "quota exceeded" }) })).rejects.toThrow("quota exceeded");
    await expect(aiChangeExplanation(config, "p", { send: async () => ({ success: true, response: "" }) })).rejects.toThrow("empty");
  });
});

describe("suggestChangeExplanation", () => {
  const page = () => {
    document.title = "Edit Profile of William A. Von Sossan (1851-1913) - WikiTree";
    document.body.innerHTML = `<form id="editform"><input id="mBirthDate" value="1851">
      <textarea id="wpTextbox1">== Biography ==\nA.</textarea><input id="wpSummary" maxlength="150"></form>`;
    document.querySelector("#mBirthDate").value = "24 May 1852";
  };
  const live = "== Biography ==\nA.<ref>1881 census</ref>";
  const PLAIN = "Added 1 source citation; updated birth date.";
  const withKey = async () => ({ provider: "openai", key: "test-key", model: "m" });

  test("the AI words it, from the changes", async () => {
    page();
    const send = jest.fn(async () => ({ success: true, response: "Added 1881 census; corrected birth date to 24 May 1852." }));
    const onAi = jest.fn();
    const result = await suggestChangeExplanation({ live, getConfig: withKey, send, onAi });
    expect(result).toEqual({ text: "Added 1881 census; corrected birth date to 24 May 1852.", plain: PLAIN, byAi: true, fromDraft: false });
    expect(onAi).toHaveBeenCalled();
    const { prompt } = send.mock.calls[0][0];
    expect(prompt).toContain('birth date: "1851" → "24 May 1852"');
    expect(prompt).toContain("{+<ref>1881 census</ref>+}");
  });

  test("without a key, or with the AI off: the plain one, and no AI", async () => {
    page();
    const send = jest.fn();
    expect(await suggestChangeExplanation({ live, getConfig: async () => ({ key: "" }), send })).toEqual({ text: PLAIN, plain: PLAIN, byAi: false, fromDraft: false });
    expect(await suggestChangeExplanation({ live, useAi: false, getConfig: withKey, send })).toEqual({ text: PLAIN, plain: PLAIN, byAi: false, fromDraft: false });
    expect(send).not.toHaveBeenCalled();
  });

  test("the AI failing: the plain one, and why", async () => {
    page();
    const result = await suggestChangeExplanation({ live, getConfig: withKey, send: async () => ({ success: false, error: "quota exceeded" }) });
    expect(result).toEqual({ text: PLAIN, plain: PLAIN, byAi: false, fromDraft: false, aiError: "quota exceeded" });
  });

  test("nothing changed: nothing asked", async () => {
    page();
    document.querySelector("#mBirthDate").value = "1851";
    const send = jest.fn();
    expect(await suggestChangeExplanation({ live: "== Biography ==\nA.", getConfig: withKey, send })).toEqual({ text: "", plain: "", byAi: false, fromDraft: false });
    expect(send).not.toHaveBeenCalled();
  });

  describe("with a draft", () => {
    // WikiTree's comparison of the saved profile and the draft, read as pageChanges reads the page.
    const DRAFT = {
      form: [{ label: "death place", from: "", to: "Allentown, Lehigh, Pennsylvania" }],
      before: "A.",
      after: "A.<ref>Find a Grave</ref>",
    };

    test("the changes since the profile was saved, not since the page loaded", async () => {
      page();
      document.querySelector("#mBirthDate").value = "1851";
      const send = jest.fn(async () => ({ success: true, response: "Added death place Allentown with a Find a Grave citation." }));
      const onDraft = jest.fn();
      const getDraftChanges = jest.fn(async (doc, options) => (options.onDraft(), DRAFT));
      const result = await suggestChangeExplanation({ live: "== Biography ==\nA.", getConfig: withKey, send, onDraft, getDraftChanges });
      expect(onDraft).toHaveBeenCalled();
      expect(result).toEqual({
        text: "Added death place Allentown with a Find a Grave citation.",
        plain: "Added 1 source citation; updated death place.",
        byAi: true,
        fromDraft: true,
      });
      const { prompt } = send.mock.calls[0][0];
      expect(prompt).toContain('death place: (empty) → "Allentown, Lehigh, Pennsylvania"');
      expect(prompt).toContain("{+<ref>Find a Grave</ref>+}");
    });

    test("the draft couldn't be compared: the changes since the page loaded, and why", async () => {
      page();
      const getDraftChanges = async () => {
        throw new Error("WikiTree didn't save the draft");
      };
      const result = await suggestChangeExplanation({ live, useAi: false, getDraftChanges });
      expect(result).toEqual({ text: PLAIN, plain: PLAIN, byAi: false, fromDraft: false, draftError: "WikiTree didn't save the draft" });
    });
  });
});
