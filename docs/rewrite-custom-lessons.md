# Rewrite the custom-renderer lessons on the shared template

Seven lessons still draw themselves with their own `lesson.js`
(`data-lesson-renderer="custom"`). They have their own copies of saving,
scoring, question cards, results and navigation, and most of the code is
squashed into long one-line functions. Engine fixes (Back, Practise again,
tolerance, results wrapping, fraction answers) never reach them.

This job moves each one onto `content/_template/`, like every lesson built
since 12 October. **Keep each lesson's teaching and visuals. Fix only what
breaks the rules.** It isn't a redesign.

## Before you start

- `git fetch origin`. Make `codex/rewrite-custom-lessons` from
  **`origin/main`** (it should be at `e4eece5` or later).
- Work in your own worktree. Symlink `node_modules` from the main checkout;
  don't commit the symlink.
- Copy this spec from the main checkout
  (`docs/rewrite-custom-lessons.md`) and commit it in your first commit.
- Read AGENTS.md (all of it), then the rule files in its step 3.
- Example lessons: `content/standard-form-to-ordinary-numbers/` (number
  lesson: Learn screens, Try it, generator, Check) and
  `content/drawing-cubic-graphs/questions.js` (a Check that mixes typed and
  multiple-choice questions defined in code).

## The lessons, in this order

One lesson per commit. **After each lesson, report and wait for my review**
before starting the next one. Don't open a PR and don't merge; Umar merges
only when all of them are approved.

| # | Slug | Skill(s): keep exactly as in `curriculum.json` |
|---|---|---|
| 1 | `negative-numbers` | `calculate-negative-numbers` |
| 2 | `convert-a-fraction-to-a-percentage` | `fraction-percentage-conversion` |
| 3 | `adding-decimal-numbers` | `decimal-add-subtract` |
| 4 | `percentages-of-amounts` | `percentage-as-operator`, `percentage-of-amount` |
| 5 | `significant-figures` | `round-significant-figures` |
| 6 | `rounding-and-significant-figures` | `round-decimal-places`, `round-significant-figures`, `round-in-context` |
| 7 | `_pie-charts` → `pie-charts` | `construct-pie-charts` (new live lesson: see note 7) |

For lessons 1–6, don't change slugs, titles, subtitles or the
`curriculum.json` / `collections.json` / `skills.json` entries.

## What every rewritten lesson must have

**Structure (ground rules 1–3)**
- Four sections named exactly **Learn, Try it, Practice, Check**. Several
  of these lessons say "Step by step" and "Practise"; rename them.
- No `data-lesson-renderer="custom"`. The page uses the template's
  `index.php`, `lesson.json`, `interactive.js` (Learn and Try it) and
  `questions.js` (Practice and Check), plus a helper `.js` and
  `lesson.css` only if needed. Delete the old `lesson.js` and any CSS that
  the shared styles now cover (results, score ring, buttons).
- `navigation.back_button: true`, and Back works on every screen.
- All teaching goes in Learn. The first Learn screen shows the idea before
  asking anything. Reuse the lesson's existing Learn wording and visual
  (number line, place-value columns, percentage bar, digit highlighting),
  cut to one idea per screen.
- If the old lesson asks a question on a Learn screen, keep it only if the
  idea was shown on an earlier screen.

**Questions (ground rules 4–6)**
- Only the engine's main button. No lesson-drawn Check, Next, Finish or
  Back buttons, no "Show answer" links.
- Every multiple-choice question has **exactly four options**: one right
  and three real mistakes, each with its own feedback. Most of these
  lessons have three options; add the most common missing mistake (see
  the per-lesson notes). Shuffle with the seeded `random`.
- Try it, Practice and Check each mix multiple-choice and typed questions.
- Typed answers use `input: 'number'`. Use `exact: true` when the form of
  the answer is the skill (decimal places, significant figures, e.g. `3.50`
  or `0.0730`), and `fractions: true` only where a fraction is the answer.
  Typed wrong answers get `rules` for the common mistakes, plus a
  `fallback`.
- Practice is a **generator** through `runQuestionSet`, never a fixed list.
  Turn each existing Practice question into a question type with sensible
  number ranges, and map every type to the lesson's skill in
  `assessment.question_types`. Practise again must work.
- Check is fixed questions, mixed choice and typed. Reuse the existing Check
  questions where they fit the rules.
- Self-marked questions ("compare your answer with the model answer") are
  not allowed: they aren't a card. Turn them into a four-option
  "which explanation is right?" question.

**Words (ground rules 7–8)**
- Plain English for 14-year-olds. Short sentences. Read every line aloud.
  Explain any maths word the first time ("significant figure", "decimal
  place", "multiplier").
- Use the proper minus sign (−) in displayed maths.
- No exam boards anywhere.

**Saving and scoring**
- Use `useSectionState`, `createQuestion`, `runQuestionSet`,
  `renderResults` and `renderScorePanel` as the template does. No own save,
  score tracker, escape helper or results markup.
- The engine plans the maximum score. Don't hard-code it.
- **Old saves don't matter** (Umar, 2026-10-25: the site has no real
  pupils yet). Each section's `upgrade` returns `null` for anything that
  isn't its own version. No migration code and no old-save tests.

## Per-lesson notes

These are what I found. Check every question yourself as well; fix any
maths or wording that's wrong and list it in your report.

1. **negative-numbers.** Keep the number line and the rule
   a − (−b) = a + b. Some choices have three options (e.g. `5 − 3`,
   `5 + 3`, `−5 + 3`): add `−5 − 3` or similar real mistake. Check has a
   self-assessed reasoning question (`check-5`): replace it as above.
   Mistakes to cover: subtracting instead of adding, changing the sign of
   the first number, and ending with the wrong sign.
