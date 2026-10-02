import { contrastRatio, hexToRgb, isLight, raiseContrast, readableTextColor } from "./colorUtils";

describe("readableTextColor", () => {
  test("picks the colour with the better contrast, not the one that looks light", () => {
    // Both of these scored just under isLight's brightness threshold of 155, so the old
    // rule gave them white text: #C68900 at 3.01:1 and #00D6A5 at 1.9:1. Both shipped in
    // the Color-Blind Support palettes.
    ["#C68900", "#00D6A5"].forEach((hex) => {
      const background = hexToRgb(hex);
      expect(isLight(background)).toBe(false);
      expect(readableTextColor(background)).toBe("#000000");
      expect(contrastRatio(background, [0, 0, 0])).toBeGreaterThan(4.5);
    });
  });

  test("whatever it returns clears 4.5:1, across the whole range", () => {
    for (let value = 0; value <= 255; value += 5) {
      [
        [value, 0, 0],
        [0, value, 0],
        [0, 0, value],
        [value, value, value],
        [255, value, value],
      ].forEach((background) => {
        const ratio = contrastRatio(background, hexToRgb(readableTextColor(background)));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  test("agrees with the obvious answer at the extremes", () => {
    expect(readableTextColor([255, 255, 255])).toBe("#000000");
    expect(readableTextColor([0, 0, 0])).toBe("#ffffff");
  });

  test("leaves isLight alone, which custom_style still relies on", () => {
    // Still Rec.601 brightness against 155. The two answer different questions and only
    // readableTextColor was changed.
    expect(isLight(hexToRgb("#C68900"))).toBe(false);
    expect(isLight(hexToRgb("#FF85AD"))).toBe(true);
  });
});

describe("raiseContrast", () => {
  test("lightens a colour until it is readable on the given background", () => {
    const darkBlue = hexToRgb("#003366");
    const darkPage = hexToRgb("#36393f");
    expect(contrastRatio(darkBlue, darkPage)).toBeLessThan(4.5);

    const raised = raiseContrast(darkBlue, darkPage, 4.5);
    expect(contrastRatio(raised, darkPage)).toBeGreaterThanOrEqual(4.5);
  });

  test("leaves a colour alone when it already clears the bar", () => {
    const bright = hexToRgb("#14ABFF");
    expect(raiseContrast(bright, hexToRgb("#36393f"), 4.5)).toEqual(bright);
  });

  test("gives up rather than spinning when the bar cannot be met", () => {
    // Lightening a colour can only ever reduce its contrast against white, so this target
    // is unreachable by construction and the loop has to stop on its own step limit.
    const result = raiseContrast(hexToRgb("#888888"), hexToRgb("#ffffff"), 21);
    expect(result).toHaveLength(3);
    expect(contrastRatio(result, hexToRgb("#ffffff"))).toBeLessThan(21);
  });
});
