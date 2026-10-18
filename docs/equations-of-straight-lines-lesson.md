# Using y = mx + c: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph, like `gradient-and-intercept`. Teaches
one skill, `use-y-mx-c`: working with a straight-line equation that isn't
written as y = mx + c yet. Pupils rearrange it into y = mx + c (to read the
gradient and y-intercept) and check whether a point lies on the line by
substituting its coordinates.

Pupils already read m and c from y = mx + c (`gradient-and-intercept`).
This lesson doesn't teach that again: it says it in one line, then uses
it. Parallel lines and finding an equation from a point or two points are
the next two lessons (placeholders added below).

The hands-on tool in Learn is an **equation workbench**: pupils choose
what to do to both sides and watch every term change. The graph shows
that a rewritten equation is still the same line, and where a point sits
compared with the line.

Everything this lesson needs already exists: two-box answer cards
(`fields`), choice cards, `runQuestionSet` with mixed cards, and the
shared graph with `labelSide`. There is no Part A. **If the lesson needs
anything shared that isn't there, stop and ask.**

## Before you start

- Check `main` has the `gradient-and-intercept` lesson (PR #9). If not,
  stop and say so. Then create `codex/equations-of-straight-lines` from
  `main`.
- The working tree on `main` may have uncommitted files about DfE subject
  content (`content/gcse-subject-content.json`, `scripts/`,
  `docs/lesson-content-links.md`, `tests/subject-content.test.cjs`,
  changes to `.gitignore` and `tests/lessons.test.cjs`). They are not part
  of this work. Don't change, commit or delete them. If they get in the
  way of switching branch or of the tests, stop and ask.
- Read, in this order: `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/custom-answer-widget.md`, `docs/lesson-scoring.md`,
  `docs/retain-completed-work.md`, `docs/shared-graph.md`. Look at
  `content/gradient-and-intercept/` as the worked example (its
  `equations.js`, two-field cards and Learn screens are the closest match).
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, `graph.js`,
  `graph.css`, the template or any other lesson. Never call JSXGraph from
  the lesson. Don't patch shared output from the lesson.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Using y = mx + c |
| Slug / folder | `equations-of-straight-lines` (the placeholder already in `curriculum.json`) |
| Subtitle | Rearrange a line's equation into y = mx + c and check if a point is on it. |
| Skill | `use-y-mx-c` (exists) |
| Goal shown to pupils | Rewrite a straight-line equation as y = mx + c, and check whether a point lies on the line. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`: in `use-y-mx-c`, set `recommended_prerequisites`
  to `["read-gradient-intercept","solve-two-step-equations","substitute-expressions"]`.
  Change nothing else in it.
- `content/curriculum.json`: the `equations-of-straight-lines` entry gets
  the title and subtitle above and skills `["use-y-mx-c"]`. Its position
  stays. Straight after it, add two placeholders, written exactly like the
  other placeholder entries (for example `coordinates-and-linear-graphs`):
  - `{"folder":"parallel-lines","title":"Parallel lines","subtitle":"Spot parallel lines from their gradients.","skills":["parallel-lines"]}`
  - `{"folder":"finding-the-equation-of-a-line","title":"Finding the equation of a line","subtitle":"Write y = mx + c from a gradient and a point, or from two points.","skills":["equation-line-from-information"]}`
- `content/collections.json`: in `graphs`, add `parallel-lines` then
  `finding-the-equation-of-a-line` straight after
  `equations-of-straight-lines`.
- The homepage skips curriculum entries with no folder (like the other
  placeholders), so the two new entries stay hidden until their lessons are
  built. Don't create folders or "coming soon" pages for them. If a test
  breaks on the new entries, stop and ask.
- Map every Practice and Check question type to `use-y-mx-c` in
  `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "the line", "both sides", "y on its
  own", "the x term", "every term", "the number added or subtracted".
  Don't say "coefficient", "constant", "subject", "inverse operation",
  "transpose", "satisfy" or "LHS/RHS". Say "left side" and "right side".
- **Never** "move it across and change the sign". Every step is an
  operation done to both sides, shown on both sides.
- Always "y-intercept", never "intercept" on its own.
- No exam-board names or codes anywhere.
- Minus is the Unicode minus `−`; the operation "subtract" may be written
  "− 4". Coordinates are `(x, y)` with a space after the comma. No-break
  spaces inside equations and coordinates so they never wrap.
- A negative number put in for a letter goes in brackets: `3 × (−2) + 1`.
- **No KaTeX** (don't load it). Equations are HTML in Learn (x and y in
  italics) and plain text in prompts, options, feedback and results.
  Division is shown as `÷ 2` after each term, never as a fraction bar.
- A small `equations.js`, loaded before `interactive.js` and
  `questions.js`, holds the lesson's helpers:
  - `lineText({ k, d, p, q })`: plain text for ky + d = px + q, tidy:
    `y − 3 = 2x`, `2y = 4x + 6`, `2y + 4 = 6x`, `y = −x + 4`, `y = 3x`.
    k = 1 shows `y`; a coefficient of 1 or −1 shows `x` / `−x`; zero terms
    are left out; never `+ −`.
  - `reorderedText(m, c)`: `y = 7 − 3x`, `y = −2 + x` (number first).
  - `lineHtml(…)`: the same as HTML, for Learn.
  - `rearrangeRules(form)` and `pointRules(form, point)`: below.
  - The practice generator.
- `lesson.css` only for the equation, the workbench rows and term tiles.
  Existing tokens only: highlight `--accent-light` background with
  `--accent-dark` text; muted `--text-muted`. No graph CSS.

## The graph

The shared graph, loaded in `index.php` with the four tags from
`docs/shared-graph.md`, before the lesson's scripts. Learn graphs use:

```js
{ x: [-5, 5], y: [-4, 10], step: { x: 1, y: 1 }, label: '…' }
```

(room above (2, 8) so no point sits on the edge; `step` keeps the squares
square). Lines use `graph.line({ m, c })`. Every graph has a `label`
saying what it shows, for example "Coordinate grid. The line y = 2x + 3
and the point (2, 8)." Under `prefers-reduced-motion`, everything that
"appears in turn" appears at once.

## The workbench (Learn 3, 4 and 5)

Lesson code in `interactive.js`, not a shared component.

- The equation sits large at the top: left side, `=`, right side, each
  term in its own tile.
- Under it, two or three operation buttons (in-activity controls, shared
  `button` styles with `is-selected` / `is-correct` / `is-incorrect`), in
  a `role="group"` with a visible label: "What do you do to both sides?"
  Each screen lists its buttons below.
- **A right button** adds two rows of working under the equation:
  1. the operation written after **every** term on both sides, each new
     part highlighted: `y − 3 + 3 = 2x + 3`, or
     `2y ÷ 2 = 4x ÷ 2 + 6 ÷ 2`;
  2. the tidied result: `y = 2x + 3`.
  The second row appears a moment after the first. Beside the rows, in
  small muted text, the step: "+ 3 to both sides".
- **A wrong button** applies nothing. It shows its feedback (shared
  `question-feedback is-incorrect`, with ✗ and text), marks that button
  `is-incorrect` until the next press, and leaves the others available.
- When y is on its own: the result row gets ✓, every operation button is
  disabled, and the screen's closing text appears. Next is disabled until
  then.
- Save the steps done in section state, so reload and Back show the
  finished working. Wrong presses aren't saved.
- The equation is held as k, d, p, q (ky + d = px + q). The buttons are
  fixed per screen; the lesson never offers a division that leaves a
  fraction.

## Learn (7 screens)

Each screen is one idea: the equation (large, centred), the activity,
then at most three short lines of text. Save the screen index and each
screen's state in section state, so reload and Back keep them. Learn has
no scored questions. Learn's choice questions are lesson buttons with the
shared answer classes (not question cards); a wrong option greys out with
its feedback, and Next unlocks on the right one.

1. **Same line, different equation.** Two buttons above the graph:
   `2y = 4x + 6` and `y = 2x + 3`. Prompt: "Draw both lines." The first
   press draws that equation's line, tone neutral. The second draws the
   other on top, tone `correct`, landing exactly on the first, with the
   text "✓ Same line." Then the text: "These two equations give the same
   line." "In y = 2x + 3 you can read the gradient, 2, and the
   y-intercept, 3, straight away." "This lesson: rewrite any equation like
   that, and check if a point is on the line." Next unlocks after both are
   drawn.

2. **Write the x term first.** `y = 5 − 2x` as tiles: `y`, `=`, `5`,
   `− 2x`. One button: "Put the x term first". The `− 2x` tile moves to the
   front **as one tile, sign included** (never the minus on its own), and
   the 5 becomes `+ 5`: `y = −2x + 5`. Text: "The minus stays with its
   term." Then the question "What is the gradient?":
   - **−2**: "Right. y = −2x + 5, so the gradient is −2 and the
     y-intercept is 5."
   - 2: "The minus belongs to the x term: −2x. The gradient is −2."
   - 5: "5 is the number added, so it's the y-intercept. The gradient
     multiplies x."
   - −5: "There's no −5 here. The x term is −2x, so the gradient is −2."

3. **Add or subtract on both sides.** Workbench, `y − 3 = 2x`. Buttons:
   - **+ 3 to both sides** → `y − 3 + 3 = 2x + 3` → `y = 2x + 3`.
   - − 3 from both sides: "That gives y − 6. To cancel − 3, add 3."
   - ÷ 3 both sides: "y isn't multiplied by 3. To cancel − 3, add 3."
   Closing text: "Doing the same to both sides keeps the equation true."
   Then the question "Rewrite y + 4 = 3x with y on its own.":
   - **y = 3x − 4**: "Right. Subtract 4 from both sides."
   - y = 3x + 4: "To cancel + 4, subtract 4 from both sides: y = 3x − 4."
   - y = 3x: "You can't just drop the 4. Subtract it from both sides:
     y = 3x − 4."

4. **Divide every term.** Workbench, `2y = 4x + 6`. Text above:
   "2y means 2 × y." Buttons:
   - **÷ 2 both sides** → `2y ÷ 2 = 4x ÷ 2 + 6 ÷ 2` → `y = 2x + 3`.
   - × 2 both sides: "That gives 4y. To undo 2 × y, divide by 2."
   - − 2 from both sides: "That gives 2y − 2, not y. 2y means 2 × y, so
     divide by 2."
   Closing text: "Divide **every** term, the number too."
   Then the question "Which equation means the same as 3y = 6x − 12?":
   - **y = 2x − 4**: "Right. 6x ÷ 3 = 2x and −12 ÷ 3 = −4."
   - y = 2x − 12: "Divide −12 by 3 as well: every term."
   - y = 6x − 4: "Divide 6x by 3 as well: every term."
   - y = 18x − 36: "3y means 3 × y. To undo it, divide by 3, don't
     multiply."

5. **Two steps.** Workbench, `2y + 4 = 6x`. Buttons: **− 4 from both
   sides**, + 4 to both sides, **÷ 2 both sides**. Either order works:
   - − 4 first: `2y + 4 − 4 = 6x − 4` → `2y = 6x − 4`, then ÷ 2:
     `2y ÷ 2 = 6x ÷ 2 − 4 ÷ 2` → `y = 3x − 2`.
   - ÷ 2 first: `2y ÷ 2 + 4 ÷ 2 = 6x ÷ 2` → `y + 2 = 3x`, then − 2 (the
     subtract button now reads "− 2 from both sides"): `y + 2 − 2 = 3x − 2`
     → `y = 3x − 2`.
   - + 4 (or + 2) to both sides: "That gives 2y + 8. To cancel + 4,
     subtract 4." (with the numbers of the current step).
   Closing text, with `3` and `−2` highlighted and labelled "gradient" /
   "y-intercept" (words, so never colour alone): "Now y is on its own:
   the gradient is 3 and the y-intercept is −2."

6. **Is a point on the line?** The graph with `y = 2x + 3` and the point
   (2, 7), coordinates shown, `labelSide: 'left'`. Text: "A point is on
   the line when its coordinates fit the equation." "(2, 7): put x = 2 in.
   y = 2 × 2 + 3 = 7. That's the point's y, so it's on the line." Then
   the question "Is (2, 8) on the line y = 2x + 3?":
   - **No. 2 × 2 + 3 = 7, not 8.**: "Right."
   - Yes. 8 is close to 7.: "The numbers must match exactly. When x = 2,
     y is 7, so (2, 8) isn't on the line."
   - No. 2 × 8 + 3 = 19, not 2.: "Right answer, wrong working. Put the
     x-coordinate in for x, then compare with the y-coordinate."
   Once answered right: the point (2, 8) appears, tone `incorrect`, label
   to the right (`labelSide: 'right'`), just above the line, with ✗. The
   two labels must not overlap, at 375 px too.

7. **You don't have to rearrange.** `2y = 4x + 6` and the point (2, 7).
   Two tiles: "Left side: 2y" and "Right side: 4x + 6". Prompt: "Tap each
   side to put x = 2 and y = 7 in." Tapping the left fills it in:
   `2 × 7 = 14`. Tapping the right: `4 × 2 + 6 = 14`. When both are done:
   "✓ Both sides are 14, so (2, 7) is on the line." Text: "Put both
   coordinates in. If the two sides are equal, the point is on the line."
   Next unlocks when both are done.

## Try it (4 screens)

Not scored (`scored: false`), as in `gradient-and-intercept`. One card
at a time; the next appears after Continue. Typed cards use
`fractions: true` (for the minus key). Choice options are shuffled once
and saved. No graphs, no highlighting.

1. **Look at y − 5 = 4x.** Choice: "What do you do to both sides to get
   y on its own?"
   - **Add 5**: "Right. y − 5 + 5 = 4x + 5, so y = 4x + 5."
   - Subtract 5: "That gives y − 10. To cancel − 5, add 5."
   - Divide by 5: "y isn't multiplied by 5. To cancel − 5, add 5."
   - Divide by 4: "4 multiplies x, not y. Leave it; cancel the − 5."

2. **Look at 4y = 8x + 12.** Two-field card: "Divide every term by 4. What
   are the gradient and the y-intercept?" Fields Gradient / y-intercept,
   answer 2 and 3, `rearrangeRules`. Correct: "Right. y = 2x + 3."

3. **Look at 2y + 6 = 8x.**
   - Choice: "Which equation means the same?"
     - **y = 4x − 3**: "Right. Subtract 6: 2y = 8x − 6. Divide every term
       by 2: y = 4x − 3."
     - y = 4x + 3: "To cancel + 6, subtract 6 from both sides: 2y = 8x − 6."
     - y = 4x − 6: "Divide −6 by 2 as well: every term."
     - y = 8x − 3: "Divide 8x by 2 as well: every term."
   - Two-field: "What are its gradient and y-intercept?" Answer 4 and −3,
     `rearrangeRules`. Correct: "Right. The gradient is 4 and the
     y-intercept is −3."

4. **Is (3, 5) on 2y = 4x − 2?**
   - Two-field: "Put x = 3 and y = 5 in. Work out each side." Fields
     labelled `2y` and `4x − 2`, answer 10 and 10, `pointRules`. Correct:
     "Right. 2 × 5 = 10 and 4 × 3 − 2 = 10."
   - Choice: "So is (3, 5) on the line?"
     - **Yes**: "Right. Both sides are 10."
     - No: "Both sides are 10. Equal sides mean the point is on the line."

## Feedback rules

### `rearrangeRules(form)`

For two-field Gradient / y-intercept cards. The form is ky + d = px + q;
the answer is m = p ÷ k, c = (q − d) ÷ k. Rules in this order; skip any
that can't apply, whose value equals the answer, or whose value an earlier
rule already used:

| Rule `value` | When | Feedback (numbers filled in) |
|---|---|---|
| `{ m: c, c: m }` | always | "You've swapped them. Once y is on its own, the gradient multiplies x and the y-intercept is the number added or subtracted." |
| `{ c: q − d }` | k > 1 | "Divide the number by 2 as well: every term. y = 3x − 2." |
| `{ c: d − q }` | k > 1, d ≠ 0 | "Get y on its own step by step: subtract 4 from both sides, then divide every term by 2. y = 3x − 2." |
| `{ m: p }` | k > 1 | "Divide the x term by 2 as well: 6x ÷ 2 = 3x." |
| `{ c: −c }` | d ≠ 0 | "Check the sign. To cancel + 4, subtract 4 from both sides. y = 3x − 2." |
| `{ m: −m }` | always | "Keep the sign with the x term. The gradient is −3." |
| `{ m: m }` | always | "The gradient is right. Check the y-intercept: get y on its own, then read the number added or subtracted." |
| `{ c: c }` | always | "The y-intercept is right. Check the gradient: the number multiplying x once y is on its own." |

Fallback: "Get y on its own first. Then read the gradient and the
y-intercept, with their signs." Each rule's operation words come from the
form (add or subtract, the right numbers).

For the reordered form y = c + mx (k = 1, the number first), use only the
swapped, `{ m: −m }` ("The minus belongs to the x term: −3x."), `{ m: m }`
and `{ c: c }` rows.

### `pointRules(form, point)`

For two-field "work out each side" cards: fields `left` (labelled with
the left side, e.g. `2y`) and `right` (e.g. `4x − 2`). Point (a, b).

| Rule `value` | When | Feedback |
|---|---|---|
| `{ left: b }` | k > 1 | "2y means 2 × y: 2 × 5 = 10." |
| `{ left: k × a }` | k × a ≠ k × b | "Put the y-coordinate in for y: 2 × 5." |
| `{ right: p × b + q }` | a ≠ b | "Put the x-coordinate in for x: 4 × 3 − 2." |
| `{ left: k × b }` | always | "The left side is right. Work out the right side with x = 3." |
| `{ right: p × a + q }` | always | "The right side is right. Work out the left side with y = 5." |

Fallback: "Put x = 3 and y = 5 into each side and work it out."
Correct feedback says whether the point is on the line: "Right. Both
sides are 10, so (3, 5) is on the line." or "Right. 12 and 10 aren't
equal, so (3, 6) isn't on the line."

## Practice

Endless generator through `runQuestionSet`, as the template does,
`session_length` 8: four typed cards and four choice cards, alternating
(typed first), option order shuffled by the seeded helpers. No
highlighting or prompts beyond the question. Every number a pupil works
with (every term, side and
answer) stays between −40 and 40; draw again if not.

### Typed (two-field)

Four of these five types per session, chosen by the seed, no repeats.
The first four ask "Look at 2y + 4 = 6x. What are the gradient and the
y-intercept?" with `rearrangeRules`; correct: "Right. y = 3x − 2."

| Type | Form | m | c | k | Example |
|---|---|---|---|---|---|
| `reorder` | y = c + mx | ±1 to ±5 | ±1 to ±8 | 1 | y = 7 − 3x, y = −2 + x |
| `add-subtract` | y − c = mx | ±1 to ±5 | ±1 to ±8 | 1 | y + 4 = 3x |
| `divide` | ky = kmx + kc | ±1 to ±4 | ±1 to ±5 | 2 to 4 | 3y = 6x − 12 |
| `two-step` | ky − kc = kmx | ±1 to ±4 | ±1 to ±4 | 2 or 3 | 2y + 4 = 6x |
| `point-sides` | ky = kmx + kc, point (a, b) | ±1 to ±4 | ±1 to ±5 | 2 or 3 | (3, 5) and 2y = 4x − 2 |

- Never |m| = |c|. The sign of m and of c is chosen by the seed, half and
  half.
- `point-sides`: "Is (3, 5) on 2y = 4x − 2? Put x = 3 and y = 5 in. Work
  out each side." `pointRules`. a is 1 to 4; b = ma + c (on the line) or
  ma + c ± 1 or ± 2 (not on it), chosen half and half by the seed;
  a ≠ b.

### Choice

One of each per session. Every wrong option is a real mistake; drop any
that comes out the same as another option or as the answer.

**`same-equation`** (k 2 to 4, m ±1 to ±4, c ±1 to ±5): "Which equation
means the same as 3y = 6x − 12?"

| Option | Feedback |
|---|---|
| **y = 2x − 4** | "Right. Divide every term by 3." |
| y = 2x − 12 (number not divided) | "Divide −12 by 3 as well: every term." |
| y = 6x − 4 (x term not divided) | "Divide 6x by 3 as well: every term." |
| y = 18x − 36 (multiplied) | "3y means 3 × y. To undo it, divide by 3, don't multiply." |

**`on-its-own`** (m ±1 to ±5, c ±1 to ±8): "Rewrite y + 4 = 3x with y on
its own."

| Option | Feedback |
|---|---|
| **y = 3x − 4** | "Right. Subtract 4 from both sides." |
| y = 3x + 4 (same operation) | "To cancel + 4, subtract 4 from both sides." |
| y = 3x (dropped) | "You can't just drop the 4. Subtract it from both sides." |

(With "add" for a minus on the left: y − 2 = 5x.)

**`read-reordered`** (m ±2 to ±5, c ±1 to ±8): "Look at y = 7 − 3x. Which
is right?"

| Option | Feedback |
|---|---|
| **The gradient is −3 and the y-intercept is 7.** | "Right. y = 7 − 3x is y = −3x + 7." |
| The gradient is 7 and the y-intercept is −3. (swapped) | "The gradient multiplies x. Write the x term first: y = −3x + 7." |
| The gradient is 3 and the y-intercept is 7. (sign dropped) | "The minus belongs to the x term: −3x." |
| The gradient is −3 and the y-intercept is −7. (sign spread) | "The minus belongs only to the x term. 7 is added." |

When m > 0 (y = 7 + 3x), the sign rows become "−3 and 7" ("There's no
minus in front of the x term.") and "3 and −7" ("Nothing is subtracted.
7 is added.").

**`point-check`** (y = mx + c, m ±2 to ±5, c ±1 to ±6, a 1 to 4):
"Is (2, 7) on the line y = 3x + 1?" Half the points are on the line
(b = ma + c), half not (b = ma, so the "forgot c" mistake looks right),
by seed. Working is written with tidy signs: `3 × 2 − 1`, never `+ −1`.

On the line, (2, 7):

| Option | Feedback |
|---|---|
| **Yes. 3 × 2 + 1 = 7.** | "Right." |
| No. 3 × 2 = 6, not 7. (forgot c) | "Don't forget the + 1: 3 × 2 + 1 = 7." |
| No. 3 × 7 + 1 = 22, not 2. (coordinates swapped) | "That swaps x and y. Put x = 2 in, then compare with y = 7." |

Not on the line, (2, 6):

| Option | Feedback |
|---|---|
| **No. 3 × 2 + 1 = 7, not 6.** | "Right." |
| Yes. 3 × 2 = 6. (forgot c) | "Don't forget the + 1: 3 × 2 + 1 = 7, not 6." |
| No. 3 × 6 + 1 = 19, not 2. (coordinates swapped) | "Right answer, wrong working. Put x = 2 in, then compare with y = 6." |

Drop the swapped option if its number equals a.

## Check

Six fixed questions in `questions.js` (four choice, two typed), through
the shared card as the template does, choice options shuffled once and
saved. No hints beyond the feedback after each answer.

1. **Sam's mistake** (choice). "Sam rewrites 2y = 6x + 8 as y = 3x + 8.
   What should he have written?"
   - **y = 3x + 4**: "Right. Divide every term by 2: 8 ÷ 2 = 4."
   - y = 3x + 8: "That's Sam's answer. He divided 6x by 2 but not 8."
   - y = 6x + 4: "Divide 6x by 2 as well: every term."
   - y = 3x + 16: "Divide 8 by 2, don't multiply: 8 ÷ 2 = 4."

2. **Rearrange, then read** (two-field). "Look at 3y + 6 = 12x. What are
   the gradient and the y-intercept?" Answer 4 and −2, `rearrangeRules`.
   Correct: "Right. 3y = 12x − 6, so y = 4x − 2."

3. **Mia's claim** (choice). "Mia says (2, 5) is on 2y = 6x − 2. Which
   working checks this correctly?"
   - **"2 × 5 = 10 and 6 × 2 − 2 = 10, so she's right."**: "Right. Both
     sides are 10."
   - "2 × 2 = 4 and 6 × 5 − 2 = 28, so she's wrong.": "That swaps x and
     y. Put x = 2 and y = 5 in."
   - "6 × 2 − 2 = 10, which isn't 5, so she's wrong.": "Compare with 2y,
     not y. 2 × 5 = 10, so both sides are 10."

4. **Keep the sign with the term** (choice). "Look at y = 7 − 3x. Which is
   right?" The four `read-reordered` options and feedback for m = −3,
   c = 7.

5. **Rearrange, then read** (two-field). "Look at y + 5 = −2x. What are
   the gradient and the y-intercept?" Answer −2 and −5, `rearrangeRules`.
   Correct: "Right. Subtract 5 from both sides: y = −2x − 5."

6. **Which point?** (choice). "Which point is on the line y − 1 = 3x?"
   - **(2, 7)**: "Right. y = 3x + 1, and 3 × 2 + 1 = 7."
   - (2, 5): "Check the sign. y − 1 = 3x means y = 3x + 1, so at x = 2,
     y = 7."
   - (2, 6): "Don't forget the 1: y = 3x + 1, so 3 × 2 + 1 = 7."
   - (7, 2): "That swaps x and y. At x = 2, y = 7: the point is (2, 7)."

Summary after the results (the template's summary block), three points:
- "To write y = mx + c, get y on its own and put the x term first."
- "Do the same to both sides. When you divide, divide every term."
- "To check a point, put its coordinates in. Equal sides mean it's on the
  line."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `main` (first build round).
- Unit tests for `equations.js`: every `lineText` and `reorderedText`
  form listed above (including `x`, `−x`, no zero terms, no `+ −`);
  `rearrangeRules` for each row (including skipped rows, duplicates and
  order) for every typed type; `pointRules` on and off the line; the
  generator gives four different typed types and one of each choice
  type, alternating, |m| ≠ |c|, numbers in −40…40, no fractions, no
  duplicate options, the same session for the same seed.
- Add `tests/ui/equations-of-straight-lines.spec.cjs`: a full correct run
  through all four sections; Learn 3 with a wrong button first; Learn 5 in
  both orders; Learn 4 workbench by keyboard; a wrong-then-right Practice
  answer where Try again keeps the right box; reload mid-Learn 5 after the
  first step.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and touch emulation):
  - a full run ending on All lessons and the homepage, on the PHP site
    and the built `dist/` site
  - Learn 1: both orders of drawing; the second line sits on the first
  - Learn 2: the −2x tile moves as one piece
  - Learn 3–5: every button, right and wrong; the working rows show the
    operation after every term; reload and Back keep the working
  - Learn 6: (2, 7) and (2, 8) labels don't overlap each other, the line
    or the axes, at 375 px too
  - Learn 7: both tiles by tap and keyboard
  - workbench equations and rows fit at 375 px with no sideways scroll
  - the two answer boxes sit on one line at 375 px; the phone keyboard
    offers a minus
  - every `rearrangeRules` and `pointRules` row shows its feedback once
  - every wrong option in Learn, Try it, Practice and Check shows its own
    feedback, and Practice never shows two options the same
  - reload in every section and phase; Back from every screen and Next
    forward again
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage lists the lesson under Algebra after Gradient and
  intercept, with the new title and subtitle, and in the Graphs
  collection. The two new placeholders don't show (no folders yet). The
  `gradient-and-intercept` browser test still passes.
- `./build.sh`, then commit `dist/`.

## Commits

1. The lesson (with `skills.json`, `curriculum.json`, `collections.json`,
   the tests and `dist/`). Commit this file with it.

## Report

- The commit hash, both test results compared with `main`, every check
  above, and the planned maximum score.
- **Template findings:** every place you had to go beyond the template,
  the shared components or the shared graph, every `CHANGE:` marker that
  was unclear, and anything you'd change. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
