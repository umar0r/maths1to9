# Drawing reciprocal graphs: lesson spec

The second of three lessons from "Cubic and reciprocal graphs" (see
`docs/drawing-cubic-graphs-lesson.md` for the series). Teaches one skill,
`reciprocal-graphs`: draw the graph of y = 1/x by completing a table of
values, plotting the points and joining them with **two separate**
smooth curves.

`drawing-cubic-graphs` is the worked example: copy its Learn pattern,
side-by-side layout, live table widget, plotting helper, joining buttons
and helper style. Where this spec doesn't say otherwise, do what that
lesson does.

Everything this lesson needs already exists once `drawing-cubic-graphs`
is merged (shared graph `subdivide` for halves, `drag: 'positions'`, the
live table and plotting patterns). There is no Part A. **If the lesson
needs anything shared that isn't there, stop and ask.**

## Before you start

- `git fetch origin`. Check `origin/main` has `drawing-cubic-graphs` and
  the graph's `subdivide` option. If not, stop and say so. Create
  `codex/drawing-reciprocal-graphs` from `origin/main`, in its own
  worktree.
- Don't touch the main checkout's uncommitted DfE files or any other
  branch.
- Read the rules in the order `AGENTS.md` gives, then
  `content/drawing-cubic-graphs/` from end to end.
- Don't change shared files, the template or any other lesson. Never
  call JSXGraph from the lesson. Don't patch shared output.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Drawing reciprocal graphs |
| Slug / folder | `drawing-reciprocal-graphs` (the placeholder already in `curriculum.json`) |
| Subtitle | Draw the two separate curves of y = 1/x. (as the placeholder) |
| Skill | `reciprocal-graphs` (exists) |
| Goal shown to pupils | Draw the two separate curves of a reciprocal graph. |
| Sections | Learn, Try it, Practice, Check |
| Back button | On |

- `skills.json`, `curriculum.json` and `collections.json` already have
  this lesson. Change nothing in them. Creating the folder makes the
  homepage show it.
- Map every Practice and Check question type to `reciprocal-graphs` in
  `lesson.json`.

## Wording and maths

- Plain English. Say "1 divided by x", "reciprocal graph", "two separate
  curves", "gets closer to", "never touches". Say what "reciprocal
  graph" means the first time: a graph like y = 1/x, where you divide 1
  by x. Don't say "asymptote", "undefined", "hyperbola", "function",
  "domain" or "inverse".
- y = 1/x means 1 ÷ x. In Learn, show it as a stacked fraction made with
  lesson HTML and `lesson.css` (1 over x, with a line). In prompts,
  options, feedback and results write `y = 1/x` in plain text. No KaTeX.
- Decimals, not fractions, in answers: 0.5, 0.25, −2. Cards accept the
  decimal; if `fractions: true` already accepts ½ or 1/2 as equal, leave
  that on.
- Unicode minus `−`. Coordinates `(x, y)` with a space after the comma.
  No-break spaces inside equations and coordinates.
- No exam-board names or codes.
- A small `reciprocals.js`, loaded before `interactive.js` and
  `questions.js`:
  - `reciprocalText(k)`: `y = 1/x`, `y = 2/x`.
  - `valueOf(k, x)`: k ÷ x (never called with x = 0).
  - `workingText(k, x)`: `1 ÷ 2 = 0.5`, `1 ÷ 0.5 = 2`,
    `1 ÷ (−2) = −0.5`, `2 ÷ (−0.5) = −4`. Brackets round negatives.
  - `valueRules`, `tableRules`, `plotMark`, the joining drawings and the
    generator.
- `lesson.css`: the table, the stacked fraction and Learn layout, as
  `drawing-cubic-graphs`. Existing tokens only.

## The graph

Every graph:

```js
{ x: [-4, 4], y: [-4, 4], step: { x: 1, y: 1 }, subdivide: { x: 2, y: 2 }, label: '…' }
```

So faint lines at every half, and taps snap to halves.

- **The curve is always two plots**, never one:
  `graph.plot(x => k / x, { domain: [k / 4, 4] })` and
  `graph.plot(x => k / x, { domain: [-4, -k / 4] })`. `graph.plot` doesn't
  clip to the grid, so these domains keep both ends exactly on the grid's
  edge (y = ±4 at x = ±k/4). Every drawing in the lesson, wrong ones too,
  stays inside −4 to 4 on both axes. Nothing is ever drawn across x = 0 except the deliberate wrong
  "joined" drawing below.
