import $ from "jquery";

jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: () => Promise.resolve(true),
  getFeatureOptions: () =>
    Promise.resolve({ defaultChannel: "x", mastodonInstance: "example.social", includeHashtags: true }),
}));
// The feature is loaded inside jest.isolateModules, so the mock reads its behaviour from a global the tests control.
jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: { getProfile: (...args) => global.mockGetProfile(...args) },
}));
jest.mock("../../core/clipboard.js", () => ({ copyToClipboard: jest.fn(() => Promise.resolve()) }));

function typeInto(value) {
  const box = document.getElementById("wbeShareText");
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

const NAME_FIELDS = ["Privacy", "IsLiving", "FirstName", "MiddleName", "LastNameCurrent"];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// The button checks the privacy level again when it is clicked, so opening the dialog takes a few ticks.
async function clickShare() {
  $(".wbe-share-button").trigger("click");
  for (let i = 0; i < 5; i++) await tick();
}

async function loadFeature(path, html, title = "Firman Joseph Robinson (1901-1991) | WikiTree FREE Family Tree") {
  window.history.pushState({}, "", path);
  document.title = title;
  document.body.innerHTML = html;
  jest.isolateModules(() => {
    require("./share_page");
  });
  for (let i = 0; i < 5; i++) await tick();
}

const VITALS_HTML = `
  <div id="Birth" class="VITALS">Born
    <time itemprop="birthDate" datetime="1901-08-02">2 Aug 1901</time>
    in <strong><span itemprop="birthPlace" itemscope><span itemprop="name">Caledonia, Washington, Missouri, United States</span></span></strong>
  </div>
  <div id="Death" class="VITALS">Died
    <time itemprop="deathDate" datetime="1991-10-01">1 Oct 1991</time>
    <span title="Born 125 years ago; died at age 90">at age 90</span>
    in <strong><span itemprop="deathPlace" itemscope><span itemprop="name">Seattle, King, Washington, United States</span></span></strong>
  </div>
  <p id="Parents" class="VITALS">Son of
    <span itemprop="parent" itemscope><a href="/wiki/Robinson-27275"><span itemprop="name">William Thomas Robinson</span></a></span> and
    <span itemprop="parent" itemscope><a href="/wiki/Boushon-120"><span itemprop="name">Lucy Jane (Boushon) Gant</span></a></span>
  </p>
  <div id="Spouses" class="VITALS mb-3">
    <div class="spouse">Husband of
      <span itemprop="spouse" itemscope><a href="/wiki/Budd-1260"><span itemprop="name">Leona Catherine (Budd) Robinson</span></a></span>
      — married 7 Apr 1928 in Oskaloosa, Mahaska, Iowa, United States at age 26
    </div>
    <div class="spouse">Husband of
      <span itemprop="spouse" itemscope><a href="/wiki/Showalter-1"><span itemprop="name">Erma Faye (Showalter) Robinson</span></a></span>
      — married 5 Oct 1968 in Tacoma, Pierce, Washington, United States
    </div>
  </div>
  <p id="Children" class="VITALS">Father of
    <span itemprop="children" itemscope><a href="/wiki/Robinson-27360"><span itemprop="name">Naomi Lucy (Robinson) Anderson</span></a></span>,
    <span itemprop="children" itemscope><a href="/wiki/Robinson-27361"><span itemprop="name">Carl William Robinson Sr</span></a></span>
    and [private son (1930s - unknown)]
  </p>`;

const PROFILE_HTML = `
  <div id="pageData" data-mnamedb="Robinson-27274" data-mfirstname="Firman Joseph" data-mgender="Male"></div>
  ${VITALS_HTML}
  <ul id="jump-nav"></ul>
  <h1>Firman Joseph Robinson</h1>
  <img class="profile--photo" alt="Firman Joseph Robinson"
       src="https://www.wikitree.com/photo.php/thumb/4/49/Robinson-27274.jpg/300px-Robinson-27274.jpg">
  <img class="profile--photo" alt="On his horse"
       src="https://www.wikitree.com/photo.php/thumb/d/d3/Robinson-27274-1.jpg/300px-Robinson-27274-1.jpg">
  <div class="person--avatar"><img src="https://www.wikitree.com/photo.php/thumb/f/f0/Robinson-27275-3.jpg/75px-Robinson-27275-3.jpg"></div>`;

beforeAll(() => {
  // jsdom has no canvas and never loads images
  window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {},
    fillText(text) {
      global.mockCardText.push(String(text));
    },
    measureText: () => ({ width: 10 }),
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage(picture) {
      if (picture && picture._src) global.mockDrawn.push(picture._src);
    },
    strokeRect() {},
  });
  window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
  window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(new Blob(["x"], { type: "image/png" }));
  global.fetch = (url) =>
    /apps\.wikitree\.com|other\.example/.test(String(url))
      ? Promise.reject(new TypeError("Failed to fetch"))
      : Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })) });
  global.Image = class {
    set src(value) {
      this._src = value;
      const size = global.mockPhotoSize;
      setTimeout(() => {
        if (/^data:image\/svg\+xml/.test(value)) {
          global.mockSvgSources.push(decodeURIComponent(value.split(",").slice(1).join(",")));
          this.naturalWidth = this.width = 600;
          this.naturalHeight = this.height = 400;
          if (this.onload) this.onload();
        } else if (size && /photo\.php/.test(value)) {
          this.naturalWidth = this.width = size[0];
          this.naturalHeight = this.height = size[1];
          if (this.onload) this.onload();
        } else if (this.onerror) {
          this.onerror();
        }
      });
    }
    get src() {
      return this._src;
    }
  };
});

