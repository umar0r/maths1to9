# Finding the gradient: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph, like `horizontal-and-vertical-lines`.
Teaches one skill: finding the gradient of a straight line from its graph,
as vertical change ÷ horizontal change. y = mx + c, finding equations,
gradient as a rate in context and vertical lines are other lessons.

The graph is the main teaching tool. Pupils see the change across and the
change up or down as arrows, draw the triangle themselves, and read the
scale on the axes. Every typed answer can be a whole number, a fraction or
a decimal.

The work is in two parts on one branch. **Part A** adds small, opt-in
features to the question card and the shared graph that this lesson (and
the next graph lessons) need. **Stop after Part A for review.** Part B,
the lesson, comes after approval.

## Before you start

- Check `main` has the shared graph (`assets/js/graph.js` with the
  `labelSide` point option) and the `horizontal-and-vertical-lines`
  lesson. If not, stop and say so. Then create
  `codex/finding-the-gradient` from `main`.
- Read, in this order: `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/custom-answer-widget.md`, `docs/lesson-scoring.md`,
  `docs/retain-completed-work.md`, `docs/shared-graph.md`. Look at
  `content/horizontal-and-vertical-lines/` as the worked example of a
  graph lesson.
- Outside Part A, don't change `lesson-engine.js`, `app.css`,
  `progress.js`, `graph.js`, `graph.css`, the template or any other
  lesson. Never call JSXGraph from the lesson. If the lesson needs
  something Part A doesn't give it, stop and ask; don't build your own
  version and don't patch shared output from the lesson.
- Leave this file unchanged.

---

# Part A: shared additions

All opt-in and backward compatible: every existing lesson must behave
exactly as before. Readable code in the engine's style, no minified
one-liners.

## A1. Question card: fractions and a figure (one commit)

In `createQuestion` (`assets/js/lesson-engine.js`), and so also in
`runQuestionSet` definitions. Update `docs/shared-lesson-components.md`'s
question card section to document both.

### `fractions: true` (number input only)

```js
{ input: 'number', fractions: true, answer: '-1/2',
  rules: [{ value: '1/2', feedback: 'Read from left to right. Does the line rise or fall?' }],
  fallback: '…' }
```

- Accepts a whole number, a decimal or a fraction `a/b`, with an optional
  minus in front (`-`, `−`, `–`) and spaces anywhere: `3`, `-2`, `0.5`,
  `1/2`, `−3/4`, `6/4`, `- 1 / 2`. A minus on the bottom (`1/−2`) is also
  accepted. Mixed numbers (`1 1/2`), `b = 0`, `1/2/3` and anything else
  are invalid.
- Compares by **exact value**, using whole-number arithmetic (cross
  multiply; turn a decimal into a fraction from its digits). Never compare
  floats: `0.5`, `1/2`, `2/4` and `3/6` all equal `1/2`; `0.33` does not
  equal `1/3`. `answer` and each rule's `value` are given in the same
  format and compared the same way.
- `exact: true` can't be combined with it; throw a `TypeError`.
- The saved value and the results row show what the pupil typed, tidied:
  spaces removed, the minus shown as `−`. `6/4` stays `6/4`.
- The invalid message becomes "Type a number or a fraction, like 3 or
  1/2."
- The input uses `inputMode = 'text'` (with autocomplete, autocorrect and
  autocapitalise off, spellcheck false), because the phone decimal keypad
  has no `/` and on iPhone no minus. Leave plain number cards as they are.
- Unit tests next to the existing card tests: every accepted form above,
  every invalid form, equal values, `0.33` vs `1/3`, rules by value, the
  `exact` error, and the tidied results text.

### `figure(host, { readOnly })`

```js
{ prompt: 'Work out the gradient of the line.', input: 'number', fractions: true,
  figure(host, { readOnly }) { /* draw a graph into host */ } }
```

- Optional, for any input type. The engine creates one host between the
  prompt and the answer area and calls `figure` once each time the card is
  rendered (including read-only cards and after reload). `readOnly` is
  true for a finished card.
- The engine saves nothing for it. A figure is a picture (and, here, a
  scratch area); its own state is the lesson's business.
- A graph in the host frees itself when the card is removed (the shared
  graph already does this), so no disposal hook is needed.
