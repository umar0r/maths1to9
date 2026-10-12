# Multiplying numbers in standard form: lesson spec

The first new lesson built from the rewritten template
(`content/_template/`). It has two jobs: teach the skill well, and show
whether the template and the shared components are enough to build a real
lesson. Report every place the template didn't cover what you needed (see
"Report").

## Before you start

- Create `codex/multiplying-standard-form` from `main` (`e4d4558` or later).
- Read, in this order: `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/lesson-scoring.md`, `docs/retain-completed-work.md`.
- Copy `content/_template/` to `content/multiplying-standard-form/` and work
  through every `CHANGE:` marker. Delete `README.md` from the copy.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, the template or
  any other lesson. Don't add or change tests. If the lesson needs
  something the shared components can't do, stop and ask; don't build your
  own version.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | Multiplying numbers in standard form |
| Slug / folder | `multiplying-standard-form` |
| Subtitle | Multiply the front numbers, add the indices, then check the front number. |
| Skill | `calculate-standard-form` (already in `content/skills.json`) |
| Goal shown to pupils | Multiply two numbers in standard form and write the answer in standard form. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/curriculum.json`: add an entry in the Number category straight
  after the `standard-form` entry: folder `multiplying-standard-form`, the
  title and subtitle above, skills `["calculate-standard-form"]`. Leave the
  `standard-form` entry as it is.
- `content/collections.json`: add `multiplying-standard-form` to
  `non-calculator-number`, straight after `laws-of-indices`.
- Map every Practice and Check question type to `calculate-standard-form`
  in `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Call the first part "the number at the
  front" every time. Don't say "coefficient", "mantissa" or "significand".
  Say "index" (plural "indices"), introduced on Learn screen 3.
- No exam-board names or codes anywhere.
- **Learn screens:** write the maths with KaTeX. Turn KaTeX on in
  `index.php` (the template has it commented out). Render each whole
  expression in one `katex.render()` call. Write the LaTeX yourself; don't
  copy any from older drafts.
- **Question prompts, options and results rows:** plain text with Unicode
  superscripts, for example `(2 × 10³) × (4 × 10²)` and `6 × 10⁻²`. That
  wraps on a phone and needs no KaTeX. Write one small helper in the lesson,
  `standardForm(front, index)`, that formats a value this way (superscript
  digits `⁰¹²³⁴⁵⁶⁷⁸⁹`, minus `⁻`, and `×` with spaces). Use it for every
  generated prompt and option.
- The two front numbers in a question have at most one decimal place. An
  answer's front number may need two (1.5 × 9 = 13.5, so 1.35 × 10⁶); that
  is fine. Format every front number without floating-point noise (7.5, not
  7.499999; 1.35, not 1.3499999) and without trailing zeros.

## Learn

Six screens, one idea each. Each screen has a heading (`data-screen-heading`),
one short visual and at most two short sentences. The main button is
**Next idea** on the newest screen, **Next** on earlier screens after going
Back, and Continue after the last one, as the template does.

1. **What standard form looks like**
   Visual: `6000 = 6 × 10³`, with "6" marked "the number at the front" and
   "10³" marked "a power of 10".
   Text: "In standard form, the number at the front is at least 1 and less
   than 10. It is multiplied by a power of 10."

2. **Group the numbers**
   Visual, building line by line:
   `20 × 300 = 2 × 10 × 3 × 100`, then `= (2 × 3) × (10 × 100)`, then
   `= 6 × 1000 = 6000`.
   Text: "Everything is being multiplied, so we can change the order. Multiply
   the numbers at the front, then the powers of 10."

3. **Why we add the indices**
   Visual: two groups of "10" tiles, `10²` = two tiles and `10³` = three
   tiles, then the same five tiles in one row labelled `10⁵`.
   Text: "The index is the small raised number. It counts the 10s
   multiplied together: 2 tens and 3 tens make 5 tens, so 10² × 10³ = 10⁵."

4. **Put it together**
   Visual: `(2 × 10²) × (4 × 10³)`, then `2 × 4 = 8` and `2 + 3 = 5`, then
   `= 8 × 10⁵`.
   Text: "Multiply the numbers at the front. Add the indices. 8 is at least 1
   and less than 10, so 8 × 10⁵ is in standard form."

5. **When the front number is 10 or more**
   Visual: `(4 × 10²) × (5 × 10³) = 20 × 10⁵`, then `20 = 2 × 10`, then
   `= 2 × 10⁶`.
   Text: "20 is too big for the front. Take out a 10: the front becomes 2 and
   the index goes up by 1. Exactly 10 isn't allowed either: 10 × 10⁵ = 1 ×
   10⁶."

6. **Negative indices work the same way**
   Visual: `10³ × 10⁻¹ = 1000 × 0.1 = 100 = 10²` with `3 + (−1) = 2`
   underneath, then `(3 × 10⁴) × (2 × 10⁻²) = 6 × 10²` with
   `4 + (−2) = 2`.
   Text: "Keep the sign of each index when you add them."

## Try it

