// Tooltips for Genie's suggestion buttons (the user, 2026-10-18: "Can you also add tooltips to the buttons? Some
// may not be very clear right now"). Each says what clicking does; the prompts with a name in them match by pattern.

const CHIP_TITLES = [
  [/^How am I related to /i, "How you and this person are connected, step by step through the family tree"],
  [/^My connection to /i, "The path through the family tree from you to this person"],
  [/grandparents\?$/i, "This person's grandparents, with their dates and places"],
  [/^Show my fan chart$/i, "Your ancestors as a fan chart"],
  [/^\S+s born in .+ in the \d{4}s$/i, "An example search: a surname, a place and a decade. You can type your own the same way"],
  [/^On this day/i, "Births, marriages and deaths in this family on today's date"],
  [/^Tell me about my tree$/i, "A summary of your tree: how many ancestors, how far back, and where they came from"],
  [/^What surnames are in my tree\?$/i, "The surnames among your ancestors, most common first"],
  [/^Show my Family Explorer$/i, "Your family round you as cards, Trees or a Galaxy, to move through person by person"],
  [/^Map my ancestors$/i, "Where your ancestors were born, on a world map"],
  [/^How complete is my tree\?$/i, "How many of your ancestors are on WikiTree, generation by generation"],
  [/^How long did my ancestors live\?$/i, "Your ancestors' ages at death"],
  [/^What history did my ancestors live through\?$/i, "Your ancestors' lives set against world events"],
  [/X-DNA/i, "The ancestors you could have inherited X-DNA from"],
  [/^Show my descendant chart$/i, "Your descendants as a sunburst chart"],
  [/^Show my family timeline$/i, "Births, marriages and deaths in your family, in date order"],
  [/^Search by name, place or date$/i, "A form: fill in a name, a place or dates, then search WikiTree"],
  [/^What can I type\?$/i, "Examples of what Genie understands without AI"],
  [/^Check for profiles$/i, "Finds the people named in this biography and looks for their profiles on WikiTree"],
  [/^Summarize this page$/i, "A short summary of this page"],
  [/^Who is mentioned on this page\?$/i, "The people this page names, with links to their profiles"],
  [/^Make a timeline of this page$/i, "The dated events on this page, in order"],
  // The edit page's chips
  [/^What's missing\?$/i, "What this profile still needs for the Gold Standard, read from the form as it is now (unsaved changes too)"],
  [/^Add birth$/i, "Writes the birth and parents paragraph from the profile's data. You see it first, then choose Insert or Copy"],
  [/^Add death$/i, "Writes the death paragraph from the profile's data. You see it first, then choose Insert or Copy"],
  [/^Add spouses$/i, "Writes the spouses and children paragraph from the profile's data. You see it first, then choose Insert or Copy"],
  [/^Add siblings$/i, "Writes the list of siblings from the profile's data. You see it first, then choose Insert or Copy"],
  [/^Auto Categories$/i, "Runs the edit menu's Auto Categories: adds categories from the profile's data to the biography"],
  [/^Auto Bio$/i, "Runs the edit menu's Auto Bio: rewrites the biography from the profile's data and sources"],
  [/^Fix formatting$/i, "Runs the edit menu's Automated corrections on the biography's formatting"],
  [/^Suggest categories$/i, "Categories that may fit this biography, checked against WikiTree's categories"],
  [/^Change explanation$/i, "A change explanation for this edit: what you changed, or how your draft differs from the saved profile"],
];

/** The tooltip for a suggestion button, or "" when there's none. */
export function chipTitle(prompt) {
  const text = String(prompt || "").trim();
  return CHIP_TITLES.find(([pattern]) => pattern.test(text))?.[1] || "";
}
