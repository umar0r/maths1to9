# Browser test fixes

Spec for making the browser suite (`npm run test:ui`) pass, before step 2 of
`docs/shared-lesson-components.md` starts. Based on the 25 failures listed on
2026-10-09 against `8ae4e83` (107 passed, 25 failed).

## Decisions (made by the user, 2026-10-09)

1. **Outdated tests may be updated** (failures 1–5, 7–15). Each test keeps
   what it checks; only the way it finds things on the page changes. Never
   delete an assertion, loosen a check, add a skip, or raise a timeout to
   make a test pass. If keeping a check means the lesson must change, change
   the lesson and say so.
2. **Pie charts is hidden until it is rebuilt** (failures 6, 23, 24). Don't
   fix it. It gets a proper lesson spec later.
3. **Negative numbers is fixed now** (failures 20, 21, and 5 after the
   lesson change), not left for the shared-components migration.

## Before you start

- Work on `codex/shared-lesson-components`, after `8ae4e83`.
- Don't touch `docs/shared-lesson-components.md` or this file.
- Reproduce one failure from each group below before changing it, so you
  know the fix is what makes it pass.

## Every commit

- One commit per group below (A to F), in that order.
- Bump the `?v=` of every lesson file you change in that lesson's
  `index.php`. Don't change `lesson-engine.js` or `app.css` in this batch;
  if a fix seems to need that, stop and ask.
- Run `./build.sh` and commit the rebuilt `dist/` with the change.
- After each commit, run `npm test` and `npm run test:ui`. Each commit's
  message lists the browser result, for example "test:ui 115 passed, 10
  failed (was 107/25)". No commit may add a failure.
- Write readable code in the style of the file you're changing. Don't
  reformat lines you aren't changing.

## A. Hide pie charts

Lesson folders starting with `_` are already skipped by the homepage, the
build and every test (like `_template`).

- Rename `content/pie-charts` to `content/_pie-charts` with `git mv`.
- Remove its entry from `content/curriculum.json`. Leave
  `interpret-pie-charts` and `construct-pie-charts` in `content/skills.json`;
  the rebuilt lesson will use them.
- Delete `tests/ui/solvers/pie-charts.cjs` (the engine-runs test finds
  lessons from the solver files, so it would look for a lesson that no longer
  exists). The rebuilt lesson gets a new solver.
- Search the whole project (not `dist/` or `node_modules/`) for `pie-charts`
  and `pie charts`. Remove any links or recommendations that point to it,
  and report what you found.
- Check: the homepage doesn't list it, `dist/content/pie-charts/` doesn't
  exist after `./build.sh`, and `npm test` still passes.

Fixes 6, 23 and 24.

## B. Lock later tabs in the custom lessons

Failures 18, 19, 21, 22: in adding-decimal-numbers,
convert-a-fraction-to-a-percentage, negative-numbers and
percentages-of-amounts, every section tab can be clicked on a fresh start.

Copy what significant-figures already does: a tab is `disabled` when its
stage is after the furthest stage the pupil has reached. In
`content/significant-figures/lesson.js` the tab markup has
`${i > slides[state.highest].stage ? 'disabled' : ''}`, and the click handler
ignores stages past `state.highest`. In each lesson:

- Later tabs are `disabled` (the real attribute) until reached.
- Reaching a stage through the main button unlocks its tab. The tab stays
  unlocked after a reload.
- Stages a pupil has reached stay clickable, as now.
- A deep link (`#practice`, `#check`…) to a stage not yet reached opens the
  furthest stage reached instead. It never unlocks the stage or awards
  points.
- Pupils with saved progress: work out the furthest stage from what they've
  already done, so no one who had reached Check finds it locked.

One commit per lesson. negative-numbers can share its commit with group C.

**Tests that open a locked stage directly.** Locking is correct, so a test
that opens a later stage straight from a fresh start (for example
`tests/ui/decimal-addition.spec.cjs` opening `#practice` and `#check`) will
now land on an earlier stage. For the four lessons in this group only, you
may change such a test's **setup** (approved by the user, 2026-10-09):

- Reach the stage the way a pupil would: answer each earlier screen and press
  the main button. Don't write saved progress into storage, and don't
  unlock tabs from the test.
- Put the setup in one helper per lesson (for example
  `reachPractice(page)`) if more than one test needs it.
- Keep every existing assertion and every step after the setup unchanged,
  with one exception: **score totals**. A test that assumed a fresh start
  (for example "the score is 5") now begins with points from the earlier
  screens. Read the score as a number right after the setup, and assert the
  exact increase the old total stood for: `expect(after - before).toBe(5)`.
  Parse the whole number; don't use `toContainText('5')`, which "15" or
  "25" would also pass. Don't replace an exact check with "went up".
- List each setup change and each converted score check in the report.

This doesn't count as adding a failure: the old test is replaced by the
same test with a longer setup.

## C. Negative numbers: one main button

