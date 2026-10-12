# Horizontal and vertical lines: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components, like `standard-form-to-ordinary-numbers`. Teaches one skill:
drawing and recognising lines such as y = 4 and x = −2. Tables of values
and sloping lines are a separate lesson.

The graph is the main teaching tool. Pupils draw lines straight onto a
coordinate grid. In Learn and Try it the line turns red or green **while
they draw**, with a sentence saying what to change. In Practice and Check
it is judged when they press Check.

This is the first lesson on two new shared pieces, which must be built,
reviewed and merged first:
- `docs/custom-answer-widget.md`: the question card's `input: 'custom'`.
- `docs/shared-graph.md`: the shared graph (`Maths1to9Graph`, on
  JSXGraph), including drawing a line and its question widget helper.

The lesson supplies only its content: the screens, the targets, the
judging and the feedback. Report every place the template, the shared
components or the shared graph didn't cover what you needed (see
"Report").

## Before you start

- Check `main` has the custom answer widget (`input: 'custom'` in
  `createQuestion`) and the shared graph (`assets/js/graph.js`,
  `vendor/jsxgraph/`). If not, stop and say so. Then create
  `codex/horizontal-and-vertical-lines` from `main`.
- Read, in this order: `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/lesson-scoring.md`, `docs/retain-completed-work.md`,
  `docs/shared-graph.md`. Look at
  `content/standard-form-to-ordinary-numbers/` as a worked example of the
  template.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, `graph.js`,
  `graph.css`, the template or any other lesson. Never call JSXGraph
  directly. If the lesson needs something the shared components or the
  shared graph can't do, stop and ask; don't build your own version.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Horizontal and vertical lines |
| Slug / folder | `horizontal-and-vertical-lines` |
| Subtitle | Draw lines like y = 4 and x = −2 by keeping one coordinate the same. |
| Skill | `horizontal-vertical-lines` (new, see below) |
| Goal shown to pupils | Draw the line for an equation such as y = 4 or x = −2. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`: add, straight after `coordinates-four-quadrants`:
  `{"id":"horizontal-vertical-lines","title":"Draw and recognise horizontal and vertical lines","content_references":["A9"],"recommended_prerequisites":["coordinates-four-quadrants"]}`.
  Add `"horizontal-vertical-lines"` to `plot-linear-graphs`'s
  `recommended_prerequisites`.
- `content/curriculum.json`: add an entry in the Algebra category straight
  before `coordinates-and-linear-graphs`: folder
  `horizontal-and-vertical-lines`, the title and subtitle above, skills
  `["horizontal-vertical-lines"]`. Leave the other entries as they are.
- `content/collections.json`: add `horizontal-and-vertical-lines` to
  `graphs`, straight before `coordinates-and-linear-graphs`.
- Map every Practice and Check question type to `horizontal-vertical-lines`
  in `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. "Across" for horizontal and "up and down"
  for vertical, always next to the proper word the first time on each
  screen: "a horizontal line (across)". Say "the x-axis" and "the y-axis",
  "the x-coordinate" and "the y-coordinate". Say "line", never "graph of",
  for the pupil's drawing.
- No exam-board names or codes anywhere.
- Minus is the Unicode minus `−`, never a hyphen: y = −2, (−3, 4).
  Coordinates are written `(x, y)` with a space after the comma.
- **Learn screens:** write the equations with KaTeX. Turn KaTeX on in
  `index.php`. Render each whole equation in one `katex.render()` call.
- **Question prompts, options, feedback, graph labels and results rows:**
  plain text, for example `y = 4`, `x = −2`. One helper,
  `equation(axis, value)`, returns this text (`axis` is `'x'` or `'y'`).
  Use it everywhere a line's equation is shown.

## The graph

Every graph in the lesson is the shared graph (`docs/shared-graph.md`).
Load it in `index.php` with the four tags in its "Loading it" section,
before the lesson's own scripts. Use the defaults: −6 to 6 on both axes,
`minLength` 2, `extend: true`. Give every graph a `label` naming the
screen's task, for example "Coordinate grid for drawing y = −2".

