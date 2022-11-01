import $ from "jquery";
import fs from "fs";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { getRandomProfile } from "../../core/common";

jest.mock("../../core/common");
jest.mock("../../core/options/options_storage");

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
    await addRandomToFindMenu();

    $(".randomProfile").trigger("click");

    expect(getRandomProfile).toHaveBeenCalled();
  });
});
