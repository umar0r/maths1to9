# Shared graph component

Spec for one shared coordinate graph that every graph lesson uses: axes,
grid, points, lines, curves and drawing a line, with the same look, touch
behaviour, snapping and accessibility everywhere. Built on JSXGraph, with
our own thin wrapper so lessons never call JSXGraph directly.

Coming lessons that will use it: horizontal and vertical lines (the
first), gradients, equations of a straight line, quadratic graphs,
solutions from graphs, cubic and reciprocal graphs, kinematic graphs and
rates of change.

## Why

Each of those lessons needs the same base. If each draws its own, every
lesson has its own touch, snapping and screen-reader bugs, and every fix
is made seven times. With one component, a fix or a new feature reaches
every graph lesson. Lessons keep their own content, marking and
feedback.

## Before you start

- `docs/custom-answer-widget.md` must be merged into `main` first (the
  question widget helper below uses it). If it isn't, stop and say so.
- Create `codex/shared-graph` from `main`.
- Read `docs/shared-lesson-components.md` (principles, section state,
  question card and its custom answer widget) and look at how
  `content/solving-quadratic-equations/index.php` loads KaTeX from
  `vendor/`.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, the template
  or any lesson.
- Leave this file unchanged. If something here is wrong or impossible,
  stop and say so; don't work around it.

## Principles

- **Only graph lessons load it.** Nothing is added to `app.css`, the
  template or any lesson that doesn't draw a graph. A graph lesson opts in
  with three tags in its own `index.php` (see "Loading it").
- **Lessons call the wrapper, never JSXGraph.** All JSXGraph code lives in
  `assets/js/graph.js`. If a lesson needs something the wrapper can't do,
  that lesson's spec adds it to the wrapper deliberately; the lesson never
  reaches past it. This keeps the look the same everywhere and lets us
  swap the library later.
- **Build only what is specced here.** Gliders, tangents, shading, tables
  of values and so on are added by the lesson spec that first needs them,
  not now.
- **Lessons own content and marking.** No lesson text, targets or feedback
  in the wrapper. Wording the wrapper shows has a plain-English default
  and an option to replace it.
- **The wrapper doesn't save anything.** It reports changes; the lesson
  saves them with `useSectionState` or the question card.
- **Readable code** in the engine's style. No minified one-liners.

## JSXGraph

- Version **1.14.0** (current on npm, MIT or LGPL-3.0-or-later; we use it
  under MIT). Pin it; never load it from a CDN.
- Get it with `npm pack jsxgraph@1.14.0` in a scratch folder outside the
  project. Copy into `vendor/jsxgraph/`: `jsxgraphcore.js` and
  `jsxgraph.css` from `distrib/`, and the package's MIT licence file. Add a
  one-line `vendor/jsxgraph/VERSION` with `1.14.0`. Nothing else, and don't
  add it to `package.json`.
- `build.sh` already copies `vendor/` to `dist/`; check it arrives.
- Report the size of `jsxgraphcore.js`.

## Loading it

A graph lesson adds these to its own `index.php`, before its own scripts:

```html
<link rel="stylesheet" href="../../vendor/jsxgraph/jsxgraph.css">
<link rel="stylesheet" href="../../assets/css/graph.css?v=1">
<script src="../../vendor/jsxgraph/jsxgraphcore.js"></script>
<script src="../../assets/js/graph.js?v=1"></script>
```

- `assets/css/graph.css` holds every graph style. Colours come from the
  existing custom properties in `app.css` (`--success-dark`,
  `--error-dark` and the text and border colours); don't add new colour
  values.
