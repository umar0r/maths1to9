# Speed, distance and time: lesson spec

Fills the existing placeholder `speed-distance-time`. One skill:
`speed-distance-time`. It teaches one idea: **speed is how far you go in
each hour.** From that one idea come the three calculations (speed ×
time, distance ÷ time, distance ÷ speed) and the triangle, read straight
from the unit km/h.

Source: a revision guide page, "Compound measures" (speed, density and
pressure, three triangles), and Umar's pasted plan for it (2026-10-31).
That page teaches three formulas at once. Following "one thing at a time"
it becomes two lessons: this one (speed), then the existing placeholder
`density-and-pressure`, which reuses this lesson's triangle screen. See
"Changes from the draft".

Uses these local question bank cards (`docs/exam-bank/bank/`, rewritten
already, not copied): `speed-distance-time-01`, `-02`, `-03`, `-04`,
`-07`, `-08`, `-09` and `-12`.

## Before you start

- `git fetch origin`. Make `codex/speed-distance-time` from
  **`origin/main`**, in its own worktree, `.worktrees/speed-distance-time`.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3 (skip
  `shared-graph.md`: no graphs here).
- **Closest example lessons:** `content/percentage-multipliers/` (a
  picture moved by sliders that never rebuild the screen, the steps
  slider, helper `.js` on `window`, generator, retained Check) and
  `content/speed-from-distance-time-graphs/` (speed wording and number
  cards with a `unit`). Copy their patterns.
- Don't change shared files. If the lesson needs something the engine
  doesn't have, stop and ask.

## Registration

One change, in `content/curriculum.json` only:

- The `speed-distance-time` entry's skills become `["speed-distance-time"]`.
- `speed-unit-conversions` moves to the end of the `units-and-conversions`
  entry's skills (that lesson already has `convert-compound-units`).

Changing km/h to m/s is a second idea. It needs × 1000 and ÷ 3600 and
belongs with the other unit changes. Nothing else changes in
`curriculum.json`, `skills.json` or `collections.json`.

## How it should feel

Like a brilliant.org lesson: one idea per screen, a picture the pupil
moves, two or three short lines under it.

- **The road.** One picture all lesson: a straight road drawn left to
  right, with a small car (SVG) on it. Distance along the road is
  **blue** (the road itself and its km labels). Each hour of driving is a
  block of road with an **orange** "1 h" tag under it. The distance in
  each hour, the speed, is **green** (the label on each block,
  "60 km"). Keep blue = distance, orange = time, green = speed on every
  screen, in the triangle too.
- **Movement.** When a slider changes the road, blocks slide in or out
  and the car glides to the end (300 ms CSS transform and width
  transitions). With `prefers-reduced-motion`, jump straight to the end.
  Never rebuild the screen on a slider move: update widths, labels and
  working only, so the slider keeps focus while dragged.
- **The working line** under the picture updates live: `60 × 3 = 180 km`.
  On a phone it wraps; it never scrolls sideways. At 375 px, block labels
  must not overlap. If blocks get too narrow for "37.5 km", show the label
  once above the road instead ("37.5 km in each hour").

## Wording rules for the whole lesson

- Say "in each hour", "how far", "how long". Don't say "rate", "compound
  measure", "unit rate", "quantity" or "constant".
- "Per" is new. Learn 2 says: "Per means 'in each'." After that, use it.
- "Average speed" is new. Learn 3 explains it once.
- Units: `km/h`, `mph`, `m/s`, `km`, `miles`, `m`, `hours`, `minutes`,
  `seconds`. Write `60 km/h` with a space. Working uses `×` and `÷`, no
  full stop.
- A calculator is allowed. Say so once, on Learn 1.
- Typed cards use the shared `unit` field (`unit: 'km/h'`, `'km'`,
  `'hours'`, `'seconds'`, `'mph'`) so the pupil types only the number.

## Learn (7 screens, all showing, nothing asked)

Each screen starts on the values given. No control asks for an answer.

1. **Which car is faster?** Two roads, one above the other. "Car A: 120 km
   in 2 hours." "Car B: 150 km in 3 hours." Slider "Hours: 0 to 3"
   (starts on 0). Each step adds one hour block to each road: Car A gets a
   green "60 km" block, Car B a green "50 km" block. Car A stops after 2
   hours with a flag. At 3 a line appears: "Car B went further. But Car A
   went further in each hour: 60 km, not 50 km. Car A is faster."

   Text: "Car B goes further. But it also drives for longer. Move the
   slider to see the cars hour by hour. In this lesson, you'll learn how
   to work out speed, distance and time. You can use a calculator."
