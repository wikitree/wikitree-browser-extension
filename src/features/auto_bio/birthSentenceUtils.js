/**
 * The birth sentence with the parents before the date and place.
 *
 * @param {object} parts
 * @param {string} parts.name the (possibly bold) name
 * @param {string} parts.parents the parents as buildParents words them: "son of A and B", "to A and B",
 *   or "His parents were A and B"
 * @param {string} parts.born what follows "was": " born on ... in ..."
 * @param {string} parts.option the first sentence wording: "of", "to" or "parentsWere"
 * @param {string} [parts.subject] the capitalized pronoun that starts the second sentence ("He")
 * @returns {string} the sentence, without its closing full stop
 */
export function parentsFirstBirthSentence({ name, parents, born, option, subject }) {
  if (option === "to") {
    return `${name} was born ${parents}${born.replace(/^ born/, "")}`;
  }
  if (option === "parentsWere") {
    // Not "X's parents were", which would put an apostrophe straight after the bold markers.
    const parentsOfName = parents.replace(
      /^(?:His|Her|Their) (parents|parent) (were|was)/,
      (match, noun, verb) => `The ${noun} of ${name} ${verb}`
    );
    return `${parentsOfName}. ${subject || name} was${born}`;
  }
  return `${name}, ${parents}, was${born}`;
}
