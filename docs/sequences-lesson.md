# Continuing a sequence: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: finding a sequence's term-to-term rule
(add, subtract, multiply or divide by the same number, or a two-step rule
given in words) and using it to work out the next terms, including terms
below zero and decimals.

Umar's draft (from ChatGPT, 2026-10-29) is the source. It has been
rewritten to the ground rules, and Practice now uses cards from the local
question bank (`docs/exam-bank/bank/sequences.json`, cards 01–05). See
"Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/sequences` from **`origin/main`**
  (`a250663` or later) in its own worktree, e.g. `.worktrees/sequences`.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lessons:** `content/equations-of-straight-lines/`
  (multi-field number cards, helper object on `window`),
  `content/indices-basics/` (Learn screens with a slider that builds a
  picture), `content/convert-a-fraction-to-a-percentage/` (Check mixing
  choice and typed answers).
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- Slug `sequences` (the placeholder already in `curriculum.json`,
  Algebra). Change its title to **"Continuing a sequence"** and its
  subtitle to **"Find the rule and use it to work out the next terms."**
- **Change its skills to `["generate-sequences"]` only.** This lesson
  doesn't teach `recognise-special-sequences` (Fibonacci-type, square,
  cube and triangular numbers). Add a new placeholder straight after
  `sequences`, with no folder:
  `{"folder":"special-sequences","title":"Special sequences","subtitle":"Recognise square, cube, triangular and Fibonacci-type sequences.","skills":["recognise-special-sequences"]}`
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Write sequences as `3, 7, 11, 15, …` (the ellipsis character, spaces
  after commas). Use `−` for minus and `×` and `÷` in displayed maths.
- Say "term" and "term-to-term rule" only after screen 1 and 2 define
  them. Don't use "arithmetic" or "geometric" anywhere.
- Rules are written with a capital and no full stop: "Add 4",
  "Subtract 5", "Multiply by 3", "Divide by 2".

## Learn (6 screens, all teaching, no questions)

