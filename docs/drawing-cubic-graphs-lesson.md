# Drawing cubic graphs: lesson spec

The first of three lessons from the revision-guide page "Cubic and
reciprocal graphs":

| # | Lesson | Slug | Skill |
|---|---|---|---|
| 1 | Drawing cubic graphs | `drawing-cubic-graphs` | `cubic-graphs` (new) |
| 2 | Drawing reciprocal graphs | `drawing-reciprocal-graphs` | `reciprocal-graphs` (new) |
| 3 | Recognising graph types | `recognising-graph-types` | `cubic-reciprocal-graphs` (exists, retitled) |

This spec builds lesson 1 and adds lessons 2 and 3 as placeholders.
Lessons 2 and 3 get their own specs (`docs/drawing-reciprocal-graphs-lesson.md`,
`docs/recognising-graph-types-lesson.md`). This lesson doesn't mention
reciprocal graphs.

Lesson 1 teaches one skill, `cubic-graphs`: draw a simple cubic graph by
completing a table of values, plotting the points and joining them with
one smooth curve. It's the cubic twin of `drawing-quadratic-graphs`, which
is the worked example: **copy its Learn pattern, side-by-side layout, live
table widget, plotting helper, joining buttons and helper style.** Where
this spec doesn't say otherwise, do what that lesson does.

There are two parts on one branch, in two commits:

- **Part A**: one shared graph addition, `subdivide` (finer snapping
  between grid lines). Cubic values like 9 and −7 need a y-axis
  numbered in 2s that still lets pupils plot odd numbers. Lesson 2 needs
  halves, and the quadratic roots lesson will need fifths.
- **Part B**: the lesson.

**If the lesson needs anything else shared that isn't there, stop and ask.**

## Before you start

