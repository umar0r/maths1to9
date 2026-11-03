# Converting metric units: lesson spec

A new lesson, `converting-metric-units`, with one skill:
`convert-standard-units`. It teaches one idea: **the thing you measure
doesn't change, only the unit does. Going to a smaller unit, you need
more of them, so multiply. Going to a bigger unit, you need fewer, so
divide. The ladder tells you by how much (10, 100 or 1000).**

Source: Umar's pasted "Measures" plan (2026-10-31). That plan teaches
metric units, imperial units with a given rate, "will it fit?" problems,
ordering and size sense, with extra sections (hook, Method, faded
rounds, explorations, quick-fire). This lesson keeps metric conversions
for length, mass and capacity, and folds the rest into the four
sections. See "Changes from the draft". Question shapes and mistakes come
from our exam bank (`docs/exam-bank/bank/units-and-conversions.json`,
cards 01, 02, 03, 04 and 09), reworded with new numbers and settings.

## Before you start

- Make `codex/converting-metric-units` from **`origin/main`**, in its own
  worktree, `.worktrees/converting-metric-units`.
- **Example lessons:** copy the engine wiring, the helper `.js` on
  `window`, the seeded Practice generator with `cleanRules`, and the
  Check from `content/time-between-two-times/`. Copy the `aria-pressed`
  tap buttons from `content/speed-distance-time/`. **Don't copy any
  slider.** This lesson has none.
- **Numbers.** Show every number without float noise (`0.045`, never
  `0.045000000000000005`): round to 6 decimal places, then drop
  trailing zeros. Write 4-digit numbers without a space (`2400`) and 5 or
  more digits with a space every three (`45 000`). Typed answers accept
  `2400` and `2 400`.
- Don't change shared files (`assets/`, `content/_template/`). If the
  lesson needs something the engine doesn't have, stop and ask.

## Registration

1. `content/curriculum.json`, in "Ratio, proportion and rates of change",
   the `units-and-conversions` placeholder becomes two entries. First
   the new lesson:

   ```json
   {"folder":"converting-metric-units","title":"Converting metric units","subtitle":"Smaller unit: multiply. Bigger unit: divide.","skills":["convert-standard-units"]},
   ```

   then straight after it, the placeholder (same folder name, no folder
   yet) keeps the other three skills:

   ```json
   {"folder":"units-and-conversions","title":"Area, volume and speed units","subtitle":"Convert units of area, volume and speed.","skills":["convert-area-volume-units","convert-compound-units","speed-unit-conversions"]},
   ```

2. Nothing else changes in `curriculum.json`, `skills.json` or
   `collections.json`.

## How it should feel

**Every Learn screen has three parts, in this order:**
1. **What it is:** the rule in one or two plain sentences.
2. **An example:** a real object with a real measurement (a shelf, a
   phone, a bag of flour), worked out.
3. **The pupil does the steps:** they tap the ladder, an arrow or a
   label to do each step of that example. Each tap adds one line of
   working and visibly changes the picture.

**No sliders, anywhere.** Nothing where the pupil drags something just
to watch a number change.

- **The ladder.** This is the anchor for the whole lesson. A short
  vertical ladder with the length units on its rungs, biggest at the
  top: `km`, `m`, `cm`, `mm`. Between each pair, on the right, a
  green arrow pointing down with its number (`× 1000`, `× 100`, `× 10`),
  and on the left an orange arrow pointing up (`÷ 1000`, `÷ 100`, `÷ 10`).
  Learn 6 uses short two-rung ladders for mass (`kg`, `g`) and
  capacity (`litres`, `ml`), both `× 1000` and `÷ 1000`. The rungs and
  arrows the pupil can tap are buttons. When one is used, it lights up;
  the rest fade to grey.
- **The place value grid.** Columns `Thousands`, `Hundreds`, `Tens`,
  `Ones`, `.`, `tenths`, `hundredths`, `thousandths` (headings `Th H T O
  . t h th` at 375 px). Two rows: the number before (top) and after
  (bottom). Each digit sits in its own box. When the pupil taps an
  arrow, the digits in the bottom row slide left (times) or right
  (divide) to their new columns; the decimal point never moves. Empty
  columns stay blank, except the 0 needed in the ones column (`0.045`).