Each screen has one picture that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
picture and keeps focus while dragged (don't rebuild the whole screen).

1. **Numbers that follow a pattern.** "A cinema row has 3 seats. Each new
   row has 4 more seats than the row before." Picture: rows of seat
   icons. Slider "Rows: 1 to 4" adds rows, and the counts 3, 7, 11, 15
   appear beside them as a list. Then: "A list of numbers in order is
   called a **sequence**. Each number in it is a **term**. The dots (…)
   mean it keeps going."
2. **Find the rule.** `3, 7, 11, 15, …` in boxes. Slider "Show jumps: 0 to
   4". Steps 1–3 draw a curved arrow labelled "+4" over each pair. Step 4
   adds a fifth box: `15 + 4 = 19`. Text: "Look at how you get from each
   term to the next. It's add 4 every time. This is the
   **term-to-term rule**: it tells you how to get the next term from the
   one before. To find the next term, use the rule on the last term."
3. **A sequence can go down.** `10, 6, 2, −2, …`. Picture: a number line
   from −8 to 12. Slider "Jumps: 0 to 4" draws each jump of 4 to the
   left; the fourth jump crosses into −6, which is added to the list.
   Text: "Each term is 4 less than the one before. The rule is subtract
   4. Keep going past zero: −2 − 4 = −6."
4. **Sometimes you multiply.** `2, 6, 18, 54, …`. First show the gaps as
   "+4" and "+12" in red with "The gaps aren't the same, so it isn't an
   add rule." Slider "Show ×3: 0 to 4" replaces them, pair by pair, with
   green "×3" arrows; step 4 adds `54 × 3 = 162`. Text: "Each term is 3
   times the one before. The rule is multiply by 3."
5. **Sometimes you divide. Check every pair.** `80, 40, 20, 10, …` with
   "÷2" arrows built by the slider, ending `10 ÷ 2 = 5`. Then a callout:
   "Always check your rule on every pair. For 2, 6, 18, 54, add 4 works
   for 2 to 6, but not for 6 to 18." Show `6 + 4 = 10` crossed out next
   to `18`.
6. **Rules with two steps.** "Some rules come in words, like: multiply by
   2, then add 1. Do the steps in order, every time." Slider "Terms: 1 to
   4" builds `3 → 7 → 15 → 31`, each arrow showing its working:
   `3 × 2 = 6`, `6 + 1 = 7`, and so on. Callout: "Order matters. Adding 1
   first would give (3 + 1) × 2 = 8, which is wrong."

## Try it (9 cards: 4 choice, 5 typed)

The sequence is shown at the top of each card. After a right answer, the
card shows the arrows for the rule (as in Learn), never before.

1. Typed: `5, 11, 17, 23, …` "How much is added each time?" 6. Rules: 5 →
   *"You counted the numbers between 5 and 11. Count the jump instead:
   11 − 5 = 6."*; 16 → *"That adds 5 and 11. Take away instead:
   11 − 5."* Right: *"11 − 5 = 6, 17 − 11 = 6 and 23 − 17 = 6. The rule is
   add 6."*
2. Typed: same sequence. "What is the next term?" 29. Rules: 28 →
   *"The rule is add 6, not add 5."*; 46 → *"That doubles 23. The rule is
   add 6."*; 6 → *"6 is the rule. Use it on the last term: 23 + 6."*
   Right: *"23 + 6 = 29."*
3. Choice: `13, 8, 3, −2, …` "What is the term-to-term rule?" Subtract 5
   ✓ / Add 5 (*"The terms are getting smaller, so you take away."*) /
   Subtract 10 (*"10 is the change over two steps, 13 to 3. Look at one
   step."*) / Subtract 4 (*"Count the jump, not the numbers in between:
   13 − 8 = 5."*). Right: *"Each term is 5 less than the one before."*
4. Typed: same sequence. "What is the next term?" −7. Rules: 7 →
   *"Subtracting from −2 takes you further below zero. The answer is
   negative."*; 3 → *"Adding 5 takes you back to 3, the term before. Go
   down 5 from −2."*; −3 → *"Go down 5 from −2, not 1."* Right:
   *"−2 − 5 = −7."*
5. Choice: `3, 12, 48, 192, …` "Which rule works for every pair?"
   Multiply by 4 ✓ / Add 9 (*"Add 9 works for 3 to 12, but 12 + 9 is 21,
   not 48."*) / Add 36 (*"Add 36 works for 12 to 48 only. 3 + 36 isn't
   12."*) / Multiply by 3 (*"3 × 3 = 9, not 12. Check the first pair."*).
   Right: *"3 × 4 = 12, 12 × 4 = 48 and 48 × 4 = 192."*
6. Typed: same sequence. "What is the next term?" 768. Rules: 201 →
   *"That adds 9. The rule is multiply by 4."*; 576 → *"That multiplies
   by 3. The rule is multiply by 4."*; 196 → *"That adds 4. Multiply by 4
   instead."* Right: *"192 × 4 = 768."*
7. Choice (bank `sequences-02`): `42, 35, 28, 21, …` "Which rule gives
   the next term?" Subtract 7 ✓ / Add 7 (*"The terms are getting smaller,
   not larger."*) / Divide by 7 (*"35 ÷ 7 is 5, not 28."*) / Subtract 14
   (*"14 is the change over two steps, not one."*). Right: *"Each term is
   7 less than the one before."*
8. Typed: `64, 32, 16, 8, …` "What is the next term?" 4. Rules: 0 →
   *"That subtracts 8. Check: 64 − 8 isn't 32. The rule is divide by
   2."*; 16 → *"That multiplies by 2. The terms are getting smaller, so
   divide."*; 2 → *"That divides by 4. Each term is half the one
   before."* Right: *"8 ÷ 2 = 4."*
9. Choice: "The rule is: multiply by 2, then subtract 1. A term is 6.
   What is the next term?" 11 ✓ / 10 (*"You subtracted first. Multiply
   first: 6 × 2 = 12, then 12 − 1."*) / 12 (*"That's after the first step
   only. Now subtract 1."*) / 5 (*"You only subtracted 1. Multiply by 2
   first."*). Right: *"6 × 2 = 12, then 12 − 1 = 11."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`generate-sequences`. Each choice has four different options shuffled
with the seeded `random`. Every rule value must differ from the answer
and from every other rule; drop one that clashes. Test the generator
with 32-bit seeds, not small ones.

| Type | Card | Builds |
|---|---|---|
| `rule-choice` | choice | From bank `sequences-02`. Four terms that go up or down by d (d 3–12, every term 1–100). "Which rule gives the next term?" Right: Add d or Subtract d. Wrong: the opposite direction (*"The terms are getting larger/smaller…"*), the change over two steps, 2d (*"That's the change over two steps, not one."*), and Multiply by d / Divide by d (*"Check: first term × d isn't the second term."*); for the last one, use a d where that check is really false. |
| `next-multiply` | choice | From bank `sequences-04`. Start a 1–8, multiplier r 2–4, show a, ar, ar², ar³ (in a context half the time: "A culture triples in size every hour." / "A prize doubles each round."). "What is the next term?" Answer ar⁴. Wrong: ar³ + (ar³ − ar²) (*"That adds the last gap again. The gaps aren't the same, so multiply."*), ar³ + r (*"That adds r instead of multiplying by r."*), ar³ × (r − 1) (*"That multiplies by the wrong number. Check the first pair."*). Half the time run it as a divide sequence: show ar⁴, ar³, ar², ar, answer a. Wrong: ar − r (*"That subtracts r. Check the first pair: it divides by r."*), ar² (*"That multiplies. The terms are getting smaller, so divide."*), and ar ÷ 2 when r ≠ 2 or ar ÷ 4 when r = 2 (*"That divides by the wrong number. Check the first pair."*). Choose a so every option is a whole number. |
| `every-pair` | choice | From Try it 5. Start a 2–6, r 2–4, show a, ar, ar², ar³. "Which rule works for every pair?" Right: Multiply by r. Wrong: Add (ar − a) (first pair only), Add (ar² − ar) (second pair only), Multiply by (r + 1) or (r − 1), whichever isn't 1. Feedback says which pair breaks the rule, with the numbers. |
| `below-zero` | typed | From bank `sequences-03`. Step d 3–12, last shown term t 1 to d − 1. Show four terms going down by d, ending at t. "What is the next term?" Answer t − d. Rules: d − t (*"Going down from t passes zero. The answer is negative."*), t + d (*"That adds d. The terms are going down."*). |
| `two-step` | typed | From bank `sequences-05`. "A number machine adds a, then multiplies by m. Its answer goes back in each time. Start with s. What is the answer after two goes?" s 1–10, a 2–8, m 2–4. Answer m(m(s + a) + a). Rules: reversed order each go, m(ms + a) + a (*"That multiplies first. Keep the steps in the order given."*); one go only, m(s + a) (*"That's after one go. Put it back in."*); three goes (*"That's three goes, one too many."*). Half the time use "multiplies by m, then subtracts a" instead (s chosen so every answer is positive), with the matching rules. |
| `next-two` | typed, two fields | From the draft's Practice list. Four terms with rule add d (d 2–9), subtract d (going below zero half the time), or add 0.5 / add 1.5 (start 0.5–5). "Write the next two terms." `input: 'number', fractions: true, fields: [{ id: 'first', label: 'Next term' }, { id: 'second', label: 'Term after' }]`. Rules: first right but second = first + the wrong step (*"Use the same rule again on the term you just found."*); both found by doubling (*"The rule is add/subtract d, not double."*); for negatives, both signs lost (*"Below zero the terms are negative."*). |
| `pattern-k` | typed | From the draft's sticks question. A table of pattern number 1, 2, 3 with sticks (or tiles) b, b + d, b + 2d (b 3–8, d 2–5). "How many sticks will Pattern k use?" k 5–8. Answer b + (k − 1)d. Rules: b + (k − 2)d (*"That's Pattern k − 1. Count on one more."*), k × d (*"Multiplying the pattern number by the jump misses the start. Keep adding d from the table."*), b + kd (*"That's one jump too many. Pattern 1 already has b sticks."*). |

Each session: `rule-choice`, `next-multiply` and `every-pair` (choice ×3),
plus `below-zero`, `two-step`, and one of `next-two` or `pattern-k`
(picked with the seeded `random`) (typed ×3), in a mixed order.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Typed, two fields: `17, 12, 7, 2, …` "Write the next two terms." −3
   and −8. Rules: {3, 8} → *"Below zero, the terms are negative:
   2 − 5 = −3."*; {−3, −7} → *"Take away 5 again: −3 − 5 = −8."*
2. Choice: `4, 12, 36, 108, …` *"Sam says the rule is add 8, because
   4 + 8 = 12. Is Sam right?"* ✓ *"No. 12 + 8 = 20, not 36. The rule is
   multiply by 3."* / *"Yes. 4 + 8 = 12."* (*"It works for the first pair
   only. Check 12 to 36."*) / *"No. The rule is add 24."* (*"Add 24 works
   for 12 to 36 only. Check 4 to 12."*) / *"No. The rule is multiply by
   4."* (*"4 × 4 = 16, not 12."*)
3. Typed: same sequence. "What is the next term?" 324. Rules: 116 →
   *"That's Sam's add 8. Multiply by 3."*; 180 → *"That adds the last gap,
   72. The gaps aren't the same, so multiply."*; 432 → *"That multiplies
   by 4. The rule is multiply by 3."*
4. Choice: *"A sequence starts at 64. Its rule is divide by 2. Aisha says
   it must stop at 1, because you can't halve 1. Is Aisha right?"* ✓ *"No.
   The next two terms are 0.5 and 0.25."* / *"Yes. You can't halve 1."*
   (*"Half of 1 is 0.5. Terms can be decimals."*) / *"No. The next two
   terms are 0 and −1."* (*"That subtracts 1. The rule is divide by
   2."*) / *"No. The next two terms are 2 and 4."* (*"That goes backwards
   by doubling. Keep dividing by 2."*)
5. Typed: *"The rule is: multiply by 3, then subtract 2. The first term is
   4. What is the third term?"* 28. Rules: 10 → *"That's the second term.
   Use the rule once more."*; 12 → *"You subtracted first. Multiply by 3,
   then take away 2."*; 82 → *"That's the fourth term, one step too
   many."*

Summary points:
- The term-to-term rule tells you how to get from one term to the next.
- Look at the change between each pair of terms: add, subtract, multiply
  or divide.
- Check the rule works for every pair, not just the first.
- Keep going past zero, and into decimals, if the rule takes you there.
- Do two-step rules in the order given.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly changes the
picture and keeps focus while dragged. No arrow or rule appears on a card
before the pupil answers it. Four options on every choice, each wrong one
with its own feedback that fits that choice. Every method a question uses
is taught in Learn. Sequences, arrows and labels don't overlap at 375 px
(long sequences wrap or shrink, they don't scroll sideways). `−`, `×`
and `÷` in displayed maths. Typed answers accept `-7` and `−7`, and `0.5`.
Reload, Back and Practise again work. The `dist/` lesson's last button
reaches the homepage.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests and the browser solver, does the
  browser review at desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` exposes one object on `window`
  with:
  - `learnScreens`: the Learn screens' text (titles, lines, displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs

  Every card config also carries its sequence as data (`terms`, the rule
  as `{ op: 'add' | 'subtract' | 'multiply' | 'divide' | 'two-step',
  … }`, and which term is asked for), so a test can recompute every
  answer. Card configs use the shared card fields (`input`, `prompt`,
  `options` with `label`/`correct`/`feedback`, `answer`, `fields`,
  `rules`, `fallback`, `questionType`).
- **Commit** (one commit): the lesson folder, the `curriculum.json`
  change, this spec file (copy it from the main checkout's `docs/`), and
  the rebuilt `dist/`. Message: "Add continuing a sequence lesson". Push
  the branch. Never open a PR or merge until a signed Claude message says
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

- **Learn asks nothing.** The draft's first screen had pupils type the
  changes. It's now a slider that draws the jumps (ground rules 2–3).
- **Intro picture.** The draft's seats example is now screen 1, with a
  picture, before any rule is named.
- **Added a two-step rule screen** (Learn 6, Try it 9, Check 5, Practice
  `two-step`). Rules like "add 5, then double" come up in 4 exam questions
  in the bank, and pupils often do the steps in the wrong order.
- **Divide gets its own Try it card** (Try it 8). The draft taught it but
  never asked it before Practice.
- **Dropped "arithmetic sequence" and "geometric sequence".** They're
  extra jargon (rule 7), and recognising sequence types is a separate
  skill (`recognise-special-sequences`), now its own placeholder lesson.
- **Every choice has four options** with feedback for each wrong one (the
  draft had three, with feedback for only one).
- **Practice is a generator** (rule 7), mixing choice and typed (rule 6).
  The draft's six fixed "rule and next two terms" items became the
  `next-two` type; the sticks question became `pattern-k`. Bank cards
  `sequences-02`, `-03`, `-04` and `-05` replace the rest, as
  `rule-choice`, `below-zero`, `next-multiply` and `two-step`.
- **"Explain" questions are now choices.** Sam's and Aisha's questions
  (Check 2 and 4) can't be marked as free text, so each is a "who's
  right?" choice with the explanation in the options.
- **The draft's two-box card** (11 + □ = 17, 17 + □ = 23) became one
  typed card with the rest of the working shown in the right-answer
  feedback.
- **Removed the button notes** ("Check answer", "Continue", "withhold
  hints"): the engine owns the button and feedback.
- **Bank cards not used here:** `-06` (reverse a rule) and `-07` (count
  the gaps) need a "work backwards" method this lesson doesn't teach;
  `-11` is a position rule (nth-term lesson); `-08`, `-09`, `-10`, `-12`
  are special sequences (new placeholder).
- I checked every number in the draft: all rules and answers are right.
