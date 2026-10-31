import { findButtonAnchor } from "./fg_button_anchor";

const page = (html) => {
  document.body.innerHTML = html;
  return document;
};

// Markup copied from real cemetery lists
const searchRow = (tipsClasses) =>
  `<div class="row gx-2 mt-2"><div class="col">
    <button type="submit" class="btn me-2 btn-primary btn-lg">SEARCH</button>
    <a class="collapsed collapse-link" href="#adv-search">More search options</a>
    <div class="${tipsClasses}"><a href="#modal-search-updates">Search tips</a></div>
  </div></div>`;

describe("findButtonAnchor", () => {
  test("finds the Search tips box whichever spacing classes it has", () => {
    expect(findButtonAnchor(page(searchRow("label label-update d-md-inline mt-3 mt-md-0"))).className).toContain(
      "mt-3"
    );
    expect(findButtonAnchor(page(searchRow("label label-update d-md-inline mt-2 mt-md-0"))).className).toContain(
      "mt-2"
    );
  });

  test("prefers the Refine search button on a filtered list", () => {
    const doc = page(
      searchRow("label label-update d-md-inline mt-3 mt-md-0") + '<a id="js--refine-btn">Refine Search</a>'
    );
    expect(findButtonAnchor(doc).id).toBe("js--refine-btn");
  });

  test("falls back to the SEARCH button", () => {
    const doc = page(
      '<div class="col"><button type="submit" class="btn me-2 btn-primary btn-lg">SEARCH</button></div>'
    );
    expect(findButtonAnchor(doc).textContent).toBe("SEARCH");
  });

  test("nothing on a page without any of them", () => {
    expect(findButtonAnchor(page("<p>Hello</p>"))).toBeNull();
  });
});
