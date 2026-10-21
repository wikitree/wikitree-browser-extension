import { draftChanges, fetchDraftDiff, hasDraft, parseDraftDiff } from "./change_explanation_draft";

// WikiTree's comparison of a saved profile and its draft, as EditPerson::ajaxGetDiff sent it on staging (2026-10-21).
const context = (text) => `<tr><td class="diff-marker"></td><td class="diff-context"><div>${text}</div></td><td class="diff-marker"></td><td class="diff-context"><div>${text}</div></td></tr>`;
const addedLine = (text) => `<tr><td colspan="2" class="diff-empty"></td><td class="diff-marker">+</td><td class="diff-addedline"><div>${text}</div></td></tr>`;
const changedLine = (from, to) =>
  `<tr><td class="diff-marker">−</td><td class="diff-deletedline"><div>${from}</div></td><td class="diff-marker">+</td><td class="diff-addedline"><div>${to}</div></td></tr>`;
const label = (text) => `<tr><td colspan="4" class="diff-lineno">${text}</td></tr>`;
const hunk = '<tr><td colspan="2" class="diff-lineno"></td><td colspan="2" class="diff-lineno"></td></tr>';
const DIFF = `<table class="diff">
  <tr><td colspan="2" class="diff-otitle">Saved Information</td><td colspan="2" class="diff-otitle">Draft Information</td></tr>
  ${label("Bio Changes")}
  ${hunk}
  ${context("== Biography ==")}
  ${context("William was born in 1868.")}
  ${hunk}
  ${context("&lt;/ref&gt;")}
  ${addedLine("")}
  ${addedLine("He was buried in Allentown.&lt;ref&gt;Find a Grave Memorial 12345&lt;/ref&gt;")}
  ${context("")}
  ${context("== Sources ==")}
  ${context("&lt;references /&gt;")}
  ${label("Death Location")}
  ${changedLine("Fort Jennings, Putnam, Ohio, United States", "Allentown, Lehigh, Pennsylvania, United States")}
  <tr><td colspan="2" class="diff-otitle"></td><td colspan="2" class="diff-otitle"></td></tr>
</table>`;

describe("parseDraftDiff", () => {
  test("the fields that changed, and the text's lines before and after", () => {
    const changes = parseDraftDiff(DIFF);
    expect(changes.form).toEqual([
      { label: "death place", from: "Fort Jennings, Putnam, Ohio, United States", to: "Allentown, Lehigh, Pennsylvania, United States" },
    ]);
    expect(changes.before).toBe("== Biography ==\nWilliam was born in 1868.\n</ref>\n\n== Sources ==\n<references />");
    expect(changes.after).toBe(
      "== Biography ==\nWilliam was born in 1868.\n</ref>\n\nHe was buried in Allentown.<ref>Find a Grave Memorial 12345</ref>\n\n== Sources ==\n<references />",
    );
  });

  test("a field that was empty", () => {
    const changes = parseDraftDiff(`<table class="diff">${label("Birth Date")}${addedLine("24 May 1852")}</table>`);
    expect(changes).toEqual({ form: [{ label: "birth date", from: "", to: "24 May 1852" }], before: "", after: "" });
  });

  test("no table (no draft to compare): null", () => {
    expect(parseDraftDiff("<p>No Draft to Compare</p>")).toBeNull();
    expect(parseDraftDiff("")).toBeNull();
  });
});

describe("hasDraft", () => {
  test("the delete-draft link shows when there's a draft", () => {
    document.body.innerHTML = '<div id="deleteDraftLinkContainer"></div>';
    expect(hasDraft(document)).toBe(false);
    document.getElementById("deleteDraftLinkContainer").innerHTML = '<a class="deleteDraftButton" data-draftid="7">delete draft</a>';
    expect(hasDraft(document)).toBe(true);
  });
});

describe("fetchDraftDiff", () => {
  afterEach(() => {
    delete global.fetch;
  });

  const respond = (body, ok = true) => jest.fn(async () => ({ ok, status: ok ? 200 : 500, text: async () => JSON.stringify(body) }));

  test.each([
    ["", "EditPerson::ajaxGetDiff"],
    [' data-is-space="1"', "EditSpace::ajaxGetDiff"],
  ])("asks WikiTree as its compare button does%s", async (space, rs) => {
    document.body.innerHTML = `<a class="viewDiffButton" data-mid="20990365" data-do-save="1"${space}>compare</a>`;
    global.fetch = respond({ html: DIFF });
    expect(await fetchDraftDiff(document)).toBe(DIFF);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url.pathname).toBe("/index.php");
    expect(options.method).toBe("POST");
    expect(Object.fromEntries(options.body)).toEqual({ action: "ajax", rs, mId: "20990365" });
  });

  test("WikiTree's error is an error", async () => {
    document.body.innerHTML = '<a class="viewDiffButton" data-mid="1">compare</a>';
    global.fetch = respond({ error: "Not logged in" });
    await expect(fetchDraftDiff(document)).rejects.toThrow("Not logged in");
    global.fetch = respond({}, false);
    await expect(fetchDraftDiff(document)).rejects.toThrow("500");
  });

  test("no compare button, nothing asked", async () => {
    document.body.innerHTML = "";
    global.fetch = jest.fn();
    expect(await fetchDraftDiff(document)).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("draftChanges", () => {
  test("no draft: null, and nothing saved or asked", async () => {
    document.body.innerHTML = "";
    const update = jest.fn();
    const fetchDiff = jest.fn();
    expect(await draftChanges(document, { update, fetchDiff })).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(fetchDiff).not.toHaveBeenCalled();
  });

  test("a draft: brought up to date, then compared", async () => {
    document.body.innerHTML = '<a class="deleteDraftButton" data-draftid="7">delete draft</a>';
    const order = [];
    const onDraft = jest.fn(() => order.push("onDraft"));
    const update = jest.fn(async () => order.push("update"));
    const fetchDiff = jest.fn(async () => (order.push("fetchDiff"), DIFF));
    const changes = await draftChanges(document, { onDraft, update, fetchDiff });
    expect(order).toEqual(["onDraft", "update", "fetchDiff"]);
    expect(changes.form[0].label).toBe("death place");
  });

  test("the draft not saving is an error", async () => {
    document.body.innerHTML = '<a class="deleteDraftButton" data-draftid="7">delete draft</a>';
    const update = async () => {
      throw new Error("WikiTree didn't save the draft");
    };
    await expect(draftChanges(document, { update, fetchDiff: jest.fn() })).rejects.toThrow("didn't save");
  });
});
