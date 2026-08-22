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

The recolor is applied to the three `.status` message boxes — the elements the palette's
roles are named after — plus new/unknown link text. A ninth value,
**Do nothing**, keeps WikiTree's own colors throughout while leaving every shape cue
running; see [The palette can be switched off](#the-palette-can-be-switched-off).

**Adds a second, non-color channel**, which is the part that actually does the work. No
one palette suits every form of color blindness, so nothing here relies on the recolor
alone:

| Element                                                                    | Cue added                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `a.new` — links to pages that do not exist                                 | Dotted underline and a superscript `?`                                |
| `a:visited` on content links                                               | An underline appearing, or a checkmark; off by default                |
| `.status.green` / `.status` / `.status.red`                                | 3px dark rim, plus a solid / dashed / double left border              |
| `.suggestion-item.suggestion-Error` / `-Warning` / `-Hint`                 | Double / dashed / dotted left border                                  |
| `input.changed` / `select.changed` / `textarea.changed`, `label.changed`   | Dashed border instead of solid; bold label                            |
| `.qa-q-view-flags` and friends (flagged G2G posts)                         | Double border instead of solid                                        |
| `.privacy--NN` dots                                                        | Distinct border style per level, plus the level number beside the dot |
| `.tree--person_m/_f/_u`, `.genderbar`                                      | Solid / dashed / dotted left edge, optionally an M / F / ? letter     |
| Tree Apps gender backgrounds (Ahnentafel, report views)                    | Solid / dashed / dotted left edge                                     |
| Tree Apps Descendants `li.person`                                          | Gender on the **right** edge; spouse group patterned on the left      |
| Tree Apps One Name Trees `[data-gender]`                                   | Gender on the **right** edge; parent pairing patterned on the left    |
| Tree Apps CC7 Views `#peopleTable tr.Male/.Female`                         | Solid / dashed left edge on the row's first cell                      |
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

## Visited links: possible after all

WikiTree draws `a:visited` purple against `a:link` green. As CIE76 dE:

|                 | normal | deuteranopia | protanopia | tritanopia | grayscale |
| --------------- | ------ | ------------ | ---------- | ---------- | --------- |
| green vs purple | 141.3  | **23.0**     | 34.5       | 42.2       | 141.3     |

Note that grayscale is _not_ the problem — purple is much the darker of the two, so the
difference survives having no colour at all. Deuteranopia is the weak case, and a reader
with it reported the two as looking the same.

**An earlier version of this file said no shape cue was possible in Chrome. That was
wrong**, and the reason it was wrong is worth more than the conclusion was, so it is
recorded here.

### What Chrome actually restricts

The restriction is about **layout**, not about which element the rule matches. Retested in
real Chrome against a page with genuine history:

| tried                                                     | result       |
| --------------------------------------------------------- | ------------ |
| `color` on the link itself                                | honoured     |
| colour of a child `<span>` — `g2g.js`'s checkmark pattern | **honoured** |
| colour of an `::after` glyph                              | **honoured** |
| `border-bottom-color`                                     | **honoured** |
| `outline-color`                                           | **honoured** |
| `text-decoration-color`                                   | **honoured** |
| `display` of a child `<span>`                             | ignored      |
| `content` on `::after`                                    | ignored      |
| `background-color`                                        | ignored      |

Anything that would move the page is refused, because that is what leaks history to a
script. Anything that only changes a colour is allowed, on descendants and pseudo-elements
as much as on the link.

### The trap that produced the wrong answer

**The alpha channel of a `:visited` colour is taken from the unvisited value.** A cue built
on `border-bottom: 3px double transparent` — which is exactly what the abandoned attempt
here used — asks Chrome to paint the visited colour at alpha 0. Nothing appears, and it is
indistinguishable from the property being ignored.

Base the off state on an **opaque** colour instead, the page background, and every cue in
the table above works. `getComputedStyle` reports the unvisited style by design, so this can
only be checked in rendered pixels; and Chrome 136+ partitions visited-link history, so the
link has to be reached by **clicking it from the test page**, and the test page then
revisited by a fresh navigation rather than Back, which restores the pre-visit paint from
bfcache.

### Why this counts as a shape cue

Only a colour is being set, but it is set from "same as the background" to "dark", which is
a **luminance** change: the mark is absent or present. Verified under `filter: grayscale(1)`
— a checkmark, a doubled underline and a dotted underline all read, while the link text
itself is an identical grey either way. It is a shape cue built out of the one property the
browser allows.

The cost is that the off state has to match the real page background, which Custom Style and
Dark Mode both move. `adaptToPageBackground` already measures that background for the
palette, so the value is available.

**`g2g.js` is therefore not broken.** Its checkmark option paints the `✓` white and turns it
green on `:visited`, which is the working pattern, not a dead one. It does assume a white
page.

### Why a better colour is not the answer

`color` does work, so the visited colour could be changed instead. Over every colour readable
on white, the best scorer against WikiTree's green is `#D84000` at **58.8** worst-case,
against purple's 23.0 — a large improvement on paper.

It was not taken, because the measurement cannot be trusted for this particular pair.
`#D84000` is an orange-red against a green, and the simulation matrices drop hue while
keeping luminance, so they cannot see red-green confusion at all — the same blind spot
recorded in `scripts/check-palette.mjs`, where WikiTree's own red/green measures 91.8 dE
apart under deuteranopia. A change this repo's own tooling cannot validate is not one to
ship to the readers it is meant to help.

### What shipped

A `visitedCue` option with three settings: **Color only** (the default), **a doubled
underline**, and **a checkmark after the link**. Off by default because it marks every
visited link on the page rather than the occasional one, which is a bigger change to how a
page looks than any other cue here makes.

Two details carry the whole thing, and both are easy to undo by accident:

- **The off state is `--wbe-cb-page-bg`, not `transparent`** — the alpha trap above.
  `adaptToPageBackground` publishes it from the background it already measures, so Dark
  Mode and a Custom Style background are both followed.
- **The mark is `currentColor`, not a palette colour.** Inside a `:visited` rule
  currentColor resolves to the visited ink — verified, Chrome does not substitute the
  unvisited one — so the mark follows whatever the reader chose in **Visited Links** or
  **Custom Style**. Those features keep the colour; this one adds only the shape. That is
  the same split as gender backgrounds, and it means there is nothing to arbitrate between
  the three features and no need for a "who wins" setting.

**Where it applies matters as much as what it is**, and the first version got that wrong by
marking every visited link on the page. On a G2G list that put a mark on the nav tabs, the
tag pills, the usernames, the category sidebar and the "commented" meta links, and lost the
two question titles among them.

"Have I already looked at this?" is a question the reader asks about **content** — a row in
a list they are working through, a link in the text they are reading — and never about the
furniture around it. So the cue is scoped to:

| selector                 | covers                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `.qa-q-item-title a`     | every G2G list — Questions, Unanswered, Recent Activity, My Activity, Tags, search |
| `table.table--data td a` | WikiTree's own data-table lists                                                    |
| `.body-text a`           | the wiki content itself: a profile's biography and sources and the stickers in     |
|                          | them, and space and category page text                                             |
| `#Categories a`          | the profile's categories box, which sits outside `.body-text` in the right column  |

Deliberately excluded, all navigation rather than reading: the nav bars and menus, the
profile tab strip, the search boxes, the badges, and **the ancestor tree** — 154 links on
Winston Churchill's profile, which would swamp everything else on the page.

The count follows how much content a page has, which is the point: a stub profile picks up
a handful of marks, Churchill's picks up 318 because it genuinely has that much to read.

Not covered, for want of anything to hook onto: **What Links Here** builds a plain `<ul>`
with no distinguishing class, and **Special:SearchPerson** renders its results into
undifferentiated bootstrap columns. Widening to either is one line in that list.

Three things worth knowing before changing it:

- The off state is hidden by painting it the colour of the background the link actually
  sits on, which is **not** always the page. WikiTree gives the profile's Categories box a
  pale green of its own — measured `rgb(225,240,180)` against a white body — and the
  stickers in a biography have their own fills. Painted page-white, the off state drew a
  visible white line under every link the reader had _not_ visited, which is the cue
  backwards. `markLocalBackgrounds` walks up from each link to the nearest ancestor that
  paints something and publishes it as `--wbe-cb-local-bg` on that ancestor; the property
  inherits, so one write covers every link inside. It runs again at 1.2s with
  `adaptToPageBackground`, because Custom Style can repaint after this feature starts.
  Because it reads computed style rather than Custom Style's settings, it also covers
  boxes Custom Style knows nothing about — which is how the Categories box was caught.
  **`VISITED_CUE_SELECTOR` in the JS must stay in step with the visited selector in the
  CSS**; out of step, the mark is measured against the wrong background and shows on links
  that were never visited.
- On a title that wraps, the underline is drawn on **every line**, because that is what a
  bottom border on an inline element does. The checkmark marks the title once instead.
- **Where WikiTree already underlines its links** — the categories box, the links in a
  biography — the mark has no choice but to stack under the underline that is already
  there, because only a colour may change on `:visited`. That is why the mark is a **2px
  solid** line and not the 3px double it started as: double made three stacked lines,
  which read as a rendering fault rather than a cue. One extra line reads as a doubled
  underline, which is what a marked link should look like. Checked in grayscale against 48
  unvisited neighbours in the categories box, and on a G2G title, where nothing is
  underlined and the mark is a single line appearing.

**Firefox is unverified.** Headless Firefox records no history, so `:visited` cannot be
triggered there locally. If Firefox refuses any of this the cue simply does not appear,
which is the safe direction to fail in.

## Every cue has its own switch

Two things used to happen the moment the feature was switched on, with nothing to turn
them off: **new/unknown links were recoloured**, and **the badge fills were repainted**.
Both now have their own setting, so nothing this feature does is compulsory beyond being
switched on at all.

- `newLinkRecolor` (default on) gates the `a.new` recolour, separately from the shape cue
  on the same links. Turning it off keeps WikiTree's red — or whatever Custom Style sets —
  while the dotted underline and the `?` still mark the link. Colour and shape are
  independent because a reader who has chosen their own link colours should not have to
  give up the cue to keep them.
- `badgeCue` (default `both`) gates the badge fill and the badge border independently:
  `both`, `recolor`, `border`, `none`. `both` is the default because that is what badges
  did before the option existed — the fill came with the feature, the border with the
  status cue. Both settings skip the Content Rank badge at every tier, which is every
  badge on WikiTree today; see
  [The Content Rank badge, and why it is left alone](#the-content-rank-badge-and-why-it-is-left-alone).

### Every cue can be told to do nothing, and that is how conflicts get settled

There was briefly a cross-feature override here: this feature read Custom Style's
**Remove link underlines** option and, when it was on, quietly swapped the dotted underline
for the `?` and the visited underline for the checkmark, with an `underlineOverride`
checkbox to countermand it. **That is gone**, and the reasoning for removing it is better
than the reasoning for adding it.

It failed in use the moment it shipped. A reader whose Visited Links setting read "An
underline" saw checkmarks instead, with no way to tell from the options page why — the
select said one thing and the page did another. An override that silently rewrites the
setting you are looking at is worse than the conflict it was avoiding.

The rule now: **every option can be set to do nothing**, and that is the only mechanism.

| option           | its do-nothing value                                      |
| ---------------- | --------------------------------------------------------- |
| `newLinkCue`     | Do not mark them (and `newLinkRecolor` off for the color) |
| `visitedCue`     | Do not mark them                                          |
| `badgeCue`       | Leave them alone                                          |
| `statusCue`      | unticked                                                  |
| `privacyCue`     | Do not mark them                                          |
| `genderCue`      | Do not mark them                                          |
| `familyCue`      | Do not mark them                                          |
| `newLinkRecolor` | unticked                                                  |
| `paletteName`    | Do nothing (keep WikiTree's colors)                       |

So a reader who wants no underlines anywhere chooses the `?` for new links and the
checkmark — or nothing — for visited ones, and gets exactly what they asked for, visibly,
from settings they can see. No feature is guessing at another's intent.

The one cost worth stating: the checkmark **reserves its space whether or not it is
showing**, because `content` cannot change on `:visited` — so it leaves a small gap after
every marked link. The underline costs no layout at all. That is now in the option's own
text.

## Shape cues are drawn in currentColor, never in the palette

Every cue that works by **shape** — the status edges, the suggestion and message edges, the
badge borders, the dashed edge on a changed field, the G2G flag border — is drawn in
`currentColor`, not in a `--wbe-cb-*` colour. This is not a detail; it was a real bug,
reported from a real page.

A reader set a Custom palette of pale tints. The options page of the day measured them at
1.2:1, 1.1:1 and **1.0:1** against the page background and said so in as many words — those
notes have since been removed, for reasons below. Every shape cue was then painted in those
colours, so:

- the success and error boxes lost their edge **completely** — the cue was invisible;
- with the cue switched **off** it was worse, because the whole-border recolour was still
  active, so WikiTree's own visible yellow border was repainted invisible and the boxes
  ended up with less of an edge than WikiTree gives them.

Reproduced against the shipped stylesheet with WikiTree's own `.status` declarations, fixed,
and re-checked in grayscale: with `currentColor` the default palette and the 1.0:1 palette
now render **identically**, because the palette no longer touches the cue at all.

The rule this leaves behind, worth keeping: **if a cue is a shape, its colour must come from
the element, not from a setting.** `currentColor` is right for these because the element's
own text colour is already guaranteed readable against its own background — WikiTree's
box text measures 10.4:1 and 10.8:1, and the badge text colours are computed here for
exactly that. It also follows Dark Mode for free. The same reasoning is already written down
for the gender stripes and the visited-link mark, which were built this way from the start.

**The palette now drives only the places where colour is genuinely the only channel:** the
three `.status` message boxes and new/unknown link text. Nothing else reads a `--wbe-cb-*`
colour.

## Why `.box.green` and `.box.orange` are left alone entirely

Earlier versions gave those two a severity edge alongside the `.status` variants. That was
a mistake and has been removed. **A class named after a colour is not a state.** WikiTree
uses `.box.green` and `.box.orange` for ordinary content panels wherever a page wants a
green or an orange one, so marking them announces a severity the page never claimed — and
that is worse than leaving them plain, because a reader who trusts the edges cannot then
tell an invented one from a real one. Only markup that actually encodes a state is marked.

What leaving them alone costs is worth stating, because it is not nothing. `.box.green` and
`.box.orange` are `#e1f0b4` and `#ffee99` — the **same two fills** as `.status.green` and
plain `.status`, three levels apart in Rec.709 and 20.2 dE apart under deuteranopia, below
the 25 `check-palette` treats as a failure for the palette's own colours. Unlike the status
boxes they carry no icon, and unless the page adds `.border` no edge either, so a page that
uses one of each really does hand a colour-blind reader two identical panels. The answer is
still not to invent a severity. If they are ever marked it has to be with something that
says only "these two are not the same box", and the hook for it is `.box.green.border` /
`.box.orange.border` — WikiTree's own opt-in 10px left edge, `#25422d` for green and
`#fad158` for orange, which the page author has already chosen to turn on.

`.status`, by contrast, does encode a state, and needs the help badly. Measured on the live
stylesheet and re-checked 2026-08-22: `.status` is `#ffee99` behind a 3px solid `#fcb815`
rim, `.status.green` overrides both to `#e1f0b4` and `#8fc641`, and `.status.red` to
`#ffcccc` and `#e22a40`. An earlier version of this note said all three shipped the same
yellow rim; WikiTree has since colour-coded them, which helps nobody here, because each rim
now disappears into the fill it surrounds — 1.68:1 for green on green, 1.49:1 for amber on
yellow. The three fills are Rec.709 luminance 235, 232 and 215, so warning against success
is three levels out of 255, which is no difference at all in grayscale.

## The palette can be switched off

`paletteName` takes **Do nothing (keep WikiTree's colors)**, and it is the only switch
needed for the color half of the feature: the shape cues are drawn in `currentColor` and
keep working with no palette at all.

It is implemented as two things, because either alone is wrong:

- **Nothing is published.** `applyPalette` removes every `--wbe-cb-*` property instead of
  setting it. Every rule that reads one writes it as `var(--wbe-cb-thing, <WikiTree's own value>)`, so each element goes back to the color it had. This is the only mechanism that
  reaches **Date Fixer, Text Expander, Locations Helper and WikiTree+**, which read
  `--wbe-cb-danger` from their own stylesheets — no body class here could switch those off.

  It looks like it should not work, because `color_blind_support.css` aliases
  `--wbe-cb-danger: var(--wbe-cb-danger-light)`, so the property is still declared after
  the `-light` one is removed. An alias resolving to an unset property becomes the
  guaranteed-invalid value, and `var()` treats that exactly as an undeclared property — the
  fallback is used. Checked in Chrome rather than assumed.

- **The `wbe-cb-palette` body class is absent**, which is what actually stops the paint.
  The fallbacks alone are not enough: those rules carry `!important`, so they would repaint
  WikiTree's own value _over a color the reader had set in Custom Style_. With the palette
  off the rules must not match at all.

`--wbe-cb-page-bg` is deliberately **not** cleared. It is the measured page background, not
a palette color, and the visited-link cue paints its off state in it.

## What the boxes are recolored with, and why it is the ink

`.status.green` is a success, plain `.status` a warning and `.status.red` an error — the one
place on WikiTree where the palette's three roles have an element that means exactly what
they are called. Each gets `--wbe-cb-<role>-bg` (the accent tinted toward the page until it
hits a target ratio) and `--wbe-cb-<role>-text` (computed to be readable on that tint).

**For a preset, the picker is the ink, not the tint.** The same accent paints error text in
Date Fixer, so one choice keeps its meaning wherever the role appears — and it has to be
that way round, because a color pale enough to sit behind body text cannot be read as error
text. Choosing the tint and deriving the ink does not work in reverse.

### A preset and a Custom color are read in opposite directions

This is the one asymmetry in the feature, and it is deliberate.

|            | what the value is                                      | what gets derived                                |
| ---------- | ------------------------------------------------------ | ------------------------------------------------ |
| **preset** | an accent, chosen to stay apart from the others as ink | the box, tinted out of it toward the page        |
| **Custom** | the message box, used **exactly as picked**            | the ink, darkened out of it until it can be read |

A preset like Okabe-Ito's `#B0003A` was picked to work as _text_. Painted straight onto a
message box it is a solid dark block where WikiTree has a pale one, so `tintTowards()` mixes
it toward the page until it reaches `BOX_TINT_TARGET` — `{ danger: 1.42, warning: 1.17, success: 1.21 }`, which is WikiTree's own `#ffcccc`, `#ffee99` and `#e1f0b4` measured against
white.

A Custom color goes the other way, because of what the reader was looking at when they chose
it: a label naming a message box, on a page where that box is pale. So the pick fills the box
untouched, and `reachContrast()` darkens a copy for the places the same role is painted as
text — error text in Date Fixer, Text Expander, Locations Helper and WikiTree+.

**The color is never overruled to keep text readable. The text moves instead.** Whichever
direction the box came from, the text on it is computed from the box:

| picked    | box       | text on it | ink derived for text       |
| --------- | --------- | ---------- | -------------------------- |
| `#ffcccc` | `#FFCCCC` | `#000000`  | `#8B6F6F` — 4.6:1          |
| `#7a0021` | `#7A0021` | `#ffffff`  | `#7A0021` — already 11.4:1 |

Dark Mode always tints, in both directions: nothing here was picked against `#36393f`, and a
color that is a box on white is a pale block there. For a Custom palette the tint starts from
the reader's own pick rather than from the lightened accent, so their hue carries over.

The Custom defaults are WikiTree's own three box colors, so switching to Custom starts from
the page as it already looks.

### The options page says nothing about a Custom color

It used to. Picking a color ran three contrast measurements and a color-vision simulation
and printed notes under the picker — _this is faint as text at 1.1:1_, _this box is 1.12:1
from your page_, _looks the same as an ordinary link with deuteranopia_. All of it is gone,
with `color_blind_support_options_ui.js` and its test.

The reason is the one the rest of this file keeps arriving at: **shape carries the meaning,
not color.** New links get a dotted underline and a `?` by default, the boxes get a rim and
a left edge, a marked badge gets an outline. Every one of those notes was therefore
reporting a weakness in the _backup_ channel — telling a reader their color measured badly
while the cue that actually does the work carried on regardless. And a settings panel that
quotes contrast ratios at somebody reads as an audit, which is a strange thing to hand a
reader about a decision that was theirs to make.

What replaces it is looking at the page. A color too faint to read looks too faint to read,
and for the part that cannot be judged by eye the simulator is one select away in this same
options page.

One thing did get quieter. Where a box color is also painted as text it is darkened to stay
readable there, and the note used to name the derived value. **The derivation still
happens** — it is in `applyPalette`, and was never in the notes — so a reader now meets a
color they did not pick with nothing to explain it. If that turns out to matter, showing the
derived color in the swatch would say it better than a sentence ever did.

The four color pickers themselves are now shown only while the palette is set to Custom,
rather than each repeating "Custom palette only" in its own comment. That is a `dependsOn`
in the option definition, extended for this to take a select and the value that satisfies
it, and to hide the row rather than dim it — a control that cannot apply at all is clutter,
where a greyed-out one is at least telling you it exists.

### The recolor is not what makes them readable

Worth keeping straight, because an earlier version of this file got the two backwards and
dropped the recolor entirely. Repainting the tints does **not** separate the severities:

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

So the shape carries the meaning: the rim and the left border survive any color vision and
grayscale alike, and read without a second box on screen to compare against. The recolor is
a separate promise — that a reader who picks an error color sees the error box change — and
measurements about grayscale do not answer it either way. Both are done; neither is asked
to do the other's work.

A badge that means success or error keeps its fill recolor and gets a 2px edge as well —
solid for green, dashed for red — because the fill alone is one channel and badges are small
enough that it is easy to miss. No badge on WikiTree currently qualifies; see the next
section.

### The Content Rank badge, and why it is left alone

WikiTree runs one badge scale, and almost every badge in the wild turns out to be the
Content Rank number beside a profile name — a ten-point score on five colour steps:

| Selector           | WikiTree's fill | Content Rank | Also seen            | Rule here |
| ------------------ | --------------- | ------------ | -------------------- | --------- |
| `.badge.green.new` | `#8FC641` solid | `CR:10`      | `M` on the watchlist | untouched |
| `.badge.green`     | `#E1F0B4` pale  | `CR:9`–`8`   | —                    | untouched |
| `.badge.new`       | `#FCB815` amber | —            | —                    | untouched |
| `.badge`           | `#FFE270` amber | `CR:7`–`6`   | —                    | untouched |
| `.badge.red`       | `#FFCCCC` pale  | `CR:5`–`4`   | —                    | untouched |
| `.badge.red.new`   | `#CC0000` solid | `CR:3`–`1`   | `PPP`                | untouched |

**Nothing here is colour-only.** Every step of the ramp prints the number it is encoding —
`CR:9`, `CR:5` — and `PPP` spells out its state too. Colour is carrying nothing the label is
not already carrying, and by this feature's own test there is nothing to mark. It is the
same finding as
[the Family Group app](#the-family-group-app-needs-nothing-and-that-is-the-point), left
alone for the same reason.

**And it mapped the wrong role onto it.** Green on a Content Rank badge is a rank tier, not
a success. Painting the reader's _success_ colour onto a `10` announces a meaning the badge
never claimed — the same mistake as `.box.green`, one element further down.

The visible symptom is worth recording, because it looks like a contrast bug and is not
one. `--wbe-cb-success` is an ink: under a Custom palette it is `reachContrast(pick, white, 3)`, the pick dragged down until it works **as text**. With WikiTree's own `#E1F0B4` in the
picker that ink comes out `#8E9871`, so a clean `#8FC641` badge became a muddy olive one.
Measured, its text pairing was _better_ than WikiTree's:

|                      | fill      | text      | ratio  |
| -------------------- | --------- | --------- | ------ |
| WikiTree             | `#8FC641` | `#25422D` | 5.44:1 |
| This feature, before | `#8E9871` | `#000000` | 6.88:1 |

So flipping the text colour was never the fix — the text colour was already derived from
the fill and was already the right one. **The fill was the mistake**, and an ink used as a
fill will always look like a disabled control, because desaturating toward legibility is
exactly what greying-out does. The 2px `currentColor` ring did the rest: on an element that
narrow it eats the padding the label needs.

#### Excluding only `.new` was not enough

That first fix left `CR:9`–`8` and `CR:5`–`4` being repainted while the other three steps of
the same ramp were not — a ten-point scale recoloured in the middle and untouched at both
ends. The split was not arbitrary. Those two pale fills really are the one confusable pair
in the scale:

| Pair                     | Deuteranopia | Protanopia | Bar |
| ------------------------ | ------------ | ---------- | --- |
| `#E1F0B4` vs `#FFCCCC`   | **4.0**      | **4.7**    | 25  |
| every other pair of five | 26–32        | 26–32      | 25  |

Under protanopia `#E1F0B4` simulates to `#E7E8C3` and `#FFCCCC` to `#E9E8CC`. They are the
same pale cream.

**But repainting them did not fix that.** `#DDEDE9` against `#F1D1DB` measures 12.0 and 8.3
— still under half the bar. And nothing here was rescuing legibility: WikiTree's own badge
text clears WCAG at every step of the ramp, `5.44:1` at the worst of them, and dichromats'
luminance perception is near-normal, so those ratios hold for the readers this feature is
for. The recolor bought a broken ramp and no distinguishability.

Hence `:not(.new):not(.cr-details)` on all four badge rules, fill and border alike. The
rules stay for a pale green or red badge that genuinely means success or error — a sweep of
profiles, the watchlist, G2G, `Special:Badges`, Recent Changes and the person search found
none, so today they select nothing, and that is the point rather than an oversight.

### The rim is redrawn, though

Not recoloring the background is not the same as leaving the box edgeless. A `.status` box
is a pale tint on a `#fcfcfc` page — 215 to 235 against 252 — so in grayscale it has almost
nothing separating it from the page it sits in, and WikiTree's own rims do not help. They
are now one per severity rather than one amber for all three, and each is measured against
the tint it encloses at 1.49:1, 1.68:1 and 3.18:1: the warning and success rims are barely
edges at all, and none of the three is a difference that survives grayscale.

So all four sides get `3px solid currentColor`, at WikiTree's own width so nothing
reflows. `currentColor` for the same reason as every other shape cue here — it is the
box's own text color, dark by construction, and cannot be painted invisible by a pale
palette. An earlier version drew this rim **from the palette**, and that is precisely what
went wrong: a Custom palette measured at 1.0:1 against the page left a success box with
_less_ of an edge than WikiTree gives it. The three sides are set individually rather than
as a shorthand so that the 10px severity edge on the left does not depend on source order.

## The Tree Apps

The apps under `/apps/` are user-created content from the WT Apps project rather than
WikiTree's own pages, but `isMainDomain` covers them, so the feature already runs there.
They reuse **the identical gender trio** — `#f2f1ff`, `#ffeeee`, `#eeffee` — which measures:

| pair              | contrast | grayscale gap |
| ----------------- | -------- | ------------- |
| male vs female    | 1.005:1  | **0.6 / 255** |
| male vs unknown   | 1.073:1  | 7.9 / 255     |
| female vs unknown | 1.078:1  | 8.5 / 255     |

Male against female is six tenths of one level out of 255. It is not a near-miss; it is the
same color, and the app has nothing else marking which is which.

Four families carry it, all handled by the existing `genderCue` option:

- `#ahnentafelAncestorList .ahnentafelPerson` / `.ahnentafelPersonShort` with `.Male` /
  `.Female`
- `.report-person-header` and `.report-breadcrumb-person` with `.Male` / `.Female` /
  `.Unknown`
- `.gender-male` / `.gender-female` / `.gender-unknown`, the app's general-purpose helper

Two things about the scoping:

- **The Ahnentafel rules are gated on `.gender-colors`**, which is the app's own switch (a
  "Gender colors" checkbox in its toolbar) and sits either on `#ahnentafelAncestorList` or
  on an ancestor. With it unticked the app shows no gender color at all, so there is nothing
  to translate — a mark there would invent a distinction rather than preserve one.
- **No unknown row is possible in an Ahnentafel.** Every position in one is somebody's
  father or mother, so that selector list has two branches, not three. The app's base rule
  paints `#eeffee` as the default, which never surfaces here.

Drawn in `currentColor`, unlike the older gender rules above, which use a fixed `#393a3c`.
Those should be brought over — a fixed dark grey disappears in Dark Mode — but that touches
pages this block does not.

### The Descendants view, where two colour-only signals collide

Every other place in this feature has one colour doing one job. A `li.person` row in the
Descendants app has two, and neither has any other channel:

|             | carries                           | values                                                                       |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------- |
| background  | gender                            | `.Male` `#eeeeff` vs `.Female` `#ffeeee` — **2.4 / 255** apart in grayscale  |
| left border | which spouse the child belongs to | `childOfSpouse_0` green `rgb(0,128,0)`, `childOfSpouse_1` red `rgb(255,0,0)` |

Note the male tint is `#eeeeff` here, not the `#f2f1ff` the other apps use.

So the left edge is not just occupied — it is occupied by **green against red**, the exact
pair this feature was built for, carrying the structure of the family. Putting the gender
cue there would overwrite one colour-only signal to fix the other.

They get separated instead, in the arrangement Change Family Lists already uses on the main
site — gender on one edge, family on the other:

- **family keeps the left edge** and gains a pattern (`familyCue`). Only style and width are
  set, never the colour: the app's green and red stay exactly as they are for readers who
  can see them. Both halves of the app's pairing are covered — the child rows
  (`li.person.childOfSpouse_N`) and the marriage lines above them (`dl.spouse dt.spouse_N`),
  which take the same colour from the same palette.
- **gender moves to the right edge** (`genderCue`), which was a plain 1px `#ddd` rule
  carrying nothing.

Rows with no gender class are left alone — this view gives them a neutral `#f6f6f6`, not a
gender colour, so there is nothing to translate.

**The bar is widened to 5px**, and that is not cosmetic. `double` at the app's own 3px
renders as a single line — the two strokes and the gap each round to well under a pixel — so
the fourth pattern in the cycle would be indistinguishable from the first. 5px is the
narrowest that reads as doubled. _The main-site spouse bars are 3px and take the same
four-style cycle, so they have this bug too._

**Known limit:** the cycle repeats every four, so `childOfSpouse_0` and `_4` share a pattern.
Fifty-two groups cannot each have a style, which is precisely why the number is the scalable
cue on the main site. A number here would mean reading the index out of the class name in
JavaScript, which these rules do not do — so `familyCue: "number"` currently leaves this view
unmarked.

### One Name Trees, where the left bars are not what they look like

Same two signals, same split — but the premise needs correcting first, because the obvious
reading of this view is wrong.

The nested bars running down the left **look like generation rails. They are not.**

- **Generation is `level_N`**, which maps exactly one-to-one onto nesting depth
  (`level_0` → depth 1, `level_1` → depth 2, …) and **has no CSS rule anywhere in the app**.
  It is carried by indentation alone, so it already survives grayscale and needs nothing
  from this feature.
- **The bar colour is `parent-child-N`** — which parent pairing the row belongs to, the same
  meaning as `childOfSpouse_N` in Descendants. `parent-child-0` is forestgreen,
  `parent-child-1` blue, and the palette runs to `parent-child-45`.

The bars only read as generations because each ancestor's own bar shows through the nesting.
Confirmed in the DOM: `parent-child-0` appears at nesting depths 3, 5, 6, 7, 8 and 9 — if it
were the generation it would appear at exactly one.

So the treatment is the same as Descendants: pattern the left bar under `familyCue`, and put
gender on the right edge, which is bare here (`0px none`).

Two differences from Descendants:

- **Gender is an attribute, not a class**, and it has a third value:
  `[data-gender="Male"]` `#eeeeff`, `[data-gender="Female"]` `#ffeeee`,
  `[data-gender="blank"]` `#eeffee`.
- **`.popup a.Male` / `a.Female` needs no moving.** There the 5px left border _is_ the
  gender — blue against pink — so it only wants a style.

**A trap worth knowing:** `.oneNameTrees` is a class on `body`, the same element that carries
the `wbe-cb-*` cue classes. So these are written `body.oneNameTrees.wbe-cb-…`, not as a
descendant. Written the obvious way they match nothing at all, silently — which is how the
first version of them was wrong.

### CC7 Views, and a table that silently ignores row borders

`#peopleTable` tints whole rows by gender, with its own pair rather than the trio the other
apps share: `tr.Male` `#cceeff` against `tr.Female` `#ffe6ea`. Stronger colours than
elsewhere and no better for it — **3.6 / 255** in grayscale, against the Descendants view's
2.4. Only these two; the table has no unknown row.

The cue goes on the row's **first cell**, not the row. The table is `border-collapse: separate`, and in the separated model a border set on a `tr` is **ignored outright** — while
`getComputedStyle` still cheerfully reports it. That combination is worth stating plainly:
nothing looks broken, the rule simply never paints. The first cell is the narrow privacy
column with no left border of its own, so the mark lands at the table's left edge, where a
row border would have gone.

Nothing else needed moving here — unlike Descendants and One Name Trees, this table has no
second colour-only signal competing for the same edge.

### The Family Group app needs nothing, and that is the point

It tints `tr.roleRow` by gender like the rest, and gets **no rules at all**, because the app
already says the same thing in words on every row:

- children carry `<span class="fsGender">M</span>` / `F` beside the name
- the couple — the two rows with no such span — are labelled **Husband** and **Wife** in the
  role column

Every row is covered by one or the other, so an edge would be decoration. This feature marks
what colour alone is carrying, not everything that happens to be coloured — the same
principle that keeps `.box.green` and `.box.orange` untouched.

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

Nothing in this feature currently uses `-on`, because nothing paints an ink as a fill any
more; the badges that did are
[no longer touched](#the-content-rank-badge-and-why-it-is-left-alone). It is
still published for anything that puts a role colour behind text, and the warning above is
why it exists separately at all. `--wbe-cb-success` and `--wbe-cb-warning` are likewise
unread now — the boxes take `-bg` and `-text` — and are published for other features.

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
- **G2G is not fully audited.** Anything there carrying `.status` is covered by the rules
  above, and the flag boxes (`.qa-q-view-flags` and friends) now are too. The remaining
  G2G-specific signals — `.qa-a-item-selected`, the vote and answer counts, the tag pills
  — have not been checked against the live stylesheet.
