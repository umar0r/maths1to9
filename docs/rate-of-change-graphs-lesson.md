# Rates of change on graphs: lesson spec

Built from the lesson template (`content/_template/`), the shared
components and the shared graph. Teaches **one skill**: reading a straight
section of a real-life graph as a rate of change, and working it out as
"change in the value ÷ time taken", with the unit "per week", "per minute"
and so on. Includes knowing that a horizontal section means a rate of 0,
and that a steeper section means a faster change.

Umar's draft (from ChatGPT, 2026-10-26) is the source. It has been
rewritten to the ground rules; see "Changes from the draft" at the end.

## Before you start

- `git fetch origin`. Make `codex/rate-of-change-graphs` from
  **`origin/main`** (`7ed930d` or later) in its own worktree, e.g.
  `.worktrees/rate-of-change-graphs`. Symlink the main checkout's
  `node_modules`; don't commit it.
- **The shared graph features this lesson needs are on `main`** (PR #24,
  merge `7ed930d`). Use them; don't rebuild or change them:
  - axis names and board shape: `create(host, { step, axisNames: { x:
    'Time (weeks)', y: 'Height (cm)' }, aspect })`, and collision-aware
    segment labels (`label`, `labelSide`, `labelTone`): see "Named axes
    and segment labels" in `docs/shared-graph.md`
  - a unit after a number box: `unit: 'cm per week'` on a number card: see
    "Units beside typed answers" in `docs/shared-lesson-components.md`
- Read AGENTS.md in full, then the rule files in its step 3.
- **Closest example lesson: `content/speed-from-distance-time-graphs/`**
  (same kind of real-life graph, axis names, units, test contract). Also:
  `content/finding-the-gradient/` (graph figures on question cards),
  `content/gradient-and-intercept/` (Learn screens with sliders) and
  `content/convert-a-fraction-to-a-percentage/` (Check mixing choice and
  typed answers).
- Don't change shared files. If the lesson needs a graph feature that
  doesn't exist, stop and ask.

## Registration

- Slug `rate-of-change-graphs` (the placeholder already in
  `curriculum.json`, Ratio, proportion and rates of change). Keep its title
  "Rates of change on graphs" and subtitle.
- **Change its skills to `["gradient-as-rate"]` only.** The lesson doesn't
  teach `proportion-graphs`; that belongs with the direct and inverse
  proportion lessons. Change nothing else in `curriculum.json`,
  `skills.json` or `collections.json`, except: add the lesson to the
  `graphs` collection if it isn't there (it is already listed).

## The graphs

All graphs are straight sections joined end to end, time on the
horizontal axis from 0, whole-number values at every corner, a grid line
at every corner value, and a dot at each corner. Use the shared graph with
axis names. Never shade or label the answer section before the pupil
answers.

| Name | Axes | Corners (time, value) | Rates |
|---|---|---|---|
| Plant A (Learn, Try it) | Time (weeks), Height (cm) | (0, 4), (2, 8), (4, 20), (6, 20), (8, 24) | 2, 6, 0, 2 cm per week |
| Water tank (Learn) | Time (minutes), Water (litres) | (0, 60), (2, 40), (4, 40), (5, 10) | −10, 0, −30 litres per minute |
| Plant B (Check) | Time (weeks), Height (cm) | (0, 6), (2, 18), (4, 18), (6, 24) | 6, 0, 3 cm per week |

Choose a y step that puts a grid line on every corner value (e.g. Plant
A: 4; water tank: 10; Plant B: 2 or 6), with about 6 to 12 grid lines up
the side. Label each section on the graph by its weeks only when the
question needs it (e.g. choice questions say "weeks 2 to 4"; the section is not
highlighted until answered).

## Learn (6 screens, all teaching, no questions)

1. **Graphs can show change.** "A plant can grow quickly for a few weeks,
   then slowly. A water tank can empty quickly, then stop. A graph shows
   these changes over time." Picture: Plant A's graph. A slider moves a
   dot along the line week by week, and a readout shows "Week 3: 14 cm".
   Read the graph from left to right, as time moves forward.
2. **Up, down or flat.** Three small graphs side by side (stacked at
   375 px): line going up = the value is increasing; going down = it is
   decreasing; flat (horizontal) = it stays the same. Plain words only.
   The word "gradient": "The slope of a line is called its gradient. Up is
   a positive gradient, down is negative, flat is zero."
