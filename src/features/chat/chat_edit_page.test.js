import { editCommandChips, editMenuItem, enhancedEditorOn, insertIntoBiography, parseEditCommand } from "./chat_edit_page";

const MENU = ["Auto Categories", "Auto Bio", "Automated corrections", "Birth and Parent Details", "Death Details", "Sibling List", "Spouse and Child Details"];
const menuHtml = (titles = MENU) =>
  `<div id="editToolbarExt">${titles.map((title) => `<a class="editToolbarClick" data-id="${title}">${title}</a>`).join("")}</div>`;

const on = (prompt) => parseEditCommand(prompt, { onEditPage: true })?.title || null;

describe("parseEditCommand", () => {
  test.each([
    ["Add birth", "Birth and Parent Details"],
    ["add birth and parents", "Birth and Parent Details"],
    ["add the parents", "Birth and Parent Details"],
    ["birth and parent details", "Birth and Parent Details"],
    ["Add death", "Death Details"],
    ["add death details to the bio", "Death Details"],
    ["Please write the death paragraph.", "Death Details"],
    ["death details", "Death Details"],
    ["add spouses", "Spouse and Child Details"],
    ["add marriages and children", "Spouse and Child Details"],
    ["add children", "Spouse and Child Details"],
    ["Add siblings", "Sibling List"],
    ["sibling list", "Sibling List"],
    ["auto categories", "Auto Categories"],
    ["Auto-Categories", "Auto Categories"],
    ["add categories", "Auto Categories"],
    ["auto bio", "Auto Bio"],
    ["Run AutoBio", "Auto Bio"],
    ["automated corrections", "Automated corrections"],
    ["fix formatting", "Automated corrections"],
  ])("%s → %s", (prompt, title) => {
    expect(on(prompt)).toBe(title);
  });

  test.each(["death", "siblings", "add death date to Smith", "who are her siblings?", "write a bio", "add categories for Devon", "add a source", "births in Devon 1820s"])(
    "declines %s",
    (prompt) => {
      expect(on(prompt)).toBeNull();
    }
  );

  test("only on the edit page", () => {
    expect(parseEditCommand("add death")).toBeNull();
    expect(parseEditCommand("auto categories", { onEditPage: false })).toBeNull();
  });

  test("text items carry their Family Lists name; the others are run", () => {
    expect(parseEditCommand("add death", { onEditPage: true })).toMatchObject({ kind: "text", list: "death" });
    expect(parseEditCommand("auto bio", { onEditPage: true })).toMatchObject({ kind: "run" });
  });
});

describe("the edit menu", () => {
  test("finds an item that is on the menu, not one that is off", () => {
    document.body.innerHTML = menuHtml(["Death Details"]);
    expect(editMenuItem("Death Details")).not.toBeNull();
    expect(editMenuItem("Auto Bio")).toBeNull();
  });

  test("chips: the menu's items, Add death only with a death date or place", () => {
    document.body.innerHTML = menuHtml() + '<input id="mDeathDate" value=""><input id="mDeathLocation" value="">';
    expect(editCommandChips()).toEqual(["Add birth", "Add spouses", "Add siblings", "Auto Categories", "Auto Bio", "Fix formatting"]);
    document.querySelector("#mDeathDate").value = "1901";
    expect(editCommandChips()).toContain("Add death");
    document.body.innerHTML = menuHtml(["Sibling List"]);
    expect(editCommandChips()).toEqual(["Add siblings"]);
  });
});

describe("inserting", () => {
  test("goes in at the box's cursor", () => {
    document.body.innerHTML = '<textarea id="wpTextbox1">== Biography ==\nEnd.</textarea>';
    const box = document.querySelector("#wpTextbox1");
    box.selectionStart = box.selectionEnd = "== Biography ==\n".length;
    expect(insertIntoBiography("Born 1850.\n")).toBe(true);
    expect(box.value).toBe("== Biography ==\nBorn 1850.\nEnd.");
  });

  test("not with the enhanced editor on: its text isn't in the box", () => {
    document.body.innerHTML = '<input id="toggleMarkupColor" value="Turn Off Enhanced Editor"><textarea id="wpTextbox1">Bio</textarea>';
    expect(enhancedEditorOn()).toBe(true);
    expect(insertIntoBiography("x")).toBe(false);
    expect(document.querySelector("#wpTextbox1").value).toBe("Bio");
    document.querySelector("#toggleMarkupColor").value = "Turn On Enhanced Editor";
    expect(enhancedEditorOn()).toBe(false);
  });
});

import { editFormFacts, editPageQualityMessage, editPageQualityPerson, isMissingCheckPrompt } from "./chat_edit_page";
import { profileQuality } from "./chat_profile_quality_data";

