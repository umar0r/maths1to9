# Solving simultaneous equations using graphs: lesson spec

Teaches one skill, `simultaneous-graphs`: find the x and y that work in
two equations by reading where their straight lines cross. Both lines
are always drawn for the pupil. Drawing the lines is a separate skill
(`plot-linear-graphs`) and isn't taught here. Solving by elimination or
substitution isn't mentioned.

Built from the lesson template, the shared components and the shared
graph. **`quadratic-turning-points` is the worked example**: copy its
Learn pattern (things appear in turn, Next always on, finished state on
revisit), its side-by-side layout, its `figure` cards, its guides and its
helper file's style. `gradient-and-intercept` shows `graph.pick`.

Everything this lesson needs already exists: `graph.line({ m, c })` with
`label`, `graph.point` with `labelSide`, `graph.segment` with `dash`,
`graph.pick`, `figure` on question cards, two-field number cards with
`rules`, and choice cards. There is no Part A. **If the lesson needs
anything shared that isn't there, stop and ask.**

## Before you start

- `git fetch origin`. Create `codex/simultaneous-equations-graphs` from
  `origin/main` (0bfef78 or later), in its own worktree
  (`.worktrees/simultaneous-equations-graphs`), with `node_modules`
  symlinked and not committed.
- Don't touch the main checkout's uncommitted DfE files (listed in
  `AGENTS.md`) or any other worktree.
- Read the rules in the order `AGENTS.md` gives, then
  `content/quadratic-turning-points/` from end to end.
- Don't change shared files, the template or any other lesson. Never
  call JSXGraph from the lesson. Don't patch shared output.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Solving simultaneous equations using graphs |
| Slug / folder | `simultaneous-equations-graphs` (new) |
| Subtitle | Read where two lines cross to find x and y. |
| Skill | `simultaneous-graphs` (new) |
| Goal shown to pupils | Find the x and y that work in both equations by reading where their lines cross. |
| Sections | Learn, Try it, Practice, Check |
| Back button | On |

Register it (change nothing else in these files):

- `skills.json`: after `simultaneous-substitution`, add
  `{"id":"simultaneous-graphs","title":"Solve simultaneous equations using graphs","content_references":["A19"],"recommended_prerequisites":["plot-linear-graphs","coordinates-four-quadrants"]}`
- `curriculum.json`: straight after the `finding-the-equation-of-a-line`
  entry, add
  `{"folder":"simultaneous-equations-graphs","title":"Solving simultaneous equations using graphs","subtitle":"Read where two lines cross to find x and y.","skills":["simultaneous-graphs"]}`
- `collections.json`: in `graphs`, add `simultaneous-equations-graphs`
  straight after `finding-the-equation-of-a-line`.
- Leave the `simultaneous-equations` and `solutions-from-graphs`
  placeholders as they are.
- Map every Practice and Check question type to `simultaneous-graphs` in
  `lesson.json`.

## Wording and maths

- Plain English for GCSE Foundation pupils. Short sentences.
- Words to use, explained the first time: "**simultaneous equations**"
  (two equations that must both be true at the same time), "**solution**"
  (the x and y that work in both), "**point of intersection**" (the point
  where the lines cross). Also "cross", "crossing point", "estimate",
  "≈ means about". Don't say "linear system", "satisfy", "coincide",
  "elimination" or "substitution".
- Equations are plain text, never KaTeX: `y = x + 1`, `y = 4 − 2x`,
  Unicode minus `−`, `×` for times in working. Coordinates are `(x, y)`
  with a space after the comma and no-break spaces inside them.
- Answers are written `x = 1, y = 2`.
- Never refer to a line by its colour alone. Name it by its equation.
- No exam-board names or codes.
- A small `simultaneous.js`, loaded before `interactive.js` and
  `questions.js`:
  - `crossing(a, b)`: the crossing point of y = a.m x + a.c and
    y = b.m x + b.c, as exact fractions and as numbers.
  - `onLine(line, [x, y])`: true when the point is on that line.
  - `equationText(line)`: `y = 2x + 7`, `y = −x + 4`, `y = 3x`,
    `y = x − 2` (no `1x`, no `+ 0`, no `+ −`). Learn's `y = 4 − 2x` is
    written that way by hand, as shown.
  - `graph(host, lines, label)` and `figure(lines, options)` as in
    `turning.js`; `guides(board, point)`; `solutionRules`; the choice
    builders and the generator.
