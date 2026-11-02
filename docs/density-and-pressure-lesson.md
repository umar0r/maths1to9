# Density and pressure: lesson spec

Fills the existing placeholder `density-and-pressure` (skills
`density-mass-volume` and `pressure-force-area`). It teaches one idea,
the same one as the speed lesson: **a compound unit tells you how much of
one thing there is in each one of another.** 8 g/cm³ means 8 g in each
cm³. 2000 N/m² means 2000 N pushing on each m². The triangle comes from
the unit, exactly as km/h gave the speed triangle.

Source: the second half of the revision guide page "Compound measures"
and Umar's pasted plan for it (2026-10-31). The first half became
`speed-distance-time` (PR #36). Density comes up about three times as
often as pressure in Foundation papers (density: 21 question parts in 19
of 32 sittings; pressure: 6 parts in 6 sittings), so density gets six
Learn screens and pressure two.

Uses these local question bank cards (`docs/exam-bank/bank/`, already
rewritten, not copied): `density-and-pressure-01`, `-02`, `-03`, `-06`
and `-14`.

## Before you start

- `git fetch origin`. Make `codex/density-and-pressure` from
  **`origin/main`**, in its own worktree,
  `.worktrees/density-and-pressure`. Symlink the main checkout's
  `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: no graphs here).
- **Closest example lesson: `content/speed-distance-time/`.** Copy its
  file layout, its Learn code (sliders that never rebuild the screen,
  `aria-pressed` tap buttons, the triangle, hash routes, saved state),
  its Try it and Check code, and its test file pattern. Its triangle
  (Learn 5 there) is copied here twice, for M/D/V and for F/P/A.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

One change, in `content/curriculum.json` only: the `density-and-pressure`
entry's subtitle becomes `"Work out density, mass, volume and
pressure."` (the old one says "compound measures", which pupils won't
know). Nothing else changes in `curriculum.json`, `skills.json` or
`collections.json`.

## How it should feel

Like the speed lesson: one idea per screen, a picture the pupil moves,
two or three short lines under it.

- **The blocks.** A volume is drawn as a tray of small squares, one per
  cm³, in rows of up to 6 (so 12 cm³ is 2 rows of 6). Each square is
  labelled with its mass ("8 g") when the label fits; if it doesn't, show
  the label once above the tray ("8 g in each cm³"), like the speed
  lesson's road. **Mass is green, volume is blue** (the squares' outline
  and the "cm³" labels). Wood squares are light brown, metal squares dark
  grey, so the material isn't shown by colour alone: each tray also has
  its name ("Wood", "Metal") above it.
- **Pressure** uses a strip of snow (light blue) with a person's feet on
  it: the contact area is a dark bar whose width grows with the area,
  and under it a dent whose depth shows the pressure. **Force is purple,
  area is blue, pressure is orange.**
- **The triangles** use the same colours as their letters: M green, D
  black, V blue; F purple, P orange, A blue.
- **Movement:** 300 ms CSS transitions; jump straight to the end with
  `prefers-reduced-motion`. Never rebuild the screen on a slider move.
  Working lines update live, wrap on a phone and never scroll sideways.

## Wording rules for the whole lesson

- New words, each explained once, the first time it's used:
  - **mass** (Learn 1): "Mass is how heavy something is. It's measured in
    grams (g) or kilograms (kg)."
  - **cm³** (Learn 1): "1 cm³ is a tiny cube, 1 cm long, 1 cm wide and
    1 cm tall."
  - **density** (Learn 2), **per** (Learn 2): "Per means 'in each'."
  - **newton**, **force**, **pressure** (Learn 7): "A force is a push. It's
    measured in newtons (N)." "Pressure is how much force pushes on each
    m²."
- Don't say "compound measure", "rate", "quantity", "unit rate" or
  "substance". Say "material" or name it (wood, metal, gold).
- Units: `g`, `kg`, `cm³`, `m³`, `g/cm³`, `N`, `m²`, `cm²`, `N/m²`,
  `N/cm²`. Write `8 g/cm³` with a space. Working uses `×` and `÷`, no
  full stop.
