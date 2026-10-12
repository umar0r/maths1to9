# Shared lesson components

Spec for moving the parts every lesson repeats into the shared engine
(`assets/js/lesson-engine.js` and `assets/css/app.css`). Once done, a lesson
supplies its content and the engine supplies the behaviour: saving, the
question card, results, practising again and going back a screen. Read
alongside `docs/lesson-specification.md`, `docs/lesson-scoring.md` and
`docs/retain-completed-work.md`.

## Why

The retention batch showed how much each lesson repeats. From the current
code (2026-10-08):

| Repeated in lessons | How many |
|---|---|
| Own save/restore code | 22 |
| HTML escaping helper (`escape` / `esc` / `escapeHtml`) | 19 |
| Results list (`retained-results` markup) | 17 |
| Own question card (options, Check, Try again, Continue) | ~17 |
| `shuffle` and `Math.random` question picking | 12 |
| Score ring and "You're ready" panel | 8 |
| "Practise again" with earlier results | 6, each written differently |
| The same 14 lines of results CSS in `lesson.css` | 6 |

Every fix (for example the number-line bug in negative-numbers) had to be
made lesson by lesson. With shared components a fix or a new feature, like
the back button below, reaches every lesson that uses them.

## Before you start

- The user merges `codex/retain-completed-work` into `main` first. Then
  create `codex/shared-lesson-components` from the updated `main`. Don't
  start from the old branch and don't merge anything yourself.
- Read `assets/js/lesson-engine.js` (the `exposeLessonApi` function and
  `createScoreTracker`) and `assets/js/progress.js`
  (`getLessonActivityState`, `saveLessonActivityState`) before writing code.
- Leave `docs/shared-lesson-components.md` unchanged. If something in it is
  wrong or impossible, stop and say so; don't work around it.

## Principles

- **Opt-in and additive.** New functions only. No existing lesson changes
  behaviour until it is moved onto them, one lesson per commit. This
  includes the back button: it appears only in lessons that turn it on.
- **Lessons keep control of their own flow.** Animations, pauses, "Next
  split", tiles sliding into a Venn diagram all stay in lesson code. The
  engine stores state, runs plain questions, draws results and provides
  navigation.
- **The engine owns behaviour, lessons own content.** No lesson text, slugs
  or lesson-specific rules in the engine. Any wording the engine shows that
  a lesson might want to change comes from an option with a plain-English
  default.
- **Built on what exists.** Saving uses `Maths1to9Progress.
  getLessonActivityState` / `saveLessonActivityState`. Scoring uses
  `recordAssessment`, `recordActivity` and `setSectionProgress`. The main
  button uses `setSectionAction` / `clearSectionAction`. Don't add a second
  storage or scoring path.
- **No pupil loses saved work.** When a lesson moves onto a shared
  component, its existing saves are converted (see step 2), never discarded,
  unless the questions themselves changed.
- **Readable code** in the engine's existing style. No minified one-liners.

## Build order

Each step is usable on its own. For each step: build it, write its unit
tests, pilot it on the lesson named, check it in the browser, commit, then
**stop and report for review**. Don't start the next step until the user
says so.

1. Shared helpers and results CSS
2. Section state helper
3. Back button
4. Results list and score panel
5. Question card
6. Question set, with Practise again

## Every commit

- One commit per step's engine work, and one per pilot lesson.
- If the commit changes `lesson-engine.js`, bump `lesson-engine.js?v=` in
  **all** lesson `index.php` files, including `content/_template/` and the
  seven custom-renderer lessons (all 23 load it). The same for `app.css?v=`
  if it changes. Use one new number everywhere.
- If a lesson's own files change, bump that lesson's own `?v=` as well.
- Run `./build.sh` and commit the rebuilt `dist/` with the change.
- Run `npm test` (unit) and `npm run test:ui` (browser runs). Both must pass.
- Commit message names the step or the lesson, as in the retention batch.

## 1. Shared helpers and results CSS

