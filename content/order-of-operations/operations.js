(() => {
    'use strict';

    const types = ['multiplyBeforeAdd', 'divideBeforeSubtract', 'divideMultiplyLeftToRight', 'addSubtractLeftToRight',
        'brackets', 'powers', 'roots', 'hiddenMultiplication', 'reciprocal', 'negativeNumbers', 'groupedDivision', 'firstOperationQuestion', 'errorSpotting'];
    const formatNumber = value => String(value).replace(/-(?=\d)/g, '−');
    const option = (label, feedback, correct = false) => ({ label: formatNumber(label), feedback: formatNumber(feedback), correct });
    const words = text => formatNumber(text)
        .replaceAll('have equal priority', 'are at the same level')
        .replaceAll('operations with equal priority', 'operations at the same level')
        .replaceAll('have the same priority', 'are at the same level')
        .replaceAll('Multiplication still has priority with negative numbers.', 'Multiply before subtracting, even with negative numbers.')
        .replaceAll('Division has priority over subtraction.', 'Divide before subtracting.')
        .replaceAll('Both highlighted brackets have priority. Complete both before dividing.', 'Work out both brackets before dividing.')
        .replaceAll('The highlighted division must be completed before subtraction.', 'Divide before subtracting.')
        .replaceAll('The reciprocal is not added to the number.', 'Multiply by the fraction. Do not add its bottom number.')
        .replaceAll('Roots are handled with indices.', 'Work out roots before multiplication and addition.')
        .replaceAll('Evaluate the expression.', 'Work out the calculation.');
    function extraWrong(type, expression) {
        const [a, b, c, d] = expression.match(/\d+/g).map(Number);
        switch (type) {
            case 'multiplyBeforeAdd': return [[b * c, 'That is only the multiplication. Include the first number as well.'],
                [a + b * c * c, 'That uses the final factor twice. Use it once.'], [a + b, 'That stops after adding the first two numbers. Multiply the last two first.']];
            case 'divideBeforeSubtract': return [[b / c, 'That is only the division. Subtract it from the first number.'],
                [a - b, 'The division is missing. Divide before subtracting.']];
            case 'divideMultiplyLeftToRight': return [[a / b, 'That stops after dividing. Multiply by the last number as well.']];
            case 'addSubtractLeftToRight': return [[a - b, 'That stops after subtracting. Add the last number as well.']];
            case 'brackets': return [[a + b, 'That is only the bracket. Multiply its result by the outside factor.'],
                [(a + b) * c * c, 'That uses the outside factor twice. Multiply by it once.']];
            case 'powers': return [[b ** 2, 'That is only the square. Complete the multiplication and addition as well.']];
            case 'roots': return [[Math.sqrt(b), 'That is only the root. Complete the multiplication and addition as well.'],
                [Math.sqrt(b) * c, 'That stops after multiplying. Add the first number as well.']];
            case 'hiddenMultiplication': return [[Math.sqrt(b) - c, 'That is only the bracket. Multiply by the outside number as well.']];
            case 'reciprocal': {
                const denominator = { '½': 2, '⅓': 3, '¼': 4, '⅕': 5 }[expression.match(/[½⅓¼⅕]/)[0]];
                return [[a / denominator, 'That is only the fraction of the number. Add the last number as well.']];
            }
            case 'negativeNumbers': return [[-b * c, 'That is only the negative product. Subtract it from the first number.'],
                [-(a + b * c), 'The first number is positive. Do not put a minus in front of the whole calculation.']];
            case 'groupedDivision': return [[a + b, 'That is only the first bracket. Complete the other bracket, then divide.']];
            default: return [];
        }
    }
    function makeBank(type, random) {
        const E = window.Maths1to9LessonEngine;
        const r = (minimum, maximum) => E.randomInt(minimum, maximum, random);
        const pick = items => items[r(0, items.length - 1)];
        const first = text => text;
        function options(correct, wrong) {
            const result = [option(correct, '', true)];
            for (const [label, feedback] of wrong) if (!result.some(other => other.label === formatNumber(label))) result.push(option(label, words(feedback)));
            if (result.length < 4) throw new Error(`Not enough distinct mistakes for ${type}: ${correct}`);
            return result.slice(0, 4);
        }
        function make({ expression, correct, wrong, hint, explanation, prompt = 'Work out the calculation.' }) {
            return { prompt, expression, correctLabel: formatNumber(correct),
                answers: options(correct, [...wrong, ...extraWrong(type, expression)]), hint: words(hint), explanation: words(explanation) };
        }
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

            // Keep the subtract-first distractor exact, within the same question range.
            const firstNumber = divisor * r(
                Math.ceil((quotient + 6) / divisor),
                Math.floor((quotient + 20) / divisor)
            );

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
                        Math.round(
                            (
                                dividend /
                                (
                                    divisor *
                                    multiplier
                                )
                            ) * 100
                        ) / 100,

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
            const divisor = r(2, 4);
            const quotient = r(2, 6);
            const leftToRightAnswer = r(2, 4);
            const dividend = divisor * quotient;
            // Both the correct method and Amir's method give positive integers.
            const minuend = dividend + divisor * leftToRightAnswer;
            const correctAnswer = minuend - quotient;
            const ignoredSubtractionAnswer = minuend / divisor;
            const answer =
                `Amir is wrong: the answer is ${correctAnswer}.`;

            return {
                prompt:
                    `Amir says ${minuend} − ${dividend} ÷ ${divisor} = ${leftToRightAnswer} because ` +
                    'you always work from left to right. ' +
                    'Which statement is correct?',

                expression:
                    `${minuend} − ${first(`${dividend} ÷ ${divisor}`)}`,

                correctLabel: answer,

                answers: [
                    {
                        label: answer,
                        correct: true,
                        feedback: ''
                    },
                    {
                        label:
                            `Amir is correct: the answer is ${leftToRightAnswer}.`,

                        correct: false,

                        feedback:
                            'Left to right applies only to ' +
                            'operations with equal priority.'
                    },
                    {
                        label:
                            `Amir is wrong: the answer is ${ignoredSubtractionAnswer}.`,

                        correct: false,

                        feedback:
                            `Complete ${dividend} ÷ ${divisor} first, then ` +
                            `subtract from ${minuend}.`
                    },
                    {
                        label:
                            'Amir is correct because subtraction ' +
                            'comes before division.',

                        correct: false,

                        feedback:
                            'Division has priority over subtraction.'
                    }
                ],

                hint:
                    'The highlighted division must be ' +
                    'completed before subtraction.',

                explanation:
                    `${dividend} ÷ ${divisor} = ${quotient}, then ` +
                    `${minuend} − ${quotient} = ${correctAnswer}.`
            };
        }


        return { multiplyBeforeAdd, divideBeforeSubtract, divideMultiplyLeftToRight, addSubtractLeftToRight,
            brackets, powers, roots, hiddenMultiplication, reciprocal, negativeNumbers, groupedDivision, firstOperationQuestion, errorSpotting };
    }
    function generate(item, random) {
        const source = makeBank(item.type, random)[item.type]();
        const input = item.mode || 'choice';
        const expression = source.expression;
        let prompt = `Work out ${expression}.`;
        let answer = source.correctLabel;
        let wrong = source.answers.filter(option => !option.correct).map(option => ({ value: option.label, feedback: words(option.feedback) }));
        if (item.type === 'firstOperationQuestion') {
            if (input === 'choice') prompt = `Which calculation comes first in ${expression}?`;
            else {
                prompt = `Work out just the calculation inside the brackets: ${expression}`;
                const [a, b, c, base, multiplier] = expression.match(/\d+/g).map(Number);
                answer = String(b - c);
                wrong = [{ value: String(base ** 2), feedback: 'Work inside the brackets before finding the square.' },
                    { value: String(b + c), feedback: 'The sign inside the brackets is subtraction.' },
                    { value: String(a + b), feedback: 'The first addition is outside the brackets.' },
                    { value: String(base * multiplier), feedback: 'Those numbers are not joined by one operation here.' }];
            }
        } else if (item.type === 'errorSpotting') {
            prompt = source.prompt.replace('you always work', 'he works');
            if (input === 'number') {
                prompt = prompt.replace('Which statement is correct?', 'What is the correct answer?');
                answer = source.correctLabel.match(/answer is (−?\d+)/)[1];
                wrong = source.answers.filter(option => !option.correct).flatMap(option => {
                    const number = option.label.match(/answer is (−?\d+)/)?.[1];
                    return number === undefined ? [] : [{ value: number, feedback: words(option.feedback) }];
                });
            }
        }
        const result = { expression, questionType: item.type, input, prompt, feedback: item.type === 'firstOperationQuestion' && input === 'number' ? `${source.correctLabel} = ${answer}` : words(source.explanation) };
        if (input === 'choice') result.options = source.answers.map(option => ({ ...option, feedback: option.correct ? words(source.explanation) : words(option.feedback) }));
        else Object.assign(result, { answer: formatNumber(answer), tolerance: 0,
            rules: wrong.filter(rule => Number(rule.value.replace(/−/g, '-')) !== Number(String(answer).replace(/−/g, '-'))),
            fallback: item.type === 'firstOperationQuestion' ? 'Find the brackets. Work out just the calculation inside them.'
                : 'Use BIDMAS. Work inside brackets first, then powers and roots. Do × and ÷ from left to right, then + and − from left to right.' });
        return result;
    }
    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(types, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'number' : 'choice', seed: E.randomInt(0, 4294967295, random) }));
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };

    const mapOriginal = '18 ÷ (3 + 3) + 2³ × 4 − 5';
    const mapAnswers = ['6', '8', '3', '32', '35', '30'];
    const mapStages = ['B: brackets', 'I: powers', 'D / M: left to right', 'D / M: left to right', 'A / S: left to right', 'A / S: left to right'];
    const show = value => String(value ?? '').trim() || '□';
    function mapOperation(index, values) {
        return ['3 + 3', '2³', `18 ÷ ${show(values[0])}`, `${show(values[1])} × 4`,
            `${show(values[2])} + ${show(values[3])}`, `${show(values[4])} − 5`][index];
    }
    function mapExpression(index, values) {
        return [mapOriginal, `18 ÷ ${show(values[0])} + 2³ × 4 − 5`,
            `18 ÷ ${show(values[0])} + ${show(values[1])} × 4 − 5`,
            `${show(values[2])} + ${show(values[1])} × 4 − 5`, `${show(values[2])} + ${show(values[3])} − 5`,
            `${show(values[4])} − 5`, show(values[5])][index];
    }
    function numericText(value) {
        const tidy = window.Maths1to9LessonEngine.tidyNumber(value);
        if (tidy === null) return null;
        const negative = tidy.startsWith('-');
        const [whole, fraction = ''] = tidy.replace(/^-/, '').split('.');
        const integer = whole.replace(/^0+(?=\d)/, '');
        const decimal = fraction.replace(/0+$/, '');
        return (negative && (integer !== '0' || decimal) ? '-' : '') + integer + (decimal ? `.${decimal}` : '');
    }
    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text; node.className = className;
        return node;
    }
    function mapWidget() {
        const normalise = value => mapAnswers.map((unused, index) => String(value?.[index] ?? ''));
        const mistakes = [
            { '9': 'The operation is 3 + 3, not 3 × 3.', '0': 'The operation inside the brackets is addition, not subtraction.' },
            { '6': '2³ means 2 × 2 × 2, not 2 × 3.', '9': 'Keep 2 as the base. Do not swap the base and index.', '5': 'A power multiplies copies. Do not add the base and index.' },
            { '12': 'The sign is division, not subtraction.', '108': 'Divide 18 by 6. Do not multiply.' },
            { '12': 'The sign is multiplication, not addition.', '4': 'Include both factors, 8 and 4.' },
            { '96': 'The sign is addition, not multiplication.', '29': 'Add 3 and 32. Do not subtract.' },
            { '40': 'The final sign is subtraction, not addition.', '25': 'Subtract 5 once, not twice.' }
        ];
        return {
            isEmpty(value) { return normalise(value).some(answer => answer.trim() === ''); },
            answerText(value) { const values = normalise(value); return values.map((answer, index) => `${mapOperation(index, values)} = ${formatNumber(answer)}`).join('; '); },
            mark(value) {
                const values = normalise(value);
                const wrong = values.findIndex((answer, index) => numericText(answer) !== mapAnswers[index]);
                if (wrong < 0) return { correct: true, feedback: `${mapOriginal} = 30` };
                const key = numericText(values[wrong]);
                return { correct: false, feedback: key === null ? `Type a number in map row ${wrong + 1}.`
                    : mistakes[wrong][key] || `Recheck map row ${wrong + 1}: ${mapOperation(wrong, values)}.` };
            },
            render(host, { value, editable, onChange }) {
                let values = normalise(value), canEdit = editable;
                host.append(element('p', 'Fill one map row at a time. Each row replaces one calculation with your result. Check when all six rows are filled.'));
                const stack = element('div', '', 'operations-map');
                const inputs = [], expressions = [], labels = [], rows = [];
                mapAnswers.forEach((unused, index) => {
                    const row = element('section', '', 'operations-map-row');
                    row.append(element('p', `${index + 1}. ${mapStages[index]}`, 'operations-map-stage'));
                    const expression = element('p', '', 'operations-map-expression'); expressions.push(expression);
                    row.append(expression);
                    const label = element('label', '', 'operations-map-answer');
                    const operation = element('span'); labels.push(operation);
                    const input = element('input');
                    input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off';
                    input.setAttribute('aria-label', `Result for map row ${index + 1}`);
                    input.addEventListener('input', () => { values[index] = input.value; paint(); onChange(values); });
                    input.addEventListener('keydown', event => {
                        if (event.key === 'Enter' && index < mapAnswers.length - 1 && values[index].trim()) { event.preventDefault(); inputs[index + 1].focus(); }
                    });
                    inputs.push(input); label.append(operation, input); row.append(label); stack.append(row); rows.push(row);
                });
                const result = element('p', '', 'operations-map-final');
                host.append(stack, result);
                function paint() {
                    rows.forEach((row, index) => {
                        row.hidden = values.slice(0, index).some(answer => !answer.trim());
                        expressions[index].textContent = mapExpression(index, values);
                        labels[index].textContent = `${mapOperation(index, values)} =`;
                        if (inputs[index].value !== values[index]) inputs[index].value = values[index];
                        inputs[index].disabled = !canEdit;
                    });
                    result.textContent = values.every(answer => answer.trim()) ? `Your final result: ${formatNumber(values[5])}` : '';
                }
                paint();
                return { update(next) { values = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { inputs[Math.max(0, values.findIndex(answer => !answer.trim()))]?.focus(); } };
            }
        };
    }
    const fixed = (type, mode, seed) => generate({ type, mode }, window.Maths1to9LessonEngine.seededRandom(seed));
    function examples() {
        return [{ input: 'custom', questionType: 'brackets', prompt: 'Complete this calculation map.', expression: mapOriginal, widget: mapWidget() },
            fixed('multiplyBeforeAdd', 'number', 203), fixed('divideMultiplyLeftToRight', 'choice', 204),
            fixed('addSubtractLeftToRight', 'number', 205), fixed('brackets', 'choice', 206),
            fixed('hiddenMultiplication', 'number', 207), fixed('firstOperationQuestion', 'choice', 208), fixed('negativeNumbers', 'number', 209)];
    }
    const checks = () => [fixed('multiplyBeforeAdd', 'number', 901), fixed('brackets', 'number', 902),
        fixed('firstOperationQuestion', 'choice', 903), fixed('errorSpotting', 'choice', 904), fixed('divideMultiplyLeftToRight', 'number', 905)];

    const learnScreens = [
        { title: 'The order changes the answer', lines: [
            'An operation means adding, subtracting, multiplying or dividing. A calculation can use several operations.',
            'Numbers you multiply are called factors. The product is the answer from multiplying.',
            'In 3 + 4 × 2, multiply first: 4 × 2 = 8, then 3 + 8 = 11. Adding first would give 14.',
            'BIDMAS is a reminder of the agreed order. The next screens show what each part means.'
        ] },
        { title: 'B: Brackets first', lines: [
            'B stands for brackets. Work out the calculation inside ( ) before using its result outside.',
            'For (5 + 3) × 2, add 5 + 3 = 8 first. Then multiply: 8 × 2 = 16.',
            'Use the same BIDMAS order inside brackets.'
        ] },
        { title: 'I: Powers and roots', lines: [
            'I stands for indices. An index, or power, is a small raised number that counts copies to multiply. For example, 2³ = 2 × 2 × 2 = 8.',
            'Work out powers and square roots before multiplication or division. A square root asks which number, 0 or above, multiplies by itself to make the given number.',
            '√25 = 5 because 5 × 5 = 25. In 3 + 2² × 4, square 2 first: 2² = 2 × 2 = 4. Then 3 + 4 × 4 = 19.'
        ] },
        { title: 'D and M: Divide and multiply', lines: [
            'D stands for division. M stands for multiplication. These are at the same level. Work from left to right.',
            'In 18 ÷ 3 × 2, divide first because it is further left: 18 ÷ 3 = 6, then 6 × 2 = 12.',
            'D does not mean you always divide first. In 12 × 2 ÷ 3, multiply first: 12 × 2 = 24, then 24 ÷ 3 = 8.'
        ] },
        { title: 'A and S: Add and subtract', lines: [
            'A stands for addition. S stands for subtraction. These are at the same level. Work from left to right, after all multiplication and division.',
            'In 10 − 3 + 2, subtract first because it is further left: 10 − 3 = 7, then 7 + 2 = 9.',
            'A negative number is below 0. A number above 0 multiplied by a negative gives a negative. Subtracting a negative is the same as adding.',
            'For 8 − 3 × (−2), multiply first: 3 × (−2) = −6. Then 8 − (−6) = 14.'
        ] },
        { title: 'Other ways to show multiplication', lines: [
            'A number beside a bracket means multiply. For 3(√25 − 2), find the root first: √25 = 5. Then 5 − 2 = 3, and 3 × 3 = 9.',
            'A fraction is a share of a whole. ½ means one half, ⅓ one third, ¼ one quarter and ⅕ one fifth.',
            'Multiplying by ½ means dividing by 2. For ⅓ divide by 3; for ¼ divide by 4; for ⅕ divide by 5.',
            'For 12 × ¼ + 2, work out 12 ÷ 4 = 3 first, then 3 + 2 = 5.'
        ] },
        { title: 'Work out both grouped parts', lines: [
            'A fraction bar groups everything above it and everything below it. Work out both parts before dividing.',
            '(6 + 6) ÷ (5 − 2) has two brackets. Work out 6 + 6 = 12 and 5 − 2 = 3. Then 12 ÷ 3 = 4.'
        ] },
        { title: 'Rewrite one part at a time', lines: [
            'Keep the whole calculation visible. Replace just the part you have worked out, then choose what comes next.',
            'For 5 + (12 − 4) ÷ 2² × 3: brackets give 8, the square gives 4, then divide, multiply and add.'
        ] }
    ];
    const workedExpressions = ['5 + (12 − 4) ÷ 2² × 3', '5 + 8 ÷ 2² × 3', '5 + 8 ÷ 4 × 3', '5 + 2 × 3', '5 + 6', '11'];
    function equation(host, text) { host.append(element('p', text, 'operations-picture-line')); }
    function drawLearn(host, screen) {
        if (screen === 0) {
            const flow = element('div', '', 'operations-flow');
            for (const [title, text] of [['Multiply first', '3 + 4 × 2'], ['4 × 2 = 8', '3 + 8'], ['Add next', '11']]) {
                const box = element('div', '', 'operations-flow-box'); box.append(element('span', title), element('strong', text)); flow.append(box);
            }
            host.append(flow);
        } else if (screen === 1) { equation(host, '(5 + 3) × 2'); equation(host, '8 × 2 = 16'); }
        else if (screen === 2) { equation(host, '2³ = 2 × 2 × 2 = 8'); equation(host, '√25 = 5'); equation(host, '3 + 2² × 4 = 3 + 4 × 4 = 19'); }
        else if (screen === 3) { equation(host, '18 ÷ 3 × 2 = 6 × 2 = 12'); equation(host, '12 × 2 ÷ 3 = 24 ÷ 3 = 8'); }
        else if (screen === 4) { equation(host, '10 − 3 + 2 = 7 + 2 = 9'); equation(host, '8 − 3 × (−2) = 8 − (−6) = 14'); }
        else if (screen === 5) { equation(host, '3(√25 − 2) = 3(5 − 2) = 3 × 3 = 9'); equation(host, '12 × ¼ + 2 = 12 ÷ 4 + 2 = 3 + 2 = 5'); }
        else if (screen === 6) {
            const fraction = element('div', '', 'operations-fraction');
            fraction.append(element('span', '6 + 6'), element('span', '5 − 2')); host.append(fraction);
            equation(host, '(6 + 6) ÷ (5 − 2) = 12 ÷ 3 = 4');
        } else {
            const stack = element('ol', '', 'operations-worked-map');
            workedExpressions.forEach(expression => stack.append(element('li', expression))); host.append(stack);
        }
    }
    Object.assign(window.Operations ??= {}, { types, generate, pick, prepare, examples, checks, learnScreens, drawLearn,
        mapWidget, mapAnswers, mapOperation, mapExpression, numericText, formatNumber, workedExpressions });
})();
