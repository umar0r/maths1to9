# Percentage multipliers: lesson spec

Built from the lesson template (`content/_template/`) and the shared
components. It fills the existing placeholder `percentage-multipliers`
(skills `decimal-multipliers` and `repeated-percentage-change`). It teaches
one method: **one multiplication does a percentage change**. 8% up is
× 1.08, 7% down is × 0.93, and the same change n times is × 0.93ⁿ.

Umar's draft ("Multipliers", ChatGPT, 2026-10-30) is the source. It has
been rewritten to the ground rules. It uses six cards from the local
question bank (`docs/exam-bank/bank/`): `percentage-multipliers-01`,
`-02`, `-03`, `-07`, `-08` and `percentage-change-06` (as a Practice
type). See "Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/percentage-multipliers` from
  **`origin/main`**, in its own worktree, e.g.
  `.worktrees/percentage-multipliers`. Symlink the main checkout's
  `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: this lesson has no graphs).
- **Closest example lessons:** `content/one-amount-as-a-percentage/` (the
  bar picture, sliders that change it, money answers, helper `.js` on
  `window`, generator, retained Check) and `content/fibonacci-sequences/`.
  Copy their patterns and look.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

None. The placeholder already exists in `curriculum.json` (folder
`percentage-multipliers`, skills `decimal-multipliers` and
`repeated-percentage-change`), both skills are in `skills.json`, and the
`fractions-decimals-and-percentages` collection already lists it. Change
nothing in those three files.

## How it should feel

Like a brilliant.org lesson: one idea per screen, a picture the pupil
moves, and the picture does the explaining. Text is two or three short
lines under it.

- **The bar.** One picture all lesson: a grey bar for the starting amount,
  labelled "100%" inside and the amount above ("£200"). An increase adds a
  **green** block on the right end, labelled with its percentage. A
  decrease shades the cut-off part **red** (striped, so it isn't colour
  alone) at the right end, and the bar after the cut is what's left. The
  multiplier is always shown in **blue**, in a pill: `× 1.08`. Keep these
  three colours for the whole lesson.
- **Movement.** When a slider or toggle changes the bar, the block grows
  or shrinks smoothly (a 250 ms CSS width transition). A bar that appears
  starts whole, then its cut or added part grows. With
  `prefers-reduced-motion`, jump straight to the end. Never rebuild the
  screen on a slider move: update the bar width, labels and working only,
  so the slider keeps focus while dragged.
- **The working line** under the bar updates live, as a chain:
  `100% + 8% = 108%` → `× 1.08` → `200 × 1.08 = 216`. On a phone it wraps
  onto separate lines; it never scrolls sideways.
- Controls are sliders and one **Up / Down** two-way toggle (with a
  clear selected state, `aria-pressed`). No buttons that look like the
  main button.

## Wording rules for the whole lesson

- "Multiplier" is new. On Learn 2 say once: "The number you multiply by
  is called the **multiplier**." After that, use it freely.
- Say "goes up by" / "increase" and "goes down by" / "decrease". Don't say
  "depreciation", "appreciation", "compound", "interest", "factor" or
  "scale factor".
- Displayed working uses `×` and has no full stop: `200 × 1.08 = 216`.
  Money as `£216` or `£7369.50` (always 2 decimal places when there are
  pence). Percentages as `8%`, no space. Powers with superscripts:
  `0.85³`.
- A calculator is allowed. Say so once, on Learn 1.
- Typed money cards use `inputLabel: 'Pounds (no £ sign)'` and
  `tolerance: 0.01`. Typed multiplier cards use
  `inputLabel: 'Multiplier'`. Typed percentage cards use
  `inputLabel: 'Percentage (no % sign)'`. Counts of things (birds,
  litres, people) use `inputLabel: 'Answer'` with the unit in the prompt.

## Learn (7 screens, all teaching, no questions)

Each screen has one picture the pupil controls. No control ever asks for
an answer. Each screen starts on the value given.

1. **Two shops.** A trainer costs £100 in two shops. Two bars, one above
   the other, labelled "Shop A: 10% off, then another 10% off at the
   till" and "Shop B: 20% off". Slider "Show the steps: 1 to 3" (starts on
   1).
   - Step 1: both bars full, "£100".
   - Step 2: Shop A loses a red 10% (`£10 off`, now £90). Shop B loses a
     red 20% (`£20 off`, now £80).
   - Step 3: Shop A loses another red block, visibly smaller than the
     first (`10% of £90 = £9 off`, now £81). A line under both: "Shop A:
     £81. Shop B: £80. Shop B is cheaper."

   Text: "Two 10% cuts sound like one 20% cut. They aren't the same. The
   second 10% is taken from £90, not £100. In this lesson you'll learn one
   number that does any percentage change in one step. You can use a
   calculator."
2. **The whole is 1.** One bar, "£200 = 100%". Slider "Percentage: 0% to
   100% in steps of 10" (starts on 100). The bar shades that part and
   shows `60% = 0.6` and `200 × 0.6 = 120`. At 100% it shows
   `100% = 1` and `200 × 1 = 200`, and a line: "Multiplying by 1 keeps
   all of it." Text: "To find a percentage of an amount, divide the
   percentage by 100 and multiply. The whole amount is 100%, and 100% is
   1. The number you multiply by is called the **multiplier**."
3. **Going up: add to 100%.** The £200 bar with a green block on the end.
   Slider "Increase: 0% to 50%" (starts on 8). The green block grows and
   the working shows `100% + 8% = 108%` → `× 1.08` →
   `200 × 1.08 = 216`. Text: "To increase by 8%, you keep all 100% and
   add 8% more. That's 108%, so the multiplier is 1.08." Callout: "8% is
   0.08, so 108% is 1.08. Not 1.8: that would be 180%."
4. **Going down: take away from 100%.** The same bar, with the red part
   cut off the end. Slider "Decrease: 0% to 50%" (starts on 7). Working:
   `100% − 7% = 93%` → `× 0.93` → `200 × 0.93 = 186`. Text: "To decrease
   by 7%, you take 7% away. 93% is left, so the multiplier is 0.93."
   Callout: "Don't multiply by 0.07. That finds the £14 you take off, not
   what's left."
5. **Up or down? Then multiply.** The bar now starts at "£240 = 100%". An
   **Up / Down** toggle (starts on Up) and a slider "Change: 0% to 50% in
   steps of 0.5" (starts on 12.5). Up draws green, Down draws red. Three
   numbered steps sit beside or under the bar and each lights up with its
   number filled in:
   1. **Up or down?** Up: add to 100%. Down: take away from 100%.
      (`100% + 12.5% = 112.5%`)
   2. **Make the multiplier.** Divide by 100. (`112.5% → 1.125`)
   3. **Multiply.** (`240 × 1.125 = 270`)

   A check line under the steps, always shown and changing with the
   toggle: "Up, so the answer must be more than £240 ✓" / "Down, so the
   answer must be less than £240 ✓". Text: "This works for any
   percentage, even ones with decimals."
6. **The same change again and again.** A car is worth £12 000. It loses
   15% of its value every year. Slider "Years: 0 to 5" (starts on 3).
   One bar per year, stacked downward, each shorter than the one above,
   with the red cut on each one visibly smaller than the last. Labels:
   "Year 1: £10 200", "Year 2: £8670", "Year 3: £7369.50", "Year 4:
   £6264.08", "Year 5: £5324.46". Working: `12 000 × 0.85 × 0.85 × 0.85`
   = `12 000 × 0.85³ = £7369.50` (the power matches the slider; at 0
   years show "£12 000, no change yet"). Text: "Each year you multiply by
   0.85 again. For 3 years, that's 0.85 three times: 0.85³. Type it on a
   calculator in one go." Callout: "Don't add the percentages. 3 years of
   15% is not 45% off. Each cut is taken from a smaller amount, like Shop
   A. Round only at the end." Years 4 and 5 show "(to the nearest penny)".
7. **Two different changes.** A coat costs £500. In a sale the price goes
   down 20%. Later the sale price goes up 10%. Slider "Show the steps: 1
   to 3" (starts on 1).
   - Step 1: the £500 bar.
   - Step 2: red 20% cut: `500 × 0.8 = 400`.
   - Step 3: a green 10% block added to the £400 bar (visibly shorter than
     the red cut): `400 × 1.1 = 440`.

   Working at step 3: `500 × 0.8 × 1.1 = £440`. Text: "Two changes? Use
   two multipliers, one after the other. You can multiply them straight
   away: 0.8 × 1.1 = 0.88." Callout: "It isn't back to £500. The 10% is
   taken from £400, which is smaller."

## Try it (10 cards: 4 choice, 6 typed)

1. Choice: "Which multiplier increases an amount by 8%?" `1.08` ✓ /
   `1.8` (*"1.8 is 180%. 8% is 0.08, so 108% is 1.08."*) / `0.08` (*"0.08
   only finds the 8%. Keep the 100% too: 108% is 1.08."*) / `0.92`
   (*"0.92 is for a decrease of 8%."*). Right: *"100% + 8% = 108%, and
   108% is 1.08."*
2. Typed: "Increase 75 by 8%." 81. Rules: 6 → *"That's just the 8%.
   Multiply by 1.08 to keep the 75 as well."*; 135 → *"That's 75 × 1.8.
   8% is 0.08, so use 1.08."*; 69 → *"That's a decrease. An increase
   makes it bigger."* Fallback: *"Use the multiplier 1.08."* Right:
   *"75 × 1.08 = 81"*
3. Choice: "Which multiplier decreases an amount by 7%?" `0.93` ✓ /
   `0.07` (*"0.07 finds the 7% you take off. What's left is 93%."*) /
   `0.7` (*"0.7 is 70%. 7% is 0.07."*) / `1.07` (*"1.07 is for an
   increase of 7%."*). Right: *"100% − 7% = 93%, and 93% is 0.93."*
4. Typed: "Decrease 450 by 12%." 396. Rules: 54 → *"That's the 12% you
   take off. Multiply by 0.88 to find what's left."*; 504 → *"That's an
   increase. A decrease makes it smaller."* Fallback: *"100% − 12% = 88%.
   Multiply by that."* Right: *"100% − 12% = 88%. 450 × 0.88 = 396"*
5. Typed, `inputLabel: 'Multiplier'`: "What is the multiplier for an
   increase of 35%?" 1.35. Rules: 0.35 → *"That's just the 35%. Add the
   100% you keep: 135%."*; 135 → *"135% is right. Now divide by 100 to
   get the multiplier."*; 0.65 → *"0.65 is for a decrease of 35%."*
   Right: *"100% + 35% = 135% = 1.35"*
6. Typed: "Increase 60 by 35%." 81. Rules: 21 → *"That's just the 35%.
   Multiply by 1.35."*; 39 → *"That's a decrease. Multiply by 1.35."*
   Right: *"60 × 1.35 = 81"*
7. Choice (bank `percentage-multipliers-01`): "A price goes down by 18%.
   Then the new price goes down by 20%. Which single number can you
   multiply the first price by to get the final price?" `0.82 × 0.80 =
   0.656` ✓ / `1 − 0.18 − 0.20 = 0.62` (*"That adds the two
   percentages. The 20% is taken from the new, smaller price."*) /
   `1.18 × 1.20 = 1.416` (*"Those are multipliers for going up. Both
   changes go down."*) / `0.82 × 0.20 = 0.164` (*"0.20 finds the 20% taken
   off. What's left is 80%, so use 0.80."*). Right: *"Multiply the two
   multipliers: 0.82 × 0.80 = 0.656."*
8. Typed (bank `percentage-multipliers-02`): "Some stage lights are worth
   £3600. Their value goes down by 12% in the first year and by 25% in
   the second year. What are they worth after two years?" 2376. Rules:
   2268 → *"That takes 37% off in one go. The 25% is taken from the
   value after year 1."*; 5040 → *"Those are increases. The value goes
   down."*; 1224 → *"£1224 is how much value they lost. The question asks
   what they're worth."* Fallback: *"Use two multipliers: 0.88, then
   0.75."* Right: *"3600 × 0.88 × 0.75 = £2376"*
9. Choice: "A town has 8000 people. The number goes up by 4% every year.
   Which works out the number after 5 years?" `8000 × 1.04⁵` ✓ /
   `8000 × 1.2` (*"That adds 5 × 4% = 20%. Each year's 4% is of a bigger
   number."*) / `8000 × 1.04 × 5` (*"That multiplies by 5. Multiply by
   1.04 five times: 1.04⁵."*) / `8000 × 0.04⁵` (*"0.04 is only the 4%
   added. Keep the 100%: 1.04."*). Right: *"Multiply by 1.04 once for
   each year: 1.04⁵."*
10. Typed: "A wood has 1200 birds. The number goes down by 5% each year.
    How many birds are there after 3 years? Round to the nearest whole
    number." Answer 1029 with `tolerance: 0.15`, so 1028.85 is also
    right. Rules: 1020 → *"That takes 15% off once. Each year's 5% is
    taken from a smaller number. Work out 1200 × 0.95³."*; 1140 →
    *"That's only one year. Use 0.95³ for 3 years."*; 0.15 → *"0.05 is
    the part lost. 95% is left each year: use 0.95."* Right:
    *"1200 × 0.95³ = 1028.85, so about 1029 birds."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Each choice has four different
options, shuffled with the seeded `random`. Every rule value must differ
from the answer by more than the card's tolerance, and from every other
rule; drop one that clashes and keep at least two. Every right answer
gets its own feedback with the working. Test the generator with 32-bit
seeds, not small ones.

Percentages P come from these lists:
- **Whole numbers:** 2 to 40.
- **With a half:** 2.5, 12.5, 17.5.
- **Small (for the 1.8 slip):** 2 to 9.

| Type | Skill | Card | Builds |
|---|---|---|---|
| `find-multiplier` | `decimal-multipliers` | typed | "What is the multiplier for an increase / a decrease of P%?" P from whole numbers or with a half; up or down 50/50. Answer 1 + P/100 or 1 − P/100. Rules: P/100 (*"That's just the P%. Add it to / take it from 100% first."*), the other direction's multiplier (*"That's for an increase / a decrease."*), 100 ± P (*"That's the percentage. Divide by 100."*). |
| `which-multiplier` | `decimal-multipliers` | choice | "Which multiplier increases / decreases an amount by P%?" Up: P from small or with a half. Down: P from small. Right: the multiplier. Wrong: P/100 (*"That's only the P%."*), the other direction's multiplier (*"That's for a decrease / an increase."*), and the decimal slip (*"P% is P ÷ 100, so the multiplier is …"*): up, small P → 1 + P/10 (8% → 1.8); up, 2.5 → 1.25, 12.5 → 1.25, 17.5 → 1.75; down, small P → P/10 (7% → 0.7). |
| `single-change` | `decimal-multipliers` | typed | Start amount A: 20 to 5000, a multiple of 4 (so the answer has at most 2 decimal places for any P in the lists). Half the time bare ("Increase 360 by 15%."), half the time money ("A phone costs £360. Its price goes up by 15%. What is the new price?"), with `inputLabel: 'Pounds (no £ sign)'` and `tolerance: 0.01`. Answer A × multiplier. Rules: A × P/100 (*"That's just the change. Multiply by the multiplier to keep the rest too."*), A × the other multiplier (*"That's an increase / a decrease."*), and for small P going up, A × (1 + P/10) (*"P% is 0.0P, not 0.P."*). |
| `repeated-change` | `repeated-percentage-change` | typed | A whole-number P from 2 to 20, n from 2 to 5, up or down. Contexts: a car's value falls (money, A from 4000 to 30 000 in 500s); a house's value rises (money, 150 000 to 400 000 in 5000s); birds in a wood, people in a town (counts, 500 to 20 000). Prompt says "after n years". Money: answer A × mⁿ to 2 dp, `tolerance: 0.01`. Counts: "Round to the nearest whole number", answer the rounded value with `tolerance: 0.5`. Rules (rounded the same way): A × (1 ± nP/100) (*"That adds the percentages. Each year's change is of a new amount: use a power."*), A × m (*"That's only one year. Use a power for n years."*), A × (P/100)ⁿ (*"P/100 is only the part that changes. Use the multiplier m."*). |
| `which-calculation` | `repeated-percentage-change` | choice | Same contexts and numbers. "Which works out the value after n years?" Right: `A × mⁿ`. Wrong: `A × (1 ± nP/100)` written as a number, e.g. `8000 × 1.2` (*"That adds n × P%. Each year's change is of a new amount."*), `A × m × n` (*"That multiplies by n. Multiply by m, n times: mⁿ."*), `A × (P/100)ⁿ` (*"P/100 is only the change. Use the multiplier m."*). |
| `two-changes` | `repeated-percentage-change` | choice | From bank `percentage-change-06` and `percentage-multipliers-04`. A price A from 100 to 1000 in 20s. A cut of a% from 10, 15, 20, 25, then either a second cut of b% from 5, 10, 15 or a rise of b% from 5, 10, 20 (50/50). "A desk costs £A. Its price is cut by a%. Then the new price is cut by / goes up by b%. What is the final price?" Right: A × m₁ × m₂. Wrong: A × (1 − (a ± b)/100), i.e. adding the percentages (*"That changes the first price by a% and b% in one go. The b% is of the new price."*); A × m₁ (*"That's only the first change."*); A − A × m₁ × m₂, the amount it went down (*"That's how much the price has gone down altogether. The question asks for the final price."*). Money to 2 dp. Redraw if two options match. (Taking the second change from A gives the same number as adding the percentages, so it can't be a fourth option.) |

Each session has all six types once (3 choice, 3 typed), in a mixed order
picked with the seeded `random`.

## Check (5 fixed questions: 2 choice, 3 typed)

1. Choice (bank `percentage-multipliers-07`): "A kiln is worth £6400. Its
   value goes down by 20% in year 1. Then it goes down by 15% of the new
   value in year 2. Sam says it's worth £4160 now. Which reply is right?"
   ✓ *"No. It's worth £4352: 6400 × 0.80 × 0.85."* (*"Right. Sam added
   20% and 15%. The 15% is of the year-1 value."*) / *"Yes. 20% + 15% =
   35%, and 6400 × 0.65 = 4160."* (*"The 15% is taken from the value
   after year 1, not from £6400."*) / *"No. It's worth £4624."* (*"That
   takes 15% off in both years. Year 1 is 20%."*) / *"No. It's worth
   £4096."* (*"That takes 20% off in both years. Year 2 is 15%."*)
2. Typed (bank `percentage-multipliers-08`): "A tank holds 960 litres of
   water. Each day, 25% of the water left in it is used. How many litres
   are used on day 2?" 180. Rules: 240 → *"240 litres is 25% of 960. That
   was used on day 1."*; 540 → *"540 litres are left after day 2. The
   question asks how much is used that day."*; 720 → *"720 litres are
   left after day 1. Now find 25% of that."* Right: *"Day 1 leaves
   960 × 0.75 = 720 litres. Day 2 uses 25% of 720, which is 180
   litres."*
3. Typed: "A flat is worth £250 000. Its value goes up by 8% each year.
   What is it worth after 2 years?" 291600. Rules: 290000 → *"That adds
   16% in one go. Year 2's 8% is of a bigger value: use 1.08²."*; 270000
   → *"That's only one year. Use 1.08²."*; 41600 → *"£41 600 is how much
   it went up. The question asks what it's worth."* Right:
   *"250 000 × 1.08² = £291 600"*
4. Choice: "A school has 500 pencils. The number goes down by 13% each
   term. How many are left after 3 terms, to the nearest whole number?"
   329 ✓ (*"500 × 0.87³ = 329.25, so 329 pencils."*) / 305 (*"That takes
   39% off in one go. Each term's 13% is of a smaller number."*) / 435
   (*"That's only one term. Use 0.87³."*) / 1 (*"0.13 is the part that
   goes. 87% is left each term: use 0.87."*)
5. Typed (bank `percentage-multipliers-03`), `inputLabel: 'Percentage (no
   % sign)'`: "A club's members go up by 8% one year. The next year they
   go up by 15%. What is the increase over the two years, as a
   percentage?" 24.2. Rules: 23 → *"That adds 8 and 15. Multiply the
   multipliers: 1.08 × 1.15."*; 124.2 → *"124.2% is the new total. Take
   away the 100% you started with."*; 1.242 → *"1.242 is the multiplier.
   Turn it into an increase: 124.2% − 100%."* Right: *"1.08 × 1.15 =
   1.242. That's 124.2%, so a 24.2% increase."*

