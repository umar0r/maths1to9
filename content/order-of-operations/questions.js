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
     * It is only highlighted after an incorrect Practice answer.
     */
    function first(text) {
        return `<span data-first>${text}</span>`;
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

            answers: shuffle([
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
            ]),

            hint:
                'The highlighted division must be ' +
                'completed before subtraction.',

            explanation:
                `${dividend} ÷ ${divisor} = ${quotient}, then ` +
                `${minuend} − ${quotient} = ${correctAnswer}.`
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

    const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    function mountJourney() {
        const root = document.getElementById(ROOT_ID);
        const checkRoot = document.getElementById('order-of-operations-comparison');
        const api = window.Maths1to9Lesson;
        if (!root || !checkRoot || !api || mounted.has(root)) return;
        mounted.add(root);
        const lesson = api.getLesson();
        const sessionLength = lesson.question_bank.session_length;
        const readyScore = lesson.question_bank.ready_score;
        let run = 0;
        let practice;
        let check;
        let ready = false;
        let lessonCompleted = false;
        const badge = document.createElement('div');
        badge.className = 'lesson-header__practice-progress';
        document.querySelector('.lesson-header__inner').append(badge);
        api.gateSection('question-bank');
        api.gateSection('comparison');

        function makeEntry(type) {
            return { type, question: generators[type](), selected: null, attempts: 0,
                firstCorrect: false, firstAnswer: null, done: false, retry: false };
        }
        function newPractice() {
            run += 1;
            // Mix the existing bank without changing its expressions or difficulty.
            const types = shuffle(Object.keys(generators));
            practice = { index: 0, review: false, entries: types.slice(0, sessionLength).map(makeEntry) };
        }
        function newCheck() {
            check = { index: 0, review: false, entries: lesson.comparison.questions.map(makeEntry) };
        }
        function updateProgress() {
            const completed = practice.entries.filter(entry => entry.done).length;
            badge.hidden = api.getCurrentSection().id !== 'question-bank' || practice.review;
            badge.innerHTML = `<div class="practice-progress-ring" style="--practice-progress:${completed * 100 / sessionLength}%" role="progressbar" aria-label="${completed} of ${sessionLength} questions complete" aria-valuemin="0" aria-valuemax="${sessionLength}" aria-valuenow="${completed}"><span>${completed}/${sessionLength}</span></div>`;
            const checkButton = document.querySelector('[data-stage-index="3"]');
            if (checkButton && !ready) {
                checkButton.disabled = true;
                checkButton.classList.add('lesson-navigation__button--locked');
            }
        }
        function reviews(entries, firstTry) {
            return entries.map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => firstTry ? !entry.firstCorrect : !entry.question.answers[entry.selected]?.correct)
                .map(({ entry, index }) => `<article class="practice-review-item">
                    <p>Question ${index + 1}${firstTry && entry.question.answers[entry.selected]?.correct ? ' · Correct after a retry' : ''}</p>
                    <h3>${escapeHtml(entry.question.prompt)}</h3>
                    <div class="ooo-expression">${entry.question.expression}</div>
                    <p>Your ${firstTry ? 'first ' : ''}answer: <strong>${escapeHtml(entry.question.answers[firstTry ? entry.firstAnswer : entry.selected]?.label ?? '')}</strong></p>
                    <p>Correct answer: <strong>${escapeHtml(entry.question.correctLabel)}</strong></p>
                    <p>${escapeHtml(entry.question.explanation)}</p>
                </article>`).join('');
        }
        function backToPractice() {
            ready = false;
            newPractice();
            newCheck();
            renderPractice();
            renderCheck();
            api.goToSection('question-bank');
            updateProgress();
        }
        function renderPractice() {
            updateProgress();
            if (practice.review) {
                const score = practice.entries.filter(entry => entry.firstCorrect).length;
                ready = score >= readyScore;
                root.innerHTML = `<section class="practice-review"><div class="practice-review__score ${ready ? 'is-ready' : ''}"><h2>${ready ? 'You’re ready' : 'Keep practising'}</h2><p>${score}/${sessionLength} correct first try.${ready ? '' : ` Aim for ${readyScore}/${sessionLength} before Check.`}</p></div>${reviews(practice.entries, true)}</section>`;
                api.setSectionAction('question-bank', { label: ready ? 'Continue' : 'Back to practice', onClick: () => {
                    if (ready) {
                        api.completeSection('question-bank');
                        api.goToSection('comparison', { unlock: true });
                    } else backToPractice();
                }});
                updateProgress();
                return;
            }
            renderQuestion(root, practice, false);
        }
        function renderQuestion(host, session, assessment) {
            const entry = session.entries[session.index];
            const q = entry.question;
            const sectionId = assessment ? 'comparison' : 'question-bank';
            const locked = entry.done || entry.retry;
            host.innerHTML = `<article class="ooo-question">
                ${assessment ? `<p class="ooo-check-position">Check · ${session.index + 1} of ${session.entries.length}</p>` : ''}
                <h3 class="question-prompt">${escapeHtml(q.prompt)}</h3>
                <div class="ooo-expression ${entry.retry ? 'ooo-expression--hint' : ''}">${q.expression}</div>
                <div class="question-options" role="radiogroup" aria-label="Choose your answer">${q.answers.map((answer, index) => `<label class="question-option"><input type="radio" name="ooo-${sectionId}" value="${index}" ${entry.selected === index ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${escapeHtml(answer.label)}</span></label>`).join('')}</div>
                ${!assessment && locked ? `<p class="question-feedback is-visible ${entry.done && q.answers[entry.selected].correct ? 'is-correct' : 'is-incorrect'}" role="status">${escapeHtml(entry.retry ? q.hint : q.explanation)}</p>` : ''}
            </article>`;
            const setAction = () => api.setSectionAction(sectionId, {
                label: assessment ? (session.index === session.entries.length - 1 ? 'Review answers' : 'Next question')
                    : entry.retry ? 'Try again' : entry.done ? (session.index === session.entries.length - 1 ? 'Review answers' : 'Next question') : 'Check answer',
                disabled: entry.selected === null,
                onClick: () => {
                    if (entry.retry) {
                        entry.retry = false;
                        entry.selected = null;
                    } else if (entry.done) {
                        session.index += 1;
                        session.review = session.index === session.entries.length;
                    } else {
                        const correct = q.answers[entry.selected].correct;
                        entry.attempts += 1;
                        if (entry.attempts === 1) {
                            entry.firstCorrect = correct;
                            entry.firstAnswer = entry.selected;
                            // Preserve first-attempt evidence: a retry must not overwrite it.
                            api.recordAssessment({ questionType: entry.type,
                                questionId: `${sectionId}:${run}:${session.index + 1}`, correct });
                        }
                        entry.retry = !assessment && !correct && entry.attempts < 2;
                        entry.done = !entry.retry;
                        if (assessment) {
                            session.index += 1;
                            session.review = session.index === session.entries.length;
                        }
                    }
                    if (assessment) renderCheck(); else renderPractice();
                }
            });
            host.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
                entry.selected = Number(input.value);
                setAction();
            }));
            setAction();
        }
        function renderCheck() {
            if (!check.review) {
                renderQuestion(checkRoot, check, true);
                return;
            }
            const score = check.entries.filter(entry => entry.firstCorrect).length;
            const passed = score >= 4;
            checkRoot.innerHTML = `<section class="lesson-completion">
                <div class="lesson-completion__result ${passed ? 'lesson-completion__result--success' : ''}">
                    ${passed ? '<span class="lesson-completion__celebration" aria-hidden="true">★</span>' : ''}
                    <div><h2>${passed ? 'Order of operations complete' : 'Practise once more'}</h2><p>${passed ? 'Nice work — you’re ready to move on.' : 'Review your answers, then have another go.'}</p></div>
                    <p class="lesson-completion__score">${score}<small>/5</small></p>
                </div>
                ${passed ? '<div class="lesson-completion__recommendations"></div><a class="lesson-completion__all-lessons" href="../../">View all lessons</a><div class="ooo-next-lesson"></div>' : reviews(check.entries, false)}
            </section>`;
            if (!passed) {
                api.setSectionAction('comparison', { label: 'Back to practice', onClick: backToPractice });
                return;
            }
            api.clearSectionAction('comparison');
            api.completeSection('comparison');
            if (!lessonCompleted) {
                lessonCompleted = true;
                api.completeLesson();
            }
            document.querySelector('[data-stage-index="3"]')?.classList.add('ooo-stage-complete');
            window.Maths1to9Recommendations.getForLesson('order-of-operations').then(lessons => {
                const container = checkRoot.querySelector('.lesson-completion__recommendations');
                if (!container) return;
                container.innerHTML = lessons.map((item, index) => `${index === 0 ? '<h3>Up next</h3>' : index === 1 ? '<h3>More lessons to try</h3>' : ''}<a class="lesson-recommendation-card" href="${escapeHtml(item.url)}"><span class="lesson-recommendation-card__title">${escapeHtml(item.title)}</span><span>${escapeHtml(item.subtitle || '')}</span></a>`).join('');
                if (lessons.length) checkRoot.querySelector('.ooo-next-lesson').innerHTML = `<a class="button button--primary" href="${escapeHtml(lessons[0].url)}">Start next lesson</a>`;
            }).catch(() => {
                const container = checkRoot.querySelector('.lesson-completion__recommendations');
                if (container) container.textContent = 'Explore all lessons to choose what to learn next.';
            });
        }

        // The existing worked examples, revealed one line at a time by the footer.
        const examplesRoot = document.querySelector('#lesson-section-worked-examples .worked-example-list');
        let exampleIndex = 0;
        let visibleSteps = 1;
        api.gateSection('worked-examples');
        function renderExample() {
            const example = lesson.worked_examples[exampleIndex];
            const finished = visibleSteps > example.steps.length;
            examplesRoot.innerHTML = `<article class="worked-example"><h3 class="question-prompt">${escapeHtml(example.title)}</h3><ol class="worked-example__steps">${example.steps.slice(0, visibleSteps).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>${finished ? `<p class="ooo-expression">${escapeHtml(example.answer)}</p>` : ''}</article>`;
            api.setSectionAction('worked-examples', { label: 'Continue', onClick: () => {
                if (!finished) visibleSteps += 1;
                else if (exampleIndex < lesson.worked_examples.length - 1) { exampleIndex += 1; visibleSteps = 1; }
                else { api.completeSection('worked-examples'); api.goToSection('interactive', { unlock: true }); return; }
                renderExample();
            }});
        }
        newPractice();
        newCheck();
        renderExample();
        renderPractice();
        renderCheck();
        document.addEventListener('maths1to9:section-change', () => {
            if (api.getCurrentSection().id === 'comparison' && !ready && !lessonCompleted) {
                api.goToSection('question-bank');
            }
            updateProgress();
        });
    }
    document.addEventListener('maths1to9:lesson-rendered', mountJourney);
})();
