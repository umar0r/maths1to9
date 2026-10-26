# Rewrite the pre-template lessons on the shared lesson template

This is part 2 of moving every lesson onto the shared template. Part 1
(PR #22, spec `docs/rewrite-custom-lessons.md`) rewrote the seven lessons
that had their own renderer. This part does the 15 lessons that use the
engine but were built before the shared question cards, section state and
template existed (12 October). Each still has its own save code, its own
question cards, buttons and results, and many break the ground rules.

**Keep each lesson's teaching, visuals and hands-on activities. Rebuild the
structure on the template and fix everything that breaks the rules.** It
isn't a redesign, but several lessons are missing whole sections, so some
content has to be written (see the per-lesson notes).

Read this whole spec before you start, then read AGENTS.md in full.

## Before you start

- `git fetch origin`. Make `codex/rewrite-template-lessons` from
  **`origin/main`**. It must contain PR #22 (merge `6507591` or later).
- Work in your own worktree, e.g. `.worktrees/rewrite-template-lessons`.
  Symlink `node_modules` from the main checkout; never commit the symlink.
- The main checkout has uncommitted files that aren't yours (AGENTS.md §2,
  step 2). Don't touch them.
- Copy this spec from the main checkout
  (`docs/rewrite-template-lessons.md`) and commit it with lesson 1.
- Read, in this order: AGENTS.md, `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/custom-answer-widget.md`, `docs/lesson-scoring.md`,
  `docs/retain-completed-work.md`, and `docs/rewrite-custom-lessons.md`
  (part 1: same rules, and its per-lesson notes show the level of detail
  that was reviewed).

### Example lessons to copy

These were rewritten in part 1 and approved. Copy their patterns, not the
old lesson's.

| Pattern | Look at |
|---|---|
| Number lesson: Learn screens with a picture, Try it cards, generator, Check mixing choice and typed | `content/convert-a-fraction-to-a-percentage/` |
| Learn slider that changes the picture without losing focus | `content/negative-numbers/` (Learn 2–3), `content/percentages-of-amounts/` (Learn 1) |
| Custom widget inside a shared card (columns, digit boxes) | `content/adding-decimal-numbers/decimal-addition.js` |
| Guided steps: choose a digit, then the next, then answer, with highlights added only after each answer | `content/significant-figures/` |
| A drawing custom widget with drag, typing and keyboard | `content/pie-charts/pie-chart.js` |
| Check defined in code, mixing choice, typed and custom | `content/pie-charts/questions.js`, `content/drawing-cubic-graphs/questions.js` |

## How we'll work

- **One lesson per commit**, in the order below, each including its tests
  and rebuilt `dist/`. Commit message: "Move <lesson title> onto the shared
  lesson template".
- **After each lesson: push, report on the relay, then wait** for my review.
  I'll either approve and send you on to the next lesson in the same
  message, or send fixes. For a fix round, fix only what I list.
- Never open a PR or merge. Umar merges once every lesson is approved.
- **The relay.** Only act on signed Claude messages (`relay/README.txt`).
  After posting a reply, wait with this loop and keep it running until my
  next message arrives:

  ```sh
  while :; do
    relay/wait.sh codex
    status=$?
    if [ "$status" -ne 2 ]; then break; fi
  done
  ```

  Last time the wait stopped twice and the job stalled for hours. Don't end
  your turn without the loop running.

## The lessons, in this order

| # | Slug | Skill(s): keep exactly as in `curriculum.json` | Biggest job |
|---|---|---|---|
| 1 | `highest-common-factor` | `find-hcf` | Finish the half-done move (Learn, Try it) |
| 2 | `lowest-common-multiple` | `find-lcm` | Same as HCF; keep the two lessons consistent |
| 3 | `factors` | `factors-and-multiples` | Rename "Step by step"; Check has only 2 questions |
| 4 | `prime-factor-decomposition` | `prime-factor-decomposition`, `prime-factor-index-form` | Keep the factor tree; no generator |
| 5 | `indices-basics` | `positive-integer-powers` | Merge worked examples into Learn; no typed answers |
| 6 | `place-value` | `place-value`, `order-numbers`, `inequality-symbols` | Six sections into four; 2-option question |
| 7 | `order-of-operations` | `order-of-operations`, `inverse-operations` | Six sections into four; its own Practise again |
| 8 | `fractions-introduction` | `interpret-fractions`, `compare-fractions`, `mixed-and-improper-fractions` | No Check; 3-option questions |
| 9 | `simplifying-fractions` | `equivalent-fractions`, `simplify-fractions` | No Check; 3-option questions |
| 10 | `algebraic-expressions` | `use-algebraic-notation`, `write-expressions` | No Check |
| 11 | `substituting-into-formulae` | `substitute-expressions`, `substitute-formulae` | No Check |
| 12 | `function-machines-find-the-input-2` | `function-input-output`, `reverse-function-machines` | No Check; 3-option questions |
| 13 | `simplifying-expressions` | `collect-like-terms`, `simplify-products-powers` | No Practice, no Check |
| 14 | `solving-linear-equations` | `solve-one-step-equations`, `solve-two-step-equations`, `solve-equations-with-brackets` | No Practice, no Check |
| 15 | `solving-quadratic-equations` | `solve-quadratics-factorising` | No Check; Practice may not be a generator |