Five unscored question cards (`scored: false`), one per screen, saved and
shown read-only when finished, as the template does. Each screen keeps the
working so far visible above the question (the lesson's own visual).

| # | Visual above the card | Question | Input | Answer | Wrong answers and feedback |
|---|---|---|---|---|---|
| 1 | The five "10" tiles from Learn screen 3 | `10² × 10³ = 10^?` What is the missing index? | number | 5 | 6: "That multiplies the indices. Count the 10s: 2 + 3 = 5." Anything else: "Count the 10s in both groups." |
| 2 | `(3 × 10²) × (4 × 10³)` | Multiply the numbers at the front: `3 × 4 = ?` | number | 12 | 7: "That adds them. Multiply: 3 × 4 = 12." Anything else: "Multiply 3 by 4." |
| 3 | `(3 × 10²) × (4 × 10³)`, `3 × 4 = 12` | Add the indices: `2 + 3 = ?` | number | 5 | 6: "That multiplies the indices. Add them: 2 + 3 = 5." Anything else: "Add 2 and 3." |
| 4 | `= 12 × 10⁵` | `12 × 10⁵ = 1.2 × 10^?` What is the index? | number | 6 | 4: "Making the front smaller means one more 10, so the index goes up: 6." 5: "12 = 1.2 × 10, so there is one extra 10: the index is 6." Anything else: "12 = 1.2 × 10. Add that 10 to 10⁵." |
| 5 | none | Work out `(2 × 10⁵) × (3 × 10⁻²)` | choice | 6 × 10³ | 6 × 10⁷: "Keep the minus sign: 5 + (−2) = 3." 6 × 10⁻¹⁰: "That multiplies the indices. Add them: 5 + (−2) = 3." 5 × 10³: "Multiply the front numbers: 2 × 3 = 6." |

Correct feedback, one sentence each:
1. "2 tens and 3 tens make 5 tens: 10⁵."
2. "3 × 4 = 12."
3. "2 + 3 = 5, so we have 12 × 10⁵."
4. "12 = 1.2 × 10, so the index goes up by 1: 1.2 × 10⁶."
5. "2 × 3 = 6 and 5 + (−2) = 3, so the answer is 6 × 10³."

## Practice

`runQuestionSet('question-bank', …)` exactly as the template, with
`practiseAgain: true`. Every question is multiple choice, four options,
asking: "Work out (a × 10ᵐ) × (b × 10ⁿ). Give your answer in standard form."

In `lesson.json`: `session_length` 6, `ready_score` 5.

### Question types

`pick` returns these six types in this order, each with its own seed:

| Order | Type | Front numbers | Indices | Example |
|---|---|---|---|---|
| 1 | `no-adjust` | a × b less than 10 | both positive, 1–6 | (2 × 10³) × (4 × 10²) = 8 × 10⁵ |
| 2 | `adjust` | a × b more than 10 | both positive, 1–6 | (5 × 10²) × (3 × 10³) = 1.5 × 10⁶ |
| 3 | `one-negative` | either | one positive (2–7), one negative (−1 to −6) | (4 × 10⁵) × (3 × 10⁻²) = 1.2 × 10⁴ |
| 4 | `front-ten` | a × b exactly 10 (2 × 5, 4 × 2.5, 5 × 2) | both positive, 1–6 | (5 × 10²) × (2 × 10³) = 1 × 10⁶ |
| 5 | `one-negative` | either | as type 3 | (2.5 × 10⁻³) × (3 × 10⁵) = 7.5 × 10² |
| 6 | `two-negative` | either | both negative, −1 to −6 | (4 × 10⁻²) × (5 × 10⁻³) = 2 × 10⁻⁴ |

Front numbers: `a` from {1.5, 2, 2.5, 3, 4, 5, 6}, `b` a whole number 2–9,
chosen with the seeded `random` the generator is given. Never `Math.random`.

### Options

Let `p = a × b` and `k = m + n`. The correct answer is `p × 10ᵏ` if `p` is
less than 10, otherwise `(p ÷ 10) × 10ᵏ⁺¹`.

Wrong options, taken in this order until there are three that differ from
the correct answer and from each other:

| Wrong option | Feedback |
|---|---|
| Indices multiplied: correct front × 10^(m × n), adjusted if needed | "That multiplies the indices. Add them instead." |
| Not adjusted (only when p ≥ 10): `p × 10ᵏ` | "The number at the front must be less than 10. Take out a 10 and add 1 to the index." |
| Adjusted the wrong way (only when p ≥ 10): `(p ÷ 10) × 10ᵏ⁻¹` | "Making the front number smaller means one more 10, so the index goes up by 1." |
| Sign dropped (only when an index is negative): front × 10^(\|m\| + \|n\|), adjusted if needed | "Keep the sign of each index: add them as they are." |
| Front numbers added: `(a + b) × 10ᵏ`, adjusted if needed | "Multiply the numbers at the front, don't add them." |
| Index one too small: correct front × 10 to one less than the correct index | "Add the indices carefully: m + n = k." |
| Index one too big: correct front × 10 to one more than the correct index | "Add the indices carefully: m + n = k." |
| Only one index used: correct front × 10ᵐ (the first index only) | "Add both indices: m + n = k." |
| Index two too small: correct front × 10 to two less than the correct index | "Add the indices carefully: m + n = k." |
| Index two too big: correct front × 10 to two more than the correct index | "Add the indices carefully: m + n = k." |

(Added 2026-10-12, after the exhaustive check found 28 questions with only
three options.) Re-run the exhaustive check: every possible question must
now have four different options.

The last two are fallbacks for questions where the earlier rows collide
(for example (2 × 10²) × (2 × 10²): 2 + 2 = 2 × 2 and 2 + 2 = 2 × 2, so
"indices multiplied" and "front numbers added" both equal the correct
answer).

Correct feedback: "a × b = p and m + n = k, so the answer is …", with the
adjustment step added when there is one, for example
"5 × 3 = 15 and 2 + 3 = 5. 15 × 10⁵ = 1.5 × 10⁶."

Shuffle the four options with the seeded `random`.

Check the generators for every possible front pair and index range in a quick
script (not committed): every question has exactly one correct option,
four different options, and every front number formatted correctly (at
most two decimal places, no floating-point noise, no trailing zeros).

## Check

Four fixed multiple-choice questions in `lesson.json`, in the template's
shape (options, one feedback sentence per option, index of the answer).
Option order is shuffled once and saved, as the template does.

1. **Sam's answer**
   Prompt: "Sam works out (2 × 10³) × (3 × 10⁴) and gets 6 × 10¹². What is
   the correct answer in standard form?"
   - **6 × 10⁷**: "Right. 2 × 3 = 6 and 3 + 4 = 7. Sam multiplied the
     indices instead of adding them."
   - 6 × 10¹²: "That's Sam's answer. He multiplied the indices: add them."
   - 5 × 10⁷: "Multiply the front numbers: 2 × 3 = 6."
   - 6 × 10¹: "That subtracts the indices. Add them: 3 + 4 = 7."

2. **Ella's answer**
   Prompt: "Ella gets 10 × 10⁵. Which of these is the same number in
   standard form?"
   - **1 × 10⁶**: "Right. 10 = 1 × 10, so the index goes up by 1."
   - 10 × 10⁵: "The front number must be less than 10, so 10 isn't allowed."
   - 1 × 10⁵: "Taking a 10 from the front adds one to the index: 10⁶."
   - 1 × 10⁴: "Making the front smaller means the index goes up, not down."

3. **A negative index**
   Prompt: "Work out (6 × 10³) × (4 × 10⁻⁵). Give your answer in standard
   form."
   - **2.4 × 10⁻¹**: "Right. 6 × 4 = 24 and 3 + (−5) = −2, so 24 × 10⁻² =
     2.4 × 10⁻¹."
   - 24 × 10⁻²: "Right value, but 24 is too big for the front. Take out a 10."
   - 2.4 × 10⁻³: "Taking a 10 from the front makes the index go up: −2 + 1 = −1."
   - 2.4 × 10⁹: "Keep the minus sign: 3 + (−5) = −2."

4. **Two negative indices**
   Prompt: "Work out (5 × 10⁻³) × (3 × 10⁻⁴). Give your answer in standard
   form."
   - **1.5 × 10⁻⁶**: "Right. 5 × 3 = 15 and −3 + (−4) = −7, so 15 × 10⁻⁷ =
     1.5 × 10⁻⁶."
   - 1.5 × 10⁻⁸: "Taking a 10 from the front makes the index go up: −7 + 1 = −6."
   - 1.5 × 10¹³: "That multiplies the indices. Add them: −3 + (−4) = −7."
   - 8 × 10⁻⁷: "Multiply the front numbers: 5 × 3 = 15."

Summary after the results (the template's summary block), three points:
- "Multiply the numbers at the front."
- "Add the indices, keeping their signs."
- "If the front number is 10 or more, take out a 10 and add 1 to the index."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score in the report; don't hard-code it.

## Checks

- `npm test` and `npm run test:ui` both pass (the generic lesson checks in
  the browser suite will run on this lesson).
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px:
  - a full correct run through all four sections, ending on All lessons and
    the homepage, on the PHP site and the built `dist/` site
  - a wrong-then-right answer in Try it, Practice and Check, checking each
    feedback sentence above appears
  - reload in every section and phase
  - Back from every screen and Next forward again
  - Practise again twice, then reload; score unchanged
  - keyboard only
  - every Learn screen readable at 375 px with no sideways scrolling, and
    the KaTeX expressions not cut off
  - no console errors
- The homepage lists the lesson under Number.
- `./build.sh`, then commit `dist/`.

## Commits

- One commit for the lesson (with `curriculum.json`, `collections.json`
  and `dist/`). Commit this file with it.

## Report

- The commit hash, both test results and every check above.
- The planned maximum score.
- **Template findings:** every place you had to go beyond the template or
  the shared components, every `CHANGE:` marker that was unclear, and
  anything you'd change in the template. Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