- A calculator is allowed. Say so once, on Learn 1.
- Typed cards use the shared `unit` field so the pupil types only the
  number.

## Learn (8 screens, all showing, nothing asked)

1. **Same size, different mass.** Two trays of blocks side by side (one
   above the other on a phone): "Wood: 0.5 g in each cm³", "Metal: 8 g in
   each cm³". Slider "Volume: 1 to 12 cm³" (starts on 6). Both trays show
   that many squares, each labelled with its mass. Totals under each:
   "Wood: 6 × 0.5 = 3 g", "Metal: 6 × 8 = 48 g". A line under both: "Same
   size. The metal is 16 times heavier, because each cm³ of metal is
   heavier."

   Text: "In this lesson, you'll learn how to work out density and
   pressure. You can use a calculator. Mass is how heavy something is.
   It's measured in grams (g) or kilograms (kg). 1 cm³ is a tiny cube,
   1 cm long, 1 cm wide and 1 cm tall. These two blocks are the same
   size. Move the slider and compare them."
2. **8 g/cm³ means 8 g in each cm³.** One tray. Slider "Density: 1 to 10
   g/cm³" (starts on 8) and slider "Volume: 1 to 12 cm³" (starts on 6).
   Working: `8 × 6 = 48 g`.

   Text: "Density tells you the mass of each cm³. 8 g/cm³ means 8 g in
   each cm³. You say it '8 grams per cubic centimetre'. Per means 'in
   each'. So 6 cm³ has a mass of 8 g six times: 8 × 6."
3. **Find the density: share it out.** Slider "Mass" over 24 to 240 in
   steps of 24 (starts on 72) and slider "Volume" over the values 1, 2,
   3, 4, 6, 8, 12 cm³ (starts on 12). The whole mass is shown first as one
   green bar, then it splits evenly into the squares. Working:
   `72 ÷ 12 = 6 g/cm³`. (Every setting gives a whole number.)

   Text: "Now turn it round. A stone has a mass of 72 g and a volume of
   12 cm³. Share the 72 g equally between the 12 cm³. Each cm³ gets 6 g,
   so the density is 6 g/cm³. Sharing is dividing: density = mass ÷
   volume."
4. **Find the volume: how many cm³ fit?** A green bar for 48 g. Slider
   "Density" over the values 1, 2, 3, 4, 6, 8, 12 g/cm³ (starts on 8).
   Squares of that mass are counted out of the bar one at a time, until
   it's used up. Working: `48 ÷ 8 = 6 cm³`.

   Text: "A metal block has a mass of 48 g. Its density is 8 g/cm³, so each
   cm³ is 8 g. How many 8 g pieces make 48 g? 48 ÷ 8 = 6. So the volume is
   6 cm³: volume = mass ÷ density." Callout: "A heavier material needs
   fewer cm³ to make the same mass."
5. **The triangle comes from the unit.** Copy the speed lesson's Learn 5.
   The chip `g/cm³` tips over into a fraction: g on top, cm³ underneath.
   The triangle: M on top, D and V underneath with `×` between. Tap
   buttons "M: Mass", "D: Density", "V: Volume" (starts with D covered).
   - M covered: `M = D × V` · `8 × 6 = 48 g` · "Side by side means times."
   - D covered: `D = M ÷ V` · `72 ÷ 12 = 6 g/cm³` · "One above the other
     means divide."
   - V covered: `V = M ÷ D` · `48 ÷ 8 = 6 cm³` · "One above the other means
     divide."

   Text: "g/cm³ means grams ÷ cm³: mass ÷ volume. So mass goes on top of
   the triangle. Density and volume sit underneath. Tap the one you want
   to find to cover it. The other two show you what to do." Callout: "You
   don't need to learn the triangle by heart. The unit tells you: g/cm³
   has g on top."
6. **Make the units match.** A row of kg bags, each split into 10 parts
   of 100 g. Slider "Mass: 0.5 to 3 kg in steps of 0.5" (starts on 1.5).
   The bags fill up. Working, three lines:
   `1.5 kg = 1.5 × 1000 = 1500 g` ·
   `Density: 2.5 g/cm³` ·
   `1500 ÷ 2.5 = 600 cm³`. Two chips: "1 kg = 1000 g", "kg to g: × 1000.
   g to kg: ÷ 1000".

   Text: "g/cm³ counts grams. So if the mass is in kg, change it to grams
   first: times by 1000." Callout: "Don't work out 1.5 ÷ 2.5. The density
   is in grams, so the mass must be in grams too."