3. **Steeper means faster.** Plant A again. A slider (or tap buttons
   "weeks 0–2, 2–4, 4–6, 6–8") highlights one section at a time with the
   caption for that section: "Weeks 2 to 4: steepest. The plant grows
   fastest here." / "Weeks 4 to 6: flat. The plant stays 20 cm tall. Flat
   doesn't mean zero height. It means no change." This replaces the
   draft's "tap the section" questions, which move to Try it.
4. **Work out the rate.** Weeks 2 to 4 on Plant A, with the two corners
   marked and a rise and run drawn on the graph:
   - Change in height: 20 − 8 = 12 cm
   - Time taken: 4 − 2 = 2 weeks
   - Rate: 12 ÷ 2 = 6 cm per week

   "A rate of change tells you how much something changes each week (or
   each minute). 6 cm per week means the plant gains 6 cm every week."
   "The line is straight here, so the rate is the same all through these
   two weeks."
5. **Use the change, not the height.** Same section. "Don't divide the
   final height by the time: 20 ÷ 2 = 10 is wrong. It counts the 8 cm the
   plant already had." Show both calculations side by side, the wrong one
   crossed out.
6. **Going down and staying flat.** The water tank. Time is now in
   minutes, not weeks. Minutes 0
   to 2: 60 − 40 = 20 litres in 2 minutes, so the tank loses 10 litres per
   minute. Minutes 2 to 4: flat, so 0 litres per minute. "The tank isn't
   empty: it still holds 40 litres." Explain "per minute" in plain words.

## Try it (8 cards: 4 choice, 4 typed)

All on Plant A unless stated. The graph is the card's figure. Highlight a
corner or section only after the card is answered correctly.

