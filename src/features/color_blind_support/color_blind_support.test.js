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
async function loadFeature({ enabled = false, options = {} } = {}) {
  jest.resetModules();
  jest.doMock("../../core/options/options_storage", () => ({
    shouldInitializeFeature: () => Promise.resolve(enabled),
    getFeatureOptions: () => Promise.resolve({ ...DEFAULT_OPTIONS, ...options }),
  }));
  await import("./color_blind_support");
  await settle();
}

function sendContextMenuClick() {
  messageListeners.forEach((listener) => listener({ action: "showColorBlindSimulator" }));
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
  document.body.removeAttribute("style");
  document.body.className = "";
  document.body.innerHTML = "";
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
    expect(root.getPropertyValue("--wbe-cb-danger-bg-light")).toBe("#F2D6DF");
    expect(root.getPropertyValue("--wbe-cb-danger-bg-dark")).toBe("#624A57");
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
