import * as explanation from "./change_explanation";
import * as ai from "./change_explanation_ai";
import { enhancedEditorOn } from "../../core/enhancedEditor";
import { addChangeExplanationButton, summaryAction } from "./change_explanation_button";

// The profile edit page's Save Changes box, as on WikiTree (2026-10-21), with a biography and a death date.
const profilePage = (summary = "") => `<form id="editform">
  <input id="mDeathDate" value="">
  <textarea id="wpTextbox1">== Biography ==\nA.</textarea>
  <div class="mb-4">
    <label for="wpSummary">Change Explanation:</label>
    <div class="input-group">
      <input class="form-control" type="text" id="wpSummary" maxlength="150" value="${summary}">
      <span class="input-group-text"><a href="/wiki/Help:Change_Explanations">?</a></span>
    </div>
  </div>
</form>`;
// A category page's: the box on its own.
const categoryPage = () => `<form id="editform">
  <textarea id="wpTextbox1">Leeds.</textarea>
  <div class="editOptions">Summary: <input type="text" id="wpSummary" maxlength="200" value=""><br></div>
</form>`;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const status = () => document.getElementById("wbe-suggest-summary-status");
const summary = () => document.getElementById("wpSummary");
const choice = (label) => [...status().querySelectorAll("button")].find((button) => button.textContent === label);

const NO_AI = async () => ({ key: "" });

// The helpers as the button loads them, with the AI settings and the AI given here.
function helpers({ readEnhancedEditor = async () => null, getConfig = NO_AI, send, getDraftChanges } = {}) {
  return {
    ...explanation,
    ...ai,
    suggestChangeExplanation: (args) => ai.suggestChangeExplanation({ ...args, getConfig, send, ...(getDraftChanges && { getDraftChanges }) }),
    enhancedEditorOn,
    readEnhancedEditor,
  };
}

function setUp(summaryText = "", options = {}) {
  document.body.innerHTML = profilePage(summaryText);
  const load = jest.fn(async () => helpers(options));
  const button = addChangeExplanationButton(document, { load, useAi: options.useAi ?? true });
  return { button, load };
}

// An edit: a death date and a citation.
const edit = () => {
  document.getElementById("mDeathDate").value = "1901";
  document.getElementById("wpTextbox1").value = "== Biography ==\nA.<ref>x</ref>";
};
const SUGGESTION = "Added 1 source citation; updated death date.";

describe("summaryAction", () => {
  test.each([
    ["", "Added X.", "", "fill"],
    ["   ", "Added X.", "", "fill"],
    ["Added X.", "Added Y.", "Added X.", "fill"],
    ["Fixing typos. Added X.", "Added X.", "", "same"],
    ["Fixing typos.", "Added X.", "", "ask"],
    ["Added X. And more.", "Added Y.", "Added X.", "ask"],
  ])("%j with %j (last %j): %s", (current, suggestion, lastFilled, expected) => {
    expect(summaryAction(current, suggestion, lastFilled)).toBe(expected);
  });
});