The lesson's own code is one small file, `lines.js`, loaded before
`interactive.js` and `questions.js`, with `equation(axis, value)`,
`judge(line, target)` and `describeLine(line)`. No graph CSS in
`lesson.css`.

### Judging a line

`judge(line, target)` in `lines.js` returns `{ correct, feedback }`.
`line` is `{ from: [x, y], to: [x, y] }` from the drawing tool; `target`
is `{ axis: 'y', value: 4 }` for y = 4. It uses
`Maths1to9Graph.classify(line)` to tell horizontal, vertical and sloping
apart; it doesn't work this out itself. Direction **and** position must both be right: a
sloping line through (0, 4) is not y = 4.

Feedback, with the numbers filled in (`b` is the target, `c` is the pupil's
value):

Target **y = b**:

| Pupil's line | Feedback |
|---|---|
| y = b | "✓ Every point on this line has a y-coordinate of b." |
| y = c, c > b | "This is y = c. Move it down to b on the y-axis." |
| y = c, c < b | "This is y = c. Move it up to b on the y-axis." |
| x = b | "This is x = b. For y = b, draw across, through b on the y-axis." |
| x = c, c ≠ b | "This line goes up and down, so its y-coordinate changes. For y = b, draw across." |
| sloping | "Your line changes height. For y = b, the height stays at b all the way across." |

Target **x = a**:

| Pupil's line | Feedback |
|---|---|
| x = a | "✓ Every point on this line has an x-coordinate of a." |
| x = c, c > a | "This is x = c. Move it left to a on the x-axis." |
| x = c, c < a | "This is x = c. Move it right to a on the x-axis." |
| y = a | "This is y = a. For x = a, draw up and down, through a on the x-axis." |
| y = c, c ≠ a | "This line goes across, so its x-coordinate changes. For x = a, draw up and down." |
| sloping | "Your line moves sideways as it goes up. For x = a, it stays at a all the way up." |

When b or a is 0, use "the x-axis" or "the y-axis" in place of the
"through 0 on…" wording: for y = 0, "This is y = 2. y = 0 is the x-axis.
Move it down."

`describeLine(line)` gives the pupil's line as text for labels and
results: `y = 2`, `x = −1`, or `a sloping line from (−2, 1) to (3, 4)`
(with `Maths1to9Graph.formatPoint`).

### Two modes

- **Live** (Learn, Try it): `graph.drawLine` with
  `tone: line => judge(line, target).correct ? 'correct' : 'incorrect'`,
  so the line is red or green while it is drawn or moved. In `onChange`
  (on release, never mid-drag), show the feedback sentence with the
  shared `question-feedback is-correct / is-incorrect` classes under the
  graph, save the line, and once correct set the label to the equation
  (the graph adds ✓) and turn on the main button.
- **On Check** (Practice, Check): `Maths1to9Graph.questionWidget` (see
  Practice). The line stays neutral while drawn or moved, with no label.
  After Check it turns red or green with the pupil's own equation as its
  label, for example "y = 2 ✗", and the card shows the feedback.

## Learn

Four screens, one idea each. Each has a heading (`data-screen-heading`),
the graph and at most two short sentences. The main button is **Next
idea** on the newest screen, **Next** on earlier screens after going Back,
and Continue after the last, as the template does. Learn is unscored.
Save each screen's progress (positions visited, the pupil's line) in the
Learn section state, so reload and Back show it.

1. **What does y = 4 mean?**
   Text: "y = 4 is a rule: the y-coordinate must be 4."
   Graph: a large dot at (1, 4) with its coordinates beside it,
   `(1, 4)`, the 4 highlighted (`graph.point` with `size: 'large'`,
   `coordinates: true`, `highlight: 'y'`, `drag: 'x'`). Instruction: "Drag
   the dot left and right."
   - The dot moves across only, at height 4, snapping to whole numbers
     (drag, or ← → keys when the graph is focused).
   - The label updates live: the x changes, the highlighted 4 doesn't.
   - Each whole-number position the dot visits leaves a small muted dot
     behind (`onMove` adds a `graph.point`).
   - After four different positions, the dots join into a line across the
     whole grid, labelled y = 4, and the text below reads: "Every point on
     this line has a y-coordinate of 4. y = 4 is a horizontal line
     (across), 4 up from the x-axis."
   **Next idea** stays disabled until the line appears.

