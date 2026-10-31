# Understanding and simplifying ratio: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. It fills the placeholder `ratio-basics`. It teaches what a
ratio is, how to write one in its simplest form, and how to write one
part as a fraction of the whole. Every picture is the same **bar of
blocks**, so one model carries all three ideas.

It is the first of a pair. The next lesson, `scaling-a-ratio`
(`docs/scaling-a-ratio-lesson.md`), uses the same bar to scale a ratio up
from one known amount. Sharing an amount in a ratio stays in
`sharing-in-a-ratio`.

Umar's draft ("Ratio: simplify and scale", 2026-10-30) is the source. It
has been split in two and rewritten to the ground rules. It uses cards
from the local question bank (`docs/exam-bank/bank/ratio-basics.json`,
cards 01, 03, 04, 07, 13, 14, 16, 17, and
`proportion-and-unitary-method.json` card 10). See "Changes from the
draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/ratio-basics` from **`origin/main`**
  (`71af433` or later) in its own worktree, e.g. `.worktrees/ratio-basics`.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lessons:** `content/one-amount-as-a-percentage/`
  (bars of equal blocks, sliders that change the bar, helper `.js` on
  `window`, the Practice generator, retained Check) and
  `content/equations-of-straight-lines/` (typed cards with two `fields`).
  Copy their patterns and their look.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- Slug `ratio-basics` (the placeholder already in `curriculum.json`,
  straight before `sharing-in-a-ratio`). Keep its title "Understanding
  and simplifying ratio" and its three skills (`ratio-notation`,
  `simplify-ratios`, `ratio-as-fraction`).
- **Change its subtitle** (the old one is jargon) to:
  `"A ratio counts parts. Divide both parts by the same number to simplify it."`
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Write ratios as `5 : 3` (a space each side of the colon) and keep a
  ratio on one line (non-breaking spaces, like the `nb()` helper in other
  lessons). Write fractions as `3/8`. No LaTeX.
- Name the things in the order the ratio uses: "blue : red = 5 : 3".
- Say "parts", "blocks", "divide both numbers by the same number" and
  "simplest form". Say what "simplest form" means the first time (Learn 2)
  and what the highest common factor (HCF) is the first time (Learn 3).
  Don't use "quantity", "proportion", "multiplicative", "equivalent" or
  "part-to-part".
- Displayed working uses `÷` and `×` and has no full stop:
  `200 ÷ 40 = 5`.
- No calculator is needed. Don't mention one.

## The bar

One drawing, used on every Learn screen. Each thing in the ratio is a
row of equal blocks, labelled with its name on the left. Each thing
keeps its own colour on every screen (blue paint is always blue, red
paint is always red). Colour is never the only cue: every row has its
name, and counts are written.

- Blocks wrap or shrink to fit at 375 px; they never scroll sideways.
  The largest bar is 20 + 12 blocks (Learn 2) and 36 blocks (Learn 4).
- When the blocks change size (Learn 2, 3 and 4), animate the split or
  join briefly, and skip the animation for `prefers-reduced-motion`.
- Labels above or inside blocks never overlap at 375 px.

## Learn (5 screens, all teaching, no questions)

Each screen has one bar that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
bar and keeps focus while dragged (don't rebuild the whole screen). Each
slider screen starts on the value given.

1. **A ratio counts parts.** Two rows: 5 blue blocks and 3 red blocks
   of paint. Slider "Red parts: 1 to 6" (starts on 3) changes the red row
   and updates "blue : red = 5 : 3" and "8 parts altogether". One line
   changes with the slider: at 1, "There is 5 times as much blue as
   red."; at 5, "There is the same amount of each."; otherwise, "For
   every 5 parts of blue, there are 3 parts of red." Text: "A ratio
   compares amounts. blue : red = 5 : 3 means 5 parts of blue for every 3
   parts of red. Blue comes first, so its number comes first." Callout:
   "Order matters. 5 : 3 is not the same as 3 : 5."
2. **Divide both to simplify.** A mix of 200 ml of blue and 120 ml of
   red, drawn as two solid bars to scale with their ml written. Slider
   "Block size: 10 ml, 20 ml, 40 ml" (three stops, starts on 10 ml)
   splits both bars into blocks of that size and shows the working:
   - 10 ml: `200 ÷ 10 = 20` and `120 ÷ 10 = 12`, so "200 : 120 = 20 : 12",
     then "20 and 12 can both still be divided by 4."
   - 20 ml: `200 ÷ 20 = 10` and `120 ÷ 20 = 6`, so "200 : 120 = 10 : 6",
     then "10 and 6 can both still be divided by 2."
   - 40 ml: `200 ÷ 40 = 5` and `120 ÷ 40 = 3`, so "200 : 120 = 5 : 3",
     then "5 and 3 can't both be divided again. This is the simplest
     form."

   Text: "Split both amounts into blocks of the same size. Count the
   blocks. Bigger blocks give smaller numbers, but the mix is the same.
   A ratio is in its **simplest form** when you can't divide both numbers
   by the same whole number any more." Callout: "200 : 120, 20 : 12,
   10 : 6 and 5 : 3 are all the same ratio. So is 15 : 9. If you
   multiply or divide both numbers by the same number, the ratio stays
   the same."
3. **Use the HCF.** Two bars: 45 and 60. Slider "Show the steps: 1 to 3"
   (starts on 1).
   1. Both bars split into blocks of 5: `45 ÷ 5 = 9`, `60 ÷ 5 = 12`, so
      "45 : 60 = 9 : 12".
   2. The blocks join in threes (blocks of 15): "9 and 12 can both still
      be divided by 3." `9 ÷ 3 = 3`, `12 ÷ 3 = 4`, so "9 : 12 = 3 : 4".
   3. The same blocks of 15, with: "Quicker: the HCF of 45 and 60 is 15.
      `45 ÷ 15 = 3`, `60 ÷ 15 = 4`. 45 : 60 = 3 : 4 in one step."

   Text: "The **highest common factor (HCF)** is the biggest number that
   divides into both numbers. Divide both by the HCF and you get the
   simplest form in one step. Dividing by a smaller number is fine too.
   Just keep going until you can't divide again." Callout: "Don't stop at
   9 : 12. Always check: can both numbers still be divided?"
4. **Find both amounts first.** A squad of 36 players. 15 are under 16.
   One bar of 36 small blocks. Slider "Show the steps: 1 to 3" (starts on
   1).
   1. 15 blocks shaded "Under 16". The other 21 are plain, with no label
      yet.
   2. The plain blocks get the label "16 and over: 36 − 15 = 21". The
      ratio "under 16 : 16 and over = 15 : 21" appears.
   3. Blocks join in threes: 5 and 7 blocks. `15 ÷ 3 = 5`, `21 ÷ 3 = 7`,
      so "15 : 21 = 5 : 7".

   Text: "Sometimes you're given the total and one part. Take away to
   find the other part first. Then simplify." Callout: "Don't use the
   total. 15 : 36 compares the under 16s with the whole squad, not with
   the other players."
5. **One part as a fraction.** Two rows, blue and red, with every block
   numbered 1, 2, 3, … across both rows. Blue stays at 5 parts. Slider
   "Red parts: 1 to 5" (starts on 3) changes the red row, dims the blue
   blocks, and shows "blue : red = 5 : 3", `5 + 3 = 8` parts, then "Red
   is 3 of the 8 parts, so 3/8 of the paint is red. Blue is 5/8." Text:
   "To write one part as a fraction, add the parts to find the total.
   Put that part over the total." Callout 1: "Not 3/5. That compares red
   with blue. The bottom number is all the parts." Callout 2: "It works
   with amounts too. 12 boys and 18 girls make 30 pupils, so 12/30 = 2/5
   of the class are boys."

## Card fields used in this lesson

- **Typed ratio cards** use `input: 'number'`, `fractions: true` and two
  `fields`, labelled with the names of the things in order (e.g. "Red"
  and "White"; bare questions use "First number" and "Second number").
  Answers and rules are objects, as in `equations-of-straight-lines`.
- **Typed fraction cards** use `input: 'number'`, `fractions: true` and
  `inputLabel: 'Fraction, like 1/4'`. The engine compares values, so an
  equal fraction such as 12/30 for 2/5 is accepted. Right feedback shows
  the simplest form.
- Every rule value must differ from the answer and from every other rule
  on that card.

## Try it (8 cards: 4 choice, 4 typed)

1. Choice (bank `ratio-basics-13`): "Mia has 4 times as many stickers as
   Tom. What is the ratio Mia's stickers : Tom's stickers?" `4 : 1` ✓ /
   `1 : 4` (*"That's Tom : Mia. Mia comes first, and she has more."*) /
   `4 : 5` (*"5 is all the parts together. Tom has 1 part for every 4 of
   Mia's."*) / `4 : 4` (*"That would mean they have the same. Tom has 1
   part for every 4 of Mia's."*). Right: *"For every 1 sticker Tom has,
   Mia has 4. So Mia : Tom = 4 : 1."*
2. Typed ratio, fields "Red" and "White": "A bag has 6 red beads and 4
   white beads. Write red : white in its simplest form." Answer 3, 2.
   Rules: {6, 4} → *"That's right, but not simplest. Both numbers divide
   by 2."*; {2, 3} → *"Red comes first. There are more red beads, so
   red's number is bigger."* Right: *"6 ÷ 2 = 3 and 4 ÷ 2 = 2. So
   red : white = 3 : 2"*
3. Choice: "Simplify 18 : 24 fully." `3 : 4` ✓ / `9 : 12` (*"9 and 12
   can both still be divided by 3. Keep going."*) / `6 : 8` (*"6 and 8
   can both still be divided by 2. Keep going."*) / `4 : 3` (*"Keep the
   order. 18 is first, so its number comes first."*). Right: *"The HCF
   of 18 and 24 is 6. 18 ÷ 6 = 3 and 24 ÷ 6 = 4"*
4. Typed ratio, fields "First number" and "Second number" (bank
   `ratio-basics-01`, new numbers): "Write 24 : 56 in its simplest form."
   Answer 3, 7. Rules: {12, 28} → *"12 and 28 can both still be divided
   by 4."*; {6, 14} → *"6 and 14 can both still be divided by 2."*;
   {7, 3} → *"Keep the order. 24 is first, so its number comes first."*
   Right: *"The HCF of 24 and 56 is 8. 24 ÷ 8 = 3 and 56 ÷ 8 = 7"*
5. Typed ratio, fields "Girls" and "Boys": "A team has 30 players. 12 of
   them are girls. The rest are boys. Write girls : boys in its simplest
   form." Answer 2, 3. Rules: {12, 18} → *"Right amounts. Now simplify:
   both divide by 6."*; {2, 5} → *"That compares the girls with all the
   players. Find the boys first: 30 − 12 = 18."*; {3, 2} → *"Girls come
   first. There are fewer girls, so their number is smaller."* Right:
   *"30 − 12 = 18 boys. 12 : 18 = 2 : 3 (divide both by 6)"*
6. Choice (bank `ratio-basics-16`, new numbers): "Mix A uses 40 ml of
   blue and 24 ml of red. Mix B uses 25 ml of blue and 15 ml of red. Do
   they make the same shade?" ✓ *"Yes. Both simplify to 5 : 3."* /
   *"No. Mix A has more paint, so it's darker."* (*"The shade depends on
   the ratio, not how much paint there is. Simplify both."*) / *"No. Mix
   A has 16 ml more blue than red. Mix B has only 10 ml more."*
   (*"Compare ratios by dividing, not by taking away. 40 : 24 and 25 : 15
   are both 5 : 3."*) / *"No. 40 : 24 and 25 : 15 use different
   numbers."* (*"Different numbers can be the same ratio. Simplify both
   and see."*). Right: *"40 : 24 = 5 : 3 (÷ 8) and 25 : 15 = 5 : 3
   (÷ 5). Same ratio, same shade."*
7. Choice (bank `ratio-basics-04`): "In a car park, red cars : silver
   cars = 4 : 7. There are no other cars. What fraction of the cars are
   red?" `4/11` ✓ / `4/7` (*"That's red over silver. The bottom number
   is all the parts: 4 + 7 = 11."*) / `7/11` (*"That's the silver
   cars."*) / `7/4` (*"That's silver over red. Put the red parts over all
   the parts."*). Right: *"4 + 7 = 11 parts. Red is 4 of them, so 4/11"*
8. Typed fraction: "Squash : water = 2 : 7. What fraction of the drink is
   squash?" Answer 2/9. Rules: 2/7 → *"That's squash over water. The
   bottom number is all the parts: 2 + 7 = 9."*; 7/9 → *"That's the
   water."* Right: *"2 + 7 = 9 parts. Squash is 2 of them, so 2/9"*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Each choice has four
different options, shuffled with the seeded `random`. Every right answer
gets its own feedback with the working. Test the generator with 32-bit
seeds, not small ones.

**Numbers.** A simplest-form pair (p, q): whole numbers from 1 to 9,
p ≠ q, with no common factor except 1. A multiplier k from 4, 6, 8, 9,
10, 12 (none of them prime, so a half-simplified answer exists). Then
a = k × p and b = k × q. Let f be the smallest prime factor of k; the
half-simplified ratio is (a ÷ f) : (b ÷ f). If any two options or rules
on a card match, redraw.

**Contexts** (pick one with the seeded `random`; keep the order):
red beads : white beads, boys : girls, cats : dogs, flour : sugar (g),
blue paint : red paint (ml), tins of soup : tins of beans. Typed fields
are labelled with the two names, e.g. "Cats" and "Dogs".

| Type | Skill | Card | Builds |
|---|---|---|---|
| `simplify-typed` | `simplify-ratios` | typed ratio | Half the time bare ("Write a : b in its simplest form.", fields "First number" and "Second number"), half the time a context (bank `ratio-basics-03`: "A shop has a tins of soup and b tins of beans. Write soup : beans in its simplest form."). Answer p, q. Rules: half-simplified (*"Both numbers can still be divided by k ÷ f. Keep going."*, with k ÷ f worked out), q, p (*"Keep the order. The first thing comes first."*). |
| `part-and-rest` | `simplify-ratios` | typed ratio | From bank `ratio-basics-02`. Total T = k × (p + q), part P = k × p. "A club has T members. P of them are under 16. The rest are 16 or over. Write under 16 : 16 and over in its simplest form." Answer p, q. Rules: P, T − P (*"Right amounts. Now simplify: both divide by k."*), p, p + q (*"That compares the under 16s with all the members. Find the rest first: T − P."*, with numbers), q, p (order). |
| `fraction-typed` | `ratio-as-fraction` | typed fraction | A context and a ratio p : q (simplest form). Ask for the fraction that is the first thing or the second (seeded). Answer that part over p + q. Rules: that part over the other part (*"That compares the two parts. The bottom number is all the parts: p + q."*), the other part over p + q (*"That's the other thing."*). |
| `simplify-choice` | `simplify-ratios` | choice | "Simplify a : b fully." Options: `p : q` ✓, half-simplified (*"Both can still be divided by k ÷ f."*), `q : p` (*"Keep the order."*), `p : b` (*"Divide both numbers by the same number, not just one."*). |
| `fraction-choice` | `ratio-as-fraction` | choice | A context and a ratio p : q. "What fraction of the … are …?" (the first thing). Options: p/(p + q) ✓, p/q (*"That compares the two parts. The bottom number is all the parts."*), q/(p + q) (*"That's the other thing."*), q/p (*"That's the other thing over this one."*). Write each fraction with the numbers worked out, e.g. `4/11`. |
| `same-ratio` | `ratio-notation` | choice | From bank `proportion-and-unitary-method-10`. m from 2 to 6. "Which ratio is the same as p : q?" Options: `mp : mq` ✓ (worked out), `(p + m) : (q + m)` (*"Adding the same number changes the ratio. Multiply both numbers instead."*), `mq : mp` (*"Keep the order."*), `mp : q` (*"Multiply both numbers, not just one."*). |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice (bank `ratio-basics-14`): "In a bag, red beads : white beads =
   13 : 9. Which of these must be true?" ✓ *"There are more red beads
   than white beads."* (*"Right. 13 parts is more than 9 parts, whatever
   size the parts are."*) / *"There are 13 red beads."* (*"A ratio counts
   parts, not beads. There could be 26 red and 18 white."*) / *"There are
   22 beads."* (*"There could be 44 or 66. A ratio doesn't tell you the
   total."*) / *"There are 4 more red beads than white beads."* (*"Only
   if each part is 1 bead. With 26 red and 18 white, there are 8
   more."*)
2. Typed ratio, fields "Soup" and "Beans" (bank `ratio-basics-03`): "A
   shop has 84 tins of soup and 147 tins of beans. Write soup : beans in
   its simplest form." Answer 4, 7. Rules: {12, 21} → *"12 and 21 can
   both still be divided by 3."*; {28, 49} → *"28 and 49 can both still
   be divided by 7."*; {7, 4} → *"Soup comes first."* Right: *"The HCF of
   84 and 147 is 21. 84 ÷ 21 = 4 and 147 ÷ 21 = 7"*
3. Choice (bank `ratio-basics-07`): "Jo's sweets : Kim's sweets = 3 : 4.
   Ravi says, 'Jo has 3/4 of the sweets.' Why is Ravi wrong?" ✓ *"There
   are 7 parts in total, so Jo has 3/7."* (*"Right. Put Jo's parts over
   all the parts."*) / *"Jo has 4/3, because Kim has more."* (*"A
   fraction of the sweets can't be more than 1. Jo has 3 of the 7
   parts."*) / *"He isn't wrong. Jo has 3 parts and Kim has 4."* (*"3/4
   compares Jo with Kim, not with all the sweets."*) / *"Jo has 4/7,
   because there are 7 parts."* (*"Jo has 3 of the 7 parts, not 4."*)
4. Typed ratio, fields "Bag A" and "Bag B" (bank `ratio-basics-17`): "Bag
   A has number cards 5, 1 and 6. Bag B has number cards 3, 4, 2, 7 and
   2. Write total of Bag A : total of Bag B in its simplest form." Answer
   2, 3. Rules: {12, 18} → *"Right totals. Now simplify: both divide by
   6."*; {6, 9} → *"6 and 9 can both still be divided by 3."*; {4, 6} →
   *"4 and 6 can both still be divided by 2."*; {3, 5} → *"That compares
   how many cards are in each bag. Add the numbers on the cards: 12 and
   18."* Right: *"5 + 1 + 6 = 12 and 3 + 4 + 2 + 7 + 2 = 18.
   12 : 18 = 2 : 3"*
5. Typed fraction: "A class has 12 boys and 18 girls. What fraction of
   the class are boys?" Answer 2/5 (12/30 is accepted). Rules: 2/3 →
   *"That's boys over girls. The bottom number is the whole class:
   12 + 18 = 30."*; 3/5 → *"That's the girls."* Right: *"12 + 18 = 30
   pupils. 12/30 = 2/5"*

Summary points:
- A ratio counts parts. Order matters.
- To simplify, divide both numbers by the same number. The HCF does it
  in one step.
- Simplest form means you can't divide both numbers again.
- For a fraction, put one part over the total of the parts.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen shows the bar before anything else. Every slider
visibly changes the bar, shows which stop it's on, and keeps focus while
dragged. The 36-block bar and the 20 + 12 bar fit at 375 px with labels
that don't overlap. Each thing keeps its colour. Four options on every
choice, each wrong one with its own feedback that fits that choice, and
the right one with feedback that isn't just its label again. Typed ratio
cards show two labelled boxes. Typed fractions accept `2/5` and `12/30`.
Every method a question uses is taught in Learn. Reload, Back and
Practise again work. The `dist/` lesson's last button reaches the
homepage, and the homepage shows "Understanding and simplifying ratio"
with the new subtitle.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests, does the browser review at
  desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (`ratio.js`) exposes one
  object, `window.RatioBasics`, with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - `simplify(a, b)`: returns `[a ÷ HCF, b ÷ HCF]`

  Every card config also carries `ratio` (the numbers the question
  starts from, e.g. `[24, 56]` or `[4, 7]`) and `asked`: `'simplify'`,
  `'fraction'`, `'notation'` (Try it 1, Check 1 and `same-ratio`) or
  `'compare'` (Try it 6, Check 3). Card configs use the shared card
  fields (`input`, `prompt`, `options` with `label`/`correct`/`feedback`,
  `answer`, `fields`, `fractions`, `rules`, `fallback`, `feedback`,
  `inputLabel`, `questionType`).
- **Commit** (one commit): the lesson folder, the `curriculum.json`
  subtitle change, this spec file (copy it from the main checkout's
  `docs/`), and the rebuilt `dist/`. Message: "Add understanding and
  simplifying ratio lesson". Push the branch. Never open a PR or merge
  until Umar approves in your chat.

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

- **Split into two lessons** (Umar's choice, 2026-10-30). The draft
  taught three skills in one lesson. This lesson fills the existing
  `ratio-basics` placeholder (what a ratio is, simplify, part as a
  fraction). Scaling became `scaling-a-ratio`.
- **Four sections only.** The draft's Hook, Summary, Worked examples and
  Question bank are gone as sections. The hook's "same shade" idea is in
  Learn 2's callout and Try it 6. The worked examples are Learn 3 (45 : 60)
  and Learn 5's amounts callout. The summary is the Check summary. The
  question bank became the Practice generator and Check.
- **Learn asks nothing.** The draft put a micro-check question on every
  Learn card, and opened with a question (the hook) before teaching
  anything. Learn now only teaches, with sliders; the questions moved to
  Try it (ground rules 2–3).
- **Every choice has four options** with feedback for each wrong one. The
  draft's checks and hook had three.
- **Typed answers added.** The draft's question bank was mostly choice.
  Ratios are typed in two boxes and fractions as `a/b`.
- **Added "find both amounts first"** (Learn 4, Try it 5, `part-and-rest`)
  from bank `ratio-basics-02`, and "words to a ratio" (Learn 1, Try it 1)
  from bank `ratio-basics-13`. Both come up often in exams.
- **No shared `ratio-bar` renderer.** `Maths1to9InteractionTypes` doesn't
  exist, and lessons don't load each other's code. The bar lives in this
  lesson's helper; `scaling-a-ratio` copies its look.
- **Removed the exam-board note** ("swap for the AQA pair"). The DfE
  references R4 and R8 are already on the skills in `skills.json`.
- **Prerequisites** in the draft were lesson slugs; `simplify-ratios`
  already lists `find-hcf`, so nothing changes.
- **Out of scope:** the form 1 : n, mixed units (250 g : 2 kg),
  three-part ratios as fractions, and sharing an amount. All are later
  lessons.
- I checked every number: all answers are right.
