import { ART_HEIGHT, ART_WIDTH, drawDnaPanel, drawRankBadge, drawScoreBadge } from "./share_page_card_art";

// jsdom has no canvas, so give it one that remembers the text it was asked to draw and the shapes it was asked to fill.
let drawn;
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      canvas: this,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "left",
      measureText: (text) => ({ width: String(text).length * 10 }),
      fillText: (text, x, y) => drawn.text.push([String(text), x, y]),
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      arc: (x, y, r) => drawn.shapes.push(["arc", x, y, r]),
      ellipse: (x, y, rx, ry) => drawn.shapes.push(["ellipse", x, y, rx, ry]),
      fill() {},
      stroke() {},
    };
  };
});
beforeEach(() => {
  drawn = { text: [], shapes: [] };
});
const texts = () => drawn.text.map(([text]) => text);

describe("drawn card pictures", () => {
  test("each is 260 by 300 pixels", () => {
    [drawScoreBadge(95), drawRankBadge(8840), drawDnaPanel("Peasley", { y: { members: 1, profiles: 222 } })].forEach(
      (canvas) => {
        expect(canvas.width).toBe(ART_WIDTH);
        expect(canvas.height).toBe(ART_HEIGHT);
      }
    );
  });

  test("the score badge shows the score as a rounded percentage, in a disc, with a caption", () => {
    drawScoreBadge(95.3);
    expect(texts()).toContain("95");
    expect(texts()).toContain("%");
    expect(texts().join(" ")).toContain("Surname collaboration score"); // it may wrap onto two lines
    expect(drawn.shapes[0][0]).toBe("arc");
  });

  test("the score rounds up and down", () => {
    drawScoreBadge(94.6);
    expect(texts()).toContain("95");
    drawn.text = [];
    drawScoreBadge(94.4);
    expect(texts()).toContain("94");
  });

  test("the rank badge shows the rank as an ordinal, in an oval", () => {
    drawRankBadge(8840);
    expect(texts()).toContain("8,840th");
    expect(texts().join(" ")).toContain("most popular surname on WikiTree");
    expect(drawn.shapes[0][0]).toBe("ellipse");
  });

  test("the DNA panel lists each kind of test that was taken, with members and connected profiles", () => {
    drawDnaPanel("Peasley", {
      y: { members: 1, profiles: 222 },
      mt: { members: 1, profiles: 25 },
      au: { members: 5, profiles: 342 },
    });
    const all = texts();
    expect(all).toContain("Peasley DNA");
    expect(all).toEqual(expect.arrayContaining(["Y", "mt", "au"]));
    expect(all).toEqual(expect.arrayContaining(["1 member", "5 members"]));
    expect(all).toEqual(
      expect.arrayContaining(["connect 222 profiles", "connect 25 profiles", "connect 342 profiles"])
    );
  });

  test("the DNA panel leaves out a test nobody has taken", () => {
    drawDnaPanel("Peasley", { au: { members: 5, profiles: 342 } });
    expect(texts()).toEqual(expect.arrayContaining(["au", "5 members"]));
    expect(texts()).not.toContain("Y");
    expect(texts()).not.toContain("mt");
  });
});