- Question cards show their graph 320 px wide and centred through
  `figure`. Learn and Try it 1 use the side-by-side layout.
- `lesson.css` only for the layout and Learn text, copied from
  `quadratic-turning-points` (renamed `.simultaneous-layout`). Existing
  tokens only.

## The graph

The shared graph, loaded in `index.php` with the four tags from
`docs/shared-graph.md`. Grids, all `step: { x: 1, y: 1 }`:

- Learn: `{ x: [-4, 4], y: [-4, 6] }`
- Try it 1 to 4: `{ x: [-5, 3], y: [-2, 9] }`
- Try it 5, Practice, Check: `{ x: [-5, 5], y: [-5, 5] }`

- Each line is `graph.line({ m, c }, { tone })` across the whole grid,
  **with no label on the graph** (the shared wrapper puts sloping-line
  labels at a fixed spot, which can fall off the grid). The first line is
  tone `neutral`, the second tone `ink`.
- **A key names the lines instead.** Lesson markup inside the figure (or
  Learn's graph area), directly above the graph: one row per line, a
  short thick swatch drawn with that line's colour token, then its
  equation, e.g. "▬ y = 2x + 7" / "▬ y = −x + 4". The rows sit side by
  side on wide screens and wrap at 375 px without sideways scrolling.
  The key is decoration for sighted pupils: the graph's accessible label
  already names both equations, so hide the swatches from screen
  readers. This is the lesson's own markup, not a change to anything
  the engine or the wrapper draws.
- The accessible label names both equations: "Coordinate grid with the
  lines y = 2x + 7 and y = −x + 4." It never gives the crossing point in
  Try it, Practice or Check.
- **Guides**: dashed segments (`dash: true`, tone `ink`) from the
  crossing point straight to the x-axis, and straight to the y-axis, as
  in `quadratic-turning-points`.
- Only the point a screen is talking about gets a coordinates label.

## Learn (6 screens)

Learn is for looking, as in `quadratic-turning-points`: the graph first
(left on wide screens), at most three short lines of text beside or
under it, plus the working lines listed. **No questions, no buttons, no
gating: Next is always enabled,** mid-animation too. "In turn" means
about 500 ms apart; under `prefers-reduced-motion` and on every revisit
(Back, reload), the finished screen shows at once. Save the screen index
and which screens have been seen.

The equations on screens 1 to 4: `y = x + 1` and `y = 4 − 2x` (m = −2,
c = 4). They cross at (1, 2).

1. **One equation, lots of answers.** Only y = x + 1 drawn, equation
   large above the graph. In turn, three points appear on it, each with
   one working line beside the graph: (−2, −1) "x = −2, y = −2 + 1 = −1",
   then (0, 1) "x = 0, y = 0 + 1 = 1", then (2, 3) "x = 2, y = 2 + 1 = 3".
   Only the newest point is labelled. Text: "y = x + 1 has lots of pairs
   of x and y that work." / "Each point on the line is one pair."

2. **Two equations at once.** y = 4 − 2x is added. (0, 1) large and
   labelled; the other points gone. Working in turn: "y = x + 1:
   0 + 1 = 1 ✓" / "y = 4 − 2x: 4 − 2 × 0 = 4, not 1 ✗". Text: "Now we
   want x and y that work in **both** equations. These are called
   **simultaneous equations**." / "(0, 1) is on y = x + 1, but not on
   y = 4 − 2x. So it doesn't work in both."

3. **Where the lines cross.** Both lines; (0, 1) gone. In turn: (1, 2)
   appears large (tone `correct`); the guide down to the x-axis with
   "x = 1"; the guide across to the y-axis with "y = 2"; the label
   (1, 2). Text: "The lines cross at (1, 2). This point is on both
   lines." / "Where two lines cross is called the **point of
   intersection**."

4. **It works in both.** Same finished picture as screen 3. Working in
   turn: "y = x + 1: 1 + 1 = 2 ✓" / "y = 4 − 2x: 4 − 2 × 1 = 2 ✓". Text:
   "x = 1 and y = 2 work in both equations." / "So the **solution** is
   x = 1, y = 2."

5. **The method.** New lines y = x − 1 and y = 3 − x (m = −1, c = 3),
   crossing at (2, 1). In turn, each step with its picture: "1. Find
   where the lines cross." (the point appears) / "2. Go down to the
   x-axis: x = 2." (x guide) / "3. Go across to the y-axis: y = 1."
   (y guide) / "Write the solution: x = 2, y = 1." (label (2, 1)). Text:
   "Find the crossing point, then read x, then y."

6. **Between grid lines.** Lines y = 2x and y = 4 − x, crossing at
   (4/3, 8/3). The crossing point appears with both guides. Beside it, in
   turn: "x is about a third of the way from 1 to 2: x ≈ 1.3." / "y is
   about two thirds of the way from 2 to 3: y ≈ 2.7." / "Solution:
   x ≈ 1.3, y ≈ 2.7." No coordinates label on the point. Text: "Lines
   don't always cross on a grid point." / "Use the scale to **estimate**
   each value. ≈ means 'about'."

## Try it (5 screens)

Not scored (`scored: false`), as in `quadratic-turning-points`. One task
at a time; the next appears after Continue. Every screen shows its graph
(left on wide screens).

Screens 1 to 4 use y = 2x + 7 and y = −x + 4. They cross at (−1, 5).

1. **Tap the crossing point.** `graph.pick`. Prompt: "Tap where the two
   lines cross." Feedback under the graph, and the tapped point drawn
   (tone `incorrect`, no label) until the next tap:
   - on y = 2x + 7 only: "✗ That point is on y = 2x + 7 only. Find where
     both lines meet."
   - on y = −x + 4 only: "✗ That point is on y = −x + 4 only. Find where
     both lines meet."
   - on neither: "✗ That point isn't on either line. Find where the two
     lines cross."
   - (−1, 5): the point large, tone `correct`; "✓ Both lines go through
     this point." Picking stops and Continue unlocks.
   Keyboard: the shared picker's crosshair. Save the last tap and whether
   it's found.
2. **Its x-coordinate.** The crossing point marked (large, no label) and
   the x guide shown. Number card: "Go down to the x-axis. What is the
   x-coordinate?" Answer −1. Rules: 1 → "The crossing point is left of 0,
   so its x-coordinate is negative: −1."; 5 → "That's the y-coordinate.
   Read x on the x-axis: −1." Fallback: "Follow the dashed line down to
   the x-axis." Correct: "Right. x = −1."
3. **Its y-coordinate.** The y guide added. Choice: "Go across to the
   y-axis. What is the y-coordinate?"
   - **5**: "Right. y = 5."
   - −1: "That's the x-coordinate. Read y on the y-axis: 5."
   - −5: "The point is above 0, so y is positive: 5."
   - 4: "4 is where y = −x + 4 crosses the y-axis. The crossing point is
     higher up, level with 5."
   After a correct answer the label (−1, 5) appears.
4. **Write the solution.** Choice: "What is the solution?"
   - **x = −1, y = 5**: "Right. These values work in both equations."
   - x = 5, y = −1: "x comes first. Read x on the x-axis: x = −1, y = 5."
   - x = 1, y = 5: "The point is left of 0, so x is negative: x = −1."
   - x = 0, y = 7: "(0, 7) is where y = 2x + 7 crosses the y-axis. It's on
     one line only."
5. **Now with less help.** y = x − 3 and y = −2x + 3, crossing at
   (2, −1). No guides, no marked point. Two-field card (fields `x` and
   `y`, labelled "x =" and "y ="): "Find the solution of y = x − 3 and
   y = −2x + 3." Answer 2, −1, `solutionRules`. **After a wrong answer,
   the guides from the crossing point appear** on the card's graph (the
   point itself stays unmarked); they stay after a reload.

