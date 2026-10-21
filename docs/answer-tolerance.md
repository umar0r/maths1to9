# Close-enough typed answers: spec

Typed number cards only accept an exact answer. Reading a graph often
gives an estimate, so a pupil who reads 1.4 where the answer is 4/3 is
marked wrong. This adds a `tolerance` option to the shared question
card: any answer within that distance of the right value counts. Then
the simultaneous equations lesson uses it for typed estimates.

Two parts, two commits, on one branch. Part A changes a shared file and
nothing else. Part B uses it in one lesson.

## Before you start

- `git fetch origin`. Create `codex/answer-tolerance` from `origin/main`
  (c01c6ab or later), in its own worktree
  (`.worktrees/answer-tolerance`), with `node_modules` symlinked and not
  committed.
- Don't touch the main checkout's uncommitted DfE files (listed in
  `AGENTS.md`) or any other worktree.
- Read `AGENTS.md`, then the "Rules", "Fractions and figures" and
  "Several number fields" parts of `docs/shared-lesson-components.md`,
  and `createQuestion` in `assets/js/lesson-engine.js`. Commit 78aaed6
  (multiple number fields) is the pattern for a card option: code, tests,
  doc, version bumps.
- Copy this file unchanged from the main checkout into your worktree's
  `docs/` and commit it with Part A. Leave it unchanged.

## Part A: `tolerance` on number cards

### The option

```js
{ input: 'number', answer: '1.5', tolerance: 0.2, … }
{ input: 'number', fractions: true, answer: '4/3', tolerance: 0.2, … }
{ input: 'number', fractions: true, fields: [{ id: 'x', … }, { id: 'y', … }],
  answer: { x: '4/3', y: '8/3' }, tolerance: 0.2, … }
{ …fields…, tolerance: { x: 0.2, y: 0.5 } }   // one per field
```

- `tolerance` is a finite number, 0 or more. With `fields` it may also be
  an object with a finite number, 0 or more, for **every** field id and
  no other keys.
- An answer is right when it is **at most** `tolerance` away from the
  answer: |value − answer| ≤ tolerance. With fields, every field must be
  within its own tolerance.
- Compare exactly, never with floating point. Turn the value, the answer
  and the tolerance into fractions (as `fractionValue` already does, also
  for plain number cards) and compare with integer cross multiplication.
  So with answer 4/3 and tolerance 0.2: 1.2, 1.3, 1.4, 1.5 and 1.53 are
  right; 1.1 and 1.54 are wrong. With answer 1.5 and tolerance 0.2, 1.3
  and 1.7 are right (the edges count).
- `rules` use the same tolerance: a rule matches when the value is within
  `tolerance` of the rule's value (each named field within its own). The
  answer is still checked first, so a rule that overlaps the answer never
  wins over a right answer.
- No `tolerance`, or `tolerance: 0`: behaves exactly as now.
- Throw a `TypeError` for: `tolerance` with `exact: true`; a negative,
  non-finite or non-number tolerance; an object tolerance without
  `fields`, with a missing or extra field id, or with a bad value; a
  plain number card whose `answer` isn't a plain number.