Summary points:
- Increase: add the percentage to 100%. Decrease: take it from 100%.
- Divide by 100 to get the multiplier: 108% → 1.08, 93% → 0.93.
- Multiply the amount by the multiplier, in one step.
- The same change n times: multiply by the multiplier to the power n.
  Don't add the percentages. Round only at the end.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). Learn 1
shows the two shops before anything is asked. Every slider and the Up /
Down toggle visibly change the bar, animate smoothly (and not with reduced
motion), and the slider keeps focus while dragged. Green, red and blue
mean the same thing on every screen. Five stacked bars on Learn 6 and the
working chains fit at 375 px with labels that don't overlap. Four options
on every choice, each wrong one with its own feedback that fits that
choice, and the right one with feedback that isn't just its label again.
Every method a question uses is taught in Learn. Typed answers accept
`1.08`, `7369.5`, `291,600` and `1028.85` where right. Reload, Back and
Practise again work. The `dist/` lesson's last button reaches the
homepage, and the homepage shows "Percentage multipliers" in its
curriculum place.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests, does the browser review at
  desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.**
- **The test contract.** The helper `.js` (`multipliers.js`) exposes one
  object, `window.PercentageMultipliers`, with:
  - `learnScreens`: the Learn screens' text (titles, lines, callouts,
    displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the
    Practice generator, returning card configs
  - `checks()`: the Check card configs
  - `multiplier(percent, direction)`: 1 + percent/100 for `'up'`, 1 −
    percent/100 for `'down'`, with no floating-point junk (0.93, not
    0.9299999)
  - `apply(amount, multipliers)`: the amount times each multiplier in the
    list, unrounded

  Every card config also carries `start` (the starting amount, or null),
  `changes` (a list of `{ percent, direction }`, one per change, so 3
  years of 15% down is three entries) and `asked`: `'multiplier'`,
  `'final'` (the amount after the changes), `'change'` (the amount or
  percentage that changed: Check 2 and 5), `'calculation'` (the answer is
  working: Try it 7 and 9, `which-calculation`) or `'mistake'` (Check 1). Card configs use the shared card fields (`input`, `prompt`,
  `options` with `label`/`correct`/`feedback`, `answer`, `rules`,
  `fallback`, `feedback`, `inputLabel`, `tolerance`, `questionType`).