Small functions that 12–19 lessons each define for themselves. Put them on
`window.Maths1to9LessonEngine` (the first block of `lesson-engine.js`, which
runs for every lesson, including the seven with their own renderer):

```js
const { escapeHtml, shuffle, seededRandom, randomInt } = Maths1to9LessonEngine;

escapeHtml('<b>');               // '&lt;b&gt;' (also & " ')
shuffle(array, random?);         // returns a new array; random defaults to Math.random
const random = seededRandom(seed);   // function returning repeatable 0–1 numbers
randomInt(min, max, random?);    // whole number, min and max both included
```

- `seededRandom` must use exactly the generator in
  `content/order-of-operations/questions.js` (`hydrateEntry`:
  `seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed /
  4294967296;`), so seeds already saved by that lesson still produce the
  same questions.
- Copy the `.retained-results`, `.retained-result*` and
  `.retained-try-example` rules from `content/significant-figures/lesson.css`
  into `assets/css/app.css`. Don't remove them from any lesson in this step.
- Don't change any lesson in this step.

Pilot: none. Unit tests for each helper, including: the same seed gives the
same sequence, `shuffle` doesn't change the original array, `randomInt`
reaches both ends.

## 2. Section state helper

For any activity, including custom visuals (Venn tiles, factor trees,
function machines). The lesson decides what goes in the state and when it
changes; the engine saves it and gives it back on reload.

```js
const section = await Maths1to9Lesson.useSectionState('interactive', {
    version: 1,
    initial: () => ({ screen: 0, furthestScreen: 0, items: [] }),
    upgrade: (saved, fromVersion) => convertedState   // or null
});

section.state;                       // restored state, or initial()
section.update(state => {            // change state, then save
    state.items[state.screen].stage = 'answer';
});
section.reset();                     // back to initial(), saved
```

### Storage

- The first argument is the storage key. Use the section id for new code.
  When moving an existing lesson, use the key it already saves under, so its
  saves are found. For example, HCF and LCM Learn save under `'learn'`, not
  `'explanation'`.
- Saved as `{ sharedState: 1, version, data }` under that key, through
  `saveLessonActivityState(slug, key, …)`. The engine supplies the slug;
  lessons never pass it.
- State must be plain JSON (no functions, DOM nodes, `Map`s or `undefined`
  values). Check after each update and throw a clear error naming the key if
  it isn't.

### Restoring and upgrading

On load, look at what is saved under the key:

