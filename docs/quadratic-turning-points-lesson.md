# Finding the turning point: lesson spec

The second of three quadratic graph lessons. Teaches one skill,
`quadratic-turning-points`: read the coordinates of a quadratic graph's
turning point and say whether it is a minimum or a maximum. Pupils
already draw quadratic graphs (`drawing-quadratic-graphs`). Roots are the
next lesson; this one doesn't mention them.

Built from the lesson template, the shared components and the shared
graph, like `drawing-quadratic-graphs`, which is the worked example: copy
its Learn pattern, its side-by-side layout and its helpers' style.

Everything this lesson needs already exists: `graph.plot`, `graph.point`
with `labelSide`, `drag: 'positions'` (a dot that jumps between listed
points, so it can slide along the curve), `graph.pick`, `graph.segment`
with `dash`, two-field number cards and choice cards. There is no Part A.
**If the lesson needs anything shared that isn't there, stop and ask.**

## Before you start

- `git fetch origin`. Check `origin/main` has `drawing-quadratic-graphs`
  with its six-screen Learn (PR #12) and side-by-side layout (PR #13). If
  not, stop and say so. Create `codex/quadratic-turning-points` from
  `origin/main`, in its own worktree.
- Don't touch the main checkout's uncommitted DfE files (listed in
  `AGENTS.md`) or `codex/speed-from-distance-time-graphs`.
- Read the rules in the order `AGENTS.md` gives, then
  `content/drawing-quadratic-graphs/` from end to end.
- Don't change shared files, the template or any other lesson. Never
  call JSXGraph from the lesson. Don't patch shared output.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Finding the turning point |
| Slug / folder | `quadratic-turning-points` (the placeholder already in `curriculum.json`) |
| Subtitle | Read the turning point of a quadratic graph and say if it's a minimum or a maximum. (as the placeholder) |
| Skill | `quadratic-turning-points` (exists) |
| Goal shown to pupils | Find the turning point of a quadratic graph. |
| Sections | Learn, Try it, Practice, Check |
| Back button | On |

- `skills.json`, `curriculum.json` and `collections.json` already have
  this lesson's skill, entry and place. Change nothing in them. Creating
  the folder makes the homepage show it.
- Map every Practice and Check question type to `quadratic-turning-points`
  in `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "turning point", "lowest point",
  "highest point", "minimum", "maximum", "opens upwards / downwards",
  "U shape", "upside-down U". Don't say "vertex", "stationary point",
  "parabola", "root" or "completing the square".
- **Pupils never see an equation.** They read graphs. The equations below
  are for building the graphs only. Accessible graph labels describe the
  shape and turning point, not the equation.
- Coordinates are `(x, y)` with a space after the comma, Unicode minus
  `−`, no-break spaces inside them.
- No KaTeX. No exam-board names or codes.
- A small `turning.js`, loaded before `interactive.js` and `questions.js`:
  - `valueOf({ a, h, k }, x)`: a(x − h)² + k, with a = 1 or −1.
  - `kind(form)`: `'minimum'` for a = 1, `'maximum'` for a = −1.
  - `turningRules(form)` (below), the choice builders and the generator.
- Question cards (Try it 2–5, Practice, Check) show their graph 320 px
  wide and centred: the engine owns the card's markup, so the lesson
  doesn't rearrange it. Learn and Try it 1 use the side-by-side layout.
- `lesson.css` only for the layout and Learn text. Copy
  `drawing-quadratic-graphs`'s `.quadratic-layout` rules (renamed
  `.turning-layout`): from 760 px, the graph 320 px wide on the left and
  the text beside it; stacked on phones. Existing tokens only.

## The graph

The shared graph, loaded in `index.php` with the four tags from
`docs/shared-graph.md`. Every graph uses:

```js
{ x: [-5, 5], y: [-5, 6], step: { x: 1, y: 1 }, label: '…' }
```

The curve is `graph.plot(x => valueOf(form, x), { domain })`, the domain
being the x-values where the curve stays inside the grid (so it never
runs into the frame). Labels: "Coordinate grid with a U-shaped curve." or
"…an upside-down U-shaped curve." (no turning point given away in Try it,
Practice or Check).

- Only the turning point ever gets a coordinates label, and only on the
  screens below that say so: `labelSide: 'below'` for a minimum, `'above'`
  for a maximum. It must not touch the curve or the axis numbers at
  375 px. If no existing option keeps it clear, stop and ask.
- **Guides**: dashed segments (`dash: true`, tone `ink`, so they show up) from the
  turning point straight to the x-axis, and straight to the y-axis.
- **The sliding dot** (Learn 1 and 3, Try it 1): a large point with
  `drag: 'positions'`, the positions being the curve at x from −5 to 5
  in steps of 0.25 (only those inside the grid). No coordinates label on
  it while it moves.

## Learn (5 screens)

Learn is for looking, exactly as in `drawing-quadratic-graphs`: the graph
first (left on wide screens), at most three short lines of text beside or
under it. **No questions, no buttons, no gating: Next is always enabled,**
mid-animation too. "In turn" means about 500 ms apart; under
`prefers-reduced-motion` and on every revisit (Back, reload), the
finished screen shows at once. Save the screen index and which screens
have been seen, as that lesson does.

1. **Where the curve turns.** y = (x − 1)² − 2. The dot starts at the left
   end of the curve and travels along it to the right (moving through the
   positions about every 60 ms), slows near the bottom, and stops at
   (1, −2). Then (1, −2) gets its label (below). While it goes down the
   line under the graph reads "Going down…", then "Going up…" after it
   passes the bottom, then nothing once it stops. Text: "Follow the curve
   from left to right. It goes down, then up." / "Where it turns is the
   **turning point**." On a revisit: the dot at (1, −2), labelled.

2. **The lowest point is a minimum.** Same curve, (1, −2) large. In turn:
   the guide down to the x-axis with "x = 1", then the guide across to the
   y-axis with "y = −2", then the label (1, −2). Text: "It's the lowest
   point on the curve, so it's a **minimum**." / "Read x first, then y:
   (1, −2)."

3. **A curve that opens downwards.** y = −(x + 2)² + 3. The dot travels up,
   then down, as screen 1 ("Going up…", "Going down…"), and stops at the
   top, (−2, 3). Then the guides in turn ("x = −2", "y = 3") and the
   label (above). Text: "This curve goes up, then down." / "Its turning
   point is the highest point, so it's a **maximum**: (−2, 3)."

4. **Shape, not position.** y = −(x − 2)² − 2, wholly below the x-axis,
   with room above the point for its label. (2, −2) large, labelled
   (above). Labels stay short: a longer "maximum (2, −2)" label gets
   pushed away from its point at 375 px. Text: "This curve is below the x-axis, but it
   still has a highest point." / "Its turning point is a **maximum**." /
   "Look at the shape, not where it is."

5. **Both together.** One grid: y = (x + 3)² − 3 and y = −(x − 3)² + 4,
   each drawn only 2.5 units either side of its turning point (clamped to
   the grid) so they read as two separate shapes. Turning points large,
   labelled "minimum" (below) and "maximum" (above). Text: "Lowest point:
   **minimum**. Highest point: **maximum**." / "Write the turning point
   as (x, y): (−3, −3) and (3, 4)."

## Try it (5 screens)

Not scored (`scored: false`), as in `drawing-quadratic-graphs`. One task
at a time; the next appears after Continue. Every screen shows its graph
(left on wide screens).

Screens 1 to 4 use y = (x + 1)² − 2 (turning point (−1, −2)).

1. **Find it.** The sliding dot, starting at the left end. Prompt: "Drag
   the dot along the curve to the turning point." Live line under the
   graph while dragging: "Going down." / "Going up." / at (−1, −2): "✓
   This is the turning point. The curve stops going down and starts going
   up." The dot turns tone `correct`, stops being draggable, and Continue
   unlocks. Keyboard: arrows move it (the shared positions behaviour).
   Save the dot's position and whether it's found.
2. **Its x-coordinate.** The turning point marked (large, no label).
   Number card: "What is its x-coordinate?" Answer −1. Rules: 1 → "Left
   of 0 is negative: the x-coordinate is −1."; −2 → "That's the
   y-coordinate. Read x on the x-axis: −1." Correct: "Right. It lines up
   with −1 on the x-axis." After a correct answer, the guide to the x-axis
   appears.
3. **Its y-coordinate.** The x guide kept. Number card: "What is its
   y-coordinate?" Answer −2. Rules: 2 → "Below 0 is negative: the
   y-coordinate is −2."; −1 → "That's the x-coordinate. Read y on the
   y-axis: −2." Correct: "Right. It lines up with −2 on the y-axis." Then
   the y guide and the label (−1, −2).
4. **Minimum or maximum?** Choice:
   - **Minimum**: "Right. It's the lowest point on the curve."
   - Maximum: "A maximum is the highest point. This turning point is the
     lowest point, so it's a minimum."
5. **Now with less help.** y = −(x − 2)² + 4, no guides, no marked point.
   Two-field card (fields `x` and `y`, labelled "x-coordinate" and
   "y-coordinate"): "Write the coordinates of the turning point." Answer
   2, 4, `turningRules`. Then choice "Is it a minimum or a maximum?":
   - **Maximum**: "Right. It's the highest point on the curve."
   - Minimum: "A minimum is the lowest point. This curve opens downwards,
     so its turning point is the highest point: a maximum."

## Feedback rules

### `turningRules({ a, h, k })`

Two-field cards, fields `x` and `y`, answer h and k. Rules in this order;
skip any whose value equals the answer or an earlier rule's value, or
that can't apply:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| `{ x: k, y: h }` | h ≠ k | "Write the x-coordinate first, then the y-coordinate: (2, 4)." |
| `{ x: −h, y: −k }` | h ≠ 0, k ≠ 0 | "Check both signs. Left of 0 and below 0 are negative." |
| `{ x: −h }` | h ≠ 0 | "Check the x sign. Left of 0 is negative." (or "Right of 0 is positive.") |
| `{ y: −k }` | k ≠ 0 | "Check the y sign. Below 0 is negative." (or "Above 0 is positive.") |
| `{ x: 0, y: valueOf(form, 0) }` | h ≠ 0, the value is inside the grid | "That's where the curve crosses the y-axis. The turning point is where the curve turns." |
| `{ x: h }` | always | "The x-coordinate is right. Now read y: go across from the point to the y-axis." |
| `{ y: k }` | always | "The y-coordinate is right. Now read x: go down or up from the point to the x-axis." |

Fallback: "Find where the curve turns. Read x on the x-axis, then y on
the y-axis."

## Practice

Endless generator through `runQuestionSet`, `session_length` 6: three
typed cards and three choice cards, alternating (typed first), options
shuffled by the seeded helpers. Every card shows its graph (left on wide
screens) and no guides or labels.

Forms: a = 1 or −1 (half and half by seed); h from −3 to 3; k from −4 to
2 when a = 1, from −2 to 4 when a = −1; h ≠ k; not both 0. Across a
session, at least one minimum above the x-axis (a = 1, k > 0) or maximum
below it (a = −1, k < 0), by seed.

### Typed

Three `read-point` cards per session, all different forms: the two-field
card "Write the coordinates of the turning point." with `turningRules`.
Correct: "Right. The turning point is (2, 4)."

### Choice

One of each per session. Drop any wrong option that comes out the same as
another option or the answer.

**`type`**: "Is the turning point a minimum or a maximum?"

| Option | Feedback |
|---|---|
| **Minimum** (a = 1) / **Maximum** (a = −1) | "Right. It's the lowest point on the curve." / "Right. It's the highest point on the curve." |
| Maximum (a = 1) | "A maximum is the highest point. This curve's turning point is its lowest point." + when k < 0: nothing more; when k > 0: " Being above the x-axis doesn't make it a maximum." |
| Minimum (a = −1) | "A minimum is the lowest point. This curve's turning point is its highest point." + when k < 0: " Being below the x-axis doesn't make it a minimum." |

**`which-point`**: "Which point is the turning point?"

| Option | Feedback |
|---|---|
| **(h, k)** | "Right." |
| (k, h) (swapped) | "x comes first, then y: (h, k)." |
| (−h, k) or (h, −k), by seed (sign) | "Check the signs. Left of 0 and below 0 are negative." |
| (0, value at x = 0) (y-axis crossing; only if h ≠ 0 and inside the grid) | "That's where the curve crosses the y-axis. The turning point is where it turns." |

**`why`**: "How can you tell the turning point is a maximum?" (or
"minimum")

| Option | Feedback |
|---|---|
| **It's the highest point on the curve.** (or lowest) | "Right." |
| It's above the x-axis. (or below) | "Where it sits doesn't decide it. Look at the shape: is it the highest or lowest point?" |
| Its x-coordinate is positive. (or negative, matching h; skip if h = 0) | "The coordinates don't decide it. Look at the shape of the curve." |

## Check

Five fixed questions in `questions.js` (two typed, three choice), through
the shared card, options shuffled once and saved. Each shows its graph,
no guides or labels. No hints before the answer.

1. **Read the graph** (two-field). y = (x + 2)² + 1. "Write the
   coordinates of the turning point." Answer −2, 1, `turningRules`.
2. **Minimum or maximum?** (choice) Same graph. The `type` options for
   a = 1, k = 1 (so "Maximum" carries the "above the x-axis" sentence).
3. **Amira's answer** (choice). y = −(x + 3)² + 2. "Amira says the turning
   point is (2, −3). What has she done wrong?"
   - **She has swapped x and y. It's (−3, 2).**: "Right. x comes first:
     −3, then y: 2."
   - Nothing. (2, −3) is right.: "Read x first: the point lines up with
     −3 on the x-axis, and 2 on the y-axis. It's (−3, 2)."
   - She has the signs wrong. It's (−2, 3).: "The signs are the same as
     hers. She has written them in the wrong order: it's (−3, 2)."
4. **Ben's claim** (choice). y = −(x − 1)² − 2. "Ben says the turning point
   is below the x-axis, so it must be a minimum. Is he right?"
   - **No. It's the highest point on the curve, so it's a maximum.**:
     "Right. Look at the shape, not where it is."
   - Yes. Below the x-axis means a minimum.: "Where it sits doesn't
     decide it. It's the highest point on the curve, so it's a maximum."
   - Yes, because its y-coordinate is negative.: "The coordinates don't
     decide it. It's the highest point on the curve: a maximum."
5. **Read the graph** (two-field). y = −(x + 1)² + 4. Answer −1, 4,
   `turningRules`.

Summary after the results, three points:
- "The turning point is where the curve changes between going down and
  going up."
- "Write it as (x, y): x first."
- "Lowest point: minimum. Highest point: maximum."

Then **All lessons** as the main button.

## Points

The engine plans the maximum. Report it; don't hard-code it.

## Checks

- `npm test` and the full `npm run test:ui`, on your branch and on
  `origin/main`, compared (first build).
- Unit tests for `turning.js`: `valueOf`, `kind`; every `turningRules` row
  including skipped rows, duplicates and the y-axis crossing outside the
  grid; the generator gives three different typed forms and one of each
  choice type, alternating, within the ranges, the "position trap" in
  every session, no duplicate options, the same session for the same
  seed.
- `tests/ui/quadratic-turning-points.spec.cjs`: a full correct run; every
  Learn screen has no buttons, Next enabled at once, and its finished
  picture (save a 375 px screenshot of each to
  `/tmp/turning-learn-1.png` … `-5.png`); reduced motion; Try it 1 by
  drag and by keyboard, with reload mid-drag; a wrong-then-right Try it 2;
  a wrong-then-right Practice card; reload in every section.
- `node --check` on every JS file; `lesson.json` valid JSON.
- In the browser, at 1280 × 800 and 375 × 812 with touch, real clicks:
  - a full run to All lessons and the homepage, on the PHP site and
    `dist/`
  - wide screens: graph left, text right, nothing scrolls sideways;
    phones: stacked
  - the sliding dot stays on the curve, and the turning-point label never
    touches the curve or axis numbers
  - Learn 5's two labels are clear of each other and both curves
  - every rule row and wrong option shows its own feedback once
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage shows the lesson after Drawing quadratic graphs, and in
  the Graphs collection.
- `BASE_URL=http://localhost/maths1to9/.worktrees/<your worktree>/ ./build.sh`
  from inside the worktree, then commit `dist/`. `build.sh` needs `rg`;
  if it isn't installed, run `grep -rn '/maths1to9/' dist` yourself and
  report it's empty.

## Commits

1. The lesson, its tests and `dist/`. Commit this file with it.

## Report

Through the relay: the commit hash, both test results compared with
`origin/main`, every check above, the screenshot paths, the planned
maximum, template findings, and anything you couldn't do. Then wait.