- One unit test (figure called with the host, before the input, with
  `readOnly`) and check it works inside `runQuestionSet` with Practise
  again.

Bump the engine's `?v=` the way the repo does for engine changes.

## A2. Shared graph additions (one commit)

In `assets/js/graph.js` and `graph.css`. Update `docs/shared-graph.md`'s
API section to document each one. Bump `graph.js` / `graph.css` `?v=` in
every lesson that loads them (today only `horizontal-and-vertical-lines`).

1. **Axis steps.** `create(host, { x: [-6, 6], y: [-12, 12], step: { x: 1, y: 2 } })`.
   Default step 1 each way. One grid line per step, and every grid line
   labelled with its value in units (`labelEvery` still counts grid lines).
   Each grid square stays square on screen: the board's shape comes from
   the number of squares each way, not the units. Everything else (points,
   lines, `plot`, `drawLine`, dragging) still takes **units**. Snapping
   goes to the nearest grid corner in units, so `snap` takes an optional
   step: `snap([1.2, 3.1], { x: 1, y: 2 })` → `[1, 4]`. Existing calls are
   unchanged.

2. **Arrows.** `graph.arrow(from, to, { tone, label, labelSide, dash })`,
   returning an item like the others. A straight segment with an
   arrowhead at `to`, 3 px, thinner than a drawn line so the line itself
   stands out. Its label (for example "3 right", "6 down") sits at the
   middle of the arrow: below a horizontal arrow and right of a vertical
   arrow by default; `labelSide` (`'above' | 'below' | 'left' | 'right'`)
   overrides it, flipping to the other side if there's no room, as point
   labels do. Labels never sit on the arrow or the line it measures.

3. **A dark tone.** `tone: 'ink'` uses `--text`, for arrows and helper
   lines. No new colour values.

4. **Dashed segments.** `graph.segment(from, to, { dash: true })` and the
   same on `arrow`.

5. **Dragging between set positions.** `graph.point(value, { drag: 'positions', positions: [[1, 3], [2, 5], [3, 7]], onMove })`.
   The point jumps to the listed position nearest the pointer. Keyboard
   (the graph's single draggable point, as now): Right or Up goes to the
   next position in the list, Left or Down to the previous. `onMove` is
   called once per change, as now.

6. **`drawLine` options.**
   - `movable: false`: pressing near the drawn line draws a new line
     instead of moving it; Shift + arrow does nothing. Default `true`.
   - `tone(line, { finished })`: the second argument says whether the
     pupil has released. A lesson that wants neutral while dragging and
     red or green on release returns `'neutral'` until `finished`.
     Existing lessons ignore the argument and keep live colour.

Tests in `tests/shared-graph.test.cjs`: `snap` with a step, including
negatives and halfway points. The browser checks below cover the rest.

## Part A checks

- `npm test` and `npm run test:ui` both pass, compared with `main`.
- `node --check` on every changed JS file.
- `horizontal-and-vertical-lines` works exactly as before: one full run,
  live red/green while dragging, moving a line.
- A throwaway page (not committed) with: a graph with `step: { x: 1, y: 2 }`
  (labels 2, 4, 6… on the y-axis, square grid squares at 375 px); two
  arrows with labels on each side; a dashed segment; a `positions` point
  moved by mouse, touch emulation and arrow keys; a `drawLine` with
  `movable: false`, `extend: false`, `minLength: 1` and neutral-until-
  release tone; and a `fractions` number card with a `figure`, including
  wrong-then-right, reload in each phase, Back to the read-only card, and
  a phone-sized check that the keyboard offers `/` and `−`.
- `./build.sh`, commit `dist/`.

Report the commit hashes and these checks, **then stop for review.**

---

# Part B: the lesson

## The lesson

| | |
|---|---|
| Title | Finding the gradient |
| Slug / folder | `finding-the-gradient` |
| Subtitle | Work out how steep a straight line is from its graph. |
| Skill | `calculate-gradient` (already in `skills.json`) |
| Goal shown to pupils | Find the gradient of a straight line by measuring how far it goes across and up or down. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`: add `"horizontal-vertical-lines"` to
  `calculate-gradient`'s `recommended_prerequisites` (the flat-line
  screen uses it). Change nothing else there.
- `content/curriculum.json`: add an entry in the Algebra category straight
  before `gradient-and-intercept`: folder `finding-the-gradient`, the
  title and subtitle above, skills `["calculate-gradient"]`. Remove
  `calculate-gradient` from `gradient-and-intercept`'s skills (one skill,
  one lesson). Leave the other entries alone.
- `content/collections.json`: add `finding-the-gradient` to `graphs`,
  straight before `gradient-and-intercept`.
- Map every Practice and Check question type to `calculate-gradient` in
  `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. "Horizontal change (across)" and
  "vertical change (up or down)", with the bracket the first time on each
  screen. Arrow labels say "3 right", "6 up", "6 down". Say "the line",
  never "the graph of". Don't say "rise", "run", "slope" or "Δ".
- The rule, always in this form: gradient = vertical change ÷ horizontal
  change. Always read the line **from left to right**.
- No exam-board names or codes anywhere.
- Minus is the Unicode minus `−`. Coordinates are `(x, y)` with a space
  after the comma. Use no-break spaces inside short equations and
  coordinates so they never wrap, as the last lesson does.
- **Learn screens:** maths with KaTeX (turn it on in `index.php`), one
  `katex.render()` per expression, fractions as `\frac{6}{3}`.
- **Question prompts, options, feedback, graph labels and results rows:**
  plain text: `6 ÷ 3 = 2`, fractions as `1/2`, `−1/2`.
- A small `gradient.js`, loaded before `interactive.js` and
  `questions.js`, holds the lesson's shared helpers: `fraction(p, q)`
  (simplified plain text, `−1/2`), `changeLabels(from, to)` (the arrow
  texts), `wrongAnswerRules(...)` (below) and the practice generator. No
  graph CSS in the lesson.

## The graph

Every graph is the shared graph. Load it in `index.php` with the four tags
from `docs/shared-graph.md`, before the lesson's scripts. Defaults (−6 to
6, step 1) unless a screen says otherwise. Every graph has a `label` that
says what it shows, including the two marked points, for example
"Coordinate grid. A straight line through (1, −2) and (4, 4)." In Practice
and Check the label names two points on the line but **never the
gradient**.

