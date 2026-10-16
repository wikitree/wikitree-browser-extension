import { pathRelationship } from "./chat_relationship_data";

const step = (pathType, Gender = "") => ({ pathType, Gender });
const climb = (n) => Array.from({ length: n }, () => step("parent"));

describe("pathRelationship", () => {
  test("a direct ancestor", () => {
    expect(pathRelationship([step(""), ...climb(7), step("mother", "Female")])).toEqual({ phrase: "6th great-grandmother", kind: "ancestor", viaCommonAncestor: false });
    expect(pathRelationship([step(""), step("father", "Male")]).phrase).toBe("father");
  });

  test("a direct descendant", () => {
    expect(pathRelationship([step(""), step("child"), step("child"), step("son", "Male")]).phrase).toBe("great-grandson");
  });

  test("cousins through a sibling step or a shared ancestor", () => {
    // up 2, siblings, down 2: second cousins
    expect(pathRelationship([step(""), step("parent"), step("parent"), step("sibling"), step("child"), step("child", "Female")]).phrase).toBe("2nd cousin");
    // up 1 to the shared parent, down 1: sister
    expect(pathRelationship([step(""), step("father"), step("daughter", "Female")]).phrase).toBe("sister");
    expect(pathRelationship([step(""), step("parent"), step("sibling", "Male")]).phrase).toBe("uncle");
    expect(pathRelationship([step(""), step("sibling"), step("child"), step("child", "Male")]).viaCommonAncestor).toBe(true);
  });

  test("biological steps count the same", () => {
    expect(pathRelationship([step(""), step("bioparent", "Male")]).phrase).toBe("father");
  });

  test("not a blood line", () => {
    expect(pathRelationship([step(""), step("spouse")])).toBeNull();
    // down to a child, then up to its other parent
    expect(pathRelationship([step(""), step("child"), step("parent")])).toBeNull();
    expect(pathRelationship([step("")])).toBeNull();
  });
});
