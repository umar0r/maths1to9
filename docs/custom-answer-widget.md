# Custom answer widget for the question card

Spec for one small, opt-in addition to the shared question card
(`createQuestion` in `assets/js/lesson-engine.js`). Today a card takes a
multiple-choice or typed-number answer. This adds a third kind, where the
lesson draws the answer area itself (a graph to draw on, points to plot, a
shape to reflect) and the engine still runs everything else.

First user: `docs/horizontal-and-vertical-lines-lesson.md`. Later: other
graph and coordinate lessons.

## Why

Without it, a lesson that needs a drawn answer has to rewrite the answer
cycle, saving, right-first-time, scoring, results and Practise again for
itself. That is the code the shared components removed from about 20
lessons, and where most past bugs were. With it, the lesson owns only its
visual and its marking.

## Before you start

- Create `codex/custom-answer-widget` from `main`.
- Read `docs/shared-lesson-components.md` (section 5, the question card,
  and section 6, the question set) and `createQuestion` and
  `runQuestionSet` in `assets/js/lesson-engine.js`.
- Opt-in and additive: no existing lesson changes behaviour. `choice` and
  `number` cards work exactly as now.
- Don't change `progress.js`, `app.css`, the template's code or any lesson.
- Leave this file unchanged. If something here is wrong or impossible,
  stop and say so; don't work around it.

## The API

```js
Maths1to9Lesson.createQuestion(container, {
    sectionId: 'question-bank',
    questionId: 'question-bank:1:3',
    questionType: 'horizontal-positive',
    scored: true,
    prompt: 'Draw y = 3.',
    input: 'custom',
    widget: {
        render(host, { value, editable, onChange }) {
            // Draw the answer area into host. Call onChange(value) whenever
            // the pupil's answer changes. value is plain JSON, or null for
            // no answer yet.
            return {
                update({ value, editable, phase }) {},  // phase: 'answer' | 'wrong' | 'correct'
                focus() {}                              // optional
            };
        },
        isEmpty(value) {},     // true: nothing to check yet
        mark(value) {},        // { correct: boolean, feedback: string, hint?: string }
        answerText(value) {}   // plain text for the results row and read-only card
    },
    onFeedback, onContinue      // as for the other inputs
});
```

The same `input: 'custom'` and `widget` work in a `runQuestionSet`
definition, because the set passes its definition through to
`createQuestion`.

## How the engine handles it

### Starting

- If `widget` is missing any of `render`, `isEmpty`, `mark` or
  `answerText`, throw a `TypeError` naming the `questionId`.
- A new custom card's saved `value` starts as `null`, not `''`. Everything
  else in the saved card is as for the other inputs (`phase`,
  `firstCorrect`, `correct`, `feedback`, `hint`).
- The engine creates one `div` for the widget where the options or number
  box would go (between the prompt and the feedback line), and calls
  `render(host, { value: saved.value, editable: phase === 'answer', onChange })`
  once. It keeps the handle that `render` returns.
- Straight after `render`, call `handle.update(…)` with the saved value
  and phase, so a reload shows a checked answer as checked.

### While the pupil answers

- `onChange(value)` is ignored unless the phase is `'answer'` and the card
  hasn't been continued. Otherwise the engine saves a copy
  (`JSON.parse(JSON.stringify(value))`) as `saved.value` with
  `section.update`, so later changes inside the widget can't alter the
  saved state.
- After `onChange`, the engine only refreshes the main button. It does
  **not** call `handle.update`, so the widget is never redrawn while the
  pupil is dragging (the negative-numbers slider bug).
- The main button is **Check**, disabled while `isEmpty(saved.value)`.
- No Enter-to-check and no other key handling: the widget owns its keys.

### Check

- If `isEmpty(saved.value)`, do nothing.
- Call `mark(saved.value)` once. If it doesn't return a boolean `correct`,
  throw a `TypeError` naming the `questionId`.
