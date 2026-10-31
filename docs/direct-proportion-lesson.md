# Direct proportion: lesson spec

Fills the existing placeholder `direct-proportion`. One skill:
`direct-proportion-numerical`. It teaches one idea: **when two amounts are
in direct proportion, find the value of one, then times by how many you
want.** It also shows how to tell when two amounts are *not* in direct
proportion (does 0 give 0? does 1 always cost the same?).

Source: Umar's pasted "Direct Proportion" plan (2026-10-31). That plan
teaches four things at once: the unitary method, best buys, graphs and
y = kx. Following "one thing at a time" this lesson keeps the first one
(and spotting proportion). See "Changes from the draft".

## Before you start

- Make `codex/direct-proportion` from **`origin/main`**, in its own
  worktree, `.worktrees/direct-proportion`.
- **Closest example lesson:** `content/percentage-multipliers/`. It has a
  picture moved by sliders that never rebuild the screen, the "Show the
  steps" slider, a helper `.js` on `window`, a seeded Practice generator
  and a Check with typed and choice cards. Copy its patterns and its
  engine wiring exactly.
- Don't change shared files (`assets/`, `content/_template/`). If the
  lesson needs something the engine doesn't have, stop and ask.

## Registration

1. `content/curriculum.json`, the `direct-proportion` entry becomes:

   ```json
   {"folder":"direct-proportion","title":"Direct proportion","subtitle":"Find the value of one, then times by how many you want.","skills":["direct-proportion-numerical"]},
   ```

   and straight after it, a new placeholder (no folder yet) holds the
   other two skills:

   ```json
   {"folder":"direct-proportion-graphs","title":"Direct proportion graphs and y = kx","subtitle":"Use a straight line through 0 and the rule y = kx.","skills":["direct-proportion-algebraic","direct-proportion-graphs"]},
   ```

2. `content/collections.json`, in the "Graphs" collection, the line
   `"direct-proportion",` becomes `"direct-proportion-graphs",`. This
   lesson has no graph, so it leaves the Graphs route.

Nothing else changes in `curriculum.json`, `skills.json` or
`collections.json`.

## How it should feel

Like a brilliant.org lesson: one idea per screen, a picture the pupil
moves, two or three short lines under it.

- **The picture: tiles and a bar.** A row of small square tiles, one per
  item (biscuit, pen, person). Each tile can show a short label inside it
  ("8p", "48p", "25 g"). Under the row, a price bar whose width grows with
  the total, with the total written on it. Tiles slide in and out and the
  bar grows (300 ms CSS width and opacity transitions). With
  `prefers-reduced-motion`, jump straight to the end.
