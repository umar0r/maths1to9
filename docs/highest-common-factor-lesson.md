# Highest common factor

Lesson brief for `content/highest-common-factor/`. Follow
`docs/lesson-specification.md` and `docs/lesson-scoring.md`; this file only
records what is specific to this lesson. Build it like
`content/prime-factor-decomposition/` (custom Learn screens, Try it, Practice
and Check in the lesson's own JS, KaTeX from `vendor/katex` for any maths).

## Brief

- **Title / slug:** Highest common factor / `highest-common-factor`
- **One skill:** find the HCF of two numbers by matching their prime factors.
  Existing skill ID `find-hcf`. LCM gets its own lesson later.
- **Syllabus fit:** DfE GCSE mathematics subject content (all boards): "use the
  concepts and vocabulary of … highest common factor … prime factorisation".
  No exam-board codes or names in the lesson.
- **Prerequisites (not retaught):** `factors`, `prime-factor-decomposition`.
  Every question gives the prime factorisations, written out in full
  (2 × 2 × 3, not 2² × 3) so each prime is one tile.
- **Curriculum:** add
  `{"folder":"highest-common-factor","title":"Highest common factor","subtitle":"Match prime factors to find the HCF.","skills":["find-hcf"]}`
  to `curriculum.json` after `prime-factor-decomposition`, and add the slug
  after `prime-factor-decomposition` in the `non-calculator-number`
  collection. Leave the planned `hcf-and-lcm` entry alone, as with
  `factors` / `factors-multiples-and-primes`.

## The main interaction: match tiles into a Venn diagram

Used in Learn (watched), Try it and Practice (done by the pupil).

- Two rows of prime tiles, one per number, e.g. 24: `2 2 2 3` and
  36: `2 2 3 3`. Above them, two overlapping circles labelled with the numbers.
- The pupil taps a tile in one row, then a tile with the **same prime** in the
  other row. The pair joins and slides into the overlap as **one** tile. That
  is how "take each match once" is shown, not told.
- Tapping a different prime (2 then 3) doesn't match: the tiles shake and the
  feedback says "2 and 3 aren't the same prime." Tapping a selected tile again
  deselects it.
- A tile with no partner left can't be matched, so "you can't match a third
  2" is shown by the row running out, not by a sentence.
- Main button during matching: **Done matching**. On press, any unmatched
  tiles slide into their own side of the circles. If a match was still
  possible, it's wrong: "There's still a 2 in both rows. Match it first."
- Then the HCF question. The overlap stays visible.
- Keyboard: tiles are buttons; Tab to move, Enter/Space to select.

## 1. Learn (4 screens, one idea each)

Button: **Next** (screen 2 uses **Next match** until all matches are made).

1. **What HCF means.** 12 and 18 with their factor lists from the factors
   lesson. Common factors 1, 2, 3, 6 light up in both lists; 6 is marked as
   the largest. Text: "The highest common factor (HCF) is the biggest number
   that divides both. HCF of 12 and 18 = 6."
2. **Match the prime factors.** 24 = 2 × 2 × 2 × 3, 36 = 2 × 2 × 3 × 3.
   Each Next match pairs one 2, another 2, then the 3. The third 2 of 24 stays
   unmatched with the caption "36 has no 2 left."
3. **Multiply the overlap.** Pairs sit in the overlap as 2, 2, 3; leftovers 2
   (24 only) and 3 (36 only). Each circle multiplies back to its number
   (24 = 2 × 2 × 2 × 3, 36 = 2 × 2 × 3 × 3). "HCF = 2 × 2 × 3 = 12. Every
   shared prime is in the overlap, so nothing bigger divides both."
4. **No matches.** 8 = 2 × 2 × 2, 15 = 3 × 5. Overlap empty. "No shared
   primes: the HCF is 1, because 1 divides every number."

## 2. Try it (4 guided steps)

Two examples. Feedback and hints appear only after an answer.

**60 and 90** (60 = 2 × 2 × 3 × 5, 90 = 2 × 3 × 3 × 5)

- Step 1: match the tiles, then Done matching. Overlap: 2, 3, 5. Leftovers:
  2 (60 only), 3 (90 only).
- Step 2: "Multiply the overlap. HCF = ?" Options:
  - **30** ✓ "2 × 3 × 5 = 30. Check: 60 ÷ 30 = 2 and 90 ÷ 30 = 3."
  - 10: "You added 2 + 3 + 5. Multiply them."
  - 60: "60 uses both 2s, but 90 has only one 2. Only one 2 is shared."
  - 180: "That multiplies every tile in the diagram. Use the overlap only."

**40 and 60** (40 = 2 × 2 × 2 × 5, 60 = 2 × 2 × 3 × 5), less help: no
step captions.

- Step 3: match the tiles, then Done matching. Overlap: 2, 2, 5.
- Step 4: type the HCF (number box). Answer **20**. Wrong-answer feedback by
  value: 9 (added) "Multiply, don't add."; 40 "60 has only two 2s, so only
  two can be shared."; 120 "Use the overlap only."; anything else
  "Multiply the tiles in the overlap: 2 × 2 × 5."

## 3. Practice (endless generator, session of 5)

Each question: match tiles, Done matching, then type the HCF. A question
counts as right first time only if both Done matching and the HCF are right
first time. Record one `recordAssessment()` per question with a stable ID;
question type `hcf-prime-match` mapped to `find-hcf`.

Pool (none reuse Learn, Try it or Check numbers):

| Group | Pairs (HCF) |
|---|---|
| One of each shared prime | 18 & 30 (6), 42 & 70 (14), 45 & 75 (15), 30 & 50 (10) |
| Repeated shared primes | 48 & 72 (24), 36 & 54 (18), 16 & 40 (8) |
| HCF is the smaller number | 14 & 28 (14), 12 & 60 (12) |
| No shared primes | 9 & 20 (1), 15 & 28 (1) |

A session picks 2 from the first group and 1 from each other group, shuffled,
with the no-match question never first.

Wrong-answer feedback, worked out from the pupil's number:

- sum of the overlap: "You added. Multiply the overlap."
- product of every tile (the LCM): "That uses every tile. Use the overlap only."
- 0 when there are no matches: "Nothing shared means the HCF is 1, not 0."
- otherwise: "Multiply the tiles in the overlap: …" without giving the product.

## 4. Check (4 multiple-choice questions, no tiles)

Each shows both factorisations. One per misconception.

**Q1 (missed match).** 36 = 2 × 2 × 3 × 3, 60 = 2 × 2 × 3 × 5. Maya says
the HCF is 6 because both contain a 2 and a 3. Is she right?

- "Yes. 6 divides both 36 and 60." → "6 is a common factor, but not the
  highest. Both numbers have two 2s."
- **"No. Both have two 2s, so the HCF is 2 × 2 × 3 = 12."** ✓
- "No. The HCF is 2 × 2 × 3 × 3 = 36." → "36 doesn't divide 60."
- "No. The HCF is 2 × 2 × 3 × 3 × 5 = 180." → "180 uses every factor.
  The HCF can't be bigger than either number."

**Q2 (unshared prime in the overlap).** 24 = 2 × 2 × 2 × 3,
40 = 2 × 2 × 2 × 5. Sam puts 2, 2, 2 and 3 in the overlap. What should he do?

- **"Take out the 3. HCF = 2 × 2 × 2 = 8."** ✓ "40 has no 3."
- "Take out a 2. HCF = 2 × 2 × 3 = 12." → "40 has three 2s too, and 12
  doesn't divide 40."
- "Nothing. HCF = 2 × 2 × 2 × 3 = 24." → "24 doesn't divide 40. 40 has no 3."
- "Swap the 3 for the 5. HCF = 2 × 2 × 2 × 5 = 40." → "40 doesn't divide 24.
  24 has no 5."

**Q3 (empty overlap).** 16 = 2 × 2 × 2 × 2, 25 = 5 × 5. Leah says nothing is
in the overlap, so the HCF is 0. What is the HCF?

- "0" → "0 isn't a factor of anything. 1 divides every number."
- **"1"** ✓ "No shared primes, but 1 divides both."
- "There isn't one." → "1 is always a common factor."
- "400" → "16 × 25 is a common multiple, not a factor."

**Q4 (adding).** 20 = 2 × 2 × 5, 30 = 2 × 3 × 5. Amir says the shared primes
are 2 and 5, so the HCF is 2 + 5 = 7. What is the HCF?

- "7" → "7 doesn't divide 20. Multiply the shared primes."
- **"10"** ✓ "2 × 5 = 10."
- "20" → "20 uses both 2s, but 30 has only one. 20 doesn't divide 30."
- "60" → "That uses every factor. Use the shared ones only."

**Summary (`#summary`)**

- Match the same prime in both numbers, as many times as both have it.
- Multiply the matches, using each match once.
- No matches: the HCF is 1.

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

## Changes from the ChatGPT draft

- AQA "N4" citation removed; fit checked against the DfE content.
- The single long Learn page is split into four visual screens; the "why it's
  highest" paragraph is one line on screen 3.
- "Explain your reasoning" questions (Practice 5, Check 1–3) became
  multiple-choice with misconception options, since free text can't be
  marked.
- The fixed list of 4 Practice questions became an 11-pair pool, session of 5.
- Check Q4 uses 20 and 30 instead of 12 and 18, which Learn already answers.
- Try it Step 1's "0 / 1 / 2 twos" choice is replaced by the tiles, which
  stop a third match by running out. Step 3 ("place the leftovers") is
  animated by Done matching, not asked.
- "Select the matching factors" is the tile matching itself.

## Checks to run when built

As in `docs/lesson-specification.md`, plus: Done matching with a match left,
a wrong-prime pair, a no-match pair in Practice, the summary hash, and reload
mid-matching (matched tiles must be restored).
