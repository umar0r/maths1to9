# Gradient and intercept: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph, like `finding-the-gradient`. Teaches one
skill: reading the gradient and the y-intercept from an equation written
as y = mx + c. Rearranging equations (y = 5 − 2x, 2y = …), finding an
equation from two points and parallel lines are later lessons.

The graph is the main teaching tool in Learn. Pupils tap where the line
crosses the y-axis, walk a point along the line to see the gradient, and
use two sliders to change m and c one at a time. Try it, Practice and
Check are about reading the equation, so they have no graphs.

The work is in two parts on one branch. **Part A** adds two small,
opt-in shared features: a number card with two or more answer boxes, and
a graph mode for tapping a point. **Stop after Part A for review.** Part
B, the lesson, comes after approval.

## Before you start

- Check `main` has the `finding-the-gradient` lesson (PR #8). If not,
  stop and say so. Then create `codex/gradient-and-intercept` from
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
  `content/finding-the-gradient/` as the worked example.
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

## A1. Question card: several answer boxes (one commit)

In `createQuestion` (`assets/js/lesson-engine.js`), and so also in
`runQuestionSet` definitions. Update the question card section of
`docs/shared-lesson-components.md`.

```js
{ prompt: 'Look at y = −x + 6. Enter the gradient and the y-intercept.',
  input: 'number', fractions: true,
  fields: [{ id: 'm', label: 'Gradient' }, { id: 'c', label: 'y-intercept' }],
  answer: { m: '-1', c: '6' },
  rules: [
      { value: { m: '0' }, feedback: '−x means −1x, so the gradient is −1.' },
      { value: { m: '6', c: '-1' }, feedback: "You've swapped them. …" },
      { value: { m: '-1' }, feedback: 'The gradient is right. Check the y-intercept …' }
  ],
  feedback: 'Right. …', fallback: '…' }
```

- `fields` is a list of two or more `{ id, label }`. It needs
  `input: 'number'` and `fractions: true`; otherwise throw a
  `TypeError`. Ids must be unique.
- One input per field, each with its visible `<label>`, side by side,
  wrapping onto a second line only if there's no room. Both fit on one
  line at 375 px. Each input uses the `fractions` keyboard settings
  (`inputMode = 'text'`, autocomplete, autocorrect and autocapitalise off,
  spellcheck false), so the phone keyboard has a minus.
- Each box accepts what a `fractions` card accepts and is compared the
  same way (exact value).
- `answer` is an object with every field id. A rule's `value` may name
  **some** of the fields: it matches when every field it names is equal
  in value. Rules are tried in order and the first match wins, then
  `fallback`. The whole answer is correct only when every field matches.
- Check is enabled only when every box has something in it. If any box
  isn't a number, show the usual invalid message, mark that box
  `aria-invalid="true"`, focus it and don't mark the answer.
- **Try again** keeps what the pupil typed and focuses the first box that
  doesn't match the answer (not clearing them as a single number card
  does: retyping a right value is pointless).
- The saved value is an object of tidied texts (as `fractions` tidies
  them). The results row and read-only card show
  "Gradient −1, y-intercept 6" (label, space, value, joined with ", ").
  `onFeedback`'s `outcome.value` is the same object.
- Unit tests next to the existing card tests: the `TypeError`s; Check
  disabled until every box is filled; invalid box; partial rules,
  including order; equal values (`2/4` for `1/2`); Try again keeps
  values and focuses the first wrong box; saved value and results text;
  read-only render after reload. Check it inside `runQuestionSet` with
  Practise again.

Bump the engine's `?v=` the way the repo does for engine changes.

## A2. Shared graph: tapping a point (one commit)

In `assets/js/graph.js`. Document it in `docs/shared-graph.md`'s API
section. Bump `graph.js` `?v=` in every lesson that loads it.

```js
const picker = graph.pick({
    onPick: ([x, y]) => {},   // whole numbers (or grid steps), after snapping
    label: 'Tap where the line crosses the y-axis.'   // read out when the board is focused
});
picker.stop();                // stop listening; also stopped by setEditable(false) and destroy()
```

