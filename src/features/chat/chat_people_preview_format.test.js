import { formatPreviewDate, formatPreviewName } from "./chat_people";

// Live C2, 2026-10-03: ancestor lists showed "Ellen (Cook-8721) [b. 1835-00-00]".
describe("preview line formatting", () => {
  test.each([
    ["1835-00-00", "1835"],
    ["1835-03-00", "1835-03"],
    ["1835-03-07", "1835-03-07"],
    ["1830s", "1830s"],
    ["", ""],
  ])("date %s", (value, shown) => {
    expect(formatPreviewDate(value)).toBe(shown);
  });

  test("names", () => {
    expect(formatPreviewName({ displayName: "Ellen", lnab: "Cook", lastNameCurrent: "Alley" })).toBe("Ellen (Cook) Alley");
    expect(formatPreviewName({ displayName: "John", lnab: "Beacall", lastNameCurrent: "Beacall" })).toBe("John Beacall");
    expect(formatPreviewName({ displayName: "John Beacall", lnab: "Beacall" })).toBe("John Beacall");
    expect(formatPreviewName({ displayName: "Arthur Edmond", lnab: "Bloomfield" })).toBe("Arthur Edmond Bloomfield");
    expect(formatPreviewName({ displayName: "Private", lnab: "X" })).toBe("Private");
    expect(formatPreviewName({ displayName: "Ellen" })).toBe("Ellen");
  });
});
