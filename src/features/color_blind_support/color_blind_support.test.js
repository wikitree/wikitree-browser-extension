/*
Created By: Ian Beacall (Beacall-6)

The feature has four ways in - the options page, the corner control's two halves and the
context menu item - and they can disagree about whether the feature is on. These check the
combinations, particularly the ones where the simulator runs with the support switched off.
*/

const DEFAULT_OPTIONS = {
  paletteName: "okabeIto",
  newLinkColor: "#0072B2",
  dangerColor: "#B0003A",
  warningColor: "#C68900",
  successColor: "#007A5E",
  newLinkCue: "both",
  statusCue: true,
  privacyCue: "both",
  genderCue: "border",
  simulate: "off",
};

let writes;
let messageListeners;
let storageListeners;

/** Let the module's promise chains, including the dynamic CSS import, settle. */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Load the feature as a page would, with the feature switched on or off in the options.
 */
async function loadFeature({ enabled = false, options = {}, customStyle = null } = {}) {
  jest.resetModules();
  jest.doMock("../../core/options/options_storage", () => ({
    shouldInitializeFeature: () => Promise.resolve(enabled),
    // The feature reads Custom Style's options as well as its own, to find out whether the
    // reader has asked for no link underlines. Pass customStyle to stand that up.
    checkIfFeatureEnabled: (id) => Promise.resolve(id === "customStyle" ? Boolean(customStyle) : enabled),
    getFeatureOptions: (id) => Promise.resolve(id === "customStyle" ? customStyle : { ...DEFAULT_OPTIONS, ...options }),
  }));
  await import("./color_blind_support");
  await settle();
}

function sendContextMenuClick(mode) {
  // No mode is the plain "Open" entry; a mode is a specific condition chosen from the submenu.
  messageListeners.forEach((listener) => listener({ action: "showColorBlindSimulator", mode }));
  return settle();
}

const badge = () => document.getElementById("wbeColorBlindSimulatorBadge");
const supportToggle = () => document.getElementById("wbeColorBlindSupportToggle");
const modeSelect = () => document.getElementById("wbeColorBlindSimulatorSelect");
const closeButton = () => badge()?.querySelector(".wbe-cb-badge-close");

beforeEach(() => {
  writes = [];
  messageListeners = [];
  storageListeners = [];
  global.chrome = {
    storage: {
      sync: { set: (items) => writes.push(JSON.parse(JSON.stringify(items))) },
      onChanged: { addListener: (listener) => storageListeners.push(listener) },
    },
    runtime: { onMessage: { addListener: (listener) => messageListeners.push(listener) } },
  };

  document.documentElement
    .querySelectorAll("#wbeColorBlindSimulatorBadge, #wbeColorBlindFilters")
    .forEach((element) => {
      element.remove();
    });
  document.documentElement.removeAttribute("style");

  // A fresh <body> each time, not just an emptied one. Each loadFeature leaves a
  // MutationObserver watching document.body, and jsdom keeps the same document across
  // tests, so without this the observers from earlier tests go on tagging this one's DOM.
  document.documentElement.replaceChild(document.createElement("body"), document.body);
});