## Feedback rules

### `solutionRules(lines, [h, k])`

Two-field cards, fields `x` and `y`, answer h and k. Rules in this
order; skip any whose value equals the answer or an earlier rule's
value, or that can't apply:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| `{ x: k, y: h }` | h ≠ k | "Write x first, then y: x = 2, y = −1." |
| `{ x: −h, y: −k }` | h ≠ 0, k ≠ 0 | "Check both signs. Left of 0 and below 0 are negative." |
| `{ x: −h }` | h ≠ 0 | "Check the sign of x. Left of 0 is negative." (or "Right of 0 is positive.") |
| `{ y: −k }` | k ≠ 0 | "Check the sign of y. Below 0 is negative." (or "Above 0 is positive.") |
| `{ x: 0, y: c }` for each line | h ≠ 0 | "That's where y = x − 3 crosses the y-axis. The solution is where the two lines cross each other." |
| `{ x: h }` | always | "x is right. Now go across from the crossing point to the y-axis to read y." |
| `{ y: k }` | always | "y is right. Now go down or up from the crossing point to the x-axis to read x." |

Fallback: "Find where the two lines cross. Read x on the x-axis, then y
on the y-axis."

Correct: "Right. x = 2, y = −1 works in both equations."

## Practice

Endless generator through `runQuestionSet`, `session_length` 6: three
typed cards and three choice cards, alternating (typed first), options
shuffled by the seeded helpers. Every card shows its graph and no
guides, marked points or labels (just its key). **Never
mark the crossing point before the pupil answers.**

