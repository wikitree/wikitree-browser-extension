import { parseStatusPlaceDecadePrompt } from "./chat_status_place_decade_parser";

describe("parseStatusPlaceDecadePrompt", () => {
  test.each([
    ["Shropshire unsourced born in 1820s", "Unsourced Location=Shropshire 1820s"],
    ["unsourced profiles in Shropshire born 1820s", "Unsourced Location=Shropshire 1820s"],
    ["Shropshire 1820s no sources", "Unsourced Location=Shropshire 1820s"],
    ["born in the 1820s, Shropshire, missing sources", "Unsourced Location=Shropshire 1820s"],
    ["unsourced Shropshire, England born in 1820s", 'Unsourced Location="Shropshire, England" 1820s'],
    ["find unconnected people in Devon born in the 1850s", "Unconnected Location=Devon 1850s"],
  ])("%s", (prompt, query) => {
    expect(parseStatusPlaceDecadePrompt(prompt)?.query).toBe(query);
  });

  test.each([
    "Shropshire born in 1820s", // no status word
    "unsourced Shropshire", // no decade
    "Shropshire unsourced born in 1820s with large spousal age gaps", // leftover words
    "Smith-123 unsourced 1820s",
    "Shropshire unsourced men born in 1820s",
    "unsourced profiles in Shropshire born 1820s, any gender",
  ])("returns null: %s", (prompt) => {
    expect(parseStatusPlaceDecadePrompt(prompt)).toBeNull();
  });
});
