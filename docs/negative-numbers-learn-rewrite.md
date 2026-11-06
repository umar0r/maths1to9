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

## The new Learn: ten screens

Each screen's first sentence is shown as its heading, and the rest of its
text follows underneath.
Always say "left" and "right" for moving on the number line, never
"back" or "forward". The Learn section title is hidden. Write the words exactly as they are below. They're written to be read out
loud by a teacher to one pupil. Don't chop them into shorter sentences.

Every number line in this lesson is the same: whole numbers from −10 to 10,
zero drawn bolder than the rest and circled. Negative numbers and positive
numbers each have their own colour, used the same way on every screen.
Labels must not overlap at 375 px. On phones the line uses the full card
width so the hops are clear. Each number line has a soft outline until its
first tap.

Every Learn screen can be opened from its address (`#learn-4`), and Next
always works, whatever the screen says about it unlocking below. Only the
last screen must be finished, to open Try it.

Each screen teaches one thing, like Brilliant, and each one builds on the
last:

1. What a negative number is, on a thermometer.
2. The number line is the thermometer lying on its side.
3. Taking away past zero (4 − 6).
4. Adding to a negative (−6 + 4).
5. Taking away from a negative (−2 − 3).
6. How to read a sum with two minus signs, 3 − (−2).
7. A bank fee taken and removed: why subtracting a negative adds.
8. Why taking away a negative makes the answer go up (a pattern of sums).
9. The method: the two minus signs become a plus.
10. The same method with a negative first number.

No made-up stories (money, debts, notes): the maths itself is the example.

---

### Screen 1. Numbers below zero

**Text (three short lines):**

> Negative numbers are numbers below zero.
>
> You've seen them on a cold day. −3°C is 3 degrees colder than 0°C.
>
> We write a negative number with a minus sign in front. We say −3 as
> "negative 3".

**Picture:** an upright thermometer from −10°C to 10°C, every number
labelled small beside the scale, negatives in red and positives in green.
The red level starts at −3°C.

**What the pupil does:** "Drag the red line up and down the thermometer."
A sentence underneath changes as it moves:

- "It's −3°C. That's 3 degrees below zero, so it's a negative number."
- "It's 0°C. Zero is neither positive nor negative."
- "It's 6°C. That's 6 degrees above zero, so it's a positive number."

The arrow keys work too. Next works straight away.

---

### Screen 2. The number line

**Text:**

> A number line is like a thermometer lying on its side.
>
> Zero is in the middle. The positive numbers go to the right of zero. The
> negative numbers go to the left.
>
> Zero itself is neither positive nor negative.

**Picture:** the same thermometer lying on its side: bulb on the left, −10
to 10 from left to right, still showing −3°C, with the same small numbers.
Nothing to tap. Next works straight away.

---

### Screen 3. Taking away past zero

The one idea: taking away more than you started with takes you below zero.

**Heading:** When you take away a positive number, you move left along the
number line.

**Text:**

> If you take away more than you started with, you go past zero and end up
> on a negative number.

**Instruction:**

> Take 6 away from 4.

Each tap on the number line moves the dot one place and draws a hop. When
the dot lands, the green box appears: **4 − 6 = −2**. Main button unlocks
then. There is no big sum above the line, no second sum and no "start" label.

---

### Screen 4. Adding to a negative number

The one idea: adding moves you right, towards zero and sometimes past it.

**Heading:** When you add a positive number, you move right along the number
line.

**First example, with no big sum above the line:** the dot starts on −6. The number line on
this screen has no blue highlight.

> Move the dot 4 places to the right.

Four hops right, landing on −2. Then:

> You moved up towards zero but didn't reach it, so the answer is still
> negative.
> **−6 + 4 = −2**

Main button unlocks when the green box shows. There is no second sum on
this screen.

---

### Screen 5. Taking away from a negative number

The one idea: taking away from a negative takes you further below zero.
Pupils later mix this up with taking away a negative, so it needs its own
screen.

**Heading:** If you start on a negative number and take away a positive
number, you still move left.

**Text:**

> That takes you further below zero, so the answer is more negative.

**First example, with no big sum above the line:** the dot starts on −2.

> Start at −2 and move 3 steps to the left.

Three hops left, then **−2 − 3 = −5**.

Main button unlocks when the green box shows. There is no second sum on
this screen, and the number line has no blue highlight.

---

### Screen 6. Two minus signs in one sum

**Heading:** Sometimes you have to take away a negative number.

`3 − (−2)` is shown large, in its two colours, with these labels showing
straight away: "subtract" under the −, and "negative 2" under (−2).

> We read this as ‘3 subtract negative 2’.
>
> The brackets show that −2 is the number we are subtracting.

Nothing to tap, and no answer yet.

---

### Screen 7. Removing a fee

**Heading:** Removing a fee puts the money back.

> For example, a £2 bank fee is a negative amount: −£2.
>
> Your balance was £5. The bank took a £2 fee, so your balance fell to £3.

