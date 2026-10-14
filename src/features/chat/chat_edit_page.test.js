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

import { bioChanges, changeExplanation, editFormChanges, fillChangeExplanation, isChangeExplanationPrompt } from "./chat_edit_page";

describe("change explanation", () => {
  test.each(["Suggest a change explanation", "change explanation", "edit summary", "summarize my changes", "What did I change?", "what's changed"])("%s", (prompt) => {
    expect(isChangeExplanationPrompt(prompt, { onEditPage: true })).toBe(true);
    expect(isChangeExplanationPrompt(prompt)).toBe(false);
  });

  test("the form fields changed since the page loaded", () => {
    document.body.innerHTML = `<form id="editform">
      <input id="mBirthDate" value="1844"><input id="mDeathLocation" value="">
      <input type="radio" name="mStatus_BirthDate" value="guess" checked><input type="radio" name="mStatus_BirthDate" value="certain">
      <input type="checkbox" name="mNoChildren" value="1"><input type="checkbox" name="mStatus_Spouse" value="blank" checked>
    </form>`;
    expect(editFormChanges()).toEqual([]);
    document.querySelector("#mDeathLocation").value = "Allentown, Lehigh, Pennsylvania";
    document.querySelector("input[name='mStatus_BirthDate'][value='certain']").checked = true;
    document.querySelector("input[name='mNoChildren']").checked = true;
    document.querySelector("input[name='mStatus_Spouse']").checked = false;
    expect(editFormChanges()).toEqual(["death place", "birth date status", 'unticked "no more spouses"', 'ticked "no more children"']);
  });

  test("the biography's changes", () => {
    const before = "[[Category:Carbon County, Pennsylvania]]\n{{Unsourced}}\n== Biography ==\nDennis was born.\n== Sources ==\n<references />";
    const after =
      '[[Category:Carbon County, Pennsylvania]]\n[[Category:Highland Memorial Park Cemetery, Allentown, Pennsylvania]]\n== Biography ==\nDennis was born.<ref>Birth</ref>\n\nDennis died in 1908.<ref name="Death_1">Grave</ref>\n== Research Notes ==\n== Sources ==\n<references />';
    expect(bioChanges(before, after)).toEqual({
      refsAdded: 2,
      refsRemoved: 0,
      categoriesAdded: ["Highland Memorial Park Cemetery, Allentown, Pennsylvania"],
      categoriesRemoved: [],
      templatesAdded: [],
      templatesRemoved: ["Unsourced"],
      sectionsAdded: ["Research Notes"],
      textChanged: true,
    });
    expect(bioChanges(before, before).textChanged).toBe(false);
  });

  test("the explanation", () => {
    const bio = bioChanges("== Biography ==\nA.", "== Biography ==\nA.<ref>x</ref>\nB.<ref>y</ref>\n[[Category:Lehigh County, Pennsylvania]]");
    expect(changeExplanation(["death place", 'ticked "no more children"'], bio)).toBe(
      'Added 2 source citations; improved the biography; added Category: Lehigh County, Pennsylvania; updated death place; ticked "no more children".'
    );
    expect(changeExplanation([], bioChanges("x", "x"))).toBe("");
  });

  test("goes after anything already in the box, once", () => {
    document.body.innerHTML = '<input id="wpSummary" value="Fixing typos.">';
    expect(fillChangeExplanation("Added 1 source citation.")).toBe(true);
    fillChangeExplanation("Added 1 source citation.");
    expect(document.querySelector("#wpSummary").value).toBe("Fixing typos. Added 1 source citation.");
  });
});