1. Choice: "In which weeks does the plant grow fastest?" Weeks 2 to 4 ✓ /
   weeks 6 to 8 (*"That's the highest part, where the plant is tallest. Look
   for the steepest part instead."*) / weeks 4 to 6 (*"That part is flat:
   the plant isn't growing at all."*) / weeks 0 to 2 (*"That part rises
   gently. Find the steepest part."*).
2. Choice: "In which weeks does the height stay the same?" Weeks 4 to 6 ✓ /
   weeks 0 to 2 (*"The line goes up there, so the plant grows."*) / weeks 2
   to 4 (*"The line goes up steeply there: that's the fastest growth."*) /
   weeks 6 to 8 (*"The line goes up there, so the plant still grows."*).
3. Typed: "How tall is the plant at week 6?" 20 (unit cm).
4. Typed: "How tall is the plant at week 8?" 24 (unit cm).
5. Typed: "How much does the plant grow from week 6 to week 8?" 4 (cm).
   Rules: 24 → *"That's the height at week 8. Take away the height at week
   6."*; 44 → *"Take away, don't add."*
6. Choice: "How many weeks pass from week 6 to week 8?" 2 ✓ / 8 (*"That's
   the week it ends. Take away the start: 8 − 6."*) / 6 (*"That's the week
   it starts. Take it away from the end: 8 − 6."*) / 14 (*"Take away, don't
   add."*).
7. Typed: "What is the rate of growth from week 6 to week 8?" 2 (unit cm
   per week). Rules: 4 → *"That's the growth in 2 weeks. Divide by 2."*;
   12 → *"You divided the final height, 24, by 2. Use the change, 4 cm."*;
   8 → *"Divide the change by the time, not multiply."*
8. Choice: "Weeks 0 to 2 and weeks 6 to 8 both grow at 2 cm per week. Why?"
   ✓ *"The two parts are equally steep."* / *"The plant is the same height
   in both."* / *"They both last 2 weeks."* / *"They are at the start and
   end of the graph."* Feedback: same height → *"They aren't the same
   height. The rate is about how steep the line is."*; both last 2 weeks →
   *"Weeks 2 to 4 also last 2 weeks, but the plant grows faster then. It's
   the steepness that matters."*; start and end → *"Where a part sits
   doesn't matter. Look at how steep it is."*

## Practice (generator, 6 per session: 3 choice, 3 typed)

`runQuestionSet` with seeded `random`. Each item generates its own graph:
3 or 4 straight sections, corners at whole-number times (sections 1 to 3
units long) and whole-number values, at least one flat section, rates that
are whole numbers. Every corner value sits on a grid line (see "The
graphs"). Keep values between 0 and about 100.

Contexts, and which way each can go:

| Context | Axes | Can go |
|---|---|---|
| plant height | Time (weeks), Height (cm) | up or flat |
| water in a tank | Time (minutes), Water (litres) | down or flat |
| savings | Time (months), Savings (£) | up, down or flat |
| temperature | Time (hours), Temperature (°C) | up, down or flat; stay at 0 °C or above |

Each type picks a context that fits it (e.g. `rate-down` never uses the
plant). Units in answers: cm per week, litres per minute, £ per month,
°C per hour.

Question types (map all to `gradient-as-rate`):

| Type | Card | Asks |
|---|---|---|
| `fastest` | choice | Which section changes fastest ("grows fastest", "empties fastest", by context)? The graph has exactly 4 sections, which are the 4 options. The steepest is strictly steeper than every other section. One section is flat. The section that reaches the highest value is neither the steepest nor the flat one. Wrong: the highest section (*"That's the highest part, not the steepest."*), the flat section (*"That part is flat: nothing changes."*), the other section (*"That part is less steep."*). |
| `trend` | choice | In one named section, is the value increasing, decreasing or staying the same? Fourth option: "It is zero" (*"Flat means no change, not zero."*). Ask about each shape (up, down, flat) over the seeds. |
| `flat-meaning` | choice | What does the flat section show? Right: the value stays the same; the rate is 0. Wrong: the value is 0; the graph stops; it changes fastest. Use the flat section's real value in the wording. |
| `change` | typed | How much does the value go up in an increasing section (start value at least 1)? Unit: cm, £ or °C. Rules: the final value, the sum of start and final values. |
| `rate-up` | typed | Rate of an increasing section, 2 or 3 units long (with unit). Rules: the change not divided, final value ÷ time (only if a whole number), time ÷ change. |
| `rate-down` | typed | Rate of a decreasing section, 2 or 3 units long, asked as a positive number: "How many litres leave the tank each minute?", "How many pounds are spent each month?", "By how many °C does the temperature fall each hour?". Rules: the change not divided, start value ÷ time (only if a whole number), time ÷ change. |

Every rule's value must differ from the right answer and from every other
rule (drop a rule that clashes). Every choice question has four different
options, shuffled with the seeded `random`.

Each session: one each of `fastest`, `trend` and `flat-meaning` (choice
×3), plus one each of `change`, `rate-up` and `rate-down` (typed ×3), in a
mixed order.

## Check (5 fixed questions on Plant B: 2 choice, 3 typed)

1. Choice: *"Aisha says the plant grows fastest from week 4 to 6, because
   that's the highest part of the graph. Who is right?"* ✓ *"No. It grows
   fastest from week 0 to 2, where the line is steepest."* / *"Yes. The
   highest part shows the fastest growth."* / *"No. It grows fastest from
   week 2 to 4."* / *"Yes, because the line ends there."* Feedback:
   highest → *"The highest part isn't the fastest. Look for the steepest
   part."*; weeks 2 to 4 → *"Weeks 2 to 4 are flat: the plant doesn't grow
   at all."*; line ends → *"Where the line ends doesn't matter. Look for
   the steepest part."*
2. Typed: *"Ben works out the rate from week 0 to 2 as 18 ÷ 2 = 9 cm per
   week. What is the correct rate?"* 6 (cm per week). Rules: 9 → *"That's
   Ben's answer. He divided the final height, 18. Use the change: 18 − 6."*;
   12 → *"That's the change. Divide it by the 2 weeks."*
3. Choice: *"From week 2 to 4 the line is flat at 18 cm. What does this
   tell you?"* ✓ *"The plant stays 18 cm tall. Its rate of growth is 0 cm
   per week."* / *"The plant's height is 0 cm."* / *"The plant grows 18 cm
   each week."* / *"The plant stops being measured."* Feedback: height 0 → *"Flat
   means no change, not zero. The plant is 18 cm tall."*; grows 18 cm →
   *"18 cm is its height. Flat means it doesn't grow."*; stops being
   measured → *"The graph carries on, so it is still measured. Flat means
   no change."*
4. Typed: *"What is the rate of growth from week 4 to week 6?"* 3 (cm per
   week). Rules: 24 ÷ 2 = 12, change 6.
5. Typed: *"How much does the plant grow altogether, from week 0 to week
   6?"* 18 (cm). Rules: 24 (final height), 6 (start height).

Summary points:
- A steeper line means a faster change. A flat line means no change.
- Rate of change = change in the value ÷ time taken.
- Use the change in the value, not the value at the end.
- Give the unit: cm per week, litres per minute.

## What Claude checks at review

Build to these; Claude tests them (desktop and 375 px with touch). The
first Learn screen teaches before asking. Every slider visibly moves the
picture and keeps focus while dragged. No section is highlighted or
labelled with its answer before the pupil answers. Four options on every
choice, each wrong one with its own feedback that fits the choice. Every
method a question uses is taught in Learn. Axis names, numbers and labels
don't overlap at 375 px. `−` and `×` in displayed maths, no full stops on
displayed maths. Reload, Back and Practise again work. The `dist/` lesson's
last button reaches the homepage.

## How we work: you write, Claude tests

- **Do NO testing.** No `npm test`, no `--only` runs, no browser or manual
  checks, no screenshots. Only: `node --check` on every JS file you wrote,
  check `lesson.json` parses, `./build.sh`, commit, push, report. Claude
  runs every test, writes the unit tests and the browser solver, does the
  browser review at desktop and 375 px, and sends fixes.
- **Don't edit `tests/`.** No test files, no solver, no Playwright specs.
- **The test contract.** The helper `.js` exposes one object on `window`
  (like the speed lesson's) with:
  - `learnScreens`: the Learn screens' text (titles, lines, displayed maths)
  - `examples()`: the Try it card configs
  - `practiceTypes`, `pick(random)`, `generate(item, random)`: the Practice
    generator, returning card configs
  - `checks()`: the Check card configs
  - for any custom widget: its `mark(value)` and a way to build a correct
    value (e.g. `correctValue(question)`)

  Every card config also carries its graph as data (context, axis names,
  corners, and the section the question asks about, if any), so a test can
  recompute every answer from the graph. Card configs use the shared card
  fields (`input`, `prompt`, `options` with `label`/`correct`/`feedback`,
  `answer`, `unit`, `rules`, `fallback`, `questionType`).
- **Commit** (one commit): the lesson folder, the `curriculum.json` change,
  this spec file (copy it from the main checkout's `docs/`), and the rebuilt
  `dist/`. Message: "Add rates of change on graphs lesson". Push the branch.
  Never open a PR or merge until a signed Claude message says Umar
  approved.

## Report, then wait

Post one relay reply with: the commit hash; the `window` object's name and
anything a test needs that isn't obvious (which fields hold the graph, the
section and the numbers); anything you changed from this spec and why;
anything you couldn't do. Then run the wait loop **in the foreground** and
stay in your turn until it prints Claude's next message:

```sh
while :; do
  relay/wait.sh codex
  status=$?
  if [ "$status" -ne 2 ]; then break; fi
done
```

## Changes from the draft

- **Learn questions moved to Try it.** The draft asked pupils to tap the
  fastest and flat sections inside Learn. Learn now only shows; Try it asks
  (ground rules 2–3).
- **Tap → four-option choice.** Tapping a section isn't a shared graph
  feature, so these are choices of week ranges with four options and
  feedback for each (rule 5).
- **"Explain your answer" questions removed.** Free-text explanations
  can't be marked. They're now four-option "which is right?" questions
  (Try it Q8, Check Q1 and Q3) or typed numbers (Check Q2).
- **"From week ___ to week ___"** became a choice of sections.
- **Practice is a generator**, not the draft's fixed 8 questions (rule 7),
  and mixes choice and typed answers (rule 6).
- **Check has 5 questions**, not 3, with a Plant B graph fully defined
  (the draft gave only part of it; I set week 6 to 24 cm).
- **Wording:** "unit of time" → "each week / each minute"; LaTeX boxes
  turned into typed answers with units; the gradient explained in one
  plain sentence.
- **One skill.** The placeholder also listed `proportion-graphs`, which
  this lesson doesn't teach; it's dropped from this lesson.
- I checked every number in the draft: all rates and changes are right.
