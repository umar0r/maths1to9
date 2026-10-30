# Scaling a ratio: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: using a ratio and one known amount to
find the other amounts (find what one part is worth, then multiply every
part). It works for two-part and three-part ratios, and the known amount
can be any part.

It is the second of a pair. It comes straight after `ratio-basics`
(`docs/ratio-basics-lesson.md`) and uses the same bar of blocks, so the
two lessons feel like one. Sharing a total in a ratio (£40 in 3 : 5) is
`sharing-in-a-ratio`, the next lesson.

Umar's draft ("Ratio: simplify and scale", 2026-10-30) is the source,
split in two and rewritten to the ground rules. It uses cards from the
local question bank (`docs/exam-bank/bank/ratio-problems.json`, cards 01
and 03, and `proportion-and-unitary-method.json` card 02). See "Changes
from the draft" at the end.

## Before you start

- **Only start this once `ratio-basics` is merged into `main`.** If it
  isn't, stop and say so.
- `git fetch origin`. Make `codex/scaling-a-ratio` from **`origin/main`**
  in its own worktree, e.g. `.worktrees/scaling-a-ratio`. Symlink the main
  checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lesson:** `content/ratio-basics/`. Copy its bar, its
  colours, its sliders, its typed `fields` cards and its look.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- **New lesson** in `curriculum.json`, straight after `ratio-basics`:
  `{"folder":"scaling-a-ratio","title":"Scaling a ratio","subtitle":"Find what one part is worth. Then multiply every part.","skills":["ratio-missing-amounts"]}`
- The skill `ratio-missing-amounts` already exists (it's also on the
  `ratio-problems` placeholder). Don't add a new skill.
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- As in `ratio-basics`: ratios as `5 : 3` on one line, things named in
  the ratio's order, displayed working with `÷` and `×` and no full stop.
- Say "one part is worth …" and "multiply every part". Don't say
  "multiplier", "unitary", "proportion", "scale factor" or "quantity".
- Units always shown: `12 ml`, `5 kg`, `£48`.
- No calculator is needed. Don't mention one.

## The bar

The same drawing as `ratio-basics`: one row of equal blocks per thing,
named on the left, each thing in its own colour on every screen (a third
colour for three-part ratios). Blocks not yet worked out show `?`. When
one part's value is found, the known row fills first, then the other
rows, with a short animation (none for `prefers-reduced-motion`). Each
row shows its total at the end, e.g. "= 36 ml". Fits at 375 px with no
sideways scroll and no overlapping labels.

## Learn (5 screens, all teaching, no questions)

Each screen has one bar that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
bar and keeps focus while dragged. Each slider screen starts on the value
given.

1. **A part can be any size.** blue : red = 5 : 3. Slider "Each part is
   worth: 1 ml to 12 ml" (starts on 4 ml). Every block shows its value.
   The totals show `5 × 4 = 20` ml of blue and `3 × 4 = 12` ml of red,
   and a line "20 : 12 is still 5 : 3, so it's the same shade." Text: "A
   ratio counts parts. A part can be any size. If every part is the same
   size, the mix stays the same."
2. **Find one part, then multiply.** "You have 60 ml of blue. How much
   red keeps the same shade?" Slider "Show the steps: 1 to 4" (starts on
   1).
   1. Blue row of 5 `?` blocks with "= 60 ml"; red row of 3 `?` blocks.
   2. "Blue is 5 parts. 1 part = `60 ÷ 5 = 12` ml." Blue blocks fill
      with 12.
   3. Red blocks fill with 12: "Red is 3 parts: `3 × 12 = 36` ml."
   4. "Check: `60 ÷ 12 = 5` and `36 ÷ 12 = 3`. Back to 5 : 3 ✓"

   Text: "Find what one part is worth. Then multiply every part by it.
   Check by dividing back."
