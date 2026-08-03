import { hasDiedYoungSticker, diedYoungStickers } from "./stickers.js";

describe("hasDiedYoungSticker", () => {
  test("finds a plain Died Young sticker", () => {
    expect(hasDiedYoungSticker("== Biography ==\n{{Died Young}}\nBorn in 1850.")).toBe(true);
  });

  test("finds a Died Young sticker with an image parameter", () => {
    expect(hasDiedYoungSticker("{{Died Young|Ribbon}}")).toBe(true);
  });

  test("finds a Stillborn sticker", () => {
    expect(hasDiedYoungSticker("== Biography ==\n{{Stillborn}}")).toBe(true);
  });

  test("ignores case and inner whitespace", () => {
    expect(hasDiedYoungSticker("{{ died young }}")).toBe(true);
  });

  test("accepts underscores in the template name", () => {
    expect(hasDiedYoungSticker("{{Died_Young}}")).toBe(true);
  });

  test("is false for a bio with no such sticker", () => {
    expect(hasDiedYoungSticker("== Biography ==\n{{Unsourced}}\nBorn in 1850.")).toBe(false);
  });

  test("does not match a longer template name that merely starts the same", () => {
    expect(hasDiedYoungSticker("{{Died Young Memorial Project}}")).toBe(false);
  });

  test("handles undefined, null, empty and non-string input", () => {
    expect(hasDiedYoungSticker(undefined)).toBe(false);
    expect(hasDiedYoungSticker(null)).toBe(false);
    expect(hasDiedYoungSticker("")).toBe(false);
    expect(hasDiedYoungSticker(["{{Died Young}}"])).toBe(false);
  });

  test("works on a single template, as used when checking collected stickers", () => {
    const stickers = ["{{Unsourced}}", "{{Died Young|Ribbon}}"];
    expect(stickers.some((sticker) => hasDiedYoungSticker(sticker))).toBe(true);
  });

  test("recognises every sticker it advertises", () => {
    diedYoungStickers.forEach((sticker) => {
      expect(hasDiedYoungSticker(`{{${sticker}}}`)).toBe(true);
    });
  });
});
