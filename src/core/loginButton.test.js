jest.mock("./common", () => ({ getUserNumId: () => 1 }));
jest.mock("./API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { clientLoginUrl } from "./loginButton";

const thanksPage = "https://www.wikitree.com/index.php?title=Special:Thanks&action=feed&who=19076274";

describe("clientLoginUrl", () => {
  test("keeps action=clientLogin when the return page has its own action", () => {
    const url = new URL(clientLoginUrl({ appId: "haunted_tree" }, thanksPage));
    expect(url.searchParams.getAll("action")).toEqual(["clientLogin"]);
    expect(url.searchParams.get("appId")).toBe("haunted_tree");
    expect(url.searchParams.get("returnURL")).toBe(thanksPage);
    expect(url.searchParams.has("who")).toBe(false);
  });

  test("returns to the page as it was, without encoding it twice", () => {
    const page = "https://www.wikitree.com/index.php?title=Special%3AEditPerson&u=12345";
    expect(new URL(clientLoginUrl({ appId: "x" }, page)).searchParams.get("returnURL")).toBe(page);
  });

  test("leaves out the #fragment, where the authcode would end up", () => {
    const url = new URL(clientLoginUrl({ appId: "x" }, "https://www.wikitree.com/wiki/Beacall-9#Biography"));
    expect(url.searchParams.get("returnURL")).toBe("https://www.wikitree.com/wiki/Beacall-9");
  });

  test("builds the logout address too", () => {
    const url = new URL(clientLoginUrl({ doLogout: 1 }, thanksPage));
    expect(url.searchParams.get("action")).toBe("clientLogin");
    expect(url.searchParams.get("doLogout")).toBe("1");
    expect(url.searchParams.get("returnURL")).toBe(thanksPage);
  });
});