| Saved value | What happens |
|---|---|
| Nothing | `initial()` |
| `{ sharedState: 1 }` with the same `version` | Use `data` |
| `{ sharedState: 1 }` with a different `version` | `upgrade(data, savedVersion)` |
| Anything else (the lesson's own older format) | `upgrade(savedValue, 0)` |

- If `upgrade` returns `null`, or the lesson gives no `upgrade`, use
  `initial()`. An `upgrade` returns `null` for any version it doesn't
  recognise; it never throws, because an error there would stop the
  section loading at all.
- A lesson moving onto the helper **must** provide an `upgrade` that
  converts its current saved format for version 0, so pupils keep their
  work. Return `null` only when the questions themselves changed. Never show
  a saved answer against a different question.
- Write the upgraded state straight back, so the conversion runs once.

### Saving

- `update()` saves at most once per animation frame, so dragging a slider is
  one write per frame, not one per movement.
- `update()` never redraws anything. Redrawing is the lesson's job, and only
  when something needs a new layout (see the negative-numbers number-line
  bug, where redrawing on every slider move broke dragging).
- `section.save()` (added 2026-10-11): for existing lessons that change
  their state object in place while drawing. It checks and queues a save of
  the current state, exactly like `update()` without a change. Use it
  instead of `update(() => {})`. New code should still use `update()`.
- `section.state` is always the same object. `reset()` empties it and
  copies `initial()` into it, rather than replacing it, so a lesson that
  keeps `const state = section.state` never ends up holding an old object.
- A queued save is written straight away on `pagehide` and when the page
  becomes hidden (`visibilitychange`), so closing or switching tab within a
  frame of a change never loses it.
- "Start over" already clears every saved state for the lesson; check it
  still does with the new format.
- Doesn't award points. Scoring stays with `recordActivity` /
  `recordAssessment`.

Pilot: the LCM Try it, with an `upgrade` from its current saved format. Test
with a save made before the change: it must come back as it was.

## 3. Back button

A subtle way to go back one screen, like brilliant.org: a small "‹ Back" at
the top left of the lesson card. It replaces the earlier rule of "no Back
links". Lessons still don't add their own back links or buttons; the engine
owns this one.

### Turning it on

Off unless a lesson turns it on in `lesson.json`:

```json
"navigation": { "back_button": true }
```

A lesson turns it on only once every section with more than one screen
registers back handlers (below). Otherwise the button would jump from the
third screen of Learn straight to the previous section. Custom-renderer
lessons won't have it until they're moved; for a while some lessons will
have it and some won't. That's expected.

### Where it goes

- One `<button>` the engine creates once, at the top of
  `.lesson-section-container`, above the visible section. Not inside the
  site header, not in the stage tabs.
- Text "‹ Back". `aria-label="Previous screen"`.
- Looks like a quiet text link: muted text colour, no border or background,
  small type, at least a 44 × 44 px touch area. Visible focus outline.
- Hidden (`hidden` attribute, not just invisible) when there is nothing to
  go back to.

### What it does

```js
Maths1to9Lesson.setSectionBack('explanation', { onClick: () => showScreen(state.screen - 1) });
Maths1to9Lesson.setSectionBack('explanation', null);   // first screen of this section
```

The engine decides what the button does, in this order:

1. **The visible section has a back handler:** call it. A lesson with
   several screens in a section (HCF Learn has four) registers one whenever
   it shows any screen after the first, and clears it (`null`) on the first.
2. **No handler, and there is an earlier section:** go to the previous
   section in the engine's section order with `goToSection`. It shows as it
   does today when opened from the stage tabs: finished sections show the
   pupil's retained work on their last screen.
3. **No handler and this is the first section:** the button is hidden.

### Going forward again

- **Inside a section, the lesson sets the main button.** While a lesson
  shows a screen before `furthestScreen`, it sets the main button with
  `setSectionAction(sectionId, { label: 'Next', onClick: … })`, and Next
  moves one screen forward. On `furthestScreen` it sets its normal button
  again (Next match, Check, Continue…). Keep `screen` and `furthestScreen`
  in the section state so a reload returns to the same screen.
- **Between sections, nothing new.** After going back to a previous
  section, the engine shows that section's usual forward button, as it does
  today when a pupil opens it from the stage tabs.
- **In the question set (step 6), the engine sets it.** See there.

### Rules

- **Going back only changes what is shown.** It never changes an answer,
  `firstCorrect`, the score, section completion or a Practice session, and
  never makes the pupil wait through a pause again. Earlier screens show
  their finished state straight away.
- **Unfinished work is kept.** Going back from a half-answered question and
  returning shows the same selection or typed answer (it is in the section
  state from step 2).
- **One main button.** Back is a quiet navigation control, like the All
  lessons link. The one main action button at the bottom stays the rule.
- **Keyboard:** reachable by Tab, works with Enter and Space. After going
  back, move focus to the new screen's heading (give it `tabindex="-1"` if
  it isn't focusable).
- **Hash links:** going back updates the hash the same way going forward
  does (`setSlideHash` with `replace: true` inside a section; `goToSection`
  already handles sections). Never use `history.back()`; it could leave the
  lesson.
- **A link to a screen the pupil can't open yet** (for example
  `#hcf-check-1` on a fresh start) opens the furthest screen reached, as
  now, and replaces the address with that screen's hash (`replace: true`),
  so the address always matches what is shown. (Added 2026-10-11: HCF kept
  `#hcf-check-1` in the address while showing Learn.)
