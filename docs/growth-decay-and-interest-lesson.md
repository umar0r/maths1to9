# Growth, decay and interest: lesson spec

Built from the lesson template and the shared engine. It fills the
existing placeholder `growth-decay-and-interest` (skills `simple-interest`
and `compound-growth-decay`). It comes straight after "Percentage
multipliers" and reuses that lesson's bar picture and colours.

It teaches: what interest is; simple interest (the same amount every
year); compound interest (interest on interest, so × 1.05ⁿ); the total
versus the interest only; and things that lose value every year.

Sources: the parts of Umar's "Multipliers" draft that were moved out of
that lesson (Learn card 5, Try it round 5, worked example 3, the
simple-vs-compound explorer and the interest generators), plus bank cards
`growth-decay-and-interest-01` to `-07` and `-09`, `-11` to `-13`.
Left out: bank `-08` and `-10` (working back to the rate or the start).
That's a different method, and it belongs in a later lesson.

## Registration

None. The placeholder, both skills and the lesson's place on the homepage
already exist. Change nothing in `curriculum.json`, `skills.json` or
`collections.json`.

## Wording

Write for GCSE Foundation pupils, the way a good teacher talks. Read every
line out loud before it goes in.

- "Interest" is new. Learn 1 says what it is: "extra money the bank adds".
- Say "times by", "comes off", "the money you put in". Say "the total"
  (or "what's in the account") and "the interest" and keep them apart.
- "Depreciation" is used in exams, so Learn 6 explains it once: "losing
  value". After that, prompts can use it with "(loses value)".
- Working uses `×`, no full stop: `1000 × 1.05³ = £1157.63`. Money always
  has 2 decimal places when there are pence.
- Typed money cards: `inputLabel: 'Pounds (no £ sign)'`, `tolerance: 0.01`.
  Counts: "Round to the nearest whole number", `tolerance: 0.5`.

## Learn (6 screens, all teaching, no questions)

The bar from "Percentage multipliers": grey for the money you put in,
green for interest added, red striped for value lost, blue `×` pill for
the multiplier. Sliders only change the picture. A new bar starts whole,
then its change grows.

1. **Money that grows.** £1000 in a savings account. Slider "Interest
   rate: 1% to 10%" (starts on 5). One bar: grey £1000 and a green block
   for the interest. Working: `5% of £1000 = £50`, then "After 1 year, you
   have £1050." Text: "You put £1000 in a savings account. Each year, the
   bank adds some extra money. This extra money is called interest. The
   bank tells you the interest rate as a percentage. You can use a
   calculator."
2. **Simple interest: the same every year.** Slider "Years: 0 to 5"
   (starts on 3). One green bar per year showing only that year's
   interest, all the same length (£50), captioned "Year 2: £50 interest.
   Total £1100." (A bar with the £1000 in it swamped the interest, so the
   bars show the interest alone.) Working: `£50 × 3 = £150 interest`,
   `£1000 + £150 = £1150`. Text: "With simple interest, you only get
   interest on the money you put in. So you get the same amount every
   year: 5% of £1000 is £50, every year."
3. **Compound interest: interest on interest.** Same slider and bars, but
   each year's green bar is a bit longer than the last: £50, £52.50,
   £55.13, … with totals £1050, £1102.50, £1157.63, £1215.51, £1276.28. Working:
   `1000 × 1.05 × 1.05 × 1.05` and `1000 × 1.05³ = £1157.63`. Text: "With
   compound interest, the interest goes into your account. Next year, you
   get interest on that too. So the interest gets bigger every year. It's
   the same as the last lesson: times by 1.05 once for each year."
   Callout: "Round only at the end."
4. **Simple or compound?** Two bars, one above the other, both £1000 at
   5%. Slider "Years: 1 to 10" (starts on 10). "Simple: £1500" and
   "Compound: £1628.89", and a line: "Compound gives £128.89 more." Text:
   "Compound interest always ends up ahead. The longer you leave the
   money, the bigger the gap."
5. **The total or just the interest?** £2000 saved for 3 years at 8%
   compound interest (the draft's £5000 at 2% made the interest too thin
   to see). Slider "Show the steps: 1 to 2" (starts on 1). Step 1: a bar
   of the total, `2000 × 1.08³ = £2519.42`. Step 2: the bar splits into
   grey "£2000 you put in" and green "£519.42", with
   `2519.42 − 2000 = £519.42`. Text: "Read the question
   carefully. Does it ask for the total in the account, or just the
   interest? Interest = total − the money you put in."
6. **Things that lose value.** A phone costs £800. It loses 20% of its
   value every year. Slider "Years: 0 to 4" (starts on 2). Bars as in
   "Percentage multipliers", each red cut smaller than the last: £640,
   £512, £409.60, £327.68. Working: `800 × 0.8² = £512`. Text: "Some
   things lose value every year, like cars and phones. This is called
   depreciation. It works the same way: 20% off each year means times by
   0.8 each year." Callout: "Count the years carefully. From the start of
   2022 to the start of 2025 is 3 years, not 4."

## Try it (10 cards: 4 choice, 6 typed)

1. Typed (bank `-01`): "£1800 is in a savings account. It earns 4.5%
   simple interest each year. How much interest does it earn in one
   year?" 81. Rules: 1881 (*"That's the total. The question asks for the
   interest only."*); 8.1 (*"4.5% is 0.045, not 0.0045."*); 810 (*"4.5% is
   0.045, not 0.45."*).
