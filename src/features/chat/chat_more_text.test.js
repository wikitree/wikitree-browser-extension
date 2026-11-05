/** @jest-environment jsdom */
import { joinWithAndMore, linesWithMore, moreTextToHtml, plainMoreText, shortMoreText, textWithMoreLink, hasMoreText } from "./chat_more_text";

describe("clickable 'N more'", () => {
  test("joinWithAndMore: plain when everything fits", () => {
    expect(joinWithAndMore(["a", "b", "c"], { max: 3 })).toBe("a, b, and c");
    expect(hasMoreText(joinWithAndMore(["a", "b", "c"], { max: 3 }))).toBe(false);
  });

  test("joinWithAndMore: short form shows the count, the full form every item", () => {
    const text = joinWithAndMore(["a", "b", "c", "d", "e"], { max: 2 });
    expect(shortMoreText(text)).toBe("a, b, and 3 more");
    expect(plainMoreText(text)).toBe("a, b, c, d, and e");
  });

  test("linesWithMore keeps the place words after the link", () => {
    const text = linesWithMore(["- 1", "- 2", "- 3"], 1, { after: " in the table" });
    expect(shortMoreText(text)).toBe("- 1\n…and 2 more in the table.");
    expect(plainMoreText(text)).toBe("- 1\n- 2\n- 3");
    expect(linesWithMore(["- 1", "- 2"], 2)).toBe("- 1\n- 2");
  });

  test("textWithMoreLink: any words around the link", () => {
    const text = `Before ${textWithMoreLink("(", "2 more", " elsewhere.)", "X and Y")} after`;
    expect(shortMoreText(text)).toBe("Before (2 more elsewhere.) after");
    expect(plainMoreText(text)).toBe("Before X and Y after");
  });

  test("the HTML escapes every part and links only the count", () => {
    const html = moreTextToHtml(`<b> ${joinWithAndMore(["<i>", "b", "c"], { max: 1 })}`);
    expect(html).toBe(
      '&lt;b&gt; <span class="wbe-more"><span class="wbe-more-short">&lt;i&gt; and <a href="#" class="chat-results-link wbe-more-open">2 more</a></span>' +
        '<span class="wbe-more-full" hidden>&lt;i&gt;, b, and c</span></span>'
    );
  });

  test("clicking the link shows the full form in its place", () => {
    document.body.innerHTML = `<div>${moreTextToHtml(linesWithMore(["- 1", "- 2", "- 3"], 1), (t) => t.replace(/\n/g, "<br>"))}</div>`;
    document.querySelector(".wbe-more-open").click();
    expect(document.querySelector(".wbe-more-short")).toBeNull();
    expect(document.querySelector(".wbe-more-full").hidden).toBe(false);
    expect(document.body.textContent).toBe("- 1- 2- 3");
  });
});