2. **60 km/h means 60 km in each hour.** One road. Slider "Speed: 20 to
   100 km/h in steps of 10" (starts on 60) and slider "Hours: 1 to 5"
   (starts on 3). The road is made of that many green blocks of that
   length. Working: `60 × 3 = 180 km`.

   Text: "Speed tells you how far you go in each hour. 60 km/h means 60 km
   in each hour. You say it '60 kilometres per hour'. Per means 'in each'.
   So in 3 hours you go 60 km three times: 60 × 3." Three small chips under
   it: "km/h: kilometres per hour", "mph: miles per hour", "m/s: metres
   per second".
3. **Find the speed: share it out.** Slider "Distance: 30 to 300 km in
   steps of 30" (starts on 150) and slider "Hours: 1 to 6" (starts on 3).
   The whole blue road appears first, then splits into equal hour blocks,
   each with its green label. Working: `150 ÷ 3 = 50 km/h`. (Every
   setting gives at most one decimal place.)

   Text: "Now turn it round. A car goes 150 km in 3 hours. Share the 150
   km equally between the 3 hours. Each hour gets 50 km, so the speed is
   50 km/h. Sharing is dividing: speed = distance ÷ time." Callout: "This
   is the average speed. The car may go faster or slower at times. On
   average it goes 50 km in each hour."
4. **Find the time: how many hours fit?** A blue 240 km road. Slider
   "Speed" over the values 20, 30, 40, 60, 80, 120 km/h (starts on 60).
   Green blocks of that length drop onto the road one at a time, each with
   an orange "1 h", "2 h"… tag, until the road is full. Working:
   `240 ÷ 60 = 4 hours`.

   Text: "A car needs to go 240 km at 60 km/h. Each hour it goes 60 km.
   How many 60 km blocks fit into 240 km? 240 ÷ 60 = 4. So it takes 4
   hours: time = distance ÷ speed." Callout: "A faster car needs fewer
   blocks, so less time."
5. **The triangle comes from the unit.** On the left, the unit chip
   `km/h` tips over into a fraction: km on top, h underneath. On the right,
   a triangle: blue D on top, green S and orange T underneath with a `×`
   between them. Three tap targets, D, S and T (buttons with
   `aria-pressed`, starts with S covered). The covered letter gets a solid
   dot over it. Under the triangle, the rule and an example from earlier
   screens:
   - D covered: `D = S × T` · `60 × 3 = 180 km` · "Side by side means
     times."
   - S covered: `S = D ÷ T` · `150 ÷ 3 = 50 km/h` · "One above the other
     means divide."
   - T covered: `T = D ÷ S` · `240 ÷ 60 = 4 hours` · "One above the other
     means divide."

   Text: "km/h means km ÷ hours: distance ÷ time. So distance goes on top
   of the triangle. Speed and time sit underneath. Tap the one you want to
   find to cover it. The other two show you what to do." Callout: "You
   don't need to learn the triangle. The unit tells you: km/h has km on
   top."
6. **Make the times match.** A row of hour bars, each split into four
   15-minute quarters (orange). Slider "Time: 15 to 180 minutes in steps
   of 15" (starts on 75). The quarters fill up to the time. Labels:
   `75 minutes = 1 hour 15 minutes` and `75 ÷ 60 = 1.25 hours`. Under it
   the road for a bus at 48 km/h: `48 × 1.25 = 60 km`. Three chips:
   "15 minutes = 0.25 hours", "30 minutes = 0.5 hours", "45 minutes = 0.75
   hours".

   Text: "km/h counts hours, so the time must be in hours too. If the time
   is in minutes, divide by 60 to change it to hours." Callout: "1 hour 15
   minutes is not 1.15 hours. 15 minutes is a quarter of an hour, so it's
   1.25 hours."
7. **Three steps, every time.** Question shown at the top: "A cyclist
   rides at 40 mph for 1 hour 30 minutes. How far does she go?" Slider
   "Show the steps: 1 to 3" (starts on 1). Each step lights up with its
   working:
   1. **What do you want?** Distance. Cover D: speed × time.
   2. **Do the times match?** mph is per hour. 1 hour 30 minutes = 1.5
      hours. (Not 1.3.)
   3. **Work it out. Write the unit.** `40 × 1.5 = 60 miles`.

   At step 3 a check line: "Check: 40 miles in the first hour, then 20
   more in the half hour. 60 miles ✓". Text: "Use these three steps for
   every speed question."