- **Finished lessons.** With the back button on, the engine no longer turns
  the main button into "All lessons" on every screen once the lesson is
  finished, because that would replace Next while the pupil looks back. So
  a lesson that turns the back button on must set **All lessons** itself as
  the main action on its last screen (its summary), as HCF does in
  `questions.js`. Check this for every lesson that turns it on: finish the
  lesson, reload, go back a few screens, return to the end, and the last
  button must say All lessons and reach the homepage.

Pilot: HCF Learn (four screens, saved under `'learn'`), then turn the back
button on for HCF and check Learn → Try it → Practice → Check and back again.

## 4. Results list and score panel

The compact rows for a finished Practice or Check (rule 3 of
`docs/retain-completed-work.md`), and the score panel that 8 lessons draw
for themselves. On `Maths1to9LessonEngine`, so custom-renderer lessons can
use them later.

```js
Maths1to9LessonEngine.renderResults(container, rows, { heading: 'Your practice results' });
// rows: [{ prompt, answer, firstCorrect, explanation?, visual? }]

Maths1to9LessonEngine.renderScorePanel(container, { correct: 4, total: 5, readyScore: 4 });
```

### Results list

- One row per question: the prompt, the answer, then a mark:

  | `firstCorrect` | Mark | Screen-reader text |
  |---|---|---|
  | `true` | ✓ | Right first time |
  | `false`, answered correctly later | 2nd try | Corrected |
  | `false`, never answered correctly (Check only) | Incorrect | Incorrect |
  | `null` (older save with no record of attempts) | none | none |

  Rows need a `correct` field too, for the third case. "2nd try" means "not
  right first time", whatever the number of attempts, as in every lesson
  today.
- Screen-reader text (fixed 2026-10-11): `aria-label` on a plain `<span>`
  isn't read by most screen readers. Give the visible mark
  `aria-hidden="true"` and put the screen-reader text next to it in a span
  with a shared `.visually-hidden` class (add it to `app.css`: the standard
  clip-path/1 px pattern). The score ring does the same: its "3 out of 5
  right first time" goes in hidden text, not `aria-label`.
- `explanation` shows only on rows that weren't right first time.
- `visual` (optional): a DOM node the lesson supplies for that row, such as
  a small function-machine diagram. The engine places it; the lesson draws
  it.
- Maths in `prompt` and `answer`: plain text, or `{ latex }` rendered with
  KaTeX when the page has loaded it (plain text otherwise). Whole
  expressions render in one font.
- Read-only. No buttons inside the list.
- `heading` is optional; no heading if it's left out.

### Score panel

- Shows `correct / total` in the existing `.practice-progress-ring`, then
  "You got 4 out of 5 right first time."