- Nothing else changes: invalid input messages, attempts, saved values
  (the pupil's own text), `onFeedback`, results rows, read-only cards,
  reload and question sets all work as before. The feedback for a right
  answer is the card's `feedback`, as now; the lesson words it.
- Works in `runQuestionSet` definitions and Practise again sessions.

### Doc

Add a short "Close-enough answers (added 2026-10-22)" part to
`docs/shared-lesson-components.md` after "Several number fields", in the
same style: the option, the ≤ rule with the 4/3 example, rules, the
errors, and "Plain cards without `tolerance` are unchanged."

### Tests

Unit tests next to the existing card tests, run by `npm test`:

- plain cards: inside, on both edges, just outside both edges, negative
  answers, `5` vs `5.0` still right with `tolerance: 0`
- `fractions: true`: answer `4/3`, tolerance 0.2: the list above;
  a fraction typed by the pupil (`7/5`)
- fields with one tolerance and with one per field; one field right and
  the other wrong is wrong
- rules: a rule value matched within tolerance, rule order kept, a rule
  overlapping the answer doesn't beat a right answer
- every `TypeError` above
- a card with no `tolerance` gives exactly the same results as before on
  the existing cases (don't change existing tests)

### Versions

Bump `lesson-engine.js`'s `?v=` wherever it is loaded, as earlier engine
commits did. Rebuild `dist/`.

### Commit A

"Accept close-enough answers on number cards": engine, doc, tests, every
version bump, `dist/`, and this file.

## Part B: typed estimates in `simultaneous-equations-graphs`

The lesson asks for estimates only as choice cards. Add typed ones, so
estimates are both typed and multiple choice.

All typed estimates are two-field cards (fields `x` and `y`, labelled
"x ≈" and "y ≈"), `fractions: true`, answer the exact crossing as
fractions (e.g. `4/3`, `8/3`), `tolerance: 0.2`. Prompt: "Estimate the
solution of y = … and y = …. Give each value to 1 decimal place, like
1.3." Correct feedback: "Right. The solution is about x ≈ 1.3,
y ≈ 2.7." (the crossing rounded to 1 d.p.).

### `estimateRules(lines)`

Rules in this order; skip any whose value is within 0.2 of the answer
or of an earlier rule's value in both fields:

| Rule `value` | Feedback (numbers filled in) |
|---|---|
| `{ x: y0, y: x0 }` (swapped) | "Write x first, then y. Read x on the x-axis." |
| `{ x: round(x0), y: round(y0) }` (nearest grid point) | "That's the nearest grid point, but the lines don't cross there. Estimate between the grid lines." |
| `{ x: −x0 }` (x ≠ 0) | "Check the sign of x. Left of 0 is negative." (or "Right of 0 is positive.") |
| `{ y: −y0 }` (y ≠ 0) | "Check the sign of y. Below 0 is negative." (or "Above 0 is positive.") |
| `{ x: x0 }` | "x is about right. Now go across from the crossing point to the y-axis to read y." |
| `{ y: y0 }` | "y is about right. Now go down or up from the crossing point to the x-axis to read x." |

x0 and y0 are the exact crossing. Fallback: "Find where the lines cross.
Use the scale to estimate x, then y."

### Practice

Still 6 cards, typed and choice alternating (typed first). The typed
cards become: two `read-solution` cards (two different kinds by seed)
and one `estimate-solution` card (by seed, any of the three typed
places). The choice cards are unchanged. The typed and the choice
estimate in one session use different pairs from `estimatePool`.
Map `estimate-solution` to `simultaneous-graphs` in `lesson.json`.

### Check

Add a fifth question after the current four, so Check has three typed
and two choice:

5. **Estimate** (two-field). y = x − 1 and y = −2x + 1, crossing at
   (2/3, −1/3). Answer `2/3`, `-1/3`, tolerance 0.2, `estimateRules`.
   Correct: "Right. The solution is about x ≈ 0.7, y ≈ −0.3."

The Check summary is unchanged.

### Saved progress

Existing Practice and Check saves must load cleanly. Follow how the
lesson's section-state versions already handle changes: a finished
Check stays finished with its score; an unfinished Check and the
current Practice session may restart. Points never count twice. Report
what you did.

### Spec

Update `docs/simultaneous-equations-graphs-lesson.md` to match (I
authorise this): the Practice "Typed" part, `estimateRules`, and Check
question 5.

### Commit B

"Add typed estimates to simultaneous equations from graphs": the
lesson, its tests and solver, the lesson spec, `dist/`.

## Checks

- `npm test` and the full `npm run test:ui`, on your branch and on
  `origin/main`, compared (a shared file changed).
- `node --check` on every changed JS file; `lesson.json` valid JSON.
- Lesson unit tests: `estimateRules` (every row, skipped rows, rules
  within 0.2 of each other); the generator gives two different
  `read-solution` kinds, one `estimate-solution`, the three choice types,
  alternating, the two estimates using different pairs, the same session
  for the same seed.
- Lesson browser tests: a typed estimate right with 1.4 (not exact),
  wrong with the nearest grid point then right, Check 5 right with x 0.6, y −0.3
  and wrong with x 1, y 0, reload in each phase.
- In the browser at 375 × 812 with touch and 1280 × 800, real clicks,
  full page loads: a full run to All lessons; the typed estimate's two
  boxes, labels "x ≈" / "y ≈" and feedback fit at 375 px; an old save
  from origin/main loads. Save `/tmp/tolerance-practice-375.png` and
  `/tmp/tolerance-check5-375.png`.
- `BASE_URL=http://localhost/maths1to9/.worktrees/answer-tolerance/ ./build.sh`
  from inside the worktree, commit `dist/`, push the branch. Don't merge.

## Report

Through the relay: both commit hashes, both test results compared with
`origin/main`, every check above, the screenshot paths, the lesson's new
planned maximum, what happened to old saves, and anything you couldn't
do. Then wait.