describe("the Suggest button", () => {
  test("sits in the Change Explanation box's input group, once", () => {
    const { button } = setUp();
    expect(button.parentElement.classList.contains("input-group")).toBe(true);
    expect(summary().nextElementSibling).toBe(button);
    expect(button.type).toBe("button");
    expect(button.textContent).toBe("Suggest");
    expect(addChangeExplanationButton(document)).toBe(button);
    expect(document.querySelectorAll("#wbe-suggest-summary-button")).toHaveLength(1);
    expect(status().hidden).toBe(true);
  });

  test("on a category page, the box goes into an input group with it", async () => {
    document.body.innerHTML = categoryPage();
    const button = addChangeExplanationButton(document, { page: "category", load: async () => helpers() });
    const group = button.parentElement;
    expect(group.classList.contains("input-group")).toBe(true);
    expect(group.classList.contains("wbe-suggest-summary-group")).toBe(true);
    expect([...group.children]).toEqual([summary(), button]);
    expect(group.nextElementSibling).toBe(status());
    document.getElementById("wpTextbox1").value = "Leeds.\n[[Category:Yorkshire]]";
    button.click();
    await flush();
    expect(summary().value).toBe("Added Category: Yorkshire.");
  });

  test("no box, no button", () => {
    document.body.innerHTML = "<p>Not an edit page</p>";
    expect(addChangeExplanationButton(document)).toBeNull();
  });

  test("fills an empty box", async () => {
    const { button } = setUp();
    edit();
    button.click();
    await flush();
    expect(summary().value).toBe(SUGGESTION);
    expect(status().textContent).toMatch(/^Filled in from your changes/);
    expect(button.disabled).toBe(false);
  });

  test("says so when nothing has changed", async () => {
    const { button } = setUp();
    button.click();
    await flush();
    expect(summary().value).toBe("");
    expect(status().textContent).toMatch(/Nothing has changed/);
  });

  test("asks before touching what the member typed: add to it", async () => {
    const { button } = setUp("Fixing typos.");
    edit();
    button.click();
    await flush();
    expect(summary().value).toBe("Fixing typos.");
    expect(status().textContent).toContain(SUGGESTION);
    // (Together, on a line of their own under the suggestion.)
    const row = choice("Add to current").parentElement;
    expect(row.className).toBe("wbe-suggest-summary-choices");
    expect([...row.children].map((button) => button.textContent)).toEqual(["Add to current", "Replace current", "Cancel"]);
    choice("Add to current").click();
    expect(summary().value).toBe(`Fixing typos. ${SUGGESTION}`);
    // Clicked again: what the member typed is still theirs.
    button.click();
    await flush();
    expect(summary().value).toBe(`Fixing typos. ${SUGGESTION}`);
    expect(status().textContent).toMatch(/already in the box/);
    document.getElementById("mDeathDate").value = "";
    button.click();
    await flush();
    expect(summary().value).toBe(`Fixing typos. ${SUGGESTION}`);
    expect(choice("Replace current")).toBeTruthy();
  });

  test("no room after what the member typed: offers to replace it", async () => {
    const typed = "Fixing typos and adding the 1881 census for Leeds, which I found on FamilySearch; checked the parish register for the baptism date too.";
    const { button } = setUp(typed);
    edit();
    button.click();
    await flush();
    choice("Add to current").click();
    expect(summary().value).toBe(typed);
    expect(status().textContent).toMatch(/^There's no room for it after the text already in the box\./);
    choice("Replace current").click();
    expect(summary().value).toBe(SUGGESTION);
  });

  test("asks before touching what the member typed: replace or cancel", async () => {
    const { button } = setUp("Fixing typos.");
    edit();
    button.click();
    await flush();
    choice("Cancel").click();
    expect(summary().value).toBe("Fixing typos.");
    expect(status().hidden).toBe(true);
    button.click();
    await flush();
    choice("Replace current").click();
    expect(summary().value).toBe(SUGGESTION);
  });

  test("replaces its own earlier suggestion without asking", async () => {
    const { button } = setUp();
    edit();
    button.click();
    await flush();
    document.getElementById("mDeathDate").value = "";
    button.click();
    await flush();
    expect(summary().value).toBe("Added 1 source citation.");
  });

  test("reads the text from the Enhanced Editor when it's on", async () => {
    const read = jest.fn(async () => ({ text: "== Biography ==\nA.<ref>x</ref>", from: 0, to: 0 }));
    const { button } = setUp("", { readEnhancedEditor: read });
    document.getElementById("wpTextbox1").insertAdjacentHTML("afterend", '<div class="CodeMirror"></div>');
    button.click();
    await flush();
    expect(read).toHaveBeenCalled();
    expect(summary().value).toBe("Added 1 source citation.");
  });

  test("shows an error when the Enhanced Editor can't be read", async () => {
    const { button } = setUp("");
    document.getElementById("wpTextbox1").insertAdjacentHTML("afterend", '<div class="CodeMirror"></div>');
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    button.click();
    await flush();
    expect(summary().value).toBe("");
    expect(status().textContent).toBe("Couldn't suggest one: the text in the Enhanced Editor couldn't be read.");
    expect(status().classList.contains("wbe-suggest-summary-error")).toBe(true);
    expect(button.disabled).toBe(false);
    error.mockRestore();
  });

  describe("with a draft", () => {
    // What WikiTree's comparison of the saved profile and the draft showed.
    const DRAFT = { form: [{ label: "death place", from: "Fort Jennings", to: "Allentown" }], before: "A.", after: "A." };

    test("explains the differences from the saved profile, and says so", async () => {
      let compared;
      const getDraftChanges = jest.fn((doc, { onDraft }) => (onDraft(), new Promise((resolve) => (compared = resolve))));
      const { button } = setUp("", { getDraftChanges });
      // (Saving the draft outlines an empty box in red.)
      summary().style.borderColor = "red";
      button.click();
      await flush();
      expect(status().textContent).toBe("Saving your draft and comparing it with the saved profile…");
      compared(DRAFT);
      await flush();
      expect(summary().value).toBe("Updated death place.");
      expect(status().textContent).toBe("Filled in from the differences between the saved profile and your draft. Edit it as you like.");
      expect(summary().style.borderColor).toBe("");
    });

    test("a draft the same as the saved profile", async () => {
      const { button } = setUp("", { getDraftChanges: async () => ({ form: [], before: "A.", after: "A." }) });
      button.click();
      await flush();
      expect(status().textContent).toBe("Your draft is the same as the saved profile, so there's nothing to explain yet.");
    });

    test("not compared: the changes since the page loaded, and why", async () => {
      const getDraftChanges = async () => {
        throw new Error("WikiTree didn't save the draft");
      };
      const { button } = setUp("", { getDraftChanges });
      edit();
      button.click();
      await flush();
      expect(summary().value).toBe(SUGGESTION);
      expect(status().textContent).toBe(
        "Filled in from your changes. Edit it as you like. (Your draft couldn't be compared with the saved profile: WikiTree didn't save the draft. This covers only the changes since the page loaded.)",
      );
    });
  });

  describe("with an AI key", () => {
    const getConfig = async () => ({ provider: "openai", key: "test-key", model: "m" });
    // (For the shaking tree's address.)
    beforeAll(() => {
      global.chrome = { runtime: { getURL: (path) => `chrome-extension://wbe/${path}` } };
    });
    afterAll(() => {
      delete global.chrome;
    });

    test("the AI words it, and says so", async () => {
      let answer;
      const send = jest.fn(() => new Promise((resolve) => (answer = resolve)));
      const { button } = setUp("", { getConfig, send });
      edit();
      button.click();
      await flush();
      expect(status().textContent).toBe("Asking AI…");
      expect(status().querySelector("img.wbe-suggest-summary-tree").getAttribute("src")).toMatch(/images\/tree\.gif$/);
      expect(button.getAttribute("aria-busy")).toBe("true");
      answer({ success: true, response: "Added a citation; added death date 1901." });
      await flush();
      expect(summary().value).toBe("Added a citation; added death date 1901.");
      expect(status().textContent).toMatch(/^AI wrote this from your changes/);
      expect(button.hasAttribute("aria-busy")).toBe(false);
    });

    test("the AI failing: the plain summary, and why", async () => {
      const send = async () => ({ success: false, error: "quota exceeded" });
      const { button } = setUp("", { getConfig, send });
      edit();
      button.click();
      await flush();
      expect(summary().value).toBe(SUGGESTION);
      expect(status().textContent).toContain("(The AI couldn't answer: quota exceeded. This is the plain summary.)");
    });

    test("not with the option off", async () => {
      const send = jest.fn();
      const { button } = setUp("", { getConfig, send, useAi: false });
      edit();
      button.click();
      await flush();
      expect(summary().value).toBe(SUGGESTION);
      expect(send).not.toHaveBeenCalled();
    });
  });
});