describe("on page load", () => {
  test("the feature applies its colors and cues when it is switched on", async () => {
    await loadFeature({ enabled: true });

    expect(document.body.classList.contains("wbe-cb")).toBe(true);
    expect(document.body.classList.contains("wbe-cb-newlink-both")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-newlink-light")).toBe("#0072B2");
    expect(badge()).toBeNull();
  });

  test("publishes both lightings, so the cascade can pick when Dark Mode arrives late", async () => {
    await loadFeature({ enabled: true });

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--wbe-cb-newlink-dark")).toBe("#14ABFF");
    expect(root.getPropertyValue("--wbe-cb-danger-dark")).toBe("#FF85AD");
    // The dark box tints go towards the Dark Mode page, not towards white: a pale tint
    // there ends up under Dark Mode's own pale body text.
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("#F1D1DB");
    expect(root.getPropertyValue("--wbe-cb-danger-bg-dark")).toBe("#5F4956");
  });

  test("publishes text for the accent as well as for the tint, which are different answers", async () => {
    await loadFeature({ enabled: true });
    const root = document.documentElement.style;

    // Small solid elements - badges - paint the accent itself as their background, so they
    // need their own text colour. Reusing the tint's gave a Content Rank badge light text
    // on a pale fill: a solid unreadable block. These four assertions are the pairs that
    // were wrong.
    expect(root.getPropertyValue("--wbe-cb-warning-on-light")).toBe("#000000");
    expect(root.getPropertyValue("--wbe-cb-warning-text-light")).toBe("#000000");
    expect(root.getPropertyValue("--wbe-cb-danger-on-dark")).toBe("#000000");
    expect(root.getPropertyValue("--wbe-cb-danger-text-dark")).toBe("#ffffff");
  });

  test("aims each box tint at the visibility WikiTree's own box has", async () => {
    // The pale colors WikiTree already uses for these three boxes, picked as the accents -
    // which is what "Error color" invites a reader to do. The tint is aimed at a ratio
    // rather than made by lightening a fixed amount, so a color already at that ratio is
    // returned as it is instead of being washed out into the page.
    await loadFeature({
      enabled: true,
      options: {
        paletteName: "custom",
        dangerColor: "#ffcccc",
        warningColor: "#ffee99",
        successColor: "#e1f0b4",
      },
    });

    const root = document.documentElement.style;
    // Byte for byte what was picked. Not "near enough": a color the reader chose comes back
    // as that color, or the option is not doing what its label says.
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("#FFCCCC");
    expect(root.getPropertyValue("--wbe-cb-warning-bg-light")).toBe("#FFEE99");
    expect(root.getPropertyValue("--wbe-cb-success-bg-light")).toBe("#E1F0B4");
  });

  test("keeps a dark custom pick as the box, and moves the text instead", async () => {
    // The other half of the promise. A pale pick gets dark text on it; a deep one gets pale
    // text on it. What never happens is the color being overruled to suit the text.
    await loadFeature({
      enabled: true,
      options: { paletteName: "custom", dangerColor: "#7a0021", successColor: "#004d3a" },
    });

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("#7A0021");
    expect(root.getPropertyValue("--wbe-cb-danger-text-light")).toBe("#ffffff");
    // Already past 4.5:1 on a white page, so the ink is the pick untouched as well.
    expect(root.getPropertyValue("--wbe-cb-danger-light")).toBe("#7A0021");
    expect(root.getPropertyValue("--wbe-cb-success-text-light")).toBe("#ffffff");
  });

  test("darkens the ink out of a pale custom pick rather than lightening the box out of it", async () => {
    await loadFeature({
      enabled: true,
      options: { paletteName: "custom", dangerColor: "#ffcccc" },
    });

    const root = document.documentElement.style;
    // Box: exactly as picked, with text chosen to suit it.
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("#FFCCCC");
    expect(root.getPropertyValue("--wbe-cb-danger-text-light")).toBe("#000000");
    // Ink: darkened until it can be read as error text in the features that paint it.
    expect(root.getPropertyValue("--wbe-cb-danger-light")).toBe("#8B6F6F");
  });

  test("does not leave a custom box pale on a dark page, where it would be a light block", async () => {
    await loadFeature({
      enabled: true,
      options: { paletteName: "custom", dangerColor: "#ffcccc" },
    });

    // The pick is a box color for a white page. Used unchanged on #36393f it is a pale
    // block, so the dark scheme tints it towards that page instead - starting from the
    // pick, so the reader's hue carries over.
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-danger-bg-dark")).toBe("#524E53");
  });

  test("derives a Dark Mode palette for custom colors, which are picked against white", async () => {
    await loadFeature({
      enabled: true,
      options: { paletteName: "custom", newLinkColor: "#003366", dangerColor: "#800000" },
    });

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--wbe-cb-newlink-light")).toBe("#003366");
    // #003366 is 1.5:1 on #36393f - unreadable - so it is lightened along its own hue.
    expect(root.getPropertyValue("--wbe-cb-newlink-dark")).not.toBe("#003366");
    expect(root.getPropertyValue("--wbe-cb-danger-dark")).not.toBe("#800000");
  });

  test("nothing at all happens when it is switched off", async () => {
    await loadFeature({ enabled: false });

    expect(document.body.className).toBe("");
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-newlink-light")).toBe("");
    expect(badge()).toBeNull();
  });

  test("a simulation left running carries over with the feature off, without the cues", async () => {
    await loadFeature({ enabled: false, options: { simulate: "deuteranopia" } });

    expect(document.body.style.filter).toBe("url(#wbe-cb-deuteranopia)");
    expect(badge()).not.toBeNull();
    expect(supportToggle().checked).toBe(false);
    expect(document.body.classList.contains("wbe-cb")).toBe(false);
  });
});

describe("every cue can be switched off", () => {
  // The recolour of new/unknown links and the badge fills used to happen whenever the
  // feature was on, with nothing to turn them off. Both now have their own switch.
  test("the new-link recolor is on by default and can be turned off", async () => {
    await loadFeature({ enabled: true });
    expect(document.body.classList.contains("wbe-cb-newlink-recolor")).toBe(true);

    document.body.className = "";
    await loadFeature({ enabled: true, options: { newLinkRecolor: false } });
    expect(document.body.classList.contains("wbe-cb-newlink-recolor")).toBe(false);
  });

  test.each([
    ["wbe-cb-newlink-none", { newLinkCue: "none" }],
    ["wbe-cb-visited-none", { visitedCue: "none" }],
    ["wbe-cb-privacy-none", { privacyCue: "none" }],
    ["wbe-cb-gender-none", { genderCue: "none" }],
    ["wbe-cb-family-none", { familyCue: "none" }],
    ["wbe-cb-badges-none", { badgeCue: "none" }],
  ])("%s is reachable from the options", async (expected, options) => {
    await loadFeature({ enabled: true, options });
    expect(document.body.classList.contains(expected)).toBe(true);
  });

  test("the palette itself can be told to do nothing", async () => {
    await loadFeature({ enabled: true, options: { paletteName: "none" } });
    const root = document.documentElement.style;

    // Nothing published, so every rule falls back to WikiTree's own value - including the
    // ones in Date Fixer, Text Expander, Locations Helper and WikiTree+, which read
    // --wbe-cb-danger from their own stylesheets and no class here could reach.
    expect(root.getPropertyValue("--wbe-cb-newlink-light")).toBe("");
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("");
    expect(root.getPropertyValue("--wbe-cb-success-text-dark")).toBe("");

    // And the gate is off, because the fallbacks alone are not enough: those rules carry
    // !important and would repaint WikiTree's own value over a Custom Style one.
    expect(document.body.classList.contains("wbe-cb-palette")).toBe(false);
  });

  test("a palette that does nothing still leaves every shape cue working", async () => {
    await loadFeature({ enabled: true, options: { paletteName: "none", visitedCue: "underline" } });

    expect(document.body.classList.contains("wbe-cb")).toBe(true);
    expect(document.body.classList.contains("wbe-cb-status")).toBe(true);
    expect(document.body.classList.contains("wbe-cb-visited-underline")).toBe(true);
    // The visited mark hides against the measured background, which is not a palette
    // colour and has to survive the palette being switched off.
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-page-bg")).toBe("#FFFFFF");
  });

  test("the palette gate is on for an ordinary palette", async () => {
    await loadFeature({ enabled: true });
    expect(document.body.classList.contains("wbe-cb-palette")).toBe(true);
  });

  test("the status cue is a plain checkbox, so off means off", async () => {
    await loadFeature({ enabled: true, options: { statusCue: false } });
    expect(document.body.classList.contains("wbe-cb-status")).toBe(false);
  });

  test("badges default to fill and border, and can be left alone entirely", async () => {
    await loadFeature({ enabled: true });
    expect(document.body.classList.contains("wbe-cb-badges-both")).toBe(true);

    document.body.className = "";
    await loadFeature({ enabled: true, options: { badgeCue: "none" } });
    expect(document.body.classList.contains("wbe-cb-badges-none")).toBe(true);
    expect(document.body.classList.contains("wbe-cb-badges-both")).toBe(false);
  });
});

describe("hiding the visited mark against the right background", () => {
  // WikiTree gives the profile's Categories box a background of its own, so a mark hidden
  // against the PAGE draws a visible line there on links that were never visited.
  function categoriesBox() {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<p id="Categories" style="background-color: rgb(225, 240, 180)"><a href="/a">a category</a></p>'
    );
    return document.getElementById("Categories");
  }

  test("measures the box the link sits in, not the page", async () => {
    const box = categoriesBox();
    await loadFeature({ enabled: true, options: { visitedCue: "underline" } });

    expect(box.style.getPropertyValue("--wbe-cb-local-bg")).toBe("#E1F0B4");
  });

  test("does nothing when the cue is off, since nothing is being hidden", async () => {
    const box = categoriesBox();
    await loadFeature({ enabled: true });

    expect(box.style.getPropertyValue("--wbe-cb-local-bg")).toBe("");
  });
});

