# Recognising graph types: lesson spec

The third of three lessons from "Cubic and reciprocal graphs" (see
`docs/drawing-cubic-graphs-lesson.md` for the series). Teaches one skill,
`cubic-reciprocal-graphs`: use the shape of a graph to tell whether it's
a straight line, a quadratic, a cubic or a reciprocal graph, and match it
to its equation.

Pupils have drawn all four kinds in earlier lessons. This lesson draws
nothing by hand: pupils look and match. `drawing-reciprocal-graphs` is
the worked example for Learn layout, helpers and style.

The one new thing is a **graph choice** card: four small graphs as the
four options. It's a lesson-level custom answer widget
(`docs/custom-answer-widget.md`), built from the shared graph. No shared
changes. **If the shared graph can't make a small, non-focusable graph
inside an option, or anything else shared is missing, stop and ask.**

## Before you start

- `git fetch origin`. Check `origin/main` has `drawing-cubic-graphs` and
  `drawing-reciprocal-graphs`. If not, stop and say so. Create
  `codex/recognising-graph-types` from `origin/main`, in its own worktree.
- Don't touch the main checkout's uncommitted DfE files or any other
  branch.
- Read the rules in the order `AGENTS.md` gives, then
  `content/drawing-reciprocal-graphs/` from end to end.
- Don't change shared files, the template or any other lesson. Never
  call JSXGraph from the lesson. Don't patch shared output.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Recognising graph types |
| Slug / folder | `recognising-graph-types` (the placeholder already in `curriculum.json`) |
| Subtitle | Use a graph's shape to match it to its equation. (as the placeholder) |
| Skill | `cubic-reciprocal-graphs` (exists) |
| Goal shown to pupils | Use a graph's shape to match it to its equation. |
| Sections | Learn, Try it, Practice, Check |
| Back button | On |

- `skills.json`, `curriculum.json` and `collections.json` already have
  this lesson. Change nothing in them.
- Map every Practice and Check question type to `cubic-reciprocal-graphs`
  in `lesson.json`.
- The earlier lessons' browser tests check that this lesson is hidden on
  the homepage (`drawing-cubic-graphs.spec.cjs`,
  `drawing-reciprocal-graphs.spec.cjs`). Change only those assertions so
  they check "Recognising graph types" is now shown, straight after
  "Drawing reciprocal graphs". Keep every other step, and say so in the
  report.

## Wording and maths

- Plain English. The four names: "straight line", "quadratic", "cubic",
  "reciprocal". Shapes: "straight line", "U shape", "upside-down U",
  "stretched S shape", "two separate curves".
- **Power**: say what it means the first time (Learn 2): "The **power**
  is the small raised number. x² has power 2. x³ has power 3. Plain x has
  power 1." Then use "highest power" freely. Don't say "degree",
  "polynomial", "exponent", "index", "asymptote" or "hyperbola".
- The forms this lesson uses, and only these:
  - straight line: y = mx + c, m ∈ {1, 2, 3, −1}, c from −3 to 3
  - quadratic: y = x² + c or y = c − x², c from −3 to 3
  - cubic: y = x³ + c or y = 2x³ + c, c from −2 to 2
  - reciprocal: y = k/x, k ∈ {1, 2, 3}
  - for "highest power" questions only (no graph): sums like
    y = x² + x, y = x³ − 4x, y = 2x² + 3x − 1, y = x³ + x² (answers 2,
    3, 2, 3), y = 5x − 2 (answer 1).
- Superscripts `x²`, `x³`; reciprocal as `y = 1/x` in plain text and a
  stacked fraction in Learn, as `drawing-reciprocal-graphs`. Unicode
  minus, no-break spaces inside equations. Tidy text: `y = x − 1`, not
  `y = 1x − 1`; `y = 3 − x²`; no `+ −`.
- No exam-board names or codes.
- A small `graphtypes.js`, loaded before `interactive.js` and
  `questions.js`:
  - `equationText(form)` and `valueOf(form, x)` for the four kinds
    (`form = { kind: 'line' | 'quadratic' | 'cubic' | 'reciprocal', … }`).
  - `drawForm(graph, form, options)`: draws a form on a shared graph,
    the reciprocal as two plots (never across x = 0).
  - the `graphChoice` widget, the choice builders and the generator.
