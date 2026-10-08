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

    function formatNumber(value) {
        return String(value).replace(/-(?=\d)/g, '−');
    }

    function options(correct, wrongOptions) {
        const correctLabel = formatNumber(correct);

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
                const label = formatNumber(value);

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
            String(correct).match(
                /^£(-?\d+(?:\.\d+)?)$/
            );

        const numericCorrect =
            moneyMatch
                ? Number(moneyMatch[1])
                : Number(correct);

        const prefix =
            moneyMatch ? '£' : '';

        while (
            uniqueOptions.size < 4 &&
            Number.isFinite(numericCorrect)
        ) {
            const label =
                `${prefix}${formatNumber(numericCorrect + step)}`;

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
            correctLabel: formatNumber(correct),
            answers: options(correct, wrong),
            hint: formatNumber(hint),
            explanation: formatNumber(explanation)
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

    async function mountJourney() {
        const root = document.getElementById(ROOT_ID);
        const checkRoot = document.getElementById('order-of-operations-comparison');
        const api = window.Maths1to9Lesson;
        if (!root || !checkRoot || !api || mounted.has(root)) return;
        mounted.add(root);
        const store = window.Maths1to9Progress;
        let saved = await store.getLessonActivityState('order-of-operations', 'journey');
        if (saved?.contentVersion !== 1) saved = {
            contentVersion: 1, lesson: api.getLesson(), run: 0,
            practice: null, check: null, ready: false, lessonCompleted: false,
            exampleIndex: 0, visibleSteps: 1, examplesFinished: false
        };
        const lesson = saved.lesson;
        const sessionLength = lesson.question_bank.session_length;
        let { run, practice, check, ready, lessonCompleted, exampleIndex, visibleSteps } = saved;
        function save() {
            Object.assign(saved, { run, practice, check, ready, lessonCompleted, exampleIndex, visibleSteps });
            store.saveLessonActivityState('order-of-operations', 'journey', saved);
        }
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
        function reviews(entries) {
            return `<ol class="retained-results">${entries.map(entry => {
                const answer = entry.question.answers[entry.selected];
                const status = entry.firstCorrect ? '✓' : answer?.correct ? '2nd try' : 'Incorrect';
                return `<li><div class="retained-result"><span>${escapeHtml(entry.question.prompt)} ${entry.question.expression}</span>
                    <span class="retained-result__answer"><strong>${escapeHtml(answer?.label || '')}</strong><span>${status}</span></span></div>
                    ${entry.firstCorrect ? '' : `<p class="retained-result__explanation">${escapeHtml(entry.question.explanation)}</p>`}</li>`;
            }).join('')}</ol>`;
        }
        function renderPractice() {
            save();
            updateProgress();
            if (practice.review) {
                const score = practice.entries.filter(entry => entry.firstCorrect).length;
                ready = true;
                save();
                root.innerHTML = `<section class="practice-review"><h3>Your practice results</h3>${reviews(practice.entries)}<p>${score}/${sessionLength} correct first try.</p></section>`;
                api.completeSection('question-bank');
                api.clearSectionAction('question-bank');
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
                save();
                setAction();
            }));
            setAction();
        }
        function renderCheck() {
            save();
            if (!check.review) {
                renderQuestion(checkRoot, check, true);
                return;
            }
            const score = check.entries.filter(entry => entry.firstCorrect).length;
            checkRoot.innerHTML = `<section class="lesson-completion">${reviews(check.entries)}
                <h3>Check complete</h3><p>${score}/${check.entries.length} correct first try.</p></section>`;
            api.clearSectionAction('comparison');
            api.completeSection('comparison');
            if (!lessonCompleted) {
                lessonCompleted = true;
                save();
                api.completeLesson();
            }
        }

        // The existing worked examples, revealed one line at a time by the footer.
        const examplesRoot = document.querySelector('#lesson-section-worked-examples .worked-example-list');
        api.gateSection('worked-examples');
        function renderExample() {
            save();
            if (saved.examplesFinished) {
                examplesRoot.innerHTML = lesson.worked_examples.map(example => `<article class="worked-example"><h3>${escapeHtml(example.title)}</h3><ol>${example.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p class="ooo-expression">${escapeHtml(example.answer)}</p></article>`).join('');
                api.completeSection('worked-examples');
                api.clearSectionAction('worked-examples');
                return;
            }
            const example = lesson.worked_examples[exampleIndex];
            const finished = visibleSteps > example.steps.length;
            examplesRoot.innerHTML = `<article class="worked-example"><h3 class="question-prompt">${escapeHtml(example.title)}</h3><ol class="worked-example__steps">${example.steps.slice(0, visibleSteps).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>${finished ? `<p class="ooo-expression">${escapeHtml(example.answer)}</p>` : ''}</article>`;
            api.setSectionAction('worked-examples', { label: 'Continue', onClick: () => {
                if (!finished) visibleSteps += 1;
                else if (exampleIndex < lesson.worked_examples.length - 1) { exampleIndex += 1; visibleSteps = 1; }
                else { saved.examplesFinished = true; renderExample(); api.completeSection('worked-examples'); api.goToSection('interactive', { unlock: true }); return; }
                renderExample();
            }});
        }
        if (!practice) newPractice();
        if (!check) newCheck();
        if (lessonCompleted) api.completeLesson();
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