describe("the visited link cue", () => {
  // The cue hides its off state by painting the mark the same colour as the page, so it
  // needs the real background rather than an assumed white. `transparent` cannot be used:
  // a :visited colour takes its alpha from the unvisited value, so alpha 0 stays alpha 0
  // and the mark never appears - which is what made this look impossible last time.
  test("publishes the measured page background for the mark to hide against", async () => {
    await loadFeature({ enabled: true });

    expect(document.documentElement.style.getPropertyValue("--wbe-cb-page-bg")).toBe("#FFFFFF");
  });

  test("is off unless it is asked for, including for options saved before it existed", async () => {
    await loadFeature({ enabled: true });

    expect(document.body.classList.contains("wbe-cb-visited-none")).toBe(true);
  });

  test("switches on the cue that was chosen", async () => {
    await loadFeature({ enabled: true, options: { visitedCue: "underline" } });

    expect(document.body.classList.contains("wbe-cb-visited-underline")).toBe(true);
    expect(document.body.classList.contains("wbe-cb-visited-none")).toBe(false);
  });
});

describe("the context menu item", () => {
  test("starts the simulator with the feature switched off", async () => {
    await loadFeature({ enabled: false });
    await sendContextMenuClick();

    expect(document.body.style.filter).toBe("url(#wbe-cb-deuteranopia)");
    expect(modeSelect().value).toBe("deuteranopia");
    // The support is not switched on behind the reader's back: the menu item is a
    // checking tool, and the checkbox reports what the feature is actually doing.
    expect(supportToggle().checked).toBe(false);
    expect(document.body.classList.contains("wbe-cb")).toBe(false);
  });

  test("saves the mode so the check carries from page to page, but does not enable the feature", async () => {
    await loadFeature({ enabled: false });
    await sendContextMenuClick();

    expect(writes).toEqual([{ colorBlindSupport_options: { ...DEFAULT_OPTIONS, simulate: "deuteranopia" } }]);
  });

  test("brings the control back without changing the mode when one is already running", async () => {
    await loadFeature({ enabled: true, options: { simulate: "tritanopia" } });
    closeButton().click();
    expect(badge()).toBeNull();

    await sendContextMenuClick();

    expect(badge()).not.toBeNull();
    expect(modeSelect().value).toBe("tritanopia");
    expect(writes).toEqual([]);
  });

  test("opens the condition chosen from the submenu", async () => {
    await loadFeature({ enabled: false });

    await sendContextMenuClick("protanopia");

    expect(document.body.style.filter).toBe("url(#wbe-cb-protanopia)");
    expect(modeSelect().value).toBe("protanopia");
    expect(supportToggle().checked).toBe(false);
  });

  test("a submenu choice overrides a simulation already running", async () => {
    await loadFeature({ enabled: true, options: { simulate: "deuteranopia" } });

    await sendContextMenuClick("tritanopia");

    expect(document.body.style.filter).toBe("url(#wbe-cb-tritanopia)");
    expect(modeSelect().value).toBe("tritanopia");
  });

  test("the plain Open uses the saved launch default", async () => {
    await loadFeature({ enabled: false, options: { menuLaunchMode: "tritanopia" } });

    await sendContextMenuClick();

    expect(document.body.style.filter).toBe("url(#wbe-cb-tritanopia)");
    expect(modeSelect().value).toBe("tritanopia");
  });

  test("falls back to deuteranopia when the saved launch default is off or unset", async () => {
    await loadFeature({ enabled: false, options: { menuLaunchMode: "off" } });

    await sendContextMenuClick();

    expect(modeSelect().value).toBe("deuteranopia");
  });
});

