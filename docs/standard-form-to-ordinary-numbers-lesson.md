# From standard form to ordinary numbers: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components, like `multiplying-standard-form`. Teaches one skill: writing a
number in standard form, such as 4.2 × 10³, as an ordinary number. Report
every place the template or the shared components didn't cover what you
needed (see "Report").

## Before you start

- Create `codex/standard-form-to-ordinary-numbers` from `main`.
- Read, in this order: `docs/lesson-specification.md`,
  `content/_template/README.md`, `docs/shared-lesson-components.md`,
  `docs/lesson-scoring.md`, `docs/retain-completed-work.md`. Look at
  `content/multiplying-standard-form/` as a worked example of the template.
- Copy `content/_template/` to `content/standard-form-to-ordinary-numbers/`
  and work through every `CHANGE:` marker. Delete `README.md` from the copy.
- Don't change `lesson-engine.js`, `app.css`, `progress.js`, the template or
  any other lesson. Don't add or change tests. If the lesson needs
  something the shared components can't do, stop and ask; don't build your
  own version.
- Leave this file unchanged.

## The lesson

| | |
|---|---|
| Title | From standard form to ordinary numbers |
| Slug / folder | `standard-form-to-ordinary-numbers` |
| Subtitle | Use the index to multiply or divide by 10 the right number of times. |
| Skill | `write-standard-form` (already in `content/skills.json`) |
| Goal shown to pupils | Write a number such as 4.2 × 10³ as an ordinary number. |
| Sections | Learn, Try it, Practice, Check (as the template) |
| Back button | On (as the template) |

- `content/curriculum.json`: add an entry in the Number category between
  the `standard-form` and `multiplying-standard-form` entries: folder
  `standard-form-to-ordinary-numbers`, the title and subtitle above, skills
  `["write-standard-form"]`. Leave the other entries as they are.
- `content/collections.json`: add `standard-form-to-ordinary-numbers` to
  `non-calculator-number`, straight before `multiplying-standard-form`.
- Map every Practice and Check question type to `write-standard-form` in
  `lesson.json`.

## Wording and maths

- Plain English for GCSE pupils. Say "index" for the small raised number
  (introduced on Learn screen 2), never "exponent" or "power" for it. Say
  "the number at the front" for the 4.2 in 4.2 × 10³, as the multiplying
  lesson does. Say "ordinary number", introduced on Learn screen 1.
- Say "×10 step" and "÷10 step" for one multiplication or division by 10.
- No exam-board names or codes anywhere.
- Ordinary numbers with five or more digits before the point use a space
  between thousands: 36 000, 150 000. Four-digit numbers have no space:
  4200, 5060. Never use commas. (The typed-number box already accepts
  spaces and commas, so pupils can type either.)
- **Learn screens:** write the maths with KaTeX. Turn KaTeX on in
  `index.php`. Render each whole expression in one `katex.render()` call.
  Write the LaTeX yourself.
- **Question prompts, options, feedback and results rows:** plain text with
  Unicode superscripts, for example `4.2 × 10³` and `6.8 × 10⁻²`. Write one
  small helper in the lesson, `standardForm(front, index)`, that formats a
  value this way (superscript digits `⁰¹²³⁴⁵⁶⁷⁸⁹`, minus `⁻`, `×` with
  spaces). Use it for every generated prompt.
- **Work out ordinary numbers by moving the decimal point in the digit
  string, never with floating-point arithmetic** (8.4 × 0.01 gives
  0.08399999… in JavaScript). Write one helper, `toOrdinary(front, index)`,
  that takes the front number as a string and returns the ordinary number
  as a string with no trailing zeros after the point and no space. Write a
  second, `spaced(text)`, that adds the thousands spaces for display. Pass
  the unspaced string as the card's `answer`.

## Learn

Six screens, one idea each. Each screen has a heading
(`data-screen-heading`), one visual and at most two short sentences. The
main button is **Next idea** on the newest screen, **Next** on earlier
screens after going Back, and Continue after the last one, as the template
does. Learn is unscored.

1. **Two ways to write one number**
   Visual: `4.2 × 10³ = 4200`, with "standard form" under the left side and
   "ordinary number" under the right.
   Text: "Standard form is a short way to write very big or very small
   numbers. The ordinary number is the same number written without a power
   of 10."

2. **What the index tells you**
   Visual, building line by line: `10³ = 10 × 10 × 10 = 1000`, then
   `4.2 × 10³ = 4.2 × 1000`. The 3 is labelled "index".
   Text: "The small raised number is the index. It tells you how many times
   to multiply by 10."