- Every graph has a `label` ("Coordinate grid with the two curves of
  y = 1/x.").
- Point labels as in `drawing-cubic-graphs`. Labels with decimals, like
  (0.5, 2), must not touch the y-axis, the curve or each other at 375 px.
- Plotted points are only ever at multiples of 0.5 (so x = ±4 and
  x = ±0.25 appear in typed tables, never as points to plot).

## Learn (7 screens)

Learn is for looking: graph first, at most three short lines. **No
questions, no buttons, no gating: Next always enabled.** "In turn" ≈ 500
ms; reduced motion and revisits show the finished screen at once.

1. **This is a reciprocal graph.** y = 1/x drawn as its two curves, no
   points. Text: "This is the graph of y = 1/x. It means 1 ÷ x." / "It's
   a **reciprocal graph**: you divide 1 by x." / "It has **two separate
   curves**."
2. **Each point comes from dividing.** Right curve muted. In turn: "x =
   2", "1 ÷ 2 = 0.5", point (2, 0.5) labelled; then "x = 0.5", "1 ÷ 0.5 =
   2", point (0.5, 2) labelled (the first label goes). Text: "There are
   two halves in 1, so 1 ÷ 0.5 = 2." / "Small x gives big y. Big x gives
   small y."
3. **Negative x gives negative y.** In turn: "x = −2", "1 ÷ (−2) =
   −0.5", point (−2, −0.5) labelled, then the left curve. Text: "A
   positive divided by a negative is negative." / "So the second curve is
   at the bottom left."
4. **No point where x = 0.** Both curves; the y-axis drawn over with a
   dashed line (tone `incorrect`) and the text label "no point here".
   Text: "1 ÷ 0 has no answer: no number times 0 makes 1." / "So the graph
   has no point on the y-axis. The two curves never meet."
5. **A table keeps it tidy.** Empty table, x = −2, −1, −0.5, 0.5, 1, 2 (no
   0 column), above an empty grid. Cells and points fill in turn. Text:
   "Divide 1 by each x." / "There's no x = 0 column. You can't divide by
   0."
6. **Two separate curves.** The six points. A dashed line from (−0.5, −2)
   to (0.5, 2) appears with "✗ Don't join across the middle.", stays about
   1.8 s, then gives way to the two smooth curves (tone `correct`) with
   "✓ Two separate smooth curves." Text: "Join the right-hand points with
   one curve and the left-hand points with another."
7. **Closer and closer, never touching.** A large dot moves along the
   right curve through (0.5, 2), (1, 1), (2, 0.5), (4, 0.25), about 700 ms
   apart, its coordinates label updating. The line under the graph reads
   "1 ÷ 4 = 0.25" at the end. Text: "As x gets bigger, y gets smaller." /
   "1 ÷ 100 = 0.01. y gets closer to 0, but never reaches it." / "So the
   curves get closer to the axes but never touch them."

## Try it (5 screens)

Not scored (`scored: false`). One task at a time. Typed cards use
`fractions: true`. Choice options shuffled once and saved. Everything is
for **y = 1/x**.

1. **One value.** Number card: "What is y when x = 4? Work out 1 ÷ 4."
   Answer 0.25, `valueRules`. Correct: "Right. 1 ÷ 4 = 0.25."
2. **The table.** The live table for x = −2, −1, −0.5, 0.5, 1, 2: answer
   −0.5, −1, −2, 2, 1, 0.5, `tableRules`. When all are right, draw the two
   curves (never one through all six). Correct: "Right. Positive x gives
   positive y. Negative x gives negative y." **Six boxes must fit at
   375 px with no sideways scroll; if they don't, stop and ask.**
3. **Plot.** The plotting helper for the six points, snapping to halves.
   Continue after all six.
4. **Join them.** The six unlabelled points and four joining buttons
   (below).
5. **Bigger x.** Choice: "On the right-hand curve, what happens to y as x
   gets bigger?"
   - **y gets smaller, closer and closer to 0.**: "Right. 1 ÷ 2 = 0.5,
     1 ÷ 4 = 0.25, 1 ÷ 100 = 0.01."
   - y gets bigger.: "Look at the curve: it goes down as you move right.
     1 ÷ 4 = 0.25 is less than 1 ÷ 2 = 0.5."
   - y reaches 0 at x = 4.: "1 ÷ 4 = 0.25, not 0. y gets closer to 0, but
     never reaches it."
   - y stays the same.: "1 ÷ 1 = 1 but 1 ÷ 2 = 0.5. y changes as x
     changes."

### Joining the points (Try it 4)

Four buttons in a `role="group"` labelled "How do you join the points?",
as `drawing-cubic-graphs`, order shuffled once and saved:

- **Two separate smooth curves**: the two plots.
- **One curve, joined across the middle**: the two plots plus a segment
  (−0.5, −2) to (0.5, 2). "There's no point where x = 0. Keep the two
  curves apart."
- **Straight lines, dot to dot**: segments between neighbouring points,
  across the middle too. "The graph doesn't have corners, and it doesn't
  cross the middle. Use two smooth curves."
- **Curves that touch the axes**: the two plots on [0.5, 2] and
  [−2, −0.5] plus segments (2, 0.5) to (4, 0), (0.5, 2) to (0, 4) and the
  same on the left. "The curves get closer to the axes but never touch
  them. 1 ÷ x is never 0."

Right: "✓ Two smooth curves, one on each side. They never meet." once,
in the feedback box. Save the right choice; wrong presses aren't saved.

## Plotting points

The `drawing-cubic-graphs` helper and `plotMark` (swapped, x sign, y
sign, then "Start at (0, 0). Go across to x = 0.5, then up to y = 2."),
snapping to halves. Replace the odd-number rule with:

- tapped a point 0.5 away from the target on one axis: "Each faint line
  is a half. 0.5 is halfway between 0 and 1."

## Feedback rules

### `valueRules(k, x)`

Answer k ÷ x. Rules in this order; skip any equal to the answer or an
earlier rule's value:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| x ÷ k | always | "That's the wrong way round. y = 1/x means 1 ÷ 4, not 4 ÷ 1." |
| k × x | always | "That's multiplying. y = 1/x means divide: 1 ÷ 0.5 = 2." |
| −(k ÷ x) | always | "Check the sign. 1 divided by a negative is negative; by a positive, positive." |
| 0 | always | "1 ÷ 4 isn't 0. It's 0.25: close to 0, but not 0." |

Fallback: "Divide 1 by x: " + `workingText`.

### `tableRules(k, xs)`

- every field equal to x ÷ k: "Divide 1 by x, not x by 1."
- every negative-x field positive: "A negative x gives a negative y:
  1 ÷ (−2) = −0.5."
- every field right but one: "One box is wrong. Work out that one again:"
  plus the `workingText`.

Fallback: "Divide 1 by each x. Negative x gives negative y."

## Practice

Endless generator through `runQuestionSet`, `session_length` 6: three
typed or plotting cards and three choice cards, alternating (typed
first), options shuffled by the seeded helpers.

Forms: k = 1 (most sessions) or k = 2 (about a third, by seed). x values
from ±0.25 (k = 1 only), ±0.5, ±1, ±2, ±4. Every plotted point is a
multiple of 0.5 and inside −4 to 4.

### Typed and plotting (all three, seeded order)

| Type | Card | Answer |
|---|---|---|
| `value` | "For y = 1/x, what is y when x = −0.5?" For k = 2: "This time, divide 2 by x." | `valueRules` |
| `table` | The live table, six x values from the list (k = 1: −2, −1, −0.5, 0.5, 1, 2 or −4, −1, −0.25, 0.25, 1, 4; k = 2: −4, −2, −1, 1, 2, 4): "Complete the table for y = 2/x." | `tableRules` |
| `plot` | The filled table (k and x so every point is a multiple of 0.5), the grid with the other points plotted: "Plot the point for x = 0.5." | the plotting widget, `plotMark` |

### Choice (three of these five per session, by seed)

Four options each. Choose x so no two options match (for k = 1, never
x = ±1 in `point-on`).

**`point-on`**: "Which point is on the graph of y = 1/x?" x from 2, 4,
0.5, by seed.

| Option | Feedback |
|---|---|
| **(2, 0.5)** | "Right. 1 ÷ 2 = 0.5." |
| (2, 2) (x ÷ k) | "That's 2 ÷ 1. y = 1/x means 1 ÷ 2 = 0.5." |
| (−2, 0.5) (sign) | "A negative x gives a negative y: 1 ÷ (−2) = −0.5." |
| (0, 0) | "There's no point where x = 0. 1 ÷ 0 has no answer." |

**`at-zero`**: "What is y when x = 0 on the graph of y = 1/x?"

| Option | Feedback |
|---|---|
| **There isn't one. 1 ÷ 0 has no answer.** | "Right. That's why the graph never touches the y-axis." |
| y = 0 | "1 ÷ 0 isn't 0. No number times 0 makes 1, so there's no answer." |
| y = 1 | "1 ÷ 1 = 1, but here x = 0. You can't divide by 0." |
| y = 10 | "The curve gets very steep near x = 0, but it never reaches it. There's no point at x = 0." |

**`negative`**: "On the graph of y = 1/x, x is negative. What can you say
about y?"

| Option | Feedback |
|---|---|
| **y is negative too.** | "Right. 1 ÷ (−2) = −0.5. That's the bottom-left curve." |
| y is positive. | "1 divided by a negative is negative: 1 ÷ (−2) = −0.5." |
| y is 0. | "1 ÷ x is never 0. It gets close to 0, but never reaches it." |
| y is the same as x. | "Only at (−1, −1). At x = −2, y = −0.5." |

**`bigger`**: Try it 5's question and options (feedback as there).

**`join`**: "Sam plots every point of y = 1/x correctly. How should Sam
join them?"

| Option | Feedback |
|---|---|
| **Two separate smooth curves, one on each side** | "Right." |
| One curve through every point | "There's no point where x = 0, so the curve can't cross the middle." |
| Straight lines from dot to dot | "Reciprocal graphs curve smoothly. They don't have corners." |
| Curves that run on to touch the axes | "The curves get closer to the axes, but never touch them." |

## Check

Five fixed questions (three typed or plotting, two choice), options
shuffled once and saved. No hints before the answer.

1. **Complete the table** (live table). "Complete the table for
   y = 1/x." x = −4, −1, −0.25, 0.25, 1, 4. Answer −0.25, −1, −4, 4, 1,
   0.25, `tableRules`. All right: the two curves draw.
2. **Plot a point** (plotting widget). The filled table for y = 2/x at
   x = −2, −1, −0.5, 0.5, 1, 2 (−1, −2, −4, 4, 2, 1), the grid with every
   point but x = −1 plotted: "Plot the point for x = −1." Answer (−1, −2).
3. **Mia's curve** (choice). "Mia plots the points of y = 1/x correctly.
   She says she must join every point with one curve. What should she do
   instead?"
   - **Draw two separate curves. They must not join across the
     middle.**: "Right. There's no point where x = 0."
   - Nothing. One curve through every point is right.: "There's no point
     where x = 0, so one curve can't go across the middle."
   - Join them with straight lines.: "Reciprocal graphs curve smoothly.
     Use two smooth curves."
   - Draw one curve through (0, 0).: "1 ÷ 0 has no answer, so the graph
     can't go through (0, 0)."
4. **Sam's claim** (choice). "Sam says that when x is big enough, 1/x
   equals 0. Is Sam right?"
   - **No. 1/x gets closer to 0, but never equals 0.**: "Right.
     1 ÷ 100 = 0.01, 1 ÷ 1000 = 0.001: never 0."
   - Yes. 1 ÷ 100 is 0.: "1 ÷ 100 = 0.01. Small, but not 0."
   - Yes. The curve touches the x-axis at x = 4.: "At x = 4, y = 0.25. The
     curve gets closer to the x-axis but never touches it."
   - No. 1/x gets bigger as x gets bigger.: "Sam is wrong, but not for
     that reason. 1/x gets smaller as x gets bigger, closer and closer to
     0."
5. **Divide by a half** (number card). "For y = 1/x, what is y when
   x = 0.5?" Answer 2, `valueRules`. Correct: "Right. There are two
   halves in 1, so 1 ÷ 0.5 = 2."

Summary after the results, three points:
- "y = 1/x means 1 ÷ x. There's no point where x = 0."
- "Positive x gives positive y. Negative x gives negative y."
- "Draw two separate smooth curves. They get closer to the axes but never
  touch them."

Then **All lessons** as the main button.

## Points

The engine plans the maximum. Report it; don't hard-code it.

## Checks

- `npm test` and the full `npm run test:ui`, on your branch and on
  `origin/main`, compared, one after the other (first build).
- Unit tests for `reciprocals.js`: `reciprocalText`, `workingText`, every
  `valueRules` row (with skipped and duplicate rows), each `tableRules`
  rule, every `plotMark` case including the half rule, and the generator
  (all three typed types, three different choice types, alternating,
  plotted points on halves inside the grid, no two equal options, same
  seed same session).
- `tests/ui/drawing-reciprocal-graphs.spec.cjs`: a full correct run;
  every Learn screen has no buttons, Next enabled at once and its finished
  picture (375 px screenshots to `/tmp/reciprocal-learn-1.png` …
  `-7.png`); reduced motion; Try it 3 with each wrong tap and a half by
  keyboard; Try it 4 with each wrong join first; a wrong-then-right
  Practice plotting card; reload in every section.
- `node --check` on every JS file; `lesson.json` valid JSON.
- In the browser, 1280 × 800 and 375 × 812 with touch, real clicks:
  - a full run to All lessons and the homepage, on the PHP site and
    `dist/`
  - no curve is ever drawn across x = 0, except the wrong "joined"
    drawing
  - Learn 7's moving label stays clear of the curve and axes
  - the six-box table fits at 375 px
  - every rule row and wrong option shows its own feedback once
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage shows the lesson after Drawing cubic graphs, and in the
  Graphs collection.
- `BASE_URL=… ./build.sh` from the worktree, then commit `dist/`.

## Commits

1. The lesson, its tests and `dist/`. Commit this file with it.

## Report

Through the relay: the commit hash, test results compared with
`origin/main`, every check above, the screenshot paths, the planned
maximum, template findings, and anything you couldn't do. Then wait.
