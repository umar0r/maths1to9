# Shared number cards

Load `../../assets/css/digit-cards.css?v=1` and
`../../assets/js/digit-cards.js?v=1` before the lesson scripts.
The shared implementation was extracted from the decimal lesson's
`additionCardsWidget` and `buildWidget`; lessons keep their maths and marking.

## Cards and slots

`Maths1to9DigitCards.create(host, options)` adds the tray and connects slots.
Each slot is a real button supplied by the lesson or by `columnTable`:

```js
const view = Maths1to9DigitCards.create(host, {
    slots: [
        { id: 'answer:units', element: unitsButton, group: 'answer', column: 'units' },
        { id: 'answer:tenths', element: tenthsButton, group: 'answer', column: 'tenths' }
    ],
    groups: { answer: { advance: 'left' } },
    active: 'answer:tenths',
    value: savedValue,
    editable: true,
    disabledDigits: [],
    onChange(value) { /* save through the section or custom question */ },
    onPaint({ value, active, editable, phase }) { /* update table decorations */ }
});
```

Slots are listed left to right within each group. `advance` is `none` by
default, or `left` / `right`. It skips filled and disallowed slots, wraps to
an earlier unfilled slot, and clears the selection when the group is full.
With `none`, placing a digit leaves that slot selected. An optional
`allowed(value)` function on a slot controls whether it can be filled.

Values are plain JSON: `{ digits: { 'answer:units': '8' }, active: 'answer:tenths' }`,
or `null` before any work. Selection changes are saved too. Selecting a filled
slot keeps its digit until replaced or erased. `onChange` sends a new object.
The component has no storage, score, marking rules or feedback boxes.

Tap a slot, then a digit. Type 0–9 or Backspace/Delete while the widget has
focus. Digits fly from the card to the slot in 200 ms. Drag any card onto an
allowed slot with mouse, touch or pen. A drop elsewhere returns to the tray
without changing the answer. Only cards prevent touch scrolling; the rest
of the page scrolls normally. Reduced motion places digits instantly and
returns cancelled drags instantly. Cards remain available for dragging even
when no slot is selected. Tapping one then leaves the answer unchanged.

`view.update({ value, editable, phase })` restores saved work without reporting
an input change. `editable: false` locks all controls. `focus()` focuses the
chosen or first allowed slot. `destroy()` removes the tray and active flights.
Slots retain classes supplied by the lesson. In `onPaint`, use the shared
`answer-choice is-correct` or `answer-choice is-incorrect` classes on the
slot button to mark it, and remove those classes on retry. No feedback is drawn.

## Column tables

```js
const built = Maths1to9DigitCards.columnTable({
    label: 'Add in columns',
    columns: [
        { id: 'units', label: 'units' },
        { id: 'point', label: 'decimal point' },
        { id: 'tenths', label: 'tenths' }
    ],
    rows: [
        { id: 'first', values: { units: '7', point: '.', tenths: '6' } },
        { id: 'second', sign: '+', faded: false,
            values: { units: '0', point: '.', tenths: '4' } },
        { id: 'answer', sign: '=', answer: true, highlighted: false,
            values: { units: { slot: 'answer:units', label: 'Units answer digit' },
                point: '.', tenths: { slot: 'answer:tenths', label: 'Tenths answer digit' } } }
    ],
    cellExtra(cell, { row, column }) { /* append a carry or other decoration */ }
});
```

Put `built.table` inside a `digit-card-chart` wrapper above the tray. It fits
at 375 px. `point` is the narrow decimal-point column. Columns may include
other places such as thousands. Row `sign` supports +, − and =. `answer`
adds the thick line; `faded` greys a row and `highlighted` colours it blue.
Optional `className` is available for lesson-specific pictures and notes.
The result exposes `table`, `cells[rowId][columnId]`, `rows[rowId]` and `slots`.
Pass those slots straight to `create`. The cell hook runs as the table is
drawn, so extras need no later DOM insertion.

`built.update({ activeColumn, faded: { rowId: true }, highlighted: { rowId: true } })`
sets the light green working column and row states. It never rebuilds inputs.

## Custom questions and retained work

In the lesson widget's `render(host, { value, editable, onChange })`, build the
table and return `create(host, { slots: built.slots, value, editable, onChange })`.
The engine calls its `update` on Check, retry, Reset, Back and reload. Keep
`isEmpty`, `mark` and `answerText` in the lesson. Use `lockedReview: true` for
retained question cards. If a guided widget uses `reset` or `replayFeedback`,
forward them to the same view's `update`. No engine or progress changes are
needed. The decimals migration keeps its saved shape and state versions.
