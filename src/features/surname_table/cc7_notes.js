import { IndexedDBHelper } from "../../core/lib/indexedDBHelper.js";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getUserWtId, setHighestZIndex } from "../../core/common.js";

// I named the CC7Notes to indicate that they are related (i.e. use the same source data) as the notes
// in the CC7 Views tree app. The DB ersion numbers and names below must be kept in sync with that
// of the CC7 Views app
export class CC7Notes {
  static dbName = "CC7Notes";
  static dbVersion = 1;
  static dbStore = "notes";
  static dbHelper = new IndexedDBHelper(CC7Notes.dbName, CC7Notes.dbVersion);
  static nrWarnings = 0;

  static async initializeDatabase() {
    if (!CC7Notes.dbHelper.db) {
      await CC7Notes.dbHelper.openDB((db, oldVersion, newVersion) => {
        IndexedDBHelper.createObjectStore(db, CC7Notes.dbStore, { keyPath: "theKey" });
      });
    }
    return CC7Notes.dbHelper;
  }

  static async getIdFromApi(wtId) {
    const person = await WikiTreeAPI.getPerson("WBE_cc7_notes", wtId, ["Id"]);
    return person?.getId() || null;
  }

  static createValidId(unsafe) {
    return unsafe.replace(/[^a-zA-Z0-9-_]/g, "_");
  }

  static async processNoteCellClick(jqClicked) {
    const theClickedRow = jqClicked.closest("tr");
    // const wtId = theClickedRow.find("td:first a:first").attr("href").split("/wiki/").pop().replace(/ /g, "_");
    const wtId = theClickedRow.attr("data-wtid");
    if (!wtId) return;

    let id = theClickedRow.attr("data-id") ? +theClickedRow.attr("data-id") : false;
    if (!id) {
      id = await CC7Notes.getIdFromApi(wtId);
      theClickedRow.attr("data-id", id);
    }
    if (!id) return;
    const person = {
      Id: id,
      WtId: wtId,
      SafeWtId: CC7Notes.createValidId(wtId),
      Name: theClickedRow.find("td:first a:first").text().trim(),
    };

    const noteId = person.SafeWtId + "_notes";
    let $note = $(`#${noteId}`);
    if ($note.length) {
      if ($note.is(":visible")) {
        CC7Notes.saveNote($note); // this will close it as well
        return;
      } else {
        $note.remove();
      }
    }

    $note = await CC7Notes.getNoteDisplay(person);
    CC7Notes.attachChangeTracking($note, person.Id);
    $note.attr("id", noteId);
    CC7Notes.showNote(jqClicked, $note, -40, 40);
  }

  static showNote(jqClicked, theNote, lOffset, tOffset) {
    theNote.appendTo("#cc7-notes-container");
    theNote.draggable();

    CC7Notes.setOffset(jqClicked, theNote, lOffset, tOffset);
    $(window).on("resize", function () {
      if (theNote.length) {
        CC7Notes.setOffset(jqClicked, theNote, lOffset, tOffset);
      }
    });

    setHighestZIndex(theNote);
    theNote.slideDown("slow");
  }

  static getOffset(el) {
    // Return element position relative to the document
    const $el = $(el);
    return $el.offset(); // { left, top }
  }

  static setOffset(theClicked, elem, lOffset, tOffset) {
    const offset = CC7Notes.getOffset(theClicked[0]);
    elem.css({
      position: "absolute",
      top: offset.top + tOffset,
      left: offset.left + lOffset,
    });
  }

