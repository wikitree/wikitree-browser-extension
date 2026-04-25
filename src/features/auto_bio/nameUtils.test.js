import { namesMatchByFirstAndLast } from "./nameUtils.js";

describe("namesMatchByFirstAndLast", () => {
  test("matches names with accents removed", () => {
    expect(namesMatchByFirstAndLast("José García", "Jose Garcia")).toBe(true);
  });

  test("matches letters that do not decompose under unicode normalization", () => {
    expect(namesMatchByFirstAndLast("Søren Kierkegaard", "Soren Kierkegaard")).toBe(true);
  });

  test("uses only the first given name when multiple are present", () => {
    expect(namesMatchByFirstAndLast("Mary Ann Smith", "Mary Smith")).toBe(true);
  });

  test("allows conservative fuzzy matching on the first name", () => {
    expect(namesMatchByFirstAndLast("Gerrit van Dijk", "Gert van Dijk")).toBe(true);
  });

  test("does not match when surnames differ", () => {
    expect(namesMatchByFirstAndLast("Jose Garcia", "Jose Martinez")).toBe(false);
  });

  test("does not over-match nearby first names", () => {
    expect(namesMatchByFirstAndLast("John Smith", "Joan Smith")).toBe(false);
  });
});