2. **convert-a-fraction-to-a-percentage.** Keep divide-then-×100. Mistakes:
   dividing the wrong way round (8 ÷ 3), forgetting to ×100, ×10 instead of
   ×100, misplacing the point.
3. **adding-decimal-numbers.** Keep the place-value column visual. It's the
   Try it activity: carrying column by column can stay as Try it steps,
   using a `custom` widget if the columns are the answer. Mistakes: not
   lining up the points (adding 2.5 + 1.25 as 25 + 125), forgetting to
   carry, dropping the point.
4. **percentages-of-amounts.** Keep the percentage bar/grid. Guided steps
   and Practice choices have three options; add a fourth. "Enter the number
   only" prompts: say what to type in plain words instead ("Type the
   percentage. Leave out the % sign."). Mistakes: dividing by the percentage
   (56 ÷ 75), using 1/5 for 75%, 7% → 0.7.
5. **significant-figures.** Keep the digit highlighting (first significant
   figure, the deciding digit). Typed answers that need zeros use
   `exact: true`. Mistakes: counting leading zeros, dropping place-holding
   zeros (147 921 → 15), rounding down when the next digit is 5 or more,
   counting from the decimal point.
6. **rounding-and-significant-figures.** Keep the slide-the-number number
   line. Mistakes: rounding to the wrong place, truncating instead of
   rounding, losing zeros (2748 → 27), the halfway case.
7. **pie-charts** (Umar decided 2026-10-24: make it a real live lesson).
   - Move `content/_pie-charts/` to `content/pie-charts/` with `git mv`. The
     slug is already `pie-charts`; keep it. Remove the `_pie-charts` copy
     from `dist/`.
   - One skill: `construct-pie-charts` (already in `skills.json`). Only
     drawing pie charts from a frequency table; reading them
     (`interpret-pie-charts`) is a later lesson.
   - Add it to `curriculum.json` in the Statistics category, straight after
     `frequency-tables-and-charts`:
     title "Pie charts", subtitle "Turn a frequency table into angles,
     then draw the chart.", skills `["construct-pie-charts"]`. No
     `collections.json` change.
   - The old draft is only two sections. Keep its method and its screens
     as the Learn order: find the total, make each share a fraction of the
     total, turn the share into an angle (× 360°), check the angles add to
     360°, draw the chart. Build Try it, Practice and Check from scratch to
     the rules above.
   - Use whole-number angles only (totals that divide 360: 12, 18, 20, 24,
     30, 36, 40, 45, 60, 72, 90, 120, 180).
   - Drawing the chart: a `custom` widget where the pupil sets each
     sector's angle (drag or type, with a protractor scale). Keep it
     usable by keyboard and at 375 px. If this needs a shared feature that
     doesn't exist, stop and ask.
   - Mistakes to cover: using 100 instead of 360, dividing 360 by the
     frequency instead of the total, angles that don't add to 360°, finding
     the angle per item but not multiplying by the frequency.
   - Add a browser solver and unit tests (every angle right, angles add to
     360°, generator gives whole-number angles for 200 seeds).
   - Check the lesson appears on the homepage in Statistics, on PHP and
     `dist/`.

## Tests

- The existing unit tests for these lessons (`tests/negative-numbers.test.cjs`,
  `adding-decimal-numbers`, `percentages-of-amounts`,
  `rounding-and-significant-figures`, `significant-figures`, and their
  helpers) read the old `lesson.js` / `lesson.json`. **You may rewrite them
  to read the new files**, keeping every kind of check that still applies:
  every answer is right, exactly one correct option, no duplicate options,
  worked sums add up, proper minus signs, explanations name the right digit.
  Add: every choice question has four options; the Practice generator gives
  correct, four-option questions for 200 seeds of every type.
- Browser solvers (`tests/ui/solvers/negative-numbers.cjs`,
  `adding-decimal-numbers.cjs`) and `tests/ui/decimal-addition.spec.cjs`:
  update them to the new markup. They must still answer every question,
  cover a wrong-then-right retry, scoring and reload, and finish the lesson.
  Never skip or weaken a step. Add a solver for every rewritten lesson that
  doesn't have one.
- List every test you changed, and why, in the report.
- First lesson: full `npm test` and `npm run test:ui` on your branch and on
  `origin/main`, and compare. Later lessons: `npm test` plus
  `node tests/runner/run-all.cjs --ui --only <slug>`.

## Checks for each lesson (in a real browser)

Desktop and 375 px with touch on. Real clicks.

- First Learn screen teaches before it asks. Every control visibly changes
  the picture.
- Every multiple-choice question shows four options; each wrong one shows
  its own feedback.
- A full correct run, and a wrong-then-right answer (✓ stays off).
- Back from every screen and Next forward again.
- Reload in each phase: answering, wrong, correct, finished.
- Practise again twice; score unchanged.
- No console errors. No overflow at 375 px.
- `./build.sh`, then the last button (All lessons) on the `dist/` site
  reaches the homepage.

## Commits

One commit per lesson, including its rebuilt `dist/` and its tests, named
"Move <lesson title> onto the shared lesson template". Push the branch after
each lesson.

## Report (after each lesson)

- Commit hash.
- Test results (and, for lesson 1, compared with `origin/main`).
- What you changed in the content and why: new fourth options, rewritten
  wording, removed or replaced questions, any maths you fixed.
- The planned maximum score.
- Every check above, with what you saw.
- Tests changed.
- Anything you couldn't do.

Then stop and wait.