3. **Match the amount to its part.** red roses : white roses = 4 : 7.
   There are 21 white roses. Slider "Show the steps: 1 to 3" (starts on
   1).
   1. Red row of 4 `?`; white row of 7 `?` with "= 21 roses".
   2. "White is 7 parts. 1 part = `21 ÷ 7 = 3` roses." White fills.
   3. Red fills: "Red is 4 parts: `4 × 3 = 12` roses."

   Text: "The amount you know might be the second thing. Divide by the
   number of parts for that thing." Callout: "Don't work out 21 ÷ 4. The
   21 roses are white, and white is 7 parts."
4. **Three parts work the same way.** nuts : raisins : seeds = 2 : 3 : 1.
   There are 12 g of raisins. Slider "Show the steps: 1 to 3" (starts on
   1).
   1. Three rows of `?`, raisins showing "= 12 g".
   2. "Raisins are 3 parts. 1 part = `12 ÷ 3 = 4` g." Raisins fill.
   3. Nuts and seeds fill: "Nuts: `2 × 4 = 8` g. Seeds: `1 × 4 = 4` g."

   Text: "However many parts there are, use the same value for every
   part."
5. **Don't multiply by the amount.** cement : sand : gravel = 1 : 2 : 4.
   A builder uses 6 kg of sand. Slider "Show: Sam's way, the right way"
   (two stops, starts on Sam's way).
   - Sam's way: every block is 6 kg. Totals 6 kg, 12 kg, 24 kg. The sand
     row is marked ✗: "Sand would be 12 kg, but it's 6 kg."
   - The right way: "Sand is 2 parts. 1 part = `6 ÷ 2 = 3` kg." Totals
     3 kg, 6 kg, 12 kg. The sand row is marked ✓.

   Text: "6 kg is the amount for 2 parts, not for 1. Always find one part
   first."

## Card fields used in this lesson

- Typed amounts use `input: 'number'` with `unit` where it helps (e.g.
  `kg`), and an `inputLabel` that names the thing (e.g. "Cups of water").
- The last Try it card and Check 5 ask for two amounts at once with two
  `fields`, `fractions: true`, as in `ratio-basics`.
- Every rule value must differ from the answer and from every other rule
  on that card.

## Try it (8 cards: 3 choice, 5 typed)

Four short rounds, each giving a little less help. Each round starts with
the ratio and the known amount in the prompt. The right feedback on each
round's last card includes the check by dividing back.

**Round 1: juice : water = 2 : 5. There are 6 cups of juice.**

1. Choice: "Which part is the 6 cups?" ✓ "Juice: 2 parts" / "Water: 5
   parts" (*"The 6 cups are juice. Juice is 2 parts."*) / "All 7 parts"
   (*"6 cups is only the juice, not the whole drink."*) / "1 part" (*"6
   cups is all the juice. Juice is 2 parts."*). Right: *"The 6 cups are
   juice, and juice is 2 parts."*
2. Choice: "Juice is 2 parts = 6 cups. What is 1 part worth?" 3 cups ✓ /
   12 cups (*"That's 6 × 2. Divide to share 6 cups between 2 parts."*) /
   4 cups (*"That's 6 − 2. Divide: 6 ÷ 2."*) / 8 cups (*"That's 6 + 2.
   Divide: 6 ÷ 2."*). Right: *"6 ÷ 2 = 3 cups"*
3. Typed, inputLabel "Cups of water": "Water is 5 parts. 1 part is 3 cups.
   How many cups of water?" Answer 15. Rules: 30 → *"That's 5 × 6.
   Multiply by one part, 3 cups."*; 21 → *"That's juice and water
   together. Just the water: 5 × 3."*; 8 → *"Multiply, don't add:
   5 × 3."* Right: *"5 × 3 = 15 cups. Check: 6 ÷ 3 = 2 and 15 ÷ 3 = 5.
   Back to 2 : 5 ✓"*

**Round 2: flour : sugar = 3 : 2. There are 12 spoons of flour.**

4. Choice: "What is 1 part worth?" 4 spoons ✓ / 36 spoons (*"That's
   12 × 3. Divide: 12 ÷ 3."*) / 6 spoons (*"That's 12 ÷ 2. The 12 spoons
   are flour, and flour is 3 parts."*) / 9 spoons (*"That's 12 − 3.
   Divide: 12 ÷ 3."*). Right: *"Flour is 3 parts. 12 ÷ 3 = 4 spoons"*
5. Typed, inputLabel "Spoons of sugar": "How many spoons of sugar?"
   Answer 8. Rules: 24 → *"That's 2 × 12. Multiply by one part, 4."*;
   20 → *"That's flour and sugar together. Just the sugar: 2 × 4."*;
   11 → *"Taking away 1 keeps the gap, not the ratio. Find one part:
   12 ÷ 3 = 4."* Right: *"2 × 4 = 8 spoons. Check: 12 ÷ 4 = 3 and
   8 ÷ 4 = 2. Back to 3 : 2 ✓"*

**Round 3: red roses : white roses = 4 : 7. There are 21 white roses.**

6. Typed, inputLabel "Roses in 1 part": "What is 1 part worth?" Answer 3.
   Rules: 5.25 → *"That's 21 ÷ 4. The 21 roses are white, and white is 7
   parts."*; 147 → *"That's 21 × 7. Divide: 21 ÷ 7."*; 14 → *"That's
   21 − 7. Divide: 21 ÷ 7."* Right: *"White is 7 parts. 21 ÷ 7 = 3
   roses"*
7. Typed, inputLabel "Red roses": "How many red roses?" Answer 12.
   Rules: 84 → *"That's 4 × 21. Multiply by one part, 3."*; 33 →
   *"That's all the roses. Just the red: 4 × 3."*; 21 → *"21 is the white
   roses. Red is 4 parts of 3."*; 18 → *"Taking away 3 keeps the gap, not
   the ratio. Red is 4 × 3."* Right: *"4 × 3 = 12 roses. Check: 12 ÷ 3 =
   4 and 21 ÷ 3 = 7. Back to 4 : 7 ✓"*

**Round 4: cement : sand : gravel = 1 : 2 : 4. There are 10 kg of sand.**

8. Typed, two fields "Cement (kg)" and "Gravel (kg)": "How much cement
   and how much gravel?" Answer 5, 20. Rules: {10, 40} → *"You multiplied
   by 10. But 10 kg is 2 parts. 1 part = 10 ÷ 2 = 5 kg."*; {5, 40} →
   *"Cement is right. Gravel is 4 parts: 4 × 5."*; {20, 80} → *"Divide to
   find one part: 10 ÷ 2 = 5 kg."* Fallback: *"Sand is 2 parts = 10 kg.
   So 1 part = 10 ÷ 2 = 5 kg."* Right: *"1 part = 5 kg. Cement 1 × 5 = 5
   kg. Gravel 4 × 5 = 20 kg. Check: 5 ÷ 5 = 1, 10 ÷ 5 = 2 and 20 ÷ 5 = 4.
   Back to 1 : 2 : 4 ✓"*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`ratio-missing-amounts`. Each choice has four different options shuffled
with the seeded `random`. Every right answer gets its own feedback with
the working. Test the generator with 32-bit seeds, not small ones.

**Numbers.** Two-part ratio p : q: whole numbers from 1 to 9, p ≠ q, no
common factor except 1. Three-part ratio: three whole numbers from 1 to
6, not all the same, with no common factor except 1. One part's value u
from 2 to 12. The known thing is any part, picked with the seeded
`random`; call its number of parts n and its amount K = n × u. The asked
thing has m parts. If any two options or rules on a card match, or a rule
value isn't a whole number or a one-decimal number, drop it; if fewer
than two rules are left, redraw.

**Contexts** (pick one with the seeded `random`; keep the order and the
units): blue paint : red paint (ml), juice : water (cups), flour : sugar
(g), red roses : white roses, cement : sand (kg); three-part: cement :
sand : gravel (kg), nuts : raisins : seeds (g), red : blue : green beads.

| Type | Card | Builds |
|---|---|---|
| `two-part-typed` | typed | "juice : water = p : q. There are K cups of juice. How many cups of water?" Answer m × u. Rules: m × K (*"That multiplies by K. Find one part first: K ÷ n."*), K ÷ m × n (*"That divides by the wrong part. K is the …, which is n parts."*), K + m × u (*"That's both together."*). |
| `three-part-typed` | typed | A three-part context. One amount given, another asked. Answer m × u. Rules: m × K, K ÷ m × n, as above. |
| `find-one-part` | typed | Any context. "What is 1 part worth?" Answer u. Rules: K × n (*"Divide, don't multiply: K ÷ n."*), K − n (*"Divide, don't take away."*), K ÷ (the other thing's parts) (*"Divide by the parts for the thing you know."*). |
| `one-part-choice` | choice | "There are K … . What is 1 part worth?" Options: u ✓, K × n, K − n, K + n, each with the feedback above. Redraw on a clash (e.g. n = 2, u = 2). |
| `which-calc` | choice | From bank `proportion-and-unitary-method-02`. "Which calculation gives the …?" Options: `K ÷ n × m` ✓, `K × m` (*"That multiplies by the whole amount. Find one part first."*), `K ÷ m × n` (*"That divides by the wrong part."*), `K ÷ (n + m) × m` (*"K is only one thing, not the total. Divide by its own parts, n."*). Two-part ratios only. |
| `amount-choice` | choice | A two-part context. "How many …?" Options: m × u ✓, m × K (*"Find one part first: K ÷ n."*), K + (m − n) (*"Adding keeps the gap, not the ratio. Multiply instead."*), K + m × u (*"That's both together."*). |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Typed, inputLabel "Litres of water" (bank `ratio-problems-01`):
   "Squash and water are mixed in the ratio 2 : 9. How many litres of
   water are needed for 6 litres of squash?" Answer 27. Rules: 54 →
   *"That's 9 × 6. Find one part first: 6 ÷ 2 = 3."*; 33 → *"That's
   squash and water together. Just the water: 9 × 3."*; 13 → *"Adding
   keeps the gap, not the ratio. 1 part = 6 ÷ 2 = 3."* Right: *"1 part =
   6 ÷ 2 = 3 litres. Water = 9 × 3 = 27 litres"*
2. Choice: "cement : sand : gravel = 1 : 2 : 4. A builder uses 6 kg of
   sand. Sam says the gravel is 4 × 6 = 24 kg. What has Sam done wrong?"
   ✓ *"6 kg is 2 parts, not 1. 1 part is 3 kg, so the gravel is 12
   kg."* (*"Right. Find one part first."*) / *"Nothing. Gravel is 4
   parts, so 4 × 6 = 24 kg."* (*"Then sand would be 2 × 6 = 12 kg. But
   it's 6 kg."*) / *"He should add: 6 + 4 = 10 kg."* (*"Adding doesn't
   keep the ratio. Find one part, then multiply."*) / *"He should divide:
   6 ÷ 4 = 1.5 kg."* (*"Gravel is the biggest part, so it must be more
   than the sand."*)
3. Typed, inputLabel "Cara's money (£)" (bank `ratio-problems-03`): "Ali, Ben and Cara get
   prize money in the ratio 3 : 5 : 6. Ben gets £40. How much does Cara
   get?" Answer 48. Rules: 240 → *"That's 6 × 40. Find one part first:
   40 ÷ 5 = 8."*; 80 → *"That divides by Ali's 3. Ben gets £40, and Ben
   is 5 parts."*; 41 → *"Adding keeps the gap, not the ratio. 1 part =
   40 ÷ 5 = £8."* Right: *"1 part = 40 ÷ 5 = £8. Cara gets 6 × 8 =
   £48"*
4. Choice: "blue : yellow = 3 : 4 makes a green paint. Jo has 9 tins of
   blue. How many tins of yellow does Jo need?" 12 ✓ (*"1 part = 9 ÷ 3 =
   3 tins. Yellow = 4 × 3 = 12"*) / 10 (*"That adds 1, the gap between 3
   and 4. Multiply instead: 1 part = 3 tins."*) / 36 (*"That's 4 × 9.
   Find one part first: 9 ÷ 3."*) / 21 (*"That's blue and yellow
   together."*)
5. Typed, two fields "Butter (g)" and "Sugar (g)": "flour : butter :
   sugar = 5 : 2 : 1. Mia uses 150 g of flour. How much butter and how
   much sugar does she need?" Answer 60, 30. Rules: {300, 150} → *"You
   multiplied by 150. But 150 g is 5 parts. 1 part = 150 ÷ 5 = 30 g."*;
   {60, 150} → *"Butter is right. Sugar is 1 part: 30 g."* Right: *"1
   part = 150 ÷ 5 = 30 g. Butter 2 × 30 = 60 g. Sugar 1 × 30 = 30 g"*

Summary points:
- Match the amount you know to its part.
- Divide to find what one part is worth.
- Multiply every part by that value.
- Check: divide your answers by one part to get back to the ratio.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen shows the bar before anything else. Every slider
visibly changes the bar, shows which stop it's on, and keeps focus while
dragged. `?` blocks fill in the right order. Three-part bars fit at 375 px
with labels that don't overlap. Each thing keeps its colour. Four options
on every choice, each wrong one with its own feedback, and the right one
with feedback that isn't just its label again. Every method a question
uses is taught in Learn. Reload, Back and Practise again work. The
`dist/` lesson's last button reaches the homepage, and the homepage shows
"Scaling a ratio" after "Understanding and simplifying ratio".

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (`scaling.js`) exposes one
  object, `window.ScalingRatio`, with `learnScreens`, `examples()`,
  `practiceTypes`, `pick(random)`, `generate(item, random)`, `checks()`
  and `scale(ratio, knownIndex, knownAmount)` (returns every amount as an
  array). Every card config also carries `ratio` (e.g. `[1, 2, 4]`),
  `known` (`{ index, amount }`) and `asked`: `'match'`, `'one-part'`,
  `'amount'`, `'working'` or `'mistake'`.
- **Commit** (one commit): the lesson folder, the `curriculum.json`
  change, this spec file (copy it from the main checkout's `docs/`), and
  the rebuilt `dist/`. Message: "Add scaling a ratio lesson". Push the
  branch. Never open a PR or merge until Umar approves in your chat.

## Report, then wait

Post one relay reply with: the commit hash; anything a test needs that
isn't obvious; anything you changed from this spec and why; anything you
couldn't do. Then run the wait loop **in the foreground** and stay in your
turn until it prints Claude's next message:

```sh
while :; do
  relay/wait.sh codex
  status=$?
  if [ "$status" -ne 2 ]; then break; fi
done
```

## Changes from the draft

- **Split from `ratio-basics`** (Umar's choice, 2026-10-30), so each
  lesson has one job.
- **The four Try it rounds are kept**, as short runs of cards that give
  less help each time. The engine has no steps bar or hint ladder, so the
  steps are separate cards, and the two hints in round 4 became one
  fallback shown after a wrong answer.
- **Learn asks nothing.** The draft's micro-checks moved to Try it.
- **Every choice has four options.** The draft's checks had three; the
  "1 part" choice now has the draft's three wrong values (× , −, +).
- **Worked example 3** (6 kg of sand) became Learn 5, showing the mistake
  next to the right way, and Check 2.
- **Added the "adding keeps the gap" mistake** (adding the same amount
  to each part instead of multiplying), which pupils make often, to rules
  and choices.
- **Uses the existing skill** `ratio-missing-amounts` rather than a new
  one.
- I checked every number: all answers are right.