- `readyScore` comes from the lesson's `question_bank.ready_score` in
  `lesson.json`. If the lesson has none (HCF and LCM don't), show only the
  ring and the sentence: no "ready" message.
- With a `readyScore`: "You're ready" when `correct >= readyScore`,
  otherwise "Keep practising". Both can be replaced through options
  (`readyText`, `notReadyText`).

Pilot: HCF and LCM finished Practice.

## 5. Question card

For plain questions: multiple choice or a typed number. A lesson supplies the
content; the engine runs the whole answer cycle and saves it.

```js
const card = Maths1to9Lesson.createQuestion(container, {
    sectionId: 'question-bank',
    questionId: 'question-bank:1:3',        // stable; the same on Try again
    questionType: 'lcm-prime-match',        // for recordAssessment
    scored: true,                           // false for Learn/Try it questions
    prompt: 'What is the LCM of 12 and 30?',
    input: 'choice',                        // or 'number'
    options: [
        { label: '60', correct: true, feedback: '2 × 3 × 2 × 5 = 60.' },
        { label: '6', feedback: "That's the HCF: the overlap only.", hint: 'The HCF uses only the overlap.' },
        { label: '360', feedback: "That's 12 × 30. It uses the overlap twice." }
    ],
    // for input: 'number'
    // answer: '72',
    // exact: false,
    // rules: [{ value: '6', feedback: "That's the HCF.", hint: 'The HCF uses only the overlap.' }, …],
    // fallback: 'Multiply every tile: 2 × 3 × 3 × 2 × 2.',
    readOnly: false,              // true: show the finished card, no input
    onFeedback: (result) => {},   // optional: lesson flashes its own visual
    onContinue: () => {}          // lesson moves on (next question, next step)
});

card.result();   // a row for renderResults
```

### The answer cycle

From `docs/lesson-specification.md`:

- One main button through `setSectionAction`: **Check** (disabled until an
  option is chosen or something is typed) → **Try again** after a wrong
  answer → **Continue** after a correct one. Enter in the number box runs
  Check.
- A wrong option greys out with a × and stays disabled; Try again keeps the
  other options. A wrong number clears the box on Try again.
- Feedback is one sentence from the lesson, shown with the shared
  `question-feedback is-correct / is-incorrect` classes. A `hint`, if the
  wrong answer has one, appears only with that feedback. There is no hint
  button.
- Options sit in a `role="group"` container so the shared
  `.button.is-selected / .is-correct / .is-incorrect` styles apply.
- `firstCorrect` is set by the first Check and never changes.
- `scored: true` calls `recordAssessment` on every Check with the same
  `questionId`, so the engine gives 10 first time and 5 when corrected.
  `scored: false` records no assessment.
- When `onContinue` runs, the card hands the main button back to the lesson.

### Typed numbers

Before comparing, the card tidies what the pupil typed:

- Remove spaces, including thin and non-breaking spaces.
- Change "−" (minus sign) and "–" (dash) to "-".
- Remove commas only when they separate thousands (`1,250` and `12,500.5`,
  not `1,25`).
- Add a 0 before a leading point (`.5` → `0.5`, `-.5` → `-0.5`).

Then:

- If the result isn't a plain number (digits, one optional point, optional
  leading "-"), show "Type a number, like 12 or 0.5." It doesn't count as an
  attempt: no Check is recorded and `firstCorrect` isn't set.
- `exact: false` (default): compare as numbers, so `5` and `5.0` match.
- `exact: true`: compare the tidied text, so `15` doesn't match `15.0`. Use
  this when the form of the answer is the skill (significant figures,
  decimal places).
- `rules` are checked in order after tidying, with the same comparison;
  the first matching rule gives the feedback and hint. Otherwise `fallback`.
- Fractions, units and algebra aren't typed-number questions; use choices,
  or keep the lesson's own input.

### Saving, going back and finished cards

- `hint` is the hint text itself, shown under the feedback (clarified 2026-10-11).
- Cards save into the section state opened with `useSectionState(sectionId, …)`, so for a section with cards the storage key must be the section id. `upgrade` only sees saves under that key, so if a lesson's old saves use a different key, stop and ask before moving that section onto cards.
- Saves its own state (selection, rejected options, typed value, phase,
  `firstCorrect`, `correct`) inside the section state from step 2, under its
  `questionId`. A reload restores the exact phase, feedback and main button.
- `readOnly: true` (used by the back button and by finished sections) shows
  the pupil's answer, the mark and the feedback, with no input and no Check.
- `onFeedback(result)` receives `{ correct, firstCorrect, option or value,
  hint }`, so a lesson can flash tiles or move part of its own picture. The
  card doesn't wait for the lesson; any pause before Continue is the
  lesson's own business.

Pilot: the HCF Check (4 fixed multiple-choice questions), with an `upgrade`
from its current saved format.

### Custom answer widget (added 2026-10-12)

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


Use `input: 'custom'` and `widget` in a card or question-set definition.
All four widget functions are required; a missing function throws a
`TypeError` naming the question. A new value is `null` (plain JSON once
answered). The engine renders one host between prompt and feedback, calls
`render` once, then immediately calls the returned handle's `update` with
the saved value, editability and phase (`answer`, `wrong` or `correct`).

During answering, `onChange` saves a JSON copy and refreshes only the main
button; it never calls `update` while dragging. Changes after checking,
continuing or on read-only cards are ignored. Check is disabled while
`isEmpty(value)`. The widget owns all keyboard handling.

