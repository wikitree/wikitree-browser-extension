/* dateUtils reads chrome.runtime (via core/common) at import time, so stub it first. */
let formatDate;

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
  ({ formatDate } = await import("./dateUtils.js"));
});

describe("formatDate", () => {
  it("formats ordinary dates", () => {
    expect(formatDate("1843-05-22", "", { format: "DMY", needOn: true })).toBe("on 22 May 1843");
    expect(formatDate("22 May 1843", "", { format: "DMY", needOn: true })).toBe("on 22 May 1843");
    expect(formatDate("1843", "", { format: "DMY", needOn: true })).toBe("in 1843");
  });

  // Coetsee-1144: a baptism citation with no baptism date once handed this non-date over.
  it("returns an empty string for text that isn't a date instead of throwing", () => {
    const notADate = "Colesberg, Cape Colony.'' Added by [[Smit-641|Riël Smit]] on 2026";
    expect(() => formatDate(notADate, "", { needOn: true })).not.toThrow();
    expect(formatDate(notADate, "", { needOn: true })).toBe("");
  });

  it("drops an impossible month rather than crashing", () => {
    expect(formatDate("1843-13-05", "", { format: "DMY" })).toBe("1843");
  });
});
