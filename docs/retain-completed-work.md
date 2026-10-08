# Keep pupils' work in every lesson

Brief for bringing every lesson up to the rule added to
`docs/lesson-specification.md` (Score and persistence). The highest common
factor and lowest common multiple lessons already follow it; use them as the
reference.

## The rule

1. **Save every answer.** Each answered question in Learn, Try it, Practice
   and Check saves what the pupil chose or typed, whether it was right first
   time, and the question's phase (answering, wrong, correct). Use
   `Maths1to9Progress.saveLessonActivityState(slug, sectionId, state)`, or the
   lesson's existing saved snapshot if it has its own renderer (`lesson.js`).
2. **Reload puts the pupil back exactly where they were.** Same question, same
   numbers (Practice sessions are saved, not regenerated), same answer and
   feedback, same main button.
3. **A finished section shows the work, read-only.** Never an empty card with
   just "complete":
   - Try it: each example as the pupil finished it, using the activity's own
     visual (diagram, tree, machine, the expression built step by step). Keep
     that visual; don't replace it with a list of text.
   - Practice: one compact row per question: the question, the answer, and ✓
     for right first time or "2nd try" if corrected. Don't repeat the answer
     as "Your answer" and "Correct answer"; after a correction they're the
     same. Show the explanation only for corrected questions.
   - Check: the same compact rows, then the summary.
   Continue stays the only button. Keep it short: a finished section is for a
   quick look back, not a wall of text.
4. **Revisiting never changes the score.** No points are awarded again and no
   new Practice session is generated for a finished section. Only the existing
   "Start over" resets a lesson.
5. **Content changes don't break saved work.** Keep a `contentVersion` in the
   saved state, as `prime-factor-decomposition` does. When content changes,
   either upgrade the saved state or start that section again; never show a
   saved answer against a different question.

## Where each lesson stands

From reading the code (2026-10-08). Confirm each one in the browser before
changing it: answer one question per section, reload, then finish the section
and revisit it.

**Saves no answers.** Questions restart on reload and finished sections can't
show the work. Needs the full rule.

- algebraic-expressions
- function-machines-find-the-input-2
- indices-basics
- order-of-operations
- place-value
- simplifying-expressions
- solving-linear-equations
- solving-quadratic-equations
- substituting-into-formulae

**Saves Practice only.** Add Try it and Check, and check the finished
Practice view.

- fractions-introduction
- simplifying-fractions

**Saves Try it and Practice.** Check the Check section and every finished
view.

- factors
- prime-factor-decomposition

**Own renderer that saves its whole state.** Answers are probably kept; check
that every finished view shows the work.

- adding-decimal-numbers
- convert-a-fraction-to-a-percentage
- negative-numbers
- percentages-of-amounts
- pie-charts
- rounding-and-significant-figures
- significant-figures

**Done:** highest-common-factor, lowest-common-multiple.

## How to do it

- One lesson per commit, so each can be checked and reverted on its own.
  Start with the "saves no answers" group.
- Change each lesson's own code. Don't patch the shared engine's text or DOM
  from a lesson. If the same change is needed in many lessons, propose an
  engine change first.
- For each lesson, check: a reload in the middle of each section, a revisit of
  each finished section, a wrong-then-correct answer (the ✓ must stay off),
  the score unchanged after revisits and reloads, the phone layout, then
  `npm test` and `./build.sh`.
