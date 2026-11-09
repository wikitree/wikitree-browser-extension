const REMOVED_WORD_TO_NUMBER = {
  once: 1,
  twice: 2,
  thrice: 3,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  "twenty-one": 21,
  "twenty-two": 22,
  "twenty-three": 23,
  "twenty-four": 24,
  "twenty-five": 25,
  "twenty-six": 26,
  "twenty-seven": 27,
  "twenty-eight": 28,
  "twenty-nine": 29,
  thirty: 30,
};

export function removedTokenToNumber(token) {
  const textToken = String(token || "")
    .trim()
    .toLowerCase();
  return REMOVED_WORD_TO_NUMBER[textToken] || Number(textToken) || null;
}

export function parseRemovedCount(text) {
  const lower = String(text || "").toLowerCase();
  const numeric = lower.match(/(\d+)\s+times?\s+removed/);
  if (numeric) return Number(numeric[1]);
  const word = lower.match(
    /\b(once|twice|thrice|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty-one|twenty-two|twenty-three|twenty-four|twenty-five|twenty-six|twenty-seven|twenty-eight|twenty-nine|thirty)\s+(?:times?\s+)?removed\b/
  );
  return word ? removedTokenToNumber(word[1]) || 0 : 0;
}

export function kinshipValue(kinship) {
  const text = String(kinship || "")
    .trim()
    .toLowerCase();
  if (!text) return Number.MAX_SAFE_INTEGER;

  let level = 0;

  if (text.includes("grand")) {
    level += 1;
  }

  const greatMatch = text.match(/(\d+)(?:st|nd|rd|th)\s+great/);
  if (greatMatch) {
    level += Number(greatMatch[1]);
  } else if (text.includes("great")) {
    level += 1;
  }

  if (text.includes("cousin")) {
    level += 1;
    const cousinNumber = Number(text.match(/(\d+)(?:st|nd|rd|th)\s+cousin/)?.[1] || 1);
    level += cousinNumber * 2;
    level += parseRemovedCount(text);
  } else if (["brother", "sister", "father", "mother", "daughter", "son"].some((term) => text.includes(term))) {
    level += 1;
  } else if (["uncle", "aunt", "niece", "nephew"].some((term) => text.includes(term))) {
    level += 2;
  }

  return level;
}
