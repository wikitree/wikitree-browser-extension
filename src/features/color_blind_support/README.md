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

Once a simulation is on, a control sits in the bottom corner of every page, with two
independent halves:

- **Support** — a checkbox for whether WBE is helping at all. Unchecked, the page reverts
  to exactly how WikiTree styles it: original colors, no cues, and the other WBE features
  back to their own reds and greens, because dropping the custom properties makes their
  `var(--wbe-cb-danger, red)` fallbacks take over.
- **Seeing as** — which reader you are looking through.

The combination worth reaching for is a deficiency selected with Support switched **off**:
that is the page as the member who reported this actually sees it. Switch Support back on
and the fix is right there next to the problem.

Unchecking Support is a peek at the current page; it is not written anywhere by itself.
Closing the control while it is unchecked **is** the decision, and that is saved: the
whole feature is switched off in your settings, exactly as if you had unticked it on the
options page. Anything else would leave the feature enabled but doing nothing, which is
indistinguishable from it having quietly broken.

Closing that way resets the simulation too, so that turning the feature back on later
does not drop you onto a page filtered to somebody else's color vision with no
explanation. The `×` tooltip says which of the two things it is about to do.

With Support checked, `×` is a plain dismiss: the page stays exactly as it is. The
simulation choice _is_ remembered as you navigate, so a run of pages can be walked in one
condition and then re-walked in another. Choosing **Normal (off)** ends the simulation:
the control will not be there on the next page, and the options page is the way to start
again.

## How it fits together

`color_blind_support.js` publishes the chosen palette as CSS custom properties on
`<html>`:

```
--wbe-cb-newlink
--wbe-cb-danger    --wbe-cb-danger-bg    --wbe-cb-danger-text
--wbe-cb-warning   --wbe-cb-warning-bg   --wbe-cb-warning-text
--wbe-cb-success   --wbe-cb-success-bg   --wbe-cb-success-text
```

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
- Privacy dots are tagged on load and by a `MutationObserver`, so dots in watchlists,
  CC7 tables and other late-built content are covered too.
- Like every other WBE style feature, a settings change needs a page reload.
