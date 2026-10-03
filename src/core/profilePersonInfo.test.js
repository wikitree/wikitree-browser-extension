/* core/common reads chrome.runtime at import time, so the extension APIs have to exist
before the module is loaded. */
let getProfilePersonInfo;

beforeAll(async () => {
  const noop = () => {};
  global.chrome = {
    runtime: {
      getManifest: () => ({ name: "WBE (Debug)", version: "0" }),
      getURL: (path) => path,
      onMessage: { addListener: noop },
      sendMessage: noop,
      lastError: null,
    },
    storage: { sync: { get: noop, set: noop }, local: { get: noop, set: noop } },
  };
  ({ getProfilePersonInfo } = await import("./common.js"));
});

const pageData = `<div id="pageData" data-mnamedb="Beacall-9" data-mid="123"></div>`;

describe("getProfilePersonInfo FullName", () => {
  test("reads the person-name span on the new profile h1 (staging, Beacall-9)", () => {
    document.body.innerHTML = `${pageData}<h1><span data-cy="person-name">John Philip Beacall</span><span class="distanceFromYou">3°</span></h1>`;
    expect(getProfilePersonInfo().FullName).toBe("John Philip Beacall");
  });

  test("falls back to the h1's own text on the old profile layout", () => {
    document.body.innerHTML = `${pageData}<h1>John Philip Beacall <button aria-label="Copy ID"></button><span class="distanceFromYou">3°</span></h1>`;
    expect(getProfilePersonInfo().FullName).toBe("John Philip Beacall");
  });

  test("strips 'Edit Profile of' on edit pages", () => {
    document.body.innerHTML = `${pageData}<h1>Edit Profile of John Philip Beacall <a href="#">(Beacall-9)</a></h1>`;
    expect(getProfilePersonInfo().FullName).toBe("John Philip Beacall");
  });
});
