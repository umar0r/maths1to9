# Angle facts: lesson spec

Fills the existing placeholder `angle-facts` (skills `angles-point-line`,
`vertically-opposite-angles` and `parallel-line-angles`). It's the first
lesson to use the shared diagram (`assets/js/diagram.js`, PR #41, spec
`docs/shared-diagram.md`).

The one idea: **angles are amounts of turn, so they follow a few fixed
rules.** A straight line is half a turn (180°), a full turn is 360°, and
parallel lines are crossed at the same slope, so the angles repeat. Each
rule has a short reason pupils must write in the exam.

Uses these local question bank cards (`docs/exam-bank/bank/`, already
rewritten, not copied): `angle-facts-01`, `-02`, `-04`, `-05`, `-06`,
`-07`, `-10`, `-11` and `-13`.

## Before you start

- `git fetch origin`. Make `codex/angle-facts` from **`origin/main`**
  (it must have PR #41: check `assets/js/diagram.js` exists; if not,
  stop and say so), in its own worktree, `.worktrees/angle-facts`.
  Symlink the main checkout's `node_modules`; don't commit it.
- Read AGENTS.md in full, then the rule files in its step 3, then
  `docs/shared-diagram.md` (skip `shared-graph.md`).
- **Closest example lesson for files, saving and tests:
  `content/density-and-pressure/`.** Copy its file layout, hash routes,
  saved state, Try it and Check code, and its test file pattern.
- **Every diagram is drawn with `Maths1to9Diagram`.** No hand-made SVG.
  Questions with a still diagram pass the card's `figure(host, {
  readOnly })` option and call `Maths1to9Diagram.create` inside it. Tap
  questions use `Maths1to9Diagram.questionWidget({ answer: 'choose' })`.
- Don't change shared files, `diagram.js` included. If a screen needs
  something the diagram can't do (see the "stop and ask" notes), stop
  and ask.

## Registration

One change, in `content/curriculum.json` only: the `angle-facts` entry's
subtitle becomes `"Use angles on a line, round a point and on parallel
lines."` Nothing else changes in `curriculum.json`, `skills.json` or
`collections.json`.

## How it should feel

**Every Learn screen has three parts, in this order:**
1. **What it is:** one or two short sentences saying the rule in
   everyday words.
2. **An example:** a real diagram with real numbers, worked out.
3. **The pupil does the step:** they tap the diagram to do each step of
   that example, and see why it works. No sliders, and no "drag the dot
   and watch the numbers change". Every tap does a real step of the
   method and adds a line to the working.

Rules:

- **Colours:** lines are the diagram's neutral blue. The angle the
  screen is about uses `tone: 'highlight'` (orange). Angles that are
  equal share the same number of arcs (`arcs: 1` / `arcs: 2`), so
  equal angles are shown by shape as well as by colour.
- **Taps** use the diagram's `select: true` and `onSelect`, each with a
  `name`. A tap that's out of order says what to tap first in the live
  line (`describe`) and changes nothing else.
- **Moving pictures** (an angle sliding along a line, slices filling a
  half or full circle) are done by the lesson moving hidden helper
  points with `moveTo` over about 600 ms. With `prefers-reduced-motion`,
  jump straight to the end. If the diagram can't do a move smoothly,
  **stop and ask**; don't patch `diagram.js`.
- Tapping the first step again starts the example over. There's no
  reset button.
- Every Learn diagram has an explicit `view`.
- Learn diagrams have no "Not drawn accurately" note (they are
  accurate). Question diagrams have it (they're drawn at the true angle
  anyway).
- Working lines sit under the diagram, wrap on a phone and never scroll
  sideways.
- Every Learn screen's taps are saved and come back on reload and Back.

## Wording rules for the whole lesson

- Say "the crossing line", never "transversal". Say "turn", "full turn",
  "half a turn".
