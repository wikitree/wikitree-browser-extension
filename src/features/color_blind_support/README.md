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

| Element                                                                   | Cue added                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `a.new` — links to pages that do not exist                                | Dotted underline and a superscript `?`                                |
| `.status.green` / `.status` / `.status.red`, `.box.green` / `.box.orange` | Solid / dashed / double left border                                   |
| `.privacy--NN` dots                                                       | Distinct border style per level, plus the level number beside the dot |
| `.tree--person_m/_f/_u`, `.genderbar`                                     | Solid / dashed / dotted left edge, optionally an M / F / ? letter     |
| Bio Check's results box                                                   | "Passed." / "Issues found." in words above the findings               |

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