describe("what's missing, on the edit page", () => {
  test.each(["What's missing?", "what is still missing from this profile", "check this profile", "Gold Standard check", "How complete is this profile?", "what does this bio need?"])(
    "%s",
    (prompt) => {
      expect(isMissingCheckPrompt(prompt, { onEditPage: true })).toBe(true);
      expect(isMissingCheckPrompt(prompt)).toBe(false);
    }
  );
  test.each(["what's missing from my tree?", "how complete is my tree?", "check Smith-123"])("declines %s", (prompt) => {
    expect(isMissingCheckPrompt(prompt, { onEditPage: true })).toBe(false);
  });

  const FORM = `<form id="editform">
    <input id="mBirthDate" value="24 May 1844"><input type="radio" name="mStatus_BirthDate" value="certain" checked><input type="radio" name="mStatus_BirthDate" value="guess">
    <input id="mBirthLocation" value="Carbon, Pennsylvania"><input type="radio" name="mStatus_BirthLocation" value="certain">
    <input id="mDeathDate" value="8 Dec 1908"><input type="radio" name="mStatus_DeathDate" value="certain" checked>
    <input id="mDeathLocation" value="">
    <input type="radio" name="mStatus_Father" value="confirmed" checked><input type="radio" name="mStatus_Mother" value="confirmed" checked>
    <input type="checkbox" name="mStatus_Spouse" value="blank" checked><input type="checkbox" name="mNoChildren" value="1">
  </form>`;

  test("reads the facts, statuses and boxes in the form", () => {
    document.body.innerHTML = FORM;
    expect(editFormFacts()).toEqual({
      BirthDate: "1844-00-00",
      BirthLocation: "Carbon, Pennsylvania",
      DeathDate: "1908-00-00",
      DeathLocation: "",
      statuses: { BirthDate: "certain", BirthLocation: undefined, DeathDate: "certain", DeathLocation: undefined, Father: "confirmed", Mother: "confirmed" },
      noMoreSpouses: true,
      noMoreChildren: false,
    });
    document.body.innerHTML = "<p>not an edit page</p>";
    expect(editFormFacts()).toBeNull();
  });

  test("the form wins over the saved profile; the relationships come from the API", () => {
    document.body.innerHTML = FORM;
    const api = { Name: "Nothstein-51", Father: 12, Mother: 13, Spouses: [], NoChildren: 1, IsLiving: 1, ResearchStatus: 0, DataStatus: { BirthLocation: "certain", Spouse: "" } };
    const person = editPageQualityPerson(api, editFormFacts(), 'Born.<ref>a</ref> Parents.<ref>b</ref>');
    expect(person).toMatchObject({ BirthDate: "1844-00-00", DeathLocation: "", IsLiving: 0, NoChildren: 0, Father: 12 });
    // (the saved birth place status stands when the form's radio isn't checked)
    expect(person.DataStatus).toMatchObject({ BirthDate: "certain", BirthLocation: "certain", Spouse: "blank", Father: "confirmed" });
    const quality = profileQuality(person);
    expect(quality.missing).toEqual(['"no more children" box', "death place", "inline source citations"]);
    expect(editPageQualityMessage("Dennis Nothstein", quality)).toBe(
      [
        `Dennis Nothstein, as it is in the form now (unsaved): ${Math.round(100 * quality.score)}% of the Gold Standard checklist.`,
        'Still to do: "no more children" box, death place, inline source citations.',
        "Each fact (birth, parents, each marriage, death) needs its own inline <ref> citation.",
      ].join("\n")
    );
  });

  test("Gold Standard counts as complete", () => {
    const quality = profileQuality(editPageQualityPerson({ ResearchStatus: 60 }, null, ""));
    expect(editPageQualityMessage("Ann Lee", quality)).toBe(
      "Ann Lee, as it is in the form now (unsaved): 100% of the Gold Standard checklist.\nIts Research Status is Gold Standard, so it counts as complete."
    );
  });
});

import { isChangeExplanationPrompt } from "./chat_edit_page";

describe("change explanation", () => {
  test.each(["Suggest a change explanation", "change explanation", "edit summary", "summarize my changes", "What did I change?", "what's changed"])("%s", (prompt) => {
    expect(isChangeExplanationPrompt(prompt, { onEditPage: true })).toBe(true);
    expect(isChangeExplanationPrompt(prompt)).toBe(false);
  });

});

describe("peekPastPanel", () => {
  const { peekPastPanel } = require("./chat_edit_page");
  const rect = (top, left, height, width) => ({ top, left, height, width, bottom: top + height, right: left + width });
  let panel;
  let box;
  const place = (el, r) => (el.getBoundingClientRect = () => r);

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `<div id="panel"><div class="chat-messages"></div></div><input id="wpSummary">`;
    panel = document.getElementById("panel");
    box = document.getElementById("wpSummary");
    place(panel, rect(90, 20, 600, 620));
    place(box, rect(480, 40, 30, 700));
  });
  afterEach(() => jest.useRealTimers());

  test("shrinks the panel to clear the box, then grows it back", () => {
    panel.style.maxHeight = "";
    expect(peekPastPanel(panel, box)).toBe(true);
    expect(panel.style.maxHeight).toBe("378px"); // 480 - 12 - 90
    jest.advanceTimersByTime(350 + 4000);
    expect(panel.style.maxHeight).toBe("600px");
    jest.advanceTimersByTime(350);
    expect(panel.style.maxHeight).toBe("");
    expect(panel.style.transition).toBe("");
  });

  test("using the panel grows it back at once", () => {
    peekPastPanel(panel, box);
    panel.querySelector(".chat-messages").dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(panel.style.maxHeight).toBe("600px");
    jest.advanceTimersByTime(350);
    expect(panel.style.maxHeight).toBe("");
  });

  test("keeps a max-height the panel already had", () => {
    panel.style.maxHeight = "500px";
    peekPastPanel(panel, box);
    jest.advanceTimersByTime(350 + 4000 + 350);
    expect(panel.style.maxHeight).toBe("500px");
  });

  test("leaves the panel alone when it isn't over the box", () => {
    place(box, rect(480, 700, 30, 300));
    expect(peekPastPanel(panel, box)).toBe(false);
    expect(panel.style.maxHeight).toBe("");
  });

  test("leaves the panel alone when the room above the box is too short", () => {
    place(box, rect(250, 40, 30, 700));
    expect(peekPastPanel(panel, box)).toBe(false);
  });

  test("a second peek ends the first one first", () => {
    panel.style.maxHeight = "500px";
    peekPastPanel(panel, box);
    peekPastPanel(panel, box);
    jest.advanceTimersByTime(350 + 4000 + 350);
    expect(panel.style.maxHeight).toBe("500px");
  });
});