## Try it (10 cards: 5 choice, 5 typed)

Fading is by order: meaning → one calculation each way → times in
minutes → spot the mistake.

1. Choice: "A car drives at 50 km/h. What does this mean?"
   - "It goes 50 km in each hour" ✓ *"Per means 'in each': 50 km in each
     hour."*
   - "It goes 50 km in total" *"50 km/h doesn't tell you the total. It
     tells you how far the car goes in each hour."*
   - "The journey takes 50 hours" *"The h stands for hours, but 50 is the
     distance in each hour, not the time."*
   - "It goes 1 km every 50 hours" *"That's the wrong way round. km/h means
     km in each hour."*
2. Typed, `unit: 'km'`: "A train goes at 80 km/h for 3 hours. How far
   does it go?" 240. Rules: 26.67 (tolerance 0.01) → *"That divides. In 3
   hours the train goes 80 km three times. Multiply."*; 83 → *"That adds.
   It goes 80 km in each of the 3 hours, so multiply."* Fallback:
   *"Distance = speed × time."* Right: *"80 × 3 = 240 km"*
3. Typed, `unit: 'km/h'` (bank 01): "A cyclist rides 54 km in 3 hours.
   What is her average speed?" 18. Rules: 162 → *"That multiplies. Share
   the 54 km between the 3 hours: divide."*; 51 → *"That takes 3 away.
   Share the 54 km between the 3 hours: divide."* Fallback: *"Speed =
   distance ÷ time."* Right: *"54 ÷ 3 = 18 km/h"*
4. Choice: "A lorry goes 200 miles in 4 hours. Which calculation finds its
   speed?"
   - `200 ÷ 4` ✓ *"Speed = distance ÷ time. mph means miles ÷ hours."*
   - `4 ÷ 200` *"That's the wrong way round. mph means miles ÷ hours, so
     the distance goes first."*
   - `200 × 4` *"Multiplying gives 800, far more than the lorry goes in
     an hour. Divide."*
   - `200 − 4` *"You can't take hours away from miles. Divide."*
5. Typed, `unit: 'hours'` (bank 04): "A boat goes 42 km at 12 km/h. How
   long does it take?" 3.5. Rules: 504 → *"That multiplies. See how many
   12 km blocks fit into 42 km: divide."*; 30 → *"That takes 12 away.
   Time = distance ÷ speed."* Fallback: *"Cover T: distance ÷ speed."*
   Right: *"42 ÷ 12 = 3.5 hours"*
6. Choice: "Write 1 hour 30 minutes in hours."
   - `1.5 hours` ✓ *"30 minutes is half an hour, so 1 hour 30 minutes is
     1.5 hours."*
   - `1.3 hours` *"30 minutes is half an hour: 0.5, not 0.3."*
   - `90 hours` *"90 is the number of minutes. Divide by 60 to get hours."*
   - `0.5 hours` *"That's only the 30 minutes. Add the 1 hour too."*
7. Choice (bank 02): "A bus goes at 48 km/h for 1 hour 15 minutes. How far
   does it go?"
   - `60 km` ✓ *"1 hour 15 minutes is 1.25 hours. 48 × 1.25 = 60 km."*
   - `55.2 km` *"1 hour 15 minutes is not 1.15 hours. 15 minutes is a
     quarter of an hour: 0.25."*
   - `38.4 km` *"That divides. Distance = speed × time."*
   - `720 km` *"That uses 15 minutes as 15 hours. Change the time to
     hours first."*
8. Typed, `unit: 'seconds'`: "A snail moves at 0.4 m/s. How long does it
   take to move 12 m?" 30. Rules: 4.8 → *"That multiplies. See how many
   0.4 m steps fit into 12 m: divide."* Fallback: *"Time = distance ÷
   speed. The speed is in metres per second, so the answer is in
   seconds."* Right: *"12 ÷ 0.4 = 30 seconds"*
9. Typed, `unit: 'km/h'`: "A runner goes 6 km in 30 minutes. What is her
   speed in km/h?" 12. Rules: 0.2 → *"That's how far she goes in each
   minute. km/h needs hours: 30 minutes is 0.5 hours."*; 20 → *"30
   minutes is 0.5 hours, not 0.3."*; 180 → *"That multiplies. Speed =
   distance ÷ time."* Fallback: *"Change 30 minutes to hours first."*
   Right: *"30 minutes = 0.5 hours. 6 ÷ 0.5 = 12 km/h. In a whole hour she
   would go twice as far."*
