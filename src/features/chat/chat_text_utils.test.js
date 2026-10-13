import { cleanDate, escapeText, stripSurroundingQuotes, yearOf } from "./chat_text_utils";

// The small helpers several Genie files used to keep their own copies of (2026-10-13).
test("yearOf and cleanDate: a WikiTree date, or nothing for 0000", () => {
  expect([yearOf("1788-01-00"), yearOf("1790s"), yearOf("0000-00-00"), yearOf(""), yearOf(null)]).toEqual([1788, 1790, null, null, null]);
  expect([cleanDate("1788-01-00"), cleanDate("0000-00-00"), cleanDate(undefined)]).toEqual(["1788-01-00", "", ""]);
});

test("escapeText", () => {
  expect(escapeText(`<b>"Tom" & 'Ann'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Ann&#39;&lt;/b&gt;");
  expect([escapeText(null), escapeText(undefined), escapeText(0)]).toEqual(["", "", "0"]);
});

test("stripSurroundingQuotes", () => {
  expect(['"Devon"', " “Devon” ", "'Devon'", "[1850s]", "Devon", null].map((value) => stripSurroundingQuotes(value))).toEqual(["Devon", "Devon", "Devon", "1850s", "Devon", ""]);
});