7. **Pressure: force on each m².** The snow picture. "A person pushes
   down on the snow with a force of 600 N." Slider "Area touching the
   snow" over the values 0.05, 0.1, 0.15, 0.2, 0.25, 0.3 m² (starts on
   0.05). The contact bar widens and the dent gets shallower. Labels
   under the slider at 0.05 ("Boots") and 0.3 ("Snowshoes"). Working:
   `600 ÷ 0.05 = 12 000 N/m²`. (Every setting gives a whole number:
   12 000, 6000, 4000, 3000, 2400, 2000.)

   Text: "A force is a push. It's measured in newtons (N). Pressure is
   how much force pushes on each m². It's measured in N/m²: newtons per
   square metre. Pressure = force ÷ area." Callout: "Same force, bigger
   area, less pressure. That's why snowshoes stop you sinking."
8. **The pressure triangle.** The same triangle code: F on top, P and A
   underneath. The chip `N/m²` tips into N over m². Tap buttons "F:
   Force", "P: Pressure", "A: Area" (starts with P covered).
   - F covered: `F = P × A` · `2000 × 0.3 = 600 N`
   - P covered: `P = F ÷ A` · `600 ÷ 0.3 = 2000 N/m²`
   - A covered: `A = F ÷ P` · `600 ÷ 2000 = 0.3 m²`

   Text: "N/m² means newtons ÷ m²: force ÷ area. So force goes on top. It
   works just like the density triangle." Callout: "Sometimes the area is
   in cm². Then the pressure is in N/cm²."

## Try it (10 cards: 5 choice, 5 typed)

1. Choice: "Iron has a density of 7.9 g/cm³. What does this mean?"
   - "Each cm³ of iron has a mass of 7.9 g" ✓ *"Per means 'in each': 7.9 g
     in each cm³."*
   - "A block of iron has a mass of 7.9 g" *"7.9 g/cm³ doesn't tell you the
     mass of the whole block. It's the mass of each cm³."*
   - "A block of iron has a volume of 7.9 cm³" *"7.9 is a mass in grams,
     not a volume. It's the mass of each cm³."*
   - "Each gram of iron takes up 7.9 cm³" *"That's the wrong way round.
     g/cm³ means grams in each cm³."*
2. Typed, `unit: 'g'` (bank 02): "A metal block has a volume of 24 cm³.
   Its density is 7.5 g/cm³. What is its mass?" 180. Rules: 3.2 →
   *"That divides. Each of the 24 cm³ has a mass of 7.5 g, so multiply."*;
   31.5 → *"That adds. Mass = density × volume."* Fallback: *"Cover M:
   density × volume."* Right: *"7.5 × 24 = 180 g"*
3. Typed, `unit: 'g/cm³'`: "A stone has a mass of 96 g and a volume of
   12 cm³. What is its density?" 8. Rules: 1152 → *"That multiplies.
   Share the 96 g between the 12 cm³: divide."*; 0.125 → *"That's the
   wrong way round. Density = mass ÷ volume, so the mass goes first."*;
   84 → *"That takes 12 away. Divide the mass by the volume."* Fallback:
   *"Density = mass ÷ volume."* Right: *"96 ÷ 12 = 8 g/cm³"*
4. Choice: "A block has a mass of 50 g and a density of 2 g/cm³. Which
   calculation finds its volume?"
   - `50 ÷ 2` ✓ *"Volume = mass ÷ density. How many 2 g pieces make
     50 g?"*
   - `2 ÷ 50` *"That's the wrong way round. See how many 2 g pieces make
     50 g: 50 ÷ 2."*
   - `50 × 2` *"Multiplying gives 100, a mass bigger than the block.
     Cover V: mass ÷ density."*
   - `50 − 2` *"Taking away doesn't give a volume. Divide."*
