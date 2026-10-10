jest.mock("../wikitree_plus_helper/wikitree_plus_helper_sql", () => ({ SQL_TEMPLATES: [] }));

import { describeSearchForm, prefillSearchForm, searchFormQuery, searchFormSpec } from "./chat_search_form";

describe("search form (no AI key)", () => {
  test("prefill takes only what can't be misread", () => {
    expect(prefillSearchForm("People born in yorkshire in the 1850s")).toEqual({ bornFrom: "1850", bornTo: "1859" });
    expect(prefillSearchForm("Kent 1820-1840")).toEqual({ bornFrom: "1820", bornTo: "1840" });
    expect(prefillSearchForm("Devon in the 1800s")).toEqual({}); // a century or a decade?
    expect(prefillSearchForm("1850s and 1860s")).toEqual({}); // which one?
    expect(prefillSearchForm("John Smith of Yorkshire")).toEqual({}); // names and places are theirs to type
  });

  test("prefill also reads last names, born/died places, died years, who and flags", () => {
    expect(prefillSearchForm("women with last name Stevenson born in Scotland 1850-1899")).toEqual({
      lastName: "Stevenson",
      birthPlace: "Scotland",
      bornFrom: "1850",
      bornTo: "1899",
      gender: "female",
    });
    expect(prefillSearchForm("unsourced people who died in Kent Ohio in the 1910s")).toEqual({
      deathPlace: "Kent Ohio",
      diedFrom: "1910",
      diedTo: "1919",
      flags: ["Unsourced"],
    });
    expect(prefillSearchForm("women named Stevenson born in Scotland 1850-1899 who emigrated")).toEqual({
      lastName: "Stevenson",
      birthPlace: "Scotland",
      bornFrom: "1850",
      bornTo: "1899",
      gender: "female",
    });
    expect(prefillSearchForm("first name Mary, no parents")).toEqual({ firstName: "Mary", flags: ["NoParents"] });
  });

  test("the values make the spec the AI would", () => {
    expect(
      searchFormSpec({ lastName: "Beacall", birthPlace: "Yorkshire", bornFrom: "1850", bornTo: "1859", gender: "female", flags: ["Unsourced"] })
    ).toEqual({
      names: { anyLastName: "Beacall" },
      places: [{ text: "Yorkshire", event: "birth" }],
      dates: [{ event: "birth", from: 1850, to: 1859 }],
      gender: "female",
      flags: ["Unsourced"],
    });
  });

  test("it compiles to a WT+ query", () => {
    const built = searchFormQuery({ birthPlace: "Yorkshire", bornFrom: "1850", bornTo: "1859" });
    expect(built.query).toBe("BirthLocation=Yorkshire 1850s");
    expect(built.description).toBe("born in Yorkshire 1850–1859");
    expect(searchFormQuery({ firstName: "Mary", lastName: "Jones", diedFrom: "1900" }).query).toBe(
      'AllLastNames=Jones FirstName=Mary sql="([Default].[Death Date].AsNumber >= 19000000)"'
    );
  });

  test("it says what's wrong instead of searching", () => {
    expect(searchFormQuery({}).problem).toBe("Fill in at least one box.");
    expect(searchFormQuery({ flags: ["Unsourced"] }).problem).toMatch(/name, a place or some years/);
    expect(searchFormQuery({ birthPlace: "Kent", bornFrom: "18x0" }).problem).toMatch(/isn't a year/);
    expect(searchFormQuery({ birthPlace: "Kent", bornFrom: "1900", bornTo: "1850" }).problem).toMatch(/after the second/);
  });

  test("describes the search in words", () => {
    expect(describeSearchForm({ firstName: "John", lastName: "Smith", deathPlace: "Australia", diedTo: "1900", gender: "male", flags: ["NoParents"] })).toBe(
      "John Smith, died in Australia 1900 or earlier, men, no parents"
    );
  });
});

describe("the form itself", () => {
  const { renderSearchForm } = require("./chat_search_form");
  test("starts filled, runs the search, and says what's wrong", () => {
    const onSubmit = jest.fn();
    const $form = renderSearchForm({ bornFrom: "1850", bornTo: "1859" }, onSubmit);
    document.body.appendChild($form.get(0));
    expect($form.find('[name="bornFrom"]').val()).toBe("1850");
    $form.find('[name="birthPlace"]').val("Yorkshire");
    $form.find('[name="flags"][value="Unsourced"]').prop("checked", true);
    $form.trigger("submit");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [values, built] = onSubmit.mock.calls[0];
    expect(values).toMatchObject({ birthPlace: "Yorkshire", bornFrom: "1850", bornTo: "1859", flags: ["Unsourced"] });
    expect(built.query).toBe("BirthLocation=Yorkshire 1850s bioCheckUnsourced");
    $form.find('[name="bornTo"]').val("1700");
    $form.trigger("submit");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect($form.find(".wbe-chat-search-form-problem").text()).toMatch(/after the second/);
  });
});