10. Choice: "Sam says: 'A car goes 90 km at 60 km/h. The time is
    60 ÷ 90 = 0.67 hours.' What has Sam done wrong?"
    - "Divided the wrong way round. It's 90 ÷ 60 = 1.5 hours." ✓ *"Time
      = distance ÷ speed. 90 km is more than one hour's driving, so the
      answer must be more than 1 hour."*
    - "Nothing. Sam is right." *"Check it: in less than 1 hour at
      60 km/h, the car goes less than 60 km. That's not 90 km."*
    - "Sam should multiply: 90 × 60 = 5400 hours" *"Multiplying finds a
      distance. Cover T: distance ÷ speed."*
    - "Sam should take away: 90 − 60 = 30 hours" *"Taking away doesn't
      give a time. Divide distance by speed."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with the seeded `random`. Each choice has four different
options, shuffled with the seeded `random`. Every rule value must differ
from the answer by more than the card's tolerance, and from every other
rule; drop one that clashes and keep at least one. Every right answer
gets its own feedback with the working. Test the generator with 32-bit
seeds, not small ones.

**Settings** (pick one per card): car or train (km/h, 30 to 120 in 5s),
cyclist (km/h, 10 to 30), walker (km/h, 3 to 6), lorry (mph, 30 to 70 in
5s). Distances are km or miles to match. Times in hours unless the type
says minutes.

| Type | Card | Builds |
|---|---|---|
| `find-speed` | typed | "A train goes 270 km in 3 hours. What is its average speed?" Speed s from the setting, time t 2 to 6 whole hours, distance s × t. Answer s, `unit` km/h or mph. Rules: d × t (*"That multiplies. Share the distance between the hours: divide."*), d − t (*"You can't take hours away from km. Divide."*). |
| `find-distance` | typed | "A cyclist rides at 16 km/h for 2.5 hours. How far does he go?" t from 1.5, 2, 2.5, 3, 4, 5. Answer s × t, `unit` km or miles. Rules: s ÷ t rounded to 2 dp (*"That divides. Speed × time gives the distance."*), s + t (*"That adds. It goes s km in each hour, so multiply."*). |
| `find-time` | typed | From bank 04: "A boat goes 42 km at 12 km/h. How long does it take?" s from the setting, t from 0.5 to 5 in steps of 0.25, keep only whole distances. Answer t, `unit: 'hours'`. Rules: d × s (*"That multiplies. See how many s km blocks fit into d km: divide."*), d − s (*"Taking away doesn't give a time. Divide distance by speed."*). |
| `which-calculation` | choice | One of speed, distance, time is unknown; the other two are given with numbers, as in Try it 4. Options with the real numbers. Unknown speed: `d ÷ t` ✓, `t ÷ d`, `d × t`, `d − t`. Unknown time: `d ÷ s` ✓, `s ÷ d`, `d × s`, `d − s`. Unknown distance: `s × t` ✓, `s ÷ t`, `t ÷ s`, `s + t`. Feedback as Try it 4: wrong way round / multiplying or dividing when it should be the other / can't add or take away hours and km. |
| `minutes-speed` | choice | From bank 03: "A van goes 21 miles in 35 minutes. What is its average speed?" Minutes m from 10, 12, 15, 20, 30, 40, 45; speed s whole, 12 to 84, chosen so d = s × m ÷ 60 has at most 2 dp. Right: `s mph`. Wrong: d ÷ m (*"That's how far it goes in each minute. mph needs hours: m minutes is m ÷ 60 hours."*), d ÷ (m ÷ 100) (*"m minutes is not 0.m hours. Divide by 60, not 100."*), d × m (*"That multiplies. Speed = distance ÷ time."*). Redraw if two options match. |
| `minutes-distance` | choice | From bank 02: "A bus goes at 48 km/h for 1 hour 15 minutes. How far does it go?" h 1 to 3 hours plus 15, 30 or 45 minutes; s a multiple of 4, 20 to 80. Right: s × (h + m/60). Wrong: s × (h + m/100) (*"h hours m minutes is not h.m hours. Divide the minutes by 60."*), s ÷ (h + m/60) (*"That divides. Distance = speed × time."*), s × (60h + m) (*"That multiplies by the minutes. The speed is per hour, so use hours."*). Round wrong options to 2 dp. Redraw if two match. |
| `who-is-faster` | choice | Two journeys in whole hours where the one going further is slower. "Car A goes 240 km in 4 hours. Car B goes 300 km in 6 hours. Which is faster?" Right: "Car A: 60 km/h, faster than 50 km/h". Wrong: "Car B, because it goes further" (*"Car B goes further, but it drives for longer. Compare how far each goes in one hour."*); "Car B: 1800 km/h, faster than 960 km/h" (the products; *"That multiplies distance by time. Speed = distance ÷ time."*); "They go at the same speed" (*"Work out each speed: distance ÷ time. They're different."*). Redraw if the speeds are equal. |