Every marked or named point sits inside −5 to 5 on the default grid (never
on the edge, never off it). In Learn and Try it, keep each triangle on one
side of the y-axis so its labels stay clear of the axis numbers. Given lines use `graph.line({ m, c })`, tone
neutral. Marked points are
large, with coordinates. Arrows use tone `ink`. Under
`prefers-reduced-motion`, everything that "appears in turn" appears at
once.

## Learn (7 screens)

Each screen is one idea, with the graph first and at most three short
lines of text under it. Next is always available (Learn is for looking).

1. **How steep is a line?** Line y = 2x, points (0, 0) and (1, 2).
   Arrows appear in turn: (0, 0) → (1, 0) "1 right", then (1, 0) → (1, 2)
   "2 up". Text: "The **gradient** tells you how far a line goes up for
   every 1 across." "This line goes up 2 for every 1 across. Its gradient
   is 2."

2. **Measure a bigger step.** Line y = 2x − 1, points (1, 1) and (3, 5).
   Arrows in turn: "2 right", "4 up". Text: "Up 4 for 2 across is the same
   as up 2 for every 1 across." Then the rule in KaTeX:
   gradient = vertical change ÷ horizontal change, as
   `\text{gradient} = \dfrac{\text{vertical change}}{\text{horizontal change}} = \dfrac{4}{2} = 2`.

3. **Any two points.** Line y = 2x − 5. Fixed point (1, −3); the second
   point drags between (2, −1), (3, 1), (4, 3) and (5, 5)
   (`drag: 'positions'`), starting at (2, −1). The arrows and a KaTeX
   line under the graph update with it: 2/1 = 2, 4/2 = 2, 6/3 = 2,
   8/4 = 2. Text: "Drag the point. The triangle grows, but the gradient
   stays 2." Then, after the pupil has moved it at least once: "A straight
   line has the same gradient all the way along." Save the point's
   position (section state) so reload and Back keep it.

4. **Fractions.** Line y = ½x, points (2, 1) and (4, 2). Arrows "2 right",
   "1 up". KaTeX: 1/2 = 0.5. Text: "It goes up half a unit for every 1
   across. A gradient can be a fraction."