2. Choice: "£600 earns 3% simple interest each year. How much interest
   does it earn in 4 years?" £72 ✓ / £18 (one year) / £672 (the total) /
   £75.31 (compound interest).
3. Typed (bank `-03`): "£2000 earns 5% simple interest each year. How much
   interest does it earn in 3 years?" 300. Rules: 2300 (total), 315.25
   (compound), 100 (one year).
4. Choice (bank `-04`): "£3600 earns 2.5% simple interest each year. How
   much is in the account after 4 years?" £3960 ✓ / £3690 (one year) /
   £360 (interest only) / £3973.73 (compound).
5. Typed (bank `-02`): "£1250 is saved at 4% compound interest. How much
   is in the account after 2 years?" 1352. Rules: 1350 (simple), 1300
   (one year), 102 (interest only).
6. Typed: "£3000 is saved at 4% compound interest. How much is in the
   account after 3 years?" 3374.59. Rules: 3360 (simple), 3120 (one
   year), 374.59 (interest only).
7. Typed (draft round 5): "£2000 is saved at 3% compound interest for 2
   years. How much interest does it earn?" 121.80. Rules: 2121.8 (total),
   120 (simple), 60 (one year).
8. Choice (bank `-06`): "A projector is worth £2400. It loses 15% of its
   value each year. What is it worth after 3 years?" £1473.90 ✓ / £1320
   (adds 45%) / £926.10 (the amount lost) / £3650.10 (times by 1.15).
9. Typed (bank `-05`): "A wood has 1800 pairs of birds. The number goes up
   by 8% each year. How many pairs are there after 3 years? Round to the
   nearest whole number." 2267 (`tolerance: 0.5`). Rules: 2232 (adds
   24%), 467 (the increase only), 2100 (two years).
10. Choice (bank `-13`): "At the start of 2022, a painting is worth £400.
    Its value goes up by 5% each year. What is it worth at the start of
    2025?" £463.05 ✓ / £486.20 (4 years) / £460 (simple) / £420 (one
    year).

## Practice (generator, 6 per session: 3 choice, 3 typed)

Money P from £500 to £10 000 in £100s. Rates: whole numbers 1 to 10, or
1.5, 2.5, 3.5. Years 2 to 5. Every money rule differs from the answer by
more than the tolerance. Count rules differ by more than 1.5, so a pupil
who rounds the wrong way isn't told they made a different mistake.

| Type | Skill | Card | Builds |
|---|---|---|---|
| `simple-interest` | `simple-interest` | typed | Asks for the interest or the total (50/50). Rules: the other one of those two, one year only, the compound answer. |
| `simple-choice` | `simple-interest` | choice | "How much is in the account after n years?" Right: P + interest. Wrong: interest only, one year's interest only, the compound total. |
| `compound-total` | `compound-growth-decay` | typed | "How much is in the account after n years?" Rules: simple total, one year, interest only. |
| `compound-interest` | `compound-growth-decay` | choice | "How much interest does it earn?" Right: total − P. Wrong: the total, simple interest, the first year's interest. |
| `depreciation` | `compound-growth-decay` | choice | A car, van or laptop loses r% (5 to 25) each year. Right: P × (1 − r/100)ⁿ. Wrong: adding the percentages, the amount lost, times by 1 + r/100. |
| `growth-count` | `compound-growth-decay` | typed | Birds, people or members grow by r% a year. Nearest whole number, `tolerance: 0.5`. Rules: adding the percentages, one year, the increase only. |

## Check (5 fixed questions: 2 choice, 3 typed)

1. Typed (bank `-09`): "£5000 is saved at 1.2% compound interest. How
   much interest does it earn in 3 years?" 182.17. Rules: 5182.17
   (total), 180 (simple), 5180 (simple total).
2. Choice (bank `-11`): "Two accounts both start with £4000. Account A
   pays 3% simple interest. Account B pays 2.9% compound interest. After 5
   years, which has more money?" "Account B, by £14.63" ✓ / "They have the
   same" / "Account B, by £614.63" (B's interest) / "Account A, by £20"
   (B worked out as simple).
3. Typed (bank `-07`): "£2800 is saved. It earns 2% interest in the first
   year and 4% in the second year. How much is in the account after 2
   years?" 2970.24. Rules: 170.24 (interest only), 3028.48 (4% both
   years), 2968 (adds 6%).
4. Choice (bank `-12`): "£2000 is saved at 6% compound interest. Will it
   reach £4000 in 12 years?" "Yes. It will be about £4024.39" ✓ / "No. It
   will be £3440" (simple) / "No. It will be £2120" (one year) / "No. It
   will be less than £1" (used 0.06).
5. Typed: "A car is worth £15 000. It depreciates (loses value) by 12%
   each year. What is it worth after 3 years?" 10222.08. Rules: 9600
   (adds 36%), 13200 (one year), 4777.92 (the amount lost).

Summary points:
- Interest is extra money added to savings.
- Simple interest: the same amount every year.
- Compound interest: times by the multiplier once for each year, like
  1000 × 1.05³.
- Interest = total − the money you put in.
- Losing value works the same way: 20% off each year is × 0.8 each year.

## Test contract

`window.GrowthDecay` (in `growth.js`) with `learnScreens`, `examples()`,
`checks()`, `practiceTypes`, `CHOICE_TYPES`, `pick`, `generate`,
`prepare`. Every card carries `start`, `method` (`'simple'` or
`'compound'`), `direction` (`'up'` or `'down'`), `rates` (one per year)
and `asked` (`'interest'`, `'total'` or `'compare'`).
