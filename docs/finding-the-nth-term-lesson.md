# Finding the nth term: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: finding the nth term of a sequence that
goes up or down by the same amount each time (rules like 4n + 1, 3n − 1,
17 − 3n and 4n), then checking it. It follows straight on from "Using the
nth term" (`content/nth-term/`, merged as PR #28): that lesson put a
position into a rule, this one works the rule out.

Umar's draft (from ChatGPT, 2026-10-29) is the source. It has been
rewritten to the ground rules, and Practice uses cards from the local
question bank (`docs/exam-bank/bank/nth-term.json`, cards 02, 03 and 12).
See "Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/finding-the-nth-term` from
  **`origin/main`** (`055b4d0` or later, which has the nth-term lesson,
  PR #28) in its own worktree, e.g. `.worktrees/finding-the-nth-term`.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lesson:** `content/nth-term/` (built today: helper
  object on `window`, `learnScreens`, sliders that light up a row of
  terms, the working with the number shown in place of n, the Practice
  generator, retained Check). Copy its patterns and its look, so the two
  lessons feel like one pair.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- Slug `finding-the-nth-term` (the placeholder already in
  `curriculum.json`, Algebra, straight after `nth-term`). Keep its title
  "Finding the nth term", its subtitle and its skill
  `find-linear-nth-term` as they are.
- Change nothing in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Write rules as `4n + 1`, `3n − 1`, `17 − 3n`, `4n` (no LaTeX, no boxed
  formulas). Use `−` for minus and `×` in displayed working.
- A rule that goes down is written number first: `17 − 3n`, never
  `−3n + 17`.
- Write sequences as `5, 9, 13, 17, …` (the ellipsis character, spaces
  after commas).
- Say "goes up by 4 each time" and "the 4 times table". Don't use
  "common difference", "linear", "arithmetic" or "coefficient" anywhere.
  "Difference" may be used after screen 2 says what it means.
- Displayed working has no full stop: `4 × 2 + 1 = 9`.

## Learn (6 screens, all teaching, no questions)

