(() => {
    'use strict';

    const ROOT_ID = 'order-of-operations-questions';
    const mounted = new WeakSet();

    const r = (min, max) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const pick = (items) =>
        items[r(0, items.length - 1)];

    function shuffle(items) {
        const copy = [...items];

        for (
            let index = copy.length - 1;
            index > 0;
            index -= 1
        ) {
            const randomIndex = r(0, index);

            [
                copy[index],
                copy[randomIndex]
            ] = [
                copy[randomIndex],
                copy[index]
            ];
        }

        return copy;
    }

    /*
     * Wraps the operation that should be completed first.
     * It is only highlighted after the pupil selects Show hint.
     */
    function first(text) {
        return `
            <span data-first>
                ${text}
            </span>
        `;
    }

    function options(correct, wrongOptions) {
        const correctLabel = String(correct);

        const uniqueOptions = new Map([
            [
                correctLabel,
                {
                    label: correctLabel,
                    correct: true,
                    feedback: ''
                }
            ]
        ]);

        wrongOptions.forEach(
            ([value, feedback]) => {
                const label = String(value);

                if (!uniqueOptions.has(label)) {
                    uniqueOptions.set(label, {
                        label,
                        correct: false,
                        feedback
                    });
                }
            }
        );

        /*
         * This is only a fallback if two generated
         * distractors happen to have the same value.
         */
        let step = 1;

        const moneyMatch =
            correctLabel.match(
                /^£(-?\d+(?:\.\d+)?)$/
            );

        const numericCorrect =
            moneyMatch
                ? Number(moneyMatch[1])
                : Number(correctLabel);

        const prefix =
            moneyMatch ? '£' : '';

        while (
            uniqueOptions.size < 4 &&
            Number.isFinite(numericCorrect)
        ) {
            const label =
                `${prefix}${numericCorrect + step}`;

            if (!uniqueOptions.has(label)) {
                uniqueOptions.set(label, {
                    label,
                    correct: false,
                    feedback:
                        'Recheck the order of operations.'
                });
            }

            step =
                step > 0
                    ? -step
                    : Math.abs(step) + 1;
        }

        return shuffle(
            [...uniqueOptions.values()].slice(0, 4)
        );
    }

    function make({
        expression,
        correct,
        wrong,
        hint,
        explanation,
        prompt = 'Evaluate the expression.'
    }) {
        return {
            prompt,
            expression,
            correctLabel: String(correct),
            answers: options(correct, wrong),
            hint,
            explanation
        };
    }

    /*
     * Multiplication before addition.
     */
    function multiplyBeforeAdd() {
        const firstNumber = r(2, 15);
        const secondNumber = r(2, 9);
        const thirdNumber = r(2, 9);

        const product =
            secondNumber * thirdNumber;

        const answer =
            firstNumber + product;

        return make({
            expression:
                `${firstNumber} + ` +
                first(
                    `${secondNumber} × ${thirdNumber}`
                ),

            correct: answer,

            wrong: [
                [
                    (
                        firstNumber +
                        secondNumber
                    ) * thirdNumber,

                    'You added first. ' +
                    'Multiplication comes before addition.'
                ],
                [
                    firstNumber +
                    secondNumber +
                    thirdNumber,

                    'The × symbol means multiply, not add.'
                ],
                [
                    firstNumber *
                    secondNumber +
                    thirdNumber,

                    'You multiplied the wrong pair of numbers.'
                ]
            ],

            hint:
                `Work out ${secondNumber} × ` +
                `${thirdNumber} first.`,

            explanation:
                `${secondNumber} × ${thirdNumber} = ` +
                `${product}, then ${firstNumber} + ` +
                `${product} = ${answer}.`
        });
    }

    /*
     * Division before subtraction.
     */
    function divideBeforeSubtract() {
        const divisor = r(2, 8);
        const quotient = r(2, 10);

        const dividend =
            divisor * quotient;

        const firstNumber =
            quotient + r(6, 20);

        const answer =
            firstNumber - quotient;

        return make({
            expression:
                `${firstNumber} − ` +
                first(
                    `${dividend} ÷ ${divisor}`
                ),

            correct: answer,

            wrong: [
                [
                    (
                        firstNumber -
                        dividend
                    ) / divisor,

                    'You subtracted first. ' +
                    'Division comes before subtraction.'
                ],
                [
                    firstNumber -
                    dividend * divisor,

                    'The symbol is division, ' +
                    'not multiplication.'
                ],
                [
                    firstNumber + quotient,

                    'The final operation is subtraction, ' +
                    'not addition.'
                ]
            ],

            hint:
                `Work out ${dividend} ÷ ` +
                `${divisor} first.`,

            explanation:
                `${dividend} ÷ ${divisor} = ` +
                `${quotient}, then ${firstNumber} − ` +
                `${quotient} = ${answer}.`
        });
    }

    /*
     * Division and multiplication have equal priority.
     * Work from left to right.
     */
    function divideMultiplyLeftToRight() {
        const divisor = r(2, 7);
        const quotient = r(2, 9);

        const dividend =
            divisor * quotient;

        const multiplier = r(2, 6);

        const answer =
            quotient * multiplier;

        return make({
            expression:
                first(
                    `${dividend} ÷ ${divisor}`
                ) +
                ` × ${multiplier}`,

            correct: answer,

            wrong: [
                [
                    dividend /
                    (
                        divisor *
                        multiplier
                    ),

                    'You multiplied first. ' +
                    'Division and multiplication have ' +
                    'equal priority, so work left to right.'
                ],
                [
                    quotient + multiplier,

                    'The final symbol is multiplication, ' +
                    'not addition.'
                ],
                [
                    dividend *
                    divisor *
                    multiplier,

                    'The first symbol is division.'
                ]
            ],

            hint:
                `Start with ${dividend} ÷ ${divisor}, ` +
                'the leftmost operation.',

            explanation:
                `${dividend} ÷ ${divisor} = ` +
                `${quotient}, then ${quotient} × ` +
                `${multiplier} = ${answer}.`
        });
    }

    /*
     * Addition and subtraction have equal priority.
     * Work from left to right.
     */
    function addSubtractLeftToRight() {
        const firstNumber = r(10, 30);

        const secondNumber =
            r(2, firstNumber - 3);

        const thirdNumber = r(2, 10);

        const firstResult =
            firstNumber - secondNumber;

        const answer =
            firstResult + thirdNumber;

        return make({
            expression:
                first(
                    `${firstNumber} − ${secondNumber}`
                ) +
                ` + ${thirdNumber}`,

            correct: answer,

            wrong: [
                [
                    firstNumber -
                    (
                        secondNumber +
                        thirdNumber
                    ),

                    'You added the final two numbers first. ' +
                    'Addition and subtraction have equal ' +
                    'priority, so work left to right.'
                ],
                [
                    firstNumber +
                    secondNumber +
                    thirdNumber,

                    'The first operation is subtraction.'
                ],
                [
                    firstNumber -
                    secondNumber -
                    thirdNumber,

                    'The final operation is addition.'
                ]
            ],

            hint:
                `Start with ${firstNumber} − ` +
                `${secondNumber}, the leftmost operation.`,

            explanation:
                `${firstNumber} − ${secondNumber} = ` +
                `${firstResult}, then ${firstResult} + ` +
                `${thirdNumber} = ${answer}.`
        });
    }

    /*
     * Simple brackets.
     */
    function brackets() {
        const firstNumber = r(2, 10);
        const secondNumber = r(2, 10);
        const multiplier = r(2, 7);

        const inside =
            firstNumber + secondNumber;

        const answer =
            inside * multiplier;

        return make({
            expression:
                `(` +
                first(
                    `${firstNumber} + ${secondNumber}`
                ) +
                `) × ${multiplier}`,

            correct: answer,

            wrong: [
                [
                    firstNumber +
                    secondNumber *
                    multiplier,

                    'You ignored the brackets. ' +
                    'Complete them first.'
                ],
                [
                    inside + multiplier,

                    'After the brackets, ' +
                    'the symbol is multiplication.'
                ],
                [
                    firstNumber *
                    secondNumber *
                    multiplier,

                    'The operation inside the brackets ' +
                    'is addition.'
                ]
            ],

            hint:
                `Complete the brackets first: ` +
                `${firstNumber} + ${secondNumber}.`,

            explanation:
                `${firstNumber} + ${secondNumber} = ` +
                `${inside}, then ${inside} × ` +
                `${multiplier} = ${answer}.`
        });
    }

    /*
     * Powers before multiplication and addition.
     */
    function powers() {
        const firstNumber = r(2, 12);
        const base = r(2, 6);
        const multiplier = r(2, 5);

        const square =
            base ** 2;

        const product =
            square * multiplier;

        const answer =
            firstNumber + product;

        return make({
            expression:
                `${firstNumber} + ` +
                first(`${base}²`) +
                ` × ${multiplier}`,

            correct: answer,

            wrong: [
                [
                    firstNumber +
                    base *
                    2 *
                    multiplier,

                    `${base}² means ${base} × ${base}, ` +
                    `not ${base} × 2.`
                ],
                [
                    (
                        firstNumber +
                        square
                    ) * multiplier,

                    'You added before multiplying.'
                ],
                [
                    (
                        firstNumber +
                        base
                    ) ** 2 *
                    multiplier,

                    'Only the number directly before ' +
                    'the small 2 is squared.'
                ]
            ],

            hint:
                `Work out ${base}² first. ` +
                'Indices come before multiplication ' +
                'and addition.',

            explanation:
                `${base}² = ${square}, ` +
                `${square} × ${multiplier} = ` +
                `${product}, then ${firstNumber} + ` +
                `${product} = ${answer}.`
        });
    }

    /*
     * Roots before multiplication and addition.
     */
    function roots() {
        const rootValue = r(2, 9);

        const square =
            rootValue ** 2;

        const firstNumber = r(1, 12);
        const multiplier = r(2, 5);

        const product =
            rootValue * multiplier;

        const answer =
            firstNumber + product;

        return make({
            expression:
                `${firstNumber} + ` +
                first(`√${square}`) +
                ` × ${multiplier}`,

            correct: answer,

            wrong: [
                [
                    firstNumber +
                    square *
                    multiplier,

                    `√${square} is ${rootValue}, ` +
                    `not ${square}.`
                ],
                [
                    (
                        firstNumber +
                        rootValue
                    ) * multiplier,

                    'You added before multiplying.'
                ],
                [
                    firstNumber +
                    rootValue +
                    multiplier,

                    'The root value must be multiplied ' +
                    'by the final number.'
                ]
            ],

            hint:
                `Work out √${square} first. ` +
                'Roots are handled with indices.',

            explanation:
                `√${square} = ${rootValue}, ` +
                `${rootValue} × ${multiplier} = ` +
                `${product}, then ${firstNumber} + ` +
                `${product} = ${answer}.`
        });
    }

    /*
     * Hidden multiplication beside a bracket.
     */
    function hiddenMultiplication() {
        const outsideNumber = r(2, 6);
        const rootValue = r(4, 9);

        const square =
            rootValue ** 2;

        const subtract =
            r(1, rootValue - 1);

        const inside =
            rootValue - subtract;

        const answer =
            outsideNumber * inside;

        return make({
            expression:
                `${outsideNumber}(` +
                first(`√${square}`) +
                ` − ${subtract})`,

            correct: answer,

            wrong: [
                [
                    outsideNumber + inside,

                    'A number beside a bracket means multiply.'
                ],
                [
                    outsideNumber *
                    square -
                    subtract,

                    `Work out the root first. ` +
                    `√${square} = ${rootValue}.`
                ],
                [
                    outsideNumber *
                    rootValue -
                    subtract,

                    'Complete the whole bracket before ' +
                    'multiplying by the number outside.'
                ]
            ],

            hint:
                `Inside the brackets, work out ` +
                `√${square} first.`,

            explanation:
                `√${square} = ${rootValue}, ` +
                `${rootValue} − ${subtract} = ` +
                `${inside}, then ${outsideNumber} × ` +
                `${inside} = ${answer}.`
        });
    }

    /*
     * Reciprocals.
     */
    function reciprocal() {
        const fractions = {
            2: '½',
            3: '⅓',
            4: '¼',
            5: '⅕'
        };

        const denominator =
            pick([2, 3, 4, 5]);

        const quotient = r(2, 10);

        const number =
            denominator * quotient;

        const add = r(1, 12);

        const fraction =
            fractions[denominator];

        const answer =
            quotient + add;

        return make({
            expression:
                first(
                    `${number} × ${fraction}`
                ) +
                ` + ${add}`,

            correct: answer,

            wrong: [
                [
                    number *
                    denominator +
                    add,

                    `Multiplying by ${fraction} is the ` +
                    `same as dividing by ${denominator}.`
                ],
                [
                    number +
                    denominator +
                    add,

                    'The reciprocal is not added ' +
                    'to the number.'
                ],
                [
                    quotient * add,

                    'The final operation is addition, ' +
                    'not multiplication.'
                ]
            ],

            hint:
                `Multiplying by ${fraction} is the ` +
                `same as dividing by ${denominator}.`,

            explanation:
                `${number} × ${fraction} = ` +
                `${quotient}, then ${quotient} + ` +
                `${add} = ${answer}.`
        });
    }

    /*
     * Directed numbers.
     */
    function negativeNumbers() {
        const firstNumber = r(4, 20);
        const multiplier = r(2, 6);
        const negativeNumber = r(2, 7);

        const product =
            -(
                multiplier *
                negativeNumber
            );

        const answer =
            firstNumber - product;

        return make({
            expression:
                `${firstNumber} − ` +
                first(
                    `${multiplier} × ` +
                    `(−${negativeNumber})`
                ),

            correct: answer,

            wrong: [
                [
                    firstNumber -
                    multiplier *
                    negativeNumber,

                    'The product is negative. ' +
                    'Subtracting a negative means adding.'
                ],
                [
                    (
                        firstNumber -
                        multiplier
                    ) *
                    -negativeNumber,

                    'You subtracted first. ' +
                    'Multiplication still has priority ' +
                    'with negative numbers.'
                ],
                [
                    firstNumber + product,

                    'Be careful with the two signs.'
                ]
            ],

            hint:
                `Work out ${multiplier} × ` +
                `(−${negativeNumber}) first.`,

            explanation:
                `${multiplier} × ` +
                `(−${negativeNumber}) = ${product}, ` +
                `then ${firstNumber} − (${product}) = ` +
                `${answer}.`
        });
    }

    /*
     * A fraction bar represented using grouped division.
     * Both grouped calculations have priority.
     */
    function groupedDivision() {
        const denominator = r(2, 6);
        const quotient = r(2, 8);

        const numerator =
            denominator * quotient;

        const numeratorFirst =
            r(2, numerator - 1);

        const numeratorSecond =
            numerator - numeratorFirst;

        const denominatorFirst =
            denominator + r(1, 5);

        const denominatorSecond =
            denominatorFirst - denominator;

        return make({
            expression:
                `(` +
                first(
                    `${numeratorFirst} + ` +
                    `${numeratorSecond}`
                ) +
                `) ÷ (` +
                first(
                    `${denominatorFirst} − ` +
                    `${denominatorSecond}`
                ) +
                `)`,

            correct: quotient,

            wrong: [
                [
                    numerator * denominator,

                    'Complete both brackets, then divide.'
                ],
                [
                    numerator - denominator,

                    'The operation between the grouped ' +
                    'values is division.'
                ],
                [
                    numerator + denominator,

                    'The grouped values are divided, ' +
                    'not added.'
                ]
            ],

            hint:
                'Both highlighted brackets have priority. ' +
                'Complete both before dividing.',

            explanation:
                `${numeratorFirst} + ` +
                `${numeratorSecond} = ${numerator} and ` +
                `${denominatorFirst} − ` +
                `${denominatorSecond} = ${denominator}, ` +
                `then ${numerator} ÷ ${denominator} = ` +
                `${quotient}.`
        });
    }

    /*
     * Instead of always asking for the final value,
     * some questions ask pupils to identify the first step.
     */
    function firstOperationQuestion() {
        const firstNumber = r(2, 12);
        const bracketFirst = r(6, 12);

        const bracketSecond =
            r(1, bracketFirst - 1);

        const base = r(2, 5);
        const multiplier = r(2, 6);

        const answer =
            `${bracketFirst} − ${bracketSecond}`;

        return {
            prompt:
                'Which calculation should be completed first?',

            expression:
                `${firstNumber} + (` +
                first(answer) +
                `) ÷ ${base}² × ${multiplier}`,

            correctLabel: answer,

            answers: options(
                answer,
                [
                    [
                        `${base}²`,

                        'Indices come after brackets.'
                    ],
                    [
                        `${firstNumber} + ${bracketFirst}`,

                        'Addition is not completed ' +
                        'before brackets.'
                    ],
                    [
                        `${base} × ${multiplier}`,

                        'Those numbers are not joined by ' +
                        'one operation in the expression.'
                    ]
                ]
            ),

            hint:
                'Look for brackets before considering ' +
                'indices or the other operations.',

            explanation:
                `${answer} is inside brackets, so it ` +
                'must be completed first.'
        };
    }

    /*
     * Error-spotting question.
     */
    function errorSpotting() {
        const answer =
            'Amir is wrong: the answer is 21.';

        return {
            prompt:
                'Amir says 24 − 6 ÷ 2 = 9 because ' +
                'you always work from left to right. ' +
                'Which statement is correct?',

            expression:
                `24 − ${first('6 ÷ 2')}`,

            correctLabel: answer,

            answers: shuffle([
                {
                    label: answer,
                    correct: true,
                    feedback: ''
                },
                {
                    label:
                        'Amir is correct: the answer is 9.',

                    correct: false,

                    feedback:
                        'Left to right applies only to ' +
                        'operations with equal priority.'
                },
                {
                    label:
                        'Amir is wrong: the answer is 12.',

                    correct: false,

                    feedback:
                        'Complete 6 ÷ 2 first, then ' +
                        'subtract from 24.'
                },
                {
                    label:
                        'Amir is correct because subtraction ' +
                        'comes before division.',

                    correct: false,

                    feedback:
                        'Division has priority over subtraction.'
                }
            ]),

            hint:
                'The highlighted division must be ' +
                'completed before subtraction.',

            explanation:
                '6 ÷ 2 = 3, then 24 − 3 = 21.'
        };
    }

    const generators = {
        multiplyBeforeAdd,
        divideBeforeSubtract,
        divideMultiplyLeftToRight,
        addSubtractLeftToRight,
        brackets,
        powers,
        roots,
        hiddenMultiplication,
        reciprocal,
        negativeNumbers,
        groupedDivision,
        firstOperationQuestion,
        errorSpotting
    };

    /*
     * Questions progress internally.
     *
     * Nothing on the page calls these levels or displays
     * a made-up difficulty rating.
     */
    function pool(questionNumber) {
        if (questionNumber <= 4) {
            return [
                'multiplyBeforeAdd',
                'divideBeforeSubtract'
            ];
        }

        if (questionNumber <= 8) {
            return [
                'multiplyBeforeAdd',
                'divideBeforeSubtract',
                'divideMultiplyLeftToRight',
                'addSubtractLeftToRight'
            ];
        }

        if (questionNumber <= 12) {
            return [
                'divideMultiplyLeftToRight',
                'addSubtractLeftToRight',
                'brackets',
                'firstOperationQuestion'
            ];
        }

        if (questionNumber <= 17) {
            return [
                'brackets',
                'powers',
                'roots',
                'firstOperationQuestion'
            ];
        }

        if (questionNumber <= 23) {
            return [
                'powers',
                'roots',
                'hiddenMultiplication',
                'reciprocal'
            ];
        }

        /*
         * After the introduction sequence, all question
         * types can appear indefinitely.
         */
        return Object.keys(generators);
    }

    function addStyles() {
        if (
            document.getElementById(
                'ooo-question-styles'
            )
        ) {
            return;
        }

        const style =
            document.createElement('style');

        style.id =
            'ooo-question-styles';

        style.textContent = `
            .ooo-expression {
                margin: 1rem 0;
                padding: 1rem;
                border: 1px solid #d9d9d9;
                background: #ffffff;
                font-size: clamp(1.35rem, 3vw, 2rem);
                line-height: 1.6;
                text-align: center;
            }

            .ooo-expression [data-first] {
                border-radius: 0.3rem;
                transition:
                    background-color 160ms ease,
                    color 160ms ease,
                    box-shadow 160ms ease;
            }

            .ooo-expression
            [data-first].is-highlighted {
                padding: 0.08em 0.18em;
                background: #e8edff;
                color: #244fd8;
                box-shadow:
                    0 0 0 2px #b9c7ff;
            }

            .ooo-hint {
                display: none;
                margin: 0.75rem 0;
                padding: 0.85rem 1rem;
                border-left:
                    4px solid #5575e7;
                background: #f3f6ff;
            }

            .ooo-hint.is-visible {
                display: block;
            }
        `;

        document.head.append(style);
    }

    function mount(root) {
        if (
            !root ||
            mounted.has(root)
        ) {
            return;
        }

        mounted.add(root);
        addStyles();

        const state = {
            running: false,
            number: 0,
            checked: 0,
            correct: 0,
            previous: '',
            run: 0
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

            <p
                data-score
                aria-live="polite"
            >
                Select Start practice to begin.
            </p>

            <div
                class="question-list"
                data-list
            ></div>
        `;

        const start =
            root.querySelector(
                '[data-start]'
            );

        const stop =
            root.querySelector(
                '[data-stop]'
            );

        const score =
            root.querySelector(
                '[data-score]'
            );

        const list =
            root.querySelector(
                '[data-list]'
            );

        function updateScore() {
            score.textContent =
                `Checked: ${state.checked} | ` +
                `Correct: ${state.correct}`;
        }

        function chooseGenerator() {
            const names =
                pool(state.number + 1);

            let name =
                pick(names);

            if (
                names.length > 1 &&
                name === state.previous
            ) {
                const currentIndex =
                    names.indexOf(name);

                name =
                    names[
                        (
                            currentIndex + 1
                        ) % names.length
                    ];
            }

            state.previous = name;

            return name;
        }

        function addQuestion() {
            if (!state.running) {
                return;
            }

            const generatorName =
                chooseGenerator();

            const question =
                generators[generatorName]();

            state.number += 1;

            const questionNumber =
                state.number;
            const questionId =
                `question-bank:${state.run}:${questionNumber}`;

            const card =
                document.createElement(
                    'article'
                );

            card.className =
                'question-card';

            card.innerHTML = `
                <p class="question-number">
                    Question ${questionNumber}
                </p>

                <p class="question-prompt"></p>

                <div class="ooo-expression"></div>

                <button
                    class="button"
                    type="button"
                    data-hint-button
                >
                    Show hint
                </button>

                <p
                    class="ooo-hint"
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

            card.querySelector(
                '.question-prompt'
            ).textContent =
                question.prompt;

            card.querySelector(
                '.ooo-expression'
            ).innerHTML =
                question.expression;

            const hintButton =
                card.querySelector(
                    '[data-hint-button]'
                );

            const hint =
                card.querySelector(
                    '[data-hint]'
                );

            const optionBox =
                card.querySelector(
                    '[data-options]'
                );

            const check =
                document.createElement('button');

            check.type = 'button';
            check.textContent = 'Check answer';

            const next =
                document.createElement('button');

            next.type = 'button';
            next.textContent = 'Next question';
            next.disabled = true;

            const feedback =
                card.querySelector(
                    '[data-feedback]'
                );

            const optionElements = [];

            const radioName =
                `order-question-${questionNumber}`;

            hint.textContent =
                question.hint;

            optionBox.setAttribute(
                'aria-label',
                `Answers for question ` +
                `${questionNumber}`
            );

            question.answers.forEach(
                (answer) => {
                    const label =
                        document.createElement(
                            'label'
                        );

                    label.className =
                        'question-option';

                    const input =
                        document.createElement(
                            'input'
                        );

                    input.type =
                        'radio';

                    input.name =
                        radioName;

                    input.value =
                        answer.label;

                    const text =
                        document.createElement(
                            'span'
                        );

                    text.textContent =
                        answer.label;

                    label.append(
                        input,
                        text
                    );

                    optionBox.append(label);

                    optionElements.push({
                        label,
                        input,
                        answer
                    });
                }
            );

            let marked = false;
            let previousResult = null;
            let nextAdded = false;

            function showFooterAction(button) {
                window.Maths1to9Lesson
                    ?.useButtonAsSectionAction?.(
                        'question-bank',
                        button
                    );
            }

            function clearMarks() {
                optionElements.forEach(
                    ({ label }) => {
                        label.classList.remove(
                            'is-correct',
                            'is-incorrect',
                            'is-correct-answer'
                        );
                    }
                );
            }

            function removePreviousMark() {
                if (!marked) {
                    return;
                }

                state.checked -= 1;

                if (previousResult) {
                    state.correct -= 1;
                }

                marked = false;
                previousResult = null;

                next.disabled = true;

                updateScore();
            }

            hintButton.addEventListener(
                'click',
                () => {
                    const visible =
                        hint.classList.toggle(
                            'is-visible'
                        );

                    card.querySelectorAll(
                        '[data-first]'
                    ).forEach(
                        (part) => {
                            part.classList.toggle(
                                'is-highlighted',
                                visible
                            );
                        }
                    );

                    hintButton.textContent =
                        visible
                            ? 'Hide hint'
                            : 'Show hint';
                }
            );

            optionElements.forEach(
                ({ input }) => {
                    input.addEventListener(
                        'change',
                        () => {
                            clearMarks();
                            removePreviousMark();

                            feedback.className =
                                'question-feedback';

                            feedback.textContent =
                                '';

                            showFooterAction(check);
                        }
                    );
                }
            );

            check.addEventListener(
                'click',
                () => {
                    const selected =
                        optionElements.find(
                            ({ input }) =>
                                input.checked
                        );

                    clearMarks();

                    if (!selected) {
                        feedback.className =
                            'question-feedback ' +
                            'is-visible is-incorrect';

                        feedback.textContent =
                            'Choose an answer first.';

                        return;
                    }

                    const isCorrect =
                        selected.answer.correct;

                    window.Maths1to9Lesson?.recordAssessment?.({
                        questionType: generatorName,
                        questionId,
                        correct: isCorrect
                    });

                    if (!marked) {
                        state.checked += 1;

                        if (isCorrect) {
                            state.correct += 1;
                        }
                    } else if (
                        previousResult !==
                        isCorrect
                    ) {
                        state.correct +=
                            isCorrect ? 1 : -1;
                    }

                    marked = true;

                    previousResult =
                        isCorrect;

                    next.disabled =
                        false;

                    next.textContent = isCorrect
                        ? 'Next question'
                        : 'Try again';

                    showFooterAction(next);

                    updateScore();

                    if (isCorrect) {
                        selected.label.classList.add(
                            'is-correct'
                        );

                        feedback.className =
                            'question-feedback ' +
                            'is-visible is-correct';

                        feedback.textContent =
                            `Correct. ` +
                            `${question.explanation}`;

                        return;
                    }

                    selected.label.classList.add(
                        'is-incorrect'
                    );

                    const correctOption =
                        optionElements.find(
                            ({ answer }) =>
                                answer.correct
                        );

                    correctOption?.label.classList.add(
                        'is-correct-answer'
                    );

                    feedback.className =
                        'question-feedback ' +
                        'is-visible is-incorrect';

                    feedback.textContent =
                        `${selected.answer.feedback} ` +
                        `The correct answer is ` +
                        `${question.correctLabel}. ` +
                        `${question.explanation}`;
                }
            );

            next.addEventListener(
                'click',
                () => {
                    if (previousResult === false) {
                        optionElements.forEach(
                            ({ input }) => {
                                input.checked = false;
                            }
                        );

                        clearMarks();
                        removePreviousMark();

                        feedback.className =
                            'question-feedback';

                        feedback.textContent = '';

                        showFooterAction(check);

                        return;
                    }

                    if (
                        nextAdded ||
                        !state.running
                    ) {
                        return;
                    }

                    nextAdded = true;

                    next.disabled =
                        true;

                    next.textContent =
                        'Question added';

                    addQuestion();
                }
            );

            showFooterAction(check);

            list.append(card);

            requestAnimationFrame(
                () => {
                    card.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            );
        }

        start.addEventListener(
            'click',
            () => {
                state.running = true;
                state.number = 0;
                state.checked = 0;
                state.correct = 0;
                state.previous = '';
                state.run += 1;

                list.replaceChildren();

                start.disabled = true;
                stop.disabled = false;

                updateScore();
                addQuestion();
            }
        );

        stop.addEventListener(
            'click',
            () => {
                window.Maths1to9Lesson
                    ?.clearSectionAction?.(
                        'question-bank'
                    );

                if (!state.running) {
                    return;
                }

                state.running = false;

                start.disabled = false;
                start.textContent =
                    'Start again';

                stop.disabled = true;

                const percentage =
                    state.checked === 0
                        ? 0
                        : Math.round(
                            (
                                state.correct /
                                state.checked
                            ) * 100
                        );

                score.textContent =
                    `Practice stopped: ` +
                    `${state.correct}/` +
                    `${state.checked} correct ` +
                    `(${percentage}%).`;
            }
        );
    }

    /*
     * Makes the bank available to the lesson engine.
     */
    window.Maths1to9QuestionBanks ??= {};

    window.Maths1to9QuestionBanks[
        'order-of-operations'
    ] = mount;

    function tryMount(root = null) {
        const target =
            root ||
            document.getElementById(
                ROOT_ID
            );

        if (target) {
            mount(target);
        }
    }

    /*
     * Mount immediately if the lesson has already rendered.
     */
    if (
        document.readyState ===
        'loading'
    ) {
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
            tryMount(
                event.detail?.questionsRoot ||
                null
            );
        }
    );

    /*
     * Final fallback in case the questions container is
     * inserted after this script without the custom event.
     */
    const observer =
        new MutationObserver(
            () => tryMount()
        );

    observer.observe(
        document.documentElement,
        {
            childList: true,
            subtree: true
        }
    );

    window.setTimeout(
        () => observer.disconnect(),
        15000
    );
})();