3. **Multiply by 10 three times** (hands-on, see "Place-value chart" below)
   Chart columns: 1000, 100, 10, 1, point, 0.1. Starts showing 4.2.
   Instruction above the chart: "Press × 10 three times."
   Under the chart, the working builds one step at a time:
   `4.2 → 42 → 420 → 4200`, each arrow labelled ×10.
   After the first step, the live line says: "The 4 now means 4 tens. The 2
   now means 2 ones."
   After the third: "Three ×10 steps: 4.2 × 10³ = 4200. The index counts the
   steps, not the zeros: 4200 has only two zeros."
   **Next idea** stays disabled until all three steps are done.

4. **Negative indices**
   Visual: a column of powers of 10 going down, with a "÷10" arrow between
   each row: `10² = 100`, `10¹ = 10`, `10⁰ = 1`, `10⁻¹ = 0.1`,
   `10⁻² = 0.01`. Highlight the last two rows.
   Text: "Each time the index goes down by 1, the value is divided by 10.
   So a negative index tells you to divide by 10 that many times."

5. **Divide by 10 three times** (hands-on, the same chart)
   Chart columns: 1, point, 0.1, 0.01, 0.001, 0.0001. Starts showing 4.2.
   Text above the chart: `4.2 × 10⁻³`. Instruction: "Press ÷ 10 three
   times."
   Working under the chart: `4.2 → 0.42 → 0.042 → 0.0042`, each arrow
   labelled ÷10.
   After the third step: "Three ÷10 steps: 4.2 × 10⁻³ = 0.0042. The number
   gets smaller, but it is not negative."
   **Next idea** stays disabled until all three steps are done.

6. **An index of 0**
   Visual: the column from screen 4 again with the `10⁰ = 1` row
   highlighted, then `4.2 × 10⁰ = 4.2 × 1 = 4.2`.
   Text: "10⁰ is 1, so there are no ×10 or ÷10 steps. The number stays the
   same."

### Place-value chart (Learn screens 3 and 5)

The lesson's own visual, in lesson code and `lesson.css`.

- Columns headed with their values as above. The point sits in its own
  narrow column and never moves.
- Two buttons under the chart, **× 10** and **÷ 10**, inside the activity
  (they are input controls, not a second main button). Both are shown on
  both screens.
- The right button moves every digit together one column (left for ×10,
  right for ÷10) with a short slide (none under
  `prefers-reduced-motion`), and updates the counter "×10 steps: 1 of 3"
  (screen 3) or "÷10 steps: 1 of 3" (screen 5).
- Empty places between the digits and the point fill with a 0 drawn in the
  muted style, so pupils see it is a placeholder: 420 shows a muted 0 in
  the ones column; 0.042 shows muted zeros in the ones and tenths columns.
- The wrong button moves nothing and shows, in the live line:
  screen 3: "÷ 10 moves the digits right and makes the number smaller. The
  index is positive, so multiply."
  screen 5: "× 10 moves the digits left and makes the number bigger. The
  index is negative, so divide."
- After three steps both buttons are disabled and the main button turns on.
- The live line is an `aria-live="polite"` region. Each digit cell has
  text a screen reader can read (for example "4 in the tens column").
- Save the step count for each screen in the Learn section state (not
  under a card), so reload restores it. Going Back to a finished screen
  shows the finished chart with the buttons hidden.
- Must fit at 375 px with no sideways scrolling.

## Try it

Five unscored question cards (`scored: false`), one per screen, saved and
shown read-only when finished, as the template does. Each screen shows the
lesson's own working chain above the card: a row of boxes joined by arrows
labelled ×10 or ÷10, with the missing box shown as "?" and filled in after
a correct answer. Use `score_activities` `step:interactive:0`…`4`.

| # | Above the card | Question | Input | Answer |
|---|---|---|---|---|
| 1 | `3.6 × 10⁴` | "How many times do you multiply 3.6 by 10?" | number | 4 |
| 2 | `3.6 → 36 → 360 → 3600 → ?` | "What is 3.6 × 10⁴ as an ordinary number?" | number | 36000 |
| 3 | `7.2 × 10⁻³` | "What do you do at each step?" | choice | Divide by 10 |
| 4 | `7.2 → 0.72 → 0.072 → ?` | "What is 7.2 × 10⁻³ as an ordinary number?" | number | 0.0072 |
| 5 | `5.06 → 50.6 → 506 → ?` with `5.06 × 10³` above | "What is 5.06 × 10³ as an ordinary number?" | number | 5060 |