- `git fetch origin`. Check `origin/main` has `drawing-quadratic-graphs`
  with the live table (PR #15) and number-card `tolerance` (PR #17). If
  not, stop and say so. Create `codex/drawing-cubic-graphs` from
  `origin/main`, in its own worktree.
- Don't touch the main checkout's uncommitted DfE files (listed in
  `AGENTS.md`) or any other branch.
- Read the rules in the order `AGENTS.md` gives, then
  `content/drawing-quadratic-graphs/` from end to end.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, the template
  or any other lesson, except Part A's version bumps. Never call JSXGraph
  from the lesson. Don't patch shared output.
- Leave this file unchanged.

## Part A: `subdivide` in the shared graph

Its own commit: "Let graphs snap between grid lines".

```js
Maths1to9Graph.create(host, {
    x: [-3, 3], y: [-10, 10],
    step: { x: 1, y: 2 },
    subdivide: { x: 1, y: 2 },   // new; default { x: 1, y: 1 }
    label: '…'
});
```

- `subdivide` is a whole number ≥ 1 per axis (missing axis = 1). Anything
  else throws, like a bad `step`.
- It draws faint minor grid lines between the grid lines (step ÷
  subdivide apart), lighter than the normal grid. Use an existing token
  (or the existing grid colour with lower opacity); no new colour values.
  No extra axis numbers: labels stay on the main grid lines.
- Snapping uses step ÷ subdivide: `graph.pick`, dragging (`drag: 'x'`,
  `'y'`, `'free'`), the drawing tool, and arrow keys (one arrow press = one
  minor step). `snap(point, step)` gets an optional third argument,
  `subdivide`, with the same meaning; existing two-argument calls are
  unchanged.
- Snapped values are rounded to clear float noise (0.1 + 0.2 must come
  out as 0.3, and 0.5 steps as exact halves).
- Coordinates labels and the live region show decimals tidily with
  `formatNumber` (0.5, −0.25; never 0.30000000000000004).
- With no `subdivide`, everything is exactly as now.
- Update `docs/shared-graph.md` with a short "Subdividing the grid"
  section. Unit tests for `snap` with `subdivide` (including halves,
  fifths and float noise) and a browser test that picks an odd y on a
  step-2 axis by tap and by keyboard.
- Bump `graph.js` (and `graph.css` if changed) `?v=` in every lesson that
  loads them, and only those.
- Run the full `npm run test:ui` on this commit and on `origin/main`
  (shared file round).

## Part B: the lesson

| | |
|---|---|
| Title | Drawing cubic graphs |
| Slug / folder | `drawing-cubic-graphs` (new) |
| Subtitle | Complete a table of values, plot the points and draw a smooth S-shaped curve. |
| Skill | `cubic-graphs` (new) |
| Goal shown to pupils | Draw a cubic graph from a table of values. |
| Sections | Learn, Try it, Practice, Check |
| Back button | On |

### Registering it

- `content/skills.json`:
  - add, straight after `quadratic-turning-points`:
    `{"id":"cubic-graphs","title":"Draw a simple cubic graph from a table of values","content_references":["A12"],"recommended_prerequisites":["quadratic-graphs"]}`
    `{"id":"reciprocal-graphs","title":"Draw the graph of y = 1/x","content_references":["A12"],"recommended_prerequisites":["cubic-graphs"]}`
  - `cubic-reciprocal-graphs` becomes
    `{"id":"cubic-reciprocal-graphs","title":"Recognise straight-line, quadratic, cubic and reciprocal graphs","content_references":["A12"],"recommended_prerequisites":["quadratic-graphs","cubic-graphs","reciprocal-graphs"]}`
    (keep its place in the file).
  Change nothing else.
- `content/curriculum.json`: replace the `quadratic-cubic-reciprocal-graphs`
  placeholder with these three, in this order:
  - `{"folder":"drawing-cubic-graphs","title":"Drawing cubic graphs","subtitle":"Complete a table of values, plot the points and draw a smooth S-shaped curve.","skills":["cubic-graphs"]}`
  - `{"folder":"drawing-reciprocal-graphs","title":"Drawing reciprocal graphs","subtitle":"Draw the two separate curves of y = 1/x.","skills":["reciprocal-graphs"]}`
  - `{"folder":"recognising-graph-types","title":"Recognising graph types","subtitle":"Use a graph's shape to match it to its equation.","skills":["cubic-reciprocal-graphs"]}`
- `content/collections.json`: in `graphs`, replace
  `quadratic-cubic-reciprocal-graphs` with the same three slugs, in that
  order.
- Don't create folders for the two placeholders. If a test breaks on the
  new entries, stop and ask.
- Map every Practice and Check question type to `cubic-graphs` in
  `lesson.json`.

### Wording and maths

- Plain English for GCSE Foundation pupils. Say "cube", "cubed",
  "table of values", "plot", "smooth curve", "S shape". Say what "cube"
  means the first time: multiply a number by itself, then by itself
  again. Don't say "cubic function", "polynomial", "substitute",
  "inflection", "coefficient", "parabola" or "reciprocal".
- Cubing is always written out: `(−2)³ = (−2) × (−2) × (−2) = 4 × (−2) = −8`.
- A negative number put in for x always goes in brackets: `(−2)³ + 1`.
- Cubes with the superscript character: `x³`, `(−2)³`. No KaTeX. Equations
  are HTML in Learn (x and y in italics) and plain text in prompts,
  options, feedback and results.
- Unicode minus `−`. Coordinates `(x, y)` with a space after the comma.
  No-break spaces inside equations and coordinates.
- No exam-board names or codes.
- A small `cubics.js`, loaded before `interactive.js` and `questions.js`,
  the twin of `quadratics.js`:
  - `cubicText({ a, c })` for y = ax³ + c: `y = x³`, `y = x³ + 1`,
    `y = x³ − 2`, `y = 2x³ − 1`.
  - `valueOf({ a, c }, x)`: a × x³ + c.
  - `workingText({ a, c }, x)`: `(−2)³ + 1 = −8 + 1 = −7`,
    `2³ − 1 = 8 − 1 = 7`, `2 × (−2)³ − 1 = 2 × (−8) − 1 = −17`,
    `0³ + 2 = 0 + 2 = 2`. Brackets only round negatives.
  - `valueRules`, `tableRules`, `plotMark` (below), the joining drawings
    and the generator.
- `lesson.css` only for the table and Learn layout, copied from
  `drawing-quadratic-graphs` (classes renamed). Existing tokens only.

### The graph

The shared graph, loaded as in `drawing-quadratic-graphs`. Every graph:

```js
{ x: [-3, 3], y: [-10, 10], step: { x: 1, y: 2 }, subdivide: { x: 1, y: 2 }, label: '…' }
```

So the y-axis is numbered −10, −8, … 10, with faint lines at the odd
numbers, and taps snap to whole numbers on both axes.

- Every graph has a `label` saying what it shows ("Coordinate grid with
  the points of y = x³ + 1.").
- Points use `size: 'large'`. The curve is
  `graph.plot(x => valueOf(form, x), { domain: [-2.3, 2.3] })`, clipped by
  the grid.
- Point-label rules as `drawing-quadratic-graphs`: only the point a
  screen is about, or the point just tapped, has a coordinates label;
  left of it for x < 0, right otherwise; never on top of the curve, other
  points or axis numbers at 375 px.
- **Phone fit.** The board is taller than the quadratic one. At
  375 × 812, every plotting screen and card must show the whole graph and
  the prompt naming the point together. The table may scroll off on
  plotting cards (the prompt names the point). If the graph alone doesn't
  fit at 375 × 812, stop and ask; don't shrink shared styles.

### Learn (6 screens)

Learn is for looking, exactly as in `drawing-quadratic-graphs`: graph
first (left on wide screens), at most three short lines of text. **No
questions, no buttons, no gating: Next is always enabled,** mid-animation
too. "In turn" means about 500 ms apart; under `prefers-reduced-motion`
and on every revisit the finished screen shows at once.

1. **This is a cubic graph.** y = x³ drawn with its five points
   (−2, −8), (−1, −1), (0, 0), (1, 1), (2, 8), no labels. Text: "This is
   the graph of y = x³." / "x³ means x × x × x. We say x **cubed**." /
   "A cubic graph is a smooth curve with a stretched **S shape**."
2. **Each point comes from the equation.** Other points muted; (2, 8)
   large and labelled. Working in turn: "x = 2", "2³ = 2 × 2 × 2 = 8",
   "So the point is (2, 8)." Text: "To cube a number, multiply it by
   itself, then by itself again."
3. **A negative cubed stays negative.** As screen 2 for (−2, −8):
   "(−2)³ = (−2) × (−2) × (−2)", "= 4 × (−2) = −8". Text: "The first two
   negatives make 4. Times −2 makes −8." / "So (−2, −8) is at the bottom
   left. That's why the curve starts low."
4. **A table keeps it tidy.** Empty table (x = −2 … 2) above an empty
   grid; cells fill in turn, each column highlighting as its point
   appears. Text: "Cube each x in the table." / "Each column is one point
   (x, y)."
5. **Join with a smooth curve.** The five points. Dashed straight lines
   dot to dot appear with "✗ Not straight lines from dot to dot.", stay
   about 1.8 s, then give way to the smooth curve (tone `correct`) with
   "✓ One smooth curve through every point." Text: "It rises from bottom
   left to top right." / "It flattens out as it passes (0, 0)."
6. **Add a number after cubing.** y = x³ muted; y = x³ + 1 drawn over it:
   points in turn, then the curve. Working for one point: "x = 2",
   "2³ + 1 = 8 + 1 = 9". Text: "y = x³ + 1: cube x **first**, then add 1."
   / "Every point moves up 1. It crosses the y-axis at (0, 1), not
   (0, 0)."

### Try it (5 screens)

Not scored (`scored: false`), as in `drawing-quadratic-graphs`. One task
at a time. Typed cards use `fractions: true` (for the minus key). Choice
options shuffled once and saved. Everything is for **y = x³ + 1**, with
the table filling in as the pupil goes.

1. **First column.** Number card: "What is y when x = −2? Cube −2, then
   add 1." Answer −7, `valueRules`. Correct: "Right. (−2)³ + 1 = −8 + 1 =
   −7."
2. **The rest of the table.** The live table widget for x = −1, 0, 1, 2:
   answer 0, 1, 2, 9, `tableRules`. Correct: "Right. When x = 0, y = 1:
   the curve crosses the y-axis at (0, 1)."
3. **Plot.** The plotting helper for the five points (−2, −7), (−1, 0),
   (0, 1), (1, 2), (2, 9), guides only after a wrong tap. Continue after
   all five.
4. **Join them.** The five unlabelled points and four joining buttons
   (below).
5. **Where does it cross?** Choice card: "Where does the graph of
   y = x³ + 1 cross the y-axis?"
   - **(0, 1)**: "Right. When x = 0, y = 0³ + 1 = 1."
   - (0, 0): "A cubic graph doesn't have to go through (0, 0). When
     x = 0, y = 0 + 1 = 1."
   - (1, 0): "x comes first. On the y-axis x = 0, so the point is (0, 1)."
   - (−1, 0): "That's where it crosses the x-axis. On the y-axis, x = 0:
     the point is (0, 1)."

### Joining the points (Try it 4)

As `drawing-quadratic-graphs`, but four buttons in a `role="group"`
labelled "How do you join the points?", shared button styles with
`is-selected` / `is-correct` / `is-incorrect`, order shuffled once and
saved:

- **A smooth S-shaped curve**: `graph.plot` through the points.
- **Straight lines, dot to dot**: four `graph.segment`s. "The graph
  doesn't have corners. Cubic graphs curve smoothly between the points."
- **One ruler line from first to last**: one segment (−2, −7) to (2, 9).
  "A ruler line misses (−1, 0), (0, 1) and (1, 2). The curve must go
  through every point."
- **A U-shaped curve**: `x => valueOf(form, 0) + 2 * x ** 2` (it misses
  the left points). "That's the shape of a quadratic graph. These points
  go from bottom left to top right, so the curve can't turn back up."

Each press replaces the last drawing. Wrong: drawn tone `incorrect`,
button `is-incorrect`, its feedback. Right: tone `correct`, buttons
disabled, "✓ The curve goes through all five points and bends smoothly
in the middle." in the feedback box, once. Save the right choice; wrong
presses aren't saved.

### Plotting points

Exactly the `drawing-quadratic-graphs` helper and `plotMark` (swapped,
x sign, y sign, then "Start at (0, 0). Go across to x = −2, then down to
y = −7."), now snapping through `subdivide`. Add one rule after the y
sign rule, for the odd-number trap on a 2-step axis:

- tapped (x, y ± 1), y odd: "Count carefully: the y-axis goes up in 2s.
  y = −7 is on the faint line between −8 and −6."

### Feedback rules

#### `valueRules({ a, c }, x)`

Number cards "What is y when x = −2?". Answer `valueOf(form, x)`. Rules
in this order; skip any whose value equals the answer or an earlier
rule's value:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| `a × (−x³) + c` | x < 0 | "A negative cubed stays negative: (−2)³ = −8." |
| `a × 3x + c` | always | "Cubing isn't multiplying by 3. (−2)³ = (−2) × (−2) × (−2) = −8." |
| `a × x² + c` | always | "That's squaring. Cubing is three lots: (−2) × (−2) × (−2) = −8." |
| `(a × x)³ + c` | a = 2 | "Cube first, then multiply by 2: 2 × (−2)³ = 2 × (−8) = −16." |
| `(x + c)³` | c ≠ 0, a = 1 | "Cube first, then add 1. Don't add 1 before cubing." |
| `a × x³ − c` | c ≠ 0 | "Check the sign of the number: y = x³ + 1, so add 1." |
| `a × x³` | c ≠ 0 | "Don't forget the + 1." |

Fallback: the full `workingText`.

#### `tableRules(form, xs)`

- every negative-x field equal to `a × (−x³) + c`: "A negative cubed
  stays negative. The y for x = −2 is not the same as for x = 2."
- every field equal to `a × x² + c`: "That's squaring. Cube means
  x × x × x."
- the x = 0 field wrong and every other field right: "When x = 0,
  x³ = 0, so y is just the number: 1."
- every field right but one: "One box is wrong. Work out that one again:"
  plus the `workingText` for that x.

Fallback: "Cube x first, then the rest. Work each column out on its own."

### Practice

Endless generator through `runQuestionSet`, `session_length` 6: three
typed or plotting cards and three choice cards, alternating (typed
first), options shuffled by the seeded helpers. No hints before the
answer.

Forms `{ a, c }`: graphs and tables use a = 1, c from −2 to 2 (every
table value within −10 to 10). `value` cards may also use a = 2, c from
−3 to 3 (no graph). At least one form per session has c ≠ 0.

#### Typed and plotting (all three, seeded order)

| Type | Card | Answer |
|---|---|---|
| `value` | "For y = x³ − 2, what is y when x = −3?" x from −3 to 3, not 0 or 1. For a = 2, add "Cube x first, then multiply by 2." | `valueRules` |
| `table` | The live table: "Complete the table for y = x³ − 1." | `tableRules` |
| `plot` | The filled table, the grid with four points plotted: "Plot the point for x = −1." | the plotting widget, `plotMark` |

#### Choice (three of these four per session, by seed)

Four options each. Drop and replace nothing: the forms are chosen so no
two options match (if a pair can clash, rule that form out).

**`cube`**: "What is (−3)³?" (x = −3, −2 or 2, by seed; not 3, where
3x and x² would both be 9)

| Option | Feedback |
|---|---|
| **−27** | "Right. (−3) × (−3) × (−3) = 9 × (−3) = −27." |
| 27 | "A negative cubed stays negative: 9 × (−3) = −27." |
| −9 | "Cubing isn't multiplying by 3. It's (−3) × (−3) × (−3)." |
| 9 | "That's squaring. Cube means three lots: 9 × (−3) = −27." |

(For positive x: x³ right; −x³ "A positive cubed is positive."; 3x; x².)

**`point-on`**: "Which point is on the graph of y = x³ + 2?" x = −2 or −1.

| Option | Feedback |
|---|---|
| **(−2, −6)** | "Right. (−2)³ + 2 = −8 + 2 = −6." |
| (−2, 10) (negative cube made positive) | "A negative cubed stays negative: (−2)³ = −8, so y = −6." |
| (−2, −8) (forgot c) | "You cubed −2, but forgot the + 2." |
| (−6, −2) (swapped) | "x comes first. When x = −2, y = −6: the point is (−2, −6)." |

**`shape`**: "What shape is the graph of y = x³ − 2?"

| Option | Feedback |
|---|---|
| **A stretched S shape** | "Right. It has x³, so it's a cubic graph." |
| A U shape | "A U shape is a quadratic graph, with x². This has x³." |
| A straight line | "It has x³, so it's a curve, not a straight line." |
| An upside-down U | "The curve doesn't come back down. As x gets bigger, x³ keeps getting bigger." |

**`crosses`**: "Where does the graph of y = x³ − 2 cross the y-axis?"
(c ≠ 0)

| Option | Feedback |
|---|---|
| **(0, −2)** | "Right. When x = 0, y = 0³ − 2 = −2." |
| (0, 0) | "A cubic graph doesn't have to go through (0, 0). When x = 0, y = −2." |
| (−2, 0) | "x comes first. On the y-axis x = 0, so the point is (0, −2)." |
| (0, 2) | "Check the sign: y = x³ − 2, so y = −2." |

### Check

Six fixed questions (three typed or plotting, three choice), through the
shared card, options shuffled once and saved. No hints before the answer.

1. **Complete the table** (live table). "Complete the table for
   y = x³ + 2." Answer −6, 1, 2, 3, 10, `tableRules`.
2. **Plot a point** (plotting widget). The filled table and the grid
   with (−1, 1), (0, 2), (1, 3), (2, 10) plotted: "Plot the point for
   x = −2." Answer (−2, −6), `plotMark`.
3. **Aisha's claim** (choice). "Aisha says the graph of y = x³ + 2 goes
   through (0, 0), because it's a cubic graph. What's wrong?"
   - **When x = 0, y = 2. It goes through (0, 2).**: "Right. Adding 2
     moves every point up 2."
   - Nothing. Every cubic graph goes through (0, 0).: "Only y = x³ does.
     When x = 0, y = 0³ + 2 = 2."
   - It goes through (2, 0).: "x comes first. On the y-axis x = 0, so it's
     (0, 2)."
   - It goes through (0, −2).: "Check the sign: + 2, so y = 2."
4. **Ben's point** (choice). "Ben says (−2, 10) is on the graph of
   y = x³ + 2. What has he done wrong?"
   - **(−2)³ is −8, not 8. So y = −8 + 2 = −6.**: "Right. A negative
     cubed stays negative."
   - Nothing. (−2, 10) is right.: "(−2)³ = (−2) × (−2) × (−2) = −8. So
     y = −6."
   - He should take away 2. The point is (−2, 6).: "The + 2 is right. The
     mistake is (−2)³: it's −8, so y = −6."
   - (−2)³ is −6, so the point is (−2, −4).: "Cubing isn't multiplying by
     3. (−2)³ = −8, so y = −6."
5. **Cube first** (number card). "For y = 2x³ − 1, what is y when
   x = −2?" Answer −17, `valueRules`. Correct: "Right. 2 × (−2)³ − 1 =
   2 × (−8) − 1 = −17."
6. **Joining the points** (choice). "A pupil plots every point of
   y = x³ correctly, then joins them with straight lines. What should
   they change?"
   - **Draw one smooth curve through every point.**: "Right."
   - Use a ruler line from the first point to the last.: "That's for
     straight-line graphs. This one is a curve."
   - Draw a U shape through the points.: "A U shape is a quadratic
     graph. A cubic graph is an S shape."
   - Nothing. Straight lines are fine.: "Cubic graphs curve smoothly.
     They don't have corners."

Summary after the results, three points:
- "x³ means x × x × x. A negative cubed stays negative."
- "Complete a table, then plot each column as a point (x, y)."
- "Join the points with one smooth S-shaped curve."

Then **All lessons** as the main button.

### Points

The engine plans the maximum. Report it; don't hard-code it.

## Checks

- Part A: `npm test` and the full `npm run test:ui` on the Part A commit
  and on `origin/main`, compared, run one after the other (never two
  suites at once). Every existing graph lesson still works.
- Part B: `npm test` and the full `npm run test:ui` again on the lesson
  commit.
- Unit tests for `cubics.js`: `cubicText` and `workingText` for every
  example above; every `valueRules` row (with skipped and duplicate
  rows); each `tableRules` rule; every `plotMark` case including the
  odd-number trap, x = 0 and y = 0; the generator gives all three typed
  types, three different choice types, alternating, values within −10
  to 10 on graphs, no two equal options, the same session for the same
  seed.
- `tests/ui/drawing-cubic-graphs.spec.cjs`: a full correct run; every
  Learn screen has no buttons, Next enabled at once and its finished
  picture (375 px screenshots to `/tmp/cubic-learn-1.png` … `-6.png`);
  reduced motion; Try it 3 with each wrong tap (guides appear, then go)
  and an odd y by keyboard; Try it 4 with each wrong join first; a
  wrong-then-right Practice plotting card; reload mid-Try it 3 after two
  points; reload in every section.
- `node --check` on every JS file; `lesson.json` valid JSON.
- In the browser, at 1280 × 800 and 375 × 812 with touch, real clicks:
  - a full run to All lessons and the homepage, on the PHP site and
    `dist/`
  - wide screens: graph left, text right; phones: stacked; no sideways
    scroll
  - the faint odd-number lines are visible but lighter than the grid
  - taps on odd y values land where the pupil tapped (9, −7, 1)
  - the four joining drawings each look like their name; the U clearly
    misses the left points
  - point labels never touch each other, the curve or the axis numbers
  - every rule row and wrong option shows its own feedback once
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage shows the lesson after Finding the turning point, and in
  the Graphs collection; the two placeholders don't show.
- `BASE_URL=http://localhost/maths1to9/.worktrees/<your worktree>/ ./build.sh`
  from the worktree, then commit `dist/`.

## Commits

1. Part A: `graph.js` (and `graph.css`), its tests, `docs/shared-graph.md`,
   the version bumps, `dist/`.
2. Part B: the lesson, `skills.json`, `curriculum.json`,
   `collections.json`, its tests, `dist/`, and this file.

## Report

Through the relay: both commit hashes, test results compared with
`origin/main`, every check above, the screenshot paths, the planned
maximum, template findings, and anything you couldn't do. Then wait.
