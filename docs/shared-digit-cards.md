# Shared number cards

Load `../../assets/css/digit-cards.css?v=3` and
`../../assets/js/digit-cards.js?v=3` before the lesson scripts.
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
With `none`, placing a digit leaves that slot selected. Set `wrap: false` to
stop at the last slot in the direction of travel instead of returning to an
earlier gap. Set `next: 'second'` to hand on to another group when this one
ends. The next group starts on the right for `advance: 'left'`, otherwise on
the left. Disallowed slots are never chosen. For example:

```js
groups: {
    first: { advance: 'right', wrap: false, next: 'second' },
    second: { advance: 'right', wrap: false, next: 'answer' },
    answer: { advance: 'left' }
}
```

Pass `active` to choose the starting box. An optional
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
returns cancelled drags instantly. Cards are disabled whenever there is no allowed chosen slot. A lesson that
starts with ready cards must supply an initial `active` slot. The drag copy
has no CSS transition; pointer moves use `translate3d` without easing.

`view.update({ value, editable, phase })` restores saved work without reporting
an input change. `editable: false` locks all controls. `focus()` focuses the
chosen or first allowed slot. `destroy()` removes the tray and active flights.
Slots retain classes supplied by the lesson. No feedback box is drawn.

## Marking and retry

Use `view.mark({ slotId: 'right', otherSlotId: 'wrong' })` to set slot marks,
or `view.clearMark(slotId)` to remove one. Both report the new value through
`onChange`. Marks use the site's `answer-choice is-correct` and
`answer-choice is-incorrect` classes. The lesson decides which blanks are
required and marks those wrong too.

For engine custom questions, set `keepValueOnRetry: true` on the widget.
Its `mark(value)` returns `{ correct, feedback, value:
Maths1to9DigitCards.markedValue(value, marks) }`. This pure helper copies the
value and marks, so marking never mutates the engine's supplied value.
The engine saves that returned value before updating the view.

The saved shape is `{ digits, active, marks, retrying }`; `marks` maps slot ids
to `right` or `wrong`. `update({ value, editable: true, phase: 'answer',
retry: true })` retains digits, clears only green marks, selects the first
red slot and reports that retry value through `onChange`. Groups are checked
in slot order; each group's red slots are checked right to left for
`advance: 'left'`, otherwise left to right. A selected red slot stays red
until its digit changes or is erased. Typing the same digit keeps its mark.
Advancing includes red slots even when they already contain digits.

Allow every slot while `value.retrying` is true, including slots whose
initial `allowed` rule depends on other rows being complete. Normal restore,
Back and locked review retain marks without emitting changes. Reset passes
`null` and removes all work and marks.

## Column tables

```js
const built = Maths1to9DigitCards.columnTable({
    label: 'Add in columns',
    columns: [
        { id: 'units', label: 'units' },
        { id: 'point', label: 'point', ariaLabel: 'decimal point' },
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
at 375 px. Add `digit-column-table--wide` to the table and `digit-card-chart--wide` to
its wrapper for tables with hundreds or thousands. `point` is the narrow decimal-point column. Columns may include
other places such as thousands. Row `sign` supports +, −, × and = (plain text). `answer`
adds the thick line; `faded` greys a row and `highlighted` colours it blue.
Optional `className` is available for lesson-specific pictures and notes.
The result exposes `table`, `cells[rowId][columnId]`, `rows[rowId]` and `slots`.
Pass those slots straight to `create`. The cell hook runs as the table is
drawn, so extras need no later DOM insertion.

`built.update({ activeColumn, faded: { rowId: true }, highlighted: { rowId: true } })`
sets the light green working column and row states. It never rebuilds inputs.
Headings stay on one line and fit their actual column widths after resize or
font loading. Use `ariaLabel` for an expanded accessible heading.

## Custom questions and retained work

In the lesson widget's `render(host, { value, editable, onChange })`, build the
table and return `create(host, { slots: built.slots, value, editable, onChange })`.
The engine calls its `update` on Check, retry, Reset, Back and reload. Keep
`isEmpty`, `mark` and `answerText` in the lesson. Use `lockedReview: true` for
retained question cards. If a guided widget uses `reset` or `replayFeedback`,
forward them to the same view's `update`. Use the engine retry opt-in above for marked answers. A lesson that changes
its saved value shape, flow or question list must raise its section version and use
`upgrade: () => null`.

## Short division

`Maths1to9DigitCards.shortDivision({ label, divisor, dividend, answer, carries })`
draws a bus stop with a slotted answer row above the dividend. Put its `table`
in a `digit-card-chart` and pass `slots` straight to `create`, just as for
`columnTable`. It returns `{ table, cells, slots, update }`.

```js
const built = Maths1to9DigitCards.shortDivision({
    label: '8.4 divided by 3', divisor: '3', dividend: '8.4',
    carries: { '2': '2' }
});
host.append(built.table);
const view = Maths1to9DigitCards.create(host, {
    slots: built.slots, groups: { answer: { advance: 'right' } },
    active: 'answer:0', value, editable, onChange
});
built.update({ activeColumn: '2', carries: { '2': '2' } });
```

Column ids are character indices, including the point: `8.4` has columns
`0`, `1`, `2`, and slots `answer:0`, `answer:2`. `cells.answer` and
`cells.dividend` use those column ids. Carries are small digits before a
dividend digit; pass a new `carries` map to `update` when the lesson reveals
one. Omit a carry (or use an empty string) to hide it. `activeColumn` lights
the working column pale green. Updates retain the original carries unless a
new map is supplied. Slots never rebuild.

The answer point is printed above the dividend point. For a point-placement
activity only, use `answer: { point: false }` to omit it, or
`answer: { point: gapButton }` to supply a tappable point gap while building
the table. The lesson owns that gap's behaviour. To prefill answer slots,
pass their digits to `create` and lock it with `editable: false`.

Leading zero slots can stay empty: the lesson decides which blanks count as
zero when marking. The table fits a one-digit divisor and six-character
dividend at 375 px, including `188.48`.
