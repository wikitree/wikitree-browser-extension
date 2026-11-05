import { buildOutcomeNotes, emptyRunNote } from "./fg_messages";
import { MAX_CONSECUTIVE_FAILURES } from "./fg_pacing";

const quietState = () => ({ cancelled: false, stopReason: null });
const baseInfo = {
  rowCount: 200,
  fetchedCount: 200,
  failedPages: [],
  skippedRows: 0,
  failedCount: 0,
  range: { from: 1, to: 10 },
  totalPages: 10,
  fetchMemorialPages: true,
};

describe("emptyRunNote", () => {
  test("no memorials on a normal run", () => {
    expect(emptyRunNote(quietState())).toEqual({ error: true, text: "No memorials were found on those pages." });
  });

  test("stopped before anything was gathered", () => {
    const note = emptyRunNote({ cancelled: true, stopReason: null });
    expect(note.error).toBeUndefined();
    expect(note.text).toMatch(/Stopped before any memorials were gathered, so no file was downloaded/);
  });

  test("blocked at the start", () => {
    const note = emptyRunNote({ cancelled: false, stopReason: "blocked" });
    expect(note.error).toBe(true);
    expect(note.text).toContain(`after ${MAX_CONSECUTIVE_FAILURES} requests in a row`);
    expect(note.text).toMatch(/no file was downloaded/);
  });

  test("list pages that failed", () => {
    const note = emptyRunNote(quietState(), [1, 2]);
    expect(note.text).toMatch(/List pages 1, 2 could not be loaded/);
    expect(note.text).toMatch(/No file was downloaded/);
  });
});

describe("buildOutcomeNotes", () => {
  test("a clean run of the last pages says nothing", () => {
    expect(buildOutcomeNotes(quietState(), baseInfo)).toEqual([]);
  });

  test("a clean run in the middle of a long list points to the next pages", () => {
    const notes = buildOutcomeNotes(quietState(), { ...baseInfo, range: { from: 1, to: 50 }, totalPages: 1379 });
    expect(notes).toEqual([{ text: "Done. Click Extract to CSV again to continue with pages 51 to 100." }]);
  });

  test("no 'next pages' hint after the last readable page", () => {
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, range: { from: 451, to: 500 }, totalPages: 1379 })).toEqual(
      []
    );
  });

  test("stopped by the user", () => {
    const notes = buildOutcomeNotes({ cancelled: true, stopReason: null }, baseInfo);
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toMatch(/^Stopped\./);
    expect(notes[0].error).toBeUndefined();
  });

  test("blocked part-way says how much was gathered", () => {
    const notes = buildOutcomeNotes(
      { cancelled: false, stopReason: "blocked" },
      { ...baseInfo, rowCount: 400, fetchedCount: 120 }
    );
    expect(notes[0].error).toBe(true);
    expect(notes[0].text).toContain("400 memorials, 120 with full details");
  });

  test("blocked in list-only mode does not mention full details", () => {
    const notes = buildOutcomeNotes(
      { cancelled: false, stopReason: "blocked" },
      { ...baseInfo, fetchMemorialPages: false, rowCount: 1 }
    );
    expect(notes[0].text).toContain("(1 memorial)");
    expect(notes[0].text).not.toContain("full details");
  });

  test("failed list pages, with the right plural", () => {
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, failedPages: [7] })[0].text).toBe(
      "List page 7 could not be loaded, so the memorials on it are missing from the CSV. Run the extract again for those pages."
    );
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, failedPages: [7, 9] })[0].text).toMatch(
      /^List pages 7, 9 could not be loaded, so the memorials on them are missing/
    );
  });

  test("rows that could not be read, with the right plural", () => {
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, skippedRows: 1 })[0].text).toBe(
      "1 row on the list could not be read and is missing from the CSV."
    );
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, skippedRows: 3 })[0].text).toBe(
      "3 rows on the list could not be read and are missing from the CSV."
    );
  });

  test("memorials that could not be opened, with the right plural", () => {
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, failedCount: 1 })[0].text).toMatch(
      /^1 memorial could not be opened, so its coordinates are blank/
    );
    expect(buildOutcomeNotes(quietState(), { ...baseInfo, failedCount: 4 })[0].text).toMatch(
      /^4 memorials could not be opened, so their coordinates are blank/
    );
  });

  test("several problems give several notes, and a blocked run does not also list failed memorials", () => {
    const notes = buildOutcomeNotes(
      { cancelled: false, stopReason: "blocked" },
      { ...baseInfo, failedPages: [3], failedCount: 5, skippedRows: 2 }
    );
    expect(notes).toHaveLength(3);
    expect(notes.every((note) => note.error)).toBe(true);
    expect(notes.some((note) => /could not be opened/.test(note.text))).toBe(false);
  });
});
