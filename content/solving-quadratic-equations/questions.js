(() => {
    'use strict';

    /*
     * Question bank for "Solving quadratic equations by factorising".
     *
     * Practises solving quadratics, principally by factorising and
     * applying the zero product rule. Every generator name is
     * declared in lesson.json (assessment.question_types) and is
     * emitted as questionType; skill ids never appear in this file.
     * Recording an attempt is delegated entirely to
     * Maths1to9Lesson.recordAssessment().
     *
     * Structure matches the existing working banks (place-value,
     * negative-numbers): one current question at a time, with
     * Check answer / Try again / Next question placed in the
     * shared footer through Maths1to9Lesson.setSectionAction().
     */

    const ROOT_ID = 'solving-quadratic-equations-questions';
    const SECTION_ID = 'question-bank';
    const mounted = new WeakSet();

    /*
     * The lesson's "Finish lesson" button stays locked until this
     * many different questions have been checked.
     */
    const QUESTIONS_TO_COMPLETE = 3;

    const MINUS = '−';

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomItem(items) {
        return items[randomInt(0, items.length - 1)];
    }

    function shuffle(items) {
        const copy = [...items];

        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = randomInt(0, index);

            [copy[index], copy[swapIndex]] =
                [copy[swapIndex], copy[index]];
        }

        return copy;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

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

    function buildOptions(correctLabel, wrongs) {
        const seen = new Set([correctLabel]);
        const options = [
            { label: correctLabel, correct: true, feedback: '' }
        ];

        for (const [label, feedback] of wrongs) {
            if (seen.has(label)) {
                continue;
            }

            seen.add(label);
            options.push({ label, correct: false, feedback });

            if (options.length === 4) {
                break;
            }
        }

        return shuffle(options);
    }

    function make({ type, prompt, display = '', correct, wrongs, explanation }) {
        return {
            type,
            prompt,
            display,
            answerLabel: String(correct),
            options: buildOptions(String(correct), wrongs),
            explanation
        };
    }

    /* ---------- number / algebra formatting ---------- */

    function signed(value) {
        return value < 0 ? `${MINUS}${Math.abs(value)}` : `${value}`;
    }

    function xIs(value) {
        return `x = ${signed(value)}`;
    }

    function bothRoots(r1, r2) {
        return `${xIs(r1)} or ${xIs(r2)}`;
    }

    /* The linear factor whose root is r is (x - r). */
    function factor(r) {
        return r < 0 ? `x + ${Math.abs(r)}` : `x ${MINUS} ${r}`;
    }

    function factors(r1, r2) {
        return `(${factor(r1)})(${factor(r2)})`;
    }

    /* Coefficient term, e.g. term(3, 'x') -> " + 3x", term(-5, '') -> " − 5". */
    function term(coefficient, suffix) {
        if (coefficient === 0) {
            return '';
        }

        const size = Math.abs(coefficient);
        const shown = size === 1 && suffix !== '' ? '' : `${size}`;

        return coefficient < 0
            ? ` ${MINUS} ${shown}${suffix}`
            : ` + ${shown}${suffix}`;
    }

    /* Quadratic x² + bx + c written from its two solutions. */
    function quadraticFromRoots(r1, r2) {
        const b = -(r1 + r2);
        const c = r1 * r2;

        return {
            b,
            c,
            text: `x²${term(b, 'x')}${term(c, '')}`
        };
    }

    /* ---------- generators ---------- */

    const SOLUTION_PAIRS = [
        [-2, -5], [-3, -4], [-1, -6], [2, 3], [-2, 3],
        [1, -6], [4, -5], [-1, 8], [2, -7], [-3, 5],
        [3, 4], [5, -3], [6, -2], [-4, -3]
    ];

    /* Opposite-sign pairs give a positive constant to move across. */
    const REARRANGE_PAIRS = SOLUTION_PAIRS.filter(
        ([a, b]) => a * b < 0
    );

    /* 1. Difference of two squares: x² - a² = 0 ---------------- */

    function squareEqualsNumber() {
        const root = randomItem([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const square = root * root;
        const factorised = `(x ${MINUS} ${root})(x + ${root})`;

        return make({
            type: 'Difference of two squares',
            prompt: 'Solve the equation by factorising. Give both solutions.',
            display: `x² ${MINUS} ${square} = 0`,
            correct: `x = ${root} or x = ${MINUS}${root}`,
            wrongs: [
                [
                    `x = ${root}`,
                    `${square} = ${root}², so x² ${MINUS} ${square} is a difference of two squares: ` +
                    `${factorised} = 0. The factor x + ${root} = 0 also gives x = ${MINUS}${root}.`
                ],
                [
                    `x = ${MINUS}${root}`,
                    `x + ${root} = 0 gives x = ${MINUS}${root}, but x ${MINUS} ${root} = 0 gives ` +
                    `x = ${root}. Both factors give a solution.`
                ],
                [
                    `x = ${square}`,
                    `${square} is the number term, not a solution. Factorise ` +
                    `x² ${MINUS} ${square} as ${factorised} and set each factor to 0.`
                ],
                [
                    factorised,
                    `That is the factorised form. The question says solve, so set each ` +
                    `factor to 0: x = ${root} or x = ${MINUS}${root}.`
                ]
            ],
            explanation:
                `x² ${MINUS} ${square} is a difference of two squares, so it factorises as ` +
                `${factorised} = 0. Then x ${MINUS} ${root} = 0 or x + ${root} = 0, ` +
                `giving x = ${root} or x = ${MINUS}${root}.`
        });
    }

    /* 2. Monic quadratic already equal to zero ---------------- */

    function monicReady() {
        const [r1, r2] = randomItem(SOLUTION_PAIRS);
        const q = quadraticFromRoots(r1, r2);

        return make({
            type: 'Solve a quadratic',
            prompt: 'Solve the equation. Give both solutions.',
            display: `${q.text} = 0`,
            correct: bothRoots(r1, r2),
            wrongs: [
                [
                    bothRoots(-r1, -r2),
                    `The solution has the opposite sign to the number in its bracket. ` +
                    `From ${factors(r1, r2)} = 0 the solutions are ${bothRoots(r1, r2)}.`
                ],
                [
                    xIs(r1),
                    `You solved only one factor. Set both brackets equal to 0 and solve each.`
                ],
                [
                    `${xIs(r1)} or ${xIs(-r2)}`,
                    `One sign is wrong. Substitute each value back into the equation to check.`
                ],
                [
                    `${xIs(q.c)} or ${xIs(q.b)}`,
                    `Those are the number term and the x coefficient, not the solutions. ` +
                    `Factorise first: ${factors(r1, r2)} = 0.`
                ]
            ],
            explanation:
                `Two numbers multiply to ${q.c} and add to ${q.b}. ` +
                `So ${factors(r1, r2)} = 0, giving ${bothRoots(r1, r2)}.`
        });
    }

    /* 3. Rearrange to equal zero first ------------------------ */

    function rearrangeToZero() {
        const [r1, r2] = randomItem(REARRANGE_PAIRS);
        const q = quadraticFromRoots(r1, r2);
        const k = -q.c;

        return make({
            type: 'Rearrange, then solve',
            prompt: 'Solve the equation.',
            display: `x²${term(q.b, 'x')} = ${k}`,
            correct: bothRoots(r1, r2),
            wrongs: [
                [
                    `x = 0 or x = ${signed(-q.b)}`,
                    `You set the left side to 0 without moving the ${k}. ` +
                    `First write x²${term(q.b, 'x')} ${MINUS} ${k} = 0.`
                ],
                [
                    bothRoots(-r1, -r2),
                    `Signs reversed. From ${factors(r1, r2)} = 0 the solutions are ${bothRoots(r1, r2)}.`
                ],
                [
                    xIs(r1),
                    `Give both solutions: set each factor equal to 0.`
                ]
            ],
            explanation:
                `Subtract ${k} from both sides: x²${term(q.b, 'x')} ${MINUS} ${k} = 0. ` +
                `Factorise to ${factors(r1, r2)} = 0, so ${bothRoots(r1, r2)}.`
        });
    }

    /* 4. Factorise before using the zero product rule -------- */

    function factoriseThenSolve() {
        const [r1, r2] = randomItem(SOLUTION_PAIRS);
        const q = quadraticFromRoots(r1, r2);

        return make({
            type: 'Factorise, then solve',
            prompt: 'Solve the equation. Give both solutions.',
            display: `${q.text} = 0`,
            correct: bothRoots(r1, r2),
            wrongs: [
                [
                    `${factors(r1, r2)} = 0`,
                    `That is the factorised form. The question says solve, so set each ` +
                    `bracket equal to 0 and finish.`
                ],
                [
                    bothRoots(-r1, -r2),
                    `Signs reversed: ${factor(r1)} = 0 gives ${xIs(r1)}.`
                ],
                [
                    xIs(r1),
                    `Only one factor was solved. Solve the other bracket as well.`
                ]
            ],
            explanation:
                `Find two numbers that multiply to ${q.c} and add to ${q.b}. ` +
                `Then ${factors(r1, r2)} = 0, so ${bothRoots(r1, r2)}.`
        });
    }

    /* 5. Quadratic with a common factor of x ----------------- */

    function commonFactor() {
        const magnitude = randomItem([3, 4, 5, 6, 7, 8]);
        const sign = randomItem([1, -1]);
        const b = magnitude * sign;
        const otherRoot = -b;

        return make({
            type: 'Common factor',
            prompt: 'Solve the equation. Give both solutions.',
            display: `x²${term(b, 'x')} = 0`,
            correct: `x = 0 or ${xIs(otherRoot)}`,
            wrongs: [
                [
                    xIs(otherRoot),
                    `Dividing both sides by x loses the solution x = 0. ` +
                    `Factor out x instead: x(${factor(otherRoot)}) = 0.`
                ],
                [
                    `x = 0 or ${xIs(b)}`,
                    `From ${factor(otherRoot)} = 0 the solution is ${xIs(otherRoot)} ` +
                    `(opposite sign), not ${xIs(b)}.`
                ],
                [
                    'x = 0',
                    `x = 0 is one solution. The other factor gives ${factor(otherRoot)} = 0, ` +
                    `so ${xIs(otherRoot)}.`
                ]
            ],
            explanation:
                `Factor out x: x(${factor(otherRoot)}) = 0. ` +
                `So x = 0 or ${factor(otherRoot)} = 0, giving x = 0 or ${xIs(otherRoot)}.`
        });
    }

    /* 6. Set each factor equal to zero ----------------------- */

    function setFactorsZero() {
        const [r1, r2] = randomItem(SOLUTION_PAIRS);

        return make({
            type: 'Use the zero product rule',
            prompt:
                'The equation is factorised. Which two equations come next?',
            display: `${factors(r1, r2)} = 0`,
            correct: `${factor(r1)} = 0 and ${factor(r2)} = 0`,
            wrongs: [
                [
                    `${factor(r1)} = 0 only`,
                    `Either factor could be 0, so set both brackets equal to 0.`
                ],
                [
                    `${factor(r1)} and ${factor(r2)}`,
                    `Each factor must be set equal to 0 to make a linear equation.`
                ],
                [
                    bothRoots(r1, r2),
                    `That skips a step. First write ${factor(r1)} = 0 and ${factor(r2)} = 0, ` +
                    `then solve each one.`
                ]
            ],
            explanation:
                `If a product is 0, one of the factors is 0. ` +
                `So ${factor(r1)} = 0 or ${factor(r2)} = 0.`
        });
    }

    /* 7. Find both solutions from the brackets --------------- */

    function bothSolutionsFromBrackets() {
        const [r1, r2] = randomItem(SOLUTION_PAIRS);

        return make({
            type: 'Both solutions from brackets',
            prompt: 'Write both solutions.',
            display: `${factors(r1, r2)} = 0`,
            correct: bothRoots(r1, r2),
            wrongs: [
                [
                    bothRoots(-r1, -r2),
                    `The solution is the opposite sign to the number in the bracket. ` +
                    `${factor(r1)} = 0 gives ${xIs(r1)}.`
                ],
                [
                    xIs(r1),
                    `There are two factors, so there are two solutions. ` +
                    `Solve ${factor(r2)} = 0 as well.`
                ],
                [
                    `${xIs(r1)} or ${xIs(-r2)}`,
                    `The second sign is wrong. ${factor(r2)} = 0 gives ${xIs(r2)}.`
                ]
            ],
            explanation:
                `${factor(r1)} = 0 gives ${xIs(r1)}; ` +
                `${factor(r2)} = 0 gives ${xIs(r2)}.`
        });
    }

    /* 8. Spot the incorrect factorisation ------------------- */

    const SPOT_CASES = [
        {
            quad: 'x² + 2x − 15',
            right: [5, -3],
            shown: '(x + 3)(x − 5)',
            expand: 'x² − 2x − 15',
            b: 2,
            c: -15
        },
        {
            quad: 'x² − 7x + 12',
            right: [-3, -4],
            shown: '(x + 3)(x + 4)',
            expand: 'x² + 7x + 12',
            b: -7,
            c: 12
        },
        {
            quad: 'x² + x − 6',
            right: [3, -2],
            shown: '(x − 3)(x + 2)',
            expand: 'x² − x − 6',
            b: 1,
            c: -6
        },
        {
            quad: 'x² − 5x + 6',
            right: [-2, -3],
            shown: '(x − 1)(x − 6)',
            expand: 'x² − 7x + 6',
            b: -5,
            c: 6
        }
    ];

    function spotError() {
        const item = randomItem(SPOT_CASES);
        const [m, n] = item.right;
        const rightFact = `(x ${m < 0 ? MINUS : '+'} ${Math.abs(m)})` +
            `(x ${n < 0 ? MINUS : '+'} ${Math.abs(n)})`;

        return make({
            type: 'Spot the error',
            prompt:
                `A student factorises ${item.quad} as ${item.shown}. ` +
                `What is wrong?`,
            correct:
                `The numbers should be ${signed(m)} and ${signed(n)}: ${rightFact}.`,
            wrongs: [
                [
                    'Nothing is wrong.',
                    `Expanding ${item.shown} gives ${item.expand}, not ${item.quad}.`
                ],
                [
                    'The brackets should both be minus.',
                    `The numbers must multiply to ${item.c} and add to ${item.b}. ` +
                    `That needs ${signed(m)} and ${signed(n)}.`
                ],
                [
                    'It cannot be factorised.',
                    `It does factorise: ${rightFact}.`
                ]
            ],
            explanation:
                `Two numbers must multiply to ${item.c} and add to ${item.b}: ` +
                `${signed(m)} and ${signed(n)}. So ${item.quad} = ${rightFact}.`
        });
    }

    /* 9. Factorised brackets are not the final answer -------- */

    function notFinished() {
        const [r1, r2] = randomItem(SOLUTION_PAIRS);
        const q = quadraticFromRoots(r1, r2);

        return make({
            type: 'Finish the solution',
            prompt:
                `${q.text} = 0 factorises to ${factors(r1, r2)} = 0. ` +
                `The instruction says solve. What is the answer?`,
            display: `${factors(r1, r2)} = 0`,
            correct: bothRoots(r1, r2),
            wrongs: [
                [
                    `${factors(r1, r2)} = 0`,
                    `Factorising is not solving. Set each bracket to 0: ` +
                    `${factor(r1)} = 0 or ${factor(r2)} = 0.`
                ],
                [
                    `${factor(r1)} = 0 or ${factor(r2)} = 0`,
                    `Almost. Now solve each linear equation to get the x-values.`
                ],
                [
                    bothRoots(-r1, -r2),
                    `Check the signs: ${factor(r1)} = 0 gives ${xIs(r1)}.`
                ]
            ],
            explanation:
                `Set each factor equal to 0 and solve: ${bothRoots(r1, r2)}.`
        });
    }

    /* 10. Context question with an impossible solution ------- */

    const CONTEXT_CASES = [
        { add: 3, area: 40, negRoot: 8, posRoot: 5 },
        { add: 2, area: 48, negRoot: 8, posRoot: 6 },
        { add: 5, area: 24, negRoot: 8, posRoot: 3 },
        { add: 7, area: 18, negRoot: 9, posRoot: 2 },
        { add: 4, area: 45, negRoot: 9, posRoot: 5 }
    ];

    function contextReject() {
        const item = randomItem(CONTEXT_CASES);
        const { add, area, negRoot, posRoot } = item;

        return make({
            type: 'Context question',
            prompt:
                `A rectangle has width x cm and length (x + ${add}) cm. ` +
                `Its area is ${area} cm². This gives ` +
                `(x + ${negRoot})(x ${MINUS} ${posRoot}) = 0. What is the width?`,
            correct: `x = ${posRoot}`,
            wrongs: [
                [
                    `x = ${posRoot} or x = ${MINUS}${negRoot}`,
                    `A width cannot be negative, so reject x = ${MINUS}${negRoot}. ` +
                    `The width is x = ${posRoot} cm.`
                ],
                [
                    `x = ${MINUS}${negRoot}`,
                    `x = ${MINUS}${negRoot} would give a negative width, which is impossible. ` +
                    `Use x = ${posRoot}.`
                ],
                [
                    `x = ${negRoot}`,
                    `From (x + ${negRoot}) = 0 the solution is x = ${MINUS}${negRoot}, ` +
                    `which is rejected. The valid width is x = ${posRoot} cm.`
                ]
            ],
            explanation:
                `x + ${negRoot} = 0 gives x = ${MINUS}${negRoot}, rejected because a width ` +
                `cannot be negative. x ${MINUS} ${posRoot} = 0 gives x = ${posRoot} cm.`
        });
    }

    const generators = {
        squareEqualsNumber,
        monicReady,
        rearrangeToZero,
        factoriseThenSolve,
        commonFactor,
        setFactorsZero,
        bothSolutionsFromBrackets,
        spotError,
        notFinished,
        contextReject
    };

    /*
     * Progression: square roots and ready-to-solve quadratics
     * first, then the zero product rule steps, then rearranging
     * and common factors, then error-spotting and context, then
     * everything.
     */
    function pool(questionNumber) {
        if (questionNumber <= 2) {
            return ['squareEqualsNumber', 'monicReady'];
        }

        if (questionNumber <= 4) {
            return [
                'monicReady',
                'setFactorsZero',
                'bothSolutionsFromBrackets'
            ];
        }

        if (questionNumber <= 6) {
            return [
                'rearrangeToZero',
                'factoriseThenSolve',
                'commonFactor'
            ];
        }

        if (questionNumber <= 9) {
            return [
                'factoriseThenSolve',
                'commonFactor',
                'notFinished',
                'spotError'
            ];
        }

        return Object.keys(generators);
    }

    function mount(root) {
        if (!root || mounted.has(root)) {
            return;
        }

        mounted.add(root);
        root.dataset.mounted = 'true';
        gateSection(SECTION_ID);

        const state = {
            run:
                `${Date.now().toString(36)}-` +
                Math.random().toString(36).slice(2, 8),
            number: 0,
            answered: 0,
            correct: 0,
            firstTryCorrect: 0,
            completed: false,
            finished: false,
            practised: {},
            bag: [],
            lastType: '',
            entry: null
        };

        function nextType() {
            const upcoming = state.number;

            if (state.bag.length === 0) {
                state.bag = shuffle(pool(upcoming));
            }

            let type = state.bag.pop();

            if (type === state.lastType && state.bag.length > 0) {
                state.bag.unshift(type);
                type = state.bag.pop();
            }

            state.lastType = type;

            return type;
        }

        function addQuestion() {
            state.number += 1;

            const type = nextType();

            state.entry = {
                type,
                question: generators[type](),
                questionId:
                    `${SECTION_ID}:${state.run}:${state.number}`,
                selected: '',
                checked: false,
                correct: false,
                countedAnswer: false,
                countedCorrect: false
            };

            render();
        }

        function render() {
            if (state.finished) {
                return;
            }

            const entry = state.entry;
            const question = entry.question;
            const isCorrect =
                entry.checked && entry.selected === question.answerLabel;

            const optionsHtml = question.options.map((option, index) => {
                let className = 'question-option';

                if (entry.checked) {
                    if (option.label === question.answerLabel) {
                        className += ' is-correct-answer';
                    }

                    if (option.label === entry.selected) {
                        className += option.correct
                            ? ' is-correct'
                            : ' is-incorrect';
                    }
                }

                const inputId = `${ROOT_ID}-q${state.number}-o${index}`;

                return (
                    `<label class="${className}" for="${inputId}">` +
                    `<input type="radio" id="${inputId}" ` +
                    `name="${ROOT_ID}-answer" ` +
                    `value="${escapeHtml(option.label)}"` +
                    (entry.selected === option.label ? ' checked' : '') +
                    (entry.checked ? ' disabled' : '') +
                    '>' +
                    `<span>${escapeHtml(option.label)}</span>` +
                    '</label>'
                );
            }).join('');

            const displayHtml = question.display
                ? `<div class="interactive-equation">${escapeHtml(question.display)}</div>`
                : '';

            let feedbackHtml = '';

            if (entry.checked) {
                const selectedOption = question.options.find(
                    (option) => option.label === entry.selected
                );

                const detail = isCorrect
                    ? escapeHtml(question.explanation)
                    : (
                        `${escapeHtml(selectedOption ? selectedOption.feedback : '')} ` +
                        `${escapeHtml(question.explanation)}`
                    ).trim();

                feedbackHtml =
                    `<div class="question-feedback is-visible ` +
                    `${isCorrect ? 'is-correct' : 'is-incorrect'}">` +
                    `<strong>${isCorrect ? 'Correct.' : 'Not quite.'}</strong> ` +
                    detail +
                    '</div>';
            }

            root.innerHTML =
                '<article class="question-card">' +
                `<p class="question-number">Question ${state.number} ` +
                `· ${state.correct} correct from ${state.answered} answered</p>` +
                `<p class="lesson-eyebrow">${escapeHtml(question.type)}</p>` +
                `<p class="question-prompt">${escapeHtml(question.prompt)}</p>` +
                displayHtml +
                `<div class="question-options" role="radiogroup" ` +
                `aria-label="Answer options for question ${state.number}">` +
                optionsHtml +
                '</div>' +
                feedbackHtml +
                '</article>';

            root
                .querySelectorAll(`input[name="${ROOT_ID}-answer"]`)
                .forEach((input) => {
                    input.addEventListener('change', (event) => {
                        if (entry.checked) {
                            return;
                        }

                        entry.selected = event.currentTarget.value;
                        render();
                    });
                });

            const phase = entry.checked
                ? (isCorrect ? 'next' : 'retry')
                : 'check';

            const label = phase === 'next'
                ? 'Next question'
                : phase === 'retry'
                    ? 'Try again'
                    : 'Check answer';

            const disabled = phase === 'check' && entry.selected === '';

            window.Maths1to9Lesson?.setSectionAction?.(SECTION_ID, {
                label,
                disabled,
                onClick: () => {
                    if (phase === 'check') {
                        if (entry.selected === '') {
                            return;
                        }

                        entry.checked = true;
                        entry.correct =
                            entry.selected === question.answerLabel;

                        if (!entry.countedAnswer) {
                            state.answered += 1;
                            entry.countedAnswer = true;
                            state.practised[question.type] = true;

                            if (entry.correct) {
                                state.firstTryCorrect += 1;
                            }
                        }

                        if (entry.correct && !entry.countedCorrect) {
                            state.correct += 1;
                            entry.countedCorrect = true;
                        } else if (!entry.correct && entry.countedCorrect) {
                            state.correct -= 1;
                            entry.countedCorrect = false;
                        }

                        window.Maths1to9Lesson?.recordAssessment?.({
                            questionType: entry.type,
                            questionId: entry.questionId,
                            correct: entry.correct
                        });

                        /*
                         * "Finish lesson" unlocks only after enough
                         * different questions have been checked, right
                         * or wrong.
                         */
                        if (
                            !state.completed &&
                            state.answered >= QUESTIONS_TO_COMPLETE
                        ) {
                            state.completed = true;
                            completeSection(SECTION_ID);
                        }

                        render();
                        return;
                    }

                    if (phase === 'retry') {
                        entry.selected = '';
                        entry.checked = false;
                        render();
                        return;
                    }

                    addQuestion();
                }
            });
        }

        /*
         * When the pupil presses "Finish lesson" in the shared footer,
         * the engine dispatches maths1to9:lesson-complete. Stop handing
         * out questions, take our action out of the footer and show a
         * short summary in place of the question card.
         */
        function finishPractice() {
            if (state.finished) {
                return;
            }

            state.finished = true;
            window.Maths1to9Lesson?.clearSectionAction?.(SECTION_ID);
            renderSummary();
        }

        function renderSummary() {
            const practised = Object.keys(state.practised);
            const practisedHtml = practised.length > 0
                ? '<aside class="lesson-key-points">' +
                  '<h3>What you practised</h3><ul>' +
                  practised
                      .map((name) => `<li>${escapeHtml(name)}</li>`)
                      .join('') +
                  '</ul></aside>'
                : '';

            root.innerHTML =
                '<article class="question-card">' +
                '<p class="question-number">Practice complete</p>' +
                `<p class="question-prompt">You checked ${state.answered} ` +
                `question${state.answered === 1 ? '' : 's'} and got ` +
                `${state.firstTryCorrect} right on the first try. ` +
                'Your progress has been saved.</p>' +
                practisedHtml +
                '<p><a class="button button--primary" ' +
                'href="../../index.php">Back to all lessons</a></p>' +
                '</article>';
        }

        document.addEventListener(
            'maths1to9:lesson-complete',
            finishPractice
        );

        addQuestion();
    }

    function mountAll() {
        const root = document.getElementById(ROOT_ID);

        if (root && !root.dataset.mounted) {
            mount(root);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', mountAll);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll);
    } else {
        mountAll();
    }
})();
