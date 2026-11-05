import { generateRowHash } from "./rowHash.js";

describe("generateRowHash", () => {
  test("returns a deterministic hash for rows with unicode text", () => {
    const row = [
      { text: "Thusnelda “Nelda” (Dahl) Krumme", colspan: 1, rowspan: 1 },
      { text: "https://www.findagrave.com/memorial/242060280/thusnelda-krumme", colspan: 1, rowspan: 1 },
      { text: "Dahl-2839", colspan: 1, rowspan: 1 },
    ];

    expect(() => generateRowHash(row)).not.toThrow();
    expect(generateRowHash(row)).toBe(generateRowHash(row));
  });

  test("changes when the row content changes", () => {
    const leftRow = [{ text: "Harold “Tom” Tucker", colspan: 1, rowspan: 1 }];
    const rightRow = [{ text: "Harold Tucker", colspan: 1, rowspan: 1 }];

    expect(generateRowHash(leftRow)).not.toBe(generateRowHash(rightRow));
  });
});