- **Colours, the same on every screen:** **green** = times (down the
  ladder, to a smaller unit). **Orange** = divide (up the ladder, to a
  bigger unit). **Blue** = unit names. **Grey** = everything else. The
  working lines use the same colours.
- **Taps:** every tappable thing is a real `<button>` with
  `aria-pressed` where it stays on. A tap that's out of order changes
  nothing and the line under the picture says what to tap first (for
  example "Start at mm: tap the ÷ 10 arrow first."). Tapping the first
  step again starts the example over. There's no reset button and no
  second main button.
- **Movement:** 300 ms CSS transitions; jump straight to the end with
  `prefers-reduced-motion`. Build each picture once, then change only
  positions, labels and working text.
- Every Learn screen's taps are saved and come back on reload and Back.
- At 375 px nothing scrolls sideways and no label overlaps another.

## Wording rules for the whole lesson

- **Say exactly what you mean.** Name the thing and the number every
  time: "the shelf is 3.2 m long", "times 3.2 by 100", "the answer
  gets bigger". Never "the number changes", "this one", "it",
  "do the step" or "a conversion".
- **Every new word gets what it means AND an example**, the first time:
  - **unit** (Learn 1): "A unit is what you measure in. cm, kg and ml
    are all units."
  - **metric** (Learn 2): "Metric units are the ones that go up in 10s,
    100s and 1000s: mm, cm, m and km are all metric."
  - **mass** and **capacity** (Learn 6): "Mass is how heavy something
    is, like a 1.35 kg bag of flour. Capacity is how much liquid
    something holds, like a 0.6 litre jug."
- Say "smaller unit", "bigger unit", "you need more of them", "you need
  fewer of them", "times by", "divide by", "the ladder". Don't say
  "convert", "conversion factor", "scale factor" or "magnitude" on
  screen. The lesson title can say "Converting".
- Write units after numbers with a space: `320 cm`, `4.5 kg`,
  `750 ml`. Write "litres" in full (never a lone `l`, which looks like
  1).
- A calculator is allowed. Say so once, on Learn 3.
- Typed cards use the shared `unit` field (`unit: 'cm'`, `'kg'`, …) so the
  pupil types only the number.
- Read every line aloud as a 14-year-old would. If it needs reading
  twice, rewrite it.

## Learn (8 screens, all showing, nothing asked)

1. **Same length, different numbers.**
   - Introduction (first, before anything else): "In this lesson, you'll
     learn how to change a measurement from one unit to another. For
     example, you might measure a shelf in metres, but the plan for it
     is in centimetres. You need both in the same unit to check the
     shelf fits."
   - What it is: "A unit is what you measure in. cm, kg and ml are all
     units. When you change the unit, the thing you measured stays the
     same. Only the number changes."
   - Example: a pencil lying on a ruler. Three buttons under it, `mm`,
     `cm` and `m` (`aria-pressed`, starts on `cm`). Readout under the
     ruler: `15 cm`.
   - The pupil does: tap `mm`: the ruler's marks relabel every 10 mm
     (`0, 10, 20 … 150`) and the readout says `150 mm`. Tap `m`: the
     ruler shows `0` and `0.15` at the pencil's ends and the readout
     says `0.15 m`. The pencil never moves or changes size. The line
     under it says, for the chosen unit:
     - mm: "In millimetres the pencil is 150 mm. Millimetres are tiny, so
       you need lots of them."
     - cm: "In centimetres the pencil is 15 cm."
     - m: "In metres the pencil is 0.15 m. A metre is long, so you need
       only a small part of one."
2. **The ladder.**
   - What it is: "Metric units are the ones that go up in 10s, 100s and
     1000s: mm, cm, m and km are all metric. The ladder shows how they
     fit together. The biggest unit is at the top."
   - Example: the length ladder, and beside it a bar.
   - The pupil does: tap a gap between two rungs (three buttons, starts
     on m and cm):
     - km and m: the bar is labelled "1 km" and splits into 10 equal
       parts, each "100 m". Line: "1 km = 1000 m. That's about 10 football pitches
       end to end."
     - m and cm: the bar "1 m" splits into 100 thin marks, every tenth
       labelled `10`, `20` … `100`. Line: "1 m = 100 cm. A metre stick
       has 100 cm marked on it."
     - cm and mm: the bar "1 cm" (drawn wide) splits into 10 marks. Line:
       "1 cm = 10 mm. Look at a ruler: each cm has 10 small marks."
   - Callout: "Going down the ladder, the units get smaller, so you need
     more of them: times. Going up, the units get bigger, so you need
     fewer of them: divide."