Failure 20: negative-numbers has a "Check answer" button inside each
question card and no footer main button, so it breaks the one-main-button
rule.

Use the significant-figures layout: one
`<footer class="lesson-controls"><div class="button-group"><button
class="button button--primary">…</button></div></footer>` under the card,
which the tests find as `.lesson-controls button.button--primary`.

- Remove every in-card `type="submit"` button. The footer button does what
  it did: **Check answer** (disabled until an answer is chosen or typed) →
  **Try again** after a wrong answer → **Continue** after a correct one.
  Enter in a text box still checks.
- The number-line activity controls (the +, −, × choice and the Left/Right
  direction buttons) are inputs inside the activity and stay. The footer
  button is **Continue**, disabled until the number line is finished.
- The explanation self-check ("My explanation matches" / "I need to review
  it") becomes a two-option choice inside the card in a `role="group"`,
  using the shared `.button.is-selected` styles. The footer button confirms
  it. The meaning and scoring are unchanged.
- Keep everything from the retention batch: saved answers, finished views,
  the scores, and the number-line fix (it must not redraw on every slider
  move).
- Check by hand: drag the Learn slider in one movement, and use the arrow
  keys; both must move several places.

Then update `tests/ui/solvers/negative-numbers.cjs` to the new markup (it
waits for `[data-instruction]`, which no longer exists). It must still do
every activity and answer every question. Fixes 5, 20 and 21 with group B.

## D. Order of operations: Check without being ready

Failures 16, 17: opening `content/order-of-operations/#comparison` directly
shows Check before the pupil is ready, so Check can finish after its own
answers alone. The guard that sends a not-ready pupil back to Practice is
registered only after progress is restored, which is too late for a link.

- Register the readiness guard before anything restores or opens a section.
- Opening `#comparison` (or the Check tab, or `#summary`) when not ready
  opens Practice instead, exactly like clicking the locked Check tab.
- Once ready, the same links open Check as now.
- Pupils already part-way through Check stay where they are.
- Check both the source site and `dist/`.

## E. Percentages of amounts: last button label

Failure 25: the last screen's main button says "Continue" but goes to the
homepage. Label it **All lessons**, like the other lessons, and change the
note above it from "Continue returns to all lessons." to "All lessons takes
you back to the lesson list."

## F. Update the outdated tests

Change only what each item says. Keep every other line of each test.

| # | Test | Change |
|---|---|---|
| 1 | decimal addition journey, retry, scoring and four anchors | Replace the `.rounding-note` wait after Practice with the retained results (`.retained-results`). Keep every score and anchor check. |
| 2 | final check withholds answers and allows a corrected retry | Replace the `#result` wrapper with the retained results view. Still check that answers stay hidden until the Check is submitted, and that a corrected retry works. |
| 3 | algebraic-expressions full correct run | Teach `tests/ui/solvers/algebraic-expressions.cjs` to answer Try it as well as Practice. Work out each answer from the question, not from which option is marked correct in the page. |
| 4 | function-machines-find-the-input-2 full correct run | In the solver, work out the input by undoing the machine's operations in reverse order, then choose the option that matches that number and working. Don't accept any calculation that merely starts with the right numbers. |
| 7 | substituting-into-formulae full correct run | Replace the stub solver (always `false`) with a real one: read the formula and values, work out the answer, and enter it. It must get through every section. |
| 8–13 | ten-question practice … (algebraic-expressions, fractions-introduction, simplifying-fractions, with and without retry) | Replace the "Back to all lessons" link with the lesson's final **All lessons** button (`.lesson-controls button.button--primary` with that text). Still check that it is visible at the end, that clicking it reaches the homepage, and the score checks before and after. |
| 14–15 | stopping and restarting does not add score slots (fractions-introduction, simplifying-fractions) | Practice now starts when opened, so there's no Start or Stop. Keep the test's purpose: answer a question, leave the page, open `#question-bank` again, answer another, and check after each visit that `maximumPoints` hasn't changed and `answered` counts each answer once. Rename the test "leaving and returning does not add score slots". |

Number 5 (negative numbers) is part of group C.

If a test still fails after its change and the cause is the lesson, not the
test, stop and report it with the evidence. Don't change the test further.

## Done when

- `npm run test:ui` passes with 0 failures, on two runs in a row (one test
  passed and failed between earlier runs, so check it isn't random). If a
  test passes and fails on different runs, report which one and why; don't
  retry until it passes.
- `npm test` passes.
- Each lesson changed in B–E, checked by hand in the browser: a fresh start
  (tabs locked), a full run, a wrong-then-right answer, a reload in the
  middle of each section, and the phone layout (375 px).
- `./build.sh` run and `dist/` committed.

## Report

- The commit hash for each group.
- The browser and unit results after each commit.
- Every test and solver change, one line each: what it looked for before and
  what it looks for now.
- What the search for `pie-charts` found and what you removed.
- Anything you couldn't do, and why.
- Then stop. Step 2 of the shared components starts only when the user says.
