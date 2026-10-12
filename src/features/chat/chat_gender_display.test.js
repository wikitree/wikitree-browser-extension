import { shownGender } from "./chat_gender_display";
import { buildFanSlots } from "./chat_fan_chart_data";
import { buildXDnaSummary, dnaCarrierKind, xDnaShares } from "./chat_dna_data";
import { buildColouring } from "./chat_fan_chart";
import { parentAgeRows } from "./chat_ages_data";
import { describeConnectionPath } from "./chat_relation_chain_text";
import { directLineDown, directXDnaSentence } from "./chat_relationship_data";
import { buildBurialAnswer } from "./chat_burial";
import { REQUESTED_COLUMNS, requestedColumnFields } from "./chat_requested_columns";
import { buildMarriageTimingAnswer } from "./chat_marriage";

test("shownGender: none when marked other/do not display", () => {
  expect(shownGender({ Gender: "Female", DataStatus: { Gender: "blank" } })).toBe("");
  expect(shownGender({ Gender: "Female", DataStatus: { Gender: "certain" } })).toBe("Female");
  expect(shownGender({ Gender: "Male", DataStatus: { Gender: "" } })).toBe("Male");
  expect(shownGender({ Gender: "Male" })).toBe("Male");
  expect(shownGender({})).toBe("");
  expect(shownGender(null)).toBe("");
});

// The charts: shown in neutral words and green, while DNA lines keep the sex at birth.
describe("a gender marked not to show, in the charts", () => {
  const slots = (rootGender, rootSex) => {
    const list = new Array(16).fill(null);
    for (let slot = 1; slot < list.length; slot += 1) list[slot] = { id: slot, wtid: `P-${slot}`, name: `P${slot}`, gender: slot % 2 === 0 ? "Male" : "Female" };
    list[1] = { ...list[1], gender: rootGender, sex: rootSex };
    return list;
  };

  test("summaries: gender blank, sex kept", () => {
    const fan = buildFanSlots({ 1: { Id: 1, Name: "Finn-1", RealName: "Finn", Gender: "Female", DataStatus: { Gender: "blank" } } }, 1, 1);
    expect(fan[1]).toMatchObject({ gender: "", sex: "Female" });
  });

  test("X-DNA follows the sex at birth, in neutral words", () => {
    expect(xDnaShares(slots("", "Male"))).not.toBeNull();
    expect(buildXDnaSummary(slots("", "Male"), "Your")).toMatch(/^You got your only X chromosome from your mother/);
    expect(buildXDnaSummary(slots("", "Female"), "Finn-1's")).toMatch(/^Finn-1 got one X chromosome from each parent, but their father passed on only his mother's/);
    expect(buildXDnaSummary(slots("", ""), "Your")).toMatch(/no gender recorded/);
  });

  test("Y-DNA and mtDNA lines too", () => {
    expect(dnaCarrierKind([{ gender: "", sex: "Male" }, { gender: "Male", sex: "Male" }])).toBe("y");
    expect(dnaCarrierKind([{ gender: "", sex: "Female" }, { gender: "", sex: "Female" }, { gender: "Male", sex: "Male" }])).toBe("mt");
  });

  test("the fan chart's gender colouring: green, with its own key", () => {
    const list = slots("Male", "Male");
    list[3] = { ...list[3], gender: "", sex: "Female" };
    const colouring = buildColouring(list, "gender", 3);
    expect(colouring.key(list[2], 2)).toBe("male");
    expect(colouring.key(list[3], 3)).toBe("other");
    expect(colouring.legend.map((item) => item.label)).toEqual(["Fathers", "Mothers", "Gender not shown"]);
  });

  test("parents' ages: a parent, not a mother", () => {
    const list = [null, { name: "Kid", birth: "1900-01-01" }, { name: "Dad", birth: "1850-01-01", gender: "Male" }, { name: "Pat", birth: "1891-01-01", gender: "", sex: "Female" }];
    const pat = parentAgeRows(list).find((row) => row.name === "Pat");
    expect(pat).toMatchObject({ role: "mother", relation: "Parent", neutral: true });
    expect(pat.flag).toMatch(/A parent aged 9/);
  });
});

// The answers: neutral words, while the family links (whom "his wife" means) still follow Gender.
describe("a gender marked not to show, in the answers", () => {
  const blank = { Gender: "Female", DataStatus: { Gender: "blank" } };

  test("a connection path: child, and their", () => {
    const martha = { Name: "Teece-118", Gender: "Female" };
    const path = [martha, { Gender: "Male", pathType: "spouse" }, { ...blank, pathType: "child" }];
    expect(describeConnectionPath(path, "Martha (Teece-118)", "Jo (Beacall-20)")).toBe("Jo (Beacall-20) is Martha (Teece-118)'s husband's child.");
    const fromJo = [{ ...blank, Name: "Beacall-20" }, { Gender: "Male", pathType: "parent" }, { Gender: "Male", pathType: "parent" }];
    expect(describeConnectionPath(fromJo, "Jo (Beacall-20)", "Tom (Beacall-1)", 3, "grandfather")).toBe(
      "Tom (Beacall-1) is Jo (Beacall-20)'s grandfather (their father's father)."
    );
  });

  test("the relationship chart: green, and X-DNA by the sex at birth", () => {
    const path = [
      { Name: "Smith-9", FirstName: "Tom", LastNameAtBirth: "Smith", Gender: "Male" },
      { Name: "Jones-3", FirstName: "Jo", LastNameAtBirth: "Jones", ...blank, pathType: "parent" },
      { Name: "Brown-4", FirstName: "Edward", LastNameAtBirth: "Brown", Gender: "Male", pathType: "parent" },
    ];
    const down = directLineDown(path);
    expect(down[1]).toMatchObject({ gender: "", sex: "Female" });
    expect(directXDnaSentence(down)).toMatch(/no father-to-son link/);
  });

  test("burial and marriage answers: they", () => {
    const answer = buildBurialAnswer({ Name: "Cook-1", RealName: "Jo", ...blank, DeathLocation: "Motueka", Categories: ["Motueka_Cemetery,_Motueka,_Tasman"] });
    expect(answer).toContain("they are buried");
    const marriage = buildMarriageTimingAnswer({
      person: { label: "Jo (Cook-1)", gender: "", birth: "1850-01-01" },
      marriages: [{ spouseLabel: "Sam (Lee-2)", date: "1875-06-01" }],
      ask: "age",
    });
    expect(marriage).toBe("Jo (Cook-1) was 25 when they married Sam (Lee-2) (1875-06-01).");
  });

  test("a gender column: blank, as on WikiTree", () => {
    expect(requestedColumnFields(["gender"])).toBe("Id,Name,Gender,DataStatus");
    expect(REQUESTED_COLUMNS.gender.value(blank)).toBe("");
    expect(REQUESTED_COLUMNS.gender.value({ Gender: "Male" })).toBe("Male");
  });
});