2. **Draw y = 4**
   Fresh graph, live mode, target y = 4. Instruction: "Drag across the
   graph to draw y = 4." Feedback from the judging table.
   **Next idea** turns on once the line is green.

3. **What does x = 4 mean?**
   As screen 1 but up and down: dot at (4, 1), the 4 highlighted, dragged
   up and down only (`drag: 'y'`, `highlight: 'x'`, ↑ ↓ keys). After four positions: "Every point on this
   line has an x-coordinate of 4. x = 4 is a vertical line (up and down),
   4 right of the y-axis."

4. **Draw x = 4**
   As screen 2, target x = 4. The common mistake, drawing y = 4, gets its
   row from the judging table: "This is y = 4. For x = 4, draw up and
   down, through 4 on the x-axis."

## Try it

Four screens, one line each, live mode, unscored. The main button is
**Continue**, disabled until the line is green. Use `score_activities`
`step:interactive:0`…`3` and `setSectionProgress` as the template does.
Saved in the `interactive` section state; finished screens show the green
line read-only with Next.

These are not question cards: the live feedback is the point of Try it.
Report this as a template finding.

| # | Task | Guidance shown |
|---|---|---|
| 1 | Draw y = −2. | "The y-coordinate must be −2. Find −2 on the y-axis, then draw across." |
| 2 | Draw x = −3. | "Which coordinate must be −3?" |
| 3 | Draw y = 0. | none |
| 4 | Draw x = 0. | none |

Once green, the line's label and one extra sentence:
1. "This line is 2 below the x-axis. Every point on it has y = −2."
2. "The x-coordinate stays at −3, so the line goes up and down, 3 left of
   the y-axis."
3. "y = 0 is the x-axis itself. Every point on the x-axis has a
   y-coordinate of 0."
4. "x = 0 is the y-axis itself. Every point on the y-axis has an
   x-coordinate of 0."

No target line, highlighted axis or suggested start point is shown before
the pupil draws.

## Practice

`runQuestionSet('question-bank', …)` as the template, with
`practiseAgain: true`. Each card is `input: 'custom'` with
`Maths1to9Graph.questionWidget` as its widget. Prompt: "Draw y = 3." No
guidance text.

- `isEmpty`: `line === null` (the tool gives `null` for a line shorter
  than 2 units).
- `mark`: `judge()`; the feedback is the table sentence without the ✓.
- `answerText`: "You drew " + `describeLine(line)` + ".", for example
  "You drew y = 2."
- `resultTone`: correct or incorrect from `judge()`; `resultLabel`: the
  equation from `describeLine` for horizontal and vertical lines, none for
  a sloping line.
- Value saved: `{ from: [x, y], to: [x, y] }` or `null`.

In `lesson.json`: `session_length` 6, `ready_score` 5.

### Question types

`pick` returns these six types in this order, each with its own seed.
Choose everything with the seeded `random`, never `Math.random`.

| Order | Type | Target |
|---|---|---|
| 1 | `horizontal-positive` | y = 1 to 5 |
| 2 | `vertical-positive` | x = 1 to 5 |
| 3 | `horizontal-negative` | y = −5 to −1 |
| 4 | `vertical-negative` | x = −5 to −1 |
| 5 | `axis` | y = 0 or x = 0 (seeded) |
| 6 | `mixed` | y or x (seeded), value −5 to 5, not 0 |

±6 is left out so the line never sits on the edge of the grid.

Check `judge()` in a quick script (not committed): for every target from
−5 to 5 on both axes, the right line is correct; every other horizontal
and vertical line, and a sloping line through the target's axis point, is
wrong with the matching table row; lines shorter than 2 units are empty.