5. Typed, `unit: 'cm³'` (bank 03): "A sample has a mass of 936 g. Its
   density is 2.6 g/cm³. What is its volume?" 360. Rules: 2433.6 →
   *"That multiplies. See how many 2.6 g pieces make 936 g: divide."*;
   936 → *"936 is the mass. Divide it by the density to get the volume."*
   Fallback: *"Cover V: mass ÷ density."* Right: *"936 ÷ 2.6 = 360 cm³"*
6. Choice: "Write 2.4 kg in grams."
   - `2400 g` ✓ *"1 kg is 1000 g. 2.4 × 1000 = 2400 g."*
   - `240 g` *"1 kg is 1000 g, not 100 g. Times by 1000."*
   - `24 g` *"1 kg is 1000 g. Times by 1000, not 10."*
   - `0.0024 g` *"That divides by 1000. To change kg to g, times by 1000."*
7. Typed, `unit: 'g/cm³'` (bank 01): "A solid has a mass of 1.62 kg and a
   volume of 180 cm³. What is its density in g/cm³?" 9. Rules: 0.009 →
   *"That uses the mass in kg. The density is in grams, so change 1.62 kg
   to 1620 g first."*; 291.6 → *"That multiplies. Density = mass ÷
   volume."* Fallback: *"Change the mass to grams first."* Right:
   *"1.62 kg = 1620 g. 1620 ÷ 180 = 9 g/cm³"*
8. Choice: "A box pushes down on the floor with a force of 300 N. Its base
   has an area of 2 m². What is the pressure?"
   - `150 N/m²` ✓ *"Pressure = force ÷ area. 300 ÷ 2 = 150 N/m²"*
   - `600 N/m²` *"That multiplies. Pressure is the force on each m², so
     divide."*
   - `298 N/m²` *"That takes 2 away. Divide the force by the area."*
   - `0.0067 N/m²` *"That's the wrong way round. Force ÷ area: the force
     goes first."*
9. Typed, `unit: 'N'`: "A crate presses on the floor with a pressure of
   40 N/m². Its base has an area of 3 m². What force does it push down
   with?" 120. Rules: 13.33 → *"That divides. 40 N pushes on each of the
   3 m², so multiply."*; 43 → *"That adds. Force = pressure × area."*
   Fallback: *"Cover F: pressure × area."* Right: *"40 × 3 = 120 N"*
10. Choice: "Ali says: 'A block has a mass of 2 kg and a density of
    0.8 g/cm³. Its volume is 2 ÷ 0.8 = 2.5 cm³.' What has Ali done
    wrong?"
    - "Ali didn't change 2 kg to grams. It's 2000 ÷ 0.8 = 2500 cm³." ✓
      *"The density is in grams, so the mass must be in grams: 2 kg =
      2000 g."*
    - "Nothing. Ali is right." *"Check it: 2.5 cm³ of this material has a
      mass of 2.5 × 0.8 = 2 g. That's not 2 kg."*
    - "Ali should multiply: 2 × 0.8 = 1.6 cm³" *"Multiplying finds a mass.
      Volume = mass ÷ density."*
    - "Ali divided the wrong way round: 0.8 ÷ 2 = 0.4 cm³" *"Volume = mass ÷
      density, so the mass goes first."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`, exactly as in the speed
lesson. Each choice has four different options, shuffled with the seeded
`random`. Every rule value must differ from the answer by more than the
card's tolerance, and from every other rule; drop one that clashes and
keep at least one. Redraw a choice card if two options match. Every right
answer gets its own feedback with the working.

**Materials** (pick one per density card, for the wording only): a block
of wood, a stone, a piece of plastic, a metal bar, a glass marble.

