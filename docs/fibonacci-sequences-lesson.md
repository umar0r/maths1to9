# Fibonacci-type sequences: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. Teaches **one skill**: continuing a Fibonacci-type sequence by
adding the two terms before, including finding a term at a given
position. It comes straight after the two nth-term lessons and links back
to them: a Fibonacci-type sequence has no nth term like 3n − 1, because
its gaps keep changing, so you find the 8th term by keeping going.

Umar's draft (from ChatGPT, 2026-10-29) is the source. It has been
rewritten to the ground rules, and Practice uses a card from the local
question bank (`docs/exam-bank/bank/sequences.json`, card 08). See
"Changes from the draft" at the end.

## Before you start

- **Build this after "Finding the nth term".** `git fetch origin`. Make
  `codex/fibonacci-sequences` from **`codex/finding-the-nth-term`** (your
  finished commit for that lesson, not `main`), in its own worktree, e.g.
  `.worktrees/fibonacci-sequences`. Both lessons rebuild the homepage in
  `dist/`, so stacking the branches stops them clashing when they merge.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lessons:** `content/sequences/` (rows of terms with
  arrows, two-field cards) and `content/nth-term/` (sliders that light up
  terms, the Practice generator, retained Check). Copy their patterns and
  look.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

- **New skill** in `skills.json`, straight after `recognise-special-sequences`:
  `{"id":"continue-fibonacci-sequences","title":"Continue Fibonacci-type sequences","content_references":["A24"],"recommended_prerequisites":["generate-sequences"]}`
- **New lesson** in `curriculum.json`, straight after
  `finding-the-nth-term`:
  `{"folder":"fibonacci-sequences","title":"Fibonacci-type sequences","subtitle":"Add the two terms before to find the next term.","skills":["continue-fibonacci-sequences"]}`
- **Change the `special-sequences` placeholder's subtitle** to
  "Recognise square, cube and triangular numbers." (Fibonacci-type
  sequences now have their own lesson.) Keep its slug, title and skill.
- Change nothing else in `curriculum.json`, `skills.json` or
  `collections.json`.

## Wording rules for the whole lesson

- Write sequences as `2, 5, 7, 12, 19, …` (the ellipsis character, spaces
  after commas). Use `−` for minus. Displayed working has no full stop:
  `5 + 7 = 12`.
- Say "Fibonacci-type sequence" only after screen 2 names it. Say "the two
  terms before" (not "the previous two terms" or "the preceding terms").
- Say "1st term", "8th term". Don't use "recursive" or "arithmetic".

## Learn (5 screens, all teaching, no questions)