### Lines

Pick the crossing point (h, k) first, then two gradients: m1 from
{1, 2, 3} and m2 from {−1, −2, −3} (one line goes up, one goes down),
the order of the two lines by seed. Each c = k − m × h. Keep c from −8
to 8 so the equations stay simple.

Crossing kinds, h and k from −4 to 4:

| Kind | h | k |
|---|---|---|
| `positive` | 1 to 4 | 1 to 4 |
| `negative-x` | −4 to −1 | 1 to 4 |
| `negative-y` | 1 to 4 | −4 to −1 |
| `on-axis` | 0, or 1 to 4 / −4 to −1 with k = 0 (not both 0) | |

### Typed

Three `read-solution` cards per session, three different kinds (by
seed), all different lines: the two-field card "Find the solution of
y = … and y = …." with `solutionRules`.

### Choice

One of each per session, exactly four options each. Never two options
the same; if a wrong option clashes, use the next listed spare.

**`which-solution`** (integer crossing, a kind not used by that
session's typed cards if possible): "What is the solution?"

| Option | Feedback |
|---|---|
| **x = h, y = k** | "Right. These values work in both equations." |
| x = k, y = h | "x comes first. Read x on the x-axis: x = h, y = k." |
| x = −h, y = k (or x = h, y = −k when h = 0) | "Check the signs. Left of 0 and below 0 are negative." |
| x = 0, y = c of one line | "That's where y = … crosses the y-axis. It's on one line only." |
| spare: x = h, y = −k | "Check the sign of y. Below 0 is negative." |

**`estimate`**: "Estimate the solution." One pair from this pool, by
seed (each crosses between grid lines; values rounded to 1 d.p.):

| Lines | Crossing | Estimate |
|---|---|---|
| y = 2x, y = −x + 4 | (4/3, 8/3) | x ≈ 1.3, y ≈ 2.7 |
| y = x + 2, y = −2x | (−2/3, 4/3) | x ≈ −0.7, y ≈ 1.3 |
| y = 2x + 1, y = −x + 3 | (2/3, 7/3) | x ≈ 0.7, y ≈ 2.3 |
| y = 2x − 2, y = −x + 2 | (4/3, 2/3) | x ≈ 1.3, y ≈ 0.7 |
| y = x − 2, y = −2x + 3 | (5/3, −1/3) | x ≈ 1.7, y ≈ −0.3 |

| Option | Feedback |
|---|---|
| **x ≈ (estimate), y ≈ (estimate)** | "Right. The lines cross between grid lines, so we estimate." |
| x ≈ / y ≈ the nearest whole numbers (e.g. x ≈ 1, y ≈ 3) | "That's the nearest grid point, but the lines don't cross there. Look at where they really cross." |
| the estimate swapped | "x comes first. Read x on the x-axis, then y on the y-axis." |
| x ≈ the x estimate, y ≈ the y estimate with its sign flipped (or x's sign flipped if y's is 0) | "Check the signs. Below 0 is negative." (or "Left of 0 is negative.") |

**`both-lines`**: an integer crossing; a point P marked large on one
line only (whole-number coordinates, inside the grid, at least 2 units
from the crossing), labelled "P" (not its coordinates). "Point P is on
the line y = …. Is P the solution?"

| Option | Feedback |
|---|---|
| **No. P is only on one line.** | "Right. The solution must be on both lines." |
| Yes. P is on a line. | "P works in y = … only. The solution must work in both equations, so it's where the lines cross." |
| Yes. P has whole-number coordinates. | "Whole numbers don't make it the solution. It must be on both lines." |
| No. The solution is where a line crosses the y-axis. | "That's not it. The solution is where the two lines cross each other." |

## Check

Four fixed questions in `questions.js` (two typed, two choice), through
the shared card, options shuffled once and saved. Each shows its graph,
no guides or marked crossing point. No hints before the answer.

1. **Read the solution** (two-field). y = x + 3 and y = −2x + 6, crossing
   at (1, 4). "Find the solution of y = x + 3 and y = −2x + 6." Answer 1,
   4, `solutionRules`.
2. **Negative values** (two-field). y = 3x + 5 and y = −x − 3, crossing at
   (−2, −1). Answer −2, −1, `solutionRules`.
3. **Estimate** (choice). y = x + 1 and y = −2x + 3, crossing at
   (2/3, 5/3). "Estimate the solution."
   - **x ≈ 0.7, y ≈ 1.7**: "Right. x is between 0 and 1, and y is between
     1 and 2."
   - x ≈ 1, y ≈ 2: "That's the nearest grid point. The lines cross a
     little left of 1 and below 2."
   - x ≈ 1.7, y ≈ 0.7: "x comes first. Read x on the x-axis, then y on
     the y-axis."
   - x ≈ 0, y ≈ 1: "(0, 1) is where y = x + 1 crosses the y-axis. It's on
     one line only."
4. **Aisha's point** (choice). y = x + 2 and y = −x + 4, crossing at
   (1, 3), with point A at (3, 5) marked large on y = x + 2 and labelled
   "A". "Aisha says A is the solution because it's on a line. What else
   must be true?"
   - **A must be on both lines.**: "Right. The values must work in both
     equations, so the point must be on both lines."
   - Nothing. Any point on a line is a solution.: "A point on one line
     only works in that line's equation. It must work in both."
   - A must be on an axis.: "The solution doesn't have to be on an axis.
     It's where the two lines cross."
   - A's coordinates must be whole numbers.: "Solutions can be decimals.
     What matters is that the point is on both lines."

Summary after the results, three points:
- "The solution of simultaneous equations works in both equations."
- "On a graph, it's where the two lines cross: the point of
  intersection."
- "Read x on the x-axis, then y on the y-axis. Write x = …, y = …."

Then **All lessons** as the main button.

## Points

The engine plans the maximum. Report it; don't hard-code it.

## Checks

- `npm test` and the full `npm run test:ui`, on your branch and on
  `origin/main`, compared (first build).
- Unit tests for `simultaneous.js`: `crossing` (whole and fraction
  answers), `onLine`, `equationText` for every case listed; every
  `solutionRules` row including skipped rows and duplicates (h = 0,
  k = 0, h = k); the generator gives three different typed kinds and
  one of each choice type, alternating, within the ranges, c from −8 to
  8, four different options on every choice card, P on one line only and
  2+ units from the crossing, the same session for the same seed.
- Update any registry test that lists lessons or skills, without
  weakening it.
- `tests/ui/simultaneous-equations-graphs.spec.cjs`: a full correct run;
  every Learn screen has no buttons, Next enabled at once, and its
  finished picture (save a 375 px screenshot of each to
  `/tmp/simultaneous-learn-1.png` … `-6.png`); reduced motion; Try it 1
  by tap (wrong then right) and by keyboard, with reload in between; Try
  it 5 wrong-then-right, with the guides appearing after the wrong
  answer and still there after reload; a wrong-then-right Practice card;
  reload in every section.
- `node --check` on every JS file; `lesson.json` valid JSON.
- In the browser, at 1280 × 800 and 375 × 812 with touch, real clicks:
  - a full run to All lessons and the homepage, on the PHP site and
    `dist/`
  - wide screens: graph left, text right, nothing scrolls sideways;
    phones: stacked
  - the key is above every graph, matches the line colours and wraps
    cleanly at 375 px; every coordinates label and the "P" / "A" labels
    are clear of the lines and the axis numbers on every screen and
    generated card (check ten Practice seeds at 375 px)
  - every rule row and wrong option shows its own feedback once
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage shows the lesson after Finding the equation of a line,
  and in the Graphs collection.
- `BASE_URL=http://localhost/maths1to9/.worktrees/simultaneous-equations-graphs/ ./build.sh`
  from inside the worktree, then commit `dist/`. `build.sh` needs `rg`;
  if it isn't installed, run `grep -rn '/maths1to9/' dist` yourself and
  report it's empty.

## Commits

1. The lesson, the three registry files, its tests and `dist/`. Commit
   this file with it.

## Report

Through the relay: the commit hash, both test results compared with
`origin/main`, every check above, the screenshot paths, the planned
maximum, template findings, and anything you couldn't do. Then wait.