5. **Going down.** Line y = −2x + 9, points (2, 5) and (5, −1). Arrows
   "3 right" (label above), "6 down". KaTeX: −6/3 = −2. Text: "Read from
   left to right. Going down makes the vertical change negative." "Up:
   positive gradient. Down: negative gradient."

6. **Flat.** Line y = 3, points (0, 3) and (4, 3). Arrow "4 right" only.
   KaTeX: 0/4 = 0. Text: "A horizontal line (across) doesn't go up or
   down. Its gradient is 0."

7. **Read the scale.** Graph with `y: [-12, 12]`, `step: { x: 1, y: 2 }`.
   Line y = 2x, points (0, 0) and (3, 6). Arrows "3 right", "6 up" (both
   three squares long). Text: "Here one square up is 2 units." "Count the
   numbers on the axes, not the squares." KaTeX: 6/3 = 2.

Learn has no scored questions. Save the screen index as the template does.

## Try it (4 screens)

Not scored (`scored: false`). Typed answers use question cards with
`fractions: true` and a `figure` for the graph, so the engine runs Check
→ Try again → Continue. Cards appear one at a time under the graph; the
next appears after Continue.

### 1. Build the triangle

Line y = 2x − 4, points (1, −2) and (4, 4). No arrows, no lengths shown.

**Step a**, prompt above the graph: "Start at the left point, (1, −2).
Draw across to the right until you're directly below (4, 4)." `drawLine`
with `extend: false`, `minLength: 1`, `movable: false`, tone neutral
while dragging and red or green on release, label none. Under the graph,
one feedback line (the shared `question-feedback is-correct /
is-incorrect` classes), changed only on release:

| Pupil draws | Tone | Feedback |
|---|---|---|
| (1, −2) to (4, −2), either direction | correct | "✓ That's the horizontal change." |
| along the line, (1, −2) to (4, 4) | incorrect | "That's the line itself. Draw across first, then up." |
| horizontal from (1, −2), too short | incorrect | "Keep going until you're directly below (4, 4)." |
| horizontal from (1, −2), too long | incorrect | "Stop directly below (4, 4)." |
| horizontal, not from (1, −2) | incorrect | "Start at the left point, (1, −2)." |
| anything else | incorrect | "Draw straight across, keeping the same height as (1, −2)." |

A new line replaces a wrong one straight away. When step a is right, the
leg stays as a plain `segment` (tone correct) and step b starts.

**Step b**: "Now draw up to (4, 4)." Same tool and rules for (4, −2) to
(4, 4): correct "✓ That's the vertical change."; from (4, −2) but too
short/long "Keep going up to (4, 4)." / "Stop at (4, 4)."; vertical but
not from (4, −2) "Start where your horizontal line ended, (4, −2).";
along the line "That's the line itself. Draw up from (4, −2)."; anything
else "Draw straight up from (4, −2)."

The main button is Next, disabled until both legs are right. Save both
legs in section state.

**Then three cards**, in turn:
- "How far across did you go? (horizontal change)" answer `3`. Rules: `4`
  "That's the x-coordinate of (4, 4). Count the squares from 1 to 4."
- "How far up did you go? (vertical change)" answer `6`. Rules: `4`
  "That's the y-coordinate of (4, 4). Count from −2 up to 4."
- "What is the gradient?" answer `2`. Rules: `1/2` "Divide the vertical
  change by the horizontal change."; `6` "That's the vertical change.
  Divide it by the horizontal change."; `18` "Divide, don't multiply."
  Correct: "Right. 6 ÷ 3 = 2. We measure across and up, not the sloping
  side."

After the last card is right, the legs get labels "3 right" and "6 up".

### 2. A fraction

Line y = ½x + ½, points (1, 1) and (5, 3) marked. The figure includes the
**helper triangle** (below). Prompt: "Find the gradient of the line." Answer
`1/2`. Rules from `wrongAnswerRules` (its reversed rule already covers `2`)
plus `4` "That's the horizontal change. Divide the vertical change by it."
Correct: "Right. 2/4 = 1/2. A bigger triangle, the same gradient as on the
Learn screen."

### 3. Going down