- **Colours, the same on every screen:** **grey** = what the question
  gives you (the pack: "5 pens cost £2.40"). **Blue** = one ("1 pen costs
  £0.48"). **Green** = the answer for the number you want ("3 pens cost
  £1.44"). The working lines use the same colours: the ÷ line is blue, the
  × line is green.
- **Never rebuild the screen on a slider move.** Build the picture once,
  then change only widths, labels, tile count and working text, so the
  slider keeps focus while dragged.
- **Labels must fit at 375 px.** A tile shows its label only when the
  label fits inside it. If the tiles get too narrow, hide the tile labels
  and show the label once above the row instead ("48p each").
- **Money:** under £1 write pence (`45p`, `7.5p`); whole pounds have no
  pence (`£2`, `£28`); other amounts of £1 or more have 2 decimal places
  (`£1.44`, `£31.50`). Working may switch
  between them, as written below.

## Wording rules for the whole lesson

- Say "times by", "share", "the price of 1", "how many you want". Don't
  say "scale factor", "constant", "ratio", "quantity", "variable" or
  "proportional to".
- "Direct proportion" is new. Learn 2 explains it once, in plain words.
- "Unitary method" is new. Learn 3 explains it once: "Unit means one."
- A calculator is allowed. Say so once, on Learn 1.
- Typed money cards ask for **pounds**: `inputLabel: 'Pounds (no £ sign)'`,
  as in percentage multipliers. `0.25`, `.25` and `0.250` are all right.
  Typed amount cards use the shared `unit` field (`unit: 'g'`, `'km'`,
  `'pages'`) so the pupil types only the number.

## Learn (7 screens, all showing, nothing asked)

Each screen starts on the values given. No control asks for an answer.
Each screen: title, picture, slider (or none), working lines, text,
optional callout.

1. **The price of one biscuit.** One biscuit costs 8p. Slider "Biscuits:
   1 to 10" (starts on 1). The row shows that many blue tiles, each
   labelled "8p". The green price bar under it grows 8p per biscuit (full
   width = 80p) and shows the total. Working (green): `3 × 8p = 24p`
   (with the slider's number). At 10: `10 × 8p = 80p`.

   Text: "One biscuit costs 8p. Move the slider to buy more biscuits."
   "Each biscuit adds another 8p. The number of biscuits and the price go
   up together." "In this lesson, you'll learn how to use the price of one
   thing to work out the price of any number of them. You can use a
   calculator."

2. **Times both by the same number.** A recipe makes 4 pancakes with 2
   eggs. Slider "Pancakes: 4 to 20, in steps of 4" (starts on 4). Two
   bars: a pancakes bar (full width = 20 pancakes) and an eggs bar (full
   width = 10 eggs), so both are always the same length. A small badge
   `× 3` sits on the end of both bars (hidden at × 1). Working:
   `4 × 3 = 12 pancakes` and `2 × 3 = 6 eggs`.

   Text: "A recipe makes 4 pancakes with 2 eggs. To make 3 times as many
   pancakes, you need 3 times as many eggs." "When you times one amount by
   a number, you times the other amount by the same number. This is called
   direct proportion."

   Callout: "Don't add. 4 pancakes to 12 pancakes is × 3, not + 8. So the
   eggs go from 2 to 6, not 2 to 10."

3. **Find the price of one.** 5 pens cost £2.40. Slider "Pens you want:
   1 to 10" (starts on 3). Three rows, top to bottom:
   - grey: a pack of 5 tiles with one tag "5 pens: £2.40";
   - blue: the pack split into 5 single tiles, each "48p", with `÷ 5`
     between the rows;
   - green: as many tiles as the slider, each "48p", with `× 3` between
     the rows, and the green price bar with the total.

   Working: blue `£2.40 ÷ 5 = £0.48`, green `£0.48 × 3 = £1.44`.
   (1 to 10 pens: £0.48, £0.96, £1.44, £1.92, £2.40, £2.88, £3.36, £3.84,
   £4.32, £4.80.)

   Text: "5 pens cost £2.40. How much do 3 pens cost?" "There's no easy
   number to times 5 by to get 3. So first find the price of 1 pen: share
   £2.40 between 5 pens. Then times by the number of pens you want."

   Callout: "This is called the unitary method. Unit means one: you find
   the value of one first."

4. **Why adding doesn't work.** 4 biscuits cost 30p. How much do 6 cost?
   Slider "Show the steps: 1 to 3" (starts on 1).
   - Step 1: grey row of 4 tiles, tag "4 biscuits: 30p". Line: "6 is 2
     more than 4. Is the answer 30p + 2p = 32p? No. 2 more biscuits don't
     cost 2p."
   - Step 2: blue row of 4 single tiles, each "7.5p". Line (blue):
     `30p ÷ 4 = 7.5p`.
   - Step 3: green row of 6 tiles, each "7.5p", and the green bar. Line
     (green): `7.5p × 6 = 45p`.

   Text: "4 biscuits cost 30p. How much do 6 biscuits cost?" "It's easy
   to think you can add 2, because 6 is 2 more than 4. But you can't add
   the same number to biscuits and to pence. Find the price of 1 biscuit
   first."

   Callout (shows at step 3): "The 2 extra biscuits cost 2 × 7.5p = 15p.
   So 6 biscuits cost 30p + 15p = 45p ✓"

5. **Find one of what?** A cheesecake for 8 people needs 200 g of
   biscuits. Slider "People: 1 to 16" (starts on 14). Grey: 8 person tiles
   with tag "8 people: 200 g". Blue: one person tile, "25 g", with `÷ 8`.
   Green: as many person tiles as the slider, each "25 g", with the bar
   and total. Working: blue `200 g ÷ 8 = 25 g for 1 person`, green
   `25 g × 14 = 350 g`. (1 to 16 people: 25 g to 400 g, in 25s.)

   Text: "A cheesecake for 8 people needs 200 g of biscuits. How much do
   you need for 14 people?" "The question is about people, so find the
   amount for 1 person. Share the 200 g between 8 people. Then times by
   14."

   Callout: "Divide the right way round. You want grams for each person,
   so the grams go first: 200 ÷ 8 = 25 g. Not 8 ÷ 200."

6. **Is it direct proportion?** Stamps cost £2 each. A taxi costs £3 to
   get in, then £2 for each mile. Slider "How many: 0 to 5" (starts on 1).
   Two bars, both with full width = £13: "Stamps" (green) and "Taxi"
   (grey £3 part that never moves, then a green part that grows £2 a
   mile). Working, one line each (n is the slider's number):
   - Stamps: `3 stamps: 3 × £2 = £6` · `£6 ÷ 3 = £2 for each stamp`
   - Taxi: `3 miles: £3 + 3 × £2 = £9` · `£9 ÷ 3 = £3 for each mile`
   - At n = 0: `0 stamps: £0` and `0 miles: £3` (no ÷ part).
   - At n = 1: the taxi's ÷ part is `£5 ÷ 1 = £5 for each mile`.

   (Taxi per mile for 1 to 5: £5, £3.50, £3, £2.75, £2.60.)

   Text: "Stamps cost £2 each. A taxi costs £3 to get in, then £2 for each
   mile." "Move the slider. 2 stamps cost double 1 stamp. But a 2-mile
   taxi ride costs £7. That's not double £5." "In direct proportion, the
   price of 1 is always the same. For the taxi, it keeps changing."

   Callout: "Quick test: does 0 give 0? 0 stamps cost £0. A 0-mile taxi
   ride still costs £3. So the taxi price is not in direct proportion to
   the miles."

7. **Three steps, every time.** Question at the top: "6 eggs cost £1.20.
   How much do 10 eggs cost?" Slider "Show the steps: 1 to 3" (starts on
   1). Each step lights up (grey, then blue, then green) with its
   working:
   1. **Find one of what?** "You want 10 eggs, so find the price of 1
      egg."
   2. **Find one: divide.** `£1.20 ÷ 6 = £0.20`
   3. **Times by how many you want.** `£0.20 × 10 = £2`

   At step 3 a check line: "Check: 10 eggs is less than double 6 eggs, so
   the price is less than £2.40 ✓". Text: "Use these steps for every
   direct proportion question."

## Try it (10 cards: 5 choice, 5 typed)

Fading is by order: times both → find one → find one and times → spot
when it isn't direct proportion. Choice options are shuffled with the
seeded `random`. Each right answer shows the feedback in *italics* after
✓, which is the working, not the label again.

1. Choice: "A recipe for 4 pancakes uses 2 eggs. How many eggs do you need
   for 12 pancakes?"
   - `6` ✓ *"12 is 4 × 3, so times the eggs by 3: 2 × 3 = 6."*
   - `10` *"That adds 8, because 12 is 4 + 8. Don't add. 12 pancakes is 3
     times as many, so you need 3 times the eggs."*
   - `24` *"That times 2 by 12. 12 pancakes is 3 times 4 pancakes, so times
     the eggs by 3."*
   - `3` *"12 ÷ 4 = 3 tells you it's 3 times as many. Now times the 2 eggs
     by 3."*
2. Typed, money: "8 apples cost £2. What is the price of 1 apple?" 0.25.
   Rules: 4 → *"That's 8 ÷ 2, the wrong way round. You want pounds for
   each apple, so share the £2 between 8 apples: 2 ÷ 8."*; 16 → *"That
   multiplies. Share the £2 between 8 apples: divide."* Fallback:
   *"Share £2 between 8 apples."* Right: *"£2 ÷ 8 = £0.25. 1 apple costs
   25p."*
3. Choice: "5 pens cost £2.40. Which calculation finds the price of 1
   pen?"
   - `£2.40 ÷ 5` ✓ *"Share the £2.40 between the 5 pens."*
   - `5 ÷ £2.40` *"That's the wrong way round. You want pounds for each
     pen, so the pounds go first."*
   - `£2.40 × 5` *"That gives £12, the price of 25 pens. Divide to find the
     price of 1."*
   - `£2.40 − 5` *"You can't take pens away from pounds. Divide."*
4. Typed, money: "4 cinema tickets cost £18. How much do 7 tickets cost?"
   31.5. Rules: 21 → *"That adds 3, because you added 3 tickets. But 3
   more tickets cost more than £3. Find the price of 1 ticket first."*;
   4.5 → *"That's the price of 1 ticket. Now times it by 7."*; 126 →
   *"That times £18 by 7, which is the price of 28 tickets. Find the price
   of 1 ticket first."* Fallback: *"Find the price of 1 ticket: £18 ÷ 4."*
   Right: *"£18 ÷ 4 = £4.50 for 1 ticket. £4.50 × 7 = £31.50"*
5. Choice: "4 biscuits cost 30p. How much do 6 biscuits cost?"
   - `45p` ✓ *"30p ÷ 4 = 7.5p for 1 biscuit. 7.5p × 6 = 45p."*
   - `32p` *"That adds 2p because you added 2 biscuits. But each biscuit
     costs 7.5p, not 1p."*
   - `60p` *"That doubles 30p. 6 isn't double 4. Double 4 is 8 biscuits."*
   - `£1.80` *"That times 30p by 6, which is the price of 24 biscuits. Find
     the price of 1 biscuit first."*
6. Typed, `unit: 'g'`: "Pasta for 5 people needs 300 g. How much pasta do
   you need for 8 people?" 480. Rules: 303 → *"That adds 3, because 8 is
   5 + 3. Find the amount for 1 person first."*; 60 → *"That's the amount
   for 1 person. Now times it by 8."*; 2400 → *"That times 300 g by 8,
   which is enough for 40 people. Find the amount for 1 person first."*
   Fallback: *"Find the pasta for 1 person: 300 ÷ 5."* Right: *"300 ÷ 5 =
   60 g for 1 person. 60 × 8 = 480 g"*
7. Choice: "A taxi costs £3 to get in, then £2 for each mile. Is the price
   in direct proportion to the miles?"
   - "No: 0 miles still costs £3" ✓ *"In direct proportion, 0 miles would
     cost £0. This taxi charges £3 before it moves."*
   - "Yes: it goes up by £2 every mile" *"It does go up by £2 each mile.
     But it starts at £3, so 2 miles (£7) is not double 1 mile (£5)."*
   - "Yes: more miles cost more money" *"More miles do cost more. But in
     direct proportion, double the miles must cost double. 1 mile is £5
     and 2 miles is £7."*
   - "No: the price stays the same" *"The price does change with the
     miles. It isn't direct proportion because 0 miles still costs £3."*
8. Choice: "2 bags of sweets cost £6. 5 bags cost £15. 7 bags cost £22.
   Are the bags and the price in direct proportion?"
   - "No: 7 bags should cost £21" ✓ *"£6 ÷ 2 = £3 and £15 ÷ 5 = £3. 7 bags
     at £3 each would be £21, not £22."*
   - "Yes: 1 bag always costs £3" *"Check every one. 2 × £3 = £6 and
     5 × £3 = £15, but 7 × £3 = £21, not £22."*
   - "Yes: the price goes up when the bags go up" *"The price does go up.
     But divide each price by its bags. You get £3, £3 and then not £3.
     They must all be the same."*
   - "No: the bags don't go up in equal steps" *"The bags don't need to go
     up in equal steps. Divide each price by its bags. You should get the
     same price for 1 bag every time."*
9. Typed, money: "3 cans of drink cost £2.70. How much do 5 cans cost?"
   4.5. Rules: 4.7 → *"That adds £2, because you added 2 cans. Find the
   price of 1 can first."*; 0.9 → *"That's the price of 1 can. Now times it
   by 5."*; 13.5 → *"That times £2.70 by 5, which is the price of 15 cans.
   Find the price of 1 can first."* Fallback: *"Find the price of 1 can:
   £2.70 ÷ 3."* Right: *"£2.70 ÷ 3 = £0.90 for 1 can. £0.90 × 5 = £4.50"*
10. Typed, `unit: 'km'`: "A car uses 6 litres of petrol to go 72 km. How
    far can it go on 10 litres?" 120. Rules: 76 → *"That adds 4, because
    you added 4 litres. Find how far 1 litre goes first."*; 12 → *"That's
    how far 1 litre goes. Now times it by 10."*; 720 → *"That times 72 by
    10, which is how far 60 litres go. Find 1 litre first."* Fallback:
    *"Find how far 1 litre goes: 72 ÷ 6."* Right: *"72 ÷ 6 = 12 km on 1
    litre. 12 × 10 = 120 km"*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Each session has all six types
once, in an order shuffled with the seeded `random` (as in
`percentage-multipliers`' `pick`). Each choice card has four different
options, shuffled with the seeded `random`. Every rule value must differ
from the answer, and from every other rule; drop one that clashes and
keep at least one (copy `cleanRules` from `percentage-multipliers`).
Every right answer gets its own feedback with the working.

**Items** (pick one per card; singular and plural): pen/pens,
pencil/pencils, apple/apples, ticket/tickets, can of drink/cans of drink,
notebook/notebooks, bag of sweets/bags of sweets, sticker/stickers.
**Recipe things** (grams): flour, pasta, rice, sugar, oats, butter.

Below, `a` items cost total `T`; `u` is the price of 1 (`u = T ÷ a`);
`b` is how many you want. Money is in pounds in the maths, written with
the money rule above.

| Type | Card | Builds |
|---|---|---|
| `price-of-one` | typed, money | "6 notebooks cost £7.50. What is the price of 1 notebook?" u from 10p to £5 in steps of 5p; a from 2 to 12; T = a × u. Answer u. Rules: a ÷ T rounded to 2 dp (*"That's the wrong way round. You want pounds for each notebook, so share £T between a notebooks: T ÷ a."*), T × a (*"That multiplies. Share £T between a notebooks: divide."*). |
| `scale-price` | typed, money | "4 tickets cost £18. How much do 7 tickets cost?" u and a as above; b from 2 to 20, b ≠ a. Answer u × b. Rules: T + (b − a) (*"That changes the price by the same number as the items. Find the price of 1 first."*), u (*"That's the price of 1. Now times it by b."*), T × b (*"That times £T by b. Find the price of 1 first."*). |
| `scale-amount` | typed, `unit: 'g'` | "A recipe for 5 people needs 300 g of pasta. How many grams of pasta do you need for 8 people?" Amount for 1 person from 5 g to 100 g in steps of 5 g; a and b from 2 to 12, b ≠ a. Answer (1 person) × b. Rules: m + (b − a), the amount for 1, m × b, with feedback as `scale-price` but about people and grams. |
| `which-calculation` | choice | Half the time "a items cost £T. Which calculation finds the price of 1?": `£T ÷ a` ✓, `a ÷ £T`, `£T × a`, `£T − a` (feedback as Try it 3). Half the time "… Which calculation finds the price of b?": `£T ÷ a × b` ✓, `£T ÷ b × a` (*"That finds the price of 1 by sharing between b. You have the price of a items, so divide by a."*), `£T + (b − a)` (*"You can't add items to pounds. Find the price of 1 first."*), `£T × b` (*"That's the price of a × b items. Divide by a first."*). |
| `adding-trap` | choice | "4 biscuits cost 30p. How much do 6 biscuits cost?" a from 2 to 6; b = a + 1 to a + 4, b ≠ 2a; u whole pence from 6p to 40p, or a half (7.5p, 12.5p, 17.5p). With a half, a and b must both be even, so no price has half a penny. Right: u × b. Wrong: T + (b − a) pence (*"That adds the same number to the pence as to the items. Each one costs u, not 1p."*); T × 2 (*"That doubles the price, but b isn't double a."*); T × b (*"That times the price of a by b. Find the price of 1 first."*). Redraw if two options match. |
| `is-proportional` | choice | "2 bags of sweets cost £6. 5 bags cost £15. 7 bags cost £22. Are the bags and the price in direct proportion?" u whole pounds from 2 to 9; three different counts from 1 to 10, smallest first. Half the time all three prices are count × u (answer yes). Half the time the last price is count × u + d, d from 1 to 3 (answer no). See below for the options. |

**`is-proportional` options.** c3 is the last count, P3 its price in the
table.

When the answer is **yes**:
- "Yes: 1 bag always costs £u" ✓ *"£P1 ÷ c1, £P2 ÷ c2 and £P3 ÷ c3 all
  make £u."*
- "No: the bags don't go up in equal steps" *"They don't need to go up in
  equal steps. Divide each price by its bags. You get £u every time."*
- "No: c3 bags should cost £(P3 + 1)" *"Work it out: c3 × £u = £P3. That
  matches the table."*
- "Yes: the price goes up when the bags go up" *"The answer is yes, but
  not for that reason. A taxi price goes up too. Check that 1 bag costs
  the same every time."*

When the answer is **no**:
- "No: c3 bags should cost £(c3 × u)" ✓ *"£P1 ÷ c1 = £u and £P2 ÷ c2 =
  £u. c3 bags at £u each would be £(c3 × u), not £P3."*
- "Yes: 1 bag always costs £u" *"Check every one. c3 × £u = £(c3 × u),
  not £P3."*
- "Yes: the price goes up when the bags go up" *"The price does go up.
  But divide each price by its bags. They must all give the same price."*
- "No: the bags don't go up in equal steps" *"They don't need to. Divide
  each price by its bags. You should get the same price for 1 bag every
  time."*

## Check (6 fixed questions: 3 choice, 3 typed)

1. Typed, money: "7 notebooks cost £10.50. How much do 4 notebooks cost?"
   6. Rules: 7.5 → *"That takes £3 away because you took away 3 notebooks.
   Find the price of 1 notebook first."*; 1.5 → *"That's the price of 1
   notebook. Now times it by 4."*; 42 → *"That times £10.50 by 4. Find the
   price of 1 notebook first."* Fallback: *"£10.50 ÷ 7 is the price of 1
   notebook."* Right: *"£10.50 ÷ 7 = £1.50 for 1 notebook. £1.50 × 4 =
   £6"*
2. Choice: "Which of these is in direct proportion?"
   - "The price of petrol and the litres you buy" ✓ *"Twice the litres
     costs twice as much, and 0 litres costs £0."*
   - "A phone bill with a £10 monthly fee, and the minutes you use"
     *"0 minutes still costs £10. So it isn't direct proportion."*
   - "A gym that costs £20 to join, then £5 a visit" *"0 visits still costs
     £20 to join. So it isn't direct proportion."*
   - "A child's height and their age" *"A child who is twice as old isn't
     twice as tall."*
3. Typed, `unit: 'g'`: "A recipe for 6 flapjacks uses 150 g of oats. How
   many grams of oats do you need for 15 flapjacks?" 375. Rules: 159 →
   *"That adds 9 because you added 9 flapjacks. Find the oats for 1
   flapjack first."*; 25 → *"That's the oats for 1 flapjack. Now times it
   by 15."*; 2250 → *"That times 150 by 15. Find the oats for 1 flapjack
   first."* Fallback: *"150 ÷ 6 is the oats for 1 flapjack."* Right:
   *"150 ÷ 6 = 25 g for 1 flapjack. 25 × 15 = 375 g"*
4. Choice: "Ali says: '3 pizzas cost £18, so 5 pizzas cost £20.' What has
   Ali done wrong?"
   - "Added £2 for 2 more pizzas. 1 pizza is £6, so 5 cost £30." ✓
     *"£18 ÷ 3 = £6 for 1 pizza. £6 × 5 = £30."*
   - "Nothing. Ali is right." *"2 more pizzas cost more than £2. Find the
     price of 1 pizza: £18 ÷ 3 = £6."*
   - "Ali should times £18 by 5. 5 pizzas cost £90." *"£18 × 5 is the
     price of 15 pizzas. Find the price of 1 pizza first."*
   - "Ali should share £18 between 5. 5 pizzas cost £3.60." *"£3.60 would
     be the price of 1 pizza if 5 cost £18. But it's 3 pizzas that cost
     £18."*
5. Typed, `unit: 'pages'`: "A printer prints 90 pages in 6 minutes. How
   many pages does it print in 10 minutes?" 150. Rules: 94 → *"That adds
   4 because you added 4 minutes. Find the pages in 1 minute first."*;
   15 → *"That's the pages in 1 minute. Now times it by 10."*; 900 →
   *"That times 90 by 10. Find the pages in 1 minute first."* Fallback:
   *"90 ÷ 6 is the pages in 1 minute."* Right: *"90 ÷ 6 = 15 pages in 1
   minute. 15 × 10 = 150 pages"*
6. Choice: "3 kg of potatoes cost £4.50. 5 kg cost £7.50. 8 kg cost £12.
   Are the kg and the price in direct proportion?"
   - "Yes: 1 kg always costs £1.50" ✓ *"£4.50 ÷ 3, £7.50 ÷ 5 and £12 ÷ 8
     all make £1.50."*
   - "No: the kg don't go up in equal steps" *"They don't need to. Divide
     each price by its kg. You get £1.50 every time."*
   - "No: 8 kg should cost £12.50" *"Work it out: 8 × £1.50 = £12. That
     matches."*
   - "Yes: the price goes up when the kg go up" *"The answer is yes, but
     not for that reason. A taxi price goes up too. Check that 1 kg costs
     the same every time."*

**Summary** ("What you have learnt"):
- "Direct proportion: when you times one amount by a number, you times
  the other amount by the same number."
- "Don't add. 2 more biscuits don't cost 2p more."
- "Find the value of 1 first: divide. Then times by how many you want."
- "Divide the right way round. For the price of 1 pen, it's pounds ÷
  pens."
- "To test for direct proportion: 0 must give 0, and 1 must always cost
  the same."

## The test contract (for Claude's tests)

The helper `proportion.js` exposes one object, `window.DirectProportion`,
with:

- `learnScreens`: the Learn screens' text
- `examples()`: the 10 Try it card configs
- `practiceTypes`: the six type names above
- `pick(random)`, `generate(item, random)`: the Practice generator,
  returning card configs
- `checks()`: the 6 Check card configs
- `prepare(question, random)`: shuffles a choice card's options
- `money(pounds)`: the money rule (`0.45` → `45p`, `0.075` → `7.5p`,
  `1.44` → `£1.44`, `2` → `£2`)

Every card config also carries `values`: `{ count, total, want }` (a
items cost T, b wanted; `want: null` when it asks for the price of 1;
`null` for anything a card doesn't use) and `asked`: `'one'`, `'scaled'`,
`'calculation'`, `'proportional'` or `'mistake'`. Card configs use the
shared card fields (`input`, `prompt`, `options` with
`label`/`correct`/`feedback`, `answer`, `rules`, `fallback`, `feedback`,
`unit`, `inputLabel`, `questionType`).

In `lesson.json`, `assessment.question_types` maps all six Practice
types, `try-1` … `try-10` and `check-1` … `check-6` to
`direct-proportion-numerical`. `score_activities` lists
`step:interactive:0` … `step:interactive:9`. `session_length` is 6.

## What Claude checks at review

Learn 1 shows the biscuits before anything is asked. Every slider visibly
changes the picture, animates smoothly (and not with reduced motion), and
keeps focus while dragged. Grey, blue and green mean the same thing on
every screen. Labels and working fit at 375 px without overlapping or
scrolling sideways. Four options on every choice, each wrong one with its
own feedback, and the right one with feedback that isn't just its label.
Every method a question uses is taught in Learn. Reload, Back and
Practise again work. The homepage shows "Direct proportion" in its place.

## Changes from the draft

- **One idea, not four.** The draft teaches the unitary method, best
  buys, graphs and y = kx. This lesson keeps the unitary method and
  spotting direct proportion. Graphs and y = kx move to a new placeholder,
  `direct-proportion-graphs`, which keeps the draft's point dropper,
  k dial, exchange-rate crosshair and WE3/WE4. Best buys already belong
  to `ratio-problems` (skill `best-buys`): the rice, squash and milk
  questions go there.
- **No exam board.** The draft named AQA and its codes.
- **Four sections only.** The hook, the five Learn cards, the Method and
  the worked examples all sit inside Learn's 7 screens. No faded fill-in
  rounds, hint ladder, £/p toggle or KaTeX: the engine has none of these.
  Fading is kept by card order, and hints come as feedback after a wrong
  answer. Typed money is in pounds only.
- **Learn asks nothing.** The hook's "how much for 2 biscuits?", the
  micro-checks and the drag-to-sort became Try it cards (1, 2, 3, 5, 7, 8)
  and Practice types. The drag interactions (pack splitter, sort it)
  became sliders.
- **Every choice has four options**, each wrong one a real mistake with
  its own feedback.
- **No "two wrong drops back"** in Practice: the engine doesn't do it.
- I checked every answer and every wrong option in this spec.
