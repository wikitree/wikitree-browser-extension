import { stripPersonNameFromPlace } from "./locationUtils.js";

describe("stripPersonNameFromPlace", () => {
  // Wood-24677: "In 1841, William (54) was living in William Wood, Lichfield St Mary, Staffordshire."
  const william = { firstNames: ["William"], lastNames: ["Wood"] };

  test("drops the person's name from the front of a place", () => {
    expect(stripPersonNameFromPlace("William Wood, Lichfield St Mary, Staffordshire", william)).toBe(
      "Lichfield St Mary, Staffordshire"
    );
  });

  test("drops a name that includes a middle name", () => {
    expect(
      stripPersonNameFromPlace("William Waight Wood, Stafford, Staffordshire", {
        firstNames: ["William"],
        lastNames: ["Wood"],
      })
    ).toBe("Stafford, Staffordshire");
  });

  test("leaves a place that only shares the surname", () => {
    expect(stripPersonNameFromPlace("Wood Green, Middlesex", william)).toBe("Wood Green, Middlesex");
  });

  test("leaves a place that only shares the first name", () => {
    expect(
      stripPersonNameFromPlace("Charles City County, Virginia", { firstNames: ["Charles"], lastNames: ["Byrd"] })
    ).toBe("Charles City County, Virginia");
  });

  test("leaves an ordinary place alone", () => {
    expect(stripPersonNameFromPlace("Stafford, Staffordshire, England", william)).toBe(
      "Stafford, Staffordshire, England"
    );
    expect(stripPersonNameFromPlace("Beverly Hills, Los Angeles, California", william)).toBe(
      "Beverly Hills, Los Angeles, California"
    );
  });

  test("does nothing without names to go on", () => {
    expect(stripPersonNameFromPlace("William Wood, Lichfield St Mary", {})).toBe("William Wood, Lichfield St Mary");
    expect(stripPersonNameFromPlace("William Wood, Lichfield St Mary", { firstNames: ["William"] })).toBe(
      "William Wood, Lichfield St Mary"
    );
  });

  test("does nothing to a place with no comma", () => {
    expect(stripPersonNameFromPlace("William Wood", william)).toBe("William Wood");
    expect(stripPersonNameFromPlace("", william)).toBe("");
  });
});