**Picture:** a simple bank statement, all on the page from the start: a bank
icon and "Your bank account", then Balance £5, Fee −£2 and Balance now £3.
Under it: `5 + (−2) = 3`.

**What the pupil does:** "The fee was a mistake. Tap the fee to remove it."
The fee is crossed out and Balance now changes to £5. Then:

> The fee was a mistake. The bank removes it and puts £2 back.

`3 − (−2) = 5`

> Subtracting −2 has the same effect as adding 2.

**3 − (−2) = 3 + 2 = 5**

---

### Screen 8. What happens when you take away a negative

**Heading:** Another way of looking at it: start with 3 and take away a
smaller number each time.

> Watch what happens to the answer.

`3 − 3 = 0` is already showing. "Tap to show the next line." Each tap adds
one line, and beside each answer it says how far it has gone up from 0:

```
3 − 3     = 0
3 − 2     = 1    up 1
3 − 1     = 2    up 2
3 − 0     = 3    up 3
3 − (−1)  = 4    up 4
3 − (−2)  = 5    up 5
```

The two lines with a negative are highlighted. After the last line:

> Each time you take away 1 less, the answer goes up by 1. Carry on past
> zero and you're taking away negative numbers, so the answer keeps going
> up. Taking away negative 2 gives 5, which is the same as 3 + 2.

---

### Screen 9. Take away a negative: add instead

**Heading:** Take away a negative: add instead

The one idea: the method. The two minus signs become a plus, then add.

Keep this explanation: it says why taking away a negative moves the dot
right. Trim only the instructions.

**Text:**

> So when you take away a negative, you can add instead. The take-away sign
> and the negative sign turn into a plus.

**What the pupil does:**

1. `3 − (−4)` is shown large with the two signs `− (−` highlighted.
   "Tap the two minus signs to turn them into a plus." On tap, the two
   signs and the bracket fade and a `+` takes their place, and the line reads
   `3 − (−4) = 3 + 4`.
2. "Start at 3. Move the dot 4 places right." Four taps, four hops right,
   landing on 7.
3. The working appears: **3 − (−4) = 3 + 4 = 7**

Main button unlocks when the working shows.

---

### Screen 10. When the first number is negative

**Heading:** When the first number is negative

The one idea: the first number doesn't change, even when it's negative.

**Text:**

> It works the same way when the first number is negative. Only the two
> minus signs in the middle turn into a plus. The first number stays
> exactly as it is.

**What the pupil does:**

There is no big sum above the line and no signs to tap. The number line
shows straight away.

"Start at −8. Tap the number line to take 3 steps right." Three taps, three
hops, landing on −5. Then the working appears:
**−8 − (−3) = −8 + 3 = −5**

**Then a warning box:**

> Watch out: a common mistake is to change the −8 into 8 as well, and get
> 8 + 3 = 11. Only the two signs in the middle change.

Main button unlocks when the warning box shows. After this screen, Learn is
finished and Try it opens.

---

## Try it: multiplying negative numbers

Try it runs: the four subtracting examples, "A quick review", the sign grid,
five multiplying examples, then a second "A quick review".

**Sign grid page.** Heading: "When you multiply, the two signs tell you the
sign of the answer." "Tap each square to fill the grid." A grid with + and −
along the top and down the side, and four squares showing ?. Tapping a
square shows its sign and an example under the grid: 2 × 3 = 6, 2 × −3 = −6,
−2 × 3 = −6 or −2 × −3 = 6. Once all four are filled:

> When the two signs are the same, the answer is positive. When they are
> different, the answer is negative.

**Multiplying examples.** Each has a small table of the signs, with heavier
lines around the top row and first column. The question's row is pastel red
and its column pastel blue, so the square where they cross is purple:

1. Choice: Work out −6 × 4.
2. Typed: Work out −6 × −3.
3. Choice: Which square gives the sign of −8 × −2? (nothing coloured until the pupil picks an option, then the table colours that row and column)
4. Typed: Find the missing number: ? × −3 = 15.
5. Choice: Sam says −3 × −5 = −15. What is the right answer?

## Number line in the questions

Every typed "Work out" question in Try it, Practice and Check has a number
line above it. The pupil drags the dot to help them work it out, and hops
appear from the start to the dot. Above the hops it says how far they've
moved (+4, or −3 going left), and the number they're on shows below the line. Only the
typed answer is marked. The line stretches to fit the sum, with room to go
the wrong way. Lines longer than 20 only label every fifth number.

In Practice the line stays hidden at first. It appears after the first wrong
answer on that question, and works the same way from then on.

## Check

Five multiple choice questions that test understanding, not working out, one
for each key point:

1. − means go left and + means go right.
2. Two minus signs make a plus.
3. A negative times a positive gives a minus.
4. Starting on a negative and taking away goes further below zero.
5. Starting on a positive and taking away a bigger number goes past zero.

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