3. **Down the ladder: times.**
   - What it is: "To change to a smaller unit, you times. A smaller unit
     means you need more of them, so the answer gets bigger."
   - Example: "A shelf is 3.2 m long. How long is it in centimetres?" The
     ladder and the place value grid, top row `3.2`.
   - The pupil does:
     1. Tap `cm` on the ladder. Line: "cm is below m, so cm is the
        smaller unit. You'll need more of them: times."
     2. Tap the green `× 100` arrow. The digits in the bottom row slide 2
        places left. Working (green): `3.2 × 100 = 320 cm`. Line: "Times
        by 100 moves every digit 2 places to the left."
   - Callout: "You can use a calculator, but it helps to see the digits
     move. Times by 10: 1 place. Times by 100: 2 places. Times by 1000:
     3 places."
4. **Up the ladder: divide.**
   - What it is: "To change to a bigger unit, you divide. A bigger unit
     means you need fewer of them, so the answer gets smaller."
   - Example: "A phone is 148 mm long. How long is it in centimetres?"
     Top row of the grid: `148`.
   - The pupil does:
     1. Tap `cm` on the ladder. Line: "cm is above mm, so cm is the
        bigger unit. You'll need fewer of them: divide."
     2. Tap the orange `÷ 10` arrow. The digits slide 1 place right.
        Working (orange): `148 ÷ 10 = 14.8 cm`.
     3. Tap the answer `14.8 cm`. Line: "Does it make sense? A phone
        about 15 cm long: yes."
   - Callout: "Always check. If you times by 10 by mistake, you get
     1480 cm. That's a phone nearly 15 metres long!"
5. **Two rungs: one at a time.**
   - What it is: "If the two units aren't next to each other on the
     ladder, go one rung at a time."
   - Example: "A screw is 35 mm long. How long is it in metres?"
   - The pupil does:
     1. Tap the orange `÷ 10` arrow (mm to cm). Working: `35 ÷ 10 =
        3.5 cm`.
     2. Tap the orange `÷ 100` arrow (cm to m). Working: `3.5 ÷ 100 =
        0.035 m`.
     Tapping `÷ 100` first: "Start at mm. Tap the ÷ 10 arrow first."
   - Callout (after step 2): "35 ÷ 10 ÷ 100 is the same as 35 ÷ 1000. So
     1 m = 1000 mm."
6. **Mass and capacity: always 1000.**
   - What it is: "Mass is how heavy something is, like a 1.35 kg bag of
     flour. Capacity is how much liquid something holds, like a 0.6 litre
     jug. Both change by 1000: 1 kg = 1000 g and 1 litre = 1000 ml."
   - Example, two side by side (one above the other on a phone): a
     kitchen scale reading `1.35 kg` with a kg/g ladder, and a jug filled
     to `0.6 litres` with a litres/ml ladder.
   - The pupil does:
     1. Tap the green `× 1000` arrow on the scale's ladder. The scale's
        reading changes to `1350 g`. Working: `1.35 × 1000 = 1350 g`.
     2. Tap the green `× 1000` arrow on the jug's ladder. The jug's label
        changes to `600 ml`. Working: `0.6 × 1000 = 600 ml`.
   - Callout: "Only length uses 10 and 100. Mass and capacity always use
     1000."
7. **Same unit before you compare.**
   - What it is: "You can't compare two lengths in different units by
     looking at the numbers. Change one so they're both in the same unit
     first."
   - Example: "Rope A is 1.65 m long. Rope B is 152 cm long. Which rope is
     longer?" Two bars, drawn to scale, labelled `1.65 m` and `152 cm`.
     Line: "152 looks bigger than 1.65. But look at the bars: Rope A is
     longer."
   - The pupil does:
     1. Tap Rope A's label. It changes to `165 cm`. Working (green):
        `1.65 × 100 = 165 cm`.
     2. Tap the gap at the end of Rope A. A bracket shows it. Working:
        `165 − 152 = 13 cm`. Line: "Rope A is 13 cm longer."