  static async getNoteDisplay(person) {
    const noteDiv = $(
      `<div class="cc7notes wbe-popup" data-wtid="${person.WtId}" data-id="${person.Id}">
                <h2>Notes for ${person.Name} <span class="name-ids">(${person.WtId} - ${person.Id})</span></h2>
                <x class="close-popup">[ x ]</x>

                <!-- Status + Last Modified -->
                <div class="note-header">
                    <label>
                    <b>Status:</b>
                    <select id="cc7status${person.Id}">
                        <option value="" selected>None</option>
                        <option value="ToDo">To Do</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Parked">Parked</option>
                        <option value="Done">Done</option>
                    </select>
                    </label>
                    <span id="mod${person.Id}" class="last-modified"></span>
                </div>

                <textarea id="noteBox${person.Id}"></textarea>
                <button class="deleteNoteBtn btn btn-secondary btn-sm" title="Delete the note.">Delete</button>
                <button class="cancelNoteBtn btn btn-secondary btn-sm" title="Close and discard any changes.">Cancel</button>
                <span>Changes are saved automatically</span>
            </div>`
    );

    try {
      const dbh = await CC7Notes.initializeDatabase();
      const loggedInUserWtId = CC7Notes.getUserId();
      const note = await dbh.getData(CC7Notes.dbStore, `${person.Id}:${loggedInUserWtId}`);
      if (note) {
        noteDiv.find(`#cc7status${person.Id}`).val(note.status);
        noteDiv.find(`#noteBox${person.Id}`).val(note.note);
        noteDiv.addClass("instore");
        if (note.date) {
          const dateStr = CC7Notes.formatDate(note.date);
          noteDiv.find(`#mod${person.Id}`).text(dateStr);
        }
        noteDiv.data("oldDate", note.date || null);
      }
    } catch (error) {
      console.error(`getNoteDisplay for ${person?.WtId(person?.Id)} failed:`, error);
    }

    return noteDiv;
  }

  static attachChangeTracking(noteDiv, personId) {
    let hasChanges = false;

    // Watch for changes in the status dropdown
    noteDiv.find(`#cc7status${personId}`).on("change", function () {
      hasChanges = true;
    });

    // Watch for changes in the textarea
    noteDiv.find(`#noteBox${personId}`).on("input", function () {
      hasChanges = true;
    });

    // Helper: check if changes were made
    noteDiv.data("hasChanges", () => hasChanges);

    // Optional: reset tracking flage (only needed if we reopen a popup, but currently we delete them on close)
    // noteDiv.data("resetChanges", () => {
    //     hasChanges = false;
    // });
  }

  static formatDate(timestamp) {
    const d = new Date(timestamp);

    const pad = (n) => String(n).padStart(2, "0");

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1); // months are 0-based
    const day = pad(d.getDate());

    const hours = pad(d.getHours()); // 24-hour format
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  static async saveNote(jqDiv) {
    if (!jqDiv.hasClass("cc7notes")) return;

    const id = +jqDiv.attr("data-id");
    const wtId = jqDiv.attr("data-wtid");
    const loggedInUserWtId = CC7Notes.getUserId();
    const status = jqDiv.find(`#cc7status${id}`).val();
    const noteTxt = jqDiv.find(`#noteBox${id}`).val();

    // We do not store empty, status=none notes not already in the DB
    if (status != "" || noteTxt != "" || jqDiv.hasClass("instore")) {
      const hasChanges = jqDiv.data("hasChanges")();
      const note = {
        theKey: `${id}:${loggedInUserWtId}`,
        id: id,
        wtId: wtId,
        status: status,
        note: noteTxt,
        date: hasChanges ? Date.now() : jqDiv.data("oldDate"),
      };
      const dbh = await CC7Notes.initializeDatabase();
      dbh.putData(CC7Notes.dbStore, note);
      jqDiv.addClass("instore");
      let theClasses = "hasNote";
      if (status != "") theClasses += ` ${status}`;
      $(`tr[data-id="${id}"] td.profile-note`).removeClass("ToDo InProgress Parked Done").addClass(theClasses);
    }

    jqDiv.remove();
  }

  static async deleteNote(jqClickedButton) {
    const noteDiv = jqClickedButton.closest("div");
    if (!noteDiv?.hasClass("cc7notes")) return;

    const id = +noteDiv.attr("data-id");
    const loggedInUserWtId = CC7Notes.getUserId();
    const dbh = await CC7Notes.initializeDatabase();
    dbh.deleteItem(CC7Notes.dbStore, `${id}:${loggedInUserWtId}`);
    $(`tr[data-id="${id}"] td.profile-note`).removeClass("hasNote ToDo InProgress Parked Done");

    noteDiv.remove();
  }