beforeEach(() => {
  global.mockSvgSources = [];
  global.mockCardText = [];
  global.mockDrawn = [];
  global.mockPhotoSize = null;
  global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: 60, IsLiving: 0 }, 0, "page"]));
});

const TALL_PHOTO_PAGE = "<h1>Image</h1>";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Share Page dialog", () => {
  test("adds a Share button to the profile jump bar", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    expect($("#jump-nav .wbe-share-button").length).toBe(1);
  });

  test("does nothing on pages it does not cover", async () => {
    await loadFeature("/g2g/", PROFILE_HTML);
    expect($(".wbe-share-button").length).toBe(0);
  });

  test("opens with the default channel, the page title, the link, the tag and the hashtags", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-overlay").length).toBe(1);
    expect($(".wbe-share-channel").length).toBe(10);
    expect($('.wbe-share-channel[aria-checked="true"] b').text()).toBe("X");
    const text = $("#wbeShareText").val();
    expect(text).toContain("Firman Joseph Robinson (1901-1991)");
    expect(text).toContain("https://www.wikitree.com/wiki/Robinson-27274");
    expect(text).toContain("@WikiTreers");
    expect(text).toContain("#WhereGenealogistsCollaborate #CollaborativeGenealogy");
  });

  test("lists the card and the page photos, but not avatars", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-image").length).toBe(3); // card + 2 photos
    expect($(".wbe-share-image small").first().text()).toBe("Share card for this page");
  });

  test("switching channel swaps the tag and keeps the member's edits", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    typeInto("My own words @WikiTreers");
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Mastodon")
      .trigger("click");
    expect($("#wbeShareText").val()).toBe("My own words @wikitree@genealysis.social");
  });

  test("Reddit drops the tags and hashtags", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Reddit")
      .trigger("click");
    const text = $("#wbeShareText").val();
    expect(text).not.toContain("@");
    expect(text).not.toContain("#");
  });

  test("the Open link points at the member's Mastodon server", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Mastodon")
      .trigger("click");
    expect($(".wbe-share-actions a").attr("href")).toMatch(/^https:\/\/example\.social\/share\?text=/);
  });

  test("warns when the text is over the channel's limit", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    typeInto("x".repeat(400));
    expect($(".wbe-share-count").hasClass("wbe-share-over")).toBe(true);
    expect($(".wbe-share-note").text()).toContain("over the limit for X");
  });

  test("a full-screen image shares the image page link and only the image", async () => {
    await loadFeature("/photo.php/4/49/Robinson-27274.jpg", "<h1>Image</h1>");
    await clickShare();
    expect($(".wbe-share-image").length).toBe(1);
    expect($("#wbeShareText").val()).toContain("https://www.wikitree.com/photo/jpg/Robinson-27274");
  });

  test("Escape closes the dialog", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect($(".wbe-share-overlay").length).toBe(0);
  });

  test("shows an editable life summary built from the profile's data fields", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-summary").prop("hidden")).toBe(false);
    const bio = $("#wbeShareSummary").val();
    expect(bio).toContain("Firman was born in Caledonia, Missouri in 1901, the son of William Thomas Robinson");
    expect(bio).toContain(
      "He married Leona Catherine (Budd) Robinson in 1928, and later Erma Faye (Showalter) Robinson in 1968."
    );
    expect(bio).toContain("He was the father of Naomi Lucy (Robinson) Anderson and Carl William Robinson Sr.");
    expect(bio).toContain("He died in Seattle, Washington in 1991, aged 90.");
    expect(bio).not.toContain("private");
  });

  test("leaves the summary out for someone who could still be living", async () => {
    const living = PROFILE_HTML.replace(/<div id="Death"[\s\S]*?<\/div>/, "").replace("2 Aug 1901", "2 Aug 1990");
    await loadFeature("/wiki/Robinson-27274", living);
    await clickShare();
    expect($(".wbe-share-summary").prop("hidden")).toBe(true);
  });

  test("other page types have no summary", async () => {
    await loadFeature("/wiki/Help:Sources", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-summary").prop("hidden")).toBe(true);
  });

  test("asks the API for the page's privacy level", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    expect(global.mockGetProfile).toHaveBeenCalledWith("sharePage", "Robinson-27274", NAME_FIELDS);
  });

  test.each([10, 20, 30, 40])("no Share button when the profile's privacy level is %i", async (level) => {
    global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: level, IsLiving: 0 }, 0, "page"]));
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    expect($(".wbe-share-button").length).toBe(0);
  });

  test("Public (50) profiles can be shared", async () => {
    global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: 50, IsLiving: 0 }, 0, "page"]));
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    expect($(".wbe-share-button").length).toBe(1);
  });

  test("no Share button when the privacy level cannot be read", async () => {
    global.mockGetProfile = jest.fn(() => Promise.reject(new Error("network")));
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    expect($(".wbe-share-button").length).toBe(0);
  });

  test("category pages are not checked, and the card summary uses the counts", async () => {
    await loadFeature(
      "/wiki/Category:Andersonia,_California",
      `<main><h1>Category: Andersonia, California</h1>
        <h2>Subcategories (1)</h2><h2>Pages (2)</h2><h2>Person Profiles (140)</h2></main>`
    );
    expect(global.mockGetProfile).not.toHaveBeenCalled();
    await clickShare();
    expect($(".wbe-share-summary").prop("hidden")).toBe(false);
    expect($("#wbeShareSummary").val()).toContain("Explore the subcategories, pages and profiles in this category.");
    expect($(".wbe-share-summary-hint").text()).toContain("Counts are from this category page");
  });

  test("a help page's card summary is its opening text, not its contents list", async () => {
    await loadFeature(
      "/wiki/Help:Projects",
      `<main><h1>Help:Projects</h1><div class="body-text clearfix">
        <p>A project is a group of members organized around a topic or volunteer activity. Many members say that joining a project transformed their experience here on WikiTree.</p>
        <table class="toc"><tr><td><p>This contents paragraph is long enough to count but sits in a table, so it must be skipped.</p></td></tr></table>
        <h2>Contents</h2><h2>Topical Projects</h2><h2>Functional Projects</h2></div></main>`
    );
    await clickShare();
    const summary = $("#wbeShareSummary").val();
    expect(summary).toContain("A project is a group of members organized around a topic or volunteer activity.");
    expect(summary).not.toContain("contents paragraph");
    expect($(".wbe-share-summary-hint").text()).toContain("Taken from the top of this page");
  });

  test("a free-space page's summary drops footnote markers", async () => {
    await loadFeature(
      "/wiki/Space:Andersonia,_California_One_Place_Study",
      `<main><h1>Andersonia</h1><div class="body-text"><p></p>
        <p>Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson.<sup>[1]</sup></p></div></main>`
    );
    await clickShare();
    expect($("#wbeShareSummary").val()).toBe(
      "Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson."
    );
  });

  test("a Tree Apps view names the app and the person, and links to the profile by default", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
      `<h2 id="view-title">Fan Chart</h2><span id="name-placeholder">Firman Joseph Robinson</span>
       <span id="numGensInBBar">5</span><div id="view-container"></div>`
    );
    expect(global.mockGetProfile).toHaveBeenCalledWith("sharePage", "Robinson-27274", NAME_FIELDS);
    await clickShare();
    expect($("#wbeShareText").val()).toContain("Fan Chart for Firman Joseph Robinson on WikiTree.");
    expect($("#wbeShareText").val()).toContain("https://www.wikitree.com/wiki/Robinson-27274");
    expect($("#wbeShareText").val()).not.toContain("/apps/");
    expect(document.getElementById("wbeShareProfileLink").checked).toBe(true);
    expect($(".wbe-share-note").text()).not.toContain("login");
    expect($(".wbe-share-summary").prop("hidden")).toBe(false);
    expect($("#wbeShareSummary").val()).toBe(
      "A fan chart of Firman Joseph Robinson's ancestors over 5 generations. Each ring is one generation further back."
    );
    expect($(".wbe-share-summary-hint").text()).toContain("Describes what the view is showing now");
  });

  test("a Tree Apps view falls back to a readable name from its address", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=printer-friendly",
      `<div id="view-container"></div>`
    );
    await clickShare();
    expect($("#wbeShareText").val()).toContain("Printer Friendly");
  });

  test("an image that does not belong to a profile is shared without a privacy level", async () => {
    global.mockGetProfile = jest.fn(() => Promise.resolve([undefined, "Illegal user name", "x"]));
    await loadFeature("/photo/png/One_Place_Studies_Directory-2", "<h1>Image</h1>");
    expect($(".wbe-share-button").length).toBe(1);
  });

  test("an image on a private profile is not shared", async () => {
    global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: 20, IsLiving: 0 }, 0, "x"]));
    await loadFeature("/photo/jpg/Robinson-27274", "<h1>Image</h1>");
    expect($(".wbe-share-button").length).toBe(0);
  });

  test("a Tree Apps view links to the profile by default, and one click switches to the view", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
      `<h2 id="view-title">Fan Chart</h2><span id="name-placeholder">Firman Joseph Robinson</span><div id="view-container"></div>`
    );
    await clickShare();
    const box = document.getElementById("wbeShareProfileLink");
    expect($(".wbe-share-linkchoice").prop("hidden")).toBe(false);
    expect(box.checked).toBe(true);
    expect($("#wbeShareText").val()).toContain("https://www.wikitree.com/wiki/Robinson-27274");
    expect($(".wbe-share-pvlink").text()).toBe("https://www.wikitree.com/wiki/Robinson-27274");
    expect($(".wbe-share-actions a").attr("href")).toContain(
      encodeURIComponent("https://www.wikitree.com/wiki/Robinson-27274")
    );

    box.click(); // untick: link to the view, and the text follows
    expect($("#wbeShareText").val()).toContain("Explore Fan Chart in WikiTree’s Tree Apps for Firman Joseph Robinson.");
    expect($("#wbeShareText").val()).toContain(
      "https://www.wikitree.com/apps/Robinson-27274#name=Robinson-27274&view=fanchart"
    );
    expect($(".wbe-share-note").text()).toContain("open only for people logged in to WikiTree");

    box.click(); // and back to the profile
    expect($("#wbeShareText").val()).toContain("Fan Chart for Firman Joseph Robinson on WikiTree.");
    expect($("#wbeShareText").val()).not.toContain("/apps/");
    expect($(".wbe-share-note").text()).not.toContain("login");
  });

  test("switching the link keeps text the member has edited", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
      `<h2 id="view-title">Fan Chart</h2><span id="name-placeholder">Firman Joseph Robinson</span><div id="view-container"></div>`
    );
    await clickShare();
    typeInto($("#wbeShareText").val() + "\nMy own note.");
    document.getElementById("wbeShareProfileLink").click();
    expect($("#wbeShareText").val()).toContain("My own note.");
    expect($("#wbeShareText").val()).toContain("/apps/Robinson-27274#name=Robinson-27274&view=fanchart");
    expect($("#wbeShareText").val()).not.toContain("/wiki/Robinson-27274");
  });

  test("other pages do not offer the profile-link choice", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-linkchoice").prop("hidden")).toBe(true);
  });

  test("a Tree Apps view with no name on the page gets the person's name from the API", async () => {
    global.mockGetProfile = jest.fn(() =>
      Promise.resolve([
        { Privacy: 60, IsLiving: 0, FirstName: "Firman Joseph", MiddleName: "", LastNameCurrent: "Robinson" },
        0,
        "x",
      ])
    );
    await loadFeature("/apps/Robinson-27274#name=Robinson-27274&view=fanchart", `<div id="view-container"></div>`);
    await clickShare();
    expect($("#wbeShareText").val()).toContain("Fan Chart for Firman Joseph Robinson on WikiTree.");
  });

  test("the privacy level is checked again at the click, in case the member moved to another person", async () => {
    await loadFeature("/apps/Robinson-27274#name=Robinson-27274&view=fanchart", `<div id="view-container"></div>`);
    expect($(".wbe-share-button").length).toBe(1);
    global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: 20, IsLiving: 0 }, 0, "x"]));
    await clickShare();
    expect($(".wbe-share-overlay").length).toBe(0);
    expect($(".wbe-share-denied").text()).toContain("Only Public and Open pages can be shared.");
  });

  test("another Tree Apps view uses its description, without the instructions", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=timeline",
      `<h2 id="view-title">Family Timeline</h2><span id="name-placeholder">Firman Joseph Robinson</span>
       <p id="view-description">The Timeline view is an interactive visualization chart that allows zooming and panning through a family chronology. Click on a person to create a new timeline.</p>
       <div id="view-container"></div>`
    );
    await clickShare();
    expect($("#wbeShareSummary").val()).toBe(
      "The Timeline view is an interactive visualization chart that allows zooming and panning through a family chronology."
    );
  });

  test("the Share button on a full-screen image sits at the top right", async () => {
    await loadFeature("/photo.php/4/44/Anderson-45659-4.jpg", "");
    expect($(".wbe-share-button").hasClass("wbe-share-floating")).toBe(true);
    expect($(".wbe-share-button").hasClass("wbe-share-top")).toBe(true);
  });

  test("tree apps keep the floating button at the bottom right", async () => {
    await loadFeature("/apps/Robinson-27274#name=Robinson-27274&view=fanchart", `<div id="view-container"></div>`);
    expect($(".wbe-share-button").hasClass("wbe-share-floating")).toBe(true);
    expect($(".wbe-share-button").hasClass("wbe-share-top")).toBe(false);
  });

  test("a tall photo can be cropped, and the slider moves up and down", async () => {
    global.mockPhotoSize = [400, 1000];
    await loadFeature("/photo.php/4/44/Anderson-45659-4.jpg", TALL_PHOTO_PAGE);
    await clickShare();
    // the only picture is the photo itself, so the crop panel is open straight away
    expect($(".wbe-share-crop").prop("hidden")).toBe(false);
    const shapes = $(".wbe-share-cropshape")
      .toArray()
      .map((el) => el.textContent);
    expect(shapes).toEqual(["Original", "Wide 1.91:1", "Square 1:1", "Tall 4:5"]);
    expect($(".wbe-share-cropshape[aria-checked='true']").text()).toBe("Original");
    expect($("#wbeShareCropSlider").prop("disabled")).toBe(true);

    $(".wbe-share-cropshape")
      .filter((i, el) => el.textContent === "Wide 1.91:1")[0]
      .click();
    for (let i = 0; i < 4; i++) await tick();
    expect($(".wbe-share-cropshape[aria-checked='true']").text()).toBe("Wide 1.91:1");
    expect($("#wbeShareCropSlider").prop("disabled")).toBe(false);
    expect($(".wbe-share-cropfrom").text()).toBe("Top");
    expect($(".wbe-share-cropto").text()).toBe("Bottom");
    expect($(".wbe-share-crophint").text()).toContain("Drag the picture or use the slider");
  });

  test("a wide photo cropped square slides left and right", async () => {
    global.mockPhotoSize = [1000, 400];
    await loadFeature("/photo.php/4/44/Anderson-45659-4.jpg", TALL_PHOTO_PAGE);
    await clickShare();
    $(".wbe-share-cropshape")
      .filter((i, el) => el.textContent === "Square 1:1")[0]
      .click();
    for (let i = 0; i < 4; i++) await tick();
    expect($(".wbe-share-cropfrom").text()).toBe("Left");
    expect($(".wbe-share-cropto").text()).toBe("Right");
  });

  test("a cropped picture is marked, and is saved under a cropped name", async () => {
    global.mockPhotoSize = [400, 1000];
    const saved = [];
    const click = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
      if (this.download) saved.push(this.download);
    };
    global.URL.createObjectURL = () => "blob:cropped";
    global.URL.revokeObjectURL = () => {};
    try {
      await loadFeature("/photo.php/4/44/Anderson-45659-4.jpg", TALL_PHOTO_PAGE);
      await clickShare();
      $(".wbe-share-cropshape")
        .filter((i, el) => el.textContent === "Wide 1.91:1")[0]
        .click();
      const slider = document.getElementById("wbeShareCropSlider");
      for (let i = 0; i < 4; i++) await tick();
      slider.value = "100"; // show the bottom of the picture
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      for (let i = 0; i < 6; i++) await tick();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect($(".wbe-share-image small").text()).toContain("· cropped");
      $(".wbe-share-actions button")
        .filter((i, el) => /Save picture/.test(el.textContent))[0]
        .click();
      for (let i = 0; i < 6; i++) await tick();
      expect(saved).toEqual(["Anderson-45659-4-cropped.jpg"]);
    } finally {
      window.HTMLAnchorElement.prototype.click = click;
    }
  });

  test("no crop panel while only the share card is selected", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-crop").prop("hidden")).toBe(true);
  });

  test("selecting a photo opens the crop panel for it, and a picker appears with two photos", async () => {
    global.mockPhotoSize = [400, 1000];
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    const photos = $(".wbe-share-image").toArray().slice(1);
    photos[0].click();
    expect($(".wbe-share-crop").prop("hidden")).toBe(false);
    expect($(".wbe-share-cropfor").prop("hidden")).toBe(true);
    $(".wbe-share-image").toArray()[2].click();
    expect($(".wbe-share-cropfor").prop("hidden")).toBe(false);
    expect($("#wbeShareCropFor option").length).toBe(2);
    // removing the photo being cropped moves the panel to the other one; removing both closes it
    $(".wbe-share-image").toArray()[2].click();
    expect($(".wbe-share-cropfor").prop("hidden")).toBe(true);
    $(".wbe-share-image").toArray()[1].click();
    expect($(".wbe-share-crop").prop("hidden")).toBe(true);
  });

  test("a Tree Apps chart is captured with its portraits embedded, and a picture it cannot get is left out", async () => {
    const sent = [];
    global.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (message, callback) => {
          sent.push(message);
          // like the real background script: pictures on wikitree.com only
          callback(
            /^https:\/\/apps\.wikitree\.com\//.test(message.url)
              ? { success: true, type: "image/png", base64: "iVBORw0KGgo=" }
              : { success: false, error: "Only pictures on wikitree.com can be fetched." }
          );
        },
      },
    };
    const getBox = window.Element.prototype.getBoundingClientRect;
    window.Element.prototype.getBoundingClientRect = () => ({
      width: 600,
      height: 400,
      top: 0,
      left: 0,
      right: 600,
      bottom: 400,
    });
    try {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
        `<h2 id="view-title">Fan Chart</h2>
         <div id="view-container">
           <svg id="fanChartSVG" width="600" height="400">
             <path d="M0 0L10 10" fill="#cceeee"/>
             <image href="/photo.php/thumb/a/aa/Person-1.jpg/75px-Person-1.jpg" width="20" height="20"/>
             <image href="https://apps.wikitree.com/apps/clarke11007/pix/silhouette.png" width="20" height="20"/>
             <image href="https://other.example/tracking.png" width="20" height="20"/>
             <foreignObject x="0" y="0" width="60" height="60">
               <div class="image-box"><img src="/photo.php/thumb/b/bb/Person-2.jpg/75px-Person-2.jpg"></div>
             </foreignObject>
             <foreignObject x="60" y="0" width="60" height="60">
               <div class="image-box"><img src="https://other.example/x.jpg"></div>
             </foreignObject>
           </svg>
         </div>`
      );
      await clickShare();
      await new Promise((resolve) => setTimeout(resolve, 1800)); // the capture waits for the drawing to settle
    } finally {
      window.Element.prototype.getBoundingClientRect = getBox;
      delete global.chrome;
    }
    const [plain, withPictures] = global.mockSvgSources;
    expect(plain).not.toContain("<image");
    expect(plain).not.toContain("<img"); // the fan chart's portraits are HTML pictures inside foreignObject boxes
    expect(withPictures).toContain("data:image/jpeg;base64,"); // the portrait on the page's own site
    expect(withPictures).toContain("data:image/png;base64,iVBORw0KGgo="); // the one fetched by the background script
    expect(withPictures).toMatch(/<img[^>]*src="data:image\/jpeg;base64,/); // an HTML portrait, embedded
    expect(withPictures).not.toContain("other.example"); // pictures that could not be fetched are gone, not broken
    // the page cannot read the three cross-origin pictures, so all were offered to the background script
    expect(sent.map((m) => m.url)).toEqual([
      "https://apps.wikitree.com/apps/clarke11007/pix/silhouette.png",
      "https://other.example/tracking.png",
      "https://other.example/x.jpg",
    ]);
    expect(sent.every((m) => m.action === "sharePageFetchImage")).toBe(true);
  });

  const SPACE_PAGE = `<main><h1>Andersonia, California One Place Study</h1><div class="body-text">
      <p>Andersonia was named for the President of Southern Humboldt Lumber Company, Henry Neff Anderson.</p>
      <h2><span class="mw-headline">Andersonia</span><span class="editsection">[edit]</span>
        <ul class="copy--buttons"><li><button>Link</button></li><li><button>URL</button></li></ul></h2>
      <h2>Sources[edit] Link URL</h2>
      <img src="https://www.wikitree.com/photo.php/thumb/c/ce/First-1.jpg/300px-First-1.jpg">
      <img src="https://www.wikitree.com/photo.php/thumb/3/3f/Second-2.jpg/300px-Second-2.jpg">
    </div></main>`;
  const settle = async () => {
    for (let i = 0; i < 8; i++) await tick();
  };

  test("a free-space page's card starts with its primary photo, and the member can pick another or none", async () => {
    global.mockPhotoSize = [400, 300];
    await loadFeature("/wiki/Space:Andersonia,_California_One_Place_Study", SPACE_PAGE);
    await clickShare();
    await settle();
    expect($(".wbe-share-cardphoto").prop("hidden")).toBe(false);
    const buttons = $(".wbe-share-cardphotobtn").toArray();
    expect(buttons.map((b) => b.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]); // none, first, second
    expect(global.mockDrawn).toContain("https://www.wikitree.com/photo.php/c/ce/First-1.jpg");

    global.mockDrawn = [];
    buttons[2].click(); // the second photo
    await settle();
    expect(global.mockDrawn).toContain("https://www.wikitree.com/photo.php/3/3f/Second-2.jpg");
    expect(global.mockDrawn).not.toContain("https://www.wikitree.com/photo.php/c/ce/First-1.jpg");

    global.mockDrawn = [];
    $(".wbe-share-cardphotobtn")[0].click(); // no photo
    await settle();
    expect(global.mockDrawn).toEqual([]);
    expect($(".wbe-share-cardphotobtn")[0].getAttribute("aria-checked")).toBe("true");
  });

  test("the card lists no section that only repeats the title or is a standard one, and shows no edit link or copy buttons", async () => {
    await loadFeature(
      "/wiki/Space:Andersonia,_California_One_Place_Study",
      SPACE_PAGE,
      "Andersonia, California One Place Study | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    const drawn = global.mockCardText.join("|");
    expect(drawn).toContain("Andersonia, California One Place Study");
    expect(drawn).not.toContain("ON THIS PAGE");
    expect(drawn).not.toContain("Sources");
    expect(drawn).not.toContain("[edit]");
    expect(drawn).not.toContain("URL");
    expect($("#wbeShareSummary").val()).toContain("Andersonia was named for the President");
  });

  test("a help page still lists its real sections, without the edit link and copy buttons", async () => {
    await loadFeature(
      "/wiki/Help:Projects",
      `<main><h1>Help:Projects</h1><div class="body-text"><p>A project is a group of members organized around a topic or volunteer activity.</p>
        <h2>Topical Projects[edit] <ul class="copy--buttons"><li><button>Link</button></li><li><button>URL</button></li></ul></h2>
        <h2>Functional Projects<span class="editsection">[edit]</span></h2></div></main>`,
      "Help:Projects | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    const drawn = global.mockCardText.join("|");
    expect(drawn).toContain("ON THIS PAGE");
    expect(drawn).toContain("Topical Projects");
    expect(drawn).toContain("Functional Projects");
    expect(drawn).not.toContain("[edit]");
    expect(drawn).not.toContain("URL");
  });

  test("a surname (genealogy) page gets a Share button, a card and a post", async () => {
    await loadFeature(
      "/genealogy/PEASLEY",
      `<main><h1>Peasley Genealogy Hub</h1><ul id="jump-nav"></ul><div class="container">
         <p>Here are the 300 most-recently added or edited Peasley ancestors, cousins, and community members. Search all 652 profiles.</p></div></main>`,
      "Peasley Genealogy | WikiTree FREE Family Tree"
    );
    expect($("#jump-nav .wbe-share-button").length).toBe(1);
    expect(global.mockGetProfile).not.toHaveBeenCalled(); // a surname page has no privacy level
    await clickShare();
    await settle();
    expect($("#wbeShareText").val()).toContain("Explore Peasley Genealogy on WikiTree");
    expect($("#wbeShareText").val()).toContain("https://www.wikitree.com/genealogy/PEASLEY");
    expect($("#wbeShareSummary").val()).toBe(
      "Explore the 652 Peasley profiles on WikiTree: ancestors, cousins and community members, and how they connect."
    );
    expect(global.mockCardText.join("|")).toContain("PROFILES");
    expect(global.mockCardText.join("|")).toContain("652");
    expect(global.mockCardText.join("|")).toContain("SURNAME PAGE");
  });

  test("a profile's card still starts with its primary photo and offers the others", async () => {
    global.mockPhotoSize = [400, 300];
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    await settle();
    const buttons = $(".wbe-share-cardphotobtn").toArray();
    expect(buttons.length).toBe(3); // none + the two photos on the page
    expect(buttons[1].getAttribute("aria-checked")).toBe("true");
    expect(global.mockDrawn[0]).toContain("Robinson-27274.jpg");
  });

  test("a help page's card starts with no photo, but one can be chosen", async () => {
    global.mockPhotoSize = [400, 300];
    await loadFeature(
      "/wiki/Help:Projects",
      `<main><h1>Help:Projects</h1><div class="body-text"><p>A project is a group of members organized around a topic or volunteer activity.</p>
        <img src="https://www.wikitree.com/photo.php/thumb/c/ce/Badge-1.png/300px-Badge-1.png"></div></main>`
    );
    await clickShare();
    await settle();
    expect($(".wbe-share-cardphotobtn")[0].getAttribute("aria-checked")).toBe("true");
    expect(global.mockDrawn).toEqual([]);
    $(".wbe-share-cardphotobtn")[1].click();
    await settle();
    expect(global.mockDrawn).toContain("https://www.wikitree.com/photo.php/c/ce/Badge-1.png");
  });

  test("no photo chooser on a Tree Apps view or an image page", async () => {
    await loadFeature("/apps/Robinson-27274#name=Robinson-27274&view=fanchart", `<div id="view-container"></div>`);
    await clickShare();
    expect($(".wbe-share-cardphoto").prop("hidden")).toBe(true);
    $(".wbe-share-close")[0].click();
    global.mockPhotoSize = [400, 1000];
    await loadFeature("/photo.php/4/44/Anderson-45659-4.jpg", "");
    await clickShare();
    expect($(".wbe-share-cardphoto").prop("hidden")).toBe(true);
  });
});