Don't change any slug, title or subtitle, or the `curriculum.json`,
`collections.json` or `skills.json` entries. If a lesson's content clearly
doesn't fit its title or skills, stop and ask.

## What every rewritten lesson must have

### Structure (ground rules 1–3)

- Exactly four sections, using the template's section ids and labels:
  `explanation` = **Learn**, `interactive` = **Try it**,
  `question-bank` = **Practice**, `comparison` = **Check**. Set
  `section_order` and `navigation_stages` as the template does.
- Lessons with extra sections (`method`, `worked_examples`,
  `product_interactive`): their teaching moves into **Learn** as extra
  screens; their questions move into **Try it**. Nothing extra stays as a
  section of its own.
- Use the template's files: `index.php`, `lesson.json`, `interactive.js`
  (Learn and Try it), `questions.js` (Practice and Check), plus one helper
  `.js` for content, generators and drawing, and `lesson.css` only for the
  lesson's own visuals. Delete old files that are no longer used (e.g.
  `learn.js`, `explorer.js`, `answer-builder.js`) or fold them into the
  helper.
- `navigation.back_button: true`. Back works on every screen.
- All teaching goes in Learn. **Every method a question asks for must be
  taught in Learn first.** (Part 1's pie charts asked for "the angle for one
  pupil" without teaching it. Check every Try it, Practice and Check
  question against Learn.)
- The first Learn screen shows the idea with a picture before it asks
  anything.
- One idea per screen. Short sentences. Each screen's text matches its own
  picture (same numbers).

### Questions (ground rules 4–6)

- Only the engine's main button. Remove every lesson-drawn Check, Next,
  Continue, Finish, "Check answer", "Next question", Back and "Show answer"
  control, and any "Practise again" the lesson draws itself.
- Every multiple-choice question has **exactly four options**: one right
  and three real mistakes, each with its own feedback. Shuffle with the
  seeded `random`.
