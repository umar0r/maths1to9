# Finding speed from a distance–time graph: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph, like `gradient-and-intercept`. Teaches
one skill: working out the speed for a straight section of a
distance–time graph (distance travelled in that section ÷ time taken for
that section), including a flat section meaning "stopped".

Pupils already find a gradient from a graph (`finding-the-gradient`).
This lesson links the two in one line ("on a distance–time graph, the
gradient is the speed") but works with distances and times, not rise and
run. Return journeys (lines going down), curves, speed–time graphs and
units like km/h are later lessons.

The hands-on tool in Learn is a **walker strip** (a dot moving along a
track) tied to the graph: pupils move through time and see the dot travel
and the graph grow, so the line *means* something before any
calculation.

The work is in two parts on one branch. **Part A** adds two small,
opt-in shared features: axis names and a board shape for real-life graphs,
and a unit after a number box. **Stop after Part A for review.** Part B,
the lesson, comes after approval.

## Before you start

- Check `main` has the `equations-of-straight-lines` lesson (Using
  y = mx + c). If not, stop and say so. Then create
  `codex/speed-from-distance-time-graphs` from `main`.
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
  `content/finding-the-gradient/` (graph figures on question cards) and
  `content/gradient-and-intercept/` (Learn screens, sliders, `pick`,
  two-field cards) as the worked examples.
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

## A1. Shared graph: axis names and board shape (one commit)

In `assets/js/graph.js` and `assets/css/graph.css`. Document both in
`docs/shared-graph.md`'s API section. Bump `graph.js` `?v=` in every
lesson that loads it.

```js
Maths1to9Graph.create(host, {
    x: [0, 10], y: [0, 30], step: { x: 1, y: 2 }, labelEvery: 1,
    axisNames: { x: 'Time (s)', y: 'Distance (m)' },
    aspect: 1,          // width ÷ height of the grid area
    label: 'Distance–time graph. …'
});
```

- `axisNames` replaces the `x` and `y` at the ends of the axes. The x name
  sits centred under the x-axis numbers; the y name sits above the top of
  the y-axis, starting at the axis, reading normally (not rotated). Both
  in the site font, at least 12 px at 375 px, never over a number, line or
  the other name. Without `axisNames` the board is exactly as today.
- `aspect` sets the grid area's width ÷ height, so grid squares can be
  rectangles (real-life graphs don't need square squares). It needs
  `step`; otherwise throw a `TypeError`. Without it, `step` boards keep
  square squares as today.
- With a range starting at 0 (first quadrant only), the axis numbers
  ("30", "10") and both axis names stay fully inside the board at 375 px.
  Grow the bounding box on the left and bottom as needed; don't shrink the
  text.
- Dragging, `pick`, snapping and the keyboard crosshair work unchanged on
  these boards (one grid step per key press: 1 across, 2 up).
- The crosshair and the `drag` tooltip show the point as it does now:
  `(4, 8)`. The lesson adds units in its own text.
- Unit tests: `TypeError` for `aspect` without `step`; the default
  board is unchanged. A browser test at 375 px: no axis number or axis
  name is clipped or overlapping on the board above.

## A2. Question card: a unit after the box (one commit)

In `createQuestion` (`assets/js/lesson-engine.js`), and so also in
`runQuestionSet`. Update the question card section of
`docs/shared-lesson-components.md`.

```js
{ prompt: 'What is the speed?', input: 'number', unit: 'm/s', answer: '3', … }
{ input: 'number', fractions: true,
  fields: [{ id: 'd', label: 'Distance travelled', unit: 'm' },
           { id: 't', label: 'Time taken', unit: 's' }], … }
```

- `unit` (on a number card, or on each field) is shown as plain text
  straight after its box, on the same line, not inside the input. The
  input's accessible name includes it ("Speed, in m/s" style: label, then
  "in" and the unit, via `aria-describedby` or the label).
- Results rows and read-only cards show the value with its unit:
  "3 m/s", "Distance travelled 12 m, time taken 4 s".
- A `unit` on any other input type throws a `TypeError`.
- Both boxes with units still fit on one line at 375 px.
- Unit tests next to the existing card tests: unit shown, accessible
  name, results text with and without `fields`, read-only render after
  reload, the `TypeError`.

Bump the engine's `?v=` the way the repo does for engine changes.

## Part A checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `main` (shared files changed).
- `node --check` on every changed JS file.
- `finding-the-gradient`, `gradient-and-intercept` and
  `equations-of-straight-lines` work exactly as before: one full run each.
- A throwaway page (not committed) with the board above (with `pick` and a
  `drag: 'positions'` point, by mouse, touch emulation and keyboard, at
  desktop and 375 px), a one-box card with `unit` and a two-field card
  with units (wrong then right, reload in each phase, Back to the
  read-only card).
- `./build.sh`, commit `dist/`.

Report the commit hashes and these checks, **then stop for review.**

---

# Part B: the lesson

## The lesson

| | |
|---|---|
| Title | Speed from a distance–time graph |
| Slug / folder | `speed-from-distance-time-graphs` (new) |
| Subtitle | Work out speed from a straight section of a distance–time graph. |
| Skill | `speed-from-distance-time-graph` (new, below) |
| Goal shown to pupils | Use a distance–time graph to work out how fast someone is going, and spot when they've stopped. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/skills.json`: add
  `{"id":"speed-from-distance-time-graph","title":"Find speed from a straight section of a distance–time graph","content_references":["A14","R11","R14"],"recommended_prerequisites":["calculate-gradient","speed-distance-time"]}`
  next to `kinematic-graphs`. Change nothing else.
- `content/curriculum.json`: add
  `{"folder":"speed-from-distance-time-graphs","title":"Speed from a distance–time graph","subtitle":"Work out speed from a straight section of a distance–time graph.","skills":["speed-from-distance-time-graph"]}`
  straight before `real-life-and-kinematic-graphs`. Leave that
  placeholder and every other entry alone.
- `content/collections.json`: in `graphs`, add
  `speed-from-distance-time-graphs` straight before
  `real-life-and-kinematic-graphs`.
- Map every Practice and Check question type to
  `speed-from-distance-time-graph` in `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "distance from the start", "time
  taken", "distance travelled", "steady speed", "section", "stopped",
  "steeper". Don't say "constant", "rate of change", "velocity",
  "displacement", "rise", "run" or "coefficient". "Gradient" appears
  once, on Learn 4, to link to the earlier lesson.
- Always the method in this order: **distance travelled ÷ time taken**.
  Always subtract end − start: `26 − 8 = 18 m`, `10 − 4 = 6 s`.
- Units always: `m`, `s`, `m/s`. A space between number and unit, a
  no-break space so they never wrap apart. Minus is `−`, divide is `÷`.
- **No KaTeX** (don't load it). Working is HTML in Learn and plain text
  in prompts, options, feedback and results: `Speed = 18 ÷ 6 = 3 m/s`.
- Correct speeds are whole numbers everywhere. Wrong options and feedback
  rules may be decimals (rounded to 2 dp), like Amir's 2.4 m/s.
- No exam-board names or codes anywhere. Names in questions: Amir, Lena,
  Sam, Priya (as below).

## The graph

Every graph is the shared graph, loaded in `index.php` with the four tags
from `docs/shared-graph.md`, before the lesson's scripts. A small
`journeys.js`, loaded before `interactive.js` and `questions.js`, holds
the lesson's helpers:

- `journeyGraph(host, { corners, maxDistance, section, label })` creates
  the board:

  ```js
  { x: [0, 10], y: [0, maxDistance], step: { x: 1, y: 2 }, labelEvery: 1,
    aspect: 1, axisNames: { x: 'Time (s)', y: 'Distance (m)' }, label }
  ```

  `maxDistance` is 30 unless a screen says otherwise. `corners` is the
  journey, e.g. `[[0, 0], [4, 8], [10, 26]]`, drawn as segments. If
  `section` is given (`[4, 10]`), that section is drawn tone `neutral`
  and 4 px; the rest tone `muted`. Without `section` the whole journey is
  `neutral`. Every corner time is a whole second; every corner distance is
  an even number of metres, so every corner sits on a grid corner.
- `guides(graph, [t, d])`: two dashed `ink` segments from the point to
  each axis, and the point's label as text `4 s, 8 m` (point `label`
  option, not coordinates).
- `sectionArrows(graph, [t1, d1], [t2, d2])`: an `ink` arrow from
  (t1, d1) to (t2, d1) labelled `6 s` and one from (t2, d1) to (t2, d2)
  labelled `18 m` (labels placed by the shared graph). These arrows are
  at least 3 grid squares long in every use; if a section is shorter, or
  starts on the x-axis (d1 = 0, so the across arrow would lie on the axis),
  show no arrows.
- `speedText(distance, time)`: `18 ÷ 6 = 3 m/s`.
- The practice generator.

Every graph has a `label` saying what it shows, for example
"Distance–time graph. A straight line from 0 seconds, 0 metres to
4 seconds, 8 metres, then to 10 seconds, 26 metres. The section from 4 to
10 seconds is highlighted." Never draw an arrow along an axis. Under
`prefers-reduced-motion`, everything that "appears in turn" or animates
appears at once.

**Walker strip** (Learn 1, 2 and 5): lesson code in `interactive.js` and
`lesson.css`, not shared. A horizontal track with metre marks (0 to the
screen's distance, a label every 2 m), a "Start" flag at 0 and a round dot
for the walker. Under it one line: "Time: 3 s · Distance from the start:
6 m". The dot slides (200 ms, none under reduced motion) when time
changes. It has `role="img"` and an `aria-label` that matches that line.
Existing tokens only (`--primary` dot, `--border` track, `--text-muted`
marks).

## Learn (5 screens)

One idea per screen: graph and/or walker strip, then at most three short
lines of text. Save the screen index and each screen's state in section
state, so reload and Back keep them.

1. **Speed is distance each second.** The walker strip, 0 to 12 m, and a
   labelled slider "Time (s)", 0 to 6, step 1, starting at 0. Moving it
   moves the dot 2 m per second. Prompt: "Move the time to 6 seconds."
   Once 6 has been reached once, show: "You walked 12 m in 6 seconds:
   2 m every second." "That's your **speed**: 2 metres per second,
   written **2 m/s**." "Speed = distance travelled ÷ time taken = 12 ÷ 6
   = 2 m/s." Next disabled until then. On slider `input`, update in
   place; never rebuild, so the slider keeps focus. Save on `change`.

2. **The same walk as a graph.** The walker strip above a `journeyGraph`
   with `maxDistance: 12` (corners `[[0, 0], [6, 12]]`, but the line is
   not drawn yet). A large point at (0, 0), `drag: 'positions'` over
   (0, 0), (1, 2) … (6, 12), with `guides` that follow it. The strip
   follows the point. Each position the pupil reaches leaves a small
   `muted` dot. Prompt: "Drag the point forward one second at a time."
   When (6, 12) has been reached, draw the line and show: "Across: time.
   Up: distance from the start." "The dots make a straight line, because
   you go the same distance every second: a **steady speed**." Next
   disabled until then.
   - Under the graph, one working line that updates with the point (from
     (1, 2) on): "At 4 s you've gone 8 m. 8 ÷ 4 = 2 m/s." It says 2 m/s
     at every position, which is the point of the screen.

3. **Speed for one section.** `journeyGraph` corners
   `[[0, 0], [4, 8], [10, 26]]`, section `[4, 10]`. Prompt: "Find the
   speed between 4 and 10 seconds. Tap the start of the highlighted
   section." Uses `graph.pick`. Feedback under the graph (shared
   `question-feedback is-correct / is-incorrect`); a wrong tap shows a
   small `incorrect` point until the next tap:

   | Pupil taps | Feedback |
   |---|---|
   | (4, 8) first, then (10, 26) | ✓ (see below) |
   | (0, 0) | "That's the start of the whole journey. Find where the highlighted section starts." |
   | on the line, not a section end | "That's on the line. Tap the end of the highlighted section." (or "start") |
   | the other end first | "That's the end. Tap where the highlighted section starts first." |
   | anything else | "Tap a corner of the highlighted line." |

   After the start: `guides` at (4, 8); prompt "Now tap the end." After
   the end: `guides` at (10, 26), `sectionArrows`, the picker stops, and
   three lines appear in turn: "Distance travelled: 26 − 8 = 18 m."
   "Time taken: 10 − 4 = 6 s." "Speed = 18 ÷ 6 = **3 m/s**." Then: "Use
   only the start and end of the section." Revisiting shows the found
   state.

4. **Steeper is faster.** The same graph, no section. Two in-activity
   buttons above it (shared `is-selected` class): "0 to 4 s" and "4 to
   10 s", starting on the first. Each highlights its section and shows
   one line: "8 m in 4 s: 8 ÷ 4 = 2 m/s" / "18 m in 6 s: 18 ÷ 6 =
   3 m/s". The second button also shows its `sectionArrows`; the first
   shows none, because it starts on the x-axis (revised after Codex
   asked: its across arrow would lie on the axis). Text under: "The steeper section is faster."
   "Distance ÷ time is the **gradient** of the line, so on a distance–time
   graph the gradient is the speed." Next available once both buttons
   have been chosen.

5. **A flat section.** Walker strip 0 to 12 m and `journeyGraph`
   (`maxDistance: 12`), corners `[[0, 0], [4, 12], [8, 12]]`, section
   `[4, 8]`. A large point, `drag: 'positions'` over (4, 12), (5, 12) …
   (8, 12), with `guides`; the strip follows it, and the dot stays still.
   Prompt: "Drag the point from 4 to 8 seconds. Watch the walker." When
   (8, 12) is reached: "Time goes on, but the distance stays at 12 m."
   "Distance travelled: 12 − 12 = 0 m, so the speed is 0 ÷ 4 = **0 m/s**."
   "A **flat** section means **stopped**." Next disabled until then.

Learn has no scored questions.

## Try it (4 screens)

Not scored (`scored: false`). One card at a time; the next appears after
Continue. Every card has a `journeyGraph` figure with `guides` at the
section's ends (so pupils read values from the graph, not the prompt);
corners aren't written in the prompt. Choice options are shuffled once
and saved. Number cards use `unit` (Part A2).

1. **Steady speed** (typed). Corners `[[0, 0], [5, 20]]`. "Someone walks
   at a steady speed. What is their speed?" Unit `m/s`, answer `4`.
   Rules: `0.25` "That's time ÷ distance. Speed is distance ÷ time:
   20 ÷ 5."; `20` "20 m is the distance. Divide it by the time taken.";
   `5` "5 s is the time taken. Divide the distance by it."
   Correct: "Right. 20 ÷ 5 = 4 m/s: 4 metres every second."

2. **One section** (two-field). Corners `[[0, 0], [3, 6], [7, 18]]`,
   section `[3, 7]`. "Look at the highlighted section, from 3 to
   7 seconds." Fields "Distance travelled" (m) and "Time taken" (s)
   (`fractions: true`, as `fields` requires),
   answer 12 and 4. Rules, in order: `{ d: 18 }` "18 m is the distance
   from the start at the end. Take away the 6 m already gone: 18 − 6.";
   `{ d: 6 }` "6 m is where the section starts. How much further does the
   line go?"; `{ t: 7 }` "The section starts at 3 s, not 0. Time taken:
   7 − 3."; `{ d: 12 }` "The distance is right. Check the time: end time
   − start time."; `{ t: 4 }` "The time is right. Check the distance:
   end distance − start distance." Correct: "Right. 12 m in 4 s."

3. **The speed** (choice). Same graph and section. "So what was the speed
   between 3 and 7 seconds?"
   - **3 m/s**: "Right. 12 ÷ 4 = 3 m/s."
   - 2 m/s: "That's the speed of the first section, 0 to 3 s. Use the
     highlighted one."
   - 0.33 m/s: "That's 4 ÷ 12, time ÷ distance. Speed is distance ÷
     time."
   - 12 m/s: "12 m is the distance travelled. Divide it by the 4 s
     taken."

4. **Flat** (choice). Corners `[[0, 0], [4, 12], [8, 12], [10, 20]]`,
   section `[4, 8]`. "What is happening between 4 and 8 seconds?"
   - **They have stopped.**: "Right. The distance stays at 12 m, so the
     speed is 0 m/s."
   - They are going at 12 m/s.: "12 m is how far they are from the start.
     It doesn't change, so they aren't moving."
   - They are going at a steady speed.: "A steady speed is a sloping
     straight line. A flat line means the distance doesn't change."
   - They are going back to the start.: "Going back would make the line go
     down, towards 0 m. This line stays at 12 m."

## Practice

Endless generator through `runQuestionSet`, as the template does,
`session_length` 8: four typed cards and four choice cards, alternating
(typed first), option order shuffled by the seeded helpers. Every card has
a `journeyGraph` figure (`maxDistance` 30) with `guides` at the asked
section's ends.

Journey rules for every type: corners at whole seconds 0 to 10, distances
even, 0 to 30; the journey starts at (0, 0) and never goes down; every
sloping section has a whole-number speed 1 to 6 m/s; every asked section
lasts at least 2 s; two neighbouring sloping sections have different
speeds. Drop any wrong option that equals the answer or another option.

### Typed

Four of these five per session, chosen by the seed, no repeats:

| Type | Journey | Asks | Unit |
|---|---|---|---|
| `whole-line` | one sloping section from (0, 0) | "What is the speed?" | m/s |
| `second-section` | two sloping sections, second highlighted | "What is the speed between 4 and 10 seconds?" | m/s |
| `middle-section` | three sections, middle highlighted (sloping) | same, for the middle | m/s |
| `after-stop` | slope, flat, slope; last highlighted | same, for the last | m/s |
| `distance-and-time` | two sloping sections, second highlighted | two-field: "Distance travelled", "Time taken" | m, s |

Rules for the speed types, in order (skip any equal to the answer):
whole-journey speed (end distance ÷ end time, rounded to 2 dp): "That
uses the whole journey. Use only the highlighted section."; time ÷
distance (2 dp): "That's time ÷ distance. Speed is distance ÷ time.";
end distance ÷ section time: "Take away the distance already travelled
before the section starts."; the section's distance travelled: "That's
the distance travelled. Divide it by the time taken." Fallback: "Distance
travelled in the section ÷ time taken for the section." For
`distance-and-time` use the Try it 2 rules with the numbers filled in.

Correct feedback: "Right. 18 ÷ 6 = 3 m/s." (`speedText`) or
"Right. 18 m in 6 s."

### Choice

One of each per session.

**`stopped`**: journey slope, flat, slope; the flat section highlighted.
"What is the speed between 3 and 7 seconds?"

| Option | Feedback |
|---|---|
| **0 m/s** | "Right. The distance doesn't change, so they've stopped." |
| D m/s (the flat height) | "D m is the distance from the start. It stays the same, so the speed is 0 m/s." |
| D ÷ end time of the flat section, 2 dp | "That uses the whole journey. In this section the distance doesn't change." |

**`whole-journey-mistake`**: two sloping sections, second highlighted.
"Priya says the speed between 4 and 10 seconds is 26 ÷ 10 = 2.6 m/s. What
is the speed?"

| Option | Feedback |
|---|---|
| **the section speed** | "Right. 18 ÷ 6 = 3 m/s. Priya used the whole journey." |
| Priya's speed | "That's Priya's answer. She used the whole journey, not the highlighted section." |
| end distance ÷ section time | "Take away the 8 m already travelled before the section starts." |
| section time ÷ section distance | "That's time ÷ distance. Speed is distance ÷ time." |

(Numbers are filled from the journey.)

**`fastest`**: three sloping sections with three different speeds,
labelled A, B, C on the graph (segment labels). "Which section is the
fastest?" Options A, B, C. The answer is the steepest. Each wrong option's
feedback gives its speed and the fastest: "B is 2 m/s. The steepest
section is fastest: C is 5 m/s." At least one wrong section must be
longer (more distance travelled) than the fastest, so "went furthest" is
a real trap.

**`steady-or-not`**: one journey, three or four sections, one of them
flat. "Which statement is true?"

| Option | Feedback |
|---|---|
| **"They stopped between t1 and t2 seconds."** (the flat section) | "Right. That section is flat." |
| "They stopped between t3 and t4 seconds." (a sloping section) | "That section slopes, so the distance is changing." |
| "They were fastest between t1 and t2 seconds." (the flat section) | "Flat means stopped: 0 m/s. The steepest section is fastest." |

## Check

Six fixed questions in `questions.js` (four choice, two typed), through
the shared card as the template does, choice options shuffled once and
saved. Every card has its graph figure with `guides` at the asked
section's ends. No hints beyond the feedback after each answer.

1. **Amir's mistake** (choice). Corners `[[0, 0], [4, 12], [10, 24]]`,
   section `[4, 10]`. "Amir is finding the speed between 4 and 10
   seconds. He says: 'I divided 24 by 10, so the speed is 2.4 m/s.' What
   has he done wrong?"
   - **"He used the whole journey. He should use only 4 to 10 seconds."**:
     "Right. 24 m and 10 s are for the whole journey."
   - "He should have divided 10 by 24.": "Speed is distance ÷ time, so
     dividing the distance was right. The numbers are the problem."
   - "Nothing. He is right.": "24 m and 10 s are for the whole journey,
     not the highlighted section."

2. **Fix it** (typed). Same graph. "What is the correct speed between 4
   and 10 seconds?" Unit `m/s`, answer `2`. Rules: `2.4` "That's Amir's
   answer, for the whole journey."; `3` "That's the first section,
   0 to 4 s."; `4` "Take away the 12 m already travelled: 24 − 12.";
   `0.5` "That's time ÷ distance."; `12` "12 m is the distance
   travelled. Divide it by the 6 s taken." Correct: "Right. 24 − 12 =
   12 m in 10 − 4 = 6 s. 12 ÷ 6 = 2 m/s."

3. **Who is faster?** (choice). One graph, two lines from (0, 0), labelled
   Lena (to (5, 20)) and Sam (to (8, 24)), both `neutral`, no section.
   "Lena and Sam each walk at a steady speed. Who is faster?"
   - **Lena**: "Right. Lena: 20 ÷ 5 = 4 m/s. Sam: 24 ÷ 8 = 3 m/s. Lena's
     line is steeper."
   - Sam: "Sam goes further, but takes longer. Sam: 24 ÷ 8 = 3 m/s.
     Lena: 20 ÷ 5 = 4 m/s."
   - They're the same speed: "Their lines have different steepness, so
     different speeds."

4. **After a stop** (typed). Corners `[[0, 0], [3, 6], [5, 6], [9, 22]]`,
   section `[5, 9]`. "What is the speed between 5 and 9 seconds?" Unit
   `m/s`, answer `4`. Rules: `2.44` "That uses the whole journey."; `5.5`
   "Take away the 6 m already travelled: 22 − 6."; `0.25` "That's time ÷
   distance."; `16` "16 m is the distance travelled. Divide it by the 4 s
   taken." Correct: "Right. 22 − 6 = 16 m in 9 − 5 = 4 s. 16 ÷ 4 =
   4 m/s."

5. **Stopped** (choice). Same graph, no section. "For how long did they
   stop?"
   - **2 seconds**: "Right. The line is flat from 3 to 5 seconds."
   - 6 seconds: "6 m is how far they'd gone. Read the time: 3 to 5
     seconds."
   - 5 seconds: "5 s is when they started again. They stopped at 3 s:
     5 − 3."

6. **Fastest** (choice). Corners `[[0, 0], [2, 6], [8, 18], [10, 28]]`,
   sections labelled A, B, C. "Which section is the fastest?"
   - **C**: "Right. C: 10 ÷ 2 = 5 m/s, the steepest."
   - A: "A: 6 ÷ 2 = 3 m/s. C is steeper: 5 m/s."
   - B: "B goes furthest (12 m), but takes 6 s: 2 m/s. C is fastest at
     5 m/s."

Summary after the results (the template's summary block), three points:
- "Speed = distance travelled ÷ time taken."
- "For a section, use only its start and end."
- "Steeper is faster. Flat means stopped."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score; don't hard-code it.

## Checks

- `npm test` and the **full** `npm run test:ui` both pass, compared with
  `main` (first build round of a new lesson).
- Unit tests for `journeys.js`: `speedText`; the generator gives four
  different typed types and one of each choice type, alternating; every
  journey follows the journey rules (whole seconds, even distances, never
  down, whole-number speeds, asked sections ≥ 2 s, neighbouring speeds
  differ); `fastest` always has a longer, slower section; no duplicate
  options; no rule equal to the answer; the same session for the same
  seed.
- Add `tests/ui/speed-from-distance-time-graphs.spec.cjs`: a full correct
  run through all four sections; Learn 1 slider by keyboard; Learn 2 by
  keyboard; Learn 3 with a wrong tap first; a wrong-then-right Practice
  answer; reload mid-Learn 2.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px (and touch emulation):
  - a full run ending on All lessons and the homepage, on the PHP site
    and the built `dist/` site
  - Learn 1 and 5: the strip's dot and text follow the slider / point;
    slider keeps focus while dragged and by keyboard
  - Learn 2: drag forward and back, arrow keys; dots, guides, strip and
    working line follow; the line appears at 6 s; reload keeps it
  - Learn 3: every row of the tap table, by tap and by keyboard
  - Learn 4: both buttons; arrows and labels clear of lines, axes and
    numbers
  - axis names and numbers never clipped or overlapping, on every graph,
    at 375 px
  - guides' labels (`4 s, 8 m`) never sit on a line or axis number
  - both boxes of a two-field card with units on one line at 375 px
  - every rule and every wrong option in Try it, Practice and Check shows
    its own feedback; Practice never shows two options the same
  - reload in every section and phase; Back from every screen and Next
    forward again
  - Practise again twice, then reload; score unchanged
  - no console errors
- The homepage lists the lesson under Algebra straight before Real-life
  and kinematic graphs, with its subtitle, and in the Graphs collection.
  The `gradient-and-intercept` browser test still passes.
- `./build.sh`, then commit `dist/`.

## Commits

1. Part A1: graph axis names and `aspect`.
2. Part A2: question card `unit`.
3. Part B: the lesson (with `skills.json`, `curriculum.json`,
   `collections.json`, the tests and `dist/`). Commit this file with it.

## Report

- After Part A: both commit hashes, both test results compared with
  `main`, and the Part A checks. Then stop.
- After Part B: the commit hash, both test results, every check above,
  and the planned maximum score.
- **Template findings:** every place you had to go beyond the template,
  the shared components or the shared graph, every `CHANGE:` marker that
  was unclear, and anything you'd change. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
