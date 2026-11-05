// Words of the sentence itself that are never part of a name or a place (2026-10-10). A search
// built from leftover words ("Kent farmers", "Jones family of Wales", "Scottish emigrants to
// Canada") would put them into LastNameAtBirth= or Location= and send WT+ a query that means
// nothing. These words make a parse "garbage": it isn't run, and Genie says so and offers the
// form instead. ("and", "of", "on", "the" are not here: Trinidad and Tobago, Isle of Wight, Stoke on Trent.)

const SENTENCE_WORD_PATTERN =
  "who|whom|whose|which|that|those|anyone|everyone|named|called|surnamed|emigrated|immigrated|migrated|moved|lived|living|worked|working|served|had|has|have|were|was|did|with|without|but|also|including|except|to|by|no|not|sources?|parents|women|woman|men|females?|girls?|boys?|people|persons?|family|families|emigrants|immigrants|farmers|soldiers|sailors|labourers|laborers|workers|teachers|doctors|nurses|oldest|youngest|longest|relatives|ancestors|descendants";

/** True when a name or place value holds a word of the sentence. */
export function hasSentenceWords(value) {
  return new RegExp(`\\b(?:${SENTENCE_WORD_PATTERN})\\b`, "i").test(String(value || ""));
}

/** A surname that is really a place or a phrase: Lincolnshire, Kent-born, long-lived. */
export function looksLikeNotASurname(value) {
  const text = String(value || "").trim();
  return /(?:-born|-lived|shire)$/i.test(text) || hasSentenceWords(text);
}

/**
 * Leftover words "Surname Place", nothing to say which is which: only a clean pair is a guess worth
 * running. Exactly two words and no sentence words. Three or more ("Mary Smith Ohio", "Jones family
 * of Wales", "Beacall New South Wales") could be a first name, a phrase or a longer place: not run.
 */
export function looksLikeSurnamePlace(tokens) {
  const words = (tokens || []).map((token) => String(token || "").replace(/^"+|"+$/g, ""));
  if (words.length !== 2 || words.some((word) => hasSentenceWords(word))) return false;
  return !looksLikeNotASurname(words[0]);
}
