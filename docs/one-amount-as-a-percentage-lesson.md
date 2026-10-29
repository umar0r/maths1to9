# One amount as a percentage of another: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: writing one amount as a percentage of
another (A ÷ B × 100), including deciding which amount is 100%, totals
you have to add up first, and answers over 100%. It comes straight after
"Percentages of amounts". The old `docs/percentages-lesson.md` left this
out on purpose, as a later lesson.

Umar's draft (from ChatGPT, 2026-10-29) is the source. It has been
rewritten to the ground rules, and it uses three cards from the local
question bank (`docs/exam-bank/bank/`): `percentages-of-amounts-04`,
`convert-a-fraction-to-a-percentage-08` and `percentage-change-12`. See
"Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/one-amount-as-a-percentage` from
  **`origin/main`**, in its own worktree, e.g.
  `.worktrees/one-amount-as-a-percentage`. Symlink the main checkout's
  `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lessons:** `content/fibonacci-sequences/` and
  `content/finding-the-nth-term/` (Learn sliders that change a picture,
  helper `.js` on `window`, the Practice generator, retained Check).
  Copy their patterns and look.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- **New skill** in `skills.json`, straight after `percentage-of-amount`:
  `{"id":"express-as-percentage","title":"Express one amount as a percentage of another","content_references":["R9"],"recommended_prerequisites":["fraction-percentage-conversion"]}`
- **New lesson** in `curriculum.json`, straight after
  `percentages-of-amounts`:
  `{"folder":"one-amount-as-a-percentage","title":"One amount as a percentage of another","subtitle":"Divide by the amount that is 100%, then multiply by 100.","skills":["express-as-percentage"]}`
- **Collections:** in `fractions-decimals-and-percentages`, add
  `"one-amount-as-a-percentage"` straight after `"percentages-of-amounts"`.
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Say "the whole" and "the amount that is 100%". Don't say
  "quantity", "proportion" or "express" except in the exact question
  phrase "Express … as a percentage of …", which exams use.
- Displayed working uses `÷` and `×` and has no full stop:
  `18 ÷ 30 × 100 = 60`. Write money as `£20`. Percentages as `60%`, with
  no space.
- Answers are whole numbers or have one decimal place (`22.5`). Never
  show a rounded or recurring answer as right.
- Every typed card uses `inputLabel: 'Percentage (no % sign)'`, because
  the engine rejects a typed `%`. Prompts don't repeat this.
- A calculator is allowed. Say so once, on Learn 1.

## Learn (5 screens, all teaching, no questions)

Each screen has one picture that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
picture and keeps focus while dragged (don't rebuild the whole screen).
Each slider screen starts on the value given.

The main picture is a **bar of equal blocks**: the full bar is the
whole, shaded blocks are the part. A label above the full bar reads
"30 marks = 100%" and a label above the shaded part reads "18 marks".
Blocks wrap or shrink to fit at 375 px; they never scroll sideways.

1. **How much of the whole?** A bar of 30 blocks. Slider "Marks scored:
   0 to 30" (starts on 18) shades that many blocks and updates "18 out of
   30". Text: "You score 18 marks on a test out of 30. Is that good? To
   compare, we use a percentage. The whole test, all 30 marks, is 100%.
   You can use a calculator in this lesson."
2. **Turn it into a percentage.** The same bar, with a 0% to 100% scale
   under it. Slider "Marks scored: 0 to 30 in steps of 3" (starts on 18)
   shades the blocks, moves a marker on the scale, and shows the working
   `18 ÷ 30 = 0.6` and `0.6 × 100 = 60`, then "18 out of 30 is 60%".
   Text: "You already know how to turn a fraction into a percentage.
   Divide the top by the bottom, then multiply by 100."
3. **Divide by the whole.** A bar of 10 blocks labelled "£50 = 100%",
   each block £5. Slider "Money spent: £0 to £50 in £5 steps" (starts on
   £20) shades blocks and shows `20 ÷ 50 × 100 = 40`, then "£20 is 40%
   of £50". Text: "To find A as a percentage of B, work out
   **A ÷ B × 100**. B is the whole: the amount that is 100%." Callout:
   "Don't divide the other way. 50 ÷ 20 × 100 = 250%. That can't be
   right: £20 is less than £50, so the answer must be under 100%.
   Answers can have decimals too, like 22.5%."
4. **More than 100%.** Two bars on the same scale: "Last year: 20
   members = 100%" (20 blocks) and "This year" underneath. Slider
   "Members this year: 10 to 30" (starts on 25) sets this year's bar and
   shows `25 ÷ 20 × 100 = 125`, then "This year is 125% of last year".
   A line under the working changes with the slider: "Fewer than 20, so
   less than 100%." / "Exactly 20, so 100%." / "More than 20, so more
   than 100%." Text: "We compare with last year, so last year's 20 is
   100%. More than the whole gives more than 100%."
5. **Find the whole first.** From bank card
   `convert-a-fraction-to-a-percentage-08`. A shop has 84 insulated
   bottles and 36 plain ones. Slider "Show the steps: 1 to 3" (starts on
   1). 1: two separate bars, 84 and 36. 2: they join into one bar
   labelled "84 + 36 = 120 bottles = 100%". 3: the working
   `84 ÷ 120 × 100 = 70`, then "70% of the bottles are insulated". Text:
   "Sometimes the question doesn't give the whole. Add up the groups to
   find it first." Callout: "Don't divide by the other group:
   84 ÷ 36 × 100 is wrong."

## Try it (9 cards: 4 choice, 5 typed)

1. Choice: "There are 40 seats on a bus. 9 seats are empty. Which number
   is 100%?" 40 ✓ / 9 (*"9 is the empty seats. That's the part. The
   whole is all 40 seats."*) / 31 (*"31 seats are full. The whole is all
   40 seats."*) / 100 (*"100% is the whole. Here the whole is 40
   seats."*). Right: *"All 40 seats is the whole, so 40 is 100%."*
2. Typed: same bus. "What percentage of the seats are empty?" 22.5.
   Rules: 0.225 → *"That's 9 ÷ 40. Now multiply by 100."*; 77.5 →
   *"That's the full seats. 9 seats are empty: 9 ÷ 40 × 100."*; 9 →
   *"9 is a number of seats. Divide by 40, then multiply by 100."* Right:
   *"9 ÷ 40 × 100 = 22.5. That's just under a quarter, so it makes
   sense."*
3. Choice: "Aisha has £28. She spends £21 on a book. Which working finds
   the percentage of her money she spends?" `21 ÷ 28 × 100` ✓ /
   `28 ÷ 21 × 100` (*"That divides by what she spent. Divide by all her
   money, £28."*) / `21 ÷ 100 × 28` (*"That finds 21% of £28. Divide 21
   by 28 first."*) / `7 ÷ 28 × 100` (*"£7 is what she has left. She
   spends £21."*). Right: *"All her money, £28, is 100%. So it's
   21 ÷ 28 × 100."*
4. Typed: same. "What percentage of her money does she spend?" 75.
   Rules: 25 → *"That's the part she keeps. She spends £21."*; 0.75 →
   *"That's 21 ÷ 28. Now multiply by 100."*; 21 → *"21 is pounds, not a
   percentage. Work out 21 ÷ 28 × 100."* Right: *"21 ÷ 28 × 100 = 75"*
5. Choice: "A group planned to walk 12 km. It walked 15 km. Express the
   distance walked as a percentage of the planned distance. Which
   distance is 100%?" 12 km ✓ / 15 km (*"15 km is what they walked. We
   compare it with the plan, so the plan is 100%."*) / 3 km (*"3 km is
   the extra. The whole plan, 12 km, is 100%."*) / 27 km (*"Don't add
   them. The plan, 12 km, is 100%."*). Right: *"It says 'of the planned
   distance', so the plan, 12 km, is 100%."*
6. Typed: same. "What percentage of the planned distance did they
   walk?" 125. Rules: 80 → *"That's 12 ÷ 15. Divide by the plan:
   15 ÷ 12 × 100."*; 25 → *"That's only the extra 3 km. Use all 15
   km."*; 1.25 → *"That's 15 ÷ 12. Now multiply by 100."* Right:
   *"15 ÷ 12 × 100 = 125. They walked more than planned, so it's over
   100%."*
7. Choice (bank `percentages-of-amounts-04`): "A group plants 80 trees.
   28 are fruit trees. What percentage are fruit trees?" 35% ✓ / 28%
   (*"28 is a number of trees. Compare it with all 80."*) / 0.35%
   (*"0.35 is 28 ÷ 80. Multiply by 100 to get the percentage."*) / 65%
   (*"That's the trees that aren't fruit trees."*). Right:
   *"28 ÷ 80 × 100 = 35"*
8. Typed (bank `convert-a-fraction-to-a-percentage-08`, as in Learn 5,
   new numbers): "A shop has 45 red pens and 15 blue pens. What
   percentage of the pens are red?" 75. Rules: 25 → *"That's the blue
   pens."*; 300 → *"That divides by the blue pens. The whole is all
   45 + 15 = 60 pens."*; 45 → *"45 is a number of pens. Work out
   45 ÷ 60 × 100."* Right: *"45 + 15 = 60 pens. 45 ÷ 60 × 100 = 75"*
9. Typed: "A team wins all 20 of its 20 matches. What percentage of its
   matches does it win?" 100. Rules: 20 → *"20 is a number of matches.
   Work out 20 ÷ 20 × 100."*; 1 → *"20 ÷ 20 = 1. Now multiply by 100."*;
   0 → *"They won every match. All of them is 100%."* Right:
   *"20 ÷ 20 × 100 = 100. All of something is 100%."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`express-as-percentage`. Each choice has four different options shuffled
with the seeded `random`. Every rule value must differ from the answer
and from every other rule; drop one that clashes, and keep at least two.
Every right answer gets its own feedback with the working.

**Numbers.** Pick the whole W from 20, 24, 25, 30, 40, 45, 50, 60, 75,
80, 120, 200. Pick the part P (1 to W − 1) so that P ÷ W × 100 is a
whole number or has one decimal place, and isn't 50. A rule value with
more than three decimal places (like 444.44…) is dropped. If fewer than
two rules are left, redraw the numbers.
Test the generator with 32-bit seeds, not small ones.

**Contexts** (pick one with the seeded `random`; keep units right):
marks on a test, seats on a bus, apples in a crate (some green), pupils
in a class (some go by bus), money (£W, spends £P).

| Type | Card | Builds |
|---|---|---|
| `part-of-whole` | typed | Half the time a context ("A class has 45 pupils. 27 go to school by bus. What percentage go by bus?"), half the time bare: "Express P as a percentage of W." Answer P ÷ W × 100. Rules: P ÷ W (*"Now multiply by 100."*), 100 − answer (*"That's the other part."*), W ÷ P × 100 (*"That divides the wrong way. Divide by W, the whole."*), P (*"P is the amount, not the percentage."*). |
| `find-the-whole` | typed | From bank `convert-a-fraction-to-a-percentage-08`. Two groups that add up to W, both named ("A shop has 84 insulated bottles and 36 plain ones. What percentage are insulated?"). Answer P ÷ W × 100. Rules: 100 − answer (*"That's the other group."*), P ÷ (W − P) × 100 (*"That divides by the other group. Add them to find the whole."*), P (*"That's a count, not a percentage."*). |
| `more-than-100` | typed | The whole B from 8, 10, 12, 16, 20, 24, 25, 40, 50, and A from B + 1 to 2B, so A ÷ B × 100 has at most one decimal place. Contexts: tickets planned and sold, km planned and walked, members last year and this year. "Express the number sold as a percentage of the number planned." Answer A ÷ B × 100. Rules: B ÷ A × 100 (*"That divides by A. The plan, B, is 100%."*), (A − B) ÷ B × 100 (*"That's only the extra. Use all of A."*), A ÷ B (*"Now multiply by 100."*). |
| `which-is-100` | choice | A context with P and W. "Which number is 100%?" Right: W. Wrong: P (*"That's the part."*), W − P (*"That's the rest, not the whole."*), 100 (*"100% is the whole. Here the whole is W."*). Redraw if any two options match. |
| `which-working` | choice | A context with P and W. "Which working finds the percentage?" Right: `P ÷ W × 100`. Wrong: `W ÷ P × 100` (*"That divides the wrong way. Divide by the whole."*), `P ÷ 100 × W` (*"That finds P% of W."*), `(W − P) ÷ W × 100` written with the number, e.g. `18 ÷ 45 × 100` (*"That uses the rest, not the part asked about."*). |
| `percent-choice` | choice | From bank `percentages-of-amounts-04`. A context. "What percentage …?" Options: answer% ✓, (answer ÷ 100)% (*"That's P ÷ W. Multiply by 100."*), (100 − answer)% (*"That's the other part."*), P% (*"P is a count. Compare it with W."*). Redraw if P equals the answer or 100 − the answer. |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice: "A coat costs £15. Mia has £60. To find what percentage of her
   money the coat costs, Mia writes 60 ÷ 15 × 100 = 400%. What has she
   done wrong?" ✓ *"She divided the wrong way. Her £60 is 100%, so it's
   15 ÷ 60 × 100."* (*"Right. Divide by the whole."*) / *"Nothing. The
   coat is 400% of her money."* (*"The coat costs less than she has, so
   the answer must be under 100%."*) / *"She should add: 15 + 60 = 75%."*
   (*"Adding doesn't give a percentage. Divide by the whole, £60."*) /
   *"She should take away: 60 − 15 = 45%."* (*"£45 is the money left,
   not a percentage."*)
2. Typed: same. "What percentage of her money does the coat cost?" 25.
   Rules: 400 → *"That's Mia's mistake. Divide by £60: 15 ÷ 60 × 100."*;
   0.25 → *"That's 15 ÷ 60. Now multiply by 100."*; 75 → *"That's the
   money she has left."* Right: *"15 ÷ 60 × 100 = 25"*
3. Typed: "Leo scores 12 out of 30 in one quiz and 12 out of 60 in
   another. What percentage did he get in the quiz out of 60?" 20.
   Rules: 40 → *"That's the quiz out of 30. This one is out of 60."*;
   12 → *"12 is his marks. Work out 12 ÷ 60 × 100."*; 500 → *"That
   divides the wrong way. Divide by 60."* Right: *"12 ÷ 60 × 100 = 20.
   The same 12 marks is a smaller part of 60 than of 30."*
4. Choice: "A team aimed to score 20 goals. It scored 24. Ben says it
   can't be 120% of the target, because percentages stop at 100%. Is Ben
   right?" ✓ *"No. The target, 20, is 100%. They scored more, so
   24 ÷ 20 × 100 = 120%."* (*"Right. More than the whole is more than
   100%."*) / *"Yes. You can't go over 100%."* (*"You can when you beat a
   target. More than the whole is more than 100%."*) / *"No. It's
   20 ÷ 24 × 100 = 83.3%."* (*"That divides by 24. The target, 20, is
   100%."*) / *"No. It's 24 − 20 = 4, so 4%."* (*"4 is the number of
   extra goals, not a percentage."*)
5. Typed (bank `percentage-change-12`): "A repair shop fixes 42 of 120
   phones in one day. What percentage does it fix?" 35. Rules: 0.35 →
   *"That's 42 ÷ 120. Now multiply by 100."*; 65 → *"That's the phones
   not fixed."*; 42 → *"42 is a number of phones. Work out
   42 ÷ 120 × 100."* Right: *"42 ÷ 120 × 100 = 35"*

Summary points:
- The whole is 100%.
- To find A as a percentage of B, work out A ÷ B × 100.
- Divide by the whole, the amount that is 100%. Add up groups to find it
  if you need to.
- More than the whole gives more than 100%.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly changes the
bar and keeps focus while dragged. Bars of up to 30 blocks, and the two
bars on screen 4, fit at 375 px with labels that don't overlap. Four
options on every choice, each wrong one with its own feedback that fits
that choice, and the right one with feedback that isn't just its label
again. Every method a question uses is taught in Learn. Typed answers
accept `22.5`. Reload, Back and Practise again work. The `dist/` lesson's
last button reaches the homepage, and the homepage shows "One amount as
a percentage of another" after "Percentages of amounts".

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests, does the browser review at
  desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (`percentage-of.js`) exposes
  one object, `window.PercentageOf`, with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - `percent(part, whole)`: part ÷ whole × 100

  Every card config also carries `part` and `whole` (the numbers the
  question is about, with `whole` being the amount that is 100%) and
  `asked`: `'percent'` (the answer is the percentage), `'whole'` (the
  answer is the whole), `'working'` (the answer is the working) or
  `'mistake'` (Check 1 and 4). Card configs use the shared card fields
  (`input`, `prompt`, `options` with `label`/`correct`/`feedback`,
  `answer`, `rules`, `fallback`, `feedback`, `inputLabel`,
  `questionType`).
- **Commit** (one commit): the lesson folder, the `skills.json`,
  `curriculum.json` and `collections.json` changes, this spec file (copy
  it from the main checkout's `docs/`), and the rebuilt `dist/`.
  Message: "Add one amount as a percentage of another lesson". Push the
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

- **Removed the exam board.** The draft named AQA, its code R9 and its
  website. The site never names exam boards (R9 stays only as the DfE
  content reference in `skills.json`).
- **Learn asks nothing.** The draft's "Which number is 100%: 18 or 30?"
  was a question inside Learn. Learn now only teaches, with sliders; the
  same question is Try it 1 and the `which-is-100` type (ground rules
  2–3).
- **Every choice has four options** with feedback for each wrong one. The
  draft had two-option choices ("9 or 40", "Yes or No").
- **No written explanations.** The draft's Check asked pupils to "explain
  her mistake" in a text box. The engine can't mark that, and the draft
  said not to match text. Mia and Ben became four-option choices whose
  options are explanations, plus a typed answer.
- **Practice is a generator** (rule 7), mixing choice and typed (rule 6).
  The draft's eight fixed questions became `part-of-whole` and
  `more-than-100`. All their numbers fit the generator's ranges.
- **Two-box working cards** ("9 ÷ □ × 100") became choice cards that ask
  for the whole or the working. The engine has no fill-in-the-box card.
- **Added "find the whole first"** (Learn 5, Try it 8, `find-the-whole`)
  from bank card `convert-a-fraction-to-a-percentage-08`. Exam questions
  often give two groups instead of the whole.
- **Leo now asks for one percentage**, not a comparison, because the
  draft says comparing two percentages is a later lesson.
- **Removed the button and timing notes** ("Check answer", "Continue",
  "reveal only after"): the engine owns the button and feedback.
- **Wording:** "represents 100%" became "is 100%", "express" only in the
  exam phrase, and short sentences throughout.
- I checked every number in the draft: all answers are right.
