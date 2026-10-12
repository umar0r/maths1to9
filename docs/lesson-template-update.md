# Lesson template update

Spec for bringing `content/_template/` and `docs/lesson-specification.md` up
to date, so every new lesson is built on the shared components from
`docs/shared-lesson-components.md` by default.

## Why

The template is older than both the lesson specification and the shared
components (checked 2026-10-12):

- It has **Method** and **Worked examples** sections and **no Check**. The
  lesson specification requires exactly four sections: Learn, Try it,
  Practice, Check, with the method and worked example inside Learn.
- `questions.js` (559 lines) and `interactive.js` (210 lines) each contain
  their own question card and button state machine. The shared question
  card replaces both.
- Nothing is saved: a reload restarts every question, and finished sections
  don't show the pupil's work.
- Practice is "endless" (`QUESTIONS_TO_COMPLETE`), not a saved session with
  results and Practise again.
- No back button, no shared helpers, no shared results.

A lesson copied from it today would break the lesson specification on day
one, and every rule the shared components fixed would have to be fixed
again by hand.

## Before you start

- The user merges `codex/shared-lesson-components` into `main` first. Then
  create `codex/lesson-template` from the updated `main`. Don't merge
  anything yourself.
- Read `docs/shared-lesson-components.md`, `docs/lesson-specification.md`,
  `docs/lesson-scoring.md` and `docs/retain-completed-work.md`.
- Don't change `lesson-engine.js`, `app.css`, `progress.js` or any existing
  lesson. If the template needs something the engine can't do, stop and ask.
- Leave this file unchanged. If something in it is wrong or impossible, stop
  and say so.

## Use only what has been proven

Build the template only from patterns that already run in a real lesson
and pass the browser suite. Copy from these, simplifying the content, not
the behaviour:

| Section | Shared components | Copy the pattern from |
|---|---|---|
| Learn | `useSectionState('learn')`, `setSectionBack`, "Next" on earlier screens | `content/highest-common-factor/interactive.js` (Learn) |
| Try it | `useSectionState('interactive')`, `createQuestion` with `scored: false`, finished examples shown read-only | `content/highest-common-factor/interactive.js` (Try it) |
| Practice | `runQuestionSet('question-bank', …)` with seeded `pick`, `practiseAgain: true` | `content/algebraic-expressions/questions.js` |
| Check | `useSectionState('comparison')`, `createQuestion` with `scored: true`, results list, summary, All lessons | `content/highest-common-factor/questions.js` |

Check uses the question card directly, as in HCF, not `runQuestionSet`:
the runner hasn't been piloted on a Check with a lesson summary.

## The template

### Files

Keep the same four files, with `CHANGE:` markers wherever lesson content
goes:

- `index.php`: current engine and `app.css` cache versions; loads KaTeX
  only if the lesson needs maths rendering (leave it in, commented, with a
  `CHANGE:` note).
- `lesson.json`
- `interactive.js`: Learn and Try it.
- `questions.js`: Practice and Check.

No `lesson.css` unless a lesson needs its own visual. Results, cards,
score panel and Back are styled by `app.css`; don't copy those styles.

### `lesson.json`

Shape it like `content/highest-common-factor/lesson.json`:

- `"navigation": { "back_button": true }`
- `section_order`: `explanation`, `interactive`, `question-bank`,
  `comparison`, and `navigation_stages` Learn / Try it / Practice / Check,
  one section each.
- No `method` or `worked_examples` blocks.
- `assessment.question_types`: one example mapping with
  `REPLACE_WITH_SKILL_ID`.
- `question_bank.session_length` (default 5) and an optional
  `ready_score` with a note saying it can be left out.
- `comparison.questions`: one example question with four options, one
  feedback sentence per option and the index of the right answer, in the
  same shape as HCF's.
- Keep the optional `video` block under `explanation`, as now.

### Learn (`interactive.js`)

- Three short example screens, one idea each, saved with
  `useSectionState('learn', { version: 1, … })` holding `screen` and
  `furthestScreen`.
- `setSectionBack('explanation', …)` on every screen after the first,
  `null` on the first.
- Main button: **Next** on screens before `furthestScreen`; the screen's
  normal label on the furthest one; Continue after the last screen.
- Each screen's heading has `data-screen-heading` for focus after Back.
- `CHANGE:` notes say: one idea per screen, a diagram or hands-on visual
  rather than paragraphs, plain English for GCSE pupils.

### Try it (`interactive.js`)

- Two example questions with `createQuestion`, `scored: false`, saved in
  `useSectionState('interactive', { version: 1, … })`.
- A `CHANGE:` hook where a lesson draws its own visual before the question,
  and `onFeedback` wired to it.
- Finished: each example shown read-only (`readOnly: true` or the lesson's
  own finished visual), never an empty "complete" card.
- Wrong options in the example content are real misconceptions, with a
  note saying so.

