import { ahnenNumbers, getGenerationFromAhnen } from "./chat_ahnentafel";

// The ancestor walk the two ancestor-list builders used to have a copy each of (2026-10-13).
test("ahnenNumbers: parents 2 and 3, their parents 2n and 2n+1, lowest number kept", () => {
  const people = {
    10: { Id: 10, Father: 20, Mother: 21 },
    11: { Id: 11, Father: "0", Mother: 20 },
    20: { Id: 20 },
    21: { Id: 21 },
  };
  const numbers = ahnenNumbers({ Id: 1, Father: 10, Mother: 11 }, people);
  expect(Object.fromEntries(numbers)).toEqual({ 10: 2, 11: 3, 20: 4, 21: 5, 0: 6 });
  expect([...numbers.values()].map(getGenerationFromAhnen)).toEqual([1, 1, 2, 2, 2]);
  expect(ahnenNumbers({ Id: 1 }, people).size).toBe(0);
  expect(ahnenNumbers(null).size).toBe(0);
});