- `graph.js` must load without `window.JXG`, so the board-free helpers
  (`snap`, `classify`, `length`, `formatNumber`, `formatPoint`) work on
  their own, including in unit tests. Check for `window.JXG` inside
  `Maths1to9Graph.create()` (which `questionWidget`'s `render` calls) and
  throw there: "Load vendor/jsxgraph/jsxgraphcore.js before creating a
  graph."
- When `graph.js` or `graph.css` changes later, bump its `?v=` in every
  lesson that loads it, and only those.

## The API

On `window.Maths1to9Graph`:

```js
const graph = Maths1to9Graph.create(host, {
    x: [-6, 6], y: [-6, 6],               // default both −6 to 6
    label: 'Coordinate grid for drawing y = 4'   // the graph's accessible name
});

graph.point([1, 4], {
    tone: 'neutral',            // 'neutral' | 'correct' | 'incorrect' | 'muted'
    size: 'large',              // 'small' (default) | 'large'
    coordinates: true,          // show "(1, 4)" beside it
    highlight: 'y',             // in that label, emphasise 'x' or 'y'
    label: 'A',                 // optional text instead of coordinates
    drag: 'x',                  // false (default) | 'x' (across only) | 'y' (up and down only) | 'free'
    onMove: ([x, y]) => {}      // whole numbers, after snapping
});

graph.line({ axis: 'y', value: 4 }, { tone, label: 'y = 4' });   // full horizontal line
graph.line({ axis: 'x', value: -2 }, { tone, label });           // full vertical line
graph.line({ m: 2, c: -3 }, { tone, label });                    // y = mx + c, across the grid
graph.segment([-2, 3], [4, 3], { tone, label });

graph.plot(x => x * x - 2, { tone, label, domain: [-3, 3] });   // y = f(x)

const tool = graph.drawLine({ ... });   // the pupil draws a line, below

graph.describe('Your line goes from (−3, 4) to (5, 4).');  // the live line under the graph
item.update({ tone, label, value });    // every call above returns an item
item.remove();
graph.clear();                          // remove everything but the axes
graph.setEditable(false);               // read-only: nothing drags or draws
graph.destroy();                        // free JSXGraph's board
```

Plus helpers that need no board, for marking and tests:

```js
Maths1to9Graph.snap([2.4, 3.6]);          // [2, 4]: nearest whole-number point
Maths1to9Graph.classify({ from, to });    // { kind: 'horizontal', value: 4 } | { kind: 'vertical', value: -2 }
                                          // | { kind: 'sloping', m, c } (c null if vertical can't apply)
Maths1to9Graph.length({ from, to });      // in grid units
Maths1to9Graph.formatNumber(-2);          // '−2' (Unicode minus)
Maths1to9Graph.formatPoint([-3, 4]);      // '(−3, 4)'
```

`classify` treats a line as horizontal when both ends have the same y, and
vertical when both have the same x. For a sloping line it gives `m` and `c`
as plain numbers (they may be fractions; the lesson decides what to do
with them).

### Axis steps, arrows and drawing options (added 2026-10-12)

- `create(host, { x: [-6, 6], y: [-12, 12], step: { x: 1, y: 2 } })`
  defaults each step to 1. Grid lines occur at multiples of the step;
  labels show their values in units. `labelEvery` counts grid lines.
  With `step`, the board's aspect ratio follows its number of grid squares,
  keeping each square square. Points, lines, plots and drawing coordinates
  remain in units. Dragging, drawing and arrow keys snap one grid step.
  `snap([1.2, 3.1], { x: 1, y: 2 })` gives `[1, 4]`; existing calls
  without a step are unchanged. Axis steps must be positive finite numbers.
- `graph.arrow(from, to, { tone, label, labelSide, dash })` returns the
  usual updatable/removable item. It is a 3 px segment with a compact
  arrowhead at `to`, drawn below marked points. Its label sits at the
  midpoint, below horizontal arrows and right of vertical arrows by default. `labelSide` can be `above`, `below`,
  `left` or `right`; the label flips to the opposite side when needed
  and stays within the grid, with pixel clearance from the arrow and
  axis numbers and axis strokes. It tries the opposite side or nudges the
  label when needed. Point coordinates and text labels use the same placement,
  avoiding given lines and arrows as well.
- `tone: 'ink'` uses the existing `--text` colour, including helper lines
  and arrows. No additional colour values are introduced.
- `dash: true` draws dashed segments and arrows; the default is solid.
- `graph.point([1, 3], { drag: 'positions', positions: [[1, 3], [2, 5],
  [3, 7]], onMove })` jumps to the listed position nearest the pointer
  on screen. The list must be non-empty. Keyboard Right/Up selects the
  next position and Left/Down the previous, stopping at the ends. As for
  other draggable points, `onMove` runs once per changed position, and
  the keyboard operates when there is exactly one draggable point.
- `drawLine({ movable: false })` starts a replacement drawing even near
  an existing line, and Shift + arrow does nothing. The default is `true`.
- `drawLine({ tone(line, { finished }) { … } })` receives `finished: false`
  during a preview and `true` after release (also for restored lines and
  keyboard-finished lines). Return `neutral` until finished for feedback
  only on release. Existing callbacks can ignore the extra argument and
  continue to colour the line live.

## How it looks

- Square, width 100% up to 440 px, height equal to the width. At 375 px it
  fits inside the 16 px gutters with no sideways scrolling.
- One grid square per unit. Every whole number labelled on both axes (0
  once, at the origin), with the Unicode minus `−`, never a hyphen. For a
  range wider than 12 units, label every 2 (an option, `labelEvery`, for
  later lessons).
- Axis names `x` and `y` at the positive ends, with arrowheads. Light grid
  lines, darker axes.
- Text in the site font (Nunito), at least 12 px at 375 px.
- Tones: neutral is the site's blue; correct is `--success-dark`;
  incorrect is `--error-dark`; muted is light grey. A drawn line is 4 px
  wide and sits above the axes, so a line on an axis stays visible.
- Colour is never the only signal: a line or point with tone `correct` or
  `incorrect` and a label gets ✓ or ✗ after the label.
- Switch off everything we don't use: JSXGraph's zoom, pan, navigation
  buttons, copyright text and its own keyboard handling.

## Accessibility

- The board is one Tab stop with `role="application"` and
  `aria-label` from `label`, plus a visible focus outline.
- Under the graph, a one-line `aria-live="polite"` region that
  `graph.describe(text)` fills. The wrapper fills it itself for the
  drawing tool and for dragged points ("Point at (3, 4).") unless the
  lesson passes its own text.
- Every key action below works without a mouse. The wrapper owns the keys;
  JSXGraph's keyboard support stays off so there's one behaviour.

## Dragging points

- `drag: 'x'` moves across only, `'y'` up and down only, `'free'` any
  way. The point snaps to whole numbers and stays inside the grid.
- `onMove` is called once each time the snapped position changes, not on
  every pointer move.
- Keyboard: when the graph is focused and has exactly one draggable point,
  arrow keys move it one unit (only the allowed directions).
- The coordinates label updates as it moves.

## Drawing a line

```js
const tool = graph.drawLine({
    line: null,                     // a saved { from, to } to show, or null
    minLength: 2,                   // shorter lines are "not finished"
    extend: true,                   // horizontal and vertical lines run to the edges once released
    tone: line => 'neutral',        // called while drawing and on release; lesson decides live red/green
    label: line => null,            // text after release, or null for none
    onChange: line => {},           // the finished line after release or move, or null
    shortText: 'Draw a longer line.'
});
tool.set(line);    // show a line (restore, or clear with null)
tool.get();        // current { from, to } or null
```

- **Drag:** press anywhere on the grid and drag. A straight line previews
  from the start to the finger. Never freehand.
- **Tap, tap:** a tap (press and release without moving more than 8 px)
  sets a start point, shown as a dot; a second tap sets the end.
- **Keyboard:** when the graph is focused, a crosshair appears at (0, 0)
  with its coordinates beside it. Arrow keys move it one unit; Enter or
  Space sets the start, then the end. Escape cancels a half-drawn line.
- **Snapping:** both ends always snap to the nearest whole-number point
  (`snap`), so a pupil never draws between grid points by accident, and a
  wrong row or column is never moved onto a different one.
- **Coordinates above the finger:** while dragging, the snapped end's
  coordinates show 40 px above the finger (so the finger doesn't cover
  them), kept inside the graph at every edge and corner.
- **Too short:** a line shorter than `minLength` stays neutral, shows
  `shortText` in the live region and gives `onChange(null)`.
- **Tone while drawing:** the preview's colour comes from `tone(line)`
  once the line reaches `minLength`. A lesson that wants live red/green
  returns it; one that judges on Check always returns `'neutral'`.
- **Extending:** with `extend`, a released horizontal or vertical line runs
  to the grid edges; `from` and `to` given to `onChange` are the edge
  points. A sloping line stays as drawn.
- **Moving:** pressing within 20 px of a horizontal or vertical line and
  dragging moves it across or up and down in whole units. Pressing
  anywhere else draws a new line, which replaces the old one. No reset
  button. Keyboard: with a line drawn and no crosshair point set, Shift +
  arrow moves the line one unit.
- **Live region:** after release or move, "Your line goes from (−3, 4) to
  (5, 4)." (formatted with `formatPoint`), then the lesson's own feedback
  if it calls `describe`.
- `onChange` is called on release and after a move, never during a drag,
  so a lesson saving on `onChange` writes once per line.
- `setEditable(false)` stops drawing and moving.

## Scrolling and motion

- `touch-action: none` on the board only: the page doesn't scroll while
  the pupil draws inside the graph, and scrolls normally anywhere else.
- Under `prefers-reduced-motion`, no animation (extending, appearing);
  changes are instant.

## Question widget helper

So a graph question works in Practice and Check with no extra code:

```js
const widget = Maths1to9Graph.questionWidget({
    graph: { x: [-6, 6], y: [-6, 6], label: 'Coordinate grid for drawing y = 3' },
    setup(graph) {},                        // optional: draw given points or lines first
    draw: { minLength: 2, extend: true },   // drawLine options; tone is neutral until checked
    isEmpty: line => line === null,
    mark: line => ({ correct, feedback }),  // the lesson's judging
    answerText: line => 'You drew y = 2.',
    resultTone: (line, phase) => 'correct' | 'incorrect',   // colour after Check
    resultLabel: line => 'y = 2'            // label shown after Check
});

Maths1to9Lesson.createQuestion(container, { ..., input: 'custom', widget });
```

- Returns an object with `render`, `isEmpty`, `mark` and `answerText` as
  `docs/custom-answer-widget.md` defines.
- `render` creates the graph, runs `setup`, and starts `drawLine` with the
  saved line. Its `onChange` passes the line to the card's `onChange`.
- `update({ value, editable, phase })`: in phase `'answer'`, shows the
  value neutral and editable; in `'wrong'` or `'correct'`, shows it with
  `resultTone` and `resultLabel`, not editable. It never recreates the
  board.
- `focus()` focuses the board.

## Tests

`tests/shared-graph.test.cjs` for the board-free helpers (they must work
without `window.JXG`):

- `snap` at and either side of the halfway points, including negatives
  (−2.5, −0.4) and the grid edges.
- `classify` for horizontal, vertical, sloping (positive and negative `m`,
  fractional `m`), and a line on each axis.
- `length` for horizontal, vertical and sloping lines.
- `formatNumber` and `formatPoint` use `−`, never `-`.
- `graph.js` loads without `window.JXG`, and `create()` then throws the
  error above.

Don't add browser tests for the component itself; the first lesson's
browser solver covers it.

## Checks

- `npm test` and `npm run test:ui` both pass, compared with `main`. No
  lesson loads the graph yet, so the browser suite should match `main`
  exactly.
- `node --check assets/js/graph.js`.
- In the browser: a throwaway lesson page (a copy of the template, **not
  committed**) that loads the graph, with one Learn screen showing a
  draggable point (`drag: 'x'`), a `graph.line`, a `graph.plot` of
  y = x² − 2, and a `drawLine` with live red/green for y = 4, and one
  Practice question using `questionWidget`. Check, desktop and 375 px, and
  on touch emulation:
  - drawing by drag, tap-tap and keyboard only
  - snapping, the coordinates above the finger at all four corners, a
    short line staying neutral, extending, moving and replacing a line
  - y = 0 and x = 0 visible on the axes
  - the point only moves its allowed way, by mouse and arrow keys
  - the live region text (with VoiceOver if you can)
  - the page scrolls when swiping outside the graph, not inside it
  - a wrong-then-right Practice answer, reload in each phase, Back to the
    read-only card and its results row
  - minus signs on the axes are `−`
  - no console errors, and nothing of JSXGraph's own UI showing
- `./build.sh`: `dist/vendor/jsxgraph/` and `dist/assets/js/graph.js` are
  there; the throwaway page works from `dist/` too (then delete it).

## Commit

One commit: `vendor/jsxgraph/`, `assets/js/graph.js`,
`assets/css/graph.css`, the tests, and the rebuilt `dist/`. Commit this
file with it.

## Report

- The commit hash, both test results compared with `main`, and every
  check above.
- The size of `jsxgraphcore.js`.
- Anything JSXGraph made hard (especially tap-tap, the coordinates above
  the finger, and keyboard drawing), and what you did.
- Anything in this spec that didn't fit, and what you did. Then stop: the
  horizontal and vertical lines lesson comes after review.