### Practice (`questions.js`)

- `runQuestionSet('question-bank', { version: 1, count, pick, question,
  practiseAgain: true, heading: 'Your practice results' })`.
- One example generator built from `random` (the seeded function passed
  in), so a reload rebuilds the same numbers. No `Math.random` anywhere in
  generators.
- `pick` returns `{ type, seed }` items. A `CHANGE:` note explains how to add
  more generators and map each `type` in `lesson.json`.
- Uses `Maths1to9LessonEngine.shuffle`, `randomInt`, `escapeHtml`; no copies
  of them.

### Check (`questions.js`)

- Fixed questions from `lesson.json`, option order shuffled once and saved,
  as in HCF.
- One `createQuestion` per question with `scored: true` and ids
  `final-check-<n>`.
- Back to earlier Check questions read-only; Next forward again.
- After the last question: the results list, the summary, and **All
  lessons** as the main button, reaching the homepage (`../../`).
- `#summary` opens the summary when the Check is finished.

### Things the template must not contain

- Its own question card, button state machine, results markup, escaping or
  shuffle helpers.
- A hint button. Hints appear only with the feedback after a wrong answer.
- Free-text "explain why" questions; the app can't mark them.
- Board names or spec codes (AQA, Edexcel, OCR, "N4"…).
- Internal notes in the lesson folder other than `README.md` (which is
  never copied into a lesson; see below).

### `README.md`

Rewrite it for the new template:

- How to copy it: copy the folder, rename it to the slug, set the slug in
  `lesson.json` and `index.php`, add the lesson to `curriculum.json`, work
  through every `CHANGE:` marker, **delete `README.md` from the copy** (the
  build publishes everything in a lesson folder).
- What each file does, in a few lines, pointing to
  `docs/shared-lesson-components.md` for the API.
- Keep the still-true parts: skill assessment mapping, lesson video,
  saved progress and Start over, points, hash links. Remove everything about
  the old single-button table, `QUESTIONS_TO_COMPLETE` and endless Practice.

## `docs/lesson-specification.md`

Change only what the shared components changed. Keep the rest word for
word.

- **New section "Shared components"**, after "Structure and content":
  - New lessons use the lesson engine and the shared components (section
    state, question card, question set, results list, score panel, back
    button, helpers). Copy `content/_template/`.
  - A lesson that needs its own renderer (`data-lesson-renderer="custom"`)
    needs the user's approval first.
  - Don't copy shared code into a lesson. If a lesson needs behaviour the
    engine doesn't have, propose an engine change.
- **Buttons and navigation:** add the back button (subtle "‹ Back" at the
  top, engine-owned, view-only; lessons never add their own back links),
  and that the last screen's main button says **All lessons**. Replace
  "changes from Check to Continue" with the card's cycle: Check → Try again
  → Continue.
- **Score and persistence:** add Practise again (new seeded session, earlier
  sessions kept, score unchanged, still skill evidence).
- **Structure and content:** add that wrong options must be real
  misconceptions, and that Practice generators use the seeded `random`
  they're given.
- **Per-lesson brief:** add "Practice generators and their question types"
  and "Ready score (optional)".
- Leave "Deferred test work" unchanged.
- Read `docs/lesson-scoring.md` and `docs/retain-completed-work.md`. If
  anything in them now contradicts the shared components, list it in your
  report; don't change those files.

## Checking the template

The template folder starts with `_`, so the homepage, the build and the
tests skip it. To prove it works:

1. Copy it to `content/template-check/` with the slug `template-check`,
   change nothing else except what's needed for it to load (slug, a real
   skill id such as one HCF uses, and a `curriculum.json` entry).
2. In the browser, on desktop and at 375 px:
   - a full correct run through all four sections, ending on All lessons
     and the homepage
   - a wrong-then-right answer in Try it, Practice and Check
   - reload in every section and phase
   - Back from every screen and Next forward again
   - Practise again twice, then reload; score unchanged
   - keyboard only
   - no console errors
3. Run `npm test` and `npm run test:ui` with it in place, then **remove
   `content/template-check/` and its `curriculum.json` entry**. Nothing from
   it is committed.
4. Run `npm test` and `npm run test:ui` again after removing it. Both pass.

Also check that `node --check` passes on both template JS files and that
`lesson.json` is valid JSON.

## Commits

- One commit for the template, one for `docs/lesson-specification.md`.
  Commit this file (`docs/lesson-template-update.md`, currently untracked)
  with the template commit.
- No `dist/` change is expected (the template isn't built). If `./build.sh`
  changes anything in `dist/`, stop and report it.

## Report

- The commit hashes.
- Every check above with what you did and saw, including both test runs.
- Line counts of the old and new template files.
- Anything in `docs/lesson-scoring.md` or `docs/retain-completed-work.md`
  that now contradicts the shared components.
- Anything you couldn't do and why. Then stop.