- `lesson.css` for the Learn layout, the 2 × 2 graph grid and the stacked
  fraction. Existing tokens only.

## The graphs

Every graph, big or small:

```js
{ x: [-4, 4], y: [-6, 6], step: { x: 1, y: 1 }, label: '…' }
```

`graph.plot` doesn't clip to the grid, so `drawForm` works out each
plot's domain itself: the x-values where the curve stays inside −6 to 6
on y and −4 to 4 on x (for curves, solve for where it meets y = ±6; the
reciprocal as two plots, each from where it meets y = ±6 out to x = ±4).
Unit-test that both ends of every plot are inside the grid. Big graphs have a `label` that describes the **shape**, not
the equation ("Coordinate grid with a U-shaped curve."), on every screen
where the pupil has to work out the equation.

**Small graphs** (Learn 1 and the `graphChoice` widget): the same grid,
about 150 px wide at 375 px, two by two on every screen width. Not
editable, not a Tab stop. If a small graph's axis numbers are too
cramped to read, leave the numbers off (an existing graph option only);
if there's no such option, stop and ask.

### The `graphChoice` widget

A custom answer widget: four buttons in a `role="group"`, each holding a
small graph and a caption "Graph A" … "Graph D" (letters in screen order,
after the seeded shuffle). The button's accessible name is the caption
plus the graph's shape description ("Graph A: a stretched S shape").
Shared `is-selected` / `is-correct` / `is-incorrect` classes. One press
selects; the engine's Check marks it. Each wrong option has its own
feedback. Value: the chosen option id; `answerText` "You chose Graph B."
`update` never recreates the boards. Fits at 375 px with no sideways
scroll.

## Learn (7 screens)

Learn is for looking: picture first, at most three short lines. **No
questions, no buttons, no gating: Next always enabled.** "In turn" ≈ 500
ms; reduced motion and revisits show the finished screen at once.

1. **Four kinds of graph.** Four small graphs, two by two, each with its
   equation and name underneath: y = 2x − 1 "straight line",
   y = x² − 1 "quadratic", y = x³ "cubic", y = 1/x "reciprocal". Text:
   "You've drawn all four of these." / "Each kind of equation makes its
   own shape."
2. **Power 1: a straight line.** Big graph of y = 2x − 1 with its
   equation. Text: "The **power** is the small raised number. x² has power
   2. x³ has power 3." / "Plain x has power 1. Power 1 makes a **straight
   line**."
3. **Power 2: a U shape.** y = x² − 1 and y = 3 − x² on one graph, each
   labelled with its equation. Text: "The highest power is 2: a
   **quadratic**." / "It makes a U shape, or an upside-down U."
4. **Power 3: an S shape.** y = x³ and y = x³ + 2 on one graph. Text:
   "The highest power is 3: a **cubic**." / "It makes a stretched S shape."
5. **x on the bottom: two curves.** y = 1/x and y = 2/x on one graph.
   Text: "When x is on the bottom of a fraction, it's a **reciprocal**." /
   "It makes two separate curves that never touch the axes."
6. **The highest power decides.** Big graph of y = x² + x (a U) with its
   equation; the x² highlighted. Text: "y = x² + x has x² and x." / "The
   **highest** power is 2, so it's a quadratic: a U shape."
7. **Worked example.** Big graph of y = 2x³ − 1, no equation on it. Under
   it the four equations y = 2x − 1, y = 2x² − 1, y = 2x³ − 1, y = 2/x.
   In turn: "1. The shape: a stretched S." / "2. A stretched S is a cubic:
   power 3." / then y = 2x³ − 1 turns green (✓) and the other three go
   muted. Text: "Look at the shape first. Then find the equation with the
   matching power."

## Try it (5 screens)

Not scored (`scored: false`). One card at a time. Each card shows its big
graph (left on wide screens) unless it's a `graphChoice` card. Options
shuffled once and saved.

