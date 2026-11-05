import {
  bioChanges,
  changeExplanation,
  editFormChangeDetails,
  editFormChanges,
  fillChangeExplanation,
  fitSummary,
  suggestedChangeExplanation,
  summaryMax,
} from "./change_explanation";

describe("change explanation", () => {
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
      refsEdited: false,
      formattingOnly: false,
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
    expect(fillChangeExplanation("Added 1 source citation.")).toBe("filled");
    expect(fillChangeExplanation("Added 1 source citation.")).toBe("same");
    expect(document.querySelector("#wpSummary").value).toBe("Fixing typos. Added 1 source citation.");
  });

  test("or instead of it, with replace", () => {
    document.body.innerHTML = '<input id="wpSummary" value="Fixing typos.">';
    fillChangeExplanation("Added 1 source citation.", document, { replace: true });
    expect(document.querySelector("#wpSummary").value).toBe("Added 1 source citation.");
  });

  test("cut at a word to fit the box's maxlength", () => {
    document.body.innerHTML = '<input id="wpSummary" maxlength="70" value="Fixing typos and adding the census.">';
    expect(fillChangeExplanation("Added 2 source citations; improved the biography.")).toBe("filled");
    const value = document.querySelector("#wpSummary").value;
    expect(value).toBe("Fixing typos and adding the census. Added 2 source citations…");
    expect(value.length).toBeLessThanOrEqual(70);
  });

  test("no room after what's there (less than half would fit): the box is left alone", () => {
    const full = (value, max) => {
      document.body.innerHTML = `<input id="wpSummary" maxlength="${max}" value="${value}">`;
      expect(fillChangeExplanation("Added 2 source citations; improved the biography.")).toBe("full");
      expect(document.querySelector("#wpSummary").value).toBe(value);
    };
    full("Fixing typos and adding the census.", 40);
    // (Text cut to fit before, as a draft's was on staging, 2026-10-21: it once came out "United……".)
    full("Added possible grandfather Frederick; changed death place to Crewe, Cheshire, England, United…", 98);
  });

  test("no box", () => {
    document.body.innerHTML = "";
    expect(fillChangeExplanation("Added 1 source citation.")).toBe("none");
  });

  test("fitSummary", () => {
    expect(fitSummary("Short.", 150)).toBe("Short.");
    expect(fitSummary("Added 2 source citations; improved the biography", 30)).toBe("Added 2 source citations…");
    expect(fitSummary("x".repeat(200)).length).toBe(150);
    expect(fitSummary("Changed death place to Crewe, England, United… Added X.", 47)).toBe("Changed death place to Crewe, England, United…");
  });

  test("the suggestion from the form and the live biography", () => {
    document.body.innerHTML = `<form id="editform"><input id="mDeathDate" value="">
      <textarea id="wpTextbox1">== Biography ==\nA.</textarea></form>`;
    document.querySelector("#mDeathDate").value = "1901";
    expect(suggestedChangeExplanation("== Biography ==\nA.<ref>x</ref>")).toBe("Added 1 source citation; updated death date.");
    document.querySelector("#mDeathDate").value = "";
    expect(suggestedChangeExplanation("== Biography ==\nA.")).toBe("");
  });

  test("the form changes with their values, for the AI", () => {
    document.body.innerHTML = `<form id="editform"><input id="mBirthDate" value="1851"><input id="mDeathLocation" value="">
      <input type="checkbox" name="mNoChildren" value="1"></form>`;
    document.querySelector("#mBirthDate").value = "24 May 1852";
    document.querySelector("#mDeathLocation").value = "Leeds, Yorkshire, England";
    document.querySelector("input[name='mNoChildren']").checked = true;
    expect(editFormChangeDetails()).toEqual([
      'birth date: "1851" → "24 May 1852"',
      'death place: (empty) → "Leeds, Yorkshire, England"',
      'ticked "no more children"',
    ]);
  });

  test("a reworded citation, and layout only", () => {
    const before = "== Biography ==\nA.<ref>1881 census</ref>\n\nB.";
    expect(bioChanges(before, "== Biography ==\nA.<ref>1881 census, Leeds</ref>\n\nB.")).toMatchObject({ refsEdited: true, textChanged: false });
    expect(changeExplanation([], bioChanges(before, "== Biography ==\nA.<ref>1881 census, Leeds</ref>\n\nB."))).toBe("Updated source citations.");
    const layout = bioChanges(before, "== Biography ==\nA.<ref>1881 census</ref>\nB.");
    expect(layout).toMatchObject({ refsEdited: false, textChanged: false, formattingOnly: true });
    expect(changeExplanation([], layout)).toBe("Formatting.");
    expect(bioChanges(before, `${before}\n`).formattingOnly).toBe(false);
  });

  test("on free-space and category pages: the text only, not a profile form", () => {
    document.body.innerHTML = `<input id="mDeathDate" value=""><textarea id="wpTextbox1">Leeds.</textarea>`;
    document.querySelector("#mDeathDate").value = "1901";
    expect(suggestedChangeExplanation("Leeds.\n[[Category:Yorkshire]]", document, { page: "category" })).toBe("Added Category: Yorkshire.");
    expect(suggestedChangeExplanation("Leeds, Yorkshire.", document, { page: "space" })).toBe("Improved the text.");
  });

  test("summaryMax: the box's maxlength, or 150", () => {
    document.body.innerHTML = '<input id="a" maxlength="200"><input id="b">';
    expect(summaryMax(document.getElementById("a"))).toBe(200);
    expect(summaryMax(document.getElementById("b"))).toBe(150);
    expect(summaryMax(null)).toBe(150);
  });

  test("tells WikiTree the box changed, so Save can be enabled", () => {
    document.body.innerHTML = '<input id="wpSummary" value="">';
    const heard = [];
    document.body.addEventListener("input", () => heard.push("input"));
    document.body.addEventListener("change", () => heard.push("change"));
    fillChangeExplanation("Added 1 source citation.");
    expect(heard).toEqual(["input", "change"]);
  });
});