Check calls `mark` once; its `correct` must be boolean or a `TypeError`
names the question. The usual first-attempt result, feedback, hint and
one assessment per scored Check are saved. The handle receives `update`
with `editable: false`; `onFeedback` receives a copy of the value.
Try again clears value to `null`, feedback and hint, updates the handle
with `editable: true` and phase `answer`, then calls optional `focus()`.
Continue calls the usual `onContinue`.

Read-only cards render with `editable: false`, update with the saved phase,
and show `answerText(value)` with the usual mark and saved feedback.
`result()` and question-set results (including earlier sessions) use
`answerText(value)`, or an empty string for `null`.

## 6. Question set, with Practise again

The runner for Practice and Check, built from steps 1–5: a session of
questions, saved, then the results, then the option to practise again.

```js
Maths1to9Lesson.runQuestionSet('question-bank', {
    version: 1,
    count: 5,                                // session length (lesson.json session_length)
    pick: (random) => [{ type: 'lcm', seed: 123 }, …],   // the session's items
    question: (item, random) => ({ … }),     // createQuestion config without ids
    resultVisual: (item) => node,            // optional, per results row
    practiseAgain: true,                     // Practice only
    heading: 'Your practice results'
});
```

### A session

- `pick(random)` runs once per session and returns one item per question:
  a question type and a seed. Save **items, not question text**, as
  order-of-operations already does. Each question is rebuilt by calling
  `question(item, seededRandom(item.seed))`, so a reload shows the same
  numbers and lesson wording never ends up in saved progress.
- Question ids: `question-bank:<session>:<n>` for Practice and
  `final-check-<n>` for Check, where `<session>` starts at 1 and `<n>` at 1.
  The engine already maps `question-bank:<session>:<n>` to the score slot
  `question-bank:<n>`.
- Shows "Question 2 of 5", reports progress with `setSectionProgress`, and
  dispatches `maths1to9:section-complete` when the last question is
  answered correctly.
- Finished: the score panel, then the results list, with one main button.
  It says **Continue** when another section follows. When the set is the
  lesson's last section (algebraic-expressions has no Check, so its
  Practice is last), it says **All lessons** and goes to the homepage, as
  every lesson's last button does. Never a "Continue" that leaves the
  lesson. (Corrected 2026-10-11.) On Check, the lesson's summary and the
  existing end-of-lesson screen follow it as today (`#summary` still
  works).
- Per-question labels come from the shared card (Check → Try again →
  Continue), replacing a lesson's own "Check answer" / "Next question" /
  "Finish lesson". Tests that check those labels may be updated to the
  card's labels for lessons moved onto the card; nothing else in them
  changes.
- Revisiting a finished set shows the same results. It never starts a new
  session on its own.

### Going back in a session

- The set registers its own back handler (step 3). From question 4, Back
  shows question 3 as a read-only card. From question 1, it clears its
  handler, so Back goes to the previous section.
- On an earlier question, the engine sets the main button to **Next**, which
  shows the following question. On the current question, the card's normal
  button returns (Check, Try again or Continue).
- From the finished results, Back shows the last question read-only.

### Practise again

Pupils can redo Practice as often as they like:

- A finished Practice shows a **Practise again** button under the results.
  It's a secondary text button (styled like Back, but on the page), not a
  second main button; Continue stays the main action.
- It starts session `<session> + 1`: new seeds, so new numbers, from the
  same question types and the same `pick`.