1. **What shape?** Graph of y = x² + 1. Choice: "What shape is this
   graph?"
   - **A U shape**: "Right. The curve comes down, turns and goes back
     up."
   - A straight line: "It bends at the bottom, so it isn't straight."
   - A stretched S shape: "An S keeps going up on both sides of the
     middle. This curve turns back up."
   - Two separate curves: "It's one curve. It doesn't break in the
     middle."
2. **Which equation?** Same graph. Choice: "Which equation could it be?"
   - **y = x² + 1**: "Right. A U shape is a quadratic: power 2."
   - y = x + 1: "Power 1 makes a straight line. This is a U shape."
   - y = x³ + 1: "Power 3 makes an S shape. This is a U shape."
   - y = 1/x: "x on the bottom makes two separate curves. This is one U."
3. **Highest power** (number card). "What is the highest power of x in
   y = x³ − 4x?" Answer 3. Rules: 1 → "There's an x, but x³ is a higher
   power."; 4 → "4 is the number in front of x. The power is the small
   raised number." Correct: "Right. x³ beats x, so it's a cubic."
4. **Which equation?** Graph of y = 2/x. Choice: "Which equation could
   it be?"
   - **y = 2/x**: "Right. Two separate curves: a reciprocal graph."
   - y = 2x: "That's a straight line. This graph has two curves."
   - y = 2x²: "That's a U shape. This graph has two separate curves."
   - y = 2x³: "That's one S-shaped curve. This graph breaks in the
     middle."
5. **Which graph?** `graphChoice`: "Which graph is y = x³ − 2?" Graphs of
   y = x³ − 2 (right), y = x² − 2, y = x − 2, y = 2/x.
   - y = x³ − 2: "Right. Power 3: a stretched S."
   - y = x² − 2: "That U shape is a quadratic. You want power 3: an S."
   - y = x − 2: "That's a straight line: power 1. You want an S."
   - y = 2/x: "Two separate curves is a reciprocal. You want one S."

## Practice

Endless generator through `runQuestionSet`, `session_length` 6: two typed
cards and four choice cards, typed in places 1 and 4 (so typed and
choice mix), options shuffled by the seeded helpers.

Every choice has exactly four options: one of each kind, so no two can
match. The right kind is chosen by seed, each kind about equally often
across sessions.

### Typed (both per session)

