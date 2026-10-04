import $ from "jquery";

jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: () => Promise.resolve(true),
  getFeatureOptions: () =>
    Promise.resolve({ defaultChannel: "x", mastodonInstance: "example.social", includeHashtags: true }),
}));
jest.mock("../../core/clipboard.js", () => ({ copyToClipboard: jest.fn(() => Promise.resolve()) }));

function typeInto(value) {
  const box = document.getElementById("wbeShareText");
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function loadFeature(path, html) {
  window.history.pushState({}, "", path);
  document.title = "Firman Joseph Robinson (1901-1991) | WikiTree FREE Family Tree";
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
    fillText() {},
    measureText: () => ({ width: 10 }),
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage() {},
  });
  window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
  window.HTMLCanvasElement.prototype.toBlob = (cb) => cb(new Blob(["x"], { type: "image/png" }));
  global.fetch = () => Promise.resolve({ blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })) });
  global.Image = class {
    set src(value) {
      this._src = value;
      setTimeout(() => this.onerror && this.onerror());
    }
    get src() {
      return this._src;
    }
  };
});

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
    $(".wbe-share-button").trigger("click");
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
    $(".wbe-share-button").trigger("click");
    expect($(".wbe-share-image").length).toBe(3); // card + 2 photos
    expect($(".wbe-share-image small").first().text()).toBe("Share card for this page");
  });

  test("switching channel swaps the tag and keeps the member's edits", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    typeInto("My own words @WikiTreers");
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Mastodon")
      .trigger("click");
    expect($("#wbeShareText").val()).toBe("My own words @wikitree@genealysis.social");
  });

  test("Reddit drops the tags and hashtags", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Reddit")
      .trigger("click");
    const text = $("#wbeShareText").val();
    expect(text).not.toContain("@");
    expect(text).not.toContain("#");
  });

  test("the Open link points at the member's Mastodon server", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    $(".wbe-share-channel")
      .filter((i, el) => $(el).find("b").text() === "Mastodon")
      .trigger("click");
    expect($(".wbe-share-actions a").attr("href")).toMatch(/^https:\/\/example\.social\/share\?text=/);
  });

  test("warns when the text is over the channel's limit", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    typeInto("x".repeat(400));
    expect($(".wbe-share-count").hasClass("wbe-share-over")).toBe(true);
    expect($(".wbe-share-note").text()).toContain("over the limit for X");
  });

  test("a full-screen image shares the image page link and only the image", async () => {
    await loadFeature("/photo.php/4/49/Robinson-27274.jpg", "<h1>Image</h1>");
    $(".wbe-share-button").trigger("click");
    expect($(".wbe-share-image").length).toBe(1);
    expect($("#wbeShareText").val()).toContain("https://www.wikitree.com/photo/jpg/Robinson-27274");
  });

  test("Escape closes the dialog", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect($(".wbe-share-overlay").length).toBe(0);
  });

  test("shows an editable life summary built from the profile's data fields", async () => {
    await loadFeature("/wiki/Robinson-27274", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
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
    $(".wbe-share-button").trigger("click");
    expect($(".wbe-share-summary").prop("hidden")).toBe(true);
  });

  test("other page types have no summary", async () => {
    await loadFeature("/wiki/Help:Sources", PROFILE_HTML);
    $(".wbe-share-button").trigger("click");
    expect($(".wbe-share-summary").prop("hidden")).toBe(true);
  });
});