describe("the Support checkbox", () => {
  test("applies the colors and cues live when it is ticked with the feature off", async () => {
    await loadFeature({ enabled: false, options: { simulate: "protanopia" } });

    supportToggle().checked = true;
    supportToggle().dispatchEvent(new Event("change"));

    expect(document.body.classList.contains("wbe-cb")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-danger-light")).toBe("#B0003A");
    // The simulation is untouched: the two halves of the control are independent.
    expect(document.body.style.filter).toBe("url(#wbe-cb-protanopia)");
  });

  test("removes them again when it is unticked with the feature on", async () => {
    await loadFeature({ enabled: true, options: { simulate: "protanopia" } });

    supportToggle().checked = false;
    supportToggle().dispatchEvent(new Event("change"));

    expect(document.body.classList.contains("wbe-cb")).toBe(false);
    expect(document.documentElement.style.getPropertyValue("--wbe-cb-danger-light")).toBe("");
    expect(document.body.style.filter).toBe("url(#wbe-cb-protanopia)");
  });
});

describe("closing the control", () => {
  test("saves nothing when the checkbox was left as it was found", async () => {
    await loadFeature({ enabled: true, options: { simulate: "deuteranopia" } });

    closeButton().click();

    expect(writes).toEqual([]);
    expect(badge()).toBeNull();
    expect(document.body.style.filter).toBe("url(#wbe-cb-deuteranopia)");
  });

  test("turns the feature on when it was ticked", async () => {
    await loadFeature({ enabled: false, options: { simulate: "deuteranopia" } });

    supportToggle().checked = true;
    supportToggle().dispatchEvent(new Event("change"));
    closeButton().click();

    expect(writes).toEqual([
      { colorBlindSupport: true, colorBlindSupport_options: { ...DEFAULT_OPTIONS, simulate: "deuteranopia" } },
    ]);
  });

  test("turns the feature off when it was unticked, and ends the simulation with it", async () => {
    await loadFeature({ enabled: true, options: { simulate: "deuteranopia" } });

    supportToggle().checked = false;
    supportToggle().dispatchEvent(new Event("change"));
    closeButton().click();

    expect(writes).toEqual([
      { colorBlindSupport: false, colorBlindSupport_options: { ...DEFAULT_OPTIONS, simulate: "off" } },
    ]);
    // A feature that is off has no business leaving the page filtered, with its own
    // control gone and nothing left on screen to switch the filter back off with.
    expect(document.body.style.filter).toBe("");
  });

  test("does not write back a state another tab has already changed", async () => {
    await loadFeature({ enabled: true, options: { simulate: "deuteranopia" } });

    // Another tab switches the feature off from its own corner control.
    storageListeners.forEach((listener) => listener({ colorBlindSupport: { newValue: false } }, "sync"));

    expect(supportToggle().checked).toBe(false);
    expect(document.body.classList.contains("wbe-cb")).toBe(false);
    expect(closeButton().title).toBe("Hide this control and stay in the current mode");

    // Closing here must now be a plain dismiss. Before the listener existed this tab still
    // believed the feature was on, so it wrote true straight back and undid the other tab.
    closeButton().click();
    expect(writes).toEqual([]);
  });

  test("says which of the two it is about to do", async () => {
    await loadFeature({ enabled: true, options: { simulate: "deuteranopia" } });

    expect(closeButton().title).toBe("Hide this control and stay in the current mode");

    supportToggle().checked = false;
    supportToggle().dispatchEvent(new Event("change"));

    expect(closeButton().title).toBe("Close and turn Color-Blind Support off in your settings");
  });
});

describe("family connections in blended families", () => {
  function familyList() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="nVitals" class="vertical">
         <div class="spouse spouse_1" id="s1">Clarence Howard Pool</div>
         <div class="spouse spouse_2" id="s2">Someone Else</div>
         <ul class="nameList" id="kids">
           <li class="spouse_1" id="k1">a child of the first</li>
           <li class="spouse_2" id="k2">a child of the second</li>
         </ul>
       </div>`
    );
  }

  const familyOf = (id) => document.getElementById(id)?.getAttribute("data-wbe-family");

  test("numbers each person with the group that connects them to a parent", async () => {
    familyList();
    await loadFeature({ enabled: true });

    expect(document.body.classList.contains("wbe-cb-family-pattern")).toBe(true);
    expect(familyOf("s1")).toBe("1");
    expect(familyOf("k1")).toBe("1");
    expect(familyOf("s2")).toBe("2");
    expect(familyOf("k2")).toBe("2");
  });

  test("keeps up when the list is redrawn and the classes are reassigned", async () => {
    familyList();
    await loadFeature({ enabled: true });

    // Change Family Lists strips every spouse_ class before assigning them again, so the
    // attribute has to follow the class rather than being written once at load.
    const child = document.getElementById("k1");
    child.className = "spouse_3";
    await settle();
    expect(familyOf("k1")).toBe("3");

    child.className = "";
    await settle();
    expect(familyOf("k1")).toBeNull();
  });

  test("marks people added to the list after load", async () => {
    familyList();
    await loadFeature({ enabled: true });

    document.getElementById("kids").insertAdjacentHTML("beforeend", '<li class="spouse_2" id="k3">a late arrival</li>');
    await settle();

    expect(familyOf("k3")).toBe("2");
  });

  test("does nothing when the cue is switched off", async () => {
    familyList();
    await loadFeature({ enabled: true, options: { familyCue: "none" } });

    expect(familyOf("s1")).toBeNull();
    expect(document.body.classList.contains("wbe-cb-family-none")).toBe(true);
  });
});

describe("which parent a sibling shares", () => {
  // parent_1 (the father's line) goes on the <li>; parent_2 (the mother's) on the inner
  // span. Both = a full sibling, one = a half sibling on that side.
  function siblingList(rows) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="vertical"><ol id="siblingList" class="nameList">${rows
        .map(
          ([id, onLi, onSpan]) =>
            `<li id="${id}" class="${onLi}"><span itemprop="sibling" class="${onSpan}">a sibling</span></li>`
        )
        .join("")}</ol></div>`
    );
  }

  // The marker goes on the inner span when there is one, so ask the row for whichever
  // of its elements is carrying it.
  const parentsOf = (id) =>
    document.getElementById(id)?.querySelector("[data-wbe-parents]")?.getAttribute("data-wbe-parents") ??
    document.getElementById(id)?.getAttribute("data-wbe-parents");
  const list = () => document.getElementById("siblingList");

  test("marks a mixed list of full and half siblings", async () => {
    siblingList([
      ["full", "parent_1", "parent_2"],
      ["halfFather", "parent_1", ""],
      ["halfMother", "", "parent_2"],
    ]);
    await loadFeature({ enabled: true });

    expect(parentsOf("full")).toBe("1,2");
    expect(parentsOf("halfFather")).toBe("1");
    expect(parentsOf("halfMother")).toBe("2");
    expect(list().classList.contains("wbe-cb-mixed-parents")).toBe(true);
  });

  test("reads the per-parent id classes too", async () => {
    siblingList([
      ["full", "parent_1 parent_1_pid12345", "parent_2 parent_2_pid67890"],
      ["half", "parent_1 parent_1_pid12345", ""],
    ]);
    await loadFeature({ enabled: true });

    expect(parentsOf("full")).toBe("1,2");
    expect(parentsOf("half")).toBe("1");
  });

  test("says nothing when every sibling shares both parents", async () => {
    siblingList([
      ["a", "parent_1", "parent_2"],
      ["b", "parent_1", "parent_2"],
    ]);
    await loadFeature({ enabled: true });

    // The attribute is still there, but the list is not flagged, so nothing is shown -
    // there is no distinction to point at.
    expect(list().classList.contains("wbe-cb-mixed-parents")).toBe(false);
  });

  test("does not confuse parent_1 with parent_2", async () => {
    siblingList([
      ["onlyMother", "", "parent_2"],
      ["onlyFather", "parent_1", ""],
    ]);
    await loadFeature({ enabled: true });

    expect(parentsOf("onlyMother")).toBe("2");
    expect(parentsOf("onlyFather")).toBe("1");
  });
});