8. **Four steps, every time.**
   - What it is: "Use these four steps for every question."
   - Example: "Change 2.4 km into metres." The ladder, and four step
     cards in a column, each showing only its question at first:
     1. **Which unit is smaller?**
     2. **Times or divide?**
     3. **By how much?**
     4. **Does it make sense?**
   - The pupil does: tap the cards in order. Each one opens to show its
     answer and lights the ladder:
     1. "m is smaller than km." (the m rung lights)
     2. "Smaller unit, so you need more of them: times." (green)
     3. "1 km = 1000 m." `2.4 × 1000 = 2400 m` (green arrow lights)
     4. "2400 is bigger than 2.4. That's right: metres are smaller than
        km, so you need more of them."
     Tapping a card out of order: "Do step 1 first."

## Try it (10 cards: 5 choice, 5 typed)

Fading is by order: which way → down the ladder → up the ladder → mass
and capacity → two rungs → compare. Choice options are shuffled with the
seeded `random`. Each right answer shows the feedback in *italics* after
✓, which is the working, not the label again.

1. Choice: "A bag of sugar weighs 2 kg. You change 2 kg into grams. Is
   the answer bigger or smaller than 2?"
   - "Bigger than 2" ✓ *"Grams are smaller than kilograms, so you need
     more of them. 2 × 1000 = 2000 g."*
   - "Smaller than 2" *"Grams are smaller than kilograms, so you need
     more of them, not fewer. The answer is 2000 g."*
   - "The same: 2" *"The bag weighs the same, but in grams the number
     is different. 2 kg = 2000 g."*
   - "1000 less than 2" *"Don't take away 1000. Grams are smaller, so
     you times by 1000: 2000 g."*
2. Typed, `unit: 'cm'`: "A shelf is 2.6 m long. How long is it in
   centimetres?" 260. Rules: 26 → *"1 m = 100 cm, not 10. Times by
   100."*; 2600 → *"That's in mm. 1 m = 100 cm, so times by 100."*;
   0.026 → *"cm are smaller than m, so you need more of them. Times, don't
   divide."* Fallback: *"cm are smaller than m. Times by 100."* Right:
   *"2.6 × 100 = 260 cm"*
3. Choice: "A bag of potatoes weighs 4500 g. How heavy is it in
   kilograms?"
   - `4.5 kg` ✓ *"kg are bigger than g, so you need fewer. 4500 ÷ 1000 =
     4.5"*
   - `45 kg` *"That divides by 100. 1 kg = 1000 g, so divide by 1000."*
   - `4 500 000 kg` *"kg are bigger than g, so you need fewer of them.
     Divide, don't times."*
   - `0.45 kg` *"That divides by 10 000. 1 kg = 1000 g, so divide by
     1000."*
4. Typed, `unit: 'cm'`: "A phone is 148 mm long. How long is it in
   centimetres?" 14.8. Rules: 1480 → *"cm are bigger than mm, so you need
   fewer of them. Divide."*; 1.48 → *"1 cm = 10 mm. Divide by 10, not
   100."*; 0.148 → *"That's in metres. 1 cm = 10 mm, so divide by 10."*
   Fallback: *"cm are bigger than mm. Divide by 10."* Right: *"148 ÷ 10 =
   14.8 cm"*
5. Choice: "A bottle holds 0.75 litres. How much is that in ml?"
   - `750 ml` ✓ *"ml are smaller, so you need more. 0.75 × 1000 = 750"*
   - `75 ml` *"That times by 100. 1 litre = 1000 ml."*
   - `7.5 ml` *"That times by 10. 1 litre = 1000 ml."*
   - `0.00075 ml` *"ml are smaller than litres, so you need more of them.
     Times, don't divide."*
6. Typed, `unit: 'm'`: "A walk is 3.25 km long. How far is it in metres?"
   3250. Rules: 325 → *"1 km = 1000 m, not 100. Times by 1000."*; 32.5 →
   *"1 km = 1000 m, not 10. Times by 1000."*; 0.00325 → *"m are smaller
   than km, so you need more of them. Times, don't divide."* Fallback:
   *"m are smaller than km. Times by 1000."* Right: *"3.25 × 1000 = 3250
   m"*