Wrong answers and feedback:

1. 3: "10⁴ means four ×10 steps." Fallback: "The index is 4, so multiply by
   10 four times."
2. 3600: "That's three steps. Do one more ×10." 360000: "That's five steps.
   The index is 4." 3.6 (including 3.60000): "Zeros after the point don't
   change the number. Multiply by 10 instead." Fallback: "3600 × 10 = 36 000."
3. Options **Divide by 10** and Multiply by 10. Multiply by 10: "The index
   is negative, so divide by 10."
4. −0.0072: "A negative index makes the number smaller, not negative."
   0.00072: "That's four steps. The index is −3, so do three." 0.072:
   "That's two steps. Divide by 10 once more." 7200: "That multiplies. A
   negative index means divide." Fallback: "0.072 ÷ 10 = 0.0072."
5. 560 or 5600: "Keep the 0 between the 5 and the 6. It holds a place."
   50600: "That's four steps. The index is 3." 506: "That's two steps.
   Multiply by 10 once more." Fallback: "506 × 10 = 5060."

Correct feedback, one sentence each:
1. "The index is 4: four ×10 steps."
2. "Four ×10 steps give 36 000, so 3.6 × 10⁴ = 36 000."
3. "The index is −3, so divide by 10 three times."
4. "Three ÷10 steps give 0.0072: positive, and smaller than 1."
5. "506 × 10 = 5060. The 0 stays between the 5 and the 6."

## Practice

`runQuestionSet('question-bank', …)` exactly as the template, with
`practiseAgain: true`, but each card uses `input: 'number'` with `answer`,
`rules` and `fallback` instead of options. Prompt: "Write 4.2 × 10³ as an
ordinary number." (the numbers from `standardForm`). No working chain above
the card: the pupil works it out alone.

In `lesson.json`: `session_length` 6, `ready_score` 5.

### Question types

`pick` returns these six types in this order, each with its own seed:

| Order | Type | Number at the front | Index | Example |
|---|---|---|---|---|
| 1 | `positive` | one decimal place, 1.1–9.9, not a whole number | 2 to 6 | 6.3 × 10² = 630 |
| 2 | `negative` | as type 1 | −2 to −5 | 8.4 × 10⁻² = 0.084 |
| 3 | `whole-front` | whole number 2–9 | −5 to −2 or 2 to 6 (seeded) | 9 × 10⁻⁴ = 0.0009 |
| 4 | `zero-index` | one or two decimal places | 0 | 7.1 × 10⁰ = 7.1 |
| 5 | `zero-inside` | d.0d, both d from 1–9 | 2 to 5 | 2.07 × 10⁴ = 20 700 |
| 6 | `zero-inside-negative` | as type 5 | −2 to −4 | 5.08 × 10⁻³ = 0.00508 |

Choose everything with the seeded `random` the generator is given, never
`Math.random`.

### Wrong-answer rules

Let `n` be the index and `k` its size (n without its sign). Build the rules
in this order, skipping any whose value equals the answer or an earlier
rule:

| Rule | When | Value | Feedback |
|---|---|---|---|
| Made negative | n < 0 | −answer | "A negative index means divide by 10. It doesn't make the number negative." |
| Nothing done | n ≠ 0 | the number at the front | "That's the number you started with. Do k ×10 steps." (÷10 when n < 0; k filled in) |
| Wrong way | n ≠ 0 | front × 10⁻ⁿ | "Check the sign of the index. Positive: multiply by 10. Negative: divide by 10." |
| Lost the zero | types 5 and 6 | the front without its middle 0, moved the same number of places | "Keep the 0 between the digits. It holds a place." |
| One step too many | n ≠ 0 | answer × 10 (n > 0) or ÷ 10 (n < 0) | "That's k + 1 steps. The index tells you to do k." (numbers filled in) |
| One step too few | n ≠ 0 | answer ÷ 10 (n > 0) or × 10 (n < 0) | "That's k − 1 steps. The index tells you to do k." |
| Index read as 1 | n = 0 | front × 10 | "10⁰ is 1, so there are no ×10 steps." |
| Index read as 0 | n = 0 | 0 | "10⁰ is 1, not 0, so the number stays the same." |

Work out every rule value with the string helpers, not floating point.

Fallback (any other wrong answer): the full chain, for example
"Multiply by 10 four times: 3.6 → 36 → 360 → 3600 → 36 000." For n = 0:
"10⁰ is 1, so 7.1 × 10⁰ = 7.1."

Correct feedback: the same chain, for example
"3.6 → 36 → 360 → 3600 → 36 000. Four ×10 steps."

