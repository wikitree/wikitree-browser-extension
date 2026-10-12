jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: () => Promise.resolve(true),
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function loadFeature(response, bodyClass = "profile") {
  document.body.className = bodyClass;
  document.body.innerHTML = `
    <div id="pageData" data-mnamedb="Wolcik-1"></div>
    <div class="col-auto col-lg-12 text-lg-end" data-cy="research-status">
      <span class="research-status-label">Gold Candidate</span>
    </div>
  `;
  global.chrome = {
    runtime: {
      sendMessage: jest.fn((message, callback) => callback(response)),
    },
  };

  jest.isolateModules(() => {
    require("./gold_standard");
  });
  await tick();
}

async function openInspector() {
  document
    .querySelector(".wbe-gold-standard-button")
    .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await tick();
}

describe("Gold Standard Inspector", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
    delete global.chrome;
  });

  test("adds an icon button after the research status and displays safely rendered results", async () => {
    await loadFeature({
      success: true,
      data: {
        ok: true,
        profile: "Wolcik-1",
        items: [
          'Child, <a href="https://www.wikitree.com/wiki/Harris-29177"><strong>Unnamed Infant Harris</strong></a>.',
          '<a href="javascript:alert(1)">unsafe</a><script>alert(2)</script>',
        ],
      },
    });

    const researchStatus = document.querySelector('[data-cy="research-status"]');
    const button = researchStatus.lastElementChild;
    expect(button.classList.contains("wbe-gold-standard-button")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Gold Standard Inspector");
    expect(button.textContent).toBe("GSI");
    expect(button.previousElementSibling.classList.contains("research-status-label")).toBe(true);
    await openInspector();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: "goldStandardInspector", profile: "Wolcik-1" },
      expect.any(Function)
    );
    expect(document.querySelectorAll(".wbe-gold-standard-results li")).toHaveLength(2);
    expect(document.querySelector(".wbe-gold-standard-results strong").textContent).toBe("Unnamed Infant Harris");
    expect(document.querySelector(".wbe-gold-standard-results a").rel).toBe("noopener noreferrer");
    expect(document.querySelector(".wbe-gold-standard-results a").target).toBe("_blank");
    expect(document.querySelector(".wbe-gold-standard-results script")).toBeNull();
    expect(document.querySelectorAll(".wbe-gold-standard-results a")).toHaveLength(1);
  });

  test("shows the inspector button in profile edit mode", async () => {
    await loadFeature({ success: true, data: { ok: true, profile: "Wolcik-1", items: [] } }, "edit-person");

    expect(document.querySelector('[data-cy="research-status"] .wbe-gold-standard-button')).not.toBeNull();
  });

  test("displays a passed message when the API returns no items", async () => {
    await loadFeature({ success: true, data: { ok: true, profile: "Wolcik-1", items: [] } });
    await openInspector();

    expect(document.querySelector(".wbe-gold-standard-passed").textContent).toMatch(
      /Passed Gold Standard Inspector checks/
    );
  });

  test("surfaces API failures in the modal and closes on Escape", async () => {
    await loadFeature({ success: false, error: "Service unavailable." });
    await openInspector();

    expect(document.querySelector('[role="alert"]').textContent).toContain("Service unavailable.");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".wbe-gold-standard-overlay")).toBeNull();
  });
});
