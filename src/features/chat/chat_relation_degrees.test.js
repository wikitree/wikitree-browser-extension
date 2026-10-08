jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { relationChainDegrees } from "./chat_relations";

const step = (group) => ({ group });
describe("relationChainDegrees", () => {
  test.each([
    [["grandparents"], 2],
    [["parents"], 1],
    [["siblings"], 1],
    [["spouses"], 1],
    [["parentSiblings"], 2],
    [["grandparentSiblings"], 3],
    [["parents", "parents"], 2],
    [["parents", "siblings"], 2],
    [["grandparents", "siblings"], 3],
    [["children", "children"], 2],
    [["parents", "spouses", "children"], ""],
    [["siblings", "parents"], ""],
    [["spouses", "parents"], ""],
    [[], ""],
  ])("%j → %s", (groups, expected) => expect(relationChainDegrees(groups.map(step))).toBe(expected));
});
