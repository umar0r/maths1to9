# Lowest common multiple

Lesson brief for `content/lowest-common-multiple/`. Follow
`docs/lesson-specification.md` and `docs/lesson-scoring.md`; this file only
records what is specific to this lesson. Build it like
`content/highest-common-factor/`: same Venn diagram, same tile matching, same
Practice and Check structure, KaTeX from `vendor/katex` for any maths.

## Brief

- **Title / slug:** Lowest common multiple / `lowest-common-multiple`
- **One skill:** find the LCM of two numbers from the prime-factor Venn
  diagram. Existing skill ID `find-lcm`.
- **Syllabus fit:** DfE GCSE mathematics subject content (all boards): "use the
  concepts and vocabulary of … common multiples … lowest common multiple, prime
  factorisation". No exam-board codes or names in the lesson.
- **Prerequisites (not retaught):** `prime-factor-decomposition`,
  `highest-common-factor`. Pupils already know how to match tiles into the
  overlap. Every question gives the prime factorisations written out in full
  (2 × 2 × 3, not 2² × 3).
- **Curriculum:** add
  `{"folder":"lowest-common-multiple","title":"Lowest common multiple","subtitle":"Use the prime factor Venn diagram to find the LCM.","skills":["find-lcm"]}`
  to `curriculum.json` after `highest-common-factor`, and add the slug after
  `highest-common-factor` in the `non-calculator-number` collection. Leave the
  planned `hcf-and-lcm` entry alone.
- **Code:** copy the tile-matching and Venn code from
  `content/highest-common-factor/interactive.js` into this lesson's own JS.
  Don't load files from the HCF folder, and don't change the HCF lesson.

## The story

Brilliant-style, but only with GCSE methods: build one picture a step at a
time, ask a question before naming the idea, and carry the same numbers from
screen to screen so each new idea answers a question the pupil already has.
No puzzles or real-life contexts; those belong to the separate
`hcf-lcm-problems` skill.

The thread through Learn and Try it:

1. Listing multiples finds the first number in both lists (4 and 6 → 12).
2. Lists get long for bigger numbers (24 and 36 → 72).
3. The Venn diagram from the HCF lesson finds 72 straight away: multiply every
   tile. Pupils can check this against the 72 they've just found by listing.
4. Pupils do it themselves: first by choosing tiles, then by typing the answer.

## Techniques used throughout

- **One step per screen.** One action and at most two short lines of text.
- **Ask before telling.** Each Learn question comes before the explanation;
  the correct answer's feedback names the idea.