Check the generators for every possible front number and index in a quick
script (not committed): each answer is right (compare with a hand-written
table of at least ten cases, including 8.4 × 10⁻² = 0.084 and
5.08 × 10⁻³ = 0.00508), has no floating-point noise or trailing zeros, no
rule value equals the answer, and no two rules share a value.

## Check

Four fixed multiple-choice questions in `lesson.json`, in the template's
shape (options, one feedback sentence per option, index of the answer).
Option order is shuffled once and saved, as the template does.

1. **Sam's answer**
   Prompt: "Sam says 2.4 × 10³ = 240. What is 2.4 × 10³ as an ordinary
   number?"
   - **2400**: "Right. 10³ means three ×10 steps: 24, 240, 2400. Sam only
     did two."
   - 240: "That's Sam's answer. It's only two ×10 steps; 10³ means three."
   - 24 000: "That's four ×10 steps. 10³ means three."
   - 0.0024: "That divides. A positive index means multiply by 10."

2. **Aisha's answer**
   Prompt: "Aisha says 6.8 × 10⁻² must be negative because the index has a
   minus sign. What is 6.8 × 10⁻² as an ordinary number?"
   - **0.068**: "Right. The minus sign means divide by 10 twice: 0.68,
     then 0.068. The answer is positive."
   - −0.068: "A negative index means divide. It doesn't make the number
     negative."
   - 680: "That multiplies. A negative index means divide by 10."
   - 0.0068: "That's three ÷10 steps. The index is −2, so do two."

3. **A grain of sand**
   Prompt: "A grain of sand has a mass of 3.05 × 10⁻⁴ g. What is this mass
   as an ordinary number of grams?"
   - **0.000305**: "Right. Four ÷10 steps: 0.305, 0.0305, 0.00305,
     0.000305."
   - 0.00035: "Keep the 0 between the 3 and the 5. It holds a place."
   - 0.0000305: "That's five ÷10 steps. Four zeros after the point isn't
     the same as four steps."
   - 30 500: "That multiplies. A negative index means divide by 10."

4. **To the Moon**
   Prompt: "The Moon is about 3.84 × 10⁵ km from the Earth. What is this
   distance as an ordinary number of kilometres?"
   - **384 000**: "Right. Five ×10 steps: 38.4, 384, 3840, 38 400,
     384 000."
   - 38 400: "That's four ×10 steps. The index is 5, so do five."
   - 3 840 000: "That's six ×10 steps. The index is 5, so do five."
   - 0.0000384: "That divides. A positive index means multiply by 10."

Summary after the results (the template's summary block), four points:
- "A positive index: multiply by 10 that many times."
- "A negative index: divide by 10 that many times. The answer is still positive."
- "An index of 0: the number stays the same."
- "Keep every digit in order, including zeros between digits."

Then **All lessons** as the main button, as the template does.

## Points

The engine plans the maximum from the template's activities. Report the
planned maximum score in the report; don't hard-code it.

## Checks

- `npm test` and `npm run test:ui` both pass, compared with `main`.
- `node --check` on every JS file; `lesson.json` is valid JSON.
- In the browser, desktop and 375 px:
  - a full correct run through all four sections, ending on All lessons and
    the homepage, on the PHP site and the built `dist/` site
  - both place-value charts: the wrong button first (message shown, nothing
    moves), then three right presses; muted placeholder zeros appear;
    Next idea stays disabled until the third step
  - keyboard-only use of the charts (Tab to × 10 / ÷ 10, Enter
    or Space presses)
  - a wrong-then-right answer in Try it, Practice and Check, checking each
    feedback sentence above appears
  - typing `36,000` and `36 000` in Try it 2 are both accepted
  - reload in every section and phase, including halfway through a chart
  - Back from every screen and Next forward again
  - Practise again twice, then reload; score unchanged
  - every Learn screen readable at 375 px with no sideways scrolling, and
    the KaTeX expressions not cut off
  - no console errors
- The homepage lists the lesson under Number, between Standard form and
  Multiplying numbers in standard form.
- `./build.sh`, then commit `dist/`.

## Commits

- One commit for the lesson (with `curriculum.json`, `collections.json`
  and `dist/`). Commit this file with it.

## Report

- The commit hash, both test results and every check above.
- The planned maximum score.
- **Template findings:** every place you had to go beyond the template or
  the shared components (at least the Learn charts), every `CHANGE:`
  marker that was unclear, and anything you'd change in the template.
  Say "none" if there were none.
- Anything you couldn't do and why. Then stop.