| Type | Skill | Card | Builds |
|---|---|---|---|
| `find-density` | density | typed | "A stone has a mass of 84 g and a volume of 12 cm³. What is its density?" Density d from 0.5 to 9.5 in steps of 0.5, volume V whole from 4 to 60, mass d × V. Answer d, `unit: 'g/cm³'`. Rules: m × V (*"That multiplies. Share the mass between the cm³: divide."*), m − V when positive (*"That takes the volume away. Divide the mass by the volume."*). |
| `find-mass` | density | typed | "A metal bar has a volume of 15 cm³. Its density is 7.5 g/cm³. What is its mass?" Same ranges. Answer d × V, `unit: 'g'`. Rules: V ÷ d to 2 dp (*"That divides. Each cm³ has a mass of d g, so multiply."*), d + V (*"That adds. Mass = density × volume."*). |
| `find-volume` | density | typed | From bank 03. Volume V from 10 to 600 in steps of 10, density d from 0.5 to 9.5 in steps of 0.1, mass V × d (at most 1 dp). Answer V, `unit: 'cm³'`. Rules: m × d to 2 dp (*"That multiplies. See how many d g pieces make m g: divide."*), m (*"That's the mass. Divide it by the density."*). |
| `which-calculation` | density | choice | One of mass, density, volume is unknown, the other two are given with numbers (density 2 to 9 whole, volume 2 to 12 whole, so no option is ever equal to another). As Try it 4. Unknown density: `m ÷ V` ✓, `V ÷ m`, `m × V`, `m − V`. Unknown volume: `m ÷ d` ✓, `d ÷ m`, `m × d`, `m − d`. Unknown mass: `d × V` ✓, `d ÷ V`, `V ÷ d`, `d + V`. Feedback as Try it 4: wrong way round / multiplying or dividing when it should be the other / can't add or take away a mass and a volume. If d equals V, redraw. |
| `kg-to-g` | density | choice | "A piece of plastic has a mass of 1.2 kg. Its density is 0.8 g/cm³. What is its volume?" Pick V from 50 to 2000 in steps of 50 and d from 0.5, 0.8, 1.2, 1.5, 2, 2.5, 4, 5, 8; mass in grams G = V × d, keep only G a multiple of 100 (so the kg has at most 1 decimal place). Right: `V cm³`. Wrong: kg ÷ d to 3 dp (*"That uses the mass in kg. The density counts grams, so change the kg to grams first: × 1000."*); 100 × kg ÷ d (*"1 kg is 1000 g, not 100 g."*); G × d (*"That multiplies. Volume = mass ÷ density."*). |
| `find-pressure` | pressure | typed | One of pressure, force, area is unknown (equal chance). Half the time in m²: area from 0.1, 0.2, 0.25, 0.4, 0.5, 2, 3, 4, 5, 8 m², pressure from 10 to 500 in steps of 10 N/m². Half the time in cm²: area 5 to 60 cm², pressure 2 to 20 N/cm². Force = pressure × area (at most 1 dp). Settings: a box on a floor, a machine pressing down, a chair leg, a person standing. `unit`: `N/m²`, `N/cm²`, `N`, `m²` or `cm²`. Rules: the swapped operation (× instead of ÷, or ÷ instead of ×) to 2 dp, the flipped division to 4 dp, and taking away or adding, each with feedback like Try it 8 and 9. |
| `pressure-calculation` | pressure | choice | As `which-calculation` but for force, pressure and area (pressure 10 to 90 in steps of 10, area 2 to 9 whole, in m²). Unknown pressure: `F ÷ A` ✓, `A ÷ F`, `F × A`, `F − A`. Unknown area: `F ÷ P` ✓, `P ÷ F`, `F × P`, `F − P`. Unknown force: `P × A` ✓, `P ÷ A`, `A ÷ P`, `P + A`. |

Each session: `find-pressure`, two of `find-density` / `find-mass` /
`find-volume`, and all three choice types (`which-calculation`,
`kg-to-g`, `pressure-calculation`), in a mixed order picked with the
seeded `random`. That gives every session 4 density and 2 pressure
cards, so both skills get marked questions.

## Check (6 fixed questions: 3 choice, 3 typed)

1. Choice (bank 06): "Two solids have the same density. Solid A has a mass
   of 90 g and a volume of 12 cm³. Solid B has a mass of 150 g. What is
   the volume of solid B?"
   - `20 cm³` ✓ *"A has a density of 90 ÷ 12 = 7.5 g/cm³. B has a volume of
     150 ÷ 7.5 = 20 cm³."*
   - `12 cm³` *"B has a bigger mass, so it can't have the same volume as A.
     Find the density first."*
   - `1125 cm³` *"That multiplies 150 by the density. Volume = mass ÷
     density."*
   - `0.05 cm³` *"That's the wrong way round. Divide the mass by the
     density: 150 ÷ 7.5."*
