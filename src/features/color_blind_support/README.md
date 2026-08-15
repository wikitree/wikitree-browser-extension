# Color-Blind Support

Makes WikiTree readable when color alone does not carry meaning for you.

## Why

WikiTree uses color on its own in several places. The one that prompted this feature:
links to categories and pages that do not exist yet are **red**, and every other link is
**green**. With red-green color blindness — the most common kind — those are the same
link.

The same pattern appears elsewhere: green and orange content boxes, a row of nearly
identical yellows for privacy levels 30/35/40, and pale pink/blue/green gender
backgrounds.

## What it does

**Recolors** the red/green pairs using a palette whose members stay apart. Presets:
Okabe-Ito (the default), one leaning on the blue/yellow axis for deuteranopia and
protanopia, one leaning on red/green for tritanopia, a high-contrast set, and Custom.
Each preset comes in two lightings — see [Dark Mode](#dark-mode) — and
`scripts/check-palette.mjs` checks all eight on every build.

The recolor is applied where color is the only channel available — link text, badge fills,
border colors. Content boxes deliberately **keep WikiTree's own backgrounds**; see
[Why the boxes are not recolored](#why-the-boxes-are-not-recolored).

**Adds a second, non-color channel**, which is the part that actually does the work. No
one palette suits every form of color blindness, so nothing here relies on the recolor
alone:

| Element                                                                    | Cue added                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `a.new` — links to pages that do not exist                                 | Dotted underline and a superscript `?`                                |
| `.status.green` / `.status` / `.status.red`, `.box.green` / `.box.orange`  | Solid / dashed / double left border                                   |
| `.privacy--NN` dots                                                        | Distinct border style per level, plus the level number beside the dot |
| `.tree--person_m/_f/_u`, `.genderbar`                                      | Solid / dashed / dotted left edge, optionally an M / F / ? letter     |
| Bio Check's results box                                                    | "Passed." / "Issues found." in words above the findings               |
| `spouse_N` / `parent_1` / `parent_2` in Change Family Lists                | The connection's number beside the name                               |
| `#errorMessages` / `#warningMessages` / `#hintMessages` (Show Suggestions) | Double / dashed / dotted left border                                  |
| `.background--gender-*` rows (What Links Here, Category Management)        | Solid / dashed / dotted painted stripe                                |

**Simulates** color vision deficiencies, so you can check a page rather than guess:
achromatopsia, deuteranopia, protanopia and tritanopia. The three dichromacies use SVG
`feColorMatrix`; achromatopsia uses the browser's own `filter: grayscale(1)`.

Two notes on that last one. It uses `grayscale()` rather than the achromatopsia matrix
usually published alongside the others, because that matrix uses the Rec.601 luma
coefficients — a legacy television standard — where `grayscale()` uses Rec.709, the
right luminance model for sRGB. They disagree sharply: WikiTree's green links and its
red `a.new` links come out **38** levels apart under `grayscale()` and **1** apart under
the Rec.601 matrix.

And no greyscale conversion is a faithful model of achromatopsia anyway — complete
achromatopsia is rod monochromacy, and rods peak around 498nm, so true rod luminance
weights the channels differently again. What the mode reliably answers is "what survives
when hue is gone", which is the question worth asking, and it doubles as a
black-and-white print check.

The simulator does not need the rest of the feature. **Right-click any WikiTree page and
choose Color-Blind Simulator** and it starts, whether or not Color-Blind Support is
switched on for you. That is deliberate: the simulator is how anyone reviewing a page
finds out which distinctions on it survive, and putting it behind a remediation feature
they may not need for themselves would be a door most reviewers never open. What the menu
item starts is the simulation and the control, nothing else — the cues and the palette
stay off until the Support checkbox says otherwise. It starts in deuteranopia, the most
common form and the one the member who reported the red/green link problem has.

Once a simulation is on, a control sits in the bottom corner of every page, with two
independent halves:

- **Support** — a checkbox for whether WBE is helping at all. It starts wherever the
  feature itself stands, so it is unchecked for a simulation started from the context menu
  with the feature off. Unchecked, the page is exactly how WikiTree styles it: original
  colors, no cues, and the other WBE features back to their own reds and greens, because
  dropping the custom properties makes their `var(--wbe-cb-danger, red)` fallbacks take
  over.
- **Seeing as** — which reader you are looking through.

The combination worth reaching for is a deficiency selected with Support switched **off**:
that is the page as the member who reported this actually sees it. Switch Support back on
and the fix is right there next to the problem.

Moving the checkbox is a peek at the current page; it is not written anywhere by itself.
Closing the control afterwards **is** the decision, and that is saved: the feature is
switched on or off in your settings to match, exactly as if you had used its checkbox on
the options page. Leaving it any other way would mean either a feature enabled but doing
nothing — indistinguishable from it having quietly broken — or a fix you had just watched
work, thrown away on navigation.

Switching it **off** that way ends the simulation as well, on the page and in the saved
options: a feature that is off has no business filtering pages, and with its own control
gone there would be nothing left on screen to switch the filter back off with. The `×`
tooltip says which of the three things it is about to do.

Left as you found it, `×` is a plain dismiss: the page stays exactly as it is. The
simulation choice _is_ remembered as you navigate, so a run of pages can be walked in one
condition and then re-walked in another — and it is remembered with the feature off too,
so a check started from the context menu carries across pages like any other. Choosing
**Normal (off)** ends the simulation: the control will not be there on the next page, and
the context menu or the options page is the way to start again.

## Visited links: tried, measured, and not possible

**Nothing in this feature touches visited links.** Two versions were built and both were
removed. The reason is a browser restriction that has tightened since it was last widely
documented, so it is written down here in full rather than left for the next person to
rediscover.

WikiTree draws `a:visited` purple against `a:link` green. As CIE76 dE:

|                 | normal | deuteranopia | protanopia | tritanopia | grayscale |
| --------------- | ------ | ------------ | ---------- | ---------- | --------- |
| green vs purple | 141.3  | **23.0**     | 34.5       | 42.2       | 141.3     |

Note that grayscale is _not_ the problem — purple is much the darker of the two, so the
difference survives having no colour at all. Deuteranopia is the weak case, and a reader
with it reported the two as looking the same.

### Why no shape cue is possible

Every other cue in this feature is a shape, because shape survives what colour does not.
For visited links, browsers restrict what `:visited` may change, so that a page cannot read
back which links you have followed. The published allow-list — `color`, `background-color`,
the border and outline colours, `fill`, `stroke` — is what the two attempts here were built
on, and **it is out of date**. Tested in Chrome against a page with genuine history:

| tried                                                     | result                    |
| --------------------------------------------------------- | ------------------------- |
| `border-bottom-color`, currentColor and explicit          | ignored                   |
| `background-color`                                        | ignored                   |
| `outline-color`                                           | ignored                   |
| `text-decoration-color`                                   | ignored                   |
| colour of a child `<span>` — `g2g.js`'s checkmark pattern | ignored                   |
| colour of an `::after` glyph                              | ignored                   |
| `color` on the link itself                                | **the only one honoured** |

So the trick this feature relies on everywhere else — an element that is always present and
only changes colour — cannot work for visited links in Chrome at all.

**This affects `g2g.js` too.** Its "checkmarks to show questions you have visited" option
colours a `✓` span inside the link, which is the fifth row of that table. That option is
silently doing nothing in Chrome. Not fixed here; noted so somebody can.

### Why a better colour is not the answer either

`color` does work, so the visited colour could be changed. Over every colour readable on
white, the best scorer against WikiTree's green is `#D84000` at **58.8** worst-case, against
purple's 23.0 — a large improvement on paper.

It was not taken, because the measurement cannot be trusted for this particular pair.
`#D84000` is an orange-red against a green, and the simulation matrices drop hue while
keeping luminance, so they cannot see red-green confusion at all — the same blind spot
recorded in `scripts/check-palette.mjs`, where WikiTree's own red/green measures 91.8 dE
apart under deuteranopia. A change this repo's own tooling cannot validate is not one to
ship to the readers it is meant to help.

Link colours therefore stay with the **Visited Links** and **Custom Style** features, where
the reader chooses them.

### If Chrome ever relaxes this

The cue to add back is a doubled bottom border: `border-bottom: 3px double transparent` on
the link, `border-bottom-color` on `:visited`. It costs no layout — a bottom border on an
inline element does not affect line box height (CSS 2.1 §10.8.1) — which matters both for
the page and for honesty, since a cue that changed the layout would leak the history the
restriction exists to protect. The first attempt used an appended span instead and put a
visible gap after every link on the page, because the span took its width whether or not
the link had been visited.

## Why the boxes are not recolored

The first version repainted `.box.green`, `.box.orange` and the three `.status` variants
with tints derived from the palette. That was removed, because measuring it showed it was
not doing anything:

- **Readability was never the problem.** WikiTree's own text-on-box is already 10.4:1 and
  10.8:1. The replacement tints scored higher, but both are so far past the 4.5:1 bar that
  the difference is invisible.
- **Separation got very slightly worse.** Green box against orange box: WikiTree's own
  tints are 20.2 apart under deuteranopia, the replacements 18.4.

The obvious answer is to pick tints with more contrast, and that was tried across the
whole range. It does not work either. With the severity in the order a reader would expect
— success palest, error darkest — the best any set of readable tints reaches is **10.8 in
grayscale**, under the 12 that means "the same color", and it gets there only by making
the error box a solid dusty rose. Three backgrounds pale enough to take dark text have to
sit in a narrow band of luminance. It is the same wall the accent colors hit.

So the tint was costing a washed-out page, a conflict with Custom Style's own box colors,
and the background-without-text bug described above, in exchange for nothing. The left
border does the whole job: a shape difference survives any color vision and grayscale
alike, and reads without a second box on screen to compare against.

Badges keep their fill recolor. They are too small for a border and the fill is the only
channel they have.

## Family connections

Change Family Lists draws two coloured bars on each person in a family list. The left one
is gender, and the gender cue above already covers it. The right one is the one that
matters here: it marks **which parent each person belongs with** in a blended family, and
it does that with `spouse_1` … `spouse_51` and fifty-one hues.

Fifty-one colours cannot be far apart from each other, and in grayscale they are one
colour. Of everything in this feature it is the purest colour-only signal — and what it is
carrying is the structure of the family, which is the reason someone opened the page.

There are **two** of these systems on one page, not one:

- **`spouse_1` … `spouse_51`** joins each spouse to their children.
- **`parent_1` / `parent_2`** joins the two parents to the siblings — and these land on
  _different elements_, `parent_1` on the sibling's `<li>` and `parent_2` on the
  `span[itemprop='sibling']` inside it. Carrying both means a full sibling; one alone
  means a half sibling on that side. That is arguably the more interesting fact of the
  two, and it is just as invisible without color.

Two cues. **The patterns are the default and the number is opt-in**, because only one of
them is free:

- **The bars get a pattern** — solid, dashed, dotted, double. Only the style is changed,
  never the colour or the width: the colours belong to that feature and a reader with
  normal vision should see exactly what it intended, while the pattern needs no colour at
  all. Four patterns covers the real cases — siblings have exactly two lines, and a profile
  with more than four spouses is vanishingly rare. Above four the patterns cycle.
- **A number beside the name**, optional. Beside a child it is the spouse they belong with;
  beside a sibling it is which parents they share, so `1,2` is a full sibling. It is the
  clearer of the two cues and it costs layout: the number needs a strip of space to sit in,
  which narrows the lists and pushes longer names onto a second line. On a real profile in
  the sidebar that wrapped most rows, which is why it is not the default.

Details worth knowing:

- Nothing is marked unless it is **saying something**. A profile with a single family gets
  a bar too, and numbering it "1" would announce a distinction that does not exist; that
  test is `:has([data-wbe-family="2"])` in the stylesheet, so it costs no JavaScript and
  follows the lists as they are redrawn. A sibling list is only marked when it actually
  mixes full and half siblings, which needs the values compared and so is decided in
  JavaScript, as `wbe-cb-mixed-parents`.
- When the number is switched on it sits in a **gutter outside the row**, and getting there
  took three tries on real profiles. Left in the flow it lands on a line of its own, because these rows lay
  their contents out as blocks — that adds height to every row. Pinned inside the row it
  lands on top of the ages and relationship figures, which are already right-aligned there.
  So the list gives up a strip of its width (`padding-right`), which moves each row's right
  border left and leaves a clear gutter with nothing else in it. Nothing overflows and
  nothing overlaps. Spouse blocks are exempt: they are tall, with the marriage details
  below the name, so there is room inside and nothing to collide with. They still get the
  gutter anyway, and so does the parents list, which carries no marker at all. Two rounds
  were spent learning this: first the spouse list stayed wide because its blocks had room
  inside, then the parents list stayed wide because its own `:has()` test failed for want
  of a marker. Both looked like bugs. The gutter is now decided once on `#nVitals` and
  applied to every list in it — four stacked lists that do not line up read worse than four
  slightly narrower ones that do.
- The patterns are crisp for spouses and children, where each row has a single bar. For
  siblings they are subtler, because the row's border and the inner span's border sit
  almost on top of each other — the difference is there, but it is a doubled bar rather
  than two clean ones. Change Family Lists already prints `[half]` in those rows, so the
  full/half distinction has a text channel regardless; what the pattern adds is _which_
  parent.
- The `::after` that draws the number is matched by **two** selectors — one for the
  spouse/children groups and one for the sibling lines — and both have to list every mode
  the cue is on in. Getting that wrong is silent: the number simply does not appear, and
  nothing fails. It happened once, when the default changed from `number` to `both` and
  only one of the two selectors was updated; siblings kept working and children and
  spouses quietly stopped. The jest tests cannot catch this — they assert the body class,
  not whether any CSS matched it — so **check a rendered profile after touching these
  selectors**.
- The patterns are matched on **that feature's own classes**, not on the data attributes
  this file adds, because the border sits on the row or on the span inside it depending on
  which parent it is, and the class is on whichever element actually carries the border.
  Both the plain (`parent_1`) and per-id (`parent_1_pid12345`) forms are matched.
- The attribute is kept in step with the class by a `MutationObserver` watching `class`,
  not just added nodes. Change Family Lists strips every `spouse_` class before reassigning
  them on each redraw, so a one-off pass at load would be wrong within seconds.

## Custom Style

Custom Style has 24 color pickers, and two of them change what this feature is working
against.

**Background color.** Both palettes are measured against an assumed page — white, or Dark
Mode's `#36393f`. A reader can set the page to anything from Custom Style with no Dark Mode
involved and no class to key off, and then the light palette is being painted on a dark
page. Measured: okabeIto's danger is **1.05:1** on a `#5a5a5a` page. So the palette is no
longer chosen from `body.darkMode` alone — `adaptToPageBackground` measures the real
background, adds `wbe-cb-dark-page` when it is dark, and lightens any accent that still
falls short of its bar against that actual color. It runs again 1.2s after load, because
Custom Style injects its `<style>` from its own async init and can land after this one.

**Link color.** The bug this feature exists for is "a new-page link looks like an ordinary
link", so the options-page warning compares the two. It was comparing against a hardcoded
`#008000`. If the reader has set their links to the same blue as the default new-link
color, those are now the same link and the warning would have said nothing. It reads
Custom Style's `link_color` and `all_background-color` instead, falling back to WikiTree's
own when that feature is off.

What is **not** handled: Custom Style's own contrast logic asks whether text is readable on
its own background, one element at a time. It has no notion of two separate colors needing
to stay distinguishable, and none of color blindness, so a reader can still pick a set of
Custom Style colors that collide with each other. Checking that properly means teaching
Custom Style about color vision, which is its own piece of work. The simulator is the
answer meanwhile: a Custom Style palette can be checked by looking at a page through it.

## Dark Mode

WBE's own Dark Mode needs a second palette, and this is not a nicety. The light values
were darkened until they were readable on white, which is exactly the wrong direction for
a `#36393f` page: Okabe-Ito's danger scored **1.60:1** there and High Contrast's new-link
blue **1.03:1**, which is invisible. `DARK_PALETTES` holds the same hues lightened back up
until they clear the same bars against the dark background.

Three things were found by measuring rather than reasoning, and are worth knowing before
touching any of it:

- **Dark Mode repaints every link `#ffee99`**, through a selector whose `:not()` list
  gives it a specificity of (0,5,3). This feature's `a.new` rule was (0,2,3), so it lost —
  new links and ordinary links were the same colour in Dark Mode, which is the original
  bug reintroduced. The rule now carries `:not(#dummyID)` to buy an id's worth of
  specificity, the same trick `darkMode.css` itself uses.
- **The dark box tints go towards the page background, not towards white.** Dark Mode's
  own `#dedecb` body text out-specifies this feature's text colour on those boxes, so a
  pale tint left pale text on a pale background — worse than doing nothing. Tinting
  towards `#36393f` keeps the pair readable however that specificity falls.
- **The palette is published in both lightings at once**, as `--wbe-cb-*-light` and
  `--wbe-cb-*-dark`, and `color_blind_support.css` resolves the pair off `body.darkMode`.
  Dark Mode adds that class from its own async init, which can land either side of this
  feature's, so anything decided in JavaScript would be a coin toss. It also means a
  reader on "system" Dark Mode who changes their OS setting gets the right palette with
  nothing here having to listen for it.

## How it fits together

`color_blind_support.js` publishes the chosen palette as CSS custom properties on
`<html>`:

```
--wbe-cb-newlink-light   --wbe-cb-newlink-dark
--wbe-cb-danger-light    --wbe-cb-danger-bg-light    --wbe-cb-danger-text-light   (and -dark)
--wbe-cb-warning-light   --wbe-cb-warning-bg-light   --wbe-cb-warning-text-light  (and -dark)
--wbe-cb-success-light   --wbe-cb-success-bg-light   --wbe-cb-success-text-light  (and -dark)
```

`color_blind_support.css` resolves each pair down to the plain name — `--wbe-cb-danger`
and so on — which is what everything else reads.

Note that `-text` and `-on` are **not** interchangeable. `-text` is computed for the pale
tint, `-on` for the accent itself, and using either in the other's place is unreadable in
at least one lighting. **Any rule that sets one of these as a background must set the
matching text colour**, because WikiTree picks its own text to suit its own fill: change
the fill and leave the text and you inherit a colour chosen for a different background.
That is how the Content Rank badge — `.badge.green.new` — shipped as a solid block with
invisible text.

Other WBE features read those through fallbacks — `color: var(--wbe-cb-danger, red)` —
so their own reds and greens follow the user's choice when this feature is on, and are
exactly as they were when it is off. **If you are adding a red or green to a WBE
feature, use the variable with a fallback rather than a bare color.**

The cue choices become classes on `<body>` (`wbe-cb`, `wbe-cb-newlink-both`,
`wbe-cb-status`, `wbe-cb-privacy-both`, `wbe-cb-gender-border`), which
`color_blind_support.css` keys off.

## Other WBE features

The same question — _is colour the only thing carrying this?_ — was put to the rest of the
extension. What it turned up, in order of how much the colour is doing:

| Feature                                                                 | What colour encodes                                                                                                    | State                                                                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Show Suggestions**                                                    | error / warning / hint, three panels differing **only** in background — same border colour, same text colour           | **done** — double / dashed / dotted edge                                                                                              |
| **What Links Here**, **Category Management**                            | gender, as `.background--gender-*` row tints                                                                           | **done** — painted stripe                                                                                                             |
| **Connection Finder**                                                   | which connection branch a person belongs to, as 18 classes literally named `greenFamily`, `blueFamily`, `pinkFamily` … | **not done** — the same shape as `spouse_N`; the JS holds them in an ordered array, so an index exists to hang a number or pattern on |
| **Suggested Matches Filters**                                           | which field matched, and **full vs partial**, across ~8 tinted spans                                                   | **not done** — needs thought: the meaning is "what kind of match", which may want words rather than shapes                            |
| Feed Helper, Sort Theme People, Wikitable Wizard, Menu Style, Dark Mode | highlighting, chrome, theming                                                                                          | not information — left alone                                                                                                          |

Two things learned doing the ones marked done, both by measuring rather than reasoning:

- **A border is the wrong tool on a table row.** `border-left` on a `<tr>` in a collapsed
  table merges with the rows above and below, and the collapse algorithm picks one winner
  by style precedence — so three rows asking for solid, dashed and dotted render as a
  single unbroken line. Moving it to the row's first cell does not help.
- **A background gradient on a `<tr>` is also wrong**, because a table row's background
  positioning area is the whole table, so the gradient is scaled across it and each row
  shows a flat slice. Painted on the first **cell** it renders per row, which is what the
  rules do.

## Notes and limits

- Loaded **last** in the appearance block of `content_main.js`, so its rules land after
  Custom Style, Dark Mode and Visited Links and win specificity ties. Where this feature
  and Custom Style both style a box, this one wins — accessibility over decoration.
- Link and visited-link colors are deliberately **not** set here. Use the **Visited
  Links** and **Custom Style** features, which already cover them.
- The Bio Check wording is done from this feature's stylesheet, against
  `#bioCheckResultsContainer` and `#bioCheckResultsList`, so that `bioCheck.js` stays
  untouched. It therefore only appears while this feature is on. If those two ids ever
  change, the wording silently stops appearing — nothing else breaks.
- Gender **colors** are likewise left to Custom Style; this feature only adds the cue.
- The simulator applies a CSS filter to `<body>`, which makes `<body>` the containing
  block for fixed-position descendants. While it is on, pop-ups and sticky bars may
  scroll with the page. It is a checking tool, not a browsing mode.
- **Do not "fix" that with `backdrop-filter`.** A fixed full-viewport overlay with
  `backdrop-filter: url(#…)` filters the page without becoming a containing block, and in
  Chromium it works perfectly — tested: the sticky header stays put and the colours
  transform. Firefox returns `true` from `CSS.supports("backdrop-filter", "url(#f)")` and
  then paints nothing at all. Nothing can tell those two apart before committing, and the
  failure mode is a simulator that silently shows an unfiltered page while the control
  claims a condition — worse than a header that scrolls.
- **A numeric check cannot tell you whether two colours are hard to tell apart.** The
  simulation matrices drop hue but keep luminance, so WikiTree's red `a.new` and its green
  links come out 91.8 dE apart under deuteranopia, and no readable red/green pair comes
  within 14 dE. Both the preset checker and the options-page warning therefore only claim
  to catch colours that _converge_, and say so. This is the strongest argument for the
  shape cues: they are the only channel that can be verified.
- Privacy dots are tagged on load and by a `MutationObserver`, so dots in watchlists,
  CC7 tables and other late-built content are covered too.
- The context menu item is created in `public/background.js`, with no `featureId`, so it
  is offered on every main-domain page whatever this feature's own setting says. It sends
  `{ action: "showColorBlindSimulator" }`; the listener for that is registered
  unconditionally, outside the `shouldInitializeFeature` check, or it would not be there
  to hear it. Firefox for Android has no `contextMenus` API, so the menu route does not
  exist there and the options page is the only way in.
- Because the simulator can run with the feature off, `color_blind_support.css` is
  imported on demand rather than at startup. That is safe: every rule in it is behind a
  `body.wbe-cb*` class except the corner control's own.
- `color_blind_support.test.js` covers the combinations of those two switches, which is
  where the behaviour is easy to get wrong.
- A `chrome.storage.onChanged` listener tracks the enabled flag only. The colours and cues
  still wait for a reload like every other WBE style feature, but a stale copy of _that_
  flag did real damage: switch the feature off from the control in one tab, and a second
  tab still believing it was on would write `true` straight back when its own control was
  closed, silently undoing the decision.
- `WIKITREE_REPORT.md` in this folder is the write-up of the site-side findings, for
  taking upstream. WBE only helps people who install it.
- **G2G is not fully audited.** Anything there carrying `.box.green`, `.box.orange` or
  `.status` is already covered by the rules above. The G2G-specific signals —
  `.qa-a-item-selected`, the vote and answer counts, the tag pills — have not been
  checked against the live stylesheet.
