import $ from "jquery";
import fs from "fs";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import chrome from "sinon-chrome";
import { getPerson } from "wikitree-js";

jest.mock("wikitree-js");
jest.mock("../../core/options/options_storage");

// Mock out draggable because it misbehaves in tests.
jest.mock("jquery-ui/ui/widgets/draggable", () => ({}));

// Add chrome to window because jsdom doesn't provide it.
window.chrome = chrome;

describe("randomProfile", () => {
  let addRandomToFindMenu;

  beforeAll(async () => {
    // Do not run feature code when importing feature module.
    checkIfFeatureEnabled.mockResolvedValue(false);
    // Import module dynamically because `checkIfFeatureEnabled` has to be mocked beforehand.
    const randomProfileModule = await import("./randomProfile");
    addRandomToFindMenu = randomProfileModule.addRandomToFindMenu;
  });

  beforeEach(async () => {
    // Run `npm run update-test-pages` to update the HTML file with the actual WikiTree page.
    document.body.innerHTML = fs.readFileSync("src/testing/pages/Tolkien-1.html");
  });

  test("adds menu item when enabled", async () => {
    expect($(".randomProfile").length).toBe(0);

    await addRandomToFindMenu();

    expect($(".randomProfile").length).toBe(1);
  });

  test("calls getRandomProfile() when clicked", async () => {
    // Make random deterministic.
    global.Math.random = jest.fn().mockReturnValue(1);
    getPerson.mockResolvedValue({ Privacy_IsOpen: true });
    // Replace winodw.location with a simple string to check its value later.
    delete window.location;
    window.location = "";

    await addRandomToFindMenu();

    $(".randomProfile").trigger("click");

    // Wait for event to propagate.
    await new Promise(process.nextTick);

    expect(window.location).toBe("https://www.wikitree.com/wiki/36360449");
  });
});