Each session has the three typed types once, plus three of the four choice
types, in a mixed order picked with the seeded `random`.

## Check (6 fixed questions: 3 choice, 3 typed)

1. Choice: "Amy runs 5 km in 25 minutes. Ben runs 9 km in 1 hour. Who is
   faster?"
   - "Amy: 12 km/h, faster than Ben's 9 km/h" ✓ *"25 minutes is 25 ÷ 60
     hours. 5 ÷ (25 ÷ 60) = 12 km/h. Ben goes 9 km in an hour."*
   - "Ben: 9 km/h, faster than Amy's 5 km/h" *"Amy runs 5 km in less than
     an hour, so her speed is more than 5 km/h. Change 25 minutes to
     hours."*
   - "Ben: 9 km/h, faster than Amy's 0.2 km/h" *"0.2 is how far Amy runs
     in each minute. Change 25 minutes to hours first."*
   - "Amy: 125 km/h, faster than Ben's 9 km/h" *"That multiplies 5 by 25.
     Speed = distance ÷ time."*
2. Typed, `unit: 'km/h'` (bank 12): "Jo walks for 2 hours at 5 km/h. Mel
   walks the same route in 1.25 hours. What is Mel's average speed?" 8.
   Rules: 10 → *"10 km is the length of the route. Now divide it by Mel's
   time."*; 6.25 → *"That multiplies Jo's speed by Mel's time. Find the
   length of the route first."* Fallback: *"Find how far Jo walks. Mel
   walks the same distance."* Right: *"The route is 5 × 2 = 10 km.
   10 ÷ 1.25 = 8 km/h"*
3. Typed, `unit: 'km'`: "A train goes at 120 km/h for 40 minutes. How far
   does it go?" 80. Rules: 4800 → *"That multiplies by 40 minutes. The
   speed is per hour, so change 40 minutes to hours."*; 48 → *"40 minutes
   is not 0.4 hours. Divide 40 by 60."*; 3 → *"That divides. Distance =
   speed × time."* Fallback: *"Change 40 minutes to hours first."* Right:
   *"40 minutes = 40 ÷ 60 hours. 120 × 40 ÷ 60 = 80 km"*
4. Choice (bank 09): "A coach leaves at 09:20. It goes 90 km at 60 km/h,
   then stops for 15 minutes. What time is it after the stop?"
   - `11:05` ✓ *"90 ÷ 60 = 1.5 hours, which is 1 hour 30 minutes. 09:20 +
     1 hour 30 minutes = 10:50. Add 15 minutes: 11:05."*
   - `10:50` *"That's when the coach stops. Add the 15-minute stop."*
   - `11:25` *"1.5 hours is 1 hour 30 minutes, not 1 hour 50 minutes."*
   - `1 hour 45 minutes` *"That's how long it takes. The question asks for
     the time on the clock."*
5. Choice (bank 07): "A rider goes 30 km in 1 hour. She comes back the
   same 30 km in 2 hours. What is her average speed for the whole trip?"
   - `20 km/h` ✓ *"The whole trip is 60 km in 3 hours. 60 ÷ 3 = 20 km/h."*
   - `22.5 km/h` *"That's halfway between 30 and 15. The trips take
     different times, so use the total distance ÷ total time."*
   - `30 km/h` *"That's only the way there."*
   - `15 km/h` *"That's only the way back."*