- **Tap or click** anywhere on the board: the point snaps to the nearest
  grid corner (`snap`, with the board's step) and `onPick` is called
  once. A press that moves more than 8 px before release is not a tap.
- **Keyboard:** when the board is focused, the same crosshair as
  `drawLine` appears at (0, 0) with its coordinates; arrow keys move it
  one grid step; Enter or Space picks.
- `pick` draws nothing. The lesson shows what it wants (for example a
  point with tone `correct` or `incorrect`).
- One tool at a time: calling `pick` while `drawLine` is active (or the
  other way round) throws an `Error`.
- Page scrolling outside the board is unaffected, as for drawing.
- The live region says "You picked (0, 3)." unless the lesson calls
  `describe` in `onPick`.

## Part A checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `main` (first build round, shared files changed).
- `node --check` on every changed JS file.
- `finding-the-gradient` and `horizontal-and-vertical-lines` work exactly
  as before: one full run each.
- A throwaway page (not committed) with: a two-field card (fill both,
  wrong-then-right with a partial rule, invalid box, reload in each phase,
  Back to the read-only card, Practise again in a question set); and a
  graph with `pick` used by mouse, touch emulation and keyboard, plus
  `setEditable(false)` stopping it.
- `./build.sh`, commit `dist/`.

Report the commit hashes and these checks, **then stop for review.**

---

# Part B: the lesson

## The lesson

| | |
|---|---|
| Title | Gradient and intercept |
| Slug / folder | `gradient-and-intercept` (the placeholder already in `curriculum.json`) |
| Subtitle | Read the gradient and y-intercept from an equation like y = 2x + 3. |
| Skill | `read-gradient-intercept` (new, below) |
| Goal shown to pupils | Look at a straight-line equation and say its gradient and where it crosses the y-axis. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`: replace `interpret-gradient` and
  `interpret-intercept` with one skill:
  `{"id":"read-gradient-intercept","title":"Read the gradient and y-intercept from y = mx + c","content_references":["A10"],"recommended_prerequisites":["calculate-gradient","substitute-expressions"]}`.
  In `use-y-mx-c`, change the prerequisite `interpret-intercept` to
  `read-gradient-intercept`. Change nothing else there.
- `content/curriculum.json`: the `gradient-and-intercept` entry gets the
  subtitle above and skills `["read-gradient-intercept"]`. Its position
  and title stay. Leave the other entries alone.
- `content/collections.json`: already lists `gradient-and-intercept` in
  `graphs`; no change.
- Search the repo (content, assets, tests, `dist/`) for the two removed
  ids and stop and ask if anything other than these two files uses them.
- Map every Practice and Check question type to `read-gradient-intercept`
  in `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "the line", "crosses the y-axis",
  "the number multiplying x", "the number added or subtracted". Don't
  say "coefficient", "constant", "slope", "rise" or "run".
- Step language matches the last lesson: "1 right, 2 up", "1 right,
  2 down". Always read from left to right.
- Always "y-intercept", never "intercept" on its own in pupil text
  (the lesson title is the exception).
- No exam-board names or codes anywhere.
- Minus is the Unicode minus `−`. Coordinates are `(x, y)` with a space
  after the comma. No-break spaces inside equations and coordinates so
  they never wrap.
- **No KaTeX in this lesson** (don't load it). Equations are HTML in
  Learn (x in italics) and plain text in prompts, options, feedback and
  results: `y = −3x + 5`, `y = 2 × 0 + 3 = 3`.
- A small `equations.js`, loaded before `interactive.js` and
  `questions.js`, holds the lesson's helpers:
  - `equationText(m, c)`: plain text. `y = 2x + 3`, `y = 2x − 3`,
    `y = x + 4`, `y = −x + 4`, `y = 3x`, `y = −2x`, and `y = 3` when
    m is 0.
  - `equationHtml(m, c, { highlight, showHidden })`: the same as HTML.
    `highlight` is `'m'`, `'c'` or both: that part gets a highlight and a
    small word under it ("gradient" / "y-intercept"), so it's never
    colour alone. `showHidden` shows the hidden `1` in `1x` and the
    hidden `+ 0` in a muted style.
  - `readingRules(m, c)`: the rules below, for Try it 3, Practice and
    Check.
  - The practice generator.
- `lesson.css` only for the equation (size, highlight, the word under a
  highlighted part, the muted hidden parts). Existing tokens only:
  highlight `--accent-light` background with `--accent-dark` text; muted
  `--text-muted`. No graph CSS.

## The graph

Every graph is the shared graph, loaded in `index.php` with the four tags
from `docs/shared-graph.md`, before the lesson's scripts. Every Learn
graph uses:

```js
{ x: [-6, 6], y: [-6, 8], step: { x: 1, y: 1 }, label: '…' }
```

(the extra room at the top fits (2, 7); `step` keeps the squares square).
Lines use `graph.line({ m, c })`, tone neutral. Arrows use tone `ink`.
Every graph has a `label` saying what it shows, for example "Coordinate
grid. The line y = 2x + 3." Every point the lesson places sits inside
the grid, never on its edge. The one exception is Learn 2's wrong-tap
marker, which goes wherever the pupil tapped, edges included. Never draw an arrow along an axis. Under
`prefers-reduced-motion`, everything that "appears in turn" appears at
once.

**Step arrows** (screens 3, 4, 5 and 6): two **unlabelled** arrows, tone
`ink`, horizontal then vertical. The step runs from (a, ma + c) →
(a + 1, ma + c) → (a + 1, m(a + 1) + c). Try a = 1, −2, 2, −3, 3, −4 in
that order and use the first where both y-values are inside −5…7, neither
is 0, and both are on the same side of the x-axis (so the step never
touches or crosses it). If none fits, or m is 0, show no arrows.

The numbers go in one **step line** directly under the graph, not on it:
"1 right, 2 up" / "1 right, 3 down", updated whenever the step changes.
When there are no arrows (m is 0, or no step fits), the line still says
the step ("1 right, 3 up"), or "Flat: 0 up for every 1 right" when m is 0.

(Revised after review, twice: at 375 px a grid square is about 25 px and
a label like "1 right" about 45 px, so on-graph labels landed next to the
wrong arrow whatever the placement.)

## Learn (6 screens)

Each screen is one idea: the equation (large, centred) above the graph,
then at most three short lines of text under it. Save the screen index and
each screen's state in section state, so reload and Back keep them.

1. **An equation is a rule.** `y = 2x + 3` and its line. Text: "y = 2x + 3
   is a rule: multiply x by 2, then add 3 to get y." "Every x and y that
   fit the rule make a point. Here, the points make a straight line."
   "The 2 and the 3 tell you two things about the line." Next available.

2. **Where does it cross the y-axis?** Same line, `graph.pick`. Prompt
   above the graph: "Tap where the line crosses the y-axis." Next is
   disabled until it's found. Feedback under the graph (the shared
   `question-feedback is-correct / is-incorrect` classes); a wrong tap
   shows a small `incorrect` point there until the next tap:

   | Pupil taps | Feedback |
   |---|---|
   | (0, 3) | "✓ The line crosses the y-axis at (0, 3)." |
   | x = 0, another y | "That's on the y-axis, but the line isn't there. Follow the line to the y-axis." |
   | on the line, x ≠ 0, e.g. (1, 5) | "That point is on the line. Now follow it to the y-axis, the up-and-down axis." |
   | y = 0, x ≠ 0 | "That's on the x-axis. The y-axis is the up-and-down one." |
   | anything else | "Tap where the line meets the y-axis, the up-and-down axis." |

   When found: a large `correct` point at (0, 3) with coordinates, `+ 3`
   highlighted ("y-intercept"), and the text: "Every point on the y-axis
   has x = 0. Put x = 0 in: y = 2 × 0 + 3 = 3." "So 3 is the
   **y-intercept**." The picker stops. Revisiting shows the found state.

3. **How steep is it?** Same line. A large point starts at (0, 3) and
   drags along the line between (0, 3), (1, 5) and (2, 7)
   (`drag: 'positions'`). Under the graph, a small table, x | y, with the
   row for each position filled in once the point has reached it
   (0 | 3, 1 | 5, 2 | 7). Each move to the right adds that step's arrows:
   (0, 3) → (1, 3), (1, 3) → (1, 5), then
   (1, 5) → (2, 5), (2, 5) → (2, 7), unlabelled (see "Step arrows").
   The newest step's arrows are solid; earlier ones stay, dashed. The step
   line under the graph says "1 right, 2 up" once the point has moved.
   Moving back to the left removes the arrows past the point. Prompt
   above: "Drag the point along the line to x = 2." When it reaches
   (2, 7): `2` highlighted ("gradient"), text: "Each time x goes up by 1,
   y goes up by 2: 1 right, 2 up." "The **gradient** is 2. It tells you
   how much y changes when x goes up by 1." Next disabled until (2, 7)
   has been reached once.

4. **The pattern: y = mx + c.** Large `y = mx + c`, and under it
   `y = 2x + 3` with both parts highlighted and labelled. The graph: the
   line, the point (0, 3) with coordinates, and step arrows. Text: "m is
   the gradient: the number multiplying x." "c is the y-intercept: the
   number added or subtracted." "mx means m × x." Next available.

5. **Negative numbers.** The equation updates live above the graph. Two
   labelled sliders under the graph (`<input type="range">` with visible
   labels and the value beside each): "Gradient m", −3 to 3, and
   "y-intercept c", −4 to 4, both step 1, starting at m = 2, c = 3. The
   graph shows the line, the crossing point (0, c) with coordinates (large,
   neutral) and step arrows.
   - **Prompt 1:** "Keep the y-intercept at 3. Change the gradient from 2
     to −2." The c slider is disabled. At m = −2: "The gradient is −2:
     1 right, 2 down. The line still crosses at (0, 3)."
   - **Prompt 2:** "Keep the gradient at −2. Change the y-intercept from 3
     to −3." The m slider is disabled. At c = −3: "The line moves down
     but stays just as steep. It crosses at (0, −3)."
   - Then both sliders unlock and the text adds: "**Keep the sign with
     the number.**" Next is disabled until both prompts are done.
   - On slider `input`, update the line, point, arrows and equation in
     place (`item.update`, `item.remove`); never rebuild the screen or
     the graph, so the slider keeps focus while dragged or moved by
     keyboard. Save m, c and the prompt stage on `change`.

6. **Hidden numbers.** Three buttons above the graph (in-activity
   controls, shared `is-selected` class): `y = x + 4`, `y = −x + 4`,
   `y = 3x`, starting on the first. Each shows its equation with
   `showHidden` (the muted `1`, `−1`, `+ 0`), the line, the crossing point
   with coordinates and step arrows. Text for each:
   - "x means 1x, so the gradient is 1."
   - "−x means −1x, so the gradient is −1."
   - "Nothing is added, so y = 3x means y = 3x + 0. The y-intercept is 0."
   Next available.

Learn has no scored questions.

## Try it (4 screens)

Not scored (`scored: false`). One card at a time; the next appears after
Continue. Typed cards use `fractions: true` (for the minus key). The
prompt shows the equation; no graphs, no highlighting. Choice options are
shuffled once and saved. Try it mixes choice and typed cards, like the
rest of the site.

1. **Look at y = 4x + 2.**
   - Choice: "What is the gradient?" Options:
     - **4**: "Right. The 4 multiplies x: the line goes 4 up for every 1
       right."
     - 2: "2 is added at the end. The gradient is the number multiplying
       x."
     - 6: "Don't add them. The gradient is just the number multiplying
       x."
   - Typed: "What is the y-intercept?" Answer `2`. Rule `4`: "4 multiplies
     x, so it's the gradient. The y-intercept is the number added."
     Correct: "Right. The line crosses the y-axis at (0, 2)."

2. **Look at y = −3x − 5.**
   - Typed: "What is the gradient?" Answer `-3`. Rules: `3` "Keep the
     minus sign. The number multiplying x is −3."; `-5` and `5` "That's
     the number subtracted at the end. Look at the number multiplying x."
     Correct: "Right. −3 means 3 down for every 1 right."
   - Choice: "Where does the line cross the y-axis?" Options:
     - **(0, −5)**: "Right. The equation subtracts 5, so the y-intercept
       is −5."
     - (0, 5): "Keep the sign. The equation subtracts 5."
     - (−5, 0): "On the y-axis, x is 0. So the point is (0, −5)."
     - (0, −3): "−3 multiplies x, so it's the gradient. Look at the number
       at the end."

3. **Look at y = −x + 6.** "Enter the gradient and the y-intercept." A
   two-field card (Part A1), fields Gradient / y-intercept, answer
   −1 and 6, `readingRules(-1, 6)`. Correct: "Right. −x means −1x. The
   gradient is −1 and the y-intercept is 6."

4. **The other way round** (choice). "Which line has gradient −2 and
   y-intercept 3?" Options:
   - **y = −2x + 3**: "Right. −2 multiplies x and 3 is added."
   - y = 3x − 2: "That swaps them. The gradient is the number multiplying
     x."
   - y = 2x + 3: "That line has gradient 2. Keep the minus sign with the
     2."
   - y = −2x − 3: "That line crosses at (0, −3). The y-intercept here is
     3, so add 3."

## Reading rules

`readingRules(m, c)` returns, in this order (skip any that can't apply,
and any whose value equals the answer):

| Rule `value` | When | Feedback |
|---|---|---|
| `{ c: m }` | c = 0 | "Nothing is added or subtracted, so y = 6x means y = 6x + 0. The y-intercept is 0." |
| `{ m: c, c: m }` | always | "You've swapped them. The gradient is the number multiplying x. The y-intercept is the number added or subtracted." |
| `{ m: 0 }` | m = 1 | "x means 1x, so the gradient is 1." |
| `{ m: 0 }` | m = −1 | "−x means −1x, so the gradient is −1." |
| `{ m: −m }` | m < 0 | "Keep the minus sign. The number multiplying x is −4." |
| `{ m: −m }` | m > 0 | "There's no minus in front of the x term, so the gradient is positive: 5." |
| `{ c: −c }` | c < 0 | "The equation subtracts 7, so the y-intercept is −7." |
| `{ c: −c }` | c > 0 | "The equation adds 3, so the y-intercept is positive: 3." |
| `{ m: m }` | always | "The gradient is right. Check the y-intercept: the number added or subtracted, with its sign." |
| `{ c: c }` | always | "The y-intercept is right. Check the gradient: the number multiplying x, with its sign." |

Fallback: "The gradient is the number multiplying x. The y-intercept is
the number added or subtracted. Keep their signs." The example numbers in
the table are filled from m and c (formatted with `−`).

## Practice

Endless generator through `runQuestionSet`, as the template does,
`session_length` 8: four typed cards and four choice cards, alternating
(typed first), with option order shuffled by the seeded helpers as the
template does. If `runQuestionSet` can't mix choice and number items in
one session, stop and ask. No highlighting or prompts beyond the
question.

### Typed (two-field)

"Look at y = 5x + 1. Enter the gradient and the y-intercept.", fields
Gradient / y-intercept, `readingRules(m, c)`. Correct: "Right. The
gradient is 5 and the line crosses the y-axis at (0, 1)."

Four of these six types per session, chosen by the seed, no repeats:

| Type | m | c | Example |
|---|---|---|---|
| `positive` | 2 to 9 | 1 to 9 | y = 5x + 1 |
| `negative-intercept` | 2 to 9 | −9 to −1 | y = 2x − 7 |
| `negative-gradient` | −9 to −2 | 1 to 9 | y = −4x + 3 |
| `both-negative` | −9 to −2 | −9 to −1 | y = −3x − 5 |
| `hidden-one` | 1 or −1 | −9 to 9, not 0 | y = x − 6, y = −x − 2 |
| `no-intercept` | ±2 to ±9 | 0 | y = 6x |

### Choice

One of each per session. Every wrong option is a real mistake; drop any
that comes out the same as another option. Unless a row says otherwise,
m is ±2 to ±9 and c is ±1 to ±9.

**`match-equation`**: "Which line has gradient −4 and y-intercept 7?"

| Option | Feedback |
|---|---|
| **y = −4x + 7** | "Right. −4 multiplies x and 7 is added." |
| y = 7x − 4 (swapped) | "That swaps them. The gradient is the number multiplying x." |
| y = 4x + 7 (m sign) | "Check the sign of the number multiplying x." |
| y = −4x − 7 (c sign) | "Check the sign of the number added or subtracted." |

**`crossing-point`**: "Where does y = 3x − 6 cross the y-axis?"

| Option | Feedback |
|---|---|
| **(0, −6)** | "Right. The y-intercept is −6, so the line crosses at (0, −6)." |
| (−6, 0) | "On the y-axis, x is 0. So the point is (0, −6)." |
| (0, 3) | "3 multiplies x, so it's the gradient. Use the number added or subtracted." |
| (0, 6) | "Keep the sign. The equation subtracts 6." |

**`direction`**: "Which way does the line y = −2x + 5 go, from left to
right?"

| Option | Feedback |
|---|---|
| **2 down for every 1 right** | "Right. The gradient is −2, so the line goes down." |
| 2 up for every 1 right | "The gradient is −2. Negative means the line goes down." |
| 5 up for every 1 right (c's size, c's direction) | "5 is the y-intercept. The gradient is the number multiplying x." |

**`hidden`**: alternates by seed between two forms.
- "What is the gradient of y = −x + 4?" (m = ±1)

  | Option | Feedback |
  |---|---|
  | **−1** | "Right. −x means −1x." |
  | 1 | "Keep the minus sign: −x means −1x." |
  | 0 | "There is a number multiplying x: −x means −1x." |
  | 4 | "4 is the y-intercept. The gradient multiplies x." |

- "What is the y-intercept of y = 6x?" (c = 0)

  | Option | Feedback |
  |---|---|
  | **0** | "Right. y = 6x means y = 6x + 0." |
  | 6 | "6 multiplies x, so it's the gradient. Nothing is added." |
  | It doesn't have one | "Every sloping line crosses the y-axis. Nothing is added, so it's 0." |

Never |m| = |c| in any type.

## Check

Seven fixed questions in `questions.js` (five choice, two typed), through the shared card as the
template does, choice options shuffled once and saved. No hints beyond
the feedback after each answer.

1. **Aisha's mistake** (choice). "Aisha looks at y = 4x − 2. She says:
   'The gradient is −2 and the y-intercept is 4.' What has she done
   wrong?"
   - **"She has swapped them. The gradient is 4 and the y-intercept is
     −2."**: "Right. 4 multiplies x, so it's the gradient. 2 is
     subtracted, so the y-intercept is −2."
   - "She has swapped them. The gradient is 4 and the y-intercept is 2.":
     "Swapped, yes, but keep the sign: the equation subtracts 2."
   - "Nothing. She is right.": "The gradient is the number multiplying x.
     Which number is that?"

2. **Describe the line** (choice). "Without drawing it, which describes
   the line y = −3x + 5?"
   - **"It crosses the y-axis at (0, 5) and goes 3 down for every 1
     right."**: "Right. The gradient is −3, so the line goes down from
     left to right."
   - "It crosses the y-axis at (0, 5) and goes 3 up for every 1 right.":
     "The gradient is −3. A negative gradient means the line goes down."
   - "It crosses the y-axis at (0, −3) and goes 5 down for every 1
     right.": "That swaps them. −3 multiplies x, so it's the gradient. The
     y-intercept is 5."
   - "It crosses the y-axis at (5, 0) and goes 3 down for every 1
     right.": "On the y-axis, x is 0. So the point is (0, 5)."

3. **Ben's claim** (choice). "Ben says: 'y = 7x has no y-intercept,
   because there's no number after 7x.' Is he right?"
   - **"No. y = 7x means y = 7x + 0. The y-intercept is 0, so the line
     goes through (0, 0)."**: "Right. Nothing added means the y-intercept
     is 0."
   - "Yes. The line never crosses the y-axis.": "Put x = 0 in:
     y = 7 × 0 = 0. The line crosses the y-axis at (0, 0)."
   - "No. The y-intercept is 7.": "7 multiplies x, so it's the gradient.
     Nothing is added: y = 7x + 0."

4. **Read it** (two-field). "Look at y = −2x + 7. Enter the gradient and
   the y-intercept." Answer −2 and 7, `readingRules(-2, 7)`.

5. **Which line?** (choice). "Which line crosses the y-axis at (0, −1)?"
   - **"y = 4x − 1"**: "Right. It subtracts 1, so the y-intercept is −1."
   - "y = −x + 4": "−x means −1x, so −1 is the gradient here. This line
     crosses at (0, 4)."
   - "y = x + 1": "This line adds 1, so it crosses at (0, 1)."
   - "y = −4x": "Nothing is added, so this line crosses at (0, 0)."

6. **Read it** (two-field). "Look at y = x − 5. Enter the gradient and the
   y-intercept." Answer 1 and −5, `readingRules(1, -5)`.

7. **Both at once** (choice). "Which line crosses the y-axis below zero
   and goes up from left to right?"
   - **"y = 2x − 4"**: "Right. Gradient 2 goes up; y-intercept −4 is below
     zero."
   - "y = −2x + 4": "Gradient −2 goes down, and it crosses at (0, 4),
     above zero."
   - "y = −4x − 2": "It crosses below zero, but gradient −4 goes down."
   - "y = 4x + 2": "It goes up, but it crosses at (0, 2), above zero."

Summary after the results (the template's summary block), three points:
- "The number multiplying x is the gradient."
- "The number added or subtracted is the y-intercept."
- "Keep their signs."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `main` (first build round).
- Unit tests for `equations.js`: every `equationText` form listed above;
  `readingRules` for each row (including skipped rows and order); the
  generator gives four different typed types and one of each choice
  type, alternating, |m| ≠ |c|, no duplicate options, the same session
  for the same seed.
- Add `tests/ui/gradient-and-intercept.spec.cjs`: a full correct run
  through all four sections; Learn 2 with a wrong tap first; Learn 3 by
  keyboard; Learn 5 both prompts by keyboard on the sliders; a wrong-then-
  right Practice answer where Try again keeps the right box; reload
  mid-Learn 5 after prompt 1.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and touch emulation):
  - a full run ending on All lessons and the homepage, on the PHP site
    and the built `dist/` site
  - Learn 2: every row of the tap table, by tap and by keyboard
  - Learn 3: drag forward and back, arrow keys; the table and arrows
    follow; reload keeps the point
  - Learn 5: slider drag and keyboard keep focus; the disabled slider
    can't move; arrows follow the rule above for every m and c (or
    disappear); reload in each prompt
  - Learn 6: each button; the hidden parts show
  - no arrow or point label sits on a line, axis or another label, at
    375 px too
  - the two answer boxes sit on one line at 375 px; the phone keyboard
    offers a minus
  - every `readingRules` row shows its feedback once
  - every wrong option in Try it, Practice and Check shows its own
    feedback, and Practice never shows two options the same
  - reload in every section and phase; Back from every screen and Next
    forward again
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage lists the lesson under Algebra, straight after Finding the
  gradient, with the new subtitle, and in the Graphs collection. The
  `finding-the-gradient` browser test still passes.
- `./build.sh`, then commit `dist/`.

## Commits

1. Part A1: question card `fields`.
2. Part A2: graph `pick`.
3. Part B: the lesson (with `skills.json`, `curriculum.json`, the tests
   and `dist/`). Commit this file with it.

## Report

- After Part A: both commit hashes, both test results compared with
  `main`, and the Part A checks. Then stop.
- After Part B: the commit hash, both test results, every check above,
  and the planned maximum score.
- **Template findings:** every place you had to go beyond the template,
  the shared components or the shared graph, every `CHANGE:` marker that
  was unclear, and anything you'd change. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