- **Every new word gets what it means AND an example**, the first time
  it's used, in that order:
  - **acute, right angle, obtuse, reflex** (Learn 1), each with an
    angle size.
  - **vertically opposite** (Learn 4): "Vertically opposite angles are
    opposite each other where two lines cross, like the blades of open
    scissors. 'Vertically' doesn't mean up and down here."
  - **parallel** (Learn 5): "Parallel lines go the same way and never
    meet, like the two rails of a train track. Arrows on the lines show
    they're parallel."
  - **corresponding** (Learn 5), **alternate** (Learn 6), **co-interior**
    (Learn 7), each with its letter shape (F, Z, C) as a memory aid and
    a worked example with numbers.
- **The six reasons**, word for word everywhere (Learn, feedback,
  options):
  - "Angles on a straight line add up to 180°."
  - "Angles around a point add up to 360°."
  - "Vertically opposite angles are equal."
  - "Corresponding angles are equal."
  - "Alternate angles are equal."
  - "Co-interior angles add up to 180°."
- Write `180 − 65 = 115°` with spaces, `−` (not `-`), and `°` on the
  answer only.
- Typed cards use the shared `unit` field with `°`, so the pupil types
  only the number.
- Read every line aloud as a 14-year-old would. If it needs reading
  twice, rewrite it.

## Learn (8 screens, all showing, nothing asked)