- **Commit** (one commit): the lesson folder, this spec file (copy it
  from the main checkout's `docs/`), and the rebuilt `dist/`. Message:
  "Add percentage multipliers lesson". Push the branch. Never open a PR or
  merge until Umar approves in your chat.

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

- **Uses the existing placeholder.** The draft's slug was `multipliers`;
  the curriculum already has `percentage-multipliers` with the two right
  skills, so no registration changes.
- **Interest moved out.** Simple interest, compound interest and "find
  the interest" belong to the next placeholder, `growth-decay-and-interest`
  (skills `simple-interest`, `compound-growth-decay`). Keeping them here
  would make this two lessons. Draft card 5, Try it round 5, WE3, the
  `compound-total`, `compound-interest-only` and `simple-vs-compound`
  generators and the Explore staircase tab are left for that lesson.
  Repeated change stays (it's this lesson's second skill), in growth and
  decay settings without the word "interest".
- **Removed the exam board.** The draft named AQA and its codes R9 and
  R16. The site never names exam boards.
- **The hook doesn't ask.** The draft opened with "Which is cheaper: A, B
  or Same?". Ground rule 3 says the first screen shows before it asks, so
  Learn 1 shows the two shops step by step and states the result. The
  surprise is still the opening.
- **Learn asks nothing.** The draft's "micro-checks" were questions inside
  Learn. Each became a Try it card (15% up, 20% down, 5% for 4 years) or a
  Practice type.
- **No separate Method or Explore tabs.** The site has four sections. The
  Method's three steps and check line are Learn 5. Explore tab 1 is Learn
  3 to 5. The draft's worked examples are inside Learn: WE1 (£240 up
  12.5% = £270) is Learn 5's starting values, WE2 (£12 000 car, 15% a
  year, £7369.50) is Learn 6.
- **No fill-in-the-blanks faded rounds or hint ladder.** The engine has
  no partly filled cards and no hint button (hints come with feedback
  after a wrong answer). The fading is kept by order: Try it goes
  multiplier → one change → two changes → a power, and its targeted
  feedback is used word for word where it fit.
- **Every choice has four options** with feedback for each wrong one.
- **Rounding.** Money answers accept ±£0.01. Counts ask for the nearest
  whole number and also accept the exact decimal, as the draft wanted.
  "Right but not rounded, please round" isn't something the engine can
  say, so the exact value is simply marked right.
- **Added two-change questions** (Learn 7, Try it 7–8, `two-changes`,
  Check 1 and 5) from the bank. Exams ask these often, and they show the
  same "don't add the percentages" idea as the hook.
- **Wording:** "depreciation", "decay" and "compound" are out; "goes up /
  goes down" instead. "Multiplier" is explained the first time.
- I checked every number in the draft and this spec: all answers are
  right.