2. Choice (bank 14): "A metal sample has a mass of 1.85 kg and a volume
   of 250 cm³. Steel has a density of 7.8 g/cm³. Could the sample be
   steel?"
   - "No. Its density is 7.4 g/cm³, not 7.8 g/cm³." ✓ *"1.85 kg = 1850 g.
     1850 ÷ 250 = 7.4 g/cm³. That's not 7.8 g/cm³."*
   - "No. Its density is 0.0074 g/cm³." *"That uses the mass in kg. Change
     1.85 kg to 1850 g first."*
   - "No. Its density is 0.135 g/cm³." *"That's the wrong way round.
     Density = mass ÷ volume: 1850 ÷ 250."*
   - "No. Its density is 462 500 g/cm³." *"That multiplies. Density = mass
     ÷ volume."*
3. Typed, `unit: 'N/m²'`: "A box has a base 0.5 m long and 0.4 m wide. It
   pushes down on the floor with a force of 60 N. What is the pressure on
   the floor?" 300. Rules: 12 → *"That multiplies the force by the area.
   Pressure = force ÷ area."*; 120 → *"That divides by 0.5 only. Find the
   area of the base first: 0.5 × 0.4."*; 150 → *"That divides by 0.4 only.
   Find the area of the base first: 0.5 × 0.4."* Fallback: *"Find the area
   of the base first."* Right: *"The area is 0.5 × 0.4 = 0.2 m².
   60 ÷ 0.2 = 300 N/m²"*
4. Typed, `unit: 'kg'`, `tolerance: 0.001`: "Gold has a density of
   19.3 g/cm³. A gold bar has a volume of 50 cm³. What is its mass in kg?"
   0.965. Rules: 965 → *"That's the mass in grams. Divide by 1000 to get
   kg."*; 2.59 → *"That divides. Mass = density × volume."* Fallback:
   *"Find the mass in grams, then change it to kg."* Right: *"19.3 × 50 =
   965 g. 965 ÷ 1000 = 0.965 kg"*
5. Choice: "Two boxes each push down with a force of 120 N. Box A's base
   has an area of 0.4 m². Box B's base has an area of 0.6 m². Which box
   puts more pressure on the floor?"
   - "Box A: 300 N/m², more than 200 N/m²" ✓ *"A: 120 ÷ 0.4 = 300 N/m². B:
     120 ÷ 0.6 = 200 N/m². The same force on a smaller area gives more
     pressure."*
   - "Box B, because its base is bigger" *"A bigger area spreads the force
     out, so the pressure is less. Work out force ÷ area for each box."*
   - "Box B: 72 N/m², more than 48 N/m²" *"That multiplies force by area.
     Pressure = force ÷ area."*
   - "The same, because the forces are the same" *"The forces are the
     same, but the areas aren't. Work out force ÷ area for each box."*
6. Typed, `unit: 'cm²'`: "A machine presses down with a force of 600 N.
   The pressure is 25 N/cm². What area does it press on?" 24. Rules:
   15000 → *"That multiplies. Cover A: force ÷ pressure."*; 575 → *"That
   takes 25 away. Area = force ÷ pressure."* Fallback: *"Cover A: force ÷
   pressure."* Right: *"600 ÷ 25 = 24 cm²"*

Check 3, 5 and 6 are pressure; 1, 2 and 4 are density.

## lesson.json

Copy the speed lesson's. Question types map to skills: `find-density`,
`find-mass`, `find-volume`, `which-calculation`, `kg-to-g`, `try-1` to
`try-7`, `try-10`, `check-1`, `check-2`, `check-4` →
`density-mass-volume`; `find-pressure`, `pressure-calculation`, `try-8`,
`try-9`, `check-3`, `check-5`, `check-6` → `pressure-force-area`.
`session_length: 6`. Summary points:

