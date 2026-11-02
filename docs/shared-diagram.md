# Shared geometry diagram

Spec for one shared diagram maker that every angle, shape and bearing
lesson uses. It draws points, lines, angles with their arcs and labels,
right-angle squares, parallel arrows, equal-side ticks, polygons, north
lines, bearings and a protractor. Every lesson gets the same look, the
same touch behaviour and the same accessibility. It is plain SVG with no
library.

Lessons that will use it, in order: angle facts, triangles and
quadrilaterals, polygons, bearings. Later: pie charts could move to it,
and the circle, Pythagoras and trigonometry lessons.

## Why

The graph component (`docs/shared-graph.md`) solved this for coordinate
graphs. Geometry needs the same thing without axes. Without it, each
lesson draws its own SVG, its own angle arcs and its own label placement,
and every lesson gets its own overlapping-label bug at 375 px. With one
component, a fix reaches every geometry lesson. Lessons keep their own
content, marking and feedback.

## Why SVG and not JSXGraph

- Geometry diagrams are mostly still pictures, and a Practice set shows
  one in every card. A JSXGraph board per card is heavy.
- The marks we need (angle arcs, right-angle squares, parallel arrows,
  ticks, north arrows, protractor scale) are simple SVG paths. Drawing
  them ourselves gives the exam look exactly.
- The only interactions are: drag a point, turn a line around a point,
  and tap an angle, side or point to choose it. Pointer events on SVG
  cover all three.

## Before you start

- Create `codex/shared-diagram` from **`origin/main`** (run
  `git fetch origin` first).
- Read `docs/shared-graph.md`, then `assets/js/graph.js` and
  `assets/css/graph.css` on `origin/main`. Copy their patterns: the
  `window.Maths1to9Graph` object, `tone`, `describe`, `questionWidget`,
  board-free helpers that load without the DOM, the label halo. Use the
  same names where the idea is the same.
- Read `docs/custom-answer-widget.md` (the widget contract) and
  `docs/shared-lesson-components.md`.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, `graph.js`,
  `graph.css`, the template or any lesson.
- Leave this file unchanged. If something here is wrong or impossible,
  stop and say so; don't work around it.

## Principles

- **Only diagram lessons load it.** Two tags in a lesson's own
  `index.php` (see "Loading it"). Nothing added to `app.css` or the
  template.
- **Lessons call the API, never draw their own SVG** for things the API
  covers. If a lesson needs something new, that lesson's spec adds it here
  deliberately.
- **Build only what is specced here.** Circles, arcs of circles, sectors,
  shading regions, 3D shapes, constructions and loci are added by the
  spec that first needs them.
- **Lessons own content and marking.** No lesson text in the component.
  Wording the component shows has a plain-English default and an option
  to replace it.
- **The component doesn't save anything.** It reports changes; the lesson
  saves them.
- **Readable code** in the style of `graph.js`. No minified one-liners.

## Loading it

```html
<link rel="stylesheet" href="../../assets/css/diagram.css?v=1">
<script src="../../assets/js/diagram.js?v=1"></script>
```

- New files: `assets/js/diagram.js`, `assets/css/diagram.css`.
- Colours only from the existing custom properties in `app.css`
  (`--text`, `--text-muted`, `--border-dark`, `--surface`,
  `--primary`, `--accent`, `--success-dark`, `--error-dark` and their
  backgrounds). No new colour values.
- `diagram.js` must load in Node with no `window` or `document`, so the
  helpers (see "Helpers") work in unit tests. Export them with
  `module.exports` when `module` exists, as well as on
  `window.Maths1to9Diagram` when `window` exists.

## Coordinates

- The lesson gives positions in maths units: x to the right, **y up**,
  any scale (for example a triangle at `[0, 0]`, `[6, 0]`, `[2, 4]`).
- Angles are in degrees. Turning is anticlockwise for maths angles.
  Bearings are clockwise from north (see `fromBearing`).
- The component fits the drawing to the host:
  - Width is the host's width (CSS `width: 100%`, `max-width: 440px`,
    centred). Height comes from the shape of the view, capped at
    `max-height: 360px`; if the cap bites, the width shrinks to keep the
    shape.
  - The view is the `view` option (`{ x: [min, max], y: [min, max] }`) if
    given. Otherwise it is the box around every item drawn before the
    first paint, plus room for labels (at least 32 px each side). It is
    worked out **once**, and again only when the lesson calls `fit()`,
    so dragging never makes the drawing jump.
  - Equal scale on both axes, always. A square looks square.
