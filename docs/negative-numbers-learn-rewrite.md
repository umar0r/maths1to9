# Negative numbers: rewrite the Learn section

Lesson: `content/negative-numbers/` ("Subtracting negative numbers").
Skill: `calculate-negative-numbers`. This spec changes **Learn only**.
Try it, Practice and Check stay as they are.
The Learn section title in `lesson.json` is **Negative numbers**.

The one thing this lesson teaches: **taking away a negative number is the
same as adding.** Every Learn screen moves the pupil towards that, and
nothing else. Ordering negatives is a different lesson, so it isn't taught
here.

Mockups of the screens are in `docs/negative-numbers-learn/`
(`screen-1.png` to `screen-8.png`). Build to match them. They show each
screen after the pupil has done every tap.

## What's wrong with the Learn screen now

The lesson opens straight on `3 − (−4)` and tells the pupil "the first −
means subtract, the second − belongs to the number", then "subtracting a
negative becomes adding a positive". That's a rule with no reason behind it:

- It never says what a negative number is or shows where it lives.
- There's no picture and nothing to do. The pupil reads two lines and
  presses "Next idea".
- "Belongs to the number" means nothing to a pupil who's unsure about
  negatives to start with.
- It never explains *why* taking away a negative makes the answer bigger.

## The new Learn: eight screens

Write the words exactly as they are below. They're written to be read out
loud by a teacher to one pupil. Don't chop them into shorter sentences.

Every number line in this lesson is the same: whole numbers from −10 to 10,
zero drawn bolder than the rest and circled. Negative numbers and positive
numbers each have their own colour, used the same way on every screen.
Labels must not overlap at 375 px. On phones the line uses the full card
width and a taller picture so the hops are clear. Screen 1 has a 22 px marker
with a touch area at least 44 px wide. On screens 2, 3, 4, 7 and 8, each
number line has a soft outline until its first tap.

Each screen teaches one thing, like Brilliant, and each one builds on the
last:

1. What a negative number is and where it sits on the number line.
2. Taking away past zero (4 − 6).
3. Adding to a negative (−6 + 4).
4. Taking away from a negative (−2 − 3).
5. How to read a sum with two minus signs, 3 − (−2).
6. Why taking away a negative makes the answer go up (a pattern of sums).
7. The method: the two minus signs become a plus.
8. The same method with a negative first number.

No made-up stories (money, debts, notes): the maths itself is the example.

---

### Screen 1. Numbers below zero

Mockup: `docs/negative-numbers-learn/screen-1.png`

**Heading:** Numbers below zero

**Text:**

> Negative numbers are numbers below zero. You've already seen them on a
> cold day: −3°C is 3 degrees colder than 0°C. We write a negative number
> with a minus sign in front, and we say it as "negative 3".
>
> On this number line, zero sits in the middle. The positive numbers go to the
> right of zero, and the negative numbers go to the left. Zero itself is
> neither positive nor negative.

**Picture:** the number line. The left side (−10 to −1) is shaded in the
negative colour with the label "negative numbers" above it. The right side
(1 to 10) is shaded in the positive colour with the label "positive
numbers". Zero is circled.

**What the pupil does:** this is the one screen with a drag. A marker sits
on 0. The pupil drags it along the line; it snaps to whole numbers. A
sentence under the line updates as it moves, and each one makes sense on
its own:

- On 0: "You're on 0. Zero is neither positive nor negative."
- On a negative, e.g. −4: "You're on −4. That's 4 to the left of zero, so
  it's a negative number."
- On a positive, e.g. 6: "You're on 6. That's 6 to the right of zero, so
  it's a positive number."

The marker also works with the arrow keys. The main button is "Next"
straight away; the drag is there to explore, not a test.

---

### Screen 2. Taking away past zero

**Heading:** Taking away past zero

The one idea: taking away more than you started with takes you below zero.

**Text:**

> When you take away a positive number, you move left along the number line. If you take
> away more than you started with, you go past zero and end up on a
> negative number.

**Example:** `4 − 6`

> Start at 4. Taking away 6 means 6 steps to the left. Tap the number line to take each
> step.

Each tap draws one curved hop to the left and moves the dot. After the
sixth hop:

> You went past zero and landed on −2.
> **4 − 6 = −2**

**Pupil's turn** (appears once the example is done): `2 − 5`

> Your turn. Tap the number line to take 5 steps left.

Five taps, landing on −3, then **2 − 5 = −3**. Main button unlocks when
both are done.

---

### Screen 3. Adding to a negative number

**Heading:** Adding to a negative number

The one idea: adding moves you right, back up towards zero.

**Text:**

> When you add a positive number, you move right along the number line. If you start on a
> negative number, adding moves you back up towards zero, and sometimes
> past it.

**Example:** `−6 + 4`

> Start at −6. Adding 4 means 4 steps to the right. Tap the number line to take each step.

Four hops right, landing on −2. Then:

> You moved up towards zero but didn't reach it, so the answer is still
> negative.
> **−6 + 4 = −2**

**Pupil's turn:** `−3 + 7`

> Your turn. Tap the number line to take 7 steps right.

Seven hops, landing on 4. Then:

> This time you went past zero, so the answer is positive.
> **−3 + 7 = 4**

Main button unlocks when both are done.

---

### Screen 4. Taking away from a negative number

**Heading:** Taking away from a negative number

The one idea: taking away from a negative takes you further below zero.
This is the case pupils later mix up with taking away a negative, so it
needs its own screen.

**Text:**

> If you start on a negative number and take away a positive number, you still move left.
> That takes you further below zero, so the answer is more negative.

**Example:** `−2 − 3`

> Start at −2. Taking away 3 means 3 steps to the left. Tap the number line to take each
> step.

Three hops left, then **−2 − 3 = −5**.

**Pupil's turn:** `−4 − 5`

> Your turn. Tap the number line to take 5 steps left.

Five hops, then **−4 − 5 = −9**. Main button unlocks when both are done.

---

### Screen 5. Two minus signs in one sum

**Heading:** Two minus signs in one sum

The one idea: how to read a sum with two minus signs. No answers yet.

**Text:**

> Sometimes you have to take away a negative number, like 3 take away
> negative 2. We write it as 3 − (−2). The bracket keeps the negative 2
> together, so the two minus signs don't run into each other.

**What the pupil does:** `3 − (−2)` is shown large. "Tap each part of the
sum to see what it means." Tapping the first minus outlines it and shows
the label "take away" under it. Tapping the bracket outlines `(−2)` and
shows "the number negative 2". Main button unlocks once both have been
tapped.

---

### Screen 6. What happens when you take away a negative

**Heading:** What happens when you take away a negative

The one idea: taking away a negative makes the answer go up. This is the
reason, shown with a pattern of sums the pupil already trusts. No stories.

**Text:**

> Start with 3 and take away a smaller number each time. Watch what
> happens to the answer.

**What the pupil does:** "Tap to show the next line." Each tap adds one
line, with "up 1" beside every answer after the first:

```
3 − 3     = 0
3 − 2     = 1    up 1
3 − 1     = 2    up 1
3 − 0     = 3    up 1
3 − (−1)  = 4    up 1
3 − (−2)  = 5    up 1
```

The two lines with a negative are highlighted. After the last line:

> Each time you take away 1 less, the answer goes up by 1. Carry on past
> zero and you're taking away negative numbers, so the answer keeps going
> up. Taking away negative 2 gives 5, which is the same as 3 + 2.

Main button unlocks when this paragraph shows.

---

### Screen 7. Take away a negative: add instead

**Heading:** Take away a negative: add instead

The one idea: the method. The two minus signs become a plus, then add.

**Text:**

> So when you take away a negative, you can add instead. The take-away sign
> and the negative sign turn into a plus.

**What the pupil does:**

1. `3 − (−4)` is shown large with the two signs `− (−` highlighted.
   "Tap the two minus signs to turn them into a plus." On tap, the two
   signs and the bracket fade and a `+` takes their place: `3 + 4`.
2. "Now start at 3. Tap the number line to take 4 steps right." Four taps, four hops right,
   landing on 7.
3. The working appears: **3 − (−4) = 3 + 4 = 7**

Main button unlocks when the working shows.

---

### Screen 8. When the first number is negative

**Heading:** When the first number is negative

The one idea: the first number doesn't change, even when it's negative.

**Text:**

> It works the same way when the first number is negative. Only the two
> minus signs in the middle turn into a plus. The first number stays
> exactly as it is.

**What the pupil does:**

1. Tap the two middle minus signs. They turn into a plus: `−8 + 3`. The
   `−8` doesn't move or change.
2. "Start at −8. Tap the number line to take 3 steps right." Three taps, three hops, landing
   on −5.
3. The working appears: **−8 − (−3) = −8 + 3 = −5**

**Then a warning box:**

> Watch out: a common mistake is to change the −8 into 8 as well, and get
> 8 + 3 = 11. Only the two signs in the middle change.

Main button unlocks when the warning box shows. After this screen, Learn is
finished and Try it opens.

---

## What changed in the pasted starter text

- Kept: negative numbers are below zero, written with a minus sign, to the
  left of zero; positives to the right; zero is neither.
- Added the cold-day example so "below zero" means something straight
  away.
- Dropped "number lines are extremely useful tools", "visualise" and "put
  numbers in order of size". Ordering is a separate lesson, and the rest is
  padding.
- Dropped "always mark zero clearly on your number line". It's an
  instruction for drawing one, and the pupil isn't drawing here. Zero is
  marked clearly in the picture instead.
- Screens 2 and 3 use the worked examples Umar found (4 − 6 and −6 + 4),
  one per screen, rewritten as taps on the number line.

## Rules for whoever builds it

- Start the branch from `origin/main`. The local copy of this lesson is out
  of date with the live one.
- Follow AGENTS.md: four sections, one main button owned by the engine, no
  second button.
- No sliders. The drag on screen 1 is the only drag. Everything else is
  taps.
- Each tap must change the picture you can see (a hop, a sign turning into
  a plus, a new line). No tap that only reveals text.
- Save everything: reload on any screen shows the hops, labels, pattern lines
  and working the pupil has already done.
- Check every screen at 375 px: labels on the line don't overlap, the hops
  stay on screen, and the calculation fits on one line.