| Type | Card | Answer and rules |
|---|---|---|
| `power` | "What is the highest power of x in y = 2x² + 3x − 1?" (from the sums list) | The highest power. Rules: a lower power in the equation → "There's an x… but x² is a higher power."; the number in front of the highest term (if not equal to the answer) → "That's the number in front. The power is the small raised number." |
| `missing-power` | A big graph (line, quadratic or cubic, by seed, with a = 1) and "This graph is y = x<sup>?</sup> − 1. What's the missing power?" (the equation with a boxed ?; c from the form) | 1, 2 or 3. Rules for each of the other two: "Power 2 makes a U shape. This graph is …" (with this graph's shape) |

### Choice (all four per session)

**`type-from-equation`**: "What kind of graph is y = x³ − 2?" Options
Straight line, Quadratic, Cubic, Reciprocal (fixed order is fine here).

| Option | Feedback when wrong |
|---|---|
| Straight line | "A straight line has power 1. This equation has x³ (or x²), so it's a curve." / for a reciprocal: "x is on the bottom of a fraction. That's a reciprocal." |
| Quadratic | "A quadratic has x² as its highest power. This has …" |
| Cubic | "A cubic has x³ as its highest power. This has …" |
| Reciprocal | "A reciprocal has x on the bottom of a fraction. This doesn't." |

Right: "Right. The highest power is 3, so it's a cubic." (or the
reciprocal / straight line / quadratic version).

**`type-from-graph`**: a big graph; "What kind of graph is this?" Same
four options. Wrong feedback names the shape: "This graph is a U shape:
a quadratic." etc.

**`equation-from-graph`**: a big graph; "Which equation could it be?"
Four equations, one of each kind, sharing numbers where they can (as
Try it 2 and 4). Wrong feedback: "That makes a [shape]. This graph is a
[shape]."

**`graph-from-equation`**: `graphChoice`: "Which graph is y = 1/x?" Four
small graphs, one of each kind. Wrong feedback: "That [shape] is a
[kind]. You want [shape]."

## Check

Six fixed questions (two typed, four choice), options shuffled once and
saved. No hints before the answer.

1. **Which graph?** `graphChoice`: "Which graph is y = 1/x?" Graphs of
   y = 1/x (right), y = x + 1, y = x² + 1, y = x³ − 1. Feedback as
   `graph-from-equation`.
2. **Which equation?** Graph of y = x³ − 1. Choice "Which equation could
   it be?": **y = x³ − 1**, y = x − 1, y = x² − 1, y = 1/x. Feedback as
   `equation-from-graph`.
3. **Noah's claim** (choice). "Noah says y = x³ + 1 is a straight line,
   because the equation ends in + 1. What's wrong?"
   - **The highest power is 3, so it's a cubic: an S shape.**: "Right.
     The + 1 only moves the graph up."
   - Nothing. It's a straight line.: "It has x³. Power 3 makes an S
     shape, not a straight line."
   - It's a quadratic, because it has a power.: "The power is 3, not 2.
     It's a cubic."
   - It's a reciprocal, because of the + 1.: "A reciprocal has x on the
     bottom of a fraction. This has x³: a cubic."
4. **Highest power** (number card). "What is the highest power of x in
   y = 2x² + 3x − 1?" Answer 2, `power` rules.
5. **Two curves** (choice). "A graph has two separate curves, one top
   right and one bottom left. They get closer to the axes but never touch
   them. Which equation could it be?"
   - **y = 2/x**: "Right. Two separate curves: a reciprocal."
   - y = x³: "A cubic is one S-shaped curve. It doesn't break in two."
   - y = x²: "A quadratic is one U-shaped curve."
   - y = 2x: "That's a straight line through (0, 0)."
6. **Missing power** (number card). Graph of y = x² − 1: "This graph is
   y = x<sup>?</sup> − 1. What's the missing power?" Answer 2,
   `missing-power` rules.

Summary after the results, three points:
- "Power 1: straight line. Power 2: U shape. Power 3: stretched S."
- "x on the bottom of a fraction: two separate curves."
- "The highest power decides the shape."

Then **All lessons** as the main button.

## Points

The engine plans the maximum. Report it; don't hard-code it.

## Checks

- `npm test` and the full `npm run test:ui`, on your branch and on
  `origin/main`, compared, one after the other (first build).
- Unit tests for `graphtypes.js`: `equationText` tidy for every form
  family (no `1x`, no `+ −`, `3 − x²`); `valueOf`; the reciprocal drawn
  as two plots; `power` and `missing-power` rules (skipped and duplicate
  rows); the generator (two typed, four choice, typed at places 1 and 4,
  one option per kind, each kind right about equally often over 200
  seeds, same seed same session).
- `tests/ui/recognising-graph-types.spec.cjs`: a full correct run; every
  Learn screen has no buttons, Next enabled at once and its finished
  picture (375 px screenshots to `/tmp/graphtypes-learn-1.png` …
  `-7.png`); reduced motion; a wrong-then-right `graphChoice` card in Try
  it and in Practice; reload in every section with a `graphChoice`
  selection kept.
- `node --check` on every JS file; `lesson.json` valid JSON.
- In the browser, 1280 × 800 and 375 × 812 with touch, real clicks:
  - a full run to All lessons and the homepage, on the PHP site and
    `dist/` (this is the last lesson in the series)
  - Learn 1 and every `graphChoice`: four small graphs two by two, shapes
    clearly different, nothing scrolls sideways at 375 px
  - the small graphs are not Tab stops; Tab moves button to button
  - no graph label or accessible name gives the equation away where the
    pupil has to find it
  - every rule row and wrong option shows its own feedback once
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage shows the lesson after Drawing reciprocal graphs, and in
  the Graphs collection.
- `BASE_URL=… ./build.sh` from the worktree, then commit `dist/`.

## Commits

1. The lesson, its tests and `dist/`. Commit this file with it.

## Report

Through the relay: the commit hash, test results compared with
`origin/main`, every check above, the screenshot paths, the planned
maximum, template findings, and anything you couldn't do. Then wait.
