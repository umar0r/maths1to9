(() => {
    'use strict';

    const ROOT_ID = 'equivalent-simplifying-fractions-questions';
    const mounted = new WeakSet();

    /*
     * How many questions must be checked before the
     * lesson's "Finish lesson" button unlocks.
     */
    const QUESTIONS_TO_COMPLETE = 5;

    function gateSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent('maths1to9:section-gate', {
                detail: { sectionId }
            })
        );
    }

    function completeSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent('maths1to9:section-complete', {
                detail: { sectionId }
            })
        );
    }

    const r = (min, max) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const pick = (items) =>
        items[r(0, items.length - 1)];

    function shuffle(items) {
        const copy = [...items];

        for (let index = copy.length - 1; index > 0; index -= 1) {
            const randomIndex = r(0, index);

            [copy[index], copy[randomIndex]] =
                [copy[randomIndex], copy[index]];
        }

        return copy;
    }

    function gcd(a, b) {
        let x = Math.abs(a);
        let y = Math.abs(b);

        while (y !== 0) {
            [x, y] = [y, x % y];
        }

        return x;
    }

    /*
     * Proper fractions already in simplest form.
     * Every generated question starts from one of these,
     * so the "fully simplified" answer is always known.
     */
    const COPRIME_PAIRS = [
        [1, 2], [1, 3], [2, 3], [1, 4], [3, 4],
        [1, 5], [2, 5], [3, 5], [4, 5], [1, 6],
        [5, 6], [2, 7], [3, 7], [4, 7], [5, 7],
        [3, 8], [5, 8], [7, 8], [2, 9], [4, 9],
        [5, 9], [7, 9]
    ];

    const pickCoprime = () => pick(COPRIME_PAIRS);

    /*
     * A prime multiplier keeps one-step questions honest:
     * there is exactly one useful divisor.
     */
    const PRIME_MULTIPLIERS = [2, 3, 5, 7];

    /*
     * A composite multiplier guarantees that simplifying by
     * a single prime leaves more work to do.
     */
    const COMPOSITE_MULTIPLIERS = [4, 6, 8, 9, 10];

    const fractionText = (top, bottom) =>
        `${top}/${bottom}`;

    /*
     * Stacked fraction for the expression area.
     * Options stay as plain "a/b" text because option
     * labels are rendered with textContent.
     */
    function fractionHtml(top, bottom) {
        return (
            '<span class="esf-frac">' +
                `<span class="esf-frac__top">${top}</span>` +
                `<span class="esf-frac__bottom">${bottom}</span>` +
            '</span>'
        );
    }

    /*
     * Wraps the part of the expression that the hint
     * highlights, mirroring the shared hint behaviour.
     */
    function first(text) {
        return `<span data-first>${text}</span>`;
    }

    function equalsRow(...parts) {
        return (
            '<span class="esf-row">' +
                parts.join('<span class="esf-eq">=</span>') +
            '</span>'
        );
    }

    /*
     * Horizontal bar with `total` equal cells,
     * `shaded` of them filled from the left.
     */
    function barHtml(shaded, total) {
        let cells = '';

        for (let index = 0; index < total; index += 1) {
            const shadedClass =
                index < shaded
                    ? ' esf-bar__cell--shaded'
                    : '';

            cells +=
                `<span class="esf-bar__cell${shadedClass}"></span>`;
        }

        return (
            '<span class="esf-bar" role="img" ' +
                `aria-label="${shaded} of ${total} equal parts shaded">` +
                cells +
            '</span>'
        );
    }

    /*
     * Builds the option list from one correct label and a
     * list of [label, feedback] distractors. Duplicates are
     * dropped, so generators must supply distinct values.
     */
    function options(correctLabel, wrongOptions) {
        const unique = new Map([
            [
                correctLabel,
                {
                    label: correctLabel,
                    correct: true,
                    feedback: ''
                }
            ]
        ]);

        wrongOptions.forEach(([label, feedback]) => {
            if (!unique.has(label)) {
                unique.set(label, {
                    label,
                    correct: false,
                    feedback
                });
            }
        });

        return shuffle([...unique.values()].slice(0, 4));
    }

    function make({
        prompt,
        expression,
        correct,
        wrong,
        hint,
        explanation
    }) {
        return {
            prompt,
            expression,
            correctLabel: String(correct),
            answers: options(String(correct), wrong),
            hint,
            explanation
        };
    }

    /*
     * Type 1 — complete the equivalent fraction.
     * a/b = ?/kb. The additive distractor is always present
     * because "add the same to both" is the most common
     * error at Foundation.
     */
    function equivalentGap() {
        const [a, b] = pickCoprime();
        const k = pick([2, 3, 4, 5, 6]);

        const answer = a * k;
        const bottom = b * k;
        const additive = a + (bottom - b);

        return make({
            prompt: 'Complete the equivalent fraction.',

            expression: equalsRow(
                fractionHtml(a, b),
                fractionHtml('?', first(String(bottom)))
            ),

            correct: answer,

            wrong: [
                [
                    String(additive),
                    `You added ${bottom - b} to the top because ` +
                    `${b} + ${bottom - b} = ${bottom}. ` +
                    'Equivalent fractions are made by multiplying, ' +
                    'not adding.'
                ],
                [
                    String(a * (k + 1)),
                    `The denominator was multiplied by ${k}, ` +
                    'so the numerator must be multiplied ' +
                    `by ${k} as well.`
                ],
                [
                    String(a),
                    'The numerator must change too. ' +
                    'Multiply the top and the bottom ' +
                    'by the same number.'
                ]
            ],

            hint:
                `What do you multiply ${b} by to get ${bottom}? ` +
                'Do the same to the top.',

            explanation:
                `${b} × ${k} = ${bottom}, so multiply the top ` +
                `by ${k} too: ${a} × ${k} = ${answer}.`
        });
    }

    /*
     * Type 2 — reverse gap.
     * ?/kb = a/b. Same skill, dividing direction, which
     * pupils find harder, so it is a separate type.
     */
    function reverseGap() {
        const [a, b] = pickCoprime();
        const k = pick([2, 3, 4, 5]);

        const answer = a * k;
        const bottom = b * k;
        const additive = a + (bottom - b);

        return make({
            prompt: 'Complete the equivalent fraction.',

            expression: equalsRow(
                fractionHtml('?', first(String(bottom))),
                fractionHtml(a, b)
            ),

            correct: answer,

            wrong: [
                [
                    String(additive),
                    'Adding the same number to the top and bottom ' +
                    'does not keep fractions equivalent. ' +
                    'Use multiplying or dividing.'
                ],
                [
                    String(a),
                    `The fraction on the right is out of ${b}. ` +
                    `This one is out of ${bottom}, so the ` +
                    'numerator must be scaled up to match.'
                ],
                [
                    String(a * k + b),
                    `Compare the denominators first: ` +
                    `${bottom} ÷ ${b} = ${k}.`
                ]
            ],

            hint:
                `${bottom} ÷ ${b} = ${k}. ` +
                `So the missing top is ${a} × ${k}.`,

            explanation:
                `The denominators are linked by × ${k}, ` +
                `so the numerator is ${a} × ${k} = ${answer}.`
        });
    }

    /*
     * Type 3 — spot the equivalent fraction.
     */
    function spotEquivalent() {
        const [a, b] = pickCoprime();
        const k = pick([2, 3, 4]);

        const answer = fractionText(a * k, b * k);
        const additive = fractionText(a + 1, b + 1);
        const mismatched = fractionText(a * k, b * (k + 1));
        const flipped = fractionText(b, a + b);

        return make({
            prompt: 'Which fraction is equivalent to this one?',

            expression: fractionHtml(a, b),

            correct: answer,

            wrong: [
                [
                    additive,
                    'This adds 1 to the top and bottom. ' +
                    'That changes the value of the fraction.'
                ],
                [
                    mismatched,
                    'The top was multiplied by ' +
                    `${k} but the bottom by ${k + 1}. ` +
                    'Both numbers must be multiplied ' +
                    'by the same number.'
                ],
                [
                    flipped,
                    'Check by simplifying: this fraction does not ' +
                    `simplify to ${fractionText(a, b)}.`
                ]
            ],

            hint:
                'Multiply the top and the bottom of ' +
                `${fractionText(a, b)} by the same number.`,

            explanation:
                `${a} × ${k} = ${a * k} and ${b} × ${k} = ${b * k}, ` +
                `so ${fractionText(a, b)} = ${answer}.`
        });
    }

    /*
     * Type 4 — simplify in one step.
     * Prime multiplier, so exactly one division finishes it.
     * Uses the exam wording "simplest form".
     */
    function simplifyOneStep() {
        const [a, b] = pickCoprime();
        const k = pick(PRIME_MULTIPLIERS);

        const top = a * k;
        const bottom = b * k;

        const answer = fractionText(a, b);
        const onlyTop = fractionText(a, bottom);
        const subtracted = fractionText(top - 1, bottom - 1);
        const wrongPair = fractionText(a + 1, b);

        return make({
            prompt: 'Write this fraction in its simplest form.',

            expression: fractionHtml(
                first(String(top)),
                first(String(bottom))
            ),

            correct: answer,

            wrong: [
                [
                    onlyTop,
                    `Only the top was divided by ${k}. ` +
                    'The bottom must be divided ' +
                    'by the same number.'
                ],
                [
                    subtracted,
                    'This subtracts 1 from the top and bottom. ' +
                    'To simplify, divide both numbers ' +
                    'by the same number.'
                ],
                [
                    wrongPair,
                    `Check: ${top} ÷ ${k} = ${a}, ` +
                    `not ${a + 1}.`
                ]
            ],

            hint:
                `${top} and ${bottom} both divide by ${k}.`,

            explanation:
                `${top} ÷ ${k} = ${a} and ${bottom} ÷ ${k} = ${b}. ` +
                `${a} and ${b} have no common divisor greater ` +
                'than 1, so stop.'
        });
    }

    /*
     * Type 5 — simplify fully.
     * Composite multiplier, so simplifying by one prime is
     * progress but not the answer. The half-simplified
     * distractor gets encouraging feedback rather than a
     * plain "wrong".
     */
    function simplifyFully() {
        const pairs = COPRIME_PAIRS.filter(
            ([, b]) => b <= 6
        );

        const [a, b] = pick(pairs);
        const k = pick(COMPOSITE_MULTIPLIERS);

        const top = a * k;
        const bottom = b * k;

        const firstPrime = k % 2 === 0 ? 2 : 3;

        const partialTop = top / firstPrime;
        const partialBottom = bottom / firstPrime;

        const answer = fractionText(a, b);
        const partial = fractionText(partialTop, partialBottom);
        const onlyTop = fractionText(a, bottom);
        const subtracted = fractionText(top - 2, bottom - 2);

        return make({
            prompt: 'Simplify this fraction fully.',

            expression: fractionHtml(
                first(String(top)),
                first(String(bottom))
            ),

            correct: answer,

            wrong: [
                [
                    partial,
                    'Correct so far, but not finished. ' +
                    `${partialTop} and ${partialBottom} still ` +
                    'divide by the same number. Keep going.'
                ],
                [
                    onlyTop,
                    'Only the numerator was divided. ' +
                    'Divide the denominator ' +
                    'by the same number.'
                ],
                [
                    subtracted,
                    'This subtracts from both numbers. ' +
                    'Simplifying divides both numbers ' +
                    'by the same number.'
                ]
            ],

            hint:
                `Divide by a common divisor, then check the ` +
                'new fraction. You may need more than one step. ' +
                `Dividing by ${k} does it in one.`,

            explanation:
                `${top} ÷ ${k} = ${a} and ${bottom} ÷ ${k} = ${b}. ` +
                `${k} is the highest common factor, so ` +
                `${fractionText(top, bottom)} = ${answer} in one step.`
        });
    }

    /*
     * Type 6 — which fraction is fully simplified?
     * Includes a coprime-looking reducible pair so that
     * pattern-matching on "odd numbers" fails.
     */
    function fullySimplified() {
        const simplifiedPool = [
            [3, 4], [2, 5], [5, 7], [7, 9],
            [4, 9], [9, 16], [8, 15], [5, 8]
        ];

        const reduciblePool = [
            [6, 10, 2], [9, 12, 3], [4, 6, 2],
            [10, 15, 5], [6, 9, 3], [8, 12, 4],
            [15, 21, 3], [14, 21, 7]
        ];

        const [sa, sb] = pick(simplifiedPool);

        const wrongPairs = shuffle(reduciblePool).slice(0, 3);

        return make({
            prompt: 'Which fraction is fully simplified?',

            expression:
                '<span class="esf-note">A fraction is fully ' +
                'simplified when no whole number greater than 1 ' +
                'divides both numbers.</span>',

            correct: fractionText(sa, sb),

            wrong: wrongPairs.map(([wa, wb, divisor]) => [
                fractionText(wa, wb),
                `${wa} and ${wb} both divide by ${divisor}, ` +
                'so this fraction can still be simplified.'
            ]),

            hint:
                'Test each fraction: can the top and bottom ' +
                'be divided by the same whole number?',

            explanation:
                `No whole number greater than 1 divides both ` +
                `${sa} and ${sb}.`
        });
    }

    /*
     * Type 7 — pick a valid common divisor.
     * Isolates the Find step of the method.
     */
    function validDivisor() {
        const [a, b] = pickCoprime();
        const k = pick([2, 3, 4, 5, 6]);

        const top = a * k;
        const bottom = b * k;

        /*
         * Distractors divide one number but not the other,
         * or neither. Built from candidates then filtered.
         */
        const candidates = [2, 3, 4, 5, 6, 7, 8, 9]
            .filter((n) =>
                n !== k &&
                !(top % n === 0 && bottom % n === 0)
            );

        const dividesOne = candidates.filter(
            (n) => top % n === 0 || bottom % n === 0
        );

        const dividesNeither = candidates.filter(
            (n) => top % n !== 0 && bottom % n !== 0
        );

        const wrong = [];

        shuffle(dividesOne).slice(0, 2).forEach((n) => {
            const divides =
                top % n === 0 ? top : bottom;

            const fails =
                top % n === 0 ? bottom : top;

            wrong.push([
                String(n),
                `${n} divides ${divides} but not ${fails}. ` +
                'The number must divide both.'
            ]);
        });

        shuffle(dividesNeither)
            .slice(0, 3 - wrong.length)
            .forEach((n) => {
                wrong.push([
                    String(n),
                    `${n} does not divide ${top} or ${bottom} ` +
                    'exactly.'
                ]);
            });

        return make({
            prompt:
                'Which number divides the numerator and the ' +
                'denominator exactly?',

            expression: fractionHtml(
                first(String(top)),
                first(String(bottom))
            ),

            correct: k,

            wrong,

            hint:
                `Try each number on ${top} first. ` +
                `Then check it also divides ${bottom}.`,

            explanation:
                `${top} ÷ ${k} = ${a} and ` +
                `${bottom} ÷ ${k} = ${b}, both whole numbers.`
        });
    }

    /*
     * Type 8 — spot the mistake.
     * One question per misconception, chosen at random.
     */
    function spotTheMistake() {
        const variant = pick([
            'subtracted',
            'onlyTop',
            'differentNumbers',
            'stoppedEarly'
        ]);

        if (variant === 'subtracted') {
            const [a, b] = pick([
                [3, 5], [2, 5], [3, 4], [2, 3]
            ]);

            const k = 2;
            const top = a * k;
            const bottom = b * k;

            return make({
                prompt:
                    'A pupil simplifies a fraction like this. ' +
                    'What mistake did they make?',

                expression: equalsRow(
                    fractionHtml(top, bottom),
                    fractionHtml(
                        first(String(top - 1)),
                        first(String(bottom - 1))
                    )
                ),

                correct:
                    'They subtracted 1 from both numbers ' +
                    'instead of dividing',

                wrong: [
                    [
                        'They divided by the wrong number',
                        'Look again: the numbers went down by 1, ' +
                        'which is subtraction, not division.'
                    ],
                    [
                        'Nothing — the answer is correct',
                        `${fractionText(top - 1, bottom - 1)} is not ` +
                        `equal to ${fractionText(top, bottom)}. ` +
                        'Subtracting changes the value.'
                    ],
                    [
                        'They forgot to simplify the numerator',
                        'Both numbers changed, but by subtraction. ' +
                        'Simplifying uses division.'
                    ]
                ],

                hint:
                    `How do you get from ${top} to ${top - 1}? ` +
                    'Is that dividing?',

                explanation:
                    'To simplify, divide both numbers by the same ' +
                    `number: ${top} ÷ ${k} = ${a} and ` +
                    `${bottom} ÷ ${k} = ${b}, so the answer is ` +
                    `${fractionText(a, b)}.`
            });
        }

        if (variant === 'onlyTop') {
            const [a, b] = pick([
                [2, 3], [3, 4], [2, 5], [3, 5]
            ]);

            const k = 2;
            const top = a * k;
            const bottom = b * k;

            return make({
                prompt:
                    'A pupil simplifies a fraction like this. ' +
                    'What mistake did they make?',

                expression: equalsRow(
                    fractionHtml(top, bottom),
                    fractionHtml(
                        first(String(a)),
                        first(String(bottom))
                    )
                ),

                correct:
                    'They divided the top but not the bottom',

                wrong: [
                    [
                        'They subtracted instead of dividing',
                        `The top went from ${top} to ${a}, ` +
                        `which is ÷ ${k}. The problem is that the ` +
                        'bottom did not change at all.'
                    ],
                    [
                        'Nothing — the answer is correct',
                        `${fractionText(a, bottom)} is a smaller ` +
                        `value than ${fractionText(top, bottom)}. ` +
                        'Both numbers must be divided.'
                    ],
                    [
                        'They divided both numbers by ' +
                        'different numbers',
                        'The bottom was not divided by anything. ' +
                        'It stayed the same.'
                    ]
                ],

                hint:
                    'Compare the two denominators. ' +
                    'What happened to the bottom number?',

                explanation:
                    `The bottom must be divided by ${k} too: ` +
                    `${bottom} ÷ ${k} = ${b}, so ` +
                    `${fractionText(top, bottom)} = ` +
                    `${fractionText(a, b)}.`
            });
        }

        if (variant === 'differentNumbers') {
            /*
             * Dividing by different numbers gives a visibly
             * broken result, e.g. 8/12 becoming 4/4.
             */
            return make({
                prompt:
                    'A pupil divides 8 by 2 and 12 by 3. ' +
                    'What is wrong with this?',

                expression: equalsRow(
                    fractionHtml(8, 12),
                    fractionHtml(first('4'), first('4'))
                ),

                correct:
                    'The top and bottom were divided by ' +
                    'different numbers',

                wrong: [
                    [
                        'Nothing — the answer is correct',
                        '4/4 is one whole. 8/12 is less than one ' +
                        'whole. The value has changed.'
                    ],
                    [
                        'They should have subtracted instead',
                        'Division is right. The mistake is using ' +
                        'a different divisor for each number.'
                    ],
                    [
                        'The fraction cannot be simplified',
                        '8 and 12 both divide by 4, so it can be ' +
                        'simplified — but by the same number ' +
                        'top and bottom.'
                    ]
                ],

                hint:
                    'What is 4/4 worth as an amount? ' +
                    'Is 8/12 worth the same?',

                explanation:
                    'Divide both numbers by the same number: ' +
                    '8 ÷ 4 = 2 and 12 ÷ 4 = 3, so 8/12 = 2/3.',
            });
        }

        /*
         * stoppedEarly
         */
        const [a, b, k1, k2] = pick([
            [2, 3, 2, 3],
            [3, 4, 2, 3],
            [2, 5, 2, 3],
            [1, 4, 2, 3]
        ]);

        const top = a * k1 * k2;
        const bottom = b * k1 * k2;

        const midTop = a * k2;
        const midBottom = b * k2;

        return make({
            prompt:
                'A pupil gives this as their final answer. ' +
                'What is wrong with it?',

            expression: equalsRow(
                fractionHtml(top, bottom),
                fractionHtml(
                    first(String(midTop)),
                    first(String(midBottom))
                )
            ),

            correct:
                'It is not fully simplified — both numbers ' +
                `still divide by ${k2}`,

            wrong: [
                [
                    'The division was done incorrectly',
                    `The first step is fine: dividing by ${k1} ` +
                    `does give ${fractionText(midTop, midBottom)}. ` +
                    'The problem is stopping there.'
                ],
                [
                    'Nothing — the answer is correct',
                    `${midTop} and ${midBottom} both divide ` +
                    `by ${k2}, so there is another step.`
                ],
                [
                    'They divided by different numbers',
                    `Both numbers were divided by ${k1}. ` +
                    'That step is correct but incomplete.'
                ]
            ],

            hint:
                `Check ${midTop} and ${midBottom}. ` +
                'Can they both be divided by the same number?',

            explanation:
                `${midTop} ÷ ${k2} = ${a} and ` +
                `${midBottom} ÷ ${k2} = ${b}, so the fully ` +
                `simplified answer is ${fractionText(a, b)}.`
        });
    }

    /*
     * Type 9 — fraction of a shape in simplest form.
     * Reuses the bar visual and tests both halves of the
     * lesson in one question.
     */
    function shadedFraction() {
        const setups = [
            [1, 2, 4], [1, 2, 5], [1, 3, 4],
            [2, 3, 4], [1, 4, 3], [3, 4, 3],
            [2, 5, 2], [1, 5, 2], [1, 3, 3],
            [1, 2, 6]
        ];

        const [a, b, k] = pick(setups);

        const shaded = a * k;
        const total = b * k;

        const answer = fractionText(a, b);
        const unsimplified = fractionText(shaded, total);
        const miscount = fractionText(shaded, total - shaded);
        const additive = fractionText(a + 1, b + 1);

        return make({
            prompt:
                'What fraction of the bar is shaded? ' +
                'Give your answer in its simplest form.',

            expression: barHtml(shaded, total),

            correct: answer,

            wrong: [
                [
                    unsimplified,
                    `${shaded} out of ${total} is the right count, ` +
                    'but the question asks for the simplest form. ' +
                    `Divide both numbers by ${k}.`
                ],
                [
                    miscount,
                    'The denominator counts every equal part, ' +
                    'shaded and unshaded.'
                ],
                [
                    additive,
                    'Count the shaded cells and the total cells, ' +
                    'then simplify by dividing.'
                ]
            ],

            hint:
                `${shaded} of the ${total} parts are shaded. ` +
                `Both numbers divide by ${k}.`,

            explanation:
                `${shaded} out of ${total} parts are shaded. ` +
                `${shaded} ÷ ${k} = ${a} and ${total} ÷ ${k} = ${b}, ` +
                `so the answer is ${answer}.`
        });
    }

    /*
     * Type 10 — equal or not equal.
     * The bridge to the ordering lesson: comparison that is
     * answered entirely by simplifying.
     */
    function equalOrNot() {
        const [a, b] = pickCoprime();
        const k = pick([3, 4, 5, 6]);

        const isEqual = pick([true, false]);

        const top = isEqual ? a * k : a * k + 1;
        const bottom = b * k;

        const same =
            top * b === a * bottom;

        const correct = same ? 'Yes' : 'No';

        const explanation = same
            ? `${top} ÷ ${k} = ${a} and ${bottom} ÷ ${k} = ${b}, ` +
              `so ${fractionText(top, bottom)} simplifies to ` +
              `${fractionText(a, b)}. They are equal.`
            : `Simplify to check: ${fractionText(top, bottom)} ` +
              `does not simplify to ${fractionText(a, b)}, ` +
              'so they are not equal.';

        const wrongFeedback = same
            ? 'They look different, but simplify ' +
              `${fractionText(top, bottom)} and compare: ` +
              `${top} ÷ ${k} = ${a} and ${bottom} ÷ ${k} = ${b}.`
            : `If they were equal, ${fractionText(top, bottom)} ` +
              `would simplify to ${fractionText(a, b)}. ` +
              `Try it: no whole number divides ${top} ` +
              `and ${bottom} to give that.`;

        return make({
            prompt: 'Do these two fractions show the same amount?',

            expression: equalsRow(
                fractionHtml(top, bottom),
                '<span class="esf-eq-question">?</span>'
            ) + fractionHtml(a, b),

            correct,

            wrong: [
                [
                    same ? 'No' : 'Yes',
                    wrongFeedback
                ]
            ],

            hint:
                'Do not compare the numbers directly. ' +
                `Simplify ${fractionText(top, bottom)} first.`,

            explanation
        });
    }

    const generators = {
        equivalentGap,
        reverseGap,
        spotEquivalent,
        simplifyOneStep,
        simplifyFully,
        fullySimplified,
        validDivisor,
        spotTheMistake,
        shadedFraction,
        equalOrNot
    };

    /*
     * Questions progress internally: equivalence first,
     * then one-step simplifying, then full simplifying and
     * misconceptions. Nothing on the page displays a
     * difficulty rating.
     */
    function pool(questionNumber) {
        if (questionNumber <= 4) {
            return [
                'equivalentGap',
                'spotEquivalent'
            ];
        }

        if (questionNumber <= 8) {
            return [
                'equivalentGap',
                'reverseGap',
                'validDivisor',
                'shadedFraction'
            ];
        }

        if (questionNumber <= 12) {
            return [
                'simplifyOneStep',
                'shadedFraction',
                'validDivisor',
                'reverseGap'
            ];
        }

        if (questionNumber <= 17) {
            return [
                'simplifyOneStep',
                'simplifyFully',
                'fullySimplified',
                'equalOrNot'
            ];
        }

        if (questionNumber <= 23) {
            return [
                'simplifyFully',
                'fullySimplified',
                'spotTheMistake',
                'equalOrNot'
            ];
        }

        /*
         * After the introduction sequence, all question
         * types can appear indefinitely.
         */
        return Object.keys(generators);
    }

    function addStyles() {
        if (document.getElementById('esf-question-styles')) {
            return;
        }

        const style = document.createElement('style');

        style.id = 'esf-question-styles';

        style.textContent = `
            .esf-expression {
                margin: 1rem 0;
                padding: 1rem;
                border: 1px solid #d9d9d9;
                background: #ffffff;
                font-size: clamp(1.35rem, 3vw, 2rem);
                line-height: 1.6;
                text-align: center;
            }

            .esf-row {
                display: inline-flex;
                align-items: center;
                gap: 0.45em;
                vertical-align: middle;
            }

            .esf-eq {
                padding: 0 0.1em;
            }

            .esf-eq-question {
                font-weight: 700;
                color: #244fd8;
            }

            .esf-frac {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                vertical-align: middle;
                line-height: 1.15;
            }

            .esf-frac__top {
                display: block;
                padding: 0 0.25em;
                border-bottom: 2px solid currentColor;
            }

            .esf-frac__bottom {
                display: block;
                padding: 0 0.25em;
            }

            .esf-bar {
                display: inline-flex;
                width: min(100%, 22rem);
                height: 2.4rem;
                border: 2px solid #333333;
                border-radius: 0.25rem;
                overflow: hidden;
            }

            .esf-bar__cell {
                flex: 1 1 0;
                background: #ffffff;
                border-right: 2px solid #333333;
            }

            .esf-bar__cell:last-child {
                border-right: none;
            }

            .esf-bar__cell--shaded {
                background: #74c0b4;
            }

            .esf-note {
                font-size: 1rem;
                color: #444444;
            }

            .esf-expression [data-first] {
                border-radius: 0.3rem;
                transition:
                    background-color 160ms ease,
                    color 160ms ease,
                    box-shadow 160ms ease;
            }

            .esf-expression [data-first].is-highlighted {
                padding: 0.08em 0.18em;
                background: #e8edff;
                color: #244fd8;
                box-shadow: 0 0 0 2px #b9c7ff;
            }

            .esf-hint {
                display: none;
                margin: 0.75rem 0;
                padding: 0.85rem 1rem;
                border-left: 4px solid #5575e7;
                background: #f3f6ff;
            }

            .esf-hint.is-visible {
                display: block;
            }
        `;

        document.head.append(style);
    }

    function mount(root) {
        if (!root || mounted.has(root)) {
            return;
        }

        mounted.add(root);
        addStyles();
        gateSection('question-bank');

        const state = {
            running: false,
            number: 0,
            checked: 0,
            correct: 0,
            previous: '',
            runId: ''
        };

        root.innerHTML = `
            <div class="question-bank-controls">
                <button
                    class="button button--primary"
                    type="button"
                    data-start
                >
                    Start practice
                </button>

                <button
                    class="button"
                    type="button"
                    data-stop
                    disabled
                >
                    Stop practice
                </button>
            </div>

            <p data-score aria-live="polite">
                Select Start practice to begin.
            </p>

            <div class="question-list" data-list></div>
        `;

        const start = root.querySelector('[data-start]');
        const stop = root.querySelector('[data-stop]');
        const score = root.querySelector('[data-score]');
        const list = root.querySelector('[data-list]');

        function updateScore() {
            score.textContent =
                `Checked: ${state.checked} | ` +
                `Correct: ${state.correct}`;
        }

        function chooseGenerator() {
            const names = pool(state.number + 1);

            let name = pick(names);

            /*
             * Avoid asking the same type twice in a row
             * when there is a choice.
             */
            if (names.length > 1 && name === state.previous) {
                const currentIndex = names.indexOf(name);

                name = names[(currentIndex + 1) % names.length];
            }

            state.previous = name;

            return name;
        }

        function addQuestion() {
            if (!state.running) {
                return;
            }

            const generatorName = chooseGenerator();
            const question = generators[generatorName]();

            state.number += 1;

            const questionNumber = state.number;
            const questionId =
                `${state.runId}:${questionNumber}`;

            const card = document.createElement('article');

            card.className = 'question-card';

            card.innerHTML = `
                <p class="question-number">
                    Question ${questionNumber}
                </p>

                <p class="question-prompt"></p>

                <div class="esf-expression"></div>

                <button
                    class="button"
                    type="button"
                    data-hint-button
                >
                    Show hint
                </button>

                <p
                    class="esf-hint"
                    data-hint
                    aria-live="polite"
                ></p>

                <div
                    class="question-options"
                    data-options
                    role="radiogroup"
                ></div>

                <p
                    class="question-feedback"
                    data-feedback
                    aria-live="polite"
                ></p>
            `;

            card.querySelector('.question-prompt')
                .textContent = question.prompt;

            card.querySelector('.esf-expression')
                .innerHTML = question.expression;

            const hintButton =
                card.querySelector('[data-hint-button]');

            const hint = card.querySelector('[data-hint]');
            const optionBox = card.querySelector('[data-options]');
            const action = document.createElement('button');
            action.type = 'button';
            action.textContent = 'Check answer';
            action.disabled = true;
            const feedback = card.querySelector('[data-feedback]');

            const optionElements = [];

            const radioName =
                `esf-question-${questionNumber}`;

            hint.textContent = question.hint;

            optionBox.setAttribute(
                'aria-label',
                `Answers for question ${questionNumber}`
            );

            question.answers.forEach((answer) => {
                const label = document.createElement('label');

                label.className = 'question-option';

                const input = document.createElement('input');

                input.type = 'radio';
                input.name = radioName;
                input.value = answer.label;

                const text = document.createElement('span');

                text.textContent = answer.label;

                label.append(input, text);
                optionBox.append(label);

                optionElements.push({ label, input, answer });
            });

            /*
             * One action button, three phases:
             *   answering — "Check answer", disabled until
             *               an option is selected
             *   wrong     — "Try again", resets the question
             *   correct   — "Next question", adds the next card
             */
            let phase = 'answering';
            let marked = false;
            let previousResult = null;

            function setAction(label, enabled) {
                action.textContent = label;
                action.disabled = !enabled;

                window.Maths1to9Lesson
                    ?.useButtonAsSectionAction?.(
                        'question-bank',
                        action
                    );
            }

            function clearMarks() {
                optionElements.forEach(({ label }) => {
                    label.classList.remove(
                        'is-correct',
                        'is-incorrect',
                        'is-correct-answer'
                    );
                });
            }

            hintButton.addEventListener('click', () => {
                const visible =
                    hint.classList.toggle('is-visible');

                card.querySelectorAll('[data-first]')
                    .forEach((part) => {
                        part.classList.toggle(
                            'is-highlighted',
                            visible
                        );
                    });

                hintButton.textContent =
                    visible ? 'Hide hint' : 'Show hint';
            });

            optionElements.forEach(({ input }) => {
                input.addEventListener('change', () => {
                    if (phase === 'correct') {
                        return;
                    }

                    clearMarks();

                    feedback.className = 'question-feedback';
                    feedback.textContent = '';

                    phase = 'answering';
                    setAction('Check answer', true);
                });
            });

            action.addEventListener('click', () => {
                if (phase === 'wrong') {
                    /*
                     * Try again: clear the attempt so the
                     * pupil chooses fresh.
                     */
                    optionElements.forEach(({ input }) => {
                        input.checked = false;
                    });

                    clearMarks();

                    feedback.className = 'question-feedback';
                    feedback.textContent = '';

                    phase = 'answering';
                    setAction('Check answer', false);

                    return;
                }

                if (phase === 'correct') {
                    setAction('Next question', false);
                    addQuestion();

                    return;
                }

                const selected = optionElements.find(
                    ({ input }) => input.checked
                );

                if (!selected) {
                    return;
                }

                clearMarks();

                const isCorrect = selected.answer.correct;

                /*
                 * The lesson engine maps the generator name to
                 * skill ids using assessment.question_types in
                 * lesson.json, then records the attempt. Passing
                 * the same questionId for a retry lets the shared
                 * progress store tell a first attempt from a
                 * later correct retry.
                 */
                window.Maths1to9Lesson?.recordAssessment?.({
                    questionType: generatorName,
                    questionId,
                    correct: isCorrect
                });

                /*
                 * Score each question once. If the pupil
                 * changes their answer and re-checks, the
                 * score follows the latest result.
                 */
                if (!marked) {
                    state.checked += 1;

                    if (isCorrect) {
                        state.correct += 1;
                    }
                } else if (previousResult !== isCorrect) {
                    state.correct += isCorrect ? 1 : -1;
                }

                marked = true;
                previousResult = isCorrect;

                updateScore();

                if (state.checked >= QUESTIONS_TO_COMPLETE) {
                    completeSection('question-bank');
                }

                if (isCorrect) {
                    phase = 'correct';

                    selected.label.classList.add('is-correct');

                    /*
                     * Lock the question. The only move left
                     * is forwards.
                     */
                    optionElements.forEach(({ input }) => {
                        input.disabled = true;
                    });

                    setAction('Next question', true);

                    feedback.className =
                        'question-feedback ' +
                        'is-visible is-correct';

                    feedback.textContent =
                        `Correct. ${question.explanation}`;
                } else {
                    phase = 'wrong';

                    selected.label.classList.add('is-incorrect');

                    setAction('Try again', true);

                    feedback.className =
                        'question-feedback ' +
                        'is-visible is-incorrect';

                    feedback.textContent =
                        selected.answer.feedback ||
                        'Not quite. Try another option.';
                }
            });

            setAction('Check answer', false);

            list.append(card);

            card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        start.addEventListener('click', () => {
            state.running = true;
            state.number = 0;
            state.checked = 0;
            state.correct = 0;
            state.previous = '';
            state.runId =
                `${Date.now().toString(36)}-` +
                Math.random().toString(36).slice(2, 10);

            list.replaceChildren();

            start.disabled = true;
            stop.disabled = false;

            updateScore();
            addQuestion();
        });

        stop.addEventListener('click', () => {
            window.Maths1to9Lesson
                ?.clearSectionAction?.('question-bank');

            if (!state.running) {
                return;
            }

            state.running = false;

            start.disabled = false;
            start.textContent = 'Start again';

            stop.disabled = true;

            const percentage =
                state.checked === 0
                    ? 0
                    : Math.round(
                        (state.correct / state.checked) * 100
                    );

            score.textContent =
                `Practice stopped: ` +
                `${state.correct}/${state.checked} correct ` +
                `(${percentage}%).`;
        });
    }

    /*
     * Makes the bank available to the lesson engine.
     */
    window.Maths1to9QuestionBanks ??= {};

    window.Maths1to9QuestionBanks[
        'equivalent-simplifying-fractions'
    ] = mount;

    function tryMount(root = null) {
        const target =
            root || document.getElementById(ROOT_ID);

        if (target) {
            mount(target);
        }
    }

    /*
     * Mount immediately if the lesson has already rendered.
     */
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            () => tryMount()
        );
    } else {
        tryMount();
    }

    /*
     * Mount after lesson-engine.js finishes rendering.
     */
    document.addEventListener(
        'maths1to9:lesson-rendered',
        (event) => {
            tryMount(event.detail?.questionsRoot || null);
        }
    );

    /*
     * Final fallback in case the questions container is
     * inserted after this script without the custom event.
     */
    const observer = new MutationObserver(() => tryMount());

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    window.setTimeout(() => observer.disconnect(), 15000);
})();