- Then exactly as a choice card: set `firstCorrect` on the first Check
  only, set `correct`, `phase`, `feedback` and `hint`, and call
  `recordAssessment` once if `scored`.
- Call `handle.update({ value, editable: false, phase })` so the widget can
  show red or green.
- `onFeedback` gets `{ correct, firstCorrect, hint, value }`, with `value`
  a copy.

### Try again

- Set `saved.value` to `null`, phase `'answer'`, clear `feedback` and
  `hint`, as the number box is cleared.
- Call `handle.update({ value: null, editable: true, phase: 'answer' })`,
  then `handle.focus?.()`.

### Continue

- As now: `onContinue`. Nothing new.

### Read-only

- Call `render` with `editable: false` and the saved value, then
  `handle.update` with the saved phase. `onChange` is never acted on.
- Under it, the answer line uses `answerText(saved.value)` with the usual
  ✓ / 2nd try / Incorrect mark, then the saved feedback, as the other
  inputs do.

### Results

- `card.result()` returns `answer: answerText(saved.value)`, or `''` when
  the value is `null`.
- `rows()` in `runQuestionSet` does the same, using `definition.widget`, so
  Practice results and earlier sessions show the text.

## Documentation

- `docs/shared-lesson-components.md`, section 5: add a short
  "Custom answer widget (added 2026-10-12)" part with the API block above
  and the rules in "How the engine handles it", in a few lines each.
- `content/_template/README.md`, "Shared behaviour": one sentence saying
  that cards take `choice`, `number` or `custom` (a lesson-drawn answer
  with `render`, `isEmpty`, `mark` and `answerText`), and that the widget
  lives in the lesson's own files.

## Tests

In `tests/shared-lesson-components.test.cjs`, with a small fake widget
(for example, a value that is a number the test sets through `onChange`):

- A missing widget function throws, naming the question.
- Check is disabled while `isEmpty`, enabled after `onChange` with an
  answer.
- `onChange` doesn't call `handle.update`.
- A copy is saved: changing the object passed to `onChange` afterwards
  doesn't change the saved value.
- `mark` is called once per Check; a non-boolean `correct` throws.
- `firstCorrect` is set by the first Check only (wrong then right gives
  `false`, `correct: true`).
- One `recordAssessment` per Check when scored; none when `scored: false`.
- Try again sets the value to `null` and calls `handle.update` with
  `editable: true`.
- `onChange` is ignored in the `'wrong'` and `'correct'` phases.
- Reload in each phase (`answer` with a value, `wrong`, `correct`)
  restores the value and phase and calls `handle.update` with them.
- Read-only renders with `editable: false` and shows `answerText`.
- `result()` and question-set rows use `answerText`; `null` gives `''`.
- Existing `choice` and `number` tests pass unchanged.

## Checks

- `npm test` and `npm run test:ui` both pass, compared with `main`. No
  lesson behaviour changes, so the browser suite should match `main`
  exactly.
- `node --check assets/js/lesson-engine.js`.
- In the browser: a throwaway copy of the template with one Practice card
  using a trivial custom widget (for example, buttons that set a number).
  Check a wrong-then-right answer, reload in each phase, Back to the
  read-only card, the results row and Practise again. **Don't commit the
  throwaway lesson.**
- Open two existing lessons that use the shared card
  (`multiplying-standard-form`, `standard-form-to-ordinary-numbers`) and
  run a Practice question and a Check question in each: no change, no
  console errors.

## Commit

One commit: the engine change, its tests, the two documentation changes,
`lesson-engine.js?v=` bumped to one new number in **all** lesson
`index.php` files (including `content/_template/` and the custom-renderer
lessons), and the rebuilt `dist/` from `./build.sh`. Commit this file with
it.

## Report

- The commit hash and both test results compared with `main`.
- Every check above.
- Anything in this spec that didn't fit the code, and what you did. Then
  stop: the horizontal and vertical lines lesson comes after review.
