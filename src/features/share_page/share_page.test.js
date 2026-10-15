import $ from "jquery";

jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: () => Promise.resolve(true),
  getFeatureOptions: () =>
    Promise.resolve({ defaultChannel: "x", mastodonInstance: "example.social", includeHashtags: true }),
}));
// The feature is loaded inside jest.isolateModules, so the mock reads its behaviour from a global the tests control.
jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getProfile: (...args) => global.mockGetProfile(...args),
    getRelatives: (...args) => global.mockGetRelatives(...args),
    getAncestors: (...args) => global.mockGetAncestors(...args),
    getPeople: (...args) => global.mockGetPeople(...args),
  },
}));
jest.mock("../../core/clipboard.js", () => ({ copyToClipboard: jest.fn(() => Promise.resolve()) }));

function typeSubject(value) {
  const box = document.getElementById("wbeShareSubject");
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

function typeInto(value) {
  const box = document.getElementById("wbeShareText");
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

const NAME_FIELDS = ["Privacy", "IsLiving", "FirstName", "MiddleName", "LastNameCurrent", "ResearchStatus"];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// The button checks the privacy level again when it is clicked, so opening the dialog takes a few ticks.
// A DOM click event: the feature has its own copy of jQuery, and jQuery's trigger does not click links. (Not el.click():
// one test replaces links' click() to catch downloads.)
async function clickShare() {
  document
    .querySelector(".wbe-share-button")
    .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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
      if (!picture) return;
      if (picture._src) global.mockDrawn.push(picture._src);
      else if (picture.tagName === "CANVAS") global.mockDrawn.push(`canvas:${picture.width}x${picture.height}`);
    },
    strokeRect() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc(...args) {
      global.mockArcs.push(args);
    },
    ellipse() {},
    fill() {},
    stroke() {},
  });
  window.HTMLCanvasElement.prototype.toDataURL = function () {
    global.mockCanvasSizes.push([this.width, this.height]);
    return "data:image/png;base64,AAAA";
  };
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
        } else if (size && (/photo\.php/.test(value) || /^data:image\/(jpeg|png)/.test(value))) {
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

// the relatives on the test profile, all deceased and public unless a test says otherwise
const relative = (Name, IsLiving = 0, Privacy = 60) => ({ Name, IsLiving, Privacy });
const FIRMAN_RELATIVES = () => [
  {
    person: {
      Parents: { 1: relative("Robinson-27275"), 2: relative("Boushon-120") },
      Spouses: { 3: relative("Budd-1260"), 4: relative("Showalter-1") },
      Children: { 5: relative("Robinson-27360"), 6: relative("Robinson-27361") },
    },
  },
];

beforeEach(() => {
  global.mockGetRelatives = jest.fn(() => Promise.resolve(FIRMAN_RELATIVES()));
  global.mockGetAncestors = jest.fn(() => Promise.resolve([relative("Robinson-27274"), relative("Robinson-27275")]));
  global.mockSvgSources = [];
  global.mockCardText = [];
  global.mockCanvasSizes = [];
  global.mockGetPeople = jest.fn(() => Promise.resolve(["", {}, {}]));
  global.mockArcs = [];
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
    // a link like the others in the bar, with the share icon
    expect($("#jump-nav a.wbe-share-link").text()).toBe("Share");
    expect($("#jump-nav a.wbe-share-link svg.wbe-share-icon").length).toBe(1);
  });

  test("a signed-in member gets a share icon in the row of WBE buttons instead", async () => {
    global.chrome = { runtime: { getURL: (path) => `chrome-extension://wbe/${path}` } };
    try {
      await loadFeature(
        "/wiki/Robinson-27274",
        `<div class="profile--actions float-end"><a class="action--reading-mode"></a></div>${PROFILE_HTML}`
      );
      const $button = $(".profile--actions .clipboardContainer a.wbe-share-button");
      expect($button.length).toBe(1);
      expect($("#jump-nav .wbe-share-button").length).toBe(0);
      expect($button.find("span").css("background-image")).toContain("images/share.svg");
      expect($(".clipboardContainer").next().hasClass("action--reading-mode")).toBe(true);
      // a native click: the feature has its own copy of jQuery, and jQuery's trigger does not click links
      $button[0].click();
      for (let i = 0; i < 5; i++) await tick();
      expect($(".wbe-share-overlay").length).toBe(1);
    } finally {
      delete global.chrome;
    }
  });

  test("a category gets a Share link at the end of its Categories row", async () => {
    await loadFeature(
      "/wiki/Category:Germany",
      `<div class="row page--title"><div class="col-11"><h1>Category: Germany</h1></div><div class="col-1 text-end"></div></div>
       <p class="mb-0" id="Categories"><a href="/wiki/Category:Categories">Categories</a>: <span><a href="/wiki/Category:Europe_(en)">Europe (en)</a></span></p>`,
      "Category: Germany"
    );
    const $link = $("#Categories > a.wbe-share-link.wbe-share-in-categories");
    expect($link.length).toBe(1);
    expect($link.text()).toBe("Share");
    expect($("h1 + .wbe-share-button, .page--title .wbe-share-button").length).toBe(0);
    await clickShare();
    expect($(".wbe-share-overlay").length).toBe(1);
  });

  test("the Share link in the heading is not read as part of the page's name", async () => {
    await loadFeature("/wiki/Project:One_Name_Studies", `<h1>Project: One Name Studies</h1>`, "");
    expect($("h1 .wbe-share-in-heading").length).toBe(1);
    await clickShare();
    expect($("#wbeShareText").val()).toContain("One Name Studies");
    expect($("#wbeShareText").val()).not.toMatch(/Studies\s*Share/);
  });

  test("a Project page gets a Share link at the end of its title line, after the copy buttons", async () => {
    await loadFeature(
      "/wiki/Project:One_Name_Studies",
      `<div class="row page--title"><div class="col-11"><h1>Project: One Name Studies<ul class="copy--buttons"><li>ID</li></ul></h1></div></div>`,
      "Project: One Name Studies"
    );
    const $link = $("h1 .copy--buttons + a.wbe-share-link.wbe-share-in-heading");
    expect($link.length).toBe(1);
    expect($link.text()).toBe("Share");
    await clickShare();
    expect($(".wbe-share-overlay").length).toBe(1);
  });

  test("in a jump bar, Share follows the page's links, before the Scissors copy buttons", async () => {
    await loadFeature(
      "/photo/gif/Flags",
      `<h1>Flag of Germany</h1><ul id="jump-nav"><li><a href="#Details">Photo Details</a></li>
       <li><a href="#Background">Set as Background</a></li><ul class="copy--buttons"><li>ID</li></ul></ul>`,
      "Flag of Germany"
    );
    const items = $("#jump-nav").children().toArray();
    expect($(items[2]).hasClass("wbe-share-item")).toBe(true);
    expect($(items[3]).hasClass("copy--buttons")).toBe(true);
  });

  test("does nothing on pages it does not cover", async () => {
    await loadFeature("/g2g/", PROFILE_HTML);
    expect($(".wbe-share-button").length).toBe(0);
  });

  test("opens with the default channel, the page title, the link, the tag and the hashtags", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-overlay").length).toBe(1);
    expect($(".wbe-share-channel").length).toBe(11);
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

  const chooseEmail = () =>
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Email")
      .trigger("click");

  test("Email has a subject, a message with the link and no tags, and opens the mail program", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-subject").prop("hidden")).toBe(true);
    chooseEmail();
    expect($(".wbe-share-subject").prop("hidden")).toBe(false);
    expect($("#wbeShareSubject").val()).toMatch(/ on WikiTree$/);
    const text = $("#wbeShareText").val();
    expect(text).toContain("https://www.wikitree.com/wiki/Robinson-27274");
    expect(text).not.toContain("@");
    expect(text).not.toContain("#");
    const $open = $(".wbe-share-actions a.wbe-share-mailto");
    expect($open.length).toBe(1);
    expect($open.attr("href")).toMatch(/^mailto:\?subject=/);
    expect($open.attr("target")).toBeUndefined();
    expect($(".wbe-share-pvsubject").text()).toBe(`Subject: ${$("#wbeShareSubject").val()}`);
  });

  test("editing the subject and message changes the mail link and the webmail links", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    chooseEmail();
    typeSubject("Look at this");
    typeInto("My own words");
    const href = $(".wbe-share-mailto").attr("href");
    expect(href).toContain("subject=Look%20at%20this");
    expect(href).toContain("body=My%20own%20words");
    const links = $(".wbe-share-webmail a");
    expect(links.length).toBe(3);
    links.each((i, el) => {
      expect($(el).attr("href")).toMatch(/^https:\/\//);
      expect($(el).attr("href")).toContain("Look%20at%20this");
    });
    expect($(".wbe-share-webmail").prop("hidden")).toBe(false);
  });

  test("the subject and webmail links are hidden on other channels, and Reset restores the subject", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    chooseEmail();
    const suggested = $("#wbeShareSubject").val();
    typeSubject("Changed");
    $(".wbe-share-reset").trigger("click");
    expect($("#wbeShareSubject").val()).toBe(suggested);
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Bluesky")
      .trigger("click");
    expect($(".wbe-share-subject").prop("hidden")).toBe(true);
    expect($(".wbe-share-webmail").prop("hidden")).toBe(true);
    expect($(".wbe-share-pvsubject").prop("hidden")).toBe(true);
  });

  test("Email has a Copy subject button that copies the subject", async () => {
    const { copyToClipboard } = require("../../core/clipboard.js");
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    chooseEmail();
    typeSubject("Look at this");
    const $copy = $(".wbe-share-actions button").filter((i, el) => $(el).text() === "Copy subject");
    expect($copy.length).toBe(1);
    $copy.trigger("click");
    expect(copyToClipboard).toHaveBeenLastCalledWith("Look at this");
  });

  test("Email's share sheet button is labelled for the picture and sends no title", async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn(() => Promise.resolve());
    try {
      await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
      await clickShare();
      chooseEmail();
      const $share = $(".wbe-share-actions button").filter((i, el) => $(el).text() === "Share with picture…");
      expect($share.length).toBe(1);
    } finally {
      delete navigator.canShare;
      delete navigator.share;
    }
  });

  test("Email says pictures must be attached by hand", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    chooseEmail();
    expect($(".wbe-share-note").text()).toContain("Email cannot receive pictures");
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

  test("a tree widget gets a Share link at the end of its heading", async () => {
    await loadFeature(
      "/treewidget/Robinson-27274/6",
      `<h1>Share Firman Robinson's Tree on Facebook</h1><p>To share...</p>`
    );
    const $button = $("h1 .wbe-share-button");
    expect($button.length).toBe(1);
    expect($button.hasClass("wbe-share-in-heading")).toBe(true);
    expect($button.find(".wbe-share-icon").length).toBe(1);
  });

  test("a living person's tree widget gets no Share button", async () => {
    global.mockGetProfile = jest.fn(() => Promise.resolve([{ Privacy: 60, IsLiving: 1 }, 0, "x"]));
    await loadFeature("/treewidget/Beacall-6/6", `<h1>Share Ian Beacall's Tree on Facebook</h1>`);
    expect($(".wbe-share-button").length).toBe(0);
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

  test("the picture can go under the text, and the choice only shows for a photo on a card with text", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    await settle();
    const place = document.getElementById("wbeSharePhotoPlace");
    expect($(".wbe-share-photoplace").prop("hidden")).toBe(false);
    expect(place.value).toBe("beside");
    const before = global.mockCanvasSizes.length;
    place.value = "under";
    place.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(global.mockCanvasSizes.length).toBeGreaterThan(before);
    // with no picture on the card there is nothing to place
    $(".wbe-share-cardphotobtn")[0].click();
    await settle();
    expect($(".wbe-share-photoplace").prop("hidden")).toBe(true);
  });

  test("a help page shows its opening text and does not list its headings", async () => {
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
    expect(drawn).not.toContain("ON THIS PAGE");
    expect(drawn).not.toContain("Topical Projects");
    expect(drawn).not.toContain("Functional Projects");
    expect($("#wbeShareSummary").val()).toContain("A project is a group of members");
  });

  test("a project page shows its opening text and does not list its headings", async () => {
    await loadFeature(
      "/wiki/Project:Acadians",
      `<main><h1>Acadians Project</h1><div class="body-text"><p>The Acadians Project on WikiTree is dedicated to building a single, well-sourced family tree of the French immigrants who settled in Acadia.</p>
        <h2>Mission[edit] <ul class="copy--buttons"><li><button>Link</button></li><li><button>URL</button></li></ul></h2>
        <h2>How to join<span class="editsection">[edit]</span></h2></div></main>`,
      "Acadians Project | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    const drawn = global.mockCardText.join("|");
    expect(drawn).not.toContain("ON THIS PAGE");
    expect(drawn).not.toContain("Mission");
    expect(drawn).not.toContain("How to join");
    expect($("#wbeShareSummary").val()).toContain("The Acadians Project on WikiTree");
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

  const HUB_PAGE = `<main>
      <section id="surname-heading" class="has--bg_img" style="background-image: url('https://www.wikitree.com/photo.php/a/aa/ADWP-780.png')">
        <div class="row page--title"><div class="col"><h1>Peasley Genealogy Hub</h1></div>
          <div class="col-auto"><div><img alt="" src="/photo.php/thumb/e/ed/Robinson-27225-1.jpg/75px-Robinson-27225-1.jpg"></div>
            <div>Coordinator: <a href="/wiki/Robinson-27225">Azure Robinson</a></div></div></div>
      </section>
      <ul id="jump-nav"></ul>
      <div class="container">
        <h2>Peasley Collaboration</h2>
        <p>Surname Collaboration Score: 95.30% No change from last week.</p>
        <p>Rank: 8,840th most popular surname on WikiTree, with 585 Open profiles. 9 places up from last week!</p>
        <p>Here are the 300 most-recently added or edited Peasley ancestors. Search all 652 profiles.</p>
        <p>1 members with the surname Peasley have taken Y-Chromosome DNA tests, connecting 222 profiles.</p>
        <p>1 members with the surname Peasley have taken mitochondrial DNA tests, connecting 25 profiles.</p>
        <p>5 members with the surname Peasley have taken autosomal DNA tests, connecting 342 profiles.</p>
      </div></main>`;
  const HUB_TITLE = "Peasley Genealogy | WikiTree FREE Family Tree";

  test("a surname hub offers its score, rank, DNA, coordinator and background as card pictures, starting with the score", async () => {
    global.mockPhotoSize = [300, 300];
    await loadFeature("/genealogy/PEASLEY", HUB_PAGE, HUB_TITLE);
    await clickShare();
    await settle();
    const buttons = $(".wbe-share-cardphotobtn").toArray();
    expect(buttons.map((b) => b.getAttribute("title") || b.textContent)).toEqual([
      "None",
      "Collaboration score",
      "Rank",
      "DNA tests",
      "Coordinator: Azure Robinson",
      "One-name study background",
    ]);
    expect(buttons.map((b) => b.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
    expect(global.mockDrawn).toContain("canvas:260x300"); // the drawn score badge is on the card

    const drawn = global.mockCardText.join("|");
    expect(drawn).toContain("PROFILES");
    expect(drawn).toContain("OPEN PROFILES");
    expect(drawn).toContain("585");
    expect(drawn).toContain("8,840th");
    expect(drawn).toContain("COORDINATOR");
    expect(drawn).toContain("Azure Robinson");
    expect($("#wbeShareSummary").val()).toContain("The surname collaboration score is 95%.");
  });

  test("choosing the coordinator's photo or the background puts that picture on the card; None removes it", async () => {
    global.mockPhotoSize = [300, 300];
    await loadFeature("/genealogy/PEASLEY", HUB_PAGE, HUB_TITLE);
    await clickShare();
    await settle();
    const buttons = () => $(".wbe-share-cardphotobtn").toArray();

    global.mockDrawn = [];
    buttons()[4].click(); // the coordinator
    await settle();
    expect(global.mockDrawn).toContain("https://www.wikitree.com/photo.php/e/ed/Robinson-27225-1.jpg");
    expect(global.mockDrawn).not.toContain("canvas:260x300");

    global.mockDrawn = [];
    buttons()[5].click(); // the background
    await settle();
    expect(global.mockDrawn).toContain("https://www.wikitree.com/photo.php/a/aa/ADWP-780.png");

    global.mockDrawn = [];
    buttons()[0].click(); // none
    await settle();
    expect(global.mockDrawn).toEqual([]);
  });

  test("a surname hub with no score, rank or DNA tests starts with no picture and offers only what it has", async () => {
    await loadFeature(
      "/genealogy/NEWNAME",
      `<main><ul id="jump-nav"></ul><div class="container"><h1>Newname Genealogy Hub</h1><p>Search all 3 profiles.</p></div></main>`,
      "Newname Genealogy | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    expect($(".wbe-share-cardphoto").prop("hidden")).toBe(true); // nothing to choose from
    expect($("#wbeShareSummary").val()).toBe(
      "Explore the 3 Newname profiles on WikiTree: ancestors, cousins and community members, and how they connect."
    );
  });

  const livingRelative = (id) => {
    const items = FIRMAN_RELATIVES();
    ["Parents", "Spouses", "Children"].forEach((group) =>
      Object.values(items[0].person[group]).forEach((r) => {
        if (r.Name === id) r.IsLiving = 1;
      })
    );
    return items;
  };
  const summaryOf = async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    return $("#wbeShareSummary").val();
  };

  const NOTABILITY_HTML = `
    <h2 id="Biography"><span class="mw-headline">Biography</span></h2>
    <div class="row align-items-center mb-3"><div class="col-auto"><img alt="This is a Notability Statement that summarizes the person's significance for history or genealogy." src="/photo.php/thumb/9/98/WTIL-32.png/50px-WTIL-32.png"></div>
      <div class="col fw-bold"><b>Firman Joseph Robinson</b> was a   noted
        fiddler and farmer. He is remembered as the Fiddler of Caledonia.</div></div>`;
  const STATEMENT =
    "Firman Joseph Robinson was a noted fiddler and farmer. He is remembered as the Fiddler of Caledonia.";

  test("the share card is a 1080 by 1080 square, like an Instagram post", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect(global.mockCanvasSizes).toContainEqual([1080, 1080]);
    expect(global.mockCanvasSizes).not.toContainEqual([1200, 630]);
  });

  test("a profile with a Notability statement starts the card text with it", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML + NOTABILITY_HTML);
    await clickShare();
    expect($("#wbeShareSummary").val()).toBe(STATEMENT);
    expect($(".wbe-share-biosource").prop("hidden")).toBe(false);
    expect(global.mockCardText.join("|")).toContain("fiddler and farmer");
  });

  test("the member can switch the card text to the life summary, or to both", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML + NOTABILITY_HTML);
    await clickShare();
    const choose = (value) => {
      const select = document.getElementById("wbeShareBioSource");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    choose("life");
    const life = $("#wbeShareSummary").val();
    expect(life).not.toContain("fiddler");
    expect(life.length).toBeGreaterThan(20);
    choose("both");
    expect($("#wbeShareSummary").val()).toBe(`${STATEMENT} ${life}`);
    choose("notability");
    expect($("#wbeShareSummary").val()).toBe(STATEMENT);
  });

  test("a profile without a Notability statement has no source choice", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect($(".wbe-share-biosource").prop("hidden")).toBe(true);
    expect($("#wbeShareSummary").val()).toContain("was born in Caledonia");
  });

  test.each([
    [60, "Gold Standard: Genealogically Complete and Peer Reviewed"],
    [50, "Gold Standard Candidate"],
    [40, "Silver Standard"],
  ])("a profile at research status %i shows %s on the card", async (code, label) => {
    global.mockGetProfile = jest.fn(() =>
      Promise.resolve([{ Privacy: 60, IsLiving: 0, ResearchStatus: code }, 0, "page"])
    );
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect(global.mockCardText).toContain(label);
  });

  test.each([0, 10, 20, 30])("research status %i is not shown on the card", async (code) => {
    global.mockGetProfile = jest.fn(() =>
      Promise.resolve([{ Privacy: 60, IsLiving: 0, ResearchStatus: code }, 0, "page"])
    );
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    expect(global.mockCardText.join("|")).not.toMatch(/Standard|Unfinished|Help Requested|Sources to Review/);
  });

  test("the card names relatives the API says are deceased", async () => {
    const bio = await summaryOf();
    expect(global.mockGetRelatives).toHaveBeenCalledWith(
      "sharePage",
      ["Robinson-27274"],
      ["Name", "IsLiving", "Privacy"],
      {
        getParents: 1,
        getSpouses: 1,
        getChildren: 1,
      }
    );
    expect(bio).toContain("the son of William Thomas Robinson and Lucy Jane (Boushon) Gant");
    expect(bio).toContain("He was the father of Naomi Lucy (Robinson) Anderson and Carl William Robinson Sr.");
  });

  test("a living child is not named, only counted", async () => {
    global.mockGetRelatives = jest.fn(() => Promise.resolve(livingRelative("Robinson-27360")));
    const bio = await summaryOf();
    expect(bio).not.toContain("Naomi");
    expect(bio).toContain("He was the father of Carl William Robinson Sr and 1 more.");
  });

  test("if every child is living the card says how many, with no names", async () => {
    global.mockGetRelatives = jest.fn(() =>
      Promise.resolve(
        livingRelative("Robinson-27360").map((item) => {
          item.person.Children[6].IsLiving = 1;
          return item;
        })
      )
    );
    const bio = await summaryOf();
    expect(bio).not.toContain("Naomi");
    expect(bio).not.toContain("Carl William Robinson Sr");
    expect(bio).toContain("He was the father of 2 children.");
  });

  test("a living spouse is not named on the card or in the text", async () => {
    global.mockGetRelatives = jest.fn(() => Promise.resolve(livingRelative("Budd-1260")));
    const bio = await summaryOf();
    expect(bio).not.toContain("Leona");
    expect(bio).toContain("He married Erma Faye (Showalter) Robinson in 1968.");
    expect(global.mockCardText.join("|")).not.toContain("Leona");
  });

  test("a relative with a Private profile is not named", async () => {
    global.mockGetRelatives = jest.fn(() => {
      const items = FIRMAN_RELATIVES();
      items[0].person.Parents[1].Privacy = 10;
      return Promise.resolve(items);
    });
    const bio = await summaryOf();
    expect(bio).not.toContain("William Thomas Robinson");
    expect(bio).toContain("the son of Lucy Jane (Boushon) Gant");
  });

  test("if the API cannot say who is living, no relative is named", async () => {
    global.mockGetRelatives = jest.fn(() => Promise.reject(new Error("network")));
    const bio = await summaryOf();
    ["William Thomas", "Boushon", "Leona", "Showalter", "Naomi", "Carl William Robinson Sr"].forEach((name) =>
      expect(bio).not.toContain(name)
    );
    expect(bio).toContain("He was the father of 2 children.");
    const drawn = global.mockCardText.join("|");
    expect(drawn).not.toContain("Leona");
    expect(drawn).not.toContain("PARENTS");
  });

  test("the fan chart's picture is used when every ancestor in it is deceased and not private", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
      `<h2 id="view-title">Fan Chart</h2><span id="numGensInBBar">5</span><div id="view-container"></div>`
    );
    await clickShare();
    expect(global.mockGetAncestors).toHaveBeenCalledWith("sharePage", "Robinson-27274", 5, [
      "Name",
      "IsLiving",
      "Privacy",
    ]);
    expect($(".wbe-share-note").text()).not.toContain("living");
  });

  const withBoxes = async (fn) => {
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
      await fn();
      await new Promise((resolve) => setTimeout(resolve, 1800)); // the capture waits for the drawing to settle
    } finally {
      window.Element.prototype.getBoundingClientRect = getBox;
    }
  };
  const PEOPLE_SVG = `<svg id="fanChartSVG" width="600" height="400">
      <path d="M0 0L90 90 L0 90Z" fill="#cceeee"/>
      <text x="10" y="10">Living Person</text>
      <image href="/photo.php/thumb/a/aa/Person-1.jpg/75px-Person-1.jpg" width="20" height="20"/>
      <foreignObject x="0" y="0" width="60" height="60"><div>Another Living Person</div></foreignObject>
    </svg>`;

  test("a fan chart with a living ancestor in it is pictured as shapes only, with no names or portraits", async () => {
    global.mockGetAncestors = jest.fn(() =>
      Promise.resolve([relative("Robinson-27274"), relative("Robinson-99999", 1)])
    );
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
        `<h2 id="view-title">Fan Chart</h2><div id="view-container">${PEOPLE_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockSvgSources.length).toBeGreaterThan(0); // the chart was captured
    global.mockSvgSources.forEach((svg) => {
      expect(svg).toContain("<path");
      expect(svg).not.toMatch(/Living Person|<text|<image|<img|<foreignObject/);
    });
    expect($(".wbe-share-note").text()).toContain("may include living or private people");
  });

  test("the fan chart's picture keeps its names when every ancestor is deceased and not private", async () => {
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
        `<h2 id="view-title">Fan Chart</h2><div id="view-container">${PEOPLE_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockSvgSources.join("")).toContain("Living Person");
    expect($(".wbe-share-note").text()).not.toContain("Names and portraits are left off");
  });

  test("the fan chart's picture has no names when the API cannot say who is in it", async () => {
    global.mockGetAncestors = jest.fn(() => Promise.reject(new Error("network")));
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
        `<h2 id="view-title">Fan Chart</h2><div id="view-container">${PEOPLE_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockSvgSources.join("")).not.toContain("Living Person");
    expect($(".wbe-share-note").text()).toContain("may include living or private people");
  });

  test.each([
    ["descendants", "Descendants"],
    ["dynamictree", "Dynamic Tree"],
    ["superbig", "Super Tree"],
  ])("the %s view is pictured as shapes only, and the API is not asked about it", async (view, name) => {
    await withBoxes(async () => {
      await loadFeature(
        `/apps/Robinson-27274#name=Robinson-27274&view=${view}`,
        `<h2 id="view-title">${name}</h2><div id="view-container">${PEOPLE_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockGetAncestors).not.toHaveBeenCalled();
    expect(global.mockSvgSources.length).toBeGreaterThan(0);
    global.mockSvgSources.forEach((svg) => expect(svg).not.toMatch(/Living Person|<text|<image|<img|<foreignObject/));
    expect($(".wbe-share-note").text()).toContain("Names and portraits are left off this picture");
  });

  const SLIPPY_SVG = `<svg id="slippy" width="600" height="400">
      <g class="people">
        <g id="person-101" class="member"><rect width="80" height="20"/><text>Living Jane Robinson</text></g>
        <g id="person-102" class="member"><rect width="80" height="20"/><text>Dead John Robinson (1850-1920)</text></g>
        <g id="person-103" class="member"><rect width="80" height="20"/><text>Private Person</text></g>
      </g>
      <text>Some heading</text>
    </svg>`;
  const people = {
    101: { Id: 101, IsLiving: 1, Privacy: 50 },
    102: { Id: 102, IsLiving: 0, Privacy: 60 },
    103: { Id: 103, IsLiving: 0, Privacy: 10 },
  };
  const openSlippy = (svg = SLIPPY_SVG) =>
    withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=slippyTree",
        `<h2 id="view-title">Slippy Tree</h2><div id="view-container">${svg}</div>`
      );
      await clickShare();
    });

  test("Slippy Tree names only the people the API says are deceased and not private", async () => {
    global.mockGetPeople = jest.fn(() => Promise.resolve(["", {}, people]));
    await openSlippy();
    expect(global.mockGetPeople).toHaveBeenCalledWith(
      "sharePage",
      ["101", "102", "103"],
      ["Id", "IsLiving", "Privacy"]
    );
    const svg = global.mockSvgSources.join("");
    expect(svg).toContain("Dead John Robinson");
    expect(svg).not.toContain("Living Jane");
    expect(svg).not.toContain("Private Person");
    expect(svg).not.toContain("Some heading"); // text that is not a person's is left out
    expect(svg.match(/<rect/g).length).toBe(3); // every box is still drawn
    expect($(".wbe-share-note").text()).toContain("People who are living or private");
  });

  test("Slippy Tree names nobody when the API cannot be reached", async () => {
    global.mockGetPeople = jest.fn(() => Promise.reject(new Error("network")));
    await openSlippy();
    expect(global.mockSvgSources.join("")).not.toMatch(/Dead John|Living Jane|Private Person/);
    expect($(".wbe-share-note").text()).toContain("People who are living or private");
  });

  test("Slippy Tree needs no note when everyone in it can be named", async () => {
    global.mockGetPeople = jest.fn(() =>
      Promise.resolve([
        "",
        {},
        { 102: people[102], 101: { Id: 101, IsLiving: 0, Privacy: 60 }, 103: { Id: 103, IsLiving: 0, Privacy: 50 } },
      ])
    );
    await openSlippy();
    expect(global.mockSvgSources.join("")).toContain("Living Jane Robinson");
    expect($(".wbe-share-note").text()).not.toContain("People who are living or private");
  });

  test("the card shows the person's WikiTree ID next to the kind of page", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    await settle();
    expect(global.mockCardText).toContain("PROFILE");
    expect(global.mockCardText).toContain("·  Robinson-27274");
  });

  test("a Tree Apps card shows the ID of the person whose view it is", async () => {
    await loadFeature(
      "/apps/Robinson-27274#name=Robinson-27274&view=fanchart",
      `<h2 id="view-title">Fan Chart</h2><div id="view-container"></div>`
    );
    await clickShare();
    await settle();
    expect(global.mockCardText).toContain("TREE APPS VIEW");
    expect(global.mockCardText).toContain("·  Robinson-27274");
  });

  test("pages that are not a person's have no ID on the card", async () => {
    await loadFeature(
      "/wiki/Help:Projects",
      `<main><h1>Help:Projects</h1><div class="body-text"><p>A project is a group of members.</p></div></main>`,
      "Help:Projects | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    expect(global.mockCardText.join("|")).not.toContain("·");
  });

  test("a view whose chart is only text has nothing to picture, and the card says so", async () => {
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=descendants",
        `<h2 id="view-title">Descendants</h2><div id="view-container"><ul><li>John Robinson</li></ul></div>`
      );
      await clickShare();
    });
    expect($(".wbe-share-note").text()).toContain("no chart to picture");
    expect($(".wbe-share-note").text()).not.toContain("Names and portraits are left off");
  });

  test("a canvas is not pictured unless names are allowed, because the names in it cannot be taken out", async () => {
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=slippyTree",
        `<h2 id="view-title">Slippy Tree</h2><div id="view-container"><canvas width="600" height="400"></canvas></div>`
      );
      await clickShare();
    });
    expect($(".wbe-share-note").text()).toContain("no chart to picture");
  });

  const ANCESTORS_SVG = `<svg id="webs" width="600" height="400">
      <line x1="0" y1="0" x2="90" y2="90" stroke="#8cf"/>
      <g><rect width="40" height="20" fill="#fff" stroke="#ccc"/><text x="4" y="14">JR</text></g>
    </svg>`;
  const askedFor = (depth) =>
    expect(global.mockGetAncestors).toHaveBeenCalledWith("sharePage", "Robinson-27274", depth, [
      "Name",
      "IsLiving",
      "Privacy",
    ]);

  test.each([
    ["webs", "Ancestor Webs", '<span id="numGensInBBar">4</span>', 4],
    ["fractal", "Fractal Tree", '<span id="numGensInBBar">6</span>', 6],
    ["fractal", "Fractal Tree", "", 10],
    ["xtree", "X Family Tree", "", 10],
    ["ale", "Ancestor Lines Explorer", '<input id="generation" value="7">', 7],
  ])(
    "the %s view keeps its labels when every ancestor it shows is safe (%s generations: %s)",
    async (view, name, counter, depth) => {
      await withBoxes(async () => {
        await loadFeature(
          `/apps/Robinson-27274#name=Robinson-27274&view=${view}`,
          `<h2 id="view-title">${name}</h2>${counter}<div id="view-container">${ANCESTORS_SVG}</div>`
        );
        await clickShare();
      });
      askedFor(depth);
      expect(global.mockSvgSources.join("")).toContain("JR");
      expect($(".wbe-share-note").text()).not.toContain("Names and portraits are left off");
    }
  );

  test("an ancestor view loses its labels when an ancestor in it is living", async () => {
    global.mockGetAncestors = jest.fn(() =>
      Promise.resolve([relative("Robinson-27274"), relative("Robinson-99999", 1)])
    );
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=webs",
        `<h2 id="view-title">Ancestor Webs</h2><span id="numGensInBBar">4</span><div id="view-container">${ANCESTORS_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockSvgSources.length).toBeGreaterThan(0);
    expect(global.mockSvgSources.join("")).not.toMatch(/JR|<text/);
    expect(global.mockSvgSources.join("")).toContain("<rect"); // the boxes stay, without their labels
    expect(global.mockSvgSources.join("")).toContain("<line");
    expect($(".wbe-share-note").text()).toContain("may include living or private people");
  });

  test.each([
    ["webs", "Ancestor Webs", ""], // its generations cannot be read
    ["ale", "Ancestor Lines Explorer", '<input id="generation" value="12">'], // more than the API can check
    ["webs", "Ancestor Webs", '<span id="numGensInBBar">11</span>'],
  ])(
    "%s with unknown or more than 10 generations is never verified, so it has no labels",
    async (view, name, counter) => {
      await withBoxes(async () => {
        await loadFeature(
          `/apps/Robinson-27274#name=Robinson-27274&view=${view}`,
          `<h2 id="view-title">${name}</h2>${counter}<div id="view-container">${ANCESTORS_SVG}</div>`
        );
        await clickShare();
      });
      expect(global.mockGetAncestors).not.toHaveBeenCalled();
      expect(global.mockSvgSources.join("")).not.toContain("JR");
    }
  );

  test("a name cloud of ancestors keeps its names when every ancestor is safe", async () => {
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=namecloud",
        `<h2 id="view-title">Name Cloud</h2><select id="ncloudScope"><option value="ancestors" selected>Ancestors</option><option value="cc7">CC7</option></select>
         <span id="ncloudAmount">5 generations</span><div id="view-container">${ANCESTORS_SVG}</div>`
      );
      await clickShare();
    });
    askedFor(5);
    expect(global.mockSvgSources.join("")).toContain("JR");
  });

  test("a name cloud of CC7, a category or a search has no picture, because it is only names", async () => {
    await withBoxes(async () => {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=namecloud",
        `<h2 id="view-title">Name Cloud</h2><select id="ncloudScope"><option value="ancestors">Ancestors</option><option value="cc7" selected>CC7</option></select>
         <span id="ncloudAmount">3 degrees</span><div id="view-container">${ANCESTORS_SVG}</div>`
      );
      await clickShare();
    });
    expect(global.mockGetAncestors).not.toHaveBeenCalled();
    expect(global.mockSvgSources).toEqual([]);
    expect($(".wbe-share-note").text()).toContain("A name cloud is made of names, so the card has no picture");
  });

  test("the CC7 Circles view is pictured as its dots, with no initials or names", async () => {
    const boxes = {
      CirclesBkgd: { left: 0, top: 0, width: 600, height: 600 },
      circlePerson1: { left: 100, top: 100, width: 38, height: 38 },
      circlePerson2: { left: 300, top: 250, width: 38, height: 38 },
      circlePerson3: { left: 450, top: 400, width: 38, height: 38 },
    };
    const getBox = window.Element.prototype.getBoundingClientRect;
    window.Element.prototype.getBoundingClientRect = function () {
      const b = boxes[this.id] || { left: 0, top: 0, width: 600, height: 600 };
      return { ...b, right: b.left + b.width, bottom: b.top + b.height };
    };
    const dot = (id, colour) =>
      `<svg id="${id}" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" fill="${colour} "></ellipse><text x="19" y="22">AB</text></svg>`;
    try {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=cc7",
        `<h2 id="view-title">CC7 Views</h2><div id="view-container"><div id="circlesDisplay">
           <div id="circlesDIV4SVG"><svg id="CirclesBkgd" width="600" height="600"><rect id="CirclesBkgdRect" width="600" height="600" style="fill:aliceblue"></rect></svg>
           ${dot("circlePerson1", "green")}${dot("circlePerson2", "cyan")}${dot(
          "circlePerson3",
          "orange"
        )}</div></div></div>`
      );
      await clickShare();
      await new Promise((resolve) => setTimeout(resolve, 1800));
    } finally {
      window.Element.prototype.getBoundingClientRect = getBox;
    }
    expect(global.mockArcs.length).toBe(3); // one circle for each person
    expect(global.mockCardText.join("|")).not.toMatch(/AB/);
    expect(global.mockSvgSources).toEqual([]); // not captured as an SVG, which would only be the pale background
    expect($(".wbe-share-note").text()).not.toContain("no chart to picture");
  });

  test("the CC7 Circles view draws the central photo when the member chose it", async () => {
    global.mockPhotoSize = [400, 600];
    const boxes = {
      CirclesBkgd: { left: 0, top: 0, width: 600, height: 600 },
      circlePerson1: { left: 281, top: 450, width: 38, height: 38 },
      theCentralPhotoIMG: { left: 250, top: 250, width: 100, height: 150 },
    };
    const getBox = window.Element.prototype.getBoundingClientRect;
    window.Element.prototype.getBoundingClientRect = function () {
      const b = boxes[this.id] || { left: 0, top: 0, width: 600, height: 600 };
      return { ...b, right: b.left + b.width, bottom: b.top + b.height };
    };
    try {
      await loadFeature(
        "/apps/Robinson-27274#name=Robinson-27274&view=cc7",
        `<h2 id="view-title">CC7 Views</h2><div id="view-container"><div id="circlesDisplay">
           <div id="circlesDIV4SVG"><svg id="CirclesBkgd" width="600" height="600"><rect id="CirclesBkgdRect" width="600" height="600" style="fill:aliceblue"></rect></svg>
           <g id="theCentralPhoto" class="image-box"><div><img id="theCentralPhotoIMG" src="https://www.wikitree.com/photo.php/thumb/4/49/Robinson-27274.jpg/300px-Robinson-27274.jpg"></div></g>
           <svg id="circlePerson1" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" fill="green"></ellipse></svg></div></div></div>`
      );
      await clickShare();
      await new Promise((resolve) => setTimeout(resolve, 1800));
    } finally {
      window.Element.prototype.getBoundingClientRect = getBox;
    }
    expect(global.mockDrawn.some((src) => /^data:image\//.test(src))).toBe(true); // the photo, drawn on the circles
    expect(global.mockArcs.length).toBe(1);
  });

  const saveName = async () => {
    const saved = [];
    const click = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
      if (this.download) saved.push(this.download);
    };
    global.URL.createObjectURL = () => "blob:card";
    global.URL.revokeObjectURL = () => {};
    try {
      $(".wbe-share-actions button")
        .filter((i, el) => /Save picture/.test(el.textContent))[0]
        .click();
      for (let i = 0; i < 8; i++) await tick();
    } finally {
      window.HTMLAnchorElement.prototype.click = click;
    }
    return saved;
  };

  test("a profile's card is saved as wtshare- and the profile id", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    await clickShare();
    await settle();
    expect(await saveName()).toEqual(["wtshare-Robinson-27274.png"]);
  });

  test("a free-space page's card is saved as wtshare- and the page name, without the Space: prefix", async () => {
    await loadFeature("/wiki/Space:Andersonia,_California_One_Place_Study", SPACE_PAGE);
    await clickShare();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 50));
    // the card is the first picture, so it is the one selected
    expect(await saveName()).toEqual(["wtshare-Andersonia,_California_One_Place_Study.png"]);
  });

  test("a surname page's card is saved under the surname", async () => {
    await loadFeature(
      "/genealogy/PEASLEY",
      `<main><ul id="jump-nav"></ul><div class="container"><p>Search all 652 profiles.</p></div></main>`,
      "Peasley Genealogy | WikiTree FREE Family Tree"
    );
    await clickShare();
    await settle();
    expect(await saveName()).toEqual(["wtshare-PEASLEY.png"]);
  });
});
