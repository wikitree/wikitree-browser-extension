import { trimUkCountrySuffix } from "./chat_place_text";

test.each([
  ["Cornwall, England, United Kingdom", "Cornwall, England"],
  ["Kent, England, UK", "Kent, England"],
  ["Glamorgan, Wales, Great Britain", "Glamorgan, Wales"],
  ["Cornwall, Ontario, Canada", "Cornwall, Ontario, Canada"],
  ["United Kingdom", "United Kingdom"],
])("%s", (input, expected) => {
  expect(trimUkCountrySuffix(input)).toBe(expected);
});