1. **An angle is an amount of turn.**
   - What it is: "An angle tells you how far something has turned. We
     measure it in degrees (°). A full turn, all the way round, is 360°."
   - Example: a big diagram of one angle, and under it four small
     cards in a row (two by two on a phone), each a mini diagram of a
     real angle with its name and size: **acute** 40° ("less than 90°,
     like a slice of pizza"), **right angle** 90° ("exactly 90°, like
     the corner of a page; drawn with a little square"), **obtuse** 130°
     ("between 90° and 180°, like a door opened wide"), **reflex** 250°
     ("more than 180°, the long way round"). The cards are tappable
     (`aria-pressed` buttons, as in the density lesson's tap buttons).
   - The pupil does: tap a card. The big diagram turns its line from 0°
     round to that size (a 600 ms turn), the arc follows, and the line
     under it says, for example: "130° is more than 90° and less than
     180°, so it's obtuse." Starts with acute shown.
   - Callout: "Half a turn is 180°: a straight line."
2. **Angles on a straight line add up to 180°.**
   - What it is: "A straight line is half a turn, so it's 180°. The
     angles on one side of a straight line always add up to 180°."
   - Example: a straight line with a line coming out of it. One angle
     is `130°`, the other is `x`. Above the line, a faint half circle
     marked `180°`.
   - The pupil does, by tapping the diagram:
     1. Tap the 130° angle: its slice of the half circle fills orange.
        Working: "The whole half turn is 180°."
     2. Tap x: the rest of the half circle fills in a second colour, and
        x's label changes to `50°`. Working: "x = 180 − 130 = 50°".
   - Callout: "To find a missing angle on a straight line, take the
     angles you know away from 180."
3. **Angles around a point add up to 360°.**
   - What it is: "Angles all the way round a point make a full turn.
     They always add up to 360°."
   - Example: three lines from a point. Angles `100°`, `120°` and `x`.
     A faint full circle marked `360°`.
   - The pupil does:
     1. Tap 100°, then 120°: each fills its slice of the circle.
        Working: "100 + 120 = 220".
     2. Tap x: the rest of the circle fills, x becomes `140°`. Working:
        "x = 360 − 220 = 140°".
   - Callout: "Add the angles you know, then take that away from 360."
4. **Vertically opposite angles are equal.**
   - What it is: "When two straight lines cross, they make four angles.
     The angles opposite each other are equal. They're called
     **vertically opposite** angles, like the blades of open scissors.
     'Vertically' doesn't mean up and down here."
   - Example: two lines crossing. One angle is `50°`. The other three
     are `a`, `b` and `c` (a next to the 50°, b opposite it, c opposite
     a).
   - The pupil does:
     1. Tap b: the 50° angle turns half a turn round the crossing point
        (an orange copy, 600 ms) and lands exactly on b. b becomes `50°`,
        1 arc each. Working: "b = 50°. Vertically opposite angles are
        equal."
     2. Tap a: Working: "a = 180 − 50 = 130°. Angles on a straight line
        add up to 180°." a gets 2 arcs.
     3. Tap c: it's opposite a. c becomes `130°`, 2 arcs. Working: "c =
        130°. Vertically opposite angles are equal."
   - Tapping a or c before b works too, in any order: each tap does its
     own step, using what's already found. If a step needs an angle not
     found yet, say which to tap first.
5. **Parallel lines: corresponding angles are equal.**
   - What it is: "**Parallel** lines go the same way and never meet, like
     the two rails of a train track. Arrows on the lines show they're
     parallel. A crossing line cuts both rails at the same slope. So the
     angles in matching corners are equal. They're called
     **corresponding** angles. They make an F shape."
   - Example: parallel lines (`arrows: 1`), crossing line at 60°. Top
     crossing, above-right: `60°`. Bottom crossing, above-right: `x`.
   - The pupil does: tap x. An orange copy of the 60° angle slides down
     the crossing line (600 ms) and fits exactly on x. x becomes `60°`
     and the F shape is drawn in highlight. Working: "x = 60°.
     Corresponding angles are equal."
6. **Alternate angles are equal.**
   - What it is: "Now look between the parallel lines. Two angles on
     opposite sides of the crossing line, one at each parallel line, are
     equal. They're called **alternate** angles. They make a Z shape."
   - Example: the same parallel lines and 60° crossing line. Between the
     lines: top crossing below-right `120°`, bottom crossing above-left
     `y`. The other two angles between the lines are drawn with arcs
     but no labels.
   - The pupil does: tap y. The Z shape is drawn in highlight and an
     orange copy of the 120° angle slides down the crossing line,
     turning half a turn as it goes, and fits exactly on y. y becomes
     `120°`. Working: "y = 120°. Alternate angles are equal."
   - Tapping one of the two unlabelled angles says: "That one is on the
     same side as 120°. Tap the angle on the other side of the crossing
     line."
7. **Co-interior angles add up to 180°.**
   - What it is: "Two angles between the parallel lines, on the **same**
     side of the crossing line, are **co-interior** angles. They make a C
     shape. They aren't equal. They add up to 180°."
   - Example: same lines. Top crossing below-right `120°`, bottom
     crossing above-right `z`.
   - The pupil does:
     1. Tap z. The C shape is drawn in highlight. An orange copy of the
        120° angle slides down to the bottom crossing and sits next to
        z, so together they fill the straight line there. Working: "120°
        and z make a straight line."
     2. Tap z again: z becomes `60°`. Working: "z = 180 − 120 = 60°.
        Co-interior angles add up to 180°."
8. **Find it, and say why.**
   - What it is: "In the exam you must give a reason for every step. Use
     the rules you've learned, word for word."
   - Example: parallel lines, crossing line rising to the right at 65°.
     Top crossing: above-right `65°`, below-left `y`. Bottom crossing:
     above-left `x`.
   - The pupil does:
     1. Tap y: "y = 65°. **Vertically opposite angles are equal.**"
     2. Tap x: "x = 180 − 65 = 115°. **Co-interior angles add up to
        180°.**" Tapping x before y says: "Find y first. You need it to
        find x."
   - Under the diagram, the six reasons as a list (this is the only
     place they're all together).

## Try it (10 cards: 4 choice, 4 typed, 2 tap)

Parallel line diagrams below name corners like this: **top** or
**bottom** crossing, then **above-left**, **above-right**, **below-left**
or **below-right** of that crossing. The crossing line rises to the
right at angle θ from the parallel lines, so at each crossing:
above-right = below-left = θ, above-left = below-right = 180 − θ.

1. Choice (bank 01): "An angle measures 124°. What type of angle is
   it?" No diagram.
   - "Obtuse" ✓ *"124° is more than 90° and less than 180°."*
   - "Acute" *"Acute angles are less than 90°. 124° is more than 90°."*
   - "Reflex" *"Reflex angles are more than 180°. 124° is less than
     180°."*
   - "Right angle" *"A right angle is exactly 90°."*
2. Typed, `unit: '°'` (bank 02): "Find angle x." Diagram: a straight
   line, a line from a point on it, angles `138°` and `x`. Answer 42.
   Rules: 222 → *"That uses 360°. The angles are on a straight line, so
   they add up to 180°."*; 138 → *"x isn't opposite the 138°. It's next
   to it on a straight line, so they add up to 180°."* Fallback: *"Angles
   on a straight line add up to 180°."* Right: *"180 − 138 = 42°"*
3. Choice (bank 04): "Find angle x." Diagram: three lines from a point,
   angles `92°`, `146°` and `x`.
   - `122°` ✓ *"Angles around a point add up to 360°. 92 + 146 = 238.
     360 − 238 = 122°"*
   - `214°` *"That only takes away 146°. Take away both angles you
     know."*
   - `−58°` *"That uses 180°. The angles go all the way round, so they
     add up to 360°."*
   - `238°` *"That adds the two angles you know. Now take that away
     from 360."*
4. Tap (`questionWidget`, `answer: 'choose'`): "Tap the angle that is
   vertically opposite angle p." Diagram: two lines crossing like an X,
   angles p (top), q (right), r (bottom), s (left), all four tappable.
   - r ✓ *"r is opposite p, across the crossing. Vertically opposite
     angles are equal."*
   - p *"That's angle p itself. Tap the angle across the crossing from
     it."*
   - q *"q is next to p, on a straight line. They add up to 180°.
     Vertically opposite means across the crossing."*
   - s *"s is next to p, on a straight line. They add up to 180°.
     Vertically opposite means across the crossing."*
5. Typed, `unit: '°'` (bank 05): "Two straight lines cross. Find angle
   x." Diagram: an X with one angle `117°` and x next to it. Answer 63.
   Rules: 117 → *"x isn't opposite the 117°. It's next to it, on a
   straight line."*; 243 → *"That uses 360°. x and 117° are on a straight
   line, so they add up to 180°."* Fallback: *"Angles on a straight line
   add up to 180°."* Right: *"180 − 117 = 63°"*
6. Choice (bank 06): "Find angle b." Diagram: parallel lines, θ = 73,
   top above-right `73°`, bottom above-right `b`.
   - `73°` ✓ *"73° and b are in matching corners. Corresponding angles
     are equal."*
   - `107°` *"Corresponding angles are equal. They don't add up to
     180°."*
   - `287°` *"That takes 73 away from 360. Corresponding angles are
     equal."*
   - `17°` *"That takes 73 away from 90. b isn't part of a right angle.
     Corresponding angles are equal."*
7. Tap: "Tap the angle that is alternate to angle a." Diagram: parallel
   lines, θ = 60, a at top below-right (highlighted, `120°` not shown).
   Tappable angles, each with an arc and a letter:
   - b at bottom above-left ✓ *"b is on the other side of the crossing
     line, between the parallel lines. Alternate angles make a Z
     shape."*
   - c at bottom below-right *"c is in the same corner as a. That's
     corresponding, not alternate."*
   - d at bottom above-right *"d is on the same side of the crossing line
     as a. That's co-interior: they add up to 180°."*
   - e at top above-left *"e is opposite a where the lines cross. That's
     vertically opposite."*
8. Typed, `unit: '°'`: "Find angle x." Diagram: parallel lines, θ = 64,
   top below-left `64°`, bottom above-left `x`. Answer 116. Rules: 64 →
   *"x and 64° are on the same side of the crossing line. They're
   co-interior, so they add up to 180°, not equal."*; 296 → *"That uses
   360°. Co-interior angles add up to 180°."* Fallback: *"Co-interior
   angles add up to 180°."* Right: *"180 − 64 = 116°"*
9. Choice: "x = 52°. Which reason is right?" Diagram: parallel lines,
   θ = 52, top below-left `52°`, bottom above-right `x`.
   - "Alternate angles are equal." ✓ *"x and 52° are between the parallel
     lines, on opposite sides of the crossing line: a Z shape."*
   - "Corresponding angles are equal." *"Corresponding angles are in
     matching corners, an F shape. These two are in a Z shape."*
   - "Vertically opposite angles are equal." *"Vertically opposite
     angles are at the same crossing. These are at different
     crossings."*
   - "Co-interior angles add up to 180°." *"Co-interior angles are on
     the same side of the crossing line. These are on opposite sides,
     and they're equal."*
10. Typed, `unit: '°'`: "Find angle x." Diagram: parallel lines, θ = 55,
    top above-left `125°`, bottom above-right `x`. Answer 55. Rules: 125
    → *"x isn't in the same corner as 125°. Find the angle next to 125°
    first: 180 − 125 = 55°. Then use corresponding angles."*; 235 → *"That
    uses 360°. 125° is on a straight line with the angle next to it."*
    Fallback: *"Find the angle next to 125° first."* Right: *"180 − 125 =
    55°. Then corresponding angles are equal, so x = 55°"*

## Practice (generator, 6 per session: 2 choice, 3 typed, 1 tap)

`runQuestionSet` with the seeded `random`, as in the density lesson.
Each choice has four different options, shuffled with the seeded
`random`; redraw if two match. Every rule value must differ from the
answer and from every other rule. Every right answer gets its own
feedback with the working. Every card has a diagram drawn at its true
angles, with "Not drawn accurately".

Parallel-line cards: θ is a whole number from 40 to 140, but never 85 to
95 (so θ and 180 − θ always look and are different).

| Type | Skill | Card | Builds |
|---|---|---|---|
| `straight-line` | point-line | typed | Half the time one angle g (25 to 155, not 90) and x; half the time two angles a, b (each 20 to 100, a + b at most 160) and x, all on one side of a straight line. Answer 180 − total. Rules: 360 − total (*"That uses 360°. The angles are on a straight line, so they add up to 180°."*); for one angle, g (*"x is next to g, on a straight line. They add up to 180°."*); for two, a + b (*"That adds the two you know. Now take that away from 180."*). |
| `around-point` | point-line | choice | Two angles a, b (each 40 to 170, a + b from 150 to 300) or three (each 40 to 120, total at most 300), and x, round a point. Right: 360 − total. Wrong: 180 − total, shown with `−` if it's negative (*"That uses 180°. The angles go all the way round, so they add up to 360°."*); 360 − the biggest angle only (*"That only takes away one angle. Take away all the angles you know."*); the total (*"That adds the angles you know. Now take that away from 360."*). |
| `opposite` | vertically-opposite | typed | Two lines cross, one angle g (20 to 160, not 90). Half the time x is opposite g: answer g, rules 180 − g (*"x is opposite g, not next to it. Vertically opposite angles are equal."*), 360 − g (*"Vertically opposite angles are equal."*). Half the time x is next to g: answer 180 − g, rules g (*"x is next to g, on a straight line. They add up to 180°."*), 360 − g (*"x and g are on a straight line, so they add up to 180°."*). |
| `find-the-pair` | parallel | tap | Angle a at one of the four corners **between** the parallel lines (top below-left, top below-right, bottom above-left, bottom above-right). Ask for its corresponding, alternate or co-interior angle (equal chance). Tappable: those three angles and its vertically opposite angle, given the letters b, c, d, e in a seeded random order. Feedback as Try it 7. |
| `parallel-angle` | parallel | typed | g at one of the four between-the-lines corners, x at its corresponding, alternate or co-interior angle (equal chance). Answer g, or 180 − g for co-interior. Rules: the other one of g and 180 − g (*"Corresponding and alternate angles are equal. Co-interior angles add up to 180°."* worded for the real pair, as in Try it 6 and 8), 360 − g (*"That uses 360°."* plus the right rule). |
| `which-reason` | parallel | choice | x and g joined by one of: vertically opposite, corresponding, alternate, co-interior (equal chance). Right: that reason. Wrong: the other three of those four. Feedback as Try it 9, worded for the real pair. |

Each session has one card of each type, in a mixed order picked with the
seeded `random`. That gives every session 2 point-line, 1
vertically-opposite and 3 parallel cards.

## Check (6 fixed questions: 3 choice, 3 typed)

1. Choice (bank 11): "Sam says the angles round a point are 95°, 125°
   and 130°. Why must Sam be wrong?" Diagram: three lines from a point,
   labelled with those angles.
   - "They add up to 350°, not 360°." ✓ *"95 + 125 + 130 = 350. Angles
     around a point add up to 360°."*
   - "They add up to 350°, not 180°." *"180° is for a straight line. Angles
     around a point add up to 360°."*
   - "Angles round a point must all be the same size." *"They can be
     different sizes. They must add up to 360°."*
   - "One of them is obtuse." *"Angles round a point can be any type. They
     must add up to 360°."*
2. Typed, `unit: '°'` (bank 10): "The small angle between two lines is
   64°. What is the reflex angle round the outside?" Diagram: two lines
   from a point, the small angle labelled `64°`, the reflex one `x`
   (`turn` chosen so its arc goes the long way round). Answer 296. Rules:
   116 → *"That uses 180°. The two angles go all the way round, so they
   add up to 360°."*; 424 → *"That adds 64 to 360. Take it away: 360 −
   64."* Fallback: *"The two angles make a full turn: 360°."* Right:
   *"360 − 64 = 296°"*
3. Choice (bank 07): "Which two angles are alternate?" Diagram: parallel
   lines, θ = 70, between the lines: p at top below-left, q at top
   below-right, r at bottom above-right, s at bottom above-left. No sizes.
   - "p and r" ✓ *"p and r are between the parallel lines, on opposite
     sides of the crossing line: a Z shape."*
   - "p and s" *"p and s are on the same side of the crossing line. That's
     co-interior."*
   - "r and s" *"r and s are next to each other on the bottom line. They
     add up to 180°."*
   - "p and q" *"p and q are next to each other on the top line. They add
     up to 180°."*
4. Typed, `unit: '°'`: "Find angle x." Diagram: parallel lines, θ = 48,
   top above-right `48°`, bottom above-left `x`. Answer 132. Rules: 48 →
   *"48° moves down to the bottom line as a corresponding angle. x is
   next to it on a straight line, so take it away from 180."*; 312 →
   *"That uses 360°. x is on a straight line with the 48° angle."*
   Fallback: *"Use corresponding angles, then the straight line."* Right:
   *"Corresponding angles are equal, so the bottom above-right angle is
   48°. 180 − 48 = 132°"*
5. Choice (bank 13): "A line crosses two other lines. The angles in
   matching corners are 112° and 109°. Are the two lines parallel?"
   Diagram: the two lines drawn not quite parallel, no arrows, the two
   angles labelled.
   - "No. If they were parallel, the angles would be equal." ✓ *"Corresponding
     angles on parallel lines are equal. 112° and 109° aren't equal."*
   - "Yes. Both angles are obtuse." *"Being the same type isn't enough.
     The angles would have to be equal."*
   - "No. If they were parallel, the angles would add up to 180°." *"That's
     co-interior angles. Angles in matching corners are corresponding:
     they'd be equal."*
   - "Yes. They're only 3° apart." *"Close isn't enough. On parallel lines
     these angles are exactly equal."*
6. Typed, `unit: '°'`: "Two straight lines cross. One angle is 72°. Angle
   y is next to it. Angle z is opposite y. Find z." Diagram: an X with
   `72°`, `y` and `z`. Answer 108. Rules: 72 → *"z is opposite y, not
   opposite the 72°. Find y first: 180 − 72."*; 288 → *"That uses 360°.
   y is on a straight line with 72°, so y = 180 − 72."* Fallback: *"Find
   y first, then use vertically opposite angles."* Right: *"y = 180 − 72 =
   108°. Vertically opposite angles are equal, so z = 108°"*

Check 1 and 2 are point-line, 6 is vertically-opposite, 3, 4 and 5 are
parallel.

## lesson.json

Copy the density lesson's. Question types map to skills:
`straight-line`, `around-point`, `try-1`, `try-2`, `try-3`, `check-1`,
`check-2` → `angles-point-line`; `opposite`, `try-4`, `try-5`, `check-6`
→ `vertically-opposite-angles`; `find-the-pair`, `parallel-angle`,
`which-reason`, `try-6` to `try-10`, `check-3`, `check-4`, `check-5` →
`parallel-line-angles`. `session_length: 6`. Summary points:

- "Angles on a straight line add up to 180°. Angles around a point add
  up to 360°."
- "Vertically opposite angles are equal."
- "On parallel lines: corresponding angles (F) are equal, alternate
  angles (Z) are equal, co-interior angles (C) add up to 180°."
- "Give a reason for every step, using the rule's words."

## Files

`content/angle-facts/`: `index.php` (loads `diagram.css` and
`diagram.js` as `docs/shared-diagram.md` says), `lesson.json`,
`lesson.css`, `angles.js` (all text, cards, diagram builders and the
generator, on `window.AngleFacts`), `interactive.js` (Learn and Try it),
`questions.js` (Practice and Check). Unit test:
`tests/angle-facts.test.cjs`.

`angles.js` has one builder for each kind of picture (straight line,
round a point, crossing lines, parallel lines), so Learn, Try it,
Practice and Check all draw them the same way. The parallel builder
takes θ and a map of corner names (`'top-above-left'` and so on) to a
label, a tone and whether it's tappable.

**The test contract.** `window.AngleFacts` has `learnScreens`,
`examples()`, `checks()`, `practiceTypes`, `pick(random)`,
`generate(item, random)`, `prepare(question, random)` and
`cornerAngle(theta, corner)` (the size at a corner, from the rule at the
top of Try it). Every card config also carries `skill` (`'point-line'`,
`'opposite'` or `'parallel'`), `angles` (each given angle and x, by
position) and `asked`: `'name'` (Try it 1), `'size'`, `'pair'` (tap and
Check 3), `'reason'` (Try it 9, `which-reason`), `'judge'` (Check 1 and
5).

## Testing: Freebuff does all of it

Run every test in Part D of `docs/freebuff-relay.md`:
1. syntax
2. write `tests/angle-facts.test.cjs`, copying the density lesson's test
   (500 real 32-bit seeds). Also check, for every generated card: every
   angle is a whole number from 1 to 359; given angles plus x add up to
   180 (straight line) or 360 (round a point); `cornerAngle` gives the
   right answer for every parallel card; tap cards have four different
   positions and exactly one right.
3. `npm test`
4. the **full** `npm run test:ui` on your branch and on `origin/main`
   (first build)
5. `learn-shots.cjs`, plus a screenshot of every Try it and Check
   diagram, and three Practice cards of each type, at desktop and
   375 px
6. `./build.sh` with its checks

Paste the real output of each into your reply. **Look at every
screenshot yourself** as a pupil would: every letter and number next to
its own arc, nothing on a line, nothing cut off. Say in the report which
ones you looked at.

## Commits

1. "Plain subtitle for the angle facts lesson" (`content/curriculum.json`
   only).
2. "Add angle facts lesson": the lesson folder, the unit test and this
   spec (copy it from the main checkout's `docs/`).
3. "Rebuild dist with the angle facts lesson" (`dist/` only).

Push the branch. Never open a PR or merge until a signed Claude message
says Umar approved it.

## What Claude checks at review

From Freebuff's reply, the diff and the screenshots:
- Learn 1 shows the angle types before anything is asked.
- Every Learn screen says what the rule is, then works an example with
  numbers, and every tap does a real step of it.
- No sliders and no "drag to watch it change" anywhere.
- Labels sit by their own arcs at 375 px, with nothing overlapping or
  scrolling sideways.
- Equal angles share arc counts on every screen.
- Four options on every choice, four tappable angles on every tap card,
  each wrong one with its own feedback.
- Every rule and reason a question uses is taught in Learn, in the same
  words.
- All tests pass, with no test that fails on the branch but not on
  `main`.
- Reload, Back and Practise again work, including saved Learn taps.
- The `dist/` lesson's last button reaches the homepage.

## Notes

- **Three skills, one idea.** The placeholder already lists all three.
  They share one method (find the angle from a rule, then give the
  rule), so they stay together. Angles in triangles and polygons are the
  next two lessons.
- **Left out:** angles as algebra (`2x`), ratios of angles, measuring
  with a protractor (that will be with bearings), and the triangle proof
  from bank 14. Each needs something this lesson doesn't teach.
- **No sliders, no dragging to watch numbers change.** Every Learn
  screen says what the rule is, gives a worked example with numbers,
  and the pupil taps to do each step (the angle slides or turns into
  place to show why it works).
- **No exam board** anywhere.
- I checked every answer and every wrong option in this spec.