## Check

Five fixed questions in `questions.js`, through the shared card as the
template does. Choice options are shuffled once and saved, as the template
does. Questions 1 and 5 use the same `questionWidget` as Practice. For
questions 2 and 3 the lesson draws a shared graph above the card (not
inside it) with `setEditable(false)`.

1. **Draw y = −3** (custom, on Check mode). Correct feedback: "Right. The
   line is horizontal (across), 3 below the x-axis."

2. **Sam's line** (choice). Graph above: a vertical line x = 4, labelled
   "Sam's line". Prompt: "Sam was asked to draw y = 4. He drew this line.
   What is the equation of Sam's line?"
   - **x = 4**: "Right. Every point on Sam's line has an x-coordinate of 4.
     For y = 4 he should draw across, through 4 on the y-axis."
   - y = 4: "Sam's line goes up and down, so its y-coordinate changes. It
     can't be y = 4."
   - y = 0: "y = 0 is the x-axis. Sam's line crosses it at 4."
   - x = 0: "x = 0 is the y-axis. Sam's line is 4 to the right of it."

3. **Two points** (choice). Graph above: dots at (−2, 3) and (4, 3) with
   their coordinates, no line. Prompt: "A straight line goes through
   (−2, 3) and (4, 3). What is its equation?"
   - **y = 3**: "Right. Both points have a y-coordinate of 3, so the line
     is horizontal: y = 3."
   - x = 3: "The x-coordinates are −2 and 4, so x isn't fixed. Look at
     which coordinate is the same."
   - x = −2: "That's the first point's x-coordinate. The second point has
     x = 4, so x isn't fixed."

4. **Which point?** (choice, no graph). Prompt: "Which point is on the line
   x = 2?"
   - **(2, −5)**: "Right. Its x-coordinate is 2. Any point with x = 2 is on
     the line, whatever its y-coordinate."
   - (−5, 2): "That point has y = 2. The x-coordinate comes first."
   - (0, 2): "That point is on the y-axis, where x = 0."

5. **Draw x = −1** (custom, on Check mode). Correct feedback: "Right. The
   line is vertical (up and down), 1 left of the y-axis."

Summary after the results (the template's summary block), three points:
- "Look at the coordinate that stays the same."
- "y = a number: a horizontal line (across)."
- "x = a number: a vertical line (up and down)."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and `npm run test:ui` both pass, compared with `main`.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and once on a real phone or touch
  emulation):
  - a full correct run through all four sections, ending on All lessons
    and the homepage, on the PHP site and the built `dist/` site
  - every row of both judging tables, drawn by hand on a Try it or
    Practice screen, shows its sentence
  - live mode: the line goes red and green while dragging, the sentence
    changes only on release; on Check mode it stays neutral until Check
  - one Try it line and one Practice line drawn by keyboard only
  - y = 0 and x = 0 visible on top of the axes in Try it 3 and 4
  - Learn screens 1 and 3: the dot moves only its own way, by drag and
    arrow keys, and the line appears after four positions
  - a wrong-then-right answer in Practice and Check: 2nd try in results
  - reload in every section and phase, including halfway through Learn
    screens 1 and 3, and with a drawn-but-unchecked Practice line
  - Back from every screen and Next forward again
  - Practise again twice, then reload; score unchanged
  - KaTeX not cut off at 375 px; no console errors
- The homepage lists the lesson under Algebra, straight before
  Coordinates and linear graphs, and in the Graphs collection.
- `./build.sh`, then commit `dist/`.

## Commits

- One commit for the lesson (with `skills.json`, `curriculum.json`,
  `collections.json` and `dist/`). Commit this file with it.

## Report

- The commit hash, both test results and every check above.
- The planned maximum score.
- **Template findings:** every place you had to go beyond the template or
  the shared components (at least Try it not using cards), anything the
  shared graph couldn't do or made awkward, every `CHANGE:` marker that
  was unclear, and anything you'd change in the template. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