  static async cancelNote(jqClickedButton) {
    const noteDiv = jqClickedButton.closest("div");
    if (!noteDiv?.hasClass("cc7notes")) return;

    noteDiv.remove();
  }

  static async getIdsAndStatus() {
    const loggedInUserWtId = CC7Notes.getUserId();
    const notes = await CC7Notes.getAllForUser(loggedInUserWtId);
    return notes.map((n) => [n.wtId, { status: n.status, id: n.id }]);
  }

  static async getAllForUser(userId) {
    const dbh = await CC7Notes.initializeDatabase();
    const notes = await dbh.getAll(CC7Notes.dbStore);
    return notes ? notes.filter((n) => n.theKey.split(":")[1] == userId) : [];
  }

  static async backupNotes() {
    const loggedInUserWtId = CC7Notes.getUserId();
    const notes = await CC7Notes.getAllForUser(loggedInUserWtId);
    const fileName =
      `CC7Notes_${loggedInUserWtId}_` +
      new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19) +
      ".json";
    CC7Notes.downloadArray(
      [
        {
          userid: loggedInUserWtId,
        },
        notes,
      ],
      fileName
    );
  }

  static async restoreNotes(event) {
    const file = event.target.files[0];
    if (typeof file == "undefined" || file == "") {
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      const contents = e.target.result;
      try {
        const json = JSON.parse(contents);
        const { userid: userId } = json[0];
        if (userId != CC7Notes.getUserId()) {
          alert(`The notes in the file do not belong to you (${userId}), hence we cannot read them`);
          return;
        }
        const notes = json[1].filter((n) => {
          const uid = n.theKey?.split(":")[1];
          return uid == userId;
        });

        // Validate all the notes
        for (const note of notes) {
          for (const prop of ["id", "wtId", "status", "note"]) {
            if (!note.hasOwnProperty(prop)) {
              alert(
                `The input file is not in the correct format (a note is missing the ${prop} property), ` +
                  `so we could not retrieve notes from it.`
              );
            }
          }
        }

        // Add the notes read from the file to IndexedDB and redraw
        const dbh = await CC7Notes.initializeDatabase();
        const promises = notes.map((note) => dbh.putData(CC7Notes.dbStore, note));

        // Wait for all putData calls to complete
        await Promise.all(promises);

        CC7Notes.repaintNotes();
      } catch (error) {
        wtViewRegistry.showError(`An error occurred wile processing the notes input file: ${error}`);
        return;
      }
    };

    try {
      reader.readAsText(file);
    } catch (error) {
      wtViewRegistry.showError(`The input file is not valid: ${error}`);
    }
  }

  static async repaintNotes() {
    // Clear all existing note tags from the page
    $(`tr td.profile-note`).removeClass("hasNote ToDo InProgress Parked Done");

    // Retrieve notes from store
    const idsAndStatus = await CC7Notes.getIdsAndStatus();

    // Repaint
    for (const [wtId, { status: status, id: id }] of idsAndStatus) {
      let theClasses = "hasNote";
      if (status != "") theClasses += ` ${status}`;
      $(`.wbe-cc7-notes-enabled tr[data-id="${id}"] td.profile-note`).addClass(theClasses);
    }
  }

  static async deleteAllNotes() {
    const proceed = confirm(
      "You are about to delete all the Profile Notes you have associated with profiles, " +
        "including those done via the CC7 Views tree app. Are you sure?"
    );
    if (proceed) {
      const userId = CC7Notes.getUserId();
      const dbh = await CC7Notes.initializeDatabase();
      await dbh.deleteKeyset(CC7Notes.dbStore, (k) => {
        return k.split(":")[1] == userId;
      });
      CC7Notes.repaintNotes();
    }
  }

  static getUserId() {
    return getUserWtId();
  }

  static downloadArray(array, fileName) {
    // Convert the JavaScript array to a string
    const arrayString = JSON.stringify(array);

    // Create a Blob object with the string data
    const blob = new Blob([arrayString], { type: "text/plain" });

    // Create a link element to trigger the download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;

    // Append the link to the DOM and trigger the download
    document.body.appendChild(link);
    link.click();

    // Remove the link from the DOM
    document.body.removeChild(link);
  }
}