- **Wrong options grey out.** After a wrong multiple-choice answer, that
  option is disabled and shows a ×. Try again keeps the pupil's place, so the
  next attempt must be a different answer. (This lesson's own code only.)
- **Short feedback, shown in the picture.** One sentence. Where the mistake
  is about tiles, the diagram flashes the tiles involved (e.g. the side tile
  that was left out).
- **Reminders inside the question, not behind a button.** Captions say what
  to do next on every step, including the less-help example.
- **Same colours everywhere.** Overlap tiles green, side tiles blue once
  they're part of the LCM. Numbers in an HCF or LCM line use the colour of
  their tile. Lines of maths are rendered whole in KaTeX ("HCF = 2 × 2 × 3 =
  12", not "HCF =" in the page font).

## 1. Learn (6 screens)

Learn questions aren't scored. Reaching screen 6 completes Learn, as in the
HCF lesson.

1. **List the 4s.** Press **List the 4s**: tiles 4, 8, 12, 16, 20, 24 appear
   one at a time in a row. "These are the multiples of 4."
2. **List the 6s.** Press **List the 6s**: a second row 6, 12, 18, 24, 30
   appears. As each tile lands, a number that's already in the 4s row turns
   green in both rows (12, then 24). "Green numbers are in both lists."
3. **Which comes first?** "What is the lowest number in both lists?"
   - **12** ✓ "12 is the lowest common multiple (LCM) of 4 and 6."
   - 10: "That's 4 + 6. 10 isn't in either list."
   - 24: "24 is in both lists, but 12 comes first."
   - 2: "2 divides both. Multiples are 4, 8, 12 …"
4. **Bigger numbers.** Press **List them**: 24, 48, 72 and 36, 72. 72 turns
   green. "LCM of 24 and 36 = 72. Lists get long for bigger numbers. The prime
   factors find it faster."
5. **Find 72 in the diagram.** The Venn diagram for 24 and 36 from the HCF
   lesson: overlap 2, 2, 3 (green); 24 side 2; 36 side 3. "HCF = 2 × 2 × 3 =
   12." Ask "Which tiles multiply to 72?"
   - **Every tile, once** ✓ The side tiles turn blue. "LCM = 2 × 2 × 3 × 2 ×
     3 = 72. That's HCF × the side tiles."
   - The green overlap only: "That makes 12, the HCF."
   - All of 24's tiles and all of 36's tiles: "That makes 24 × 36 = 864. It
     uses the green tiles twice."
6. **Nothing shared.** 8 = 2 × 2 × 2, 15 = 3 × 5. Overlap empty, every tile
   blue. "Nothing is shared, so the LCM is every tile: 2 × 2 × 2 × 3 × 5 =
   120. That's 8 × 15."

## 2. Try it (4 guided steps)

Section title "Find the LCM". Matching and **Done matching** work exactly as
in the HCF lesson (wrong pair shakes; "There's still a 2 in both rows" if a
match is left).

**12 and 30** (12 = 2 × 2 × 3, 30 = 2 × 3 × 5), full support.

- Step 1: "Match the shared primes, then press Done matching." Overlap: 2, 3.
  Sides: 2 (12 only), 5 (30 only).
- Step 2: "Tap the tiles that make the LCM." Each tapped tile copies into a
  bar under the diagram: "LCM = 2 × 3 × …" (tap a tile in the bar to take it
  out). Main button **Check**. Feedback:
  - every tile ✓ The bar shows "= 60", the side tiles turn blue, and
    "60 ÷ 12 = 5 and 60 ÷ 30 = 2."
  - overlap only: "That makes 6, the HCF. The LCM needs the side tiles too."
    Flash both side tiles.
  - missing 12's side: "That makes 30. 30 isn't a multiple of 12." Flash the
    2 on 12's side. (Same pattern for a missing 5: "That makes 12 …")
  - any other selection: "Use every tile in the diagram, each once."

**18 and 24** (18 = 2 × 3 × 3, 24 = 2 × 2 × 2 × 3), less help: no tile bar.

- Step 3: "Your turn. Match the shared primes, then press Done matching."
  Overlap: 2, 3. Sides: 3 (18 only), 2, 2 (24 only). Side tiles turn blue.
- Step 4: "Multiply every tile, green and blue. LCM = ?" Number box, Enter
  runs Check. Answer **72**. Feedback by value: 6 "That's the HCF. Use the
  blue tiles too."; 432 "That's 18 × 24. It uses the green tiles twice."; 18
  "You left out 24's side." (flash it); 24 "You left out 18's side." (flash
  it); 12 "You added. Multiply the tiles."; anything else "Multiply every
  tile: 2 × 3 × 3 × 2 × 2."

## 3. Practice (endless generator, session of 5)

Each question: match tiles, Done matching (side tiles turn blue), then type
the LCM with the caption "Multiply every tile, green and blue. LCM = ?". A question
counts as right first time only if both Done matching and the LCM are right
first time. Record one `recordAssessment()` per question with a stable ID;
question type `lcm-prime-match` mapped to `find-lcm`.

Pool (none reuse Learn, Try it or Check numbers):

| Group | Pairs (LCM) |
|---|---|
| One of each shared prime | 10 & 15 (30), 6 & 14 (42), 15 & 20 (60), 21 & 35 (105) |
| Repeated shared primes | 16 & 24 (48), 20 & 50 (100), 18 & 27 (54) |
| LCM is the larger number | 6 & 18 (18), 8 & 24 (24) |
| No shared primes | 4 & 9 (36), 5 & 8 (40), 7 & 10 (70) |

A session picks 2 from the first group and 1 from each other group, shuffled,
with the no-match question never first.

Wrong-answer feedback, worked out from the pupil's number, checked in this
order after the correct answer:

1. the HCF: "That's the HCF: the overlap only. The LCM uses every tile."
2. the two numbers multiplied: "That multiplies the two numbers, so the
   overlap is used twice."
3. either of the two numbers: "[a] isn't a multiple of [b]. Include [b]'s
   side tiles." (A side's tiles plus the overlap make that number, so this
   catches a missed side.)
4. the sum of every tile: "You added. Multiply the tiles."
5. otherwise: "Multiply every tile: …" listing the tiles without the result.

Where a rule is about tiles, flash them as in Try it (the blue tiles for
rule 1, the missed side for rule 3).

Some values hit more than one rule (for 6 & 18 the HCF is also 6); the first
rule in the list wins.

## 4. Check (4 multiple-choice questions, no tiles)

Each shows both factorisations. One per misconception. Wrong options grey
out as in Learn.

**Q1 (multiplying the numbers).** 12 = 2 × 2 × 3, 18 = 2 × 3 × 3. Jo says the
LCM is 12 × 18 = 216. Is she right?

- "Yes. 216 is a multiple of both." → "216 is a common multiple, but not
  the lowest. 12 × 18 uses the shared 2 and 3 twice."
- **"No. The LCM is 2 × 2 × 3 × 3 = 36."** ✓ "The overlap 2, 3 once, plus
  2 from 12 and 3 from 18."
- "No. The LCM is 2 × 3 = 6." → "That's the HCF: the overlap only."
- "No. The LCM is 18, the bigger number." → "18 isn't a multiple of 12."

**Q2 (HCF instead of LCM).** 20 = 2 × 2 × 5, 30 = 2 × 3 × 5. Ben multiplies
the overlap and gets 10. Has he found the LCM?

- "Yes. 10 is the LCM." → "10 is the HCF. The LCM must be a multiple of
  both numbers, so it can't be smaller than either."
- **"No. Multiply every tile: 2 × 5 × 2 × 3 = 60."** ✓
- "No. The LCM is 20 × 30 = 600." → "600 is a common multiple, but not the
  lowest. It uses the shared 2 and 5 twice."
- "No. The LCM is 2 × 5 × 3 = 30." → "That leaves out 20's extra 2. 30
  isn't a multiple of 20."

**Q3 (missing a side).** 8 = 2 × 2 × 2, 12 = 2 × 2 × 3. Priya multiplies the
overlap and 12's side: 2 × 2 × 3 = 12. What is the LCM?

- "12" → "12 isn't a multiple of 8. Include the 2 on 8's side."
- **"24"** ✓ "2 × 2 × 2 × 3 = 24. 24 ÷ 8 = 3 and 24 ÷ 12 = 2."
- "96" → "That's 8 × 12. It uses the shared 2, 2 twice."
- "4" → "That's the HCF: the overlap only."

**Q4 (no shared primes).** 9 = 3 × 3, 10 = 2 × 5. Nothing is in the overlap.
What is the LCM?

- "1" → "1 is the HCF. The LCM must be a multiple of both numbers."
- "19" → "You added 9 + 10. Multiply every tile."
- "45" → "That leaves out the 2. 45 isn't a multiple of 10."
- **"90"** ✓ "Nothing shared, so multiply every tile: 3 × 3 × 2 × 5 = 90."

**Summary (`#summary`)**

- Match the prime factors into the Venn diagram, as for the HCF.
- HCF: multiply the overlap. LCM: multiply every tile.
- Don't just multiply the two numbers: that uses the overlap twice.

## Scoring

Planned maximum **130**, registered before interaction:

| Activity | Points |
|---|---|
| 4 sections (engine-reserved) | 4 × 5 = 20 |
| Try it guided steps 1–4 (`score_activities`, kind `guided`) | 4 × 5 = 20 |
| Practice `answer:question-bank:1–5` | 5 × 10 = 50 |
| Check `answer:final-check-1–4` | 4 × 10 = 40 |

Guided steps earn 5 once whether right first time or corrected. Practice and
Check: 10 first time, 5 corrected. Confirm the ring reads `0 / 130` on a fresh
load.

## Lessons from the HCF build (don't repeat)

- Write readable JS in the style of the HCF lesson's current `interactive.js`:
  one statement per line, named functions, no nested ternary chains.
- Any multiple-choice option container needs `role="group"` so the shared
  `.button.is-selected/.is-correct/.is-incorrect` styles apply.
- Hide a tile row's label once the row has no tiles left.
- The Check "All lessons" button uses `if (state.finished) api.completeLesson();`,
  not hard-coded activity counts.
- No README or notes in the lesson folder.

## Checks to run when built

As in `docs/lesson-specification.md`, plus: Done matching with a match left,
a wrong-prime pair, an LCM-is-the-larger-number pair and a no-match pair in
Practice, each wrong-answer rule, both Learn questions (including a greyed-out wrong option), the Try it tile bar, the summary hash,
reload mid-matching, and the phone layout with the busiest diagram
(16 & 24: overlap 2, 2, 2; sides 2 and 3).