- "Density is the mass of each cm³. 8 g/cm³ means 8 g in each cm³."
- "Mass = density × volume. Density = mass ÷ volume. Volume = mass ÷
  density."
- "The unit gives you the triangle: g/cm³ is grams ÷ cm³, so mass goes on
  top."
- "Make the units match: change kg to grams first (× 1000)."
- "Pressure is the force on each m²: pressure = force ÷ area. Same force on
  a bigger area means less pressure."

## Files

`content/density-and-pressure/`: `index.php`, `lesson.json`,
`lesson.css`, `density.js` (all text, cards and the generator, on
`window.DensityAndPressure`), `interactive.js` (Learn and Try it),
`questions.js` (Practice and Check). Unit test:
`tests/density-and-pressure.test.cjs`.

**The test contract.** `window.DensityAndPressure` has `learnScreens`,
`examples()`, `checks()`, `practiceTypes`, `pick(random)`,
`generate(item, random)`, `prepare(question, random)` and `number(value)`
(rounds away float noise). Every card config also carries `skill`
(`'density'` or `'pressure'`), `values` (`{ mass, density, volume }` or
`{ force, pressure, area }`, `null` for the unknown; mass in grams) and
`asked`: `'mass'`, `'density'`, `'volume'`, `'force'`, `'pressure'`,
`'area'`, `'grams'` (Try it 6), `'calculation'`, `'meaning'` (Try it 1),
`'compare'` (Check 2 and 5) or `'mistake'` (Try it 10). Card configs use
the shared card fields, as in the speed lesson.

## Testing: Freebuff does all of it

Run every test in Part D of `docs/freebuff-relay.md`:
1. syntax
2. write `tests/density-and-pressure.test.cjs`, copying
   `tests/speed-distance-time.test.cjs`
3. `npm test`
4. the **full** `npm run test:ui` on your branch and on `origin/main` (this
   is a first build)
5. `learn-shots.cjs`
6. `./build.sh` with its checks

Paste the real output of each into your reply.

Also check by hand (in the unit test, or with a short script) that every
Learn slider setting gives the whole numbers this spec promises (Learn
3, 4, 6, 7).

## Commits

1. "Plain subtitle for the density and pressure lesson"
   (`content/curriculum.json` only).
2. "Add density and pressure lesson": the lesson folder, the unit test
   and this spec (copy it from the main checkout's `docs/`).
3. "Rebuild dist with the density and pressure lesson" (`dist/` only).

Push the branch. Never open a PR or merge until a signed Claude message
says Umar approved it.

## What Claude checks at review

From Freebuff's reply, the diff and the screenshots:
- Learn 1 shows the two trays before anything is asked.
- Every slider and tap button visibly changes the picture.
- Labels and working fit at 375 px with nothing overlapping or
  scrolling sideways.
- The colours mean the same thing on every screen.
- Four options on every choice, each wrong one with its own feedback.
- Every method a question uses is taught in Learn.
- All tests pass, with no test that fails on the branch but not on
  `main`.
- Reload, Back and Practise again work.
- The `dist/` lesson's last button reaches the homepage.

## Changes from the draft

- **Split from speed.** The page taught speed, density and pressure in one
  lesson. Speed is its own lesson (PR #36). This one is density and
  pressure, the existing placeholder, with both skills.
- **Density first, pressure second.** Exams ask density about three times
  as often, so it gets six of the eight Learn screens.
- **Same idea as the speed lesson:** per means "in each", share to find
  the rate, count to find the bottom number, and read the triangle from
  the unit. Pupils who did speed will recognise it. Pupils who didn't
  still get it all explained.
- **The plan's Explore "Density" and "Pressure" tabs** became Learn 1 to 4
  and Learn 7. The cube "broken into 1 cm³ blocks" is the tray of
  squares. The snowshoes are Learn 7.
- **Foundation only.** Bank cards that go further (the algebraic cube, a
  cylinder on a cuboid, population density, the triangular prism, volume
  in litres from m³) are left out.
- **No exam board.** The draft named AQA and its codes.
- **Four sections only**, Learn asks nothing, and every choice has four
  options with their own feedback, as in the speed lesson.
- I checked every answer and every wrong option in this spec.