7. Typed, `unit: 'm'`: "A screw is 45 mm long. How long is it in metres?"
   0.045. Rules: 4.5 → *"That's in cm. Go up one more rung: cm to m is
   ÷ 100."*; 0.45 → *"Go one rung at a time. mm to cm is ÷ 10. Then cm to
   m is ÷ 100."*; 45 000 → *"m are bigger than mm, so you need fewer of
   them. Divide, don't times."* Fallback: *"Go up the ladder one rung at a
   time: ÷ 10, then ÷ 100."* Right: *"45 ÷ 10 = 4.5 cm. 4.5 ÷ 100 = 0.045
   m"*
8. Choice: "Cable A is 1.42 m long. Cable B is 128 cm long. Which is
   longer, and by how much?"
   - "Cable A, by 14 cm" ✓ *"1.42 m = 142 cm. 142 − 128 = 14 cm."*
   - "Cable B, because 128 is bigger than 1.42" *"128 is in cm, a smaller
     unit. Change to the same unit first: 1.42 m = 142 cm."*
   - "Cable A, by 0.14 cm" *"0.14 is the gap in metres, not cm. In cm it's
     14."*
   - "Cable B, by 126.58 cm" *"128 − 1.42 mixes up m and cm. Change 1.42 m
     into cm first."*
9. Typed, `unit: 'cm'`: "A book is 3.2 cm thick. Another book is 9 mm
   thick. How thick are the two books together, in cm?" 4.1. Rules: 12.2
   → *"9 mm isn't 9 cm. Change it first: 9 mm = 0.9 cm."*; 3.29 → *"9 mm
   is 0.9 cm, not 0.09 cm. 1 cm = 10 mm, so divide by 10."*; 41 → *"41 is
   the total in mm. Give your answer in cm."* Fallback: *"Change 9 mm into
   cm first. Then add."* Right: *"9 mm = 0.9 cm. 3.2 + 0.9 = 4.1 cm"*
10. Choice: "Sam says 0.6 m = 6 mm. What has Sam done wrong?"
    - "Sam has times by 10. 1 m = 1000 mm, so 0.6 m = 600 mm." ✓
      *"0.6 × 1000 = 600 mm. More than half a metre stick, which makes
      sense."*
    - "Nothing. Sam is right." *"6 mm is tiny, about the size of a grain
      of rice. 0.6 m is more than half a metre stick."*
    - "Sam should divide: 0.6 m = 0.0006 mm." *"mm are smaller than m, so
      you need more of them. Times, don't divide."*
    - "Sam should times by 100: 0.6 m = 60 mm." *"Times by 100 changes m
      into cm, not mm. 0.6 m = 60 cm = 600 mm."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Each session has all six types