- **Text stays a real 16 px on every screen.** Draw the SVG in screen
  pixels (`viewBox` = the host's pixel size), not a fixed viewBox that
  shrinks text on phones. On resize (`ResizeObserver`) repaint at the new
  size; never recreate items or lose state.

## The API

On `window.Maths1to9Diagram`:

```js
const diagram = Maths1to9Diagram.create(host, {
    label: 'Two parallel lines crossed by a third line',  // accessible name, required
    view: { x: [-1, 9], y: [-1, 6] },  // optional; default fits the items
    grid: false,                       // true: square grid every 1 unit; or { step: 2 }
    note: 'Not drawn accurately'       // optional caption under the diagram
});
```

Every drawing method returns a handle. Wherever a method takes a
position, it takes either `[x, y]` or a point handle. Items given a point
handle follow it when it moves.

### Points

```js
const A = diagram.point([0, 0], {
    label: 'A',              // optional
    mark: 'dot',             // 'dot' (default) | 'cross' (maps) | 'none'
    tone: 'neutral',
    drag: false,             // see "Dragging"
    onMove: ([x, y]) => {}
});
A.position();   // [x, y]
A.moveTo([1, 2]);
```

- **Label placement:** the label sits in the middle of the biggest gap
  between everything that leaves that point (segments, rays, lines, angle
  arcs). With nothing attached, it sits above-right. Lessons can force a
  side with `labelSide: 'above' | 'below' | 'left' | 'right'`, but the
  default must look right for every shape in the Checks list.

### Lines

```js
diagram.segment(A, B, {
    tone: 'neutral',
    dashed: false,
    ticks: 0,           // 1, 2 or 3 small marks: sides with the same count are equal
    arrows: 0,          // 1, 2 or 3 arrowheads mid-line: lines with the same count are parallel
    label: '8 cm',      // optional; drawn beside the middle of the segment
    labelSide: 'auto'   // 'auto' (outside the shape) | 'left' | 'right' of A→B
});

diagram.ray(A, B, { ... });    // from A through B to the edge of the view
diagram.line(A, B, { ... });   // through A and B, edge to edge
diagram.polygon([A, B, C], { ...segment options for every side, fill: false });
```

- `'auto'` side for a segment label: the side away from the middle of the
  drawing, so side lengths sit outside a triangle or polygon.
- `fill: true` gives the polygon a soft fill (`--primary-light`).
- `ticks` and `arrows` are centred on the segment and sized so they read
  at 375 px.

### Angles

```js
diagram.angle(B, A, C, {   // the angle at A, between AB and AC
    turn: 'smaller',       // 'smaller' (default) | 'anticlockwise' | 'clockwise' (from AB to AC)
    label: '58°',          // optional: '58°', 'x', '2x + 10°', or 'auto' for the size
    arcs: 1,               // 1, 2 or 3 arcs: angles with the same count are equal
    square: 'auto',        // 'auto': a square, not an arc, when the angle is 90°; or false
    tone: 'neutral',
    select: false          // see "Choosing"
});
```

- `turn: 'smaller'` draws the angle under 180°. `'anticlockwise'` and
  `'clockwise'` can give a reflex angle (needed for angles around a
  point and bearings over 180°).
- The arc radius is 28 px, larger for small angles so the label fits
  (at least 44 px under 35°). The label sits on the line that halves the
  angle, just outside the arc.
- `'auto'` label shows the size rounded to the nearest degree, `58°`. It
  updates when a point moves.
- Several angles at the same point must not put labels on top of each
  other. Test the four angles at a crossing and the three angles around
  a point in the Checks list.

### Bearings

```js
diagram.north(A, { length: 2 });             // a north line up from A, arrowhead and "N"
diagram.bearing(A, B, { label: 'auto' });    // north line at A + clockwise angle from north to AB
```

- `bearing` draws the north line itself (if A doesn't already have one)
  and the clockwise angle from north round to AB. `'auto'` label is three
  figures: `058°`, `128°`, `305°`.

### Protractor

```js
diagram.protractor(A, {
    zero: B,                   // the 0 line points from A towards B; or a direction in degrees
    turn: 'anticlockwise',     // or 'clockwise' (bearings: zero at north, clockwise)
    full: false                // false: half circle (180°); true: full circle (360°)
});
```

- A still picture laid over the diagram (it doesn't drag or turn): marks
  every 1°, longer every 5°, numbered every 10° on the outer scale. Only
  one scale (not the inner and outer of a real protractor: that is a
  known mistake source and the lesson can teach it with a picture).
- Faint enough that the lines underneath stay clear
  (`--primary` at low opacity), numbers with the label halo.

### Tones

`'neutral' | 'highlight' | 'correct' | 'incorrect' | 'muted'`

- `highlight` (`--accent`) is for Learn: "look at this angle". Thicker
  line and arc.
- `correct` / `incorrect` for marked answers, as in the graph.
- Every handle has `setTone(tone)`, `setLabel(text)`, `show()`, `hide()`
  and `remove()`. Changing them repaints that item only.

### Dragging

`drag` on a point:

- `'free'`: anywhere in the view, snapped to whole units (or `snap: 0.5`).
- `{ around: A, step: 1 }`: turns round A at a fixed distance, so the ray
  or segment from A turns like a clock hand. The angle snaps to `step`
  degrees (default 1).
- `{ along: [A, B] }`: slides along segment AB, snapped to whole units.

Rules:

- `onMove` is called on every snapped change while dragging, so a Learn
  label like "angle = 58°" can update live. Also `onRelease(position)`
  once when the pupil lets go: lessons save on `onRelease`, not `onMove`.
- Only the dragged item's group repaints during a drag. Never rebuild the
  whole SVG on each move (the past slider-loses-focus bug).
- The touch target is at least 44 px across, even if the dot is small.
  A draggable point shows a soft ring so pupils can see it moves.
- `touch-action: none` on the SVG **only while a drag has started on a
  draggable point**. Swiping anywhere else on the diagram scrolls the
  page. (A diagram fills most of a phone screen; a page that won't scroll
  over it is a trap.)
- Keyboard: a draggable point is focusable (`tabindex="0"`). Arrow keys
  move one snap step (for `around`: left/down turns anticlockwise one
  `step`, right/up clockwise). Shift + arrow moves ten steps.
- `setEditable(false)` on the diagram stops all dragging and choosing.

### Choosing

`select: true` on an angle, segment or point makes it tappable, for
questions like "Tap the angle that is alternate to a."

- `diagram.onSelect(handle => {})` is called on tap.
- `diagram.select(handle | null)` shows the chosen item (thicker,
  `--primary`, arc filled softly). One chosen item at a time.
- The tap target for an angle is its whole arc sector out to the label,
  at least 44 px. For a segment, 22 px either side of the line.
- Keyboard: tappable items are in tab order (in the order they were
  added). Space or Enter chooses.
- Each tappable item needs `name` (for example `name: 'angle a'`) for its
  accessible label. Throw a `TypeError` if `select: true` has no `name`.

### Accessibility

- The SVG has `role="img"` and the `label` as its name when nothing in it
  is interactive; `role="group"` when something can be dragged or chosen.
- Draggable points: `role="slider"` with `aria-valuetext` the lesson can
  set (default: "A at (2, 3)" or, for `around`, "Turned to 58°").
- A live region under the diagram, like the graph's: `describe(text)`
  sets it. Dragging says nothing by itself until release.
- Minus signs are `−` (use `formatNumber`).
- Under `prefers-reduced-motion`, no transitions.

### Lesson methods

- `diagram.fit()`: re-fit the view to the current items.
- `diagram.describe(text)`: set the live region.
- `diagram.setEditable(bool)`.
- `diagram.clear()`: remove every item (for redrawing a question).
- `diagram.destroy()`: remove listeners and the observer.

## Helpers

On `Maths1to9Diagram`, and loadable in Node:

- `fromBearing(start, bearing, distance)` → `[x + d·sin θ, y + d·cos θ]`.
- `bearingOf(from, to)` → 0 up to (not including) 360.
- `angleAt(a, vertex, b, turn = 'smaller')` → degrees.
- `formatAngle(58)` → `'58°'`; `formatBearing(58)` → `'058°'`;
  `formatBearing(360)` → `'000°'`.
- `formatNumber(-2.5)` → `'−2.5'` (as in the graph).
- `regularPolygon(n, centre, radius, startAngle = 90)` → the n corner
  positions, anticlockwise, the first at `startAngle`.
- `labelDirection(directions)` → the direction (degrees) in the middle of
  the biggest gap between the given directions; 45 when the list is
  empty. This is what point labels use.
- `snapAngle(angle, step)`.

## Question widget helper

So a diagram question works in Try it, Practice and Check with no extra
code. Two kinds:

```js
// Tap to choose: "Tap the angle alternate to a."
Maths1to9Diagram.questionWidget({
    diagram: { label: '…', note: 'Not drawn accurately' },
    setup(diagram) {},            // draw it; mark tappable items with select + name
    answer: 'choose',
    mark: name => ({ correct, feedback }),
    answerText: name => `You chose ${name}.`
});

// Drag: "Turn the line to show a bearing of 120°."
Maths1to9Diagram.questionWidget({
    diagram: { ... },
    setup(diagram) {},            // must create exactly one draggable point
    answer: 'drag',
    isEmpty: position => position === null,   // null until the pupil first moves it
    mark: position => ({ correct, feedback }),
    answerText: position => 'You turned it to 120°.'
});
```

- Returns `render`, `isEmpty`, `mark`, `answerText` as
  `docs/custom-answer-widget.md` defines. The saved value is the chosen
  item's `name`, or the dragged point's position.
- `update({ value, editable, phase })` in `'wrong'` or `'correct'` shows
  the answer in `incorrect` / `correct` tone and stops editing. It never
  recreates the diagram.
- A reload in any phase shows the same answer in the same place.
- For plain multiple-choice and typed questions with a still diagram,
  lessons pass the card's existing `figure(host, { readOnly })` option
  (see `createQuestion` in `lesson-engine.js`) and call `create` inside
  it; no widget needed. Do the same in the test page.

## Tests

`tests/shared-diagram.test.cjs`, Node only, no DOM:

- `fromBearing` and `bearingOf` round trip at 0, 45, 90, 135, 180, 270,
  305 and 359°, to 1e-9.
- `angleAt` for all three `turn`s, including a reflex angle and exactly
  180°.
- `formatBearing` at 0, 5, 58, 128, 359.6 (→ `'000°'`), 360.
- `regularPolygon` for n = 3, 4, 6, 8: equal sides, right interior
  angle each.
- `labelDirection`: empty list, one direction, two opposite, a crossing
  of four, and three around a point.
- `diagram.js` loads with no `window`, and `create()` then throws
  "Maths1to9Diagram.create needs a browser."

No browser tests for the component itself: the angle facts lesson's
checks will cover it.

## Checks

- `node --check assets/js/diagram.js`; `npm test` passes, and the
  browser suite matches `origin/main` exactly (no lesson loads the
  diagram yet).
- A throwaway test page (a copy of the template in
  `content/zz-diagram-test/`, **never committed**) with one Learn screen
  for each picture below and one Practice question of each widget kind.
  Screenshot each at desktop width and at 375 px with
  `relay/tools/learn-shots.cjs`:
  1. Two parallel lines (arrows: 1) crossed by a third, all eight angles
     drawn and labelled `a` to `h`. No label touches a line or another
     label.
  2. A point with three angles round it (120°, 95°, x), reflex angles
     included.
  3. A triangle with sides labelled `5 cm`, `7 cm`, `8 cm` outside it,
     two equal-side ticks variant, and a right-angled triangle showing a
     square.
  4. A regular hexagon from `regularPolygon` with one interior and one
     exterior angle marked (the side extended with a dashed segment).
  5. Bearing of B from A = 128° with north lines at A and B and the
     back bearing 308° at B. Labels read `128°` and `308°`.
  6. A half protractor on a 58° angle, and a full clockwise protractor
     at a north line.
  7. Learn interaction: a ray turning round a point (`around`, step 1)
     with a live `'auto'` angle label. Drag by mouse and touch, and with
     the keyboard. The page still scrolls when you swipe on the diagram
     away from the point.
  8. A "tap the angle" question: wrong then right, reload in each phase,
     Back to the read-only card.
  9. A "turn to a bearing" drag question: same checks as 8.
- Resize from desktop to 375 px with the test page open: everything
  repaints, text stays 16 px, nothing is lost.
- No console errors.
- `./build.sh`: `dist/assets/js/diagram.js` and `dist/assets/css/diagram.css`
  exist. Delete the test page and rebuild so it isn't in `dist/`. Check
  with `grep -r zz-diagram-test dist/` (no output).

## Commit

One commit: `assets/js/diagram.js`, `assets/css/diagram.css`,
`tests/shared-diagram.test.cjs`, this file, and the rebuilt `dist/`.
Push `codex/shared-diagram`. No PR, no merge.

## Report

- The commit hash, `npm test` and `npm run test:ui` compared with
  `origin/main`.
- Every check above, with the screenshot paths for 1 to 9 at both widths.
- The size of `diagram.js`.
- Where label placement was hard and what you did.
- Anything in this spec that didn't fit, and what you did. Then stop: the
  angle facts lesson spec comes after review.