- **Earlier sessions are kept.** Show them under the current results as one
  closed `<details>` per session ("Earlier practice 1", "Earlier practice
  2"…, oldest first), each with its compact results. Keep the 5 most recent
  earlier sessions; drop older ones so saved progress can't grow without
  limit.
- **The score doesn't change.** The lesson's points come from the first
  session. The score tracker keeps the first result for each slot, so later
  sessions neither add nor remove points. Under the button, once, in plain
  words: "Practising again doesn't change your score."
- **It still counts as skill evidence.** `recordAssessment` records each
  answer against the pupil's skills with a session-specific id, so Daily
  Review and the skill status in `progress.js` see the new attempts. Check
  this in the browser by reading the skill progress after a second session.
- **Nothing else is undone.** Practise again never locks Check, never resets
  a finished Check, and never removes lesson completion. If a lesson gates
  Check on a ready score, that gate stays open once it has been reached.
  (order-of-operations currently resets Check and completion when practising
  again; don't copy that.)
- A reload in the middle of a later session works exactly like the first.
- Not offered on Check (decided 2026-10-08). The existing "Start over" stays
  as it is for redoing a whole lesson.

### Not for every Practice

Lessons whose Practice needs a custom activity before the answer (for
example matching tiles, then typing the LCM) don't use this runner. They use
the state helper, the question card and the results list directly, and
follow the same Practise again rules.

Pilot: the HCF Practice, with an `upgrade` from its current saved format,
then algebraic-expressions Practice (generated multiple choice that already
keeps pupils' work, so the behaviour to match is known).

## Tests

- **New unit tests** for the new functions are wanted: put them in
  `tests/shared-lesson-components.test.cjs` so `npm test` picks them up.
- **Existing tests stay unchanged**, with one exception: if a pilot changes
  a lesson's markup so that its browser solver (`tests/ui/solvers/
  <lesson>.cjs`) can no longer get through it, update that solver to the new
  markup. It must still answer every question and finish the lesson; never
  skip or weaken a step. List every solver change in your report.
  algebraic-expressions is the only pilot lesson with a solver.
- Unit tests must cover: helpers (same seed, same numbers); restore after
  reload; each row of the restore table, including a lesson's own older
  format going through `upgrade(…, 0)`; reset; `firstCorrect` never
  changing; rejected options staying disabled; typed-number tidying (each
  rule above, the "Type a number" message not counting as an attempt,
  `exact`); one assessment per Check with a stable id; no points on revisit,
  on going back or in a later Practice session; results marks for all four
  cases, with explanations only on rows not right first time; Practise
  again keeping only the 5 most recent earlier sessions and not resetting
  Check or completion.

## Browser checks for each pilot

- A full correct run, and a wrong-then-right answer (the ✓ must stay off).
- Reload in every phase (answering, wrong, correct, finished).
- A save made **before** the change still loads, with the pupil's work.
- Revisit each finished section.
- Back from every screen and Next forward again; back from a half-answered
  question and return to it; reload while on an earlier screen.
- Practise again twice, reload in the middle of a session, then check the
  earlier sessions, the score and the skill progress.
- The score is unchanged by reloads, revisits, going back and practising
  again.
- Keyboard only: Tab, Enter, Space, and arrow keys on any slider.
- Phone layout (375 px wide): no overflow, Back and the main button easy to
  tap.
- No errors in the console.
- `./build.sh`, then the same quick run on the `dist/` site.

## After the pilots

- Update `content/_template/` and `docs/lesson-specification.md` so new
  lessons use the shared components by default, including the back button
  and Practise again. Ask before this, as a separate step.
- Moving the remaining lessons (and deleting each one's own card, saving,
  results, helpers and results CSS as it moves) is a separate spec.

## Out of scope

- The seven lessons with their own `lesson.js` renderer: adding-decimal-
  numbers, convert-a-fraction-to-a-percentage, negative-numbers,
  percentages-of-amounts, pie-charts, rounding-and-significant-figures,
  significant-figures. Only the cache-version bump touches them here.
- Redoing the Check, and a "Do this lesson again" option. Not wanted for
  now. If one is added later, the lesson keeps the pupil's best score.
- Changing order-of-operations' existing Practise again. It moves with the
  other lessons later.
- Visual restyling (for example amber instead of red for wrong answers).

## Report after each step

- The commit hashes.
- `npm test` and `npm run test:ui` results.
- Each browser check above, with what you did and what you saw.
- Any solver changes, and anything in this spec you couldn't follow and why.
- Stop. Don't start the next step until the user says so.
