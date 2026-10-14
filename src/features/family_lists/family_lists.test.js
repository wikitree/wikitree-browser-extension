jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: jest.fn(() => Promise.resolve(false)),
  getFeatureOptions: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getProfile: jest.fn() } }));
jest.mock("../access_keys/access_keys", () => ({ showCopyMessage: jest.fn() }));
jest.mock("../../core/common.css", () => ({}));
jest.mock("../../core/common", () => ({ profilePerson: { Name: "Test-1" }, isOK: jest.fn(), familyArray: jest.fn(() => []) }));
jest.mock("../../core/loginButton", () => ({ addLoginButton: jest.fn() }));
jest.mock("../../core/clipboard", () => ({ copyToClipboard: jest.fn(() => Promise.resolve()), readFromClipboard: jest.fn() }));
jest.mock("../auto_bio/auto_bio_loader", () => ({
  loadAutoBioModule: jest.fn(async () => ({
    siblingList: jest.fn(() => "Siblings: Ann and Bob."),
    buildBirth: jest.fn(() => "Born 1850."),
  })),
}));

import { copyToClipboard } from "../../core/clipboard";
import { showCopyMessage } from "../access_keys/access_keys";
import { buildFamilyListText } from "./family_lists";

describe("buildFamilyListText", () => {
  beforeEach(() => {
    window.profileID = "Test-1";
    window.profilePerson = { Name: "Test-1" };
  });
  afterEach(() => {
    delete window.profileID;
    delete window.profilePerson;
  });

  test("returns the text without copying, pasting or showing a message (Genie shows it first)", async () => {
    document.body.innerHTML = '<textarea id="wpTextbox1">Bio</textarea>';
    await expect(buildFamilyListText("siblingList")).resolves.toEqual({ text: "Siblings: Ann and Bob.\n", message: "Sibling List", otherMessage: false });
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(showCopyMessage).not.toHaveBeenCalled();
    expect(document.querySelector("#wpTextbox1").value).toBe("Bio");
  });
});