6. Typed, `unit: 'mph'`, `tolerance: 0.05` (bank 08): "A driver goes 150
   miles in 3 hours. The first 30 miles take 45 minutes. What is her
   average speed for the rest of the journey? Round to 1 decimal place."
   53.3. Rules: 50 → *"That's the speed for the whole journey. Take off
   the first part first."*; 40 → *"That's the speed for the first part."*
   Fallback: *"Find the distance and time left, then divide."* Right:
   *"120 miles are left, in 2.25 hours. 120 ÷ 2.25 = 53.3 mph"*

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). Learn 1
shows the two cars before anything is asked. Every slider and the
triangle's D/S/T buttons visibly change the picture, animate smoothly
(and not with reduced motion), and sliders keep focus while dragged. Blue,
orange and green mean the same thing on every screen and in the triangle.
Labels and working fit at 375 px without overlapping. Four options on
every choice, each wrong one with its own feedback, and the right one
with feedback that isn't just its label again. Every method a question
uses is taught in Learn. Reload, Back and Practise again work. The
`dist/` lesson's last button reaches the homepage, and the homepage shows
"Speed, distance and time" in its place, with the units lesson now
listing the speed-units skill.

## How we work: you write, Claude tests

- **Do NO testing.** Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests and does the browser review.
- **Don't edit `tests/`.** (If a test fails because of the curriculum
  move, say so in the report; Claude fixes tests.)
- **The test contract.** The helper `speed.js` exposes one object,
  `window.SpeedDistanceTime`, with:
  - `learnScreens`: the Learn screens' text
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the
    Practice generator, returning card configs
  - `checks()`: the Check card configs
  - `toHours(hours, minutes)`: hours + minutes ÷ 60, with no
    floating-point junk (1.25, not 1.2499999)

  Every card config also carries `values` (`{ distance, speed, time }`,
  time in hours, `null` for the unknown) and `asked`: `'speed'`,
  `'distance'`, `'time'`, `'hours'` (Try it 6), `'calculation'`,
  `'meaning'` (Try it 1), `'compare'` or `'mistake'` (Try it 10). Card
  configs use the shared card fields (`input`, `prompt`, `options` with
  `label`/`correct`/`feedback`, `answer`, `rules`, `fallback`,
  `feedback`, `unit`, `tolerance`, `questionType`).
- **Commits:** (1) "Move speed unit conversions to the units lesson"
  (`curriculum.json` only); (2) "Add speed, distance and time lesson":
  the lesson folder, this spec file (copy it from the main checkout's
  `docs/`) and the rebuilt `dist/`. Push the branch. Never open a PR or
  merge until Umar approves.

## Report, then wait

Post one relay reply with: the commit hashes; anything a test needs that
isn't obvious; anything you changed from this spec and why; anything you
couldn't do. Then run the wait loop **in the foreground**:

```sh
while :; do
  relay/wait.sh codex
  status=$?
  if [ "$status" -ne 2 ]; then break; fi
done
```

## Changes from the draft

- **Split into two lessons.** The page and the plan teach speed, density
  and pressure together: three settings, three triangles. "One thing at a
  time" makes this lesson speed only. Density and pressure is the next
  lesson (existing placeholder `density-and-pressure`), reusing Learn 5's
  "triangle from the unit" screen. Pay and water flow are left out:
  they belong to `rates-and-unit-pricing`.
- **km/h to m/s moved out.** The exam corner's "54 km/h, how many metres in
  10 s" needs × 1000 ÷ 3600, a second idea. That skill moves to the units
  lesson. Changing minutes to hours stays: it's part of nearly every
  speed question.
- **No exam board.** The draft named AQA and its codes.
- **Four sections only.** The hook, the four Learn cards, the Explore
  tabs, the Method and the worked examples all sit inside Learn's 7
  screens. No faded fill-in rounds, hint ladder or KaTeX: the engine has
  none of these. Fading is kept by card order, and hints come as
  feedback after a wrong answer.
- **The hook doesn't ask.** "Which tap is faster?" became two cars shown
  hour by hour, with the answer stated. The first screen shows before it
  asks.
- **Learn asks nothing.** The micro-checks and the "what went wrong?"
  worked examples became Try it cards (1, 3, 6, 7, 10) and Practice
  types.
- **Every choice has four options**, each wrong one a real mistake with its
  own feedback.
- **New numbers.** The page's own questions (9 m at 0.3 m/s, the 54 km/h
  car) aren't copied. The bank cards used are our rewritten ones.
- **Wording:** "rate", "compound measure" and "unit rate" are out.
  "Per" and "average speed" are explained the first time.
- I checked every answer and every wrong option in this spec.