Each screen has one picture that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
picture and keeps focus while dragged (don't rebuild the whole screen).
Each slider screen starts on a useful value (not blank).

The main picture is a **two-row table**, the same on screens 2–5: the top
row is the times-table row (e.g. `4n: 4, 8, 12, 16`), the bottom row is
the sequence, positions 1–4 above both. Sliders fill it in column by
column.

1. **Why find a rule?** `5, 9, 13, 17, …` in boxes with positions 1–4
   under them. Slider "Jumps: 0 to 3" (starts on 3) draws a "+4" arrow
   over each pair. Text: "This sequence goes up by 4 each time. That's
   easy to keep going. But to find the 50th term, you'd have to add 4
   lots of times. Last lesson you used an nth term to jump straight to
   any term. Now you'll find the nth term yourself."
2. **It goes up like a times table.** The two-row table, with the
   sequence row filled in and the `4n` row empty. Slider "Show 4n: 0 to
   4" (starts on 1) fills the `4n` row one column at a time: 4, 8, 12,
   16. Text: "The sequence goes up by 4 each time. The amount it goes up
   by is called the **difference**. The 4 times table goes up by 4 too.
   That's 4n: 4 × 1, 4 × 2, 4 × 3, … So the rule starts with 4n."
3. **Make the rows match.** Same table, both rows filled. Slider "Compare:
   0 to 4" (starts on 1) draws a "+1" arrow from `4n` down to the
   sequence in one column at a time. At 4 the rule `4n + 1` appears big
   under the table. Text: "Each term is 1 more than the 4 times table.
   So the nth term is 4n + 1. Multiply the position by 4, then add 1."
4. **Sometimes you take away.** `2, 5, 8, 11, …` with the `3n` row (3,
   6, 9, 12). Slider "Compare: 0 to 4" (starts on 1) draws "−1" arrows.
   At 4 the rule `3n − 1` appears. Text: "It goes up by 3, so start with
   3n. Each term is 1 less than the 3 times table. So the nth term is
   3n − 1." Callout: "If the terms match the times table exactly, you
   don't add anything. For 4, 8, 12, 16, … the nth term is 4n."
5. **When it goes down.** `14, 11, 8, 5, …` with a `−3n` row (−3, −6,
   −9, −12). Slider "Compare: 0 to 4" (starts on 1) draws "+17" arrows,
   one column at a time, with the sum under each: `−3 + 17 = 14`. At 4
   the rule `17 − 3n` appears. Text: "It goes down by 3 each time, so use
   −3n. To get from −3 to 14, add 17. That works in every column. So the
   nth term is 17 − 3n."
6. **Always check your rule.** Rule `4n + 1` and the sequence `5, 9, 13,
   17, …`. Slider "Check position: 1 to 4" (starts on 1) lights up that
   term and shows `4 × 2 + 1 = 9` with a green tick when it matches.
   Callout: "A common mistake: the first term is 5, so the rule is
   4n + 5. Check it: 4 × 1 + 5 = 9, not 5. Always check the first two
   terms." Then the method, as four short numbered steps:
   "1. Find how much it goes up or down each time. 2. Write that times
   n. 3. Work out what to add or take away to match the terms. 4. Check
   the first two terms."

## Try it (9 cards: 4 choice, 5 typed)

The sequence is shown at the top of each card (cards 2 and 7 also show
the two-row table, with the times-table row filled in). After a right
answer, the card shows the working (as in Learn), never before.

1. Typed: `7, 12, 17, 22, …` "How much does it go up by each time?" 5.
   Rules: 7 → *"7 is the 1st term. Find the jump: 12 − 7."*; 4 → *"Count
   the jump, not the numbers between: 12 − 7 = 5."*; 19 → *"That adds 7
   and 12. Take away instead: 12 − 7."* Right: *"12 − 7 = 5, 17 − 12 = 5
   and 22 − 17 = 5."*
2. Typed: same sequence, table with the `5n` row: 5, 10, 15, 20. "How
   much more is each term than the 5 times table?" 2. Rules: 7 → *"7 is
   the 1st term. Compare it with 5 × 1 = 5: 7 − 5 = 2."*; 5 → *"5 is the
   jump. Compare the two rows: 7 − 5 = 2."*; −2 → *"The terms are bigger
   than the 5 times table, so it's 2 more."* Right: *"7 − 5 = 2, 12 − 10
   = 2, and so on."*
3. Choice: same sequence. "What is the nth term?" 5n + 2 ✓ / 5n + 7
   (*"7 is the 1st term. Check: 5 × 1 + 7 = 12, not 7."*) / 2n + 5 (*"It
   goes up by 5, so the 5 goes with n: 5n."*) / n + 5 (*"n + 5 goes up by
   1 each time. This goes up by 5."*). Right: *"5 × 1 + 2 = 7 and
   5 × 2 + 2 = 12."*
4. Typed: same sequence. "Use 5n + 2 to find the 50th term." 252. Rules:
   250 → *"That's 5 × 50. Now add 2."*; 257 → *"That uses 5n + 7. The
   rule is 5n + 2."*; 57 → *"5n means 5 × 50, not 5 + 50."* Right:
   *"5 × 50 + 2 = 250 + 2 = 252"*
5. Choice (bank `nth-term-02`, same mistakes): `1, 5, 9, 13, …` "What is
   the nth term?" 4n − 3 ✓ / 4n + 1 (*"1 is the 1st term. Check:
   4 × 1 + 1 = 5, not 1."*) / 4n + 3 (*"Each term is 3 less than the 4
   times table, not 3 more."*) / 4n (*"4n gives 4, 8, 12, 16. Each term
   is 3 less, so take away 3."*). Right: *"4 × 1 − 3 = 1 and
   4 × 2 − 3 = 5."*
6. Typed: same sequence. "Use your rule to find the 20th term." 77.
   Rules: 80 → *"That's 4 × 20. Now take away 3."*; 83 → *"That adds 3.
   The rule is 4n − 3."*; 81 → *"That uses 4n + 1. Check it: 4 × 1 + 1 =
   5, not 1."* Right: *"4 × 20 − 3 = 80 − 3 = 77"*
7. Typed: `10, 8, 6, 4, …`, table with the `−2n` row: −2, −4, −6, −8. "It
   goes down by 2, so use −2n. What do you add to −2n to get each term?"
   12. Rules: 10 → *"10 is the 1st term. −2 + 12 = 10, so add 12."*; 8 →
   *"Compare the rows: from −2 up to 10 is 12."*; −12 → *"The terms are
   bigger than the −2n row, so you add."* Right: *"−2 + 12 = 10,
   −4 + 12 = 8, and so on."*
8. Choice (bank `nth-term-03`, same mistakes): same sequence. "What is the
   nth term?" 12 − 2n ✓ / 12 + 2n (*"That goes up by 2. The terms go
   down, so take away 2n."*) / 10 − 2n (*"10 is the 1st term. Check:
   10 − 2 × 1 = 8, not 10."*) / n − 2 (*"n − 2 goes up by 1 each time.
   This goes down by 2."*). Right: *"12 − 2 × 1 = 10 and 12 − 2 × 2 =
   8."*
9. Choice (bank `nth-term-12`): picture of Patterns 1, 2 and 3, each with
   four rows of n red dots and the same 2 blue dots. "How many dots are in
   Pattern 14?" 58 ✓ / 62 (*"That's Pattern 15, one too far."*) / 56
   (*"That counts only the red dots. Add the 2 blue dots."*) / 54
   (*"That's Pattern 13."*). Right: *"4 rows of 14 red dots, plus 2 blue:
   4 × 14 + 2 = 58."* Above the picture: "Pattern n has 4 rows of n red
   dots and 2 blue dots."

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`find-linear-nth-term`. Each choice has four different options shuffled
with the seeded `random`. Every rule value must differ from the answer
and from every other rule; drop one that clashes, and keep at least two.
Every right answer gets its own feedback showing a check of the first two
terms. Show four terms of each sequence. Test the generator with 32-bit
seeds, not small ones.

| Type | Card | Builds |
|---|---|---|
| `rule-up` | choice | From bank `nth-term-02`. Rule dn + c, d 2–9, c −8 to 10 (c ≠ 0 most of the time; the 1st term d + c is at least 1). "What is the nth term?" Right: dn + c (or dn when c = 0). Wrong: dn + (d + c) (*"d + c is the 1st term. Check: d × 1 + (d + c) isn't the 1st term."*); (d + c)n + d when that's different (*"It goes up by d, so d goes with n."*); if that duplicates another option (as when c = 0), use (d + 1)n instead (*"(d + 1)n goes up by d + 1 each time. This goes up by d."*); dn with the opposite sign of c, or n + d when c = 0 (*"n + d goes up by 1 each time."*). Write the rule the right way: `4n − 3`, not `4n + −3`. |
| `rule-down` | choice | From bank `nth-term-03`. Rule c − dn, d 2–9, c 20–60 (all four terms above 0). Right: c − dn. Wrong: c + dn (*"That goes up. The terms go down, so take away dn."*), (c − d) − dn (*"c − d is the 1st term. Check: (c − d) − d × 1 isn't the 1st term."*), c − n (*"That goes down by 1 each time, not d."*). |
| `pattern-dots` | choice | From bank `nth-term-12`. Pattern n has r rows of n red dots and f blue dots (r 2–5, f 1–5). Picture of Patterns 1, 2 and 3. "How many dots are in Pattern k?" k 8–20. Right: rk + f. Wrong: r(k + 1) + f (*"That's Pattern k + 1, one too far."*), rk (*"That counts only the red dots. Add the f blue dots."*), r(k − 1) + f (*"That's Pattern k − 1."*). |
| `adjust` | typed | From Try it 2 and 7. Rule dn + c (up, half the time) or c − dn (down). Show the two-row table with the dn or −dn row filled in. Up: "What do you add to dn to get each term?" if c > 0, or "What do you take away from dn?" if c < 0; answer the size of c. Down: "What do you add to −dn?" answer c. Rules: the 1st term (*"That's the 1st term. Compare it with the number above it."*), d (*"d is the jump. Compare the two rows."*), the answer with its sign flipped (*"Look at which row is bigger."*). |
| `find-then-use` | typed | From Try it 4 and 6. Rule dn + c (d 2–9, c −8 to 10) or c − dn (half the time, d 2–6, c 20–60, any answer above or below 0). "Find the nth term, then use it to find the kth term." k 20–100. Answer the kth term. With the rule as d·n + c (d negative for down rules), the rules are: d × k alone (*"That's only the n part. Now add or take away the rest of the rule."*); d × k + the 1st term (*"That uses the 1st term in the rule. Check your rule on the 1st term."*); and, for up rules only, d + k + c (*"dn means d × n, not d + n."*). Right-answer feedback shows the rule, then the working, e.g. *"The nth term is 4n − 3. 4 × 20 − 3 = 77"*. |
| `down-jump` | typed | From Learn 5. Rule c − dn, d 2–9, c 20–60. "What number goes in front of n in the nth term?" Answer −d. Rules: d (*"The terms go down, so it's −d."*), the 1st term (*"That's the 1st term. Find the jump between terms."*). Accept `-4` and `−4`. |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice: `5, 9, 13, 17, …` *"Amir says the nth term is 4n + 5,
   because it goes up by 4 and the first term is 5. Is Amir right?"* ✓
   *"No. 4 × 1 + 5 = 9, not 5. The nth term is 4n + 1."* (*"Right. The
   4n part already gives 4 at position 1, so you only add 1."*) / *"Yes.
   It goes up by 4 and starts at 5."* (*"Check it: 4 × 1 + 5 = 9, but the
   1st term is 5."*) / *"No. The nth term is 5n + 4."* (*"It goes up by
   4, so the 4 goes with n."*) / *"No. The nth term is 4n − 1."*
   (*"4 × 1 − 1 = 3, not 5."*)
2. Choice: `7, 10, 13, 16, …` *"Beth says the nth term is 5n + 2. She
   checks n = 1 and gets 7. Is Beth right?"* ✓ *"No. 5 × 2 + 2 = 12, but
   the 2nd term is 10. The nth term is 3n + 4."* (*"Right. One term isn't
   enough. Check the 2nd term too."*) / *"Yes. It works for n = 1."*
   (*"Check n = 2 as well: 5 × 2 + 2 = 12, not 10."*) / *"No. The nth term
   is 3n + 7."* (*"3 × 1 + 7 = 10, not 7."*) / *"No. The nth term is
   7n + 3."* (*"It goes up by 3, so the 3 goes with n."*)
3. Typed: `11, 16, 21, 26, …` "The nth term is 5n + □. What number goes
   in the box?" 6. Rules: 11 → *"11 is the 1st term. 5 × 1 = 5, so add
   6."*; 5 → *"5 is the jump. Compare 11 with 5 × 1 = 5."* Right:
   *"5 × 1 + 6 = 11 and 5 × 2 + 6 = 16."*
4. Typed: same sequence. "Find the 100th term." 506. Rules: 500 →
   *"That's 5 × 100. Now add 6."*; 511 → *"That uses 5n + 11. Check it on
   the 1st term."*; 111 → *"5n means 5 × 100, not 5 + 100."* Right:
   *"5 × 100 + 6 = 500 + 6 = 506"*
5. Typed: `20, 17, 14, 11, …` "The nth term is □ − 3n. What number goes in
   the box?" 23. Rules: 20 → *"Check: 20 − 3 × 1 = 17, not 20. Add the 3
   back: 23."*; 17 → *"17 is the 2nd term. You need 23 − 3 × 1 = 20."*; 3
   → *"3 is the jump. The number in the box makes the 1st term 20."*
   Right: *"23 − 3 × 1 = 20 and 23 − 3 × 2 = 17."*

Summary points:
- Find how much the sequence goes up or down each time.
- Start with that times table: goes up by 4 → 4n, goes down by 3 → −3n.
- Work out what to add or take away to match the terms.
- Check the first two terms. One isn't enough.
- Then use your rule to jump to any term, like the 100th.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly changes the
picture and keeps focus while dragged. The two-row table lines up column
by column and doesn't overflow at 375 px (it can shrink, but the arrows
must stay readable and not overlap the numbers). No working appears on a
card before the pupil answers it. Four options on every choice, each wrong
one with its own feedback that fits that choice, and the right one with
feedback that isn't just its label again. Rules are written `4n − 3`, not
`4n + −3`, and down rules as `12 − 2n`. Every method a question uses is
taught in Learn. Typed answers accept `-2` and `−2`. Reload, Back and
Practise again work. The `dist/` lesson's last button reaches the
homepage.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests, does the browser review at
  desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (e.g. `finding-nth-term.js`)
  exposes one object on `window` (e.g. `window.FindingNthTerm`) with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    steps, displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - `term(rule, n)`: works out a rule's nth term
  - `ruleText(rule)`: writes a rule the lesson's way (`4n − 3`, `12 − 2n`,
    `4n`)

  Every card config also carries its rule as data, `rule: { d, c }`
  meaning d·n + c (so `4n − 3` is `{ d: 4, c: −3 }` and `12 − 2n` is
  `{ d: −2, c: 12 }`; for dot patterns `{ d: r, c: f }`), and
  `terms` (the terms shown). Cards that ask for a term carry `position`.
  Cards that ask for part of a rule carry `asked: 'jump' | 'adjust' |
  'rule'`. Card configs use the shared card fields (`input`, `prompt`,
  `options` with `label`/`correct`/`feedback`, `answer`, `fields`,
  `rules`, `fallback`, `feedback`, `questionType`).
- **Commit** (one commit): the lesson folder, this spec file (copy it from
  the main checkout's `docs/`), and the rebuilt `dist/`. Message: "Add
  finding the nth term lesson". Push the branch. Never open a PR or merge
  until a signed Claude message says Umar approved.

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

- **Removed the exam board.** The draft named AQA and its code A25; the
  site never names exam boards.
- **Learn asks nothing.** The draft had the pupil type the "+1" in Learn.
  Now a slider draws the "+1" arrows (ground rules 2–3).
- **Plain words.** "Common difference", "linear sequence" and "arithmetic
  sequence" are gone (rule 7). The lesson says "goes up by 4 each time",
  "difference" (explained once) and "the 4 times table".
- **Down rules are written 17 − 3n**, not −3n + 17, as pupils see them in
  exams. The −3n row stays in the picture to show where it comes from.
- **Added "Always check your rule"** (Learn 6) with Amir's mistake, so
  Check 1 and 2 test something Learn taught.
- **Typed answers are numbers, not rules.** The engine can't mark a typed
  rule like "4n + 1", so typed cards ask for the jump, the number to add,
  the number in a box, or a term found with the rule. Rules themselves
  are four-option choices.
- **Linked to the last lesson.** Try it 4 and 6, Check 4 and the
  `find-then-use` type find a rule and then use it to jump to the 20th,
  50th or 100th term.
- **Every choice has four options** with feedback for each wrong one.
- **Practice is a generator**, mixing choice and typed (rules 6 and 7).
  The draft's eight fixed sequences became `rule-up`, `rule-down`,
  `adjust` and `find-then-use`. Bank cards 02, 03 and 12 became
  `rule-up`, `rule-down` and `pattern-dots`.
- **"Explain" questions are now choices.** Amir's and Beth's questions
  can't be marked as free text, so each is a "who's right?" choice with
  the explanation in the options. "Find and check your own rule" became
  typed boxes (Check 3–5).
- **Removed the boxed formulas and the button notes** ("Check answer",
  "Try again", "Continue"): the engine owns the button and feedback.
- **Bank cards not used here:** `-04` (a rule from the 3rd and 7th
  terms) needs dividing a gap across several steps, which is beyond this
  lesson. `-05`, `-06`, `-07`, `-08`, `-10` and `-11` work backwards from
  a term to its position (solving an equation): a later lesson.
- I checked every number in the draft: all rules and answers are right.
