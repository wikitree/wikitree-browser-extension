import { parentsFirstBirthSentence } from "./birthSentenceUtils.js";

const name = "'''Firman Joseph Robinson'''";
const born = " born on 2 August 1901 in Caledonia, Washington County, Missouri";

describe("parentsFirstBirthSentence", () => {
  test("'son/daughter of' puts the parents between the name and 'was born'", () => {
    expect(parentsFirstBirthSentence({ name, parents: "son of A and B", born, option: "of" })).toBe(
      `${name}, son of A and B, was born on 2 August 1901 in Caledonia, Washington County, Missouri`
    );
  });

  test("'to' puts the parents straight after 'was born'", () => {
    expect(parentsFirstBirthSentence({ name, parents: "to A and B", born, option: "to" })).toBe(
      `${name} was born to A and B on 2 August 1901 in Caledonia, Washington County, Missouri`
    );
  });

  test("'to' works with only a place", () => {
    expect(parentsFirstBirthSentence({ name, parents: "to A", born: " born in Ohio", option: "to" })).toBe(
      `${name} was born to A in Ohio`
    );
  });

  test("'parents were' names the person first and starts a second sentence", () => {
    expect(
      parentsFirstBirthSentence({
        name,
        parents: "His parents were A and B",
        born,
        option: "parentsWere",
        subject: "He",
      })
    ).toBe(
      `The parents of ${name} were A and B. He was born on 2 August 1901 in Caledonia, Washington County, Missouri`
    );
    expect(parentsFirstBirthSentence({ name, parents: "Their parent was A", born, option: "parentsWere" })).toBe(
      `The parent of ${name} was A. ${name} was${born}`
    );
  });
});
