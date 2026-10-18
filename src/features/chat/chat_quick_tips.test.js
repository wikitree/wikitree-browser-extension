import { enableQuickTips } from "./chat_quick_tips";

// (the user, 2026-10-18: WBE's yellow tooltips on Genie's buttons, quicker than title text)
describe("quick tooltips", () => {
  let root;
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `<div id="pop"><button id="chip" title="Finds the people named in this biography">Check for profiles</button><button id="icon" title="Recent questions"></button><button id="plain">Send</button></div>`;
    root = document.getElementById("pop");
    enableQuickTips(root);
  });
  afterEach(() => jest.useRealTimers());
  const hover = (id) => document.getElementById(id).dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  const tip = () => root.querySelector(".wbe-quick-tip");

  test("shows the title in the box soon after hovering, without the browser's own", () => {
    hover("chip");
    const chip = document.getElementById("chip");
    expect(chip.hasAttribute("title")).toBe(false);
    expect(tip().hidden).toBe(true);
    jest.advanceTimersByTime(150);
    expect(tip().hidden).toBe(false);
    expect(tip().textContent).toBe("Finds the people named in this biography");
    expect(chip.getAttribute("aria-describedby")).toBe(tip().id);
  });

  test("hides on leaving or clicking; nothing for an element without a title", () => {
    hover("chip");
    jest.advanceTimersByTime(150);
    document.getElementById("chip").dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: root }));
    expect(tip().hidden).toBe(true);
    hover("plain");
    jest.advanceTimersByTime(500);
    expect(tip().hidden).toBe(true);
  });

  test("an icon button keeps its title as its name", () => {
    hover("icon");
    expect(document.getElementById("icon").getAttribute("aria-label")).toBe("Recent questions");
  });

  test("a title set again later is picked up", () => {
    const chip = document.getElementById("chip");
    hover("chip");
    root.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    chip.setAttribute("title", "New words");
    hover("plain");
    hover("chip");
    jest.advanceTimersByTime(150);
    expect(tip().textContent).toBe("New words");
  });
});
