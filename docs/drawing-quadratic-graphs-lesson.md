# Drawing quadratic graphs: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph, like `equations-of-straight-lines`.
Teaches one skill, `quadratic-graphs`: drawing a quadratic graph by
completing a table of values, plotting the points and joining them with
one smooth curve.

This is the first of three quadratic graph lessons. The next two,
**finding the turning point** and **finding roots from a graph**, get
their own specs later. This lesson only adds their placeholders. It
doesn't mention turning points or roots.

The hands-on tools are a **table of values** that pupils fill in and a
**grid** they tap to plot each point. Then they choose how to join the
points and see that choice drawn.

Everything this lesson needs already exists: number cards with several
`fields`, choice cards, `runQuestionSet` with mixed cards, the custom
answer widget, and the shared graph's `pick`, `point`, `segment` and
`plot`. There is no Part A. **If the lesson needs anything shared that
isn't there, stop and ask.**

## Before you start

- `git fetch origin`. Check `origin/main` has the `equations-of-straight-lines`
  lesson (PR #10). If not, stop and say so. Create
  `codex/drawing-quadratic-graphs` from `origin/main`, in its own worktree.
- `codex/speed-from-distance-time-graphs` is not merged yet and is waiting
  for review. Don't touch that branch or its worktree, and don't base on it.
- The main checkout has uncommitted files about DfE subject content
  (listed in `AGENTS.md`). They aren't part of this work. Don't change,
  commit or delete them.
- Read the rules in the order `AGENTS.md` gives. Look at
  `content/equations-of-straight-lines/` (the newest lesson: Learn screens,
  choice buttons, mixed cards) and `content/finding-the-gradient/`
  (graph Learn screens, retained graph work) as worked examples.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, `graph.js`,
  `graph.css`, the template or any other lesson. Never call JSXGraph from
  the lesson. Don't patch shared output from the lesson.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Drawing quadratic graphs |
| Slug / folder | `drawing-quadratic-graphs` (new) |
| Subtitle | Complete a table of values, plot the points and draw a smooth curve. |
| Skill | `quadratic-graphs` (exists) |
| Goal shown to pupils | Draw a quadratic graph from a table of values. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`:
  - in `quadratic-graphs`, set `recommended_prerequisites` to
    `["coordinates-four-quadrants","substitute-expressions"]` (check
    both ids exist; if one doesn't, stop and ask).
  - add, straight after `quadratic-graphs`:
    `{"id":"quadratic-turning-points","title":"Find the turning point of a quadratic graph","content_references":["A11"],"recommended_prerequisites":["quadratic-graphs"]}`
  - in `quadratic-solutions-graphs`, leave everything as it is.
  Change nothing else.
- `content/curriculum.json`:
  - Straight before the `quadratic-cubic-reciprocal-graphs` entry, add the
    lesson and two placeholders, in this order:
    - `{"folder":"drawing-quadratic-graphs","title":"Drawing quadratic graphs","subtitle":"Complete a table of values, plot the points and draw a smooth curve.","skills":["quadratic-graphs"]}`
    - `{"folder":"quadratic-turning-points","title":"Finding the turning point","subtitle":"Read the turning point of a quadratic graph and say if it's a minimum or a maximum.","skills":["quadratic-turning-points"]}`
    - `{"folder":"roots-from-quadratic-graphs","title":"Finding roots from a graph","subtitle":"Use a quadratic graph to solve an equation.","skills":["quadratic-solutions-graphs"]}`
  - The `quadratic-cubic-reciprocal-graphs` entry becomes
    `{"folder":"quadratic-cubic-reciprocal-graphs","title":"Cubic and reciprocal graphs","subtitle":"Recognise and interpret cubic and reciprocal graphs.","skills":["cubic-reciprocal-graphs"]}`
    (`quadratic-graphs` now belongs to this lesson).
- `content/collections.json`: in `graphs`, add `drawing-quadratic-graphs`,
  `quadratic-turning-points`, `roots-from-quadratic-graphs` straight before
  `quadratic-cubic-reciprocal-graphs`.
- Don't create folders for the placeholders. If a test breaks on the new
  entries or on a skill now listed by only one entry, stop and ask.
- Map every Practice and Check question type to `quadratic-graphs` in
  `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "square", "table of values", "plot",
  "smooth curve", "U shape", "upside-down U". Don't say "parabola",
  "substitute", "function", "vertex", "turning point", "root" or
  "coefficient".
- Squaring is always explained as multiplying a number by itself:
  `(−2)² = (−2) × (−2) = 4`.
- A negative number put in for x always goes in brackets: `(−2)² − 1`.
- Write squares with the superscript character: `x²`, `(−2)²`. No KaTeX
  (don't load it). Equations are HTML in Learn (x and y in italics) and
  plain text in prompts, options, feedback and results.
- Minus is the Unicode minus `−`. Coordinates are `(x, y)` with a space
  after the comma. No-break spaces inside equations and coordinates so
  they never wrap.
- No exam-board names or codes anywhere.
- A small `quadratics.js`, loaded before `interactive.js` and
  `questions.js`, holds the lesson's helpers:
  - `quadraticText({ a, c })`: plain text for y = ax² + c, tidy:
    `y = x² − 1`, `y = 2x² − 4`, `y = x²`, `y = 3 − x²` (a = −1 is written
    number first), `y = x² + 1`.
  - `valueOf({ a, c }, x)`: a × x² + c.
  - `workingText({ a, c }, x)`: `(−2)² − 1 = 4 − 1 = 3`,
    `2 × (−2)² − 4 = 2 × 4 − 4 = 4`, `3 − (−2)² = 3 − 4 = −1`,
    `0² − 1 = 0 − 1 = −1`. Brackets only round negatives.
  - `valueRules`, `tableRules`, `plotMark`: below.
  - The practice generator.
- `lesson.css` only for the table of values and Learn layout. Existing
  tokens only: the highlighted column uses `--accent-light` background
  with `--accent-dark` text; muted text `--text-muted`. No graph CSS.

## The table of values

Lesson HTML, not a shared component: a real `<table>` with a row
header `x` and a row header `y`, five columns x = −2, −1, 0, 1, 2. Empty
cells show a dashed box. The highlighted column gets the highlight
tokens and `aria-current="true"`. It fits at 375 px with no sideways
scroll. Above a graph, the table and the graph are visible together
without scrolling at 375 × 812.

## The graph

The shared graph, loaded in `index.php` with the four tags from
`docs/shared-graph.md`, before the lesson's scripts. Every graph in the
lesson uses:

```js
{ x: [-4, 4], y: [-5, 6], step: { x: 1, y: 1 }, label: '…' }
```

Every graph has a `label` saying what it shows, for example "Coordinate
grid with the points of y = x² − 1." Plotted points use `size: 'large'`.
The curve is `graph.plot(x => valueOf(form, x), { domain: [-2.3, 2.3] })`,
a little beyond the outer points, clipped to the grid. Under
`prefers-reduced-motion`, everything that "appears in turn" appears at
once.

### Joining the points (Try it 4)

Three in-activity buttons in a `role="group"` labelled "How do you join
the points?", shared `button` styles with `is-selected` / `is-correct` /
`is-incorrect`:

- **A smooth curve**: draws `graph.plot` through the points.
- **Straight lines, dot to dot**: draws four `graph.segment`s between
  neighbouring points.
- **Flat across the bottom**: draws a curve through the outer four points
  that misses the middle one. For y = x² − 1 use
  `x => 0.25 * x ** 4 - 0.25 * x ** 2`; in general,
  `x => valueOf(form, 1) + (valueOf(form, 2) - valueOf(form, 1)) * (x ** 4 - x ** 2) / 12`.

Each press replaces the last drawing. A wrong choice is drawn with tone
`incorrect`, the button marked `is-incorrect`, with its feedback:

- Straight lines: "The graph doesn't have corners. Quadratic graphs curve
  smoothly between the points."
- Flat across the bottom: "Your curve misses (0, −1). The curve must go
  through every point, including the lowest one." (with the real point)

The right choice is drawn tone `correct` and the buttons are disabled.
Try it 4 shows "✓ The graph
goes through all five points and curves smoothly at the bottom." inside
that box, with no separate copy of the sentence. Save the right choice in
section state so reload and Back show the finished curve. Wrong presses aren't saved.

## Plotting points (Try it 3, Practice, Check)

One lesson-level helper in `interactive.js` / `questions.js` (shared
between them through `quadratics.js` if that's tidier) that uses
`graph.pick`:

- The prompt names the point: "Plot (−2, 3)." The table column for that
  point is highlighted.
- A tap snaps to the nearest grid corner (the picker does this).
- **Right:** a large point, tone `correct`, stays visible. While plotting,
  label only the point just tapped, with `labelSide: 'left'` for x < 0 and
  `'right'` for x ≥ 0. Hide the previous point's coordinate label on the
  next tap. Move on to the next point (the next column highlights).
- **Wrong:** a point tone `incorrect` with its coordinates (the only
  labelled point, on the same left/right rule), the right
  feedback from `plotMark`, and dashed guide segments (`dash: true`,
  tone `muted`) from the origin along the x-axis to the right x, then up
  or down to the right y. The wrong point and guides go on the next tap.
- `plotMark([x, y], target)` gives, in this order:
  - swapped (tapped (y, x), x ≠ y): "Go across first for x, then up or
    down for y."
  - x sign wrong (tapped (−x, y), x ≠ 0): "Check the x sign. Negative
    x is to the left of 0."
  - y sign wrong (tapped (x, −y), y ≠ 0): "Check the y sign. Negative
    y is below 0."
  - otherwise: "Start at (0, 0). Go across to x = −2, then up to y = 3."
    (with the real numbers and "up" / "down" / "stay on the x-axis").
- Save each plotted point in section state (Try it) or the
  widget's value (Practice, Check), so reload keeps them.
- Once all points are plotted, show them without coordinate labels on
  Try it 4. The filled table stays above
  the graph. Given points on Practice/Check plotting cards also have no
  coordinate labels. The newly tapped answer is labelled while answering
  or wrong, and has no coordinate label once checked correct. Use only
  existing graph options; no shared changes.

As a **custom answer widget** (Practice, Check) it follows
`docs/custom-answer-widget.md`: `render` makes the graph and any given
points, `isEmpty` is "no tap yet", the value is the last tapped `[x, y]`
(a new tap replaces it, so restart the picker after each tap until the
card is checked), `mark` uses `plotMark`, `answerText` is "You plotted
(−2, 3)." `update` in phase `wrong` / `correct` shows the point with that
tone, the guides on `wrong`, and stops picking. It never recreates the
board.

## Learn (6 screens)

Learn is for looking, as in `finding-the-gradient`. Every screen shows
the graph first (with the table where listed), then at most three short
lines of text. Learn has **no questions, no buttons and no gating**:
Next is always enabled, mid-animation too. "In turn" means about 500 ms
apart; under `prefers-reduced-motion`, and on every revisit (Back,
reload), the finished screen shows at once. Only the point a screen is
about has a coordinates label (left of it for x < 0, right otherwise).
Old seven-screen saves: a finished Learn stays finished; otherwise Learn
starts again at screen 1.

1. **This is a quadratic graph.** y = x² − 1 drawn with its five points,
   no labels. Text: "This is the graph of y = x² − 1." "It has x² in it,
   so it's a **quadratic**." "Quadratic graphs are smooth U-shaped curves."
2. **Each point comes from the equation.** The other points muted;
   (2, 3) large and labelled. The working appears in turn: "x = 2",
   "2² = 2 × 2 = 4", "4 − 1 = 3", "So the point is (2, 3)." Text: "Take
   x, square it, then subtract 1. That gives y."
3. **Negative x.** As screen 2 for (−2, 3): "(−2)² = (−2) × (−2) = 4".
   Text: "A negative times a negative is positive." "So (−2, 3) is level
   with (2, 3). The curve is the same on both sides."
4. **A table keeps it tidy.** Empty table above an empty grid. The cells
   fill in turn, each column highlighting as its point appears. Text:
   "Work out y for each x in the table." "Each column is one point (x, y)."
5. **Join with a smooth curve.** The five points. Dashed straight lines
   dot to dot appear with "✗ Not straight lines from dot to dot.", stay
   for about 1.8 s, then give way to the smooth curve (tone `correct`)
   with "✓ One smooth curve through every point, a little past the ends."
   Text: "Quadratic graphs have no corners."
6. **Upside down.** y = 3 − x²: table cells and points in turn, then the
   curve. Text: "When x² is taken away, the curve is an upside-down U."
   "Same method: table, points, smooth curve."

The hands-on table, plotting and joining are in Try it.

## Try it (4 screens)

Not scored (`scored: false`), as in `equations-of-straight-lines`. One
card at a time; the next appears after Continue. Typed cards use
`fractions: true` (for the minus key). Choice options are shuffled once
and saved. Everything is for `y = x² − 2`, with the table above, filling
in as the pupil goes.

1. **First column.** Number card: "What is y when x = −2? Square −2, then
   subtract 2." Answer 2, `valueRules`. Correct: "Right. (−2)² − 2 = 4 − 2
   = 2."

2. **The rest of the table.** Four-field card, fields `x = −1`, `x = 0`,
   `x = 1`, `x = 2`, answer −1, −2, −1, 2, `tableRules`. Correct: "Right.
   The table is symmetrical: the same y for x = 1 and x = −1."

3. **Plot.** The plotting helper for the five points, guides only after a
   wrong tap. A Learn-style activity (not a card); Continue after all five.

4. **Join them.** The filled table above the five unlabelled points and
   the "joining the points" buttons. The correct choice shows "✓ The graph
   goes through all five points and curves smoothly at the bottom." in the
   green feedback box, without repeating it below.

## Feedback rules

### `valueRules({ a, c }, x)`

For number cards "What is y when x = −2?". Answer `valueOf(form, x)`.
Rules in this order; skip any whose value equals the answer or an earlier
rule's value:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| `a × (−x²) + c` | x < 0 | "A negative times a negative is positive: (−2)² = 4." |
| `a × 2x + c` | always | "Squaring isn't doubling. (−2)² = (−2) × (−2) = 4." |
| `(a × x)² + c` | a = 2 | "Square first, then multiply by 2: 2 × (−2)² = 2 × 4 = 8." |
| `a × x² − c` | c ≠ 0 | "Check the sign of the number: y = x² − 2, so subtract 2." |
| `a × x²` | c ≠ 0 | "Don't forget the − 2." |
| `x² + c` | a = −1 | "x² is taken away: 3 − 4 = −1." |

Fallback: the full `workingText`.

### `tableRules(form, xs)`

For several-field table cards. Rules may name some fields:

- every negative-x field equal to `a × (−x²) + c`: "A negative times a
  negative is positive. The y for x = −2 is the same as for x = 2."
- every field equal to `a × 2x + c`: "Squaring isn't doubling. x² means
  x × x."
- the x = 0 field wrong and every other field right: "When x = 0, x² = 0,
  so y is just the number: −2."
- every field right but one: "One box is wrong. Work out that one again:"
  plus the `workingText` for that x.

Fallback: "Square x first, then the rest. Work each column out on its
own."

## Practice

Endless generator through `runQuestionSet`, as the template does,
`session_length` 6: three typed or plotting cards and three choice cards,
alternating (typed first), option order shuffled by the seeded helpers.
No highlighting or hints before the answer.

Forms: `{ a, c }` with a = 1 (c from −4 to 1), a = −1 (c from 1 to 4,
written number first: `y = 3 − x²`) or a = 2 (c from −5 to −3). Every
table value stays within −5 to 6 so it fits the grid. Half the sessions
include an a = −1 or a = 2 form, by the seed.

### Typed and plotting

All three of these per session, in a seeded order:

| Type | Card | Answer |
|---|---|---|
| `value` | Number card: "For y = x² − 3, what is y when x = −2?" x from −3 to 3, not 0 (any value, no grid) | `valueRules` |
| `table` | The table above a five-field card (fields `x = −2` … `x = 2`): "Complete the table for y = 2x² − 4." | `tableRules` |
| `plot` | The filled table and the grid with the other four points already plotted: "Plot the point for x = −1." | the plotting widget, `plotMark` |

For a = 2, the `value` and `table` prompts add "Square x first, then
multiply by 2." For a = −1, "Square x first, then take it away from 3."

### Choice

All three per session. Every wrong option is a real mistake; drop any
that comes out the same as another option or the answer.

**`point-on`**: "Which point is on the graph of y = x² + 1?" x = −2 or −1,
by seed.

| Option | Feedback |
|---|---|
| **(−2, 5)** | "Right. (−2)² + 1 = 4 + 1 = 5." |
| (−2, −3) (negative square) | "A negative times a negative is positive: (−2)² = 4, so y = 5." |
| (−2, 4) (forgot c) | "You squared −2, but forgot the + 1." |
| (5, −2) (swapped) | "x comes first. When x = −2, y = 5: the point is (−2, 5)." |

**`shape`**: "What shape is the graph of y = 3 − x²?" (any form by seed)

| Option | Feedback |
|---|---|
| **An upside-down U** (or **A U shape** when a > 0) | "Right. x² is taken away, so the curve opens downwards." (or "x² is added, so it opens upwards.") |
| A U shape (when a < 0) | "x² is taken away here, so the curve is upside down." |
| An upside-down U (when a > 0) | "x² is added here, so the curve is a U, the right way up." |
| A straight line | "It has x² in it, so it's a curve, not a straight line." |

**`join`**: "Ali plots every point of y = x² − 1 correctly. How should
he join them?"

| Option | Feedback |
|---|---|
| **One smooth curve through every point** | "Right." |
| Straight lines from dot to dot | "Quadratic graphs curve smoothly. They don't have corners." |
| A curve through the outer points only | "The curve must go through every point, the lowest one too." |
| A ruler line from the first point to the last | "That's for straight-line graphs. This one is a curve." |

## Check

Five fixed questions in `questions.js` (two typed, one plotting, two
choice), through the shared card as the
template does, choice options shuffled once and saved. No hints before
the answer.

1. **Complete the table** (five-field). "Complete the table for
   y = x² − 3." Answer 1, −2, −3, −2, 1, `tableRules`.
2. **Plot a point** (plotting widget). The filled table for y = x² − 3,
   the grid with (−2, 1), (−1, −2), (0, −3), (1, −2) plotted: "Plot the
   point for x = 2." Answer (2, 1), `plotMark`.
3. **Sam's mistake** (choice). "For y = x² − 1, Sam writes: when x = −2,
   y = −4 − 1 = −5. What has he done wrong?"
   - **(−2)² is 4, not −4. So y = 4 − 1 = 3.**: "Right. (−2) × (−2) = 4."
   - Nothing. y = −5 is right.: "(−2)² = (−2) × (−2) = 4. A negative times
     a negative is positive."
   - He should add 1, so y = −3.: "The − 1 is right. The mistake is
     (−2)²: it's 4, so y = 3."
4. **Joining the points** (choice). "A pupil plots all the points of a
   quadratic graph correctly, then joins them with straight lines. What
   should they change?" The `join` options and feedback, with "Ali"
   replaced by "they".
5. **Square first** (number card). "For y = 2x² − 4, what is y when
   x = −3?" Answer 14, `valueRules`. Correct: "Right. 2 × (−3)² − 4 =
   2 × 9 − 4 = 14."

Summary after the results (the template's summary block), three points:
- "Complete a table of values. Square x first."
- "Plot each column as a point (x, y)."
- "Join the points with one smooth curve."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `origin/main` (first build round).
- Unit tests for `quadratics.js`: `quadraticText` and `workingText` for
  every example above (brackets only round negatives, Unicode minus, no
  `+ −`); every `valueRules` row (including skipped and duplicate rows);
  `tableRules` for each named rule; `plotMark` for each case including
  x = 0 and y = 0; the generator gives all three typed types and all
  three choice types, alternating, every table value within −5 to 6, no
  duplicate options, the same session for the same seed.
- Add `tests/ui/drawing-quadratic-graphs.spec.cjs`: a full correct run
  through all four sections; every Learn screen with Next enabled at once
  and its finished picture; reduced motion; Try it 3 with each wrong tap
  (guides appear, then go); Try it 4 with each wrong join first; a
  wrong-then-right Practice plotting card; reload mid-Try it 3 after two
  points; old seven-screen Learn saves.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and touch emulation), with real
  clicks and taps:
  - a full run ending on All lessons and the homepage, on the PHP site
    and the built `dist/` site
  - the table and graph are both visible without scrolling at 375 × 812
    on Try it 3 and the Practice / Check plotting cards
  - the five-field card fits at 375 px with no sideways scroll, and the
    phone keyboard offers a minus. **If five boxes don't fit, stop and
    ask** (don't shrink the shared boxes from the lesson)
  - plotting by tap, mouse and keyboard (arrows + Enter); every
    `plotMark` case shows its feedback once; point labels don't overlap
    each other or the axes at 375 px
  - each join option draws the right picture; the flat-bottom curve
    visibly misses the middle point
  - every rule row and wrong option shows its own feedback, once
  - reload in every section and phase; Back from every screen and Next
    forward again
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage lists the lesson after Finding the equation of a line, in
  the Graphs collection too; the placeholders don't show; the old entry
  now reads "Cubic and reciprocal graphs" (hidden, no folder).
- `./build.sh`, then commit `dist/`.

## Commits

1. The lesson (with `skills.json`, `curriculum.json`, `collections.json`,
   the tests and `dist/`). Commit this file with it.

## Report

Through the relay (`relay/send.sh codex reply <id>`):

- The commit hash, both test results compared with `origin/main`, every
  check above, and the planned maximum score.
- **Template findings:** every place you had to go beyond the template,
  the shared components or the shared graph. Say "none" if there were none.
- Anything you couldn't do and why. Then wait for the review.