once, in an order shuffled with the seeded `random` (as in
`time-between-two-times`'s `pick`). Each choice card has four different
options, shuffled with the seeded `random`. Every rule value must differ
from the answer and from every other rule; drop one that clashes and keep
at least one (copy `cleanRules`). No answer or rule is 0 or negative.
Every right answer gets its own feedback with the working.

**Unit pairs** (big unit, small unit, factor F, "wrong" factor W):

| Pair | Big | Small | F | W |
|---|---|---|---|---|
| `km-m` | km | m | 1000 | 100 |
| `m-cm` | m | cm | 100 | 10 |
| `cm-mm` | cm | mm | 10 | 100 |
| `kg-g` | kg | g | 1000 | 100 |
| `l-ml` | litres | ml | 1000 | 100 |

**Settings**, one per pair, for the typed cards: km-m "A cycle route is
… long."; m-cm "A table is … long."; cm-mm "A pencil is … long."; kg-g
"A bag of rice weighs …"; l-ml "A jug holds …". The question ends "How
long is it in <small/big unit name>?", "How heavy is it in …?" or "How
much is that in …?". Unit names in words: kilometres, metres,
centimetres, millimetres, kilograms, grams, litres, millilitres (ml).

| Type | Card | Builds |
|---|---|---|
| `which-way` | choice | Any pair, either direction (half the time big → small). "You change a length (mass, amount of liquid) from <from> into <to>. What do you do?" Options: "Times by F" , "Divide by F", "Times by W", "Divide by W". The right one is "Times by F" going to the small unit, "Divide by F" going to the big unit. Right: *"<to> are smaller (bigger) than <from>, so you need more (fewer) of them. 1 <big> = F <small>."* Wrong way, right factor: *"<to> are smaller (bigger) than <from>, so you need more (fewer) of them. Times (Divide), don't divide (times)."* Right way, wrong factor: *"1 <big> = F <small>, not W."* Wrong way and wrong factor: *"Two things to fix. <to> are smaller (bigger), so times (divide). And 1 <big> = F <small>."* |
| `down` | typed, `unit` = the small unit | Big → small. v has 1 or 2 decimal places, from 0.05 to 9.95 (for km-m, kg-g, l-ml) or from 0.5 to 99.5 (m-cm, cm-mm), and v is not a whole number that ends in 0 (so the digits really move). Answer v × F. Rules: v × W (*"1 <big> = F <small>, not W. Times by F."*), v ÷ F (*"<small> are smaller than <big>, so you need more of them. Times, don't divide."*). |
| `up` | typed, `unit` = the big unit | Small → big. v is a whole number from 2 to 9999 (or 1 decimal place for cm-mm), not a multiple of F × 10. Answer v ÷ F. Rules: v × F (*"<big> are bigger than <small>, so you need fewer of them. Divide, don't times."*), v ÷ W (*"1 <big> = F <small>, not W. Divide by F."*). |
| `two-rungs` | typed | Only mm ↔ m. Half the time "A screw (wire, strip of tape) is v mm long. How long is it in metres?" v from 5 to 2500, not a multiple of 1000: answer v ÷ 1000, `unit: 'm'`. Rules: v ÷ 10 (*"That's in cm. Go up one more rung: cm to m is ÷ 100."*), v ÷ 100 (*"Go one rung at a time: ÷ 10, then ÷ 100."*), v × 1000 (*"m are bigger than mm, so you need fewer. Divide."*). The other half "… is v m long. How long is it in millimetres?" v with 1 to 3 decimal places from 0.005 to 2.5: answer v × 1000, `unit: 'mm'`. Rules: v × 10 (*"That only goes down one rung. m to mm is × 100, then × 10: × 1000 in all."*), v × 100 (*"That only goes down to cm. Go down one more rung: cm to mm is × 10."*), v ÷ 1000 (*"mm are smaller than m, so you need more. Times."*). |
| `same-as` | choice | Any pair, either direction. "Which is the same as v <from>?" Options: the right answer (*"… so times (divide) by F. v × F = …"*), v × W or v ÷ W (the wrong factor, same direction: *"1 <big> = F <small>, not W."*), the wrong direction with F (*"<to> are smaller (bigger), so you need more (fewer). Times (Divide)."*), and the wrong direction with W (*"Wrong way and wrong amount. 1 <big> = F <small>."*). Each option shows its unit. |
| `compare` | choice | One amount in the big unit, one in the small unit, so the small-unit number always looks bigger but is less. Length (m-cm): "Rope A is a m long. Rope B is b cm long. Which rope is longer, and by how much?" a from 1.05 to 4.95 (2 dp), d from 3 to 40, b = 100a − d. Mass (kg-g): "Bag A weighs a kg. Bag B weighs b g. Which bag is heavier, and by how much?" Capacity (l-ml): "Bottle A holds a litres. Bottle B holds b ml. Which bottle holds more, and by how much?" For mass and capacity a from 1.2 to 4.8 (1 dp), d from 50 to 450 in steps of 50, b = 1000a − d. Options: "A, by d <small>" ✓ (*"a <big> = aF <small>. aF − b = d."*), "B, because b is bigger than a" (*"b is in <small>, a smaller unit. Change to the same unit first: a <big> = aF <small>."*), "A, by d ÷ F <small>" (*"d ÷ F is the gap in <big>, not <small>. In <small> it's d."*), "B, by b − a <small>" (*"b − a mixes up the two units. Change a <big> into <small> first."*). Use the setting's words in each option ("Rope A, by 14 cm"). |

## Check (6 fixed questions: 3 choice, 3 typed)

1. Typed, `unit: 'ml'`: "A bottle of squash holds 1.25 litres. How much
   is that in ml?" 1250. Rules: 125 → *"1 litre = 1000 ml, not 100. Times
   by 1000."*; 12.5 → *"1 litre = 1000 ml, not 10. Times by 1000."*;
   0.00125 → *"ml are smaller than litres, so you need more of them.
   Times, don't divide."* Fallback: *"ml are smaller than litres. Times by
   1000."* Right: *"1.25 × 1000 = 1250 ml"*
2. Choice: "A parcel weighs 850 g. How heavy is it in kilograms?"
   - `0.85 kg` ✓ *"kg are bigger, so you need fewer. 850 ÷ 1000 = 0.85"*
   - `8.5 kg` *"That divides by 100. 1 kg = 1000 g, so divide by 1000."*
   - `85 kg` *"That divides by 10. 1 kg = 1000 g, so divide by 1000."*
   - `850 000 kg` *"kg are bigger than g, so you need fewer of them.
     Divide, don't times."*
3. Typed, `unit: 'km'`: "One lap of a running track is 400 m. How far is
   that in kilometres?" 0.4. Rules: 400 000 → *"km are bigger than m, so
   you need fewer of them. Divide, don't times."*; 4 → *"1 km = 1000 m,
   not 100. Divide by 1000."*; 40 → *"1 km = 1000 m, not 10. Divide by
   1000."* Fallback: *"km are bigger than m. Divide by 1000."* Right:
   *"400 ÷ 1000 = 0.4 km"*
4. Choice: "Which list is in order, shortest first?"
   - "950 m, 1150 m, 1.2 km" ✓ *"1.2 km = 1200 m. So the order is 950 m,
     1150 m, 1200 m."*
   - "1.2 km, 950 m, 1150 m" *"1.2 looks smallest, but it's in km. 1.2 km
     = 1200 m, the longest."*
   - "950 m, 1.2 km, 1150 m" *"1.2 km = 1200 m. That's more than 1150 m,
     so it goes last."*
   - "1.2 km, 1150 m, 950 m" *"That's longest first. The question asks
     for shortest first."*
5. Typed, `unit: 'mm'`: "A pencil is 17.5 cm long. How long is it in
   millimetres?" 175. Rules: 1.75 → *"mm are smaller than cm, so you need
   more of them. Times, don't divide."*; 1750 → *"1 cm = 10 mm, not 100.
   Times by 10."*; 17 500 → *"1 cm = 10 mm, not 1000. Times by 10."*
   Fallback: *"mm are smaller than cm. Times by 10."* Right: *"17.5 × 10 =
   175 mm"*
6. Choice: "A bag of flour weighs 1.5 kg. A bag of sugar weighs 1250 g.
   Which is heavier, and by how much?"
   - "The flour, by 250 g" ✓ *"1.5 kg = 1500 g. 1500 − 1250 = 250 g."*
   - "The sugar, because 1250 is bigger than 1.5" *"1250 is in g, a smaller
     unit. Change to the same unit first: 1.5 kg = 1500 g."*
   - "The flour, by 0.25 g" *"0.25 is the gap in kg, not g. In g it's
     250."*
   - "The sugar, by 1248.5 g" *"1250 − 1.5 mixes up kg and g. Change 1.5 kg
     into g first."*

**Summary** ("What you have learnt"):
- "The thing you measure doesn't change. Only the unit does."
- "Smaller unit: you need more of them, so times."
- "Bigger unit: you need fewer of them, so divide."
- "1 km = 1000 m. 1 m = 100 cm. 1 cm = 10 mm."
- "1 kg = 1000 g. 1 litre = 1000 ml."
- "Change to the same unit before you compare or add."

## The test contract

The helper `units.js` exposes one object, `window.MetricUnits`, with:

- `learnScreens`: the Learn screens' text
- `examples()`: the 10 Try it card configs
- `practiceTypes`: the six type names above
- `pick(random)`, `generate(item, random)`: the Practice generator,
  returning card configs
- `checks()`: the 6 Check card configs
- `prepare(question, random)`: shuffles a choice card's options
- `number(value)`: rounds away float noise and formats as above

Every card config also carries `values`: `{ amount, from, to, factor }`
(the number given, its unit, the unit asked for, and 10, 100 or 1000;
`null` for anything a card doesn't use) and `asked`: `'direction'`,
`'times'`, `'divide'`, `'two-rungs'`, `'same-as'`, `'compare'`, `'add'`,
`'order'` or `'mistake'`. Card configs use the shared card fields
(`input`, `prompt`, `options` with `label`/`correct`/`feedback`,
`answer`, `rules`, `fallback`, `feedback`, `unit`, `inputLabel`,
`questionType`).

In `lesson.json`, `assessment.question_types` maps all six Practice
types, `try-1` … `try-10` and `check-1` … `check-6` to
`convert-standard-units`. `score_activities` lists `step:interactive:0`
… `step:interactive:9`. `session_length` is 6.

The unit test `tests/converting-metric-units.test.cjs` follows
`tests/time-between-two-times.test.cjs` and also checks, over 500 real
32-bit seeds:
- every answer equals the amount times or divided by the right factor,
  worked out from `values`, and shows no float noise (at most 6 decimal
  places after `number()`);
- `down`, `up` and `two-rungs` answers really move the digits (the answer
  isn't the amount with zeros added or taken off the end of a whole
  number);
- `compare` cards: the small-unit number is bigger than the big-unit
  number, but the big-unit amount is more, and the gap is d;
- every choice card has four different options and one right one;
- no answer or rule is 0 or negative, and no rule equals the answer.

## What Claude checks at review

Learn 1 opens with the introduction and the pencil before anything is
asked. Every Learn screen says what the rule is, then works a real
example, and every tap does one real step of it with its own working
line. There are no sliders. The digits slide to their new columns (and
jump with reduced motion). Green means times and orange means divide on every screen. The
ladder, grid, labels and working fit at 375 px without overlapping or
scrolling sideways. Four options on every choice, each wrong one with its
own feedback, and the right one with feedback that isn't just its label.
Every method a question uses is taught in Learn. No number shows float
noise. Reload, Back and Practise again work. The homepage shows
"Converting metric units" just before the "Area, volume and speed units"
placeholder (hidden).

## Changes from the draft

- **One thing, not five.** The draft teaches metric units, imperial units
  with a given rate, "will it fit?" problems, putting lengths in order
  and size sense. This lesson keeps metric units for length, mass and
  capacity, plus changing to the same unit before comparing (Learn 7),
  which every comparison needs.
- **Left out:** imperial units and other given rates (inches, miles,
  pounds, money with an exchange rate). They use "times or divide by the
  rate you're given", which is a second idea, and fit a later lesson.
  Tonnes and cm³ = ml are also left out: they're new facts, not new
  steps, and cm³ belongs with the volume units in the placeholder.
  Converting hours and minutes is in `time-between-two-times`.
- **No exam board.** The draft named an exam board and its codes.
- **New slug.** The draft's `measures-converting-units` becomes
  `converting-metric-units`, splitting the `units-and-conversions`
  placeholder.
- **Four sections only.** The hook, the five Learn cards, the Method
  (Size, Sign, Step, Sense) and Explorations B and C all sit inside
  Learn's 8 screens: the pencil is Learn 1, the sliding decimal point is
  Learns 3 and 4, Size–Sign–Step–Sense is Learn 8, and "Line them up"
  became Check 4. No faded fill-in rounds, hint ladder, wardrobe
  animation, drag-and-drop sorting, quick-fire timer, tiers or KaTeX: the
  engine has none of these. Fading is kept by card order, and hints come
  as feedback after a wrong answer.
- **No sliders (Umar, 2026-11-03).** An earlier version of this spec
  moved every Learn picture with a slider. Now every Learn screen says
  what the rule is, gives a real example, and the pupil taps to do each
  step.
- **Learn asks nothing.** The hook's "Who is right?" and the micro-checks
  became Try it cards. Sam's 0.6 m = 6 mm is Try it 10.
- **Every choice has four options**, each wrong one a real mistake with
  its own feedback.
- **Practice draft question 5** (cartons of stock, rounding up) is left
  out: rounding up to whole containers is a second idea.
- I checked every answer and every wrong option in this spec.
