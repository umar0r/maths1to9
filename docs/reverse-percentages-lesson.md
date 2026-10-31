# Reverse percentages: lesson spec

Fills the existing placeholder `reverse-percentages` (skill
`original-value-percentages`). One skill: **find the amount before a
percentage change.** The amount before is 100%, so the amount you have is a
known percentage of it. Find 1% then 100%, or divide by the multiplier.
Check by doing the change forwards.

Built by Claude on 2026-10-31 at Umar's request ("build this"), from his
pasted "Original Value Problems" plan. Same look and code pattern as
`percentage-multipliers` (PR #33): grey bar, red striped cut, green added
part, blue multiplier pill, CSS width transitions, sliders that never
rebuild the screen.

**The wording in `reverse.js` is the final version.** This file says what
each part does; the code holds every line the pupil reads.

## Registration

None. `curriculum.json`, `skills.json` and `collections.json` already list
the placeholder.

## Files

`content/reverse-percentages/`: `index.php`, `lesson.json`, `lesson.css`,
`reverse.js` (all text, cards and the generator, on
`window.ReversePercentages`), `interactive.js` (Learn and Try it),
`questions.js` (Practice and Check). Unit test:
`tests/reverse-percentages.test.cjs`.

## Learn (7 screens, all showing, nothing asked)

1. **Jo's mistake.** Coat 20% off, now £60. Jo adds 20% of £60 back on
   (£72). Step 2 checks it: 20% off £72 is £57.60, not £60. "The 20% came
   off the price before the sale, not off £60." Says a calculator is
   allowed.
2. **The price before is 100%.** Slider "Percentage off" 5–50%. The bar
   shows the cut and "80% = £60".
3. **Going up: more than 100%.** Rent up 25%, now £150. Slider 5–50%.
   Green part added; "125% = £150".
4. **Find 1%, then 100%.** Steps: £60 is 80% → 1% = £60 ÷ 80 = £0.75 (an
   orange 1% slice) → 100% = £75 → check.
5. **Or divide by the multiplier.** Forwards £75 × 0.8 = £60; backwards
   £60 ÷ 0.8 = £75 (the bar grows back). Callout: don't times £60 by 1.2.
6. **Up or down? Then divide.** £396 now. Up/Down toggle and a slider over
   10, 20, 25, 50% (all give exact pence). Three numbered steps and a
   check line, all live.
7. **Find the amount that is 100%.** Six phrases: "20% off", "go up by
   20%", "including 20% VAT" (VAT explained), "lost 20% of its value",
   "20% longer than Ben's", "20% less than Kim". Each shows which amount
   is 100%.

## Try it (10 cards: 5 choice, 5 typed)

% left after 35% off · 35% of a number is 91 (bank 01) · bike 30% off now
£56 · which calculation for rent up 25% to £150 · plant 15% taller now 92
cm · chair cut 24% now £228 (bank 03) · kettle £96 incl. 20% VAT · Ali
20% longer than Ben, 54 min · car lost 35%, now £7800 · Mo's mistake (up
50% to £90).

## Practice (generator, 6 per session: 3 choice, 3 typed)

| Type | Card | Builds |
|---|---|---|
| `percent-now` | choice | Up or down by P%: what % is the new amount? Wrong: P%, the other direction, 100%. |
| `which-divide` | choice | Up or down by 2–9%: what do you divide by? Wrong: other direction, P/100, the 0.P slip. |
| `compare` | choice | "A is P% longer / more / less than B." Wrong: Jo's answer, wrong way, ÷ P/100. |
| `decrease` | typed | Sale price, car value, town population. |
| `increase` | typed | Rent, price including 20% VAT, plant height, town population. |
| `percent-of-number` | typed | P% of a number is G (P up to 175%, bank 01 and 07). |

The amount before is always picked first (a whole number), so every
answer is exact. Typed cards accept within 0.01. Each rule is a real
mistake: adding the percentage back on, doing the change again, dividing
by the change instead of what's left, or stopping at 1%.

## Check (5: 2 choice, 3 typed)

Game 10% off now £27 · box 25% more than a bag, 80 sweets · fee goes up by
£84, which is 12% (bank 04) · which working undoes a 20% rise to 84 (bank
13) · sand loses 18%, now 3280 kg (bank 11, without standard form).

## Changes from the draft

- **Slug** is the existing placeholder `reverse-percentages`, not
  `original-value-problems`.
- **No exam board** (the draft named AQA and its codes).
- **Four sections only.** The Hook, Method, Explore tabs and worked
  examples all live inside Learn. No faded fill-in rounds or hint ladder
  (the engine has neither); fading is kept by card order, and hints come
  as feedback after a wrong answer.
- **The hook doesn't ask** "Is Jo right?". Learn 1 shows Jo's answer
  failing, because the first screen must show before it asks.
- **Learn asks nothing.** The micro-checks became Try it cards.
- **No new shared renderer or KaTeX.** The bar is lesson code, copied from
  the multipliers lesson. The draft's `percentage-bar` shared component
  note is left out.
- **"150% more than" stretch dropped.** It reads badly and isn't this
  skill's core. "175% of a number is 63" stays in Practice.
- **Every choice has four options**, each wrong one with its own feedback.
- **Exit ticket** kept as Check 1, Check 2 and Try it 10.