- **Option labels must look like a pupil's real answer.** Don't simplify or
  reformat a wrong answer so it becomes unrecognisable (part 1 showed
  "1/1" and "2/1" instead of the pupil's "6/6" and "12/6").
- **Feedback fits the question type.** A choice question's feedback talks
  about the choice the pupil picked, not about working they didn't do.
- Try it, Practice and Check each **mix four-option choice and typed
  answers**. Lessons with no typed answers now (indices, factors, LCM,
  fractions, algebra) must add them.
- Typed numbers use `input: 'number'`. Use `fractions: true` where a
  fraction is the answer and `exact: true` where the written form is the
  skill. Typed answers get `rules` for the common mistakes, plus a
  `fallback`.
- Algebra answers (expressions like `5a + 5`) can't be `number` cards. Use
  four-option choices, or a lesson `custom` widget (e.g. tiles or a
  coefficient box: "□a + □") whose `mark` checks the value. Don't build a
  free-text algebra parser; if you think a lesson needs one, stop and ask.
- **Practice is a generator** through `runQuestionSet` (or, where the
  answer needs a hands-on activity first, the state helper + cards +
  results, following the "Not for every Practice" rule in
  `docs/shared-lesson-components.md`). Never a fixed list. Turn each
  existing Practice question into a question type with sensible ranges, and
  map every type to one of the lesson's skills in
  `assessment.question_types`. Practise again must work, with the engine's
  rules (earlier sessions kept, score unchanged, Check never reset).
- **Sizes:** Try it at most 12 cards. Practice about 6 questions per
  session. Check about 5 fixed questions. Each section has at least two
  choice and two typed (or custom) questions where it has 5 or more.
- Self-marked questions ("compare with the model answer") aren't allowed.
  Make them four-option "which explanation is right?" questions.
- No trailing zeros in question numbers unless the zero is the point.

### Pictures and timing

- Keep each lesson's visuals and hands-on activities: place-value chart,
  number ordering slots, calculation map, fraction bars, equivalent
  fraction pieces, counters/arrays, factor tree, Venn tiles, index
  "build a power" explorer, function machine, expression tiles, equation
  balance, factorising grid. Move them onto the shared state (no own
  save code) and into custom widgets or Learn activities.
- **No answer is shown in a picture before the pupil answers.** Highlights,
  filled tiles, finished trees, balanced scales and results appear only
  after a correct answer, and on read-only finished cards.
- Sliders and drags update the picture in place; never rebuild a control
  while it's being used.
- Keyboard: every activity works with Tab, Enter, Space and arrow keys.
  Every activity fits at 375 px with no overlapping labels.

### Words (ground rules 7–8)

- Plain English for 14-year-olds. Short sentences. Read every line aloud.
- Explain each maths word in plain words the first time: factor, multiple,
  prime, index/power, place value, numerator/denominator (prefer "top" and
  "bottom" numbers first), equivalent, improper fraction, mixed number,
  expression, term, like terms, coefficient, substitute, formula, function
  machine, inverse, equation, solve, quadratic, factorise.
- Replace jargon headings (e.g. "Find → Divide top → Divide bottom →
  Repeat", "Start → Follow → Write") with a plain sentence.
- No full stops on displayed maths. Use the proper minus sign (−) and
  multiplication sign (×) in displayed maths.
- No exam boards anywhere.

### Saving and scoring

- Use `useSectionState`, `createQuestion`, `runQuestionSet`,
  `renderResults` and `renderScorePanel` as the template does. Remove all
  of the lesson's own save code (`saveLessonActivityState`,
  `getLessonActivityState`), its own score/progress rings, results markup,
  escape helpers, `Math.random` and shuffles.
- The engine plans the maximum score. Don't hard-code it. Register guided
  steps and explorations in `score_activities`.
- **Old saves don't matter** (the site has no real pupils yet). Each
  section's `upgrade` returns `null` for anything that isn't its own
  version. No migration code and no old-save tests. Remove old tests that
  only check old-save upgrades for these lessons, and say which in the
  report.

## Per-lesson notes

These are from my audit of `origin/main`. Check every question and
calculation yourself as well; fix wrong maths or wording and list it in the
report.

1. **highest-common-factor.** Already uses shared cards in Check and the
   shared Practice results, and has Back. Finish it: move Learn and Try it
   onto the template's screen/state pattern, remove leftover own save code,
   and make Practice and Check mix typed answers (now nearly all choice).
   Keep the "match the shared primes" Venn tiles as a custom activity. Make
   sure Learn teaches the method Try it asks for.
2. **lowest-common-multiple.** Same work as HCF. Use the same words,
   picture style and Venn tiles as HCF so the two lessons read as a pair
   (LCM = everything in the Venn diagram, HCF = only the overlap).
3. **factors.** Rename "Step by step" to Try it. Keep the counters / equal
   rows picture. Check has only 2 questions; make it 5. Add typed
   answers (e.g. "How many factors does 36 have?", "Type the missing factor
   pair: 4 × □ = 36"). Mistakes: missing a factor pair, forgetting 1 and
   the number itself, counting a square factor twice, listing multiples
   instead of factors.
4. **prime-factor-decomposition.** Keep the factor tree build and the
   answer builder as custom widgets. Practice is a fixed list: make a
   generator (numbers that give 2–4 prime factors, some with repeats, up to
   about 200). Check: one option set has 3 options; make it 4. Mistakes:
   stopping at a non-prime (e.g. 4 or 9), leaving out a repeated factor,
   writing powers wrongly (2 × 3² vs 2² × 3), including 1.
5. **indices-basics.** Merge "worked examples" into Learn. Keep the "build
   a power one factor at a time" explorer as a Learn activity. There are no
   typed answers: add them. Practice uses `completion_target` and no seeds:
   make a generator. Mistakes: multiplying base by index (2⁵ = 10), adding
   (2⁵ = 7), swapping base and index (2³ vs 3²), forgetting that x¹ = x.
6. **place-value.** Six sections (Learn, interactive, method, product
   interactive, Practice, Check) into four. The digit-value chart and the
   "one number, different place values" activity become Learn screens or
   Try it cards; the product-scaling activity becomes Try it. One question
   has only 2 options: make it 4. Practice session is 10 with a ready
   score: make it about 6 and drop the ready gate. Keep the decimal ordering
   slots as a custom widget. Mistakes: reading the digit, not its value
   (the 4 in 3.42 is 4, not 0.4), longer decimals are bigger (0.45 > 0.5),
   wrong inequality sign direction.
7. **order-of-operations.** Six sections into four. Keep the "calculation
   map" as a custom widget. It has its own Practise again that resets Check
   and completion: remove it and use the engine's. Practice 10 with a ready
   score: make it about 6, no gate. Explain BIDMAS in plain words (what
   each letter means, and that × and ÷, + and − go left to right).
   Mistakes: working left to right ignoring BIDMAS, adding before
   multiplying, doing × before ÷ when ÷ comes first, ignoring brackets.
8. **fractions-introduction.** No Check: write 5 questions (mixed). The
   method heading "Same bottom → common bottom → compare tops → point the
   sign" becomes plain sentences. Keep the fraction bars / pieces pictures.
   All choice questions have 3 options: make them 4. Practice session is
   10: make it about 6. Mistakes: bigger bottom number means bigger
   fraction, comparing tops with different bottoms, mixed ↔ improper
   errors (2 1/3 = 5/3), reading top and bottom the wrong way round.
9. **simplifying-fractions.** No Check: write 5 questions. Replace the
   arrow heading with plain sentences. Keep the "same amount, different
   pieces" visual. 3-option questions to 4. Typed answers use
   `fractions: true`, and "simplest form" questions must reject unsimplified
   equivalents (use `exact: true` or a rule) with clear feedback. Mistakes:
   dividing only the top, not dividing by the highest common factor (stops
   at 6/9), adding or subtracting instead of dividing.
10. **algebraic-expressions.** No Check: write 5. It already pilots shared
    Practice sessions; move the rest onto the template. Replace "Start →
    Follow → Write". Keep "build the expression" as a custom tile widget.
    Expressions as choices or custom widget only. Mistakes: 3n vs n + 3,
    order of operations in expressions ((n + 2) × 3 vs n + 2 × 3), n² vs 2n,
    writing the number after the letter (n3).
11. **substituting-into-formulae.** No Check: write 5. Practice uses
    `completion_target`: make a generator. Replace the arrow method heading.
    Keep the "replace the letter" placement activity. Mistakes: 3a with
    a = 4 as 34, ignoring order of operations, squaring a negative wrongly
    ((−3)² = −9), substituting into the wrong letter.
12. **function-machines-find-the-input-2.** No Check: write 5. Keep the
    function-machine picture; "find the input" uses the reversed machine.
    3-option questions to 4. Teach in Learn that working backwards uses the
    inverse (opposite) operations in reverse order. Mistakes: reversing the
    order but not the operations, the operations but not the order, doing
    the machine forwards.
13. **simplifying-expressions.** No Practice and no Check: write a
    generator (about 6 per session) and 5 Check questions. It has only
    `interactive.js` (1,700 lines); split into the template files. Keep the
    expression tiles widget. Explain "term" and "like terms". Mistakes:
    collecting unlike terms (2a + 3 = 5a), losing a sign (5a − 1 → 5a + 1),
    a × a = 2a, 3a × 2a = 6a instead of 6a².
14. **solving-linear-equations.** No Practice and no Check: write a
    generator and 5 Check questions covering one-step, two-step and
    brackets. Keep the balance picture ("keep both sides equal"). Typed
    answers for x. Mistakes: doing the same thing to only one side,
    undoing in the wrong order, sign errors moving terms, not expanding
    brackets fully.
15. **solving-quadratic-equations.** No Check: write 5. Check whether its
    Practice is a seeded generator; if not, make it one. Keep the
    factorising grid. Each solution is typed (two number fields: use
    `fields` with `fractions: true` if needed) or a four-option choice of
    solution pairs. Mistakes: wrong signs ((x + 2)(x − 5) = 0 gives x = −2
    and 5, not 2 and −5), only one solution, setting a bracket to the
    constant instead of 0.

## Tests

### Who writes what, from lesson 8 on (Umar, 2026-10-26)

To save Codex's usage, the work is split:

- **Codex writes the lesson only:** lesson files, rebuilt `dist/`, a quick
  manual check, commit, push, report. No new test files and no solver.
- **Claude writes the tests:** the lesson's unit test file
  (`tests/<slug>.test.cjs`, adapting the old one), its browser solver
  (`tests/ui/solvers/<slug>.cjs`) and any other test file the rewrite
  breaks. Claude commits them on the same branch, after Codex's lesson
  commit and before sending the next lesson.
- **Codex doesn't touch `tests/`** from lesson 8 on, unless a message asks.
- **Expected failures:** after Codex's rewrite, the lesson's own old tests
  and old solver will fail. That's fine. In the report, run `npm test` and
  list which failing tests are in the lesson's own files (expected) and
  which are anywhere else (those are real: fix the lesson or stop and ask).
  Skip `--only <slug>` until Claude has written the solver.
- **The test contract.** So Claude can test without reading the whole
  lesson, the helper `.js` must expose one object on `window` (like
  `window.PrimeFactors`) with:
  - `learnScreens`: the Learn screens' text (titles, lines, displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - for every custom widget: its `mark(value)` and a way to build a correct
    value (e.g. `correctValue(question)`), so a test can check marking
    without a browser.

  Card configs use the shared card fields (`input`, `prompt`, `options` with
  `label`/`correct`/`feedback`, `answer`, `rules`, `fallback`,
  `questionType`). In the report, list the object's name and anything a
  test needs that isn't obvious (e.g. which fields hold the numbers).

The sections below still describe what the tests must cover; Claude
follows them.

- These lessons have unit tests (`tests/<slug>.test.cjs`, plus
  `tests/place-value-answers.cjs`) and browser solvers
  (`tests/ui/solvers/<slug>.cjs`); HCF also has
  `tests/ui/shared-practice-hcf.spec.cjs`. They read the old files and
  markup. **You may rewrite them to read the new files and markup**,
  keeping every check that still applies: every answer right, exactly one
  correct option, no duplicate options, worked sums correct, maths symbols
  correct.
- Add for every lesson: every choice question has four distinct options;
  the Practice generator gives correct questions for 200 seeds of every
  type, in both choice and typed modes; every session mixes choice and
  typed; every question's method is taught in Learn (a simple check that
  the lesson's Learn content includes each method keyword is enough).
- Add a solver for any lesson without one (factors, prime factors, HCF,
  LCM). Every solver answers every question from what's visible and
  finishes the lesson.
- **Don't write per-lesson Playwright spec files** (`tests/ui/<slug>.spec.cjs`,
  `tests/ui/shared-practice-<slug>.spec.cjs`) from lesson 4 on (Umar,
  2026-10-26: they cost too much time). Keep the unit test file and the
  solver. Claude checks the lesson in the browser at review, and Umar does
  manual tests at the end. Keep the spec files already written for HCF,
  LCM and factors.
- Never weaken or skip an existing check. List every test changed or
  removed, and why, in the report.
- **Lesson 1:** full `npm test` and `npm run test:ui` on your branch and on
  `origin/main`, and compare. **Later lessons and fix rounds:** `npm test`
  plus `node tests/runner/run-all.cjs --ui --only <slug>`. Note that
  `--only` matches substrings (e.g. `--only factors` also runs other
  lessons); say which lessons ran.
- If a test fails in a lesson you didn't touch, rerun it alone. If it then
  passes, say so in the report (timing flake). If it still fails, stop and
  ask.

## Checks for each lesson (in a real browser)

Desktop and 375 px with touch on. Real clicks. Full page loads after code
changes. From lesson 4 on, a quick manual pass is enough: walk Learn, one
wrong-then-right answer, one reload, Back once, and the 375 px layout. Don't
spend time automating these.

- The first Learn screen teaches with a picture before asking. Every
  control visibly changes the picture.
- Every question's method appears in Learn.
- Every choice question shows four options; each wrong one shows its own
  feedback that fits the choice.
- No answer appears in a picture before the pupil answers.
- A full correct run, and a wrong-then-right answer (✓ stays off).
- Back from every screen and Next forward again.
- Reload in each phase: answering, wrong, correct, finished.
- Practise again twice; score unchanged; Check and completion untouched.
- No console errors. No overflow or overlapping labels at 375 px.
- `./build.sh`, then the last button (All lessons) on the `dist/` site
  reaches the homepage.

## Report (after each lesson)

- Commit hash.
- Test results (lesson 1: compared with `origin/main`).
- What you changed in the content and why: sections merged, new Check and
  Practice questions (list them), new fourth options, rewritten wording,
  maths you fixed.
- The planned maximum score.
- Every check above, with what you saw.
- Tests changed or removed.
- Anything you couldn't do.

Then post it on the relay and run the wait loop.