Points (0, 3) and (4, 1) marked, line y = −½x + 3, helper triangle on.
Answer `-1/2`. Rules from `wrongAnswerRules`, plus `2` "Divide the
vertical change by the horizontal change, and read from left to right."
Correct: "Right. It goes 4 right and 2 down: −2 ÷ 4 = −1/2."

### 4. Read the scale

Graph `y: [-12, 12]`, `step: { x: 1, y: 2 }`. Points (0, 2) and (2, 10),
line y = 4x + 2, helper triangle on. Two cards:
- "What is the vertical change?" answer `8`. Rules: `4` "That's 4
  squares. Each square up is 2 units."
- "What is the gradient?" answer `4`. Rules from `wrongAnswerRules`
  (including the scale rule, which gives `2`).

### The helper triangle

Used in Try it 2–4, Practice and Check 1, 4 and 5, inside the card's
`figure` when the card isn't read-only. Under the graph: "Draw from one
point on the line to another to see the triangle." It's a `drawLine` with
`extend: false`, `minLength: 1`, `movable: false`, tone always neutral:

- If both ends are on the given line (and different), the lesson draws
  the two legs as dashed `ink` segments (across from the left end, then
  up or down), **with no numbers**.
- Otherwise the drawn line is removed and the graph's live line says:
  "Start and end on the line, where it crosses grid corners."

It's scratch: not saved, not marked, not shown in results. Reload clears
it.

## Wrong-answer rules

`wrongAnswerRules({ p, q, step })` in `gradient.js`, for a gradient
p/q (q > 0) and the graph's `step` when it isn't 1 each way. Rules in this order; drop any
rule whose value equals the answer or an earlier rule:

| Value | Feedback | When |
|---|---|---|
| q/p | "Divide the vertical change by the horizontal change." | p ≠ 0 |
| −p/q | "Read from left to right. Does the line rise or fall?" | p ≠ 0 |
| the squares answer: (p ÷ step.y) / (q ÷ step.x) | "Check how many units each square stands for on the axes." | scale graphs |
| rounded decimals of a third or two-thirds answer (1 and 2 decimal places, with the answer's sign) | "Close, but that's rounded. Write it as a fraction, like 1/3." | q = 3 |

Fallback for any other wrong answer: "Pick two points where the line
crosses grid corners. Count across, then up or down, and divide."
Correct feedback, from p and q: "Right. The line goes up 3 for every 1
across." / "Right. It goes up 1 for every 2 across." / "Right. It goes
down 2 for every 1 across, so the gradient is negative." / "Right. The
line is flat, so its gradient is 0."

Check the rules in a quick script (not committed): for every Practice
gradient, every rule's value is a wrong answer and no two are equal.

## Practice

The template's question set, `version: 1`, Practise again on,
`session_length` 6. One question type per item, seeded like the last
lesson. Each question: prompt "Work out the gradient of the line.", a
number card with `fractions: true`, and a `figure` with the line (no
marked points) and the helper triangle. Never show the gradient, arrows
or lengths before Check.

| n | Type | Gradients |
|---|---|---|
| 1 | `positive-whole` | 1, 2, 3 |
| 2 | `positive-fraction` | 1/2, 1/3, 1/4, 2/3, 3/2 |
| 3 | `negative-whole` | −1, −2, −3 |
| 4 | `negative-fraction` | −1/2, −1/3, −1/4, −2/3, −3/2 |
| 5 | `flat` | 0 (y = c, c from −5 to 5, not 0) |
| 6 | `scale` | 1, 2, 3, −2 on a graph with `y: [-12, 12]`, `step: { x: 1, y: 2 }` |

The generator picks the gradient, then a grid corner A and a second
corner B = A + k(q, p), both inside −5 to 5 (−10 to 10 vertically on the
scale graph, on whole grid corners), at least 2 apart across. The line
runs through them across the whole grid. The graph label names A and B.

## Check

Five fixed questions in `questions.js`, through the shared card as the
template does, choice options shuffled once and saved. Graphs go in the
card's `figure`.

1. **Calculate** (number, fractions). Line through (1, −2) and (5, 4),
   y = 1.5x − 3.5, no marked points, helper triangle on. Answer `3/2`.
   `wrongAnswerRules` plus `6` "That's the vertical change. Divide it by
   the horizontal change." Correct: "Right. 6 ÷ 4 = 3/2, or 1.5."

2. **Amir's mistake** (choice). Line through (0, 5) and (3, −1), both
   marked, read-only. Prompt: "Amir says: 'The line goes 6 vertically and
   3 horizontally, so its gradient is 2.' What has Amir missed?"
   - **"The line goes down, so the vertical change is −6. The gradient is
     −2."**: "Right. Read from left to right: the line falls, so the
     gradient is negative."
   - "He should divide 3 by 6. The gradient is 1/2.": "Amir divided the
     right way round: vertical ÷ horizontal. Look at which way the line
     goes."
   - "Nothing. The gradient is 2.": "Read the line from left to right.
     Does it go up or down?"
   - "The vertical change is 5, so the gradient is 5/3.": "5 is where the
     line crosses the y-axis. From (0, 5) down to (3, −1) is 6 units."

3. **Two triangles** (choice, no graph). Prompt: "On the same straight
   line, one triangle goes up 2 for 4 across. A bigger one goes up 3 for
   6 across. Do they give the same gradient?"
   - **"Yes. 2 ÷ 4 and 3 ÷ 6 both equal 1/2."**: "Right. A straight line
     has the same gradient everywhere."
   - "No. The bigger triangle gives a bigger gradient.": "Both changes
     grew together. 3 ÷ 6 = 1/2, the same as 2 ÷ 4."
   - "Yes. Both equal 2.": "Divide the vertical change by the horizontal
     change: 2 ÷ 4, not 4 ÷ 2."

4. **Read the scale** (number, fractions). Graph `x: [-12, 12]`,
   `y: [-6, 6]`, `step: { x: 2, y: 1 }` (the across axis goes up in 2s this
   time). Line through (−4, 1) and (4, 5), y = ½x + 3, helper triangle on.
   Answer `1/2`. `wrongAnswerRules` (its scale rule gives `1`, from
   counting squares).

5. **Flat line** (number). Line y = −2, helper triangle on. Answer `0`.
   Fallback: "The line doesn't go up or down, so its vertical change is
   0."

Summary after the results (the template's summary block), three points:
- "Gradient = vertical change ÷ horizontal change."
- "Read from left to right: going down gives a negative gradient."
- "Count the units on the axes, not the squares."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and `npm run test:ui` both pass, compared with `main`.
- Add `tests/ui/finding-the-gradient.spec.cjs`: a full correct run
  through all four sections; Try it 1's triangle drawn by mouse with one
  wrong leg first; a wrong-then-right Practice answer typed as an
  equivalent fraction (`2/4` for 1/2) and as a decimal; reload mid-Try it
  1 with one leg drawn.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and touch emulation):
  - a full run ending on All lessons and the homepage, on the PHP site and
    the built `dist/` site
  - every row of the Try it 1 tables drawn by hand, neutral while
    dragging, colour only on release; one leg drawn by keyboard only
  - the helper triangle: on the line, off the line, by tap-tap
  - Learn 3: the point by drag and arrow keys; reload keeps it
  - arrows appear in turn, and at once with reduced motion
  - no arrow label sits on a line or another label, at 375 px too
  - the scale graphs: square grid squares, labels in 2s, at 375 px
  - no Practice or Check graph label, figure or live text gives the
    gradient before Check
  - every `wrongAnswerRules` row shows its feedback once
  - reload in every section and phase; Back from every screen and Next
    forward again
  - Practise again twice, then reload; score unchanged
  - KaTeX not cut off at 375 px; no console errors
- The homepage lists the lesson under Algebra, straight before Gradient
  and intercept, and in the Graphs collection.
- `./build.sh`, then commit `dist/`.

## Commits

1. Part A1: question card `fractions` and `figure`.
2. Part A2: shared graph additions.
3. Part B: the lesson (with `skills.json`, `curriculum.json`,
   `collections.json`, the browser test and `dist/`). Commit this file
   with it.

## Report

- After Part A: both commit hashes, both test results compared with
  `main`, and the Part A checks. Then stop.
- After Part B: the commit hash, both test results, every check above,
  and the planned maximum score.
- **Template findings:** every place you had to go beyond the template,
  the shared components or the shared graph, every `CHANGE:` marker that
  was unclear, and anything you'd change. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
