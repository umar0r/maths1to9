# Using the nth term: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: using a given nth-term rule to find a
term, by putting the position in place of n (rules like 3n + 2, 30 − 4n,
n² + 3, 2n² and n² + 2n). Finding the rule from a sequence is the next
lesson, not this one.

Umar's draft (from ChatGPT, 2026-10-29) is the source. It has been
rewritten to the ground rules, and Practice now uses cards from the local
question bank (`docs/exam-bank/bank/nth-term.json`, cards 01 and 09). See
"Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/nth-term` from **`origin/main`**
  (`28b785b` or later, which has the sequences lesson, PR #27) in its own
  worktree, e.g. `.worktrees/nth-term`. Symlink the main checkout's
  `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lesson:** `content/sequences/` (built today: helper
  object on `window`, `learnScreens`, sliders that build a row of terms,
  two-field number cards, the Practice generator). Copy its patterns.
  `content/indices-basics/` has a slider that builds a square picture.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- Slug `nth-term` (the placeholder already in `curriculum.json`,
  Algebra, straight after `special-sequences`). Change its title to
  **"Using the nth term"** and its subtitle to **"Use a rule to find any
  term in a sequence."**
- **Change its skills to `["use-nth-term"]` only.** This lesson doesn't
  teach `find-linear-nth-term`. Add a new placeholder straight after
  `nth-term`, with no folder:
  `{"folder":"finding-the-nth-term","title":"Finding the nth term","subtitle":"Work out the rule for a sequence that goes up or down by the same amount.","skills":["find-linear-nth-term"]}`
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Write rules as `3n + 2`, `30 − 4n`, `n² + 3`, `2n²` (a real `²`, not
  `^2`, and no LaTeX). Use `−` for minus and `×` in displayed working.
- Write sequences as `5, 8, 11, 14, …` (the ellipsis character, spaces
  after commas).
- Say "1st term", "2nd term", "6th term", "20th term". Say "position" for
  where a term is and "term" for the number there. Don't use "value" on
  its own, and don't use "substitution", "coefficient", "linear" or
  "quadratic" anywhere.
- Displayed working has no full stop: `3 × 20 + 2 = 60 + 2 = 62`.

## Learn (6 screens, all teaching, no questions)

Each screen has one picture that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
picture and keeps focus while dragged (don't rebuild the whole screen).
Each slider screen starts on a useful value (not blank).

1. **Every term has a position.** The sequence `5, 8, 11, 14, 17, 20, …`
   in boxes, with its position (1, 2, 3, …) under each box. Slider
   "Position: 1 to 6" (starts on 1) lights up that box and shows "Position
   4 → term 14" under the row. Text: "Each number in a sequence is a
   **term**. Its **position** tells you where it is: 1st, 2nd, 3rd and so
   on. Positions start at 1. In maths we use the letter **n** for the
   position."
2. **A rule turns the position into the term.** Same row. Rule
   `3n + 2` shown big. "3n means 3 × n." Slider "n: 1 to 6" (starts on 1)
   lights up box n and builds the working under the rule, with the n
   swapped for the number in a highlight colour: `3 × 4 + 2 = 12 + 2 = 14`.
   Text: "This rule is called the **nth term**. Put the position in place
   of n, and it gives you the term. Multiply by 3, then add 2."
3. **Jump straight to any term.** Rule `3n + 2`. Slider "n: 1 to 100"
   (starts on 20). The row now shows the first three terms, then "…", then
   the lit-up box for term n with its position under it. Working:
   `3 × 20 + 2 = 60 + 2 = 62`. Text: "You don't need to write out the
   first 19 terms. Put 20 in place of n." Callout: "Rules can count real
   things. If Pattern n uses 3n + 2 sticks, Pattern 20 uses 62 sticks."
4. **Multiply before you take away.** Rule `30 − 4n`. Slider "n: 1 to 10"
   (starts on 6) builds the row of terms up to n (26, 22, 18, …) and the
   working `30 − 4 × 6 = 30 − 24 = 6`. Callout, shown all the time:
   "Do 4 × 6 first. Taking away first gives (30 − 4) × 6 = 156, which is
   wrong." with `156` crossed out. From n = 8 on, a second line appears:
   "The terms can go below zero: 30 − 32 = −2."
5. **n² means n × n.** Rule `n² + 3`. Picture: an n by n square of tiles
   plus 3 tiles in a different colour beside it. Slider "n: 1 to 6"
   (starts on 4) grows the square and shows `4² + 3 = 4 × 4 + 3 = 16 + 3
   = 19`. Text: "n² means n × n. It's called n squared." Callout:
   "4² is 4 × 4 = 16, not 4 × 2 = 8." Second callout: "2n² means 2 × n².
   Square first, then multiply: 2 × 4² = 2 × 16 = 32."
6. **Put the position in place of every n.** Rule `n² + 2n`. Slider
   "n: 1 to 6" (starts on 3) shows both ns turning into the number at
   once, in the highlight colour: `3² + 2 × 3 = 9 + 6 = 15`. Then the
   method, as three short numbered steps under the picture:
   "1. Find the position you want. 2. Put it in place of every n. 3. Work
   it out: squares first, then ×, then + or −."

## Try it (9 cards: 4 choice, 5 typed)

The rule is shown at the top of each card. After a right answer, the card
shows the working with the number in place of n (as in Learn), never
before.

1. Choice: rule `4n + 1`. "You want the 6th term. What number goes in
   place of n?" 6 ✓ / 4 (*"4 is the number you multiply by. n is the
   position."*) / 1 (*"n = 1 gives the 1st term. You want the 6th."*) / 5
   (*"The 6th term is at position 6, so n = 6. Don't count the gaps."*).
   Right: *"You want the 6th term, so n = 6."*
2. Typed: same rule. "Find the 6th term." 25. Rules: 24 → *"That's
   4 × 6. Now add 1."*; 11 → *"4n means 4 × n, not 4 + n."*; 47 → *"4n
   means 4 × 6, not the number 46."* Right: *"4 × 6 + 1 = 24 + 1 = 25."*
3. Choice: rule `25 − 3n`. "To find the 7th term, you work out
   25 − 3 × 7. What do you work out first?" 3 × 7 ✓ / 25 − 3 (*"Multiply
   before you take away. 25 − 3 first would give 22 × 7."*) / 25 × 7
   (*"The 7 goes in place of n, so it goes with the 3: 3 × 7."*) / 25 − 7
   (*"3n means 3 × 7. Don't drop the 3."*). Right: *"Multiply first:
   3 × 7 = 21."*
4. Typed: same rule. "Find the 7th term." 4. Rules: 154 → *"You took
   away first. Do 3 × 7 = 21 first, then 25 − 21."*; 46 → *"That adds 21.
   The rule takes away 3n: 25 − 21."*; −4 → *"25 is bigger than 21, so
   the answer is above zero: 25 − 21 = 4."* Right: *"25 − 3 × 7 =
   25 − 21 = 4."*
5. Typed (bank `nth-term-01`): rule `8n − 5`. "Find the 6th term." 43.
   Rules: 48 → *"That's 8 × 6. Now take away 5."*; 9 → *"8n means 8 × n,
   not 8 + n."*; 3 → *"That uses n = 1, the 1st term. For the 6th term,
   use n = 6."* Right: *"8 × 6 − 5 = 48 − 5 = 43."*
6. Choice: rule `n² + 5`. "Find the 6th term." 41 ✓ / 17 (*"6² means
   6 × 6, not 6 × 2."*) / 36 (*"That's 6². Now add 5."*) / 121 (*"That
   adds 5 before squaring. Square 6 first, then add 5."*). Right:
   *"6² + 5 = 36 + 5 = 41."*
7. Typed: rule `2n²`. "Find the 4th term." 32. Rules: 64 → *"That
   squares 2 × 4 = 8. Square 4 first, then multiply by 2."*; 16 → *"4² is
   16. Now multiply by 2."*; 8 → *"2n² isn't 2 × 4. Square 4 first:
   4 × 4 = 16."* Right: *"4² = 16, then 2 × 16 = 32."*
8. Typed, two fields: rule `n² + 2n`. "Find the 3rd term. First work out
   each part." Shows `3² + 2 × 3`. `input: 'number', fractions: true,
   fields: [{ id: 'square', label: '3²' }, { id: 'times', label: '2 × 3' }]`.
   Answer 9 and 6. Rules: {6, 6} → *"3² means 3 × 3 = 9, not 3 × 2."*;
   {9, 5} → *"2n means 2 × 3, not 2 + 3."*; {3, 6} → *"3² means 3 × 3,
   not just 3."* Right: *"3² = 9 and 2 × 3 = 6."*
9. Choice: same rule. "So what is the 3rd term?" 15 ✓ / 12 (*"3² is
   3 × 3 = 9, not 3 × 2 = 6. So it's 9 + 6."*) / 11 (*"2n means 2 × 3 =
   6. Put 3 in place of every n."*) / 9 (*"That's only 3². Add 2 × 3 as
   well."*). Right: *"9 + 6 = 15. You put 3 in place of both ns."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`use-nth-term`. Each choice has four different options shuffled with the
seeded `random`. Every rule value must differ from the answer and from
every other rule; drop one that clashes. Every right answer gets its own
feedback showing the working (`a × k + b = … = …`). Test the generator
with 32-bit seeds, not small ones.

| Type | Card | Builds |
|---|---|---|
| `linear-term` | typed | From bank `nth-term-01`. Rule an + b or an − b (a 2–9, b 1–12, keep ak − b above 0). "The nth term is an + b. Find the kth term." k 5–20. Half the time (plus rules only) in words: "Pattern n uses an + b sticks. How many sticks does Pattern k use?" Answer ak ± b. Rules: ak (*"That's a × k. Now add/take away b."*), a + k ± b (*"an means a × n, not a + n."*), a ± b (*"That uses n = 1, the 1st term. Use n = k."*), and when k is 5–9, the number "ak" read as digits, 10a + k ± b (*"an means a × k, not the number ak."*). |
| `take-away` | typed | From the draft's 50 − 4n and 20 − 3n. Rule c − an (a 2–6, c 20–60), k 5–15, c ≠ ak. Half the time the answer is below zero (c < ak), half the time above. Answer c − ak. Rules: (c − a) × k (*"You took away first. Work out a × k first."*), c + ak (*"That adds. The rule takes away an."*), ak − c (above zero: *"c is bigger than ak, so the answer is above zero."*; below zero: *"ak is bigger than c, so the answer is below zero."*). |
| `square-rule` | typed | From the draft's n² + 5, 2n² and n² − 2n. Position p 3–12. A third of the time each: n² + b (b 1–20), n² − b (b 1–20, b < p²), or mn² (m 2–5). Answers p² ± b or mp². Rules for n² ± b: 2p ± b (*"p² means p × p, not p × 2."*), (p ± b)² (*"Square p first, then add/take away b."*), p² (*"That's p². Now add/take away b."*). Rules for mn²: (mp)² (*"Square p first, then multiply by m."*), 2mp (*"p² means p × p, not p × 2."*), p² (*"That's p². Now multiply by m."*). |
| `term-choice` | choice | From Try it 2. Rule an + b, written as "b + an" half the time (like the draft's 7 + 3n). a 2–9, b 1–12, k 6–25. "Find the kth term." Right: ak + b. Wrong: ak (*"That's a × k. Now add b."*), a + k + b (*"an means a × n, not a + n."*), a × (k + b) (*"Multiply first, then add: a × k + b."*). |
| `first-terms` | choice | From Learn 5. Rule n² + b (b 1–9). "What are the first three terms?" Options are lists like `4, 7, 12`. Right: 1 + b, 4 + b, 9 + b. Wrong: b, 1 + b, 4 + b (*"Positions start at 1, not 0."*); 2 + b, 4 + b, 6 + b (*"n² means n × n, not n × 2."*); (1 + b)², (2 + b)², (3 + b)² (*"Square n first, then add b."*). |
| `every-term` | choice | From bank `nth-term-09`. Rule an − n² (a 2–6). "Someone says every term of this sequence is below zero. Which reply is right?" Right: "No. The 1st term is a × 1 − 1² = a − 1, which is above zero." (own feedback: *"One term above zero is enough to show they're wrong."*). Wrong: "Yes. n² is always bigger than an." (*"At n = 1, n² is 1 and an is a. a is bigger."*); "No. Put n = 0 and the term is 0." (*"Positions start at 1. There is no 0th term."*); "Yes. The 1st term is 1 − a, which is below zero." (*"Put 1 in place of n: a × 1 − 1² = a − 1, not 1 − a."*). Show every sum with its real numbers. |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice: rule `5n + 2`. *"Amir wants the 4th term. He says: 'I put
   n = 22, because the 4th term is 22.' Is Amir right?"* ✓ *"No. n is the
   position, so he puts n = 4. 5 × 4 + 2 = 22 is the term."* (*"Right.
   The position is 4. The term at that position is 22."*) / *"Yes. The
   4th term is 22, so n = 22."* (*"22 is the term. n is its position,
   4."*) / *"No. He should put n = 5, the number in front of n."* (*"5 is
   the number you multiply by. n is the position, 4."*) / *"No. The 4th
   term is 5 + 4 + 2 = 11."* (*"5n means 5 × n, not 5 + n. 5 × 4 + 2 =
   22."*)
2. Typed: same rule. "Find the 30th term." 152. Rules: 150 → *"That's
   5 × 30. Now add 2."*; 37 → *"5n means 5 × 30, not 5 + 30."*; 160 →
   *"You added first. Multiply first: 5 × 30 = 150, then add 2."* Right:
   *"5 × 30 + 2 = 150 + 2 = 152."*
3. Choice: rule `n² + 4`. *"Ella finds the 5th term like this:
   5 × 2 + 4 = 14. What did she do wrong?"* ✓ *"She worked out 5 × 2
   instead of 5². The 5th term is 25 + 4 = 29."* (*"Right. 5² means
   5 × 5 = 25, so the 5th term is 29."*) / *"Nothing. The 5th term is
   14."* (*"5² isn't 5 × 2. Squared means times by itself: 5 × 5."*) /
   *"She should add first: (5 + 4)² = 81."* (*"Square 5 first, then add
   4."*) / *"She used the wrong position. She should put n = 4."* (*"She
   wants the 5th term, so n = 5 is right. Her mistake is 5 × 2."*)
4. Typed: rule `40 − 3n`. "Find the 12th term." 4. Rules: 444 → *"You
   took away first. Do 3 × 12 = 36 first, then 40 − 36."*; 76 → *"That
   adds. The rule takes away 3n: 40 − 36."*; −4 → *"40 is bigger than 36,
   so the answer is above zero."* Right: *"40 − 3 × 12 = 40 − 36 = 4."*
5. Typed: rule `n² − 3n`. "Find the 7th term." 28. Rules: −7 → *"7²
   means 7 × 7 = 49, not 7 × 2 = 14."*; 46 → *"3n means 3 × 7. Put 7 in
   place of every n."*; 70 → *"That adds. The rule takes away 3n:
   49 − 21."* Right: *"7² − 3 × 7 = 49 − 21 = 28."*

Summary points:
- n is the position of the term: 1st, 2nd, 3rd and so on.
- To find a term, put its position in place of every n.
- 3n means 3 × n. n² means n × n.
- Work it out in order: squares first, then ×, then + or −.
- A term can be below zero.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly changes the
picture and keeps focus while dragged. No working appears on a card
before the pupil answers it. Four options on every choice, each wrong one
with its own feedback that fits that choice, and the right one with
feedback that isn't just its label again. Every method a question uses is
taught in Learn. Rules, rows of terms and working don't overlap at 375 px
(the row of terms wraps or shrinks, it doesn't scroll sideways; the
working can wrap onto two lines). `−`, `×` and `²` in displayed maths.
Typed answers accept `-4` and `−4`. Reload, Back and Practise again work.
The `dist/` lesson's last button reaches the homepage.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests and the browser solver, does the
  browser review at desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (e.g. `nth-term.js`) exposes
  one object on `window` (e.g. `window.NthTerm`) with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - `term(rule, n)`: works out a rule's nth term

  Every card config also carries its rule as data, `rule: { a, b, c }`
  meaning a·n² + b·n + c (so `3n + 2` is `{ a: 0, b: 3, c: 2 }`,
  `30 − 4n` is `{ a: 0, b: −4, c: 30 }`, `an − n²` is `{ a: −1, b: a,
  c: 0 }`), and `position` (the n asked for; for `first-terms` use
  `positions: [1, 2, 3]`), so a test can recompute every answer. The
  Try it 1 and 3 cards (which ask for a step, not a term) carry
  `asked: 'step'`. Card configs use the shared card fields (`input`,
  `prompt`, `options` with `label`/`correct`/`feedback`, `answer`,
  `fields`, `rules`, `fallback`, `questionType`).
- **Commit** (one commit): the lesson folder, the `curriculum.json`
  change, this spec file (copy it from the main checkout's `docs/`), and
  the rebuilt `dist/`. Message: "Add using the nth term lesson". Push the
  branch. Never open a PR or merge until a signed Claude message says
  Umar approved.

## Report, then wait

Post one relay reply with: the commit hash; the `window` object's name and
anything a test needs that isn't obvious; anything you changed from this
spec and why; anything you couldn't do. Then run the wait loop **in the
foreground** and stay in your turn until it prints Claude's next message:

```sh
while :; do
  relay/wait.sh codex
  status=$?
  if [ "$status" -ne 2 ]; then break; fi
done
```

## Changes from the draft

- **Learn has a hands-on picture.** The draft was text and a table. Now
  each screen has a slider: it lights up term n in a row and builds the
  working, with the number shown in place of n (rule 4 in AGENTS.md §5).
- **Learn opens with the idea.** Screen 1 shows positions under a row of
  terms before the word "nth term" or any rule (rule 3).
- **Added "Positions start at 1"** (Learn 1). Bank card 09 and the
  `first-terms` type test the n = 0 mistake.
- **Added the "real things" line** (Learn 3), because Practice asks about
  sticks in a pattern.
- **Dropped the word "substitution".** "Put the position in place of n"
  says the same thing in plain words (rule 7). Also no "value" on its
  own: the draft's "position vs value" is now "position vs term".
- **Every choice has four options** with feedback for each wrong one (the
  draft had two or three, with one shared message). The right option
  always has its own feedback, not its label again (a bug in the
  sequences lesson).
- **Two-box steps became real cards.** "4 × 6 + 1 = □ + 1" and
  "24 + 1 = □" are now one typed card (Try it 2) with the working shown
  after. "□ + □" for n² + 2n is a two-field card (Try it 8).
- **Added Try it cards** for 8n − 5 (bank card 01), n² + 5 and 2n², so
  pupils try every kind of rule before Practice. The draft's Try it had
  only three rules.
- **Practice is a generator** (rule 7 in §5), mixing choice and typed
  (rule 6). The draft's nine fixed items became the `linear-term`,
  `take-away`, `term-choice` and `square-rule` types. Bank cards 01 and
  09 became `linear-term` and `every-term`.
- **"Explain" questions are now choices.** Amir's and Ella's questions
  (Check 1 and 3) can't be marked as free text, so each is a "who's
  right?" choice with the explanation in the options. "Show your
  calculation" (Check 3 in the draft) is now a typed answer with the
  working in the feedback (Check 4).
- **Check has 5 questions, not 3**, mixing choice and typed (rule 6).
- **Removed the boxed formula and the button notes** ("show one step at a
  time", "keep the answers hidden", "Continue"): the engine owns the
  button and the feedback.
- **n² rules stay in.** Using a given nth term with n² in it is in the
  GCSE subject content (A23 covers quadratic sequences given their nth
  term), so it belongs in this lesson. Finding an n² rule does not.
- **Bank cards not used here:** `-02`, `-03`, `-04` and `-12` find the
  rule (next lesson, `finding-the-nth-term`). `-05`, `-06`, `-07`, `-08`,
  `-10` and `-11` work backwards from a term to its position ("which term
  is −53?", "is 100 a term?"). That needs solving an equation, which this
  lesson doesn't teach; they fit better after the finding lesson.
- I checked every number in the draft: all rules and answers are right.