/*
The Content Rank badge is left alone deliberately, and a deliberate absence in a stylesheet
is indistinguishable from an oversight. These read the rules as text so that reinstating one
fails here rather than shipping a repainted rank tier again. See the README section
"The Content Rank badge, and why it is left alone".
*/
describe("badge rules", () => {
  const stylesheet = require("fs").readFileSync(`${__dirname}/color_blind_support.css`, "utf8");

  /** Selector lines only - the prose in the comments talks about .new on purpose. */
  const badgeSelectors = stylesheet
    .split("\n")
    .filter((line) => line.startsWith("html body") && line.includes(".badge"));

  test("every badge rule excludes the solid .new variants", () => {
    expect(badgeSelectors).not.toHaveLength(0);
    badgeSelectors.forEach((selector) => {
      expect(selector).toMatch(/\.badge\.(green|red):not\(\.new\)/);
    });
  });

  test("every badge rule excludes the Content Rank badge, at every tier", () => {
    // The badge prints its own number, so its colour is a second encoding of something
    // already spelled out - the test that leaves the Family Group app alone. Excluding
    // only .new repainted CR:9-8 and CR:5-4 and left the other three steps of the same
    // five-step ramp untouched.
    badgeSelectors.forEach((selector) => {
      expect(selector).toMatch(/:not\(\.cr-details\)/);
    });
  });

  test("no badge is filled from a role ink", () => {
    // The inks are derived to be readable as text. Used as a fill they desaturate, which
    // is what greying-out looks like - #8FC641 became #8E9871. The -bg tints are the fills.
    const badgeBlocks = stylesheet.match(/html body[^{]*\.badge[^{]*\{[^}]*\}/g) || [];
    expect(badgeBlocks.length).toBe(badgeSelectors.length);
    badgeBlocks.forEach((block) => {
      expect(block).not.toMatch(/background-color: var\(--wbe-cb-(success|danger|warning),/);
    });
  });

  test("each badge fill still sets a text color beside it", () => {
    const fills = stylesheet.match(/background-color: var\(--wbe-cb-\w+-bg[^}]*/g) || [];
    expect(fills.length).toBeGreaterThan(0);
    fills.forEach((block) => expect(block).toMatch(/color: var\(--wbe-cb-\w+-text/));
  });
});
