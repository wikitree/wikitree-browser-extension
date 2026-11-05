/*
Where the Find a Grave Memorial Extractor puts its button on a cemetery list.
*/

// The element the button goes after: Find a Grave's "Refine search" button when the list has been filtered, else its
// "Search tips" box, else the SEARCH button. The spacing classes on the "Search tips" box differ from one page to the
// next (mt-2 or mt-3), so they are not part of the match.
export function findButtonAnchor(doc) {
  return (
    doc.querySelector("#js--refine-btn") ||
    doc.querySelector(".label.label-update") ||
    doc.querySelector("button[type='submit'].btn-primary")
  );
}