Each screen has one picture that the pupil controls with a slider, and the
slider never asks for an answer. Every slider move visibly changes the
picture and keeps focus while dragged (don't rebuild the whole screen).
Each slider screen starts on a useful value (not blank).

The main picture is a row of term boxes. When a new term is made, the two
boxes before it are highlighted with one bracket under both, and the
working `5 + 7 = 12` shows under the row.

1. **Add the two terms before.** `2, 5, …`. Slider "New terms: 0 to 3"
   (starts on 1) adds 7, then 12, then 19, one at a time. Each time, the
   two terms used are highlighted and the working shows: `2 + 5 = 7`,
   `5 + 7 = 12`, `7 + 12 = 19`. Earlier terms stay. Text: "Here's a
   different kind of rule. To get the next term, add the two terms
   before it. Then move along one and do it again."
2. **Fibonacci-type sequences.** `1, 1, …`. Slider "New terms: 0 to 5"
   (starts on 5) builds `1, 1, 2, 3, 5, 8, 13` with the same highlights.
   Text: "A sequence with this rule is called a **Fibonacci-type
   sequence**. The famous one starts 1, 1. But any two numbers can start
   one. The rule stays the same: add the two terms before."
3. **No nth term this time.** Two rows: `2, 5, 8, 11, …` and `2, 5, 7,
   12, …`. Slider "Show the gaps: 0 to 3" (starts on 3) draws the gaps
   over each pair in both rows: +3, +3, +3 on top; +3, +2, +5 below.
   Text: "The top row goes up by 3 every time, so it has an nth term:
   3n − 1. The bottom row's gaps keep changing. So a Fibonacci-type
   sequence has no nth term like that. To find a term further along, keep
   adding until you get there."
4. **Find a term at any position.** `1, 3, 4, 7, 11, …` with positions
   1–8 under the boxes, boxes 6–8 empty. Slider "Fill in: 5th to 8th"
   (starts on 5th) fills 18, 29, 47 one at a time with the working
   (`7 + 11 = 18`, `11 + 18 = 29`, `18 + 29 = 47`), and lights up the
   position number. Text: "To find the 8th term, keep going until you
   reach position 8. Count the positions, not the sums. The 8th term is
   47."
5. **It works with any numbers.** `−2, 3, …`. Slider "New terms: 0 to 3"
   (starts on 3) builds `1, 4, 5` with the working `−2 + 3 = 1`,
   `3 + 1 = 4`, `1 + 4 = 5`. Text: "The first two terms can be negative
   or the same. 5, 5 gives 5, 5, 10, 15, 25, …" Callout: "Always add the
   last two terms. Don't add the same gap again, and don't add every
   term."

## Try it (9 cards: 4 choice, 5 typed)

The sequence is shown at the top of each card, with an empty box for the
term asked for. After a right answer, the card highlights the two terms
that were added and shows the working, never before.

1. Typed: `3, 4, □` "This is a Fibonacci-type sequence. What is the 3rd
   term?" 7. Rules: 12 → *"That multiplies. Add the two terms: 3 + 4."*;
   5 → *"That adds 1. Add the two terms before: 3 + 4."*; 1 → *"That takes
   away. Add them: 3 + 4."* Right: *"3 + 4 = 7"*
2. Choice: `3, 4, 7, □` "Which two terms do you add to get the next
   term?" 4 and 7 ✓ / 3 and 4 (*"That gives 7 again. Move along one:
   use the last two terms."*) / 3 and 7 (*"Use the two terms just before
   the gap: 4 and 7."*) / 3, 4 and 7 (*"Add only the two terms before,
   not all of them."*). Right: *"The two terms before the gap are 4 and
   7."*
3. Typed: same sequence. "What is the 4th term?" 11. Rules: 14 → *"That
   adds all three terms. Add only the last two: 4 + 7."*; 10 → *"That's
   3 + 7. Use the last two terms: 4 + 7."*; 28 → *"That multiplies. Add
   4 + 7."* Right: *"4 + 7 = 11"*
4. Typed: `3, 4, 7, 11, □` "What is the next term?" 18. Rules: 15 →
   *"That adds 4 to 11. Use the last two terms: 7 + 11."*; 25 → *"That
   adds all four terms. Add only 7 + 11."*; 22 → *"That doubles 11. Add
   7 + 11."* Right: *"7 + 11 = 18"*
5. Typed, two fields: `2, 6, □, □` "Find the next two terms." `input:
   'number', fractions: true, fields: [{ id: 'first', label: 'Next term' },
   { id: 'second', label: 'Term after' }]`. Answer 8 and 14. Rules:
   {8, 10} → *"For the term after, use 6 and 8, not 2 and 8."*; {8, 16}
   → *"That doubles 8. Add the two terms before: 6 + 8."*; {8, 12} →
   *"That adds 4 again. The gaps change: use 6 + 8."* Right: *"2 + 6 = 8,
   then 6 + 8 = 14"*
6. Choice: "Which of these is a Fibonacci-type sequence?" `2, 5, 7, 12, …`
   ✓ / `2, 5, 8, 11, …` (*"That adds 3 each time. Its nth term is
   3n − 1."*) / `2, 4, 8, 16, …` (*"That doubles each time."*) / `1, 4, 9,
   16, …` (*"Those are 1², 2², 3², 4²."*). Right: *"2 + 5 = 7 and
   5 + 7 = 12."*
7. Typed (from Learn 4): `1, 3, 4, 7, 11, …` "What is the 8th term?" 47.
   Rules: 29 → *"That's the 7th term. One more."*; 76 → *"That's the 9th
   term, one too many."*; 18 → *"That's the 6th term. Keep going to
   position 8."* Right: *"18, 29, 47. The 8th term is 47."*
8. Choice: `5, 5, 10, 15, 25, …` "What is the next term?" 40 ✓ / 35
   (*"That adds 10, like 15 to 25. The gaps change: add 15 + 25."*) / 30
   (*"That adds 5. Add the two terms before: 15 + 25."*) / 50 (*"That
   doubles 25. Add 15 + 25."*). Right: *"15 + 25 = 40"*
9. Choice: `−2, 3, 1, 4, …` "What is the next term?" 5 ✓ / 7 (*"That's
   3 + 4. Use the last two terms: 1 and 4."*) / 6 (*"That adds all four
   terms. Add only 1 + 4."*) / 3 (*"That takes away. Add them: 1 + 4."*).
   Right: *"1 + 4 = 5"*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Map every type to
`continue-fibonacci-sequences`. Each choice has four different options
shuffled with the seeded `random`. Every rule value must differ from the
answer and from every other rule; drop one that clashes, and keep at least
two. Every right answer gets its own feedback with the working. Unless a
type says otherwise, the first two terms a and b are whole numbers 1–12.
In `next-term` only, one time in six, a is −5 to −1 (like Try it 9). Test the
generator with 32-bit seeds, not small ones.

| Type | Card | Builds |
|---|---|---|
| `next-term` | typed | Show five terms. "What is the next term?" Answer t₄ + t₅. Rules: t₅ + (t₅ − t₄) (*"That adds the last gap again. The gaps change: add the last two terms."*), the sum of all five (*"Add only the last two terms."*), t₃ + t₅ (*"That skips a term. Use the last two."*), 2 × t₅ (*"That doubles. Add the last two terms."*). |
| `next-two` | typed, two fields | From the draft's "find the next two terms". Show a, b, □, □. Fields as Try it 5. Answer a + b and a + 2b. Rules: {a + b, 2a + b} (*"For the term after, use b and a + b."*), {a + b, 2(a + b)} (*"That doubles. Add the two terms before."*), {a + b, a + b + (b − a)} (*"That adds the same gap again. The gaps change."*). |
| `kth-term` | typed | From Learn 4 and the draft's "8th term". "The first two terms are a and b. What is the kth term?" k 6–8 (a and b 1–6). Show boxes for positions 1 to k. Rules: the (k − 1)th term (*"That's the (k − 1)th term. One more."*), the (k + 1)th term (*"That's one too many. Count the positions."*). |
| `next-two-choice` | choice | From bank `sequences-08`. "Each new term is the sum of the two before it. The sequence starts t₁, t₂, t₃, t₄. Which two numbers come next?" Right: t₃ + t₄, then t₄ + (t₃ + t₄). Wrong: 2t₄, 4t₄ (*"That doubles the last term each time."*); t₄ + g, t₄ + 2g where g = t₄ − t₃ (*"That adds the same amount each time. The rule uses the two terms before."*); t₃ + t₄, then t₃ + (t₃ + t₄) (*"After the first one, use the last two terms, not t₃ again."*). |
| `spot-wrong` | choice | From the draft's Mia question. Show five terms where one of the 3rd, 4th or 5th is changed by 1 to 3, and every later term is then built from the displayed last two, so exactly one sum fails (a and b 1–9). "Mia says this is a Fibonacci-type sequence. Which term is wrong?" Options: "The 3rd term", "The 4th term", "The 5th term", "None of them". Right: the wrong one, with feedback showing the sum that should give it (*"5 + 8 = 13, not 14."*). Each wrong option's feedback checks that term with its own sum (*"The 3rd term is right: 3 + 5 = 8."*); "None of them" says which sum fails. |
| `which-is-fib` | choice | From Try it 6. Four sequences, four terms each, all starting with the same two numbers a, b (2–9, a < b). Right: the Fibonacci-type one. Wrong: a, b, then keep adding b − a (*"That adds the same amount each time, so it has an nth term."*); a, b, then keep doubling, 2b, 4b (*"That doubles each time."*); a, b, then keep adding a, b + a, b + 2a (*"That keeps adding a. Each term must be the two terms before added together."*). Make all four lists different; redraw a and b if two match. |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice: `2, 5, 7, 12, …` *"Sam says the next term is 17, because you
   add 5 again. Is Sam right?"* ✓ *"No. Add the last two terms:
   7 + 12 = 19."* (*"Right. In a Fibonacci-type sequence, the gaps
   change."*) / *"Yes. 12 + 5 = 17."* (*"The gaps are 3, 2 and 5, not the
   same. Add the last two terms."*) / *"No. It's 2 + 5 + 7 + 12 = 26."*
   (*"Add only the last two terms."*) / *"No. It's 12 + 12 = 24."*
   (*"Don't double. Add 7 + 12."*)
2. Typed: `3, 5, 8, 13, 20` *"Mia says this is a Fibonacci-type sequence,
   but its last term is wrong. What should the last term be?"* 21. Rules:
   20 → *"Check it: 8 + 13 = 21, not 20."*; 33 → *"That adds 13 and 20.
   Use the two terms before the last one: 8 + 13."*; 18 → *"That adds the
   gap of 5 again. Add 8 + 13."* Right: *"8 + 13 = 21"*
3. Choice: `4, 7, 11, □` "Which working gives the 4th term?" ✓ *"7 + 11 =
   18. Add the 2nd and 3rd terms."* (*"Right. Use the two terms just
   before."*) / *"4 + 7 = 11. Add the first two again."* (*"That's how
   you got the 3rd term. Move along one."*) / *"11 + 4 = 15. It goes up by
   4."* (*"The gaps are 3 and 4, not the same. Add 7 + 11."*) / *"4 + 7 +
   11 = 22. Add all the terms."* (*"Add only the two terms before."*)
4. Typed: "The first two terms of a Fibonacci-type sequence are 2 and 3.
   What is the 7th term?" 34. Rules: 21 → *"That's the 6th term. One
   more."*; 55 → *"That's the 8th term, one too many."*; 13 → *"That's the
   5th term. Keep going to position 7."* Right: *"2, 3, 5, 8, 13, 21,
   34"*
5. Typed: `−1, 4, 3, 7, □` "What is the next term?" 10. Rules: 11 →
   *"That's 4 + 7. Use the last two terms: 3 + 7."*; 13 → *"That adds all
   four terms. Add only 3 + 7."*; 4 → *"That takes away. Add 3 + 7."*
   Right: *"3 + 7 = 10"*

Summary points:
- In a Fibonacci-type sequence, each term is the two terms before added
  together.
- Move along one each time and add the last two terms.
- The gaps keep changing, so there's no nth term like 3n − 1.
- To find the 8th term, keep going until you reach position 8.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly changes the
picture and keeps focus while dragged. The highlight and bracket sit
under the right two terms and move along as terms are added. Rows of up
to eight boxes, and the two rows on screen 3, fit at 375 px (they wrap or
shrink, they don't scroll sideways). No highlight or working appears on a
card before the pupil answers it. Four options on every choice, each
wrong one with its own feedback that fits that choice, and the right one
with feedback that isn't just its label again. Every method a question
uses is taught in Learn. Typed answers accept `-1` and `−1`. Reload, Back
and Practise again work. The `dist/` lesson's last button reaches the
homepage, and the homepage shows "Fibonacci-type sequences" after
"Finding the nth term".

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests, does the browser review at
  desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (e.g. `fibonacci.js`) exposes
  one object on `window` (e.g. `window.Fibonacci`) with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - `extend(first, second, count)`: the first `count` terms of the
    Fibonacci-type sequence starting `first, second`

  Every card config also carries `start: [a, b]` (its first two terms),
  `terms` (the terms shown) and `asked` (the positions asked for, e.g.
  `[5]` or `[3, 4]`), so a test can recompute every answer. Choice cards
  that ask something else carry `asked: 'pair' | 'which' | 'wrong-term'`.
  Card configs use the shared card fields (`input`, `prompt`, `options`
  with `label`/`correct`/`feedback`, `answer`, `fields`, `rules`,
  `fallback`, `feedback`, `questionType`).
- **Commit** (one commit): the lesson folder, the `skills.json` and
  `curriculum.json` changes, this spec file (copy it from the main
  checkout's `docs/`), and the rebuilt `dist/`. Message: "Add
  Fibonacci-type sequences lesson". Push the branch. Never open a PR or
  merge until a signed Claude message says Umar approved.

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

- **Removed the exam board.** The draft named AQA and its codes A23 and
  A24; the site never names exam boards.
- **Learn asks nothing.** The draft's "Your turn" (tap two terms, type 31)
  was a question inside Learn. Learn now only teaches, with sliders; the
  same idea is Try it 2–4 (ground rules 2–3).
- **Linked to the nth term** (Learn 3, Try it 6, `which-is-fib`): a
  Fibonacci-type sequence has no nth term like 3n − 1, because its gaps
  change. That's why you count along to find the 8th term.
- **Added negative and repeated starts** (Learn 5, Try it 8–9, Check 5),
  which exam questions use.
- **Tap-to-choose the pair** became a four-option choice ("Which two terms
  do you add?", Try it 2 and the `spot-wrong` type). The engine has no
  tap-a-term card, and the one-button rule stays.
- **Every choice has four options** with feedback for each wrong one. The
  draft's Check had two and three options.
- **Practice is a generator** (rule 7), mixing choice and typed (rule 6).
  The draft's six fixed questions became `next-term`, `next-two` and
  `kth-term`. Bank card `sequences-08` became `next-two-choice`.
- **Two-part Check questions are now one card each.** "Is Sam correct?"
  then "Which calculation?" became one "Is Sam right?" choice with the
  working in the options. Mia's question asks for the right last term.
- **Removed the button and timing notes** ("Check answer", "Continue",
  "keep answers hidden"): the engine owns the button and feedback.
- **Square, cube and triangular numbers** stay in the `special-sequences`
  placeholder, whose subtitle now leaves out Fibonacci.
- **Bank card not used:** `sequences-09` works backwards from the 4th and
  5th terms to the 1st. That's a different method; it could be a later
  extension.
- I checked every number in the draft: all answers are right.
